import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../utils/api';
import { formatDate, formatPercentage } from '../utils/helpers';
import Card from '../components/ui/Card';
import Loading from '../components/ui/Loading';
import Button from '../components/ui/Button';
import { useToast } from '../hooks';
import {
  PerformanceLineChart,
  SkillsBarChart,
  SkillDistributionPieChart,
  ProgressAreaChart,
  MultiLineChart,
} from '../components/ui/Charts';

interface StudentAnalytics {
  id: number;
  name: string;
  total_interviews: number;
  completed_interviews: number;
  average_score: number;
  improvement_rate: number;
  last_interview_date: string;
  performance_trend: Array<{
    date: string;
    score: number;
    interview_type: string;
  }>;
}

interface TeacherStats {
  total_students: number;
  total_interviews_conducted: number;
  average_student_score: number;
  improvement_rate: number;
  interview_distribution: Array<{
    type: string;
    count: number;
    average_score: number;
  }>;
  monthly_activity: Array<{
    month: string;
    interviews: number;
    students: number;
    average_score: number;
  }>;
  skill_performance: Array<{
    skill: string;
    average_score: number;
    student_count: number;
    improvement: number;
  }>;
}

const AnalyticsDashboard: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [teacherStats, setTeacherStats] = useState<TeacherStats | null>(null);
  const [studentsAnalytics, setStudentsAnalytics] = useState<StudentAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30d');
  const [selectedView, setSelectedView] = useState<string>('overview');
  const { showToast } = useToast();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (user?.role !== 'teacher') {
      router.push('/dashboard');
      return;
    }
    
    fetchAnalytics();
  }, [isAuthenticated, user, router, selectedPeriod]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch teacher analytics data
      const [statsResponse, studentsResponse] = await Promise.all([
        apiService.get(`/api/dashboard/teacher-analytics/?period=${selectedPeriod}`),
        apiService.get(`/api/dashboard/students-analytics/?period=${selectedPeriod}`)
      ]);

      setTeacherStats(statsResponse.data);
      setStudentsAnalytics(studentsResponse.data || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      
      // Set fallback data with real structure but empty values
      setTeacherStats({
        total_students: 0,
        total_interviews_conducted: 0,
        average_student_score: 0,
        improvement_rate: 0,
        interview_distribution: [],
        monthly_activity: [],
        skill_performance: []
      });
      setStudentsAnalytics([]);
      
      showToast('Failed to load analytics data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getTrendIcon = (improvement: number) => {
    if (improvement > 0) {
      return (
        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      );
    } else if (improvement < 0) {
      return (
        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      );
    }
  };

  if (loading) {
    return (
      <Layout>
        <Loading />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Teaching Analytics</h1>
            <p className="mt-2 text-gray-600">
              Comprehensive insights into your students' performance and progress
            </p>
          </div>
          
          <div className="flex space-x-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 3 months</option>
              <option value="1y">Last year</option>
            </select>
            
            <select
              value={selectedView}
              onChange={(e) => setSelectedView(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="overview">Overview</option>
              <option value="students">Student Details</option>
              <option value="performance">Performance Analysis</option>
              <option value="trends">Trends & Insights</option>
            </select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <Card.Content className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {teacherStats?.total_students || 0}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-blue-100">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
              </div>
            </Card.Content>
          </Card>

          <Card>
            <Card.Content className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Interviews Conducted</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {teacherStats?.total_interviews_conducted || 0}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-green-100">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
            </Card.Content>
          </Card>

          <Card>
            <Card.Content className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Score</p>
                  <p className={`text-2xl font-bold ${getScoreColor(teacherStats?.average_student_score || 0)}`}>
                    {(teacherStats?.average_student_score || 0).toFixed(1)}%
                  </p>
                </div>
                <div className={`p-3 rounded-full ${getScoreBackground(teacherStats?.average_student_score || 0)}`}>
                  <svg className={`w-6 h-6 ${getScoreColor(teacherStats?.average_student_score || 0)}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </Card.Content>
          </Card>

          <Card>
            <Card.Content className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Improvement Rate</p>
                  <p className={`text-2xl font-bold ${
                    (teacherStats?.improvement_rate || 0) > 0 ? 'text-green-600' : 
                    (teacherStats?.improvement_rate || 0) < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {(teacherStats?.improvement_rate || 0) > 0 ? '+' : ''}{(teacherStats?.improvement_rate || 0).toFixed(1)}%
                  </p>
                </div>
                <div className="flex items-center space-x-1">
                  {getTrendIcon(teacherStats?.improvement_rate || 0)}
                </div>
              </div>
            </Card.Content>
          </Card>
        </div>

        {/* Charts Section */}
        {selectedView === 'overview' && (
          <>
            {/* Monthly Activity Chart */}
            {teacherStats?.monthly_activity && teacherStats.monthly_activity.length > 0 ? (
              <Card>
                <Card.Header>
                  <h3 className="text-lg font-semibold text-gray-900">Monthly Activity</h3>
                </Card.Header>
                <Card.Content>
                  <MultiLineChart
                    data={teacherStats.monthly_activity}
                    lines={[
                      { key: 'interviews', color: '#3B82F6', name: 'Interviews' },
                      { key: 'average_score', color: '#10B981', name: 'Avg Score' }
                    ]}
                    xKey="month"
                    className="h-80"
                  />
                </Card.Content>
              </Card>
            ) : (
              <Card>
                <Card.Header>
                  <h3 className="text-lg font-semibold text-gray-900">Monthly Activity</h3>
                </Card.Header>
                <Card.Content className="text-center py-8">
                  <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Data</h3>
                  <p className="text-gray-500">
                    Conduct interviews to see monthly activity trends
                  </p>
                </Card.Content>
              </Card>
            )}

            {/* Interview Distribution and Skill Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Interview Distribution */}
              <Card>
                <Card.Header>
                  <h3 className="text-lg font-semibold text-gray-900">Interview Distribution</h3>
                </Card.Header>
                <Card.Content>
                  {teacherStats?.interview_distribution && teacherStats.interview_distribution.length > 0 ? (
                    <SkillDistributionPieChart
                      data={teacherStats.interview_distribution.map(item => ({
                        name: item.type.charAt(0).toUpperCase() + item.type.slice(1),
                        value: item.count,
                        level: `Avg: ${item.average_score.toFixed(1)}%`
                      }))}
                      dataKey="value"
                      nameKey="name"
                      className="h-64"
                    />
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No interview data available</p>
                    </div>
                  )}
                </Card.Content>
              </Card>

              {/* Skill Performance */}
              <Card>
                <Card.Header>
                  <h3 className="text-lg font-semibold text-gray-900">Skill Performance</h3>
                </Card.Header>
                <Card.Content>
                  {teacherStats?.skill_performance && teacherStats.skill_performance.length > 0 ? (
                    <SkillsBarChart
                      data={teacherStats.skill_performance.map(skill => ({
                        skill: skill.skill.charAt(0).toUpperCase() + skill.skill.slice(1),
                        score: skill.average_score
                      }))}
                      xKey="skill"
                      yKey="score"
                      className="h-64"
                    />
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No skill performance data available</p>
                    </div>
                  )}
                </Card.Content>
              </Card>
            </div>
          </>
        )}

        {/* Student Details View */}
        {selectedView === 'students' && (
          <Card>
            <Card.Header>
              <h3 className="text-lg font-semibold text-gray-900">Student Performance Details</h3>
            </Card.Header>
            <Card.Content>
              {studentsAnalytics.length > 0 ? (
                <div className="space-y-4">
                  {studentsAnalytics.map((student) => (
                    <div key={student.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">{student.name}</h4>
                          <p className="text-sm text-gray-500">
                            {student.completed_interviews} interviews completed
                          </p>
                          <p className="text-sm text-gray-500">
                            Last interview: {student.last_interview_date ? formatDate(student.last_interview_date) : 'Never'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${getScoreColor(student.average_score)}`}>
                            {student.average_score.toFixed(1)}%
                          </p>
                          <div className="flex items-center space-x-1 justify-end">
                            {getTrendIcon(student.improvement_rate)}
                            <span className={`text-sm font-medium ${
                              student.improvement_rate > 0 ? 'text-green-600' : 
                              student.improvement_rate < 0 ? 'text-red-600' : 'text-gray-500'
                            }`}>
                              {Math.abs(student.improvement_rate).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Found</h3>
                  <p className="text-gray-500">
                    No students assigned to you yet
                  </p>
                </div>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push('/students')}
          >
            Manage Students
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/interviews')}
          >
            Schedule Interview
          </Button>
          <Button
            variant="primary"
            onClick={() => window.print()}
          >
            Export Report
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default AnalyticsDashboard;

// Prevent static generation for this page since it requires authentication
export const getServerSideProps = async () => {
  return {
    props: {},
  };
};
