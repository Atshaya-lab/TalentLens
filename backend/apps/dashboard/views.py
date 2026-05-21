from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import DashboardMetrics, StudentProgress, TeacherStats, SystemAlert
from .serializers import (
    DashboardMetricsSerializer, StudentProgressSerializer,
    TeacherStatsSerializer, SystemAlertSerializer,
    DashboardOverviewSerializer, StudentDashboardSerializer,
    TeacherDashboardSerializer
)
from .services import DashboardAnalyticsService

class DashboardViewSet(viewsets.GenericViewSet):
    """ViewSet for dashboard data and analytics"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def overview(self, request):
        """Get dashboard overview based on user role"""
        user = request.user
        
        if user.role == 'administrator':
            data = DashboardAnalyticsService.get_admin_overview()
            serializer = DashboardOverviewSerializer(data)
            return Response(serializer.data)
        
        elif user.role == 'teacher':
            data = DashboardAnalyticsService.get_teacher_dashboard(user.id)
            serializer = TeacherDashboardSerializer(data)
            return Response(serializer.data)
        
        elif user.role == 'student':
            data = DashboardAnalyticsService.get_student_dashboard(user.id)
            serializer = StudentDashboardSerializer(data)
            return Response(serializer.data)
        
        else:
            return Response(
                {'error': 'Invalid user role'},
                status=status.HTTP_403_FORBIDDEN
            )
    
    @action(detail=False, methods=['get'])
    def metrics(self, request):
        """Get historical metrics (admin only)"""
        if request.user.role != 'administrator':
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get metrics for the last 30 days
        metrics = DashboardMetrics.objects.all()[:30]
        serializer = DashboardMetricsSerializer(metrics, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def student_progress(self, request):
        """Get student progress data"""
        user = request.user
        
        if user.role == 'student':
            # Get own progress
            try:
                progress = StudentProgress.objects.get(student=user)
                serializer = StudentProgressSerializer(progress)
                return Response(serializer.data)
            except StudentProgress.DoesNotExist:
                return Response({'message': 'No progress data available'})
        
        elif user.role == 'teacher':
            # Get progress for assigned students
            from apps.users.models import TeacherStudentMapping
            student_ids = TeacherStudentMapping.objects.filter(
                teacher=user, is_active=True
            ).values_list('student_id', flat=True)
            
            progress_records = StudentProgress.objects.filter(
                student_id__in=student_ids
            )
            serializer = StudentProgressSerializer(progress_records, many=True)
            return Response(serializer.data)
        
        elif user.role == 'administrator':
            # Get all student progress
            progress_records = StudentProgress.objects.all()
            serializer = StudentProgressSerializer(progress_records, many=True)
            return Response(serializer.data)
        
        else:
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )
    
    @action(detail=False, methods=['get'])
    def progress(self, request):
        """Get progress tracking data for analytics page"""
        user = request.user
        
        if user.role not in ['teacher', 'administrator']:
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            from datetime import datetime, timedelta
            from django.db.models import Avg, Count
            from apps.interviews.models import InterviewSession
            
            # Get the last 8 weeks of data
            weeks_data = []
            for i in range(8):
                week_start = datetime.now() - timedelta(weeks=i+1)
                week_end = datetime.now() - timedelta(weeks=i)
                
                # Filter interviews for this week
                week_interviews = InterviewSession.objects.filter(
                    created_at__gte=week_start,
                    created_at__lt=week_end,
                    status='completed'
                )
                
                # Filter by user role
                if user.role == 'teacher':
                    from apps.users.models import TeacherStudentMapping
                    student_ids = TeacherStudentMapping.objects.filter(
                        teacher=user, is_active=True
                    ).values_list('student_id', flat=True)
                    week_interviews = week_interviews.filter(student_id__in=student_ids)
                
                # Calculate week stats
                interviews_count = week_interviews.count()
                avg_score = week_interviews.filter(feedback__isnull=False).aggregate(
                    avg=Avg('feedback__overall_score')
                )['avg'] or 0
                
                weeks_data.append({
                    'week': f'Week {i+1}',
                    'interviews_completed': interviews_count,
                    'score': round(avg_score, 1) if avg_score else 0
                })
            
            # Reverse to show oldest first
            weeks_data.reverse()
            
            # Generate skill breakdown data
            skill_breakdown = []
            if user.role == 'teacher':
                from apps.users.models import TeacherStudentMapping
                student_ids = TeacherStudentMapping.objects.filter(
                    teacher=user, is_active=True
                ).values_list('student_id', flat=True)
                
                # Get recent interviews for skill analysis
                recent_interviews = InterviewSession.objects.filter(
                    student_id__in=student_ids,
                    status='completed',
                    feedback__isnull=False,
                    created_at__gte=datetime.now() - timedelta(days=30)
                )
            else:
                # Administrator sees all interviews
                recent_interviews = InterviewSession.objects.filter(
                    status='completed',
                    feedback__isnull=False,
                    created_at__gte=datetime.now() - timedelta(days=30)
                )
            
            # Calculate skill averages
            technical_avg = recent_interviews.aggregate(avg=Avg('feedback__technical_score'))['avg'] or 0
            communication_avg = recent_interviews.aggregate(avg=Avg('feedback__communication_score'))['avg'] or 0
            problem_solving_avg = recent_interviews.aggregate(avg=Avg('feedback__problem_solving_score'))['avg'] or 0
            overall_avg = recent_interviews.aggregate(avg=Avg('feedback__overall_score'))['avg'] or 0
            
            skill_breakdown = [
                {
                    'skill': 'Technical Skills',
                    'progress': round(technical_avg, 1) if technical_avg else 0,
                    'students_count': recent_interviews.filter(feedback__technical_score__gt=0).count()
                },
                {
                    'skill': 'Communication',
                    'progress': round(communication_avg, 1) if communication_avg else 0,
                    'students_count': recent_interviews.filter(feedback__communication_score__gt=0).count()
                },
                {
                    'skill': 'Problem Solving',
                    'progress': round(problem_solving_avg, 1) if problem_solving_avg else 0,
                    'students_count': recent_interviews.filter(feedback__problem_solving_score__gt=0).count()
                },
                {
                    'skill': 'Overall Performance',
                    'progress': round(overall_avg, 1) if overall_avg else 0,
                    'students_count': recent_interviews.count()
                }
            ]
            
            # Generate performance trends by category
            performance_trends = []
            if recent_interviews.exists():
                import random
                from django.db.models import Avg
                # Get trends by interview type (category)
                category_performance = recent_interviews.values('interview_type').annotate(
                    avg_score=Avg('feedback__overall_score'),
                    count=Count('id')
                ).order_by('interview_type')
                
                for category in category_performance:
                    # Calculate change percentage (mock data for now)
                    change_pct = f"+{random.randint(1, 10)}%" if category['avg_score'] > 70 else f"-{random.randint(1, 5)}%"
                    score_value = round(category['avg_score'], 1)
                    performance_trends.append({
                        'category': category['interview_type'],
                        'date': datetime.now().strftime('%Y-%m-%d'),
                        'value': score_value,
                        'score': score_value,  # Add score property for frontend
                        'change': change_pct,
                        'count': category['count']
                    })
            else:
                # Default sample data if no interviews
                performance_trends = [
                    {'category': 'technical', 'date': '2025-06-15', 'value': 85, 'score': 85, 'change': '+5%', 'count': 5},
                    {'category': 'communication', 'date': '2025-06-15', 'value': 82, 'score': 82, 'change': '+3%', 'count': 5},
                    {'category': 'aptitude', 'date': '2025-06-15', 'value': 88, 'score': 88, 'change': '+7%', 'count': 5}
                ]
            
            return Response({
                'weekly_progress': weeks_data,
                'skill_breakdown': skill_breakdown,
                'performance_trends': performance_trends,
                'total_weeks': 8,
                'total_interviews': recent_interviews.count()
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to fetch progress data: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def teacher_stats(self, request):
        """Get teacher statistics"""
        user = request.user
        
        if user.role == 'teacher':
            # Get own stats
            try:
                stats = TeacherStats.objects.get(teacher=user)
                serializer = TeacherStatsSerializer(stats)
                return Response(serializer.data)
            except TeacherStats.DoesNotExist:
                return Response({'message': 'No statistics available'})
        
        elif user.role == 'administrator':
            # Get all teacher stats
            stats = TeacherStats.objects.all()
            serializer = TeacherStatsSerializer(stats, many=True)
            return Response(serializer.data)
        
        else:
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )
    
    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Get detailed analytics data"""
        user = request.user
        
        if user.role != 'administrator':
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get various analytics data
        from django.db.models import Count, Avg
        from apps.users.models import User
        from apps.interviews.models import InterviewSession
        from apps.resumes.models import Resume
        
        analytics_data = {
            'user_growth': self._get_user_growth_data(),
            'interview_trends': self._get_interview_trends(),
            'performance_distribution': self._get_performance_distribution(),
            'skill_analysis': self._get_skill_analysis()
        }
        
        return Response(analytics_data)
    
    def _get_user_growth_data(self):
        """Get user growth data over time"""
        from django.db.models import Count
        from django.db.models.functions import TruncMonth
        from apps.users.models import User
        
        growth_data = User.objects.annotate(
            month=TruncMonth('date_joined')
        ).values('month').annotate(
            count=Count('id')
        ).order_by('month')
        
        return list(growth_data)
    
    def _get_interview_trends(self):
        """Get interview trends over time"""
        from django.db.models import Count
        from django.db.models.functions import TruncWeek
        from apps.interviews.models import InterviewSession
        
        trends = InterviewSession.objects.annotate(
            week=TruncWeek('created_at')
        ).values('week', 'interview_type').annotate(
            count=Count('id')
        ).order_by('week')
        
        return list(trends)
    
    def _get_performance_distribution(self):
        """Get score distribution data"""
        from apps.interviews.models import InterviewSession
        
        # Get completed interviews with scores
        completed_interviews = InterviewSession.objects.filter(status='completed')
        
        score_ranges = {
            '0-20': 0, '21-40': 0, '41-60': 0,
            '61-80': 0, '81-100': 0
        }
        
        for interview in completed_interviews:
            score = interview.calculate_overall_score()
            if score <= 20:
                score_ranges['0-20'] += 1
            elif score <= 40:
                score_ranges['21-40'] += 1
            elif score <= 60:
                score_ranges['41-60'] += 1
            elif score <= 80:
                score_ranges['61-80'] += 1
            else:
                score_ranges['81-100'] += 1
        
        return score_ranges
    
    def _get_skill_analysis(self):
        """Get skill analysis data"""
        from django.db.models import Avg
        from apps.interviews.models import InterviewSession
        
        skill_averages = {}
        for interview_type in ['technical', 'communication', 'aptitude']:
            sessions = InterviewSession.objects.filter(
                interview_type=interview_type,
                status='completed'
            )
            
            if sessions.exists():
                scores = [s.calculate_overall_score() for s in sessions]
                skill_averages[interview_type] = sum(scores) / len(scores)
            else:
                skill_averages[interview_type] = 0
        
        return skill_averages
    
    @action(detail=False, methods=['get'])
    def performance(self, request):
        """Get performance metrics with optional filtering"""
        user = request.user
        period = request.query_params.get('period', '30d')
        category = request.query_params.get('category', None)
        
        if user.role not in ['teacher', 'administrator']:
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            from datetime import datetime, timedelta
            from django.db.models import Avg, Count
            from apps.interviews.models import InterviewSession
            
            # Parse period
            if period == '7d':
                start_date = datetime.now() - timedelta(days=7)
            elif period == '30d':
                start_date = datetime.now() - timedelta(days=30)
            elif period == '90d':
                start_date = datetime.now() - timedelta(days=90)
            else:
                start_date = datetime.now() - timedelta(days=30)
            
            # Base queryset
            interviews = InterviewSession.objects.filter(
                created_at__gte=start_date,
                status='completed'
            )
            
            # Filter by user role
            if user.role == 'teacher':
                from apps.users.models import TeacherStudentMapping
                student_ids = TeacherStudentMapping.objects.filter(
                    teacher=user, is_active=True
                ).values_list('student_id', flat=True)
                interviews = interviews.filter(student_id__in=student_ids)
            
            # Filter by category if provided
            if category:
                interviews = interviews.filter(interview_type=category)
            
            # Calculate metrics
            total_interviews = interviews.count()
            # Get average score from related InterviewFeedback
            avg_score = interviews.filter(feedback__isnull=False).aggregate(
                avg=Avg('feedback__overall_score')
            )['avg'] or 0
            
            # Group by day for trend data
            from django.db.models.functions import TruncDate
            daily_stats = interviews.annotate(
                date=TruncDate('created_at')
            ).values('date').annotate(
                count=Count('id'),
                avg_score=Avg('feedback__overall_score')
            ).order_by('date')
            
            performance_data = {
                'total_interviews': total_interviews,
                'average_score': round(avg_score, 1),
                'daily_trends': list(daily_stats),
                'period': period,
                'category': category
            }
            
            return Response(performance_data)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to fetch performance data: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def teacher_analytics(self, request):
        """Get detailed analytics for teachers"""
        user = request.user
        
        if user.role != 'teacher':
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        period = request.GET.get('period', '30d')
        analytics_data = DashboardAnalyticsService.get_teacher_analytics(user.id, period)
        
        return Response(analytics_data)
    
    @action(detail=False, methods=['get'])
    def students_analytics(self, request):
        """Get analytics for all students of a teacher"""
        user = request.user
        
        if user.role != 'teacher':
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        period = request.GET.get('period', '30d')
        students_data = DashboardAnalyticsService.get_students_analytics(user.id, period)
        
        return Response(students_data)
    
    @action(detail=False, methods=['get'])
    def students_with_progress(self, request):
        """Get students with comprehensive progress data for teacher dashboard"""
        user = request.user
        
        if user.role not in ['teacher', 'administrator']:
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            from datetime import datetime, timedelta
            from django.db.models import Avg, Count, Max
            from apps.interviews.models import InterviewSession, InterviewFeedback
            from apps.users.models import User, TeacherStudentMapping
            from apps.resumes.models import Resume
            
            # Get students based on user role
            if user.role == 'teacher':
                # Get students assigned to this teacher
                student_ids = TeacherStudentMapping.objects.filter(
                    teacher=user, is_active=True
                ).values_list('student_id', flat=True)
                students = User.objects.filter(id__in=student_ids, role='student')
            else:
                # Administrator sees all students
                students = User.objects.filter(role='student')
            
            students_data = []
            
            for student in students:
                # Get student's interviews
                student_interviews = InterviewSession.objects.filter(student=student)
                completed_interviews = student_interviews.filter(status='completed')
                
                # Calculate interview statistics
                total_interviews = student_interviews.count()
                completed_count = completed_interviews.count()
                
                # Get average score from feedback
                feedback_scores = completed_interviews.filter(
                    feedback__isnull=False
                ).aggregate(
                    avg_score=Avg('feedback__overall_score'),
                    technical_avg=Avg('feedback__technical_score'),
                    communication_avg=Avg('feedback__communication_score'),
                    problem_solving_avg=Avg('feedback__problem_solving_score')
                )
                
                avg_score = feedback_scores['avg_score'] or 0
                
                # Get last activity date
                last_activity = student_interviews.aggregate(
                    last_date=Max('created_at')
                )['last_date']
                
                if not last_activity:
                    last_activity = student.date_joined
                
                # Calculate progress percentage
                progress_percentage = (completed_count / total_interviews * 100) if total_interviews > 0 else 0
                
                # Get resume information
                try:
                    resume = Resume.objects.filter(student=student).first()
                    has_resume = resume is not None
                    resume_data = {
                        'id': resume.id if resume else None,
                        'title': resume.title if resume else None,
                        'uploaded_date': resume.upload_date if resume else None,
                        'analyzed': bool(resume.analysis_version) if resume else False
                    } if resume else None
                except:
                    has_resume = False
                    resume_data = None
                
                # Get recent interview performance
                recent_interviews = completed_interviews.filter(
                    feedback__isnull=False
                ).order_by('-created_at')[:5]
                
                recent_performance = []
                for interview in recent_interviews:
                    recent_performance.append({
                        'date': interview.created_at.strftime('%Y-%m-%d'),
                        'type': interview.interview_type,
                        'score': interview.feedback.overall_score if interview.feedback else 0,
                        'duration': interview.duration_minutes
                    })
                
                student_data = {
                    'id': student.id,
                    'first_name': student.first_name,
                    'last_name': student.last_name,
                    'email': student.email,
                    'phone_number': student.phone_number,
                    'is_active': student.is_active,
                    'date_joined': student.date_joined.strftime('%Y-%m-%d'),
                    'last_activity': last_activity.strftime('%Y-%m-%d') if last_activity else student.date_joined.strftime('%Y-%m-%d'),
                    
                    # Progress data
                    'total_interviews': total_interviews,
                    'completed_interviews': completed_count,
                    'average_score': round(avg_score, 1),
                    'progress_percentage': round(progress_percentage, 1),
                    
                    # Skill breakdown
                    'technical_score': round(feedback_scores['technical_avg'] or 0, 1),
                    'communication_score': round(feedback_scores['communication_avg'] or 0, 1),
                    'problem_solving_score': round(feedback_scores['problem_solving_avg'] or 0, 1),
                    
                    # Resume data
                    'has_resume': has_resume,
                    'resume': resume_data,
                    
                    # Recent performance
                    'recent_performance': recent_performance,
                    
                    # Status indicators
                    'status': 'active' if student.is_active else 'inactive',
                    'resume_status': 'analyzed' if (resume_data and resume_data['analyzed']) else ('uploaded' if has_resume else 'none')
                }
                
                students_data.append(student_data)
            
            # Sort students by last activity (most recent first)
            students_data.sort(key=lambda x: x['last_activity'], reverse=True)
            
            return Response({
                'students': students_data,
                'total_count': len(students_data),
                'active_count': len([s for s in students_data if s['is_active']]),
                'with_resume_count': len([s for s in students_data if s['has_resume']]),
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to fetch students with progress: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def student_analytics(self, request, pk=None):
        """Get detailed analytics for a specific student"""
        user = request.user
        
        if user.role not in ['teacher', 'administrator']:
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            from datetime import datetime, timedelta
            from django.db.models import Avg, Count
            from apps.interviews.models import InterviewSession, InterviewFeedback
            from apps.users.models import User, TeacherStudentMapping
            
            # Get the student
            try:
                student = User.objects.get(id=pk, role='student')
            except User.DoesNotExist:
                return Response(
                    {'error': 'Student not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check if teacher has access to this student
            if user.role == 'teacher':
                has_access = TeacherStudentMapping.objects.filter(
                    teacher=user, student=student, is_active=True
                ).exists()
                if not has_access:
                    return Response(
                        {'error': 'Access denied to this student'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            # Get student's interviews
            student_interviews = InterviewSession.objects.filter(
                student=student, status='completed'
            )
            
            total_interviews = student_interviews.count()
            
            # Calculate averages
            averages = student_interviews.filter(
                feedback__isnull=False
            ).aggregate(
                overall_avg=Avg('feedback__overall_score'),
                technical_avg=Avg('feedback__technical_score'),
                communication_avg=Avg('feedback__communication_score'),
                problem_solving_avg=Avg('feedback__problem_solving_score')
            )
            
            average_score = averages['overall_avg'] or 0
            
            # Calculate trend (compare recent vs older performance)
            recent_interviews = student_interviews.filter(
                created_at__gte=datetime.now() - timedelta(days=30),
                feedback__isnull=False
            )
            
            older_interviews = student_interviews.filter(
                created_at__lt=datetime.now() - timedelta(days=30),
                feedback__isnull=False
            )
            
            recent_avg = recent_interviews.aggregate(
                avg=Avg('feedback__overall_score')
            )['avg'] or 0
            
            older_avg = older_interviews.aggregate(
                avg=Avg('feedback__overall_score')
            )['avg'] or 0
            
            if older_avg == 0:
                trend = 'stable'
            elif recent_avg > older_avg + 5:
                trend = 'improving'
            elif recent_avg < older_avg - 5:
                trend = 'declining'
            else:
                trend = 'stable'
            
            # Get recent interviews for display
            recent_interview_list = student_interviews.filter(
                feedback__isnull=False
            ).order_by('-created_at')[:10]
            
            recent_interviews_data = []
            for interview in recent_interview_list:
                recent_interviews_data.append({
                    'date': interview.created_at.strftime('%Y-%m-%d'),
                    'interview_type': interview.interview_type,
                    'score': interview.feedback.overall_score,
                    'duration': interview.duration_minutes
                })
            
            analytics_data = {
                'total_interviews': total_interviews,
                'average_score': round(average_score, 1),
                'trend': trend,
                'skills': {
                    'technical': round(averages['technical_avg'] or 0, 1),
                    'communication': round(averages['communication_avg'] or 0, 1),
                    'problem_solving': round(averages['problem_solving_avg'] or 0, 1)
                },
                'recent_interviews': recent_interviews_data,
                'performance_summary': {
                    'recent_average': round(recent_avg, 1),
                    'overall_average': round(average_score, 1),
                    'improvement': round(recent_avg - older_avg, 1) if older_avg > 0 else 0
                }
            }
            
            return Response(analytics_data)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to fetch student analytics: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class SystemAlertViewSet(viewsets.ModelViewSet):
    """ViewSet for system alerts"""
    
    serializer_class = SystemAlertSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # Filter alerts based on user role and targeting
        queryset = SystemAlert.objects.filter(is_active=True)
        
        if user.role != 'administrator':
            # Non-admin users see alerts targeted to their role or to them specifically
            queryset = queryset.filter(
                Q(target_roles__contains=[user.role]) |
                Q(target_users=user) |
                Q(target_roles=[])  # Global alerts
            ).distinct()
        
        return queryset.order_by('-created_at')
    
    def create(self, request, *args, **kwargs):
        """Create system alert (admin only)"""
        if request.user.role != 'administrator':
            return Response(
                {'error': 'Only administrators can create system alerts'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().create(request, *args, **kwargs)
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
