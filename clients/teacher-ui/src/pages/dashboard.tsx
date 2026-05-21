import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../utils/api';
import { formatDate, formatDuration, getScoreColor } from '../utils/helpers';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import { InterviewSession } from '../types';
import { useToast } from '../hooks';

interface TeacherDashboardData {
  total_students: number;
  active_students: number;
  interviews_conducted: number;
  interviews_this_month: number;
  average_student_score: number;
  recent_interviews: Array<{
    id: number;
    student_name: string;
    interview_type: string;
    status: string;
    scheduled_datetime: string;
    score: number;
  }>;
  student_progress: Array<{
    student_id: number;
    student_name: string;
    average_score: number;
    score_trend: string;
    total_interviews: number;
    last_interview_date: string | null;
  }>;
  pending_reviews: Array<{
    id: number;
    student_name: string;
    interview_type: string;
    completed_at: string;
    score: number;
  }>;
}

interface StudentLimitInfo {
  current_student_count: number;
  student_limit: number | null;
  has_premium: boolean;
  can_add_student: boolean;
  message: string;
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [dashboardData, setDashboardData] = useState<TeacherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentLimitInfo, setStudentLimitInfo] = useState<StudentLimitInfo | null>(null);

  useEffect(() => {
    loadDashboardData();
    loadStudentLimitInfo();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await apiService.getDashboardStats();
      console.log('Dashboard data received:', response.data);
      setDashboardData(response.data as TeacherDashboardData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      showToast('Failed to load dashboard data. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStudentLimitInfo = async () => {
    try {
      const response = await apiService.getStudentLimitInfo();
      setStudentLimitInfo(response.data);
    } catch (error) {
      console.error('Failed to load student limit info:', error);
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
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="relative bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-8 text-white overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/90 to-teal-600/90 backdrop-blur-sm"></div>
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 flex justify-between items-center">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-1">
                    Welcome back, {user?.first_name}! 👋
                  </h1>
                  <p className="text-emerald-100 text-lg">
                    Ready to guide your students to interview success? Let's check your progress.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  loadDashboardData();
                  loadStudentLimitInfo();
                }}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm transition-all duration-200 hover:scale-105"
                disabled={loading}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </Button>
              
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push('/interviews/new')}
                className="bg-white text-emerald-600 hover:bg-white/90 font-semibold shadow-lg transition-all duration-200 hover:scale-105"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Interview
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Interviews"
            value={dashboardData?.interviews_conducted || 0}
            icon={
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            }
            change={`+${dashboardData?.interviews_this_month || 0} this month`}
            changeType="positive"
            gradient="from-emerald-500 to-teal-500"
          />
          
          <StatsCard
            title="Total Students"
            value={dashboardData?.total_students || 0}
            icon={
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            }
            change={
              studentLimitInfo?.has_premium 
                ? `${dashboardData?.active_students || 0} active • Premium` 
                : studentLimitInfo?.student_limit 
                  ? `${dashboardData?.active_students || 0} active • ${studentLimitInfo.current_student_count}/${studentLimitInfo.student_limit} limit`
                  : `${dashboardData?.active_students || 0} active`
            }
            changeType={
              studentLimitInfo?.has_premium 
                ? "positive"
                : studentLimitInfo && studentLimitInfo.current_student_count >= (studentLimitInfo.student_limit || 3)
                  ? "negative"
                  : "positive"
            }
            gradient="from-blue-500 to-indigo-500"
          />
          
          <StatsCard
            title="Average Score"
            value={`${dashboardData?.average_student_score?.toFixed(1) || '0.0'}%`}
            icon={
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
            change="Student average"
            changeType="neutral"
            gradient="from-amber-500 to-orange-500"
          />
          
          <StatsCard
            title="Pending Reviews"
            value={dashboardData?.pending_reviews?.length || 0}
            icon={
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            }
            change="Need attention"
            changeType={dashboardData?.pending_reviews?.length > 0 ? "negative" : "neutral"}
            gradient="from-purple-500 to-pink-500"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Interviews */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-md">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">Recent Interviews</CardTitle>
                    <CardDescription className="text-gray-600">
                      Your latest interview sessions and their status
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/interviews')}
                      className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 transition-all duration-200 hover:scale-105"
                    >
                      View All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {dashboardData?.recent_interviews && dashboardData.recent_interviews.length > 0 ? (
                  <div className="space-y-4">
                    {dashboardData.recent_interviews.map((interview) => (
                      <div 
                        key={interview.id} 
                        className="group flex items-center justify-between p-4 bg-white/80 border border-gray-100 rounded-xl hover:bg-white hover:shadow-md cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                        onClick={() => router.push(`/interview/${interview.id}`)}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`w-4 h-4 rounded-full shadow-sm ${
                            interview.status === 'completed' ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                            interview.status === 'in_progress' ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                            interview.status === 'scheduled' ? 'bg-gradient-to-r from-blue-400 to-indigo-500' : 
                            'bg-gradient-to-r from-gray-400 to-gray-500'
                          }`} />
                          <div>
                            <p className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                              {interview.student_name || 'Unknown Student'}
                            </p>
                            <p className="text-sm text-gray-500 capitalize">
                              {interview.interview_type.replace('_', ' ')} • {formatDate(interview.scheduled_datetime)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {interview.status === 'completed' && interview.score !== undefined && (
                            <div className="text-right">
                              <div className={`text-sm font-bold ${getScoreColor(interview.score)}`}>
                                {interview.score}%
                              </div>
                            </div>
                          )}
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            interview.status === 'completed' ? 'bg-green-100 text-green-800' :
                            interview.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                            interview.status === 'scheduled' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {interview.status.replace('_', ' ')}
                          </span>
                          <svg className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 font-medium">No recent interviews</p>
                    <p className="text-sm text-gray-400 mt-1">Start creating interviews to see them here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-gray-900">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  fullWidth 
                  variant="primary"
                  onClick={() => router.push('/interviews/new')}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg transition-all duration-200 hover:scale-105"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Professional Interview
                </Button>
                <Button 
                  fullWidth 
                  variant="outline"
                  onClick={() => router.push('/students')}
                  className="border-gray-200 text-gray-700 hover:bg-gray-50 transition-all duration-200 hover:scale-105"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  Manage Students
                </Button>
                <Button 
                  fullWidth 
                  variant="outline"
                  onClick={() => router.push('/analytics')}
                  className="border-gray-200 text-gray-700 hover:bg-gray-50 transition-all duration-200 hover:scale-105"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  View Analytics
                </Button>
              </CardContent>
            </Card>



            {/* Student Progress Overview */}
            <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-gray-900">Student Progress</CardTitle>
                <CardDescription>Recent performance highlights</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData?.student_progress && dashboardData.student_progress.length > 0 ? (
                  <div className="space-y-4">
                    {dashboardData.student_progress.slice(0, 3).map((student) => (
                      <div key={student.student_id} className="flex items-center justify-between p-3 bg-white/80 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {student.student_name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{student.student_name}</p>
                            <p className="text-xs text-gray-500">{student.total_interviews} interviews</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${getScoreColor(student.average_score)}`}>
                            {student.average_score.toFixed(1)}%
                          </p>
                          <p className="text-xs text-gray-500">avg score</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 text-sm">No student progress yet</p>
                  </div>
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
  gradient: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, change, changeType, gradient }) => {
  const changeColor = changeType === 'positive' ? 'text-green-600' : 
                     changeType === 'negative' ? 'text-red-600' : 'text-gray-600';

  return (
    <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-md hover:shadow-xl transition-all duration-300 hover:scale-105 group">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
            <p className={`text-sm font-medium ${changeColor} flex items-center`}>
              {changeType === 'positive' && (
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              )}
              {changeType === 'negative' && (
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              )}
              {change}
            </p>
          </div>
          <div className={`p-4 rounded-full bg-gradient-to-r ${gradient} bg-opacity-10 group-hover:bg-opacity-20 transition-all duration-300`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardPage;

// Prevent static generation for this page since it requires authentication
export const getServerSideProps = async () => {
  return {
    props: {},
  };
};
