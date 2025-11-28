# Edvanta Client

A modern React-based Progressive Web App (PWA) for AI-powered educational tools. Built with cutting-edge technologies for optimal performance, accessibility, and offline functionality.

## 🌟 Key Features

### **Progressive Web App (PWA)**
- 📱 **Mobile-First Design** - Responsive interface optimized for all devices
- 🔄 **Offline Functionality** - Real data caching for offline learning
- 📲 **Installable** - Add to home screen like a native app
- ⚡ **Fast Loading** - Service worker caching and lazy loading
- 🔔 **Push Notifications** - Stay updated with learning progress

### **AI-Powered Learning Tools**
- 🎥 **Visual Content Generator** - Convert text/PDF/audio to educational slideshows
- 🤖 **Doubt Solving Chatbot** - AI-powered Q&A with conversation history
- 📝 **Quiz Generator** - AI-generated personalized quizzes with scoring
- 👨‍🏫 **Conversational Tutor** - Voice & text-based AI tutoring
- 🗺️ **Learning Roadmaps** - Personalized learning paths with milestones
- 📄 **Resume Builder** - Resume analysis and job-fit optimization

### **Modern User Experience**
- 🔐 **Firebase Authentication** - Secure user accounts with profile management
- 📊 **Real-time Analytics** - Progress tracking and performance insights
- 🎨 **Beautiful UI** - TailwindCSS with Radix UI components
- 🌙 **Screen Fatigue Prevention** - Built-in break reminders
- 📱 **Responsive Design** - Seamless experience across all devices

## 🚀 Quick Start

### Prerequisites
- Node.js 18.0+ (includes npm)
- A Vercel account (for deployment)
- Firebase project (for authentication)
- Cloudinary account (for media storage)

### Local Development

1. **Clone and Setup**
   ```bash
   cd client
   npm install
   cp .env.example .env
   ```

2. **Configure Environment**
   Edit `.env` file with your credentials:
   ```env
   # Backend API
   VITE_API_BASE_URL=http://localhost:5000
   VITE_PRODUCTION_API_URL=https://your-backend-url.vercel.app
   
   # Firebase Authentication
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
   VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
   
   # Cloudinary Media Storage
   VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
   VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```
   App opens at `http://localhost:5173`

4. **Start Backend** (in separate terminal)
   ```bash
   cd ../server
   python index.py
   ```

### Production Deployment

#### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

After deployment:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add all variables from `.env.example`
3. Update `VITE_PRODUCTION_API_URL` with your backend URL
4. Redeploy to apply changes

## 📁 Project Structure

```
client/
├── index.html              # Entry point
├── package.json            # Dependencies & scripts
├── vite.config.ts          # Vite configuration
├── tailwind.config.js      # TailwindCSS setup
├── vercel.json             # Vercel deployment config
├── .env.example            # Environment variables template
├── public/
│   ├── manifest.json       # PWA manifest
│   └── sw.js              # Service worker
├── src/
│   ├── App.jsx            # Root component with routing
│   ├── main.jsx           # React entry point
│   ├── components/
│   │   ├── Layout/        # Navigation & layout components
│   │   │   ├── Navbar.jsx
│   │   │   └── Sidebar.jsx
│   │   └── ui/            # Reusable UI components
│   │       ├── badge.jsx
│   │       ├── button.jsx
│   │       ├── card.jsx
│   │       ├── input.jsx
│   │       ├── progress.jsx
│   │       ├── tabs.jsx
│   │       ├── PWAInstallPrompt.jsx
│   │       ├── OfflineIndicator.jsx
│   │       ├── PageTransition.jsx
│   │       └── ScreenFatigueReminder.jsx
│   ├── hooks/             # Custom React hooks
│   │   ├── useAuth.js     # Firebase authentication
│   │   ├── useOfflineStorage.js  # PWA offline data
│   │   ├── useOfflineSync.js     # Data synchronization
│   │   ├── usePWA.js      # PWA functionality
│   │   └── useResponsive.js      # Responsive utilities
│   ├── lib/               # Core utilities
│   │   ├── api.js         # API client & endpoints
│   │   ├── firebase.js    # Firebase configuration
│   │   └── utils.js       # Helper functions
│   ├── pages/             # Route components
│   │   ├── Home.jsx       # Landing page
│   │   ├── Dashboard.jsx  # User dashboard
│   │   ├── OfflineDashboard.jsx  # PWA offline mode
│   │   ├── auth/          # Authentication pages
│   │   │   ├── Login.jsx
│   │   │   └── Signup.jsx
│   │   └── tools/         # Learning tools
│   │       ├── VisualGenerator.jsx
│   │       ├── DoubtSolving.jsx
│   │       ├── Quizzes.jsx
│   │       ├── ConversationalTutor.jsx
│   │       ├── Roadmap.jsx
│   │       └── ResumeBuilder.jsx
│   └── utils/             # Test utilities
│       ├── test-pwa.js
│       ├── test-sync.js
│       └── test-visual.js
```

