import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function generateId() {
  return Math.random().toString(36).substr(2, 9)
}

export function truncateText(text, maxLength = 100) {
  if (text.length <= maxLength) return text
  return text.substr(0, maxLength) + '...'
}

// Default avatar image path
const DEFAULT_AVATAR = '/default-avatar.svg'

/**
 * Gets user profile image URL with fallback
 * @param {Object} user - Firebase auth user object
 * @param {Object} userProfile - Additional user profile data
 * @returns {string} - URL to profile image
 */
export function getUserProfileImage(user, userProfile) {
  // Check if we should use default image directly to avoid errors
  // Google auth images can sometimes fail to load in development
  const isGoogleAuthImage = user?.photoURL?.includes('googleusercontent.com');
  
  // Check sources in order of preference
  const profileImage = 
    userProfile?.profileImageUrl || 
    (!isGoogleAuthImage ? user?.photoURL : null) || 
    DEFAULT_AVATAR;
  
  return profileImage;
}

/**
 * Escapes special HTML characters to prevent XSS attacks
 * @param {string} str - Raw string
 * @returns {string} - Escaped string safe for HTML rendering
 */
export function escapeHtml(str) {
  if (!str || typeof str !== 'string') return '';
  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}

/**
 * Maps Firebase auth error codes into friendly user messages
 * @param {Error|Object} error - Error thrown by Firebase
 * @returns {string} - Human-readable message
 */
export function getFirebaseAuthErrorMessage(error) {
  if (!error) return 'An unexpected error occurred. Please try again.';
  const code = error.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please check your credentials.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment before trying again.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was cancelled.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    default:
      return error.message ? error.message.replace(/^Firebase:\s*(Error\s*)?(\([^)]+\)\.?\s*)?/i, '') : 'Authentication failed. Please try again.';
  }
}
