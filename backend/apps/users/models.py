from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid

class User(AbstractUser):
    """Custom User model with role-based access"""
    
    # Keep integer ID for compatibility, add UUID for security
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    
    ROLE_CHOICES = [
        ('administrator', 'Administrator'),
        ('teacher', 'Teacher'),
        ('student', 'Student'),
    ]
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    phone_number = models.CharField(max_length=15, blank=True)
    profile_picture = models.TextField(blank=True)  # Base64 encoded
    date_of_birth = models.DateField(null=True, blank=True)
    address = models.TextField(blank=True)
    has_premium = models.BooleanField(default=False, help_text="Premium users can add unlimited students")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'users'
        ordering = ['first_name', 'last_name', 'username']  # Alphabetical ordering
    
    def __str__(self):
        return f"{self.username} ({self.role})"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()
    
    @property
    def current_student_count(self):
        """Get the current number of active students for this teacher"""
        if self.role != 'teacher':
            return 0
        return self.assigned_students.filter(is_active=True).count()
    
    def can_add_student(self):
        """Check if teacher can add more students based on premium status"""
        if self.role != 'teacher':
            return False
        if self.has_premium:
            return True
        return self.current_student_count < 3


class UserPreferences(models.Model):
    """User preferences and settings"""
    
    THEME_CHOICES = [
        ('light', 'Light'),
        ('dark', 'Dark'),
        ('auto', 'Auto'),
    ]
    
    LANGUAGE_CHOICES = [
        ('en', 'English'),
        ('es', 'Spanish'),
        ('fr', 'French'),
        ('de', 'German'),
    ]
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='preferences'
    )
    
    # Theme preferences
    theme = models.CharField(
        max_length=10,
        choices=THEME_CHOICES,
        default='light'
    )
    
    # Notification preferences
    email_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)
    push_notifications = models.BooleanField(default=True)
    
    # Application preferences
    auto_save_drafts = models.BooleanField(default=True)
    language = models.CharField(
        max_length=5,
        choices=LANGUAGE_CHOICES,
        default='en'
    )
    timezone = models.CharField(
        max_length=50,
        default='UTC'
    )
    
    # Dashboard preferences
    compact_view = models.BooleanField(default=False)
    show_tips = models.BooleanField(default=True)
    
    # Privacy preferences
    profile_visibility = models.CharField(
        max_length=20,
        choices=[
            ('public', 'Public'),
            ('private', 'Private'),
            ('organization', 'Organization Only'),
        ],
        default='organization'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_preferences'
        verbose_name = 'User Preferences'
        verbose_name_plural = 'User Preferences'
    
    def __str__(self):
        return f"{self.user.username} preferences"
    
    @classmethod
    def get_or_create_for_user(cls, user):
        """Get or create preferences for a user"""
        preferences, created = cls.objects.get_or_create(
            user=user,
            defaults={
                'theme': 'light',
                'email_notifications': True,
                'language': 'en',
                'timezone': 'UTC',
            }
        )
        return preferences

class TeacherStudentMapping(models.Model):
    """Mapping between teachers and students"""
    
    teacher = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='assigned_students',
        limit_choices_to={'role': 'teacher'}
    )
    student = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='assigned_teachers',
        limit_choices_to={'role': 'student'}
    )
    assigned_date = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ('teacher', 'student')
        db_table = 'teacher_students'
        ordering = ['-assigned_date']  # Most recently assigned first
    
    def __str__(self):
        return f"{self.teacher.username} -> {self.student.username}"
