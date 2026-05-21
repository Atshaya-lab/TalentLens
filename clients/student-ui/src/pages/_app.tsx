import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { ToastProvider } from '../components/ui/Toast';
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    // Student UI initialized
    console.log('Student Portal initialized');
  }, []);

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider allowedRole="student">
          <Component {...pageProps} />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default MyApp;
