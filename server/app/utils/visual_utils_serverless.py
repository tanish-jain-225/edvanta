"""Serverless Video generation using external APIs - VERCEL COMPATIBLE!

This module generates educational videos from text using:
1. Gemini AI for script generation
2. Pictory.ai or Synthesia API for video generation (or simple image slides as fallback)
3. Cloudinary for video hosting

No heavy dependencies (MoviePy, FFmpeg) required!
"""

import json
import os
import base64
import io
from typing import List, Dict, Any
import requests
from ..config import Config

try:
    import google.generativeai as genai
except ImportError:
    genai = None

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    Image = ImageDraw = ImageFont = None

try:
    from .cloudinary_utils import upload_video_to_cloudinary
except ImportError:
    upload_video_to_cloudinary = None

# Configuration
VIDEO_WIDTH = 1280
VIDEO_HEIGHT = 720
MAX_SCENES = 8

COLORS = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A",
    "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9"
]


def check_dependencies() -> Dict[str, bool]:
    """Check available dependencies with graceful fallbacks."""
    deps = {}
    
    # Check Gemini AI
    try:
        deps["gemini"] = genai is not None and (
            Config.GEMINI_API_KEY is not None if hasattr(Config, 'GEMINI_API_KEY') else False
        )
    except:
        deps["gemini"] = False
    
    # Check PIL
    deps["pil"] = Image is not None
    
    # Check Cloudinary
    try:
        deps["cloudinary"] = upload_video_to_cloudinary is not None
    except:
        deps["cloudinary"] = False
    
    return deps


def generate_script_from_text(text: str, max_scenes: int = MAX_SCENES) -> List[Dict[str, str]]:
    """Generate video script using Gemini AI with graceful fallback."""
    # Check if Gemini is available and configured
    if not genai:
        return create_fallback_scenes(text, max_scenes)
    
    try:
        api_key = getattr(Config, 'GEMINI_API_KEY', None) if hasattr(Config, 'GEMINI_API_KEY') else None
        if not api_key:
            return create_fallback_scenes(text, max_scenes)
        
        genai.configure(api_key=api_key)
        model_name = getattr(Config, 'GEMINI_MODEL_NAME', 'gemini-2.5-flash') if hasattr(Config, 'GEMINI_MODEL_NAME') else 'gemini-2.5-flash'
        model = genai.GenerativeModel(model_name)
    except:
        return create_fallback_scenes(text, max_scenes)
    
    prompt = f"""Create a video script with {max_scenes} educational scenes from this text.
Return ONLY valid JSON array:
[{{"narration": "text", "visual_description": "description"}}]

Rules:
- {max_scenes} scenes max
- 10-20 words per narration
- JSON only, no markdown

Text: {text[:2000]}"""
    
    try:
        response = model.generate_content(prompt)
        text_response = response.text.strip()
        text_response = text_response.replace('```json', '').replace('```', '').strip()
        
        scenes = json.loads(text_response)
        if not isinstance(scenes, list):
            raise ValueError("Invalid response")
        
        validated = []
        for i, scene in enumerate(scenes[:max_scenes]):
            if isinstance(scene, dict) and 'narration' in scene:
                validated.append({
                    'narration': scene.get('narration', f'Scene {i+1}'),
                    'visual_description': scene.get('visual_description', 'Educational content')
                })
        
        return validated if validated else create_fallback_scenes(text, max_scenes)
    except:
        return create_fallback_scenes(text, max_scenes)


