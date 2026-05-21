import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { User, AuthTokens, RegisterData, LoginCredentials } from '../types';

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
              window.location.href = '/signin';
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

  async signin(email: string, password: string): Promise<AxiosResponse<AuthTokens>> {
    return this.api.post('/auth/signin/', { email, password });
  }

  async register(userData: RegisterData): Promise<AxiosResponse<User>> {
    return this.api.post('/auth/register/', userData);
  }

  async refreshToken(refresh: string): Promise<AxiosResponse<{ access: string }>> {
    return this.api.post('/auth/refresh/', { refresh });
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
  async getInterviews(params?: { page?: number; status?: string }): Promise<AxiosResponse<any>> {
    return this.api.get('/interviews/', { params });
  }

  async createInterview(data: any): Promise<AxiosResponse<any>> {
    return this.api.post('/interviews/', data);
  }

  async getInterview(id: number): Promise<AxiosResponse<any>> {
    return this.api.get(`/interviews/${id}/`);
  }

  async updateInterview(id: number, data: any): Promise<AxiosResponse<any>> {
    return this.api.patch(`/interviews/${id}/`, data);
  }

  // Resume APIs
  async getResumes(): Promise<AxiosResponse<any>> {
    return this.api.get('/resumes/');
  }

  async uploadResume(data: FormData): Promise<AxiosResponse<any>> {
    return this.api.post('/resumes/', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // User management APIs (for admin/teacher)
  async getUsers(params?: { role?: string; page?: number }): Promise<AxiosResponse<any>> {
    return this.api.get('/users/', { params });
  }

  async createUser(data: any): Promise<AxiosResponse<any>> {
    return this.api.post('/users/', data);
  }

  async updateUser(id: number, data: any): Promise<AxiosResponse<any>> {
    return this.api.patch(`/users/${id}/`, data);
  }

  async deleteUser(id: number): Promise<AxiosResponse<void>> {
    return this.api.delete(`/users/${id}/`);
  }

  // Dashboard APIs
  async getDashboardStats(): Promise<AxiosResponse<any>> {
    return this.api.get('/dashboard/overview/');
  }

  async getNotifications(): Promise<AxiosResponse<any>> {
    return this.api.get('/notifications/');
  }

  async markNotificationRead(id: number): Promise<AxiosResponse<void>> {
    return this.api.patch(`/notifications/${id}/`, { is_read: true });
  }

  // Additional notification methods
  async markNotificationAsRead(id: number): Promise<AxiosResponse<void>> {
    return this.markNotificationRead(id);
  }

  async markAllNotificationsAsRead(): Promise<AxiosResponse<void>> {
    return this.api.post('/notifications/mark_all_read/');
  }

  async deleteInterview(id: number): Promise<AxiosResponse<void>> {
    return this.api.delete(`/interviews/${id}/`);
  }

  // Additional methods used in components
  async startInterview(sessionId: number): Promise<AxiosResponse<any>> {
    return this.api.post(`/interviews/${sessionId}/start_interview/`);
  }

  async generateQuestions(sessionId: number, data: any): Promise<AxiosResponse<any>> {
    return this.api.post(`/interviews/${sessionId}/questions/`, data);
  }

  async submitAnswer(questionId: number, data: any): Promise<AxiosResponse<any>> {
    return this.api.post(`/questions/${questionId}/answer/`, data);
  }

  async completeInterview(sessionId: number): Promise<AxiosResponse<any>> {
    return this.api.post(`/interviews/${sessionId}/complete_interview/`);
  }

  async getPerformanceMetrics(filters?: any): Promise<AxiosResponse<any>> {
    return this.api.get('/analytics/performance/', { params: filters });
  }

  async getProgressTracking(): Promise<AxiosResponse<any>> {
    return this.api.get('/analytics/progress/');
  }

  async analyzeResume(resumeId: number): Promise<AxiosResponse<any>> {
    return this.api.post(`/resumes/${resumeId}/analyze/`);
  }

  async deleteResume(resumeId: number): Promise<AxiosResponse<void>> {
    return this.api.delete(`/resumes/${resumeId}/`);
  }

  // Teacher-specific methods for student management
  async createStudent(studentData: any): Promise<AxiosResponse<any>> {
    return this.api.post('/users/create_student/', studentData);
  }

  async getMyStudents(): Promise<AxiosResponse<any>> {
    return this.api.get('/users/students/');
  }

  async updateStudent(studentId: number, data: any): Promise<AxiosResponse<any>> {
    return this.api.patch(`/users/${studentId}/`, data);
  }

  async deleteStudent(studentId: number): Promise<AxiosResponse<void>> {
    return this.api.delete(`/users/${studentId}/`);
  }
}

export const apiService = new ApiService();
export default apiService;
