import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import { useToast } from '../hooks';

const TeacherSignInPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { login } = useAuth();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    setIsLoading(true);
    
    try {
      await login(email, password);
      showToast('Welcome back! Redirecting to dashboard...', 'success');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      showToast(error.message || 'Failed to sign in. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex">
      {/* Left Side - Sign In Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-2xl">T</span>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome Back
            </h2>
            <p className="text-gray-600 text-lg">
              Sign in to your TalentLens teacher account
            </p>
          </div>

          {/* Sign In Form */}
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 bg-white/80 backdrop-blur-sm"
                    placeholder="Enter your email"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 bg-white/80 backdrop-blur-sm pr-12"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L12 12m-6.878-6.878L12 12m0 0l4.242 4.242M12 12L3 3" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link href="/forgot-password" className="font-medium text-emerald-600 hover:text-emerald-500 transition-colors">
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              fullWidth
              variant="gradient"
              size="lg"
              isLoading={isLoading}
              className="shadow-lg hover:shadow-xl"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link href="/signup" className="font-semibold text-emerald-600 hover:text-emerald-500 transition-colors">
                  Sign up for free
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Right Side - Features & Benefits */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/90 to-teal-600/90 backdrop-blur-sm"></div>
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-60 h-60 bg-white/5 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 max-w-md text-white px-8">
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-3xl font-bold mb-4">
              Empower Your Students
            </h3>
            <p className="text-emerald-100 text-lg leading-relaxed">
              Transform your teaching with AI-powered interview training that helps students succeed in their careers
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                <svg className="w-4 h-4 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-1">Smart Interview Creation</h4>
                <p className="text-emerald-100">Generate personalized interview questions using AI for any role or skill level</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                <svg className="w-4 h-4 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-1">Real-time Analytics</h4>
                <p className="text-emerald-100">Track student progress with detailed performance insights and recommendations</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                <svg className="w-4 h-4 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-1">Comprehensive Management</h4>
                <p className="text-emerald-100">Easily organize students, track progress, and manage your entire classroom</p>
              </div>
            </div>
          </div>

          {/* Premium Features Teaser */}
          <div className="mt-12 p-6 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
            <div className="flex items-center space-x-3 mb-4">
              <svg className="w-6 h-6 text-yellow-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <h4 className="text-xl font-bold">Unlock Premium Features</h4>
            </div>
            <p className="text-emerald-100 text-sm mb-4">
              Get unlimited students, advanced analytics, priority support, and exclusive teaching tools
            </p>
            <div className="text-center">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/50 backdrop-blur-sm"
                onClick={() => router.push('/upgrade')}
              >
                Learn More About Pro
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherSignInPage;
