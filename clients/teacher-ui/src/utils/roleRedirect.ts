/**
 * Role-based redirect utility for multi-client architecture
 */

export type UserRole = 'student' | 'teacher' | 'administrator';

export interface ClientConfig {
  role: UserRole;
  baseUrl: string;
  port: number;
  name: string;
}

export const CLIENT_CONFIGS: Record<UserRole, ClientConfig> = {
  student: {
    role: 'student',
    baseUrl: 'http://localhost:3001',
    port: 3001,
    name: 'Student Portal'
  },
  teacher: {
    role: 'teacher', 
    baseUrl: 'http://localhost:3002',
    port: 3002,
    name: 'Teacher Dashboard'
  },
  administrator: {
    role: 'administrator',
    baseUrl: 'http://localhost:3003', 
    port: 3003,
    name: 'Admin Panel'
  }
};

/**
 * Redirects user to their appropriate client UI based on role
 */
export const redirectToRoleClient = (userRole: UserRole): void => {
  const config = CLIENT_CONFIGS[userRole];
  if (config && typeof window !== 'undefined') {
    const currentPort = window.location.port;
    const targetPort = config.port.toString();
    
    // Only redirect if not already on the correct client
    if (currentPort !== targetPort) {
      window.location.href = `${config.baseUrl}/dashboard`;
    }
  }
};

/**
 * Checks if current client is correct for user role
 */
export const isCorrectClient = (userRole: UserRole): boolean => {
  if (typeof window === 'undefined') return true;
  
  const config = CLIENT_CONFIGS[userRole];
  const currentPort = window.location.port;
  return currentPort === config.port.toString();
};

/**
 * Gets the correct login URL for a specific role
 */
export const getLoginUrl = (userRole?: UserRole): string => {
  if (!userRole) return 'http://localhost:3001/login'; // Default to student
  
  const config = CLIENT_CONFIGS[userRole];
  return `${config.baseUrl}/login`;
};

/**
 * Gets the home URL for a specific role
 */
export const getHomeUrl = (userRole: UserRole): string => {
  const config = CLIENT_CONFIGS[userRole];
  return config.baseUrl;
};
