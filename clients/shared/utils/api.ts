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
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              window.location.href = '/login';
            }
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Authentication APIs
  async login(email: string, password: string): Promise<AxiosResponse<AuthTokens>> {
    return this.api.post('/auth/login/', { email, password });
  }

  async register(userData: {
    email: string;
    password: string;
    password_confirm: string;
    first_name: string;
    last_name: string;
    role: string;
    username?: string;
    phone_number?: string;
  }): Promise<AxiosResponse<User>> {
    return this.api.post('/auth/register/', userData);
  }

  async refreshToken(refresh: string): Promise<AxiosResponse<{ access: string }>> {
    return this.api.post('/auth/token/refresh/', { refresh });
  }

  async logout(): Promise<AxiosResponse<void>> {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
    return this.api.post('/auth/logout/', { refresh: refreshToken });
  }

  async getCurrentUser(): Promise<AxiosResponse<User>> {
    return this.api.get('/auth/user/');
  }

  async updateProfile(data: Partial<User>): Promise<AxiosResponse<User>> {
    return this.api.patch('/auth/user/', data);
  }

  // Interview APIs
  async getInterviews(params?: {
    status?: string;
    category?: string;
    page?: number;
  }): Promise<AxiosResponse<{ results: InterviewSession[]; count: number }>> {
    return this.api.get('/interviews/', { params });
  }

  async getInterview(id: number): Promise<AxiosResponse<InterviewSession>> {
    return this.api.get(`/interviews/${id}/`);
  }

  async createInterview(data: Partial<InterviewSession>): Promise<AxiosResponse<InterviewSession>> {
    return this.api.post('/interviews/', data);
  }

  async updateInterview(id: number, data: Partial<InterviewSession>): Promise<AxiosResponse<InterviewSession>> {
    return this.api.patch(`/interviews/${id}/`, data);
  }

  async deleteInterview(id: number): Promise<AxiosResponse<void>> {
    return this.api.delete(`/interviews/${id}/`);
  }

  async startInterview(id: number): Promise<AxiosResponse<InterviewSession>> {
    return this.api.post(`/interviews/${id}/start/`);
  }

  async completeInterview(id: number): Promise<AxiosResponse<InterviewSession>> {
    return this.api.post(`/interviews/${id}/complete/`);
  }

  async generateQuestions(id: number, data: {
    num_questions: number;
    difficulty_level: string;
    category: string;
  }): Promise<AxiosResponse<{ questions: any[] }>> {
    return this.api.post(`/interviews/${id}/generate-questions/`, data);
  }

  async submitAnswer(questionId: number, data: {
    answer_text: string;
    time_taken?: number;
  }): Promise<AxiosResponse<any>> {
    return this.api.post(`/interviews/questions/${questionId}/submit/`, data);
  }

  // Resume APIs
  async getResumes(): Promise<AxiosResponse<Resume[]>> {
    return this.api.get('/resumes/');
  }

  async getResume(id: number): Promise<AxiosResponse<Resume>> {
    return this.api.get(`/resumes/${id}/`);
  }

  async uploadResume(formData: FormData): Promise<AxiosResponse<Resume>> {
    return this.api.post('/resumes/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async updateResume(id: number, data: Partial<Resume>): Promise<AxiosResponse<Resume>> {
    return this.api.patch(`/resumes/${id}/`, data);
  }

  async deleteResume(id: number): Promise<AxiosResponse<void>> {
    return this.api.delete(`/resumes/${id}/`);
  }

  async analyzeResume(id: number): Promise<AxiosResponse<{ analysis: string; skills: string[] }>> {
    return this.api.post(`/resumes/${id}/analyze/`);
  }

  // Dashboard APIs
  async getDashboardStats(): Promise<AxiosResponse<DashboardStats>> {
    return this.api.get('/dashboard/overview/');
  }

  async getPerformanceMetrics(params?: {
    period?: string;
    category?: string;
  }): Promise<AxiosResponse<any[]>> {
    return this.api.get('/dashboard/performance/', { params });
  }

  async getProgressTracking(): Promise<AxiosResponse<any>> {
    return this.api.get('/dashboard/progress/');
  }

  // Notification APIs
  async getNotifications(): Promise<AxiosResponse<Notification[]>> {
    return this.api.get('/notifications/');
  }

  async markNotificationAsRead(id: number): Promise<AxiosResponse<Notification>> {
    return this.api.patch(`/notifications/${id}/`, { is_read: true });
  }

  async markAllNotificationsAsRead(): Promise<AxiosResponse<void>> {
    return this.api.post('/notifications/mark-all-read/');
  }

  // User Management APIs (Admin/Teacher only)
  async getUsers(params?: {
    role?: string;
    is_active?: boolean;
    page?: number;
  }): Promise<AxiosResponse<{ results: User[]; count: number }>> {
    return this.api.get('/users/', { params });
  }

  async getUser(id: number): Promise<AxiosResponse<User>> {
    return this.api.get(`/users/${id}/`);
  }

  async updateUser(id: number, data: Partial<User>): Promise<AxiosResponse<User>> {
    return this.api.patch(`/users/${id}/`, data);
  }

  async deleteUser(id: number): Promise<AxiosResponse<void>> {
    return this.api.delete(`/users/${id}/`);
  }
}

export const apiService = new ApiService();
export default apiService;
