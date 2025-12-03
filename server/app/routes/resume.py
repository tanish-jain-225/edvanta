"""Resume Builder & Analysis endpoints.

Handles resume upload (Cloudinary) and analysis vs job description using Gemini AI.
"""
from flask import Blueprint, request, jsonify, send_file
from app.utils.cloudinary_utils import upload_file_to_cloudinary, fetch_file_from_cloudinary
from app.utils.pdf_utils import extract_text_from_pdf, extract_text_from_docx
import os
import requests
import tempfile
import json
from ..config import Config
import re
from app.utils.ai_utils import analyze_resume as ai_analyze_resume

resume_bp = Blueprint("resume", __name__)


def _safe_extract_json(text: str):
    """Best-effort extract a JSON object from arbitrary LLM text.

    - Tries direct json.loads.
    - If fails, attempts to find the first {...} block.
    - Returns dict or raises ValueError.
    """
    if not text:
        raise ValueError("Empty text")
    text = text.strip()
    # Quick path
    try:
        return json.loads(text)
    except Exception:
        pass

    # Attempt to locate the first JSON object in the text
    start = text.find('{')
    end = text.rfind('}')
    if start != -1 and end != -1 and end > start:
        candidate = text[start:end + 1]
        try:
            return json.loads(candidate)
        except Exception:
            # Try to clean common issues like trailing commas
            cleaned = candidate.replace("\n", " ")
            # Remove code fences if present
            if cleaned.startswith('```'):
                cleaned = cleaned.strip('`')
            try:
                return json.loads(cleaned)
            except Exception as e:
                raise ValueError(f"Failed to parse JSON candidate: {e}")

    raise ValueError("No JSON object found in text")


def _normalize_analysis(obj: dict) -> dict:
    """Normalize parsed analysis into the required schema.

    Ensures keys: strengths (list[str]), improvements (list[str]),
    match_score (int 0..100), summary (str). Coerces types safely.
    """
    def to_list(val):
        if val is None:
            return []
        if isinstance(val, list):
            # stringify items
            return [str(x).strip() for x in val if str(x).strip()]
        if isinstance(val, str):
            # split on newlines or semicolons/bullets
            parts = [p.strip(" -•\t") for p in re.split(r"[\n;]+", val) if p.strip()]
            return parts
        return [str(val).strip()]

    def to_score(val):
        try:
            # Some models may return like "85%"
            if isinstance(val, str) and val.endswith('%'):
                val = val[:-1]
            score = int(round(float(val)))
            return max(0, min(100, score))
        except Exception:
            return 0

    def to_str(val):
        if val is None:
            return ""
        if isinstance(val, (dict, list)):
            try:
                return json.dumps(val, ensure_ascii=False)
            except Exception:
                return str(val)
        return str(val)

    # Allow some common aliasing
    strengths = obj.get('strengths') or obj.get('pros') or obj.get('good')
    improvements = obj.get('improvements') or obj.get('cons') or obj.get('suggestions') or obj.get('areas_to_improve')
    match_score = obj.get('match_score') or obj.get('match') or obj.get('score')
    summary = obj.get('summary') or obj.get('overview') or obj.get('notes')

    normalized = {
        'strengths': to_list(strengths),
        'improvements': to_list(improvements),
        'match_score': to_score(match_score),
        'summary': to_str(summary),
    }

    return normalized


