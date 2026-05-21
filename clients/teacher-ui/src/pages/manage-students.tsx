import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../api';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';

interface Student {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  date_joined: string;
  last_login?: string;
}

interface CreateStudentFormData {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  confirm_password: string;
}



interface StudentLimitInfo {
  current_student_count: number;
  student_limit: number | null;
  has_premium: boolean;
  can_add_student: boolean;
  message: string;
}

const ManageStudentsPage: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [formData, setFormData] = useState<CreateStudentFormData>({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    confirm_password: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');
  
  // Password change modal states


  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await apiService.getMyStudents();
      setStudents(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setCreateLoading(true);
    setErrors({});

    try {
      const response = await apiService.createStudent({
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        password: formData.password
      });

      setSuccessMessage(`Student account created successfully! Login credentials: Email: ${response.data.login_credentials.email}, Username: ${response.data.login_credentials.username}`);
      setFormData({
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        confirm_password: ''
      });
      setShowCreateForm(false);
      fetchStudents(); // Refresh the student list
      
      // Clear success message after 10 seconds
      setTimeout(() => setSuccessMessage(''), 10000);
    } catch (error: any) {
      const errorData = error.response?.data;
      
      // Handle student limit error specifically
      if (errorData?.error === 'Student limit reached') {
        setErrors({ 
          general: errorData.message,
          limit: `You have ${errorData.current_student_count}/${errorData.student_limit} students. ${errorData.has_premium ? '' : 'Upgrade to Premium for unlimited students.'}` 
        });
      } else {
        const errorMessage = errorData?.error || 'Failed to create student account';
        setErrors({ general: errorMessage });
      }
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteStudent = async (studentId: number, studentName: string) => {
    if (!confirm(`Are you sure you want to delete ${studentName}'s account? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiService.deleteStudent(studentId);
      setSuccessMessage('Student account deleted successfully');
      fetchStudents();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to delete student account';
      setErrors({ general: errorMessage });
    }
  };



  const handleScheduleInterview = (student: Student) => {
    // Navigate to interview creation page with student pre-selected
    router.push(`/interviews/new?student_id=${student.id}&student_name=${encodeURIComponent(student.full_name)}`);
  };

  if (user?.role !== 'teacher') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="mt-2 text-gray-600">Only teachers can access student management.</p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Manage Students</h1>
            <p className="mt-2 text-gray-600">Create and manage your student accounts</p>
            
            {/* Premium Status and Student Count */}
            
          </div>

        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-green-800">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {errors.general && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-red-800">{errors.general}</p>
                {errors.limit && (
                  <p className="text-sm text-red-700 mt-1">{errors.limit}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Create Student Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-emerald-600">Create New Student Account</CardTitle>
            <CardDescription>
              Add a new student to your class and generate their login credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            
            {!showCreateForm ? (
              <button
                onClick={() => setShowCreateForm(true)}
                disabled={false}
                className={`px-6 py-2 rounded-md font-medium ${
                  false
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                + Create Student Account
              </button>
            ) : (
              <form onSubmit={handleCreateStudent} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      id="first_name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="John"
                    />
                    {errors.first_name && <p className="text-red-500 text-sm mt-1">{errors.first_name}</p>}
                  </div>

                  <div>
                    <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      id="last_name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Doe"
                    />
                    {errors.last_name && <p className="text-red-500 text-sm mt-1">{errors.last_name}</p>}
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="john.doe@student.edu"
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Temporary password"
                    />
                    {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                  </div>

                  <div>
                    <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      id="confirm_password"
                      name="confirm_password"
                      value={formData.confirm_password}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Confirm password"
                    />
                    {errors.confirm_password && <p className="text-red-500 text-sm mt-1">{errors.confirm_password}</p>}
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={createLoading || false}
                    className={`px-6 py-2 rounded-md font-medium ${
                      createLoading || false
                        ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {createLoading ? 'Creating...' : 
                     'Create Student'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setFormData({
                        email: '',
                        first_name: '',
                        last_name: '',
                        password: '',
                        confirm_password: ''
                      });
                      setErrors({});
                    }}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-md font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Students List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Students ({students.length})</CardTitle>
            <CardDescription>
              Manage your student accounts and view their information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                <span className="ml-2 text-gray-600">Loading students...</span>
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No students yet</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating your first student account.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Username
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Login
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                    {students.map((student) => (
                      <tr key={student.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                              <span className="text-emerald-600 font-medium">
                                {(student.first_name || '').charAt(0)}{(student.last_name || '').charAt(0)}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {student.full_name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(student.date_joined).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.last_login ? new Date(student.last_login).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleScheduleInterview(student)}
                              className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md text-xs font-medium"
                            >
                              Schedule Interview
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(student.id, student.full_name)}
                              className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md text-xs font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>


      </div>
    </div>
    </Layout>
  );
};

export default ManageStudentsPage;

// Prevent static generation for this page since it requires authentication
export const getServerSideProps = async () => {
  return {
    props: {},
  };
};
