import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../utils/api';

interface ThemeContextType {
  theme: 'light' | 'dark' | 'auto';
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  loading: boolean;
}

// Default context value to prevent undefined errors
const defaultThemeContext: ThemeContextType = {
  theme: 'light',
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
  loading: true,
};

const ThemeContext = createContext<ThemeContextType>(defaultThemeContext);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<'light' | 'dark' | 'auto'>('light');
  const [isDark, setIsDark] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load theme from localStorage first, then sync with API if authenticated
  useEffect(() => {
    const loadTheme = async () => {
      try {
        // Ensure we're on the client side
        if (typeof window === 'undefined') {
          setLoading(false);
          return;
        }
        
        // Load from localStorage immediately for faster initialization
        const localTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'auto' || 'light';
        setThemeState(localTheme);
        applyTheme(localTheme);
        setLoading(false);
        
        // Only sync with API if user is authenticated
        const token = localStorage.getItem('access_token');
        if (token) {
          try {
            const response = await apiService.getUserPreferences();
            const apiTheme = response.data.theme || localTheme;
            if (apiTheme !== localTheme) {
              setThemeState(apiTheme);
              applyTheme(apiTheme);
              localStorage.setItem('theme', apiTheme);
            }
          } catch (apiError: any) {
            // Only log non-auth errors, 401 is expected when not authenticated
            if (apiError.response?.status !== 401) {
              console.error('Failed to sync theme with API:', apiError);
            }
            // Continue with localStorage theme
          }
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
        // Default to light theme
        setThemeState('light');
        applyTheme('light');
        setLoading(false);
      }
    };

    loadTheme();
  }, []);

  // Apply theme to the document
  const applyTheme = (themeValue: 'light' | 'dark' | 'auto') => {
    // Ensure we're on the client side
    if (typeof window === 'undefined') return;
    
    let effectiveTheme = themeValue;
    
    if (themeValue === 'auto') {
      // Use system preference
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    setIsDark(effectiveTheme === 'dark');
    
    if (effectiveTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Listen for system theme changes when auto is selected
  useEffect(() => {
    if (theme === 'auto' && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('auto');
      
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [theme]);

  const setTheme = async (newTheme: 'light' | 'dark' | 'auto') => {
    try {
      // Always update local state first for immediate UI response
      setThemeState(newTheme);
      applyTheme(newTheme);
      localStorage.setItem('theme', newTheme);
      
      // Only sync with backend if user is authenticated
      const token = localStorage.getItem('access_token');
      if (token) {
        await apiService.updateTheme(newTheme);
      }
    } catch (error: any) {
      // Only log non-auth errors, 401 is expected when not authenticated
      if (error.response?.status !== 401) {
        console.error('Failed to update theme:', error);
      }
      // Theme is already updated locally, so no need for fallback
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  const value: ThemeContextType = {
    theme,
    isDark,
    toggleTheme,
    setTheme,
    loading,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  // Don't warn about default context usage - it's expected for Toast components in portals
  return context;
};
