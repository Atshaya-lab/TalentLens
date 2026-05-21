import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../utils/api';
import { formatDate, formatPercentage } from '../utils/helpers';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../components/ui/Card';
import Loading from '../components/ui/Loading';
import Button from '../components/ui/Button';
import { useToast } from '../hooks';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  AreaChart,
  Area
} from 'recharts';

interface PerformanceMetric {
  id: number;
  category: string;
  average_score: number;
  total_interviews: number;
  improvement_rate: number;
  last_updated: string;
}

interface ProgressData {
  weekly_progress: Array<{
    week: string;
    score: number;
    interviews_completed: number;
    date: string;
  }>;
  monthly_progress: Array<{
    month: string;
    score: number;
    interviews: number;
    improvement: number;
  }>;
  skill_breakdown: Array<{
    skill: string;
    current_level: number;
    target_level: number;
    progress: number;
    color: string;
  }>;
  performance_trends: Array<{
    date: string;
    score: number;
    category: string;
    technical_score?: number;
    communication_score?: number;
    problem_solving_score?: number;
  }>;
  category_performance: Array<{
    category: string;
    score: number;
    count: number;
    color: string;
  }>;
  achievement_data: {
    total_interviews: number;
    completion_rate: number;
    average_score: number;
    best_score: number;
    improvement_trend: number;
    streak: number;
  };
}

// Chart color constants
const CHART_COLORS = {
  primary: '#10B981',
  secondary: '#3B82F6', 
  accent: '#8B5CF6',
  warning: '#F59E0B',
  danger: '#EF4444',
  success: '#059669',
  info: '#0EA5E9'
};

const SKILL_COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

const AnalyticsPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30d');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { showToast } = useToast();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    fetchAnalytics();
  }, [isAuthenticated, router, selectedPeriod, selectedCategory]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [progressResponse, interviewsResponse] = await Promise.all([
        apiService.getProgressTracking(),
        apiService.getInterviews({ page: 1, page_size: 50 })
      ]);

      // Debug: Log the actual API responses
      console.log('=== ANALYTICS DEBUG ===');
      console.log('Progress API Response:', progressResponse.data);
      console.log('Interviews API Response:', interviewsResponse.data);
      console.log('========================');

      // Get real data from API responses
      const studentProgress = progressResponse.data;
      const interviews = interviewsResponse.data.results;
      
      // Transform progress data into performance metrics using real data only
      const performanceMetrics: PerformanceMetric[] = [
        {
          id: 1,
          category: 'Technical',
          average_score: studentProgress.technical_average || 0,
          total_interviews: interviews.filter(i => i.interview_type === 'technical').length,
          improvement_rate: studentProgress.improvement_percentage || 0,
          last_updated: studentProgress.calculated_at || new Date().toISOString()
        },
        {
          id: 2,
          category: 'Communication',
          average_score: studentProgress.communication_average || 0,
          total_interviews: interviews.filter(i => i.interview_type === 'communication').length,
          improvement_rate: studentProgress.improvement_percentage || 0,
          last_updated: studentProgress.calculated_at || new Date().toISOString()
        },
        {
          id: 3,
          category: 'Aptitude',
          average_score: studentProgress.aptitude_average || 0,
          total_interviews: interviews.filter(i => i.interview_type === 'aptitude').length,
          improvement_rate: studentProgress.improvement_percentage || 0,
          last_updated: studentProgress.calculated_at || new Date().toISOString()
        }
      ];

      // Generate weekly progress based on ACTUAL interview history
      const completedInterviews = interviews.filter(i => i.status === 'completed');
      const sortedInterviews = completedInterviews.sort((a, b) => 
        new Date(a.scheduled_datetime).getTime() - new Date(b.scheduled_datetime).getTime()
      );

      // Weekly progress based on real interview dates and scores ONLY - NO MOCK DATA
      const weeklyProgress = [];
      const monthlyProgress = [];
      const now = new Date();
      
      // Only show data if we have actual completed interviews
      if (completedInterviews.length > 0) {
        // Group interviews by week (last 8 weeks) - only show weeks with actual interviews
        for (let weekNum = 8; weekNum >= 1; weekNum--) {
          const weekStart = new Date(now.getTime() - weekNum * 7 * 24 * 60 * 60 * 1000);
          const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
          
          const weekInterviews = sortedInterviews.filter(interview => {
            const interviewDate = new Date(interview.scheduled_datetime);
            return interviewDate >= weekStart && interviewDate < weekEnd;
          });
          
          // Only add weeks that have actual interviews
          if (weekInterviews.length > 0) {
            const weekScore = weekInterviews.reduce((sum, interview) => sum + (interview.overall_score || 0), 0) / weekInterviews.length;
            
            weeklyProgress.push({
              week: `Week ${9 - weekNum}`,
              score: Math.round(weekScore * 10) / 10,
              interviews_completed: weekInterviews.length,
              date: weekStart.toISOString()
            });
          }
        }

        // Monthly progress (last 6 months)
        for (let monthNum = 6; monthNum >= 1; monthNum--) {
          const monthStart = new Date(now.getFullYear(), now.getMonth() - monthNum, 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - monthNum + 1, 0);
          
          const monthInterviews = sortedInterviews.filter(interview => {
            const interviewDate = new Date(interview.scheduled_datetime);
            return interviewDate >= monthStart && interviewDate <= monthEnd;
          });
          
          if (monthInterviews.length > 0) {
            const monthScore = monthInterviews.reduce((sum, interview) => sum + (interview.overall_score || 0), 0) / monthInterviews.length;
            const previousMonthInterviews = sortedInterviews.filter(interview => {
              const interviewDate = new Date(interview.scheduled_datetime);
              const prevMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
              const prevMonthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth(), 0);
              return interviewDate >= prevMonthStart && interviewDate <= prevMonthEnd;
            });
            
            const prevMonthScore = previousMonthInterviews.length > 0 
              ? previousMonthInterviews.reduce((sum, interview) => sum + (interview.overall_score || 0), 0) / previousMonthInterviews.length 
              : 0;
            
            monthlyProgress.push({
              month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
              score: Math.round(monthScore * 10) / 10,
              interviews: monthInterviews.length,
              improvement: Math.round((monthScore - prevMonthScore) * 10) / 10
            });
          }
        }

        // If no weekly groupings found, show individual interviews by date
        if (weeklyProgress.length === 0) {
          completedInterviews.forEach((interview, index) => {
            const interviewDate = new Date(interview.scheduled_datetime);
            weeklyProgress.push({
              week: `${interviewDate.toLocaleDateString()} (Interview ${index + 1})`,
              score: Math.round((interview.overall_score || 0) * 10) / 10,
              interviews_completed: 1,
              date: interview.scheduled_datetime
            });
          });
        }
      }

      // Performance trends based ONLY on actual interview scores - NO MOCK DATA
      const performanceTrends = sortedInterviews.map((interview, index) => ({
        date: interview.scheduled_datetime,
        score: interview.overall_score || 0,
        category: interview.interview_type.charAt(0).toUpperCase() + interview.interview_type.slice(1),
        technical_score: interview.overall_score || 0, // Use overall score as placeholder
        communication_score: interview.overall_score || 0,
        problem_solving_score: interview.overall_score || 0
      }));

      // Category performance breakdown
      const categoryStats = completedInterviews.reduce((acc, interview) => {
        const category = interview.interview_type;
        if (!acc[category]) {
          acc[category] = { total: 0, count: 0 };
        }
        acc[category].total += interview.overall_score || 0;
        acc[category].count += 1;
        return acc;
      }, {} as Record<string, { total: number; count: number }>);

      const categoryPerformance = Object.entries(categoryStats).map(([category, stats], index) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        score: Math.round((stats.total / stats.count) * 10) / 10,
        count: stats.count,
        color: SKILL_COLORS[index % SKILL_COLORS.length]
      }));

      // Achievement data
      const achievementData = {
        total_interviews: completedInterviews.length,
        completion_rate: completedInterviews.length > 0 ? 100 : 0,
        average_score: completedInterviews.length > 0 
          ? Math.round((completedInterviews.reduce((sum, i) => sum + (i.overall_score || 0), 0) / completedInterviews.length) * 10) / 10 
          : 0,
        best_score: completedInterviews.length > 0 
          ? Math.max(...completedInterviews.map(i => i.overall_score || 0)) 
          : 0,
        improvement_trend: studentProgress.improvement_percentage || 0,
        streak: completedInterviews.length // Simple streak calculation
      };

      const progressData: ProgressData = {
        weekly_progress: weeklyProgress,
        monthly_progress: monthlyProgress,
        skill_breakdown: [
          {
            skill: 'Technical Skills',
            current_level: studentProgress.technical_average || 0,
            target_level: 90,
            progress: Math.min(100, ((studentProgress.technical_average || 0) / 90) * 100),
            color: SKILL_COLORS[0]
          },
          {
            skill: 'Communication',
            current_level: studentProgress.communication_average || 0,
            target_level: 85,
            progress: Math.min(100, ((studentProgress.communication_average || 0) / 85) * 100),
            color: SKILL_COLORS[1]
          },
          {
            skill: 'Problem Solving',
            current_level: studentProgress.aptitude_average || 0,
            target_level: 80,
            progress: Math.min(100, ((studentProgress.aptitude_average || 0) / 80) * 100),
            color: SKILL_COLORS[2]
          }
        ].filter(skill => skill.current_level > 0), // Only show skills with actual data
        performance_trends: performanceTrends,
        category_performance: categoryPerformance,
        achievement_data: achievementData
      };

      setPerformanceMetrics(performanceMetrics);
      setProgressData(progressData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
        </svg>
      );
    } else if (improvement < 0) {
      return (
        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
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
        {/* Enhanced Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl p-8 text-white shadow-2xl">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
          
          <div className="relative flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {user?.role === 'student' ? 'My Analytics' : 'Analytics & Reports'}
                </h1>
                <p className="text-emerald-100 text-lg">
                  Track your interview performance and progress over time
                </p>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 3 months</option>
                <option value="1y">Last year</option>
              </select>
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20"
              >
                <option value="all">All Categories</option>
                <option value="technical">Technical</option>
                <option value="behavioral">Behavioral</option>
                <option value="communication">Communication</option>
                <option value="problem_solving">Problem Solving</option>
              </select>
            </div>
          </div>
        </div>

        {/* Enhanced Analytics with Charts */}
        {progressData && progressData.achievement_data && progressData.achievement_data.total_interviews > 0 ? (
          <>
            {/* Enhanced Performance Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 group hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 mb-1">Total Interviews</p>
                      <p className="text-3xl font-bold text-gray-900">{progressData.achievement_data.total_interviews}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 group hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 mb-1">Average Score</p>
                      <p className="text-3xl font-bold text-gray-900">{progressData.achievement_data.average_score}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 group hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 mb-1">Best Score</p>
                      <p className="text-3xl font-bold text-gray-900">{progressData.achievement_data.best_score}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 group hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 mb-1">Interview Streak</p>
                      <p className="text-3xl font-bold text-gray-900">{progressData.achievement_data.streak}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Trends Chart */}
            {progressData.weekly_progress && progressData.weekly_progress.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Performance Trends</h3>
                      <p className="text-sm text-gray-500 mt-1">Your interview scores over time</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedPeriod('weekly')}
                        className={`px-3 py-1 text-xs rounded-md ${
                          selectedPeriod === 'weekly' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Weekly
                      </button>
                      <button
                        onClick={() => setSelectedPeriod('monthly')}
                        className={`px-3 py-1 text-xs rounded-md ${
                          selectedPeriod === 'monthly' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Monthly
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={selectedPeriod === 'monthly' && progressData.monthly_progress.length > 0 
                          ? progressData.monthly_progress 
                          : progressData.weekly_progress}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.8}/>
                            <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey={selectedPeriod === 'monthly' ? 'month' : 'week'} 
                          tick={{ fontSize: 12 }}
                          stroke="#6b7280"
                        />
                        <YAxis 
                          domain={[0, 100]}
                          tick={{ fontSize: 12 }}
                          stroke="#6b7280"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                          formatter={(value: any, name: string) => [
                            `${value}${name === 'score' ? '%' : ''}`,
                            name === 'score' ? 'Score' : name === 'interviews_completed' ? 'Interviews' : name
                          ]}
                        />
                        <Area
                          type="monotone"
                          dataKey="score"
                          stroke={CHART_COLORS.primary}
                          fillOpacity={1}
                          fill="url(#scoreGradient)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Skills and Category Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Skill Progress Chart */}
              {progressData.skill_breakdown && progressData.skill_breakdown.length > 0 && (
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold text-gray-900">Skill Development</h3>
                    <p className="text-sm text-gray-500">Progress towards your target levels</p>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={progressData.skill_breakdown} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="skill" tick={{ fontSize: 12 }} />
                          <YAxis domain={[0, 100]} />
                          <Tooltip formatter={(value: any) => [`${value.toFixed(1)}%`, 'Progress']} />
                          <Bar dataKey="progress" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Category Performance */}
              {progressData.category_performance && progressData.category_performance.length > 0 && (
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold text-gray-900">Performance by Category</h3>
                    <p className="text-sm text-gray-500">Average scores across interview types</p>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={progressData.category_performance}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="score"
                            label={({ category, score }) => `${category}: ${score}%`}
                          >
                            {progressData.category_performance.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => [`${value}%`, 'Average Score']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Recent Performance Table */}
            {progressData.performance_trends && progressData.performance_trends.length > 0 && (
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold text-gray-900">Recent Interview Results</h3>
                  <p className="text-sm text-gray-500">Your most recent interview performances</p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Category
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Score
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Performance
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {progressData.performance_trends.slice(0, 10).map((trend, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(trend.date)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {trend.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                              <span className={getScoreColor(trend.score)}>
                                {trend.score.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center">
                                <div className={`w-3 h-3 rounded-full mr-2 ${getScoreBackground(trend.score)}`}>
                                  <div className={`w-full h-full rounded-full ${
                                    trend.score >= 80 ? 'bg-green-500' :
                                    trend.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`} />
                                </div>
                                {trend.score >= 80 ? 'Excellent' :
                                 trend.score >= 60 ? 'Good' : 'Needs Improvement'}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          /* No data state with actionable content */
          <div className="text-center py-12">
            <svg className="w-24 h-24 mx-auto mb-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data Yet</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Complete your first interview to start tracking your performance and see detailed analytics with charts and insights.
            </p>
            <div className="flex justify-center space-x-4">
              <Button onClick={() => router.push('/interviews')} className="bg-emerald-600 hover:bg-emerald-700">
                Take Your First Interview
              </Button>
              <Button variant="outline" onClick={() => router.push('/resumes')}>
                Upload Resume
              </Button>
            </div>
          </div>
        )}

        {/* Original Performance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {performanceMetrics.length > 0 ? (
            performanceMetrics.map((metric) => (
              <Card key={metric.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 capitalize">
                        {metric.category.replace('_', ' ')}
                      </p>
                      <p className={`text-2xl font-bold ${getScoreColor(metric.average_score)}`}>
                        {metric.average_score.toFixed(1)}%
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${getScoreBackground(metric.average_score)}`}>
                      <svg className={`w-6 h-6 ${getScoreColor(metric.average_score)}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      {metric.total_interviews} interviews
                    </span>
                    <div className="flex items-center space-x-1">
                      {getTrendIcon(metric.improvement_rate)}
                      <span className={`font-medium ${
                        metric.improvement_rate > 0 ? 'text-green-600' : 
                        metric.improvement_rate < 0 ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {Math.abs(metric.improvement_rate).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="col-span-full">
              <CardContent className="text-center py-8">
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
                <p className="text-gray-500">
                  Complete some interviews to see your performance analytics
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Progress Tracking */}
        {progressData && (
          <>
            {/* Weekly Progress */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">Weekly Progress</h3>
              </CardHeader>
              <CardContent>
                {progressData?.weekly_progress && progressData.weekly_progress.length > 0 ? (
                  <div className="space-y-4">
                    {progressData.weekly_progress?.map((week, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{week.week}</p>
                          <p className="text-sm text-gray-500">
                            {week.interviews_completed} interview{week.interviews_completed !== 1 ? 's' : ''} completed
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${getScoreColor(week.score)}`}>
                            {week.score > 0 ? week.score.toFixed(1) : '0.0'}
                          </p>
                          <p className="text-sm text-gray-500">Score</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p className="text-gray-500 mb-2">No weekly progress data yet</p>
                    <p className="text-sm text-gray-400">Complete more interviews to see your progress over time</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Skill Breakdown */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">Skill Development</h3>
              </CardHeader>
              <CardContent>
                {progressData?.skill_breakdown && progressData.skill_breakdown.length > 0 ? (
                  <div className="space-y-6">
                    {progressData.skill_breakdown?.map((skill, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900 capitalize">
                            {skill.skill.replace('_', ' ')}
                          </span>
                          <span className="text-sm text-gray-500">
                            {skill.current_level.toFixed(1)}/{skill.target_level}
                          </span>
                        </div>
                        
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${skill.progress}%` }}
                          />
                        </div>
                        
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Current: {skill.current_level.toFixed(1)}</span>
                          <span>{skill.progress.toFixed(1)}% Complete</span>
                          <span>Target: {skill.target_level}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No skill development data available</p>
                )}
              </CardContent>
            </Card>

            {/* Performance Trends */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">Recent Performance Trends</h3>
              </CardHeader>
              <CardContent>
                {progressData?.performance_trends && progressData.performance_trends.length > 0 ? (
                  <div className="space-y-3">
                    {progressData.performance_trends?.slice(0, 10).map((trend, index) => (
                      <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${getScoreBackground(trend.score)}`}>
                            <div className={`w-full h-full rounded-full ${
                              trend.score >= 80 ? 'bg-green-500' :
                              trend.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 capitalize">
                              {trend.category.replace('_', ' ')}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatDate(trend.date)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${getScoreColor(trend.score)}`}>
                            {trend.score.toFixed(1)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No performance trends available</p>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push('/interviews')}
          >
            Start New Interview
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/resumes')}
          >
            Upload Resume
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default AnalyticsPage;

// Prevent static generation for this page since it requires authentication
export const getServerSideProps = async () => {
  return {
    props: {},
  };
};
