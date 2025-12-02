# Quiz AI Help Utils using centralized AI system

import json
import os
from .ai_utils import generate_quiz_content

def create_quiz(topic: str, difficulty: str = "medium", num_questions: int = 10):
    """
    Simple function to create quizzes using centralized AI system with fallback.
    """

    # Try AI generation first using centralized system
    try:
        
        result = generate_quiz_content(topic, difficulty, num_questions)
        
        if result['success']:
            # Format to match expected structure
            quiz_data = {
                "topic": topic,
                "difficulty": difficulty,
                "questions": []
            }
            
            for i, question in enumerate(result['questions'], 1):
                quiz_data["questions"].append({
                    "id": i,
                    "question": question.get("question", ""),
                    "options": question.get("options", []),
                    "correctAnswer": question["options"][question["correct_answer"]] if question.get("correct_answer", 0) < len(question.get("options", [])) else question.get("options", [""])[0]
                })
            
            return quiz_data
        else:
            raise Exception("AI generation failed")

    except Exception as e:
        raise e