## 🛠️ Technology Stack

### **Core Framework**
- **React 18.3.1** - Modern React with hooks and Suspense
- **Vite 6.3.5** - Lightning-fast build tool and dev server
- **React Router 7.8.0** - Client-side routing with nested routes

### **Styling & UI**
- **TailwindCSS 4.1.12** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Lucide React** - Beautiful icon library
- **Class Variance Authority** - Utility for component variants

### **State & Data**
- **Firebase 12.1.0** - Authentication and real-time database
- **Axios 1.11.0** - HTTP client for API communication
- **Custom Hooks** - Offline storage, PWA features, authentication

### **PWA & Performance**
- **Service Worker** - Background sync and caching
- **Web App Manifest** - App metadata and install prompts
- **Offline Storage** - Real data caching with localStorage
- **Lazy Loading** - Code splitting and route-based loading

### **Development Tools**
- **ESLint 9.9.1** - Code linting with React rules
- **TypeScript Config** - Type checking for Vite config
- **PostCSS** - CSS processing with Autoprefixer
- **Vercel** - Deployment and hosting platform

## 🔧 Available Scripts

```bash
npm run dev      # Start development server (localhost:5173)
npm run build    # Build for production
npm run preview  # Preview production build locally
npm run lint     # Run ESLint code checking
```

## 🌐 API Integration

The client communicates with the Edvanta backend through a centralized API client (`lib/api.js`):

### **Endpoints**
- **Visual Generation**: `/api/visual/text-to-video`, `/api/visual/pdf-url-to-video`
- **Chatbot**: `/api/chat`, `/api/chat/history/{user_email}`
- **Quizzes**: `/api/quizzes/generate`, `/api/quizzes/score`
- **Tutoring**: `/api/tutor/ask`, `/api/tutor/voice`
- **Roadmaps**: `/api/roadmap/generate`, `/api/roadmap/user/{user_email}`
- **Resume Tools**: `/api/resume/upload`, `/api/resume/analyze`
- **Analytics**: `/api/user-stats`

### **Environment Detection**
The app automatically detects environment and switches API URLs:
- **Development**: `VITE_API_BASE_URL` (localhost:5000)
- **Production**: `VITE_PRODUCTION_API_URL` (deployed backend)

## 📱 Progressive Web App Features

### **Offline Functionality**
- **Real Data Only**: No dummy data - only cached real content available offline
- **Smart Caching**: Automatically caches API responses when online
- **Offline Indicators**: Visual feedback for offline status
- **Offline Dashboard**: Dedicated offline experience with cached data
- **Background Sync**: Data synchronizes when connection restored

### **Installation**
- **Add to Home Screen**: Install prompt for mobile devices
- **App-like Experience**: Standalone display mode
- **Shortcuts**: Quick access to key features
- **Icons & Branding**: Custom app icons and splash screens

### **Performance**
- **Service Worker**: Caches assets and API responses
- **Lazy Loading**: Routes and components loaded on demand
- **Image Optimization**: Responsive images with proper sizing
- **Bundle Splitting**: Optimized JavaScript chunks

## 🎨 UI/UX Features

### **Design System**
- **Component Library**: Consistent, reusable UI components
- **Responsive Design**: Mobile-first with breakpoint optimization
- **Accessibility**: WCAG compliant with keyboard navigation
- **Color Palette**: Brand-consistent theming throughout

### **User Experience**
- **Page Transitions**: Smooth animations between routes
- **Loading States**: Skeleton screens and progress indicators
- **Error Handling**: Graceful error boundaries and user feedback
- **Screen Fatigue**: Built-in break reminders for healthy usage

### **Interactive Features**
- **Real-time Updates**: Live data synchronization
- **Drag & Drop**: File uploads for PDFs and media
- **Voice Recording**: Built-in audio recording for tutor sessions
- **Progress Tracking**: Visual progress indicators throughout app

## ⚙️ Configuration

### **Environment Variables**
All configuration is handled through environment variables for security:

#### **Required**
```env
VITE_FIREBASE_API_KEY=          # Firebase authentication
VITE_FIREBASE_AUTH_DOMAIN=      # Firebase project domain
VITE_FIREBASE_PROJECT_ID=       # Firebase project identifier
VITE_FIREBASE_STORAGE_BUCKET=   # Firebase storage bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=  # Firebase messaging
VITE_FIREBASE_APP_ID=           # Firebase app identifier

VITE_API_BASE_URL=              # Development backend URL
VITE_PRODUCTION_API_URL=        # Production backend URL

VITE_CLOUDINARY_CLOUD_NAME=     # Cloudinary media storage
VITE_CLOUDINARY_UPLOAD_PRESET=  # Cloudinary upload configuration
```

