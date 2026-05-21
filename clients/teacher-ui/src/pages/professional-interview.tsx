import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ProfessionalInterviewSession from '../components/ProfessionalInterviewSession';
import Loading from '../components/ui/Loading';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { InterviewSession } from '../types';
import { apiService } from '../utils/api';
import { useToast } from '../hooks';

const ProfessionalInterviewPage: React.FC = () => {
  const router = useRouter();
  const { sessionId } = router.query;
  const { user, isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [canStart, setCanStart] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/signin');
      return;
    }

    if (!sessionId) {
      setError('Invalid session ID');
      setLoading(false);
      return;
    }

    validateAndLoadSession();
  }, [isAuthenticated, sessionId]);

  const validateAndLoadSession = async () => {
    try {
      setLoading(true);
      
      // Get session details
      const sessionResponse = await apiService.getInterview(Number(sessionId));
      const sessionData = sessionResponse.data;
      
      // Validate session permissions
      if (user?.role === 'student' && sessionData.student !== user.id) {
        throw new Error('Access denied: This interview is not assigned to you');
      }
      
      // Check session timing
      const now = new Date();
      const scheduledTime = new Date(sessionData.scheduled_datetime);
      const endTime = new Date(scheduledTime.getTime() + sessionData.duration * 60000);
      
      if (now < scheduledTime) {
        const timeToStart = Math.ceil((scheduledTime.getTime() - now.getTime()) / 1000 / 60);
        throw new Error(`Interview starts in ${timeToStart} minutes. Please wait.`);
      }
      
      if (now > endTime) {
        throw new Error('Interview session has expired');
      }
      
      // Check if already completed
      if (sessionData.status === 'completed') {
        throw new Error('This interview has already been completed');
      }
      
      // Validate session security
      try {
        const validationResponse = await apiService.validateSession(Number(sessionId));
        if (!validationResponse.data.valid) {
          throw new Error(`Session invalid: ${validationResponse.data.reason}`);
        }
      } catch (validationError) {
        console.warn('Session validation failed, proceeding anyway:', validationError);
      }
      
      setSession(sessionData);
      setCanStart(true);
      
    } catch (error: any) {
      console.error('Session validation error:', error);
      setError(error.message || 'Failed to load interview session');
    } finally {
      setLoading(false);
    }
  };

  const handleInterviewComplete = (completedSession: InterviewSession) => {
    showToast('Interview completed successfully!', 'success');
    
    // Redirect based on user role
    if (user?.role === 'student') {
      router.push('/dashboard');
    } else {
      router.push('/interviews');
    }
  };

  const handleInterviewExit = () => {
    showToast('Interview session ended', 'info');
    
    // Redirect based on user role
    if (user?.role === 'student') {
      router.push('/dashboard');
    } else {
      router.push('/interviews');
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <Loading />
          <p className={`mt-4 text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Loading interview session...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <Card className="text-center p-8 max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-red-600 mb-2">
            Unable to Start Interview
          </h3>
          <p className="text-gray-600 mb-6">
            {error}
          </p>
          <div className="flex justify-center space-x-3">
            <Button 
              variant="outline" 
              onClick={() => router.back()}
            >
              Go Back
            </Button>
            <Button 
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!session || !canStart) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <Card className="text-center p-8">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Session Not Ready
          </h3>
          <p className="text-gray-500 mb-4">
            Interview session cannot be started at this time
          </p>
          <Button onClick={() => router.push('/interviews')}>
            Back to Interviews
          </Button>
        </Card>
      </div>
    );
  }

  // Show pre-interview instructions
  if (canStart && !session.status || session.status === 'scheduled') {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} py-8`}>
        <div className="max-w-4xl mx-auto px-4">
          <Card className="p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Ready to Start Interview
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                {session.title || `${session.category} Interview`}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Interview Details
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Type:</span>
                    <span className="font-medium capitalize">
                      {session.category || session.interview_type}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                    <span className="font-medium">{session.duration} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Difficulty:</span>
                    <span className="font-medium capitalize">
                      {session.difficulty_level || 'Standard'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Mode:</span>
                    <span className="font-medium text-red-600">Secure</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  System Requirements
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Camera and microphone access</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Stable internet connection</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Modern web browser</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Quiet, well-lit environment</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={`p-6 rounded-lg mb-8 ${
              isDark ? 'bg-yellow-900/20 border-yellow-500' : 'bg-yellow-50 border-yellow-200'
            } border`}>
              <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Important Security Notice
              </h3>
              <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-2">
                <p>• This interview operates in <strong>secure mode</strong> with monitoring enabled</p>
                <p>• Tab switching is limited to 3 attempts (session will be terminated after)</p>
                <p>• Window focus loss is limited to 5 attempts</p>
                <p>• Copy/paste operations are disabled</p>
                <p>• Right-click and developer tools are blocked</p>
                <p>• The session will enter fullscreen mode for security</p>
                <p>• All activities are logged and monitored</p>
              </div>
            </div>

            {session.instructions && (
              <div className={`p-6 rounded-lg mb-8 ${
                isDark ? 'bg-blue-900/20 border-blue-500' : 'bg-blue-50 border-blue-200'
              } border`}>
                <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-3">
                  Special Instructions
                </h3>
                <p className="text-blue-700 dark:text-blue-300 whitespace-pre-wrap">
                  {session.instructions}
                </p>
              </div>
            )}

            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Once you start, you cannot pause or restart the interview.
                Make sure you're ready before proceeding.
              </p>
              
              <div className="flex justify-center space-x-4">
                <Button 
                  variant="outline" 
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    // Update session status and start interview
                    setSession({ ...session, status: 'in_progress' });
                  }}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 px-8"
                >
                  Start Interview
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Start the professional interview session
  return (
    <ProfessionalInterviewSession
      sessionId={Number(sessionId)}
      onComplete={handleInterviewComplete}
      onExit={handleInterviewExit}
    />
  );
};

export default ProfessionalInterviewPage;
