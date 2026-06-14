"""Local development server for Edvanta backend.

For Vercel deployment, see api/index.py
For local testing, run: python index.py
"""

from api.index import app
from app.config import Config

if __name__ == "__main__":
    config = Config()
    PORT = config.PORT
    print(f"🚀 Starting Edvanta backend on http://localhost:{PORT}")
    print(f"📝 Environment: {config.ENV}")
    print(f"🐛 Debug mode: {config.DEBUG}")
    print("\n💡 Press Ctrl+C to stop\n")
    app.run(port=PORT, debug=config.DEBUG)