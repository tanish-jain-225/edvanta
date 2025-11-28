/**
 * Visual Generation Testing Utility
 * 
 * This utility helps test the visual generation functionality
 * to ensure all components work correctly.
 */

import backEndURL from '../hooks/helper';

// Test configuration
const TEST_CONFIG = {
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  SUPPORTED_AUDIO_TYPES: ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/webm', 'audio/ogg'],
  SUPPORTED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/mov'],
  MAX_TEXT_LENGTH: 10000,
  POLLING_INTERVAL: 5000, // 5 seconds
  MAX_RETRIES: 3
};

// Environment validation
export const validateEnvironment = () => {
  const issues = [];
  
  // Check Cloudinary configuration
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  
  if (!cloudName) {
    issues.push('VITE_CLOUDINARY_CLOUD_NAME is not configured');
  }
  
  if (!uploadPreset) {
    issues.push('VITE_CLOUDINARY_UPLOAD_PRESET is not configured');
  }
  
  // Check backend URL
  if (!backEndURL) {
    issues.push('Backend URL is not configured');
  }
  
  // Check Firebase configuration
  const firebaseConfig = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID'
  ];
  
  const missingFirebaseVars = firebaseConfig.filter(key => !import.meta.env[key]);
  if (missingFirebaseVars.length > 0) {
    issues.push(`Missing Firebase configuration: ${missingFirebaseVars.join(', ')}`);
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
};

// File validation utilities
export const validateFile = (file, type = 'auto') => {
  const errors = [];
  
  if (!file) {
    errors.push('No file provided');
    return { isValid: false, errors };
  }
  
  // Check file size
  if (file.size > TEST_CONFIG.MAX_FILE_SIZE) {
    errors.push(`File size (${Math.round(file.size / (1024 * 1024))}MB) exceeds maximum limit of 100MB`);
  }
  
  // Type-specific validation
  switch (type) {
    case 'pdf':
      if (file.type !== 'application/pdf') {
        errors.push('File must be a PDF');
      }
      break;
      
    case 'audio':
      if (!file.type.startsWith('audio/') && !TEST_CONFIG.SUPPORTED_AUDIO_TYPES.includes(file.type)) {
        errors.push(`Unsupported audio format. Supported: ${TEST_CONFIG.SUPPORTED_AUDIO_TYPES.join(', ')}`);
      }
      break;
      
    case 'video':
      if (!file.type.startsWith('video/') && !TEST_CONFIG.SUPPORTED_VIDEO_TYPES.includes(file.type)) {
        errors.push(`Unsupported video format. Supported: ${TEST_CONFIG.SUPPORTED_VIDEO_TYPES.join(', ')}`);
      }
      break;
      
    case 'auto':
      // Auto-detect based on file type
      if (file.type === 'application/pdf') {
        return validateFile(file, 'pdf');
      } else if (file.type.startsWith('audio/')) {
        return validateFile(file, 'audio');
      } else if (file.type.startsWith('video/')) {
        return validateFile(file, 'video');
      } else {
        errors.push('Unsupported file type');
      }
      break;
      
    default:
      errors.push('Unknown validation type');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    fileInfo: {
      name: file.name,
      type: file.type,
      size: file.size,
      sizeFormatted: `${Math.round(file.size / (1024 * 1024) * 100) / 100} MB`
    }
  };
};

// Text validation
export const validateText = (text) => {
  const errors = [];
  
  if (!text || typeof text !== 'string') {
    errors.push('Text must be a non-empty string');
    return { isValid: false, errors };
  }
  
  const trimmedText = text.trim();
  
  if (trimmedText.length === 0) {
    errors.push('Text cannot be empty');
  }
  
  if (trimmedText.length > TEST_CONFIG.MAX_TEXT_LENGTH) {
    errors.push(`Text is too long (${trimmedText.length} characters). Maximum: ${TEST_CONFIG.MAX_TEXT_LENGTH}`);
  }
  
  if (trimmedText.length < 10) {
    errors.push('Text is too short. Please provide at least 10 characters for better video generation.');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    textInfo: {
      length: trimmedText.length,
      wordCount: trimmedText.split(/\s+/).length,
      preview: trimmedText.slice(0, 100) + (trimmedText.length > 100 ? '...' : '')
    }
  };
};

// API connectivity test
export const testAPIConnectivity = async () => {
  try {
    const response = await fetch(`${backEndURL}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        success: true,
        status: response.status,
        data
      };
    } else {
      return {
        success: false,
        status: response.status,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Network error'
    };
  }
};

// Cloudinary connectivity test
export const testCloudinaryConnectivity = async (testFile = null) => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  
  if (!cloudName || !uploadPreset) {
    return {
      success: false,
      error: 'Cloudinary configuration missing'
    };
  }
  
  try {
    // Test with a small text file if no test file provided
    const file = testFile || new File(['test content'], 'test.txt', { type: 'text/plain' });
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        data: {
          url: data.secure_url,
          publicId: data.public_id
        }
      };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error?.message || `HTTP ${response.status}`
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Network error'
    };
  }
};

// Comprehensive system check
export const runSystemCheck = async () => {
  console.log('🔍 Running Visual Generation System Check...');
  
  const results = {
    environment: validateEnvironment(),
    api: await testAPIConnectivity(),
    cloudinary: await testCloudinaryConnectivity(),
    timestamp: new Date().toISOString()
  };
  
  // Log results
  console.log('📋 System Check Results:');
  console.log('Environment:', results.environment.isValid ? '✅ Valid' : '❌ Issues found');
  if (!results.environment.isValid) {
    results.environment.issues.forEach(issue => console.log(`  - ${issue}`));
  }
  
  console.log('API Connectivity:', results.api.success ? '✅ Connected' : '❌ Failed');
  if (!results.api.success) {
    console.log(`  Error: ${results.api.error}`);
  }
  
  console.log('Cloudinary:', results.cloudinary.success ? '✅ Connected' : '❌ Failed');
  if (!results.cloudinary.success) {
    console.log(`  Error: ${results.cloudinary.error}`);
  }
  
  const overallStatus = results.environment.isValid && results.api.success && results.cloudinary.success;
  console.log(`\n🎯 Overall Status: ${overallStatus ? '✅ All systems ready' : '❌ Issues detected'}`);
  
  return results;
};

// Export test configuration for use in components
export { TEST_CONFIG };

// Default export for easy importing
export default {
  validateEnvironment,
  validateFile,
  validateText,
  testAPIConnectivity,
  testCloudinaryConnectivity,
  runSystemCheck,
  TEST_CONFIG
};