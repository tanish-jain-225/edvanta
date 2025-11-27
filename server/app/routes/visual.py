"""Visual Content Generation API endpoints.

Provides endpoints for generating videos from text, PDF, and audio sources.
Implementation uses Gemini AI for script generation and MoviePy for video creation.

IMPORTANT - SERVERLESS COMPATIBILITY:
- Threading is disabled on serverless (Vercel) environments
- Async job endpoints return immediate errors on serverless
- Use synchronous endpoints for serverless deployment
- For production with background jobs, use a proper job queue (Redis Queue, Celery, etc.)

Endpoints:
  - Synchronous: /api/visual/text-to-video, /api/visual/pdf-url-to-video, /api/visual/audio-url-to-video
  - Async (local only): /api/visual/job/text, /api/visual/job/pdf, /api/visual/job/audio
"""
from flask import Blueprint, request, jsonify
import uuid
import time
import os
from datetime import datetime

from ..utils.visual_utils import (
  generate_video_from_transcript_text,
  extract_text_from_pdf_url,
  extract_text_from_audio_url,
)

visual_bp = Blueprint("visual", __name__)

# Detect if running on Vercel/serverless (no threading support)
IS_SERVERLESS = os.getenv('VERCEL') == '1' or os.getenv('AWS_LAMBDA_FUNCTION_NAME') is not None

# In-memory job store (only used in non-serverless environments)
if not IS_SERVERLESS:
    import threading
    _VIDEO_JOBS = {}
    _LOCK = threading.Lock()
else:
    _VIDEO_JOBS = {}
    _LOCK = None

def _run_video_job(job_id: str):
  """Background job runner (only works in non-serverless environments)"""
  if IS_SERVERLESS:
    return
  with _LOCK:
    job = _VIDEO_JOBS.get(job_id)
  if not job:
    return
  try:
    with _LOCK:
      job['status'] = 'running'
      job['started_at'] = time.time()
    # Determine mode
    mode = job['payload'].get('mode')
    email = job['payload'].get('user_email')
    goal = job['payload'].get('label') or ''
    if mode == 'text':
      url = generate_video_from_transcript_text(job['payload']['text'])
    elif mode == 'pdf':
      text = extract_text_from_pdf_url(job['payload']['pdf_url'])
      url = generate_video_from_transcript_text(text)
    elif mode == 'audio':
      transcript = job['payload'].get('transcript')
      if not transcript:
        transcript = extract_text_from_audio_url(job['payload']['audio_url'])
      url = generate_video_from_transcript_text(transcript)
    else:
      raise ValueError('Unknown job mode')
    with _LOCK:
      job['status'] = 'completed'
      job['url'] = url
      job['completed_at'] = time.time()
  except Exception as e:
    with _LOCK:
      job['status'] = 'failed'
      job['error'] = str(e)
      job['completed_at'] = time.time()

@visual_bp.route('/api/visual/job/text', methods=['POST'])
def enqueue_text_video():
  if IS_SERVERLESS:
    return jsonify({
      'error': 'Background jobs not supported on serverless. Use synchronous endpoint: /api/visual/text-to-video',
      'alternative_endpoint': '/api/visual/text-to-video',
      'method': 'POST'
    }), 501
  
  data = request.get_json(silent=True) or {}
  text = data.get('text')
  user_email = data.get('user_email')
  label = data.get('label') or (text[:40] if text else '')
  if not text:
    return jsonify({'error': "'text' is required"}), 400
  job_id = uuid.uuid4().hex
  job = {'id': job_id, 'status': 'queued', 'payload': {'mode':'text','text':text,'user_email':user_email,'label':label}, 'created_at': time.time()}
  with _LOCK:
    _VIDEO_JOBS[job_id] = job
  threading.Thread(target=_run_video_job, args=(job_id,), daemon=True).start()
  return jsonify({'job_id': job_id, 'status': 'queued'})

@visual_bp.route('/api/visual/job/pdf', methods=['POST'])
def enqueue_pdf_video():
  if IS_SERVERLESS:
    return jsonify({
      'error': 'Background jobs not supported on serverless. Use synchronous endpoint: /api/visual/pdf-url-to-video',
      'alternative_endpoint': '/api/visual/pdf-url-to-video',
      'method': 'POST'
    }), 501
  
  data = request.get_json(silent=True) or {}
  pdf_url = data.get('pdf_url')
  user_email = data.get('user_email')
  label = data.get('label') or (pdf_url[:40] if pdf_url else '')
  if not pdf_url:
    return jsonify({'error': "'pdf_url' is required"}), 400
  job_id = uuid.uuid4().hex
  job = {'id': job_id, 'status': 'queued', 'payload': {'mode':'pdf','pdf_url':pdf_url,'user_email':user_email,'label':label}, 'created_at': time.time()}
  with _LOCK:
    _VIDEO_JOBS[job_id] = job
  threading.Thread(target=_run_video_job, args=(job_id,), daemon=True).start()
  return jsonify({'job_id': job_id, 'status': 'queued'})

