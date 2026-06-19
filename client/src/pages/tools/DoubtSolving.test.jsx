import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DoubtSolving } from "./DoubtSolving";
import { useAuth } from "../../hooks/useAuth";
import { useChat } from "../../hooks/useChat";

// Mock the hooks and router/context providers
vi.mock("../../hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../hooks/useChat", () => ({
  useChat: vi.fn(),
}));

vi.mock("../../hooks/helper", () => ({
  default: "http://localhost:5000",
}));

// Mock SpeechSynthesis
beforeEach(() => {
  vi.clearAllMocks();
  
  // Default mock for useChat
  useChat.mockReturnValue({
    messages: [],
    currentMessage: "",
    setCurrentMessage: vi.fn(),
    isTyping: false,
    chatSessions: [],
    currentSessionId: null,
    isHistoryOpen: false,
    setIsHistoryOpen: vi.fn(),
    isLoading: false,
    currentlySpeakingId: null,
    messagesEndRef: { current: null },
    inputRef: { current: null },
    createNewSession: vi.fn(),
    switchToSession: vi.fn(),
    deleteSession: vi.fn(),
    handleSendMessage: vi.fn(),
    toggleSpeakMessage: vi.fn(),
  });
  
  // Mock speechSynthesis on window
  if (!window.speechSynthesis) {
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        speak: vi.fn(),
        cancel: vi.fn(),
        paused: false,
        pending: false,
        speaking: false,
      },
      writable: true,
    });
  }
});

describe("DoubtSolving Component", () => {
  it("renders login required UI when user is not authenticated", () => {
    // Setup mock for useAuth: unauthenticated user
    useAuth.mockReturnValue({
      user: null,
      userProfile: null,
      loading: false,
    });

    render(<DoubtSolving />);

    expect(screen.getByText("Login Required")).toBeInTheDocument();
    expect(
      screen.getByText(/Please log in to access the AI Doubt Solving assistant/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to Login" })).toBeInTheDocument();
  });

  it("renders main doubt solving UI when user is authenticated", () => {
    // Setup mock for useAuth: authenticated user
    useAuth.mockReturnValue({
      user: {
        email: "test@example.com",
        displayName: "Tanish",
      },
      userProfile: {
        name: "Tanish",
      },
      loading: false,
    });

    render(<DoubtSolving />);

    // Check heading
    expect(screen.getByRole("heading", { name: "AI Doubt Solving" })).toBeInTheDocument();
    
    // Check suggestions list since messages are empty
    expect(screen.getByText("Start a conversation")).toBeInTheDocument();
    expect(screen.getByText("Explain Recursion")).toBeInTheDocument();
    expect(screen.getByText("REST APIs vs GraphQL")).toBeInTheDocument();
    
    // Check key action buttons exist
    expect(screen.getByRole("button", { name: /New/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /History/i })).toBeInTheDocument();
  });

  it("renders loader screen when auth or chat sessions are loading", () => {
    useAuth.mockReturnValue({
      user: null,
      userProfile: null,
      loading: true,
    });

    render(<DoubtSolving />);

    expect(
      screen.getByText("Loading your doubt solving assistant...")
    ).toBeInTheDocument();
  });
});
