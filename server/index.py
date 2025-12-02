"""WSGI entry point for Edvanta backend.

This file serves as the entry point for:
- Vercel serverless deployment (exports 'app' variable)
- AWS Lambda (exports 'app' or 'handler' variable)
- Google Cloud Functions (exports 'app' variable)
- Netlify Functions (exports 'handler' variable)
- Heroku (runs via Gunicorn/WSGI)
- Local development (runs Flask dev server when executed directly)

CRITICAL FOR SERVERLESS DEPLOYMENT:
- The 'app' variable MUST be at module level (not inside __main__)
- Do NOT rename the 'app' variable
- Serverless runtimes look for this specific variable
"""

from app import create_app
from app.config import Config
import os

# Create Flask application instance
# This MUST be at module level for serverless deployment
app = create_app()
config = Config()

# Export handler alias for AWS Lambda and Netlify
handler = app


if __name__ == "__main__":
    # This block only runs during local development
    # It will NOT run on serverless environments
    PORT = config.PORT
    print(f"Starting Edvanta backend server on port {PORT} in {config.ENV} mode...")
    app.run(port=PORT, debug=config.DEBUG)