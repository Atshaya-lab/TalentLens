import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../../shared/api';
import { formatDate, formatDuration, getScoreColor } from '../utils/helpers';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import { DashboardStats, InterviewSession, Resume } from '../../shared/types';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
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

      setStats(statsResponse.data);
      setRecentInterviews(interviewsResponse.data.results.slice(0, 5));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
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
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">
            Welcome back, {user?.first_name}!
          </h1>
          <p className="text-blue-100">
            Oversee the entire platform and monitor all activities. Manage users, analyze system performance, and ensure quality.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Interviews"
            value={stats?.totalInterviews || 0}
            icon={
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            }
            change="+12%"
            changeType="positive"
          />
          
          {user?.role === 'administrator' && (
            <StatsCard
              title="Total Students"
              value={stats?.totalStudents || 0}
              icon={
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              }
              change="+8%"
              changeType="positive"
            />
          )}
          
          <StatsCard
            title="Average Score"
            value={`${stats?.averageScore || 0}%`}
            icon={
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
            change="+5%"
            changeType="positive"
          />
          
          <StatsCard
            title="Completion Rate"
            value={`${stats?.completionRate || 0}%`}
            icon={
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            change="+3%"
            changeType="positive"
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
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p>No interviews yet</p>
                    <p className="text-sm mt-1">Create your first interview to get started!</p>
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
                    <Button fullWidth variant="primary">
                      Start New Interview
                    </Button>
                    <Button fullWidth variant="outline">
                      Upload Resume
                    </Button>
                    <Button fullWidth variant="outline">
                      View Progress
                    </Button>
                  </>
                )}
                
                {user?.role === 'teacher' && (
                  <>
                    <Button fullWidth variant="primary">
                      Create Interview
                    </Button>
                    <Button fullWidth variant="outline">
                      Manage Students
                    </Button>
                    <Button fullWidth variant="outline">
                      View Analytics
                    </Button>
                  </>
                )}
                
                {user?.role === 'administrator' && (
                  <>
                    <Button fullWidth variant="primary">
                      System Overview
                    </Button>
                    <Button fullWidth variant="outline">
                      User Management
                    </Button>
                    <Button fullWidth variant="outline">
                      Platform Settings
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Activity Feed */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {stats.recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">{activity.description}</p>
                          <p className="text-xs text-gray-500">{formatDate(activity.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No recent activity</p>
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
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, change, changeType }) => {
  const changeColors = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-600',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className={`text-sm ${changeColors[changeType]}`}>
              {change} from last month
            </p>
          </div>
          <div className="flex-shrink-0">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface InterviewItemProps {
  interview: InterviewSession;
}

const InterviewItem: React.FC<InterviewItemProps> = ({ interview }) => {
  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex-1">
        <h3 className="font-medium text-gray-900">{interview.title}</h3>
        <p className="text-sm text-gray-500 mt-1">{interview.category}</p>
        <div className="flex items-center space-x-4 mt-2">
          <span className="text-xs text-gray-500">
            {formatDate(interview.created_at)}
          </span>
          {interview.overall_score && (
            <span className={`text-xs font-medium ${getScoreColor(interview.overall_score)}`}>
              {interview.overall_score.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 ml-4">
        {getStatusBadge(interview.status)}
      </div>
    </div>
  );
};

export default DashboardPage;
