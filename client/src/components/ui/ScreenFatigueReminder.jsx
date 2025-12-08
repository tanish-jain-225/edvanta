import React, { useState, useEffect } from "react";
import { Button } from "./button";
import { X, Eye, Monitor, Clock, Zap } from "lucide-react";

// Configuration: Reminder interval in minutes
const REMINDER_INTERVAL_MINUTES = 10;

const SCREEN_FATIGUE_TIPS = [
  {
    title: "Follow the 20-20-20 Rule",
    description:
      "Every 20 minutes, look at something 20 feet away for at least 20 seconds to relax your eye muscles.",
    icon: Eye,
  },
  {
    title: "Adjust Your Screen Brightness",
    description:
      "Match your screen brightness to your surroundings. Too bright or too dim can strain your eyes.",
    icon: Monitor,
  },
  {
    title: "Take Regular Breaks",
    description:
      "Stand up, stretch, and walk around for 5-10 minutes every hour to reduce eye strain and improve circulation.",
    icon: Clock,
  },
  {
    title: "Blink More Frequently",
    description:
      "Remember to blink! When focused on screens, we blink less, causing dry eyes. Make conscious efforts to blink.",
    icon: Eye,
  },
  {
    title: "Optimize Your Workspace",
    description:
      "Position your screen 20-26 inches away, with the top at or below eye level to reduce neck strain.",
    icon: Monitor,
  },
  {
    title: "Use Proper Lighting",
    description:
      "Avoid glare by positioning your screen perpendicular to windows and use ambient lighting to reduce contrast.",
    icon: Zap,
  },
];

export function ScreenFatigueReminder() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);
  const [lastShown, setLastShown] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [tipCycleKey, setTipCycleKey] = useState(0); // Key to reset the auto-cycle timer

  useEffect(() => {
    // Check if user has seen a reminder recently
    const lastReminderTime = localStorage.getItem("screenFatigueLastShown");
    const now = Date.now();
    const reminderIntervalMs = REMINDER_INTERVAL_MINUTES * 60 * 1000;

    if (lastReminderTime) {
      const timeSinceLastReminder = now - parseInt(lastReminderTime);
      // If less than the interval has passed, set a timer for remaining time
      if (timeSinceLastReminder < reminderIntervalMs) {
        const remainingTime = reminderIntervalMs - timeSinceLastReminder;
        setTimeout(() => showReminder(), remainingTime);
        return;
      }
    }

    // Set timer for configured interval
    const timer = setTimeout(() => {
      showReminder();
    }, reminderIntervalMs);

    return () => clearTimeout(timer);
  }, []);

  // Auto-cycle through tips every 10 seconds when visible
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);

      setTimeout(() => {
        setCurrentTip((prev) => (prev + 1) % SCREEN_FATIGUE_TIPS.length);
        setIsTransitioning(false);
      }, 150); // Half of transition duration
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [isVisible, tipCycleKey]); // Include tipCycleKey to restart timer when it changes

  const showReminder = () => {
    // Select a random tip
    const randomTipIndex = Math.floor(
      Math.random() * SCREEN_FATIGUE_TIPS.length
    );
    setCurrentTip(randomTipIndex);
    setIsVisible(true);

    // Store the current time
    const now = Date.now();
    setLastShown(now);
    localStorage.setItem("screenFatigueLastShown", now.toString());
  };

  const handleClose = () => {
    setIsVisible(false);

    // Set next reminder for configured interval
    setTimeout(() => {
      showReminder();
    }, REMINDER_INTERVAL_MINUTES * 60 * 1000);
  };

  const handleTakeBreak = () => {
    setIsVisible(false);

    // Show a brief "taking break" message
    setTimeout(() => {
      alert(
        "Great! Take a 5-10 minute break. Walk around, hydrate, and rest your eyes. 👀✨"
      );
    }, 100);

    // Set next reminder for configured interval
    setTimeout(() => {
      showReminder();
    }, REMINDER_INTERVAL_MINUTES * 60 * 1000);
  };

  const handleNextTip = () => {
    setIsTransitioning(true);

    setTimeout(() => {
      setCurrentTip((prev) => (prev + 1) % SCREEN_FATIGUE_TIPS.length);
      setIsTransitioning(false);
    }, 150);
    
    // Reset the 10-second auto-cycle timer
    setTipCycleKey(prev => prev + 1);
  };

  if (!isVisible) return null;

  const tip = SCREEN_FATIGUE_TIPS[currentTip];
  const IconComponent = tip.icon;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-blue-600 p-4 text-white sticky top-0 z-[50] rounded-t-lg">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="absolute top-4 right-4 h-8 w-8 p-0 text-white hover:bg-white/20"
          >
            <X className="h-4 w-4 text-white" />
          </Button>

          <div className="flex items-center gap-3 pr-12">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Eye className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Screen Fatigue Reminder
              </h2>
              <p className="text-blue-100 text-sm">Time for a healthy break!</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="space-y-6">
            <div
              className={`text-center space-y-4 transition-all duration-300 ease-in-out ${
                isTransitioning ? "opacity-50" : "opacity-100"
              }`}
            >
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <IconComponent className="h-4 w-4 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">{tip.title}</h3>
              <p className="text-gray-600 leading-relaxed text-sm max-w-md mx-auto">
                {tip.description}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-blue-100 rounded-b-lg sticky bottom-0 z-[50]">
          {/* Action buttons */}
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="ghost"
                onClick={handleClose}
                className="h-8 text-sm hover:bg-white transition-all duration-200"
              >
                Close 
              </Button>
              <Button
                variant="outline"
                onClick={handleNextTip}
                className="h-8 text-sm shadow-sm hover:shadow-md transition-all duration-200"
              >
                Next Tip
              </Button>
            </div>
          </div>

          {/* Tip counter */}
          <div className="text-center space-y-3 py-2">
            <p className="text-sm text-gray-500">
              Health Tip {currentTip + 1} of {SCREEN_FATIGUE_TIPS.length}
            </p>
            <div className="flex justify-center gap-1">
              {SCREEN_FATIGUE_TIPS.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === currentTip
                      ? "bg-blue-600 w-6"
                      : "bg-gray-300 w-1.5"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