#### **Optional**
```env
VITE_ENVIRONMENT=development    # Force development mode
```

### **Firebase Setup**
1. Create project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password provider)
3. Create Firestore database
4. Copy configuration from Project Settings

### **Cloudinary Setup**
1. Create account at [Cloudinary](https://cloudinary.com/)
2. Get Cloud Name from dashboard
3. Create unsigned upload preset
4. Configure upload settings

## 🔍 Debugging & Development

### **Development Tools**
- **React DevTools** - Component inspection and profiling
- **Redux DevTools** - State management debugging
- **Network Tab** - API request monitoring
- **Application Tab** - Service worker and storage inspection

### **Debug Components**
- **LocalStorageInspector** - View cached offline data
- **SyncDebugger** - Monitor data synchronization
- **VisualGenerationDiagnostics** - Debug visual content generation

### **Error Boundaries**
- **Route-level Error Handling** - Graceful error recovery
- **Component Error Boundaries** - Isolated error containment
- **Network Error Handling** - Offline-aware error messages

## 🚀 Performance Optimization

### **Build Optimizations**
- **Tree Shaking** - Unused code elimination
- **Code Splitting** - Route-based bundle splitting
- **Asset Optimization** - Image compression and lazy loading
- **CSS Purging** - Unused CSS removal

### **Runtime Performance**
- **Memoization** - React.memo and useMemo for expensive operations
- **Virtual Scrolling** - Efficient large list rendering
- **Debounced Inputs** - Optimized search and form interactions
- **Prefetching** - Strategic resource preloading

### **Caching Strategy**
- **Static Assets** - Long-term caching with versioning
- **API Responses** - Smart caching with invalidation
- **User Data** - Persistent storage for offline access
- **Media Files** - CDN optimization with Cloudinary

## 📊 Analytics & Monitoring

### **User Analytics**
- **Learning Progress** - Quiz scores, completion rates
- **Tool Usage** - Feature adoption and usage patterns
- **Session Tracking** - Time spent, interaction patterns
- **Error Tracking** - Client-side error reporting

### **Performance Metrics**
- **Core Web Vitals** - LCP, FID, CLS measurements
- **Bundle Analysis** - JavaScript chunk sizes and dependencies
- **Network Performance** - API response times and failures
- **PWA Metrics** - Install rates, offline usage

## 🔐 Security

### **Authentication Security**
- **Firebase Auth** - Industry-standard authentication
- **Token Management** - Secure JWT token handling
- **Route Protection** - Private route guards
- **Session Management** - Automatic logout and refresh

### **Data Security**
- **Environment Variables** - Sensitive data protection
- **HTTPS Enforcement** - Secure data transmission
- **Input Validation** - Client-side form validation
- **CORS Configuration** - Secure API communication

## 🤝 Contributing

1. **Fork** the repository
2. **Create** feature branch (`git checkout -b feature/amazing-feature`)
3. **Follow** code style guidelines (ESLint + Prettier)
4. **Test** your changes thoroughly
5. **Commit** changes (`git commit -m 'Add amazing feature'`)
6. **Push** to branch (`git push origin feature/amazing-feature`)
7. **Open** Pull Request

### **Development Guidelines**
- Use TypeScript for new utilities and configurations
- Follow React best practices (hooks, functional components)
- Write responsive CSS with TailwindCSS
- Test PWA features in offline mode
- Ensure accessibility compliance

## 🆘 Troubleshooting

### **Common Issues**

**"Firebase configuration invalid"**
- Verify all `VITE_FIREBASE_*` variables are set correctly
- Check Firebase project settings match environment variables
- Ensure Firebase project has Authentication and Firestore enabled

**"API connection failed"**
- Verify backend server is running (development)
- Check `VITE_API_BASE_URL` or `VITE_PRODUCTION_API_URL` is correct
- Ensure CORS is configured properly on backend

**"Cloudinary upload failed"**
- Verify `VITE_CLOUDINARY_*` variables are set
- Check upload preset exists and is unsigned
- Ensure Cloudinary account limits not exceeded

**"PWA not installing"**
- Verify `manifest.json` is correctly configured
- Check service worker registration
- Ensure HTTPS is enabled (production requirement)

### **Debug Mode**
Enable debug features by adding components:
```jsx
import { LocalStorageInspector } from './components/ui/LocalStorageInspector'
import { SyncDebugger } from './components/ui/SyncDebugger'

// Add to any page for debugging
<LocalStorageInspector />
<SyncDebugger />
```
