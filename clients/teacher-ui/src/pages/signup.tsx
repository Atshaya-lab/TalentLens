import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { validateEmail, validatePassword } from '../utils/helpers';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';

const TeacherSignUpPage: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    role: 'teacher' as const,
    institution: '',
    department: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const { register } = useAuth();
  const { isDark } = useTheme();
  const { addToast } = useToast();
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear specific field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Institutional email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid institutional email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        newErrors.password = passwordValidation.errors[0];
      }
    }

    // Password confirmation
    if (!formData.password_confirm) {
      newErrors.password_confirm = 'Please confirm your password';
    } else if (formData.password !== formData.password_confirm) {
      newErrors.password_confirm = 'Passwords do not match';
    }

    // Name validation
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    // Institution validation
    if (!formData.institution.trim()) {
      newErrors.institution = 'Institution name is required';
    }

    if (!formData.department.trim()) {
      newErrors.department = 'Department is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const result = await register(formData);
      
      if (result.success) {
        addToast({
          type: 'success',
          title: 'Registration Successful',
          description: 'Your educator account has been created. Please sign in to continue.',
        });
        router.push('/signin');
      } else {
        setErrors({ general: result.error || 'Registration failed' });
        addToast({
          type: 'error',
          title: 'Registration Failed',
          description: result.error || 'Registration failed',
        });
      }
    } catch (error: any) {
      setErrors({ general: 'Registration failed. Please try again.' });
      addToast({
        type: 'error',
        title: 'Registration Failed',
        description: 'Registration failed. Please check your information and try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-academic-pattern opacity-5" />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-lg relative">
        {/* Logo and Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 00-2 2v2a2 2 0 002 2m0 0V9a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2" />
            </svg>
          </div>
          <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            Join as Educator
          </h1>
          <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Help shape the next generation of professionals
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg relative">
        <div className={`py-8 px-4 shadow-xl rounded-2xl sm:px-10 border ${
          isDark 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-100'
        }`}>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {errors.general && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <div className="flex">
                  <svg className="h-5 w-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{errors.general}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <Input
                  id="first_name"
                  name="first_name"
                  type="text"
                  autoComplete="given-name"
                  required
                  placeholder="Dr. Jane"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  error={errors.first_name}
                />
              </div>

              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <Input
                  id="last_name"
                  name="last_name"
                  type="text"
                  autoComplete="family-name"
                  required
                  placeholder="Smith"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  error={errors.last_name}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Institutional Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="jane.smith@university.edu"
                value={formData.email}
                onChange={handleInputChange}
                error={errors.email}
                className="block w-full"
              />
              <p className="mt-1 text-xs text-gray-500">
                Use your official educational institution email address
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="institution" className="block text-sm font-medium text-gray-700 mb-2">
                  Institution
                </label>
                <Input
                  id="institution"
                  name="institution"
                  type="text"
                  required
                  placeholder="University of Technology"
                  value={formData.institution}
                  onChange={handleInputChange}
                  error={errors.institution}
                />
              </div>

              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <Input
                  id="department"
                  name="department"
                  type="text"
                  required
                  placeholder="Computer Science"
                  value={formData.department}
                  onChange={handleInputChange}
                  error={errors.department}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Create a secure password"
                value={formData.password}
                onChange={handleInputChange}
                error={errors.password}
                className="block w-full"
              />
              <p className="mt-1 text-xs text-gray-500">
                Must be at least 8 characters with uppercase, lowercase, number and special character
              </p>
            </div>

            <div>
              <label htmlFor="password_confirm" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <Input
                id="password_confirm"
                name="password_confirm"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Confirm your password"
                value={formData.password_confirm}
                onChange={handleInputChange}
                error={errors.password_confirm}
                className="block w-full"
              />
            </div>

            <div className="flex items-start">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded mt-1"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                I confirm that I am an authorized educator at the specified institution and agree to the{' '}
                <Link href="/terms" className="text-emerald-600 hover:text-emerald-500">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-emerald-600 hover:text-emerald-500">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Account...
                  </div>
                ) : (
                  'Create Educator Account'
                )}
              </Button>
            </div>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className={`w-full border-t ${isDark ? 'border-gray-600' : 'border-gray-300'}`} />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className={`px-2 ${
                    isDark 
                      ? 'bg-gray-800 text-gray-400' 
                      : 'bg-white text-gray-500'
                  }`}>Already have an account?</span>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  href="/signin"
                  className={`w-full flex justify-center py-3 px-4 border rounded-lg shadow-sm text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 ${
                    isDark
                      ? 'border-emerald-600 bg-gray-700 text-emerald-400 hover:bg-gray-600'
                      : 'border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  Sign In to Your Account
                </Link>
              </div>
            </div>
          </form>
        </div>

        {/* Educator Benefits */}
        <div className="mt-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg shadow-lg p-6 text-white">
          <h3 className="text-lg font-semibold mb-4">Educator Platform Benefits</h3>
          <ul className="space-y-3">
            <li className="flex items-center">
              <svg className="h-5 w-5 text-emerald-200 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm">Comprehensive student progress analytics</span>
            </li>
            <li className="flex items-center">
              <svg className="h-5 w-5 text-emerald-200 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm">Customizable curriculum and assessment tools</span>
            </li>
            <li className="flex items-center">
              <svg className="h-5 w-5 text-emerald-200 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm">AI-powered insights for improved teaching</span>
            </li>
            <li className="flex items-center">
              <svg className="h-5 w-5 text-emerald-200 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm">Multi-class management capabilities</span>
            </li>
          </ul>
        </div>

        {/* Verification Notice */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-amber-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">Account Verification</h3>
              <p className="text-sm text-amber-700 mt-1">
                Your educator account will be reviewed for verification within 24-48 hours after registration.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherSignUpPage;
