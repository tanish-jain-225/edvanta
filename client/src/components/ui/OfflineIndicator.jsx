import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

/**
 * Floating Offline Indicator
 * Simple indicator that shows at bottom-right when offline
 */
export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Only show when offline or just came back online (for 3 seconds)
  const [showOnline, setShowOnline] = useState(false);

  useEffect(() => {
    if (isOnline && !navigator.onLine === false) {
      setShowOnline(true);
      const timer = setTimeout(() => setShowOnline(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (isOnline && !showOnline) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-[9999] transition-all duration-300 ${
        isOnline ? 'bg-green-500' : 'bg-orange-500'
      } text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2`}
      role="status"
      aria-live="polite"
    >
      {isOnline ? (
        <>
          <Wifi className="w-5 h-5" />
          <span className="text-sm font-medium">Online Mode</span>
        </>
      ) : (
        <>
          <WifiOff className="w-5 h-5" />
          <span className="text-sm font-medium">Offline Mode</span>
        </>
      )}
    </div>
  );
}
