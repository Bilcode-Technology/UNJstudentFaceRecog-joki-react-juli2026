import os
import cv2
import numpy as np
import onnxruntime as ort
from typing import Tuple, Dict, Any

# Path to ONNX model if provided
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "MiniFASNetV2.onnx")

_onnx_session = None

def get_onnx_session():
    global _onnx_session
    if _onnx_session is None and os.path.exists(MODEL_PATH):
        try:
            opts = ort.SessionOptions()
            opts.intra_op_num_threads = 2
            opts.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
            _onnx_session = ort.InferenceSession(MODEL_PATH, opts, providers=["CPUExecutionProvider"])
            
            inputs = _onnx_session.get_inputs()[0]
            outputs = _onnx_session.get_outputs()[0]
            print(f"[AntiSpoof] ONNX model loaded successfully from {MODEL_PATH}")
            print(f"[AntiSpoof] Input: name='{inputs.name}', shape={inputs.shape}, type={inputs.type}")
            print(f"[AntiSpoof] Output: name='{outputs.name}', shape={outputs.shape}, type={outputs.type}")
        except Exception as e:
            print(f"[AntiSpoof] Warning: Failed to load ONNX model {MODEL_PATH}: {e}")
            _onnx_session = None
    return _onnx_session


def crop_face_roi(image_np: np.ndarray, face_location: Tuple[int, int, int, int], scale: float = 2.7) -> np.ndarray:
    """
    Crops face region from (top, right, bottom, left) bounding box with expanded padding.
    """
    h_img, w_img = image_np.shape[:2]
    top, right, bottom, left = face_location

    w = right - left
    h = bottom - top

    cx = left + w // 2
    cy = top + h // 2

    # Scale crop box
    crop_w = int(w * scale)
    crop_h = int(h * scale)

    crop_left = max(0, cx - crop_w // 2)
    crop_right = min(w_img, cx + crop_w // 2)
    crop_top = max(0, cy - crop_h // 2)
    crop_bottom = min(h_img, cy + crop_h // 2)

    crop = image_np[crop_top:crop_bottom, crop_left:crop_right]
    return crop


def analyze_texture_liveness(crop_rgb: np.ndarray) -> float:
    """
    Analyzes texture, color distribution, and frequency domain (FFT/Laplacian)
    to compute a liveness probability score between 0.0 and 1.0.
    Screen replay / photo prints exhibit Moiré artifacts, specular reflection quantization,
    and high-frequency noise grid spikes.
    """
    if crop_rgb is None or crop_rgb.size == 0:
        return 0.0

    try:
        # Convert RGB to BGR for OpenCV
        bgr = cv2.cvtColor(crop_rgb, cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
        hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)

        # 1. Blur & Laplacian Variance (Detecting blurry photos / screen artifacts)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        lap_var = float(laplacian.var())

        # 2. FFT High Frequency Energy Ratio (Screen Grid / Moiré detection)
        f = np.fft.fft2(gray)
        fshift = np.fft.fftshift(f)
        magnitude_spectrum = 20 * np.log(np.abs(fshift) + 1e-8)
        
        rows, cols = gray.shape
        crow, ccol = rows // 2, cols // 2
        # Radius mask
        r = min(rows, cols) // 6
        mask = np.ones((rows, cols), np.uint8)
        cv2.circle(mask, (ccol, crow), r, 0, -1)
        
        high_freq_ratio = float(np.mean(magnitude_spectrum * mask) / (np.mean(magnitude_spectrum) + 1e-8))

        # 3. HSV Specular Reflection & Saturation Distribution (Screen backlight / paper reflection)
        s_channel = hsv[:, :, 1]
        v_channel = hsv[:, :, 2]
        sat_std = float(np.std(s_channel))
        val_std = float(np.std(v_channel))

        # Heuristic scoring calibration
        score = 0.85 # Baseline for natural camera RGB crop

        # 1. Penalty for low Laplacian variance (blurry print/re-capture)
        if lap_var < 40.0:
            score -= 0.35
        elif lap_var < 90.0:
            score -= 0.15

        # 2. Penalty for suspicious high frequency Moiré grid artifacts (screen subpixel replay)
        if high_freq_ratio > 1.35:
            score -= 0.35
        elif high_freq_ratio > 1.15:
            score -= 0.20

        # 3. Penalty for flattened saturation (digital screen display reflection / print out)
        if sat_std < 12.0:
            score -= 0.35

        score = max(0.0, min(1.0, score))
        return score
    except Exception as e:
        print(f"[AntiSpoof] Exception in texture analysis: {e}")
        return 0.5


def check_liveness_from_crop(image_np: np.ndarray, face_location: Tuple[int, int, int, int]) -> Dict[str, Any]:
    """
    Main Anti-Spoofing entrypoint.
    Receives RGB image_np and (top, right, bottom, left) face_location from single-pass dlib detection.
    Returns: {"is_live": bool, "score": float}
    """
    threshold = float(os.getenv("ANTISPOOF_THRESHOLD", 0.6))

    try:
        session = get_onnx_session()
        crop_rgb = crop_face_roi(image_np, face_location)

        if session is not None:
            # ONNX Inference using MiniFASNet
            input_name = session.get_inputs()[0].name
            input_shape = session.get_inputs()[0].shape # e.g. [1, 3, 80, 80] or [1, 3, 128, 128]
            
            target_h = input_shape[2] if len(input_shape) >= 3 and input_shape[2] else 80
            target_w = input_shape[3] if len(input_shape) >= 4 and input_shape[3] else 80

            resized = cv2.resize(crop_rgb, (target_w, target_h))
            # Transpose HWC -> CHW & Normalize
            tensor = resized.astype(np.float32) / 255.0
            tensor = np.transpose(tensor, (2, 0, 1))
            tensor = np.expand_dims(tensor, axis=0)

            outputs = session.run(None, {input_name: tensor})
            raw_scores = outputs[0][0]
            # Softmax calculation
            exp_scores = np.exp(raw_scores - np.max(raw_scores))
            probs = exp_scores / np.sum(exp_scores)
            
            # MiniFASNet outputs [fake_prob, real_prob]
            real_score = float(probs[1]) if len(probs) > 1 else float(probs[0])
            print(f"[AntiSpoof] ONNX session.run() executed -> Raw logits: {raw_scores}, Softmax probs: {probs.round(4)}, Real Score: {real_score:.4f}")
        else:
            # Fallback to texture & frequency analysis classifier
            print("[AntiSpoof] ONNX model unavailable -> Executing texture/frequency fallback classifier")
            real_score = analyze_texture_liveness(crop_rgb)

        is_live = real_score >= threshold

        return {
            "is_live": is_live,
            "score": round(real_score, 4)
        }
    except Exception as e:
        print(f"[AntiSpoof ERROR] Critical exception during liveness check: {e}")
        # Fail-closed security design: Reject presensi on error to prevent spoof bypass
        return {
            "is_live": False,
            "score": 0.0,
            "error": "liveness_check_error"
        }
