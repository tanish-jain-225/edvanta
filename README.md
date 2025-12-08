<div align="center">
	<img src="client/public/edvanta-logo.png" alt="Edvanta" height="90" />
</div>
  
# Edvanta
**AI-powered personalised learning & career acceleration platform**

A comprehensive full-stack educational platform that revolutionizes learning through artificial intelligence, offering personalized learning tools, beautiful responsive design, and seamless deployment across any platform.

## 🌟 Key Features

### **AI-Powered Learning Ecosystem**
- 🎥 **Visual Content Generator** - Convert text/PDF to educational slideshows (text-only input)
- 🤖 **Intelligent Chatbot** - Context-aware doubt solving with conversation history
- 📝 **Smart Quiz System** - AI-generated personalized quizzes with automatic scoring
- 👨‍🏫 **AI Tutor** - Interactive conversational tutoring system
- 🗺️ **Learning Roadmaps** - Personalized learning paths with milestone tracking
- 📄 **Resume Builder** - AI-powered resume analysis and job-fit optimization

### **Modern React Application**
- 📱 **Responsive Design** - Mobile-first interface optimized for all devices
- ⚡ **Lightning Fast** - Vite build system with optimized performance
- 🎨 **Beautiful UI** - TailwindCSS with Radix UI components
- 🔥 **Hot Reload** - Instant development feedback with Vite HMR
- 🌙 **Screen Fatigue Prevention** - Smart break reminders with timer reset

### **Universal Deployment**
- 🌐 **Platform Agnostic** - Works on Vercel, AWS, Heroku, Google Cloud, locally
- 🚀 **Serverless Ready** - Optimized for serverless environments
- 📦 **Zero Configuration** - Auto-detects environment and adapts
- 🛡️ **Production Grade** - Built-in security, error handling, and monitoring

## 🏗️ Architecture Overview

```mermaid
graph TB
    subgraph "Frontend (React App)"
        A[React App] --> B[Firebase Auth]
        A --> C[TailwindCSS UI]
        A --> D[Vite Build System]
        C --> E[Radix UI Components]
    end
    
    subgraph "Backend (Flask API)"
        F[Flask Server] --> G[AI Services]
        F --> H[Database]
        F --> I[File Storage]
        G --> J[Google Gemini]
        H --> K[MongoDB]
        I --> L[Cloudinary]
    end
    
    subgraph "External Services"
        J --> M[AI Generation]
        K --> N[Data Persistence]
        L --> O[Media Hosting]
    end
    
    A -.-> F
    D -.-> F
```

**Client (React App)** ↔ **REST API (Flask)** ↔ **AI Services (Gemini, Cloudinary, MongoDB)**

## 📁 Project Structure

