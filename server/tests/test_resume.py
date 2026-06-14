import io
from unittest.mock import patch
from app import create_app
from app.config import Config


def test_analyze_resume_no_file():
    """Test analyze endpoint without uploading a file."""
    app = create_app()
    client = app.test_client()
    response = client.post("/api/resume/analyze")
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data


def test_analyze_resume_invalid_extension():
    """Test analyze endpoint with an unsupported file extension."""
    app = create_app()
    client = app.test_client()
    data = {
        'file': (io.BytesIO(b"dummy image bytes"), 'resume.png')
    }
    response = client.post("/api/resume/analyze", data=data, content_type='multipart/form-data')
    assert response.status_code == 400
    data = response.get_json()
    assert "Unsupported file format" in data["error"]


@patch('app.routes.resume.cloudinary.uploader.upload')
@patch('app.routes.resume.analyze_resume_text')
def test_analyze_resume_success_pdf(mock_analyze, mock_upload):
    """Test successful resume upload and Gemini analysis of a PDF file."""
    # Setup mocks
    mock_upload.return_value = {
        "secure_url": "https://res.cloudinary.com/dummy/raw/upload/test.pdf"
    }
    mock_analyze.return_value = {
        "success": True,
        "analysis": {
            "score": 85,
            "summary": "Excellent resume summary.",
            "strengths": ["Strong Python skills"],
            "improvements": ["Add more numeric impact metrics"],
            "skills_found": ["Python", "Flask", "React"],
            "suggested_roles": ["Backend Developer", "Fullstack Developer"],
            "detailed_feedback": "Detailed markdown recommendations here."
        }
    }

    # Patch Config properties to bypass Cloudinary credentials check
    with patch.object(Config, 'CLOUDINARY_CLOUD_NAME', 'dummy_cloud'), \
         patch.object(Config, 'CLOUDINARY_API_KEY', 'dummy_key'), \
         patch.object(Config, 'CLOUDINARY_API_SECRET', 'dummy_secret'):
             
        app = create_app()
        client = app.test_client()
        
        with patch('app.routes.resume.extract_text_from_pdf', return_value="John Doe Resume content"):
            data = {
                'file': (io.BytesIO(b"mock pdf bytes"), 'resume.pdf')
            }
            response = client.post("/api/resume/analyze", data=data, content_type='multipart/form-data')
            
            assert response.status_code == 200
            res_data = response.get_json()
            assert res_data["success"] is True
            assert res_data["file_url"] == "https://res.cloudinary.com/dummy/raw/upload/test.pdf"
            assert res_data["filename"] == "resume.pdf"
            assert res_data["analysis"]["score"] == 85
            assert "React" in res_data["analysis"]["skills_found"]
            
            # Verify mocks were called correctly
            mock_upload.assert_called_once()
            mock_analyze.assert_called_once_with("John Doe Resume content")


def test_clean_json_string():
    """Test clean_json_string function with various JSON-breaking strings."""
    from app.utils.ai_utils import clean_json_string
    import json
    
    # 1. Check literal newlines inside quotes
    raw_json_with_newline = '{\n  "summary": "This is line 1\nThis is line 2"\n}'
    cleaned = clean_json_string(raw_json_with_newline)
    parsed = json.loads(cleaned)
    assert parsed["summary"] == "This is line 1\nThis is line 2"

    # 2. Check valid escape sequences are preserved
    raw_json_valid_escapes = '{\n  "feedback": "Nested \\"quote\\" and tab \\t and newline \\n and backslash \\\\"\n}'
    cleaned = clean_json_string(raw_json_valid_escapes)
    parsed = json.loads(cleaned)
    assert parsed["feedback"] == 'Nested "quote" and tab \t and newline \n and backslash \\'

    # 3. Check invalid backslashes (like Windows file paths) are escaped
    raw_json_invalid_escapes = '{\n  "path": "C:\\Users\\Tanish\\documents",\n  "unicode_valid": "\\u2713",\n  "unicode_invalid": "\\uXXXX"\n}'
    cleaned = clean_json_string(raw_json_invalid_escapes)
    parsed = json.loads(cleaned)
    assert parsed["path"] == "C:\\Users\\Tanish\\documents"
    assert parsed["unicode_valid"] == "✓"
    assert parsed["unicode_invalid"] == "\\uXXXX"


