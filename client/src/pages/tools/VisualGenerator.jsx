import React, { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import {
  Upload,
  FileText,
  Wand2,
  Image,
  Download,
  ArrowRight,
  CheckCircle,
  Clock,
  Sparkles,
  History,
  Play,
  Trash2,
} from "lucide-react";
import backEndURL from "../../hooks/helper";
import { useAuth } from "../../hooks/useAuth";
import { db } from "../../lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
} from "firebase/firestore";

const steps = [
  { id: "input", title: "Input", icon: FileText },
  { id: "summarize", title: "Summarize", icon: Wand2 },
  { id: "storyboard", title: "Storyboard", icon: Image },
  { id: "generate", title: "Generate", icon: Sparkles },
  { id: "download", title: "Download", icon: Download },
];

export default function VisualGenerator() {
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);

  const { user } = useAuth();

  // Core inputs - text only
  const [content, setContent] = useState("");
  const [videoData, setVideoData] = useState(null);

  // UI / progress state
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [historyVideos, setHistoryVideos] = useState([]);

  // Remove audio recording functionality - text input only

  // Derived step index from progress (simple thresholds)
  const currentStep = (() => {
    if (progress >= 100) return 4; // download
    if (progress >= 70) return 3; // generate
    if (progress >= 40) return 2; // storyboard
    if (progress >= 10) return 1; // summarize
    return 0; // input
  })();

  async function postJSON(path, body) {
    setError("");
    try {
      const res = await fetch(backEndURL + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || `HTTP ${res.status}: ${res.statusText}`;
        } catch {
          errorMessage = errorText || `HTTP ${res.status}: ${res.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      const data = await res.json();
      return data;
    } catch (e) {
      const userFriendlyMessage = e.message.includes('Failed to fetch') 
        ? 'Network error. Please check your connection and try again.'
        : e.message;
      setError(userFriendlyMessage);
      throw e;
    }
  }

  const saveVideoRecord = async (meta) => {
    if (!user || (!meta.videoUrl && !meta.videoData)) return;
    try {
      setSaving(true);
      await addDoc(collection(db, "visual_videos"), {
        ...meta,
        userId: user.uid,
        email: user.email,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setHistoryVideos([]);
      return;
    }
    let unsub = null;

    const fallbackLoadWithoutIndex = async () => {
      try {
        // Plain query without orderBy (no composite index required)
        const qPlain = query(
          collection(db, "visual_videos"),
          where("userId", "==", user.uid)
        );
        const snap = await getDocs(qPlain);
        const list = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        // Client-side sort by createdAt (desc)
        list.sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
        );
        setHistoryVideos(list);
      } catch (e) {
        console.error("History fallback failed", e);
      }
    };

    try {
      const qFull = query(
        collection(db, "visual_videos"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      unsub = onSnapshot(
        qFull,
        (snap) => {
          const list = [];
          snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
          setHistoryVideos(list);
        },
        (err) => {
          if (err?.code === "failed-precondition") {
            fallbackLoadWithoutIndex();
          } else {
            console.error("History listener error", err);
          }
        }
      );
    } catch (err) {
      if (err?.code === "failed-precondition") {
        fallbackLoadWithoutIndex();
      } else {
        console.error("History init error", err);
      }
    }
    return () => {
      if (unsub) unsub();
    };
  }, [user]);

  // Audio recording functionality removed - text input only
  const formatTime = (t) =>
    `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(
      2,
      "0"
    )}`;
  // Audio recording functionality removed

  async function uploadToCloudinary(file) {
    if (!isCloudinaryConfigured) {
      throw new Error('Cloudinary is not configured. Please check environment variables.');
    }
    
    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(`File size (${Math.round(file.size / (1024 * 1024))}MB) exceeds the maximum limit of 100MB.`);
    }
    
    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", UPLOAD_PRESET);
    
    const resourceType = file.type.startsWith("video")
      ? "video"
      : file.type === "application/pdf"
        ? "raw"
        : "image";
          
    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;
    
    try {
      const res = await fetch(endpoint, { method: "POST", body: form });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error?.message || data.message || `Upload failed: ${res.status}`);
      }
      
      if (!data.secure_url) {
        throw new Error('Upload completed but no URL received from Cloudinary.');
      }
      
      return data.secure_url;
    } catch (error) {
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Network error during upload. Please check your connection and try again.');
      }
      throw error;
    }
  }

  const handleTextSubmit = async () => {
    if (!content.trim()) {
      setError('Please enter some text to generate a video.');
      return;
    }
    
    if (!user?.email) {
      setError('Please sign in to use video generation.');
      return;
    }
    
    setLoading(true);
    setProgress(10);
    setError('');
    
    try {
      setProgress(30);
      const res = await postJSON("/api/visual/text-to-video", {
        text: content,
        user_email: user.email,
      });
      
      setProgress(70);
      
      if (!res.success || !res.result) {
        throw new Error('Invalid response from server.');
      }
      
      // Parse the result JSON
      const resultData = typeof res.result === 'string' ? JSON.parse(res.result) : res.result;
      
      if (resultData.type === 'slideshow' && resultData.scenes) {
        setProgress(100);
        setVideoData(resultData); // Store slideshow data instead of video URL
        setLoading(false);
        
        // Save to history
        try {
          await saveVideoRecord({
            sourceType: 'text',
            inputSample: content.slice(0, 40),
            videoData: resultData,
            isSlideshow: true
          });
        } catch (saveError) {
          console.warn('Failed to save to history:', saveError);
        }
      } else {
        throw new Error('Unexpected response format from server.');
      }
    } catch (e) {
      setProgress(0);
      setLoading(false);
      // Error is already set in postJSON
    }
  };
  const handlePdfSubmit = async () => {
    if (!pdfFile) {
      setError('Please select a PDF file.');
      return;
    }
    
    if (!user?.email) {
      setError('Please sign in to use video generation.');
      return;
    }
    
    // Validate PDF file
    if (pdfFile.type !== 'application/pdf') {
      setError('Please select a valid PDF file.');
      return;
    }
    
    setLoading(true);
    setProgress(5);
    setError('');
    
    try {
      setProgress(15); // Show upload progress
      const pdfUrl = await uploadToCloudinary(pdfFile);
      
      setProgress(30); // Upload complete, starting processing
      const res = await postJSON("/api/visual/pdf-url-to-video", {
        pdf_url: pdfUrl,
        user_email: user.email,
      });
      
      setProgress(70);
      
      if (!res.success || !res.result) {
        throw new Error('Invalid response from server.');
      }
      
      // Parse the result JSON
      const resultData = typeof res.result === 'string' ? JSON.parse(res.result) : res.result;
      
      if (resultData.type === 'slideshow' && resultData.scenes) {
        setProgress(100);
        setVideoData(resultData);
        setLoading(false);
        
        // Save to history
        try {
          await saveVideoRecord({
            sourceType: 'pdf',
            inputSample: pdfFile.name,
            videoData: resultData,
            isSlideshow: true
          });
        } catch (saveError) {
          console.warn('Failed to save to history:', saveError);
        }
      } else {
        throw new Error('Unexpected response format from server.');
      }
    } catch (e) {
      setProgress(0);
      setLoading(false);
      // Error is already set in uploadToCloudinary or postJSON
    }
  };
  // Audio functionality removed - text input only

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold">Visual Content Generator</h1>
        <p className="text-sm text-gray-600">
          Convert Text / PDF into video.
        </p>
        {!user && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-amber-800">
                <strong>Sign in required:</strong> Please sign in to use video generation features.
              </p>
            </div>
          </div>
        )}
      </div>
      {error && (
        <div className="relative p-4 rounded-lg bg-red-50 text-red-800 border border-red-200 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={() => setError('')}
              className="flex-shrink-0 ml-4 text-red-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-red-50 rounded"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="flex items-center justify-between mb-4 overflow-x-auto">
            {steps.map((step, index) => {
              const active = index === currentStep;
              const complete = index < currentStep;
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  className={`flex items-center ${index < steps.length - 1 ? "flex-1" : ""
                    }`}
                >
                  <div
                    className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full text-xs sm:text-sm font-medium transition-colors duration-300 ${complete
                      ? "bg-blue-600 text-white"
                      : active
                        ? "bg-blue-100 text-blue-700 border border-blue-300"
                        : "bg-gray-200 text-gray-500"
                      }`}
                  >
                    {complete ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : active ? (
                      <Clock className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 sm:mx-4 rounded-full overflow-hidden bg-gray-200`}
                    >
                      <div
                        className={`h-full transition-all duration-500 ${index < currentStep ? "bg-blue-600 w-full" : "w-0"
                          }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <Progress value={progress} className="mb-1" />
          <p className="text-xs text-gray-500">Progress: {progress}%</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Text Input</CardTitle>
          <CardDescription>Enter your content to generate an educational video.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <textarea
              className="w-full h-48 p-3 border rounded resize-none"
              value={content}
              onChange={(e) => {
                const text = e.target.value;
                setContent(text);
                // Remove character limit restrictions
                if (error.includes('Text is too long')) {
                  setError('');
                }
              }}
              placeholder="Explain neural networks and their applications in modern AI..."
              // No maxLength restriction
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-white px-1 rounded">
              {content.length.toLocaleString()} characters
            </div>
          </div>
          <Button
            onClick={handleTextSubmit}
            disabled={loading || !content.trim() || !user}
            className="w-full"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                Generate Video
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {videoData && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Content</CardTitle>
            <CardDescription>
              {videoData.type === 'slideshow' ? 'Educational slideshow generated successfully' : 'Generated content'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {videoData.type === 'slideshow' && videoData.scenes ? (
              <div className="space-y-4">
                <div className="text-sm text-gray-600 mb-4">
                  {videoData.scenes.length} slides generated • Click slides to navigate
                </div>
                
                {/* Slideshow Container */}
                <div className="space-y-3">
                  {videoData.scenes.map((scene, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Slide Image */}
                      <div className="relative aspect-video bg-gray-100 flex items-center justify-center">
                        {scene.image_base64 ? (
                          <img
                            src={`data:image/png;base64,${scene.image_base64}`}
                            alt={`Slide ${index + 1}`}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div 
                            className="w-full h-full flex items-center justify-center text-white p-8"
                            style={{ backgroundColor: scene.color || '#4ECDC4' }}
                          >
                            <div className="text-center">
                              <h3 className="text-lg sm:text-xl font-bold mb-2">
                                Slide {index + 1}
                              </h3>
                              <p className="text-sm sm:text-base">
                                {scene.narration}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {/* Slide Number Badge */}
                        <div className="absolute top-3 left-3 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                          {index + 1} / {videoData.scenes.length}
                        </div>
                      </div>
                      
                      {/* Slide Content */}
                      <div className="p-4 bg-white">
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Narration
                            </label>
                            <p className="text-sm text-gray-800 mt-1">
                              {scene.narration}
                            </p>
                          </div>
                          
                          {scene.visual && (
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Visual Description
                              </label>
                              <p className="text-xs text-gray-600 mt-1">
                                {scene.visual}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-gray-200">
                  <Button 
                    className="flex-1"
                    onClick={() => {
                      // Create a simple JSON export of the slideshow
                      const dataStr = JSON.stringify(videoData, null, 2);
                      const dataBlob = new Blob([dataStr], {type: 'application/json'});
                      const url = URL.createObjectURL(dataBlob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = 'slideshow-data.json';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Reset all state for a fresh run
                      setVideoData(null);
                      setContent("");
                      setPdfFile(null);
                      setProgress(0);
                      setError("");
                    }}
                  >
                    Create New
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">Generated content format not supported for display.</p>
                <pre className="mt-4 text-xs bg-gray-100 p-4 rounded text-left overflow-auto">
                  {JSON.stringify(videoData, null, 2)}
                </pre>
              </div>
            )}
            
            {user ? (
              <p className="text-xs text-gray-500">
                Saved to history {saving && "(saving...)"}
              </p>
            ) : (
              <p className="text-xs text-gray-500">Login to save history</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Video History</h2>
            {user && historyVideos.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {historyVideos.length} video{historyVideos.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          {user && historyVideos.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
              className="text-xs"
            >
              Refresh
            </Button>
          )}
        </div>
        
        {!user && (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <History className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-2">Sign in to view your video history</p>
            <p className="text-xs text-gray-500">Generated videos will be saved to your account</p>
          </div>
        )}
        
        {user && historyVideos.length === 0 && (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-2">No videos generated yet</p>
            <p className="text-xs text-gray-500">Your generated videos will appear here</p>
          </div>
        )}
        
        {user && historyVideos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {historyVideos.map((v) => (
              <div key={v.id} className="border rounded-lg p-3 bg-white space-y-3 hover:shadow-md transition-shadow">
                <div className="aspect-video bg-black/5 rounded overflow-hidden relative group">
                  {v.videoUrl ? (
                    // Traditional video display
                    <>
                      <video
                        src={v.videoUrl}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                      <div className="absolute inset-0 bg-gray-200 hidden items-center justify-center">
                        <p className="text-xs text-gray-500">Video unavailable</p>
                      </div>
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                        <Play className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </>
                  ) : v.videoData?.scenes && v.videoData.scenes.length > 0 ? (
                    // Slideshow display
                    <>
                      {v.videoData.scenes[0].image_base64 ? (
                        <img
                          src={`data:image/png;base64,${v.videoData.scenes[0].image_base64}`}
                          alt="Slideshow preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div 
                          className="w-full h-full flex items-center justify-center text-white"
                          style={{ backgroundColor: v.videoData.scenes[0].color || '#4ECDC4' }}
                        >
                          <div className="text-center p-2">
                            <h4 className="text-sm font-medium">Slideshow</h4>
                            <p className="text-xs mt-1">{v.videoData.scenes.length} slides</p>
                          </div>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                        {v.videoData.scenes.length} slides
                      </div>
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                        <Image className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </>
                  ) : (
                    // Fallback for unknown format
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <p className="text-xs text-gray-500">Content unavailable</p>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-[10px] uppercase font-medium">
                      {v.sourceType}
                      {v.isSlideshow && <span className="ml-1">• Slides</span>}
                    </Badge>
                    {v.createdAt?.seconds && (
                      <span className="text-[10px] text-gray-500">
                        {new Date(v.createdAt.seconds * 1000).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-[11px] text-gray-700 line-clamp-2 leading-relaxed">
                    {v.inputSample || v.sourceFileName || "(no description available)"}
                  </p>
                  
                  <div className="flex gap-2">
                    {v.videoUrl ? (
                      // Traditional video actions
                      <>
                        <a
                          href={v.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1"
                        >
                          <Button size="sm" className="w-full text-xs h-8">
                            <Play className="h-3 w-3 mr-1" />
                            Watch
                          </Button>
                        </a>
                        <a href={v.videoUrl} download className="flex-1">
                          <Button size="sm" variant="outline" className="w-full text-xs h-8">
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                        </a>
                      </>
                    ) : (
                      // Slideshow actions
                      <>
                        <Button 
                          size="sm" 
                          className="flex-1 text-xs h-8"
                          onClick={() => {
                            // Set the slideshow data to display it
                            setVideoData(v.videoData);
                            // Scroll to the display area
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          <Image className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 text-xs h-8"
                          onClick={() => {
                            // Download slideshow data as JSON
                            const dataStr = JSON.stringify(v.videoData, null, 2);
                            const dataBlob = new Blob([dataStr], {type: 'application/json'});
                            const url = URL.createObjectURL(dataBlob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `slideshow-${v.id}.json`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                          }}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Export
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
