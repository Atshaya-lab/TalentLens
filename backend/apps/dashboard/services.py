from django.db.models import Avg, Count, Q, F, Max
from django.utils import timezone
from datetime import datetime, timedelta
from apps.users.models import User, TeacherStudentMapping
from apps.interviews.models import InterviewSession, InterviewResponse
from apps.resumes.models import Resume, ResumeAnalysis
from .models import DashboardMetrics, StudentProgress, TeacherStats

class DashboardAnalyticsService:
    """Service for generating dashboard analytics and metrics"""
    
    @staticmethod
    def get_admin_overview():
        """Get overview data for administrators"""
        now = timezone.now()
        week_ago = now - timedelta(days=7)
        
        # User statistics
        total_users = User.objects.count()
        total_students = User.objects.filter(role='student').count()
        total_teachers = User.objects.filter(role='teacher').count()
        new_users_this_week = User.objects.filter(date_joined__gte=week_ago).count()
        
        # Interview statistics
        total_interviews = InterviewSession.objects.count()
        interviews_this_week = InterviewSession.objects.filter(
            created_at__gte=week_ago
        ).count()
        completed_interviews = InterviewSession.objects.filter(
            status='completed'
        ).count()
        
        # Calculate average score
        avg_score = InterviewSession.objects.filter(
            status='completed'
        ).aggregate(
            avg=Avg('questions__response__score')
        )['avg'] or 0
        
        # Recent interviews
        recent_interviews = InterviewSession.objects.filter(
            created_at__gte=week_ago
        ).select_related('student', 'teacher').order_by('-created_at')[:10]
        
        recent_interviews_data = [{
            'id': interview.id,
            'student_name': interview.student.full_name,
            'teacher_name': interview.teacher.full_name,
            'interview_type': interview.interview_type,
            'status': interview.status,
            'scheduled_datetime': interview.scheduled_datetime,
            'score': interview.calculate_overall_score()
        } for interview in recent_interviews]
        
        # Top performing students
        top_students = DashboardAnalyticsService._get_top_performing_students(limit=5)
        
        return {
            'total_users': total_users,
            'total_students': total_students,
            'total_teachers': total_teachers,
            'new_users_this_week': new_users_this_week,
            'total_interviews': total_interviews,
            'interviews_this_week': interviews_this_week,
            'completed_interviews': completed_interviews,
            'average_score': round(avg_score, 2),
            'recent_interviews': recent_interviews_data,
            'top_performing_students': top_students,
            'alerts': []  # System alerts would go here
        }
    
    @staticmethod
    def get_student_dashboard(student_id):
        """Get dashboard data for a specific student"""
        student = User.objects.get(id=student_id, role='student')
        
        # Get or create progress record
        progress, created = StudentProgress.objects.get_or_create(
            student=student,
            defaults={
                'total_interviews': 0,
                'completed_interviews': 0,
                'average_score': 0.0
            }
        )
        
        if created or progress.calculated_at < timezone.now() - timedelta(hours=1):
            # Update progress data
            DashboardAnalyticsService._update_student_progress(progress)
        
        # Get recent interviews
        recent_interviews = InterviewSession.objects.filter(
            student=student
        ).order_by('-created_at')[:5]
        
        recent_interviews_data = [{
            'id': interview.id,
            'interview_type': interview.interview_type,
            'status': interview.status,
            'scheduled_datetime': interview.scheduled_datetime,
            'score': interview.calculate_overall_score(),
            'teacher_name': interview.teacher.full_name
        } for interview in recent_interviews]
        
        # Next interview
        next_interview = InterviewSession.objects.filter(
            student=student,
            status='scheduled',
            scheduled_datetime__gt=timezone.now()
        ).order_by('scheduled_datetime').first()
        
        next_interview_data = None
        if next_interview:
            next_interview_data = {
                'id': next_interview.id,
                'interview_type': next_interview.interview_type,
                'scheduled_datetime': next_interview.scheduled_datetime,
                'teacher_name': next_interview.teacher.full_name
            }
        
        # Achievements (placeholder for now)
        achievements = DashboardAnalyticsService._get_student_achievements(student)
        
        return {
            'total_interviews': progress.total_interviews,
            'completed_interviews': progress.completed_interviews,
            'average_score': progress.average_score,
            'score_trend': progress.score_trend,
            'technical_average': progress.technical_average,
            'communication_average': progress.communication_average,
            'aptitude_average': progress.aptitude_average,
            'improvement_percentage': progress.improvement_percentage,
            'streak_days': progress.streak_days,
            'next_interview': next_interview_data,
            'recent_interviews': recent_interviews_data,
            'achievements': achievements
        }
    
    @staticmethod
    def get_teacher_dashboard(teacher_id):
        """Get dashboard data for a specific teacher"""
        teacher = User.objects.get(id=teacher_id, role='teacher')
        
        # Get or create stats record
        stats, created = TeacherStats.objects.get_or_create(
            teacher=teacher,
            defaults={
                'total_students': 0,
                'active_students': 0,
                'total_interviews_conducted': 0
            }
        )
        
        if created or stats.updated_at < timezone.now() - timedelta(hours=1):
            # Update stats data
            DashboardAnalyticsService._update_teacher_stats(stats)
        
        # Get assigned students
        student_mappings = TeacherStudentMapping.objects.filter(
            teacher=teacher,
            is_active=True
        ).select_related('student')
        
        # Recent interviews
        recent_interviews = InterviewSession.objects.filter(
            teacher=teacher
        ).select_related('student').order_by('-created_at')[:10]
        
        recent_interviews_data = [{
            'id': interview.id,
            'student_name': interview.student.full_name,
            'interview_type': interview.interview_type,
            'status': interview.status,
            'scheduled_datetime': interview.scheduled_datetime,
            'score': interview.calculate_overall_score()
        } for interview in recent_interviews]
        
        # Student progress data
        student_progress = []
        for mapping in student_mappings:
            progress = StudentProgress.objects.filter(student=mapping.student).first()
            if progress:
                student_progress.append({
                    'student_id': mapping.student.id,
                    'student_name': mapping.student.full_name,
                    'average_score': progress.average_score,
                    'score_trend': progress.score_trend,
                    'total_interviews': progress.total_interviews,
                    'last_interview_date': progress.last_interview_date
                })
        
        # Pending reviews (interviews completed but not reviewed)
        pending_reviews = InterviewSession.objects.filter(
            teacher=teacher,
            status='completed'
        ).exclude(
            feedback__isnull=False
        )[:5]
        
        pending_reviews_data = [{
            'id': interview.id,
            'student_name': interview.student.full_name,
            'interview_type': interview.interview_type,
            'completed_at': interview.completed_at,
            'score': interview.calculate_overall_score()
        } for interview in pending_reviews]
        
        return {
            'total_students': stats.total_students,
            'active_students': stats.active_students,
            'interviews_conducted': stats.total_interviews_conducted,
            'interviews_this_month': stats.interviews_this_month,
            'average_student_score': stats.average_student_score,
            'recent_interviews': recent_interviews_data,
            'student_progress': student_progress,
            'pending_reviews': pending_reviews_data
        }
    
    @staticmethod
    def _get_top_performing_students(limit=10):
        """Get top performing students based on average scores"""
        top_students = StudentProgress.objects.filter(
            completed_interviews__gt=0
        ).order_by('-average_score')[:limit]
        
        return [{
            'student_id': progress.student.id,
            'student_name': progress.student.full_name,
            'average_score': progress.average_score,
            'total_interviews': progress.total_interviews,
            'improvement_percentage': progress.improvement_percentage
        } for progress in top_students]
    
    @staticmethod
    def _update_student_progress(progress):
        """Update student progress data"""
        student = progress.student
        
        # Get interview statistics
        interviews = InterviewSession.objects.filter(student=student)
        completed_interviews = interviews.filter(status='completed')
        
        progress.total_interviews = interviews.count()
        progress.completed_interviews = completed_interviews.count()
        
        if completed_interviews.exists():
            # Calculate average scores from feedback
            from apps.interviews.models import InterviewFeedback
            
            # Get all feedback for completed interviews
            feedbacks = InterviewFeedback.objects.filter(
                session__student=student,
                session__status='completed'
            )
            
            if feedbacks.exists():
                progress.average_score = feedbacks.aggregate(avg=Avg('overall_score'))['avg'] or 0
                
                # Calculate skill-specific averages from feedback
                technical_feedbacks = feedbacks.filter(session__interview_type='technical')
                communication_feedbacks = feedbacks.filter(session__interview_type='communication')
                aptitude_feedbacks = feedbacks.filter(session__interview_type='aptitude')
                
                progress.technical_average = technical_feedbacks.aggregate(avg=Avg('technical_score'))['avg'] or 0
                progress.communication_average = communication_feedbacks.aggregate(avg=Avg('communication_score'))['avg'] or 0
                progress.aptitude_average = aptitude_feedbacks.aggregate(avg=Avg('problem_solving_score'))['avg'] or 0
            
            # Get last interview date
            last_interview = completed_interviews.order_by('-completed_at').first()
            if last_interview:
                progress.last_interview_date = last_interview.completed_at
            
            # Calculate improvement trend (compare last 3 vs previous 3 interviews)
            recent_feedback_scores = list(feedbacks.order_by('-session__completed_at')[:6].values_list(
                'overall_score', flat=True
            ))
            
            # Filter out None values and convert to list of valid scores
            valid_scores = [score for score in recent_feedback_scores if score is not None]
            
            if len(valid_scores) >= 6:
                recent_avg = sum(valid_scores[:3]) / 3
                previous_avg = sum(valid_scores[3:6]) / 3
                
                if recent_avg > previous_avg * 1.05:  # 5% improvement threshold
                    progress.score_trend = 'improving'
                    progress.improvement_percentage = ((recent_avg - previous_avg) / previous_avg) * 100
                elif recent_avg < previous_avg * 0.95:  # 5% decline threshold
                    progress.score_trend = 'declining'
                    progress.improvement_percentage = ((recent_avg - previous_avg) / previous_avg) * 100
                else:
                    progress.score_trend = 'stable'
                    progress.improvement_percentage = 0
        else:
            # No completed interviews - reset all scores to 0
            progress.average_score = 0.0
            progress.technical_average = 0.0
            progress.communication_average = 0.0
            progress.aptitude_average = 0.0
            progress.score_trend = 'stable'
            progress.improvement_percentage = 0.0
            progress.last_interview_date = None
        
        progress.save()
    
    @staticmethod
    def _update_teacher_stats(stats):
        """Update teacher statistics"""
        teacher = stats.teacher
        now = timezone.now()
        month_ago = now - timedelta(days=30)
        
        # Get assigned students
        student_mappings = TeacherStudentMapping.objects.filter(
            teacher=teacher,
            is_active=True
        )
        
        stats.total_students = student_mappings.count()
        
        # Active students (those with recent interviews)
        recent_interview_students = InterviewSession.objects.filter(
            teacher=teacher,
            created_at__gte=month_ago
        ).values_list('student_id', flat=True).distinct()
        
        stats.active_students = len(set(recent_interview_students))
        
        # Interview statistics
        interviews = InterviewSession.objects.filter(teacher=teacher)
        stats.total_interviews_conducted = interviews.count()
        stats.interviews_this_month = interviews.filter(created_at__gte=month_ago).count()
        
        # Average student score
        completed_interviews = interviews.filter(status='completed')
        if completed_interviews.exists():
            avg_scores = [interview.calculate_overall_score() for interview in completed_interviews]
            # Filter out None values
            valid_avg_scores = [score for score in avg_scores if score is not None]
            if valid_avg_scores:
                stats.average_student_score = sum(valid_avg_scores) / len(valid_avg_scores)
            else:
                stats.average_student_score = 0
        
        # Last activity
        last_interview = interviews.order_by('-created_at').first()
        if last_interview:
            stats.last_activity_date = last_interview.created_at
        
        stats.save()
    
    @staticmethod
    def _get_student_achievements(student):
        """Get student achievements (placeholder implementation)"""
        achievements = []
        
        # Check for various achievements
        completed_interviews = InterviewSession.objects.filter(
            student=student,
            status='completed'
        ).count()
        
        if completed_interviews >= 1:
            achievements.append({
                'title': 'First Interview Completed',
                'description': 'Completed your first interview',
                'icon': 'trophy',
                'earned_at': InterviewSession.objects.filter(
                    student=student,
                    status='completed'
                ).first().completed_at
            })
        
        if completed_interviews >= 5:
            achievements.append({
                'title': 'Interview Veteran',
                'description': 'Completed 5 interviews',
                'icon': 'star',
                'earned_at': InterviewSession.objects.filter(
                    student=student,
                    status='completed'
                ).order_by('completed_at')[4].completed_at
            })
        
        # Check for high scores
        high_score_interviews = InterviewSession.objects.filter(
            student=student,
            status='completed',
            questions__response__score__gte=90
        ).distinct()
        
        if high_score_interviews.exists():
            achievements.append({
                'title': 'High Achiever',
                'description': 'Scored 90+ in an interview',
                'icon': 'award',
                'earned_at': high_score_interviews.first().completed_at
            })
        
        return achievements
    
    @staticmethod
    def get_teacher_analytics(teacher_id, period='30d'):
        """Get detailed analytics for a teacher"""
        from django.db.models import Count, Avg, Q
        from django.db.models.functions import TruncMonth, TruncWeek
        from apps.users.models import User, TeacherStudentMapping
        from apps.interviews.models import InterviewSession, InterviewFeedback
        from datetime import datetime, timedelta
        from django.utils import timezone
        
        teacher = User.objects.get(id=teacher_id, role='teacher')
        
        # Calculate period
        now = timezone.now()
        if period == '7d':
            start_date = now - timedelta(days=7)
        elif period == '30d':
            start_date = now - timedelta(days=30)
        elif period == '90d':
            start_date = now - timedelta(days=90)
        else:  # 1y
            start_date = now - timedelta(days=365)
        
        # Get assigned students
        assigned_students = TeacherStudentMapping.objects.filter(
            teacher=teacher,
            is_active=True
        ).values_list('student_id', flat=True)
        
        # Basic stats
        total_students = len(assigned_students)
        
        # Interviews conducted by teacher
        interviews = InterviewSession.objects.filter(
            teacher=teacher,
            created_at__gte=start_date
        )
        
        total_interviews_conducted = interviews.count()
        
        # Calculate average student score
        completed_interviews = interviews.filter(status='completed')
        scores = []
        for interview in completed_interviews:
            score = interview.calculate_overall_score()
            if score > 0:
                scores.append(score)
        
        average_student_score = sum(scores) / len(scores) if scores else 0
        
        # Calculate improvement rate (comparing first half vs second half of period)
        mid_date = start_date + (now - start_date) / 2
        first_half_scores = []
        second_half_scores = []
        
        for interview in completed_interviews:
            score = interview.calculate_overall_score()
            if score > 0:
                if interview.created_at < mid_date:
                    first_half_scores.append(score)
                else:
                    second_half_scores.append(score)
        
        first_half_avg = sum(first_half_scores) / len(first_half_scores) if first_half_scores else 0
        second_half_avg = sum(second_half_scores) / len(second_half_scores) if second_half_scores else 0
        
        improvement_rate = 0
        if first_half_avg > 0:
            improvement_rate = ((second_half_avg - first_half_avg) / first_half_avg) * 100

        # Interview distribution by type
        interview_distribution = interviews.values('interview_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Add average scores for each type
        for dist in interview_distribution:
            type_interviews = completed_interviews.filter(interview_type=dist['interview_type'])
            type_scores = []
            for interview in type_interviews:
                score = interview.calculate_overall_score()
                if score > 0:
                    type_scores.append(score)
            dist['average_score'] = sum(type_scores) / len(type_scores) if type_scores else 0

        # Monthly activity
        monthly_data = interviews.annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            interviews=Count('id')
        ).order_by('month')
        
        # Add scores to monthly data
        for month_data in monthly_data:
            month_interviews = completed_interviews.filter(
                created_at__month=month_data['month'].month,
                created_at__year=month_data['month'].year
            )
            month_scores = []
            for interview in month_interviews:
                score = interview.calculate_overall_score()
                if score > 0:
                    month_scores.append(score)
            
            month_data['average_score'] = sum(month_scores) / len(month_scores) if month_scores else 0
            month_data['students'] = month_interviews.values('student').distinct().count()
            month_data['month'] = month_data['month'].strftime('%b %Y')

        # Skill performance analysis
        skill_performance = []
        interview_types = ['technical', 'behavioral', 'communication', 'problem_solving']
        
        for skill in interview_types:
            skill_interviews = completed_interviews.filter(interview_type=skill)
            skill_scores = []
            for interview in skill_interviews:
                score = interview.calculate_overall_score()
                if score > 0:
                    skill_scores.append(score)
            
            if skill_scores:
                # Calculate improvement for this skill
                skill_first_half = []
                skill_second_half = []
                for interview in skill_interviews:
                    score = interview.calculate_overall_score()
                    if score > 0:
                        if interview.created_at < mid_date:
                            skill_first_half.append(score)
                        else:
                            skill_second_half.append(score)
                
                skill_first_avg = sum(skill_first_half) / len(skill_first_half) if skill_first_half else 0
                skill_second_avg = sum(skill_second_half) / len(skill_second_half) if skill_second_half else 0
                
                skill_improvement = 0
                if skill_first_avg > 0:
                    skill_improvement = ((skill_second_avg - skill_first_avg) / skill_first_avg) * 100
                
                skill_performance.append({
                    'skill': skill,
                    'average_score': sum(skill_scores) / len(skill_scores),
                    'student_count': skill_interviews.values('student').distinct().count(),
                    'improvement': skill_improvement
                })

        return {
            'total_students': total_students,
            'total_interviews_conducted': total_interviews_conducted,
            'average_student_score': average_student_score,
            'improvement_rate': improvement_rate,
            'interview_distribution': list(interview_distribution),
            'monthly_activity': list(monthly_data),
            'skill_performance': skill_performance
        }
    
    @staticmethod
    def get_students_analytics(teacher_id, period='30d'):
        """Get analytics for all students of a teacher"""
        from django.db.models import Count, Avg
        from apps.users.models import User, TeacherStudentMapping
        from apps.interviews.models import InterviewSession
        from datetime import datetime, timedelta
        from django.utils import timezone
        
        teacher = User.objects.get(id=teacher_id, role='teacher')
        
        # Calculate period
        now = timezone.now()
        if period == '7d':
            start_date = now - timedelta(days=7)
        elif period == '30d':
            start_date = now - timedelta(days=30)
        elif period == '90d':
            start_date = now - timedelta(days=90)
        else:  # 1y
            start_date = now - timedelta(days=365)
        
        # Get assigned students
        student_mappings = TeacherStudentMapping.objects.filter(
            teacher=teacher,
            is_active=True
        ).select_related('student')
        
        students_data = []
        
        for mapping in student_mappings:
            student = mapping.student
            
            # Get student's interviews with this teacher in the period
            student_interviews = InterviewSession.objects.filter(
                student=student,
                teacher=teacher,
                created_at__gte=start_date
            )
            
            completed_interviews = student_interviews.filter(status='completed')
            
            # Calculate scores
            scores = []
            for interview in completed_interviews:
                score = interview.calculate_overall_score()
                if score > 0:
                    scores.append(score)
            
            average_score = sum(scores) / len(scores) if scores else 0
            
            # Calculate improvement rate
            mid_date = start_date + (now - start_date) / 2
            first_half_scores = []
            second_half_scores = []
            
            for interview in completed_interviews:
                score = interview.calculate_overall_score()
                if score > 0:
                    if interview.created_at < mid_date:
                        first_half_scores.append(score)
                    else:
                        second_half_scores.append(score)
            
            first_half_avg = sum(first_half_scores) / len(first_half_scores) if first_half_scores else 0
            second_half_avg = sum(second_half_scores) / len(second_half_scores) if second_half_scores else 0
            
            improvement_rate = 0
            if first_half_avg > 0:
                improvement_rate = ((second_half_avg - first_half_avg) / first_half_avg) * 100
            
            # Performance trends
            performance_trend = []
            for interview in completed_interviews.order_by('created_at'):
                score = interview.calculate_overall_score()
                if score > 0:
                    performance_trend.append({
                        'date': interview.created_at.isoformat(),
                        'score': score,
                        'interview_type': interview.interview_type
                    })
            
            # Last interview date
            last_interview = student_interviews.order_by('-created_at').first()
            last_interview_date = last_interview.created_at.isoformat() if last_interview else None
            
            students_data.append({
                'id': student.id,
                'name': student.get_full_name() or student.username,
                'total_interviews': student_interviews.count(),
                'completed_interviews': completed_interviews.count(),
                'average_score': average_score,
                'improvement_rate': improvement_rate,
                'last_interview_date': last_interview_date,
                'performance_trend': performance_trend
            })
        
        return students_data
