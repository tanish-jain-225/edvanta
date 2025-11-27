/**
 * Backend API URL Configuration
 * Automatically selects the correct API URL based on environment
 */

// Vite automatically sets import.meta.env.DEV and import.meta.env.PROD
const backEndURL = import.meta.env.DEV 
  ? import.meta.env.VITE_API_BASE_URL
  : import.meta.env.VITE_PRODUCTION_API_URL;

console.log(`🌐 Environment: ${import.meta.env.DEV ? 'Development' : 'Production'}`);
console.log(`🔗 Backend URL: ${backEndURL}`);

export default backEndURL;
