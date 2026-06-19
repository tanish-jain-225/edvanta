import os
import sys
from unittest.mock import MagicMock

# Insert the parent directory to sys.path to ensure correct imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Globally mock MongoDB connection utilities to avoid slow timeout delays
# during test discovery and execution in non-database environments like CI.
import app.utils.mongo_utils
mock_client = MagicMock()
mock_db = MagicMock()
app.utils.mongo_utils.get_mongo_client = MagicMock(return_value=mock_client)
app.utils.mongo_utils.connect_to_mongodb = MagicMock(return_value=(mock_client, mock_db, "mock_collection"))
app.utils.mongo_utils.is_mongodb_connected = MagicMock(return_value=False)

