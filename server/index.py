"""WSGI entry point for Edvanta backend.

This file serves as the entry point for:
- Vercel serverless deployment (exports 'app' variable)
- Local development (runs Flask dev server when executed directly)

CRITICAL FOR VERCEL:
- The 'app' variable MUST be at module level (not inside __main__)
- Do NOT rename the 'app' variable
- Vercel's @vercel/python runtime looks for this specific variable
"""

from app import create_app
from app.config import Config

# Create Flask application instance
# This MUST be at module level for Vercel deployment
app = create_app()

if __name__ == "__main__":
    # This block only runs during local development
    # It will NOT run on Vercel's serverless environment
    PORT = Config.PORT
    app.run(port=PORT, debug=Config.DEBUG)
