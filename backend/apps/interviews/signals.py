from django.db.models.signals import post_delete, post_save, pre_delete
from django.dispatch import receiver
from django.db import transaction, connection
from django.core.exceptions import ObjectDoesNotExist
import threading
from .models import InterviewSession, InterviewFeedback
from apps.dashboard.models import StudentProgress
from apps.dashboard.services import DashboardAnalyticsService

# Thread-local storage to track cascade delete scenarios
_cascade_delete_context = threading.local()

def is_user_cascade_delete_in_progress():
    """Check if we're currently in a user cascade delete process"""
    return getattr(_cascade_delete_context, 'user_cascade_delete', False)

def set_user_cascade_delete_flag(value):
    """Set the flag indicating user cascade delete is in progress"""
    _cascade_delete_context.user_cascade_delete = value

def is_cascade_delete_scenario(student):
    """
    Check if we're likely in a cascade delete scenario.
    This is a comprehensive check to avoid FK constraint errors during cascade deletes.
    """
    try:
        # First check our thread-local flag
        if is_user_cascade_delete_in_progress():
            return True
            
        # First check if student object is valid
        if not student or not hasattr(student, 'pk') or not student.pk:
            return True
            
        # Check if we're in a transaction that's rolling back
        if connection.in_atomic_block and connection.needs_rollback:
            return True
            
        # Import here to avoid circular imports
        from apps.users.models import User
        
        # Try to refresh from database - if this fails, user is being deleted
        try:
            fresh_user = User.objects.get(pk=student.pk)
            # Additional check: try accessing a field to ensure object is valid
            _ = fresh_user.username
            
        except (User.DoesNotExist, ObjectDoesNotExist):
            return True
        except Exception:
            # Any other exception likely means the object is in an invalid state
            return True
            
        return False
    except Exception:
        # Any exception likely means we're in a problematic state
        return True

@receiver(pre_delete, sender='users.User')
def handle_user_pre_delete(sender, instance, **kwargs):
    """Set flag when user deletion starts to avoid signal conflicts during cascade delete"""
    if instance.role == 'student':
        set_user_cascade_delete_flag(True)

@receiver(post_delete, sender='users.User')
def handle_user_post_delete(sender, instance, **kwargs):
    """Clear flag when user deletion completes"""
    if instance.role == 'student':
        set_user_cascade_delete_flag(False)

@receiver(post_delete, sender=InterviewSession)
def update_progress_after_session_delete(sender, instance, **kwargs):
    """Update student progress after interview session deletion"""
    try:
        # Quick exit if student doesn't exist or is invalid
        if not hasattr(instance, 'student') or not instance.student:
            return
            
        student = instance.student
        
        # Skip if this looks like a cascade delete scenario
        if is_cascade_delete_scenario(student):
            return
            
        # Additional cascade delete check: verify user exists before proceeding
        from apps.users.models import User
        try:
            User.objects.get(pk=student.pk)
        except User.DoesNotExist:
            return  # User is being deleted, skip progress update
            
        # Use atomic transaction with proper exception handling
        try:
            with transaction.atomic():
                # Get existing progress or create new one only if safe
                progress = StudentProgress.objects.filter(student=student).first()
                if not progress:
                    # Double-check that user still exists before creating progress
                    if not User.objects.filter(pk=student.pk).exists():
                        return
                    progress = StudentProgress.objects.create(
                        student=student,
                        total_interviews=0,
                        completed_interviews=0,
                        average_score=0.0,
                        technical_average=0.0,
                        communication_average=0.0,
                        aptitude_average=0.0,
                    )
                
                DashboardAnalyticsService._update_student_progress(progress)
                print(f"✅ Updated progress for student {student.username} after session deletion")
        except Exception as inner_e:
            # If we get an FK constraint error, we're definitely in a cascade delete
            error_msg = str(inner_e)
            if any(phrase in error_msg.lower() for phrase in ['foreign key constraint', 'constraint failed', 'foreign key']):
                return
            # Re-raise other unexpected errors
            raise inner_e
        
    except Exception as e:
        # Log the error but don't re-raise during cascade deletions
        error_msg = str(e)
        if not any(phrase in error_msg.lower() for phrase in ['foreign key constraint', 'constraint failed', 'foreign key']):
            print(f"❌ Error updating progress after session delete: {e}")
        pass

