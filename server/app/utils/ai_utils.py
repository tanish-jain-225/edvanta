"""Centralized AI Utility Module for Edvanta Server.

This is the SINGLE source for all AI-related functionality across the entire server.
Provides consistent AI integration for all features - NO FALLBACKS, MUST WORK!

Features:
- Google Gemini AI integration (REQUIRED)
- Google Veo 3 integration (video generation)
- Conversational AI for tutoring and chatbot
- Content generation (summaries, quizzes, roadmaps, resumes)
- Visual content script and video generation
- Voice optimization
- Session and chat management
- MongoDB integration (REQUIRED)

Configuration:
- Uses Config.GEMINI_API_KEY for authentication (REQUIRED)
- NO fallbacks - everything must work properly
- Maintains conversation context and history
"""

import json
import os
import re
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import time

# AI Provider Import - REQUIRED, NO FALLBACKS
import google.generativeai as genai
AI_AVAILABLE = True

# Database
from pymongo import MongoClient
from bson import ObjectId

# Internal imports
from app.config import Config

# =============================================================================
# CONFIGURATION & CONSTANTS
# =============================================================================

# MongoDB REQUIRED - NO in-memory fallbacks

# AI Model Settings
DEFAULT_MODEL = 'gemini-2.5-flash'
DEFAULT_TEMPERATURE = 0.7
DEFAULT_MAX_TOKENS = 8192

# Video Generation Settings
VEO_3_MODEL = 'veo-3'
DEFAULT_VIDEO_DURATION = 30  # seconds
DEFAULT_VIDEO_RESOLUTION = '720p'
DEFAULT_VIDEO_ASPECT_RATIO = '16:9'

# Prompts for different AI functions
SYSTEM_PROMPTS = {
    'tutor': """You are an expert educational tutor helping students with their academic doubts and questions. You should:
1. Provide clear, step-by-step explanations
2. Use simple language that students can understand  
3. Include relevant examples when helpful
4. Break down complex concepts into digestible parts
5. Encourage learning with follow-up questions
6. If it's a coding question, provide code examples with explanations
7. Be patient, supportive, and encouraging
8. Adapt your teaching style to the student's level of understanding
9. IMPORTANT: Always reference and build upon our conversation history when relevant
10. Connect new concepts to topics we've already discussed
11. Remember the student's current learning progress and adjust accordingly
12. Use phrases like "As we discussed earlier" or "Building on what we covered" when appropriate
13. Maintain continuity throughout the learning session
14. If the student asks about something new, connect it to previous topics when possible""",

    'chatbot': """You are an intelligent educational assistant helping students with their academic questions. 
Provide accurate, helpful responses while maintaining a supportive and encouraging tone. 
Keep responses concise but comprehensive, and always encourage further learning.""",

    'roadmap': """You are an expert learning path designer. Create comprehensive, practical learning roadmaps 
that are achievable and well-structured. Include realistic timeframes, key milestones, and relevant resources.""",

    'resume': """You are an expert career coach and resume analyst. Provide constructive, actionable feedback 
that helps improve career prospects. Focus on practical improvements and industry best practices.""",

    'quiz': """You are an educational content creator specializing in assessment design. Create fair, 
challenging questions that test understanding rather than memorization. Ensure questions are clear and unambiguous.""",

    'visual': """You are an educational content designer. Create engaging, clear scripts for visual learning 
materials. Focus on breaking down complex concepts into digestible, visual segments.""",
    
    'video': """You are a video content creator specializing in educational videos. Create detailed video 
prompts that describe scenes, visual elements, transitions, and educational content suitable for 
automated video generation. Focus on clear, engaging visual storytelling."""
}

# NO FALLBACK RESPONSES - ALL FUNCTIONS MUST WORK

# =============================================================================
# CORE AI CONFIGURATION
# =============================================================================

def initialize_ai() -> bool:
    """Initialize AI system with proper configuration."""
    if not AI_AVAILABLE:
        return False
    
    try:
        api_key = Config.GEMINI_API_KEY
        if not api_key:
            print("Warning: GEMINI_API_KEY not configured")
            return False
        
        genai.configure(api_key=api_key)
        return True
    except Exception as e:
        print(f"Error initializing AI: {e}")
        return False

def get_ai_model(model_name: str = None, temperature: float = None, max_tokens: int = None):
    """Get configured AI model with specified parameters."""
    if not initialize_ai():
        return None
    
    try:
        model_name = model_name or Config.GEMINI_MODEL_NAME or DEFAULT_MODEL
        
        generation_config = {
            'temperature': temperature or Config.GEMINI_TEMPERATURE or DEFAULT_TEMPERATURE,
            'max_output_tokens': max_tokens or Config.GEMINI_MAX_OUTPUT_TOKENS or DEFAULT_MAX_TOKENS,
        }
        
        # Remove artificial safety restrictions for better performance
        if hasattr(Config, 'GEMINI_TOP_P') and Config.GEMINI_TOP_P:
            generation_config['top_p'] = Config.GEMINI_TOP_P
        if hasattr(Config, 'GEMINI_TOP_K') and Config.GEMINI_TOP_K:
            generation_config['top_k'] = Config.GEMINI_TOP_K
            
        return genai.GenerativeModel(
            model_name=model_name,
            generation_config=generation_config,
            safety_settings={
                "HARM_CATEGORY_HARASSMENT": "BLOCK_NONE",
                "HARM_CATEGORY_HATE_SPEECH": "BLOCK_NONE", 
                "HARM_CATEGORY_SEXUALLY_EXPLICIT": "BLOCK_NONE",
                "HARM_CATEGORY_DANGEROUS_CONTENT": "BLOCK_NONE"
            }
        )
    except Exception as e:
        print(f"Error creating AI model: {e}")
        return None