@visual_bp.route('/api/visual/job/audio', methods=['POST'])
def enqueue_audio_video():
  if IS_SERVERLESS:
    return jsonify({
      'error': 'Background jobs not supported on serverless. Use synchronous endpoint: /api/visual/audio-url-to-video',
      'alternative_endpoint': '/api/visual/audio-url-to-video',
      'method': 'POST'
    }), 501
  
  data = request.get_json(silent=True) or {}
  audio_url = data.get('audio_url')
  transcript = data.get('transcript')
  user_email = data.get('user_email')
  label = data.get('label') or 'Audio Generation'
  if not audio_url and not transcript:
    return jsonify({'error': "Provide 'audio_url' or 'transcript'"}), 400
  job_id = uuid.uuid4().hex
  job = {'id': job_id, 'status': 'queued', 'payload': {'mode':'audio','audio_url':audio_url,'transcript':transcript,'user_email':user_email,'label':label}, 'created_at': time.time()}
  with _LOCK:
    _VIDEO_JOBS[job_id] = job
  threading.Thread(target=_run_video_job, args=(job_id,), daemon=True).start()
  return jsonify({'job_id': job_id, 'status': 'queued'})

@visual_bp.route('/api/visual/job/<job_id>', methods=['GET'])
def get_video_job(job_id: str):
  with _LOCK:
    job = _VIDEO_JOBS.get(job_id)
  if not job:
    return jsonify({'error': 'job not found'}), 404
  # Copy safe subset
  public = {k: v for k, v in job.items() if k not in {'payload'}}
  if 'payload' in job:
    public['label'] = job['payload'].get('label')
  return jsonify(public)


@visual_bp.route("/api/visual/text-to-video", methods=["POST"])
def text_to_video():
  """Create a video from raw text.

  Expected JSON: {"text": "..."}
  Steps:
    - Use Gemini AI to extract key moments and image prompts
    - Generate AI images, synthesize TTS, render captions, merge clips
    - Upload final video to Cloudinary and return the secure URL
  """
  data = request.get_json(silent=True) or {}
  text = data.get("text")
  if not text:
    return jsonify({"error": "'text' is required"}), 400
  try:
    # util already uploads and returns Cloudinary URL (if configured)
    url_or_path = generate_video_from_transcript_text(text)
    return jsonify({"url": url_or_path})
  except NotImplementedError as nie:
    return jsonify({"error": str(nie)}), 501
  except Exception as e:
    return jsonify({"error": str(e)}), 500


@visual_bp.route("/api/visual/pdf-url-to-video", methods=["POST"])
def pdf_url_to_video():
  """Create a video from a PDF URL.

  Expected JSON: {"pdf_url": "https://..."}
  Steps:
    - Download PDF and extract text
    - Reuse the text-to-video pipeline
    - Upload final video to Cloudinary and return the secure URL
  """
  data = request.get_json(silent=True) or {}
  pdf_url = data.get("pdf_url")
  if not pdf_url:
    return jsonify({"error": "'pdf_url' is required"}), 400
  try:
    text = extract_text_from_pdf_url(pdf_url)
    url_or_path = generate_video_from_transcript_text(text)
    return jsonify({"url": url_or_path})
  except Exception as e:
    return jsonify({"error": str(e)}), 500


@visual_bp.route("/api/visual/audio-url-to-video", methods=["POST"])
def audio_url_to_video():
  """Create a video from an audio URL.

  Expected JSON: {"audio_url": "https://..."} OR {"transcript": "..."}
  Steps:
    - If transcript provided, use it directly
    - Else (future) transcribe the audio URL to text
    - Reuse the text-to-video pipeline
    - Upload final video to Cloudinary and return the secure URL
  """
  data = request.get_json(silent=True) or {}
  transcript = data.get("transcript")
  audio_url = data.get("audio_url")
  if not transcript and not audio_url:
    return jsonify({"error": "Provide either 'transcript' or 'audio_url'"}), 400
  try:
    if not transcript:
      transcript = extract_text_from_audio_url(audio_url)
      if not transcript:
        return jsonify({"error": "Transcription produced empty text"}), 422
    url_or_path = generate_video_from_transcript_text(transcript)
    return jsonify({"url": url_or_path})
  except Exception as e:
    return jsonify({"error": str(e)}), 500
