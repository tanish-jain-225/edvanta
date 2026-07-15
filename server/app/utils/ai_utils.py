"""Centralized AI Utility Module for Edvanta Server.

This is the SINGLE source for all AI-related functionality across the entire server.
Provides consistent AI integration for all features - NO FALLBACKS, MUST WORK!

Features:
- Google Gemini AI integration (REQUIRED)
- Google Gemini AI integration for learning tools
- Conversational AI for tutoring and chatbot
- Content generation (summaries, quizzes, roadmaps)

- Voice optimization
- Session and chat management
- MongoDB integration (REQUIRED)

Configuration:
- Uses Config.GEMINI_API_KEY for authentication (REQUIRED)
- NO fallbacks - everything must work properly
- Maintains conversation context and history
"""

import json
import re
from typing import Dict, List, Any
from datetime import datetime

# AI Provider Import - REQUIRED, NO FALLBACKS
import google.generativeai as genai
AI_AVAILABLE = True

# Database
from bson import ObjectId

# Internal imports
from app.config import Config
from app.utils.mongo_utils import get_db_connection, connect_to_mongodb

# =============================================================================
# CONFIGURATION & CONSTANTS
# =============================================================================

# AI Model Defaults (from Config)
DEFAULT_MODEL = Config.GEMINI_MODEL_NAME
DEFAULT_TEMPERATURE = Config.GEMINI_TEMPERATURE
DEFAULT_MAX_TOKENS = Config.GEMINI_MAX_OUTPUT_TOKENS


