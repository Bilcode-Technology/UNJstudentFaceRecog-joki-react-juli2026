import base64
import io
import os
import face_recognition
import numpy as np
from PIL import Image
from app.services.antispoof import check_liveness_from_crop


def encode_face(base64_image_str: str) -> dict:
    """
    Decodes base64 image and extracts 128-dimensional face encoding vector.
    Fails with no_face_detected or multiple_faces_detected if no valid single face is present.
    """
    try:
        if "," in base64_image_str:
            base64_image_str = base64_image_str.split(",", 1)[1]
            
        missing_padding = len(base64_image_str) % 4
        if missing_padding:
            base64_image_str += '=' * (4 - missing_padding)

        image_bytes = base64.b64decode(base64_image_str)
        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image_np = np.array(pil_image)
    except Exception:
        return {"success": False, "error": "invalid_image"}

    try:
        face_locations = face_recognition.face_locations(image_np)
        if len(face_locations) == 0:
            return {"success": False, "error": "no_face_detected"}
        if len(face_locations) > 1:
            return {"success": False, "error": "multiple_faces_detected"}

        encodings = face_recognition.face_encodings(image_np, face_locations)
        if len(encodings) == 1:
            return {
                "success": True,
                "encoding": encodings[0].tolist()
            }
        
        return {"success": False, "error": "no_face_detected"}
    except Exception:
        return {"success": False, "error": "invalid_image"}


def verify_face(base64_image_str: str, known_encoding: list[float]) -> dict:
    """
    Performs 1:1 face verification comparing candidate image against registered known_encoding vector.
    First runs single-pass face location detection, then anti-spoofing check, then face matching.
    Threshold defaults to 0.6 (configurable via FACE_MATCH_THRESHOLD env).
    """
    threshold = float(os.getenv("FACE_MATCH_THRESHOLD", 0.6))

    try:
        if "," in base64_image_str:
            base64_image_str = base64_image_str.split(",", 1)[1]
            
        missing_padding = len(base64_image_str) % 4
        if missing_padding:
            base64_image_str += '=' * (4 - missing_padding)

        image_bytes = base64.b64decode(base64_image_str)
        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image_np = np.array(pil_image)
    except Exception:
        return {"success": False, "error": "invalid_image"}

    try:
        # 1. Single-pass face location detection (dlib)
        face_locations = face_recognition.face_locations(image_np)
        if len(face_locations) == 0:
            return {"success": False, "error": "no_face_detected"}

        # 2. Anti-spoofing check on detected face ROI (fail fast)
        liveness_res = check_liveness_from_crop(image_np, face_locations[0])
        if not liveness_res.get("is_live", True):
            return {
                "success": False,
                "error": "spoof_detected",
                "score": liveness_res.get("score", 0.0)
            }

        # 3. Extract encoding using exact same detected face_locations & calculate distance
        encodings = face_recognition.face_encodings(image_np, face_locations)
        if len(encodings) == 0:
            return {"success": False, "error": "no_face_detected"}

        candidate_encoding = encodings[0]
        distances = face_recognition.face_distance([np.array(known_encoding)], candidate_encoding)
        dist = float(distances[0])
        is_match = dist <= threshold

        return {
            "success": True,
            "match": is_match,
            "distance": dist,
            "liveness_score": liveness_res.get("score", 1.0)
        }
    except Exception as e:
        return {"success": False, "error": "invalid_image"}
