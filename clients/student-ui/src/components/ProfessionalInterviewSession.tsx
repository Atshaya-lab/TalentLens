import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import apiService from '../utils/api';
import { InterviewSession, InterviewQuestion } from '../types';
import { formatTime } from '../utils/helpers';
import Button from './ui/Button';
import Card from './ui/Card';
import Modal from './ui/Modal';
import Loading from './ui/Loading';

// Self-contained hooks to avoid context provider issues
const useSimpleToast = () => {
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    console.log(`[${type.toUpperCase()}]: ${message}`);
    // For development, you can also use alerts
    // alert(`${type.toUpperCase()}: ${message}`);
  }, []);

  return { showToast };
};

const useSimpleTheme = () => {
  const [isDark, setIsDark] = useState(false);
  
  useEffect(() => {
    // Check if dark mode is enabled via CSS class or system preference
    const isDarkMode = document.documentElement.classList.contains('dark') ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDark(isDarkMode);
  }, []);

  return { isDark };
};

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
  const { isDark } = useSimpleTheme();
  const { showToast } = useSimpleToast();

  // Core state
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<QuestionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Timer and session state
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(0);
  const [questionTimeRemaining, setQuestionTimeRemaining] = useState(0);
  const [sessionStartTime] = useState(Date.now());
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Avatar and interview state
  const [avatarState, setAvatarState] = useState<keyof typeof AVATAR_STATES>('IDLE');
  const [interviewPhase, setInterviewPhase] = useState<'intro' | 'questioning' | 'complete'>('intro');
  const [currentAnswer, setCurrentAnswer] = useState('');
  
  // Audio recording state (voice-only interface)
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [hasRecorded, setHasRecorded] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const recordingTimerRef = useRef<number | null>(null);
  
  // Security monitoring
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [warningCount, setWarningCount] = useState(0);
  const [isSessionInvalidated, setIsSessionInvalidated] = useState(false);
  
  // UI state
  const [showExitModal, setShowExitModal] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Security monitoring setup
  useEffect(() => {
    const handleTabChange = () => {
      if (!isCompleted && !isSessionInvalidated) {
        recordSecurityEvent('tab_switch', 'User switched tabs during interview');
      }
    };

    const handleWindowBlur = () => {
      if (!isCompleted && !isSessionInvalidated) {
        recordSecurityEvent('window_blur', 'Interview window lost focus');
      }
    };

    const handleCopyPaste = (e: ClipboardEvent) => {
      if (!isCompleted && !isSessionInvalidated) {
        e.preventDefault();
        recordSecurityEvent(
          e.type === 'copy' ? 'copy_attempt' : 'paste_attempt',
          `User attempted to ${e.type} content`
        );
      }
    };

    const handleRightClick = (e: MouseEvent) => {
      if (!isCompleted && !isSessionInvalidated) {
        e.preventDefault();
        recordSecurityEvent('right_click', 'User attempted right-click');
      }
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
  }, [isCompleted, isSessionInvalidated]);

  // Add videoStream state for camera
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true); // Toggle for video stream

  // Initialize camera with simplified and robust approach
  useEffect(() => {
    let stream: MediaStream | null = null;
    let isMounted = true;
    let videoInitTimeout: NodeJS.Timeout | null = null;

    const initCamera = async () => {
      try {
        console.log('Requesting camera access...');
        
        // Request video and audio with simplified constraints
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          }, 
          audio: true
        });
        
        if (!isMounted) return;
        
        console.log('Camera access granted, setting stream...', stream);
        console.log('Video tracks:', stream.getVideoTracks());
        console.log('Audio tracks:', stream.getAudioTracks());
        
        // Check if tracks are active
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          console.log('Video track state:', videoTrack.readyState, videoTrack.enabled);
        }
        
        setVideoStream(stream);
        setCameraError(null);
        
        // Set video source with timeout fallback
        if (videoRef.current && stream) {
          console.log('Setting video srcObject...');
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.playsInline = true;
          videoRef.current.autoplay = true;
          
          // Set a timeout to mark video as ready if events don't fire
          videoInitTimeout = setTimeout(() => {
            if (isMounted && !videoReady) {
              console.log('Video initialization timeout - forcing ready state');
              setVideoReady(true);
            }
          }, 3000); // 3 second timeout
          
          // Simple event handlers
          const handleVideoReady = () => {
            console.log('Video is ready to play');
            if (videoInitTimeout) {
              clearTimeout(videoInitTimeout);
              videoInitTimeout = null;
            }
            setVideoReady(true);
          };
          
          const handleVideoError = (e: Event) => {
            console.error('Video error:', e);
            if (videoInitTimeout) {
              clearTimeout(videoInitTimeout);
              videoInitTimeout = null;
            }
            setCameraError('Video display failed');
            setVideoReady(false);
          };
          
          // Add event listeners
          videoRef.current.addEventListener('loadedmetadata', handleVideoReady);
          videoRef.current.addEventListener('canplay', handleVideoReady);
          videoRef.current.addEventListener('playing', handleVideoReady);
          videoRef.current.addEventListener('error', handleVideoError);
          
          // Force video to play
          try {
            await videoRef.current.play();
            console.log('Video play() succeeded');
            handleVideoReady();
          } catch (playError) {
            console.error('Video play() failed:', playError);
            // Don't set error immediately, let timeout handle it
          }
        }
        
      } catch (error) {
        console.error('Camera access error:', error);
        if (!isMounted) return;
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown camera error';
        setCameraError(`Camera access failed: ${errorMessage}`);
        showToast('Camera access is required for the interview', 'error');
        
        // Show specific error messages
        if (errorMessage.includes('Permission denied')) {
          showToast('Please allow camera access and refresh the page', 'error');
        } else if (errorMessage.includes('not found') || errorMessage.includes('NotFoundError')) {
          showToast('No camera found. Please connect a camera and try again', 'error');
        }
      }
    };

    // Initialize camera immediately
    initCamera();

    return () => {
      isMounted = false;
      if (videoInitTimeout) {
        clearTimeout(videoInitTimeout);
      }
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('Stopped camera track:', track.kind);
        });
      }
    };
  }, []);

  // Load session data
  useEffect(() => {
    let isActive = true; // Cleanup guard
    
    const loadSession = async () => {
      if (!isActive) return; // Prevent multiple calls
      
      try {
        setIsLoading(true);
        
        // First, load session details to check status
        const sessionData = await apiService.getInterviewSession(sessionId);
        if (!isActive) return; // Check if component is still mounted
        
        setSession(sessionData);
        
        // If interview is completed, redirect to results page
        if (sessionData.status === 'completed') {
          showToast('Interview is already completed. Redirecting to results...', 'info');
          // Use router.replace for better navigation without adding to history
          setIsLoading(false);
          setTimeout(() => {
            if (isActive) {
              try {
                // Use query parameter approach for more reliable navigation
                router.replace(`/interview/results?session_id=${sessionId}`);
              } catch (navError) {
                console.error('Navigation error:', navError);
                // Fallback to window.location if router fails
                window.location.href = `/interview/results?session_id=${sessionId}`;
              }
            }
          }, 1500);
          return;
        }
        
        // If interview is cancelled, missed, or terminated, redirect to interviews list
        if (sessionData.status === 'cancelled' || sessionData.status === 'missed' || sessionData.status === 'terminated') {
          const message = sessionData.status === 'terminated' 
            ? 'Interview was terminated due to security violations'
            : `Interview was ${sessionData.status}`;
          showToast(message, 'error');
          setIsLoading(false);
          setTimeout(() => {
            try {
              onExit();
            } catch (exitError) {
              console.error('Exit error:', exitError);
              // Fallback navigation
              window.location.href = '/interviews';
            }
          }, 1500);
          return;
        }
        
        // For non-completed interviews, validate session
        const validation = await apiService.validateInterviewSession(sessionId);
        if (!isActive) return; // Check if component is still mounted
        
        if (!validation.valid) {
          showToast(validation.reason || 'Session validation failed', 'error');
          
          // Check if there's specific redirect information
          if (validation.redirect_to === 'results') {
            setTimeout(() => {
              if (isActive) {
                try {
                  router.replace(`/interview/results?session_id=${sessionId}`);
                } catch (navError) {
                  window.location.href = `/interview/results?session_id=${sessionId}`;
                }
              }
            }, 1500);
          } else if (validation.redirect_to === 'interviews') {
            setTimeout(() => {
              if (isActive) {
                try {
                  onExit();
                } catch (exitError) {
                  window.location.href = '/interviews';
                }
              }
            }, 1500);
          } else {
            onExit();
          }
          setIsLoading(false);
          return;
        }
        
        // Only generate questions for valid, non-completed sessions
        let questionsData;
        try {
          questionsData = await apiService.generateDynamicQuestions({
            session_id: sessionId,
            remaining_time: validation.remaining_time || 3600,
            interview_type: sessionData.category || 'technical',
            difficulty_level: sessionData.difficulty_level || 'medium',
            student_profile: {}
          });
        } catch (questionError) {
          console.error('Failed to generate questions:', questionError);
          
          // Handle specific error cases
          if (questionError?.response?.status === 400) {
            const errorMessage = questionError.response.data?.error || 'Invalid request for question generation';
            showToast(errorMessage, 'error');
            
            // If it's because interview is completed, redirect to results
            if (errorMessage.includes('completed')) {
              setTimeout(() => {
                if (isActive) {
                  router.replace(`/interview/results?session_id=${sessionId}`);
                }
              }, 1500);
              return;
            }
          } else {
            showToast('Failed to generate interview questions. Please try again.', 'error');
          }
          
          onExit();
          return;
        }
        
        if (!isActive) return; // Check if component is still mounted
        
        setQuestions(questionsData.questions || []);
        const timeRemaining = validation.remaining_time || 3600;
        console.log('Setting session time remaining to:', timeRemaining); // Debug log
        setSessionTimeRemaining(timeRemaining);
        
        // Initialize responses only if we have questions
        if (questionsData.questions && questionsData.questions.length > 0) {
          const initialResponses = questionsData.questions.map((q: InterviewQuestion, index: number) => ({
            id: q.id,
            question: q.question_text,
            answer: '',
            timeSpent: 0,
            isAnswered: false,
            maxTimeAllowed: q.time_limit || 300,
            startTime: 0
          }));
          setResponses(initialResponses);
        } else {
          showToast('No questions available for this interview', 'error');
          onExit();
          return;
        }
        
      } catch (error) {
        console.error('Error loading session:', error);
        let errorMessage = 'Failed to load interview session';
        
        // Handle specific error types
        if (error?.response?.status === 404) {
          errorMessage = 'Interview session not found';
        } else if (error?.response?.status === 403) {
          errorMessage = 'You are not authorized to access this interview';
        } else if (error?.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        showToast(errorMessage, 'error');
        onExit();
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    if (sessionId) {
      loadSession();
    }
    
    return () => {
      isActive = false; // Cleanup function
    };
  }, [sessionId]);

  // Session timer
  useEffect(() => {
    if (!session || isPaused || isCompleted || sessionTimeRemaining <= 0) return;

    const timer = setInterval(() => {
      setSessionTimeRemaining(prev => {
        if (prev <= 1) {
          console.log('Session time expired, completing interview');
          completeInterview();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session, isPaused, isCompleted, sessionTimeRemaining]);

  // Question timer
  useEffect(() => {
    if (!questions.length || isPaused || isCompleted || interviewPhase !== 'questioning') return;

    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    const timer = setInterval(() => {
      setQuestionTimeRemaining(prev => {
        if (prev <= 1) {
          // Auto-advance to next question
          handleNextQuestion();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestionIndex, questions, isPaused, isCompleted, interviewPhase]);

  // Start question timer when question changes
  useEffect(() => {
    if (questions.length && interviewPhase === 'questioning') {
      const currentQuestion = questions[currentQuestionIndex];
      if (currentQuestion) {
        setQuestionTimeRemaining(currentQuestion.time_limit || 300);
        
        // Update response start time
        setResponses(prev => prev.map((r, index) => 
          index === currentQuestionIndex 
            ? { ...r, startTime: Date.now() }
            : r
        ));
      }
    }
  }, [currentQuestionIndex, questions, interviewPhase]);

  const recordSecurityEvent = useCallback(async (type: SecurityEvent['type'], details: string) => {
    const event: SecurityEvent = {
      type,
      timestamp: Date.now(),
      details
    };

    setSecurityEvents(prev => [...prev, event]);
    setWarningCount(prev => prev + 1);

    try {
      await apiService.recordSecurityEvent(sessionId, {
        event_type: type,
        event_data: { details, timestamp: event.timestamp }
      });
    } catch (error) {
      console.error('Failed to record security event:', error);
    }

    // Check if session should be invalidated
    if (warningCount >= 2 || type === 'dev_tools') {
      invalidateSession('Too many security violations');
    }
  }, [sessionId, warningCount]);

  const invalidateSession = useCallback(async (reason: string) => {
    try {
      await apiService.invalidateInterviewSession(sessionId, { reason });
      setIsSessionInvalidated(true);
      showToast('Interview session has been terminated due to security violations', 'error');
      setTimeout(() => onExit(), 3000);
    } catch (error) {
      console.error('Failed to invalidate session:', error);
    }
  }, [sessionId, onExit]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        setHasRecorded(true);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      setAvatarState('LISTENING');
      
      // Start recording timer
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      showToast('Microphone access is required for voice responses', 'error');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAvatarState('THINKING');
      
      // Clear recording timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  }, [isRecording]);

  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    if (!audioBlob) return '';

    try {
      setIsTranscribing(true);
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const result = await apiService.transcribeAudio(formData);
      return result.text || '';
    } catch (error) {
      console.error('Transcription failed:', error);
      showToast('Voice recorded - transcription will be processed later', 'info');
      // Return a placeholder indicating voice was recorded
      return `[Voice response recorded at ${new Date().toLocaleTimeString()}]`;
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const toggleCamera = useCallback(async () => {
    try {
      if (isCameraEnabled && videoStream) {
        // Turn off camera
        videoStream.getVideoTracks().forEach(track => {
          track.enabled = false;
          console.log('Disabled camera track:', track.label);
        });
        setIsCameraEnabled(false);
        showToast('Camera turned off', 'info');
      } else {
        // Turn on camera
        if (videoStream) {
          videoStream.getVideoTracks().forEach(track => {
            track.enabled = true;
            console.log('Enabled camera track:', track.label);
          });
        } else {
          // Re-initialize camera if stream was lost
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
              video: { 
                width: { ideal: 640 }, 
                height: { ideal: 480 }, 
                facingMode: 'user' 
              }, 
              audio: false 
            });
            setVideoStream(stream);
            setCameraError(null);
            
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              await videoRef.current.play();
              setVideoReady(true);
            }
          } catch (error) {
            console.error('Failed to re-initialize camera:', error);
            setCameraError('Failed to turn on camera');
            showToast('Failed to turn on camera', 'error');
            return;
          }
        }
        setIsCameraEnabled(true);
        showToast('Camera turned on', 'success');
      }
    } catch (error) {
      console.error('Error toggling camera:', error);
      showToast('Failed to toggle camera', 'error');
    }
  }, [isCameraEnabled, videoStream]);

  const handleAnswerChange = useCallback((value: string) => {
    // Voice-only interface - no text input changes
    setCurrentAnswer(value);
    
    // Update response in real-time
    setResponses(prev => prev.map((r, index) => 
      index === currentQuestionIndex 
        ? { ...r, answer: value }
        : r
    ));
  }, [currentQuestionIndex]);

  const handleNextQuestion = useCallback(async () => {
    if (currentQuestionIndex >= questions.length - 1) {
      completeInterview();
      return;
    }

    // If there's an audio recording, transcribe it and save the answer
    let finalAnswer = currentAnswer;
    if (audioBlob && hasRecorded) {
      try {
        setIsTranscribing(true);
        const transcribedText = await transcribeAudio(audioBlob);
        if (transcribedText.trim()) {
          finalAnswer = transcribedText;
          setCurrentAnswer(transcribedText);
          showToast('Voice response processed successfully', 'success');
        } else {
          finalAnswer = `[Voice response recorded at ${new Date().toLocaleTimeString()}]`;
          showToast('Voice recorded - will be processed later', 'info');
        }
      } catch (error) {
        console.error('Transcription error:', error);
        finalAnswer = `[Voice response recorded at ${new Date().toLocaleTimeString()}]`;
        showToast('Voice recorded - will be processed later', 'info');
      } finally {
        setIsTranscribing(false);
      }
    } else if (hasRecorded) {
      // Fallback if hasRecorded is true but no audioBlob
      finalAnswer = `[Voice response recorded at ${new Date().toLocaleTimeString()}]`;
    }

    // Mark current question as answered with the transcribed text or fallback
    setResponses(prev => prev.map((r, index) => 
      index === currentQuestionIndex 
        ? { 
            ...r, 
            answer: finalAnswer, // Use transcribed text or fallback
            isAnswered: true, 
            timeSpent: Date.now() - r.startTime,
            audioBlob: audioBlob || undefined
          }
        : r
    ));

    // Move to next question
    setCurrentQuestionIndex(prev => prev + 1);
    setCurrentAnswer('');
    setAudioBlob(null);
    setHasRecorded(false);
    setRecordingDuration(0);
    setAvatarState('SPEAKING');
    
    // Brief pause for avatar to "ask" next question
    setTimeout(() => setAvatarState('IDLE'), 1500);
  }, [currentQuestionIndex, questions.length, audioBlob, currentAnswer, hasRecorded, transcribeAudio]);

  const completeInterview = useCallback(async () => {
    if (isCompleted) return; // Prevent multiple completion attempts
    
    try {
      setIsCompleted(true);
      setInterviewPhase('complete');
      setIsSubmitting(true);

      // Handle the current question if there's a recording
      let finalResponses = [...responses];
      if (audioBlob && hasRecorded) {
        try {
          setIsTranscribing(true);
          const transcribedText = await transcribeAudio(audioBlob);
          const finalAnswer = transcribedText.trim() || `[Voice response recorded at ${new Date().toLocaleTimeString()}]`;
          
          finalResponses = finalResponses.map((r, index) => 
            index === currentQuestionIndex 
              ? { 
                  ...r, 
                  answer: finalAnswer,
                  isAnswered: true, 
                  timeSpent: Date.now() - r.startTime,
                  audioBlob: audioBlob
                }
              : r
          );
          setResponses(finalResponses);
        } catch (error) {
          console.error('Final transcription error:', error);
          finalResponses = finalResponses.map((r, index) => 
            index === currentQuestionIndex 
              ? { 
                  ...r, 
                  answer: `[Voice response recorded at ${new Date().toLocaleTimeString()}]`,
                  isAnswered: true, 
                  timeSpent: Date.now() - r.startTime,
                  audioBlob: audioBlob
                }
              : r
          );
          setResponses(finalResponses);
        } finally {
          setIsTranscribing(false);
        }
      } else if (hasRecorded) {
        // Handle case where we have hasRecorded but no audioBlob
        finalResponses = finalResponses.map((r, index) => 
          index === currentQuestionIndex 
            ? { 
                ...r, 
                answer: `[Voice response recorded at ${new Date().toLocaleTimeString()}]`,
                isAnswered: true, 
                timeSpent: Date.now() - r.startTime
              }
            : r
        );
        setResponses(finalResponses);
      }

      // Submit all responses (including voice recordings)
      for (let i = 0; i < finalResponses.length; i++) {
        const response = finalResponses[i];
        // Submit if there's any answer text OR if the question was marked as answered
        if (response.answer.trim() || response.isAnswered) {
          const answerText = response.answer.trim() || `[Voice response provided for question ${i + 1}]`;
          try {
            console.log(`Submitting response ${i + 1}:`, {
              session_id: sessionId,
              question_id: response.id,
              response_text: answerText,
              time_spent: response.timeSpent || 0
            });
            await apiService.submitInterviewResponse({
              session_id: sessionId,
              question_id: response.id,
              response_text: answerText,
              time_spent: response.timeSpent || 0,
              audio_recording_url: response.audioBlob ? 'audio_recording_placeholder' : null
            });
            console.log(`Successfully submitted response ${i + 1}`);
          } catch (error) {
            console.error(`Failed to submit response ${i + 1}:`, error);
            // Continue with other responses even if one fails
          }
        } else {
          console.log(`Skipping response ${i + 1} - no answer or not marked as answered`);
        }
      }

      // Complete the session
      await apiService.completeInterviewSession(sessionId, {
        actual_duration: Math.floor((Date.now() - sessionStartTime) / 1000 / 60),
        security_events: securityEvents
      });

      showToast('Interview completed successfully!', 'success');
      
      // Get results
      const results = await apiService.getInterviewResults(sessionId);
      
      // Call completion handler with a delay to avoid navigation conflicts
      setTimeout(() => {
        if (session) {
          onComplete({ ...session, status: 'completed' });
        }
      }, 2000);

    } catch (error) {
      console.error('Error completing interview:', error);
      showToast('Failed to submit interview responses', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [responses, sessionId, sessionStartTime, securityEvents, session, onComplete, isCompleted]);

  const handleStartInterview = useCallback(() => {
    setShowInstructions(false);
    setInterviewPhase('questioning');
    setAvatarState('SPEAKING');
    
    // Enter fullscreen
    document.documentElement.requestFullscreen?.();
    setIsFullscreen(true);
    
    // Brief pause for avatar to "introduce" first question
    setTimeout(() => setAvatarState('IDLE'), 3000);
  }, []);

  const handleExitInterview = useCallback(() => {
    setShowExitModal(true);
  }, []);

  const confirmExit = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    onExit();
  }, [onExit]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (isSessionInvalidated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 dark:bg-red-900">
        <Card className="max-w-md mx-auto text-center p-8">
          <div className="text-red-600 dark:text-red-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Interview Terminated
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Your interview session has been terminated due to security violations.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You will be redirected shortly...
          </p>
        </Card>
      </div>
    );
  }

  if (showInstructions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-accent-50 to-neutral-100 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 flex items-center justify-center p-4">
        <Card className="max-w-4xl mx-auto p-10 shadow-2xl border-0 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm">
          {/* Header Section */}
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-r from-accent-600 to-accent-700 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-neutral-900 to-neutral-700 dark:from-white dark:to-neutral-300 bg-clip-text text-transparent mb-4">
              Voice-Only Professional Interview
            </h1>
            <div className="flex items-center justify-center space-x-4 text-lg text-neutral-600 dark:text-neutral-300">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-accent-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span>{Math.floor(sessionTimeRemaining / 60)} minutes</span>
              </div>
              <div className="w-1 h-1 bg-neutral-400 rounded-full"></div>
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>{questions.length} questions</span>
              </div>
              <div className="w-1 h-1 bg-neutral-400 rounded-full"></div>
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-accent-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>AI Evaluated</span>
              </div>
            </div>
            <p className="text-neutral-600 dark:text-neutral-300 mt-4 max-w-2xl mx-auto leading-relaxed">
              You&apos;re about to begin a comprehensive professional interview. This session will evaluate your technical skills, 
              problem-solving abilities, and communication style through adaptive questioning.
            </p>
          </div>

          {/* Instructions Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            {/* Security Requirements */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-6 shadow-sm">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="font-bold text-amber-800 dark:text-amber-200 text-lg">
                  Security Protocol
                </h3>
              </div>
              <ul className="space-y-3 text-sm text-amber-700 dark:text-amber-300">
                <li className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Remain in this browser window throughout the session</span>
                </li>
                <li className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Camera and microphone access is required</span>
                </li>
                <li className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>No external tools or applications during the interview</span>
                </li>
                <li className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>All interactions are monitored and recorded</span>
                </li>
              </ul>
            </div>

            {/* Interview Format */}
            <div className="bg-gradient-to-br from-accent-50 to-accent-100 dark:from-accent-900/20 dark:to-accent-800/20 border border-accent-200 dark:border-accent-700 rounded-xl p-6 shadow-sm">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-accent-100 dark:bg-accent-900/50 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-accent-600 dark:text-accent-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a2 2 0 002 2h2a2 2 0 002-2V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm8 8a1 1 0 100-2 1 1 0 000 2zm-3-1a1 1 0 11-2 0 1 1 0 012 0zm-2 3a1 1 0 100-2 1 1 0 000 2zm3-1a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="font-bold text-accent-800 dark:text-accent-200 text-lg">
                  Session Format
                </h3>
              </div>
              <ul className="space-y-3 text-sm text-accent-700 dark:text-accent-300">
                <li className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-accent-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Dynamic questioning based on your responses</span>
                </li>
                <li className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-accent-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Time limits for each question (varies by complexity)</span>
                </li>
                <li className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-accent-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span><strong>Voice-only responses</strong> - All answers must be recorded using your microphone</span>
                </li>
                <li className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-accent-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Immediate results and detailed feedback available</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Success Tips */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-6 mb-8 shadow-sm">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <h3 className="font-bold text-emerald-800 dark:text-emerald-200 text-lg">
                Success Tips
              </h3>
            </div>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-emerald-700 dark:text-emerald-300">
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">💭</span>
                  <span>Take time to think before responding</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">📝</span>
                  <span>Provide specific examples and details</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">🎯</span>
                  <span>Stay focused and organized in your answers</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">⏰</span>
                  <span>Use the full time available for each question</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">❓</span>
                  <span>Ask for clarification if needed</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">🗣️</span>
                  <span>Speak clearly if using voice responses</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-6">
            <Button
              variant="secondary"
              onClick={handleExitInterview}
              className="px-8 py-3 text-base"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Cancel Interview
            </Button>
            <Button
              variant="primary"
              onClick={handleStartInterview}
              className="px-12 py-3 text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.01M15 10h1.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Begin Interview
            </Button>
          </div>

          {/* Footer Note */}
          <div className="text-center mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This interview uses advanced AI to evaluate your responses and provide personalized feedback.
              <br />
              <span className="text-xs">Ensure you have a stable internet connection and quiet environment.</span>
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (interviewPhase === 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="max-w-lg mx-auto text-center p-8">
          {isSubmitting ? (
            <>
              <Loading size="lg" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-4 mb-2">
                Submitting Your Responses
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Please wait while we process your interview...
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Interview Completed!
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Thank you for completing the interview. Your responses have been submitted for evaluation.
              </p>
              <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
                <p>Questions answered: {responses.filter(r => r.isAnswered).length}/{questions.length}</p>
                <p>Time taken: {formatTime(Math.floor((Date.now() - sessionStartTime) / 1000))}</p>
                <p>Security events: {securityEvents.length}</p>
              </div>
              <Button
                variant="primary"
                onClick={confirmExit}
                className="w-full"
              >
                Return to Dashboard
              </Button>
            </>
          )}
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentResponse = responses[currentQuestionIndex];

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`w-full px-8 py-4 flex items-center justify-between border-b ${isDark ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
        <h1 className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">Professional Interview</h1>
        <div className="flex items-center space-x-4">
          {warningCount > 0 && (
            <div className="flex items-center space-x-2 text-yellow-500">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              <span className="text-sm">Warnings: {warningCount}</span>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={handleExitInterview}>Exit Interview</Button>
        </div>
      </div>
      {/* Main Content Split Layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Avatar & Question */}
        <div className={`w-1/2 flex flex-col justify-center items-center p-8 space-y-6 ${isDark ? 'bg-gray-900' : 'bg-white'} border-r border-gray-200 dark:border-gray-700`}>
          {/* Avatar */}
          <div className="text-center">
            <div className={`w-40 h-40 rounded-full flex items-center justify-center mb-6 shadow-lg ${
              avatarState === 'SPEAKING' ? 'bg-blue-100 ring-4 ring-blue-300 animate-pulse' :
              avatarState === 'LISTENING' ? 'bg-green-100 ring-4 ring-green-300' :
              avatarState === 'THINKING' ? 'bg-yellow-100 ring-4 ring-yellow-300' :
              'bg-gray-100 ring-4 ring-gray-300'
            } transition-all duration-500`}>
              {avatarState === 'SPEAKING' && (
                <svg className="w-20 h-20 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
              {avatarState === 'LISTENING' && (
                <svg className="w-20 h-20 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
              {avatarState === 'THINKING' && (
                <svg className="w-20 h-20 text-yellow-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              )}
              {avatarState === 'IDLE' && (
                <svg className="w-20 h-20 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
            
            <div className="mb-4">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                AI Interviewer
              </h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {avatarState === 'SPEAKING' ? 'Asking question...' :
                 avatarState === 'LISTENING' ? 'Listening to your response...' :
                 avatarState === 'THINKING' ? 'Processing your answer...' :
                 'Ready for your response'}
              </p>
            </div>
          </div>
          
          {/* Question Display */}
          {currentQuestion && (
            <div className={`w-full max-w-lg p-6 rounded-lg shadow-lg border-2 ${isDark ? 'bg-gray-800 border-blue-600' : 'bg-blue-50 border-blue-300'}`}>
              <div className="flex items-center justify-between mb-4">
                <span className={`text-sm font-semibold ${isDark ? 'text-blue-400' : 'text-blue-800'}`}>
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                  currentQuestion.difficulty_level === 'easy' ? 'bg-green-100 text-green-800' :
                  currentQuestion.difficulty_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {currentQuestion.difficulty_level}
                </span>
              </div>
              
              <p className={`text-lg font-medium leading-relaxed ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                {currentQuestion.question_text}
              </p>
              
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className={`text-sm font-medium ${
                    questionTimeRemaining < 30 ? 'text-red-600 animate-pulse' : 
                    isDark ? 'text-blue-400' : 'text-blue-600'
                  }`}>
                    {formatTime(questionTimeRemaining)} remaining
                  </span>
                </div>
                
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.max(0, 100 - (questionTimeRemaining / (currentQuestion.time_limit || 300) * 100))}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Right: Video & Response */}
        <div className={`w-1/2 flex flex-col p-8 space-y-8 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
          {/* Video Section with Enhanced Debugging */}
          <div className="h-64 relative rounded-lg overflow-hidden mb-6 border-2 border-gray-300 dark:border-gray-600 bg-black">
            {/* Debug Information */}
            <div className="absolute top-2 left-2 z-10 text-xs text-white bg-black bg-opacity-50 px-2 py-1 rounded">
              Stream: {videoStream ? 'Active' : 'None'} | 
              Tracks: {videoStream?.getVideoTracks().length || 0} | 
              Ready: {videoReady ? 'Yes' : 'No'}
            </div>
            
            {videoStream && videoStream.getVideoTracks().length > 0 ? (
              <>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  muted 
                  playsInline 
                  className="w-full h-full object-cover"
                  style={{ 
                    display: isCameraEnabled && videoReady ? 'block' : 'none',
                    backgroundColor: '#000'
                  }}
                />
                
                {/* Camera disabled overlay */}
                {!isCameraEnabled && (
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-800">
                    <div className="text-center text-white">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                      </svg>
                      <p className="text-gray-300 text-sm">Camera Disabled</p>
                    </div>
                  </div>
                )}
                
                {/* Loading overlay */}
                {isCameraEnabled && !videoReady && (
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-800">
                    <div className="text-center text-white">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                      <p className="text-gray-300 text-sm">Starting Camera...</p>
                      <p className="text-gray-400 text-xs mt-1">
                        {videoStream ? 
                          `Video tracks: ${videoStream.getVideoTracks().length}` : 
                          'No video stream'
                        }
                      </p>
                      <button 
                        onClick={() => {
                          console.log('Manual video ready trigger');
                          setVideoReady(true);
                        }}
                        className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                      >
                        Force Start Video
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                <div className="text-center text-white">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-300 text-sm mb-1">
                    {cameraError ? 'Camera Error' : 'Initializing Camera...'}
                  </p>
                  {cameraError && (
                    <p className="text-red-400 text-xs max-w-xs mx-auto">
                      {cameraError}
                    </p>
                  )}
                  <button 
                    onClick={async () => {
                      // Manual camera retry
                      setCameraError(null);
                      setVideoReady(false);
                      try {
                        const stream = await navigator.mediaDevices.getUserMedia({ 
                          video: { 
                            width: { ideal: 640 },
                            height: { ideal: 480 },
                            facingMode: 'user'
                          }, 
                          audio: true 
                        });
                        setVideoStream(stream);
                        if (videoRef.current) {
                          videoRef.current.srcObject = stream;
                          await videoRef.current.play();
                          setVideoReady(true);
                        }
                      } catch (error) {
                        console.error('Manual camera retry failed:', error);
                        setCameraError('Retry failed: ' + (error as Error).message);
                      }
                    }}
                    className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                  >
                    Retry Camera
                  </button>
                </div>
              </div>
            )}
            
            {/* Camera status overlay */}
            <div className="absolute bottom-2 right-2 text-xs text-white bg-black bg-opacity-50 px-2 py-1 rounded">
              {cameraError ? (
                <span className="text-red-400">❌ Error</span>
              ) : videoReady ? (
                <span className="text-green-400">📹 Live</span>
              ) : (
                <span className="text-yellow-400">⏳ Loading</span>
              )}
            </div>
            
            {/* Camera toggle button */}
            <div className="absolute bottom-2 left-2">
              <button
                onClick={toggleCamera}
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
                  isCameraEnabled
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
                title={isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}
              >
                {isCameraEnabled ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14 10a4 4 0 11-8 0 4 4 0 018 0zm-4-2a2 2 0 100 4 2 2 0 000-4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A2 2 0 0018 14V8a2 2 0 00-2-2h-5.586l-.707-.707A1 1 0 009 5H4a2 2 0 00-2 2v6a2 2 0 00.879 1.651L3.707 2.293zM16 8v6a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5.586L16 8z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Voice Response Area */}
        <div className="flex-1 flex flex-col justify-center px-8">
          {/* Voice Recording Controls */}
          <div className="text-center mb-8">
            <h3 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Record Your Answer
            </h3>
            
            {/* Large Recording Button */}
            <div className="mb-6">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isTranscribing}
                className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-105 shadow-2xl ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                    : hasRecorded 
                    ? 'bg-green-500 hover:bg-green-600' 
                    : 'bg-blue-500 hover:bg-blue-600'
                } ${isTranscribing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {isRecording ? (
                  <div className="w-8 h-8 bg-white rounded-sm"></div>
                ) : hasRecorded ? (
                  <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
            
            {/* Recording Status */}
            <div className="mb-6">
              {isRecording ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className={`text-lg font-medium ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                    Recording... {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              ) : hasRecorded ? (
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className={`text-lg font-medium ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                    Answer Recorded Successfully
                  </span>
                </div>
              ) : (
                <span className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Click the microphone to start recording
                </span>
              )}
            </div>
            
            {/* Voice Instructions */}
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} max-w-md mx-auto`}>
              {isRecording ? (
                <p>🎤 Speak clearly into your microphone. Click the stop button when finished.</p>
              ) : hasRecorded ? (
                <p>✅ You can re-record your answer or proceed to the next question.</p>
              ) : (
                <p>🗣️ This interview uses voice responses only. Make sure your microphone is working and speak clearly.</p>
              )}
            </div>
            
            {/* Processing Indicator */}
            {isTranscribing && (
              <div className="mt-4 flex items-center justify-center space-x-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">Processing your response...</span>
              </div>
            )}
          </div>
          
          {/* Navigation Controls */}
          <div className="flex justify-between items-center mt-auto">
            <Button
              variant="outline"
              onClick={() => {
                if (currentQuestionIndex > 0) {
                  const prevIndex = currentQuestionIndex - 1;
                  setCurrentQuestionIndex(prevIndex);
                  setCurrentAnswer(responses[prevIndex]?.answer || '');
                  setHasRecorded(responses[prevIndex]?.isAnswered || false);
                }
              }}
              disabled={currentQuestionIndex === 0 || isRecording || isTranscribing}
            >
              ← Previous Question
            </Button>
            
            <div className="flex items-center space-x-4">
              <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {currentQuestionIndex + 1} / {questions.length}
              </span>
              
              {currentQuestionIndex < questions.length - 1 ? (
                <Button
                  onClick={handleNextQuestion}
                  disabled={!hasRecorded || isSubmitting || isRecording || isTranscribing}
                  isLoading={isSubmitting}
                  className="px-6"
                >
                  Next Question →
                </Button>
              ) : (
                <Button
                  onClick={completeInterview}
                  disabled={!hasRecorded || isSubmitting || isRecording || isTranscribing}
                  isLoading={isSubmitting}
                  className="bg-green-600 hover:bg-green-700 px-6"
                >
                  Complete Interview
                </Button>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
      {/* Exit Modal */}
      <Modal isOpen={showExitModal} onClose={() => setShowExitModal(false)} title="Exit Interview" size="sm">
        <div className="space-y-4">
          <div className={`p-4 rounded-lg ${isDark ? 'bg-red-900/20' : 'bg-red-50'} border border-red-200`}>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              <p className="text-red-800 font-medium">Warning</p>
            </div>
            <p className="text-red-700 mt-2">Exiting the interview will be recorded as a security event and may affect your evaluation.</p>
          </div>
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Are you sure you want to exit this interview? Your progress will be lost and this cannot be undone.</p>
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowExitModal(false)}>Continue Interview</Button>
            <Button variant="danger" onClick={confirmExit}>Exit Interview</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProfessionalInterviewSession;
