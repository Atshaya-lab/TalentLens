import { useTheme } from '../contexts/ThemeContext';

export const useFormStyles = () => {
  const { isDark } = useTheme();

  return {
    // Form labels
    label: `block text-sm font-medium mb-2 ${
      isDark ? 'text-gray-200' : 'text-gray-700'
    }`,
    
    // Required label (with color accent)
    labelRequired: `block text-sm font-medium mb-2 ${
      isDark ? 'text-emerald-300' : 'text-emerald-700'
    }`,
    
    // Regular input fields
    input: `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
      isDark 
        ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
    }`,
    
    // Disabled input fields
    inputDisabled: `w-full px-3 py-2 border rounded-md ${
      isDark 
        ? 'bg-gray-800 border-gray-600 text-gray-400' 
        : 'bg-gray-50 border-gray-300 text-gray-500'
    }`,
    
    // Select dropdowns
    select: `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
      isDark 
        ? 'bg-gray-700 border-gray-600 text-gray-100' 
        : 'bg-white border-gray-300 text-gray-900'
    }`,
    
    // Textarea
    textarea: `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-vertical ${
      isDark 
        ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
    }`,
    
    // Helper text
    helperText: `text-xs mt-1 ${
      isDark ? 'text-gray-400' : 'text-gray-500'
    }`,
    
    // Error text
    errorText: `text-xs mt-1 ${
      isDark ? 'text-red-400' : 'text-red-500'
    }`,
    
    // Section headings
    sectionHeading: `text-lg font-medium mb-4 ${
      isDark ? 'text-gray-100' : 'text-gray-900'
    }`,
    
    // Subsection headings
    subHeading: `text-base font-medium mb-2 ${
      isDark ? 'text-gray-200' : 'text-gray-800'
    }`,
    
    // Card backgrounds
    card: `rounded-lg border ${
      isDark 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    }`,
    
    // Tab buttons
    tabButton: (isActive: boolean) => `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      isActive
        ? isDark
          ? 'bg-emerald-600 text-white'
          : 'bg-emerald-600 text-white'
        : isDark
          ? 'text-gray-300 hover:text-gray-100 hover:bg-gray-700'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
    }`,
    
    // Checkbox styles
    checkbox: `w-4 h-4 text-emerald-600 border rounded focus:ring-emerald-500 ${
      isDark 
        ? 'bg-gray-700 border-gray-600' 
        : 'bg-white border-gray-300'
    }`,
  };
};

export const useTextStyles = () => {
  const { isDark } = useTheme();

  return {
    // Main headings
    h1: `text-3xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`,
    h2: `text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`,
    h3: `text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`,
    h4: `text-lg font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`,
    
    // Body text
    body: `text-base ${isDark ? 'text-gray-200' : 'text-gray-800'}`,
    bodySmall: `text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`,
    
    // Muted text
    muted: `text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`,
    
    // Link text
    link: `text-emerald-600 hover:text-emerald-700 ${isDark ? 'hover:text-emerald-400' : ''}`,
    
    // Success text
    success: `${isDark ? 'text-green-400' : 'text-green-600'}`,
    
    // Warning text
    warning: `${isDark ? 'text-yellow-400' : 'text-yellow-600'}`,
    
    // Error text
    error: `${isDark ? 'text-red-400' : 'text-red-600'}`,
  };
};
