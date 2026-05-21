import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../shared/contexts/AuthContext';
import Link from 'next/link';

const AdminHomePage: React.FC = () => {
  const { isAuthenticated, user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/dashboard').catch(console.error);
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-purple-600">
                TalentLens Admin Portal
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/signin"
                className="text-gray-600 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="relative py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              System Administration
              <span className="text-purple-600"> Dashboard</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
              Manage users, monitor system performance, and configure the platform.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/signup"
                className="rounded-md bg-purple-600 px-6 py-3 text-lg font-semibold text-white shadow-sm hover:bg-purple-700"
              >
                Get Started
              </Link>
              <Link
                href="/signin"
                className="text-lg font-semibold leading-6 text-gray-900 hover:text-purple-600"
              >
                Sign In <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHomePage;