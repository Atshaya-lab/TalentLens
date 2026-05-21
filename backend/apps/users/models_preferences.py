from django.db import models
from .models import User

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