```
Edvanta/
├── client/                          # React + Vite Frontend Application
│   ├── src/
│   │   ├── components/              # Reusable UI components
│   │   │   ├── Layout/              # Navigation (Navbar, Sidebar)
│   │   │   └── ui/                  # Design system components
│   │   │       ├── HeroSpline.jsx   # 3D hero section
│   │   │       ├── ScreenFatigueReminder.jsx # Break reminder system
│   │   │       ├── PageTransition.jsx # Smooth transitions
│   │   │       └── ScrollToTop.jsx  # Auto-scroll component
│   │   ├── pages/                   # Route components
│   │   │   ├── auth/                # Login, Signup
│   │   │   └── tools/               # AI learning tools
│   │   ├── hooks/                   # Custom React hooks
│   │   │   ├── useAuth.js           # Firebase authentication
│   │   │   ├── useResponsive.js     # Responsive utilities
│   │   │   └── helper.js            # API base URL helper
│   │   ├── lib/                     # Core utilities
│   │   │   ├── api.js               # Centralized API client
│   │   │   ├── firebase.js          # Firebase configuration
│   │   │   └── utils.js             # Helper functions
│   │   └── utils/                   # Development utilities
│   │       └── test-visual.js       # Visual generator testing
│   ├── public/
│   │   ├── manifest.json            # Web app manifest
│   │   ├── edvanta-logo.png         # Brand logo
│   │   └── default-avatar.svg       # Default user avatar
│   ├── package.json                 # Dependencies & scripts
│   ├── vite.config.ts               # Vite configuration
│   ├── tailwind.config.js           # TailwindCSS setup
│   └── eslint.config.js             # ESLint configuration
└── server/                          # Flask Backend API
    ├── app/
    │   ├── __init__.py              # Application factory with auto-detection
    │   ├── config.py                # Universal environment configuration
    │   ├── routes/                  # API endpoints (blueprints)
    │   │   ├── visual.py            # Visual generation endpoints
    │   │   ├── chatbot.py           # Chatbot & Q&A
    │   │   ├── quizzes.py           # Quiz generation & scoring
    │   │   ├── tutor.py             # AI tutoring system
    │   │   ├── roadmap.py           # Learning path creation
    │   │   ├── resume.py            # Resume tools
    │   │   └── user_stats.py        # Analytics & progress
    │   └── utils/                   # Service integrations
    │       ├── ai_utils.py          # Gemini AI integration
    │       ├── visual_utils_serverless.py # Serverless video generation
    │       ├── cloudinary_utils.py  # File uploads
    │       ├── pdf_utils.py         # PDF text extraction
    │       ├── mongo_utils.py       # Database utilities
    │       └── quizzes_utils.py     # Quiz generation logic
    ├── requirements.txt             # Python dependencies (Vercel optimized)
    ├── vercel.json                  # Vercel deployment config
    └── index.py                     # WSGI entry point with serverless support
```

## 🚀 Quick Start

### Prerequisites
- **Node.js 18.0+** (for frontend)
- **Python 3.10+** (for backend)
- **MongoDB Atlas** account (database)
- **Google Gemini API** key (AI features)
- **Firebase** project (authentication)
- **Cloudinary** account (media storage)

### 🖥️ Local Development

#### 1. Clone Repository
```bash
git clone https://github.com/tanish-jain-225/edvanta.git
cd edvanta
```

#### 2. Setup Backend
```bash
cd server
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your credentials (see Backend Configuration)
python index.py
```
Backend runs at: `http://localhost:5000`

#### 3. Setup Frontend
```bash
cd client
npm install
cp .env.example .env
# Edit .env with your credentials (see Frontend Configuration)
npm run dev
```
Frontend runs at: `http://localhost:5173`

### 🌐 Production Deployment

#### Vercel (Recommended)
Both frontend and backend can be deployed on Vercel:

**Backend:**
```bash
cd server
vercel --prod
```

**Frontend:**
```bash
cd client
vercel --prod
```

#### Other Platforms
The application auto-detects deployment environment and works on:
- **AWS Lambda** / **Netlify** / **Google Cloud** / **Heroku** / **Railway**

## ⚙️ Configuration

### 🔧 Backend Configuration (`server/.env`)

#### Required Variables
```env
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/

# AI Services
GEMINI_API_KEY=AIza...your-gemini-key...

# Security
SECRET_KEY=your-secure-random-key
```

#### Optional Variables
```env
# Media Storage
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# API Configuration
ALLOWED_ORIGINS=*
GEMINI_TEMPERATURE=0.7
```

### 🎨 Frontend Configuration (`client/.env`)

#### Required Variables
```env
# Backend API
VITE_API_BASE_URL=http://localhost:5000
VITE_PRODUCTION_API_URL=https://your-backend.vercel.app

# Firebase Authentication
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123

# Media Upload
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=your-upload-preset
```

## 🔧 API Endpoints

### Core Services
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check & environment info |
| `GET` | `/api/runtime-features` | Feature availability status |

### Visual Content Generation
| Method | Endpoint | Description |
|--------|-----------|-----------|
| `POST` | `/api/visual/text-to-video` | Generate slideshow from text input |
| `POST` | `/api/visual/pdf-url-to-video` | Generate slideshow from PDF document |

**Note**: Audio processing temporarily disabled - text and PDF input only.