@receiver(post_save, sender=InterviewFeedback)
def update_progress_after_feedback_save(sender, instance, created, **kwargs):
    """Update student progress after feedback is created or updated"""
    try:
        # Quick exit checks
        if not hasattr(instance, 'session') or not instance.session:
            return
        if not hasattr(instance.session, 'student') or not instance.session.student:
            return
            
        student = instance.session.student
        
        # Skip if this looks like a cascade delete scenario
        if is_cascade_delete_scenario(student):
            return
            
        # Additional cascade delete check: verify user exists before proceeding
        from apps.users.models import User
        try:
            User.objects.get(pk=student.pk)
        except User.DoesNotExist:
            return  # User is being deleted, skip progress update
            
        # Use atomic transaction with proper exception handling
        try:
            with transaction.atomic():
                progress, created_progress = StudentProgress.objects.get_or_create(
                    student=student,
                    defaults={
                        'total_interviews': 0,
                        'completed_interviews': 0,
                        'average_score': 0.0,
                        'technical_average': 0.0,
                        'communication_average': 0.0,
                        'aptitude_average': 0.0,
                    }
                )
                
                DashboardAnalyticsService._update_student_progress(progress)
                action = 'creation' if created else 'update'
                print(f"✅ Updated progress for student {student.username} after feedback {action}")
        except Exception as inner_e:
            # If we get an FK constraint error, we're definitely in a cascade delete
            error_msg = str(inner_e)
            if any(phrase in error_msg.lower() for phrase in ['foreign key constraint', 'constraint failed', 'foreign key']):
                return
            # Re-raise other unexpected errors
            raise inner_e
        
    except Exception as e:
        # Log the error but don't re-raise during cascade deletions
        error_msg = str(e)
        if not any(phrase in error_msg.lower() for phrase in ['foreign key constraint', 'constraint failed', 'foreign key']):
            print(f"❌ Error updating progress after feedback save: {e}")
        pass

@receiver(post_delete, sender=InterviewFeedback)
def update_progress_after_feedback_delete(sender, instance, **kwargs):
    """Update student progress after feedback deletion"""  
    try:
        # Quick exit checks
        if not hasattr(instance, 'session') or not instance.session:
            return
        if not hasattr(instance.session, 'student') or not instance.session.student:
            return
            
        student = instance.session.student
        
        # Skip if this looks like a cascade delete scenario
        if is_cascade_delete_scenario(student):
            return
            
        # Additional cascade delete check: verify user exists before proceeding
        from apps.users.models import User
        try:
            User.objects.get(pk=student.pk)
        except User.DoesNotExist:
            return  # User is being deleted, skip progress update
            
        # Use atomic transaction with proper exception handling
        try:
            with transaction.atomic():
                # Get existing progress or create new one only if safe
                progress = StudentProgress.objects.filter(student=student).first()
                if not progress:
                    # Double-check that user still exists before creating progress
                    if not User.objects.filter(pk=student.pk).exists():
                        return
                    progress = StudentProgress.objects.create(
                        student=student,
                        total_interviews=0,
                        completed_interviews=0,
                        average_score=0.0,
                        technical_average=0.0,
                        communication_average=0.0,
                        aptitude_average=0.0,
                    )
                
                DashboardAnalyticsService._update_student_progress(progress)
                print(f"✅ Updated progress for student {student.username} after feedback deletion")
        except Exception as inner_e:
            # If we get an FK constraint error, we're definitely in a cascade delete
            error_msg = str(inner_e)
            if any(phrase in error_msg.lower() for phrase in ['foreign key constraint', 'constraint failed', 'foreign key']):
                return
            # Re-raise other unexpected errors
            raise inner_e
        
    except Exception as e:
        # Log the error but don't re-raise during cascade deletions
        error_msg = str(e)
        if not any(phrase in error_msg.lower() for phrase in ['foreign key constraint', 'constraint failed', 'foreign key']):
            print(f"❌ Error updating progress after feedback delete: {e}")
        pass
