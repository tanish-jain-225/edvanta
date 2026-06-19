"""Request validation decorators for Flask routes."""

from functools import wraps
from flask import request, jsonify
import logging

logger = logging.getLogger(__name__)


def validate_json(required_fields=None, type_rules=None):
  """Decorator to validate JSON request bodies.

  Args:
      required_fields (list, optional): List of keys that must be present in the JSON body.
      type_rules (dict, optional): Dictionary mapping keys to their expected Python types.
  """
  required_fields = required_fields or []
  type_rules = type_rules or {}

  def decorator(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
      # Preflight checks (OPTIONS) are handled by CORS middleware, but skip validation if not POST/PUT/PATCH/DELETE with body
      if request.method == "OPTIONS":
        return f(*args, **kwargs)

      # 1. Parse JSON body
      data = request.get_json(silent=True)
      if data is None:
        logger.warning(f"Request to {request.path} missing valid JSON body")
        return jsonify({
          "success": False,
          "error": "Request body must be valid JSON",
        }), 400

      # 2. Check for required fields
      missing_fields = [field for field in required_fields if field not in data]
      if missing_fields:
        logger.warning(
          f"Request to {request.path} missing required fields: {missing_fields}"
        )
        return jsonify({
          "success": False,
          "error": f"Missing required fields: {', '.join(missing_fields)}",
        }), 400

      # 3. Check types
      for field, expected_type in type_rules.items():
        if field in data and not isinstance(data[field], expected_type):
          # Special case: allow parsing int to float
          if expected_type is float and isinstance(data[field], int):
            continue
          
          actual_type_name = type(data[field]).__name__
          expected_type_name = expected_type.__name__
          logger.warning(
            f"Request to {request.path} field '{field}' has type {actual_type_name}, expected {expected_type_name}"
          )
          return jsonify({
            "success": False,
            "error": f"Field '{field}' must be of type {expected_type_name}, got {actual_type_name}",
          }), 400

      return f(*args, **kwargs)

    return wrapper

  return decorator


def validate_query_params(required_params=None):
  """Decorator to validate query parameters."""
  required_params = required_params or []

  def decorator(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
      missing_params = [
        param for param in required_params if param not in request.args
      ]
      if missing_params:
        logger.warning(
          f"Request to {request.path} missing required query params: {missing_params}"
        )
        return jsonify({
          "success": False,
          "error": f"Missing required query parameters: {', '.join(missing_params)}",
        }), 400
      return f(*args, **kwargs)

    return wrapper

  return decorator
