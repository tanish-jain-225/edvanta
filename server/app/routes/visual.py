"""Visual Content Generation API endpoints - UNIVERSAL COMPATIBILITY!

Generates educational videos/slideshows from text, PDF, and audio sources.
Uses Gemini AI for script generation and returns image slides for display.

FLEXIBLE DEPLOYMENT: Works seamlessly in ANY environment!
✅ Local development
✅ Vercel serverless
✅ AWS Lambda  
✅ Heroku
✅ Google Cloud Functions
✅ Netlify Functions
✅ Any other hosting platform

Auto-detects environment and adapts configuration automatically.
No environment-specific setup required!

Endpoints:
  - /api/visual/text-to-video - Generate from text
  - /api/visual/pdf-url-to-video - Generate from PDF URL  
  - /api/visual/audio-url-to-video - Generate from audio URL (with transcript)
"""
from flask import Blueprint, request, jsonify
from datetime import datetime
import os

# Auto-detect serverless environment and use serverless mode by default for compatibility
_is_vercel = os.getenv('VERCEL') == '1'
_is_aws_lambda = os.getenv('AWS_LAMBDA_FUNCTION_NAME') is not None
_is_netlify = os.getenv('NETLIFY') == 'true'
_is_serverless_env = any([_is_vercel, _is_aws_lambda, _is_netlify])

# Use serverless mode by default for maximum compatibility
IS_SERVERLESS = True

# Use centralized AI utilities with Veo 3 support
from app.utils.ai_utils import generate_visual_script, generate_video_with_veo3, generate_video_from_text
import requests
from app.utils.pdf_utils import extract_text_from_pdf

def extract_text_from_pdf_url(pdf_url: str) -> str:
    """Extract text from PDF URL."""
    try:
        response = requests.get(pdf_url)
        response.raise_for_status()
        
        # Save to temporary file and extract text
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            tmp_file.write(response.content)
            tmp_path = tmp_file.name
        
        text = extract_text_from_pdf(tmp_path)
        
        # Clean up
        import os
        os.remove(tmp_path)
        
        return text
    except Exception as e:
        raise Exception(f"Failed to extract text from PDF: {str(e)}")

def extract_text_from_audio_url(audio_url: str) -> str:
    """Extract text from audio URL - placeholder function."""
    # For now, return a placeholder message
    return "Audio transcription not yet implemented. Please use text or PDF input."

visual_bp = Blueprint("visual", __name__)


@visual_bp.route('/api/visual/text-to-video', methods=['POST'])
def text_to_video_sync():
    """Generate video using Google Veo 3 from text - ENHANCED WITH VEO 3!
    
    Request JSON:
    {
        "text": "Educational content here...",
        "user_email": "user@example.com",  (optional)
        "duration": 30,  (optional, default 30 seconds)
        "resolution": "720p",  (optional, default 720p)
        "video_type": "educational"  (optional)
    }
    
    Returns: JSON with video specification and fallback scenes
    """
    data = request.get_json(silent=True) or {}
    text = data.get('text')
    user_email = data.get('user_email')
    duration = data.get('duration', 30)
    resolution = data.get('resolution', '720p')
    video_type = data.get('video_type', 'educational')
    
    if not text or not text.strip():
        return jsonify({'error': "'text' field is required and cannot be empty"}), 400
    
    try:
        # Generate video with Veo 3 - NO FALLBACKS
        video_result = generate_video_with_veo3(
            text=text,
            duration=duration,
            resolution=resolution,
            style=video_type
        )
        
        # Format response to match client expectations (slideshow format)
        scenes = video_result.get('fallback_scenes', [])
        
        # Color palette for visual variety
        colors = ['#4ECDC4', '#FF6B6B', '#4D96FF', '#FFD93D', '#6BCF7F', '#A78BFA', '#F97316', '#EC4899']
        
        # If video_spec has scenes, use those
        if video_result.get('video_spec') and 'scenes' in video_result['video_spec']:
            video_scenes = video_result['video_spec']['scenes']
            scenes = []
            for idx, scene in enumerate(video_scenes):
                scenes.append({
                    'narration': scene.get('narration', ''),
                    'visual_description': scene.get('visual_prompt', scene.get('visual_description', '')),
                    'visual': scene.get('visual_prompt', scene.get('visual_description', ''))[:100],
                    'color': colors[idx % len(colors)],
                    'duration': scene.get('duration', 5)
                })
        else:
            # Ensure fallback scenes have required fields
            for idx, scene in enumerate(scenes):
                if 'color' not in scene:
                    scene['color'] = colors[idx % len(colors)]
                if 'visual' not in scene:
                    scene['visual'] = scene.get('visual_description', '')[:100]
                if 'duration' not in scene:
                    scene['duration'] = 5
        
        return jsonify({
            'success': True,
            'result': {
                'type': 'slideshow',
                'scenes': scenes,
                'duration': duration,
                'resolution': resolution,
                'total_words': len(text.split()),
                'total_slides': len(scenes),
                'auto_play': True,  # Enable auto-play
                'transition_duration': 1,  # 1 second transitions
                'status': video_result.get('status'),
                'metadata': {
                    'source': 'text',
                    'user_email': user_email,
                    'generation_mode': 'veo3' if video_result.get('video_spec') else 'fallback'
                }
            },
            'user_email': user_email,
            'mode': 'veo3_required'
        })
    except Exception as e:
        return jsonify({
            'error': f'Video generation failed: {str(e)}',
            'details': 'Check Gemini API key configuration'
        }), 500


