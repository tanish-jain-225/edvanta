import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  MessageSquare,
  Sparkles,
  BookOpen,
  Users,
  Brain,
  LogIn,
  Send,
  AlertCircle,
  Loader2,
  Square,
  CheckCircle,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import { Input } from "../../components/ui/input";
import backEndURL from "../../hooks/helper";
import { useAuth } from "../../hooks/useAuth";
import axios from "axios";

// UI text constants to avoid hardcoding
const UI_TEXT = {
  loading: "Loading Voice Tutor...",
  loginRequired: "Login Required",
  loginMessage:
    "Please log in to access the Voice Tutor. Your sessions will be personalized and saved.",
  loginButton: "Go to Login",
  voiceTutor: "Voice Tutor",
  welcome: "Welcome",
  interactiveVoice: "Interactive voice-based learning",
  startButton: "Start",
  stopButton: "Stop",
  chooseLearningMode: "Choose Learning Mode",
  selectInteraction: "Select how you'd like to interact with your AI tutor",
  subjectFocus: "Subject Focus",
  enterTopic: "Enter the topic you'd like to practice or learn about",
  subjectPlaceholder:
    "e.g., Mathematics, Python Programming, World History, Spanish Grammar...",
  subjectHint: "Be specific to get the most relevant tutoring experience",
  voiceInteraction: "Voice Interaction",
  voiceDescription: "This tutor uses voice for natural conversation",
  howItWorks: "How it works:",
  stepOne: "Press the microphone button and speak your question",
  stepTwo: "Your speech is converted to text and sent to the AI",
  stepThree:
    "The AI response will be spoken back to you using your device's speakers",
  noSubject: "No subject",
  speaking: "Speaking...",
  voiceMessage: "Voice message",
  speakAgain: "Speak again",
  tutorThinking: "Tutor is thinking...",
  recording: "Recording...",
  speakClearly: "Speak clearly and click the button when done",
  aiSpeaking: "AI is speaking...",
  stopSpeaking: "Stop Speaking",
  pressToAsk: "Press to ask another question",
  pressToStart: "Press the microphone button and speak your question",
  connectionError: "Connection error. Please try again.",
  retryButton: "Retry",
  networkOffline: "You're offline. Please check your connection.",
  sessionTimeout: "Session has timed out due to inactivity.",
  microphoneBlocked: "Microphone access is blocked. Please enable it in your browser settings.",
  speechNotSupported: "Speech recognition is not supported in this browser.",
};

// Constants for better error handling
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const NETWORK_CHECK_INTERVAL = 5000; // 5 seconds

