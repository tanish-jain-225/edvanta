import { useState, useEffect, lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Navbar } from "./components/Layout/Navbar";
import { Sidebar } from "./components/Layout/Sidebar";
import { useAuth } from "./hooks/useAuth";
import { PageTransition } from "./components/ui/PageTransition";
import { ScreenFatigueReminder } from "./components/ui/ScreenFatigueReminder";
import ScrollToTop from "./components/ui/ScrollToTop";
import OfflineIndicator from "./components/ui/OfflineIndicator";

import { Component } from "react";

// Robust Lazy Loading with Offline Retry and Fallback
function lazyWithRetry(componentImport) {
  return lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.warn("Failed to load chunk dynamically, attempting retry...", error);
      // If offline or temporary network interruption, retry once after a short delay
      try {
        await new Promise((res) => setTimeout(res, 800));
        return await componentImport();
      } catch (retryError) {
        console.error("Chunk loading failed after retry:", retryError);
        return {
          default: function OfflineChunkFallback() {
            return (
              <div className="p-8 max-w-xl mx-auto text-center bg-white rounded-xl shadow-md my-8 border border-gray-100">
                <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-4 font-bold text-xl">
                  !
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Page Unavailable Offline</h3>
                <p className="text-gray-600 mb-6 text-sm">
                  This page was not cached before going offline. Reconnect to the internet to load this feature.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition shadow-sm"
                >
                  Retry Connection
                </button>
              </div>
            );
          }
        };
      }
    }
  });
}

// Preload all tools into browser & service worker cache
export function preloadAllRoutes() {
  if (typeof window === "undefined") return;
  const preload = () => {
    import("./pages/Dashboard");
    import("./pages/tools/DoubtSolving");
    import("./pages/tools/Quizzes");
    import("./pages/tools/ConversationalTutor");
    import("./pages/tools/Roadmap");
    import("./pages/tools/VisualContent");
    import("./pages/tools/ResumeAnalysis");
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(preload, { timeout: 3000 });
  } else {
    setTimeout(preload, 1000);
  }
}

// Error boundary to gracefully catch any render/chunk failure
class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Route render error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-xl mx-auto text-center bg-white rounded-xl shadow-md my-8 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h3>
          <p className="text-gray-600 mb-4 text-sm">
            An unexpected error occurred while rendering this page.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Lazy-loaded route components with resilient offline fallback
const Home = lazyWithRetry(() => import("./pages/Home"));
const Login = lazyWithRetry(() => import("./pages/auth/Login").then(m => ({ default: m.Login })));
const Signup = lazyWithRetry(() => import("./pages/auth/Signup").then(m => ({ default: m.Signup })));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })));
const DoubtSolving = lazyWithRetry(() => import("./pages/tools/DoubtSolving").then(m => ({ default: m.DoubtSolving })));
const Quizzes = lazyWithRetry(() => import("./pages/tools/Quizzes").then(m => ({ default: m.Quizzes })));
const ConversationalTutor = lazyWithRetry(() => import("./pages/tools/ConversationalTutor").then(m => ({ default: m.ConversationalTutor })));
const Roadmap = lazyWithRetry(() => import("./pages/tools/Roadmap").then(m => ({ default: m.Roadmap })));
const VisualContent = lazyWithRetry(() => import("./pages/tools/VisualContent"));
const ResumeAnalysis = lazyWithRetry(() => import("./pages/tools/ResumeAnalysis").then(m => ({ default: m.ResumeAnalysis })));

// Preload logo image instantly on app start
const LOGO_SRC = "/edvanta-logo.png";
const logoImg = new window.Image();
logoImg.src = LOGO_SRC;

// Loading Spinner Component
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100">
      <div className="text-center">
        <img
          src={LOGO_SRC}
          alt="Loading..."
          className="mx-auto animate-pulse w-20 h-20"
          style={{ opacity: logoImg.complete ? 1 : 0, transition: 'opacity 0.1s' }}
          draggable={false}
        />
      </div>
    </div>
  );
}

// Dynamic loading hook that checks auth status without artificial delays
function useUnifiedLoading(location, authLoading) {
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    // Immediate unlock if auth is finished
    if (!authLoading) {
      setInitialLoading(false);
    }
  }, [authLoading]);

  return authLoading && initialLoading;
}

// Layout Component for Dashboard Pages
function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-64 pt-16 p-3 sm:p-4 md:p-4 min-h-screen overflow-x-hidden">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <LoadingFallback />;
  }
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function AppRoutes() {
  const location = useLocation();
  const { loading: authLoading } = useAuth();
  const isLoading = useUnifiedLoading(location, authLoading);

  useEffect(() => {
    preloadAllRoutes();
  }, []);

  if (isLoading) {
    return <LoadingFallback />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 pt-16">
        <RouteErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Public Routes */}
              <Route
                path="/"
                element={<PageTransition><Home /></PageTransition>}
              />
              <Route
                path="/auth/login"
                element={<PageTransition><Login /></PageTransition>}
              />
              <Route
                path="/auth/signup"
                element={<PageTransition><Signup /></PageTransition>}
              />

              {/* Protected Dashboard Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <Dashboard />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tools/doubt-solving"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <DoubtSolving />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tools/quizzes"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <Quizzes />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tools/conversational-tutor"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <ConversationalTutor />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tools/roadmap"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <Roadmap />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tools/visual-content"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <VisualContent />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tools/resume-analysis"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <ResumeAnalysis />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              {/* Catch all route - redirect to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </RouteErrorBoundary>
      </div>
    </div>
  );
}


function App() {
  return (
    <Router>
      <ScrollToTop />
      <OfflineIndicator />
      <AppRoutes />
      <ScreenFatigueReminder />
    </Router>
  );
}

export default App;
