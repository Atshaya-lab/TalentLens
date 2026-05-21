from django.db import models
import uuid
from django.utils import timezone
from apps.users.models import User

class DashboardMetrics(models.Model):
    """Model for storing dashboard metrics snapshots"""
    
    # Keep integer ID for compatibility, add UUID for security
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    
    # Date for the metrics
    date = models.DateField(default=timezone.now)
    
    # User statistics
    total_users = models.IntegerField(default=0)
    total_students = models.IntegerField(default=0)
    total_teachers = models.IntegerField(default=0)
    active_users_today = models.IntegerField(default=0)
    new_users_today = models.IntegerField(default=0)
    
    # Interview statistics
    total_interviews = models.IntegerField(default=0)
    interviews_today = models.IntegerField(default=0)
    completed_interviews = models.IntegerField(default=0)
    average_score = models.FloatField(default=0.0)
    
    # Resume statistics
    total_resumes = models.IntegerField(default=0)
    resumes_uploaded_today = models.IntegerField(default=0)
    average_resume_score = models.FloatField(default=0.0)
    
    # System metrics
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'dashboard_metrics'
        unique_together = ('date',)
        ordering = ['-date']
    
    def __str__(self):
        return f"Metrics for {self.date}"

class StudentProgress(models.Model):
    """Model for tracking student progress over time"""
    
    # Use UUID as primary key for better security
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='progress_records',
        limit_choices_to={'role': 'student'}
    )
    
    # Progress metrics
    total_interviews = models.IntegerField(default=0)
    completed_interviews = models.IntegerField(default=0)
    average_score = models.FloatField(default=0.0)
    
    # Skill-specific scores
    technical_average = models.FloatField(default=0.0)
    communication_average = models.FloatField(default=0.0)
    aptitude_average = models.FloatField(default=0.0)
    
    # Improvement tracking
    score_trend = models.CharField(
        max_length=20,
        choices=[('improving', 'Improving'), ('declining', 'Declining'), ('stable', 'Stable')],
        default='stable'
    )
    improvement_percentage = models.FloatField(default=0.0)
    
    # Time-based metrics
    last_interview_date = models.DateTimeField(null=True, blank=True)
    streak_days = models.IntegerField(default=0)  # Consecutive days with activity
    
    # Calculated at
    calculated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'student_progress'
        unique_together = ('student',)
    
    def __str__(self):
        return f"Progress for {self.student.username}"

class TeacherStats(models.Model):
    """Model for teacher performance statistics"""
    
    # Use UUID as primary key for better security
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    
    teacher = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='teacher_stats',
        limit_choices_to={'role': 'teacher'}
    )
    
    # Student management
    total_students = models.IntegerField(default=0)
    active_students = models.IntegerField(default=0)
    
    # Interview statistics
    total_interviews_conducted = models.IntegerField(default=0)
    interviews_this_month = models.IntegerField(default=0)
    average_student_score = models.FloatField(default=0.0)
    
    # Engagement metrics
    feedback_completion_rate = models.FloatField(default=0.0)  # Percentage
    student_improvement_rate = models.FloatField(default=0.0)  # Percentage
    
    # Recent activity
    last_activity_date = models.DateTimeField(null=True, blank=True)
    
    # Updated timestamps
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'teacher_stats'
    
    def __str__(self):
        return f"Stats for {self.teacher.username}"

class SystemAlert(models.Model):
    """Model for system alerts and notifications"""
    
    # Use UUID as primary key for better security
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    
    ALERT_TYPES = [
        ('info', 'Information'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('success', 'Success'),
    ]
    
    SEVERITY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    title = models.CharField(max_length=200)
    message = models.TextField()
    alert_type = models.CharField(max_length=10, choices=ALERT_TYPES)
    severity = models.CharField(max_length=10, choices=SEVERITY_LEVELS)
    
    # Targeting
    target_roles = models.JSONField(default=list)  # Which roles should see this alert
    target_users = models.ManyToManyField(User, blank=True)  # Specific users
    
    # Status
    is_active = models.BooleanField(default=True)
    auto_dismiss_after = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_alerts'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'system_alerts'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.alert_type.title()}: {self.title}"
    
    @property
    def is_expired(self):
        """Check if alert has expired"""
        if not self.auto_dismiss_after:
            return False
        return timezone.now() > self.auto_dismiss_after