export function ConversationalTutor() {
  // Microphone states enum
  const MicState = {
    INACTIVE: "inactive", // Mic is off and not recording
    ACTIVE: "active", // Mic is active and recording
    DISABLED: "disabled", // Mic is disabled (during AI speech or loading)
  };

  // Core state
  const [micState, setMicState] = useState(MicState.INACTIVE);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [currentSpeakingMessageId, setCurrentSpeakingMessageId] =
    useState(null);
  const [selectedMode, setSelectedMode] = useState("tutor");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [errorCount, setErrorCount] = useState(0);
  const [checkingForActiveSession, setCheckingForActiveSession] = useState(true);
  const [isStartButtonClicked, setIsStartButtonClicked] = useState(false);
  const [isEndButtonClicked, setIsEndButtonClicked] = useState(false);
  
  // Enhanced error handling state
  const [lastError, setLastError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastActivity, setLastActivity] = useState(Date.now());
  
  // Performance monitoring
  const [performanceMetrics, setPerformanceMetrics] = useState({
    responseTime: 0,
    errorRate: 0,
    totalRequests: 0,
  });

  // Voice synthesis related
  const speechSynthesisRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const recognitionTimeoutRef = useRef(null);
  const synthesisUtteranceRef = useRef(null);

  // Enhanced error handling and retry mechanism
  const handleErrorWithRetry = useCallback(async (error, operation, maxRetries = MAX_RETRY_ATTEMPTS) => {
    console.error('ConversationalTutor Error:', error);
    
    setLastError({
      message: error.message || 'Unknown error occurred',
      timestamp: Date.now(),
      operation,
    });
    
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      
      setTimeout(async () => {
        try {
          await operation();
          setRetryCount(0);
          setLastError(null);
        } catch (retryError) {
          if (retryCount + 1 >= maxRetries) {
            setLastError({
              message: `Failed after ${maxRetries} attempts: ${retryError.message}`,
              timestamp: Date.now(),
              operation: 'final_attempt',
            });
          } else {
            handleErrorWithRetry(retryError, operation, maxRetries);
          }
        }
      }, RETRY_DELAY * Math.pow(2, retryCount)); // Exponential backoff
    }
  }, [retryCount]);
  
  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Activity tracking for session management
  useEffect(() => {
    const updateActivity = () => setLastActivity(Date.now());
    
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
    };
  }, []);
  
  // Session timeout monitoring
  useEffect(() => {
    if (!isSessionActive) return;
    
    const checkTimeout = () => {
      const now = Date.now();
      if (now - lastActivity > SESSION_TIMEOUT) {
        console.warn('Session timed out due to inactivity');
        endSession();
      }
    };
    
    const interval = setInterval(checkTimeout, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isSessionActive, lastActivity]);

  // Error Recovery Component
  const ErrorRecoveryCard = ({ error, onRetry, onDismiss }) => (
    <Card className="border-red-200 bg-red-50 mb-4">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="text-red-500 mt-0.5" size={20} />
          <div className="flex-1">
            <h3 className="font-semibold text-red-800 mb-1">
              {!isOnline ? "Connection Issue" : "Error Occurred"}
            </h3>
            <p className="text-red-700 text-sm mb-3">{error.message}</p>
            <div className="flex space-x-2">
              {!isOnline ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.location.reload()}
                  className="bg-white hover:bg-red-50 border-red-200"
                >
                  <RefreshCw size={14} className="mr-1" />
                  Refresh Page
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onRetry}
                  disabled={retryCount >= MAX_RETRY_ATTEMPTS}
                  className="bg-white hover:bg-red-50 border-red-200"
                >
                  <RefreshCw size={14} className="mr-1" />
                  {retryCount >= MAX_RETRY_ATTEMPTS ? "Max Retries Reached" : "Try Again"}
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onDismiss}
                className="text-red-600 hover:bg-red-100"
              >
                Dismiss
              </Button>
            </div>
            {retryCount > 0 && (
              <p className="text-xs text-red-600 mt-2">
                Attempt {retryCount} of {MAX_RETRY_ATTEMPTS}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Offline Indicator Component
  const OfflineIndicator = () => (
    <div className="fixed top-4 right-4 z-50">
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-3">
          <div className="flex items-center space-x-2">
            <WifiOff className="text-orange-600" size={16} />
            <span className="text-orange-800 text-sm font-medium">
              You're offline
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );



  // Use authentication and toast  
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Enhanced backend connection check with retry mechanism
  const checkBackendConnection = useCallback(async () => {
    if (!isOnline) {
      setLastError({ message: UI_TEXT.networkOffline, timestamp: Date.now() });
      return false;
    }
    
    setIsLoading(true);
    const startTime = Date.now();
    
    try {
      const response = await axios.get(
        `${backEndURL}/api/tutor/voice/connection`,
        { timeout: 10000 }
      );
      
      const responseTime = Date.now() - startTime;
      setPerformanceMetrics(prev => ({
        ...prev,
        responseTime,
        totalRequests: prev.totalRequests + 1,
      }));
      
      if (response.data.success) {
        return true;
      } else {
        throw new Error(response.data.status || 'Backend connection failed');
      }
    } catch (error) {
      console.error('Backend connection error:', error);
      
      setPerformanceMetrics(prev => ({
        ...prev,
        errorRate: (prev.errorRate + 1) / (prev.totalRequests + 1),
        totalRequests: prev.totalRequests + 1,
      }));
      
      const errorMessage = error.code === 'ECONNABORTED' 
        ? 'Connection timeout. Please try again.'
        : 'Could not connect to voice tutor services. Please try again later.';
        
      setLastError({ message: errorMessage, timestamp: Date.now() });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isOnline]);

  // Initialize speech synthesis with enhanced error handling
  useEffect(() => {
    // Check browser support
    if (!window.speechSynthesis) {
      setLastError({ 
        message: UI_TEXT.speechNotSupported, 
        timestamp: Date.now() 
      });
      return;
    }

    speechSynthesisRef.current = window.speechSynthesis;

    // Add event liste.ner for page refresh with better cleanup
    const handleBeforeUnload = () => {
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
        speechRecognitionRef.current = null;
      }
    };

    // Register the beforeunload event listener
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Clean up function with comprehensive cleanup
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);

      // Cancel any ongoing speech
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }

      // Stop speech recognition
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (error) {
          console.warn('Error stopping speech recognition:', error);
        }
        speechRecognitionRef.current = null;
      }

      // Clear all timeouts
      if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
      }
    };
  }, []);

  // Add a visibility change handler to stop speech when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && isSpeaking) {
        stopSpeaking();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isSpeaking]);

  // Update mic state based on app state (speaking/loading)
  useEffect(() => {
    if (isSpeaking || isLoading) {
      setMicState(MicState.DISABLED);
    } else if (micState === MicState.DISABLED) {
      setMicState(MicState.INACTIVE);
    }
  }, [isSpeaking, isLoading, micState]);

  // Scroll to bottom of messages - now controlled manually
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // This helper ensures a minimum loading time for better UX
  const enforceMinimumLoadingTime = async (startTime) => {
    const MINIMUM_LOADING_TIME = 2000; // 2 seconds minimum loading time
    const elapsedTime = Date.now() - startTime;
    const remainingTime = Math.max(0, MINIMUM_LOADING_TIME - elapsedTime);

    if (remainingTime > 0) {
      // Create a promise that resolves after the remaining time
      return new Promise((resolve) => setTimeout(resolve, remainingTime));
    }

    return Promise.resolve(); // No need to wait if minimum time already passed
  };

  // Primary useEffect - runs on component mount to check for active sessions
  // This runs before any other logic to prioritize session restoration
  // Note: checkingForActiveSession is already set to true by default
  useEffect(() => {
    const verifySessionOnLoad = async () => {
      // If we already have a session, don't proceed
      if (isSessionActive || sessionId) {
        setCheckingForActiveSession(false); // Make sure to clear the checking state
        return;
      }

      // Wait for authentication to finish if it's still loading
      if (authLoading) {
        // We keep checkingForActiveSession as true while waiting for auth
        return;
      }

      // If we have a logged in user, immediately check for active sessions
      if (user?.email) {
        // Since checkingForActiveSession is already true, we can call the function directly
        // without the risk of a loading glitch
        checkForActiveSession();
      } else {
        // No user, so we can stop checking
        setCheckingForActiveSession(false);
      }
    };

    // Execute immediately
    verifySessionOnLoad();

    // Also set up visibility change listener here to ensure it's registered immediately
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        user?.email &&
        !isSessionActive &&
        !sessionId
      ) {
        setCheckingForActiveSession(true); // Set to true before checking
        checkForActiveSession();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []); // Empty dependency array means this only runs once on mount

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);

  // Secondary useEffect to check for auth state changes
  useEffect(() => {
    if (user?.email && !authLoading && !isSessionActive && !sessionId) {
      // Immediately set checking state to true to prevent loading glitch
      setCheckingForActiveSession(true);

      // Small delay to prevent race conditions with other state updates
      setTimeout(() => {
        if (!isSessionActive && !sessionId) {
          checkForActiveSession();
        }
      }, 50);
    }
  }, [user, authLoading]); // Only depend on user and authLoading to prevent unwanted re-runs

  // Function to check if user has an active session
  const checkForActiveSession = async () => {
    // Return early if any of these conditions are true to prevent redundant checks
    if (!user?.email || isSessionActive || sessionId) {
      setCheckingForActiveSession(false); // Make sure to reset the checking state
      return;
    }

    // Note: We don't check checkingForActiveSession here since we now set it to true
    // before calling this function to prevent the loading glitch
    // We don't set checkingForActiveSession to true here anymore as it's set before calling this function

    // Record start time for minimum loading time calculation
    const startTime = Date.now();

    try {
      // Priority 1: Get the active session as quickly as possible
      const response = await axios.get(
        `${backEndURL}/api/tutor/session/active?userEmail=${user.email}`,
        { timeout: 8000 } // Increased timeout for potentially slow connections
      );

      if (!response.data.success) {
        console.error("Server returned unsuccessful response:", response.data);
        // Ensure minimum loading time of 2 seconds before finishing
        await enforceMinimumLoadingTime(startTime);
        setCheckingForActiveSession(false);
        return;
      }

      // If no active session, we can end early but still ensure minimum loading time
      if (!response.data.has_active_session) {
        // Ensure minimum loading time of 2 seconds before finishing
        await enforceMinimumLoadingTime(startTime);
        setCheckingForActiveSession(false);
        return;
      }

      const sessionData = response.data.session_data;

      // Priority 2: Update all session-related state
      const newSessionId = sessionData.session_id;
      setSessionId(newSessionId);
      setCurrentSessionId(newSessionId);
      setSelectedMode(sessionData.mode || "tutor");
      setSelectedSubject(sessionData.subject || "");
      setIsSessionActive(true);

      try {
        const historyResponse = await axios.get(
          `${backEndURL}/api/tutor/chat/history?userEmail=${user.email}&sessionId=${sessionData.session_id}`,
          { timeout: 8000 } // Increased timeout for potentially slow connections
        );

        if (historyResponse.data.success) {
          if (
            historyResponse.data.messages &&
            historyResponse.data.messages.length > 0
          ) {
            // Transform the history format to match our UI format
            const formattedMessages = historyResponse.data.messages.map(
              (msg) => ({
                id: `history-${msg.timestamp}`,
                role: msg.is_ai ? "assistant" : "user",
                content: msg.content,
                timestamp: msg.timestamp,
              })
            );

            setMessages(formattedMessages);

            // Add a system message about session restoration
            const restoredMessage = {
              id: `system-${Date.now()}`,
              role: "system",
              content:
                "Your session has been restored. You can continue where you left off.",
              timestamp: new Date().toISOString(),
            };

            setMessages((prev) => [...prev, restoredMessage]);

            // Scroll to the latest message
            setTimeout(scrollToBottom, 100);
          } else {
            // Add a welcome back message even if no history
            const welcomeMessage = {
              id: `welcome-${Date.now()}`,
              role: "assistant",
              content: `Welcome back to your ${sessionData.mode} session about ${sessionData.subject}`,
              timestamp: new Date().toISOString(),
            };

            setMessages([welcomeMessage]);
          }
        } else {
          console.error("Failed to fetch chat history:", historyResponse.data);

          // Add a fallback message
          const fallbackMessage = {
            id: `system-${Date.now()}`,
            role: "system",
            content:
              "Your session has been restored, but we couldn't retrieve your chat history.",
            timestamp: new Date().toISOString(),
          };

          setMessages([fallbackMessage]);
        }
      } catch (historyError) {
        console.error("Error fetching chat history:", historyError);

        // Continue with the session even if history fetch fails
        const errorMessage = {
          id: `system-${Date.now()}`,
          role: "system",
          content:
            "Your session has been restored, but there was an error loading your chat history.",
          timestamp: new Date().toISOString(),
        };

        setMessages([errorMessage]);
      }
    } catch (error) {
      console.error("Error checking for active session:", error);

      // Add retry logic for transient errors
      if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        const timeoutMessage = {
          id: `system-${Date.now()}`,
          role: "system",
          content:
            "Connection timed out while checking for active sessions. Please try refreshing the page.",
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, timeoutMessage]);
      }
    } finally {
      // Ensure minimum loading time of 2 seconds before finishing
      await enforceMinimumLoadingTime(startTime);
      setCheckingForActiveSession(false);
    }
  };

  // Auto-speak the latest AI response when voice is enabled
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];

    if (
      lastMessage &&
      lastMessage.role === "assistant" &&
      isVoiceEnabled &&
      !isSpeaking
    ) {
      speakText(lastMessage.content, lastMessage.id);
    }
  }, [messages, isVoiceEnabled]);

  // Initialize speech recognition - robust initialization
  useEffect(() => {
    // Only initialize recognition when we need it
    if (micState === MicState.ACTIVE) {
      initializeSpeechRecognition();
    }

    // Always clean up on component unmount
    return () => {
      cleanupSpeechRecognition();
    };
  }, [micState]);

  // Initialize speech recognition
  const initializeSpeechRecognition = () => {
    // Clean up any existing instances
    cleanupSpeechRecognition();

    try {
      // Check if the browser supports SpeechRecognition
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        console.error("Speech recognition not supported");
        alert(
          "Your browser doesn't support speech recognition. Try using Chrome, Edge, or Safari."
        );
        setMicState(MicState.INACTIVE);
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true; // Allow for continuous recording
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setTranscript("");
      };

      recognition.onresult = (event) => {
        let finalTranscript = "";
        let interimTranscript = "";

        // Process all results, separating final from interim
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        // Combine final and interim results
        const completeTranscript = finalTranscript + interimTranscript;

        // Set the complete transcript
        setTranscript(completeTranscript.trim());

        // No auto-stop timeout needed as we want the mic to stay on until user manually stops it
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        
        // Update activity timestamp
        setLastActivity(Date.now());

        // Handle different types of speech recognition errors
        switch (event.error) {
          case "no-speech":
            // Restart recognition if no speech was detected
            try {
              if (speechRecognitionRef.current && micState === MicState.ACTIVE) {
                speechRecognitionRef.current.stop();
                setTimeout(() => {
                  if (micState === MicState.ACTIVE && speechRecognitionRef.current) {
                    speechRecognitionRef.current.start();
                  }
                }, 100);
              }
            } catch (e) {
              console.error("Error restarting speech recognition", e);
              setLastError({ 
                message: "Speech recognition restart failed. Try clicking the microphone again.",
                timestamp: Date.now() 
              });
            }
            return;
            
          case "not-allowed":
          case "service-not-allowed":
            setLastError({ 
              message: UI_TEXT.microphoneBlocked,
              timestamp: Date.now() 
            });
            setMicState(MicState.DISABLED);
            break;
            
          case "network":
            setLastError({ 
              message: "Network error during speech recognition. Check your connection.",
              timestamp: Date.now() 
            });
            break;
            
          case "audio-capture":
            setLastError({ 
              message: "Microphone not available. Check your device settings.",
              timestamp: Date.now() 
            });
            setMicState(MicState.DISABLED);
            break;
            
          default:
            setLastError({ 
              message: `Speech recognition error: ${event.error}. Try refreshing the page.`,
              timestamp: Date.now() 
            });
        }
        
        // Auto-stop mic on certain errors to prevent continuous failures
        if (event.error !== "no-speech") {
          setMicState(MicState.INACTIVE);
        }
      };

      recognition.onend = () => {
        // Check if this was a manual stop and if there's transcript
        const wasManualStop = speechRecognitionRef.current?.manualStop === true;
        const messageSent = speechRecognitionRef.current?.messageSent === true;
        const hasTranscript = transcript.trim().length > 0;

        // Clear the flags
        if (speechRecognitionRef.current) {
          speechRecognitionRef.current.manualStop = false;
          speechRecognitionRef.current.messageSent = false;
        }

        // If this was a manual stop, transcript exists, and message wasn't already sent from stopMicrophone
        if (wasManualStop && hasTranscript && !messageSent && sessionId) {
          sendMessage(transcript.trim());
        }

        // Always ensure mic state is inactive when recognition ends
        setMicState(MicState.INACTIVE);
      };

      speechRecognitionRef.current = recognition;

      // Start the recognition
      recognition.start();
    } catch (error) {
      console.error("Error initializing speech recognition:", error);
      setMicState(MicState.INACTIVE);

      alert("Could not access your microphone. Please check your permissions.");
    }
  };

  // Clean up speech recognition
  const cleanupSpeechRecognition = () => {
    if (recognitionTimeoutRef.current) {
      clearTimeout(recognitionTimeoutRef.current);
      recognitionTimeoutRef.current = null;
    }

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (error) {
        // Ignore errors when stopping
      }
      speechRecognitionRef.current = null;
    }
  };

  // Microphone button click handler - completely revised for reliability
  const handleMicrophoneClick = () => {
    if (micState === MicState.INACTIVE) {
      startMicrophone();
    } else if (micState === MicState.ACTIVE) {
      stopMicrophone();
    }
  };

  // Function to completely reset the speech recognition system
  const resetSpeechRecognition = () => {
    cleanupSpeechRecognition();
    setMicState(MicState.INACTIVE);
    setTranscript("");

    // Check microphone permission and availability
    checkMicrophoneAvailability();
  };

  // Check if microphone is available and has permission
  const checkMicrophoneAvailability = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Stop all tracks to release the microphone
      stream.getTracks().forEach((track) => track.stop());

      // If we're in an active session, set a system message to confirm mic is working
      if (isSessionActive) {
        const successMessage = {
          id: `system-${Date.now()}`,
          role: "system",
          content: "Microphone is now connected and ready to use.",
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, successMessage]);
      }
    } catch (error) {
      console.error("❌ Microphone access error:", error);

      // Add a helpful system message
      if (isSessionActive) {
        const errorMessage = {
          id: `system-${Date.now()}`,
          role: "system",
          content:
            "Could not access your microphone. Please check your browser permissions and try again.",
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, errorMessage]);
      } else {
        // Show error if not in a session yet
        setLastError({ 
          message: UI_TEXT.microphoneBlocked,
          timestamp: Date.now() 
        });
      }
    }
  };

  // Start microphone function - ultra robust implementation
  const startMicrophone = () => {
    if (!isSessionActive) {
      setLastError({ 
        message: "Please start a session first by selecting a mode and subject.",
        timestamp: Date.now() 
      });
      return;
    }

    // Stop any ongoing speech, but do NOT auto-mic-on to avoid recursion
    stopSpeaking(false);

    // Clear any previous transcript
    setTranscript("");

    // Set the mic state to active
    setMicState(MicState.ACTIVE);

    // Initialize speech recognition is handled by the useEffect
  };

  // Stop the microphone - aggressive approach for maximum reliability
  const stopMicrophone = () => {
    // Get the current transcript before any state changes
    const currentTranscript = transcript.trim();
    const hasTranscript = currentTranscript.length > 0;

    // First set state to ensure UI updates immediately
    setMicState(MicState.INACTIVE);

    // If we have transcript, send it immediately without waiting for onend
    if (hasTranscript && sessionId) {
      // We use setTimeout to ensure this runs after the current execution
      setTimeout(() => {
        sendMessage(currentTranscript);
      }, 10);
    }

    // Still try to stop recognition properly
    if (speechRecognitionRef.current) {
      try {
        // Set a flag on the recognition object to indicate this was a manual stop
        // but we've already handled sending the message
        speechRecognitionRef.current.manualStop = true;
        speechRecognitionRef.current.messageSent = true;
        speechRecognitionRef.current.stop();
      } catch (error) {
        console.error("Error stopping speech recognition:", error);
      }
    }

    // Clear any timeouts
    if (recognitionTimeoutRef.current) {
      clearTimeout(recognitionTimeoutRef.current);
      recognitionTimeoutRef.current = null;
    }
  };

  // Text-to-speech function using Web Speech API
  const speakText = (text, messageId = null) => {
    if (!isVoiceEnabled || !text || !speechSynthesisRef.current) {
      return;
    }

    // First, optimize the text for better speech (remove markdown, etc.)
    optimizeTextForSpeech(text)
      .then((optimizedText) => {
        // Stop any previous speech
        stopSpeaking(false); // pass false to not auto-mic-on from here

        // Create a new utterance
        const utterance = new SpeechSynthesisUtterance(optimizedText);

        // Configure the utterance
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Try to use a better voice if available
        const voices = speechSynthesisRef.current.getVoices();
        const preferredVoice = voices.find(
          (voice) =>
            voice.name.includes("Google") &&
            voice.name.includes("US") &&
            voice.name.includes("Female")
        );

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        // Set up event handlers
        utterance.onstart = () => {
          setIsSpeaking(true);
          setCurrentSpeakingMessageId(messageId);
        };

        utterance.onend = () => {
          setIsSpeaking(false);
          setCurrentSpeakingMessageId(null);
          // Auto-on mic after AI voice ends, if session is active and mic is not already active
          if (isSessionActive && micState !== MicState.ACTIVE) {
            startMicrophone();
          }
        };

        utterance.onerror = (event) => {
          console.error("Speech synthesis error:", event);
          setIsSpeaking(false);
          setCurrentSpeakingMessageId(null);
          // Also auto-on mic if error interrupts speech
          if (isSessionActive && micState !== MicState.ACTIVE) {
            startMicrophone();
          }
        };

        // Store the utterance for later cancellation if needed
        synthesisUtteranceRef.current = utterance;

        // Speak the text
        speechSynthesisRef.current.speak(utterance);
      })
      .catch((error) => {
        console.error("Error optimizing text for speech:", error);
        // Fallback to speaking the original text
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => {
          setIsSpeaking(false);
          setCurrentSpeakingMessageId(null);
          if (isSessionActive && micState !== MicState.ACTIVE) {
            startMicrophone();
          }
        };
        utterance.onerror = (event) => {
          setIsSpeaking(false);
          setCurrentSpeakingMessageId(null);
          if (isSessionActive && micState !== MicState.ACTIVE) {
            startMicrophone();
          }
        };
        speechSynthesisRef.current.speak(utterance);
      });
  };

  // Optimize text for speech using backend service
  const optimizeTextForSpeech = async (text) => {
    try {
      const response = await axios.post(
        `${backEndURL}/api/tutor/voice/optimize`,
        {
          text,
          userEmail: user?.email,
        }
      );

      if (response.data.success && response.data.optimized_text) {
        return response.data.optimized_text;
      }

      return text; // Fallback to original text
    } catch (error) {
      console.error("Error optimizing text:", error);
      return text; // Fallback to original text
    }
  };

  // Function to stop the AI from speaking - enhanced for reliability
  // Now takes an optional autoMicOn param (default true)
  const stopSpeaking = (autoMicOn = true) => {
    // Try multiple approaches to ensure speech stops
    try {
      // Method 1: Cancel all speech in the queue
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }

      // Method 2: Try to pause first, then cancel (sometimes more reliable)
      try {
        if (speechSynthesisRef.current && speechSynthesisRef.current.speaking) {
          speechSynthesisRef.current.pause();
          setTimeout(() => {
            if (speechSynthesisRef.current) {
              speechSynthesisRef.current.cancel();
            }
          }, 50);
        }
      } catch (e) {
        console.error("Error with pause-then-cancel approach:", e);
        // Fallback to direct cancel already happened above
      }

      // Method 3: If there's a specific utterance, just clear the ref (do not manually call onend)
      if (synthesisUtteranceRef.current) {
        synthesisUtteranceRef.current = null;
      }
    } catch (error) {
      console.error("Error stopping speech:", error);
    }

    // Always update state, even if the above methods fail
    setIsSpeaking(false);
    setCurrentSpeakingMessageId(null);

    // Auto-on mic if requested, session is active, and mic is not already active
    if (autoMicOn && isSessionActive && micState !== MicState.ACTIVE) {
      startMicrophone();
    }
  };

  // Toggle voice output
  const toggleVoice = async () => {
    if (!sessionId) return;

    const newVoiceState = !isVoiceEnabled;
    setIsVoiceEnabled(newVoiceState);

    // Stop speaking if turning off
    if (!newVoiceState && isSpeaking) {
      stopSpeaking();
    }

    try {
      // Notify the backend about voice toggle
      const response = await axios.post(
        `${backEndURL}/api/tutor/voice/toggle`,
        {
          enabled: newVoiceState,
          session_id: sessionId,
          userEmail: user?.email,
          isVoiceInput: true,
        }
      );

      if (response.data.success) {
        // Add the system message to the chat
        const toggleMessage = {
          id: `system-${Date.now()}`,
          role: "system",
          content:
            response.data.message ||
            `Voice output ${newVoiceState ? "enabled" : "disabled"}.`,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, toggleMessage]);

        // If turning on voice, speak the toggle message
        if (newVoiceState) {
          speakText(toggleMessage.content, toggleMessage.id);
        }
      }
    } catch (error) {
      console.error("Error toggling voice:", error);

      // Add a local message anyway
      const fallbackMessage = {
        id: `system-${Date.now()}`,
        role: "system",
        content: `Voice output ${newVoiceState ? "enabled" : "disabled"}.`,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, fallbackMessage]);
    }
  };

  // Mode definitions for the UI
  const modes = [
    {
      id: "tutor",
      name: "Personal Tutor",
      icon: BookOpen,
      description: "One-on-one learning sessions",
    },
    {
      id: "conversation",
      name: "Conversation Practice",
      icon: MessageSquare,
      description: "Practice speaking and listening",
    },
    {
      id: "debate",
      name: "Debate Partner",
      icon: Users,
      description: "Structured argument practice",
    },
    {
      id: "interview",
      name: "Interview Prep",
      icon: Brain,
      description: "Job interview simulation",
    },
  ];

  // Start a new tutoring session
  const startSession = async () => {
    if (!user) {
      setIsStartButtonClicked(true);
      setLastError({ 
        message: "Please log in to start a tutoring session.",
        timestamp: Date.now() 
      });
      navigate("/auth/login");
      return;
    }

    if (!selectedSubject.trim()) {
      setLastError({ 
        message: "Please enter a subject to focus on.",
        timestamp: Date.now() 
      });
      return;
    }

    // Show starting state immediately for instant feedback
    setIsStartingSession(true);
    setIsLoading(true);
    
    // Clear any existing messages from previous sessions
    setMessages([]);

    // First check connection to backend services
    const connectionSuccessful = await checkBackendConnection();
    if (!connectionSuccessful) {
      setIsStartingSession(false);
      setIsLoading(false);
      return; // Don't proceed if connection failed
    }

    // Check microphone before starting
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop all tracks to release the microphone
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.error("Microphone access error:", error);
      setLastError({ 
        message: UI_TEXT.microphoneBlocked, 
        timestamp: Date.now() 
      });
      setIsStartingSession(false);
      setIsLoading(false);
      return;
    }

    // Record start time for minimum loading time
    const startTime = Date.now();

    try {
      const response = await axios.post(
        `${backEndURL}/api/tutor/session/start`,
        {
          mode: selectedMode,
          subject: selectedSubject,
          userEmail: user.email,
          isVoiceInput: true,
        }
      );

      if (response.data.success) {
        const newSessionId = response.data.session_id;
        setSessionId(newSessionId);
        setCurrentSessionId(newSessionId);
        setIsSessionActive(true);

        // Check if this is a resumed session
        if (response.data.is_resumed) {
          // Fetch chat history for this session first, then add welcome back message
          await fetchChatHistory();

          // Add welcome back message after history is loaded
          const welcomeBackMessage = {
            id: `welcome-back-${Date.now()}`,
            role: "assistant",
            content:
              response.data.message ||
              `Welcome back to your ${response.data.mode} session about ${response.data.subject}`,
            timestamp: response.data.timestamp || new Date().toISOString(),
            sessionId: response.data.session_id,
          };

          setMessages((prev) => [...prev, welcomeBackMessage]);
        } else {
          // Reset messages and add welcome message for new session
          const welcomeMessage = {
            id: `welcome-${Date.now()}`,
            role: "assistant",
            content: response.data.message,
            timestamp: response.data.timestamp || new Date().toISOString(),
            sessionId: response.data.session_id,
          };

          setMessages([welcomeMessage]);
        }
      } else {
        setLastError({ 
          message: response.data.error || "Failed to start session. Please try again.",
          timestamp: Date.now() 
        });
      }
    } catch (error) {
      console.error("Error starting session:", error);
      
      const errorMessage = error.code === 'ECONNABORTED' 
        ? "Session start timeout. Please check your connection and try again."
        : "Failed to start a session. Please check your internet connection.";
        
      setLastError({ message: errorMessage, timestamp: Date.now() });
    } finally {
      // Ensure minimum loading time of 2 seconds
      await enforceMinimumLoadingTime(startTime);
      setIsStartingSession(false);
      setIsLoading(false);
    }
  };

  // Fetch chat history for the current user
  const fetchChatHistory = async () => {
    const activeSessionId = currentSessionId || sessionId;
    if (!user?.email || !activeSessionId) return;

    try {
      // Explicitly pass the sessionId to fetch only messages from the current session
      const response = await axios.get(
        `${backEndURL}/api/tutor/chat/history?userEmail=${user.email}&sessionId=${activeSessionId}`
      );

      if (response.data.success && response.data.messages.length > 0) {
        // Transform the history format to match our UI format
        const formattedMessages = response.data.messages.map((msg) => ({
          id: `history-${msg.timestamp}`,
          role: msg.is_ai ? "assistant" : "user",
          content: msg.content,
          timestamp: msg.timestamp,
          sessionId: activeSessionId, // Add session ID for proper filtering
        }));

        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error("Error fetching chat history:", error);
    }
  };

  // End the current session
  const endSession = async () => {
    if (!sessionId) return;

    setIsEndingSession(true);
    setIsLoading(true);

    // Record start time for minimum loading time
    const startTime = Date.now();

    // Stop any active speech or recognition
    stopSpeaking();
    if (micState === MicState.ACTIVE) {
      stopMicrophone();
    }

    try {
      const response = await axios.post(
        `${backEndURL}/api/tutor/session/end`,
        {
          session_id: sessionId,
          userEmail: user?.email,
          isVoiceInput: true,
        },
        {
          timeout: 8000, // Increased timeout for potentially slow connections
        }
      );

      if (response.data.success) {
        // Add a confirmation message
        const confirmMessage = {
          id: `system-${Date.now()}`,
          role: "system",
          content:
            "Your session has been ended successfully. Start a new session any time.",
          timestamp: new Date().toISOString(),
        };

        setMessages([confirmMessage]);

        // Reset all session-related state
        setSessionId(null);
        setCurrentSessionId(null);
        setIsSessionActive(false);
        setErrorCount(0);
      } else {
        console.error(
          "Server returned unsuccessful end session response:",
          response.data
        );
        setLastError({ 
          message: response.data.error || "Failed to end session properly.",
          timestamp: Date.now() 
        });

        // Force reset session state if there was an error
        setSessionId(null);
        setCurrentSessionId(null);
        setIsSessionActive(false);
      }
    } catch (error) {
      console.error("Error ending session:", error);

      // Show more detailed error to help with debugging
      if (error.response) {
        // The request was made and the server responded with an error status
        console.error("Server error response:", error.response.data);
        console.error("Status code:", error.response.status);
      } else if (error.request) {
        // The request was made but no response was received
        console.error("No response received from server");
      } else {
        // Something happened in setting up the request
        console.error("Request setup error:", error.message);
      }

      alert(
        "Failed to end session properly due to connection issues. You may need to refresh the page."
      );

      // Force reset session state if there was an error
      setSessionId(null);
      setCurrentSessionId(null);
      setIsSessionActive(false);
    } finally {
      // Ensure minimum loading time of 2 seconds
      await enforceMinimumLoadingTime(startTime);
      setIsEndingSession(false);
      setIsLoading(false);
    }
  };

  // Send voice message to tutor
  const sendMessage = async (voiceText) => {
    if (!voiceText.trim()) {
      return;
    }

    if (!currentSessionId && !sessionId) {
      console.error("No active session, cannot send message");
      setLastError({ 
        message: "No active session. Please start a new session first.",
        timestamp: Date.now() 
      });
      return;
    }

    try {
      // Get last 10 messages for context - ensure they're from current session
      const currentSession = currentSessionId || sessionId;
      const conversationHistory = messages
        .filter(msg => !msg.sessionId || msg.sessionId === currentSession) // Filter by session if sessionId is present
        .slice(-10)
        .map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        }));
      
      // Show context indicator if we have history
      const hasContext = conversationHistory.length > 0;

      // Add user message to UI immediately
      const userMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: voiceText,
        isVoiceInput: true, // Flag to show mic icon in UI
        timestamp: new Date().toISOString(),
        hasContext: hasContext, // Flag to show context indicator
        sessionId: currentSessionId || sessionId, // Track which session this belongs to
      };

      setMessages((prev) => [...prev, userMessage]);
      setTranscript("");
      setIsLoading(true);

      // Scroll to bottom after sending a message
      setTimeout(scrollToBottom, 100);

      const response = await axios.post(`${backEndURL}/api/tutor/ask`, {
        prompt: voiceText,
        mode: selectedMode,
        subject: selectedSubject,
        isVoiceInput: true, // Tell backend this came from voice
        userEmail: user?.email,
        sessionId: currentSessionId || sessionId,
        conversationHistory: conversationHistory, // Include context
      });

      if (response.data.success) {
        const aiMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: response.data.response,
          timestamp: response.data.timestamp || new Date().toISOString(),
          sessionId: currentSessionId || sessionId, // Track which session this belongs to
        };

        setMessages((prev) => [...prev, aiMessage]);

        // Scroll to bottom after receiving AI response
        setTimeout(scrollToBottom, 100);

        // Voice response will be handled by the useEffect
      } else {
        // Handle error response
        const errorMessage = {
          id: `error-${Date.now()}`,
          role: "system",
          content:
            response.data.error ||
            "Sorry, there was an error processing your request.",
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, errorMessage]);
        setErrorCount((prev) => prev + 1);

        // If we get too many errors, suggest ending the session
        if (errorCount > 2) {
          const suggestionMessage = {
            id: `suggestion-${Date.now()}`,
            role: "system",
            content:
              "You're experiencing multiple errors. You may want to end this session and try again later.",
            timestamp: new Date().toISOString(),
          };

          setMessages((prev) => [...prev, suggestionMessage]);
        }
      }
    } catch (error) {
      console.error("Error sending voice message:", error);

      // Add error message to the chat
      const errorMessage = {
        id: `error-${Date.now()}`,
        role: "system",
        content:
          "Sorry, there was an error communicating with the tutor service. Please try again.",
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, errorMessage]);
      setErrorCount((prev) => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  // Show auth loading or session check loading state
  if (authLoading || checkingForActiveSession) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px]">
        <div className="relative">
          {/* Elegant pulsing circle behind the icon */}
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping"></div>

          {/* Main circle with icon */}
          <div className="relative flex items-center justify-center h-16 w-16 rounded-full bg-background border border-primary/30 shadow-sm">
            <MessageSquare className="h-7 w-7 text-primary animate-pulse" />
          </div>

          {/* Minimal loading dots */}
          <div className="flex justify-center mt-2">
            <div className="flex space-x-1">
              <div
                className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse"
                style={{ animationDelay: "0ms" }}
              ></div>
              <div
                className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse"
                style={{ animationDelay: "300ms" }}
              ></div>
              <div
                className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse"
                style={{ animationDelay: "600ms" }}
              ></div>
            </div>
          </div>
        </div>

        {/* Simple text - no description, keeping it minimal */}
        <p className="text-sm text-muted-foreground mt-6">
          {authLoading ? "Preparing your tutor" : "Restoring your session"}
        </p>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] space-y-4 p-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-2xl font-bold">{UI_TEXT.loginRequired}</h2>
        <p className="text-center text-muted-foreground max-w-md">
          {UI_TEXT.loginMessage}
        </p>
        <Button onClick={() => navigate("/auth/login")} className="mt-2">
          <LogIn className="h-4 w-4 mr-2" />
          {UI_TEXT.loginButton}
        </Button>
      </div>
    );
  }

  return (
    <div className="container px-2 sm:px-4 md:px-6 py-6 flex flex-col min-h-[85vh] gap-4 sm:gap-6 md:gap-8 w-full max-w-full">
      
      {/* Offline Indicator */}
      {!isOnline && <OfflineIndicator />}
      
      {/* Performance Indicator (dev only) */}

      
      {/* Error Recovery UI */}
      {lastError && (
        <ErrorRecoveryCard 
          error={lastError}
          onRetry={() => {
            setLastError(null);
            setRetryCount(0);
            if (isSessionActive) {
              // Retry the last operation or restart session
              startSession();
            }
          }}
          onDismiss={() => {
            setLastError(null);
            setRetryCount(0);
          }}
        />
      )}
      
      <div className="flex items-center justify-between w-full">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            {UI_TEXT.voiceTutor}
          </h1>
          <p className="text-muted-foreground">{UI_TEXT.interactiveVoice}</p>
        </div>

        {/* Connection status badges removed as requested */}
      </div>

      {/* Show session verification loading spinner first - this should appear immediately */}
      {checkingForActiveSession ? (
        <div className="flex-1 flex items-center justify-center flex-col gap-4">
          <div className="animate-pulse flex flex-col items-center justify-center text-center p-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <h3 className="text-lg font-medium">Verifying session status...</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Checking if you have an active voice session
            </p>
          </div>
        </div>
      ) : !isSessionActive ? (
        // Session setup screen
        <div className="flex flex-col lg:flex-row flex-1 gap-4 sm:gap-6 w-full">
          <Card className="flex-1 w-full">
            <CardHeader className="sm:pb-4">
              <CardTitle className="text-xl sm:text-2xl">
                {UI_TEXT.chooseLearningMode}
              </CardTitle>
              <CardDescription>{UI_TEXT.selectInteraction}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              {modes.map((mode) => (
                <div
                  key={mode.id}
                  className={`flex items-center space-x-3 p-2 sm:p-3 rounded-lg cursor-pointer border transition-colors ${selectedMode === mode.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                    }`}
                  onClick={() => setSelectedMode(mode.id)}
                >
                  <div className="bg-primary/20 p-2 rounded-full flex-shrink-0">
                    <mode.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm sm:text-base">
                      {mode.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {mode.description}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="flex-1 flex flex-col w-full">
            <CardHeader className="sm:pb-4">
              <CardTitle className="text-xl sm:text-2xl">
                {UI_TEXT.subjectFocus}
              </CardTitle>
              <CardDescription>{UI_TEXT.enterTopic}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex-grow">
              <div className="space-y-2">
                <Input
                  placeholder={UI_TEXT.subjectPlaceholder}
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {UI_TEXT.subjectHint}
                </p>
              </div>

              <div className="mt-6 sm:mt-8 pt-3 sm:pt-4 border-t">
                <h3 className="font-medium mb-2">{UI_TEXT.voiceInteraction}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                  {UI_TEXT.voiceDescription}
                </p>

                <div className="space-y-2 text-xs sm:text-sm">
                  <p className="font-medium">{UI_TEXT.howItWorks}</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>{UI_TEXT.stepOne}</li>
                    <li>{UI_TEXT.stepTwo}</li>
                    <li>{UI_TEXT.stepThree}</li>
                  </ol>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full py-2 sm:py-3 text-sm sm:text-base"
                onClick={startSession}
                disabled={
                  isStartingSession || isLoading || !selectedSubject.trim()
                }
              >
                {isStartingSession ? (
                  <>{isConnecting ? "Connecting..." : "Starting Session..."}</>
                ) : (
                  <>{UI_TEXT.startButton}</>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : (
        // Active session screen
        <div className="flex flex-col lg:flex-row flex-1 gap-4 sm:gap-6 w-full">
          {/* Chat area */}
          <Card className="relative flex flex-col flex-1 w-full overflow-hidden">
            {/* Fixed Header */}
            <CardHeader className="sticky top-0 z-10 bg-card pb-2 sm:pb-3 border-b shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-xl sm:text-2xl">
                    {selectedMode === "tutor"
                      ? "AI Tutor"
                      : modes.find((m) => m.id === selectedMode)?.name}
                  </CardTitle>
                  <CardDescription>
                    {selectedSubject || UI_TEXT.noSubject}
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant={isVoiceEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={toggleVoice}
                    className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
                    title={
                      isVoiceEnabled
                        ? "Voice output enabled"
                        : "Voice output disabled"
                    }
                  >
                    {isVoiceEnabled ? (
                      <>
                        <Volume2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>Voice On</span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>Voice Off</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            {/* Scrollable Chat Section */}
            <div className="flex-1 min-h-0 relative">
              <CardContent className="p-0 border-none bg-muted/20">
                <div
                  className="overflow-y-auto p-4 bg-background/70 custom-scrollbar chat-pattern"
                  style={{
                    height: "50vh", // default for most screens
                  }}
                >
                  <div className="flex flex-col space-y-3 sm:space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                          } w-full`}
                      >
                        <div
                          className={`max-w-[95%] sm:max-w-[90%] md:max-w-[80%] rounded-lg p-3 sm:p-4 ${message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : message.role === "system"
                              ? "bg-muted text-muted-foreground text-xs sm:text-sm"
                              : "bg-secondary"
                            }`}
                        >
                          {message.role === "user" && message.isVoiceInput && (
                            <div className="flex items-center justify-end text-xs text-primary-foreground/70 m-1 sm:m-2">
                              <Mic className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              <span className="ml-1">
                                {UI_TEXT.voiceMessage}
                              </span>
                            </div>
                          )}

                          {message.role === "assistant" &&
                            isSpeaking &&
                            currentSpeakingMessageId === message.id && (
                              <div className="flex items-center text-xs text-muted-foreground mb-1">
                                <Volume2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1 animate-pulse" />
                                {UI_TEXT.speaking}
                              </div>
                            )}

                          <div className="whitespace-pre-wrap break-words text-sm p-2">
                            {message.content}
                          </div>

                          {message.role === "assistant" && (
                            <div className="flex flex-wrap justify-end mt-2 gap-1 sm:gap-2">
                              {isVoiceEnabled &&
                                (isSpeaking &&
                                  currentSpeakingMessageId === message.id ? (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="h-6 sm:h-7 px-2 sm:px-3 text-xs"
                                    onClick={stopSpeaking}
                                    title="Stop speaking"
                                  >
                                    <Square className="h-3 w-3 mr-1" />
                                    <span className="hidden sm:inline">
                                      Stop Speaking
                                    </span>
                                    <span className="sm:hidden">Stop</span>
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 sm:h-7 px-2 text-xs"
                                    onClick={() =>
                                      speakText(message.content, message.id)
                                    }
                                    title={UI_TEXT.speakAgain}
                                  >
                                    <Play className="h-3 w-3 mr-1" />
                                    <span className="hidden sm:inline">
                                      {UI_TEXT.speakAgain}
                                    </span>
                                    <span className="sm:hidden">Play</span>
                                  </Button>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {isLoading && (
                      <div className="flex justify-start w-full">
                        <div className="bg-secondary/80 backdrop-blur-sm rounded-lg p-3 max-w-[90%] sm:max-w-[80%] shadow-sm border border-primary/10">
                          <div className="flex items-center space-x-3">
                            {/* Elegant thinking animation */}
                            <div className="flex space-x-1">
                              <div
                                className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse"
                                style={{ animationDelay: "0ms" }}
                              ></div>
                              <div
                                className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse"
                                style={{ animationDelay: "300ms" }}
                              ></div>
                              <div
                                className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse"
                                style={{ animationDelay: "600ms" }}
                              ></div>
                            </div>
                            <span className="text-xs sm:text-sm text-muted-foreground">
                              {UI_TEXT.tutorThinking}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </div>
              </CardContent>
            </div>
            {/* Fixed Mic Section at Bottom */}
            <CardFooter className="sticky bottom-0 left-0 right-0 z-10 border-t bg-card pt-2 pb-3 px-3 sm:px-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <div className="flex w-full flex-col items-center space-y-2">
                {/* Clear Voice Message Button - only show when mic is active */}
                {transcript && transcript.trim().length > 0 && micState === MicState.ACTIVE && (
                  <div
                    className="text-muted-foreground hover:text-destructive cursor-pointer text-xs"
                    onClick={() => {
                      cleanupSpeechRecognition();
                      setMicState(MicState.INACTIVE);
                      setTranscript("");
                      setTimeout(() => {
                        if (isSessionActive) startMicrophone();
                      }, 100);
                    }}
                  >
                    Clear
                  </div>
                )}
                <Button
                  variant={
                    micState === MicState.ACTIVE
                      ? "destructive"
                      : micState === MicState.DISABLED
                        ? "outline"
                        : "default"
                  }
                  size="icon"
                  className={`h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-full shadow-md ${micState === MicState.ACTIVE
                    ? "animate-pulse shadow-red-200"
                    : micState === MicState.DISABLED
                      ? "opacity-60 cursor-not-allowed"
                      : ""
                    }`}
                  onClick={handleMicrophoneClick}
                  disabled={micState === MicState.DISABLED || isLoading}
                >
                  {micState === MicState.ACTIVE ? (
                    <Square className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                  ) : micState === MicState.DISABLED ? (
                    <MicOff className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                  ) : (
                    <Mic className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                  )}
                </Button>

                {micState === MicState.ACTIVE ? (
                  <div className="w-full flex flex-col items-center">
                    <div className="flex items-center justify-center space-x-1 mb-1">
                      <div
                        className="bg-red-400 h-1.5 w-1.5 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></div>
                      <div
                        className="bg-red-400 h-1.5 w-1.5 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      ></div>
                      <div
                        className="bg-red-400 h-1.5 w-1.5 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></div>
                      <div
                        className="bg-red-400 h-1.5 w-1.5 rounded-full animate-bounce"
                        style={{ animationDelay: "450ms" }}
                      ></div>
                    </div>
                    <p className="text-xs text-red-500 font-medium">
                      Recording...
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground text-center">
                      {UI_TEXT.speakClearly}
                    </p>
                    {transcript && (
                      <div className="w-full max-h-16 sm:max-h-20 overflow-y-auto mt-2 p-2 bg-red-50 border border-red-100 rounded-md text-xs sm:text-sm text-center">
                        {transcript}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-center text-muted-foreground">
                    {micState === MicState.DISABLED
                      ? isSpeaking
                        ? UI_TEXT.aiSpeaking
                        : UI_TEXT.tutorThinking
                      : UI_TEXT.pressToStart}
                  </p>
                )}
              </div>
            </CardFooter>
          </Card>

          {/* Info panel */}
          <Card className="lg:w-[280px] xl:w-[300px] flex flex-col w-full">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-lg sm:text-xl">Session Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 flex-grow text-sm">
              <div>
                <h3 className="font-medium mb-1">Mode</h3>
                <Badge variant="secondary" className="text-xs">
                  {modes.find((m) => m.id === selectedMode)?.name ||
                    selectedMode}
                </Badge>
              </div>

              <div>
                <h3 className="font-medium mb-1">Subject</h3>
                <Badge variant="secondary" className="text-xs">
                  {selectedSubject}
                </Badge>
              </div>

              <div className="pt-3 sm:pt-4 border-t">
                <h3 className="font-medium mb-2">Quick Tips</h3>
                <ul className="text-xs sm:text-sm space-y-2">
                  <li className="flex items-start">
                    <Mic className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 mt-0.5 text-primary flex-shrink-0" />
                    <span>
                      Click the microphone button to start and stop recording
                    </span>
                  </li>
                  <li className="flex items-start">
                    <Volume2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 mt-0.5 text-primary flex-shrink-0" />
                    <span>
                      Use the Voice On/Off button at the top to control voice
                      output
                    </span>
                  </li>
                  <li className="flex items-start">
                    <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 mt-0.5 text-primary flex-shrink-0" />
                    <span>Click Play on any message to hear it again</span>
                  </li>
                  <li className="flex items-start">
                    <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 mt-0.5 text-destructive flex-shrink-0" />
                    <span className="font-medium">
                      To end the session, use the red button below
                    </span>
                  </li>
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant="destructive"
                className="w-full py-1.5 sm:py-2 text-sm sm:text-base font-medium shadow-md hover:bg-red-600"
                onClick={endSession}
                disabled={isEndingSession || isLoading}
              >
                {isEndingSession ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Ending Session...
                  </>
                ) : (
                  <>End Session</>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