@patch('app.routes.resume.resumes_collection')
@patch('app.routes.resume.cloudinary.uploader.upload')
@patch('app.routes.resume.analyze_resume_text')
def test_analyze_resume_saves_to_db(mock_analyze, mock_upload, mock_resumes_collection):
    """Test that analyze endpoint saves the analysis to MongoDB when user_email is provided."""
    mock_upload.return_value = {
        "secure_url": "https://res.cloudinary.com/dummy/raw/upload/test.pdf"
    }
    mock_analyze.return_value = {
        "success": True,
        "analysis": {
            "score": 85,
            "summary": "Excellent summary.",
            "strengths": ["Strong Python"],
            "improvements": [],
            "skills_found": ["Python"],
            "suggested_roles": ["Backend Developer"],
            "detailed_feedback": "Detailed feedback"
        }
    }
    
    # Setup mock collection insert_one
    from unittest.mock import MagicMock
    mock_result = MagicMock()
    mock_result.inserted_id = MagicMock()
    mock_resumes_collection.insert_one.return_value = mock_result
    
    with patch.object(Config, 'CLOUDINARY_CLOUD_NAME', 'dummy_cloud'), \
         patch.object(Config, 'CLOUDINARY_API_KEY', 'dummy_key'), \
         patch.object(Config, 'CLOUDINARY_API_SECRET', 'dummy_secret'):
             
        app = create_app()
        client = app.test_client()
        
        with patch('app.routes.resume.extract_text_from_pdf', return_value="John Doe Resume"):
            data = {
                'file': (io.BytesIO(b"mock pdf bytes"), 'resume.pdf'),
                'user_email': 'test@example.com'
            }
            response = client.post("/api/resume/analyze", data=data, content_type='multipart/form-data')
            
            assert response.status_code == 200
            res_data = response.get_json()
            assert res_data["success"] is True
            mock_resumes_collection.insert_one.assert_called_once()
            # Verify user_email was passed to the inserted document
            inserted_doc = mock_resumes_collection.insert_one.call_args[0][0]
            assert inserted_doc["user_email"] == "test@example.com"
            assert inserted_doc["filename"] == "resume.pdf"
            assert inserted_doc["file_url"] == "https://res.cloudinary.com/dummy/raw/upload/test.pdf"


@patch('app.routes.resume.resumes_collection')
def test_get_resume_history(mock_resumes_collection):
    """Test retrieving resume analysis history for a user."""
    from datetime import datetime
    mock_resumes_collection.find.return_value.sort.return_value = [
        {
            "_id": "60c72b2f9b1d8e1f5c8b4567",
            "user_email": "test@example.com",
            "filename": "resume.pdf",
            "file_url": "https://res.cloudinary.com/dummy/test.pdf",
            "analysis": {"score": 85},
            "created_at": datetime(2026, 6, 14, 12, 0, 0)
        }
    ]
    
    app = create_app()
    client = app.test_client()
    response = client.get("/api/resume/history?user_email=test@example.com")
    
    assert response.status_code == 200
    res_data = response.get_json()
    assert len(res_data) == 1
    assert res_data[0]["filename"] == "resume.pdf"
    assert res_data[0]["id"] == "60c72b2f9b1d8e1f5c8b4567"
    assert res_data[0]["created_at"] == "2026-06-14T12:00:00"
    mock_resumes_collection.find.assert_called_once_with({"user_email": "test@example.com"})


@patch('app.routes.resume.resumes_collection')
def test_delete_resume_analysis(mock_resumes_collection):
    """Test deleting a specific resume analysis."""
    from unittest.mock import MagicMock
    from bson import ObjectId
    mock_delete_result = MagicMock()
    mock_delete_result.deleted_count = 1
    mock_resumes_collection.delete_one.return_value = mock_delete_result
    
    app = create_app()
    client = app.test_client()
    
    response = client.delete("/api/resume/history/60c72b2f9b1d8e1f5c8b4567")
    
    assert response.status_code == 200
    res_data = response.get_json()
    assert res_data["success"] is True
    assert "deleted successfully" in res_data["message"]
    mock_resumes_collection.delete_one.assert_called_once_with({"_id": ObjectId("60c72b2f9b1d8e1f5c8b4567")})

