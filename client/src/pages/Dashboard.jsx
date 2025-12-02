import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { useAuth } from "../hooks/useAuth";
import { useResponsive } from "../hooks/useResponsive";
import { Link, useNavigate } from "react-router-dom";
import { edvantaAPI } from "../lib/api";
import {
  Brain,
  Palette,
  MessageSquare,
  Mic,
  MapPin,
  FileText,
  TrendingUp,
  Clock,
  Award,
  BookOpen,
  Activity,
  Loader2,
  Target,
  Plus,
} from "lucide-react";

// ============================================================================
// CONFIGURATION
// ============================================================================

const LEARNING_TOOLS = [
  {
    icon: Palette,
    title: "Visual Generator",
    description: "Create educational slideshows from text, PDF, or audio",
    href: "/tools/visual-generator",
    color: "bg-pink-100 text-pink-700",
  },
  {
    icon: Brain,
    title: "AI Quizzes",
    description: "Generate personalized quizzes with instant feedback",
    href: "/tools/quizzes",
    color: "bg-green-100 text-green-700",
  },
  {
    icon: MessageSquare,
    title: "Doubt Solver",
    description: "Get instant answers from AI-powered chatbot",
    href: "/tools/doubt-solving",
    color: "bg-blue-100 text-blue-700",
  },
  {
    icon: Mic,
    title: "Voice Tutor",
    description: "Interactive voice-based learning sessions",
    href: "/tools/conversational-tutor",
    color: "bg-purple-100 text-purple-700",
  },
  {
    icon: MapPin,
    title: "Learning Roadmaps",
    description: "AI-generated personalized learning paths",
    href: "/tools/roadmap",
    color: "bg-indigo-100 text-indigo-700",
  },
  {
    icon: FileText,
    title: "Resume Builder",
    description: "Build and optimize resumes with AI analysis",
    href: "/tools/resume-builder",
    color: "bg-yellow-100 text-yellow-700",
  },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatLearningTime = (totalMinutes) => {
  if (!totalMinutes || totalMinutes === 0) return "0m";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

const formatLearningTimeDetailed = (totalMinutes) => {
  if (!totalMinutes || totalMinutes === 0) return "0 minutes";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} minutes`;
  if (minutes === 0) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  return `${hours} ${hours === 1 ? "hour" : "hours"} ${minutes} minutes`;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function Dashboard() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();

  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================

  const [userStats, setUserStats] = useState({
    totalLearningMinutes: 0,
    quizzesTaken: 0,
    activeRoadmaps: 0,
    skillsLearning: 0,
    roadmapsCreated: 0,
    totalSkillsLearning: 0,
  });

  const [roadmaps, setRoadmaps] = useState([]);
  const [quizHistory, setQuizHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRoadmaps, setLoadingRoadmaps] = useState(false);
  const [sessionStartTime] = useState(Date.now());
  const [isHovered, setIsHovered] = useState(false);

  // ========================================================================
  // DATA FETCHING
  // ========================================================================

  const fetchUserStats = useCallback(async () => {
    if (!user?.email) return;

    try {
      const response = await edvantaAPI.getUserStats(user.email);
      if (response.success) {
        setUserStats({
          totalLearningMinutes: response.data.total_learning_minutes || 0,
          quizzesTaken: response.data.quizzes_taken || 0,
          activeRoadmaps: response.data.active_roadmaps || 0,
          skillsLearning: response.data.skills_learning || 0,
          roadmapsCreated: response.data.roadmaps_created || 0,
          totalSkillsLearning: response.data.total_skills_learning || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching user stats:", error);
    }
  }, [user?.email]);

  const fetchQuizHistory = useCallback(async () => {
    if (!user?.email) return;

    try {
      const response = await edvantaAPI.getQuizHistory(user.email);
      if (response.success && Array.isArray(response.data)) {
        setQuizHistory(response.data);
      }
    } catch (error) {
      console.error("Error fetching quiz history:", error);
    }
  }, [user?.email]);

  const fetchUserRoadmaps = useCallback(async () => {
    if (!user?.email) return;

    setLoadingRoadmaps(true);
    try {
      const response = await edvantaAPI.getUserRoadmaps(user.email);
      if (response.success && Array.isArray(response.data)) {
        setRoadmaps(response.data);
      }
    } catch (error) {
      console.error("Error fetching roadmaps:", error);
    } finally {
      setLoadingRoadmaps(false);
    }
  }, [user?.email]);

  const saveSessionTime = useCallback(async () => {
    if (!user?.email) return;

    const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 60000);
    if (sessionDuration < 1) return;

    try {
      // Update learning time on the server
      await edvantaAPI.getUserStats(user.email);
    } catch (error) {
      console.error("Error saving session time:", error);
    }
  }, [user?.email, sessionStartTime]);

  // ========================================================================
  // EFFECTS
  // ========================================================================

  // Initial data fetch
  useEffect(() => {
    const loadData = async () => {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      setLoading(true);
      await Promise.all([
        fetchUserStats(),
        fetchQuizHistory(),
        fetchUserRoadmaps(),
      ]);
      setLoading(false);
    };

    loadData();
  }, [user?.email, fetchUserStats, fetchQuizHistory, fetchUserRoadmaps]);

  // Save session time on unmount
  useEffect(() => {
    return () => {
      saveSessionTime();
    };
  }, [saveSessionTime]);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // ========================================================================
  // COMPUTED VALUES
  // ========================================================================

  const calculateDynamicStats = () => {
    let totalSkills = 0;
    let completedSkills = 0;
    let totalWeeks = 0;

    roadmaps.forEach((roadmap) => {
      if (roadmap.data?.nodes) {
        totalSkills += roadmap.data.nodes.length;
        roadmap.data.nodes.forEach((node) => {
          if (node.completed) completedSkills++;
        });
      }
      if (roadmap.duration_weeks) {
        totalWeeks += parseInt(roadmap.duration_weeks) || 0;
      }
    });

    return {
      totalRoadmaps: roadmaps.length,
      totalSkills,
      completedSkills,
      activeWeeks: totalWeeks,
      quizzesTaken: quizHistory.length,
      learningMinutes: userStats.totalLearningMinutes,
    };
  };

  const dynamicStats = calculateDynamicStats();

  const stats = [
    {
      label: "Active Roadmaps",
      value: dynamicStats.totalRoadmaps,
      icon: MapPin,
      change: `${dynamicStats.activeWeeks} weeks total`,
      color: "text-blue-600",
    },
    {
      label: "Skills Learning",
      value: dynamicStats.totalSkills,
      icon: Award,
      change: `${dynamicStats.completedSkills} completed`,
      color: "text-green-600",
    },
    {
      label: "Quizzes Taken",
      value: dynamicStats.quizzesTaken,
      icon: Brain,
      change:
        quizHistory.length > 0
          ? `${Math.round(
              quizHistory.reduce((sum, q) => sum + (q.percentage || 0), 0) /
                quizHistory.length
            )}% avg`
          : "No quizzes yet",
      color: "text-purple-600",
    },
    {
      label: "Learning Time",
      value: formatLearningTime(dynamicStats.learningMinutes),
      icon: Clock,
      change:
        dynamicStats.learningMinutes > 0
          ? `${formatLearningTimeDetailed(dynamicStats.learningMinutes)} total`
          : "Start learning today",
      color: "text-orange-600",
    },
  ];

  const latestRoadmap = roadmaps.length > 0 ? roadmaps[0] : null;

  const mobileQuickActions = isMobile ? LEARNING_TOOLS.slice(0, 4) : [];
  const cardsToShow = isMobile ? mobileQuickActions : LEARNING_TOOLS;

  const recentActivities = [
    {
      title: "Latest Quiz Attempt",
      detail: `${dynamicStats.quizzesTaken} quizzes completed`,
      time: "2 hours ago",
      icon: Brain,
    },
    {
      title: "Visual Content Generated",
      detail: "Learning material created",
      time: "1 day ago",
      icon: Palette,
    },
    {
      title: "AI Tutor Session",
      detail: "Questions answered",
      time: "2 days ago",
      icon: MessageSquare,
    },
    {
      title: "Roadmap Progress",
      detail: `${dynamicStats.totalRoadmaps} active paths`,
      time: "3 days ago",
      icon: MapPin,
    },
  ];

  // ========================================================================
  // RENDER FUNCTIONS
  // ========================================================================

  const renderStatsLoadingSkeleton = () => (
    <>
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="animate-pulse">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-4 w-4 bg-gray-200 rounded"></div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-24"></div>
          </CardContent>
        </Card>
      ))}
    </>
  );

  const renderStatsCards = () => {
    if (loading) return renderStatsLoadingSkeleton();

    if (!user) {
      return Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="opacity-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-400">
              {["Roadmaps", "Skills", "Quizzes", "Hours"][index]}
            </CardTitle>
            <div className="h-3 w-3 sm:h-4 sm:w-4 bg-gray-300 rounded" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold text-gray-400">
              --
            </div>
            <p className="text-xs text-gray-400">Sign in to view</p>
          </CardContent>
        </Card>
      ));
    }

    return stats.map((stat, index) => (
      <Card key={index} className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
            {stat.label}
          </CardTitle>
          <stat.icon className={`h-3 w-3 sm:h-4 sm:w-4 ${stat.color}`} />
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="text-lg sm:text-2xl font-bold text-gray-900">
            {stat.value}
          </div>
          <p className="text-xs text-green-600 flex items-center mt-1">
            <TrendingUp className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />
            <span className="truncate">{stat.change}</span>
          </p>
        </CardContent>
      </Card>
    ));
  };

  const renderQuickActions = () => (
    <Card
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
          Quick Actions
        </CardTitle>
        <CardDescription className="text-sm sm:text-base">
          Jump into your favorite learning tools
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <div
          className={`grid ${
            isMobile
              ? "grid-cols-2 gap-3"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          }`}
        >
          {cardsToShow.map((tool) => (
            <Link
              key={tool.title}
              to={tool.href}
              className="group p-3 sm:p-4 rounded-lg border hover:shadow-lg transition-all bg-white hover:bg-gray-50"
            >
              <div
                className={`w-10 h-10 rounded-lg ${tool.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
              >
                <tool.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">
                {tool.title}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600">
                {tool.description}
              </p>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderRecentActivity = () => (
    <Card>
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="text-lg sm:text-xl">Recent Activity</CardTitle>
        <CardDescription className="text-sm sm:text-base">
          Your latest learning sessions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
        {recentActivities.map((activity, index) => (
          <div
            key={index}
            className="flex items-center gap-3 sm:gap-4 p-3 rounded-lg bg-gray-50"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg flex items-center justify-center">
              <activity.icon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 text-sm sm:text-base truncate">
                {activity.title}
              </h4>
              <p className="text-xs sm:text-sm text-gray-500">
                {activity.time}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  const renderContinueLearning = () => (
    <Card className="overflow-hidden">
      <CardHeader className="px-4 sm:px-6 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
        <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-600" />
          Continue Learning
        </CardTitle>
        <CardDescription className="text-sm sm:text-base">
          {roadmaps.length > 0
            ? "Pick up where you left off"
            : "Start your learning journey"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-4 sm:px-6 pb-6">
        {!user ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Sign in to continue learning
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Access your personalized roadmaps and track your progress
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/login")}
            >
              Sign In to Continue
            </Button>
          </div>
        ) : loadingRoadmaps ? (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">
              Loading your progress...
            </h3>
            <p className="text-sm text-gray-600">
              Fetching your learning roadmaps
            </p>
          </div>
        ) : roadmaps.length > 0 && latestRoadmap ? (
          <>
            <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {latestRoadmap.goal}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {latestRoadmap.duration_weeks} weeks •{" "}
                    {latestRoadmap.data?.nodes?.length || 0} skills
                  </p>
                </div>
                <Badge variant="secondary" className="ml-2">
                  Active
                </Badge>
              </div>

              {latestRoadmap.data?.nodes &&
                latestRoadmap.data.nodes.length > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium">
                        {Math.round(
                          (latestRoadmap.data.nodes.filter((n) => n.completed)
                            .length /
                            latestRoadmap.data.nodes.length) *
                            100
                        )}
                        %
                      </span>
                    </div>
                    <Progress
                      value={
                        (latestRoadmap.data.nodes.filter((n) => n.completed)
                          .length /
                          latestRoadmap.data.nodes.length) *
                        100
                      }
                      className="h-2"
                    />
                  </div>
                )}

              <Button
                size="sm"
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                onClick={() => navigate("/tools/roadmap")}
              >
                Continue Learning
              </Button>
            </div>

            {roadmaps.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => navigate("/tools/roadmap")}
              >
                View All Roadmaps ({roadmaps.length})
              </Button>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <div className="relative mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
                <MapPin className="h-8 w-8 text-white" />
              </div>
            </div>

            <h3 className="font-bold text-xl text-gray-900 mb-2">
              Ready to start your journey?
            </h3>
            <p className="text-sm text-gray-600 mb-6 max-w-sm mx-auto">
              Create your first personalized learning roadmap and unlock your
              potential
            </p>

            <div className="grid gap-3 mb-6">
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Target className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-sm text-gray-700 font-medium">
                  Personalized learning paths
                </span>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Clock className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-sm text-gray-700 font-medium">
                  Track your progress
                </span>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-100">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Award className="h-4 w-4 text-purple-600" />
                </div>
                <span className="text-sm text-gray-700 font-medium">
                  AI-powered recommendations
                </span>
              </div>
            </div>

            <Button
              size="sm"
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg"
              onClick={() => navigate("/tools/roadmap")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Roadmap
            </Button>

            <p className="text-xs text-gray-500 mt-3">
              It takes less than 2 minutes to get started
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // ========================================================================
  // MAIN RENDER
  // ========================================================================

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
      {/* Welcome Header */}
      <div className="bg-[#289da8] rounded-xl p-4 sm:p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 text-white">
              Welcome back,{" "}
              {userProfile?.name || user?.displayName || "Learner"}! 👋
            </h1>
            <p className="text-sm sm:text-base text-blue-100">
              Ready to continue your learning journey? Let's make today
              productive!
            </p>
          </div>
          <div className="hidden sm:block flex-shrink-0 ml-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white/10 rounded-full flex items-center justify-center">
              <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {renderStatsCards()}
      </div>

      {/* Quick Actions */}
      {renderQuickActions()}

      {/* Recent Activity & Continue Learning */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {renderRecentActivity()}
        {renderContinueLearning()}
      </div>
    </div>
  );
}
