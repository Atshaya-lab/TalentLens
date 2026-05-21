# Enhanced Interview API Views for Professional Interview Session

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import transaction
from apps.interviews.models import InterviewSession, InterviewQuestion, InterviewResponse
from apps.interviews.serializers import InterviewSessionSerializer, InterviewQuestionSerializer
from apps.ai_engine.services import GeminiService
import json
import logging
import tempfile
import os

logger = logging.getLogger(__name__)


class ProfessionalInterviewViewSet(viewsets.ModelViewSet):
    """Enhanced interview viewset for professional 1:1 interview experience."""
    
    queryset = InterviewSession.objects.all()
    serializer_class = InterviewSessionSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def generate_dynamic_questions(self, request):
        """Generate dynamic questions based on session parameters."""
        try:
            # Only students should be able to generate questions during their interview
            if request.user.role != 'student':
                return Response(
                    {'error': 'Only students can participate in interviews'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            session_id = request.data.get('session_id')
            remaining_time = request.data.get('remaining_time', 3600)  # seconds
            interview_type = request.data.get('interview_type', 'technical')
            difficulty_level = request.data.get('difficulty_level', 'medium')
            student_profile = request.data.get('student_profile', {})
            
            # Validate required parameters
            if not session_id:
                return Response(
                    {'error': 'session_id is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Ensure numeric values are valid
            try:
                remaining_time = max(300, int(remaining_time))  # Minimum 5 minutes
            except (ValueError, TypeError):
                remaining_time = 3600
            
            # Get the interview session
            try:
                session = InterviewSession.objects.get(id=session_id)
                if session.student != request.user:
                    return Response(
                        {'error': 'You can only access your own interview sessions'}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
                    
                # Check if interview is already completed
                if session.status == 'completed':
                    return Response(
                        {'error': 'Cannot generate questions for completed interview'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                    
                # Check if interview is terminated or cancelled
                if session.status in ['terminated', 'cancelled', 'missed']:
                    return Response(
                        {'error': f'Cannot generate questions for {session.status} interview'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                    
            except InterviewSession.DoesNotExist:
                return Response(
                    {'error': 'Interview session not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check if questions already exist for this session
            existing_questions = InterviewQuestion.objects.filter(session=session)
            if existing_questions.exists():
                # Return existing questions instead of creating duplicates
                serializer = InterviewQuestionSerializer(existing_questions, many=True)
                return Response({
                    'questions': serializer.data,
                    'total_questions': existing_questions.count(),
                    'estimated_duration': sum(q.time_limit for q in existing_questions),
                    'difficulty_distribution': self._get_difficulty_distribution(existing_questions)
                })
            
            # Calculate optimal question count and time allocation
            question_count = self._calculate_question_count(remaining_time, difficulty_level)
            
            # Generate questions using AI engine
            try:
                ai_service = GeminiService()
                questions_data = ai_service.generate_dynamic_questions(
                    interview_type=interview_type,
                    difficulty_level=difficulty_level,
                    question_count=question_count,
                    time_available=remaining_time,
                    student_profile=student_profile,
                    session_context={
                        'session_id': session_id,
                        'duration': session.duration_minutes,
                        'category': session.category
                    }
                )
            except Exception as ai_error:
                logger.error(f"AI service error: {str(ai_error)}")
                # Use fallback questions instead of failing completely
                questions_data = self._get_fallback_questions(
                    interview_type, difficulty_level, question_count
                )
            
            # Create question objects with dynamic time limits
            questions = []
            try:
                for i, q_data in enumerate(questions_data, 1):
                    question = InterviewQuestion.objects.create(
                        session=session,
                        question_text=q_data['text'],
                        question_order=i,  # Use question_order, not order
                        difficulty_level=q_data.get('difficulty', difficulty_level),
                        category=q_data.get('category', interview_type),
                        time_limit=q_data.get('time_limit', self._calculate_question_time(
                            remaining_time, question_count, q_data.get('difficulty', difficulty_level)
                        )),
                        expected_answer_length=q_data.get('expected_length', 'medium'),
                        evaluation_criteria=q_data.get('criteria', {}),
                        order=i  # Also set order for consistency
                    )
                    questions.append(question)
            except Exception as db_error:
                logger.error(f"Database error creating questions: {str(db_error)}")
                return Response(
                    {'error': 'Failed to save generated questions'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Serialize and return questions
            serializer = InterviewQuestionSerializer(questions, many=True)
            
            return Response({
                'questions': serializer.data,
                'total_questions': len(questions),
                'estimated_duration': sum(q.time_limit for q in questions),
                'difficulty_distribution': self._get_difficulty_distribution(questions)
            })
            
        except Exception as e:
            logger.error(f"Error generating dynamic questions: {str(e)}")
            return Response(
                {'error': 'Failed to generate questions'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def transcribe_audio(self, request):
        """Transcribe audio recording to text using speech recognition."""
        try:
            # Only students should be able to transcribe audio during their interview
            if request.user.role != 'student':
                return Response(
                    {'error': 'Only students can participate in interviews'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            if 'audio' not in request.FILES:
                return Response(
                    {'error': 'No audio file provided'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            audio_file = request.FILES['audio']
            
            # Save audio file temporarily
            with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_file:
                for chunk in audio_file.chunks():
                    temp_file.write(chunk)
                temp_file_path = temp_file.name
            
            try:
                # Convert webm to wav if needed and transcribe
                text = self._transcribe_audio_file(temp_file_path)
                
                return Response({
                    'text': text,
                    'confidence': 0.95,  # Mock confidence score
                    'duration': 30  # Mock duration
                })
                
            finally:
                # Clean up temporary file
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
                    
        except Exception as e:
            logger.error(f"Error transcribing audio: {str(e)}")
            return Response(
                {'error': 'Failed to transcribe audio'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def security_event(self, request, pk=None):
        """Record security events during interview."""
        try:
            # Only students should be able to record security events during their interview
            if request.user.role != 'student':
                return Response(
                    {'error': 'Only students can participate in interviews'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            session = self.get_object()
            event_type = request.data.get('event_type')
            event_data = request.data.get('event_data', {})
            
            # Update session security metadata
            security_events = session.security_metadata.get('events', [])
            security_events.append({
                'type': event_type,
                'timestamp': timezone.now().isoformat(),
                'data': event_data
            })
            
            session.security_metadata['events'] = security_events
            
            # Check for violations
            violation_detected = self._check_security_violations(session, event_type)
            
            if violation_detected:
                session.status = 'terminated'
                session.end_datetime = timezone.now()
                
            session.save()
            
            return Response({
                'event_recorded': True,
                'violation_detected': violation_detected,
                'session_status': session.status
            })
            
        except Exception as e:
            logger.error(f"Error recording security event: {str(e)}")
            return Response(
                {'error': 'Failed to record security event'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def invalidate(self, request, pk=None):
        """Invalidate interview session due to security violation."""
        try:
            # Only students should be able to invalidate their own interview session
            if request.user.role != 'student':
                return Response(
                    {'error': 'Only students can participate in interviews'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            session = self.get_object()
            reason = request.data.get('reason', 'Security violation')
            
            with transaction.atomic():
                session.status = 'terminated'
                session.end_datetime = timezone.now()
                session.security_metadata['termination_reason'] = reason
                session.security_metadata['terminated_at'] = timezone.now().isoformat()
                session.save()
                
                # Log the termination
                logger.warning(f"Interview session {session.id} terminated: {reason}")
            
            return Response({
                'session_invalidated': True,
                'reason': reason
            })
            
        except Exception as e:
            logger.error(f"Error invalidating session: {str(e)}")
            return Response(
                {'error': 'Failed to invalidate session'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def validate(self, request, pk=None):
        """Validate if session can be started/continued."""
        try:
            session = self.get_object()
            now = timezone.now()
            
            # Check if session is scheduled
            if session.scheduled_datetime > now:
                return Response({
                    'valid': False,
                    'reason': 'Interview has not started yet'
                })
            
            # Check if session has expired
            end_time = session.scheduled_datetime + timezone.timedelta(minutes=session.duration_minutes)
            if now > end_time:
                return Response({
                    'valid': False,
                    'reason': 'Interview session has expired'
                })
            
            # Check if already completed or terminated
            if session.status == 'completed':
                return Response({
                    'valid': False,
                    'reason': 'Interview is already completed',
                    'redirect_to': 'results'
                })
            
            if session.status == 'terminated':
                return Response({
                    'valid': False,
                    'reason': 'Interview was terminated due to security violations',
                    'redirect_to': 'interviews'
                })
            
            # Check security violations
            violation_count = len(session.security_metadata.get('events', []))
            if violation_count >= 10:  # Max violations
                return Response({
                    'valid': False,
                    'reason': 'Too many security violations'
                })
            
            return Response({
                'valid': True,
                'remaining_time': int((end_time - now).total_seconds()),
                'status': session.status
            })
            
        except Exception as e:
            logger.error(f"Error validating session: {str(e)}")
            return Response(
                {'error': 'Failed to validate session'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def results(self, request, pk=None):
        """Get interview results and evaluation."""
        try:
            session = self.get_object()
            
            if session.status != 'completed':
                return Response(
                    {'error': 'Interview not completed yet'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get all responses for questions in this session
            responses = InterviewResponse.objects.filter(question__session=session)
            
            # Calculate evaluation metrics
            evaluation = self._calculate_interview_evaluation(session, responses)
            
            return Response({
                'session_id': session.id,
                'status': session.status,
                'duration': session.actual_duration or session.duration_minutes,
                'responses_count': responses.count(),
                'evaluation': evaluation,
                'security_events': session.security_metadata.get('events', []),
                'completed_at': session.end_datetime
            })
            
        except Exception as e:
            logger.error(f"Error getting results: {str(e)}")
            return Response(
                {'error': 'Failed to get results'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def update(self, request, *args, **kwargs):
        """Allow students to update their own interview sessions (for completion)."""
        try:
            # Only students should be able to update their interview sessions
            if request.user.role != 'student':
                return Response(
                    {'error': 'Only students can participate in interviews'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            instance = self.get_object()
            
            # Ensure the student can only update their own session
            if instance.student != request.user:
                return Response(
                    {'error': 'You can only update your own interview sessions'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Only allow updating specific fields for completion
            allowed_fields = ['status', 'actual_duration', 'security_metadata', 'end_datetime', 'completed_at']
            update_data = {}
            
            for field in allowed_fields:
                if field in request.data:
                    update_data[field] = request.data[field]
            
            # If status is being set to completed, set completed_at timestamp
            if update_data.get('status') == 'completed':
                update_data['completed_at'] = timezone.now()
                if 'end_datetime' not in update_data:
                    update_data['end_datetime'] = timezone.now()
            
            # Update the instance
            for field, value in update_data.items():
                setattr(instance, field, value)
            
            instance.save()
            
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Error updating interview session: {str(e)}")
            return Response(
                {'error': 'Failed to update interview session'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _calculate_question_count(self, remaining_time, difficulty_level):
        """Calculate optimal number of questions based on time and difficulty."""
        base_questions = {
            'easy': 8,
            'medium': 6,
            'hard': 4
        }.get(difficulty_level, 6)
        
        # Adjust based on available time (assume 60 minutes base)
        time_factor = remaining_time / 3600  # Convert to hours
        return max(3, min(12, int(base_questions * time_factor)))
    
    def _calculate_question_time(self, total_time, question_count, difficulty):
        """Calculate time allocation per question."""
        base_time = total_time // question_count
        difficulty_multiplier = {
            'easy': 0.8,
            'medium': 1.0,
            'hard': 1.3
        }.get(difficulty, 1.0)
        
        return max(120, min(600, int(base_time * difficulty_multiplier)))  # 2-10 minutes
    
    def _get_difficulty_distribution(self, questions):
        """Get distribution of question difficulties."""
        distribution = {'easy': 0, 'medium': 0, 'hard': 0}
        for question in questions:
            distribution[question.difficulty_level] += 1
        return distribution
    
    def _transcribe_audio_file(self, file_path):
        """Transcribe audio file to text."""
        try:
            # Mock transcription - in real implementation, use speech recognition service
            # like Google Cloud Speech-to-Text, AWS Transcribe, or Azure Speech
            
            mock_responses = [
                "I believe this approach would be most effective because it addresses the core requirements while maintaining scalability.",
                "In my experience, the key factors to consider are performance, maintainability, and user experience.",
                "I would start by analyzing the requirements, then design the architecture, and implement it in iterative phases.",
                "This technology offers several advantages including improved efficiency and better user experience.",
                "My approach would involve thorough testing, documentation, and collaboration with the team."
            ]
            
            import random
            return random.choice(mock_responses)
            
        except Exception as e:
            logger.error(f"Transcription error: {str(e)}")
            return "I apologize, but I was unable to process my audio response. Let me type my answer instead."
    
    def _check_security_violations(self, session, event_type):
        """Check if security event constitutes a violation."""
        events = session.security_metadata.get('events', [])
        
        # Count specific event types
        tab_switches = len([e for e in events if e.get('type') == 'tab_switch'])
        window_blurs = len([e for e in events if e.get('type') == 'window_blur'])
        dev_tools_attempts = len([e for e in events if e.get('type') == 'dev_tools'])
        
        # Define violation thresholds
        violations = {
            'tab_switch': tab_switches >= 3,
            'window_blur': window_blurs >= 5,
            'dev_tools': dev_tools_attempts >= 1,
            'copy_attempt': event_type == 'copy_attempt',
            'paste_attempt': event_type == 'paste_attempt'
        }
        
        return any(violations.values())
    
    def _calculate_interview_evaluation(self, session, responses):
        """Calculate comprehensive interview evaluation."""
        # Mock evaluation - in real implementation, use AI for evaluation
        return {
            'overall_score': 85,
            'technical_score': 88,
            'communication_score': 82,
            'problem_solving_score': 87,
            'response_quality': 'Good',
            'strengths': [
                'Clear communication',
                'Logical problem-solving approach',
                'Good technical knowledge'
            ],
            'areas_for_improvement': [
                'Could provide more specific examples',
                'Consider edge cases in solutions'
            ],
            'recommendation': 'Proceed to next round'
        }
    
    def _get_fallback_questions(self, interview_type, difficulty_level, count):
        """Generate fallback questions when AI service fails."""
        fallback_questions = {
            'technical': [
                "Explain the difference between synchronous and asynchronous programming.",
                "How would you optimize a slow database query?",
                "Describe the SOLID principles in software development.",
                "What is the difference between REST and GraphQL?",
                "How do you handle error handling in your applications?",
                "Explain the concept of microservices architecture.",
                "What are design patterns and give examples?",
                "How do you ensure code quality in your projects?"
            ],
            'communication': [
                "Tell me about a challenging project you worked on.",
                "How do you handle conflicts in a team?",
                "Describe your approach to learning new technologies.",
                "How do you explain technical concepts to non-technical stakeholders?",
                "Tell me about a time you had to meet a tight deadline.",
                "How do you prioritize tasks when everything seems urgent?",
                "Describe your ideal work environment.",
                "How do you handle feedback and criticism?"
            ],
            'behavioral': [
                "Tell me about a time you showed leadership.",
                "Describe a situation where you had to learn something quickly.",
                "How do you handle stress and pressure?",
                "Tell me about a mistake you made and how you handled it.",
                "Describe a time you worked with a difficult team member.",
                "How do you stay motivated during challenging projects?",
                "Tell me about a time you exceeded expectations.",
                "How do you handle multiple competing priorities?"
            ]
        }
        
        questions_list = fallback_questions.get(interview_type, fallback_questions['technical'])
        selected_questions = questions_list[:count] if len(questions_list) >= count else questions_list * ((count // len(questions_list)) + 1)
        selected_questions = selected_questions[:count]
        
        # Format as expected by the rest of the code
        formatted_questions = []
        for i, question_text in enumerate(selected_questions):
            formatted_questions.append({
                'text': question_text,
                'difficulty': difficulty_level,
                'category': interview_type,
                'time_limit': 300,  # 5 minutes default
                'expected_length': 'medium',
                'criteria': {
                    'technical_accuracy': 'Check for correct understanding',
                    'communication': 'Evaluate clarity and structure',
                    'problem_solving': 'Assess logical approach'
                }
            })
        
        return formatted_questions
