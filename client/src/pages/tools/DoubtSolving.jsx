import React, { useState, useRef, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Lightbulb,
  Plus,
  History,
  Trash2,
  X,
  Clock,
  LogIn,
} from "lucide-react";
import backEndURL from "../../hooks/helper";
import { useAuth } from "../../hooks/useAuth";
import { getUserProfileImage } from "../../lib/utils";

export function DoubtSolving() {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Use authentication to get user email
  const { user, userProfile, loading: authLoading } = useAuth();

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize the component when user authentication is ready
  useEffect(() => {
    if (!authLoading) {
      initializeChat();
    }
  }, [authLoading, user]);

  const initializeChat = async () => {
    try {
      setIsLoading(true);
      if (user && user.email) {
        await loadChatSessions();
      }
    } catch (error) {
      console.error("Failed to initialize chat:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadChatSessions = async () => {
    if (!user || !user.email) return;

    try {
      const response = await fetch(
        `${backEndURL}/api/chat/loadChat?userEmail=${encodeURIComponent(
          user.email
        )}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setChatSessions(data.sessions || []);
          if (data.currentSessionId) {
            setCurrentSessionId(data.currentSessionId);
            // Load messages from current session
            const currentSession = data.sessions.find(
              (s) => s.id === data.currentSessionId
            );
            if (currentSession && currentSession.messages) {
              setMessages(currentSession.messages || []);
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to load chat sessions:", error);
    }
  };

  const createNewSession = async () => {
    if (!user || !user.email) return;

    try {
      const now = new Date();
      const sessionName = `Chat ${now.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })} at ${now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })}`;

      const response = await fetch(`${backEndURL}/api/chat/createChat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionName: sessionName,
          userEmail: user.email,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setChatSessions((prev) => [data.session, ...prev]);
          setCurrentSessionId(data.session.id);
          setMessages([]);
          setIsHistoryOpen(false);
        }
      }
    } catch (error) {
      console.error("Failed to create new session:", error);
    }
  };

  const switchToSession = async (sessionId) => {
    if (!user || !user.email) return;

    try {
      setCurrentSessionId(sessionId);
      const session = chatSessions.find((s) => s.id === sessionId);
      if (session) {
        setMessages(session.messages || []);

        // Update activity
        await fetch(
          `${backEndURL}/api/chat/updateActivity/${sessionId}/activity`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userEmail: user.email }),
          }
        );
      }
      setIsHistoryOpen(false);
    } catch (error) {
      console.error("Failed to switch session:", error);
    }
  };

  const deleteSession = async (sessionId) => {
    if (!user || !user.email) return;

    try {
      const response = await fetch(
        `${backEndURL}/api/chat/deleteChat/${sessionId}?userEmail=${encodeURIComponent(
          user.email
        )}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setChatSessions(data.remainingSessions || []);
          if (sessionId === currentSessionId) {
            if (data.remainingSessions.length > 0) {
              setCurrentSessionId(data.remainingSessions[0].id);
              setMessages(data.remainingSessions[0].messages || []);
            } else {
              setCurrentSessionId(null);
              setMessages([]);
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || !user || !user.email) return;

    const userMessage = {
      role: "user",
      content: currentMessage,
      timestamp: new Date().toISOString(), // Temporary timestamp, will be updated with server timestamp
    };

    // Add user message to UI immediately
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    const questionToSend = currentMessage;
    setCurrentMessage("");
    setIsTyping(true);

    try {
      // If no current session, create one
      let sessionId = currentSessionId;
      if (!sessionId) {
        const now = new Date();
        const sessionName = `Chat ${now.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })} at ${now.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })}`;

        const createResponse = await fetch(
          `${backEndURL}/api/chat/createChat`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionName: sessionName,
              userEmail: user.email,
            }),
          }
        );

        if (createResponse.ok) {
          const createData = await createResponse.json();
          if (createData.success) {
            sessionId = createData.session.id;
            setCurrentSessionId(sessionId);
            setChatSessions((prev) => [createData.session, ...prev]);
          }
        }
      }

      // Send message to AI with conversation context (excluding the temporary user message we just added)
      const response = await fetch(`${backEndURL}/api/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: questionToSend,
          userEmail: user.email,
          chatHistory: messages, // Use original messages, not the updated ones
          sessionId: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // Use server timestamp for both user and AI messages
        const serverTimestamp = data.timestamp;
        const updatedUserMessage = {
          ...userMessage,
          timestamp: serverTimestamp,
        };

        const botResponse = {
          role: "assistant",
          content: data.message,
          timestamp: serverTimestamp,
        };

        // Replace the temporary user message with the server-timestamped one and add bot response
        const finalMessages = [...messages, updatedUserMessage, botResponse];
        setMessages(finalMessages);

        // Update the session in local state
        setChatSessions((prev) =>
          prev.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  messages: finalMessages,
                  messageCount: finalMessages.length,
                  lastActivity: serverTimestamp,
                }
              : session
          )
        );
      }
    } catch (error) {
      console.error("Error calling API:", error);

      // Fallback response with server-like timestamp
      const errorResponse = {
        role: "assistant",
        content: `I'm sorry, I'm having trouble connecting to the server right now. However, I can see you're asking about "${questionToSend}". 

Here are some general tips:
1. **Break down the problem** - Try to identify the specific part you're struggling with
2. **Check the basics** - Make sure you understand the fundamental concepts  
3. **Look for examples** - Similar problems might help clarify the approach
4. **Practice step by step** - Work through the problem methodically

Please try again in a moment, and I'll be happy to provide a more detailed explanation!`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatUserContent = (content) => {
    // Simplified formatting for user messages with explicit white text
    return `<p class="text-white">${content.replace(/\n/g, "<br>")}</p>`;
  };

  const formatContent = (content) => {
    // Enhanced markdown formatting for AI responses, with improved code block handling
    // 1. Handle code blocks first to avoid interfering with inline code/markdown
    let formatted = content;

    // Store code blocks temporarily to avoid double-formatting
    const codeBlocks = [];
    formatted = formatted.replace(
      /```(\w+)?\n([\s\S]*?)```/g,
      (match, lang, code) => {
        const idx = codeBlocks.length;
        codeBlocks.push({
          lang: lang || "",
          code: code.replace(/</g, "&lt;").replace(/>/g, "&gt;"),
          raw: code,
        });
        return `[[CODEBLOCK_${idx}]]`;
      }
    );

    // Bold (**text**)
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    // Italic (*text*)
    formatted = formatted.replace(/\*(.*?)\*/g, "<em>$1</em>");
    // Inline code (`code`)
    formatted = formatted.replace(
      /`([^`]+)`/g,
      '<code class="bg-gray-100 px-1 rounded text-blue-600">$1</code>'
    );
    // Headings
    formatted = formatted.replace(
      /^### (.*?)$/gm,
      '<h3 class="text-lg font-bold my-2 text-gray-800">$1</h3>'
    );
    formatted = formatted.replace(
      /^## (.*?)$/gm,
      '<h2 class="text-xl font-bold my-3 text-gray-800">$1</h2>'
    );
    formatted = formatted.replace(
      /^# (.*?)$/gm,
      '<h1 class="text-2xl font-bold my-3 text-gray-900">$1</h1>'
    );
    // Bullet points
    formatted = formatted.replace(
      /^- (.*?)$/gm,
      '<li class="ml-4 list-disc">$1</li>'
    );
    formatted = formatted.replace(
      /^• (.*?)$/gm,
      '<li class="ml-4 list-disc">$1</li>'
    );
    // Numbered lists
    formatted = formatted.replace(
      /^(\d+)\. (.*?)$/gm,
      '<li class="ml-4 list-decimal">$2</li>'
    );
    // Blockquotes
    formatted = formatted.replace(
      /^> (.*?)$/gm,
      '<blockquote class="border-l-4 border-gray-300 pl-3 italic text-gray-700 my-2">$1</blockquote>'
    );
    // Links
    formatted = formatted.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" class="text-blue-600 underline hover:text-blue-800">$1</a>'
    );
    // Horizontal rule
    formatted = formatted.replace(
      /^---$/gm,
      '<hr class="my-3 border-t border-gray-300">'
    );
    // Tables (simple support)
    formatted = formatted.replace(
      /\n\n\|(.+)\|\n\|(?:[-:]+\|)+\n((.*\n)+?)\n/g,
      function (match, headers, rows) {
        const headerCells = headers
          .split("|")
          .map((header) => header.trim())
          .filter(Boolean);
        const headerRow =
          "<tr>" +
          headerCells
            .map((cell) => `<th class="border p-2 bg-gray-100">${cell}</th>`)
            .join("") +
          "</tr>";

        const tableRows = rows
          .trim()
          .split("\n")
          .map((row) => {
            const cells = row
              .split("|")
              .map((cell) => cell.trim())
              .filter(Boolean);
            return (
              "<tr>" +
              cells
                .map((cell) => `<td class="border p-2">${cell}</td>`)
                .join("") +
              "</tr>"
            );
          })
          .join("");

        return `<div class="overflow-x-auto my-3"><table class="min-w-full border-collapse border border-gray-300"><thead>${headerRow}</thead><tbody>${tableRows}</tbody></table></div>`;
      }
    );
    // Ensure paragraphs have proper spacing
    formatted = formatted.replace(/\n\n/g, '</p><p class="my-2">');
    // Convert list items to proper lists (group consecutive <li>)
    formatted = formatted.replace(
      /((?:<li[^>]*>.*?<\/li>\s*)+)/gs,
      (match) => `<ul class="my-2">${match.trim()}</ul>`
    );
    // Fix any unmatched paragraph tags
    formatted = formatted.replace(/<\/p>(\s*)<p/g, "</p>$1<p");
    // Wrap content in paragraph if not already wrapped
    formatted = formatted.replace(/^(.+)(?!<\/p>)$/gm, function (match) {
      if (!match.includes("<")) return `<p>${match}</p>`;
      return match;
    });

    // Restore code blocks with copy to clipboard button
    formatted = formatted.replace(/\[\[CODEBLOCK_(\d+)\]\]/g, (match, idx) => {
      const { lang, code, raw } = codeBlocks[idx];
      const codeId = `codeblock-${Math.random()
        .toString(36)
        .slice(2, 10)}-${idx}`;
      return `
        <div class="relative group my-2">
          <button
            class="absolute top-2 right-2 z-10 bg-white/80 hover:bg-gray-200 cursor-pointer border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onclick="(function(){
              const code = document.getElementById('${codeId}');
              if (code) {
                navigator.clipboard.writeText(code.innerText);
                const btn = event.currentTarget;
                const prev = btn.innerText;
                btn.innerText = 'Copied!';
                setTimeout(()=>{btn.innerText = prev}, 1200);
              }
            })()"
            type="button"
            title="Copy to clipboard"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="inline w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16h8a2 2 0 002-2V8a2 2 0 00-2-2H8a2 2 0 00-2 2v6a2 2 0 002 2z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" /></svg>
          </button>
          <pre class="bg-gray-100 p-3 rounded-lg overflow-x-auto my-2"><code id="${codeId}" class="language-${lang}">${code}</code></pre>
        </div>
      `;
    });

    return formatted;
  };

  const formatExactTimestamp = (timestamp) => {
    if (!timestamp) return "Unknown time";

    try {
      const date = new Date(timestamp);

      // Format as: "Sep 4, 2025 at 2:34:56 PM"
      const dateOptions = {
        year: "numeric",
        month: "short",
        day: "numeric",
      };

      const timeOptions = {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      };

      const dateStr = date.toLocaleDateString("en-US", dateOptions);
      const timeStr = date.toLocaleTimeString("en-US", timeOptions);

      return `${dateStr} at ${timeStr}`;
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return "Invalid timestamp";
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 mx-auto text-blue-600 mb-4 animate-pulse" />
          <p className="text-base text-gray-600">
            Loading your doubt solving assistant...
          </p>
        </div>
      </div>
    );
  }

  // Show login prompt if user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center bg-white rounded-lg shadow-md max-w-md mx-auto w-full p-6">
          <LogIn className="h-12 w-12 mx-auto text-blue-600 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Login Required
          </h2>
          <p className="text-base text-gray-600 mb-6">
            Please log in to access the AI Doubt Solving assistant. Your chat
            sessions will be saved and synced across all your devices.
          </p>
          <div className="space-y-3 text-sm text-gray-500 mb-6">
            <p>✅ Persistent chat history</p>
            <p>✅ Cross-device synchronization</p>
            <p>✅ Context-aware conversations</p>
            <p>✅ Secure session management</p>
          </div>
          <Button
            onClick={() => (window.location.href = "/auth/login")}
            className="w-full h-12 text-base shadow-md hover:shadow-lg"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-gray-50 overflow-y-auto h-[90vh]">
      {/* Header - Sticky */}
      <div className="sticky top-0 left-0 right-0 bg-white border-b z-50 p-6 shadow-md">
        <div className="flex items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <MessageSquare className="h-6 w-6 text-blue-600 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 truncate">
                AI Doubt Solving
              </h1>
              <p className="text-base text-gray-600 truncate">
                Welcome {user.displayName || user.email?.split("@")[0]}! Get
                instant help
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={createNewSession}
              className="flex items-center gap-2 px-3 h-8 shadow-sm hover:shadow-md"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center gap-2 px-3 h-8 shadow-sm hover:shadow-md"
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
              {chatSessions.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 text-xs h-4 w-4 p-0 flex items-center justify-center"
                >
                  {chatSessions.length > 99 ? "99+" : chatSessions.length}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="flex flex-col">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8 px-4">
                <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Start a conversation
                </h3>
                <p className="text-base text-gray-600 mb-4">
                  Ask any question and I'll help you understand it step by step.
                </p>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  Your conversations are automatically saved to your account (
                  {user.email?.split("@")[0]}...) and will persist across all
                  your devices.
                </p>
              </div>
            )}

            {messages.map((message, index) => {
              // Define consistent avatar sizes
              const avatarSizeClasses = "w-8 h-8";

              // Determine if message is from user or AI
              const isUserMessage = message.role === "user";

              // Message bubble styles based on sender
              const messageBubbleClasses = `max-w-[85%] p-4 rounded-lg shadow-sm ${
                isUserMessage ? "bg-blue-600 text-white" : "bg-white border"
              }`;

              // Content styles based on sender
              const contentClasses = `prose prose-sm max-w-none text-sm leading-relaxed ${
                isUserMessage
                  ? "!text-white"
                  : "prose-headings:text-gray-800 prose-p:text-gray-700 prose-li:text-gray-700 prose-code:text-blue-600"
              }`;

              return (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    isUserMessage ? "justify-end" : "justify-start"
                  }`}
                >
                  {/* AI Avatar - Only show for AI messages */}
                  {!isUserMessage && (
                    <div
                      className={`${avatarSizeClasses} bg-white rounded-full flex items-center justify-center flex-shrink-0 border-2 border-blue-200 overflow-hidden shadow-sm`}
                    >
                      <img
                        src="/edvanta-logo.png"
                        alt="Edvanta AI"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          console.error("Error loading AI logo:", e.target.src);
                          e.target.src = "/default-avatar.svg";
                        }}
                      />
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div className={messageBubbleClasses}>
                    {/* Message Content */}
                    <div
                      className={contentClasses}
                      dangerouslySetInnerHTML={{
                        __html: isUserMessage
                          ? formatUserContent(message.content)
                          : formatContent(message.content),
                      }}
                    />

                    {/* Timestamp */}
                    {message.timestamp && (
                      <div
                        className={`text-xs ${
                          isUserMessage ? "text-blue-100" : "text-gray-400"
                        } mt-2`}
                      >
                        <div className="font-medium">
                          {formatExactTimestamp(message.timestamp)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* User Profile */}
                  {isUserMessage && (
                    <div
                      className={`${avatarSizeClasses} rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-blue-200 shadow-sm`}
                    >
                      <img
                        src={getUserProfileImage(user, userProfile)}
                        alt={user?.displayName || userProfile?.name || "User"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error(
                            "Error loading profile image:",
                            e.target.src
                          );
                          e.target.src = "/default-avatar.svg";
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center flex-shrink-0 border-2 border-blue-200 overflow-hidden shadow-sm">
                  <img
                    src="/edvanta-logo.png"
                    alt="Edvanta AI"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      console.error("Error loading AI logo:", e.target.src);
                      e.target.src = "/default-avatar.svg";
                    }}
                  />
                </div>
                <div className="bg-white border rounded-lg p-4 shadow-sm">
                  <div className="flex gap-1 items-center">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <span className="ml-2 text-sm text-gray-500">
                      Thinking...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input Area - Sticky Footer */}
      <div className="sticky bottom-0 left-0 right-0 border-t bg-white p-6 shadow-md z-50">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <Input
              ref={inputRef}
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask your question here..."
              className="flex-1 h-12 text-base"
              disabled={isTyping}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!currentMessage.trim() || isTyping}
              className="px-4 h-12 flex-shrink-0 shadow-md hover:shadow-lg"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Chat History Modal */}
      {isHistoryOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">
                Chat History
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsHistoryOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="overflow-y-auto max-h-96">
              {chatSessions.length === 0 ? (
                <div className="p-6 text-center text-gray-600">
                  No chat sessions yet. Start a conversation to create your
                  first session!
                </div>
              ) : (
                chatSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`p-4 border-b hover:bg-gray-50 cursor-pointer flex items-center justify-between transition-colors ${
                      session.id === currentSessionId
                        ? "bg-blue-50 border-blue-200"
                        : ""
                    }`}
                    onClick={() => switchToSession(session.id)}
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <h4 className="font-medium text-base truncate text-gray-900">
                        {session.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {session.messageCount || 0} messages
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {formatExactTimestamp(session.lastActivity)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