### AI Learning Tools
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | Send chat message to AI |
| `GET` | `/api/chat/history/{user_email}` | Get conversation history |
| `POST` | `/api/quizzes/generate` | Create AI-generated quiz |
| `POST` | `/api/quizzes/score` | Score quiz submission |
| `POST` | `/api/tutor/ask` | Ask AI tutor question |
| `POST` | `/api/tutor/voice` | Voice tutoring session |

### Learning & Career Tools  
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/roadmap/generate` | Generate learning roadmap |
| `GET` | `/api/roadmap/user/{user_email}` | Get user roadmaps |
| `POST` | `/api/resume/upload` | Upload resume for analysis |
| `POST` | `/api/resume/analyze` | Analyze resume vs job description |
| `GET` | `/api/user-stats` | Get user progress statistics |

## 🛠️ Technology Stack

### 🎨 Frontend Stack
- **React 18.3.1** - Modern React with hooks, Suspense, and concurrent features
- **Vite 6.3.5** - Next-generation frontend build tool with HMR
- **React Router DOM 7.8.0** - Declarative routing with nested route support
- **TailwindCSS 4.1.12** - Utility-first CSS framework with JIT compiler
- **Radix UI Components** - Accessible, unstyled component primitives
- **Lucide React 0.539.0** - Beautiful, customizable icon library
- **Firebase 12.1.0** - Authentication and Firestore database
- **Axios 1.11.0** - Promise-based HTTP client for API communication

### ⚙️ Backend Stack
- **Flask 3.1.1** - Lightweight web framework
- **Google Generative AI** - Gemini API integration
- **PyMongo 4.6.1** - MongoDB driver
- **Cloudinary** - Media storage and processing
- **PyPDF / ReportLab** - Document processing

### 🗄️ External Services
- **Google Gemini** - AI content generation
- **MongoDB Atlas** - Cloud database
- **Cloudinary** - Media hosting and processing
- **Firebase** - Authentication and real-time database
- **Vercel** - Serverless deployment platform

## 🎨 Modern React Features

### 🚀 Performance & Development
- **Vite Build System** - Lightning-fast development with HMR
- **Code Splitting** - Route-based lazy loading for optimal performance
- **Tree Shaking** - Optimized production builds with unused code elimination
- **Modern Bundling** - Efficient JavaScript chunks and asset optimization

### 📱 User Experience
- **Responsive Design** - Mobile-first approach with TailwindCSS breakpoints
- **Smooth Transitions** - Page transitions and loading states
- **Screen Fatigue Prevention** - Smart break reminders with timer reset functionality
- **Error Boundaries** - Graceful error handling with user-friendly messages

### ⚡ Interactive Features
- **Real-time Feedback** - Live validation and instant UI updates
- **File Upload Support** - Drag & drop functionality for PDF documents
- **Form Optimization** - Debounced inputs and real-time validation
- **Progressive Enhancement** - Core functionality works without JavaScript

## 🔐 Security Features

### 🛡️ Authentication & Authorization
- **Firebase Auth** - Industry-standard authentication
- **JWT Tokens** - Secure session management
- **Route Protection** - Private route guards
- **Role-based Access** - Feature-level permissions

### 🔒 Data Protection
- **Environment Variables** - Secure credential management
- **HTTPS Enforcement** - Encrypted data transmission
- **Input Validation** - XSS and injection prevention
- **CORS Configuration** - Secure cross-origin requests

## 📊 Monitoring & Analytics

### 🎯 User Analytics
- **Learning Progress** - Quiz scores and completion rates
- **Feature Usage** - Tool adoption and engagement metrics
- **Session Tracking** - Time spent and interaction patterns
- **Performance Metrics** - Core Web Vitals and load times

### 🔍 Development Tools
- **Health Check Endpoints** - Service status monitoring
- **Debug Components** - Real-time development insights
- **Error Boundaries** - Graceful error handling
- **Feature Flags** - Runtime feature availability

## 🤝 Contributing

### Development Workflow
1. **Fork** the repository
2. **Create** feature branch (`git checkout -b feature/amazing-feature`)
3. **Setup** development environment (see Quick Start)
4. **Make** changes following code style guidelines
5. **Test** both frontend and backend thoroughly
6. **Commit** with descriptive messages
7. **Push** to feature branch
8. **Open** Pull Request with detailed description

### Code Style Guidelines
- **Frontend**: ESLint + Prettier, React best practices
- **Backend**: PEP 8, type hints where applicable
- **Git**: Conventional commits, feature branch workflow
- **Testing**: Unit tests for critical functionality

### Project Structure Guidelines
- Keep components small and focused
- Use TypeScript for new utilities
- Follow PWA best practices
- Ensure mobile-first responsive design
- Write accessible code (WCAG compliance)

## 📝 Available Scripts

### Frontend (`client/`)
```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

