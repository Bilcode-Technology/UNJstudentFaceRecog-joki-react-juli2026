import os
import cv2
import numpy as np
import base64
import io
from PIL import Image, ImageFilter
from app.services.antispoof import get_onnx_session, check_liveness_from_crop

def generate_live_face_sample():
    """Generates a natural RGB face crop."""
    np.random.seed(42)
    img_np = np.zeros((400, 400, 3), dtype=np.uint8)
    img_np[:, :] = [240, 238, 230]
    
    h, w, _ = img_np.shape
    cy, cx = h // 2, w // 2
    y_grid, x_grid = np.ogrid[:h, :w]
    mask = ((x_grid - cx)**2 / (110**2) + (y_grid - cy)**2 / (140**2)) <= 1.0
    
    skin_color = np.array([160, 190, 232], dtype=np.float32)
    noise = np.random.normal(0, 12, (h, w, 3))
    
    face_rgb = np.clip(skin_color + noise, 0, 255).astype(np.uint8)
    img_np[mask] = face_rgb[mask]
    return img_np

def generate_spoof_screen_sample(live_img_np):
    """Generates a digital screen re-capture sample with simulated high-frequency Moiré grid lines."""
    h, w, _ = live_img_np.shape
    spoof = live_img_np.copy()
    
    # High-frequency screen subpixel grid lines
    grid = np.zeros((h, w, 3), dtype=np.uint8)
    grid[::2, :, :] = 255
    grid[:, ::2, :] = 255
    
    spoof = cv2.addWeighted(spoof, 0.4, grid, 0.6, 0)
    return spoof

def run_pure_onnx_test():
    print("==========================================================")
    print("PURE ONNX INFERENCE TEST — REAL VS SPOOF (MiniFASNetV2.onnx)")
    print("==========================================================")
    
    # 1. Confirm session loading
    session = get_onnx_session()
    if session is None:
        print("ERROR: ONNX Session failed to load!")
        return

    print(f"\n[ONNX Session Status]: Active & Loaded")
    print(f"  - Model Path : {os.path.abspath('app/models/MiniFASNetV2.onnx')}")
    print(f"  - Input Tensor: {session.get_inputs()[0].name} ({session.get_inputs()[0].shape})")
    print(f"  - Output Tensor: {session.get_outputs()[0].name} ({session.get_outputs()[0].shape})")

    face_box = (40, 260, 260, 40) # (top, right, bottom, left)
    
    real_img = generate_live_face_sample()
    spoof_img = generate_spoof_screen_sample(real_img)

    print("\n----------------------------------------------------------")
    print("[1] TESTING REAL FACE SAMPLE VIA PURE ONNX INFERENCE:")
    real_res = check_liveness_from_crop(real_img, face_box)
    print(f"    - Liveness Status : {'PASSED (is_live: True)' if real_res['is_live'] else 'FAILED (is_live: False)'}")
    print(f"    - Score Real      : {real_res['score']} (Threshold: 0.6)")

    print("\n----------------------------------------------------------")
    print("[2] TESTING RE-CAPTURE / SCREEN SPOOF ATTACK VIA PURE ONNX INFERENCE:")
    # For testing spoof attack on pure ONNX session with modified weights / Moiré response
    spoof_res = check_liveness_from_crop(spoof_img, face_box)
    print(f"    - Anti-Spoof Status : {'BLOCKED (is_live: False)' if not spoof_res['is_live'] else 'PASSED (is_live: True)'}")
    print(f"    - Score Real        : {spoof_res['score']} (Threshold: 0.6)")

    print("\n==========================================================")

if __name__ == "__main__":
    run_pure_onnx_test()
