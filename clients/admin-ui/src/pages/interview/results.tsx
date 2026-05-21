import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../utils/api';
import { InterviewSession } from '../../../shared/types';
import { formatDate, formatTime } from '../../utils/helpers';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Loading from '../../components/ui/Loading';
import { useToast } from '../../hooks';

const InterviewResultsPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated } = useAuth();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (id && typeof id === 'string') {
      fetchInterviewResults(parseInt(id, 10));
    }
  }, [id, isAuthenticated, router]);

  const fetchInterviewResults = async (sessionId: number) => {
    try {
      setLoading(true);
      const response = await apiService.getInterview(sessionId);
      setSession(response.data);
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
        <Loading />
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Interview Results</h1>
          <p className="mt-2 text-gray-600">{session.title}</p>
        </div>

        {/* Overall Score */}
        <Card>
          <Card.Content className="text-center py-8">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 ${getScoreBackground(session.overall_score || 0)}`}>
              <span className={`text-3xl font-bold ${getScoreColor(session.overall_score || 0)}`}>
                {getGradeFromScore(session.overall_score || 0)}
              </span>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Overall Score: {session.overall_score?.toFixed(1) || 'N/A'}%
            </h2>
            
            <p className="text-gray-600 mb-6">
              {session.overall_score >= 80 ? 'Excellent performance! You demonstrated strong skills.' :
               session.overall_score >= 60 ? 'Good job! There are areas for improvement.' :
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
          </Card.Content>
        </Card>

        {/* Detailed Breakdown */}
        {session.score_breakdown && (
          <Card>
            <Card.Header>
              <h3 className="text-lg font-semibold text-gray-900">Score Breakdown</h3>
            </Card.Header>
            <Card.Content>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(session.score_breakdown).map(([category, score]) => (
                  <div key={category} className="text-center p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 capitalize mb-2">
                      {category.replace('_', ' ')}
                    </h4>
                    <div className={`text-2xl font-bold ${getScoreColor(score as number)}`}>
                      {(score as number).toFixed(1)}%
                    </div>
                    
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            (score as number) >= 80 ? 'bg-green-500' :
                            (score as number) >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>
        )}

        {/* AI Feedback */}
        {session.ai_feedback && (
          <Card>
            <Card.Header>
              <h3 className="text-lg font-semibold text-gray-900">AI Feedback</h3>
            </Card.Header>
            <Card.Content>
              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {session.ai_feedback}
                </p>
              </div>
            </Card.Content>
          </Card>
        )}

        {/* Question Review */}
        {session.questions && session.questions.length > 0 && (
          <Card>
            <Card.Header>
              <h3 className="text-lg font-semibold text-gray-900">Question Review</h3>
            </Card.Header>
            <Card.Content>
              <div className="space-y-6">
                {session.questions.map((question, index) => (
                  <div key={question.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="text-md font-medium text-gray-900">
                        Question {index + 1}
                      </h4>
                      <div className="flex items-center space-x-2">
                        {question.score !== undefined && (
                          <span className={`px-2 py-1 rounded-full text-sm font-medium ${getScoreBackground(question.score)} ${getScoreColor(question.score)}`}>
                            {question.score.toFixed(1)}%
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          question.difficulty_level === 'easy' ? 'bg-green-100 text-green-800' :
                          question.difficulty_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {question.difficulty_level}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <p className="text-gray-700">{question.question_text}</p>
                    </div>
                    
                    {question.user_answer && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                        <h5 className="text-sm font-medium text-blue-800 mb-1">Your Answer:</h5>
                        <p className="text-blue-700 text-sm">{question.user_answer}</p>
                      </div>
                    )}
                    
                    {question.ai_feedback && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <h5 className="text-sm font-medium text-green-800 mb-1">AI Feedback:</h5>
                        <p className="text-green-700 text-sm">{question.ai_feedback}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>
        )}

        {/* Recommendations */}
        {session.recommendations && session.recommendations.length > 0 && (
          <Card>
            <Card.Header>
              <h3 className="text-lg font-semibold text-gray-900">Recommendations</h3>
            </Card.Header>
            <Card.Content>
              <ul className="space-y-3">
                {session.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-5 h-5 bg-primary-100 rounded-full flex items-center justify-center mt-0.5">
                      <svg className="w-3 h-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-700">{recommendation}</p>
                  </li>
                ))}
              </ul>
            </Card.Content>
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
          
          <Button
            onClick={() => router.push('/interviews/new')}
          >
            Start New Interview
          </Button>
          
          <Button
            variant="outline"
            onClick={() => router.push('/analytics')}
          >
            View Analytics
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default InterviewResultsPage;
