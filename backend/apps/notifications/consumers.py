import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

User = get_user_model()

class NotificationConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time notifications"""
    
    async def connect(self):
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.room_group_name = f'user_{self.user_id}'
        
        # Check if user is authenticated and authorized
        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            await self.close()
            return
        
        # Only allow users to connect to their own notification channel
        if user.id != self.user_id:
            await self.close()
            return
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'mark_read':
                notification_id = data.get('notification_id')
                await self.mark_notification_read(notification_id)
            elif message_type == 'get_unread_count':
                count = await self.get_unread_count()
                await self.send(text_data=json.dumps({
                    'type': 'unread_count',
                    'count': count
                }))
        except json.JSONDecodeError:
            pass
    
    async def send_notification(self, event):
        """Send notification to WebSocket"""
        notification = event['notification']
        
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'notification': notification
        }))
    
    async def notification_update(self, event):
        """Send notification update to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'notification_update',
            'data': event['data']
        }))
    
    @database_sync_to_async
    def mark_notification_read(self, notification_id):
        """Mark notification as read"""
        from .models import Notification
        from django.utils import timezone
        
        try:
            notification = Notification.objects.get(
                id=notification_id,
                recipient_id=self.user_id
            )
            if not notification.is_read:
                notification.is_read = True
                notification.read_at = timezone.now()
                notification.save()
        except Notification.DoesNotExist:
            pass
    
    @database_sync_to_async
    def get_unread_count(self):
        """Get count of unread notifications"""
        from .models import Notification
        
        return Notification.objects.filter(
            recipient_id=self.user_id,
            is_read=False,
            is_archived=False
        ).count()
