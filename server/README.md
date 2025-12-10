# Edvanta Backend Server

A Flask-based REST API backend powering the Edvanta educational platform. Features AI-powered learning tools including chatbots, quiz generation, roadmap creation, and more.

## 🌟 Key Features

### **Universal Deployment** 
Works seamlessly across all hosting platforms without configuration:
- ✅ **Vercel** (Serverless)
- ✅ **AWS Lambda** 
- ✅ **Heroku**
- ✅ **Google Cloud Functions**
- ✅ **Netlify Functions**
- ✅ **Railway**
- ✅ **Local Development**

### **AI-Powered Learning Tools**
- 🤖 **Conversational Chatbot** - Context-aware doubt solving with chat history
- 📝 **Quiz Generation** - AI-generated quizzes with automatic scoring & analytics
- 🗺️ **Learning Roadmaps** - Personalized learning paths with milestone tracking
- 👨‍🏫 **AI Tutor** - Interactive tutoring with voice & text support
- 📄 **Resume Builder** - Professional resume analysis & job-fit scoring
- 📊 **User Analytics** - Comprehensive learning progress & performance tracking
- 🎬 **Visual Content Explorer** - Client-side YouTube API integration (no backend required)

### **Robust Architecture**
- 🔄 **Auto-Environment Detection** - Automatically adapts to deployment platform
- 🛡️ **Graceful Fallbacks** - Works with limited features when services unavailable
- 📦 **Serverless Optimized** - Under 250MB, fast cold starts
- 🌐 **Universal CORS** - Cross-platform compatibility built-in
- 📊 **Real-time Monitoring** - Health checks and feature reporting

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- MongoDB (Atlas recommended)
- Google Gemini API key

### Local Development

1. **Clone and Setup**
   ```bash
   cd server
   pip install -r requirements.txt
   cp .env.example .env
   ```

2. **Configure Environment**
   Edit `.env` file with your credentials:
   ```env
   # Required
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
   GEMINI_API_KEY=AIza...your-key...
   
   # Optional
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-secret
   ```

3. **Run Server**
   ```bash
   python app.py
   ```
   Server starts at `http://localhost:5000`

### Production Deployment

#### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### Heroku
```bash
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

#### AWS Lambda / Google Cloud / Others
The server auto-detects the environment and configures itself automatically.

## 📁 Project Structure

```
server/
├── app.py                   # Local development entry point
├── requirements.txt         # Dependencies (Vercel optimized <250MB)
├── runtime.txt             # Python version specification
├── vercel.json             # Vercel serverless configuration
├── .env.example            # Environment variables template
├── .env                    # Local environment variables (git-ignored)
├── .gitignore              # Git ignore patterns
├── README.md               # This documentation
├── api/
│   └── index.py            # Vercel WSGI entry point
└── app/
    ├── __init__.py         # Application factory with auto-detection
    ├── config.py           # Universal configuration management
    ├── routes/
    │   ├── __init__.py
    │   ├── chatbot.py      # AI doubt solving chatbot
    │   ├── quizzes.py      # Quiz generation & scoring system
    │   ├── tutor.py        # AI tutoring with voice support
    │   ├── roadmap.py      # Learning roadmap creation
    │   ├── resume.py       # Resume building & job analysis
    │   └── user_stats.py   # User statistics & progress tracking
    └── utils/
        ├── __init__.py
        ├── ai_utils.py     # Gemini AI integration
        ├── cloudinary_utils.py # File uploads & media
        ├── pdf_utils.py    # PDF text extraction
        ├── mongo_utils.py  # MongoDB utilities
        └── quizzes_utils.py # Quiz generation logic
```

## 🔧 API Endpoints

### Core Endpoints
- `GET /` - Health check
- `GET /api/runtime-features` - Feature availability status

### Chatbot & Tutoring
- `POST /api/chat` - Send chat message
- `GET /api/chat/history/{user_email}` - Get chat history
- `POST /api/tutor/ask` - Ask tutor question
- `POST /api/tutor/voice` - Voice tutoring session

### Quiz System
- `POST /api/quizzes/generate` - Generate quiz from topic
- `POST /api/quizzes/score` - Score quiz submission
- `GET /api/quizzes/history/{user_email}` - Get quiz history

### Learning Roadmaps  
- `POST /api/roadmap/generate` - Generate learning roadmap
- `GET /api/roadmap/user/{user_email}` - Get user roadmaps
- `GET /api/roadmap/download/{roadmap_id}` - Download roadmap PDF

### Resume Tools
- `POST /api/resume/upload` - Upload resume for analysis
- `POST /api/resume/analyze` - Analyze resume vs job description

### User Analytics
- `GET /api/user-stats` - Get user progress statistics

## ⚙️ Configuration

### Environment Variables

All environment variables are documented in `.env.example` with detailed setup instructions.

#### Required for Core Features
- `MONGODB_URI` - MongoDB connection string (Atlas recommended)
- `MONGODB_DB_NAME` - Database name (default: edvanta)
- `GEMINI_API_KEY` - Google Gemini API key for AI features

#### Optional for Enhanced Features
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` - File uploads
- `SECRET_KEY` - Flask session security (auto-generated if not set)
- `ALLOWED_ORIGINS` - CORS configuration (default: *)
- `GEMINI_MODEL_NAME` - AI model version (default: gemini-2.5-flash)
- `GEMINI_TEMPERATURE`, `GEMINI_TOP_P`, `GEMINI_TOP_K` - AI tuning parameters

