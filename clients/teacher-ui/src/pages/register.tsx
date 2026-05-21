import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { validateEmail, validatePassword } from '../utils/helpers';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    role: 'teacher' as 'teacher' | 'student',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const { register } = useAuth();
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
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
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
    if (!formData.first_name) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.last_name) {
      newErrors.last_name = 'Last name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const result = await register(formData);
      
      if (result.success) {
        addToast({
          type: 'success',
          title: 'Registration Successful',
          description: 'Your account has been created. Please log in to continue.',
        });
        router.push('/login');
      } else {
        setErrors({ general: result.error || 'Registration failed' });
        addToast({
          type: 'error',
          title: 'Registration Failed',
          description: result.error || 'Registration failed',
        });
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
      addToast({
        type: 'error',
        title: 'Registration Failed',
        description: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            TalentLens
          </h1>
          <p className="text-lg text-gray-600">
            Join the AI-Powered Interview Training Platform
          </p>
        </div>

        {/* Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle>Create your account</CardTitle>
            <CardDescription>
              Fill in your details to get started with TalentLens
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {errors.general && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        {errors.general}
                      </h3>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {/* Role Selection */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    I am a
                  </label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center">
                      <input
                        id="student"
                        name="role"
                        type="radio"
                        value="student"
                        checked={formData.role === 'student'}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                      />
                      <label htmlFor="student" className="ml-3 block text-sm text-gray-900">
                        Student - Looking to practice and improve interview skills
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="teacher"
                        name="role"
                        type="radio"
                        value="teacher"
                        checked={formData.role === 'teacher'}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                      />
                      <label htmlFor="teacher" className="ml-3 block text-sm text-gray-900">
                        Teacher - Want to conduct and manage interviews
                      </label>
                    </div>
                  </div>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    error={errors.first_name}
                    placeholder="John"
                    fullWidth
                  />
                  <Input
                    label="Last Name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    error={errors.last_name}
                    placeholder="Doe"
                    fullWidth
                  />
                </div>

                <Input
                  label="Email address"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  error={errors.email}
                  placeholder="john.doe@example.com"
                  fullWidth
                  leftIcon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  }
                />

                <Input
                  label="Password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  error={errors.password}
                  placeholder="Create a strong password"
                  helperText="Password must be at least 8 characters with uppercase, lowercase, number, and special character"
                  fullWidth
                  leftIcon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  }
                />

                <Input
                  label="Confirm Password"
                  type="password"
                  name="password_confirm"
                  value={formData.password_confirm}
                  onChange={handleInputChange}
                  error={errors.password_confirm}
                  placeholder="Confirm your password"
                  fullWidth
                  leftIcon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  }
                />
              </div>

              <div className="flex items-center">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  required
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                />
                <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                  I agree to the{' '}
                  <a href="#" className="text-emerald-600 hover:text-emerald-500">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-emerald-600 hover:text-emerald-500">
                    Privacy Policy
                  </a>
                </label>
              </div>

              <Button
                type="submit"
                isLoading={isLoading}
                fullWidth
                size="lg"
              >
                Create Account
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Already have an account?</span>
                </div>
              </div>

              <div className="mt-6 text-center">
                <Link href="/login" className="font-medium text-emerald-600 hover:text-emerald-500">
                  Sign in to your account
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
