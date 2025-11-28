"""Route package initializer.

Exports all blueprints for easy importing and testing.
"""

from .visual import visual_bp
from .chatbot import chatbot_bp
from .quizzes import quizzes_bp
from .tutor import tutor_bp
from .roadmap import roadmap_bp
from .resume import resume_bp
from .user_stats import user_stats_bp

__all__ = [
    'visual_bp',
    'chatbot_bp', 
    'quizzes_bp',
    'tutor_bp',
    'roadmap_bp',
    'resume_bp',
    'user_stats_bp'
]
