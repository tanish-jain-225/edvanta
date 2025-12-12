# Edvanta Client

A modern React-based educational platform built with cutting-edge technologies for optimal performance and accessibility. Features AI-powered learning tools with a beautiful, responsive interface.

<!-- Badges: update badge URLs to point to your CI / coverage / deploy if available -->
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=white)](https://reactjs.org) [![Vite](https://img.shields.io/badge/Vite-6.3.5-646cff?logo=vite&logoColor=white)](https://vitejs.dev) [![License](https://img.shields.io/badge/License-MIT-green.svg)](../LICENSE)


## 🌟 Key Features

### **Modern React Application**
- 📱 **Responsive Design** - Mobile-first interface optimized for all devices
- ⚡ **Fast Loading** - Vite build system with optimized bundling
- 🎨 **Beautiful UI** - Modern design with smooth animations
- 🔥 **Hot Reload** - Instant development feedback with Vite HMR
- 📦 **Component-Based** - Modular, reusable UI components
- 🌐 **Progressive Web App** - Installable with offline support and caching

### **AI-Powered Learning Tools**
- 🤖 **Doubt Solving Chatbot** - AI-powered Q&A with conversation history
- 📝 **Quiz Generator** - AI-generated personalized quizzes with scoring
- 👨‍🏫 **Conversational Tutor** - Interactive AI tutoring system
- 🗺️ **Learning Roadmaps** - Personalized learning paths with milestones
- 📄 **Resume Builder** - Resume analysis and job-fit optimization
- 🎬 **Visual Content Explorer** - YouTube API integration for educational videos

### **Enhanced User Experience**
- 🔐 **Firebase Authentication** - Secure user accounts with profile management
- 📊 **Real-time Analytics** - Progress tracking and performance insights
- 🎨 **TailwindCSS Design** - Beautiful UI with Radix UI components
- 🌙 **Screen Fatigue Prevention** - Built-in break reminders with timer reset
- 📱 **Fully Responsive** - Seamless experience across all devices
- 🔌 **Offline-First Architecture** - Works without internet for cached content
- 🌐 **PWA Support** - Service worker caching with offline capabilities

## 🚀 Quick Start

### Prerequisites
- Node.js 18.0+ (includes npm)
- A Vercel account (for deployment)
- Firebase project (for authentication)
- Cloudinary account (for media storage)
- Modern browser with service worker support

### Local Development

1. **Clone and Setup**
   ```bash
   cd client
   npm install
   cp .env.example .env
   ```

2. **Configure Environment**
   Edit `.env` file with your credentials. See `.env.example` for detailed setup instructions and required values for:
   - Backend API URLs
   - Firebase Authentication (6 variables)
   - Cloudinary Media Storage (2 variables)
   - YouTube API Key

3. **Start Development Server**
   ```bash
   npm run dev
   ```
   App opens at `http://localhost:5173`

4. **Start Backend** (in separate terminal)
   ```bash
   cd ../server
   python app.py
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
├── index.html              # Entry point with React root
├── package.json            # Dependencies & scripts
├── vite.config.ts          # Vite configuration with React plugin
├── tailwind.config.js      # TailwindCSS v4.1.12 setup
├── postcss.config.js       # PostCSS with Autoprefixer
├── eslint.config.js        # ESLint v9 configuration
├── vercel.json             # Vercel deployment configuration
├── .env.example            # Environment variables template
├── .env                    # Local environment variables (git-ignored)
├── .gitignore              # Git ignore patterns
├── README.md               # This documentation
├── public/
│   ├── manifest.json       # Web app manifest
│   ├── edvanta-logo.png    # Brand logo asset
│   └── default-avatar.svg  # Default user avatar
└── src/
    ├── App.jsx            # Root component with React Router setup
    ├── main.jsx           # React 18 entry point with StrictMode
    ├── App.css            # Global application styles
    ├── index.css          # TailwindCSS imports and base styles
    ├── assets/            # Static assets and images
    ├── components/
    │   ├── Layout/        # Navigation & layout components
    │   │   ├── Navbar.jsx # Main navigation header
    │   │   └── Sidebar.jsx # Mobile sidebar navigation
    │   └── ui/            # Reusable UI component library
    │       ├── badge.jsx  # Status and category badges
    │       ├── button.jsx # Button variants with CVA
    │       ├── card.jsx   # Content cards with header/footer
    │       ├── input.jsx  # Form input components
    │       ├── progress.jsx # Progress bars and indicators
    │       ├── tabs.jsx   # Tab navigation components
    │       ├── HeroSpline.jsx # 3D hero section with animations
    │       ├── PageTransition.jsx # Smooth page transitions
    │       ├── ScreenFatigueReminder.jsx # Break reminder system
    │       ├── ScrollToTop.jsx # Auto-scroll component
    │       ├── UserInterestForm.jsx # User preference form
    │       └── custom-css/ # Custom CSS modules
    │           ├── LoadingIndicator.css
    │           └── PageTransition.css
    ├── hooks/             # Custom React hooks
    │   ├── helper.js      # API base URL helper
    │   ├── useAuth.js     # Firebase authentication hook
    │   └── useResponsive.js # Responsive design utilities
    ├── lib/               # Core utilities and configuration
    │   ├── api.js         # Axios API client & endpoints
    │   ├── firebase.js    # Firebase v12 configuration
    │   └── utils.js       # Utility functions and helpers
    └── pages/             # Route-based page components
        ├── Home.jsx       # Landing page with hero section
        ├── Dashboard.jsx  # User dashboard and analytics
        ├── auth/          # Authentication pages
        │   ├── Login.jsx  # User login with Firebase
        │   └── Signup.jsx # User registration
        └── tools/         # AI-powered learning tools
            ├── DoubtSolving.jsx    # AI chatbot for Q&A
            ├── Quizzes.jsx         # Quiz generation & scoring
            ├── ConversationalTutor.jsx # AI tutoring system
            ├── Roadmap.jsx         # Learning path generator
            ├── ResumeBuilder.jsx   # Resume analysis tool
            └── VisualContent.jsx   # YouTube API video explorer
```

## Component architecture

High-level component architecture (replace with diagram in `client/docs/` if you maintain visuals):

```mermaid
graph TD
   App --> Layout
   Layout --> Navbar
   Layout --> Sidebar
   App --> Pages
   Pages --> Home
   Pages --> Dashboard
   Pages --> Tools
   Tools --> DoubtSolving
   Tools --> Quizzes
   Tools --> ResumeBuilder
   Tools --> Roadmap
   Components --> UI[UI primitives (badge, button, card, input)]
```

This app follows a route-based page structure and a small design-system approach (components in `src/components/ui/`).

## Environment variables (detailed)

Copy values from `.env.example` into `.env` for local development. Key variables used by the client:

```env
# API endpoints
VITE_API_BASE_URL="http://localhost:5000"
VITE_PRODUCTION_API_URL="https://api.yourdomain.com"

# Firebase (example keys; use your project values)
VITE_FIREBASE_API_KEY="AIza..."
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"
VITE_FIREBASE_APP_ID="1:123:web:abcdef"

# Cloudinary
VITE_CLOUDINARY_CLOUD_NAME="your-cloud"
VITE_CLOUDINARY_UPLOAD_PRESET="unsigned-preset"

# YouTube
VITE_YOUTUBE_API_KEY="AIza..."
```

Never commit secrets to git. Use environment configuration in Vercel/Netlify for production.

## Available scripts & their purpose

The `package.json` scripts are small but important — here's what each does and when to use them:

- `npm run dev` — Starts Vite dev server with HMR for local development (use this most of the time).
- `npm run build` — Produces production-ready static assets in `dist/` (run before deploy).
- `npm run preview` — Serves the production build locally for smoke testing.
- `npm run lint` — Runs ESLint across the project; fix issues before committing.

Add `format` or `test` scripts if you introduce Prettier or test runners.

## Routing (how routes are organized)

Routing is defined in `src/App.jsx` using React Router v7. Typical structure:

- Top-level routes: `/` (Home), `/dashboard`, `/tools/*` (nested tool routes)
- Auth routes: `/login`, `/signup`
- Tools are nested under `/tools` with subroutes for each tool (e.g., `/tools/quizzes`, `/tools/doubt`)

Protected routes use a `RequireAuth` wrapper (see `src/hooks/useAuth.js`) which checks Firebase auth state and redirects to `/login` if unauthenticated.

## State management

The app uses a lightweight approach:

- Firebase handles authentication and user identity.
- Local component state and custom hooks (`src/hooks/*.js`) manage UI state.
- Global cross-cutting state (if needed) is handled via React Contexts or simple module-level singletons; heavy state libraries (Redux) are intentionally avoided to keep complexity low.
- `src/lib/api.js` centralizes HTTP calls and handles token injection.

If you add larger features, consider introducing Zustand or Redux Toolkit with slices and typed selectors.

## PWA notes (install & caching)

- The app ships with a service worker (`public/sw.js`) for caching static assets and basic offline support. 
- To test installability: open in Chrome → App menu → Install (or check the install prompt in the address bar).
- Update the `manifest.json` in `public/` to customize name, icons, and theme color for better install UX.

## Build & deployment guide

Vercel (recommended):

1. Push to GitHub and import the repo in Vercel.
2. Set environment variables in Vercel dashboard (use the same keys from `.env.example`).
3. Vercel will detect the Vite app and run `npm run build` automatically.

Docker (optional):

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Use the Docker image in any container platform or serve via CDN for best performance.

## Browser compatibility

Supported browsers (targeted):
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

We use modern JS features; Vite + browserslist handle transpilation. Add specific polyfills if you must support older browsers.

## Performance optimization tips

- Use `React.lazy` and route-based code-splitting for large tools.
- Compress images and prefer WebP/AVIF for production assets.
- Use `vite build --profile` and analyze bundles with `rollup-plugin-visualizer`.
- Avoid heavy computations on the main thread; move to web workers if necessary.
- Keep component renders minimal with `useMemo`/`useCallback` where appropriate.

## Testing

Recommended test stack for frontend:
- Unit & component tests: `vitest` + `@testing-library/react`
- End-to-end tests: `cypress` or `playwright`

Quick start for tests:

```bash
npm install -D vitest @testing-library/react cypress
npm run test:unit   # add this script if you scaffold tests
```

Add CI integration (GitHub Actions) to run tests on PRs.

## Coding style & linting

- ESLint is included (`eslint.config.js`). Run `npm run lint` before committing.
- Use Prettier for consistent formatting (add `prettier` and a `format` script if desired).
- Add Husky + lint-staged to run linters and tests on pre-commit for higher code quality.


## 🛠️ Technology Stack

### **Core Framework**
- **React 18.3.1** - Modern React with hooks, Suspense, and concurrent features
- **Vite 6.3.5** - Next-generation frontend build tool with HMR
- **React Router DOM 7.8.0** - Declarative routing with nested route support

### **Styling & UI**
- **TailwindCSS 4.1.12** - Utility-first CSS framework with JIT compiler
- **Radix UI Components** - Accessible, unstyled component primitives
  - `@radix-ui/react-progress` - Progress indicators
  - `@radix-ui/react-slot` - Component composition utilities
  - `@radix-ui/react-tabs` - Tab navigation components
- **Lucide React 0.539.0** - Beautiful, customizable icon library
- **Class Variance Authority 0.7.1** - Component variant utilities
- **Clsx 2.1.1 + Tailwind Merge 3.3.1** - Conditional class name utilities

### **State & Data Management**
- **Firebase 12.1.0** - Authentication, Firestore database, and storage
- **Axios 1.11.0** - Promise-based HTTP client for API communication
- **Custom React Hooks** - Authentication, responsive design utilities

### **Development & Build Tools**
- **ESLint 9.9.1** - Code linting with modern React rules
- **PostCSS 8.5.6** - CSS processing with Autoprefixer
- **TailwindCSS Plugins**:
  - `@tailwindcss/forms` - Form styling utilities
  - `@tailwindcss/typography` - Rich text formatting
  - `@tailwindcss/vite` - Vite integration plugin
- **TypeScript Support** - Type checking for configuration files
- **Vercel Integration** - Optimized deployment configuration

## 🔧 Available Scripts

```bash
npm run dev      # Start development server (localhost:5173)
npm run build    # Build for production
npm run preview  # Preview production build locally
npm run lint     # Run ESLint code checking
```

## 🌐 Progressive Web App (PWA) Features

### **Basic Offline Support**
The application includes simple offline functionality:

- **Service Worker Caching** - Automatic caching of visited pages and assets
- **Floating Offline Indicator** - Shows connection status at bottom-right corner
- **All Pages Accessible** - Navigate to any page while offline
- **Cache-First Strategy** - Fast loading from cache with network updates

### **How Offline Works**
- Service worker caches pages as you visit them
- All routes remain accessible when offline
- Floating indicator shows "Offline Mode" or "Online Mode"
- Network requests fail gracefully with user-friendly messages

### **Testing Offline Mode**
```bash
# Open DevTools (F12) → Network tab → Check "Offline"
# Navigate between pages - everything still works!
```

## 🔧 API Integration

The client communicates with the Edvanta backend through a centralized API client (`lib/api.js`):

### **Endpoints**
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

## 🎨 UI/UX Features

### **Design System**
- **Component Library**: Consistent, reusable UI components with Radix primitives
- **Responsive Design**: Mobile-first approach with TailwindCSS breakpoints
- **Accessibility**: WCAG compliant with proper ARIA labels and keyboard navigation
- **Modern Animations**: Smooth transitions with CSS transforms and Framer Motion patterns

### **User Experience Enhancements**
- **Page Transitions**: Smooth animations between routes with loading states
- **Loading States**: Skeleton screens and progress indicators throughout the app
- **Error Handling**: Graceful error boundaries with user-friendly messages
- **Screen Fatigue Prevention**: Smart break reminders with timer reset functionality
- **Responsive Navigation**: Adaptive navbar with mobile-optimized sidebar

### **Interactive Features**
- **Real-time Feedback**: Live validation and instant UI updates
- **File Upload Support**: Drag & drop functionality for PDF and media files
- **Form Optimization**: Debounced inputs and auto-save functionality
- **Visual Progress**: Step-by-step indicators for multi-stage processes

## ⚙️ Configuration

### **Environment Variables**
All environment variables are documented in `.env.example` with detailed setup instructions.

#### **Required Variables**
- **Firebase Authentication** (6 variables) - User authentication and data storage
- **Backend API URLs** (2 variables) - Development and production API endpoints
- **Cloudinary** (2 variables) - Media upload and storage
- **YouTube API** (1 variable) - Visual Content Explorer

See `.env.example` for complete setup guides including:
- Step-by-step Firebase configuration
- Cloudinary account setup
- YouTube API key generation
- Local development vs production modes

## 🔍 Debugging & Development

### **Development Tools**
- **React DevTools** - Component inspection, profiling, and state management
- **Vite DevTools** - Build analysis and dependency inspection
- **Network Tab** - API request monitoring and performance analysis
- **Console Debugging** - Enhanced error logging and development warnings

### **Debug Utilities**
- **Error Boundaries** - Component-level error isolation and recovery
- **Network Error Handling** - Graceful API failure management
- **Form Validation** - Real-time input validation with user feedback
- **Route Guards** - Authentication state debugging for protected routes

## 🚀 Performance Optimization

### **Build Optimizations**
- **Vite Bundling** - Optimized production builds with tree shaking
- **Code Splitting** - Route-based lazy loading for faster initial loads
- **Asset Optimization** - Image compression and format optimization
- **CSS Optimization** - PurgeCSS integration with TailwindCSS

### **Runtime Performance**
- **React Optimization** - Memoization with React.memo and useMemo
- **Efficient Re-renders** - Optimized state management and prop drilling prevention
- **Debounced Interactions** - Smart input handling for search and forms
- **Conditional Loading** - Feature-based component loading

### **Caching Strategy**
- **Browser Caching** - Static asset caching with proper cache headers
- **API Response Caching** - Smart client-side data caching
- **Component State** - Persistent state management across route changes
- **CDN Integration** - Optimized asset delivery through Vercel Edge Network

## 📊 User Analytics & Monitoring

### **Learning Analytics**
- **Quiz Performance** - Score tracking, completion rates, and progress over time
- **Tool Usage Patterns** - Feature adoption and user engagement metrics
- **Learning Progress** - Roadmap completion and milestone achievements
- **Session Tracking** - Time spent per tool and interaction patterns

### **Technical Performance**
- **Core Web Vitals** - LCP, FID, and CLS measurements for user experience
- **Bundle Analysis** - JavaScript chunk sizes and dependency optimization
- **API Performance** - Response times, error rates, and endpoint usage
- **User Flow Analytics** - Navigation patterns and conversion funnel analysis

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
- Test across different screen sizes and devices
- Ensure accessibility compliance (WCAG 2.1)

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
- Check if you're offline - app shows offline indicator

**"Service worker not registering"**
- Ensure browser supports service workers (Chrome, Firefox, Safari, Edge)
- Check console for service worker errors
- Verify `sw.js` is accessible at `/sw.js`
- Service workers only work over HTTPS (or localhost)

**"Cloudinary upload failed"**
- Verify `VITE_CLOUDINARY_*` variables are set
- Check upload preset exists and is unsigned
- Ensure Cloudinary account limits not exceeded

**"Vite build failed"**
- Check for TypeScript errors in `vite.config.ts`
- Verify all imports use correct file extensions
- Ensure TailwindCSS configuration is valid
- Clear node_modules and reinstall dependencies

**"React Router navigation broken"**
- Verify React Router DOM v7 configuration
- Check for conflicting route definitions
- Ensure proper component imports in route definitions
- Validate nested route structure

**"TailwindCSS styles not applying"**
- Verify `tailwind.config.js` includes all source paths
- Check PostCSS configuration in `postcss.config.js`
- Ensure `@tailwind` directives are in `index.css`
- Clear browser cache and restart development server

### **Debug Mode**
Enable enhanced debugging during development:
```bash
# Development server with detailed logging
npm run dev

# Build analysis
npm run build -- --mode development

# Preview production build locally
npm run preview
```
