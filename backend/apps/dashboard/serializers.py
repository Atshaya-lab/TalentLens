from rest_framework import serializers
from .models import DashboardMetrics, StudentProgress, TeacherStats, SystemAlert

class DashboardMetricsSerializer(serializers.ModelSerializer):
    """Serializer for dashboard metrics"""
    
    class Meta:
        model = DashboardMetrics
        fields = [
            'date', 'total_users', 'total_students', 'total_teachers',
            'active_users_today', 'new_users_today', 'total_interviews',
            'interviews_today', 'completed_interviews', 'average_score',
            'total_resumes', 'resumes_uploaded_today', 'average_resume_score',
            'created_at'
        ]

class StudentProgressSerializer(serializers.ModelSerializer):
    """Serializer for student progress"""
    
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    completion_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = StudentProgress
        fields = [
            'student', 'student_name', 'total_interviews', 'completed_interviews',
            'average_score', 'technical_average', 'communication_average',
            'aptitude_average', 'score_trend', 'improvement_percentage',
            'completion_rate', 'last_interview_date', 'streak_days',
            'calculated_at'
        ]
    
    def get_completion_rate(self, obj):
        """Calculate completion rate percentage"""
        if obj.total_interviews == 0:
            return 0
        return round((obj.completed_interviews / obj.total_interviews) * 100, 2)

class TeacherStatsSerializer(serializers.ModelSerializer):
    """Serializer for teacher statistics"""
    
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)
    
    class Meta:
        model = TeacherStats
        fields = [
            'teacher', 'teacher_name', 'total_students', 'active_students',
            'total_interviews_conducted', 'interviews_this_month',
            'average_student_score', 'feedback_completion_rate',
            'student_improvement_rate', 'last_activity_date', 'updated_at'
        ]

class SystemAlertSerializer(serializers.ModelSerializer):
    """Serializer for system alerts"""
    
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    is_expired = serializers.ReadOnlyField()
    
    class Meta:
        model = SystemAlert
        fields = [
            'id', 'title', 'message', 'alert_type', 'severity',
            'target_roles', 'is_active', 'auto_dismiss_after',
            'created_by', 'created_by_name', 'created_at', 'updated_at',
            'is_expired'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']

class DashboardOverviewSerializer(serializers.Serializer):
    """Serializer for dashboard overview data"""
    
    # User statistics
    total_users = serializers.IntegerField()
    total_students = serializers.IntegerField()
    total_teachers = serializers.IntegerField()
    new_users_this_week = serializers.IntegerField()
    
    # Interview statistics
    total_interviews = serializers.IntegerField()
    interviews_this_week = serializers.IntegerField()
    completed_interviews = serializers.IntegerField()
    average_score = serializers.FloatField()
    
    # Recent activity
    recent_interviews = serializers.ListField()
    top_performing_students = serializers.ListField()
    alerts = serializers.ListField()

class StudentDashboardSerializer(serializers.Serializer):
    """Serializer for student dashboard data"""
    
    # Personal statistics
    total_interviews = serializers.IntegerField()
    completed_interviews = serializers.IntegerField()
    average_score = serializers.FloatField()
    score_trend = serializers.CharField()
    
    # Skill breakdown
    technical_average = serializers.FloatField()
    communication_average = serializers.FloatField()
    aptitude_average = serializers.FloatField()
    
    # Progress data
    improvement_percentage = serializers.FloatField()
    streak_days = serializers.IntegerField()
    next_interview = serializers.DictField(allow_null=True)
    
    # Recent activity
    recent_interviews = serializers.ListField()
    achievements = serializers.ListField()

class TeacherDashboardSerializer(serializers.Serializer):
    """Serializer for teacher dashboard data"""
    
    # Student management
    total_students = serializers.IntegerField()
    active_students = serializers.IntegerField()
    
    # Interview statistics
    interviews_conducted = serializers.IntegerField()
    interviews_this_month = serializers.IntegerField()
    average_student_score = serializers.FloatField()
    
    # Recent activity
    recent_interviews = serializers.ListField()
    student_progress = serializers.ListField()
    pending_reviews = serializers.ListField()
