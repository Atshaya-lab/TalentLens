import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { User, InterviewSession, Resume, Notification } from '../types';
import { apiService } from '../utils/api';

// Generic API hook
export function useApi<T>(
  apiCall: () => Promise<{ data: T }>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiCall();
      setData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Interviews hook
export function useInterviews(filters?: {
  status?: string;
  category?: string;
}) {
  const [interviews, setInterviews] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInterviews = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getInterviews(filters);
      setInterviews(response.data.results);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch interviews');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchInterviews();
  }, [fetchInterviews]);

  const createInterview = async (data: Partial<InterviewSession>) => {
    try {
      const response = await apiService.createInterview(data);
      setInterviews(prev => [response.data, ...prev]);
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create interview'
      };
    }
  };

  const updateInterview = async (id: number, data: Partial<InterviewSession>) => {
    try {
      const response = await apiService.updateInterview(id, data);
      setInterviews(prev => 
        prev.map(interview => 
          interview.id === id ? response.data : interview
        )
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update interview'
      };
    }
  };

  const deleteInterview = async (id: number) => {
    try {
      await apiService.deleteInterview(id);
      setInterviews(prev => prev.filter(interview => interview.id !== id));
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete interview'
      };
    }
  };

  return {
    interviews,
    loading,
    error,
    refetch: fetchInterviews,
    createInterview,
    updateInterview,
    deleteInterview,
  };
}

// Notifications hook
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await apiService.getNotifications();
      const notifications = response.data.results || response.data;
      setNotifications(notifications);
      setUnreadCount(notifications.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: number) => {
    try {
      await apiService.markNotificationAsRead(id);
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id
            ? { ...notification, is_read: true }
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiService.markAllNotificationsAsRead();
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}

// Local storage hook
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue] as const;
}

// Debounced value hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Previous value hook
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  
  useEffect(() => {
    ref.current = value;
  });
  
  return ref.current;
}

// Online status hook
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// Intersection observer hook
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options?: IntersectionObserverInit
) {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      options
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [elementRef, options]);

  return isIntersecting;
}

// Timer hook
export function useTimer(initialTime: number = 0) {
  const [time, setTime] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback(() => {
    if (!isRunning) {
      setIsRunning(true);
      intervalRef.current = setInterval(() => {
        setTime(prevTime => prevTime + 1);
      }, 1000);
    }
  }, [isRunning]);

  const pause = useCallback(() => {
    if (isRunning && intervalRef.current) {
      setIsRunning(false);
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [isRunning]);

  const reset = useCallback(() => {
    setTime(initialTime);
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [initialTime]);

  const stop = useCallback(() => {
    pause();
    setTime(initialTime);
  }, [pause, initialTime]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    time,
    isRunning,
    start,
    pause,
    reset,
    stop,
  };
}

// Toast hook
export function useToast() {
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    // This is a simple implementation - in a real app, you might want to use a toast library
    // For now, we'll just use alert or console.log
    if (type === 'error') {
      console.error(message);
      alert(`Error: ${message}`);
    } else if (type === 'warning') {
      console.warn(message);
      alert(`Warning: ${message}`);
    } else if (type === 'success') {
      console.log(message);
      alert(`Success: ${message}`);
    } else {
      console.log(message);
      alert(`Info: ${message}`);
    }
  }, []);

  return { showToast };
}
