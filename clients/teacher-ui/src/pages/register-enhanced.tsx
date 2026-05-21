import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import { Form } from '../components/ui/Form';
import Button from '../components/ui/Button';
import { useToast } from '../hooks';
import * as Yup from 'yup';

interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'student' | 'teacher';
  agreeToTerms: boolean;
  subscribeNewsletter?: boolean;
}

const registerSchema = Yup.object({
  firstName: Yup.string()
    .min(2, 'First name must be at least 2 characters')
    .required('First name is required'),
  lastName: Yup.string()
    .min(2, 'Last name must be at least 2 characters')
    .required('Last name is required'),
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),
  role: Yup.string()
    .oneOf(['student', 'teacher'], 'Please select a valid role')
    .required('Role is required'),
  agreeToTerms: Yup.boolean()
    .oneOf([true], 'You must agree to the terms and conditions'),
  subscribeNewsletter: Yup.boolean(),
});

const EnhancedRegisterPage: React.FC = () => {
  const { register: registerUser, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);

  const handleRegister = async (data: RegisterFormData) => {
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        password_confirm: data.confirmPassword,
        first_name: data.firstName,
        last_name: data.lastName,
        role: data.role,
      });
      
      showToast('Registration successful! Please check your email for verification.', 'success');
      router.push('/login');
    } catch (error: any) {
      showToast(error.message || 'Registration failed', 'error');
    }
  };

  const roleOptions = [
    { 
      value: 'student', 
      label: 'Student',
      description: 'Practice interviews and improve your skills',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    { 
      value: 'teacher', 
      label: 'Teacher/Instructor',
      description: 'Create and manage interview sessions for students',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-emerald-600 rounded-xl flex items-center justify-center">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Join TalentLens
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Create your account and start mastering interview skills today
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${currentStep >= 1 ? 'text-emerald-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-emerald-600 text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="text-sm font-medium">Account Info</span>
            </div>
            <div className={`w-8 h-0.5 ${currentStep >= 2 ? 'bg-emerald-600' : 'bg-gray-200'}`} />
            <div className={`flex items-center space-x-2 ${currentStep >= 2 ? 'text-emerald-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-emerald-600 text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="text-sm font-medium">Role Selection</span>
            </div>
          </div>
        </div>

        {/* Registration Form */}
        <Card className="shadow-xl">
          <Card.Content className="px-8 py-8">
            <Form<RegisterFormData>
              schema={registerSchema}
              onSubmit={handleRegister}
            >
              {(methods) => {
                const watchRole = methods.watch('role');
                
                return (
                  <>
                    {/* Step 1: Personal Information */}
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Form.Field
                          name="firstName"
                          label="First Name"
                          placeholder="Enter your first name"
                          methods={methods}
                          required
                        />

                        <Form.Field
                          name="lastName"
                          label="Last Name"
                          placeholder="Enter your last name"
                          methods={methods}
                          required
                        />
                      </div>

                      <Form.Field
                        name="email"
                        label="Email Address"
                        type="email"
                        placeholder="Enter your email"
                        methods={methods}
                        required
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Form.Field
                          name="password"
                          label="Password"
                          type="password"
                          placeholder="Create a strong password"
                          methods={methods}
                          required
                        />

                        <Form.Field
                          name="confirmPassword"
                          label="Confirm Password"
                          type="password"
                          placeholder="Confirm your password"
                          methods={methods}
                          required
                        />
                      </div>

                      {/* Password Strength Indicator */}
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>Password must contain:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>At least 8 characters</li>
                          <li>One uppercase letter</li>
                          <li>One lowercase letter</li>
                          <li>One number</li>
                        </ul>
                      </div>
                    </div>

                    {/* Step 2: Role Selection */}
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-4">
                          Select Your Role <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {roleOptions.map((option) => (
                            <label
                              key={option.value}
                              className={`relative cursor-pointer rounded-lg border p-6 transition-all ${
                                watchRole === option.value
                                  ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600'
                                  : 'border-gray-300 hover:border-gray-400'
                              }`}
                            >
                              <input
                                type="radio"
                                value={option.value}
                                {...methods.register('role')}
                                className="sr-only"
                              />
                              <div className="flex flex-col items-center text-center">
                                <div className={`mb-3 ${watchRole === option.value ? 'text-emerald-600' : 'text-gray-400'}`}>
                                  {option.icon}
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">
                                  {option.label}
                                </h3>
                                <p className="mt-2 text-sm text-gray-500">
                                  {option.description}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                        {methods.formState.errors.role && (
                          <p className="mt-2 text-sm text-red-600">
                            {methods.formState.errors.role.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Terms and Newsletter */}
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <input
                          id="agreeToTerms"
                          type="checkbox"
                          {...methods.register('agreeToTerms')}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded mt-1"
                        />
                        <label htmlFor="agreeToTerms" className="ml-3 text-sm text-gray-700">
                          I agree to the{' '}
                          <Link href="/terms" className="text-emerald-600 hover:text-emerald-500 font-medium">
                            Terms of Service
                          </Link>{' '}
                          and{' '}
                          <Link href="/privacy" className="text-emerald-600 hover:text-emerald-500 font-medium">
                            Privacy Policy
                          </Link>
                          <span className="text-red-500 ml-1">*</span>
                        </label>
                      </div>
                      {methods.formState.errors.agreeToTerms && (
                        <p className="text-sm text-red-600 ml-7">
                          {methods.formState.errors.agreeToTerms.message}
                        </p>
                      )}

                      <div className="flex items-center">
                        <input
                          id="subscribeNewsletter"
                          type="checkbox"
                          {...methods.register('subscribeNewsletter')}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                        />
                        <label htmlFor="subscribeNewsletter" className="ml-3 text-sm text-gray-700">
                          Subscribe to our newsletter for tips and updates
                        </label>
                      </div>
                    </div>

                    <Form.Button isLoading={loading}>
                      Create Account
                    </Form.Button>
                  </>
                );
              }}
            </Form>
          </Card.Content>
        </Card>

        {/* Login Link */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-emerald-600 hover:text-emerald-500 font-medium">
              Sign in here
            </Link>
          </p>
        </div>

        {/* Benefits Section */}
        <Card className="bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200">
          <Card.Content className="px-6 py-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 text-center">
              Why choose TalentLens?
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h5 className="font-medium text-gray-900">AI-Powered Questions</h5>
                    <p className="text-sm text-gray-600">Get personalized interview questions based on your field and experience level</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h5 className="font-medium text-gray-900">Real-time Feedback</h5>
                    <p className="text-sm text-gray-600">Get instant analysis and improvement suggestions for your answers</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h5 className="font-medium text-gray-900">Progress Tracking</h5>
                    <p className="text-sm text-gray-600">Monitor your improvement with detailed analytics and reports</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h5 className="font-medium text-gray-900">Resume Analysis</h5>
                    <p className="text-sm text-gray-600">Upload your resume for AI-powered optimization suggestions</p>
                  </div>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};

export default EnhancedRegisterPage;
