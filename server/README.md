# Edvanta Backend Server

A Flask-based REST API backend powering the Edvanta educational platform. Features AI-powered learning tools including chatbots, quiz generation, roadmap creation, visual content generation, and more.

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
- 🤖 **Conversational Chatbot** - Doubt solving with context-aware responses
- 📝 **Quiz Generation** - AI-generated quizzes with automatic scoring  
- 🗺️ **Learning Roadmaps** - Personalized learning paths with milestones
- 🎥 **Visual Content Generator** - Text/PDF/Audio to educational slideshows
- 👨‍🏫 **AI Tutor** - Voice & text tutoring with subject expertise
- 📄 **Resume Builder** - Resume analysis and job-fit scoring

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
   python index.py
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
├── index.py                 # WSGI entry point
├── requirements.txt         # Dependencies (Vercel optimized)
├── vercel.json             # Vercel configuration
├── .env.example            # Environment variables template
├── app/
│   ├── __init__.py         # Application factory
│   ├── config.py           # Configuration management
│   ├── routes/             # API endpoints
│   │   ├── visual.py       # Visual content generation
│   │   ├── chatbot.py      # Doubt solving chatbot
│   │   ├── quizzes.py      # Quiz generation & scoring
│   │   ├── tutor.py        # AI tutoring system
│   │   ├── roadmap.py      # Learning roadmap creation
│   │   ├── resume.py       # Resume building & analysis
│   │   └── user_stats.py   # User statistics & progress
│   └── utils/              # Utility modules
│       ├── ai_utils.py     # Gemini AI integration
│       ├── visual_utils_serverless.py  # Video generation
│       ├── cloudinary_utils.py         # File uploads
│       ├── pdf_utils.py    # Document processing
│       ├── mongo_utils.py  # Database utilities
│       └── quizzes_utils.py # Quiz logic
```

## 🔧 API Endpoints

### Core Endpoints
- `GET /` - Health check
- `GET /api/runtime-features` - Feature availability status

### Visual Content Generation
- `POST /api/visual/text-to-video` - Generate from text
- `POST /api/visual/pdf-url-to-video` - Generate from PDF URL  
- `POST /api/visual/audio-to-video` - Generate from audio URL

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

#### Required
```env
MONGODB_URI=mongodb+srv://...     # MongoDB connection
GEMINI_API_KEY=AIza...            # Google Gemini API key
```

#### Optional
```env
CLOUDINARY_CLOUD_NAME=...         # File uploads
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

ALLOWED_ORIGINS=*                 # CORS origins
SECRET_KEY=your-secret-key        # Flask secret
```

### Auto-Detection Features
The server automatically detects:
- **Environment** (development/production)
- **Platform** (Vercel, AWS, Heroku, etc.)
- **Debug Mode** (disabled in production)
- **Available Libraries** (graceful fallbacks)

## 🛠️ Technology Stack

### Core Framework
- **Flask 3.1.1** - Web framework
- **Flask-CORS** - Cross-origin resource sharing
- **Python-dotenv** - Environment management

### AI & Machine Learning
- **Google Generative AI** - Gemini API integration
- **Google Auth** - Authentication utilities

### Database & Storage  
- **PyMongo 4.6.1** - MongoDB driver
- **Cloudinary** - File/image hosting
- **Requests** - HTTP client

### Document Processing
- **PyPDF 4.0+** - PDF text extraction
- **Python-docx** - Word document processing
- **ReportLab** - PDF generation
- **Pillow** - Image processing

## 🔍 Monitoring & Health Checks

### Health Check Endpoints

**Basic Health Check**
```bash
GET /
```
Returns:
```json
{
  "status": "ok",
  "service": "edvanta-backend", 
  "environment": "production",
  "debug": false,
  "registered_blueprints": ["visual", "chatbot", "quizzes", ...]
}
```

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
- **Content Generation** - Visual content creation frequency
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
