import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../utils/api';
import { InterviewSession } from '../../types';
import { formatDate, formatTime } from '../../utils/helpers';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Loading from '../../components/ui/Loading';
import { useToast } from '../../hooks';

const InterviewResultsPage: React.FC = () => {
  const router = useRouter();
  const { id, session_id } = router.query;
  const { isAuthenticated } = useAuth();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [responsesLoading, setResponsesLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Handle both 'id' and 'session_id' parameters for compatibility
    const sessionId = id || session_id;
    if (sessionId && typeof sessionId === 'string') {
      fetchInterviewResults(parseInt(sessionId, 10));
    }
  }, [id, session_id, isAuthenticated, router]);

  const fetchInterviewResults = async (sessionId: number) => {
    try {
      setLoading(true);
      
      // Fetch session data
      const sessionResponse = await apiService.getInterview(sessionId);
      const sessionData = sessionResponse.data;
      
      console.log('Session data:', sessionData); // Debug log
      
      // Allow viewing results for completed interviews or ongoing ones
      if (!['completed', 'in_progress'].includes(sessionData.status)) {
        showToast('Interview results are not available yet', 'warning');
        router.push('/interviews');
        return;
      }
      
      setSession(sessionData);
      
      // Fetch user responses if interview is completed
      if (sessionData.status === 'completed') {
        try {
          setResponsesLoading(true);
          const responsesResponse = await apiService.getInterviewResponses(sessionId);
          setResponses(responsesResponse.data || []);
        } catch (responseError) {
          console.error('Error fetching responses:', responseError);
          // Don't fail completely if responses can't be loaded
          setResponses([]);
        } finally {
          setResponsesLoading(false);
        }
      }
      
    } catch (error) {
      console.error('Error fetching interview results:', error);
      showToast('Failed to load interview results', 'error');
      router.push('/interviews');
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

  const getGradeFromScore = (score: number) => {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading size="lg" text="Loading interview results..." />
        </div>
      </Layout>
    );
  }

  if (!session) {
    return (
      <Layout>
        <Card className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Interview Not Found</h3>
          <p className="text-gray-500 mb-4">Unable to load interview results</p>
          <Button onClick={() => router.push('/interviews')}>
            Back to Interviews
          </Button>
        </Card>
      </Layout>
    );
  }

  const overallScore = session.overall_score || 0;
  const isCompleted = session.status === 'completed';

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            {isCompleted ? 'Interview Results' : 'Interview In Progress'}
          </h1>
          <p className="mt-2 text-gray-600">{session.title || 'Interview Session'}</p>
        </div>

        {/* Overall Score - only show if completed */}
        {isCompleted && (
          <Card>
            <CardContent className="text-center py-8">
              <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 ${getScoreBackground(overallScore)}`}>
                <span className={`text-3xl font-bold ${getScoreColor(overallScore)}`}>
                  {getGradeFromScore(overallScore)}
                </span>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Overall Score: {overallScore.toFixed(1)}%
              </h2>
              
              <p className="text-gray-600 mb-6">
                {overallScore >= 80 ? 'Excellent performance! You demonstrated strong skills.' :
                 overallScore >= 60 ? 'Good job! There are areas for improvement.' :
                 'Keep practicing! Focus on the feedback below.'}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {session.actual_duration ? formatTime(session.actual_duration * 60) : 'N/A'}
                  </p>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-500">Questions</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {session.questions?.length || session.total_questions || 0}
                  </p>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDate(session.completed_at || session.updated_at)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Session Info for in-progress interviews */}
        {!isCompleted && (
          <Card>
            <CardHeader>
              <CardTitle>Interview Session</CardTitle>
              <CardDescription>Your interview is currently in progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="text-lg font-semibold text-blue-600 capitalize">{session.status}</p>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-500">Questions</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {session.questions?.length || 0}
                  </p>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-500">Started</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDate(session.started_at || session.created_at)}
                  </p>
                </div>
              </div>
              
              <div className="mt-6 text-center">
                <Button 
                  onClick={() => router.push(`/interview/${session.id}`)}
                  variant="primary"
                >
                  Continue Interview
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed Question Analysis - only for completed interviews */}
        {isCompleted && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Question Analysis</h3>
              <CardDescription>Your performance breakdown by question</CardDescription>
            </CardHeader>
            <CardContent>
              {responsesLoading ? (
                <div className="text-center py-8">
                  <Loading size="sm" />
                  <p className="text-gray-500 mt-2">Loading your responses...</p>
                </div>
              ) : responses.length > 0 ? (
                <div className="space-y-6">
                  {responses.map((response, index) => (
                    <div key={response.id || index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-md font-medium text-gray-900">
                          Question {index + 1}
                        </h4>
                        <div className="flex items-center space-x-2">
                          {response.score !== undefined && response.score !== null && (
                            <span className={`px-2 py-1 rounded-full text-sm font-medium ${getScoreBackground(response.score)} ${getScoreColor(response.score)}`}>
                              {response.score.toFixed(1)}%
                            </span>
                          )}
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {formatTime(response.time_taken_seconds || 0)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Question:</h5>
                        <p className="text-gray-600 bg-gray-50 p-3 rounded-md">{response.question_text}</p>
                      </div>
                      
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Your Answer:</h5>
                        <p className="text-gray-900 bg-blue-50 p-3 rounded-md border-l-4 border-blue-400">
                          {response.answer_text || 'No answer provided'}
                        </p>
                      </div>
                      
                      {response.expected_answer && (
                        <div className="mb-4">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Expected Answer:</h5>
                          <p className="text-gray-600 bg-green-50 p-3 rounded-md border-l-4 border-green-400">
                            {response.expected_answer}
                          </p>
                        </div>
                      )}
                      
                      {response.ai_feedback && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Feedback:</h5>
                          <p className="text-gray-700 bg-yellow-50 p-3 rounded-md border-l-4 border-yellow-400">
                            {response.ai_feedback}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No detailed responses available for this interview.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* AI Feedback - only for completed interviews */}
        {isCompleted && session.ai_feedback && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Overall Feedback</h3>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {session.ai_feedback}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recommendations - only for completed interviews */}
        {isCompleted && session.recommendations && session.recommendations.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Recommendations</h3>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {session.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                      <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-700">{recommendation}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push('/interviews')}
          >
            Back to Interviews
          </Button>
          
          {isCompleted && (
            <Button
              variant="outline"
              onClick={() => router.push('/analytics')}
            >
              View Analytics
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default InterviewResultsPage;

// Prevent static generation for this page since it requires authentication
export const getServerSideProps = async () => {
  return {
    props: {},
  };
};
