import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks';
import { cn } from '../utils/helpers';
import NotificationCenter from './NotificationCenter';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, isAuthenticated, loading } = useAuth();
  const { notifications, unreadCount } = useNotifications();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const router = useRouter();

  // Check if the current route requires authentication
  const protectedRoutes = ['/dashboard', '/interviews', '/resumes', '/analytics', '/profile', '/settings'];
  const isProtectedRoute = protectedRoutes.some(route => router.pathname.startsWith(route));

  // Handle redirects in useEffect to avoid render-time navigation
  React.useEffect(() => {
    if (!loading && !isAuthenticated && isProtectedRoute) {
      setRedirecting(true);
      router.push('/').catch((error) => {
        console.error('Navigation error:', error);
        setRedirecting(false);
      });
    }
  }, [loading, isAuthenticated, isProtectedRoute, router]);

  // Show loading state during auth check or redirect
  if (loading || redirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 border-t-emerald-600 mx-auto"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 opacity-20 animate-pulse"></div>
          </div>
          <p className="mt-6 text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, return children without layout (for public pages)
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        </svg>
      ),
      roles: ['student'],
    },
    {
      name: 'My Interviews',
      href: '/interviews',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      roles: ['student'],
    },
    {
      name: 'My Resume',
      href: '/resumes',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293L16 6.586A1 1 0 0116 7v10a2 2 0 01-2 2z" />
        </svg>
      ),
      roles: ['student'],
    },
    {
      name: 'My Progress',
      href: '/analytics',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      roles: ['administrator', 'teacher', 'student'],
    },
    {
      name: 'My Profile',
      href: '/profile',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      roles: ['student'],
    },
  ];

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user?.role || '')
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Mobile sidebar */}
      <div className={cn(
        'fixed inset-0 flex z-40 md:hidden transition-all duration-300 ease-in-out',
        sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      )}>
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <div className={cn("relative flex-1 flex flex-col max-w-xs w-full transform transition-transform duration-300 ease-in-out", 
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "bg-white/80 backdrop-blur-md"
        )}>
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white hover:bg-gray-600 transition-colors"
            >
              <svg className="h-6 w-6 text-white" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <SidebarContent navigation={filteredNavigation} user={user} />
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <SidebarContent navigation={filteredNavigation} user={user} />
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        {/* Top bar */}
        <div className="sticky top-0 z-10 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-gradient-to-r from-slate-50 to-blue-50">
          <button
            onClick={() => setSidebarOpen(true)}
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-200 hover:scale-105 text-gray-500 hover:text-gray-900 hover:bg-white/60 backdrop-blur-sm"
          >
            <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Header */}
        <header className="shadow-sm backdrop-blur-md bg-white/80">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  {getPageTitle(router.pathname)}
                </h1>
                {/* Subtle learning hint for students */}
                <span className="hidden lg:inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200">
                  📚 Your Learning Journey
                </span>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Notifications */}
                <button
                  onClick={() => setNotificationCenterOpen(true)}
                  className="p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-200 hover:scale-105 text-gray-400 hover:text-gray-600 hover:bg-gray-100 relative"
                  title="View notifications"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-red-400 to-pink-400 text-xs font-bold text-white animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Profile */}
                <div className="relative">
                  <Link href="/profile" className="flex items-center space-x-3 rounded-xl p-2 transition-all duration-200 hover:scale-105 hover:bg-gray-100">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                        <span className="text-sm font-medium text-white">
                          {user?.first_name && user?.last_name 
                            ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`
                            : user?.email?.charAt(0)?.toUpperCase() || 'U'
                          }
                        </span>
                      </div>
                    </div>
                    <div className="hidden md:block">
                      <div className="text-base font-medium text-gray-800">
                        {user?.first_name && user?.last_name 
                          ? `${user.first_name} ${user.last_name}`
                          : user?.email || 'Loading...'
                        }
                      </div>
                      <div className="text-sm font-medium text-gray-500">
                        View Profile
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 transition-all duration-300 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          <div className="py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Notification Center */}
      <NotificationCenter
        isOpen={notificationCenterOpen}
        onClose={() => setNotificationCenterOpen(false)}
      />
    </div>
  );
};

interface SidebarContentProps {
  navigation: any[];
  user: any;
}

const SidebarContent: React.FC<SidebarContentProps> = ({ navigation, user }) => {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <>
      <div className="flex-1 flex flex-col min-h-0 border-r backdrop-blur-md bg-white/80 border-gray-200">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-4 mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  TalentLens
                </h2>
                <p className="text-xs text-gray-500">
                  Student Portal
                </p>
              </div>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="mt-2 flex-1 px-3 space-y-2 bg-white">
            {navigation.map((item) => {
              const isActive = router.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 hover:scale-105",
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <span className={cn(
                    "mr-3 flex-shrink-0 transition-all duration-200",
                    isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-500'
                  )}>
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.name}</span>
                  {isActive && (
                    <span className="ml-3 h-2 w-2 bg-white rounded-full animate-pulse"></span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Learning Progress CTA */}
          <div className="mt-6 px-3">
            <div className="rounded-xl p-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-semibold">Keep Learning</span>
              </div>
              <p className="text-xs text-white/80 mb-3">
                Complete your next interview to boost your skills
              </p>
              <button className="w-full bg-white/20 hover:bg-white/30 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors backdrop-blur-sm">
                Start Practice
              </button>
            </div>
          </div>
        </div>
        
        {/* User Profile Section */}
        <div className="flex-shrink-0 border-t p-4 border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                <span className="text-sm font-medium text-white">
                  {user?.first_name && user?.last_name 
                    ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`
                    : user?.email?.charAt(0)?.toUpperCase() || 'U'
                  }
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate text-gray-800">
                {user?.first_name && user?.last_name 
                  ? `${user.first_name} ${user.last_name}`
                  : user?.email || 'Loading...'
                }
              </div>
              <div className="text-xs truncate text-gray-500">
                {user?.email}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg transition-colors hover:scale-105 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              title="Sign out"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

function getPageTitle(pathname: string): string {
  const titles: { [key: string]: string } = {
    '/dashboard': 'Dashboard',
    '/interviews': 'My Interviews',
    '/resumes': 'My Resumes',
    '/students': 'Students',
    '/analytics': 'Progress Analytics',
    '/profile': 'My Profile',
  };

  return titles[pathname] || 'TalentLens';
}

function getPageSubtitle(pathname: string): string {
  const subtitles: { [key: string]: string } = {
    '/dashboard': 'Overview of your learning journey',
    '/interviews': 'Practice and review your interviews',
    '/resumes': 'Manage your professional documents',
    '/analytics': 'Track your progress and performance',
    '/profile': 'Manage your account settings',
  };

  return subtitles[pathname] || 'Welcome to your learning platform';
}

export default Layout;

