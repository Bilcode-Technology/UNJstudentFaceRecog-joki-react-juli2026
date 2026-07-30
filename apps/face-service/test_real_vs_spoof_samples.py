import os
import cv2
import numpy as np
import base64
import io
from PIL import Image, ImageDraw, ImageFilter
from app.services.antispoof import analyze_texture_liveness, check_liveness_from_crop
from app.services.recognition import verify_face

def generate_live_face_sample():
    """Generates a natural camera face image with realistic skin noise and color variance."""
    np.random.seed(42)
    img_np = np.zeros((400, 400, 3), dtype=np.uint8)
    # Background
    img_np[:, :] = [240, 238, 230]
    
    # Face oval with natural skin tone + RGB noise
    h, w, _ = img_np.shape
    cy, cx = h // 2, w // 2
    y_grid, x_grid = np.ogrid[:h, :w]
    mask = ((x_grid - cx)**2 / (110**2) + (y_grid - cy)**2 / (140**2)) <= 1.0
    
    # Base skin tone BGR
    skin_color = np.array([160, 190, 232], dtype=np.float32)
    noise = np.random.normal(0, 12, (h, w, 3))
    
    face_rgb = np.clip(skin_color + noise, 0, 255).astype(np.uint8)
    img_np[mask] = face_rgb[mask]
    
    buf = io.BytesIO()
    Image.fromarray(img_np).save(buf, format="JPEG", quality=95)
    return img_np, base64.b64encode(buf.getvalue()).decode()

def generate_spoof_screen_sample(live_img_np):
    """Generates a screen replay attack image with Moiré grid artifacts and screen glare."""
    h, w, _ = live_img_np.shape
    spoof = live_img_np.copy()
    
    # Moiré interference pattern (high frequency grid spikes)
    y, x = np.ogrid[:h, :w]
    moire = (np.sin(y * 0.85) * np.sin(x * 0.85) * 45).astype(np.int16)
    
    for c in range(3):
        spoof[:, :, c] = np.clip(spoof[:, :, c].astype(np.int16) + moire, 0, 255).astype(np.uint8)

    # Flatten saturation / screen backlight reflection
    hsv = cv2.cvtColor(spoof, cv2.COLOR_RGB2HSV)
    hsv[:, :, 1] = (hsv[:, :, 1] * 0.2).astype(np.uint8) # Flattened saturation
    spoof = cv2.cvtColor(hsv, cv2.COLOR_HSV2RGB)

    buf = io.BytesIO()
    Image.fromarray(spoof).save(buf, format="JPEG", quality=60)
    return spoof, base64.b64encode(buf.getvalue()).decode()

def run_empirical_anti_spoof_test():
    print("==================================================")
    print("EMPIRICAL TEST: REAL FACE VS SCREEN/PRINT SPOOF")
    print("==================================================")
    
    real_np, real_b64 = generate_live_face_sample()
    spoof_np, spoof_b64 = generate_spoof_screen_sample(real_np)
    
    face_box = (60, 300, 310, 100)
    
    # Calculate metrics manually for display
    def get_metrics(img_crop):
        bgr = cv2.cvtColor(img_crop, cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
        hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
        lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        sat_std = float(np.std(hsv[:, :, 1]))
        val_std = float(np.std(hsv[:, :, 2]))
        
        f = np.fft.fft2(gray)
        fshift = np.fft.fftshift(f)
        mag = 20 * np.log(np.abs(fshift) + 1e-8)
        rows, cols = gray.shape
        crow, ccol = rows // 2, cols // 2
        r = min(rows, cols) // 6
        mask = np.ones((rows, cols), np.uint8)
        cv2.circle(mask, (ccol, crow), r, 0, -1)
        high_freq = float(np.mean(mag * mask) / (np.mean(mag) + 1e-8))
        
        return lap_var, sat_std, val_std, high_freq

    real_crop = real_np[60:310, 100:300]
    spoof_crop = spoof_np[60:310, 100:300]

    r_lap, r_sat, r_val, r_freq = get_metrics(real_crop)
    s_lap, s_sat, s_val, s_freq = get_metrics(spoof_crop)

    real_res = check_liveness_from_crop(real_np, face_box)
    spoof_res = check_liveness_from_crop(spoof_np, face_box)
    
    print(f"\n[1] Foto Wajah Asli (Live Sample):")
    print(f"    - Metrics           : LapVar={r_lap:.2f}, SatStd={r_sat:.2f}, ValStd={r_val:.2f}, HighFreq={r_freq:.2f}")
    print(f"    - Status Liveness   : {'PASSED (is_live: True)' if real_res['is_live'] else 'FAILED (is_live: False)'}")
    print(f"    - Score Liveness    : {real_res['score']} (Threshold: 0.6)")
    
    print(f"\n[2] Foto Re-Capture / Layar HP (Spoof Attack Sample):")
    print(f"    - Metrics           : LapVar={s_lap:.2f}, SatStd={s_sat:.2f}, ValStd={s_val:.2f}, HighFreq={s_freq:.2f}")
    print(f"    - Status Anti-Spoof : {'BLOCKED (is_live: False)' if not spoof_res['is_live'] else 'PASSED (is_live: True)'}")
    print(f"    - Score Liveness    : {spoof_res['score']} (Threshold: 0.6)")
    print("==================================================")

if __name__ == "__main__":
    run_empirical_anti_spoof_test()
