import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useAuth } from "../hooks/useAuth";
import { useResponsive } from "../hooks/useResponsive";
import { Link, useNavigate } from "react-router-dom";
import backEndURL from "../hooks/helper";
import {
  Brain,
  MessageSquare,
  Mic,
  MapPin,
  TrendingUp,
  Clock,
  BookOpen,
  Activity,
  LogIn,
  Target,
} from "lucide-react";

// ============================================================================
// CONFIGURATION
// ============================================================================

const CORE_TOOLS = [
  {
    icon: MessageSquare,
    title: "Doubt Solver",
    description: "Get instant answers from AI-powered chatbot",
    href: "/tools/doubt-solving",
    color: "bg-blue-100 text-blue-700",
    status: "working"
  },
  {
    icon: Mic,
    title: "Voice Tutor",
    description: "Interactive voice-based learning sessions",
    href: "/tools/conversational-tutor",
    color: "bg-purple-100 text-purple-700",
    status: "working"
  },
  {
    icon: Brain,
    title: "AI Quizzes",
    description: "Generate personalized quizzes with feedback",
    href: "/tools/quizzes",
    color: "bg-green-100 text-green-700",
    status: "working"
  },
  {
    icon: MapPin,
    title: "Learning Roadmaps",
    description: "AI-generated personalized learning paths",
    href: "/tools/roadmap",
    color: "bg-indigo-100 text-indigo-700",
    status: "working"
  }
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatLearningTime = (totalMinutes) => {
  if (!totalMinutes || totalMinutes === 0) return "0 min";
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours === 0) {
    return `${minutes} min`;
  } else if (minutes === 0) {
    return hours === 1 ? "1 hr" : `${hours} hrs`;
  } else {
    const hrText = hours === 1 ? "hr" : "hrs";
    const minText = "min";
    return `${hours} ${hrText} ${minutes} ${minText}`;
  }
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
    quizzesTaken: 0,
    roadmapsActive: 0,
    learningMinutes: 0,
    skillsLearning: 0,
    roadmapsCreated: 0
  });
  const [quizHistory, setQuizHistory] = useState([]);
  const [userRoadmaps, setUserRoadmaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // ========================================================================
  // DATA FETCHING
  // ========================================================================

  const fetchBasicStats = async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${backEndURL}/api/user-stats?user_email=${encodeURIComponent(user.email)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setUserStats({
          quizzesTaken: data.quizzes_taken || 0,
          roadmapsActive: data.active_roadmaps || 0,
          learningMinutes: data.total_learning_minutes || 0,
          skillsLearning: data.skills_learning || 0,
          roadmapsCreated: data.roadmaps_created || 0
        });
      } else {
        console.error("Failed to fetch user stats:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailedData = async () => {
    if (!user?.email) return;
    
    setDetailsLoading(true);
    try {
      // Fetch quiz history
      const quizResponse = await fetch(
        `${backEndURL}/api/quiz-history?user_email=${encodeURIComponent(user.email)}`
      );
      if (quizResponse.ok) {
        const quizData = await quizResponse.json();
        // Get the 5 most recent quizzes
        setQuizHistory(quizData.slice(0, 5));
      } else {
        console.error("Failed to fetch quiz history:", quizResponse.status);
      }

      // Fetch user roadmaps
      const roadmapResponse = await fetch(
        `${backEndURL}/api/roadmap/user?user_email=${encodeURIComponent(user.email)}`
      );
      if (roadmapResponse.ok) {
        const roadmapData = await roadmapResponse.json();
        // Get the 3 most recent roadmaps
        setUserRoadmaps(roadmapData.slice(0, 3));
      } else {
        console.error("Failed to fetch roadmaps:", roadmapResponse.status);
      }
    } catch (error) {
      console.error("Failed to fetch detailed data:", error);
    } finally {
      setDetailsLoading(false);
    }
  };

  // ========================================================================
  // EFFECTS
  // ========================================================================

  useEffect(() => {
    fetchBasicStats();
    if (user?.email) {
      fetchDetailedData();
    }
  }, [user?.email]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // ========================================================================
  // COMPUTED VALUES
  // ========================================================================

  const dashboardStats = [
    {
      label: "Quizzes Completed",
      value: userStats.quizzesTaken,
      icon: Brain,
      change: userStats.quizzesTaken === 0 ? "Start your learning journey" : 
              userStats.quizzesTaken === 1 ? "Great start! Take another" :
              userStats.quizzesTaken < 5 ? "Building knowledge" :
              userStats.quizzesTaken < 10 ? "Making great progress" :
              "Quiz master in the making!",
      color: "text-green-600"
    },
    {
      label: "Learning Paths",
      value: userStats.roadmapsActive,
      icon: MapPin,
      change: userStats.roadmapsActive === 0 ? "Create your first roadmap" :
              userStats.roadmapsActive === 1 ? "Focused learning approach" :
              userStats.roadmapsActive < 3 ? "Expanding your horizons" :
              "Multi-path learner",
      color: "text-blue-600"
    },
    {
      label: "Skills in Progress",
      value: userStats.skillsLearning,
      icon: Target,
      change: userStats.skillsLearning === 0 ? "No skills tracked yet" :
              userStats.skillsLearning === 1 ? "First skill unlocked" :
              userStats.skillsLearning < 5 ? "Building skill foundation" :
              userStats.skillsLearning < 10 ? "Diverse skill development" :
              "Skill portfolio growing",
      color: "text-orange-600"
    },
    {
      label: "Time Invested",
      value: formatLearningTime(userStats.learningMinutes),
      icon: Clock,
      change: userStats.learningMinutes === 0 ? "Ready to start learning" :
              userStats.learningMinutes < 60 ? "First steps taken" :
              userStats.learningMinutes < 180 ? "Consistent progress" :
              userStats.learningMinutes < 360 ? "Dedicated learner" :
              "Learning champion",
      color: "text-purple-600"
    },
    {
      label: "Total Roadmaps",
      value: userStats.roadmapsCreated,
      icon: BookOpen,
      change: userStats.roadmapsCreated === 0 ? "Plan your learning journey" :
              userStats.roadmapsCreated === 1 ? "Learning path established" :
              userStats.roadmapsCreated < 3 ? "Exploring different areas" :
              "Comprehensive learning approach",
      color: "text-indigo-600"
    }
  ];

  // ========================================================================
  // RENDER FUNCTIONS
  // ========================================================================

  const renderStatsCards = () => {
    if (loading) {
      return Array.from({ length: 5 }).map((_, index) => (
        <Card key={index} className="animate-pulse">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-6 pt-6">
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-4 w-4 bg-gray-200 rounded"></div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-24"></div>
          </CardContent>
        </Card>
      ));
    }

    if (!user) {
      return (
        <Card className="col-span-full">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <LogIn className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Sign in to see your stats
              </h3>
              <Button onClick={() => navigate("/auth/login")}>
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return dashboardStats.map((stat, index) => (
      <Card key={index} className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-6 pt-6">
          <CardTitle className="text-sm font-medium text-gray-600">
            {stat.label}
          </CardTitle>
          <stat.icon className={`h-4 w-4 ${stat.color}`} />
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="text-2xl font-bold text-gray-900">
            {stat.value}
          </div>
          <p className="text-xs text-green-600 flex items-center mt-1">
            <TrendingUp className="h-3 w-3 mr-1" />
            <span>{stat.change}</span>
          </p>
        </CardContent>
      </Card>
    ));
  };

  const renderQuickActions = () => (
    <Card>
      <CardHeader className="px-6">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Activity className="h-5 w-5 text-indigo-600" />
          Learning Tools
        </CardTitle>
        <CardDescription>
          Start learning with our AI-powered tools
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CORE_TOOLS.map((tool) => (
            <Link
              key={tool.title}
              to={tool.href}
              className="group p-4 rounded-lg border hover:shadow-lg transition-all bg-white hover:bg-gray-50"
            >
              <div
                className={`w-10 h-10 rounded-lg ${tool.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
              >
                <tool.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">
                {tool.title}
              </h3>
              <p className="text-sm text-gray-600">
                {tool.description}
              </p>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderGetStarted = () => (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader className="px-6">
        <CardTitle className="flex items-center gap-2 text-xl text-blue-900">
          <BookOpen className="h-5 w-5" />
          Get Started
        </CardTitle>
        <CardDescription className="text-blue-700">
          New to Edvanta? Start with these recommended tools
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-200">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-sm font-bold text-blue-600">1</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Try the Doubt Solver</h4>
              <p className="text-sm text-gray-600">Ask any question and get instant AI-powered answers</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-200">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-sm font-bold text-purple-600">2</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Create a Learning Roadmap</h4>
              <p className="text-sm text-gray-600">Get a personalized path for any subject you want to learn</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-200">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-sm font-bold text-green-600">3</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Take a Quiz</h4>
              <p className="text-sm text-gray-600">Test your knowledge with AI-generated quizzes</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderRecentActivity = () => {
    if (!user || detailsLoading) {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-48"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-48"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Quiz History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-green-600" />
              Recent Quiz Activity
            </CardTitle>
            <CardDescription>
              Your latest quiz attempts and scores
            </CardDescription>
          </CardHeader>
          <CardContent>
            {quizHistory.length === 0 ? (
              <div className="text-center py-6">
                <Brain className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No quizzes taken yet</p>
                <Button 
                  className="mt-3" 
                  size="sm"
                  onClick={() => navigate("/tools/quizzes")}
                >
                  Take Your First Quiz
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {quizHistory.map((quiz, index) => (
                  <div key={quiz.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 text-sm truncate">
                        {quiz.topic || quiz.quizTitle || "Untitled Quiz"}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {quiz.difficulty || "Mixed"} • {quiz.totalQuestions || 0} questions
                        {quiz.timeTaken && quiz.timeTaken !== "Not tracked" && (
                          <span> • {quiz.timeTaken}</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right ml-3">
                      <div className={`text-lg font-bold ${
                        (quiz.percentage || 0) >= 80 ? 'text-green-600' :
                        (quiz.percentage || 0) >= 60 ? 'text-yellow-600' :
                        'text-red-500'
                      }`}>
                        {quiz.percentage || 0}%
                      </div>
                      <div className="text-xs text-gray-500">
                        {quiz.completedAt ? 
                          new Date(quiz.completedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          }) : 
                          'Recently'
                        }
                      </div>
                    </div>
                  </div>
                ))}
                {quizHistory.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-3"
                    onClick={() => navigate("/tools/quizzes")}
                  >
                    View All Quizzes
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Roadmaps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Your Learning Roadmaps
            </CardTitle>
            <CardDescription>
              Active learning paths and progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userRoadmaps.length === 0 ? (
              <div className="text-center py-6">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No roadmaps created yet</p>
                <Button 
                  className="mt-3" 
                  size="sm"
                  onClick={() => navigate("/tools/roadmap")}
                >
                  Create Your First Roadmap
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {userRoadmaps.map((roadmap, index) => (
                  <div key={roadmap._id || index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 text-sm flex-1 pr-2">
                        {roadmap.title || roadmap.topic || "Learning Roadmap"}
                      </h4>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {roadmap.created_at ? 
                          new Date(roadmap.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          }) : 
                          'Recent'
                        }
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-orange-500" />
                        <span className="text-xs text-gray-600">
                          {(roadmap.data?.nodes?.length || 0)} skills
                        </span>
                        {roadmap.data?.edges && (
                          <span className="text-xs text-gray-500">
                            • {roadmap.data.edges.length} connections
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-medium">
                        <span className={`px-2 py-1 rounded ${
                          roadmap.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                          roadmap.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          roadmap.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {roadmap.difficulty || "Progressive"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {userRoadmaps.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-3"
                    onClick={() => navigate("/tools/roadmap")}
                  >
                    View All Roadmaps
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // ========================================================================
  // MAIN RENDER
  // ========================================================================

  return (
    <div className="space-y-6 p-4">
      {/* Welcome Header */}
      <div className="bg-[#289da8] rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-2 text-white">
              Welcome back, {userProfile?.name || user?.displayName || "Learner"}! 👋
            </h1>
            <p className="text-blue-100">
              Ready to continue your learning journey? Let's make today productive!
            </p>
          </div>
          <div className="hidden sm:block">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center">
              <BookOpen className="w-10 h-10" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {renderStatsCards()}
      </div>

      {/* Learning Tools */}
      {renderQuickActions()}

      {/* Recent Activity - Only show if user has some activity */}
      {user && (userStats.quizzesTaken > 0 || userStats.roadmapsActive > 0) && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          </div>
          {renderRecentActivity()}
        </div>
      )}

      {/* Get Started Guide */}
      {(!user || (userStats.quizzesTaken === 0 && userStats.roadmapsActive === 0)) && renderGetStarted()}
    </div>
  );
}