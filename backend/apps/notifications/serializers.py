from rest_framework import serializers
from .models import Notification, NotificationPreference, NotificationTemplate

class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for notifications"""
    
    sender_name = serializers.CharField(source='sender.full_name', read_only=True)
    time_ago = serializers.SerializerMethodField()
    is_expired = serializers.ReadOnlyField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'sender', 'sender_name', 'notification_type', 'title',
            'message', 'priority', 'is_read', 'is_archived', 'read_at',
            'metadata', 'created_at', 'expires_at', 'time_ago', 'is_expired'
        ]
        read_only_fields = ['sender', 'created_at']
    
    def get_time_ago(self, obj):
        """Get human-readable time since notification was created"""
        from django.utils import timezone
        from datetime import datetime, timedelta
        
        now = timezone.now()
        diff = now - obj.created_at
        
        if diff.days > 0:
            return f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        else:
            return "Just now"

class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """Serializer for notification preferences"""
    
    class Meta:
        model = NotificationPreference
        fields = [
            'id', 'email_interview_reminders', 'email_feedback_available',
            'email_system_announcements', 'app_interview_updates',
            'app_resume_updates', 'app_feedback_updates',
            'reminder_frequency_hours', 'updated_at'
        ]

class NotificationTemplateSerializer(serializers.ModelSerializer):
    """Serializer for notification templates"""
    
    class Meta:
        model = NotificationTemplate
        fields = [
            'id', 'name', 'notification_type', 'subject_template',
            'body_template', 'available_variables', 'is_active',
            'created_at', 'updated_at'
        ]

class NotificationCreateSerializer(serializers.Serializer):
    """Serializer for creating notifications"""
    
    recipient_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True
    )
    notification_type = serializers.ChoiceField(choices=Notification.NOTIFICATION_TYPES)
    title = serializers.CharField(max_length=200)
    message = serializers.CharField()
    priority = serializers.ChoiceField(
        choices=Notification.PRIORITY_LEVELS,
        default='medium'
    )
    metadata = serializers.JSONField(required=False, default=dict)
    expires_at = serializers.DateTimeField(required=False)
    
    def validate_recipient_ids(self, value):
        """Validate recipient IDs"""
        from apps.users.models import User
        
        if not value:
            raise serializers.ValidationError("At least one recipient is required")
        
        # Check if all recipient IDs exist
        existing_ids = User.objects.filter(id__in=value).values_list('id', flat=True)
        invalid_ids = set(value) - set(existing_ids)
        
        if invalid_ids:
            raise serializers.ValidationError(f"Invalid recipient IDs: {list(invalid_ids)}")
        
        return value

class BulkNotificationActionSerializer(serializers.Serializer):
    """Serializer for bulk notification actions"""
    
    notification_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True
    )
    action = serializers.ChoiceField(
        choices=['mark_read', 'mark_unread', 'archive', 'unarchive', 'delete']
    )
    
    def validate_notification_ids(self, value):
        """Validate notification IDs"""
        if not value:
            raise serializers.ValidationError("At least one notification ID is required")
        return value