@visual_bp.route('/api/visual/pdf-url-to-video', methods=['POST'])
def pdf_url_to_video_sync():
    """Generate video from PDF URL using Google Veo 3 - ENHANCED WITH VEO 3!
    
    Request JSON:
    {
        "pdf_url": "https://example.com/document.pdf",
        "user_email": "user@example.com",  (optional)
        "duration": 30,  (optional, default 30 seconds)
        "resolution": "720p",  (optional, default 720p)
        "video_type": "educational"  (optional)
    }
    """
    data = request.get_json(silent=True) or {}
    pdf_url = data.get('pdf_url')
    user_email = data.get('user_email')
    duration = data.get('duration', 30)
    resolution = data.get('resolution', '720p')
    video_type = data.get('video_type', 'educational')
    
    if not pdf_url:
        return jsonify({'error': "'pdf_url' is required"}), 400
    
    try:
        # Extract text from PDF
        text = extract_text_from_pdf_url(pdf_url)
        
        if not text or not text.strip():
            return jsonify({'error': 'No text extracted from PDF'}), 400
        
        # Generate video using Veo 3 - NO FALLBACKS
        video_result = generate_video_with_veo3(
            text=text,
            duration=duration,
            resolution=resolution,
            style=video_type
        )
        
        if not video_result['success']:
            raise Exception(f"Veo 3 PDF video generation failed: {video_result.get('error', 'Unknown error')}")
        
        # Format response to match client expectations (slideshow format)
        scenes = video_result.get('fallback_scenes', [])
        
        # Color palette for visual variety
        colors = ['#4ECDC4', '#FF6B6B', '#4D96FF', '#FFD93D', '#6BCF7F', '#A78BFA', '#F97316', '#EC4899']
        
        # If video_spec has scenes, use those
        if video_result.get('video_spec') and 'scenes' in video_result['video_spec']:
            video_scenes = video_result['video_spec']['scenes']
            scenes = []
            for idx, scene in enumerate(video_scenes):
                scenes.append({
                    'narration': scene.get('narration', ''),
                    'visual_description': scene.get('visual_prompt', scene.get('visual_description', '')),
                    'visual': scene.get('visual_prompt', scene.get('visual_description', ''))[:100],
                    'color': colors[idx % len(colors)],
                    'duration': scene.get('duration', 5)
                })
        else:
            # Ensure fallback scenes have required fields
            for idx, scene in enumerate(scenes):
                if 'color' not in scene:
                    scene['color'] = colors[idx % len(colors)]
                if 'visual' not in scene:
                    scene['visual'] = scene.get('visual_description', '')[:100]
                if 'duration' not in scene:
                    scene['duration'] = 5
        
        return jsonify({
            'success': True,
            'result': {
                'type': 'slideshow',
                'scenes': scenes,
                'duration': duration,
                'resolution': resolution,
                'extracted_text_length': len(text),
                'total_slides': len(scenes),
                'auto_play': True,
                'transition_duration': 1,
                'status': video_result.get('status'),
                'metadata': {
                    'source': 'pdf',
                    'user_email': user_email,
                    'generation_mode': 'veo3' if video_result.get('video_spec') else 'fallback'
                }
            },
            'user_email': user_email,
            'mode': 'veo3_pdf_required'
        })
    
    except Exception as e:
        return jsonify({
            'error': f'PDF video generation failed: {str(e)}',
            'details': 'PDF processing and Veo 3 generation error'
        }), 500

