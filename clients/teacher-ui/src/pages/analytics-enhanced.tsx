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
  }>;
  skill_breakdown: Array<{
    skill: string;
    current_level: number;
    target_level: number;
    progress: number;
  }>;
  performance_trends: Array<{
    date: string;
    score: number;
    category: string;
  }>;
}

// Mock data for development
const mockPerformanceData = [
  { date: '2024-01', score: 65, interviews: 4 },
  { date: '2024-02', score: 72, interviews: 6 },
  { date: '2024-03', score: 78, interviews: 5 },
  { date: '2024-04', score: 82, interviews: 7 },
  { date: '2024-05', score: 85, interviews: 8 },
  { date: '2024-06', score: 88, interviews: 6 },
];

const mockSkillsData = [
  { skill: 'Technical', score: 85 },
  { skill: 'Communication', score: 78 },
  { skill: 'Problem Solving', score: 82 },
  { skill: 'Leadership', score: 75 },
  { skill: 'Teamwork', score: 88 },
];

const mockSkillDistribution = [
  { name: 'Technical', value: 35, level: 'Advanced' },
  { name: 'Communication', value: 25, level: 'Intermediate' },
  { name: 'Leadership', value: 20, level: 'Intermediate' },
  { name: 'Problem Solving', value: 20, level: 'Advanced' },
];

const mockProgressData = [
  { month: 'Jan', progress: 20 },
  { month: 'Feb', progress: 35 },
  { month: 'Mar', progress: 45 },
  { month: 'Apr', progress: 60 },
  { month: 'May', progress: 75 },
  { month: 'Jun', progress: 85 },
];

const mockMultiLineData = [
  { month: 'Jan', technical: 60, behavioral: 55, communication: 70 },
  { month: 'Feb', technical: 68, behavioral: 62, communication: 75 },
  { month: 'Mar', technical: 75, behavioral: 70, communication: 78 },
  { month: 'Apr', technical: 80, behavioral: 75, communication: 82 },
  { month: 'May', technical: 85, behavioral: 78, communication: 85 },
  { month: 'Jun', technical: 88, behavioral: 82, communication: 88 },
];

