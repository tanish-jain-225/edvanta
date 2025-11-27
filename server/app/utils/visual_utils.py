"""Video generation utilities using Gemini API and simple placeholder images.

This module generates educational videos from text using:
1. Gemini AI for script generation and scene breakdown
2. Colored placeholder images (no external image API needed)
3. gTTS for voiceover generation
4. PIL for text overlays
5. MoviePy for video composition

Dependencies:
- GEMINI_API_KEY: Required for AI text generation
- gtts: Text-to-speech (auto-install: pip install gtts)
- PIL/Pillow: Image manipulation (auto-install: pip install pillow)
- moviepy: Video composition (auto-install: pip install moviepy)
- CLOUDINARY_*: Optional for cloud video hosting
"""

import json
import os
import tempfile
import re
from typing import List, Dict, Any
from ..config import Config

# Optional dependencies with graceful fallback
try:
    import google.generativeai as genai
except ImportError:
    genai = None

try:
    from gtts import gTTS
except ImportError:
    gTTS = None

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    Image = ImageDraw = ImageFont = None

try:
    import moviepy
    ImageClip = moviepy.ImageClip
    AudioFileClip = moviepy.AudioFileClip
    concatenate_videoclips = moviepy.concatenate_videoclips
    CompositeVideoClip = moviepy.CompositeVideoClip
    TextClip = getattr(moviepy, 'TextClip', None)
except Exception as e:
    print(f"MoviePy import warning: {e}")
    ImageClip = AudioFileClip = CompositeVideoClip = concatenate_videoclips = TextClip = None

try:
    from .cloudinary_utils import upload_video_to_cloudinary
except ImportError:
    upload_video_to_cloudinary = None

try:
    from .pdf_utils import extract_text_from_pdf
except ImportError:
    extract_text_from_pdf = None


# Video configuration
VIDEO_WIDTH = 1280
VIDEO_HEIGHT = 720
VIDEO_FPS = 24
MAX_SCENES = 8
MIN_SCENE_DURATION = 3
MAX_SCENE_DURATION = 10

# Color palette for placeholder images
COLORS = [
    "#FF6B6B",  # Red
    "#4ECDC4",  # Teal
    "#45B7D1",  # Blue
    "#FFA07A",  # Light Salmon
    "#98D8C8",  # Mint
    "#F7DC6F",  # Yellow
    "#BB8FCE",  # Purple
    "#85C1E9",  # Sky Blue
]


def check_dependencies() -> Dict[str, bool]:
    """Check which optional dependencies are available."""
    return {
        "gemini": genai is not None and Config.GEMINI_API_KEY is not None,
        "gtts": gTTS is not None,
        "pil": Image is not None,
        "moviepy": ImageClip is not None,
        "cloudinary": upload_video_to_cloudinary is not None,
    }


def generate_script_from_text(text: str, max_scenes: int = MAX_SCENES) -> List[Dict[str, str]]:
    """Generate video script with scenes from text using Gemini AI.
    
    Args:
        text: Input text to convert to video script
        max_scenes: Maximum number of scenes to generate
        
    Returns:
        List of scenes, each with 'narration' and 'visual_description'
    """
    if not genai or not Config.GEMINI_API_KEY:
        raise RuntimeError("Gemini API not configured. Set GEMINI_API_KEY in environment.")
    
    # Configure Gemini
    genai.configure(api_key=Config.GEMINI_API_KEY)
    model = genai.GenerativeModel(Config.GEMINI_MODEL_NAME or 'gemini-2.5-flash')
    
    # Create prompt for script generation
    prompt = f"""You are a video script writer. Convert the following text into a video script with {max_scenes} scenes maximum.

For each scene, provide:
1. Narration text (what the voiceover says) - keep it concise, 1-2 sentences
2. Visual description (what appears on screen) - brief description for visual representation

Return ONLY a valid JSON array in this exact format:
[
  {{
    "narration": "Scene 1 narration text here",
    "visual_description": "Simple visual description"
  }},
  {{
    "narration": "Scene 2 narration text here", 
    "visual_description": "Simple visual description"
  }}
]

Important rules:
- Maximum {max_scenes} scenes
- Keep narration concise (10-20 words per scene)
- Return ONLY the JSON array, no other text
- Ensure proper JSON formatting

Input text:
{text[:2000]}"""  # Limit input text to avoid token limits
    
    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Extract JSON from response
        # Remove markdown code blocks if present
        response_text = re.sub(r'```json\s*', '', response_text)
        response_text = re.sub(r'```\s*', '', response_text)
        
        # Parse JSON
        scenes = json.loads(response_text)
        
        # Validate structure
        if not isinstance(scenes, list):
            raise ValueError("Response is not a list")
        
        # Ensure each scene has required fields
        validated_scenes = []
        for i, scene in enumerate(scenes[:max_scenes]):
            if isinstance(scene, dict) and 'narration' in scene:
                validated_scenes.append({
                    'narration': scene.get('narration', f'Scene {i+1}'),
                    'visual_description': scene.get('visual_description', 'Educational content')
                })
        
        if not validated_scenes:
            raise ValueError("No valid scenes generated")
            
        return validated_scenes
        
    except json.JSONDecodeError as e:
        # Fallback: create simple scenes from text
        print(f"JSON parse error: {e}. Using fallback scene generation.")
        return create_fallback_scenes(text, max_scenes)
    except Exception as e:
        print(f"Script generation error: {e}. Using fallback scene generation.")
        return create_fallback_scenes(text, max_scenes)