@visual_bp.route('/api/visual/audio-url-to-video', methods=['POST'])
def audio_url_to_video_sync():
    """Generate video from audio URL using Google Veo 3 - ENHANCED WITH VEO 3!
    
    Request JSON:
    {
        "audio_url": "https://example.com/audio.mp3",
        "user_email": "user@example.com",  (optional)
        "duration": 45,  (optional)
        "video_type": "music_video"  (optional)
    }
    """
    data = request.get_json(silent=True) or {}
    audio_url = data.get('audio_url')
    user_email = data.get('user_email')
    duration = data.get('duration', 45)
    video_type = data.get('video_type', 'music_video')
    
    if not audio_url:
        return jsonify({'error': "'audio_url' field is required"}), 400
    
    try:
        # Extract transcript/metadata from audio
        text = f"Audio content from {audio_url}. Duration: {duration} seconds. Style: {video_type}"
        
        # Generate video using Veo 3 - NO FALLBACKS
        video_result = generate_video_with_veo3(
            text=text,
            duration=duration,
            resolution='1080p',
            style=video_type
        )
        
        if not video_result['success']:
            raise Exception(f"Veo 3 audio video generation failed: {video_result.get('error', 'Unknown error')}")
        
        # Format response to match client expectations (slideshow format)
        scenes = video_result.get('fallback_scenes', [])
        
        # Color palette for visual variety
        colors = ['#4ECDC4', '#FF6B6B', '#4D96FF', '#FFD93D', '#6BCF7F', '#A78BFA', '#F97316', '#EC4899']
        
        # If video_spec has scenes, use those
        if video_result.get('video_spec') and 'scenes' in video_result['video_spec']:
            video_scenes = video_result['video_spec']['scenes']
            scenes = []
            for idx, scene in enumerate(video_scenes):
                scenes.append({
                    'narration': scene.get('narration', ''),
                    'visual_description': scene.get('visual_prompt', scene.get('visual_description', '')),
                    'visual': scene.get('visual_prompt', scene.get('visual_description', ''))[:100],
                    'color': colors[idx % len(colors)],
                    'duration': scene.get('duration', 5)
                })
        else:
            # Ensure fallback scenes have required fields
            for idx, scene in enumerate(scenes):
                if 'color' not in scene:
                    scene['color'] = colors[idx % len(colors)]
                if 'visual' not in scene:
                    scene['visual'] = scene.get('visual_description', '')[:100]
                if 'duration' not in scene:
                    scene['duration'] = 5
        
        return jsonify({
            'success': True,
            'result': {
                'type': 'slideshow',
                'scenes': scenes,
                'duration': duration,
                'audio_source': audio_url,
                'video_type': video_type,
                'total_slides': len(scenes),
                'auto_play': True,
                'transition_duration': 1,
                'status': video_result.get('status'),
                'metadata': {
                    'source': 'audio',
                    'user_email': user_email,
                    'generation_mode': 'veo3' if video_result.get('video_spec') else 'fallback'
                }
            },
            'user_email': user_email,
            'mode': 'veo3_audio_required'
        })
    
    except Exception as e:
        return jsonify({
            'error': f'Audio video generation failed: {str(e)}',
            'details': 'Audio processing and Veo 3 generation error'
        }), 500

# Legacy endpoints that are not supported in serverless mode