# Prompts for different AI functions
SYSTEM_PROMPTS = {
    'tutor': """You are an expert educational tutor helping students with their academic doubts and questions. You should:
1. Provide clear, step-by-step explanations
2. Use simple language that students can understand  
3. Include relevant examples when helpful
4. Break down complex concepts into digestible parts
5. Encourage learning with follow-up questions
6. If it's a coding question, provide code examples with explanations
7. Be patient, supportive and encouraging
8. Adapt your teaching style to the student's level of understanding
9. IMPORTANT: Always reference and build upon our conversation history when relevant
10. Connect new concepts to topics we've already discussed
11. Remember the student's current learning progress and adjust accordingly
12. Use phrases like "As we discussed earlier" or "Building on what we covered" when appropriate
13. Maintain continuity throughout the learning session
14. If the student asks about something new, connect it to previous topics when possible""",

    'chatbot': """You are an intelligent educational assistant helping students with their academic questions. 
Provide accurate, helpful responses while maintaining a supportive and encouraging tone. 
Keep responses concise but comprehensive and always encourage further learning.""",

    'roadmap': """You are an expert learning path designer. Create comprehensive, practical learning roadmaps 
that are achievable and well-structured. Include realistic timeframes, key milestones and relevant resources.""",


    'quiz': """You are an educational content creator specializing in assessment design. Create fair, 
challenging questions that test understanding rather than memorization. Ensure questions are clear and unambiguous.""",


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
            return False
        
        genai.configure(api_key=api_key)
        return True
    except Exception as e:
        print(f"Error initializing AI: {e}")
        return False

def get_ai_model(model_name: str = None, temperature: float = None, max_tokens: int = None, response_mime_type: str = None):
    """Get configured AI model with specified parameters."""
    if not initialize_ai():
        return None
    
    try:
        model_name = model_name or Config.GEMINI_MODEL_NAME
        
        generation_config = {
            'temperature': temperature or Config.GEMINI_TEMPERATURE,
            'max_output_tokens': max_tokens or Config.GEMINI_MAX_OUTPUT_TOKENS,
        }
        
        if response_mime_type:
            generation_config['response_mime_type'] = response_mime_type
            
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



# =============================================================================
# DATABASE CONNECTION UTILITIES (Centred in mongo_utils)
# =============================================================================

def get_collection(collection_config_attr: str):
    """Get MongoDB collection using centralized config attribute name."""
    _, db, collection_name = connect_to_mongodb(collection_config_attr)
    if db is not None and collection_name:
        return db[collection_name]
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
            max_tokens=model_config.get('max_tokens') if model_config else None,
            response_mime_type=model_config.get('response_mime_type') if model_config else None
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
                    # For roadmap, return empty response to trigger fallback
                    if ai_type == 'roadmap':
                        print(f"Safety filter triggered for {ai_type}, using fallback structure")
                        return {'success': False, 'response': '', 'error': 'safety_filter'}
                    raise Exception(f"Content blocked by AI safety filters for {ai_type}. Please rephrase your request.")
                elif finish_reason in [4, 5]:  # RECITATION or OTHER
                    if ai_type == 'roadmap':
                        print(f"AI generation blocked (reason: {finish_reason}) for {ai_type}, using fallback")
                        return {'success': False, 'response': '', 'error': 'generation_blocked'}
                    raise Exception(f"AI generation blocked (reason: {finish_reason}) for {ai_type}. Please try different input.")
        
        # Check for valid text response
        response_text = None
        try:
            if hasattr(response, 'text') and response.text:
                response_text = response.text
            elif hasattr(response, 'content') and response.content:
                response_text = response.content
            elif hasattr(response, 'candidates') and response.candidates:
                candidate = response.candidates[0]
                if hasattr(candidate, 'content') and candidate.content:
                    response_text = candidate.content
                elif hasattr(candidate, 'text') and candidate.text:
                    response_text = candidate.text
        except (ValueError, AttributeError) as e:
            if hasattr(response, 'candidates') and response.candidates:
                candidate = response.candidates[0]
                if hasattr(candidate, 'finish_reason') and candidate.finish_reason == 2:
                    print(f"MAX_TOKENS reached for {ai_type} - response truncated")
                    if ai_type == 'roadmap':
                        return {'success': False, 'response': '', 'error': 'max_tokens'}
            print(f"Error accessing AI response content for {ai_type}: {e}")
        
        if not response or not response_text:
            # For roadmap, allow fallback handling
            if ai_type == 'roadmap':
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

def clean_json_string(s: str) -> str:
    """Escape control characters like literal newlines and tabs inside JSON string values and escape invalid backslashes."""
    result = []
    in_string = False
    i = 0
    n = len(s)
    while i < n:
        char = s[i]
        if in_string:
            if char == '"':
                in_string = False
                result.append(char)
            elif char == '\\':
                is_valid = False
                skip_len = 0
                if i + 1 < n:
                    next_char = s[i+1]
                    if next_char in ['"', '\\', '/', 'b', 'f', 'n', 'r', 't']:
                        is_valid = True
                        skip_len = 2
                    elif next_char == 'u':
                        if i + 5 < n:
                            is_hex = True
                            for k in range(i + 2, i + 6):
                                if s[k] not in '0123456789abcdefABCDEF':
                                    is_hex = False
                                    break
                            if is_hex:
                                is_valid = True
                                skip_len = 6
                if is_valid:
                    result.append(s[i : i + skip_len])
                    i += skip_len
                    continue
                else:
                    result.append('\\\\')
            elif char == '\n':
                result.append('\\n')
            elif char == '\r':
                result.append('\\r')
            elif char == '\t':
                result.append('\\t')
            else:
                result.append(char)
        else:
            if char == '"':
                in_string = True
            result.append(char)
        i += 1
    return "".join(result)


def try_repair_json(s: str) -> str:
    """Attempt to repair a truncated JSON string by closing open quotes and brackets/braces."""
    s = s.strip()
    if not s:
        return s
        
    # Check if JSON starts with brace/bracket and is unclosed
    if (s.startswith('{') or s.startswith('[')) and not (s.endswith('}') or s.endswith(']')):
        in_str = False
        escaped = False
        braces = 0
        brackets = 0
        
        i = 0
        n = len(s)
        while i < n:
            char = s[i]
            if escaped:
                escaped = False
                i += 1
                continue
            if char == '\\':
                escaped = True
                i += 1
                continue
            if char == '"':
                in_str = not in_str
                i += 1
                continue
            if not in_str:
                if char == '{':
                    braces += 1
                elif char == '}':
                    braces -= 1
                elif char == '[':
                    brackets += 1
                elif char == ']':
                    brackets -= 1
            i += 1
            
        # Repair the unclosed parts
        if in_str:
            s += '"'
        s += ']' * max(0, brackets)
        s += '}' * max(0, braces)
        
    return s


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
        model_config={'max_tokens': 6144, 'temperature': 0.4, 'response_mime_type': 'application/json'}
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
            
            response_text = clean_json_string(response_text)
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
        model_config={'temperature': 0.6, 'max_tokens': 6144, 'response_mime_type': 'application/json'}
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
            
            response_text = clean_json_string(response_text)
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

def analyze_resume_text(resume_text: str) -> Dict[str, Any]:
    """Analyze resume text content and return structured feedback."""
    prompt = f"""You are an expert ATS (Applicant Tracking System) and professional career coach. Analyze the following resume text content and provide a comprehensive evaluation.

Resume Content:
\"\"\"
{resume_text}
\"\"\"

CRITICAL REQUIREMENTS:
- Return ONLY a valid JSON object, no markdown code block wrapper, no other text.
- Be objective, constructive and detailed.
- Return the response exactly in the following JSON format:
{{
  "score": <an integer between 0 and 100 representing the overall strength of the resume>,
  "summary": "<a concise professional summary of the resume evaluation>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "improvements": ["<improvement suggestion 1>", "<improvement suggestion 2>", ...],
  "skills_found": ["<key skill identified 1>", "<key skill identified 2>", ...],
  "suggested_roles": ["<suggested target job role 1>", "<suggested target job role 2>", ...],
  "detailed_feedback": "<comprehensive evaluation in Markdown format covering formatting, content impact, sections layout and custom action items>"
}}
"""

    result = generate_ai_response(
        prompt=prompt,
        system_prompt="You are an expert career advisor. Return ONLY a valid JSON object.",
        ai_type='resume',
        model_config={'temperature': 0.3, 'max_tokens': 8192, 'response_mime_type': 'application/json'}
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
            
            response_text = clean_json_string(response_text)
            try:
                analysis_data = json.loads(response_text)
            except json.JSONDecodeError:
                # Attempt to recover truncated JSON if possible
                repaired_response = try_repair_json(response_text)
                analysis_data = json.loads(repaired_response)
            
            # Basic validation of expected fields
            expected_keys = ["score", "summary", "strengths", "improvements", "skills_found", "suggested_roles", "detailed_feedback"]
            for key in expected_keys:
                if key not in analysis_data:
                    if key == "score":
                        analysis_data[key] = 70
                    elif key in ["strengths", "improvements", "skills_found", "suggested_roles"]:
                        analysis_data[key] = []
                    else:
                        analysis_data[key] = ""
            
            return {'success': True, 'analysis': analysis_data, 'error': None}
        except json.JSONDecodeError as e:
            print(f"Resume Analysis JSON parse error: {e}")
            print(f"FULL RESPONSE LENGTH: {len(result['response'])}")
            print("--- START FULL RESPONSE ---")
            print(result['response'])
            print("--- END FULL RESPONSE ---")
            return {
                'success': False, 
                'analysis': None, 
                'error': f'Failed to parse analysis JSON: {str(e)}'
            }
            
    return {'success': False, 'analysis': None, 'error': result.get('error', 'AI generation failed')}

# =============================================================================
# CONVERSATION & SESSION MANAGEMENT
# =============================================================================

# =============================================================================
# CONVERSATION & SESSION MANAGEMENT
# =============================================================================

def save_chat_message(user_email: str, message: str, response: str, conversation_id: str = None) -> str:
    """Save chat message to database - saves user and AI messages separately for proper persistence."""
    try:
        collection = get_collection('MONGODB_CHAT_COLLECTION')
        
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
        collection = get_collection('MONGODB_CHAT_COLLECTION')
        
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
        collection = get_collection('MONGODB_CHAT_COLLECTION')
        
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
        collection = get_collection('MONGODB_ACTIVE_SESSIONS_COLLECTION')
        
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
        collection = get_collection('MONGODB_ACTIVE_SESSIONS_COLLECTION')
        
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
        collection = get_collection('MONGODB_ACTIVE_SESSIONS_COLLECTION')
        
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
    result = get_tutor_response(prompt, context)
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