See `.env.example` for complete documentation and setup guides.

### Auto-Detection Features
The server automatically detects and configures based on the deployment platform:
- Environment mode (development/production)
- Serverless optimization for Vercel, AWS Lambda, etc.
- Debug mode (enabled only locally)
- Database connectivity with fallback handling
- Graceful degradation when optional services are unavailable

## 🛠️ Technology Stack

### Core Framework
- **Flask 3.1.1** - Lightweight web framework with WSGI support
- **Flask-CORS 5.0.0** - Universal cross-origin resource sharing
- **Python-dotenv** - Environment variable management

### AI & Machine Learning
- **Google Generative AI 0.8.0+** - Gemini AI integration for learning tools
- **Google Auth 2.22.0+** - Google authentication utilities

### Database & Storage  
- **PyMongo 4.6.1** - MongoDB driver with BSON support
- **Cloudinary 1.34.0+** - Cloud file and image hosting
- **Requests 2.31.0+** - HTTP client for external APIs

### Document Processing
- **PyPDF 4.0+** - Modern PDF text extraction (replaces PyPDF2)
- **Python-docx 1.0+** - Microsoft Word document processing
- **ReportLab 4.2.0+** - Professional PDF generation
- **Pillow 10.0+** - Lightweight image manipulation

## 🔍 Monitoring & Health Checks

### Health Check Endpoints

**Basic Health Check**
```bash
GET /
```
Returns service status, environment info, and registered API blueprints.

**Feature Status Check**
```bash
GET /api/runtime-features
```
Returns detailed status of:
- Available Python libraries
- API key configurations  
- Database connectivity
- Environment settings

### Error Handling
- **Graceful Degradation** - Features disable gracefully when dependencies unavailable
- **CORS Enforcement** - Proper headers on all responses including errors
- **Detailed Logging** - Comprehensive error reporting for debugging

## 🚨 Troubleshooting

### Common Issues

**"429 Rate Limit Exceeded"**
- Gemini API free tier: 15 requests/min, 1500/day
- Solution: Wait for quota reset or upgrade to paid tier

**"Gemini API key not configured"**  
- Set `GEMINI_API_KEY` in environment variables
- Get key from: https://makersuite.google.com/app/apikey
- App continues with limited AI features

**"Connection refused" to MongoDB**
- Verify `MONGODB_URI` is correct
- Check network access in MongoDB Atlas
- Confirm database user credentials

**"Cloudinary upload failed"**
- Verify Cloudinary credentials are set
- Check free tier limits
- File uploads disable gracefully if not configured

### Performance Optimization

**Serverless Deployment**
- Dependencies optimized for <250MB Vercel limit
- Fast cold start times
- No persistent connections or background processes

**Memory Usage**
- Efficient in-memory fallbacks when database unavailable
- Lazy loading of heavy dependencies
- Automatic cleanup of temporary files

**Request Handling**
- Concurrent request support
- Proper connection pooling for MongoDB
- Rate limiting ready (implement as needed)

## 📊 Analytics & Metrics

The server provides comprehensive user analytics:

- **Quiz Performance** - Scores, completion rates, topic analysis
- **Learning Progress** - Roadmap completion, skill development  
- **Chat Activity** - Question patterns, response satisfaction
- **Session Management** - Active tutoring sessions, duration tracking

## 🔐 Security

### Authentication
- User identification via email (Firebase integration ready)
- Session management for tutoring features
- Secure API key handling

### Data Protection
- Environment variable isolation
- MongoDB connection encryption
- Cloudinary secure uploads
- No sensitive data in logs

### CORS Policy
- Configurable allowed origins
- Secure defaults for production
- Credential handling support

## 🤝 Contributing

1. **Fork** the repository
2. **Create** feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** changes (`git commit -m 'Add amazing feature'`)  
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open** Pull Request
