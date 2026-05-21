import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../utils/api';
import { formatDate, formatDuration, getScoreColor } from '../utils/helpers';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import { DashboardStats, InterviewSession, Resume } from '../types';
import { useToast } from '../hooks';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentInterviews, setRecentInterviews] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, interviewsResponse] = await Promise.all([
        apiService.getDashboardStats(),
        apiService.getInterviews({ page: 1 }),
      ]);

      // The stats response already includes progress data like technical_average, communication_average, etc.
      setStats(statsResponse.data);
      const interviews = interviewsResponse.data.results.slice(0, 5);
      
      // Debug: check the interview data structure
      if (interviews.length > 0) {
        console.log('Sample interview data:', interviews[0]);
      }
      
      setRecentInterviews(interviews);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      showToast('Failed to load dashboard data. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Loading size="lg" text="Loading dashboard..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        {/* Enhanced Welcome Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl p-8 text-white shadow-2xl">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
          
          <div className="relative flex justify-between items-center">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-2">
                    Welcome back, {user?.first_name}!
                  </h1>
                  <p className="text-emerald-100 text-lg font-medium">
                    {user?.role === 'student' 
                      ? "Ready to continue your interview preparation journey?"
                      : user?.role === 'teacher'
                      ? "Manage your students and create new interviews."
                      : "Oversee the platform and monitor all activities."
                    }
                  </p>
                </div>
              </div>
              
              {/* Quick Stats Row */}
              <div className="flex flex-wrap gap-4 mt-6">
                <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 backdrop-blur-sm">
                  <svg className="w-4 h-4 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-medium">Today: {new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 backdrop-blur-sm">
                  <svg className="w-4 h-4 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">Last login: {formatDate(new Date().toISOString())}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={loadDashboardData}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm transition-all duration-200 hover:scale-105 shadow-lg"
                disabled={loading}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </Button>
              <div className="hidden md:block w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Interviews"
            value={stats?.total_interviews || 0}
            icon={
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            }
            change={`${stats?.improvement_percentage || 0}%`}
            changeType={stats?.score_trend === 'improving' ? 'positive' : 'neutral'}
            onClick={() => router.push('/interviews')}
          />
          
          <StatsCard
            title="Completed Interviews"
            value={stats?.completed_interviews || 0}
            icon={
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            change={`${((stats?.completed_interviews || 0) / (stats?.total_interviews || 1) * 100).toFixed(0)}%`}
            changeType="positive"
            onClick={() => router.push('/interviews')}
          />
          
          <StatsCard
            title="Average Score"
            value={`${(stats?.average_score || 0).toFixed(1)}%`}
            icon={
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
            change={stats?.score_trend || 'stable'}
            changeType={stats?.score_trend === 'improving' ? 'positive' : stats?.score_trend === 'declining' ? 'negative' : 'neutral'}
            onClick={() => router.push('/analytics')}
          />
          
          <StatsCard
            title="Current Streak"
            value={`${stats?.streak_days || 0} days`}
            icon={
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
              </svg>
            }
            change={stats?.streak_days && stats.streak_days > 0 ? 'Active' : 'Start today!'}
            changeType={stats?.streak_days && stats.streak_days > 0 ? 'positive' : 'neutral'}
            onClick={() => router.push('/interviews')}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Interviews */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Interviews</CardTitle>
                <CardDescription>
                  Your latest interview sessions and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentInterviews.length > 0 ? (
                  <div className="space-y-4">
                    {recentInterviews.map((interview) => (
                      <InterviewItem key={interview.id} interview={interview} />
                    ))}
                    {recentInterviews.length === 5 && (
                      <div className="text-center pt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => router.push('/interviews')}
                        >
                          View All Interviews
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="font-medium text-gray-900">No interviews scheduled yet</p>
                    <p className="text-sm mt-1 text-gray-600">
                      Your teacher will schedule interviews for you. Once scheduled, they&apos;ll appear here.
                    </p>
                    <div className="mt-4 space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => router.push('/interviews')}
                      >
                        Check Interview Schedule
                      </Button>
                      <br />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => router.push('/resumes')}
                      >
                        Upload Resume to Get Started
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {user?.role === 'student' && (
                  <>
                    <Button 
                      fullWidth 
                      variant="primary"
                      onClick={() => router.push('/interviews')}
                    >
                      View My Interviews
                    </Button>
                    <Button 
                      fullWidth 
                      variant="outline"
                      onClick={() => router.push('/resumes')}
                    >
                      View My Resume
                    </Button>
                    <Button 
                      fullWidth 
                      variant="outline"
                      onClick={() => router.push('/analytics')}
                    >
                      View Analytics
                    </Button>
                  </>
                )}
                
                {user?.role === 'teacher' && (
                  <>
                    <Button 
                      fullWidth 
                      variant="primary"
                      onClick={() => router.push('/interviews/new')}
                    >
                      Create Interview
                    </Button>
                    <Button 
                      fullWidth 
                      variant="outline"
                      onClick={() => router.push('/students')}
                    >
                      Manage Students
                    </Button>
                    <Button 
                      fullWidth 
                      variant="outline"
                      onClick={() => router.push('/analytics')}
                    >
                      View Analytics
                    </Button>
                  </>
                )}
                
                {user?.role === 'administrator' && (
                  <>
                    <Button 
                      fullWidth 
                      variant="primary"
                      onClick={() => router.push('/admin/dashboard')}
                    >
                      System Overview
                    </Button>
                    <Button 
                      fullWidth 
                      variant="outline"
                      onClick={() => router.push('/admin/users')}
                    >
                      User Management
                    </Button>
                    <Button 
                      fullWidth 
                      variant="outline"
                      onClick={() => router.push('/admin/settings')}
                    >
                      Platform Settings
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* My Progress (for students) */}
            {user?.role === 'student' && (
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/analytics')}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    My Progress
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </CardTitle>
                  <CardDescription>Performance overview by category · Click for details</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Technical</span>
                      <span className="text-sm font-medium">{(stats?.technical_average || 0).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(100, stats?.technical_average || 0)}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Communication</span>
                      <span className="text-sm font-medium">{(stats?.communication_average || 0).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(100, stats?.communication_average || 0)}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Aptitude</span>
                      <span className="text-sm font-medium">{(stats?.aptitude_average || 0).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(100, stats?.aptitude_average || 0)}%` }}
                      ></div>
                    </div>

                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Completion Rate</span>
                        <span className="font-medium text-green-600">
                          {((stats?.completed_interviews || 0) / (stats?.total_interviews || 1) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Achievements</CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.achievements && stats.achievements.length > 0 ? (
                  <div className="space-y-3">
                    {stats.achievements.slice(0, 3).map((achievement, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 font-medium">{achievement.title}</p>
                          <p className="text-xs text-gray-500">{achievement.description}</p>
                          <p className="text-xs text-gray-400">
                            {achievement.earned_at ? formatDate(achievement.earned_at) : 'Recently earned'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No achievements yet - keep practicing!</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  onClick?: () => void;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, change, changeType, onClick }) => {
  const changeColors = {
    positive: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    negative: 'text-red-600 bg-red-50 border-red-200',
    neutral: 'text-gray-600 bg-gray-50 border-gray-200',
  };

  const changeIcons = {
    positive: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
      </svg>
    ),
    negative: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
      </svg>
    ),
    neutral: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    ),
  };

  return (
    <Card className={`group hover:shadow-2xl transition-all duration-300 hover:scale-105 border-0 bg-gradient-to-br from-white to-gray-50/50 ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
              {icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
              <p className="text-3xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
          <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border ${changeColors[changeType]} transition-all duration-200`}>
            {changeIcons[changeType]}
            <span>{change}</span>
          </div>
        </div>
        
        {/* Progress Bar for visual appeal */}
        <div className="mt-4 w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              changeType === 'positive' ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' :
              changeType === 'negative' ? 'bg-gradient-to-r from-red-400 to-red-600' :
              'bg-gradient-to-r from-gray-400 to-gray-600'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, parseFloat(change.toString()) || 0))}%` }}
          ></div>
        </div>
      </CardContent>
    </Card>
  );
};

interface InterviewItemProps {
  interview: InterviewSession;
}

const InterviewItem: React.FC<InterviewItemProps> = ({ interview }) => {
  const router = useRouter();
  
  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 border border-yellow-200',
      in_progress: 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200',
      completed: 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200',
      cancelled: 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border border-red-200',
      scheduled: 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border border-blue-200',
    };

    return (
      <span className={`px-3 py-1.5 text-xs font-semibold rounded-full shadow-sm ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border border-gray-200'}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };  const getInterviewDateInfo = () => {
    // Priority order based on interview status and available dates
    if (interview.status === 'scheduled') {
      if (interview.scheduled_datetime) {
        return formatDate(interview.scheduled_datetime);
      }
      if (interview.scheduled_time) {
        return formatDate(interview.scheduled_time);
      }
    }
    
    if (interview.status === 'completed') {
      if (interview.completed_at) {
        return formatDate(interview.completed_at);
      }
    }
    
    if (interview.status === 'in_progress' && interview.started_at) {
      return formatDate(interview.started_at);
    }
    
    // Fallback to any available date
    if (interview.created_at) {
      return formatDate(interview.created_at);
    }
    
    if (interview.updated_at) {
      return formatDate(interview.updated_at);
    }
    
    // If no dates are available, show current date as fallback
    return formatDate(new Date());
  };

  const handleClick = () => {
    if (interview.status === 'completed') {
      router.push(`/interview/results?id=${interview.id}`);
    } else if (interview.status === 'scheduled' || interview.status === 'pending') {
      router.push(`/interview/${interview.id}`);
    } else {
      // Don't navigate for other statuses
      return;
    }
  };

  const getActionText = () => {
    switch (interview.status) {
      case 'completed':
        return 'View Results';
      case 'scheduled':
      case 'pending':
        return 'Join Interview';
      case 'in_progress':
        return 'Continue';
      default:
        return 'View Details';
    }
  };

  const isClickable = ['completed', 'scheduled', 'pending', 'in_progress'].includes(interview.status);

  return (
    <div 
      className={`group flex items-center justify-between p-6 border border-gray-200 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-lg ${
        isClickable ? 'hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 cursor-pointer hover:border-emerald-200' : 'cursor-default'
      }`}
      onClick={isClickable ? handleClick : undefined}
    >
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-1">
          <h3 className="font-medium text-gray-900">{interview.title}</h3>
          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
            {interview.interview_type ? interview.interview_type.charAt(0).toUpperCase() + interview.interview_type.slice(1) : interview.category || 'General'}
          </span>
        </div>
        <div className="flex items-center space-x-4 mt-2">
          <span className="text-xs text-gray-500 flex items-center">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {getInterviewDateInfo()}
          </span>
          {interview.overall_score && (
            <span className={`text-xs font-medium ${getScoreColor(interview.overall_score)}`}>
              {interview.overall_score.toFixed(1)}%
            </span>
          )}
          {isClickable && (
            <span className="text-xs text-blue-600 font-medium">
              Click to {getActionText()}
            </span>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 ml-4 flex items-center space-x-2">
        {getStatusBadge(interview.status)}
        {isClickable && (
          <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-all duration-200 shadow-md">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;

// Prevent static generation for this page since it requires authentication
export const getServerSideProps = async () => {
  return {
    props: {},
  };
};

