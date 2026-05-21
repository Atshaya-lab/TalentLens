// User and Authentication Types
export interface User {
  id: number;
  username?: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'administrator' | 'teacher' | 'student';
  is_active: boolean;
  date_joined: string;
  phone_number?: string;
  profile_picture?: string;
  full_name?: string;
  profile?: {
    bio?: string;
    phone_number?: string;
    avatar?: string;
  };
}

export interface AuthTokens {
  access: string;
  refresh: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  role: 'administrator' | 'teacher' | 'student';
  username?: string;
  phone_number?: string;
}

// Interview Types
export interface InterviewSession {
  id: number;
  title: string;
  description?: string;
  category: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  student: number;
  teacher?: number;
  scheduled_time?: string;
  started_at?: string;
  completed_at?: string;
  duration?: number; // Duration in minutes
  actual_duration?: number; // Actual duration in minutes
  total_questions?: number;
  overall_score?: number;
  max_score?: number;
  score_breakdown?: Record<string, number>;
  ai_feedback?: string;
  feedback?: string;
  recommendations?: string[];
  is_ai_generated: boolean;
  security_enabled: boolean;
  questions?: InterviewQuestion[];
  created_at: string;
  updated_at: string;
}

export interface InterviewQuestion {
  id: number;
  interview_session: number;
  question_text: string;
  question_type: 'technical' | 'behavioral' | 'situational' | 'coding';
  expected_answer?: string;
  difficulty_level: 'easy' | 'medium' | 'hard';
  time_limit?: number;
  order: number;
  score?: number;
  user_answer?: string;
  ai_feedback?: string;
  is_ai_generated: boolean;
  ai_context?: string;
  created_at: string;
}

export interface InterviewResponse {
  id: number;
  question: number;
  answer_text: string;
  time_taken?: number;
  score?: number;
  max_score?: number;
  ai_feedback?: string;
  created_at: string;
}

// Resume Types
export interface Resume {
  id: number;
  user: number;
  title: string;
  description?: string;
  file_path?: string;
  file_url?: string;
  file_size?: number;
  content?: string;
  extracted_skills?: string[];
  analysis_result?: string;
  experience_years?: number;
  education_level?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Dashboard Types
export interface DashboardMetrics {
  id: number;
  user: number;
  total_interviews: number;
  completed_interviews: number;
  average_score: number;
  total_time_spent: number;
  skills_practiced: string[];
  improvement_areas: string[];
  last_activity: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  totalStudents?: number;
  totalInterviews?: number;
  averageScore?: number;
  completionRate?: number;
  recentActivity?: Array<{
    id: number;
    type: string;
    description: string;
    timestamp: string;
  }>;
}

// Notification Types
export interface Notification {
  id: number;
  user: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  action_url?: string;
  created_at: string;
}

// Component Props Types
export interface LoadingState {
  isLoading: boolean;
  error?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

// Form Types
export interface InterviewFormData {
  title: string;
  description?: string;
  category: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  student?: number;
  scheduled_time?: string;
  is_ai_generated: boolean;
  security_enabled: boolean;
}

export interface ProfileFormData {
  first_name: string;
  last_name: string;
  bio?: string;
  phone_number?: string;
}

// Chart Data Types
export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }>;
}

export interface PerformanceData {
  date: string;
  score: number;
  category: string;
}
