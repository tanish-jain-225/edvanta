import React, { useState, useCallback } from 'react';
import { Search, Play, ExternalLink, Clock, Eye } from 'lucide-react';

const VisualContent = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedVideo, setSelectedVideo] = useState(null);

  // YouTube API configuration
  const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
  const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';

  const searchVideos = useCallback(async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search query');
      return;
    }

    if (!YOUTUBE_API_KEY) {
      setError('YouTube API key not configured. Please add VITE_YOUTUBE_API_KEY to your .env file');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${YOUTUBE_API_URL}?part=snippet&maxResults=12&q=${encodeURIComponent(searchQuery)}&type=video&key=${YOUTUBE_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Get video statistics for each video
      const videoIds = data.items.map(item => item.id.videoId).join(',');
      const statsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`
      );
      
      const statsData = await statsResponse.json();
      
      // Merge video data with statistics
      const videosWithStats = data.items.map(item => {
        const stats = statsData.items.find(stat => stat.id === item.id.videoId);
        return {
          ...item,
          statistics: stats?.statistics || {},
          contentDetails: stats?.contentDetails || {}
        };
      });

      setVideos(videosWithStats);
    } catch (err) {
      setError(`Failed to search videos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, YOUTUBE_API_KEY]);

  const formatViews = (views) => {
    if (!views) return '0';
    const num = parseInt(views);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDuration = (duration) => {
    if (!duration) return '';
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return '';
    
    const hours = match[1] ? parseInt(match[1].slice(0, -1)) : 0;
    const minutes = match[2] ? parseInt(match[2].slice(0, -1)) : 0;
    const seconds = match[3] ? parseInt(match[3].slice(0, -1)) : 0;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchVideos();
    }
  };

  const openVideoInNewTab = (videoId) => {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center">
            Visual Content Explorer
          </h1>
          
          {/* Search Section */}
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-8">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Search for educational videos, tutorials, lectures..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm sm:text-base"
                />
              </div>
              <button
                onClick={searchVideos}
                disabled={loading}
                className="w-full sm:w-auto px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="hidden sm:inline">Searching...</span>
                    <span className="sm:hidden">Search...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Search
                  </>
                )}
              </button>
            </div>
            
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Video Grid */}
          {videos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((video) => (
                <div
                  key={video.id.videoId}
                  className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 cursor-pointer"
                  onClick={() => setSelectedVideo(video)}
                >
                  {/* Thumbnail */}
                  <div className="relative group">
                    <img
                      src={video.snippet.thumbnails.medium.url}
                      alt={video.snippet.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-200 flex items-center justify-center">
                      <Play className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    </div>
                    
                    {/* Duration */}
                    {video.contentDetails?.duration && (
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(video.contentDetails.duration)}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2 text-sm">
                      {video.snippet.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">{video.snippet.channelTitle}</p>
                    
                    {/* Stats */}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {formatViews(video.statistics.viewCount)} views
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openVideoInNewTab(video.id.videoId);
                        }}
                        className="text-purple-600 hover:text-purple-800 flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Watch
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && videos.length === 0 && !error && (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <div className="text-gray-400 mb-4">
                <svg
                  className="w-16 h-16 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-700 mb-4">
                Discover Educational Content
              </h2>
              <p className="text-gray-500">
                Search for educational videos, tutorials, and learning content from YouTube
              </p>
            </div>
          )}
        </div>

        {/* Video Modal */}
        {selectedVideo && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold text-gray-800 flex-1 mr-4">
                    {selectedVideo.snippet.title}
                  </h2>
                  <button
                    onClick={() => setSelectedVideo(null)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
                
                {/* Video Embed */}
                <div className="aspect-video mb-4">
                  <iframe
                    src={`https://www.youtube.com/embed/${selectedVideo.id.videoId}`}
                    title={selectedVideo.snippet.title}
                    className="w-full h-full rounded-lg"
                    allowFullScreen
                  ></iframe>
                </div>
                
                {/* Video Info */}
                <div className="space-y-3">
                  <div>
                    <span className="font-semibold text-gray-700">Channel: </span>
                    <span className="text-gray-600">{selectedVideo.snippet.channelTitle}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Description: </span>
                    <p className="text-gray-600 text-sm mt-1">
                      {selectedVideo.snippet.description.slice(0, 300)}
                      {selectedVideo.snippet.description.length > 300 && '...'}
                    </p>
                  </div>
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {formatViews(selectedVideo.statistics.viewCount)} views
                    </span>
                    {selectedVideo.contentDetails?.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDuration(selectedVideo.contentDetails.duration)}
                      </span>
                    )}
                  </div>
                  
                  <div className="pt-4">
                    <button
                      onClick={() => openVideoInNewTab(selectedVideo.id.videoId)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in YouTube
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualContent;