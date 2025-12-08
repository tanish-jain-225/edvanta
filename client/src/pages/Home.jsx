import React, { Suspense } from "react";
const HeroSpline = React.lazy(() => import("../components/ui/HeroSpline"));
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { useResponsive } from "../hooks/useResponsive";
import {
  Palette,
  MessageSquare,
  Brain,
  Mic,
  MapPin,
  FileText,
  ArrowRight,
  CheckCircle,
  Zap,
  Clock,
} from "lucide-react";

const features = [
  {
    icon: Palette,
    title: "Visual Generator",
    description:
      "Transform text and PDFs into engaging animated lessons with AI-generated visuals and optional video content.",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    icon: MessageSquare,
    title: "Doubt Solving",
    description:
      "Get instant answers to your questions with our conversational AI tutor that provides step-by-step explanations.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Brain,
    title: "Interactive Quizzes",
    description:
      "Generate custom quizzes from any topic with multiple question types and detailed explanations.",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    icon: Mic,
    title: "Voice Tutor",
    description:
      "Learn through natural conversation with AI voice synthesis and personalized tutoring sessions.",
    gradient: "from-purple-500 to-violet-500",
  },
  {
    icon: MapPin,
    title: "Career Roadmaps",
    description:
      "Get personalized learning paths with milestones, resources, and progress tracking for your goals.",
    gradient: "from-orange-500 to-amber-500",
  },
  {
    icon: FileText,
    title: "Resume Builder",
    description:
      "Optimize your resume with ATS scoring, skill gap analysis, and professional improvement suggestions.",
    gradient: "from-indigo-500 to-purple-500",
  },
];

const steps = [
  {
    number: "01",
    title: "Choose Your Tool",
    description:
      "Select from our suite of AI-powered learning tools based on your current needs.",
  },
  {
    number: "02",
    title: "Input Your Content",
    description:
      "Upload documents, enter topics, or start conversations with our AI systems.",
  },
  {
    number: "03",
    title: "Learn & Progress",
    description:
      "Engage with personalized content and track your learning journey with detailed analytics.",
  },
];

const stats = [
  { number: "10K+", label: "Active Learners", icon: Brain },
  { number: "50K+", label: "Quizzes Generated", icon: MessageSquare },
  { number: "1M+", label: "Learning Minutes", icon: Clock },
  { number: "95%", label: "Success Rate", icon: CheckCircle },
];

const testimonials = [
  {
    quote: "Edvanta transformed how I learn programming. The AI-generated roadmaps are incredibly detailed.",
    author: "Sarah Chen",
    role: "Software Developer",
    avatar: "SC"
  },
  {
    quote: "The voice tutor feature is amazing! It's like having a personal teacher available 24/7.",
    author: "Michael Rodriguez", 
    role: "Data Science Student",
    avatar: "MR"
  },
  {
    quote: "I improved my skills 3x faster using Edvanta's personalized learning paths.",
    author: "Emily Johnson",
    role: "Product Manager",
    avatar: "EJ"
  }
];

const comparisons = [
  { feature: "AI-Powered Content Generation", edvanta: true, others: false },
  { feature: "Animated Visual Lessons", edvanta: true, others: false },
  { feature: "Voice-Based Learning", edvanta: true, others: false },
  { feature: "Career Roadmap Planning", edvanta: true, others: false },
  { feature: "Resume Optimization", edvanta: true, others: false },
  { feature: "Progress Analytics", edvanta: true, others: true },
  { feature: "Quiz Generation", edvanta: true, others: true },
];

function Home() {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section with 3D Robot (lazy loaded) */}
      <Suspense fallback={
        <div className="h-72 md:h-80 lg:h-96 flex items-center justify-center bg-surface">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative flex items-center justify-center">
              <Zap className="h-8 w-8 text-primary animate-pulse" />
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping"></div>
            </div>
            <div className="w-32 h-1 bg-border rounded-full overflow-hidden flex">
              <div className="h-full bg-gradient-to-r from-primary to-primary-600 animate-pulse rounded-full"></div>
            </div>
            <p className="text-sm text-gray-600">Loading 3D Experience...</p>
          </div>
        </div>
      }>
        <HeroSpline />
      </Suspense>

      {/* Features Section */}
      <section id="features" className="py-16 lg:py-24 bg-surface flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col">
          <div className="flex flex-col items-center text-center mb-16">
            <Badge variant="secondary" className="mb-6 px-4 py-2 flex items-center">
              <Zap className="h-4 w-4 mr-2" />
              Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Everything You Need to Excel
            </h2>
            <p className="text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Our comprehensive platform combines the latest AI technology with
              proven educational methods to accelerate your learning journey.
            </p>
          </div>

          <div className="flex flex-wrap justify-center items-stretch gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="group transition-all duration-300 hover:shadow-xl hover:-translate-y-2 border-border flex flex-col flex-1 min-w-72 max-w-96">
                <CardHeader className="pb-4 flex flex-col items-start">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg flex-shrink-0`}
                  >
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col flex-1">
                  <CardDescription className="text-gray-600 leading-relaxed flex-1">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 lg:py-24 bg-background flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col">
          <div className="flex flex-col items-center text-center mb-16">
            <Badge variant="secondary" className="mb-6 px-4 py-2 flex items-center">
              <ArrowRight className="h-4 w-4 mr-2" />
              Process
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              How Edvanta Works
            </h2>
            <p className="text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Get started in three simple steps and transform your learning
              experience with AI-powered education.
            </p>
          </div>

          <div className="flex flex-wrap justify-center items-start gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col items-center text-center group flex-1 min-w-64 max-w-80">
                <div className="relative mb-8 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-primary-600 text-white text-2xl font-bold flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    {step.number}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden xl:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-primary/50 to-transparent transform -translate-y-0.5"></div>
                  )}
                </div>
                <div className="flex flex-col items-center space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-16 lg:py-24 bg-surface flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col">
          <div className="flex flex-col items-center text-center mb-16">
            <Badge variant="secondary" className="mb-6 px-4 py-2 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              Comparison
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Why Choose Edvanta?
            </h2>
            <p className="text-lg lg:text-xl text-gray-600">
              See how we compare to traditional learning platforms and 
              discover what sets us apart.
            </p>
          </div>

          <Card className="overflow-hidden shadow-xl border-border flex flex-col">
            <CardHeader className="bg-gray-50/80 border-b border-border">
              <div className="flex items-center justify-between w-full">
                <div className="text-gray-900 font-medium flex-1 text-center">Features</div>
                <div className="font-semibold text-primary text-lg flex-1 text-center">Edvanta</div>
                <div className="font-semibold text-gray-600 flex-1 text-center">Others</div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex flex-col">
              {comparisons.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between py-4 px-6 border-b border-border last:border-b-0 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                  } hover:bg-primary/5 transition-colors duration-200`}
                >
                  <div className="font-medium text-gray-900 text-sm lg:text-base flex-1">
                    {item.feature}
                  </div>
                  <div className="flex justify-center flex-1">
                    {item.edvanta ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gray-200"></div>
                    )}
                  </div>
                  <div className="flex justify-center flex-1">
                    {item.others ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gray-200"></div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-r from-primary to-primary-700 relative overflow-hidden flex-1">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary-800/95"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full transform translate-x-32 -translate-y-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full transform -translate-x-20 translate-y-20"></div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
          <div className="flex flex-col items-center space-y-6">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
              Ready to Transform Your Learning?
            </h2>
            <p className="text-lg lg:text-xl text-white/90 max-w-2xl">
              Join thousands of students and professionals already using Edvanta
              to accelerate their growth and achieve their learning goals.
            </p>
            <div className="flex justify-center pt-4">
              <Button
                size="lg"
                variant="outline"
                className="bg-white text-primary hover:bg-gray-50 border-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center"
                asChild
              >
                <Link to="/auth/signup">
                  Get Started Now <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
