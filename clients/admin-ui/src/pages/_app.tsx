import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { AuthProvider } from '../../shared/contexts/AuthContext';
import { ToastProvider } from '../components/ui/Toast';
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    // Admin UI initialized
    console.log('Admin Panel initialized');
  }, []);

  return (
    <ToastProvider>
      <AuthProvider allowedRole="administrator">
        <Component {...pageProps} />
      </AuthProvider>
    </ToastProvider>
  );
}

export default MyApp;
