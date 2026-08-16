"""Configuration module for Edvanta backend.

This file centralizes all configuration settings and environment variables
used throughout the Edvanta backend application. Using this centralized config
helps with deployment to environments like Vercel, AWS Lambda, Heroku, Google Cloud.

Environment variables (required for deployment):
- FLASK_ENV: development/production
- SECRET_KEY: Flask secret key for session security
- MONGODB_URI: MongoDB connection string
- MONGODB_DB_NAME: MongoDB database name
- GEMINI_API_KEY: Google Gemini API key for AI features

Optional environment variables:
- ALLOWED_ORIGINS: Comma separated origins for CORS (default: "http://localhost:5173")
- GEMINI_TEMPERATURE/GEMINI_TOP_P/GEMINI_TOP_K: AI generation parameters
- GEMINI_MODEL_NAME: Gemini model to use (default: gemini-2.5-flash)
"""
import os


class Config:
    """Centralized configuration for Edvanta backend."""
    
    # Environment Detection
    IS_VERCEL = os.getenv("VERCEL") == "1"
    IS_AWS_LAMBDA = "AWS_LAMBDA_FUNCTION_NAME" in os.environ
    IS_HEROKU = "DYNO" in os.environ
    IS_NETLIFY = os.getenv("NETLIFY") == "true"
    IS_GOOGLE_CLOUD = "GOOGLE_CLOUD_PROJECT" in os.environ or "GAE_APPLICATION" in os.environ
    IS_SERVERLESS = any([IS_VERCEL, IS_AWS_LAMBDA, IS_HEROKU, IS_NETLIFY, IS_GOOGLE_CLOUD])
    
    # Flask core settings
    SECRET_KEY = os.getenv("SECRET_KEY", "edvanta-dev-secret-key")
    FLASK_ENV = os.getenv("FLASK_ENV", "development").lower()
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max upload limit

    
    @classmethod
    def get_environment(cls):
        """Dynamically detect environment based on various platform indicators."""
        if cls.IS_SERVERLESS:
            return "production"
        
        if cls.FLASK_ENV in ["production", "prod"]:
            return "production"
        
        return "development"
    
    @property
    def ENV(self):
        return self.get_environment()
    
    @property  
    def DEBUG(self):
        # Always True in development unless explicitly overridden
        return self.get_environment() == "development"

    # Server settings
    PORT = int(os.getenv("PORT", "5000"))
    HOST = os.getenv("HOST", "0.0.0.0")

    # Gemini AI settings (Primary AI provider)
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-2.5-flash")

    # Gemini AI model parameters
    GEMINI_TEMPERATURE = float(os.getenv("GEMINI_TEMPERATURE", "0.7"))
    GEMINI_TOP_P = float(os.getenv("GEMINI_TOP_P", "0.95"))
    GEMINI_TOP_K = int(os.getenv("GEMINI_TOP_K", "40"))
    GEMINI_MAX_OUTPUT_TOKENS = int(os.getenv("GEMINI_MAX_OUTPUT_TOKENS", "4096"))

    # CORS settings
    ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")

    # MongoDB Configuration
    MONGODB_URI = (
        os.getenv("MONGODB_URI") or 
        os.getenv("MONGO_URI") or 
        os.getenv("DATABASE_URL") or
        "mongodb://localhost:27017/"
    )
    MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "edvanta")
    
    # Collection names
    MONGODB_QUIZ_COLLECTION = os.getenv("MONGODB_QUIZ_COLLECTION", "quizzes")
    MONGODB_QUIZ_HISTORY_COLLECTION = os.getenv("MONGODB_QUIZ_HISTORY_COLLECTION", "quiz_history")
    MONGODB_CHAT_COLLECTION = os.getenv("MONGODB_CHAT_COLLECTION", "chat_sessions")
    MONGODB_VOICE_CHAT_COLLECTION = os.getenv("MONGODB_VOICE_CHAT_COLLECTION", "voice_chats")
    MONGODB_ACTIVE_SESSIONS_COLLECTION = os.getenv("MONGODB_ACTIVE_SESSIONS_COLLECTION", "active_sessions")
    MONGODB_ROADMAP_COLLECTION = os.getenv("MONGODB_ROADMAP_COLLECTION", "roadmaps")
    MONGODB_USER_STATS_COLLECTION = os.getenv("MONGODB_USER_STATS_COLLECTION", "user_stats")
    MONGODB_RESUME_COLLECTION = os.getenv("MONGODB_RESUME_COLLECTION", "resumes")

    # Cloudinary Configuration
    CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
    CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
    CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

    # YouTube Data API Configuration
    YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY") or os.getenv("VITE_YOUTUBE_API_KEY")


