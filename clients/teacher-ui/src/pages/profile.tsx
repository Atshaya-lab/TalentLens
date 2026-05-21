import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../utils/api';
import { User } from '../types';
import { formatDate } from '../utils/helpers';
import { useFormStyles, useTextStyles } from '../utils/formStyles';
import { createDisplayID } from '../utils/uuidUtils';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Loading from '../components/ui/Loading';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useToast } from '../hooks';

interface ProfileStats {
  totalStudents?: number;
  totalInterviews?: number;
  avgScore?: number;
  lastLogin?: string;
}

const ProfilePage: React.FC = () => {
  const { user, isAuthenticated, updateProfile, logout } = useAuth();
  const { theme, setTheme, isDark } = useTheme();
  const formStyles = useFormStyles();
  const textStyles = useTextStyles();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'stats'>('profile');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // Profile form data
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    bio: '',
    phone_number: '',
  });

  // Password form data
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    new_password_confirm: '',
  });

  // Preferences data
  const [preferencesData, setPreferencesData] = useState({
    email_notifications: true,
    sms_notifications: false,
    push_notifications: true,
    auto_save_drafts: true,
    theme: 'light',
    language: 'en',
    timezone: 'UTC',
    compact_view: false,
    show_tips: true,
    profile_visibility: 'organization',
  });

  // Profile stats
  const [stats, setStats] = useState<ProfileStats>({});

  const { showToast } = useToast();

  // Utility for form styling
  const getFormClasses = () => ({
    label: `block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-emerald-700'}`,
    input: `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
      isDark 
        ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
        : 'bg-white border-gray-300 text-gray-900'
    }`,
    disabledInput: `w-full px-3 py-2 border rounded-md ${
      isDark 
        ? 'bg-gray-800 border-gray-600 text-gray-400' 
        : 'bg-gray-50 border-gray-300 text-gray-500'
    }`,
    textarea: `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
      isDark 
        ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
        : 'bg-white border-gray-300 text-gray-900'
    }`,
    select: `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
      isDark 
        ? 'bg-gray-700 border-gray-600 text-gray-100' 
        : 'bg-white border-gray-300 text-gray-900'
    }`,
    helpText: `text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`,
    heading: `text-lg font-medium mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`,
  });

  // Load user preferences from backend
  const loadPreferences = async () => {
    try {
      const response = await apiService.getUserPreferences();
      setPreferencesData(response.data);
    } catch (error) {
      console.error('Failed to load preferences:', error);
      // Fallback to default preferences
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user) {
      setFormData({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        bio: user.profile?.bio || '',
        phone_number: user.profile?.phone_number || '',
      });

      // Load preferences from backend
      loadPreferences();

      // Load profile stats for teachers
      if (user.role === 'teacher') {
        loadProfileStats();
      }
    }
  }, [isAuthenticated, user, router]);

  const loadProfileStats = async () => {
    try {
      // Fetch real stats from the dashboard API
      const response = await apiService.getDashboardStats();
      const dashboardData: any = response.data;
      
      const mappedStats = {
        totalStudents: dashboardData.total_students || 0,
        totalInterviews: dashboardData.total_interviews || 0,
        avgScore: dashboardData.average_score || 0,
        lastLogin: new Date().toISOString(),
      };
      setStats(mappedStats);
    } catch (error) {
      console.error('Error loading stats:', error);
      // Fallback to mock data if API fails
      setStats({
        totalStudents: 0,
        totalInterviews: 0,
        avgScore: 0,
        lastLogin: new Date().toISOString(),
      });
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await updateProfile({
        first_name: formData.first_name,
        last_name: formData.last_name,
        profile: {
          bio: formData.bio,
          phone_number: formData.phone_number,
        },
      });

      if (result.success) {
        showToast('Profile updated successfully!', 'success');
      } else {
        showToast(result.error || 'Failed to update profile', 'error');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      showToast('Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.new_password !== passwordData.new_password_confirm) {
      showToast('New passwords do not match', 'error');
      return;
    }

    if (passwordData.new_password.length < 8) {
      showToast('Password must be at least 8 characters long', 'error');
      return;
    }

    setLoading(true);

    try {
      await apiService.changePassword({
        old_password: passwordData.old_password,
        new_password: passwordData.new_password,
        new_password_confirm: passwordData.new_password_confirm,
      });

      showToast('Password changed successfully!', 'success');
      setPasswordData({
        old_password: '',
        new_password: '',
        new_password_confirm: '',
      });
    } catch (error: any) {
      console.error('Password change error:', error);
      const errorMessage = error.response?.data?.message || 
                           error.response?.data?.old_password?.[0] || 
                           error.response?.data?.new_password?.[0] || 
                           'Failed to change password';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update preferences in backend
      await apiService.updateUserPreferences(preferencesData);
      
      // Update theme context if theme changed
      if (preferencesData.theme !== theme) {
        setTheme(preferencesData.theme as 'light' | 'dark' | 'auto');
      }
      
      // Backup to localStorage
      localStorage.setItem('userPreferences', JSON.stringify(preferencesData));
      
      showToast('Preferences saved successfully!', 'success');
    } catch (error) {
      console.error('Preferences save error:', error);
      showToast('Failed to save preferences', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutAll = async () => {
    try {
      // Logout from all devices
      await logout();
      showToast('Logged out from all devices successfully', 'success');
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      showToast('Failed to logout', 'error');
    }
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'administrator':
        return 'Administrator';
      case 'teacher':
        return 'Teacher';
      case 'student':
        return 'Student';
      default:
        return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'administrator':
        return 'bg-purple-100 text-purple-800';
      case 'teacher':
        return 'bg-emerald-100 text-emerald-800';
      case 'student':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return (
      <Layout>
        <Loading />
      </Layout>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <Card variant="elevated" className="group hover:shadow-xl transition-all duration-300">
            <CardHeader className="p-6 border-b border-gray-100">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-900">Profile Information</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">Update your personal information and bio</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 group-hover:border-emerald-300"
                      required
                    />
                  </div>
                  
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 group-hover:border-emerald-300"
                      required
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-2 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Email address cannot be changed
                  </p>
                </div>

                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 group-hover:border-emerald-300"
                    placeholder="Enter your phone number"
                  />
                </div>

                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Bio
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 group-hover:border-emerald-300 resize-none"
                    placeholder="Tell us about yourself, your experience, and what makes you unique..."
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    {formData.bio.length}/500 characters
                  </p>
                </div>

                <div className="flex justify-end pt-6 border-t border-gray-100">
                  <Button
                    type="submit"
                    isLoading={loading}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 px-8 py-3 text-lg"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        );

      case 'security':
        return (
          <div className="space-y-8">
            <Card variant="elevated" className="group hover:shadow-xl transition-all duration-300">
              <CardHeader className="p-6 border-b border-gray-100">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold text-gray-900">Change Password</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">Update your account password for enhanced security</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Current Password *
                    </label>
                    <input
                      type="password"
                      value={passwordData.old_password}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, old_password: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 group-hover:border-red-300"
                      required
                    />
                  </div>

                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      New Password *
                    </label>
                    <input
                      type="password"
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 group-hover:border-green-300"
                      required
                      minLength={8}
                    />
                    <p className="text-xs text-gray-500 mt-2 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Password must be at least 8 characters long
                    </p>
                  </div>

                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Confirm New Password *
                    </label>
                    <input
                      type="password"
                      value={passwordData.new_password_confirm}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, new_password_confirm: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 group-hover:border-blue-300"
                      required
                      minLength={8}
                    />
                  </div>

                  <div className="flex justify-end pt-6 border-t border-gray-100">
                    <Button
                      type="submit"
                      isLoading={loading}
                      className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 px-8 py-3 text-lg"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Change Password
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card variant="elevated" className="group hover:shadow-xl transition-all duration-300">
              <CardHeader className="p-6 border-b border-gray-100">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold text-gray-900">Account Security</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">Manage your account security settings</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Two-Factor Authentication</h4>
                      <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                    </div>
                  </div>
                  <Button variant="outline" disabled className="text-blue-600 border-blue-600 hover:bg-blue-50">
                    Coming Soon
                  </Button>
                </div>

                <div className="flex items-center justify-between p-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-200">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Login Sessions</h4>
                      <p className="text-sm text-gray-600">Manage your active login sessions</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => setShowLogoutModal(true)}
                    className="text-orange-600 border-orange-600 hover:bg-orange-50"
                  >
                    Logout All Devices
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'preferences':
        return (
          <Card variant="elevated" className="group hover:shadow-xl transition-all duration-300">
            <CardHeader className="p-6 border-b border-gray-100">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-900">Preferences</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">Customize your experience and notifications</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handlePreferencesSubmit} className="space-y-8">
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                    <svg className="w-5 h-5 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.19 4.19A2 2 0 004 6v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-1.41.59z" />
                    </svg>
                    Notifications
                  </h4>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <label className="font-semibold text-gray-900">Email Notifications</label>
                          <p className="text-sm text-gray-600">Receive notifications via email</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferencesData.email_notifications}
                          onChange={(e) => setPreferencesData(prev => ({ ...prev, email_notifications: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <div>
                          <label className="font-semibold text-gray-900">SMS Notifications</label>
                          <p className="text-sm text-gray-600">Receive notifications via SMS</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferencesData.sms_notifications}
                          onChange={(e) => setPreferencesData(prev => ({ ...prev, sms_notifications: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                    <svg className="w-5 h-5 mr-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    </svg>
                    Application Settings
                  </h4>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-4">
                          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <label className="font-semibold text-gray-900">Auto-save Drafts</label>
                          <p className="text-sm text-gray-600">Automatically save your work</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferencesData.auto_save_drafts}
                          onChange={(e) => setPreferencesData(prev => ({ ...prev, auto_save_drafts: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="group">
                        <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                          </svg>
                          Theme
                        </label>
                        <select
                          value={preferencesData.theme}
                          onChange={(e) => {
                            const newTheme = e.target.value as 'light' | 'dark' | 'auto';
                            setPreferencesData(prev => ({ ...prev, theme: newTheme }));
                            setTheme(newTheme);
                          }}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 group-hover:border-purple-300"
                        >
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                          <option value="auto">Auto</option>
                        </select>
                      </div>

                      <div className="group">
                        <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                          </svg>
                          Language
                        </label>
                        <select
                          value={preferencesData.language}
                          onChange={(e) => setPreferencesData(prev => ({ ...prev, language: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 group-hover:border-blue-300"
                        >
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                          <option value="de">German</option>
                        </select>
                      </div>

                      <div className="group">
                        <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Timezone
                        </label>
                        <select
                          value={preferencesData.timezone}
                          onChange={(e) => setPreferencesData(prev => ({ ...prev, timezone: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 group-hover:border-green-300"
                        >
                          <option value="UTC">UTC</option>
                          <option value="America/New_York">Eastern Time</option>
                          <option value="America/Chicago">Central Time</option>
                          <option value="America/Denver">Mountain Time</option>
                          <option value="America/Los_Angeles">Pacific Time</option>
                          <option value="Europe/London">London</option>
                          <option value="Europe/Paris">Paris</option>
                          <option value="Asia/Tokyo">Tokyo</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-gray-100">
                  <Button
                    type="submit"
                    isLoading={loading}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 px-8 py-3 text-lg"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Preferences
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        );

      case 'stats':
        return (
          <div className="space-y-8">
            {user.role === 'teacher' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card variant="elevated" className="group hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
                          </div>
                        </div>
                        <div className="ml-5">
                          <p className="text-sm font-semibold text-gray-600">Total Students</p>
                          <p className="text-3xl font-bold text-gray-900">{stats.totalStudents || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card variant="elevated" className="group hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </div>
                        </div>
                        <div className="ml-5">
                          <p className="text-sm font-semibold text-gray-600">Total Interviews</p>
                          <p className="text-3xl font-bold text-gray-900">{stats.totalInterviews || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card variant="elevated" className="group hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                        </div>
                        <div className="ml-5">
                          <p className="text-sm font-semibold text-gray-600">Average Score</p>
                          <p className="text-3xl font-bold text-gray-900">{stats.avgScore || 0}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card variant="elevated" className="group hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                        <div className="ml-5">
                          <p className="text-sm font-semibold text-gray-600">Last Login</p>
                          <p className="text-lg font-bold text-gray-900">
                            {stats.lastLogin ? formatDate(stats.lastLogin) : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card variant="elevated" className="group hover:shadow-xl transition-all duration-300">
                  <CardHeader className="p-6 border-b border-gray-100">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mr-4">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-bold text-gray-900">Activity Summary</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">Your account activity and statistics</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="font-semibold text-gray-900">Account created</span>
                        </div>
                        <span className="text-sm font-bold text-gray-700">{formatDate(user.date_joined)}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-semibold text-gray-900">Profile completeness</span>
                        </div>
                        <span className="text-sm font-bold text-green-600">
                          {formData.bio && formData.phone_number ? '100%' : 
                           formData.bio || formData.phone_number ? '75%' : '50%'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-semibold text-gray-900">Account status</span>
                        </div>
                        <span className={`text-sm font-bold ${user.is_active ? 'text-green-600' : 'text-red-600'}`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Enhanced Header */}
        <div className="relative bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-8 text-white overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/90 to-teal-600/90 backdrop-blur-sm"></div>
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 text-center">
            <div className="mx-auto w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mb-6 backdrop-blur-sm border-4 border-white/30">
              <span className="text-4xl font-bold text-white">
                {user.first_name.charAt(0)}{user.last_name.charAt(0)}
              </span>
            </div>
            <h1 className="text-4xl font-bold mb-3">
              {user.first_name} {user.last_name}
            </h1>
            <div className="flex justify-center mb-4">
              <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-white/20 backdrop-blur-sm border border-white/30`}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {getRoleDisplay(user.role)}
              </span>
            </div>
            <p className="text-emerald-100 text-lg flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {user.email}
            </p>
          </div>
        </div>

        {/* Enhanced Navigation Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-2">
          <nav className="flex space-x-2">
            {[
              { id: 'profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
              { id: 'security', label: 'Security', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
              { id: 'preferences', label: 'Preferences', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
              ...(user.role === 'teacher' ? [{ id: 'stats', label: 'Statistics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' }] : [])
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`group flex-1 inline-flex items-center justify-center py-4 px-6 rounded-xl font-medium text-sm transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <svg
                  className={`mr-2 h-5 w-5 transition-colors duration-200 ${
                    activeTab === tab.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {renderTabContent()}
          </div>

          {/* Enhanced Sidebar */}
          <div className="space-y-6">
            {/* Account Information */}
            <Card variant="elevated" className="group hover:shadow-xl transition-all duration-300">
              <CardHeader className="p-6 border-b border-gray-100">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <CardTitle className="text-lg font-bold text-gray-900">Account Info</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-700">Status</span>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                    user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-700">Member Since</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {formatDate(user.date_joined)}
                  </span>
                </div>

                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 11h.01M7 15h.01M7 19h.01M17 7h.01M17 11h.01M17 15h.01M17 19h.01M3 3h18v18H3z" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-700">User ID</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {createDisplayID(user.uuid || user.id, 'user')}
                  </span>
                </div>

                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-200">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-orange-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-700">Role</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {getRoleDisplay(user.role)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card variant="elevated" className="group hover:shadow-xl transition-all duration-300">
              <CardHeader className="p-6 border-b border-gray-100">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <CardTitle className="text-lg font-bold text-gray-900">Quick Actions</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  className="w-full justify-start text-emerald-600 border-emerald-600 hover:bg-emerald-50 hover:scale-105 transition-all duration-200 shadow-md"
                >
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  </svg>
                  Go to Dashboard
                </Button>

                <Button
                  variant="outline"
                  onClick={() => router.push('/students')}
                  className="w-full justify-start text-blue-600 border-blue-600 hover:bg-blue-50 hover:scale-105 transition-all duration-200 shadow-md"
                >
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  Manage Students
                </Button>

                <Button
                  variant="outline"
                  onClick={() => router.push('/interviews')}
                  className="w-full justify-start text-purple-600 border-purple-600 hover:bg-purple-50 hover:scale-105 transition-all duration-200 shadow-md"
                >
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  View Interviews
                </Button>

                <Button
                  variant="outline"
                  onClick={() => router.push('/analytics')}
                  className="w-full justify-start text-orange-600 border-orange-600 hover:bg-orange-50 hover:scale-105 transition-all duration-200 shadow-md"
                >
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  View Analytics
                </Button>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card variant="elevated" className="group hover:shadow-xl transition-all duration-300 border-red-200">
              <CardHeader className="p-6 border-b border-red-200">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <CardTitle className="text-lg font-bold text-red-600">Danger Zone</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <Button
                  variant="outline"
                  onClick={() => setShowLogoutModal(true)}
                  className="w-full justify-start text-red-600 border-red-600 hover:bg-red-50 hover:scale-105 transition-all duration-200 shadow-md"
                >
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout All Devices
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Logout All Devices"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            This will log you out of all devices and sessions. You'll need to log in again on all devices.
          </p>
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowLogoutModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleLogoutAll}
            >
              Logout All Devices
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
};

export default ProfilePage;