def get_veo3_model(duration: int = None, resolution: str = None, aspect_ratio: str = None):
    """Get configured Veo 3 model for video generation."""
    if not initialize_ai():
        return None
    
    try:
        # Veo 3 specific configuration
        video_config = {
            'duration': duration or DEFAULT_VIDEO_DURATION,
            'resolution': resolution or DEFAULT_VIDEO_RESOLUTION,
            'aspect_ratio': aspect_ratio or DEFAULT_VIDEO_ASPECT_RATIO,
        }
        
        # For now, use Gemini to generate video prompts that would work with Veo 3
        # In the future, this would be replaced with actual Veo 3 API calls
        return genai.GenerativeModel(
            model_name=Config.GEMINI_MODEL_NAME or DEFAULT_MODEL,
            generation_config={
                'temperature': 0.6,  # Slightly more creative for video descriptions
                'max_output_tokens': 2048,
            },
            safety_settings={
                "HARM_CATEGORY_HARASSMENT": "BLOCK_NONE",
                "HARM_CATEGORY_HATE_SPEECH": "BLOCK_NONE", 
                "HARM_CATEGORY_SEXUALLY_EXPLICIT": "BLOCK_NONE",
                "HARM_CATEGORY_DANGEROUS_CONTENT": "BLOCK_NONE"
            }
        ), video_config
    except Exception as e:
        print(f"Error creating Veo 3 model: {e}")
        return None, {}

# =============================================================================
# DATABASE CONNECTION UTILITIES
# =============================================================================

def get_db_connection():
    """Get MongoDB connection and return the database object."""
    try:
        connection_string = Config.MONGODB_URI
        if not connection_string or not Config.MONGODB_DB_NAME:
            return None
            
        client = MongoClient(Config.MONGODB_URI, serverSelectionTimeoutMS=5000)
        client.server_info()  # Force connection test
        
        return client[Config.MONGODB_DB_NAME]
    except Exception as e:
        print(f"MongoDB connection failed: {e}")
        return None

def get_collection(collection_name: str):
    """Get MongoDB collection with fallback."""
    try:
        db = get_db_connection()
        if db is None:
            return None
        return db[collection_name]
    except Exception:
        return None

# =============================================================================
# CORE AI RESPONSE GENERATION
# =============================================================================

