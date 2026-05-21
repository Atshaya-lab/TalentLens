from django.db import models
import uuid
from apps.users.models import User

class Notification(models.Model):
    """Model for system notifications"""
    
    # Keep integer ID for compatibility, add UUID for security
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    
    NOTIFICATION_TYPES = [
        ('interview_scheduled', 'Interview Scheduled'),
        ('interview_completed', 'Interview Completed'),
        ('interview_reminder', 'Interview Reminder'),
        ('resume_uploaded', 'Resume Uploaded'),
        ('resume_analyzed', 'Resume Analyzed'),
        ('student_assigned', 'Student Assigned'),
        ('feedback_available', 'Feedback Available'),
        ('system_announcement', 'System Announcement'),
    ]
    
    PRIORITY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    recipient = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='notifications'
    )
    sender = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='sent_notifications', 
        null=True, blank=True
    )
    notification_type = models.CharField(max_length=30, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    priority = models.CharField(max_length=10, choices=PRIORITY_LEVELS, default='medium')
    
    # Status fields
    is_read = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)  # Additional data like links, IDs
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.recipient.username}"
    
    @property
    def is_expired(self):
        """Check if notification has expired"""
        if not self.expires_at:
            return False
        from django.utils import timezone
        return timezone.now() > self.expires_at

class NotificationPreference(models.Model):
    """Model for user notification preferences"""
    
    # Default id field (auto-incrementing primary key)
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='notification_preferences'
    )
    
    # Email notifications
    email_interview_reminders = models.BooleanField(default=True)
    email_feedback_available = models.BooleanField(default=True)
    email_system_announcements = models.BooleanField(default=True)
    
    # In-app notifications
    app_interview_updates = models.BooleanField(default=True)
    app_resume_updates = models.BooleanField(default=True)
    app_feedback_updates = models.BooleanField(default=True)
    
    # Notification frequency for reminders
    reminder_frequency_hours = models.IntegerField(default=24)  # Hours before interview
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'notification_preferences'
    
    def __str__(self):
        return f"Preferences for {self.user.username}"

class NotificationTemplate(models.Model):
    """Model for notification templates"""
    
    # Default id field (auto-incrementing primary key)
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    
    name = models.CharField(max_length=100, unique=True)
    notification_type = models.CharField(max_length=30, choices=Notification.NOTIFICATION_TYPES)
    subject_template = models.CharField(max_length=200)
    body_template = models.TextField()
    
    # Template variables (stored as JSON for documentation)
    available_variables = models.JSONField(default=dict)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'notification_templates'
    
    def __str__(self):
        return f"Template: {self.name}"
    
    def render(self, context):
        """Render template with context variables"""
        from string import Template
        
        subject = Template(self.subject_template).safe_substitute(context)
        body = Template(self.body_template).safe_substitute(context)
        
        return subject, body
