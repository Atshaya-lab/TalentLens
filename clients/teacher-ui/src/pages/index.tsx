import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';

const TeacherHomePage: React.FC = () => {
  const { isAuthenticated, user, loading } = useAuth();
  const { isDark } = useTheme();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/dashboard').catch(console.error);
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">T</span>
                </div>
              </div>
              <h1 className="ml-3 text-2xl font-bold text-emerald-600">
                TalentLens
              </h1>
              <span className="ml-2 text-sm text-gray-500">Teacher Portal</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/signin"
                className="text-gray-600 hover:text-emerald-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-md"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className={`text-5xl md:text-6xl font-bold tracking-tight ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              Empower Your Students with
              <span className="block text-emerald-600 mt-2">AI-Powered Interviews</span>
            </h1>
            <p className="mt-8 text-xl leading-8 text-gray-600 max-w-3xl mx-auto">
              Create personalized mock interviews, track student progress, and provide data-driven feedback to help your students succeed in their career journey.
            </p>
            <div className="mt-12 flex items-center justify-center gap-x-6">
              <Link
                href="/signup"
                className="rounded-lg bg-emerald-600 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:bg-emerald-700 transform hover:scale-105 transition-all duration-200"
              >
                Start Teaching Today
              </Link>
              <Link
                href="/signin"
                className={`text-lg font-semibold leading-6 hover:text-emerald-600 transition-colors ${isDark ? 'text-gray-100' : 'text-gray-900'}`}
              >
                Sign In <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Everything You Need to Train Tomorrow's Talent
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Comprehensive tools designed specifically for educators
            </p>
          </div>

          <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <CardTitle>Student Management</CardTitle>
                <CardDescription>
                  Easily manage student enrollment, track individual progress, and organize your classroom
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 2 */}
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <CardTitle>AI-Powered Interviews</CardTitle>
                <CardDescription>
                  Create dynamic interview scenarios with AI-generated questions tailored to specific roles and skill levels
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 3 */}
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <CardTitle>Performance Analytics</CardTitle>
                <CardDescription>
                  Get detailed insights into student performance with comprehensive analytics and progress tracking
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 4 */}
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <CardTitle>Resume Analysis</CardTitle>
                <CardDescription>
                  Help students improve their resumes with AI-powered analysis and personalized recommendations
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 5 */}
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <CardTitle>Real-time Feedback</CardTitle>
                <CardDescription>
                  Provide instant feedback during interviews and generate detailed performance reports
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 6 */}
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <CardTitle>Secure & Private</CardTitle>
                <CardDescription>
                  All student data is encrypted and secure, with full compliance to educational privacy standards
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              How TalentLens Works
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Get started in just a few simple steps
            </p>
          </div>

          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white font-bold text-xl">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Setup Your Classroom</h3>
              <p className="text-gray-600">
                Create your teacher account and invite students to join your virtual classroom
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white font-bold text-xl">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Create Interviews</h3>
              <p className="text-gray-600">
                Design custom interview scenarios or use our AI to generate questions for specific roles
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white font-bold text-xl">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Track Progress</h3>
              <p className="text-gray-600">
                Monitor student performance, provide feedback, and watch them improve over time
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-emerald-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Trusted by Educators Worldwide
            </h2>
          </div>
          
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-white">1000+</div>
              <div className="text-emerald-100 mt-2">Active Teachers</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white">50K+</div>
              <div className="text-emerald-100 mt-2">Students Trained</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white">95%</div>
              <div className="text-emerald-100 mt-2">Success Rate</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white">24/7</div>
              <div className="text-emerald-100 mt-2">Support Available</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Ready to Transform Your Teaching?
          </h2>
          <p className="mt-6 text-xl text-gray-600">
            Join thousands of educators using TalentLens to prepare students for successful careers.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/signup"
              className="rounded-lg bg-emerald-600 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:bg-emerald-700 transform hover:scale-105 transition-all duration-200"
            >
              Start Free Today
            </Link>
            <Link
              href="/signin"
              className="text-lg font-semibold leading-6 text-gray-900 hover:text-emerald-600 transition-colors"
            >
              Have an account? Sign in <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">T</span>
                </div>
                <h3 className="ml-3 text-xl font-bold text-white">TalentLens</h3>
              </div>
              <p className="mt-4 text-gray-400 max-w-md">
                Empowering educators with AI-powered tools to prepare students for successful careers through realistic mock interviews and comprehensive skill assessment.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Platform</h4>
              <ul className="mt-4 space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">API</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Support</h4>
              <ul className="mt-4 space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-700">
            <p className="text-center text-gray-400">
              © 2025 TalentLens. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TeacherHomePage;
