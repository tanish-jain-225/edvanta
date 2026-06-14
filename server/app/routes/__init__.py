"""Route package initializer.

Exports all blueprints for easy importing and testing.
"""

from .chatbot import chatbot_bp
from .quizzes import quizzes_bp
from .tutor import tutor_bp
from .roadmap import roadmap_bp
from .user_stats import user_stats_bp
from .resume import resume_bp

__all__ = [
    'chatbot_bp', 
    'quizzes_bp',
    'tutor_bp',
    'roadmap_bp',
    'user_stats_bp',
    'resume_bp'
]
