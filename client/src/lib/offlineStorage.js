/**
 * Offline Storage and Synchronization Engine for Edvanta PWA
 */
import { api } from "./api";

// Cache Keys namespaces
const CACHE_PREFIX = "edvanta_cache_";
const SYNC_QUEUE_PREFIX = "edvanta_sync_queue_";
const ID_MAPPING_PREFIX = "edvanta_id_mapping_";

/**
 * Get cached data for a specific user and key
 */
export const getCachedData = (userEmail, key, fallback = null) => {
  if (!userEmail) return fallback;
  try {
    const value = localStorage.getItem(`${CACHE_PREFIX}${userEmail}_${key}`);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.error(`Error reading cache for ${key}:`, error);
    return fallback;
  }
};

/**
 * Set cached data for a specific user and key
 */
export const setCachedData = (userEmail, key, data) => {
  if (!userEmail) return;
  try {
    localStorage.setItem(
      `${CACHE_PREFIX}${userEmail}_${key}`,
      JSON.stringify(data)
    );
  } catch (error) {
    console.error(`Error writing cache for ${key}:`, error);
  }
};

/**
 * Add an action to the user's sync queue
 */
export const queueSyncAction = (userEmail, type, data) => {
  if (!userEmail) return;
  try {
    const queueKey = `${SYNC_QUEUE_PREFIX}${userEmail}`;
    const queue = JSON.parse(localStorage.getItem(queueKey) || "[]");
    
    const newAction = {
      id: `action-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type,
      data,
      timestamp: new Date().toISOString(),
    };
    
    queue.push(newAction);
    localStorage.setItem(queueKey, JSON.stringify(queue));
    console.log(`[Offline Storage] Queued action: ${type}`, newAction);
    return newAction.id;
  } catch (error) {
    console.error("Error queueing sync action:", error);
  }
};

/**
 * Get the current sync queue for a user
 */
export const getSyncQueue = (userEmail) => {
  if (!userEmail) return [];
  try {
    return JSON.parse(localStorage.getItem(`${SYNC_QUEUE_PREFIX}${userEmail}`) || "[]");
  } catch (error) {
    console.error("Error reading sync queue:", error);
    return [];
  }
};

/**
 * Clear the sync queue for a user
 */
export const clearSyncQueue = (userEmail) => {
  if (!userEmail) return;
  localStorage.removeItem(`${SYNC_QUEUE_PREFIX}${userEmail}`);
};

/**
 * Manage ID mappings (temporary client UUIDs to database server UUIDs)
 */
export const setSessionIdMapping = (userEmail, tempId, realId) => {
  if (!userEmail) return;
  try {
    const mappingKey = `${ID_MAPPING_PREFIX}${userEmail}`;
    const mappings = JSON.parse(localStorage.getItem(mappingKey) || "{}");
    mappings[tempId] = realId;
    localStorage.setItem(mappingKey, JSON.stringify(mappings));
  } catch (error) {
    console.error("Error setting session ID mapping:", error);
  }
};

export const getSessionIdMapping = (userEmail, tempId) => {
  if (!userEmail) return null;
  try {
    const mappingKey = `${ID_MAPPING_PREFIX}${userEmail}`;
    const mappings = JSON.parse(localStorage.getItem(mappingKey) || "{}");
    return mappings[tempId] || null;
  } catch (error) {
    console.error("Error reading session ID mapping:", error);
    return null;
  }
};

/**
 * Update local cached chat session when temp ID is resolved to server ID
 */
const updateChatSessionId = (userEmail, tempId, realId) => {
  const sessions = getCachedData(userEmail, "chat_sessions", []);
  const updatedSessions = sessions.map((session) => {
    if (session.id === tempId) {
      return { ...session, id: realId };
    }
    return session;
  });
  setCachedData(userEmail, "chat_sessions", updatedSessions);
};

/**
 * Replace local offline placeholder message with real AI message from server
 */
const updateLocalChatMessage = (userEmail, sessionId, tempMsgId, serverResult) => {
  const sessions = getCachedData(userEmail, "chat_sessions", []);
  
  const updatedSessions = sessions.map((session) => {
    if (session.id === sessionId) {
      // Find and update messages
      const finalMessages = session.messages.reduce((acc, msg) => {
        // Replace temporary user message with server-timestamped message
        if (msg.id === tempMsgId) {
          acc.push({
            role: "user",
            content: msg.content,
            timestamp: serverResult.timestamp || new Date().toISOString(),
          });
        }
        // Replace temporary placeholder message with real bot answer
        else if (msg.id === `bot-temp-${tempMsgId}`) {
          acc.push({
            role: "assistant",
            content: serverResult.message,
            timestamp: serverResult.timestamp || new Date().toISOString(),
          });
        }
        // Keep other messages as is
        else {
          acc.push(msg);
        }
        return acc;
      }, []);

      return {
        ...session,
        messages: finalMessages,
        messageCount: finalMessages.length,
        lastActivity: serverResult.timestamp || new Date().toISOString(),
      };
    }
    return session;
  });

  setCachedData(userEmail, "chat_sessions", updatedSessions);
};

/**
 * Synchronization Loop - processes the queue sequentially
 */
let isSyncing = false;
export const processSyncQueue = async (userEmail) => {
  if (isSyncing || !navigator.onLine || !userEmail) return;
  
  const queueKey = `${SYNC_QUEUE_PREFIX}${userEmail}`;
  const queue = JSON.parse(localStorage.getItem(queueKey) || "[]");
  if (queue.length === 0) return;

  isSyncing = true;
  console.log(`[Offline Sync] Processing ${queue.length} actions for ${userEmail}...`);

  const remainingActions = [];
  let isChatChanged = false;
  let isQuizChanged = false;
  let isRoadmapChanged = false;
  let isResumeChanged = false;

  for (const action of queue) {
    try {
      switch (action.type) {
        case "LOG_QUIZ_HISTORY": {
          const result = await api.post("/api/quiz-history", action.data);
          if (!result.success) throw new Error(result.error?.message || "Quiz history log failed");
          isQuizChanged = true;
          break;
        }

        case "CLEAR_QUIZ_HISTORY": {
          const result = await api.delete(
            `/api/quiz-history?user_email=${encodeURIComponent(userEmail)}`
          );
          if (!result.success) throw new Error(result.error?.message || "Clear quiz history failed");
          isQuizChanged = true;
          break;
        }

        case "CREATE_CHAT_SESSION": {
          const result = await api.post("/api/chat/createChat", {
            sessionName: action.data.sessionName,
            userEmail: action.data.userEmail,
          });
          if (result.success && result.data?.success) {
            setSessionIdMapping(userEmail, action.data.tempSessionId, result.data.session.id);
            updateChatSessionId(userEmail, action.data.tempSessionId, result.data.session.id);
            isChatChanged = true;
          } else {
            throw new Error(result.error?.message || "Chat creation sync failed");
          }
          break;
        }

        case "SEND_CHAT_MESSAGE": {
          let targetSessionId = action.data.sessionId;
          // Check if it's a temporary ID mapped to a real server ID
          if (targetSessionId.startsWith("temp-")) {
            const mappedId = getSessionIdMapping(userEmail, targetSessionId);
            if (mappedId) {
              targetSessionId = mappedId;
            } else {
              // Defer this action until session creation finishes
              remainingActions.push(action);
              continue;
            }
          }

          const result = await api.post("/api/chat/message", {
            input: action.data.message,
            userEmail: action.data.userEmail,
            chatHistory: action.data.chatHistory,
            sessionId: targetSessionId,
          });

          if (result.success && result.data?.success) {
            updateLocalChatMessage(userEmail, targetSessionId, action.data.tempMsgId, result.data);
            isChatChanged = true;
          } else {
            throw new Error(result.error?.message || "Chat message sync failed");
          }
          break;
        }

        case "DELETE_CHAT_SESSION": {
          let targetSessionId = action.data.sessionId;
          if (targetSessionId.startsWith("temp-")) {
            const mappedId = getSessionIdMapping(userEmail, targetSessionId);
            if (mappedId) {
              targetSessionId = mappedId;
            } else {
              // Temp session was never synced, so no need to delete on server
              continue;
            }
          }

          const result = await api.delete(
            `/api/chat/deleteChat/${targetSessionId}?userEmail=${encodeURIComponent(
              userEmail
            )}`
          );
          if (!result.success && result.status !== 404) {
            throw new Error(result.error?.message || "Chat deletion sync failed");
          }
          isChatChanged = true;
          break;
        }

        case "DELETE_QUIZ": {
          const result = await api.delete(`/api/tools/quizzes/${action.data.quizId}`);
          if (!result.success && result.status !== 404) {
            throw new Error(result.error?.message || "Quiz deletion sync failed");
          }
          isQuizChanged = true;
          break;
        }

        case "DELETE_ROADMAP": {
          const result = await api.delete(
            `/api/roadmap/${action.data.roadmapId}?user_email=${encodeURIComponent(
              userEmail
            )}`
          );
          if (!result.success && result.status !== 404) {
            throw new Error(result.error?.message || "Roadmap deletion sync failed");
          }
          isRoadmapChanged = true;
          break;
        }

        case "DELETE_RESUME": {
          const result = await api.delete(
            `/api/resume/history/${action.data.resumeId}`
          );
          if (!result.success && result.status !== 404) {
            throw new Error(result.error?.message || "Resume deletion sync failed");
          }
          isResumeChanged = true;
          break;
        }

        default:
          console.warn(`[Offline Sync] Unsupported action type: ${action.type}`);
      }
    } catch (error) {
      console.error(`[Offline Sync] Action execution error on ${action.type}:`, error);
      // Retain the action for a later sync attempt
      remainingActions.push(action);
    }
  }

  // Update sync queue list in localStorage
  localStorage.setItem(queueKey, JSON.stringify(remainingActions));
  isSyncing = false;

  // Trigger sync completed event notifications
  if (isQuizChanged) {
    window.dispatchEvent(new CustomEvent("edvanta-sync-complete", { detail: { type: "quiz" } }));
  }
  if (isChatChanged) {
    window.dispatchEvent(new CustomEvent("edvanta-sync-complete", { detail: { type: "chat" } }));
  }
  if (isRoadmapChanged) {
    window.dispatchEvent(new CustomEvent("edvanta-sync-complete", { detail: { type: "roadmap" } }));
  }
  if (isResumeChanged) {
    window.dispatchEvent(new CustomEvent("edvanta-sync-complete", { detail: { type: "resume" } }));
  }

  console.log(`[Offline Sync] Sync complete. ${remainingActions.length} items remain in queue.`);
};