### Backend (`server/`)
```bash
python index.py   # Start development server
pip install -r requirements.txt  # Install dependencies
```

## 🚨 Troubleshooting

### Common Issues

**"Firebase configuration invalid"**
- Verify all `VITE_FIREBASE_*` variables are correct
- Ensure Firebase project has Authentication enabled

**"API connection failed"**
- Check backend server is running
- Verify `VITE_API_BASE_URL` points to correct backend

**"Gemini API errors"**
- Confirm `GEMINI_API_KEY` is valid
- Check API quota limits (free tier: 15 requests/min)

**"Vite build failed"**
- Check for TypeScript errors in `vite.config.ts`
- Verify all imports use correct file extensions
- Ensure TailwindCSS configuration is valid
- Clear node_modules and reinstall dependencies

**"React Router navigation broken"**
- Verify React Router DOM v7 configuration  
- Check for conflicting route definitions
- Ensure proper component imports in route definitions

### Debug Mode
Enable enhanced debugging during development:
```bash
# Development with detailed logging
npm run dev

# Build analysis
npm run build -- --mode development

# Preview production build
npm run preview
```

## Contributors

| [![](https://github.com/parthnarkar.png?size=100)](https://github.com/parthnarkar) | [![](https://github.com/tanish-jain-225.png?size=100)](https://github.com/tanish-jain-225) | [![](https://github.com/pankaj0695.png?size=100)](https://github.com/pankaj0695) | [![](https://github.com/Chief-Ayush.png?size=100)](https://github.com/Chief-Ayush) |
| :--------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------: |
|                 [**Parth Narkar**](https://github.com/parthnarkar)                 |                  [**Tanish Sanghvi**](https://github.com/tanish-jain-225)                  |                [**Pankaj Gupta**](https://github.com/pankaj0695)                 |                [**Ayush Attarde**](https://github.com/Chief-Ayush)                 |

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check individual README files in `client/` and `server/`
- **Issues**: Open GitHub issue with error details and environment info
- **Health Checks**: Use `/api/runtime-features` to diagnose configuration
- **Community**: Join our Discord for real-time support

---

**🚀 Built for the Future of Education**

Edvanta combines cutting-edge AI technology with modern React development practices to create a scalable, accessible, and powerful learning platform that delivers exceptional user experiences across all devices.

## Contributors

| [![](https://github.com/parthnarkar.png?size=100)](https://github.com/parthnarkar) | [![](https://github.com/tanish-jain-225.png?size=100)](https://github.com/tanish-jain-225) | [![](https://github.com/pankaj0695.png?size=100)](https://github.com/pankaj0695) | [![](https://github.com/Chief-Ayush.png?size=100)](https://github.com/Chief-Ayush) |
| :--------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------: |
|                 [**Parth Narkar**](https://github.com/parthnarkar)                 |                  [**Tanish Sanghvi**](https://github.com/tanish-jain-225)                  |                [**Pankaj Gupta**](https://github.com/pankaj0695)                 |                [**Ayush Attarde**](https://github.com/Chief-Ayush)                 |

## Contributing

1. Create a feature branch: `feat/<short-feature-name>`
2. Commit small, descriptive changes.
3. Open PR; include a short summary & screenshots (if UI).
4. Avoid committing real secrets (.env is ignored).

## Security & Secrets

Never commit actual API keys. Use `.env` locally and (later) a secret manager in deployment (e.g., GCP Secret Manager or GitHub Actions secrets). Rotate keys periodically.
