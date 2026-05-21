import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { AuthTokens, User, InterviewSession, Resume, Notification, DashboardStats } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('access_token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
              const response = await this.refreshToken(refreshToken);
              localStorage.setItem('access_token', response.data.access);
              originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/signin';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Authentication methods
  async signin(email: string, password: string): Promise<AxiosResponse<AuthTokens>> {
    return this.api.post('/auth/signin/', { email, password });
  }

  async signup(userData: {
    email: string;
    password: string;
    password_confirm: string;
    first_name: string;
    last_name: string;
    role: string;
    username?: string;
    phone_number?: string;
  }): Promise<AxiosResponse<AuthTokens>> {
    return this.api.post('/auth/signup/', userData);
  }

  async refreshToken(refresh: string): Promise<AxiosResponse<{ access: string }>> {
    return this.api.post('/auth/token/refresh/', { refresh });
  }

  async logout(): Promise<AxiosResponse<void>> {
    return this.api.post('/auth/logout/');
  }

  // User profile methods
  async getCurrentUser(): Promise<AxiosResponse<User>> {
    return this.api.get('/auth/user/');
  }

  async updateProfile(data: Partial<User>): Promise<AxiosResponse<User>> {
    return this.api.put('/auth/user/', data);
  }

  // Student Interview methods (read-only + participate)
  async getInterviews(params?: {
    page?: number;
    page_size?: number;
    status?: string;
    interview_type?: string;
  }): Promise<AxiosResponse<{
    count: number;
    next: string | null;
    previous: string | null;
    results: InterviewSession[];
  }>> {
    return this.api.get('/interviews/', { params });
  }

  async getInterview(id: number): Promise<AxiosResponse<InterviewSession>> {
    return this.api.get(`/interviews/${id}/`);
  }

  async startInterview(id: number): Promise<AxiosResponse<InterviewSession>> {
    return this.api.post(`/interviews/${id}/start/`);
  }

  async completeInterview(id: number): Promise<AxiosResponse<InterviewSession>> {
    return this.api.post(`/interviews/${id}/complete/`);
  }

  async joinInterview(id: number): Promise<AxiosResponse<InterviewSession>> {
    return this.api.post(`/interviews/${id}/join/`);
  }

  async submitAnswer(questionId: number, data: {
    answer_text: string;
    time_taken?: number;
  }): Promise<AxiosResponse<any>> {
    return this.api.post(`/interviews/questions/${questionId}/submit/`, data);
  }

  // Resume methods (read-only for students)
  async getResumes(): Promise<AxiosResponse<Resume[]>> {
    return this.api.get('/resumes/');
  }

  async getResume(id: number): Promise<AxiosResponse<Resume>> {
    return this.api.get(`/resumes/${id}/`);
  }

  async downloadResume(id: number): Promise<AxiosResponse<Blob>> {
    return this.api.get(`/resumes/${id}/download/`, { responseType: 'blob' });
  }

  // Dashboard and Analytics (student-specific)
  async getDashboardStats(): Promise<AxiosResponse<DashboardStats>> {
    return this.api.get('/dashboard/stats/');
  }

  async getPerformanceMetrics(params?: {
    period?: string;
    category?: string;
  }): Promise<AxiosResponse<any>> {
    return this.api.get('/dashboard/performance/', { params });
  }

  async getProgressTracking(): Promise<AxiosResponse<any>> {
    return this.api.get('/dashboard/progress/');
  }

  // Notifications
  async getNotifications(): Promise<AxiosResponse<Notification[]>> {
    return this.api.get('/notifications/');
  }

  async markNotificationAsRead(id: number): Promise<AxiosResponse<void>> {
    return this.api.put(`/notifications/${id}/read/`);
  }

  async markAllNotificationsAsRead(): Promise<AxiosResponse<void>> {
    return this.api.put('/notifications/mark-all-read/');
  }

  // File upload helper
  async uploadFile(file: File, endpoint: string): Promise<AxiosResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.api.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }
}

export const apiService = new ApiService();
export default apiService;
