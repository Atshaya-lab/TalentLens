import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../utils/api';
import { InterviewSession } from '../types';
import { formatDate, formatDateTime, formatDuration, getScoreColor, getStatusColor } from '../utils/helpers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import { useToast } from '../hooks';

const StudentsInterviewsPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [interviews, setInterviews] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { showToast } = useToast();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/signin');
      return;
    }
    
    if (user?.role !== 'student') {
      router.push('/dashboard');
      return;
    }
    
    fetchInterviews();
  }, [isAuthenticated, user, router]);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const response = await apiService.getInterviews({ page: 1 });
      setInterviews(response.data.results || []);
    } catch (error) {
      console.error('Failed to fetch interviews:', error);
      showToast('Failed to load interviews', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredInterviews = interviews.filter(interview => {
    if (filter === 'all') return true;
    return interview.status === filter;
  });

  const upcomingInterviews = interviews.filter(
    interview => (interview.status === 'scheduled' || interview.status === 'pending') && 
    new Date(interview.scheduled_datetime || interview.scheduled_time || '') > new Date()
  );

  const completedInterviews = interviews.filter(interview => interview.status === 'completed');

  const joinInterview = (interview: InterviewSession) => {
    if ((interview.status === 'scheduled' || interview.status === 'pending') && 
        new Date(interview.scheduled_datetime || interview.scheduled_time || '') <= new Date()) {
      router.push(`/interview/${interview.id}`);
    } else {
      showToast('Interview is not yet available', 'warning');
    }
  };

  if (loading) {
    return (
      <Layout>
        <Loading size="lg" text="Loading your interviews..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Interviews</h1>
          <p className="text-gray-600">Track your interview sessions and progress</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-2xl">📋</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Interviews</p>
                  <p className="text-2xl font-bold text-gray-900">{interviews.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <span className="text-2xl">✅</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{completedInterviews.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <span className="text-2xl">⏰</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Upcoming</p>
                  <p className="text-2xl font-bold text-gray-900">{upcomingInterviews.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <span className="text-2xl">📊</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Score</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {completedInterviews.length > 0 
                      ? Math.round(completedInterviews.reduce((sum, interview) => sum + (interview.overall_score || 0), 0) / completedInterviews.length)
                      : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Interviews */}
        {upcomingInterviews.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Interviews</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingInterviews.map((interview) => (
                <Card key={interview.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg capitalize">
                      {interview.interview_type || interview.category || 'Interview'}
                    </CardTitle>
                    <CardDescription>
                      {formatDateTime(interview.scheduled_datetime || interview.scheduled_time || interview.created_at)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Duration:</span> {formatDuration((interview.duration_minutes || interview.duration || 60) * 60)}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Teacher:</span> {interview.teacher_name || 'Not assigned'}
                      </p>
                      {interview.instructions && (
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Instructions:</span> {interview.instructions}
                        </p>
                      )}
                    </div>
                    <div className="mt-4">
                      <Button
                        size="sm"
                        onClick={() => joinInterview(interview)}
                        disabled={new Date(interview.scheduled_datetime || interview.scheduled_time || '') > new Date()}
                        className="w-full"
                      >
                        {new Date(interview.scheduled_datetime || interview.scheduled_time || '') > new Date() ? 'Scheduled' : 'Join Interview'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          {[
            { key: 'all', label: 'All' },
            { key: 'scheduled', label: 'Scheduled' },
            { key: 'completed', label: 'Completed' },
            { key: 'missed', label: 'Missed' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === tab.key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Interview List */}
        <div className="space-y-4">
          {filteredInterviews.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No interviews found</h3>
                <p className="text-gray-600">
                  {filter === 'all' 
                    ? "You don't have any interviews scheduled yet."
                    : `No ${filter} interviews found.`
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredInterviews.map((interview) => (
              <Card key={interview.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900 capitalize">
                          {interview.interview_type || interview.category || interview.title || 'Interview'}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(interview.status || 'scheduled')}`}>
                          {interview.status}
                        </span>
                      </div>
                      
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Scheduled:</span> {formatDateTime(interview.scheduled_datetime || interview.scheduled_time || interview.created_at)}
                        </div>
                        <div>
                          <span className="font-medium">Duration:</span> {formatDuration((interview.duration_minutes || interview.duration || 60) * 60)}
                        </div>
                        <div>
                          <span className="font-medium">Teacher:</span> {interview.teacher_name || 'Not assigned'}
                        </div>
                      </div>

                      {interview.status === 'completed' && interview.overall_score && (
                        <div className="mt-2">
                          <span className="text-sm font-medium text-gray-600">Score: </span>
                          <span className={`text-sm font-bold ${getScoreColor(interview.overall_score)}`}>
                            {interview.overall_score}%
                          </span>
                        </div>
                      )}

                      {interview.instructions && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Instructions:</span> {interview.instructions}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="ml-6 flex flex-col space-y-2">
                      {(interview.status === 'scheduled' || interview.status === 'pending') && (
                        <Button
                          size="sm"
                          onClick={() => joinInterview(interview)}
                          disabled={new Date(interview.scheduled_datetime || interview.scheduled_time || '') > new Date()}
                        >
                          {new Date(interview.scheduled_datetime || interview.scheduled_time || '') > new Date() ? 'Scheduled' : 'Join'}
                        </Button>
                      )}
                      
                      {interview.status === 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/interview/${interview.id}/results`)}
                        >
                          View Results
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default StudentsInterviewsPage;
