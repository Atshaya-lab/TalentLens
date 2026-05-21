import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../utils/api';
import { InterviewSession, InterviewQuestion } from '../types';
import { formatTime } from '../utils/helpers';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Loading from '../components/ui/Loading';
import { useToast } from '../hooks';

// Interview phases
type InterviewPhase = 'welcome' | 'setup' | 'interview' | 'complete';

// Question response interface
interface QuestionResponse {
  questionId: number;
  question: string;
  answer: string;
  audioBlob?: Blob;
  timeSpent: number;
  startTime: number;
  endTime?: number;
}

// Security event interface
interface SecurityEvent {
  type: 'tab_switch' | 'window_blur' | 'copy_attempt' | 'paste_attempt' | 'right_click' | 'dev_tools';
  timestamp: number;
  details?: string;
}

const ProfessionalInterview: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // Session state
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [phase, setPhase] = useState<InterviewPhase>('welcome');
  const [isLoading, setIsLoading] = useState(true);
  
  // Interview state
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<QuestionResponse[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  
  // Timer state
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(0);
  const [questionTimeSpent, setQuestionTimeSpent] = useState(0);
  const [sessionStartTime] = useState(Date.now());
  
  // Media state
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // UI state
  const [showExitModal, setShowExitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // Security monitoring
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [warningCount, setWarningCount] = useState(0);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const questionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Get session ID from URL
  useEffect(() => {
    const { session_id } = router.query;
    if (session_id) {
      setSessionId(Number(session_id));
    } else if (router.isReady) {
      showToast('No interview session specified', 'error');
      router.push('/interviews');
    }
  }, [router.query, router.isReady]);

  // Load session data
  useEffect(() => {
    if (!sessionId) return;
    
    const loadSession = async () => {
      try {
        setIsLoading(true);
        
        // Validate session
        const validation = await apiService.validateInterviewSession(sessionId);
        if (!validation.valid) {
          showToast(validation.reason || 'Invalid session', 'error');
          router.push('/interviews');
          return;
        }
        
        // Load session details
        const sessionData = await apiService.getInterviewSession(sessionId);
        setSession(sessionData);
        
        // Check session status
        if (sessionData.status === 'completed') {
          showToast('Interview already completed', 'info');
          router.push(`/interview/${sessionId}/results`);
          return;
        }
        
        setSessionTimeRemaining(validation.remaining_time || 3600);
        setPhase('welcome');
      } catch (error) {
        console.error('Failed to load session:', error);
        showToast('Failed to load interview session', 'error');
        router.push('/interviews');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSession();
  }, [sessionId]);

  // Initialize camera
  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: true
      });
      
      setVideoStream(stream);
      setCameraError(null);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Camera initialization failed:', error);
      setCameraError('Failed to access camera. Please check permissions.');
      showToast('Camera access is required for the interview', 'error');
    }
  };

  // Start interview
  const startInterview = async () => {
    try {
      setIsLoading(true);
      
      // Generate questions
      const questionsData = await apiService.generateDynamicQuestions({
        session_id: sessionId!,
        remaining_time: sessionTimeRemaining,
        interview_type: session?.interview_type || 'technical',
        difficulty_level: session?.difficulty_level || 'intermediate',
        student_profile: {}
      });
      
      setQuestions(questionsData.questions);
      
      // Initialize responses
      const initialResponses = questionsData.questions.map((q: InterviewQuestion) => ({
        questionId: q.id,
        question: q.question_text,
        answer: '',
        timeSpent: 0,
        startTime: Date.now()
      }));
      setResponses(initialResponses);
      
      // For professional interviews, we don't need to call startInterview
      // Questions are already generated dynamically
      
      // Update session status in backend to allow answer submission
      await apiService.updateProfessionalSession(sessionId!, {
        status: 'in_progress',
        started_at: new Date().toISOString()
      });
      if (session) {
        session.status = 'in_progress';
      }
      
      setPhase('interview');
      startQuestionTimer();
    } catch (error) {
      console.error('Failed to start interview:', error);
      showToast('Failed to start interview', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Start question timer
  const startQuestionTimer = () => {
    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current);
    }
    
    questionTimerRef.current = setInterval(() => {
      setQuestionTimeSpent(prev => prev + 1);
    }, 1000);
  };

  // Toggle audio recording (voice-first answers)
  const toggleAudioRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);

        // Auto-transcribe so the answer can be submitted without typing
        try {
          const fd = new FormData();
          fd.append('audio', blob, 'answer.webm');
          const resp = await apiService.transcribeAudio(fd);
          setCurrentAnswer(resp.text);
          showToast('Audio transcribed. Review and edit if needed.', 'success');
        } catch (err) {
          console.error('Transcription failed', err);
          showToast('Could not transcribe audio. You can type your answer.', 'error');
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      console.error('Audio recording error', err);
      showToast('Microphone permission denied', 'error');
    }
  };

  // Play the recorded audio for review
  const playAudio = () => {
    if (!audioBlob) return;
    const url = URL.createObjectURL(audioBlob);
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play();
    } else {
      const audio = new Audio(url);
      audio.play();
    }
  };

  // Submit current answer
  const submitAnswer = async () => {
    let answerText = currentAnswer;

    // If no typed answer but we have audio, transcribe it on the fly
    if (!answerText.trim() && audioBlob) {
      try {
        const fd = new FormData();
        fd.append('audio', audioBlob, 'answer.webm');
        const resp = await apiService.transcribeAudio(fd);
        answerText = resp.text;
        setCurrentAnswer(answerText);
        showToast('Used transcribed audio as your answer', 'info');
      } catch (err) {
        console.error('Transcription failed', err);
        showToast('Unable to transcribe audio. Please type your answer.', 'error');
      }
    }

    if (!answerText.trim()) {
      showToast('Please provide an answer', 'warning');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const currentQuestion = questions[currentQuestionIndex];
      const response = responses[currentQuestionIndex];
      
      // Update response
      const updatedResponse = {
        ...response,
        answer: answerText,
        audioBlob: audioBlob || undefined,
        timeSpent: questionTimeSpent,
        endTime: Date.now()
      };
      
      const updatedResponses = [...responses];
      updatedResponses[currentQuestionIndex] = updatedResponse;
      setResponses(updatedResponses);
      
      // Submit to API
      await apiService.submitAnswer(sessionId!, {
        question_id: currentQuestion.id,
        answer_text: answerText,
        time_taken_seconds: questionTimeSpent
      });
      
      // Move to next question or complete
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setCurrentAnswer('');
        setAudioBlob(null);
        setQuestionTimeSpent(0);
        startQuestionTimer();
      } else {
        await completeInterview();
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
      showToast('Failed to submit answer', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Complete interview
  const completeInterview = async () => {
    try {
      setIsLoading(true);
      
      const actualDuration = Math.floor((Date.now() - sessionStartTime) / 60); // Convert to minutes
      
      // Complete interview using the standard endpoint
      await apiService.completeInterview(sessionId!);
      
      setPhase('complete');
      
      // Redirect to results after a delay
      setTimeout(() => {
        router.push(`/interview/${sessionId}/results`);
      }, 2000);
    } catch (error) {
      console.error('Failed to complete interview:', error);
      showToast('Failed to complete interview', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Record security event
  const recordSecurityEvent = (type: SecurityEvent['type'], details?: string) => {
    const event: SecurityEvent = {
      type,
      timestamp: Date.now(),
      details
    };
    
    setSecurityEvents(prev => [...prev, event]);
    setWarningCount(prev => prev + 1);
    
    // Send to backend
    apiService.recordSecurityEvent(sessionId!, {
      event_type: type,
      event_data: event
    });
    
    // Show warning
    if (warningCount < 3) {
      showToast(`Warning ${warningCount + 1}/3: ${details || 'Security violation detected'}`, 'warning');
    } else {
      showToast('Too many violations. Interview may be terminated.', 'error');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
      if (questionTimerRef.current) {
        clearInterval(questionTimerRef.current);
      }
    };
  }, [videoStream]);

  // Session timer
  useEffect(() => {
    if (phase !== 'interview' || sessionTimeRemaining <= 0) return;
    
    const timer = setInterval(() => {
      setSessionTimeRemaining(prev => {
        if (prev <= 1) {
          completeInterview();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [phase, sessionTimeRemaining]);

  // Ensure camera feed continues in interview phase
  useEffect(() => {
    if (phase === 'interview' && videoStream && videoRef.current) {
      // @ts-ignore – srcObject is fine
      videoRef.current.srcObject = videoStream;
    }
  }, [phase, videoStream]);

  // Security monitoring setup
  useEffect(() => {
    if (phase !== 'interview') return;

    const handleTabChange = () => {
      if (document.hidden) {
        recordSecurityEvent('tab_switch', 'User switched tabs during interview');
      }
    };

    const handleWindowBlur = () => {
      recordSecurityEvent('window_blur', 'Interview window lost focus');
    };

    const handleCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      recordSecurityEvent(
        e.type === 'copy' ? 'copy_attempt' : 'paste_attempt',
        `User attempted to ${e.type} content`
      );
    };

    const handleRightClick = (e: MouseEvent) => {
      e.preventDefault();
      recordSecurityEvent('right_click', 'User attempted right-click');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable F12, Ctrl+Shift+I, Ctrl+U, etc.
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.key === 'u') ||
        (e.ctrlKey && e.shiftKey && e.key === 'C')
      ) {
        e.preventDefault();
        recordSecurityEvent('dev_tools', 'User attempted to open developer tools');
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleTabChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('contextmenu', handleRightClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleTabChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('contextmenu', handleRightClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [phase]);

  // Render loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Loading size="lg" text="Loading interview..." />
      </div>
    );
  }

  // Render based on phase
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {renderPhase()}
      {renderExitModal()}
    </div>
  );

  // Render different phases
  function renderPhase() {
    switch (phase) {
      case 'welcome':
        return renderWelcomePhase();
      case 'setup':
        return renderSetupPhase();
      case 'interview':
        return renderInterviewPhase();
      case 'complete':
        return renderCompletePhase();
      default:
        return null;
    }
  }

  // Render welcome phase
  function renderWelcomePhase() {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
          <div className="p-12 text-center">
            {/* Header */}
            <div className="mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                Professional Interview
              </h1>
              <p className="text-lg text-gray-600">
                Welcome to your {session?.interview_type || 'technical'} interview
              </p>
            </div>

            {/* Interview details */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 mb-8">
              <div className="grid grid-cols-2 gap-4 text-left">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Interview Type</p>
                  <p className="font-semibold text-gray-900 capitalize">
                    {session?.interview_type || 'Technical'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Difficulty</p>
                  <p className="font-semibold text-gray-900 capitalize">
                    {session?.difficulty_level || 'Intermediate'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Duration</p>
                  <p className="font-semibold text-gray-900">
                    {formatTime(sessionTimeRemaining)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Questions</p>
                  <p className="font-semibold text-gray-900">
                    {session?.total_questions || 'Dynamic'}
                  </p>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="text-left mb-8 space-y-3">
              <h3 className="font-semibold text-gray-900 mb-3">Before we begin:</h3>
              <div className="space-y-2">
                {[
                  'Ensure you have a stable internet connection',
                  'Find a quiet environment with good lighting',
                  'Have your camera and microphone ready',
                  'Close unnecessary browser tabs and applications',
                  'Be prepared to share your screen if required'
                ].map((instruction, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-gray-700">{instruction}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowExitModal(true)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                size="lg"
                onClick={() => setPhase('setup')}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
              >
                Continue to Setup
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Render setup phase
  function renderSetupPhase() {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-4xl w-full border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
          <div className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Camera & Audio Setup
              </h2>
              <p className="text-gray-600">
                Let&apos;s make sure your camera and microphone are working properly
              </p>
            </div>

            {/* Camera preview */}
            <div className="mb-8">
              <div className="relative bg-black rounded-2xl overflow-hidden aspect-video">
                {cameraError ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <div className="text-center">
                      <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p className="text-white mb-2">{cameraError}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={initializeCamera}
                        className="text-white border-white hover:bg-white hover:text-gray-900"
                      >
                        Retry Camera Access
                      </Button>
                    </div>
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                )}
                
                {/* Camera controls overlay */}
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                  <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
                    <p className="text-white text-sm">
                      {cameraError ? 'Camera not available' : 'Camera active'}
                    </p>
                  </div>
                  
                  {!cameraError && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={initializeCamera}
                      className="bg-black/50 backdrop-blur-sm text-white border-white/50 hover:bg-white/20"
                    >
                      Test Camera
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Setup checklist */}
            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-4">Pre-interview Checklist</h3>
              <div className="space-y-3">
                {[
                  { label: 'Camera is working', checked: !cameraError && videoStream !== null },
                  { label: 'Microphone is enabled', checked: true },
                  { label: 'Good lighting conditions', checked: true },
                  { label: 'Quiet environment', checked: true }
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      item.checked 
                        ? 'bg-emerald-100' 
                        : 'bg-gray-200'
                    }`}>
                      {item.checked && (
                        <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <p className={`${item.checked ? 'text-gray-900' : 'text-gray-500'}`}>
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setPhase('welcome')}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                size="lg"
                onClick={startInterview}
                disabled={cameraError !== null}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-500"
              >
                Start Interview
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Render interview phase
  function renderInterviewPhase() {
    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
      <div className="min-h-screen flex">
        {/* Main content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-white shadow-sm border-b border-gray-200">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Time remaining: {formatTime(sessionTimeRemaining)}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-600">
                    Security Status: 
                    <span className={`ml-2 font-medium ${warningCount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {warningCount > 0 ? `${warningCount} warning(s)` : 'Good'}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowExitModal(true)}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Exit Interview
                  </Button>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Question content */}
          <div className="flex-1 flex">
            {/* Question panel */}
            <div className="flex-1 p-8">
              <Card className="h-full border-0 shadow-lg">
                <div className="p-8 h-full flex flex-col">
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                        <span className="text-white font-semibold">Q{currentQuestionIndex + 1}</span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          {currentQuestion?.question_type || 'General'} Question
                        </p>
                        <p className="text-xs text-gray-500">
                          Time spent: {formatTime(questionTimeSpent)}
                        </p>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      {currentQuestion?.question_text}
                    </h3>
                    
                    {currentQuestion?.time_limit && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2 inline-flex items-center gap-2">
                        <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-orange-700">
                          Recommended time: {formatTime(currentQuestion.time_limit)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Answer input */}
                  <div className="flex-1 flex flex-col">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Answer
                    </label>
                    <textarea
                      value={currentAnswer}
                      onChange={(e) => setCurrentAnswer(e.target.value)}
                      placeholder="Type your answer here..."
                      className="flex-1 w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                      disabled={isSubmitting}
                    />
                    
                    {/* Character count */}
                    <div className="mt-2 text-right">
                      <span className="text-sm text-gray-500">
                        {currentAnswer.length} characters
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="mt-6 flex gap-4">
                    {currentQuestionIndex > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCurrentQuestionIndex(prev => prev - 1);
                          setCurrentAnswer(responses[currentQuestionIndex - 1].answer);
                        }}
                        disabled={isSubmitting}
                      >
                        Previous
                      </Button>
                    )}
                    
                    <Button
                      onClick={submitAnswer}
                      disabled={isSubmitting || (!currentAnswer.trim() && !audioBlob)}
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                    >
                      {isSubmitting ? 'Submitting...' : 
                       currentQuestionIndex === questions.length - 1 ? 'Submit & Complete' : 'Submit & Next'}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            {/* Video panel */}
            <div className="w-96 bg-gray-50 p-6 border-l border-gray-200">
              <div className="sticky top-6">
                <h3 className="text-sm font-medium text-gray-700 mb-4">Your Video</h3>
                <div className="relative bg-black rounded-xl overflow-hidden aspect-video mb-4">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Recording indicator */}
                  {isRecording && (
                    <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      <span className="text-xs font-medium">Recording</span>
                    </div>
                  )}
                </div>

                {/* Audio recording controls */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Audio Response (Optional)</h4>
                  <div className="flex items-center gap-3">
                    <Button
                      variant={isRecording ? 'danger' : 'outline'}
                      size="sm"
                      onClick={toggleAudioRecording}
                      className="flex-1"
                    >
                      {isRecording ? 'Stop Recording' : 'Start Recording'}
                    </Button>
                    {audioBlob && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={playAudio}
                      >
                        Play
                      </Button>
                    )}
                  </div>
                  {recordingDuration > 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      Duration: {formatTime(recordingDuration)}
                    </p>
                  )}
                </div>

                {/* Tips */}
                <div className="mt-6 bg-blue-50 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Tips</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Take your time to think before answering</li>
                    <li>• Be clear and concise in your responses</li>
                    <li>• Use examples when applicable</li>
                    <li>• Stay calm and confident</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render complete phase
  function renderCompletePhase() {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
          <div className="p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Interview Completed!
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Thank you for completing your interview. Your responses have been submitted successfully.
            </p>
            
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 mb-8">
              <div className="grid grid-cols-2 gap-4 text-left">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Questions Answered</p>
                  <p className="text-2xl font-bold text-gray-900">{questions.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Duration</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatTime(Math.floor((Date.now() - sessionStartTime) / 1000))}
                  </p>
                </div>
              </div>
            </div>
            
            <p className="text-gray-600 mb-6">
              Redirecting to results page...
            </p>
            
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Render exit modal
  function renderExitModal() {
    return (
      <Modal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        title="Exit Interview?"
      >
        <div className="p-6">
          <p className="text-gray-600 mb-6">
            Are you sure you want to exit the interview? Your progress will be saved, but you may not be able to resume.
          </p>
          
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => setShowExitModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                router.push('/interviews');
              }}
              className="flex-1"
            >
              Exit Interview
            </Button>
          </div>
        </div>
      </Modal>
    );
  }
};

export default ProfessionalInterview;
