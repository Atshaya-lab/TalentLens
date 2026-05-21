import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../utils/api';
import { User, RegisterData } from '../types';
import { redirectToRoleClient, isCorrectClient, UserRole } from '../utils/roleRedirect';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (profileData: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  isAuthenticated: boolean;
  allowedRole: UserRole; // The role this client is designed for
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  allowedRole: UserRole; // Which role this client serves
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, allowedRole }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  // Check if user should be on this client when auth state changes
  useEffect(() => {
    if (user && user.role !== allowedRole) {
      // User has wrong role for this client, redirect them
      redirectToRoleClient(user.role as UserRole);
    }
  }, [user, allowedRole]);

  const initializeAuth = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await apiService.getCurrentUser();
      const userData = response.data;
      
      // Check if user belongs to this client
      if (userData.role !== allowedRole) {
        // Clear local storage and redirect to correct client
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        redirectToRoleClient(userData.role as UserRole);
        return;
      }
      
      setUser(userData);
    } catch (error) {
      console.error('Error initializing auth:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await apiService.signin(email, password);
      const { access, refresh, user: userData } = response.data;

      // Check if user has correct role for this client
      if (userData.role !== allowedRole) {
        return { 
          success: false, 
          error: `This login portal is for ${allowedRole}s only. Please use the correct portal for your role.` 
        };
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
      }

      setUser(userData);
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.detail ||
                          error.message || 
                          'Login failed';
      return { success: false, error: errorMessage };
    }
  };

  const register = async (userData: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      // Ensure registration role matches this client
      if (userData.role !== allowedRole) {
        return { 
          success: false, 
          error: `This registration portal is for ${allowedRole}s only.` 
        };
      }

      await apiService.signup(userData);
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.detail ||
                          error.message || 
                          'Registration failed';
      return { success: false, error: errorMessage };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        // Redirect to this client's home page
        window.location.href = '/';
      }
    }
  };

  const updateProfile = async (profileData: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await apiService.updateProfile(profileData);
      setUser(response.data);
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.detail ||
                          error.message || 
                          'Profile update failed';
      return { success: false, error: errorMessage };
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user,
    allowedRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
