# Edvanta Backend Server

<!-- Badges: update URLs to point to your CI / coverage / packaging if available -->
[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org)
[![Flask](https://img.shields.io/badge/Flask-3.1.1-black.svg)](https://palletsprojects.com/p/flask/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](../LICENSE)

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

## Backend architecture diagram

Below is a high-level architecture diagram showing the main backend components and integrations. Replace or expand with a PNG/SVG if you maintain visuals in `server/docs/`.

```mermaid
graph TD
   Client[Client App (React)] -->|HTTP/REST| API[Flask REST API]
   API --> Auth[Auth (Firebase / JWT)]
   API --> DB[(MongoDB Atlas)]
   API --> AI[Google Gemini]
   API --> Cloudinary[Cloudinary]
   API --> Jobs[Background Jobs (optional)]
   API --> Logs[Logging / Sentry / Monitoring]
   style API fill:#f9f,stroke:#333,stroke-width:2px
```

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

---

## Complete API documentation & examples

This section documents the most commonly used endpoints with request and response examples. Use these as templates for integration and testing. Replace base URL with your deployment (e.g., `https://api.example.com`).

### Authentication
- Header: `Authorization: Bearer <JWT_OR_FIREBASE_ID_TOKEN>`

### 1) Chat (Send message)
- Endpoint: `POST /api/chat`
- Description: Send a message to the chatbot and receive AI-generated response.
- Request (application/json):

```bash
curl -X POST https://api.example.com/api/chat \
   -H "Content-Type: application/json" \
   -H "Authorization: Bearer <token>" \
   -d '{"user_email":"user@example.com", "message":"Explain dynamic programming"}'
```

- Response (200):

```json
{
   "status": "ok",
   "reply": "Dynamic programming is ...",
   "conversation_id": "abc123",
   "metadata": {"tokens_used": 120}
}
```

### 2) Generate Quiz
- Endpoint: `POST /api/quizzes/generate`
- Description: Generate a quiz from a topic or text input.
- Request:

```bash
curl -X POST https://api.example.com/api/quizzes/generate \
   -H "Content-Type: application/json" \
   -d '{"topic":"binary search","num_questions":5, "difficulty":"medium"}'
```

- Response (200):

```json
{
   "status":"ok",
   "quiz_id":"q_123",
   "questions":[
      {"id":1, "text":"What is binary search?", "choices":["..."], "answer":null}
   ]
}
```

### 3) Score Quiz
- Endpoint: `POST /api/quizzes/score`
- Request:

```bash
curl -X POST https://api.example.com/api/quizzes/score \
   -H "Content-Type: application/json" \
   -d '{"quiz_id":"q_123","user_email":"user@example.com","answers":[{"id":1,"answer":"A"}]}'
```

- Response (200):

```json
{
   "status":"ok",
   "score": 80,
   "summary": {"correct":4,"total":5}
}
```

### 4) Resume Analyze
- Endpoint: `POST /api/resume/analyze`
- Description: Submit a resume and job description for AI job-fit scoring.
- Request: multipart/form-data with `file` (PDF/DOCX) and `job_description` (string)

```bash
curl -X POST https://api.example.com/api/resume/analyze \
   -H "Authorization: Bearer <token>" \
   -F "file=@./resume.pdf" \
   -F "job_description=Senior Backend Engineer"
```

- Response (200):

```json
{
   "status":"ok",
   "score": 72,
   "highlights": ["Strong experience in Python","Needs more cloud infra examples"]
}
```

For a complete OpenAPI/Swagger spec: consider adding `openapi.yaml` and serving it via `/api/docs` using `flasgger` or `connexion`.


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

---

## Authentication & authorization flow

Authentication is typically handled via Firebase (frontend) with ID tokens exchanged for server-side JWTs when needed. The backend accepts either Firebase ID tokens (validated via Google Auth libraries) or a JWT issued by the backend after a successful login.

Typical flow:

1. User authenticates on client (Firebase). Client receives Firebase ID token.
2. Client calls backend endpoints with `Authorization: Bearer <firebase-id-token>`.
3. Backend validates token with Google Auth or Firebase Admin SDK and extracts user email/uid.
4. Backend creates or fetches user record in MongoDB and issues a short-lived internal JWT (optional).
5. For role-based access, backend maintains `roles` in user document and checks them in route decorators.

Security notes:
- Always validate `Authorization` header and return 401 if missing/invalid.
- Use HTTPS in production and set proper CORS origin lists.


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

## Database schema (collections)

High-level MongoDB collections and relationships. Update to match `mongo_utils.py` models.

```mermaid
erDiagram
      USERS {
            string _id PK
            string email
            string name
            string[] roles
            datetime created_at
      }
      CHATS {
            string _id PK
            string user_id FK
            string conversation_id
            object messages
            datetime updated_at
      }
      QUIZZES {
            string _id PK
            string user_id FK
            string quiz_id
            object questions
            int score
      }
      ROADMAPS {
            string _id PK
            string user_id FK
            object roadmap
      }

      USERS ||--o{ CHATS : has
      USERS ||--o{ QUIZZES : takes
      USERS ||--o{ ROADMAPS : owns
```

Add a physical ERD or diagram in `server/docs/` for visual reference if needed.

## Environment variables (examples)

Main variables (copy into `server/.env` from `.env.example` and edit):

```env
# Required
MONGODB_URI="mongodb+srv://edvanta_user:SuperSecretPass@cluster0.mongodb.net/edvanta?retryWrites=true&w=majority"
MONGODB_DB_NAME="edvanta"
GEMINI_API_KEY="AIza...your-gemini-key..."

# Optional / recommended
CLOUDINARY_CLOUD_NAME="my-cloud"
CLOUDINARY_API_KEY="123456789"
CLOUDINARY_API_SECRET="abcdefg"
SECRET_KEY="replace-with-random-secret"
ALLOWED_ORIGINS="https://app.example.com,https://admin.example.com"
GEMINI_MODEL_NAME="gemini-2.5-flash"
GEMINI_TEMPERATURE=0.2
```

Never commit `.env` to the repository; use your platform secrets manager (Vercel, Heroku config vars, AWS Secrets Manager).

## Deployment guide (Docker, Vercel, Heroku)

Docker (recommended for consistency):

Dockerfile (example):

```dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV FLASK_APP=app.py
CMD ["gunicorn", "api.index:app", "-b", "0.0.0.0:5000", "--workers", "2"]
```

docker-compose (local dev):

```yaml
version: '3.8'
services:
   web:
      build: .
      ports:
         - "5000:5000"
      environment:
         - MONGODB_URI=${MONGODB_URI}
         - GEMINI_API_KEY=${GEMINI_API_KEY}
      volumes:
         - .:/app
```

Vercel: Use existing `vercel.json` (serverless). Ensure all env vars are added in the Vercel dashboard.

Heroku: set config vars with `heroku config:set MONGODB_URI=... GEMINI_API_KEY=...` then `git push heroku main`.

## Error-handling strategy

- Centralize error handling using Flask error handlers (return consistent JSON payloads: `{status, error, code, details?}`).
- Translate external API errors (Gemini, Cloudinary) into user-safe messages and include telemetry IDs for debugging.
- Use retries with exponential backoff for idempotent external calls and circuit-breaker patterns for flaky services.
- Return appropriate HTTP status codes (400 for bad requests, 401/403 for auth, 429 for rate limit, 500 for server errors).

Example error response:

```json
{
   "status": "error",
   "code": "external_service_error",
   "message": "AI service temporarily unavailable",
   "tracking_id": "req-abcdef1234"
}
```

## Rate limiting & security

- Implement IP / user rate-limiting (e.g., `Flask-Limiter`) to protect AI and third-party API quotas.
- Protect upload endpoints (resume upload) with file size/type checks and virus scanning if required.
- Validate and sanitize all inputs to prevent injection attacks; enforce strict JSON schemas with `marshmallow` or `pydantic`.
- Use HTTPS in production and HSTS headers. Store secrets in secret stores.
- Consider WAF rules for public endpoints.

## Logging & monitoring

- Structured logging (JSON) for easy ingestion (use `structlog` or Python `logging` with JSON formatter).
- Capture errors and exceptions with Sentry (recommended) — add Sentry DSN in env vars and initialize in app startup.
- Export metrics (request durations, error rates, queue lengths) using Prometheus client and scrape via Prometheus.
- Provide health and readiness endpoints for orchestrators (K8s / PaaS) to detect service state.

## Backend testing instructions

Recommended test stack: `pytest`, `pytest-cov`, and `requests` or `httpx` for integration tests.

Example commands (run from `server/`):

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install pytest pytest-cov
pytest -q
```

Tips:
- Mock external services (Gemini, Cloudinary, MongoDB) using `responses`, `httpretty`, or `mongomock` for unit tests.
- Provide a `tests/` folder with unit tests for `ai_utils`, `mongo_utils`, and route tests using the Flask test client.

## Dependency overview

- See `requirements.txt` for the full list. Keep dependencies pinned to minor versions to avoid surprises.
- Important direct dependencies:
   - Flask (web framework)
   - PyMongo (MongoDB driver)
   - google-generative-ai / google-auth (Gemini integration)
   - cloudinary (media uploads)

Consider using Dependabot or Renovate to keep dependencies up to date and monitor for vulnerabilities.


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
