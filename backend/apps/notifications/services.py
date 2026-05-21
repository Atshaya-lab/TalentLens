from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Notification, NotificationTemplate
from apps.users.models import User
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    """Service for creating and managing notifications"""
    
    def __init__(self):
        self.channel_layer = get_channel_layer()
    
    def create_notification(self, recipient, sender, notification_type, title, message, **kwargs):
        """Create a single notification"""
        notification = Notification.objects.create(
            recipient=recipient,
            sender=sender,
            notification_type=notification_type,
            title=title,
            message=message,
            priority=kwargs.get('priority', 'medium'),
            metadata=kwargs.get('metadata', {}),
            expires_at=kwargs.get('expires_at')
        )
        
        # Send real-time notification
        self._send_realtime_notification(notification)
        
        # Send email if enabled
        if self._should_send_email(recipient, notification_type):
            self._send_email_notification(notification)
        
        return notification
    
    def create_bulk_notifications(self, sender, recipient_ids, notification_type, title, message, **kwargs):
        """Create notifications for multiple recipients"""
        recipients = User.objects.filter(id__in=recipient_ids)
        notifications = []
        
        for recipient in recipients:
            notification = self.create_notification(
                recipient=recipient,
                sender=sender,
                notification_type=notification_type,
                title=title,
                message=message,
                **kwargs
            )
            notifications.append(notification)
        
        return notifications
    
    def notify_interview_scheduled(self, interview_session):
        """Send notification when interview is scheduled"""
        student = interview_session.student
        teacher = interview_session.teacher
        
        title = "New Interview Scheduled"
        message = f"You have a {interview_session.interview_type} interview scheduled for {interview_session.scheduled_datetime.strftime('%B %d, %Y at %I:%M %p')}"
        
        return self.create_notification(
            recipient=student,
            sender=teacher,
            notification_type='interview_scheduled',
            title=title,
            message=message,
            metadata={
                'interview_id': interview_session.id,
                'interview_type': interview_session.interview_type,
                'scheduled_datetime': interview_session.scheduled_datetime.isoformat()
            }
        )
    
    def notify_interview_reminder(self, interview_session):
        """Send reminder notification before interview"""
        student = interview_session.student
        
        title = "Interview Reminder"
        message = f"Your {interview_session.interview_type} interview starts in 30 minutes. Please be prepared."
        
        return self.create_notification(
            recipient=student,
            sender=None,
            notification_type='interview_reminder',
            title=title,
            message=message,
            priority='high',
            metadata={
                'interview_id': interview_session.id,
                'interview_type': interview_session.interview_type
            }
        )
    
    def notify_interview_completed(self, interview_session):
        """Send notification when interview is completed"""
        student = interview_session.student
        teacher = interview_session.teacher
        
        # Notify student
        student_title = "Interview Completed"
        student_message = f"You have completed your {interview_session.interview_type} interview. Results will be available soon."
        
        student_notification = self.create_notification(
            recipient=student,
            sender=None,
            notification_type='interview_completed',
            title=student_title,
            message=student_message,
            metadata={'interview_id': interview_session.id}
        )
        
        # Notify teacher
        teacher_title = "Student Interview Completed"
        teacher_message = f"{student.full_name} has completed their {interview_session.interview_type} interview."
        
        teacher_notification = self.create_notification(
            recipient=teacher,
            sender=None,
            notification_type='interview_completed',
            title=teacher_title,
            message=teacher_message,
            metadata={'interview_id': interview_session.id, 'student_id': student.id}
        )
        
        return [student_notification, teacher_notification]
    
    def notify_feedback_available(self, interview_session):
        """Send notification when feedback is available"""
        student = interview_session.student
        overall_score = interview_session.calculate_overall_score()
        
        title = "Interview Feedback Available"
        message = f"Your {interview_session.interview_type} interview feedback is now available. Overall score: {overall_score}/100"
        
        return self.create_notification(
            recipient=student,
            sender=interview_session.teacher,
            notification_type='feedback_available',
            title=title,
            message=message,
            metadata={
                'interview_id': interview_session.id,
                'overall_score': overall_score
            }
        )
    
    def notify_resume_uploaded(self, resume):
        """Send notification when resume is uploaded"""
        student = resume.student
        uploaded_by = resume.uploaded_by
        
        if uploaded_by == student:
            # Self-upload
            title = "Resume Uploaded Successfully"
            message = "Your resume has been uploaded and is being analyzed."
        else:
            # Uploaded by teacher
            title = "Resume Uploaded by Teacher"
            message = f"Your teacher {uploaded_by.full_name} has uploaded a resume for you."
        
        return self.create_notification(
            recipient=student,
            sender=uploaded_by if uploaded_by != student else None,
            notification_type='resume_uploaded',
            title=title,
            message=message,
            metadata={'resume_id': resume.id}
        )
    
    def notify_resume_analyzed(self, resume):
        """Send notification when resume analysis is complete"""
        student = resume.student
        analysis = getattr(resume, 'analysis', None)
        
        title = "Resume Analysis Complete"
        if analysis:
            message = f"Your resume has been analyzed. Overall score: {analysis.overall_score}/100"
            metadata = {
                'resume_id': resume.id,
                'overall_score': analysis.overall_score
            }
        else:
            message = "Your resume has been analyzed. Check your profile for details."
            metadata = {'resume_id': resume.id}
        
        return self.create_notification(
            recipient=student,
            sender=None,
            notification_type='resume_analyzed',
            title=title,
            message=message,
            metadata=metadata
        )
    
    def notify_student_assigned(self, teacher, student):
        """Send notification when student is assigned to teacher"""
        # Notify teacher
        teacher_title = "New Student Assigned"
        teacher_message = f"Student {student.full_name} has been assigned to you."
        
        teacher_notification = self.create_notification(
            recipient=teacher,
            sender=None,
            notification_type='student_assigned',
            title=teacher_title,
            message=teacher_message,
            metadata={'student_id': student.id}
        )
        
        # Notify student
        student_title = "Teacher Assigned"
        student_message = f"You have been assigned to teacher {teacher.full_name}."
        
        student_notification = self.create_notification(
            recipient=student,
            sender=None,
            notification_type='student_assigned',
            title=student_title,
            message=student_message,
            metadata={'teacher_id': teacher.id}
        )
        
        return [teacher_notification, student_notification]
    
    def _send_realtime_notification(self, notification):
        """Send real-time notification via WebSocket"""
        if not self.channel_layer:
            return
        
        try:
            room_group_name = f'user_{notification.recipient.id}'
            
            async_to_sync(self.channel_layer.group_send)(
                room_group_name,
                {
                    'type': 'send_notification',
                    'notification': {
                        'id': notification.id,
                        'title': notification.title,
                        'message': notification.message,
                        'notification_type': notification.notification_type,
                        'priority': notification.priority,
                        'created_at': notification.created_at.isoformat(),
                        'metadata': notification.metadata
                    }
                }
            )
        except Exception as e:
            logger.error(f"Error sending real-time notification: {str(e)}")
    
    def _should_send_email(self, recipient, notification_type):
        """Check if email should be sent based on user preferences"""
        preferences = getattr(recipient, 'notification_preferences', None)
        if not preferences:
            return True  # Default to sending emails
        
        email_settings = {
            'interview_reminder': preferences.email_interview_reminders,
            'feedback_available': preferences.email_feedback_available,
            'system_announcement': preferences.email_system_announcements,
        }
        
        return email_settings.get(notification_type, True)
    
    def _send_email_notification(self, notification):
        """Send email notification (placeholder for actual email implementation)"""
        # This would integrate with Django's email system
        # For now, just log the action
        logger.info(f"Email notification sent to {notification.recipient.email}: {notification.title}")
        pass