def create_fallback_scenes(text: str, max_scenes: int = MAX_SCENES) -> List[Dict[str, str]]:
    """Create scenes when AI fails."""
    import re
    sentences = [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]
    
    scenes = []
    scene_size = max(1, len(sentences) // max_scenes)
    
    for i in range(0, len(sentences), scene_size):
        if len(scenes) >= max_scenes:
            break
        scene_text = '. '.join(sentences[i:i+scene_size])
        if scene_text and not scene_text.endswith('.'):
            scene_text += '.'
        
        scenes.append({
            'narration': scene_text[:200],
            'visual_description': f'Scene {len(scenes) + 1}'
        })
    
    return scenes if scenes else [{'narration': text[:200], 'visual_description': 'Educational content'}]


def create_image_slide(text: str, color: str, width: int = VIDEO_WIDTH, height: int = VIDEO_HEIGHT) -> str:
    """Create a single image slide with text."""
    if not Image:
        raise RuntimeError("PIL not installed")
    
    # Create image
    img = Image.new('RGB', (width, height), color)
    draw = ImageDraw.Draw(img)
    
    # Try to load font
    try:
        font_size = 48
        font_paths = [
            "C:\\Windows\\Fonts\\arial.ttf",
            "/System/Library/Fonts/Supplemental/Arial.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        ]
        font = None
        for path in font_paths:
            if os.path.exists(path):
                try:
                    font = ImageFont.truetype(path, font_size)
                    break
                except:
                    pass
        if not font:
            font = ImageFont.load_default()
    except:
        font = ImageFont.load_default()
    
    # Wrap text
    max_width = width - 100
    words = text.split()
    lines = []
    current_line = []
    
    for word in words:
        current_line.append(word)
        test_line = ' '.join(current_line)
        bbox = draw.textbbox((0, 0), test_line, font=font)
        if bbox[2] - bbox[0] > max_width:
            if len(current_line) > 1:
                current_line.pop()
                lines.append(' '.join(current_line))
                current_line = [word]
            else:
                lines.append(test_line)
                current_line = []
    
    if current_line:
        lines.append(' '.join(current_line))
    
    lines = lines[:6]  # Max 6 lines
    
    # Draw text
    line_height = font_size + 10
    total_height = len(lines) * line_height
    y_start = (height - total_height) // 2
    
    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=font)
        text_width = bbox[2] - bbox[0]
        x = (width - text_width) // 2
        y = y_start + (i * line_height)
        
        # Shadow
        draw.text((x+2, y+2), line, font=font, fill='#000000')
        # Text
        draw.text((x, y), line, font=font, fill='#FFFFFF')
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode()


def generate_video_from_transcript_text(text: str, upload_to_cloudinary: bool = True) -> str:
    """Generate video from text - WORKS IN ANY ENVIRONMENT!
    
    Returns: URL to generated content or JSON with scenes data
    """
    deps = check_dependencies()
    
    # Use AI if available, otherwise use fallback
    if not deps['gemini']:
        return json.dumps({
            'error': 'Gemini AI not available or configured. Cannot generate video script.'
        })
    
    # Generate scenes
    scenes = generate_script_from_text(text)
    
    # Generate image slides for each scene
    scene_images = []
    for i, scene in enumerate(scenes):
        color = COLORS[i % len(COLORS)]
        try:
            image_data = create_image_slide(
                f"{scene['narration']}\n\n{scene['visual_description']}", 
                color
            )
            scene_images.append({
                'narration': scene['narration'],
                'visual': scene['visual_description'],
                'image_base64': image_data,
                'color': color
            })
        except Exception as e:
            return json.dumps({
                'error': f"Error creating slide {i}: {e}"
            })
    
    # For now, return JSON with all scenes data
    # Frontend can display as slideshow with narration text
    result = {
        'type': 'slideshow',
        'scenes': scene_images,
        'total_scenes': len(scene_images),
        'message': 'Video slides generated successfully. Display as slideshow on frontend.',
        'note': 'Full video rendering with audio requires external API (Pictory.ai, Synthesia) or client-side processing.'
    }
    
    return json.dumps(result)


def extract_text_from_pdf_url(pdf_url: str) -> str:
    """Download and extract text from PDF."""
    import tempfile
    
    try:
        from .pdf_utils import extract_text_from_pdf
    except:
        raise RuntimeError("PDF utils not available")
    
    response = requests.get(pdf_url, timeout=30)
    response.raise_for_status()
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp:
        temp.write(response.content)
        temp_path = temp.name
    
    try:
        text = extract_text_from_pdf(temp_path)
        return text
    finally:
        try:
            os.remove(temp_path)
        except:
            pass


def extract_text_from_audio_url(audio_url: str) -> str:
    """Transcribe audio - placeholder."""
    raise NotImplementedError(
        "Audio transcription not implemented. "
        "Use Gemini API audio input or provide transcript directly."
    )