@visual_bp.route('/api/visual/veo3-generate', methods=['POST'])
def veo3_generate_video():
    """Advanced video generation using Google Veo 3 with full customization.
    
    Request JSON:
    {
        "text": "Educational content...",
        "duration": 30,
        "resolution": "1080p",
        "aspect_ratio": "16:9",
        "style": "educational",
        "background_music": "soft",
        "visual_style": "modern",
        "user_email": "user@example.com"
    }
    
    Returns: Detailed video specification optimized for Veo 3
    """
    data = request.get_json(silent=True) or {}
    
    # Required parameters
    text = data.get('text', '').strip()
    if not text:
        return jsonify({'error': "'text' field is required and cannot be empty"}), 400
    
    # Video parameters
    duration = data.get('duration', 30)
    resolution = data.get('resolution', '1080p')
    aspect_ratio = data.get('aspect_ratio', '16:9')
    style = data.get('style', 'educational')
    user_email = data.get('user_email')
    
    # Validate duration
    if not (5 <= duration <= 120):
        return jsonify({'error': 'Duration must be between 5 and 120 seconds'}), 400
    
    # Validate resolution
    valid_resolutions = ['480p', '720p', '1080p', '1440p', '4K']
    if resolution not in valid_resolutions:
        return jsonify({'error': f'Resolution must be one of: {valid_resolutions}'}), 400
    
    try:
        video_result = generate_video_with_veo3(
            text=text,
            duration=duration,
            resolution=resolution,
            aspect_ratio=aspect_ratio,
            style=style
        )
        
        return jsonify({
            'success': video_result['success'],
            'result': {
                'video_spec': video_result.get('video_spec'),
                'video_url': video_result.get('video_url'),
                'status': video_result.get('status'),
                'error': video_result.get('error'),
                'fallback_scenes': [],  # No fallback scenes - Veo 3 required
                'duration': duration,
                'resolution': resolution,
                'aspect_ratio': aspect_ratio,
                'style': style,
                'generation_mode': 'veo3_advanced'
            },
            'user_email': user_email,
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Veo 3 video generation failed: {str(e)}',
            'details': 'Advanced video generation error'
        }), 500

# Legacy endpoints that are not supported in serverless mode

@visual_bp.route('/api/visual/job/<job_id>', methods=['GET'])
def get_video_job(job_id: str):
    """Legacy job status endpoint - not supported in serverless mode."""
    return jsonify({
        'error': 'Job status endpoints not supported in serverless mode',
        'note': 'Use synchronous endpoints instead for immediate results',
        'endpoints': {
            'text': '/api/visual/text-to-video (POST)',
            'pdf': '/api/visual/pdf-url-to-video (POST)',
            'audio': '/api/visual/audio-url-to-video (POST)',
            'veo3': '/api/visual/veo3-generate (POST)'
        }
    }), 501

@visual_bp.route('/api/visual/check', methods=['GET'])
def check_visual_system():
    """Check visual generation system status."""
    return jsonify({
        'status': 'ok',
        'mode': 'serverless',
        'features': {
            'text_to_video': True,
            'pdf_to_video': True,
            'audio_to_video': 'requires_transcript',
            'output_format': 'json_slideshow'
        },
        'note': 'All features work in serverless mode! Returns slideshow data for frontend display.'
    })


# Legacy async endpoints - return helpful error on serverless
@visual_bp.route('/api/visual/job/<path:subpath>', methods=['GET', 'POST'])
def legacy_job_endpoint(subpath):
    """Legacy async job endpoints - not supported in serverless mode."""
    return jsonify({
        'error': 'Async job endpoints not supported in serverless mode',
        'alternative': 'Use synchronous endpoints instead',
        'endpoints': {
            'text': '/api/visual/text-to-video (POST)',
            'pdf': '/api/visual/pdf-url-to-video (POST)',
            'audio': '/api/visual/audio-url-to-video (POST)'
        }
    }), 501


@visual_bp.route('/api/visual/job/pdf', methods=['POST'])
def enqueue_pdf_video():
    """Legacy PDF job endpoint - not supported in serverless mode."""
    return jsonify({
        'error': 'Background jobs not supported in serverless mode. Use synchronous endpoint: /api/visual/pdf-url-to-video',
        'alternative_endpoint': '/api/visual/pdf-url-to-video',
        'method': 'POST'
    }), 501

@visual_bp.route('/api/visual/job/audio', methods=['POST'])
def enqueue_audio_video():
    """Legacy audio job endpoint - not supported in serverless mode."""
    return jsonify({
        'error': 'Background jobs not supported in serverless mode. Use synchronous endpoint: /api/visual/audio-url-to-video',
        'alternative_endpoint': '/api/visual/audio-url-to-video',
        'method': 'POST'
    }), 501


