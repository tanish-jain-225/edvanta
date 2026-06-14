import { useState, useCallback, useEffect } from 'react';
import { 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Briefcase, 
  Award, 
  BookOpen, 
  Download, 
  RefreshCw, 
  Trash2,
  Check,
  TrendingUp,
  FileCheck,
  Clock,
  Search,
  ArrowLeft,
  ExternalLink,
  Calendar
} from 'lucide-react';
import { edvantaAPI } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { getCachedData, setCachedData, queueSyncAction } from '../../lib/offlineStorage';

export function ResumeAnalysis() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [error, setError] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  
  // History State
  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('scan'); // 'scan' | 'history'
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeletingId, setIsDeletingId] = useState(null);

  // File size limit: 5MB
  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  // Network connectivity state
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchHistory = useCallback(async () => {
    if (!user?.email) return;
    setIsLoadingHistory(true);

    if (!navigator.onLine) {
      const cached = getCachedData(user.email, 'resume_history', []);
      setHistory(cached);
      setIsLoadingHistory(false);
      return;
    }

    try {
      const response = await edvantaAPI.getResumeHistory(user.email);
      if (response.success) {
        const data = response.data || [];
        setHistory(data);
        setCachedData(user.email, 'resume_history', data);
      }
    } catch (err) {
      console.error("Failed to load resume history:", err);
      const cached = getCachedData(user.email, 'resume_history', []);
      setHistory(cached);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user?.email]);

  useEffect(() => {
    if (user?.email) {
      fetchHistory();
    }
  }, [user?.email, fetchHistory]);

  // Listen for background sync updates to refresh resume history
  useEffect(() => {
    const handleSyncComplete = (e) => {
      if (e.detail?.type === 'resume' && user?.email) {
        fetchHistory();
      }
    };

    window.addEventListener('edvanta-sync-complete', handleSyncComplete);
    return () => {
      window.removeEventListener('edvanta-sync-complete', handleSyncComplete);
    };
  }, [user?.email, fetchHistory]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOnline) return;
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  }, [isOnline]);

  const validateAndSetFile = (selectedFile) => {
    if (!selectedFile) return;
    
    setError('');
    const fileType = selectedFile.type;
    const fileName = selectedFile.name.toLowerCase();
    
    // Check if PDF or text
    const isPDF = fileType === 'application/pdf' || fileName.endsWith('.pdf');
    const isTXT = fileType === 'text/plain' || fileName.endsWith('.txt');
    
    if (!isPDF && !isTXT) {
      setError('Unsupported file type. Please upload a PDF or TXT file.');
      return;
    }
    
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('File is too large. Max size allowed is 5MB.');
      return;
    }
    
    setFile(selectedFile);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (!isOnline) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  }, [isOnline]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!navigator.onLine) {
      setError('ATS Resume Scanning requires an internet connection to process uploads.');
      return;
    }
    if (!file) return;

    setLoading(true);
    setError('');
    
    // Stage-based loading updates
    const stages = [
      'Uploading resume to secure Cloudinary storage...',
      'Extracting text content from file...',
      'Running ATS keywords scanning...',
      'Gemini AI is generating recommendations...'
    ];
    
    let stageIndex = 0;
    setLoadingStage(stages[0]);
    
    const stageInterval = setInterval(() => {
      if (stageIndex < stages.length - 1) {
        stageIndex++;
        setLoadingStage(stages[stageIndex]);
      }
    }, 2500);

    try {
      const response = await edvantaAPI.analyzeResume(file, user?.email);
      clearInterval(stageInterval);
      
      if (response.success) {
        setAnalysisResult(response.data);
        // Reload history to include the new scan
        fetchHistory();
      } else {
        setError(response.error?.message || 'Failed to analyze resume. Please try again.');
      }
    } catch (err) {
      clearInterval(stageInterval);
      setError('An unexpected network error occurred. Please check your connection.');
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  const handleClear = () => {
    setFile(null);
    setAnalysisResult(null);
    setError('');
  };

  const handleDeleteHistory = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this scan from your history?")) return;
    
    setIsDeletingId(id);
    
    if (!navigator.onLine) {
      setHistory(prev => prev.filter(item => item.id !== id));
      if (analysisResult && analysisResult.id === id) {
        setAnalysisResult(null);
      }
      if (user?.email) {
        const cached = getCachedData(user.email, 'resume_history', []);
        const updated = cached.filter(item => item.id !== id);
        setCachedData(user.email, 'resume_history', updated);
        queueSyncAction(user.email, 'DELETE_RESUME', { resumeId: id });
      }
      setIsDeletingId(null);
      return;
    }

    try {
      const response = await edvantaAPI.deleteResume(id);
      if (response.success) {
        setHistory(prev => prev.filter(item => item.id !== id));
        if (analysisResult && analysisResult.id === id) {
          setAnalysisResult(null);
        }
        if (user?.email) {
          const cached = getCachedData(user.email, 'resume_history', []);
          const updated = cached.filter(item => item.id !== id);
          setCachedData(user.email, 'resume_history', updated);
        }
      } else {
        alert("Failed to delete scan report. Please try again.");
      }
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleViewHistoryItem = (item) => {
    setAnalysisResult({
      id: item.id,
      filename: item.filename,
      file_url: item.file_url,
      analysis: item.analysis,
      created_at: item.created_at
    });
  };

  const downloadReport = (result = analysisResult) => {
    if (!result) return;
    
    const analysis = result.analysis;
    const textContent = `
==================================================
EDVANTA AI RESUME ANALYSIS REPORT
==================================================
Filename: ${result.filename}
Date Analyzed: ${new Date(result.created_at || new Date()).toLocaleDateString()}
Score: ${analysis.score}/100

--------------------------------------------------
SUMMARY
--------------------------------------------------
${analysis.summary}

--------------------------------------------------
STRENGTHS
--------------------------------------------------
${analysis.strengths.map(s => `• ${s}`).join('\n')}

--------------------------------------------------
IMPROVEMENTS
--------------------------------------------------
${analysis.improvements.map(i => `• ${i}`).join('\n')}

--------------------------------------------------
SKILLS IDENTIFIED
--------------------------------------------------
${analysis.skills_found.join(', ')}

--------------------------------------------------
SUGGESTED ROLES
--------------------------------------------------
${analysis.suggested_roles.join(', ')}

--------------------------------------------------
DETAILED ANALYSIS FEEDBACK
--------------------------------------------------
${analysis.detailed_feedback}

==================================================
Generated by Edvanta AI Core System.
`;
    
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Edvanta_Resume_Analysis_${result.filename.replace(/\.[^/.]+$/, "")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Modern Markdown Parser helper
  const parseBoldText = (text) => {
    if (!text) return '';
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const renderMarkdown = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('### ')) {
        return <h4 key={idx} className="text-sm font-bold text-gray-800 mt-4 mb-2 flex items-center gap-1.5">{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={idx} className="text-base font-bold text-[#1b6b73] mt-5 mb-3 border-b pb-1 flex items-center gap-2">{line.replace('## ', '')}</h3>;
      }
      if (line.startsWith('# ')) {
        return <h2 key={idx} className="text-lg font-bold text-gray-900 mt-6 mb-4">{line.replace('# ', '')}</h2>;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const content = line.substring(2);
        return (
          <li key={idx} className="ml-5 list-disc text-gray-600 my-1 text-sm">
            {parseBoldText(content)}
          </li>
        );
      }
      const numberedMatch = line.match(/^(\d+)\.\s(.*)/);
      if (numberedMatch) {
        return (
          <li key={idx} className="ml-5 list-decimal text-gray-600 my-1 text-sm">
            {parseBoldText(numberedMatch[2])}
          </li>
        );
      }
      if (line.trim() === '') return <div key={idx} className="h-2" />;
      return <p key={idx} className="text-gray-600 my-1.5 leading-relaxed text-sm">{parseBoldText(line)}</p>;
    });
  };

  // ATS Score Color styling helper
  const getScoreColor = (score) => {
    if (score >= 80) return {
      text: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      stroke: '#10b981',
      badge: 'bg-emerald-100 text-emerald-800'
    };
    if (score >= 60) return {
      text: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      stroke: '#f59e0b',
      badge: 'bg-amber-100 text-amber-800'
    };
    return {
      text: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      stroke: '#f43f5e',
      badge: 'bg-rose-100 text-rose-800'
    };
  };

  // Filter history items by search query
  const filteredHistory = history.filter(item => 
    item.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#289da8]/10 text-[#1b6b73] text-xs font-semibold">
              <FileCheck className="w-3.5 h-3.5" />
              Advanced ATS Evaluation
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">AI Resume Analyzer</h1>
            <p className="text-gray-500 text-sm max-w-xl">
              Get an instant comprehensive ATS scan, role suggestion mapping, and smart structured feedback on your professional resume using Gemini AI model.
            </p>
          </div>
          <div className="bg-[#289da8]/5 p-4 rounded-xl border border-[#289da8]/15 flex items-center gap-3">
            <FileText className="w-10 h-10 text-[#289da8]" />
            <div className="text-xs">
              <span className="font-bold block text-[#1b6b73]">Supported Formats</span>
              <span className="text-gray-500 block">PDF or Text format (.txt)</span>
              <span className="text-gray-500 block">Maximum file size: 5MB</span>
            </div>
          </div>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-3 text-sm animate-shake">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500" />
            <div>
              <span className="font-semibold block">Analysis Issue</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Offline Banner */}
        {!isOnline && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl text-orange-800 flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-orange-500" />
            <div>
              <span className="font-semibold block">Offline Mode</span>
              <span>ATS Resume Scanning requires an internet connection to process uploads. You can still access your history reports below.</span>
            </div>
          </div>
        )}

        {/* Navigation Tabs (Only show if not viewing a specific result) */}
        {!analysisResult && (
          <div className="flex border-b border-gray-200 mb-8 gap-1">
            <button
              onClick={() => setActiveTab('scan')}
              className={`py-3 px-6 font-semibold text-sm transition-all duration-200 border-b-2 -mb-px flex items-center gap-2 ${
                activeTab === 'scan'
                  ? 'border-[#289da8] text-[#1b6b73]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              Scan Resume
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-3 px-6 font-semibold text-sm transition-all duration-200 border-b-2 -mb-px flex items-center gap-2 ${
                activeTab === 'history'
                  ? 'border-[#289da8] text-[#1b6b73]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Clock className="w-4 h-4" />
              Scan History
              {history.length > 0 && (
                <span className="bg-[#289da8]/15 text-[#1b6b73] text-xs font-bold px-2.5 py-0.5 rounded-full ml-1.5">
                  {history.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Main Content Area */}
        {!analysisResult ? (
          <div>
            {activeTab === 'scan' ? (
              <div className="grid grid-cols-1 gap-8">
                {/* Upload Zone */}
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`relative bg-white rounded-2xl border-2 border-dashed p-10 md:p-14 text-center transition-all duration-300 ${
                    !isOnline
                      ? 'border-gray-200 bg-gray-50/50 opacity-75 cursor-not-allowed'
                      : isDragActive 
                        ? 'border-[#289da8] bg-[#289da8]/5 scale-[1.01] shadow-md' 
                        : 'border-gray-200 hover:border-[#289da8]/60 hover:bg-gray-50/50'
                  }`}
                >
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".pdf,.txt"
                    onChange={handleFileChange}
                    disabled={loading || !isOnline}
                  />
                  
                  {!file ? (
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mb-4 text-gray-400 group-hover:scale-110 transition-transform">
                        <UploadCloud className="w-8 h-8 text-[#289da8]" />
                      </div>
                      {isOnline ? (
                        <>
                          <label 
                            htmlFor="file-upload" 
                            className="cursor-pointer text-[#289da8] hover:text-[#1b6b73] font-semibold text-base focus:underline"
                          >
                            Click to upload
                          </label>
                          <span className="text-gray-500 text-sm mt-1">or drag and drop your file here</span>
                        </>
                      ) : (
                        <span className="text-gray-500 text-sm font-semibold mt-1">
                          Resume uploads are disabled in Offline Mode
                        </span>
                      )}
                      <p className="text-xs text-gray-400 mt-4">PDF, TXT up to 5MB</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-[#289da8]/10 border border-[#289da8]/20 flex items-center justify-center mb-4 text-[#289da8]">
                        <FileText className="w-8 h-8" />
                      </div>
                      <h3 className="font-semibold text-gray-900 text-lg truncate max-w-md">{file.name}</h3>
                      <span className="text-gray-500 text-sm mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-3 mt-8">
                        <button
                          onClick={handleAnalyze}
                          disabled={loading || !isOnline}
                          className="px-6 py-2.5 bg-[#289da8] hover:bg-[#1b6b73] text-white font-semibold rounded-lg shadow-sm hover:shadow transition-all duration-200 flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              Evaluate Resume
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleClear}
                          disabled={loading}
                          className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 text-sm disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4 text-gray-500" />
                          Clear
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Loading / Stage Indicator */}
                {loading && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col items-center text-center animate-pulse">
                    <div className="w-12 h-12 rounded-full border-4 border-[#289da8] border-t-transparent animate-spin mb-4"></div>
                    <h4 className="font-semibold text-gray-800 text-base">Processing Analysis</h4>
                    <p className="text-xs text-[#289da8] font-medium mt-1 uppercase tracking-wider">{loadingStage}</p>
                    <div className="w-full max-w-xs bg-gray-100 h-1.5 rounded-full mt-4 overflow-hidden">
                      <div className="bg-[#289da8] h-full animate-indeterminate rounded-full"></div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* History Tab View */
              <div className="space-y-6">
                
                {/* Search and Filters */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search resume filename..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-xl focus:border-[#289da8] focus:ring-1 focus:ring-[#289da8] outline-none text-sm"
                    />
                  </div>
                  <span className="text-xs text-gray-400 font-medium">
                    Showing {filteredHistory.length} of {history.length} scans
                  </span>
                </div>

                {/* Loading History Indicator */}
                {isLoadingHistory ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center flex flex-col items-center">
                    <RefreshCw className="w-8 h-8 text-[#289da8] animate-spin mb-4" />
                    <p className="text-gray-500 text-sm">Retrieving your analysis history...</p>
                  </div>
                ) : filteredHistory.length === 0 ? (
                  /* Empty History State */
                  <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center max-w-md mx-auto">
                    <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 mx-auto mb-6">
                      <Clock className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">No scans found</h3>
                    <p className="text-gray-500 text-sm mb-6">
                      {searchTerm ? "No results match your search query." : "You haven't uploaded or analyzed any resumes yet."}
                    </p>
                    {!searchTerm && (
                      <button
                        onClick={() => setActiveTab('scan')}
                        className="px-5 py-2.5 bg-[#289da8] hover:bg-[#1b6b73] text-white font-semibold rounded-lg text-sm shadow-sm transition-all flex items-center gap-2 mx-auto"
                      >
                        <UploadCloud className="w-4 h-4" />
                        Scan Your First Resume
                      </button>
                    )}
                  </div>
                ) : (
                  /* History Items List Grid */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredHistory.map((item) => {
                      const scoreColor = getScoreColor(item.analysis.score);
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleViewHistoryItem(item)}
                          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:border-[#289da8]/40 hover:shadow-md cursor-pointer transition-all duration-200 flex flex-col justify-between gap-4 group"
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0 group-hover:bg-[#289da8]/10 group-hover:text-[#289da8] transition-colors">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="space-y-1">
                                <h4 className="font-bold text-gray-900 text-sm truncate max-w-[200px] sm:max-w-[260px]">
                                  {item.filename}
                                </h4>
                                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* score badge */}
                            <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-full border-2 ${scoreColor.border} ${scoreColor.bg}`}>
                              <span className={`text-sm font-extrabold ${scoreColor.text}`}>{item.analysis.score}</span>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-gray-50 flex items-center justify-between text-xs">
                            <a
                              href={item.file_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-gray-400 hover:text-[#289da8] flex items-center gap-1 font-medium transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Original Resume
                            </a>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadReport(item);
                                }}
                                className="text-[#289da8] hover:text-[#1b6b73] font-bold flex items-center gap-1 hover:underline"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Report
                              </button>
                              <span className="text-gray-200">|</span>
                              <button
                                onClick={(e) => handleDeleteHistory(item.id, e)}
                                disabled={isDeletingId === item.id}
                                className="text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1 hover:underline disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Results Dashboard */
          <div className="space-y-8 animate-fadeIn">
            
            {/* Action Header bar for selected scan */}
            <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <button 
                onClick={() => {
                  setAnalysisResult(null);
                  setActiveTab('history');
                }}
                className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold rounded-lg border border-gray-200 transition-all duration-200 flex items-center gap-2 text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to History
              </button>
              
              <div className="flex items-center gap-3">
                {analysisResult.file_url && (
                  <a
                    href={analysisResult.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 text-xs font-semibold text-gray-500 hover:text-[#289da8] bg-gray-50 border border-gray-150 rounded-lg hover:bg-gray-100 transition-all flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Original File
                  </a>
                )}
                <button
                  onClick={() => downloadReport()}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-[#289da8] hover:bg-[#1b6b73] rounded-lg transition-all flex items-center gap-1.5 shadow-sm hover:shadow"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download TXT Report
                </button>
              </div>
            </div>

            {/* Top Overview Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* ATS Score Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center text-center">
                <h3 className="font-bold text-gray-700 text-sm mb-4 uppercase tracking-wider">Overall ATS Score</h3>
                
                {/* SVG Progress Ring */}
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    {/* Background Circle */}
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      fill="transparent" 
                      stroke="#f3f4f6" 
                      strokeWidth="8" 
                    />
                    {/* Colored Path Circle */}
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      fill="transparent" 
                      stroke={getScoreColor(analysisResult.analysis.score).stroke} 
                      strokeWidth="8" 
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - analysisResult.analysis.score / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  
                  {/* Score text in absolute center */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-extrabold text-gray-900">{analysisResult.analysis.score}</span>
                    <span className="text-xs text-gray-400 font-semibold uppercase">of 100</span>
                  </div>
                </div>

                <div className="mt-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getScoreColor(analysisResult.analysis.score).badge}`}>
                    {analysisResult.analysis.score >= 80 ? 'ATS Compatible' : analysisResult.analysis.score >= 60 ? 'Needs Optimization' : 'Poor Match'}
                  </span>
                </div>
              </div>

              {/* Summary Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:col-span-2 flex flex-col justify-between">
                <div className="space-y-3">
                  <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#289da8]" />
                    Resume Summary Evaluation
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {analysisResult.analysis.summary}
                  </p>
                </div>
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                  <span>File: <strong className="text-gray-600 font-semibold">{analysisResult.filename}</strong></span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => downloadReport()}
                      className="text-[#289da8] hover:text-[#1b6b73] font-bold flex items-center gap-1 hover:underline"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download TXT Report
                    </button>
                    <span>|</span>
                    <button 
                      onClick={handleClear}
                      className="text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1 hover:underline"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Analyze New
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Strengths & Improvements Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Strengths Column */}
              <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 space-y-4">
                <h3 className="font-bold text-emerald-800 text-base flex items-center gap-2 border-b border-emerald-50 pb-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  Key Strengths
                </h3>
                <ul className="space-y-3">
                  {analysisResult.analysis.strengths.length === 0 ? (
                    <li className="text-gray-400 text-sm italic">No significant strengths highlighted.</li>
                  ) : (
                    analysisResult.analysis.strengths.map((strength, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-sm text-gray-600">
                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>{strength}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              {/* Improvements Column */}
              <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6 space-y-4">
                <h3 className="font-bold text-amber-800 text-base flex items-center gap-2 border-b border-amber-50 pb-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  Recommended Improvements
                </h3>
                <ul className="space-y-3">
                  {analysisResult.analysis.improvements.length === 0 ? (
                    <li className="text-gray-400 text-sm italic">No immediate improvements required.</li>
                  ) : (
                    analysisResult.analysis.improvements.map((improvement, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-sm text-gray-600">
                        <TrendingUp className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span>{improvement}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>

            {/* Skills Cloud & Roles Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Identified Skills */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                <h3 className="font-bold text-gray-800 text-base flex items-center gap-2 border-b border-gray-50 pb-2">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  Skills Found
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.analysis.skills_found.length === 0 ? (
                    <span className="text-gray-400 text-sm italic">No technical skills detected.</span>
                  ) : (
                    analysisResult.analysis.skills_found.map((skill, idx) => (
                      <span 
                        key={idx} 
                        className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100 rounded-lg text-xs font-medium transition-all"
                      >
                        {skill}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Target Job Roles Mapping */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                <h3 className="font-bold text-gray-800 text-base flex items-center gap-2 border-b border-gray-50 pb-2">
                  <Briefcase className="w-4 h-4 text-indigo-500" />
                  Suggested Roles Mapping
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.analysis.suggested_roles.length === 0 ? (
                    <span className="text-gray-400 text-sm italic">No direct roles suggested.</span>
                  ) : (
                    analysisResult.analysis.suggested_roles.map((role, idx) => (
                      <span 
                        key={idx} 
                        className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100 rounded-lg text-xs font-medium transition-all"
                      >
                        {role}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Evaluation Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-4">
              <h3 className="font-extrabold text-gray-900 text-lg border-b border-gray-100 pb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#289da8]" />
                In-Depth Analysis & Action Plan
              </h3>
              <div className="prose max-w-none text-gray-700 space-y-3">
                {renderMarkdown(analysisResult.analysis.detailed_feedback)}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