const EnhancedAnalyticsPage: React.FC = () => {
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
      // In a real app, this would fetch from API
      // For now, we'll use mock data
      setTimeout(() => {
        setPerformanceMetrics([
          {
            id: 1,
            category: 'technical',
            average_score: 85,
            total_interviews: 12,
            improvement_rate: 8.5,
            last_updated: '2024-06-14'
          },
          {
            id: 2,
            category: 'behavioral',
            average_score: 78,
            total_interviews: 10,
            improvement_rate: 12.3,
            last_updated: '2024-06-14'
          },
          {
            id: 3,
            category: 'communication',
            average_score: 82,
            total_interviews: 8,
            improvement_rate: 5.7,
            last_updated: '2024-06-14'
          },
          {
            id: 4,
            category: 'problem_solving',
            average_score: 80,
            total_interviews: 15,
            improvement_rate: 15.2,
            last_updated: '2024-06-14'
          }
        ]);
        
        setProgressData({
          weekly_progress: [
            { week: 'Week 1', score: 75, interviews_completed: 3 },
            { week: 'Week 2', score: 82, interviews_completed: 4 },
            { week: 'Week 3', score: 78, interviews_completed: 2 },
            { week: 'Week 4', score: 85, interviews_completed: 5 },
          ],
          skill_breakdown: [
            { skill: 'technical', current_level: 8, target_level: 10, progress: 80 },
            { skill: 'communication', current_level: 7, target_level: 9, progress: 77.8 },
            { skill: 'leadership', current_level: 6, target_level: 8, progress: 75 },
            { skill: 'problem_solving', current_level: 9, target_level: 10, progress: 90 },
          ],
          performance_trends: [
            { date: '2024-06-10', score: 85, category: 'technical' },
            { date: '2024-06-08', score: 78, category: 'behavioral' },
            { date: '2024-06-05', score: 82, category: 'communication' },
            { date: '2024-06-03', score: 76, category: 'technical' },
            { date: '2024-06-01', score: 80, category: 'problem_solving' },
          ]
        });
        
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      showToast('Failed to load analytics data', 'error');
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
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {user?.role === 'student' ? 'My Analytics Dashboard' : 'Analytics & Performance'}
            </h1>
            <p className="mt-2 text-gray-600">
              Comprehensive insights into your interview performance and skill development
            </p>
          </div>
          
          <div className="flex space-x-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 3 months</option>
              <option value="1y">Last year</option>
            </select>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="technical">Technical</option>
              <option value="behavioral">Behavioral</option>
              <option value="communication">Communication</option>
              <option value="problem_solving">Problem Solving</option>
            </select>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {performanceMetrics.map((metric) => (
            <Card key={metric.id}>
              <Card.Content className="p-6">
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
              </Card.Content>
            </Card>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Performance Line Chart */}
          <PerformanceLineChart
            data={mockPerformanceData}
            xKey="date"
            yKey="score"
            title="Performance Trend Over Time"
            color="#3B82F6"
          />

          {/* Skills Bar Chart */}
          <SkillsBarChart
            data={mockSkillsData}
            xKey="skill"
            yKey="score"
            title="Skills Assessment Scores"
            color="#10B981"
          />
        </div>

        {/* Second Row of Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Skill Distribution Pie Chart */}
          <SkillDistributionPieChart
            data={mockSkillDistribution}
            dataKey="value"
            nameKey="name"
            title="Skill Focus Distribution"
          />

          {/* Progress Area Chart */}
          <ProgressAreaChart
            data={mockProgressData}
            xKey="month"
            yKey="progress"
            title="Overall Progress Tracking"
            color="#8B5CF6"
          />
        </div>

        {/* Multi-line Performance Chart */}
        <div className="w-full">
          <MultiLineChart
            data={mockMultiLineData}
            xKey="month"
            lines={[
              { key: 'technical', color: '#3B82F6', name: 'Technical' },
              { key: 'behavioral', color: '#10B981', name: 'Behavioral' },
              { key: 'communication', color: '#F59E0B', name: 'Communication' },
            ]}
            title="Category-wise Performance Comparison"
          />
        </div>

        {/* Detailed Progress Section */}
        {progressData && (
          <>
            {/* Weekly Progress */}
            <Card>
              <Card.Header>
                <h3 className="text-lg font-semibold text-gray-900">Recent Weekly Progress</h3>
              </Card.Header>
              <Card.Content>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {progressData.weekly_progress.map((week, index) => (
                    <div key={index} className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-lg border">
                      <div className="text-center">
                        <p className="font-medium text-gray-900">{week.week}</p>
                        <p className={`text-2xl font-bold mt-2 ${getScoreColor(week.score)}`}>
                          {week.score.toFixed(1)}%
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {week.interviews_completed} interviews
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Content>
            </Card>

            {/* Skill Development */}
            <Card>
              <Card.Header>
                <h3 className="text-lg font-semibold text-gray-900">Skill Development Progress</h3>
              </Card.Header>
              <Card.Content>
                <div className="space-y-6">
                  {progressData.skill_breakdown.map((skill, index) => (
                    <div key={index} className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900 capitalize">
                          {skill.skill.replace('_', ' ')}
                        </span>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-500">
                            Level {skill.current_level} of {skill.target_level}
                          </span>
                          <span className="font-semibold text-emerald-600">
                            {skill.progress.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-3 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${skill.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Content>
            </Card>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 pt-6">
          <Button
            onClick={() => router.push('/interviews/new')}
            className="px-8 py-3"
          >
            Start New Interview
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/resumes')}
            className="px-8 py-3"
          >
            Manage Resumes
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/profile')}
            className="px-8 py-3"
          >
            Update Profile
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default EnhancedAnalyticsPage;

// Prevent static generation for this page since it requires authentication
export const getServerSideProps = async () => {
  return {
    props: {},
  };
};
