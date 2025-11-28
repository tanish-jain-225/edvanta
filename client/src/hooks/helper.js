/**
 * Backend API URL Configuration
 * Automatically selects the correct API URL based on environment
 */

// Determine backend URL based on environment
const isDevelopment = import.meta.env.DEV;
const devUrl = import.meta.env.VITE_API_BASE_URL;
const prodUrl = import.meta.env.VITE_PRODUCTION_API_URL;

// Use development URL if in dev mode and it's configured, otherwise use production URL
const backEndURL = isDevelopment && devUrl ? devUrl : prodUrl;

// Fallback to localhost if no URL is configured (should not happen in normal operation)
if (!backEndURL) {
  console.warn('⚠️ No backend URL configured! Using fallback localhost:5000');
  // Set fallback but don't export it immediately - let it be handled by the components
}

// Ensure URL doesn't end with trailing slash for consistency
const cleanBackEndURL = backEndURL?.replace(/\/$/, '') || 'http://localhost:5000';

console.log(`🌐 Environment: ${isDevelopment ? 'Development' : 'Production'}`);
console.log(`🔗 Backend URL: ${cleanBackEndURL}`);

// Validate URL format
try {
  new URL(cleanBackEndURL);
  console.log('✅ Backend URL format is valid');
} catch (error) {
  console.error('❌ Invalid backend URL format:', cleanBackEndURL);
  console.error('Please check your environment variables in .env file');
}

export default cleanBackEndURL;