@resume_bp.route("/api/resume/upload", methods=["POST"])
def upload_resume():
    """Upload a resume file to Cloudinary and return its URL / public_id.

    Expected: multipart/form-data with file field (e.g., 'resume').
    Steps (future):
      1. Validate file existence & type (PDF / DOCX)
      2. Upload to Cloudinary via helper util
      3. Return { url, public_id }
    """
    if 'resume' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400

    file = request.files['resume']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    allowed_extensions = {'pdf', 'docx'}
    ext = os.path.splitext(file.filename)[1][1:].lower()
    if ext not in allowed_extensions:
        return jsonify({"error": "Invalid file type. Only PDF and DOCX allowed."}), 400

    try:
        result = upload_file_to_cloudinary(file)
        return jsonify({
            "secure_url": result.get("secure_url"),
            "url": result.get("url"),
            "public_id": result.get("public_id")
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@resume_bp.route("/api/resume/analyze", methods=["POST"])
def analyze_resume():
    """Analyze resume against provided job description.

    Expected JSON (one of):
      - {"public_id": "...", "file_format": "pdf|docx", "job_description": "..."}
      - {"resume_text": "...", "job_description": "..."}

    Behavior:
      - If "resume_text" provided, analyze that text directly.
      - Else require Cloudinary "public_id" and optional "file_format" (default: pdf) to fetch & parse.
    """

    data = request.get_json() or {}
    resume_text = (data.get("resume_text") or "").strip()
    public_id = data.get("public_id")
    job_description = (data.get("job_description") or "").strip()
    file_format = (data.get("file_format") or "pdf").lower()

    if not job_description:
        return jsonify({"error": "'job_description' is required"}), 400

    if not resume_text:
        if not public_id:
            return jsonify({"error": "Provide either 'resume_text' or 'public_id'"}), 400
        # Download resume file from Cloudinary (private)
        try:
            file_bytes = fetch_file_from_cloudinary(public_id, resource_type="raw", file_format=file_format)
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_format}") as tmp:
                tmp.write(file_bytes)
                tmp_path = tmp.name
            if file_format == "pdf":
                resume_text = extract_text_from_pdf(tmp_path)
            elif file_format == "docx":
                resume_text = extract_text_from_docx(tmp_path)
            else:
                return jsonify({"error": "Unsupported resume file type"}), 400
            os.remove(tmp_path)
        except Exception as e:
            return jsonify({"error": f"Failed to fetch or parse resume: {str(e)}"}), 500

    # Use centralized AI analysis - NO FALLBACKS
    try:
        result = ai_analyze_resume(resume_text, job_description)
        
        if not result['success']:
            raise Exception(f"AI resume analysis failed: {result.get('error', 'Unknown error')}")
        
        return jsonify({"success": True, "analysis": result['analysis']})
    except Exception as e:
        raise e


@resume_bp.route("/api/resume/download", methods=["POST", "OPTIONS"])
def download_resume():
    """Download a resume as PDF.

    Expected JSON:
    - resume_data: dict with resume content
    """
    # Handle CORS preflight request
    if request.method == "OPTIONS":
        response = jsonify({})
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        return response
    
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON data provided"}), 400

    resume_data = data.get("resume_data")
    if not resume_data:
        return jsonify({"error": "Missing resume_data parameter"}), 400

    try:
        # Generate PDF using reportlab
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_LEFT
        from reportlab.lib.units import mm
        from reportlab.lib import colors
        import io

        buf = io.BytesIO()
        resume_name = resume_data.get('personal', {}).get('name', 'Resume')
        doc = SimpleDocTemplate(
            buf,
            pagesize=A4,
            leftMargin=18 * mm,
            rightMargin=18 * mm,
            topMargin=18 * mm,
            bottomMargin=18 * mm,
            title=f"Resume: {resume_name}",
        )

        styles = getSampleStyleSheet()
        h1 = ParagraphStyle("Title", parent=styles["Heading1"], fontSize=20, leading=24, spaceAfter=8)
        h2 = ParagraphStyle("Section", parent=styles["Heading2"], fontSize=14, spaceBefore=16, spaceAfter=8)
        normal = styles["BodyText"]
        contact_style = ParagraphStyle("Contact", parent=styles["BodyText"], fontSize=11, spaceAfter=4)
        item_style = ParagraphStyle("Item", parent=styles["BodyText"], fontSize=12, spaceBefore=6, spaceAfter=6)

        story = []
        
        # Header - Personal Information
        personal = resume_data.get('personal', {})
        if personal.get('name'):
            story.append(Paragraph(personal['name'], h1))
        
        contact_info = []
        if personal.get('email'):
            contact_info.append(f"Email: {personal['email']}")
        if personal.get('phone'):
            contact_info.append(f"Phone: {personal['phone']}")
        if personal.get('location'):
            contact_info.append(f"Location: {personal['location']}")
        if personal.get('website'):
            contact_info.append(f"Website: {personal['website']}")
        
        for info in contact_info:
            story.append(Paragraph(info, contact_style))
        
        story.append(Spacer(1, 12))

        # Professional Summary
        if resume_data.get('summary'):
            story.append(Paragraph("Professional Summary", h2))
            story.append(Paragraph(resume_data['summary'], normal))
            story.append(Spacer(1, 12))

        # Work Experience
        if resume_data.get('experience'):
            story.append(Paragraph("Work Experience", h2))
            for exp in resume_data['experience']:
                title_company = f"{exp.get('title', '')} - {exp.get('company', '')}"
                if exp.get('start') or exp.get('end'):
                    title_company += f" ({exp.get('start', '')} - {exp.get('end', '')})"
                story.append(Paragraph(title_company, item_style))
                if exp.get('description'):
                    story.append(Paragraph(exp['description'], normal))
                story.append(Spacer(1, 8))

        # Education
        if resume_data.get('education'):
            story.append(Paragraph("Education", h2))
            for edu in resume_data['education']:
                degree_school = f"{edu.get('degree', '')} - {edu.get('school', '')}"
                if edu.get('start') or edu.get('end'):
                    degree_school += f" ({edu.get('start', '')} - {edu.get('end', '')})"
                story.append(Paragraph(degree_school, item_style))
                if edu.get('description'):
                    story.append(Paragraph(edu['description'], normal))
                story.append(Spacer(1, 8))

        # Skills
        if resume_data.get('skills'):
            story.append(Paragraph("Skills", h2))
            skills_text = ", ".join([f"{skill.get('name', '')} ({skill.get('level', '')})" if skill.get('level') else skill.get('name', '') for skill in resume_data['skills']])
            story.append(Paragraph(skills_text, normal))
            story.append(Spacer(1, 12))

        # Projects
        if resume_data.get('projects'):
            story.append(Paragraph("Projects", h2))
            for project in resume_data['projects']:
                project_name = project.get('name', '')
                if project.get('link'):
                    project_name += f" ({project['link']})"
                story.append(Paragraph(project_name, item_style))
                if project.get('description'):
                    story.append(Paragraph(project['description'], normal))
                story.append(Spacer(1, 8))

        doc.build(story)
        buf.seek(0)

        return send_file(
            buf,
            as_attachment=True,
            download_name=f"{resume_name.replace(' ', '_')}_Resume.pdf",
            mimetype='application/pdf'
        )

    except Exception as e:
        return jsonify({"error": f"PDF generation failed: {str(e)}"}), 500
