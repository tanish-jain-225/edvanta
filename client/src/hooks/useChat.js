import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../lib/api";
import { getCachedData, setCachedData, queueSyncAction } from "../lib/offlineStorage";

export function useChat(user, authLoading) {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const speechUtteranceRef = useRef(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  // Load chat sessions from backend/cache on mount or user change
  const loadSessions = useCallback(async () => {
    if (!user?.email) {
      setChatSessions([]);
      setMessages([]);
      setCurrentSessionId(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      if (!navigator.onLine) {
        const cached = getCachedData(user.email, "chat_sessions", []);
        setChatSessions(cached);
        if (cached.length > 0) {
          setCurrentSessionId(cached[0].id);
          setMessages(cached[0].messages || []);
        }
        setIsLoading(false);
        return;
      }

      const response = await api.get("/api/chat/loadChat", { user_email: user.email });
      if (response.success && response.data.success) {
        const sessions = response.data.sessions || [];
        setChatSessions(sessions);
        setCachedData(user.email, "chat_sessions", sessions);

        const activeSessionId = response.data.currentSessionId || (sessions.length > 0 ? sessions[0].id : null);
        setCurrentSessionId(activeSessionId);
        
        if (activeSessionId) {
          const activeSession = sessions.find(s => s.id === activeSessionId);
          setMessages(activeSession ? (activeSession.messages || []) : []);
        } else {
          setMessages([]);
        }
      } else {
        // Fallback to cache if request failed
        const cached = getCachedData(user.email, "chat_sessions", []);
        setChatSessions(cached);
        if (cached.length > 0) {
          setCurrentSessionId(cached[0].id);
          setMessages(cached[0].messages || []);
        }
      }
    } catch (error) {
      console.error("Failed to load chat history:", error);
      const cached = getCachedData(user.email, "chat_sessions", []);
      setChatSessions(cached);
      if (cached.length > 0) {
        setCurrentSessionId(cached[0].id);
        setMessages(cached[0].messages || []);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    if (!authLoading) {
      loadSessions();
    }
  }, [authLoading, loadSessions]);

  // Handle background sync updates
  useEffect(() => {
    const handleSyncComplete = (event) => {
      if (event.detail && event.detail.type === "chat") {
        loadSessions();
      }
    };
    window.addEventListener("edvanta-sync-complete", handleSyncComplete);
    return () => window.removeEventListener("edvanta-sync-complete", handleSyncComplete);
  }, [loadSessions]);

  // Switch to an existing session
  const switchToSession = useCallback((sessionId) => {
    setCurrentSessionId(sessionId);
    const session = chatSessions.find(s => s.id === sessionId);
    setMessages(session ? (session.messages || []) : []);
    setIsHistoryOpen(false);
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setCurrentlySpeakingId(null);
    }
  }, [chatSessions]);

  // Create a new session
  const createNewSession = useCallback(async () => {
    if (!user?.email) return;

    const sessionName = `Chat Session #${chatSessions.length + 1}`;
    const tempSessionId = `temp-${Date.now()}`;

    const newSession = {
      id: tempSessionId,
      name: sessionName,
      messages: [],
      messageCount: 0,
      lastActivity: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    // Update local state and cache immediately
    const updatedSessions = [newSession, ...chatSessions];
    setChatSessions(updatedSessions);
    setCachedData(user.email, "chat_sessions", updatedSessions);
    setCurrentSessionId(tempSessionId);
    setMessages([]);
    setIsHistoryOpen(false);

    if (!navigator.onLine) {
      queueSyncAction(user.email, "CREATE_CHAT_SESSION", {
        sessionName,
        userEmail: user.email,
        tempSessionId
      });
      return;
    }

    try {
      const response = await api.post("/api/chat/createChat", {
        sessionName,
        userEmail: user.email
      });
      if (response.success && response.data.success) {
        const realSession = response.data.session;
        // Swap temp ID with real server ID in local state/cache
        const finalizedSessions = updatedSessions.map(s => 
          s.id === tempSessionId ? realSession : s
        );
        setChatSessions(finalizedSessions);
        setCachedData(user.email, "chat_sessions", finalizedSessions);
        setCurrentSessionId(realSession.id);
      }
    } catch (error) {
      console.error("Error creating new session on server:", error);
      // Keep local temp session and queue for sync
      queueSyncAction(user.email, "CREATE_CHAT_SESSION", {
        sessionName,
        userEmail: user.email,
        tempSessionId
      });
    }
  }, [user?.email, chatSessions]);

  // Delete a session
  const deleteSession = useCallback(async (sessionId) => {
    if (!user?.email) return;

    if (!window.confirm("Are you sure you want to delete this chat session?")) {
      return;
    }

    // Stop speaking if active
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setCurrentlySpeakingId(null);
    }

    const updatedSessions = chatSessions.filter(s => s.id !== sessionId);
    setChatSessions(updatedSessions);
    setCachedData(user.email, "chat_sessions", updatedSessions);

    if (currentSessionId === sessionId) {
      if (updatedSessions.length > 0) {
        switchToSession(updatedSessions[0].id);
      } else {
        setCurrentSessionId(null);
        setMessages([]);
      }
    }

    if (!navigator.onLine) {
      queueSyncAction(user.email, "DELETE_CHAT_SESSION", { sessionId });
      return;
    }

    try {
      await api.delete(`/api/chat/deleteChat/${sessionId}?userEmail=${encodeURIComponent(user.email)}`);
    } catch (error) {
      console.error("Error deleting session on server:", error);
      queueSyncAction(user.email, "DELETE_CHAT_SESSION", { sessionId });
    }
  }, [user?.email, chatSessions, currentSessionId, switchToSession]);

  // Send a message
  const handleSendMessage = useCallback(async () => {
    if (!currentMessage.trim() || !user?.email) return;

    const messageContent = currentMessage.trim();
    setCurrentMessage("");

    // Automatically create session if none exists
    let sessionId = currentSessionId;
    let updatedSessions = [...chatSessions];
    
    if (!sessionId) {
      const sessionName = `Chat Session #${chatSessions.length + 1}`;
      const tempSessionId = `temp-${Date.now()}`;
      
      const newSession = {
        id: tempSessionId,
        name: sessionName,
        messages: [],
        messageCount: 0,
        lastActivity: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      
      updatedSessions = [newSession, ...chatSessions];
      setChatSessions(updatedSessions);
      setCachedData(user.email, "chat_sessions", updatedSessions);
      setCurrentSessionId(tempSessionId);
      sessionId = tempSessionId;

      if (!navigator.onLine) {
        queueSyncAction(user.email, "CREATE_CHAT_SESSION", {
          sessionName,
          userEmail: user.email,
          tempSessionId
        });
      } else {
        try {
          const response = await api.post("/api/chat/createChat", {
            sessionName,
            userEmail: user.email
          });
          if (response.success && response.data.success) {
            const realSession = response.data.session;
            updatedSessions = updatedSessions.map(s => s.id === tempSessionId ? realSession : s);
            setChatSessions(updatedSessions);
            setCachedData(user.email, "chat_sessions", updatedSessions);
            setCurrentSessionId(realSession.id);
            sessionId = realSession.id;
          }
        } catch {
          queueSyncAction(user.email, "CREATE_CHAT_SESSION", {
            sessionName,
            userEmail: user.email,
            tempSessionId
          });
        }
      }
    }

    const tempMsgId = `msg-${Date.now()}`;
    const userMessage = {
      id: tempMsgId,
      role: "user",
      content: messageContent,
      timestamp: new Date().toISOString()
    };

    // Update local messages state
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    // Update session list cache with new user message
    const refreshedSessions = updatedSessions.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          messages: [...(s.messages || []), userMessage],
          messageCount: (s.messageCount || 0) + 1,
          lastActivity: new Date().toISOString()
        };
      }
      return s;
    });
    setChatSessions(refreshedSessions);
    setCachedData(user.email, "chat_sessions", refreshedSessions);

    if (!navigator.onLine) {
      // Offline fallback: Add temporary assistant message
      const offlineBotMessage = {
        id: `bot-temp-${tempMsgId}`,
        role: "assistant",
        content: "You are currently offline. Your question has been queued and will be processed automatically when connection is restored.",
        timestamp: new Date().toISOString()
      };
      
      const offlineMessages = [...newMessages, offlineBotMessage];
      setMessages(offlineMessages);
      
      const offlineSessions = refreshedSessions.map(s => {
        if (s.id === sessionId) {
          return {
            ...s,
            messages: [...(s.messages || []), offlineBotMessage],
            messageCount: (s.messageCount || 0) + 1,
            lastActivity: new Date().toISOString()
          };
        }
        return s;
      });
      setChatSessions(offlineSessions);
      setCachedData(user.email, "chat_sessions", offlineSessions);

      queueSyncAction(user.email, "SEND_CHAT_MESSAGE", {
        message: messageContent,
        userEmail: user.email,
        chatHistory: messages,
        sessionId,
        tempMsgId
      });
      return;
    }

    setIsTyping(true);
    try {
      const response = await api.post("/api/chat/message", {
        input: messageContent,
        userEmail: user.email,
        chatHistory: messages,
        sessionId
      });

      if (response.success && response.data.success) {
        const botMessage = {
          role: "assistant",
          content: response.data.message,
          timestamp: response.data.timestamp || new Date().toISOString()
        };

        const finalMessages = [...newMessages, botMessage];
        setMessages(finalMessages);

        // Update local session with bot response
        const finalSessions = chatSessions.map(s => {
          if (s.id === sessionId) {
            const history = s.messages || [];
            // Remove temp messages and put real history
            const baseHistory = history.filter(m => m.id !== tempMsgId);
            return {
              ...s,
              messages: [...baseHistory, userMessage, botMessage],
              messageCount: baseHistory.length + 2,
              lastActivity: new Date().toISOString()
            };
          }
          return s;
        });
        setChatSessions(finalSessions);
        setCachedData(user.email, "final_sessions", finalSessions);
      } else {
        throw new Error("Chat message failed");
      }
    } catch (error) {
      console.error("Error sending chat message:", error);
      // Rollback to offline sync structure
      queueSyncAction(user.email, "SEND_CHAT_MESSAGE", {
        message: messageContent,
        userEmail: user.email,
        chatHistory: messages,
        sessionId,
        tempMsgId
      });
    } finally {
      setIsTyping(false);
    }
  }, [currentMessage, currentSessionId, chatSessions, messages, user?.email]);

  // TTS Speech Synthesis handling
  const toggleSpeakMessage = useCallback((messageId, text) => {
    if (!window.speechSynthesis) return;

    if (currentlySpeakingId === messageId) {
      window.speechSynthesis.cancel();
      setCurrentlySpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Clean text of markdown blocks
    const cleanedText = text
      .replace(/```[\s\S]*?```/g, "") // remove code blocks
      .replace(/`([^`]+)`/g, "$1") // inline code
      .replace(/\*\*(.*?)\*\*/g, "$1") // bold
      .replace(/\*(.*?)\*/g, "$1"); // italic

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    speechUtteranceRef.current = utterance;
    setCurrentlySpeakingId(messageId);

    utterance.onend = () => {
      setCurrentlySpeakingId(null);
    };

    utterance.onerror = () => {
      setCurrentlySpeakingId(null);
    };

    window.speechSynthesis.speak(utterance);
  }, [currentlySpeakingId]);

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    messages,
    currentMessage,
    setCurrentMessage,
    isTyping,
    chatSessions,
    currentSessionId,
    isHistoryOpen,
    setIsHistoryOpen,
    isLoading,
    currentlySpeakingId,
    messagesEndRef,
    inputRef,
    createNewSession,
    switchToSession,
    deleteSession,
    handleSendMessage,
    toggleSpeakMessage
  };
}
