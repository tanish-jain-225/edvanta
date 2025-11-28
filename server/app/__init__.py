"""Application factory for Edvanta backend."""

from flask import Flask
from flask_cors import CORS
import os

# Load environment variables from a .env file if present (local dev convenience)
try:  # pragma: no cover - optional dependency handling
    from dotenv import load_dotenv
    load_dotenv()
except Exception:  # noqa: BLE001 - broad except acceptable for optional import
    pass

from .config import Config


def create_app() -> Flask:
    """Create and configure the Flask application.

    - Auto-detects environment (development/production) based on deployment platform
    - Loads configuration from Config class / environment variables with fallbacks
    - Enables CORS for all origins by default for maximum compatibility
    - Registers all feature blueprints with graceful error handling
    - Works seamlessly in any environment: local, Vercel, AWS Lambda, Heroku, etc.
    """

    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS to allow all origins for maximum compatibility
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

    # Import and register blueprints with error handling
    blueprints_to_register = [
        ('visual', lambda: __import__('app.routes.visual', fromlist=['visual_bp']).visual_bp),
        ('chatbot', lambda: __import__('app.routes.chatbot', fromlist=['chatbot_bp']).chatbot_bp),
        ('quizzes', lambda: __import__('app.routes.quizzes', fromlist=['quizzes_bp']).quizzes_bp),
        ('tutor', lambda: __import__('app.routes.tutor', fromlist=['tutor_bp']).tutor_bp),
        ('roadmap', lambda: __import__('app.routes.roadmap', fromlist=['roadmap_bp']).roadmap_bp),
        ('resume', lambda: __import__('app.routes.resume', fromlist=['resume_bp']).resume_bp),
        ('user_stats', lambda: __import__('app.routes.user_stats', fromlist=['user_stats_bp']).user_stats_bp),
    ]

    registered_blueprints = []
    for name, blueprint_loader in blueprints_to_register:
        try:
            blueprint = blueprint_loader()
            app.register_blueprint(blueprint)
            registered_blueprints.append(name)
        except Exception as e:
            print(f"Warning: Failed to register {name} blueprint: {e}")
            # Continue without this blueprint instead of failing completely

    print(f"Successfully registered blueprints: {', '.join(registered_blueprints)}")

    @app.route("/", methods=["GET"])
    def health():
        """Health check endpoint with environment info."""
        from .config import Config
        config = Config()
        return {
            "status": "ok", 
            "service": "edvanta-backend",
            "environment": config.ENV,
            "debug": config.DEBUG,
            "registered_blueprints": list(app.blueprints.keys()) if hasattr(app, 'blueprints') else []
        }

    @app.route("/api/runtime-features", methods=["GET"])
    def runtime_features():
        """Report which optional libraries are available at runtime and configuration status."""
        features = {}
        try:
            import importlib
            from .config import Config
            config = Config()

            optional_libs = [
                "google.generativeai",
                "moviepy",
                "gtts", 
                "PIL",
                "whisper",
                "pypdf",
                "cloudinary",
                "pymongo"
            ]
            for lib in optional_libs:
                try:
                    features[lib] = importlib.util.find_spec(lib) is not None
                except Exception:
                    features[lib] = False
                    
            # Configuration status
            config_status = {
                "gemini_api_configured": bool(config.GEMINI_API_KEY),
                "mongodb_configured": bool(config.MONGODB_URI and config.MONGODB_URI != "mongodb://localhost:27017/"),
                "cloudinary_configured": bool(config.CLOUDINARY_CLOUD_NAME),
                "environment": config.ENV,
                "debug_mode": config.DEBUG
            }
            features.update(config_status)
            
        except Exception as e:
            features = {"error": f"runtime check failed: {str(e)}"}

        return {"status": "ok", "features": features}

    # Ensure CORS headers are present on every response. This complements
    # flask_cors and guarantees headers are attached even for error pages
    # or responses generated before blueprint handlers run.
    from flask import request

    @app.after_request
    def ensure_cors_headers(response):
        """Attach permissive CORS headers.

        - If `ALLOWED_ORIGINS` contains '*' we echo the request Origin when
          present (to allow credentials) and fall back to '*' otherwise.
        - Otherwise only echo allowed origins.
        """
        origin = request.headers.get("Origin")
        allowed = Config.ALLOWED_ORIGINS

        try:
            if isinstance(allowed, str):
                allowed_list = [o.strip() for o in allowed.split(",")]
            else:
                allowed_list = list(allowed)
        except Exception:
            allowed_list = ["*"]

        if "*" in allowed_list:
            if origin:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Vary"] = "Origin"
                response.headers["Access-Control-Allow-Credentials"] = "true"
            else:
                response.headers["Access-Control-Allow-Origin"] = "*"
        else:
            if origin and origin in allowed_list:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Vary"] = "Origin"
                response.headers["Access-Control-Allow-Credentials"] = "true"

        # Common preflight and CORS headers
        response.headers.setdefault(
            "Access-Control-Allow-Headers", "Content-Type,Authorization"
        )
        response.headers.setdefault(
            "Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS,PATCH"
        )

        return response

    # Handle 404 errors with proper CORS headers
    @app.errorhandler(404)
    def not_found(error):
        from flask import jsonify
        return jsonify({"error": "Endpoint not found"}), 404

    return app