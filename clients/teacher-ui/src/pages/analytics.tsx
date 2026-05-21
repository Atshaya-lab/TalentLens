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
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar
} from 'recharts';

interface PerformanceMetric {
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
  }>;
  skill_breakdown: Array<{
    skill: string;
    progress: number;
    students_count: number;
  }>;
  performance_trends: Array<{
    date: string;
    score: number;
    category: string;
    change: string;
    count: number;
  }>;
}

interface AnalyticsData {
  total_interviews: number;
  average_score: number;
  daily_trends: Array<{
    date: string;
    count: number;
    avg_score: number;
  }>;
  period: string;
  category: string;
}

interface TeacherStats {
  active_students: number;
  total_interviews_conducted: number;
  average_student_score: number;
  completion_rate: number;
  improvement_rate: number;
  top_performing_students: Array<{
    name: string;
    score: number;
    interviews: number;
  }>;
  category_breakdown: Array<{
    category: string;
    count: number;
    avg_score: number;
  }>;
}

const AnalyticsPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [teacherStats, setTeacherStats] = useState<TeacherStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30d');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { showToast } = useToast();

  // Chart colors
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
  const SKILL_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    fetchAnalyticsData();
  }, [isAuthenticated, router, selectedPeriod, selectedCategory]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const promises = [
        apiService.getProgressTracking(),
        apiService.getPerformanceMetrics({
          period: selectedPeriod,
          category: selectedCategory === 'all' ? undefined : selectedCategory
        })
      ];

      // Add teacher stats if user is teacher
      if (user?.role === 'teacher') {
        promises.push(apiService.getTeacherStats());
      }

      const responses = await Promise.all(promises);
      
      setProgressData(responses[0].data);
      
      // Transform performance data
      const perfData = responses[1].data;
      const transformedMetrics: PerformanceMetric[] = [];
      
      if (perfData.daily_trends && perfData.daily_trends.length > 0) {
        // Group by category and calculate metrics
        const categories = ['technical', 'communication', 'aptitude', 'overall'];
        
        categories.forEach(category => {
          const categoryData = perfData.daily_trends.filter((d: any) => 
            category === 'overall' || d.category === category
          );
          
          if (categoryData.length > 0) {
            const avgScore = categoryData.reduce((sum: number, d: any) => sum + (d.avg_score || 0), 0) / categoryData.length;
            const totalInterviews = categoryData.reduce((sum: number, d: any) => sum + (d.count || 0), 0);
            
            transformedMetrics.push({
              category,
              average_score: avgScore,
              total_interviews: totalInterviews,
              improvement_rate: Math.random() * 10 - 5, // Mock improvement rate
              last_updated: new Date().toISOString()
            });
          }
        });
      }
      
      setPerformanceMetrics(transformedMetrics);
      setAnalyticsData(perfData);
      
      if (responses[2]) {
        setTeacherStats(responses[2].data);
      }
      
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

  // Prepare chart data
  const prepareChartData = () => {
    if (!progressData) return { weeklyData: [], skillData: [], trendsData: [] };

    const weeklyData = progressData.weekly_progress.map(week => ({
      name: week.week,
      score: week.score,
      interviews: week.interviews_completed
    }));

    const skillData = progressData.skill_breakdown.map((skill, index) => ({
      name: skill.skill,
      value: skill.progress,
      students: skill.students_count,
      fill: SKILL_COLORS[index % SKILL_COLORS.length]
    }));

    const trendsData = progressData.performance_trends.map(trend => ({
      name: trend.category,
      score: trend.score,
      count: trend.count,
      fill: COLORS[Math.floor(Math.random() * COLORS.length)]
    }));

    return { weeklyData, skillData, trendsData };
  };

  const { weeklyData, skillData, trendsData } = prepareChartData();

  if (loading) {
    return (
      <Layout>
        <Loading />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Enhanced Header */}
        <div className="relative bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-8 text-white overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/90 to-teal-600/90 backdrop-blur-sm"></div>
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 flex justify-between items-center">
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-4xl font-bold mb-2">
                    Analytics Dashboard
                  </h1>
                  <p className="text-emerald-100 text-lg">
                    Comprehensive insights into student performance and progress tracking
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 3 months</option>
                </select>
                
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20"
                >
                  <option value="all">All Categories</option>
                                      <option value="technical">Technical</option>
                    <option value="communication">Communication</option>
                    <option value="aptitude">Aptitude</option>
                </select>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchAnalyticsData()}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm transition-all duration-200 hover:scale-105"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Modernized Filter/Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Comprehensive insights into student performance and progress tracking</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1 shadow-sm">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <span className="text-sm font-medium text-gray-700">Last 30 days</span>
            </div>
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1 shadow-sm">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" /></svg>
              <span className="text-sm font-medium text-gray-700">All Categories</span>
            </div>
            <button onClick={() => fetchAnalyticsData()} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg shadow transition-all duration-150">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582M20 20v-5h-.581M5.21 17.293A9 9 0 0021 12.082M18.79 6.707A9 9 0 003 11.918" /></svg>
              <span className="hidden md:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Enhanced Key Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {performanceMetrics.length > 0 ? (
            performanceMetrics.map((metric, index) => (
              <Card 
                key={`${metric.category}-${index}`}
                variant="elevated"
                className="group hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden"
              >
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-full -mr-10 -mt-10 opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
                
                <Card.Content className="p-6 relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className={`w-3 h-3 rounded-full ${
                          metric.category === 'technical' ? 'bg-blue-500' :
                          metric.category === 'communication' ? 'bg-green-500' :
                          metric.category === 'aptitude' ? 'bg-purple-500' : 'bg-emerald-500'
                        }`}></div>
                        <p className="text-sm font-semibold text-gray-600 capitalize">
                          {metric.category.replace('_', ' ')}
                        </p>
                      </div>
                      <p className={`text-3xl font-bold ${getScoreColor(metric.average_score)}`}>
                        {metric.average_score.toFixed(1)}%
                      </p>
                    </div>
                    <div className={`p-4 rounded-xl ${getScoreBackground(metric.average_score)} group-hover:scale-110 transition-transform duration-300`}>
                      <svg className={`w-8 h-8 ${getScoreColor(metric.average_score)}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="text-gray-500 font-medium">
                        {metric.total_interviews} interviews
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getTrendIcon(metric.improvement_rate)}
                      <span className={`font-bold text-sm ${
                        metric.improvement_rate > 0 ? 'text-green-600' : 
                        metric.improvement_rate < 0 ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {metric.improvement_rate > 0 ? '+' : ''}{metric.improvement_rate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          metric.average_score >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                          metric.average_score >= 60 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 
                          'bg-gradient-to-r from-red-500 to-pink-500'
                        }`}
                        style={{ width: `${metric.average_score}%` }}
                      ></div>
                    </div>
                  </div>
                </Card.Content>
              </Card>
            ))
          ) : (
            <Card variant="elevated" className="col-span-full">
              <Card.Content className="text-center py-16">
                <div className="mx-auto w-20 h-20 bg-gradient-to-r from-gray-100 to-slate-100 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">No Data Available</h3>
                <p className="text-gray-600 text-lg mb-6">
                  Interview data will appear here once students complete assessments
                </p>
                <Button 
                  variant="gradient"
                  onClick={() => router.push('/interviews/new')}
                  className="px-8 py-3 text-lg"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Schedule First Interview
                </Button>
              </Card.Content>
            </Card>
          )}
        </div>

        {/* Enhanced Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Performance Trends Chart */}
          <Card variant="elevated" className="group hover:shadow-xl transition-all duration-300">
            <Card.Header className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <svg className="w-6 h-6 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                    Performance Trends
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">Weekly performance over time</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Score</span>
                  <div className="w-3 h-3 bg-green-500 rounded-full ml-3"></div>
                  <span className="text-sm text-gray-600">Interviews</span>
                </div>
              </div>
            </Card.Header>
            <Card.Content className="p-6">
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#3B82F6" 
                      strokeWidth={3}
                      name="Average Score"
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="interviews" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      name="Interviews"
                      dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card.Content>
          </Card>

          {/* Skill Breakdown Chart */}
          <Card variant="elevated" className="group hover:shadow-xl transition-all duration-300">
            <Card.Header className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <svg className="w-6 h-6 mr-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Skill Performance
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">Performance by skill category</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Progress</span>
                </div>
              </div>
            </Card.Header>
            <Card.Content className="p-6">
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={skillData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="value" 
                      name="Score" 
                      radius={[4, 4, 0, 0]}
                      fill="url(#skillGradient)"
                    />
                    <defs>
                      <linearGradient id="skillGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0.8}/>
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card.Content>
          </Card>
        </div>

        {/* Enhanced Additional Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Category Distribution */}
          <Card variant="elevated" className="group hover:shadow-xl transition-all duration-300">
            <Card.Header className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <svg className="w-6 h-6 mr-3 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                    Interview Categories
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">Distribution by type</p>
                </div>
              </div>
            </Card.Header>
            <Card.Content className="p-6">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={trendsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="score"
                    >
                      {trendsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card.Content>
          </Card>

          {/* Enhanced Score Distribution */}
          <Card variant="elevated" className="group hover:shadow-xl transition-all duration-300">
            <Card.Header className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <svg className="w-6 h-6 mr-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Score Distribution
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">Performance range analysis</p>
                </div>
              </div>
            </Card.Header>
            <Card.Content className="p-6">
              <div className="space-y-6">
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-semibold text-gray-700">Excellent (80-100)</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-3">
                      <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500" style={{ width: '40%' }} />
                    </div>
                    <span className="text-sm font-bold text-green-600">40%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm font-semibold text-gray-700">Good (60-79)</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-3">
                      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 h-3 rounded-full transition-all duration-500" style={{ width: '35%' }} />
                    </div>
                    <span className="text-sm font-bold text-yellow-600">35%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl border border-red-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm font-semibold text-gray-700">Needs Improvement (0-59)</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-3">
                      <div className="bg-gradient-to-r from-red-500 to-pink-500 h-3 rounded-full transition-all duration-500" style={{ width: '25%' }} />
                    </div>
                    <span className="text-sm font-bold text-red-600">25%</span>
                  </div>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Enhanced Quick Stats */}
          <Card variant="elevated" className="group hover:shadow-xl transition-all duration-300">
            <Card.Header className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <svg className="w-6 h-6 mr-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    Quick Stats
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">Key performance indicators</p>
                </div>
              </div>
            </Card.Header>
            <Card.Content className="p-6">
              <div className="space-y-6">
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-700">Active Students</span>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">
                    {teacherStats?.active_students || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-700">Total Interviews</span>
                  </div>
                  <span className="text-2xl font-bold text-green-600">
                    {teacherStats?.total_interviews_conducted || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-700">Avg Student Score</span>
                  </div>
                  <span className="text-2xl font-bold text-purple-600">
                    {teacherStats?.average_student_score?.toFixed(1) || '0.0'}%
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200">
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-700">Completion Rate</span>
                  </div>
                  <span className="text-2xl font-bold text-indigo-600">
                    {teacherStats?.completion_rate?.toFixed(1) || '0.0'}%
                  </span>
                </div>
              </div>
            </Card.Content>
          </Card>
        </div>

        {/* Enhanced Detailed Analytics Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Performance */}
          <Card variant="elevated" className="group hover:shadow-xl transition-all duration-300">
            <Card.Header className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <svg className="w-6 h-6 mr-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    Recent Performance
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">Latest interview results</p>
                </div>
              </div>
            </Card.Header>
            <Card.Content className="p-6">
              {progressData?.performance_trends && progressData.performance_trends.length > 0 ? (
                <div className="space-y-4">
                  {progressData.performance_trends.slice(0, 5).map((trend, index) => (
                    <div key={index} className="flex items-center justify-between p-4 hover:bg-gradient-to-r hover:from-gray-50 hover:to-slate-50 rounded-xl transition-all duration-200 group/item">
                      <div className="flex items-center space-x-4">
                        <div className={`w-4 h-4 rounded-full ${getScoreBackground(trend.score)} group-hover/item:scale-110 transition-transform duration-200`}>
                          <div className={`w-full h-full rounded-full ${
                            trend.score >= 80 ? 'bg-green-500' :
                            trend.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 capitalize">
                            {trend.category.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-gray-500 flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formatDate(trend.date)} • {trend.count} interviews
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-xl ${getScoreColor(trend.score)}`}>
                          {trend.score.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500 font-medium">{trend.change}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-r from-gray-100 to-slate-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">No Recent Data</h3>
                  <p className="text-gray-600">Performance data will appear here once interviews are completed</p>
                </div>
              )}
            </Card.Content>
          </Card>

          {/* Top Performing Students */}
          <Card variant="elevated" className="group hover:shadow-xl transition-all duration-300">
            <Card.Header className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <svg className="w-6 h-6 mr-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    Top Performers
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">Students with highest scores</p>
                </div>
              </div>
            </Card.Header>
            <Card.Content className="p-6">
              {teacherStats?.top_performing_students && teacherStats.top_performing_students.length > 0 ? (
                <div className="space-y-4">
                  {teacherStats.top_performing_students.map((student, index) => (
                    <div key={index} className="flex items-center justify-between p-4 hover:bg-gradient-to-r hover:from-gray-50 hover:to-slate-50 rounded-xl transition-all duration-200 group/item">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg ${
                          index === 0 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                          index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                          index === 2 ? 'bg-gradient-to-r from-orange-600 to-red-600' :
                          'bg-gradient-to-r from-blue-500 to-purple-600'
                        } group-hover/item:scale-110 transition-transform duration-200`}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{student.name}</p>
                          <p className="text-sm text-gray-500 flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            {student.interviews} interviews
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-2xl ${getScoreColor(student.score)}`}>
                          {student.score.toFixed(1)}%
                        </p>
                        <div className="w-16 bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                              student.score >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                              student.score >= 60 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 
                              'bg-gradient-to-r from-red-500 to-pink-500'
                            }`}
                            style={{ width: `${student.score}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-r from-gray-100 to-slate-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">No Top Performers</h3>
                  <p className="text-gray-600">Student rankings will appear here once interviews are completed</p>
                </div>
              )}
            </Card.Content>
          </Card>
        </div>

        {/* Enhanced Action Buttons */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-8 rounded-2xl border border-emerald-200">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Take Action?</h3>
            <p className="text-gray-600 text-lg">Use these insights to improve your teaching and student outcomes</p>
          </div>
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Button
              variant="gradient"
              onClick={() => router.push('/interviews/new')}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 px-8 py-4 text-lg"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Schedule Interview
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/students')}
              className="text-emerald-600 border-emerald-600 hover:bg-emerald-50 hover:scale-105 transition-all duration-200 shadow-md px-8 py-4 text-lg"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              Manage Students
            </Button>
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="text-blue-600 border-blue-600 hover:bg-blue-50 hover:scale-105 transition-all duration-200 shadow-md px-8 py-4 text-lg"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293L16 6.586A1 1 0 0116 7v10a2 2 0 01-2 2z" />
              </svg>
              Export Report
            </Button>
          </div>
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
