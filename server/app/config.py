"""Configuration module for Edvanta backend.

This file centralizes all configuration settings and environment variables
used throughout the Edvanta backend application. Using this centralized config
helps with deployment to environments like Vercel.

Environment variables (required for deployment):
- FLASK_ENV: development/production
- SECRET_KEY: Flask secret key for session security
- MONGODB_URI: MongoDB connection string
- MONGODB_DB_NAME: MongoDB database name
- GEMINI_API_KEY: Google Gemini API key for AI features

Optional environment variables:
- CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET: For image uploads
- ALLOWED_ORIGINS: Comma separated origins for CORS (default: "*")
- GEMINI_TEMPERATURE/GEMINI_TOP_P/GEMINI_TOP_K: AI generation parameters
- GEMINI_MODEL_NAME: Gemini model to use (default: gemini-2.5-flash)
"""
import os
from typing import List


class Config:
    # Flask core settings
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
    
    @classmethod
    def get_environment(cls):
        """Dynamically detect environment based on various platform indicators."""
        # Check for serverless/cloud platforms
        if os.getenv("VERCEL") == "1":
            return "production"
        if os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
            return "production"  
        if os.getenv("DYNO"):  # Heroku
            return "production"
        if os.getenv("NETLIFY") == "true":
            return "production"
        if os.getenv("GOOGLE_CLOUD_PROJECT"):
            return "production"
        
        # Check explicit environment setting
        flask_env = os.getenv("FLASK_ENV", "").lower()
        if flask_env in ["production", "prod"]:
            return "production"
        elif flask_env in ["development", "dev"]:
            return "development"
        
        # Default to development for local/unknown environments
        return "development"
    
    @property
    def ENV(self):
        return self.get_environment()
    
    @property  
    def DEBUG(self):
        return self.get_environment() == "development"

    # Server settings - flexible for any deployment platform
    PORT = int(os.getenv("PORT", os.getenv("HTTP_PORT", "5000")))
    HOST = os.getenv("HOST", "0.0.0.0")

    # Gemini AI settings (Primary AI provider) - graceful fallback if not configured
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-2.5-flash")

    # Gemini AI model parameters
    GEMINI_TEMPERATURE = float(os.getenv("GEMINI_TEMPERATURE", "0.7"))
    GEMINI_TOP_P = float(os.getenv("GEMINI_TOP_P", "0.95"))
    GEMINI_TOP_K = int(os.getenv("GEMINI_TOP_K", "40"))
    GEMINI_MAX_OUTPUT_TOKENS = int(os.getenv("GEMINI_MAX_OUTPUT_TOKENS", "1024"))

    # Alternative API Keys (optional)
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

    # Cloudinary settings (legacy naming)
    CLOUD_NAME = os.getenv("CLOUD_NAME")
    CLOUDINARY_APIKEY = os.getenv("CLOUDINARY_APIKEY")
    CLOUDINARY_SECRET = os.getenv("CLOUDINARY_SECRET")
    CLOUDINARY_APIENV = os.getenv("CLOUDINARY_APIENV")

    # Cloudinary settings (standard naming) - flexible configuration
    CLOUDINARY_CLOUD_NAME = (
        os.getenv("CLOUDINARY_CLOUD_NAME") or 
        os.getenv("CLOUD_NAME")
    )
    CLOUDINARY_API_KEY = (
        os.getenv("CLOUDINARY_API_KEY") or 
        os.getenv("CLOUDINARY_APIKEY")
    )
    CLOUDINARY_API_SECRET = (
        os.getenv("CLOUDINARY_API_SECRET") or 
        os.getenv("CLOUDINARY_SECRET")
    )

    # CORS settings
    ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*")

    # MongoDB Credentials - flexible configuration for different platforms
    MONGODB_URI = (
        os.getenv("MONGODB_URI") or 
        os.getenv("MONGO_URI") or 
        os.getenv("DATABASE_URL") or
        "mongodb://localhost:27017/"
    )
    MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "edvanta")
    MONGODB_QUIZ_COLLECTION = os.getenv("MONGODB_QUIZ_COLLECTION", "quizzes")
    MONGODB_QUIZ_HISTORY_COLLECTION = os.getenv("MONGODB_QUIZ_HISTORY_COLLECTION", "quiz_history")
    MONGODB_CHAT_COLLECTION = os.getenv("MONGODB_CHAT_COLLECTION", "chat_sessions")
    MONGODB_VOICE_CHAT_COLLECTION = os.getenv("MONGODB_VOICE_CHAT_COLLECTION", "voice_chats")
    MONGODB_ACTIVE_SESSIONS_COLLECTION = os.getenv("MONGODB_ACTIVE_SESSIONS_COLLECTION", "active_sessions")
    MONGODB_ROADMAP_COLLECTION = os.getenv("MONGODB_ROADMAP_COLLECTION", "roadmaps")