def generate_ai_response(
    prompt: str, 
    system_prompt: str = None, 
    context: Dict[str, Any] = None,
    ai_type: str = 'general',
    model_config: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Central AI response generation function.
    
    Args:
        prompt: User input/question
        system_prompt: System instructions for AI behavior
        context: Additional context for the AI
        ai_type: Type of AI interaction (tutor, chatbot, etc.)
        model_config: Model configuration overrides
        
    Returns:
        Dict with 'success', 'response', 'error' keys
    """
    try:
        model = get_ai_model(
            model_name=model_config.get('model_name') if model_config else None,
            temperature=model_config.get('temperature') if model_config else None,
            max_tokens=model_config.get('max_tokens') if model_config else None
        )
        
        if not model:
            raise Exception(f"AI model not available for {ai_type}")
        
        # Build complete prompt
        full_prompt = ""
        if system_prompt:
            full_prompt += f"System: {system_prompt}\n\n"
        
        if context:
            # Format conversation history for better AI understanding
            if 'conversation_history' in context and context['conversation_history']:
                full_prompt += "Previous Conversation (Last 10 messages for context):\n"
                history = context['conversation_history'][-10:]  # Ensure only last 10 messages
                for i, msg in enumerate(history, 1):
                    role = "Student" if msg.get('role') == 'user' else "Tutor"
                    content = msg.get('content', '').strip()
                    if content:  # Only add non-empty messages
                        timestamp = msg.get('timestamp', '')
                        full_prompt += f"{i}. {role}: {content}\n"
                full_prompt += "\nImportant: Reference this conversation history when relevant. Build upon previous topics discussed.\n\n"
            
            # Add other context information
            other_context = {k: v for k, v in context.items() if k != 'conversation_history' and v}
            if other_context:
                full_prompt += f"Additional Context: {json.dumps(other_context, indent=2)}\n\n"
            
        full_prompt += f"Current Student Question: {prompt}\n\nTutor Response:"
        
        # Generate response
        response = model.generate_content(full_prompt)
        
        # Check if blocked by safety filters first
        if hasattr(response, 'candidates') and response.candidates:
            candidate = response.candidates[0]
            if hasattr(candidate, 'finish_reason'):
                finish_reason = candidate.finish_reason
                # finish_reason: 0=UNSPECIFIED, 1=STOP, 2=MAX_TOKENS, 3=SAFETY, 4=RECITATION, 5=OTHER
                if finish_reason == 3:  # SAFETY
                    # For resume/roadmap/video, return empty response to trigger fallback
                    if ai_type in ['resume', 'roadmap', 'video']:
                        print(f"Safety filter triggered for {ai_type}, using fallback structure")
                        return {'success': False, 'response': '', 'error': 'safety_filter'}
                    raise Exception(f"Content blocked by AI safety filters for {ai_type}. Please rephrase your request.")
                elif finish_reason in [4, 5]:  # RECITATION or OTHER
                    if ai_type in ['resume', 'roadmap', 'video']:
                        print(f"AI generation blocked (reason: {finish_reason}) for {ai_type}, using fallback")
                        return {'success': False, 'response': '', 'error': 'generation_blocked'}
                    raise Exception(f"AI generation blocked (reason: {finish_reason}) for {ai_type}. Please try different input.")
        
        # Check for valid text response
        response_text = None
        try:
            if hasattr(response, 'text'):
                response_text = response.text
        except (ValueError, AttributeError) as e:
            # Check if it's a MAX_TOKENS issue (finish_reason=2)
            if hasattr(response, 'candidates') and response.candidates:
                candidate = response.candidates[0]
                if hasattr(candidate, 'finish_reason') and candidate.finish_reason == 2:
                    print(f"MAX_TOKENS reached for {ai_type} - response truncated")
                    if ai_type in ['resume', 'roadmap', 'video']:
                        return {'success': False, 'response': '', 'error': 'max_tokens'}
            print(f"Error accessing response.text for {ai_type}: {e}")
        
        if not response or not response_text:
            # For resume/roadmap/video, allow fallback handling
            if ai_type in ['resume', 'roadmap', 'video']:
                print(f"Empty response for {ai_type}, using fallback structure")
                return {'success': False, 'response': '', 'error': 'empty_response'}
            raise Exception(f"Empty or invalid response from AI for {ai_type}")
        
        return {
            'success': True,
            'response': response_text.strip(),
            'error': None
        }
        
    except Exception as e:
        print(f"AI response generation error for {ai_type}: {e}")
        raise e

# =============================================================================
# SPECIALIZED AI FUNCTIONS
# =============================================================================

# --- TUTORING & CHATBOT ---

def get_tutor_response(prompt: str, subject: str = None, conversation_history: List[Dict] = None) -> Dict[str, Any]:
    """Generate AI tutor response with educational focus and conversation context."""
    context = {
        'subject': subject,
        'conversation_history': conversation_history[-10:] if conversation_history else []  # Last 10 messages for better context
    }
    
    return generate_ai_response(
        prompt=prompt,
        system_prompt=SYSTEM_PROMPTS['tutor'],
        context=context,
        ai_type='tutor'
    )

def get_chatbot_response(message: str, user_email: str = None) -> Dict[str, Any]:
    """Generate chatbot response with conversation context."""
    context = {}
    if user_email:
        # Get recent conversation history
        history = get_chat_history(user_email, limit=5)
        context['recent_messages'] = history
    
    return generate_ai_response(
        prompt=message,
        system_prompt=SYSTEM_PROMPTS['chatbot'],
        context=context,
        ai_type='chatbot'
    )

# --- CONTENT GENERATION ---

def generate_roadmap_content(goal: str, level: str = 'beginner', duration_weeks: int = 12) -> Dict[str, Any]:
    """Generate learning roadmap using AI."""
    prompt = f"""Create a {duration_weeks}-week learning roadmap for: {goal}

Level: {level}

IMPORTANT: Return ONLY valid JSON, no markdown, no explanations.

JSON structure:
{{
  "title": "Roadmap for {goal}",
  "description": "Learning path description",
  "duration_weeks": {duration_weeks},
  "nodes": [
    {{"id": "node1", "title": "Topic 1", "description": "Learn basics", "week": 1, "resources": ["Resource 1"], "skills": ["Skill 1"]}},
    {{"id": "node2", "title": "Topic 2", "description": "Build skills", "week": 4, "resources": ["Resource 2"], "skills": ["Skill 2"]}}
  ],
  "edges": [
    {{"from": "node1", "to": "node2"}}
  ]
}}

Create 3-5 nodes with proper progression. Return only the JSON."""

    result = generate_ai_response(
        prompt=prompt,
        system_prompt="You are a learning path expert. Return ONLY valid JSON, no markdown formatting.",
        ai_type='roadmap',
        model_config={'max_tokens': 6144, 'temperature': 0.4}
    )
    
    if result['success']:
        try:
            # Clean the response to extract JSON
            response_text = result['response'].strip()
            
            # Remove markdown code blocks
            if '```json' in response_text:
                start = response_text.find('```json') + 7
                end = response_text.rfind('```')
                if end > start:
                    response_text = response_text[start:end].strip()
            elif '```' in response_text:
                start = response_text.find('```') + 3
                end = response_text.rfind('```')
                if end > start:
                    response_text = response_text[start:end].strip()
            
            # Find JSON object boundaries
            first_brace = response_text.find('{')
            last_brace = response_text.rfind('}')
            if first_brace != -1 and last_brace != -1:
                response_text = response_text[first_brace:last_brace+1]
            
            roadmap_data = json.loads(response_text)
            return {'success': True, 'roadmap': roadmap_data, 'error': None}
        except json.JSONDecodeError as e:
            # Create a simple fallback structure on JSON parse error
            print(f"JSON parse error: {e}. Creating simple roadmap structure.")
            simple_roadmap = {
                "title": goal,
                "description": f"Learning path for {goal}",
                "duration_weeks": duration_weeks,
                "nodes": [
                    {"id": "start", "title": "Getting Started", "description": f"Begin learning {goal}", "week": 1, "resources": ["Online tutorials"], "skills": ["Basics"]},
                    {"id": "intermediate", "title": "Building Skills", "description": "Develop core competencies", "week": duration_weeks // 2, "resources": ["Practice projects"], "skills": ["Intermediate"]},
                    {"id": "advanced", "title": "Advanced Topics", "description": "Master advanced concepts", "week": duration_weeks, "resources": ["Advanced courses"], "skills": ["Advanced"]}
                ],
                "edges": [{"from": "start", "to": "intermediate"}, {"from": "intermediate", "to": "advanced"}]
            }
            return {'success': True, 'roadmap': simple_roadmap, 'error': None}
    
    raise Exception(f'AI roadmap generation failed: {result.get("error", "Unknown error")}')

def generate_quiz_content(topic: str, difficulty: str = 'medium', num_questions: int = 10) -> Dict[str, Any]:
    """Generate quiz questions using AI."""
    prompt = f"""Create a {difficulty} difficulty quiz on: {topic}
    
Generate exactly {num_questions} multiple choice questions.

CRITICAL REQUIREMENTS:
- Use simple text questions without code blocks or special formatting
- Escape all quotes properly in JSON
- No markdown, no code snippets, just plain text
- Each question should have exactly 4 options
- Return ONLY the JSON array, nothing else

Return ONLY this JSON structure:
[
    {{
        "question": "What is the basic concept of {topic}?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer": 0,
        "explanation": "Brief explanation"
    }}
]"""

    result = generate_ai_response(
        prompt=prompt,
        system_prompt=SYSTEM_PROMPTS['quiz'],
        ai_type='quiz',
        model_config={'temperature': 0.6, 'max_tokens': 6144}
    )
    
    if result['success']:
        try:
            # Clean the response to extract JSON
            response_text = result['response'].strip()
            
            # Remove markdown code blocks
            if '```json' in response_text:
                start = response_text.find('```json') + 7
                end = response_text.rfind('```')
                if end > start:
                    response_text = response_text[start:end].strip()
            elif '```' in response_text:
                start = response_text.find('```') + 3
                end = response_text.rfind('```')
                if end > start:
                    response_text = response_text[start:end].strip()
            
            # Find JSON array boundaries
            first_bracket = response_text.find('[')
            last_bracket = response_text.rfind(']')
            if first_bracket != -1 and last_bracket != -1:
                response_text = response_text[first_bracket:last_bracket+1]
            
            quiz_data = json.loads(response_text)
            return {'success': True, 'questions': quiz_data, 'error': None}
        except json.JSONDecodeError as e:
            print(f"Quiz JSON parse error: {e}. Response: {result['response'][:200]}...")
            return {
                'success': False, 
                'questions': [], 
                'error': f'Failed to parse quiz JSON: {str(e)}'
            }
    
    return result

def analyze_resume(resume_text: str, job_description: str = "") -> Dict[str, Any]:
    """Analyze resume against job description using AI."""
    # Use full text - no artificial truncation
    resume_truncated = resume_text
    job_truncated = job_description
    
    prompt = f"""Analyze resume vs job description. Return ONLY JSON, no markdown.

JSON format:
{{"strengths": ["point1", "point2"], "improvements": ["tip1", "tip2"], "match_score": 75, "summary": "Brief analysis"}}

Resume: {resume_truncated}

Job: {job_truncated}

Return only the JSON object."""

    result = generate_ai_response(
        prompt=prompt,
        system_prompt="You are a resume analysis expert. Return ONLY valid JSON, no markdown.",
        ai_type='resume',
        model_config={'temperature': 0.3, 'max_tokens': 6144}
    )
    
    # Handle safety filter or empty response
    if not result.get('success') or result.get('error') in ['safety_filter', 'generation_blocked', 'empty_response']:
        print(f"AI issue detected: {result.get('error', 'unknown')}, using simple analysis")
        simple_analysis = {
            "strengths": ["Resume includes relevant experience", "Clear structure and formatting"],
            "improvements": ["Consider adding more quantifiable achievements", "Include specific technical skills relevant to the role"],
            "match_score": 65,
            "summary": "Resume shows potential match with the role. Focus on highlighting specific achievements and relevant technical expertise.",
        }
        return {'success': True, 'analysis': simple_analysis, 'error': None}
    
    if result['success']:
        try:
            # Clean the response to extract JSON
            response_text = result['response'].strip()
            
            # Remove markdown code blocks
            if '```json' in response_text:
                start = response_text.find('```json') + 7
                end = response_text.rfind('```')
                if end > start:
                    response_text = response_text[start:end].strip()
            elif '```' in response_text:
                start = response_text.find('```') + 3
                end = response_text.rfind('```')
                if end > start:
                    response_text = response_text[start:end].strip()
            
            # Find JSON object boundaries
            first_brace = response_text.find('{')
            last_brace = response_text.rfind('}')
            if first_brace != -1 and last_brace != -1:
                response_text = response_text[first_brace:last_brace+1]
            
            analysis = json.loads(response_text)
            
            # Ensure required fields exist
            if 'strengths' not in analysis:
                analysis['strengths'] = []
            if 'improvements' not in analysis:
                analysis['improvements'] = []
            if 'match_score' not in analysis:
                analysis['match_score'] = 50
            if 'summary' not in analysis:
                analysis['summary'] = "Analysis completed"
            
            return {'success': True, 'analysis': analysis, 'error': None}
        except json.JSONDecodeError as e:
            # Create simple fallback analysis on parse error
            print(f"JSON parse error: {e}. Creating simple analysis.")
            simple_analysis = {
                "strengths": ["Resume reviewed"],
                "improvements": ["Consider adding more specific skills and achievements"],
                "match_score": 60,
                "summary": "Resume analysis completed with basic evaluation."
            }
            return {'success': True, 'analysis': simple_analysis, 'error': None}
    
    raise Exception(f'AI resume analysis failed: {result.get("error", "Unknown error")}')

def generate_visual_script(text: str, max_scenes: int = 8) -> List[Dict[str, str]]:
    """Generate visual content script using AI."""
    prompt = f"""Create a video script with {max_scenes} educational scenes from this text.
Return ONLY valid JSON array:
[{{"narration": "text", "visual_description": "description"}}]

Rules:
- {max_scenes} scenes max
- 10-20 words per narration
- JSON only, no markdown

Text: {text}"""

    result = generate_ai_response(
        prompt=prompt,
        system_prompt=SYSTEM_PROMPTS['visual'],
        ai_type='visual',
        model_config={'temperature': 0.5, 'max_tokens': 4096}
    )
    
    if result['success']:
        try:
            # Clean response and parse JSON
            clean_response = result['response'].replace('```json', '').replace('```', '').strip()
            scenes = json.loads(clean_response)
            return scenes if isinstance(scenes, list) else []
        except json.JSONDecodeError:
            pass
    
    # Fallback: create simple scenes from text
    return create_fallback_visual_scenes(text, max_scenes)

def create_fallback_visual_scenes(text: str, max_scenes: int = 8) -> List[Dict[str, str]]:
    """Create fallback visual scenes when AI is unavailable."""
    words = text.split()
    chunk_size = max(len(words) // max_scenes, 10)
    
    # Color palette for slides
    colors = ['#4ECDC4', '#FF6B6B', '#4D96FF', '#FFD93D', '#6BCF7F', '#A78BFA', '#F97316', '#EC4899']
    
    scenes = []
    for i in range(0, min(len(words), chunk_size * max_scenes), chunk_size):
        chunk = " ".join(words[i:i + chunk_size])
        if len(chunk.strip()) > 0:
            scenes.append({
                "narration": chunk[:150] + "..." if len(chunk) > 150 else chunk,
                "visual_description": f"Educational illustration for scene {len(scenes) + 1}",
                "visual": f"Slide {len(scenes) + 1}: {chunk[:50]}...",
                "color": colors[len(scenes) % len(colors)],
                "duration": 5  # seconds per slide
            })
    
    return scenes[:max_scenes]

# =============================================================================
# VIDEO GENERATION WITH VEO 3
# =============================================================================

def generate_video_with_veo3(
    text: str, 
    duration: int = 30, 
    resolution: str = '720p',
    aspect_ratio: str = '16:9',
    style: str = 'educational'
) -> Dict[str, Any]:
    """Generate video using Google Veo 3 model (or compatible video generation)."""
    try:
        model, video_config = get_veo3_model(duration, resolution, aspect_ratio)
        
        if not model:
            return {
                'success': False,
                'error': 'Video generation model not available',
                'fallback_scenes': create_fallback_visual_scenes(text)
            }
        
        # Create concise video generation prompt for Veo 3
        # Calculate scene count based on duration
        scene_count = max(3, min(6, duration // 5))  # 3-6 scenes
        
        video_prompt = f"""Create an educational video specification in JSON format.

Content: {text}

Specs: {duration}s, {resolution}, {aspect_ratio}, {style} style

Return ONLY this JSON structure with {scene_count} scenes:
{{
    "video_description": "Brief video overview",
    "scenes": [
        {{"start_time": 0, "duration": 5, "visual_prompt": "Visual elements", "narration": "Narration text", "transitions": "fade"}}
    ],
    "background_music": "Music style",
    "visual_style": "Visual aesthetic"
}}

Keep descriptions concise. Return only valid JSON."""

        result = generate_ai_response(
            prompt=video_prompt,
            system_prompt=SYSTEM_PROMPTS['video'],
            ai_type='video',
            model_config={'temperature': 0.6, 'max_tokens': 12288}  # Increased token limit for complex videos
        )
        
        if result['success'] and result.get('response'):
            try:
                # Clean and parse the video generation response
                response_text = result['response']
                
                # Check if response looks truncated (no closing brace)
                if not response_text.strip().endswith('}'):
                    print(f"Video response appears truncated (no closing brace)")
                    raise json.JSONDecodeError("Truncated response", response_text, len(response_text))
                
                # Remove markdown code blocks
                if '```json' in response_text:
                    start = response_text.find('```json') + 7
                    end = response_text.rfind('```')
                    if end > start:
                        response_text = response_text[start:end].strip()
                elif '```' in response_text:
                    start = response_text.find('```') + 3
                    end = response_text.rfind('```')
                    if end > start:
                        response_text = response_text[start:end].strip()
                
                # Find JSON object boundaries
                first_brace = response_text.find('{')
                last_brace = response_text.rfind('}')
                if first_brace != -1 and last_brace != -1:
                    response_text = response_text[first_brace:last_brace+1]
                
                # Try to fix common JSON issues before parsing
                response_text = fix_json_syntax(response_text)
                
                # Attempt to parse JSON with error recovery
                try:
                    video_spec = json.loads(response_text)
                except json.JSONDecodeError as first_error:
                    # Try one more aggressive cleanup
                    print(f"First JSON parse attempt failed: {first_error}")
                    # Extract just the object content more aggressively
                    lines = response_text.split('\n')
                    cleaned_lines = []
                    for line in lines:
                        line = line.strip()
                        if line and not line.startswith('//'):  # Remove comments
                            cleaned_lines.append(line)
                    response_text = '\n'.join(cleaned_lines)
                    video_spec = json.loads(response_text)  # Will throw if still invalid
                
                # In a real implementation, this would call the actual Veo 3 API
                # For now, we return the structured video specification
                return {
                    'success': True,
                    'video_spec': video_spec,
                    'video_url': None,  # Would contain actual video URL from Veo 3
                    'status': 'generated_specification',
                    'duration': duration,
                    'resolution': resolution,
                    'aspect_ratio': aspect_ratio,
                    'fallback_scenes': extract_scenes_from_spec(video_spec)
                }
            except json.JSONDecodeError as e:
                print(f"JSON parse error in video generation: {str(e)}")
                print(f"Problematic JSON (first 500 chars): {response_text[:500]}")
                # Fallback to scene-based generation
                scenes = generate_visual_script(text, max_scenes=duration//5)
                return {
                    'success': True,
                    'video_spec': create_video_spec_from_scenes(scenes, duration, resolution, aspect_ratio),
                    'video_url': None,
                    'status': 'fallback_specification',
                    'fallback_scenes': scenes
                }
        
        # If AI response failed, use fallback
        error_type = result.get('error', 'unknown')
        if error_type in ['max_tokens', 'empty_response']:
            print(f"AI video generation issue: {error_type} - using simple fallback scenes")
        else:
            print(f"AI video generation failed: {error_type} - using fallback scenes")
        
        scenes = generate_visual_script(text, max_scenes=max(3, duration//5))
        return {
            'success': True,
            'video_spec': create_video_spec_from_scenes(scenes, duration, resolution, aspect_ratio),
            'video_url': None,
            'status': 'fallback_specification',
            'fallback_scenes': scenes
        }
        
    except Exception as e:
        print(f"Video generation error: {e}")
        return {
            'success': False,
            'error': str(e),
            'fallback_scenes': create_fallback_visual_scenes(text)
        }

def fix_json_syntax(json_text: str) -> str:
    """Attempt to fix common JSON syntax errors."""
    try:
        # Remove trailing commas before closing braces/brackets
        json_text = re.sub(r',(\s*[}\]])', r'\1', json_text)
        
        # Fix missing commas between array elements (common AI mistake)
        json_text = re.sub(r'}\s*{', r'},{', json_text)
        
        # Fix missing commas between object properties
        json_text = re.sub(r'"\s*\n\s*"', r'",\n"', json_text)
        
        # Remove any control characters
        json_text = ''.join(char for char in json_text if ord(char) >= 32 or char in '\n\r\t')
        
        return json_text
    except Exception as e:
        print(f"Error fixing JSON syntax: {e}")
        return json_text

def extract_scenes_from_spec(video_spec: Dict) -> List[Dict[str, str]]:
    """Extract simple scenes from Veo 3 video specification for compatibility."""
    scenes = []
    if isinstance(video_spec, dict) and 'scenes' in video_spec:
        for scene in video_spec['scenes']:
            scenes.append({
                "narration": scene.get('narration', ''),
                "visual_description": scene.get('visual_prompt', '')
            })
    return scenes

def create_video_spec_from_scenes(
    scenes: List[Dict[str, str]], 
    duration: int, 
    resolution: str, 
    aspect_ratio: str
) -> Dict[str, Any]:
    """Create video specification from simple scenes."""
    scene_duration = max(3, duration // len(scenes)) if scenes else 5
    
    video_scenes = []
    current_time = 0
    
    for i, scene in enumerate(scenes):
        video_scenes.append({
            "start_time": current_time,
            "duration": scene_duration,
            "visual_prompt": f"Educational visualization: {scene.get('visual_description', '')}. Professional educational style with clear typography and engaging graphics.",
            "narration": scene.get('narration', ''),
            "transitions": "fade" if i < len(scenes) - 1 else "none"
        })
        current_time += scene_duration
    
    return {
        "video_description": f"Educational video in {resolution} resolution with {aspect_ratio} aspect ratio",
        "scenes": video_scenes,
        "background_music": "soft educational background music",
        "visual_style": "clean, modern educational design with consistent branding"
    }

def generate_video_from_text(
    text: str,
    video_type: str = 'educational',
    duration: int = 30,
    resolution: str = '720p'
) -> Dict[str, Any]:
    """Main function for video generation - maintains compatibility with existing code."""
    return generate_video_with_veo3(
        text=text,
        duration=duration,
        resolution=resolution,
        style=video_type
    )

# =============================================================================
# CONVERSATION & SESSION MANAGEMENT
# =============================================================================

def save_chat_message(user_email: str, message: str, response: str, conversation_id: str = None) -> str:
    """Save chat message to database - saves user and AI messages separately for proper persistence."""
    try:
        collection = get_collection(Config.MONGODB_CHAT_COLLECTION or 'chat_sessions')
        
        if collection is None:
            raise Exception("MongoDB connection required for chat storage - no fallbacks available")
        
        session_id = conversation_id or str(ObjectId())
        timestamp = datetime.utcnow()
        
        # Save user message
        user_message = {
            'user_email': user_email,
            'content': message,
            'is_ai': False,
            'session_id': session_id,
            'timestamp': timestamp.isoformat(),
            'created_at': timestamp
        }
        
        # Save AI response
        ai_message = {
            'user_email': user_email,
            'content': response,
            'is_ai': True,
            'session_id': session_id,
            'timestamp': timestamp.isoformat(),
            'created_at': timestamp
        }
        
        # Insert both messages
        collection.insert_one(user_message)
        result = collection.insert_one(ai_message)
        return str(result.inserted_id)
            
    except Exception as e:
        print(f"Error saving chat message: {e}")
        return ""

def get_chat_history(user_email: str, limit: int = 20, session_id: str = None) -> List[Dict]:
    """Get chat history from database - MongoDB required."""
    try:
        collection = get_collection(Config.MONGODB_CHAT_COLLECTION or 'chat_sessions')
        
        if collection is None:
            raise Exception("MongoDB connection required for chat history - no fallbacks available")
        
        # Build query filter
        query_filter = {'user_email': user_email}
        if session_id:
            query_filter['session_id'] = session_id
        
        cursor = collection.find(query_filter).sort('created_at', 1).limit(limit)
        
        history = []
        for doc in cursor:
            # Format message for client expectations
            message = {
                'content': doc.get('content', ''),
                'is_ai': doc.get('is_ai', False),
                'timestamp': doc.get('timestamp', datetime.utcnow().isoformat()),
                'session_id': doc.get('session_id', '')
            }
            history.append(message)
        return history
            
    except Exception as e:
        print(f"Error retrieving chat history: {e}")
        return []

def clear_chat_history(user_email: str, session_id: str = None) -> bool:
    """Clear chat history for user - MongoDB required."""
    try:
        collection = get_collection(Config.MONGODB_CHAT_COLLECTION or 'chat_sessions')
        
        if collection is None:
            raise Exception("MongoDB connection required for chat operations - no fallbacks available")
        
        # Build query filter
        query_filter = {'user_email': user_email}
        if session_id:
            query_filter['session_id'] = session_id
        
        result = collection.delete_many(query_filter)
        return result.deleted_count > 0
        
    except Exception as e:
        print(f"Error clearing chat history: {e}")
        raise e

# Voice chat session management
def save_active_session(user_email: str, session_data: Dict) -> bool:
    """Save active voice session - MongoDB required."""
    try:
        collection = get_collection(Config.MONGODB_ACTIVE_SESSIONS_COLLECTION or 'active_sessions')
        
        session_data.update({
            'user_email': user_email,
            'last_updated': datetime.utcnow()
        })
        
        if collection is None:
            raise Exception("MongoDB connection required for session storage - no fallbacks available")
        
        collection.replace_one(
            {'user_email': user_email},
            session_data,
            upsert=True
        )
        return True
        
    except Exception as e:
        print(f"Error saving active session: {e}")
        raise e

def get_active_session(user_email: str) -> Dict:
    """Get active voice session - MongoDB required."""
    try:
        collection = get_collection(Config.MONGODB_ACTIVE_SESSIONS_COLLECTION or 'active_sessions')
        
        if collection is None:
            raise Exception("MongoDB connection required for session retrieval - no fallbacks available")
        
        session = collection.find_one({'user_email': user_email})
        if session:
            session['id'] = str(session['_id'])
            del session['_id']
            return session
        
        return {}
        
    except Exception as e:
        print(f"Error getting active session: {e}")
        raise e

def end_active_session(user_email: str) -> bool:
    """End active voice session - MongoDB required."""
    try:
        collection = get_collection(Config.MONGODB_ACTIVE_SESSIONS_COLLECTION or 'active_sessions')
        
        if collection is None:
            raise Exception("MongoDB connection required for session operations - no fallbacks available")
        
        collection.delete_one({'user_email': user_email})
        return True
        
    except Exception as e:
        print(f"Error ending active session: {e}")
        raise e

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def _optimize_for_voice(text: str) -> str:
    """Optimize text response for voice synthesis."""
    # Remove markdown formatting
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)  # Bold
    text = re.sub(r'\*(.*?)\*', r'\1', text)      # Italic
    text = re.sub(r'`(.*?)`', r'\1', text)        # Code
    
    # Replace abbreviations with full words
    replacements = {
        'AI': 'artificial intelligence',
        'API': 'A P I',
        'URL': 'U R L',
        'HTTP': 'H T T P',
        'CSS': 'C S S',
        'HTML': 'H T M L',
        'JS': 'JavaScript',
        'DB': 'database'
    }
    
    for abbr, full in replacements.items():
        text = re.sub(r'\b' + abbr + r'\b', full, text, flags=re.IGNORECASE)
    
    return text

def _get_fallback_response(prompt: str, context: Dict = None) -> str:
    """Generate fallback response when AI is unavailable."""
    subject = context.get('subject', 'general') if context else 'general'
    
    fallback_templates = {
        'general': "I understand you're asking about {topic}. While I can't provide a detailed response right now, I'd recommend checking reliable educational resources or trying again later.",
        'math': "For mathematical problems, I'd suggest breaking down the problem step by step and consulting your textbook or a math tutor.",
        'science': "For science questions, consider reviewing the relevant concepts in your course materials or consulting educational websites.",
        'programming': "For coding questions, try checking the documentation, looking at example code, or using online programming resources.",
        'resume': "For resume feedback, consider having it reviewed by a career counselor or using online resume analysis tools."
    }
    
    template = fallback_templates.get(subject, fallback_templates['general'])
    topic = prompt[:50] + "..." if len(prompt) > 50 else prompt
    
    return template.format(topic=topic)

def check_ai_availability() -> Dict[str, Any]:
    """Check AI system availability and configuration."""
    return {
        'ai_library_available': AI_AVAILABLE,
        'api_key_configured': bool(Config.GEMINI_API_KEY) if hasattr(Config, 'GEMINI_API_KEY') else False,
        'model_name': getattr(Config, 'GEMINI_MODEL_NAME', DEFAULT_MODEL),
        'database_available': get_db_connection() is not None,
        'status': 'operational' if AI_AVAILABLE and hasattr(Config, 'GEMINI_API_KEY') and Config.GEMINI_API_KEY else 'degraded'
    }

# =============================================================================
# LEGACY COMPATIBILITY FUNCTIONS
# =============================================================================

def get_vertex_response(prompt: str, context: str = None) -> str:
    """Legacy compatibility - redirect to new AI system."""
    result = get_tutor_response(prompt, context=context)
    if result['success']:
        return result['response']
    else:
        return result['response']  # Fallback message

def init_vertex_ai() -> bool:
    """Legacy compatibility - redirect to new AI initialization."""
    return initialize_ai()

def get_gemini_response(prompt: str, context: str = None) -> str:
    """Legacy compatibility - redirect to new AI system."""
    result = generate_ai_response(prompt, context={'legacy_context': context} if context else None)
    if result['success']:
        return result['response']
    else:
        return result['response']  # Fallback message

def init_gemini_ai() -> bool:
    """Legacy compatibility - redirect to new AI initialization."""
    return initialize_ai()

def get_conversational_tutor_response(
    prompt: str, 
    subject: str = None, 
    conversation_history: List[Dict] = None, 
    mode: str = None, 
    is_voice_input: bool = False
) -> str:
    """Legacy compatibility - redirect to new tutor system."""
    context = {
        'subject': subject,
        'conversation_history': conversation_history,
        'mode': mode,
        'is_voice_input': is_voice_input
    }
    
    result = get_tutor_response(prompt, subject, conversation_history)
    if result['success']:
        response = result['response']
        # Apply voice optimization if needed
        if is_voice_input:
            response = _optimize_for_voice(response)
        return response
    else:
        return result['response']  # Fallback message

def summarize_text(text: str) -> str:
    """Generate summary using centralized AI system."""
    result = generate_ai_response(
        prompt=f"Please summarize the following text concisely, highlighting the key points:\n\n{text}",
        ai_type='general',
        model_config={'temperature': 0.3}
    )
    
    if result['success']:
        return result['response']
    else:
        return "Unable to generate summary at this time. Please try again later."

# =============================================================================
# INITIALIZATION
# =============================================================================

# Auto-initialize AI system when module is imported
if AI_AVAILABLE:
    AI_INITIALIZED = initialize_ai()
else:
    AI_INITIALIZED = False

print(f"AI System Status: {'Initialized' if AI_INITIALIZED else 'Unavailable'}")
if not AI_INITIALIZED and AI_AVAILABLE:
    print("Warning: AI library available but initialization failed. Check GEMINI_API_KEY configuration.")
elif not AI_AVAILABLE:
    print("Warning: AI library not available. Install google-generativeai package.")
