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

const AnalyticsPage: React.FC = () => {
  const { user, isAuthenticated, isStudent } = useAuth();
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
      const [metricsResponse, progressResponse] = await Promise.all([
        apiService.getPerformanceMetrics({
          period: selectedPeriod,
          category: selectedCategory === 'all' ? undefined : selectedCategory
        }),
        apiService.getProgressTracking()
      ]);

      setPerformanceMetrics(metricsResponse.data);
      setProgressData(progressResponse.data);
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
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isStudent ? 'My Analytics' : 'Analytics & Reports'}
            </h1>
            <p className="mt-2 text-gray-600">
              Track your interview performance and progress over time
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
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Categories</option>
              <option value="technical">Technical</option>
              <option value="behavioral">Behavioral</option>
              <option value="communication">Communication</option>
              <option value="problem_solving">Problem Solving</option>
            </select>
          </div>
        </div>

        {/* Performance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {performanceMetrics.length > 0 ? (
            performanceMetrics.map((metric) => (
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
            ))
          ) : (
            <Card className="col-span-full">
              <Card.Content className="text-center py-8">
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
                <p className="text-gray-500">
                  Complete some interviews to see your performance analytics
                </p>
              </Card.Content>
            </Card>
          )}
        </div>

        {/* Progress Tracking */}
        {progressData && (
          <>
            {/* Weekly Progress */}
            <Card>
              <Card.Header>
                <h3 className="text-lg font-semibold text-gray-900">Weekly Progress</h3>
              </Card.Header>
              <Card.Content>
                {progressData.weekly_progress.length > 0 ? (
                  <div className="space-y-4">
                    {progressData.weekly_progress.map((week, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{week.week}</p>
                          <p className="text-sm text-gray-500">
                            {week.interviews_completed} interviews completed
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${getScoreColor(week.score)}`}>
                            {week.score.toFixed(1)}%
                          </p>
                          <p className="text-sm text-gray-500">Average Score</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No weekly progress data available</p>
                )}
              </Card.Content>
            </Card>

            {/* Skill Breakdown */}
            <Card>
              <Card.Header>
                <h3 className="text-lg font-semibold text-gray-900">Skill Development</h3>
              </Card.Header>
              <Card.Content>
                {progressData.skill_breakdown.length > 0 ? (
                  <div className="space-y-6">
                    {progressData.skill_breakdown.map((skill, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900 capitalize">
                            {skill.skill.replace('_', ' ')}
                          </span>
                          <span className="text-sm text-gray-500">
                            {skill.current_level}/{skill.target_level}
                          </span>
                        </div>
                        
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${skill.progress}%` }}
                          />
                        </div>
                        
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Current: {skill.current_level}</span>
                          <span>{skill.progress.toFixed(1)}% Complete</span>
                          <span>Target: {skill.target_level}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No skill development data available</p>
                )}
              </Card.Content>
            </Card>

            {/* Performance Trends */}
            <Card>
              <Card.Header>
                <h3 className="text-lg font-semibold text-gray-900">Recent Performance Trends</h3>
              </Card.Header>
              <Card.Content>
                {progressData.performance_trends.length > 0 ? (
                  <div className="space-y-3">
                    {progressData.performance_trends.slice(0, 10).map((trend, index) => (
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
                            {trend.score.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No performance trends available</p>
                )}
              </Card.Content>
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
