import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks';

const NewInterviewPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Redirect students - they cannot create interviews
    if (user?.role === 'student') {
      showToast('Students cannot create interviews. You can only attend scheduled interviews.', 'warning');
      router.push('/interviews');
      return;
    }

    // For non-students, redirect to appropriate UI
    if (user?.role === 'teacher') {
      // Redirect to teacher UI
      window.location.href = '/teacher/interviews/new';
      return;
    }

    if (user?.role === 'administrator') {
      // Redirect to admin UI or teacher UI
      window.location.href = '/teacher/interviews/new';
      return;
    }
  }, [isAuthenticated, user, router, showToast]);

  // Show loading while redirecting
  return (
    <Layout>
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    </Layout>
  );
};

export default NewInterviewPage;
