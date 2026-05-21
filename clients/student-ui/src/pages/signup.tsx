import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

const StudentSignupPage: React.FC = () => {
  const router = useRouter();
  
  // Redirect students to signin page since they cannot self-register
  React.useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/signin');
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-accent-100 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-accent-500 to-accent-600 rounded-full flex items-center justify-center mb-6">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-neutral-900 mb-4">
            Student Account Creation
          </h2>
          <div className="bg-accent-50 border border-accent-200 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-center mb-4">
              <svg className="h-12 w-12 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-accent-900 mb-2">
              Students Cannot Self-Register
            </h3>
            <p className="text-accent-800 text-sm mb-4">
              Student accounts are created and managed by teachers. Please contact your teacher to create an account for you.
            </p>
            <div className="bg-white rounded-md p-4 border border-accent-200">
              <h4 className="font-medium text-accent-900 mb-2">What to do:</h4>
              <ul className="text-left text-sm text-accent-800 space-y-1">
                <li>• Contact your teacher or instructor</li>
                <li>• Request them to create your student account</li>
                <li>• They will provide you with login credentials</li>
                <li>• Use those credentials to sign in</li>
              </ul>
            </div>
          </div>
          
          <p className="text-sm text-neutral-500 mb-4">
            Redirecting to login page in 3 seconds...
          </p>
          
          <div className="space-y-3">
            <Link
              href="/signin"
              className="w-full inline-flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500"
            >
              Go to Login Page
            </Link>
            <Link
              href="/"
              className="w-full inline-flex justify-center py-2 px-4 border border-neutral-300 rounded-xl shadow-sm text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentSignupPage;
