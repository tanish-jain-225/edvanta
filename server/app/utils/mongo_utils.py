"""MongoDB utility helpers for centralized connection management.

Provides:
- connect_to_mongodb: returns (client, db, collection_name)
- get_db_connection: returns db only (for legacy helpers)
- Connection reuse for serverless environments
"""

import time
from pymongo import MongoClient
from typing import Optional, Tuple
from app.config import Config
import logging

logger = logging.getLogger(__name__)

# Global connection cache for serverless environments
_mongo_client_cache = None


def get_mongo_client() -> Optional[MongoClient]:
    """Get MongoDB client with connection retry and reuse for serverless environments.
    
    Returns:
        MongoClient instance or None if connection fails
    """
    global _mongo_client_cache
    
    connection_string = Config.MONGODB_URI
    if not connection_string:
        logger.warning("MONGODB_URI not configured")
        return None

    # Setup connection settings
    is_serverless = Config.IS_SERVERLESS
    client_kwargs = {
        "serverSelectionTimeoutMS": 5000,
        "connectTimeoutMS": 5000 if is_serverless else 10000,
        "socketTimeoutMS": 10000 if is_serverless else 30000,
        "maxPoolSize": 1 if is_serverless else 10,
        "minPoolSize": 0 if is_serverless else 1,
        "retryWrites": True
    }
    
    if is_serverless:
        client_kwargs["maxIdleTimeMS"] = 30000

    max_retries = 3
    retry_delay = 0.5  # seconds

    for attempt in range(max_retries):
        try:
            # Reuse connection in serverless environments
            if is_serverless and _mongo_client_cache is not None:
                try:
                    _mongo_client_cache.admin.command('ping')
                    logger.debug("Reusing existing MongoDB connection")
                    return _mongo_client_cache
                except Exception as e:
                    logger.info(f"Cached MongoDB connection expired: {e}, reconnecting...")
                    _mongo_client_cache = None

            client = MongoClient(connection_string, **client_kwargs)
            client.admin.command('ping')
            
            if is_serverless:
                _mongo_client_cache = client
                logger.debug("MongoDB connection cached for reuse")
                
            return client
        except Exception as e:
            logger.warning(f"MongoDB connection attempt {attempt + 1}/{max_retries} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
                retry_delay *= 2
            else:
                logger.error(f"Failed to connect to MongoDB after {max_retries} attempts: {e}")
                return None


def is_mongodb_connected() -> bool:
    """Helper to verify if the MongoDB server is actively reachable.
    
    Returns:
        bool: True if reachable, False otherwise
    """
    client = get_mongo_client()
    if not client:
        return False
    try:
        client.admin.command('ping')
        return True
    except Exception:
        return False


def connect_to_mongodb(
    collection_config_attr: Optional[str] = None,
    fallback_collection: Optional[str] = None,
) -> Tuple[Optional[MongoClient], Optional[object], Optional[str]]:
    """Create a MongoDB connection and return (client, db, collection_name).
    
    Uses connection pooling for serverless environments.

    Args:
        collection_config_attr: Name of the attribute in Config that contains the
            collection name (e.g., "MONGODB_ROADMAP_COLLECTION"). If provided, the
            collection name will be read from Config using this attribute.
        fallback_collection: Used when collection_config_attr is None or not found.

    Returns:
        (client, db, collection_name) — any of these may be None if connection fails
    """
    try:
        client = get_mongo_client()
        if not client:
            return None, None, None
        
        db_name = Config.MONGODB_DB_NAME
        if not db_name:
            logger.warning("MONGODB_DB_NAME not configured")
            return None, None, None

        db = client[db_name]
        collection_name = None
        if collection_config_attr:
            collection_name = getattr(Config, collection_config_attr, None)
        if not collection_name:
            collection_name = fallback_collection

        return client, db, collection_name
    except Exception as e:
        logger.error(f"MongoDB connection setup error: {e}")
        return None, None, None


def get_db_connection():
    """Return only the database object (legacy compatibility).

    Returns:
        db or None if connection fails
    """
    client, db, _ = connect_to_mongodb()
    return db
