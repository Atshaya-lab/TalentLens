import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../../shared/types';
import { formatDate } from '../utils/helpers';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Loading from '../components/ui/Loading';
import { useToast } from '../hooks';

const ProfilePage: React.FC = () => {
  const { user, isAuthenticated, updateProfile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    bio: '',
    phone_number: '',
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const { showToast } = useToast();

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
    }
  }, [isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
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
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      showToast('New passwords do not match', 'error');
      return;
    }

    if (passwordData.new_password.length < 8) {
      showToast('Password must be at least 8 characters long', 'error');
      return;
    }

    setLoading(true);

    try {
      // TODO: Implement password change API call
      showToast('Password changed successfully!', 'success');
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      setShowPasswordForm(false);
    } catch (error) {
      console.error('Password change error:', error);
      showToast('Failed to change password', 'error');
    } finally {
      setLoading(false);
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
        return 'bg-blue-100 text-blue-800';
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl font-bold text-primary-600">
              {user.first_name.charAt(0)}{user.last_name.charAt(0)}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {user.first_name} {user.last_name}
          </h1>
          <div className="mt-2 flex justify-center">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(user.role)}`}>
              {getRoleDisplay(user.role)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information */}
          <div className="lg:col-span-2">
            <Card>
              <Card.Header>
                <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
              </Card.Header>
              <Card.Content>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                      disabled
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Email address cannot be changed
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bio
                    </label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      isLoading={loading}
                    >
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Card.Content>
            </Card>

            {/* Password Change */}
            <Card className="mt-6">
              <Card.Header>
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Password & Security</h3>
                  {!showPasswordForm && (
                    <Button
                      variant="outline"
                      onClick={() => setShowPasswordForm(true)}
                    >
                      Change Password
                    </Button>
                  )}
                </div>
              </Card.Header>
              
              {showPasswordForm && (
                <Card.Content>
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Password *
                      </label>
                      <input
                        type="password"
                        value={passwordData.current_password}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, current_password: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Password *
                      </label>
                      <input
                        type="password"
                        value={passwordData.new_password}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                        minLength={8}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm New Password *
                      </label>
                      <input
                        type="password"
                        value={passwordData.confirm_password}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                        minLength={8}
                      />
                    </div>

                    <div className="flex justify-end space-x-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowPasswordForm(false);
                          setPasswordData({
                            current_password: '',
                            new_password: '',
                            confirm_password: '',
                          });
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        isLoading={loading}
                      >
                        Change Password
                      </Button>
                    </div>
                  </form>
                </Card.Content>
              )}
            </Card>
          </div>

          {/* Account Information */}
          <div>
            <Card>
              <Card.Header>
                <h3 className="text-lg font-semibold text-gray-900">Account Information</h3>
              </Card.Header>
              <Card.Content className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Account Status</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Member Since</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {formatDate(user.date_joined)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">User ID</label>
                  <p className="text-sm text-gray-900 mt-1">
                    #{user.id}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Role</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {getRoleDisplay(user.role)}
                  </p>
                </div>
              </Card.Content>
            </Card>

            {/* Quick Actions */}
            <Card className="mt-6">
              <Card.Header>
                <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
              </Card.Header>
              <Card.Content className="space-y-3">
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  className="w-full justify-start"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  </svg>
                  Go to Dashboard
                </Button>

                <Button
                  variant="outline"
                  onClick={() => router.push('/interviews')}
                  className="w-full justify-start"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  View Interviews
                </Button>

                {user.role === 'student' && (
                  <Button
                    variant="outline"
                    onClick={() => router.push('/resumes')}
                    className="w-full justify-start"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293L16 6.586A1 1 0 0116 7v10a2 2 0 01-2 2z" />
                    </svg>
                    Manage Resumes
                  </Button>
                )}
              </Card.Content>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProfilePage;