def create_fallback_scenes(text: str, max_scenes: int = MAX_SCENES) -> List[Dict[str, str]]:
    """Create simple scenes from text when AI generation fails."""
    # Split text into sentences
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    
    # Group sentences into scenes
    scenes = []
    scene_size = max(1, len(sentences) // max_scenes)
    
    for i in range(0, len(sentences), scene_size):
        if len(scenes) >= max_scenes:
            break
        scene_sentences = sentences[i:i+scene_size]
        narration = '. '.join(scene_sentences)
        if narration and not narration.endswith('.'):
            narration += '.'
        
        scenes.append({
            'narration': narration[:200],  # Limit length
            'visual_description': f'Educational content - Scene {len(scenes) + 1}'
        })
    
    return scenes if scenes else [{
        'narration': text[:200],
        'visual_description': 'Educational video content'
    }]


def create_placeholder_image(text: str, color: str, width: int = VIDEO_WIDTH, height: int = VIDEO_HEIGHT) -> str:
    """Create a colored placeholder image with text overlay.
    
    Args:
        text: Text to display on image
        color: Hex color code for background
        width: Image width
        height: Image height
        
    Returns:
        Path to generated image file
    """
    if not Image or not ImageDraw or not ImageFont:
        raise RuntimeError("PIL/Pillow not installed. Install with: pip install pillow")
    
    # Create image with solid color background
    img = Image.new('RGB', (width, height), color)
    draw = ImageDraw.Draw(img)
    
    # Try to load a nice font, fallback to default
    try:
        font_size = 48
        # Try common font locations
        font_paths = [
            "/System/Library/Fonts/Supplemental/Arial.ttf",  # macOS
            "C:\\Windows\\Fonts\\arial.ttf",  # Windows
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",  # Linux
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
    
    # Wrap text to fit width
    max_width = width - 100  # Padding
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
    
    # Limit to 4 lines
    lines = lines[:4]
    
    # Calculate text position (centered)
    line_height = font_size + 10
    total_height = len(lines) * line_height
    y_start = (height - total_height) // 2
    
    # Draw text with shadow for better readability
    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=font)
        text_width = bbox[2] - bbox[0]
        x = (width - text_width) // 2
        y = y_start + (i * line_height)
        
        # Draw shadow
        draw.text((x+2, y+2), line, font=font, fill='#000000')
        # Draw text
        draw.text((x, y), line, font=font, fill='#FFFFFF')
    
    # Save to temp file
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.png')
    img.save(temp_file.name, 'PNG')
    temp_file.close()
    
    return temp_file.name


def generate_audio_from_text(text: str) -> str:
    """Generate audio file from text using gTTS.
    
    Args:
        text: Text to convert to speech
        
    Returns:
        Path to generated audio file
    """
    if not gTTS:
        raise RuntimeError("gTTS not installed. Install with: pip install gtts")
    
    # Create audio
    tts = gTTS(text=text, lang='en', slow=False)
    
    # Save to temp file
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp3')
    tts.save(temp_file.name)
    temp_file.close()
    
    return temp_file.name


def create_scene_clip(scene: Dict[str, str], color: str, min_duration: float = MIN_SCENE_DURATION) -> Any:
    """Create a video clip for one scene.
    
    Args:
        scene: Scene dict with 'narration' and 'visual_description'
        color: Hex color for background
        min_duration: Minimum duration in seconds
        
    Returns:
        MoviePy VideoClip object
    """
    if not ImageClip or not AudioFileClip:
        raise RuntimeError("MoviePy not installed. Install with: pip install moviepy")
    
    # Generate audio
    audio_path = generate_audio_from_text(scene['narration'])
    audio_clip = AudioFileClip(audio_path)
    
    # Duration is audio length or minimum duration, whichever is longer
    duration = max(audio_clip.duration, min_duration)
    duration = min(duration, MAX_SCENE_DURATION)  # Cap at max duration
    
    # Create image with visual description
    image_path = create_placeholder_image(scene['visual_description'], color)
    
    # Create video clip from image (MoviePy 2.x: pass duration to constructor)
    video_clip = ImageClip(image_path, duration=duration)
    video_clip = video_clip.with_audio(audio_clip)
    
    return video_clip


def generate_video_from_scenes(scenes: List[Dict[str, str]], output_path: str = None) -> str:
    """Generate video from scenes.
    
    Args:
        scenes: List of scene dicts
        output_path: Optional output path, otherwise creates temp file
        
    Returns:
        Path to generated video file
    """
    deps = check_dependencies()
    if not deps['moviepy']:
        raise RuntimeError("MoviePy not installed. Install with: pip install moviepy")
    if not deps['gtts']:
        raise RuntimeError("gTTS not installed. Install with: pip install gtts")
    if not deps['pil']:
        raise RuntimeError("PIL/Pillow not installed. Install with: pip install pillow")
    
    # Create clips for each scene
    clips = []
    temp_files = []
    
    try:
        for i, scene in enumerate(scenes):
            color = COLORS[i % len(COLORS)]
            clip = create_scene_clip(scene, color)
            clips.append(clip)
        
        # Concatenate all clips
        final_video = concatenate_videoclips(clips, method="compose")
        
        # Determine output path
        if not output_path:
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4')
            output_path = temp_file.name
            temp_file.close()
        
        # Write video file
        final_video.write_videofile(
            output_path,
            fps=VIDEO_FPS,
            codec='libx264',
            audio_codec='aac',
            temp_audiofile=tempfile.mktemp(suffix='.m4a'),
            remove_temp=True,
            logger=None  # Suppress moviepy progress bar
        )
        
        # Clean up clips
        for clip in clips:
            clip.close()
        
        return output_path
        
    except Exception as e:
        # Clean up on error
        for clip in clips:
            try:
                clip.close()
            except:
                pass
        raise RuntimeError(f"Video generation failed: {e}")


def generate_video_from_transcript_text(text: str, upload_to_cloudinary: bool = True) -> str:
    """Main function: Generate video from text transcript.
    
    Args:
        text: Input text to convert to video
        upload_to_cloudinary: Whether to upload to Cloudinary (if configured)
        
    Returns:
        Video URL (if uploaded to Cloudinary) or local file path
    """
    # Check dependencies
    deps = check_dependencies()
    if not deps['gemini']:
        raise RuntimeError(
            "Gemini API not configured. Set GEMINI_API_KEY in your .env file. "
            "Get your API key from https://makersuite.google.com/app/apikey"
        )
    
    print(f"[Video Generation] Starting for text length: {len(text)}")
    
    # Step 1: Generate script from text
    print("[Video Generation] Step 1: Generating script with Gemini AI...")
    scenes = generate_script_from_text(text)
    print(f"[Video Generation] Generated {len(scenes)} scenes")
    
    # Step 2: Create video from scenes
    print("[Video Generation] Step 2: Creating video clips...")
    video_path = generate_video_from_scenes(scenes)
    print(f"[Video Generation] Video created at: {video_path}")
    
    # Step 3: Upload to Cloudinary if configured
    if upload_to_cloudinary and deps['cloudinary']:
        try:
            print("[Video Generation] Step 3: Uploading to Cloudinary...")
            video_url = upload_video_to_cloudinary(video_path)
            print(f"[Video Generation] Uploaded to: {video_url}")
            
            # Clean up local file after upload
            try:
                os.remove(video_path)
            except:
                pass
            
            return video_url
        except Exception as e:
            print(f"[Video Generation] Cloudinary upload failed: {e}")
            print(f"[Video Generation] Returning local file path instead")
            return video_path
    else:
        print("[Video Generation] Cloudinary not configured, returning local file")
        return video_path


def extract_text_from_pdf_url(pdf_url: str) -> str:
    """Download PDF from URL and extract text.
    
    Args:
        pdf_url: URL to PDF file
        
    Returns:
        Extracted text from PDF
    """
    import requests
    
    # Download PDF
    response = requests.get(pdf_url, timeout=30)
    response.raise_for_status()
    
    # Save to temp file
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
    temp_file.write(response.content)
    temp_file.close()
    
    try:
        # Extract text
        if extract_text_from_pdf:
            text = extract_text_from_pdf(temp_file.name)
        else:
            raise RuntimeError("PDF extraction not available. Install PyPDF2: pip install PyPDF2")
        
        return text
    finally:
        # Clean up
        try:
            os.remove(temp_file.name)
        except:
            pass


def extract_text_from_audio_url(audio_url: str) -> str:
    """Transcribe audio from URL (placeholder - not implemented).
    
    Args:
        audio_url: URL to audio file
        
    Returns:
        Transcribed text
    """
    raise NotImplementedError(
        "Audio transcription is not implemented. "
        "Please provide the 'transcript' directly or integrate with a speech-to-text service."
    )
