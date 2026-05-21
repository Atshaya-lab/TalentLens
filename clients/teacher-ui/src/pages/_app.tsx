import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { ToastProvider } from '../components/ui/Toast';
import '../styles/globals.css';

// Component to manage theme classes on body
function ThemeBodyManager() {
  const { isDark, loading } = useTheme();

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    // Don't apply theme changes while loading
    if (loading) return;
    
    const body = document.body;
    if (isDark) {
      body.classList.add('dark');
      body.classList.remove('light');
      body.style.backgroundColor = '#1f2937'; // gray-800
    } else {
      body.classList.add('light');
      body.classList.remove('dark');
      body.style.backgroundColor = '#ffffff'; // white
    }
  }, [isDark, loading]);

  return null;
}

// Dynamically import ThemeBodyManager to ensure it only runs on client side
const ClientOnlyThemeBodyManager = dynamic(() => Promise.resolve(ThemeBodyManager), {
  ssr: false
});

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    // Teacher UI initialized
    console.log('Teacher Dashboard initialized');
  }, []);

  return (
    <ToastProvider>
      <AuthProvider allowedRole="teacher">
        <ThemeProvider>
          <ClientOnlyThemeBodyManager />
          <Component {...pageProps} />
        </ThemeProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default MyApp;
