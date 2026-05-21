from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from .models import Notification, NotificationPreference
from .serializers import (
    NotificationSerializer, NotificationPreferenceSerializer,
    NotificationCreateSerializer, BulkNotificationActionSerializer
)
from .services import NotificationService

class NotificationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing notifications"""
    
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Get notifications for the current user"""
        user = self.request.user
        queryset = user.notifications.all()
        
        # Filter by read status
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')
        
        # Filter by archived status
        is_archived = self.request.query_params.get('is_archived')
        if is_archived is not None:
            queryset = queryset.filter(is_archived=is_archived.lower() == 'true')
        
        # Filter by notification type
        notification_type = self.request.query_params.get('type')
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        
        # Filter by priority
        priority = self.request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)
        
        return queryset.order_by('-created_at')
    
    def create(self, request, *args, **kwargs):
        """Create notifications (admin/teacher only)"""
        if request.user.role not in ['administrator', 'teacher']:
            return Response(
                {'error': 'Only administrators and teachers can create notifications'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = NotificationCreateSerializer(data=request.data)
        if serializer.is_valid():
            service = NotificationService()
            notifications = service.create_bulk_notifications(
                sender=request.user,
                recipient_ids=serializer.validated_data['recipient_ids'],
                notification_type=serializer.validated_data['notification_type'],
                title=serializer.validated_data['title'],
                message=serializer.validated_data['message'],
                priority=serializer.validated_data.get('priority', 'medium'),
                metadata=serializer.validated_data.get('metadata', {}),
                expires_at=serializer.validated_data.get('expires_at')
            )
            
            return Response({
                'message': f'Created {len(notifications)} notifications',
                'notification_ids': [n.id for n in notifications]
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark notification as read"""
        notification = self.get_object()
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save()
        
        return Response({'message': 'Notification marked as read'})
    
    @action(detail=True, methods=['post'])
    def mark_unread(self, request, pk=None):
        """Mark notification as unread"""
        notification = self.get_object()
        if notification.is_read:
            notification.is_read = False
            notification.read_at = None
            notification.save()
        
        return Response({'message': 'Notification marked as unread'})
    
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archive notification"""
        notification = self.get_object()
        notification.is_archived = True
        notification.save()
        
        return Response({'message': 'Notification archived'})
    
    @action(detail=False, methods=['post'])
    def bulk_action(self, request):
        """Perform bulk actions on notifications"""
        serializer = BulkNotificationActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        notification_ids = serializer.validated_data['notification_ids']
        action = serializer.validated_data['action']
        
        # Get notifications belonging to current user
        notifications = self.get_queryset().filter(id__in=notification_ids)
        
        if not notifications.exists():
            return Response(
                {'error': 'No valid notifications found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Perform action
        updated_count = 0
        now = timezone.now()
        
        if action == 'mark_read':
            updated_count = notifications.filter(is_read=False).update(
                is_read=True, read_at=now
            )
        elif action == 'mark_unread':
            updated_count = notifications.filter(is_read=True).update(
                is_read=False, read_at=None
            )
        elif action == 'archive':
            updated_count = notifications.filter(is_archived=False).update(
                is_archived=True
            )
        elif action == 'unarchive':
            updated_count = notifications.filter(is_archived=True).update(
                is_archived=False
            )
        elif action == 'delete':
            updated_count = notifications.count()
            notifications.delete()
        
        return Response({
            'message': f'{action.replace("_", " ").title()} action completed',
            'updated_count': updated_count
        })
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications"""
        count = request.user.notifications.filter(
            is_read=False,
            is_archived=False
        ).count()
        
        return Response({'unread_count': count})
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read"""
        updated_count = request.user.notifications.filter(
            is_read=False
        ).update(is_read=True, read_at=timezone.now())
        
        return Response({
            'message': 'All notifications marked as read',
            'updated_count': updated_count
        })

class NotificationPreferenceViewSet(viewsets.ModelViewSet):
    """ViewSet for notification preferences"""
    
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return NotificationPreference.objects.filter(user=self.request.user)
    
    def get_object(self):
        """Get or create notification preferences for current user"""
        obj, created = NotificationPreference.objects.get_or_create(
            user=self.request.user
        )
        return obj
    
    @action(detail=False, methods=['get', 'put'])
    def my_preferences(self, request):
        """Get or update current user's notification preferences"""
        preferences = self.get_object()
        
        if request.method == 'GET':
            serializer = self.get_serializer(preferences)
            return Response(serializer.data)
        
        elif request.method == 'PUT':
            serializer = self.get_serializer(preferences, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response({
                    'message': 'Preferences updated successfully',
                    'preferences': serializer.data
                })
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
