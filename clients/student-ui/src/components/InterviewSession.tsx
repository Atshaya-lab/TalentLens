import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { apiService } from '../utils/api';
import { InterviewSession, InterviewQuestion } from '../types';
import { formatTime } from '../utils/helpers';
import Button from './ui/Button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from './ui/Card';
import Modal from './ui/Modal';
import Loading from './ui/Loading';
import { useToast } from '../hooks';

interface InterviewSessionProps {
  sessionId: number;
  onComplete: (session: InterviewSession) => void;
  onExit: () => void;
}

interface QuestionResponse {
  id: number;
  question: string;
  answer: string;
  timeSpent: number;
  isAnswered: boolean;
}

const InterviewSessionComponent: React.FC<InterviewSessionProps> = ({
  sessionId,
  onComplete,
  onExit
}) => {
  const router = useRouter();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<QuestionResponse[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [isRecording, setIsRecording] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [questionLoading, setQuestionLoading] = useState(false);
  const { showToast } = useToast();
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    initializeSession();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      stopRecording();
    };
  }, []);

  useEffect(() => {
    if (session && questions.length > 0) {
      startTimer();
      setQuestionStartTime(Date.now());
    }
  }, [session, questions]);

  const initializeSession = async () => {
    try {
      setLoading(true);
      const sessionResponse = await apiService.getInterview(sessionId);
      const sessionData = sessionResponse.data;
      
      setSession(sessionData);
      
      // Check if we have questions
      if (sessionData.questions && sessionData.questions.length > 0) {
        setQuestions(sessionData.questions);
        initializeResponses(sessionData.questions);
      } else if (sessionData.status === 'scheduled') {
        // Try to start the interview to generate questions
        try {
          const startResponse = await apiService.startInterview(sessionId);
          const startedSessionData = startResponse.data;
          
          if (startedSessionData.questions && startedSessionData.questions.length > 0) {
            setQuestions(startedSessionData.questions);
            initializeResponses(startedSessionData.questions);
            // Update session data
            setSession(startedSessionData);
          } else {
            showToast('No questions available for this interview', 'error');
            return;
          }
        } catch (startError) {
          console.error('Error starting interview:', startError);
          showToast('Failed to start interview session', 'error');
          return;
        }
      } else if (sessionData.status === 'in_progress') {
        // Interview is already in progress, questions should be available
        if (sessionData.questions && sessionData.questions.length > 0) {
          setQuestions(sessionData.questions);
          initializeResponses(sessionData.questions);
        } else {
          showToast('Interview questions are not available', 'error');
          return;
        }
      } else {
        showToast('Interview is not available or has no questions', 'error');
        return;
      }
      
    } catch (error) {
      console.error('Error initializing session:', error);
      showToast('Failed to initialize interview session', 'error');
    } finally {
      setLoading(false);
    }
  };

  const initializeResponses = (questionsList: InterviewQuestion[]) => {
    const initialResponses = questionsList.map((q, index) => ({
      id: q.id,
      question: q.question_text,
      answer: '',
      timeSpent: 0,
      isAnswered: false
    }));
    setResponses(initialResponses);
  };

  const startTimer = () => {
    if (session?.duration) {
      setTimeRemaining(session.duration * 60); // Convert minutes to seconds
      
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handleTimeUp = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    showToast('Time is up! Submitting your interview...', 'warning');
    handleCompleteInterview();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.addEventListener('dataavailable', (event) => {
        audioChunksRef.current.push(event.data);
      });

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      showToast('Failed to start audio recording', 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const handleNextQuestion = async () => {
    if (!currentAnswer.trim()) {
      showToast('Please provide an answer before proceeding', 'warning');
      return;
    }

    setQuestionLoading(true);
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    const currentQuestion = questions[currentQuestionIndex];
    
    // Submit the answer
    try {
      await apiService.submitAnswer(sessionId, {
        question_id: currentQuestion.id,
        answer_text: currentAnswer,
        time_taken_seconds: timeSpent
      });
      
      showToast('Answer submitted successfully', 'success');
    } catch (error) {
      console.error('Error submitting answer:', error);
      showToast('Failed to submit answer', 'error');
    }

    // Update responses
    setResponses(prev => prev.map((resp, index) => 
      index === currentQuestionIndex 
        ? { ...resp, answer: currentAnswer, timeSpent, isAnswered: true }
        : resp
    ));

    // Add a small delay to show loading state
    setTimeout(() => {
      // Move to next question or complete
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setCurrentAnswer('');
        setQuestionStartTime(Date.now());
      } else {
        handleCompleteInterview();
      }
      setQuestionLoading(false);
    }, 500);
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setCurrentAnswer(responses[currentQuestionIndex - 1]?.answer || '');
      setQuestionStartTime(Date.now());
    }
  };

  const handleCompleteInterview = async () => {
    setSubmitting(true);
    
    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      stopRecording();
      
      const completedSession = await apiService.completeInterview(sessionId);
      showToast('Interview completed successfully!', 'success');
      
      onComplete(completedSession.data);
    } catch (error) {
      console.error('Error completing interview:', error);
      showToast('Failed to complete interview', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExitInterview = () => {
    setShowExitModal(true);
  };

  const confirmExit = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    stopRecording();
    onExit();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (!session || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="text-center p-8">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Interview Not Available</h3>
          <p className="text-gray-500 mb-4">Unable to load interview session</p>
          <Button onClick={() => router.push('/interviews')}>
            Back to Interviews
          </Button>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{session.title}</h1>
              <p className="text-sm text-gray-500">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {timeRemaining > 0 && (
                <div className={`text-lg font-bold ${
                  timeRemaining < 300 ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {formatTime(timeRemaining)}
                </div>
              )}
              
              <Button
                variant="outline"
                onClick={handleExitInterview}
                disabled={submitting}
              >
                Exit Interview
              </Button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Question Panel */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Question {currentQuestionIndex + 1}
                  </h2>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    currentQuestion.difficulty_level === 'easy' ? 'bg-green-100 text-green-800' :
                    currentQuestion.difficulty_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {currentQuestion.difficulty_level}
                  </span>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="prose max-w-none">
                  <p className="text-gray-900 text-lg leading-relaxed">
                    {currentQuestion.question_text}
                  </p>
                </div>

                {/* Audio Recording */}
                <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <Button
                    variant={isRecording ? 'danger' : 'primary'}
                    onClick={isRecording ? stopRecording : startRecording}
                    size="sm"
                  >
                    {isRecording ? (
                      <>
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-2" />
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z" />
                        </svg>
                        Start Recording
                      </>
                    )}
                  </Button>
                  <span className="text-sm text-gray-600">
                    {isRecording ? 'Recording your answer...' : 'Record your verbal response (optional)'}
                  </span>
                </div>

                {/* Answer Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Answer
                  </label>
                  <textarea
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Type your answer here..."
                  />
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={handlePreviousQuestion}
                    disabled={currentQuestionIndex === 0}
                  >
                    Previous
                  </Button>
                  
                  <div className="space-x-3">
                    {currentQuestionIndex < questions.length - 1 ? (
                      <Button
                        onClick={handleNextQuestion}
                        disabled={!currentAnswer.trim() || questionLoading}
                        isLoading={questionLoading}
                      >
                        {questionLoading ? 'Loading Next Question...' : 'Next Question'}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleCompleteInterview}
                        disabled={!currentAnswer.trim() || submitting}
                        isLoading={submitting}
                      >
                        {submitting ? 'Completing Interview...' : 'Complete Interview'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Question Overview */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">Overview</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {questions.map((_, index) => (
                    <div
                      key={index}
                      className={`flex items-center space-x-2 p-2 rounded-md ${
                        index === currentQuestionIndex 
                          ? 'bg-primary-100 text-primary-800' 
                          : responses[index]?.isAnswered
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <span className="text-sm font-medium">Q{index + 1}</span>
                      {responses[index]?.isAnswered && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Session Info */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">Session Info</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <span className="font-medium capitalize">{session.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Difficulty:</span>
                    <span className="font-medium capitalize">{session.difficulty_level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{session.duration} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Questions:</span>
                    <span className="font-medium">{questions.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      <Modal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        title="Exit Interview"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to exit this interview? Your progress will be lost.
          </p>
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowExitModal(false)}
            >
              Continue Interview
            </Button>
            <Button
              variant="danger"
              onClick={confirmExit}
            >
              Exit Interview
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InterviewSessionComponent;
