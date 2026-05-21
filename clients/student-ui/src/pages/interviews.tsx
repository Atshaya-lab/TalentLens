import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import RealTimeTimer from '../components/RealTimeTimer';
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

  const startProfessionalInterview = (interview: InterviewSession) => {
    if ((interview.status === 'scheduled' || interview.status === 'pending') && 
        new Date(interview.scheduled_datetime || interview.scheduled_time || '') <= new Date()) {
      router.push(`/professional-interview?session_id=${interview.id}`);
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
        {/* Enhanced Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl p-8 text-white shadow-2xl">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
          
          <div className="relative">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-2">My Interviews</h1>
                <p className="text-emerald-100 text-lg">Track your interview sessions and progress</p>
              </div>
            </div>
            
            {/* Quick Stats Row */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2 backdrop-blur-sm">
                <svg className="w-4 h-4 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium">Total: {interviews.length}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2 backdrop-blur-sm">
                <svg className="w-4 h-4 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">Completed: {completedInterviews.length}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2 backdrop-blur-sm">
                <svg className="w-4 h-4 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">Upcoming: {upcomingInterviews.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 group hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Interviews</p>
                  <p className="text-3xl font-bold text-gray-900">{interviews.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 group hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 mb-1">Completed</p>
                  <p className="text-3xl font-bold text-gray-900">{completedInterviews.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 group hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 mb-1">Upcoming</p>
                  <p className="text-3xl font-bold text-gray-900">{upcomingInterviews.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 group hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 mb-1">Avg Score</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {completedInterviews.length > 0 
                      ? Math.round(completedInterviews.reduce((sum, interview) => sum + (interview.overall_score || 0), 0) / completedInterviews.length)
                      : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Upcoming Interviews */}
        {upcomingInterviews.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Upcoming Interviews</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingInterviews.map((interview) => (
                <Card key={interview.id} className="group hover:shadow-2xl transition-all duration-300 hover:scale-105 border-0 bg-gradient-to-br from-white to-gray-50/50">
                  <CardHeader>
                    <CardTitle className="text-lg capitalize">
                      {interview.interview_type || interview.category || 'Interview'}
                    </CardTitle>
                    <CardDescription>
                      {formatDateTime(interview.scheduled_datetime || interview.scheduled_time || interview.created_at)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <RealTimeTimer 
                        startTime={interview.scheduled_datetime || interview.scheduled_time || interview.created_at}
                        endTime={interview.end_datetime}
                        status={interview.status as 'scheduled' | 'in_progress' | 'completed'}
                        className="bg-gray-50 p-2 rounded-lg"
                      />
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
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => joinInterview(interview)}
                          disabled={new Date(interview.scheduled_datetime || interview.scheduled_time || '') > new Date()}
                          className="flex-1"
                        >
                          {new Date(interview.scheduled_datetime || interview.scheduled_time || '') > new Date() ? 'Scheduled' : 'Join Interview'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startProfessionalInterview(interview)}
                          disabled={new Date(interview.scheduled_datetime || interview.scheduled_time || '') > new Date()}
                          className="flex-1"
                        >
                          Professional Mode
                        </Button>
                      </div>
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
                      <div className="mt-3">
                        <RealTimeTimer 
                          startTime={interview.scheduled_datetime || interview.scheduled_time || interview.created_at}
                          endTime={interview.end_datetime}
                          status={interview.status as 'scheduled' | 'in_progress' | 'completed'}
                          className="bg-gray-50 p-2 rounded-lg"
                        />
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
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => joinInterview(interview)}
                            disabled={new Date(interview.scheduled_datetime || interview.scheduled_time || '') > new Date()}
                          >
                            {new Date(interview.scheduled_datetime || interview.scheduled_time || '') > new Date() ? 'Scheduled' : 'Join'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startProfessionalInterview(interview)}
                            disabled={new Date(interview.scheduled_datetime || interview.scheduled_time || '') > new Date()}
                          >
                            Professional
                          </Button>
                        </div>
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
