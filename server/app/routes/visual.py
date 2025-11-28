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
import os

# Auto-detect serverless environment and use serverless mode by default for compatibility
_is_vercel = os.getenv('VERCEL') == '1'
_is_aws_lambda = os.getenv('AWS_LAMBDA_FUNCTION_NAME') is not None
_is_netlify = os.getenv('NETLIFY') == 'true'
_is_serverless_env = any([_is_vercel, _is_aws_lambda, _is_netlify])

# Use serverless mode by default for maximum compatibility
IS_SERVERLESS = True

# Always use serverless version for consistency across all environments
from ..utils.visual_utils_serverless import (
    generate_video_from_transcript_text,
    extract_text_from_pdf_url,
    extract_text_from_audio_url,
)

visual_bp = Blueprint("visual", __name__)


@visual_bp.route('/api/visual/text-to-video', methods=['POST'])
def text_to_video_sync():
    """Generate video/slideshow from text - SERVERLESS COMPATIBLE!
    
    Request JSON:
    {
        "text": "Educational content here...",
        "user_email": "user@example.com"  (optional)
    }
    
    Returns: JSON with scene slides and narration
    """
    data = request.get_json(silent=True) or {}
    text = data.get('text')
    user_email = data.get('user_email')
    
    if not text or not text.strip():
        return jsonify({'error': "'text' field is required and cannot be empty"}), 400
    
    try:
        result = generate_video_from_transcript_text(text)
        return jsonify({
            'success': True,
            'result': result,
            'user_email': user_email,
            'mode': 'serverless'
        })
    except Exception as e:
        return jsonify({
            'error': f'Video generation failed: {str(e)}',
            'details': 'Check Gemini API key configuration'
        }), 500


@visual_bp.route('/api/visual/pdf-url-to-video', methods=['POST'])
def pdf_url_to_video_sync():
    """Generate video/slideshow from PDF URL - SERVERLESS COMPATIBLE!
    
    Request JSON:
    {
        "pdf_url": "https://example.com/document.pdf",
        "user_email": "user@example.com"  (optional)
    }
    """
    data = request.get_json(silent=True) or {}
    pdf_url = data.get('pdf_url')
    user_email = data.get('user_email')
    
    if not pdf_url:
        return jsonify({'error': "'pdf_url' field is required"}), 400
    
    try:
        # Extract text from PDF
        text = extract_text_from_pdf_url(pdf_url)
        
        if not text or not text.strip():
            return jsonify({'error': 'No text extracted from PDF'}), 400
        
        # Generate video from text
        result = generate_video_from_transcript_text(text)
        
        return jsonify({
            'success': True,
            'result': result,
            'user_email': user_email,
            'extracted_text_length': len(text),
            'mode': 'serverless'
        })
    except Exception as e:
        return jsonify({
            'error': f'PDF video generation failed: {str(e)}'
        }), 500


@visual_bp.route('/api/visual/audio-url-to-video', methods=['POST'])
def audio_url_to_video_sync():
    """Generate video/slideshow from audio URL - SERVERLESS COMPATIBLE!
    
    Request JSON:
    {
        "audio_url": "https://example.com/audio.mp3",
        "transcript": "Transcribed text here...",  (required - provide manually)
        "user_email": "user@example.com"  (optional)
    }
    
    Note: Automatic transcription not implemented. Provide transcript manually.
    """
    data = request.get_json(silent=True) or {}
    audio_url = data.get('audio_url')
    transcript = data.get('transcript')
    user_email = data.get('user_email')
    
    if not audio_url:
        return jsonify({'error': "'audio_url' field is required"}), 400
    
    if not transcript:
        return jsonify({
            'error': "'transcript' field is required",
            'note': 'Automatic transcription not available. Please provide transcript manually.',
            'suggestion': 'Use Gemini API audio input or external transcription service'
        }), 400
    
    try:
        # Generate video from transcript
        result = generate_video_from_transcript_text(transcript)
        
        return jsonify({
            'success': True,
            'result': result,
            'user_email': user_email,
            'audio_url': audio_url,
            'mode': 'serverless'
        })
    except Exception as e:
        return jsonify({
            'error': f'Audio video generation failed: {str(e)}'
        }), 500


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

@visual_bp.route('/api/visual/job/<job_id>', methods=['GET'])
def get_video_job(job_id: str):
    """Legacy job status endpoint - not supported in serverless mode."""
    return jsonify({
        'error': 'Job status endpoints not supported in serverless mode',
        'note': 'Use synchronous endpoints instead for immediate results',
        'endpoints': {
            'text': '/api/visual/text-to-video (POST)',
            'pdf': '/api/visual/pdf-url-to-video (POST)',
            'audio': '/api/visual/audio-url-to-video (POST)'
        }
    }), 501


