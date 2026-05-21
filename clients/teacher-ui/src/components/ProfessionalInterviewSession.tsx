import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import apiService from '../utils/api';
import { InterviewSession, InterviewQuestion } from '../types';
import { formatTime } from '../utils/helpers';
import Button from './ui/Button';
import Card from './ui/Card';
import Modal from './ui/Modal';
import Loading from './ui/Loading';
import { useToast } from '../hooks';
import { useTheme } from '../contexts/ThemeContext';

interface ProfessionalInterviewSessionProps {
  sessionId: number;
  onComplete: (session: InterviewSession) => void;
  onExit: () => void;
}

interface QuestionResponse {
  id: number;
  question: string;
  answer: string;
  audioBlob?: Blob;
  timeSpent: number;
  isAnswered: boolean;
  maxTimeAllowed: number;
  startTime: number;
}

interface SecurityEvent {
  type: 'tab_switch' | 'window_blur' | 'copy_attempt' | 'paste_attempt' | 'right_click' | 'dev_tools';
  timestamp: number;
  details?: string;
}

const AVATAR_STATES = {
  IDLE: 'idle',
  SPEAKING: 'speaking',
  LISTENING: 'listening',
  THINKING: 'thinking',
} as const;

const ProfessionalInterviewSession: React.FC<ProfessionalInterviewSessionProps> = ({
  sessionId,
  onComplete,
  onExit
}) => {
  const router = useRouter();
  const { isDark } = useTheme();
  const { showToast } = useToast();
  
  // Core states
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<QuestionResponse[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  
  // Timing states
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(0);
  const [questionTimeRemaining, setQuestionTimeRemaining] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  
  // Avatar states
  const [avatarState, setAvatarState] = useState<keyof typeof AVATAR_STATES>('IDLE');
  const [avatarSpeech, setAvatarSpeech] = useState<string>('');
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [isEvaluating, setIsEvaluating] = useState(false);
  
  // Security states
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [windowBlurCount, setWindowBlurCount] = useState(0);
  const [isSecurityViolated, setIsSecurityViolated] = useState(false);
  
  // Refs
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const questionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const securityMonitorRef = useRef<boolean>(false);

  // Initialize session and security
  useEffect(() => {
    initializeSession();
    setupSecurityMonitoring();
    
    return () => {
      cleanup();
    };
  }, []);

  // Session timer effect
  useEffect(() => {
    if (session && sessionTimeRemaining > 0) {
      startSessionTimer();
    }
    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    };
  }, [session, sessionTimeRemaining]);

  // Question timer effect
  useEffect(() => {
    if (questionTimeRemaining > 0) {
      startQuestionTimer();
    }
    return () => {
      if (questionTimerRef.current) {
        clearInterval(questionTimerRef.current);
      }
    };
  }, [questionTimeRemaining]);

  const cleanup = () => {
    // Clear timers
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    
    // Stop media streams
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
    }
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
    }
    
    // Stop speech synthesis
    if (speechSynthesisRef.current) {
      speechSynthesis.cancel();
    }
    
    // Stop speech recognition
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
    }
    
    // Exit fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    
    securityMonitorRef.current = false;
  };

  const initializeSession = async () => {
    try {
      setLoading(true);
      
      // Get session details
      const sessionResponse = await apiService.getInterview(sessionId);
      const sessionData = sessionResponse.data;
      setSession(sessionData);
      
      // Check if session is scheduled and not expired
      const now = new Date();
      const scheduledTime = new Date(sessionData.scheduled_datetime);
      const endTime = new Date(scheduledTime.getTime() + sessionData.duration * 60000);
      
      if (now < scheduledTime) {
        throw new Error('Interview has not started yet');
      }
      
      if (now > endTime) {
        throw new Error('Interview session has expired');
      }
      
      // Calculate remaining session time
      const remainingTime = Math.floor((endTime.getTime() - now.getTime()) / 1000);
      setSessionTimeRemaining(remainingTime);
      
      // Start the interview and get dynamic questions
      await startInterviewSession(sessionData);
      
    } catch (error: any) {
      console.error('Error initializing session:', error);
      showToast(error.message || 'Failed to initialize interview session', 'error');
      onExit();
    } finally {
      setLoading(false);
    }
  };

  const startInterviewSession = async (sessionData: InterviewSession) => {
    try {
      // Request camera and microphone permissions
      await requestMediaPermissions();
      
      // Start the interview session
      const startResponse = await apiService.startInterview(sessionId);
      
      // Generate dynamic questions based on remaining time and difficulty
      const questionsResponse = await apiService.generateDynamicQuestions({
        session_id: sessionId,
        remaining_time: sessionTimeRemaining,
        interview_type: sessionData.category,
        difficulty_level: sessionData.difficulty_level,
        student_profile: sessionData.student
      });
      
      const generatedQuestions = questionsResponse.data.questions;
      setQuestions(generatedQuestions);
      
      // Initialize responses with dynamic time allocations
      initializeResponses(generatedQuestions);
      
      // Enter fullscreen mode for security
      await enterFullscreen();
      
      // Start with first question
      if (generatedQuestions.length > 0) {
        startQuestionWithAvatar(generatedQuestions[0], 0);
      }
      
    } catch (error: any) {
      console.error('Error starting interview:', error);
      throw error;
    }
  };

  const requestMediaPermissions = async () => {
    try {
      // Request video stream
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        }
      });
      
      setVideoStream(videoStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = videoStream;
      }
      
      setCameraPermission('granted');
      
      // Request audio stream
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      
      setAudioStream(audioStream);
      
    } catch (error) {
      console.error('Media permission error:', error);
      setCameraPermission('denied');
      throw new Error('Camera and microphone access is required for the interview');
    }
  };

  const enterFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (error) {
      console.warn('Fullscreen not supported or denied');
    }
  };

  const setupSecurityMonitoring = () => {
    securityMonitorRef.current = true;
    
    // Tab switch detection
    const handleVisibilityChange = () => {
      if (securityMonitorRef.current && document.hidden) {
        recordSecurityEvent('tab_switch', 'Tab switched or window minimized');
        setTabSwitchCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            handleSecurityViolation('Too many tab switches');
          }
          return newCount;
        });
      }
    };
    
    // Window blur detection
    const handleWindowBlur = () => {
      if (securityMonitorRef.current) {
        recordSecurityEvent('window_blur', 'Window lost focus');
        setWindowBlurCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 5) {
            handleSecurityViolation('Too many window focus losses');
          }
          return newCount;
        });
      }
    };
    
    // Copy/paste prevention
    const handleCopyPaste = (e: KeyboardEvent) => {
      if (securityMonitorRef.current && (e.ctrlKey || e.metaKey)) {
        if (e.key === 'c' || e.key === 'C') {
          e.preventDefault();
          recordSecurityEvent('copy_attempt', 'Copy attempt blocked');
        }
        if (e.key === 'v' || e.key === 'V') {
          e.preventDefault();
          recordSecurityEvent('paste_attempt', 'Paste attempt blocked');
        }
      }
    };
    
    // Right-click prevention
    const handleContextMenu = (e: MouseEvent) => {
      if (securityMonitorRef.current) {
        e.preventDefault();
        recordSecurityEvent('right_click', 'Right-click blocked');
      }
    };
    
    // Developer tools detection
    const handleDevTools = (e: KeyboardEvent) => {
      if (securityMonitorRef.current && 
          ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') ||
          (e.key === 'F12')) {
        e.preventDefault();
        recordSecurityEvent('dev_tools', 'Developer tools access attempt');
        handleSecurityViolation('Developer tools access attempted');
      }
    };
    
    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('keydown', handleCopyPaste);
    document.addEventListener('keydown', handleDevTools);
    document.addEventListener('contextmenu', handleContextMenu);
    
    // Cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('keydown', handleCopyPaste);
      document.removeEventListener('keydown', handleDevTools);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  };

  const recordSecurityEvent = (type: SecurityEvent['type'], details: string) => {
    const event: SecurityEvent = {
      type,
      timestamp: Date.now(),
      details
    };
    
    setSecurityEvents(prev => [...prev, event]);
    
    // Report to backend using existing method
    apiService.reportSecurityEvent(sessionId, {
      event_type: event.type,
      event_data: {
        timestamp: event.timestamp,
        details: event.details
      }
    }).catch(console.error);
  };

  const handleSecurityViolation = (reason: string) => {
    setIsSecurityViolated(true);
    showToast(`Security violation: ${reason}. Interview will be terminated.`, 'error');
    
    // Report violation and end session
    setTimeout(() => {
      apiService.invalidateInterviewSession(sessionId).catch(console.error);
      onExit();
    }, 3000);
  };

  const initializeResponses = (questionsList: InterviewQuestion[]) => {
    const responses: QuestionResponse[] = questionsList.map((q, index) => ({
      id: q.id,
      question: q.question_text,
      answer: '',
      timeSpent: 0,
      isAnswered: false,
      maxTimeAllowed: q.time_limit || calculateQuestionTime(q, sessionTimeRemaining, questionsList.length),
      startTime: 0
    }));
    
    setResponses(responses);
  };

  const calculateQuestionTime = (question: InterviewQuestion, totalTime: number, totalQuestions: number): number => {
    // Dynamic time allocation based on difficulty and question type
    const baseTime = Math.floor(totalTime / totalQuestions);
    const difficultyMultiplier = {
      'easy': 0.8,
      'medium': 1.0,
      'hard': 1.3
    }[question.difficulty_level] || 1.0;
    
    return Math.min(Math.floor(baseTime * difficultyMultiplier), 600); // Max 10 minutes per question
  };

  const startQuestionWithAvatar = async (question: InterviewQuestion, index: number) => {
    setCurrentQuestionIndex(index);
    const response = responses[index];
    
    if (response) {
      setQuestionTimeRemaining(response.maxTimeAllowed);
      setQuestionStartTime(Date.now());
      setCurrentAnswer('');
      
      // Avatar speaks the question
      await speakQuestion(question.question_text);
      
      // Set response start time
      setResponses(prev => prev.map((resp, i) => 
        i === index ? { ...resp, startTime: Date.now() } : resp
      ));
    }
  };

  const speakQuestion = async (questionText: string): Promise<void> => {
    return new Promise((resolve) => {
      setAvatarState('SPEAKING');
      setAvatarSpeech(questionText);
      
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(questionText);
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        
        utterance.onend = () => {
          setAvatarState('LISTENING');
          setAvatarSpeech('Listening for your response...');
          resolve();
        };
        
        utterance.onerror = () => {
          setAvatarState('LISTENING');
          setAvatarSpeech('Please provide your answer');
          resolve();
        };
        
        speechSynthesisRef.current = utterance;
        speechSynthesis.speak(utterance);
      } else {
        setAvatarState('LISTENING');
        setAvatarSpeech('Please provide your answer');
        resolve();
      }
    });
  };

  const startRecording = async () => {
    if (!audioStream) {
      showToast('Audio stream not available', 'error');
      return;
    }
    
    try {
      const recorder = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        setAudioChunks([]);
        
        // Convert speech to text
        setIsEvaluating(true);
        setAvatarState('THINKING');
        setAvatarSpeech('Processing your response...');
        
        try {
          const transcriptionResponse = await apiService.transcribeAudio(audioBlob);
          const transcribedText = transcriptionResponse.data.text;
          
          setCurrentAnswer(transcribedText);
          
          // Update response with audio
          setResponses(prev => prev.map((resp, i) => 
            i === currentQuestionIndex 
              ? { ...resp, audioBlob, answer: transcribedText }
              : resp
          ));
          
          setAvatarSpeech('Response recorded. You can edit the text or proceed.');
          
        } catch (error) {
          console.error('Transcription error:', error);
          showToast('Failed to transcribe audio. Please type your answer.', 'error');
          setAvatarSpeech('Transcription failed. Please type your answer.');
        } finally {
          setIsEvaluating(false);
          setAvatarState('LISTENING');
        }
      };
      
      setAudioChunks(chunks);
      setMediaRecorder(recorder);
      recorder.start(1000); // Record in 1-second chunks
      setIsRecording(true);
      
      setAvatarState('LISTENING');
      setAvatarSpeech('Recording your answer...');
      
    } catch (error) {
      console.error('Recording error:', error);
      showToast('Failed to start recording', 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const startSessionTimer = () => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
    }
    
    sessionTimerRef.current = setInterval(() => {
      setSessionTimeRemaining(prev => {
        if (prev <= 1) {
          handleSessionTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startQuestionTimer = () => {
    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current);
    }
    
    questionTimerRef.current = setInterval(() => {
      setQuestionTimeRemaining(prev => {
        if (prev <= 1) {
          handleQuestionTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSessionTimeUp = () => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
    }
    
    showToast('Interview time is up! Submitting your responses...', 'warning');
    handleCompleteInterview();
  };

  const handleQuestionTimeUp = () => {
    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current);
    }
    
    showToast('Time up for this question! Moving to next question...', 'warning');
    
    // Auto-submit current answer
    if (currentAnswer.trim()) {
      handleNextQuestion();
    } else {
      // Move to next question without answer
      moveToNextQuestion();
    }
  };

  const handleNextQuestion = async () => {
    if (isEvaluating) {
      showToast('Please wait for the current response to be processed', 'warning');
      return;
    }
    
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    const currentQuestion = questions[currentQuestionIndex];
    
    // Submit the answer
    try {
      setSubmitting(true);
      
      await apiService.submitAnswer(sessionId, {
        question_id: currentQuestion.id,
        answer_text: currentAnswer,
        time_taken_seconds: timeSpent
        // Note: Audio recording will be handled separately if needed
      });
      
      // Update response
      setResponses(prev => prev.map((resp, index) => 
        index === currentQuestionIndex 
          ? { ...resp, answer: currentAnswer, timeSpent, isAnswered: true }
          : resp
      ));
      
      moveToNextQuestion();
      
    } catch (error) {
      console.error('Error submitting answer:', error);
      showToast('Failed to submit answer', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const moveToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      const nextQuestion = questions[nextIndex];
      startQuestionWithAvatar(nextQuestion, nextIndex);
    } else {
      handleCompleteInterview();
    }
  };

  const handleCompleteInterview = async () => {
    setSubmitting(true);
    
    try {
      cleanup();
      
      // Submit final evaluation
      const completionData = {
        responses: responses.filter(r => r.isAnswered),
        security_events: securityEvents,
        session_duration: (session?.duration || 60) * 60 - sessionTimeRemaining,
        completion_status: isSecurityViolated ? 'terminated' : 'completed'
      };
      
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
    cleanup();
    
    // Report early exit
    apiService.reportSecurityEvent(sessionId, {
      event_type: 'session_exit',
      event_data: {
        timestamp: Date.now(),
        details: 'User exited interview early'
      }
    }).catch(console.error);
    
    onExit();
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <Loading />
      </div>
    );
  }

  if (isSecurityViolated) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <Card className="text-center p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-red-600 mb-2">Security Violation Detected</h3>
          <p className="text-gray-600 mb-4">
            The interview has been terminated due to security policy violations.
          </p>
          <Button onClick={() => router.push('/interviews')} variant="primary">
            Return to Interviews
          </Button>
        </Card>
      </div>
    );
  }

  if (!session || questions.length === 0) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <Card className="text-center p-8">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Interview Not Available
          </h3>
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
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Security Header */}
      <div className={`${isDark ? 'bg-red-900 border-red-700' : 'bg-red-50 border-red-200'} border-b px-4 py-2`}>
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className={`text-sm font-medium ${isDark ? 'text-red-200' : 'text-red-800'}`}>
                SECURE MODE ACTIVE
              </span>
            </div>
            <span className={`text-sm ${isDark ? 'text-red-300' : 'text-red-600'}`}>
              Tab Switches: {tabSwitchCount}/3 | Focus Loss: {windowBlurCount}/5
            </span>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className={`text-sm ${isDark ? 'text-red-200' : 'text-red-800'}`}>
              Session: {formatTime(sessionTimeRemaining)}
            </div>
            <div className={`text-sm ${isDark ? 'text-red-200' : 'text-red-800'}`}>
              Question: {formatTime(questionTimeRemaining)}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExitInterview}
              className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
            >
              Exit Interview
            </Button>
          </div>
        </div>
      </div>

      {/* Main Interview Interface */}
      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Panel - Avatar Interviewer */}
        <div className="w-1/2 flex flex-col">
          {/* Avatar Container */}
          <div className={`flex-1 flex items-center justify-center ${
            isDark ? 'bg-gray-800' : 'bg-white'
          } border-r ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="text-center p-8">
              {/* Avatar Animation */}
              <div className="mb-6">
                <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center ${
                  avatarState === 'SPEAKING' ? 'bg-blue-100 animate-pulse' :
                  avatarState === 'LISTENING' ? 'bg-green-100' :
                  avatarState === 'THINKING' ? 'bg-yellow-100 animate-spin' :
                  'bg-gray-100'
                } transition-all duration-500`}>
                  {avatarState === 'SPEAKING' && (
                    <svg className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z" />
                    </svg>
                  )}
                  {avatarState === 'LISTENING' && (
                    <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  )}
                  {avatarState === 'THINKING' && (
                    <svg className="w-16 h-16 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  )}
                  {avatarState === 'IDLE' && (
                    <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
              </div>
              
              {/* Avatar Speech Bubble */}
              <div className={`max-w-md mx-auto p-4 rounded-lg ${
                isDark ? 'bg-gray-700 text-gray-100' : 'bg-gray-100 text-gray-900'
              }`}>
                <p className="text-lg leading-relaxed">
                  {avatarSpeech || 'Welcome to your interview. Let\'s begin!'}
                </p>
              </div>
              
              {/* Question Display */}
              {currentQuestion && (
                <div className="mt-6">
                  <div className={`p-6 rounded-lg ${
                    isDark ? 'bg-blue-900/20 border-blue-500' : 'bg-blue-50 border-blue-200'
                  } border`}>
                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-sm font-medium ${
                        isDark ? 'text-blue-200' : 'text-blue-800'
                      }`}>
                        Question {currentQuestionIndex + 1} of {questions.length}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        currentQuestion.difficulty_level === 'easy' ? 'bg-green-100 text-green-800' :
                        currentQuestion.difficulty_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {currentQuestion.difficulty_level}
                      </span>
                    </div>
                    
                    <p className={`text-lg font-medium ${
                      isDark ? 'text-blue-100' : 'text-blue-900'
                    }`}>
                      {currentQuestion.question_text}
                    </p>
                    
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className={`text-sm ${
                          questionTimeRemaining < 30 ? 'text-red-600 font-bold animate-pulse' : 
                          isDark ? 'text-blue-200' : 'text-blue-600'
                        }`}>
                          {formatTime(questionTimeRemaining)} remaining
                        </span>
                      </div>
                      
                      <div className="w-32 bg-blue-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${100 - (questionTimeRemaining / responses[currentQuestionIndex]?.maxTimeAllowed * 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - User Response */}
        <div className="w-1/2 flex flex-col">
          {/* User Video */}
          <div className={`h-64 ${isDark ? 'bg-gray-800' : 'bg-gray-100'} relative`}>
            {videoStream && (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            )}
            
            {!videoStream && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-500">Camera not available</p>
                </div>
              </div>
            )}
            
            {/* Recording Indicator */}
            {isRecording && (
              <div className="absolute top-4 left-4 flex items-center space-x-2 bg-red-600 text-white px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Recording</span>
              </div>
            )}
            
            {/* Camera Status */}
            <div className="absolute top-4 right-4">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                cameraPermission === 'granted' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  cameraPermission === 'granted' ? 'bg-white' : 'bg-white animate-pulse'
                }`}></div>
                <span>{cameraPermission === 'granted' ? 'Live' : 'No Camera'}</span>
              </div>
            </div>
          </div>

          {/* Response Area */}
          <div className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-white'} p-6`}>
            {/* Recording Controls */}
            <div className="mb-6">
              <div className="flex items-center justify-center space-x-4">
                <Button
                  variant={isRecording ? 'danger' : 'primary'}
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!audioStream || isEvaluating}
                  size="lg"
                  className="px-8"
                >
                  {isRecording ? (
                    <>
                      <div className="w-3 h-3 bg-white rounded-sm mr-2"></div>
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <div className="w-3 h-3 bg-white rounded-full mr-2"></div>
                      Start Recording
                    </>
                  )}
                </Button>
                
                {isEvaluating && (
                  <div className="flex items-center space-x-2 text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm">Processing...</span>
                  </div>
                )}
              </div>
              
              <p className={`text-center text-sm mt-2 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Click to record your verbal response, or type your answer below
              </p>
            </div>

            {/* Text Response */}
            <div className="mb-6">
              <label className={`block text-sm font-medium mb-2 ${
                isDark ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Your Answer
              </label>
              <textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                rows={8}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                  isDark 
                    ? 'bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                placeholder="Type your answer here or use voice recording above..."
                disabled={isEvaluating}
              />
              
              <div className="flex justify-between mt-2">
                <span className={`text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {currentAnswer.length} characters
                </span>
                <span className={`text-sm flex items-center ${
                  currentAnswer.trim() ? 'text-green-600' : isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {currentAnswer.trim() ? (
                    <>
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Answer provided
                    </>
                  ) : 'No answer yet'}
                </span>
              </div>
            </div>

            {/* Navigation Controls */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => {
                  if (currentQuestionIndex > 0) {
                    const prevIndex = currentQuestionIndex - 1;
                    setCurrentQuestionIndex(prevIndex);
                    setCurrentAnswer(responses[prevIndex]?.answer || '');
                  }
                }}
                disabled={currentQuestionIndex === 0 || isEvaluating}
              >
                Previous Question
              </Button>
              
              <div className="flex items-center space-x-4">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {currentQuestionIndex + 1} / {questions.length}
                </span>
                
                {currentQuestionIndex < questions.length - 1 ? (
                  <Button
                    onClick={handleNextQuestion}
                    disabled={!currentAnswer.trim() || submitting || isEvaluating}
                    isLoading={submitting}
                  >
                    Next Question
                  </Button>
                ) : (
                  <Button
                    onClick={handleCompleteInterview}
                    disabled={!currentAnswer.trim() || submitting || isEvaluating}
                    isLoading={submitting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Complete Interview
                  </Button>
                )}
              </div>
            </div>
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
          <div className={`p-4 rounded-lg ${isDark ? 'bg-red-900/20' : 'bg-red-50'} border border-red-200`}>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-red-800 font-medium">Warning</p>
            </div>
            <p className="text-red-700 mt-2">
              Exiting the interview will be recorded as a security event and may affect your evaluation.
            </p>
          </div>
          
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>
            Are you sure you want to exit this interview? Your progress will be saved but the session will end.
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

export default ProfessionalInterviewSession;
