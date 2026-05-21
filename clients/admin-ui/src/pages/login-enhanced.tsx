import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Form } from '../components/ui/Form';
import { Button } from '../components/ui/Button';
import { useToast } from '../hooks';
import * as Yup from 'yup';

interface LoginFormData {
  email: string;
  password: string;
  remember?: boolean;
}

const loginSchema = Yup.object({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
  remember: Yup.boolean(),
});

const EnhancedLoginPage: React.FC = () => {
  const { login, isLoading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const handleLogin = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
      showToast('Login successful!', 'success');
      router.push('/dashboard');
    } catch (error: any) {
      showToast(error.message || 'Login failed', 'error');
    }
  };

  const handleDemoLogin = async (role: 'student' | 'teacher' | 'admin') => {
    const demoCredentials = {
      student: { email: 'student@demo.com', password: 'demo123' },
      teacher: { email: 'teacher@demo.com', password: 'demo123' },
      admin: { email: 'admin@demo.com', password: 'demo123' },
    };

    try {
      const { email, password } = demoCredentials[role];
      await login(email, password);
      showToast(`Logged in as demo ${role}!`, 'success');
      router.push('/dashboard');
    } catch (error: any) {
      showToast(error.message || 'Demo login failed', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Welcome to TalentLens
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your account to continue your interview preparation journey
          </p>
        </div>

        {/* Login Form */}
        <Card className="mt-8 shadow-xl">
          <Card.Content className="px-8 py-8">
            <Form<LoginFormData>
              schema={loginSchema}
              onSubmit={handleLogin}
            >
              {(methods) => (
                <>
                  <Form.Field
                    name="email"
                    label="Email Address"
                    type="email"
                    placeholder="Enter your email"
                    methods={methods}
                    required
                  />

                  <Form.Field
                    name="password"
                    label="Password"
                    type="password"
                    placeholder="Enter your password"
                    methods={methods}
                    required
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        id="remember"
                        type="checkbox"
                        {...methods.register('remember')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">
                        Remember me
                      </label>
                    </div>

                    <div className="text-sm">
                      <Link href="/forgot-password" className="text-blue-600 hover:text-blue-500 font-medium">
                        Forgot password?
                      </Link>
                    </div>
                  </div>

                  <Form.Button isLoading={isLoading}>
                    Sign In
                  </Form.Button>
                </>
              )}
            </Form>
          </Card.Content>
        </Card>

        {/* Demo Accounts */}
        <Card className="shadow-lg">
          <Card.Header>
            <h3 className="text-lg font-semibold text-gray-900 text-center">
              Try Demo Accounts
            </h3>
            <p className="text-sm text-gray-600 text-center">
              Experience different user roles without creating an account
            </p>
          </Card.Header>
          <Card.Content className="px-6 pb-6">
            <div className="grid grid-cols-1 gap-3">
              <Button
                variant="outline"
                onClick={() => handleDemoLogin('student')}
                disabled={isLoading}
                className="w-full"
              >
                <div className="flex items-center justify-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Demo Student Account
                </div>
              </Button>

              <Button
                variant="outline"
                onClick={() => handleDemoLogin('teacher')}
                disabled={isLoading}
                className="w-full"
              >
                <div className="flex items-center justify-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Demo Teacher Account
                </div>
              </Button>

              <Button
                variant="outline"
                onClick={() => handleDemoLogin('admin')}
                disabled={isLoading}
                className="w-full"
              >
                <div className="flex items-center justify-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Demo Admin Account
                </div>
              </Button>
            </div>
          </Card.Content>
        </Card>

        {/* Register Link */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link href="/register" className="text-blue-600 hover:text-blue-500 font-medium">
              Sign up for free
            </Link>
          </p>
        </div>

        {/* Features Preview */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <Card.Content className="px-6 py-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 text-center">
              What you'll get with TalentLens
            </h4>
            <div className="space-y-3">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-700">AI-powered interview questions tailored to your profile</span>
              </div>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-700">Real-time performance analysis and feedback</span>
              </div>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-700">Resume analysis and optimization suggestions</span>
              </div>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-700">Progress tracking and skill development insights</span>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};

export default EnhancedLoginPage;
