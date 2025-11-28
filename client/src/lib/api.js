/**
 * Centralized API utility for Edvanta client
 * 
 * Provides consistent error handling, loading states, and network retry logic
 * for seamless backend integration across all components.
 */

import backEndURL from '../hooks/helper';

// Error types for better error handling
export const ErrorTypes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  TIMEOUT: 'TIMEOUT'
};

// API Response wrapper
class APIResponse {
  constructor(success, data, error = null, status = null) {
    this.success = success;
    this.data = data;
    this.error = error;
    this.status = status;
  }

  static success(data, status = 200) {
    return new APIResponse(true, data, null, status);
  }

  static error(error, status = null, type = ErrorTypes.SERVER_ERROR) {
    return new APIResponse(false, null, { message: error, type, status }, status);
  }
}

// Centralized API client
export class APIClient {
  constructor(baseURL = backEndURL) {
    this.baseURL = baseURL?.replace(/\/$/, '') || 'http://localhost:5000';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
    this.retryAttempts = 3;
    this.retryDelay = 1000; // ms
  }

  // Enhanced fetch with retry logic and proper error handling
  async fetchWithRetry(url, options = {}, attempts = this.retryAttempts) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      return response;
    } catch (error) {
      if (attempts > 1 && (error.name === 'TypeError' || error.name === 'AbortError')) {
        console.warn(`Retrying request to ${url}. Attempts left: ${attempts - 1}`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.fetchWithRetry(url, options, attempts - 1);
      }
      throw error;
    }
  }

  // Process response with comprehensive error handling
  async processResponse(response, endpoint) {
    try {
      const contentType = response.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (response.ok) {
        return APIResponse.success(data, response.status);
      }

      // Handle different error types
      let errorType;
      switch (response.status) {
        case 400:
          errorType = ErrorTypes.VALIDATION_ERROR;
          break;
        case 401:
        case 403:
          errorType = ErrorTypes.AUTH_ERROR;
          break;
        case 404:
          errorType = ErrorTypes.NOT_FOUND;
          break;
        case 500:
        case 502:
        case 503:
          errorType = ErrorTypes.SERVER_ERROR;
          break;
        default:
          errorType = ErrorTypes.SERVER_ERROR;
      }

      const errorMessage = data?.error || data?.message || `HTTP ${response.status}`;
      return APIResponse.error(errorMessage, response.status, errorType);
    } catch (parseError) {
      return APIResponse.error(
        `Failed to parse response from ${endpoint}`, 
        response.status, 
        ErrorTypes.SERVER_ERROR
      );
    }
  }

  // Generic API call method
  async call(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      console.log(`🔗 API Call: ${options.method || 'GET'} ${endpoint}`);
      
      const response = await this.fetchWithRetry(url, options);
      const result = await this.processResponse(response, endpoint);
      
      if (result.success) {
        console.log(`✅ API Success: ${endpoint}`);
      } else {
        console.warn(`⚠️ API Error: ${endpoint}`, result.error);
      }
      
      return result;
    } catch (error) {
      console.error(`💥 Network Error: ${endpoint}`, error);
      
      let errorType = ErrorTypes.NETWORK_ERROR;
      if (error.name === 'AbortError') {
        errorType = ErrorTypes.TIMEOUT;
      }
      
      return APIResponse.error(
        error.message || 'Network request failed',
        null,
        errorType
      );
    }
  }

  // Convenience methods for different HTTP verbs
  async get(endpoint, params = {}) {
    const url = new URL(`${this.baseURL}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.append(key, value);
      }
    });

    return this.call(url.pathname + url.search);
  }

  async post(endpoint, data = {}) {
    return this.call(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint, data = {}) {
    return this.call(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint) {
    return this.call(endpoint, {
      method: 'DELETE',
    });
  }

  // File upload method
  async uploadFile(endpoint, file, additionalData = {}) {
    const formData = new FormData();
    formData.append('file', file);
    
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });

    return this.call(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        // Remove Content-Type header to let browser set boundary for FormData
      },
    });
  }
}

// Create default API client instance
export const api = new APIClient();

// Specialized API methods for common operations
export const edvantaAPI = {
  // User stats
  getUserStats(userEmail) {
    return api.get('/api/user-stats', { user_email: userEmail });
  },

  // Quizzes
  generateQuiz(topic, difficulty = 'medium', numberOfQuestions = 10) {
    return api.post('/api/quizzes/generate', { topic, difficulty, numberOfQuestions });
  },

  getUserQuizzes(userEmail) {
    return api.get('/api/tools/quizzes', { user_email: userEmail });
  },

  saveQuiz(quizData, userEmail) {
    return api.post('/api/tools/quizzes', { ...quizData, user_email: userEmail });
  },

  deleteQuiz(quizId) {
    return api.delete(`/api/tools/quizzes/${quizId}`);
  },

  submitQuiz(quizId, answers) {
    return api.post('/api/quizzes/submit', { quiz_id: quizId, answers });
  },

  getQuizHistory(userEmail) {
    return api.get('/api/quiz-history', { user_email: userEmail });
  },

  logQuizHistory(historyData) {
    return api.post('/api/quiz-history', historyData);
  },

  clearQuizHistory(userEmail) {
    return api.delete('/api/quiz-history', { user_email: userEmail });
  },

  // Roadmaps
  generateRoadmap(goal, background, duration, userEmail) {
    return api.post('/api/roadmap/generate', { goal, background, duration, user_email: userEmail });
  },

  getUserRoadmaps(userEmail) {
    return api.get('/api/roadmap/user', { user_email: userEmail });
  },

  getRoadmapDetails(roadmapId, userEmail) {
    return api.get(`/api/roadmap/${roadmapId}`, { user_email: userEmail });
  },

  updateRoadmapProgress(roadmapId, progressData, userEmail) {
    return api.put(`/api/roadmap/${roadmapId}`, { ...progressData, user_email: userEmail });
  },

  deleteRoadmap(roadmapId, userEmail) {
    return api.delete(`/api/roadmap/${roadmapId}`, { user_email: userEmail });
  },

  downloadRoadmap(roadmapId, userEmail) {
    return api.get(`/api/roadmap/download/${roadmapId}`, { user_email: userEmail });
  },

  // Visual generation
  generateVisualFromText(text, style = 'educational', duration = 30, userEmail = null) {
    return api.post('/api/visual/text-to-video', { 
      text, 
      style, 
      duration,
      user_email: userEmail,
      label: text.slice(0, 40)
    });
  },

  generateVisualFromPDF(pdfUrl, style = 'educational', duration = 60, userEmail = null, label = 'PDF Upload') {
    return api.post('/api/visual/pdf-url-to-video', { 
      pdf_url: pdfUrl, 
      style, 
      duration,
      user_email: userEmail,
      label
    });
  },

  generateVisualFromAudio(audioUrl, style = 'educational', userEmail = null, label = 'Audio Upload') {
    return api.post('/api/visual/audio-to-video', { 
      audio_url: audioUrl, 
      style,
      user_email: userEmail,
      label
    });
  },

  // Chatbot
  sendChatMessage(message, userEmail, conversationId = null) {
    return api.post('/api/chat', { message, user_email: userEmail, conversation_id: conversationId });
  },

  loadChatHistory(userEmail) {
    return api.get('/api/chat/loadChat', { userEmail });
  },

  // Tutor
  startTutorSession(message, userEmail, mode = 'text') {
    return api.post('/api/tutor/session', { message, user_email: userEmail, mode });
  },

  // Resume
  analyzeResume(resumeData) {
    return api.post('/api/resume/analyze', resumeData);
  },

  uploadResume(file) {
    return api.uploadFile('/api/resume/upload', file);
  },

  buildResume(resumeData) {
    return api.post('/api/resume/builder', resumeData);
  },

  // Health checks
  getHealth() {
    return api.get('/api/health');
  },

  getRuntimeFeatures() {
    return api.get('/api/runtime-features');
  },
};

// Error handling utilities
export const handleAPIError = (error, fallbackMessage = 'Something went wrong') => {
  if (!error) return fallbackMessage;
  
  switch (error.type) {
    case ErrorTypes.NETWORK_ERROR:
      return 'Please check your internet connection and try again.';
    case ErrorTypes.SERVER_ERROR:
      return 'Our servers are experiencing issues. Please try again later.';
    case ErrorTypes.VALIDATION_ERROR:
      return error.message || 'Please check your input and try again.';
    case ErrorTypes.AUTH_ERROR:
      return 'Please log in to access this feature.';
    case ErrorTypes.NOT_FOUND:
      return 'The requested resource was not found.';
    case ErrorTypes.TIMEOUT:
      return 'The request took too long. Please try again.';
    default:
      return error.message || fallbackMessage;
  }
};

// Loading state hook for API calls
export const useAPICall = (initialLoading = false) => {
  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState(null);

  const execute = useCallback(async (apiCall) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiCall();
      
      if (result.success) {
        return result.data;
      } else {
        const errorMessage = handleAPIError(result.error);
        setError(errorMessage);
        return null;
      }
    } catch (err) {
      const errorMessage = handleAPIError(null, 'An unexpected error occurred');
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, execute, setError };
};

export default edvantaAPI;