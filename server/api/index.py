# Vercel Python WSGI Application
# This is the absolute minimal Flask app export for Vercel

from app import create_app

# Create the Flask app - this is all Vercel needs
app = create_app()
