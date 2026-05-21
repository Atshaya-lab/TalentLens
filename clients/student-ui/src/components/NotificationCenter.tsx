import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../utils/api';
import { Notification } from '../types';
import { formatDate } from '../utils/helpers';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { useToast } from '../hooks';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await apiService.getNotifications();
      
      // The response is directly an array of notifications
      const notifications = Array.isArray(response.data) ? response.data : [];
      
      setNotifications(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      showToast('Failed to load notifications', 'error');
      // Set empty array on error to prevent filter errors
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      await apiService.markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.is_read);
      
      // Mark each unread notification as read
      await Promise.all(
        unreadNotifications.map(notif => 
          apiService.markNotificationAsRead(notif.id)
        )
      );
      
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, is_read: true }))
      );
      showToast('All notifications marked as read', 'success');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      showToast('Failed to mark all as read', 'error');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return (
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.99-.833-2.732 0L5.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const unreadNotifications = Array.isArray(notifications) ? notifications.filter(n => !n.is_read) : [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Notifications"
      size="lg"
    >
      <div className="space-y-4">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {unreadNotifications.length} unread of {notifications.length} total
          </div>
          {unreadNotifications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
            >
              Mark All Read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-4a7.97 7.97 0 01-5.417-2.83A5.97 5.97 0 018 11.5V11a8 8 0 018-8 8 8 0 018 8v.5c0 .81-.267 1.56-.733 2.17A7.97 7.97 0 0120 17v-4z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
              <p className="text-gray-500">You&apos;re all caught up!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                    notification.is_read
                      ? 'bg-white border-gray-200'
                      : 'bg-blue-50 border-blue-200'
                  } hover:bg-gray-50`}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <div className="flex items-start space-x-3">
                    {getNotificationIcon(notification.type)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className={`text-sm font-medium ${
                            notification.is_read ? 'text-gray-900' : 'text-blue-900'
                          }`}>
                            {notification.title}
                          </h4>
                          <p className={`text-sm mt-1 ${
                            notification.is_read ? 'text-gray-600' : 'text-blue-700'
                          }`}>
                            {notification.message}
                          </p>
                        </div>
                        
                        {!notification.is_read && (
                          <div className="flex-shrink-0 ml-2">
                            <div className="w-2 h-2 bg-blue-600 rounded-full" />
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {formatDate(notification.created_at)}
                        </span>
                        
                        {notification.action_url && (
                          <a
                            href={notification.action_url}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View Details
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default NotificationCenter;
