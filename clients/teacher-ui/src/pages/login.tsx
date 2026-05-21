import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

const LoginRedirect: React.FC = () => {
  const router = useRouter();

  useEffect(() => {
    // Redirect /login to /signin
    router.replace('/signin');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to sign in...</p>
      </div>
    </div>
  );
};

export default LoginRedirect;
