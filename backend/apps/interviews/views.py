from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q, Avg, Count
from django.shortcuts import get_object_or_404
from .models import (
    InterviewSession, InterviewQuestion, InterviewResponse, 
    InterviewFeedback, InterviewAnalytics
)
from .serializers import (
    InterviewSessionSerializer, InterviewSessionListSerializer,
    InterviewSessionCreateSerializer, InterviewQuestionSerializer,
    InterviewResponseSerializer, QuestionResponseSerializer,
    InterviewFeedbackSerializer
)
from apps.ai_engine.services import GeminiService
from apps.resumes.models import Resume
import logging

logger = logging.getLogger(__name__)

class InterviewSessionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing interview sessions"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return InterviewSessionListSerializer
        elif self.action == 'create':
            return InterviewSessionCreateSerializer
        return InterviewSessionSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'administrator':
            return InterviewSession.objects.all()
        elif user.role == 'teacher':
            # Teachers can only see interviews for their assigned students
            from apps.users.models import TeacherStudentMapping
            student_ids = TeacherStudentMapping.objects.filter(
                teacher=user, is_active=True
            ).values_list('student_id', flat=True)
            return InterviewSession.objects.filter(
                Q(teacher=user) | Q(student_id__in=student_ids)
            )
        else:  # student
            return InterviewSession.objects.filter(student=user)
    
    def create(self, request, *args, **kwargs):
        """Create interview session - only teachers can create interviews."""
        if request.user.role not in ['teacher', 'administrator']:
            return Response(
                {'error': 'Only teachers can create interviews'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)
    
    def perform_create(self, serializer):
        """Set the teacher when creating an interview."""
        serializer.save(teacher=self.request.user)
    
    @action(detail=True, methods=['post'])
    def start_interview(self, request, pk=None):
        """Start an interview session - only students can start interviews."""
        session = self.get_object()
        
        # Role check - only students can start interviews
        if request.user.role != 'student':
            return Response(
                {'error': 'Only students can participate in interviews'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Security checks
        if request.user != session.student:
            return Response(
                {'error': 'Access denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not session.is_accessible():
            return Response(
                {'error': 'Interview not accessible at this time'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if session.status not in ['scheduled']:
            return Response(
                {'error': 'Interview already started or completed'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get student's resume
            resume = Resume.objects.filter(student=session.student, is_active=True).first()
            if not resume:
                return Response(
                    {'error': 'No active resume found. Please upload a resume first.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Generate questions using AI
            gemini_service = GeminiService()
            questions_text = gemini_service.generate_interview_questions(
                resume.content,
                session.interview_type,
                num_questions=10
            )
            
            # Save questions to database
            for i, question_text in enumerate(questions_text):
                InterviewQuestion.objects.create(
                    session=session,
                    question_text=question_text,
                    question_order=i + 1
                )
            
            # Update session status
            session.status = 'in_progress'
            session.started_at = timezone.now()
            session.save()
            
            # Return all questions (not just first 3)
            questions = session.questions.all().order_by('question_order')
            questions_data = InterviewQuestionSerializer(questions, many=True).data
            
            logger.info(f"Interview started for student {session.student.username}")
            
            return Response({
                'message': 'Interview started successfully',
                'session_id': session.id,
                'questions': questions_data,
                'total_questions': session.questions.count(),
                'time_remaining': session.get_time_remaining()
            })
            
        except Exception as e:
            logger.error(f"Error starting interview: {str(e)}")
            return Response(
                {'error': 'Failed to start interview. Please try again.'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def submit_answer(self, request, pk=None):
        """Submit answer to a question - only students can submit answers."""
        session = self.get_object()
        
        # Role check - only students can submit answers
        if request.user.role != 'student':
            return Response(
                {'error': 'Only students can participate in interviews'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if request.user != session.student:
            return Response(
                {'error': 'Access denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if session.status != 'in_progress':
            return Response(
                {'error': 'Interview is not in progress'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = QuestionResponseSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        question_id = serializer.validated_data['question_id']
        answer_text = serializer.validated_data['answer_text']
        time_taken = serializer.validated_data.get('time_taken_seconds', 0)
        
        try:
            question = get_object_or_404(InterviewQuestion, id=question_id, session=session)
            
            # Create or update response
            response_obj, created = InterviewResponse.objects.get_or_create(
                question=question,
                defaults={
                    'answer_text': answer_text,
                    'time_taken_seconds': time_taken
                }
            )
            
            if not created:
                response_obj.answer_text = answer_text
                response_obj.time_taken_seconds = time_taken
                response_obj.save()
            
            # Score using AI (with fallback)
            try:
                gemini_service = GeminiService()
                score, feedback = gemini_service.score_answer(
                    question.question_text,
                    answer_text,
                    session.interview_type
                )
                
                response_obj.score = score
                response_obj.ai_feedback = feedback
                response_obj.save()
            except Exception as ai_error:
                logger.warning(f"AI scoring failed: {str(ai_error)}, using default score")
                # Fallback scoring based on answer length and completeness
                score = min(100, max(20, len(answer_text.strip()) * 2))  # Simple length-based scoring
                response_obj.score = score
                response_obj.ai_feedback = "Answer submitted successfully. AI feedback temporarily unavailable."
                response_obj.save()
            
            # Check if all questions are answered
            total_questions = session.questions.count()
            answered_questions = session.questions.filter(
                response__isnull=False
            ).distinct().count()
            
            # Get next question if available
            next_question = None
            if answered_questions < total_questions:
                answered_question_ids = session.questions.filter(
                    response__isnull=False
                ).values_list('id', flat=True)
                next_question_obj = session.questions.exclude(
                    id__in=answered_question_ids
                ).order_by('question_order').first()
                if next_question_obj:
                    next_question = InterviewQuestionSerializer(next_question_obj).data
            
            return Response({
                'success': True,
                'score': response_obj.score,
                'feedback': response_obj.ai_feedback,
                'answered_questions': answered_questions,
                'total_questions': total_questions,
                'next_question': next_question,
                'interview_completed': answered_questions >= total_questions
            })
            
        except Exception as e:
            logger.error(f"Error submitting answer: {str(e)}")
            return Response(
                {'error': 'Failed to submit answer. Please try again.'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def complete_interview(self, request, pk=None):
        """Complete an interview session"""
        session = self.get_object()
        
        if request.user != session.student:
            return Response(
                {'error': 'Access denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if session.status != 'in_progress':
            return Response(
                {'error': 'Interview is not in progress'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Update session status
            session.status = 'completed'
            session.completed_at = timezone.now()
            
            # Calculate overall score from responses
            responses = InterviewResponse.objects.filter(question__session=session)
            if responses.exists():
                total_score = sum(r.score or 0 for r in responses)
                avg_score = total_score / responses.count()
                session.overall_score = avg_score
            else:
                session.overall_score = 0
            
            session.save()
            
            # Generate comprehensive feedback (with error handling)
            try:
                self._generate_interview_feedback(session)
            except Exception as feedback_error:
                logger.warning(f"Feedback generation failed: {str(feedback_error)}")
            
            # Generate analytics (with error handling)
            try:
                self._generate_interview_analytics(session)
            except Exception as analytics_error:
                logger.warning(f"Analytics generation failed: {str(analytics_error)}")
            
            logger.info(f"Interview completed for student {session.student.username}")
            
            return Response({
                'success': True,
                'message': 'Interview completed successfully',
                'session_id': session.id,
                'overall_score': session.overall_score or 0,
                'status': session.status
            })
            
        except Exception as e:
            logger.error(f"Error completing interview: {str(e)}")
            return Response(
                {'error': 'Failed to complete interview'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def validate_session(self, request, pk=None):
        """Validate and refresh interview session security"""
        session = self.get_object()
        
        # Check if user is the student assigned to this interview
        if request.user != session.student:
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if session is still valid
        if not session.is_session_valid:
            return Response(
                {'error': 'Session has been invalidated due to security violations'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check time validity
        if not session.is_accessible():
            return Response(
                {'error': 'Interview session is not currently accessible'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return Response({
            'valid': True,
            'session_id': session.session_id,
            'security_config': session.security_config,
            'tab_switches': session.tab_switches,
            'warning_count': session.warning_count,
            'time_remaining': session.get_time_remaining()
        })
    
    @action(detail=True, methods=['post'])
    def report_security_event(self, request, pk=None):
        """Report security violation during interview"""
        session = self.get_object()
        
        # Check if user is the student assigned to this interview
        if request.user != session.student:
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        event_type = request.data.get('event_type')
        event_data = request.data.get('event_data', {})
        
        if not event_type:
            return Response(
                {'error': 'event_type is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update security counters
        if event_type == 'tab_switch':
            session.tab_switches += 1
        elif event_type == 'warning':
            session.warning_count += 1
        
        # Add to security violations log
        violation = {
            'timestamp': timezone.now().isoformat(),
            'event_type': event_type,
            'event_data': event_data
        }
        session.security_violations.append(violation)
        
        # Check if session should be invalidated
        security_config = session.security_config or {}
        tab_limit = security_config.get('tab_switch_limit', 3)
        warning_limit = security_config.get('warning_limit', 5)
        
        session_invalidated = False
        if session.tab_switches > tab_limit or session.warning_count > warning_limit:
            session.is_session_valid = False
            session.status = 'cancelled'
            session_invalidated = True
        
        session.save()
        
        return Response({
            'event_recorded': True,
            'session_invalidated': session_invalidated,
            'tab_switches': session.tab_switches,
            'warning_count': session.warning_count,
            'violations_remaining': {
                'tab_switches': max(0, tab_limit - session.tab_switches),
                'warnings': max(0, warning_limit - session.warning_count)
            }
        })
    
    @action(detail=True, methods=['post'])
    def invalidate_session(self, request, pk=None):
        """Manually invalidate interview session (teacher/admin only)"""
        session = self.get_object()
        
        # Check permissions
        if request.user.role not in ['teacher', 'administrator']:
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Teacher can only invalidate their own sessions
        if request.user.role == 'teacher' and session.teacher != request.user:
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        session.is_session_valid = False
        session.status = 'cancelled'
        session.save()
        
        return Response({
            'session_invalidated': True,
            'message': 'Interview session has been invalidated'
        })
    
    @action(detail=True, methods=['get'])
    def get_results(self, request, pk=None):
        """Get interview results"""
        session = self.get_object()
        
        if request.user not in [session.student, session.teacher] and request.user.role != 'administrator':
            return Response(
                {'error': 'Access denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if session.status != 'completed':
            return Response(
                {'error': 'Interview not completed yet'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get detailed results
        responses = InterviewResponseSerializer(
            InterviewResponse.objects.filter(question__session=session),
            many=True
        ).data
        
        feedback = None
        if hasattr(session, 'feedback'):
            feedback = InterviewFeedbackSerializer(session.feedback).data
        
        analytics = None
        if hasattr(session, 'analytics'):
            analytics = session.analytics
        
        return Response({
            'session': InterviewSessionSerializer(session).data,
            'responses': responses,
            'feedback': feedback,
            'analytics': {
                'total_questions': analytics.total_questions if analytics else 0,
                'questions_answered': analytics.questions_answered if analytics else 0,
                'completion_percentage': analytics.completion_percentage if analytics else 0,
                'average_response_time': analytics.average_response_time if analytics else 0,
            } if analytics else None
        })
    
    @action(detail=True, methods=['get'])
    def responses(self, request, pk=None):
        """Get all responses for an interview session"""
        session = self.get_object()
        
        if request.user != session.student:
            return Response(
                {'error': 'Access denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if session.status != 'completed':
            return Response(
                {'error': 'Interview is not completed yet'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            responses = []
            for question in session.questions.all().order_by('question_order'):
                try:
                    response = question.response
                    responses.append({
                        'id': response.id,
                        'question_text': question.question_text,
                        'answer_text': response.answer_text,
                        'time_taken_seconds': response.time_taken_seconds,
                        'score': response.score,
                        'ai_feedback': response.ai_feedback,
                        'expected_answer_length': question.expected_answer_length,
                        'difficulty_level': question.difficulty_level,
                        'category': question.category,
                        'evaluation_criteria': question.evaluation_criteria
                    })
                except InterviewResponse.DoesNotExist:
                    # If no response exists for this question
                    responses.append({
                        'id': None,
                        'question_text': question.question_text,
                        'answer_text': None,
                        'time_taken_seconds': 0,
                        'score': 0,
                        'ai_feedback': None,
                        'expected_answer_length': question.expected_answer_length,
                        'difficulty_level': question.difficulty_level,
                        'category': question.category,
                        'evaluation_criteria': question.evaluation_criteria
                    })
            
            return Response(responses)
            
        except Exception as e:
            logger.error(f"Error fetching responses: {str(e)}")
            return Response(
                {'error': 'Failed to fetch responses'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _generate_interview_feedback(self, session):
        """Generate comprehensive feedback for completed interview"""
        try:
            gemini_service = GeminiService()
            
            # Prepare session data for AI analysis
            responses = InterviewResponse.objects.filter(question__session=session)
            qa_pairs = []
            
            for response in responses:
                qa_pairs.append({
                    'question': response.question.question_text,
                    'answer': response.answer_text,
                    'score': response.score or 0
                })
            
            session_data = {
                'interview_type': session.interview_type,
                'overall_score': session.calculate_overall_score(),
                'total_questions': session.questions.count(),
                'qa_pairs': qa_pairs
            }
            
            # Generate feedback using AI
            detailed_feedback = gemini_service.generate_personalized_feedback(session_data)
            
            # Create feedback record
            InterviewFeedback.objects.create(
                session=session,
                overall_score=session_data['overall_score'],
                detailed_feedback=detailed_feedback,
                strengths=['Communication', 'Problem Solving'],  # AI will enhance this
                areas_for_improvement=['Technical Depth', 'Examples'],  # AI will enhance this
            )
            
        except Exception as e:
            logger.error(f"Error generating feedback: {str(e)}")
    
    def _generate_interview_analytics(self, session):
        """Generate analytics for completed interview"""
        try:
            responses = InterviewResponse.objects.filter(question__session=session)
            total_questions = session.questions.count()
            answered_questions = responses.count()
            
            # Calculate average response time
            response_times = [r.time_taken_seconds for r in responses if r.time_taken_seconds]
            avg_response_time = sum(response_times) / len(response_times) if response_times else 0
            
            # Calculate completion percentage
            completion_percentage = (answered_questions / total_questions) * 100 if total_questions > 0 else 0
            
            InterviewAnalytics.objects.create(
                session=session,
                total_questions=total_questions,
                questions_answered=answered_questions,
                average_response_time=avg_response_time,
                completion_percentage=completion_percentage,
                performance_trend='stable'  # Can be enhanced with historical data
            )
            
        except Exception as e:
            logger.error(f"Error generating analytics: {str(e)}")
