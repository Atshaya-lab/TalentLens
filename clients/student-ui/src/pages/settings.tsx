import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../components/ui/Card';
import { Form } from '../components/ui/Form';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useToast } from '../hooks';
import * as Yup from 'yup';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  bio?: string;
  location?: string;
  website?: string;
}

interface PreferencesData {
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyDigest: boolean;
  reminderEmails: boolean;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  interviewTypes: string[];
  preferredTime: string;
  timezone: string;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const profileSchema = Yup.object({
  firstName: Yup.string().required('First name is required'),
  lastName: Yup.string().required('Last name is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  phone: Yup.string(),
  bio: Yup.string().max(500, 'Bio must be less than 500 characters'),
  location: Yup.string(),
  website: Yup.string().url('Invalid URL'),
});

const preferencesSchema = Yup.object({
  emailNotifications: Yup.boolean(),
  pushNotifications: Yup.boolean(),
  weeklyDigest: Yup.boolean(),
  reminderEmails: Yup.boolean(),
  difficulty: Yup.string().oneOf(['easy', 'medium', 'hard', 'mixed']),
  interviewTypes: Yup.array().of(Yup.string()),
  preferredTime: Yup.string(),
  timezone: Yup.string(),
});

const passwordSchema = Yup.object({
  currentPassword: Yup.string().required('Current password is required'),
  newPassword: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number')
    .required('New password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('newPassword')], 'Passwords must match')
    .required('Please confirm your password'),
});

const SettingsPage: React.FC = () => {
  const { user, isAuthenticated, updateProfile } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const handleProfileUpdate = async (data: ProfileData) => {
    try {
      setIsLoading(true);
      await updateProfile(data);
      showToast('Profile updated successfully!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to update profile', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferencesUpdate = async (data: PreferencesData) => {
    try {
      setIsLoading(true);
      // API call to update preferences
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock API call
      showToast('Preferences updated successfully!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to update preferences', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (data: PasswordData) => {
    try {
      setIsLoading(true);
      // API call to change password
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock API call
      showToast('Password changed successfully!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to change password', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountDeletion = async () => {
    try {
      setIsLoading(true);
      // API call to delete account
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock API call
      showToast('Account deleted successfully', 'success');
      router.push('/');
    } catch (error: any) {
      showToast(error.message || 'Failed to delete account', 'error');
    } finally {
      setIsLoading(false);
      setShowDeleteModal(false);
    }
  };

  const tabs = [
    { 
      id: 'profile', 
      name: 'Profile', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    { 
      id: 'preferences', 
      name: 'Preferences', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    { 
      id: 'security', 
      name: 'Security', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    { 
      id: 'danger', 
      name: 'Danger Zone', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      )
    },
  ];

  const interviewTypeOptions = [
    { value: 'technical', label: 'Technical Interviews' },
    { value: 'behavioral', label: 'Behavioral Interviews' },
    { value: 'system_design', label: 'System Design' },
    { value: 'case_study', label: 'Case Studies' },
    { value: 'leadership', label: 'Leadership Interviews' },
    { value: 'cultural_fit', label: 'Cultural Fit' },
  ];

  const timezoneOptions = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'Europe/London', label: 'London (GMT)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Kolkata', label: 'India (IST)' },
  ];

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Enhanced Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl p-8 text-white shadow-2xl">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
          
          <div className="relative">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
                <p className="text-emerald-100 text-lg">
                  Manage your account information, preferences, and security settings
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-lg p-1 border border-gray-100">
          <nav className="flex space-x-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                } flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200`}
              >
                {tab.icon}
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
                <p className="text-gray-600">Update your personal information and profile details</p>
              </CardHeader>
              <CardContent>
                <Form<ProfileData>
                  schema={profileSchema}
                  onSubmit={handleProfileUpdate}
                >
                  {(methods) => (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Form.Field
                          name="firstName"
                          label="First Name"
                          methods={methods}
                          required
                        />
                        <Form.Field
                          name="lastName"
                          label="Last Name"
                          methods={methods}
                          required
                        />
                      </div>

                      <Form.Field
                        name="email"
                        label="Email Address"
                        type="email"
                        methods={methods}
                        required
                      />

                      <Form.Field
                        name="phone"
                        label="Phone Number"
                        type="text"
                        methods={methods}
                      />

                      <Form.Field
                        name="location"
                        label="Location"
                        placeholder="City, Country"
                        methods={methods}
                      />

                      <Form.Field
                        name="website"
                        label="Website"
                        placeholder="https://yourwebsite.com"
                        methods={methods}
                      />

                      <Form.Field
                        name="bio"
                        label="Bio"
                        type="textarea"
                        placeholder="Tell us about yourself..."
                        methods={methods}
                      />

                      <div className="flex justify-end">
                        <Form.Button isLoading={isLoading}>
                          Update Profile
                        </Form.Button>
                      </div>
                    </>
                  )}
                </Form>
              </CardContent>
            </Card>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold text-gray-900">Notification Preferences</h2>
                  <p className="text-gray-600">Choose how you want to be notified</p>
                </CardHeader>
                <CardContent>
                  <Form<PreferencesData>
                    schema={preferencesSchema}
                    onSubmit={handlePreferencesUpdate}
                  >
                    {(methods) => (
                      <>
                        <div className="space-y-6">
                          <div className="space-y-4">
                            <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
                            
                            <div className="space-y-3">
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  {...methods.register('emailNotifications')}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-3 text-sm text-gray-700">Email notifications</span>
                              </label>

                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  {...methods.register('pushNotifications')}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-3 text-sm text-gray-700">Push notifications</span>
                              </label>

                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  {...methods.register('weeklyDigest')}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-3 text-sm text-gray-700">Weekly progress digest</span>
                              </label>

                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  {...methods.register('reminderEmails')}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-3 text-sm text-gray-700">Interview reminder emails</span>
                              </label>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h3 className="text-lg font-medium text-gray-900">Interview Preferences</h3>
                            
                            <Form.Field
                              name="difficulty"
                              label="Default Difficulty Level"
                              type="select"
                              options={[
                                { value: 'easy', label: 'Easy' },
                                { value: 'medium', label: 'Medium' },
                                { value: 'hard', label: 'Hard' },
                                { value: 'mixed', label: 'Mixed' },
                              ]}
                              methods={methods}
                            />

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-3">
                                Preferred Interview Types
                              </label>
                              <div className="grid grid-cols-2 gap-3">
                                {interviewTypeOptions.map((option) => (
                                  <label key={option.value} className="flex items-center">
                                    <input
                                      type="checkbox"
                                      value={option.value}
                                      {...methods.register('interviewTypes')}
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">
                                      {option.label}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            <Form.Field
                              name="preferredTime"
                              label="Preferred Interview Time"
                              type="text"
                              methods={methods}
                            />

                            <Form.Field
                              name="timezone"
                              label="Timezone"
                              type="select"
                              options={timezoneOptions}
                              methods={methods}
                            />
                          </div>
                        </div>

                        <div className="flex justify-end pt-6">
                          <Form.Button isLoading={isLoading}>
                            Save Preferences
                          </Form.Button>
                        </div>
                      </>
                    )}
                  </Form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900">Security Settings</h2>
                <p className="text-gray-600">Manage your password and security preferences</p>
              </CardHeader>
              <CardContent>
                <Form<PasswordData>
                  schema={passwordSchema}
                  onSubmit={handlePasswordChange}
                >
                  {(methods) => (
                    <>
                      <Form.Field
                        name="currentPassword"
                        label="Current Password"
                        type="password"
                        methods={methods}
                        required
                      />

                      <Form.Field
                        name="newPassword"
                        label="New Password"
                        type="password"
                        methods={methods}
                        required
                      />

                      <Form.Field
                        name="confirmPassword"
                        label="Confirm New Password"
                        type="password"
                        methods={methods}
                        required
                      />

                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex">
                          <svg className="w-5 h-5 text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">
                              Password Requirements
                            </h3>
                            <div className="mt-2 text-sm text-yellow-700">
                              <ul className="list-disc list-inside space-y-1">
                                <li>At least 8 characters long</li>
                                <li>Contains uppercase and lowercase letters</li>
                                <li>Contains at least one number</li>
                                <li>Different from your current password</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Form.Button isLoading={isLoading}>
                          Change Password
                        </Form.Button>
                      </div>
                    </>
                  )}
                </Form>
              </CardContent>
            </Card>
          )}

          {/* Danger Zone Tab */}
          {activeTab === 'danger' && (
            <Card className="border-red-200">
              <CardHeader>
                <h2 className="text-xl font-semibold text-red-900">Danger Zone</h2>
                <p className="text-red-600">
                  Irreversible and destructive actions. Please be careful.
                </p>
              </CardHeader>
              <CardContent>
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <div className="flex items-start">
                    <svg className="w-6 h-6 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-red-900">
                        Delete Account
                      </h3>
                      <p className="mt-2 text-sm text-red-700">
                        Once you delete your account, there is no going back. This will permanently 
                        delete your account, all your interviews, progress data, and remove all 
                        associated data from our servers.
                      </p>
                      <div className="mt-4">
                        <Button
                          variant="danger"
                          onClick={() => setShowDeleteModal(true)}
                        >
                          Delete Account
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Delete Account Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Account"
          size="md"
        >
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-red-800">
                    This action cannot be undone
                  </h3>
                  <p className="mt-2 text-sm text-red-700">
                    This will permanently delete your account and all associated data including:
                  </p>
                  <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                    <li>All your interview sessions and results</li>
                    <li>Progress tracking and analytics</li>
                    <li>Uploaded resumes and documents</li>
                    <li>Account preferences and settings</li>
                  </ul>
                </div>
              </div>
            </div>

            <p className="text-gray-700">
              Are you absolutely sure you want to delete your account? This action cannot be reversed.
            </p>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleAccountDeletion}
                isLoading={isLoading}
              >
                Yes, Delete Account
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

export default SettingsPage;

// Prevent static generation for this page since it requires authentication
export const getServerSideProps = async () => {
  return {
    props: {},
  };
};
