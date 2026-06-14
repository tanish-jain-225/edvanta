from flask import Blueprint, request, jsonify
import io
import PyPDF2
import cloudinary
import cloudinary.uploader
from datetime import datetime
from bson import ObjectId
from app.config import Config
from app.utils.ai_utils import analyze_resume_text
from app.utils.mongo_utils import connect_to_mongodb

resume_bp = Blueprint('resume', __name__)

# Configure Cloudinary
if Config.CLOUDINARY_CLOUD_NAME and Config.CLOUDINARY_API_KEY and Config.CLOUDINARY_API_SECRET:
    cloudinary.config(
        cloud_name=Config.CLOUDINARY_CLOUD_NAME,
        api_key=Config.CLOUDINARY_API_KEY,
        api_secret=Config.CLOUDINARY_API_SECRET,
        secure=True
    )
else:
    print("Warning: Cloudinary credentials not fully configured. Uploads might fail.")

# MongoDB connection - GRACEFUL ERROR HANDLING WITH LAZY INITIALIZATION
client = None
db = None
resumes_collection = None

def get_resumes_collection():
    """Retrieve the MongoDB resumes collection, initializing connection if needed."""
    global client, db, resumes_collection
    if resumes_collection is None:
        try:
            client, db, _ = connect_to_mongodb()
            if db is not None:
                resumes_collection = db[Config.MONGODB_RESUME_COLLECTION]
                print(f"Resume MongoDB connected successfully to {Config.MONGODB_DB_NAME}")
        except Exception as e:
            print(f"Resume MongoDB connection failed: {str(e)}")
    return resumes_collection


def extract_text_from_pdf(file_bytes):
    """Extract plain text from PDF file bytes using PyPDF2."""
    pdf_file = io.BytesIO(file_bytes)
    reader = PyPDF2.PdfReader(pdf_file)
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    return text


@resume_bp.route("/api/resume/analyze", methods=["POST"])
def analyze_resume():
    """Endpoint to upload resume to Cloudinary, extract text, and analyze with Gemini AI."""
    if 'file' not in request.files:
        return jsonify({"error": "No file part in request"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    user_email = request.form.get('user_email') or request.args.get('user_email')
    
    # Read the file bytes
    file_bytes = file.read()
    
    # Check file type and extract text
    filename = file.filename.lower()
    if filename.endswith('.pdf'):
        try:
            resume_text = extract_text_from_pdf(file_bytes)
        except Exception as e:
            return jsonify({"error": f"Failed to parse PDF file: {str(e)}"}), 400
    elif filename.endswith('.txt'):
        try:
            resume_text = file_bytes.decode('utf-8', errors='ignore')
        except Exception as e:
            return jsonify({"error": f"Failed to parse text file: {str(e)}"}), 400
    else:
        return jsonify({"error": "Unsupported file format. Please upload a PDF or TXT file."}), 400
        
    if not resume_text.strip():
        return jsonify({"error": "The uploaded file contains no readable text."}), 400

    # 1. Upload file to Cloudinary
    if not (Config.CLOUDINARY_CLOUD_NAME and Config.CLOUDINARY_API_KEY and Config.CLOUDINARY_API_SECRET):
        return jsonify({"error": "Cloudinary credentials are not configured on the server."}), 500

    try:
        file_stream = io.BytesIO(file_bytes)
        # Cloudinary auto-appends format extensions for images/PDFs but not for raw files (like TXT).
        # We upload PDFs as 'auto' (which Cloudinary treats as image) so they can be viewed inline,
        # and TXT files with an explicit '.txt' extension as raw/auto.
        is_pdf = filename.endswith('.pdf')
        public_id = f"resume_{int(datetime.utcnow().timestamp())}"
        if not is_pdf:
            public_id += ".txt"

        upload_result = cloudinary.uploader.upload(
            file_stream,
            folder="edvanta_resumes",
            resource_type="auto",
            public_id=public_id,
            filename=file.filename
        )
        secure_url = upload_result.get("secure_url")
    except Exception as e:
        return jsonify({"error": f"Cloudinary upload failed: {str(e)}"}), 500

    # 2. Analyze resume text with Gemini AI
    try:
        analysis_result = analyze_resume_text(resume_text)
        if not analysis_result['success']:
            return jsonify({"error": f"Gemini analysis failed: {analysis_result['error']}"}), 500
        
        # Merge response
        response_payload = {
            "success": True,
            "file_url": secure_url,
            "filename": file.filename,
            "analysis": analysis_result['analysis']
        }
        
        # Save to MongoDB if user_email is present
        col = get_resumes_collection()
        if col is not None and user_email:
            try:
                resume_doc = {
                    "user_email": user_email,
                    "filename": file.filename,
                    "file_url": secure_url,
                    "analysis": analysis_result['analysis'],
                    "created_at": datetime.utcnow()
                }
                result = col.insert_one(resume_doc)
                response_payload["id"] = str(result.inserted_id)
            except Exception as db_err:
                print(f"Failed to save resume analysis to MongoDB: {str(db_err)}")
                
        return jsonify(response_payload), 200
    except Exception as e:
        return jsonify({"error": f"An error occurred during resume analysis: {str(e)}"}), 500


@resume_bp.route("/api/resume/history", methods=["GET"])
def get_resume_history():
    """Fetch saved resume analyses for a user."""
    user_email = request.args.get('user_email')
    if not user_email:
        return jsonify({"error": "user_email parameter is required"}), 400
    
    col = get_resumes_collection()
    if col is None:
        return jsonify({"error": "Database connection not available"}), 500
        
    try:
        cursor = col.find({"user_email": user_email}).sort("created_at", -1)
        history = []
        for doc in cursor:
            history.append({
                "id": str(doc["_id"]),
                "user_email": doc.get("user_email"),
                "filename": doc.get("filename"),
                "file_url": doc.get("file_url"),
                "analysis": doc.get("analysis"),
                "created_at": doc.get("created_at").isoformat() if isinstance(doc.get("created_at"), datetime) else doc.get("created_at")
            })
        return jsonify(history), 200
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve resume history: {str(e)}"}), 500


@resume_bp.route("/api/resume/history/<id>", methods=["DELETE"])
def delete_resume_analysis(id):
    """Delete a specific resume analysis by its ID."""
    col = get_resumes_collection()
    if col is None:
        return jsonify({"error": "Database connection not available"}), 500
        
    try:
        result = col.delete_one({"_id": ObjectId(id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Resume analysis not found"}), 404
        return jsonify({"success": True, "message": "Resume analysis deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to delete resume analysis: {str(e)}"}), 500
