import urllib.request
import json
import base64
import numpy as np
import cv2
from PIL import Image, ImageDraw
import io
import face_recognition

def generate_face_with_spoof():
    # 1. Generate realistic face image that dlib detects as 1 face
    img = Image.new("RGB", (400, 400), color=(240, 240, 240))
    draw = ImageDraw.Draw(img)
    draw.ellipse([100, 60, 300, 310], fill=(232, 190, 160)) # Head
    draw.ellipse([140, 140, 175, 165], fill=(40, 30, 25))    # Eye L
    draw.ellipse([225, 140, 260, 165], fill=(40, 30, 25))    # Eye R
    draw.line([200, 150, 200, 210], fill=(190, 140, 110), width=4) # Nose
    draw.arc([160, 220, 240, 260], start=10, end=170, fill=(170, 60, 60), width=5) # Mouth

    img_np = np.array(img)

    # Add high-frequency Moiré grid lines (screen spoof)
    grid = np.zeros((400, 400, 3), dtype=np.uint8)
    grid[::2, :, :] = 255
    grid[:, ::2, :] = 255
    
    spoof_np = cv2.addWeighted(img_np, 0.4, grid, 0.6, 0)

    buf = io.BytesIO()
    Image.fromarray(spoof_np).save(buf, format="JPEG", quality=90)
    return base64.b64encode(buf.getvalue()).decode()

def test_e2e_verify_spoof():
    url = "http://127.0.0.1:8001/verify"
    headers = {
        "X-Internal-Key": "secret_internal_key_change_me_in_production",
        "Content-Type": "application/json"
    }
    
    b64_image = generate_face_with_spoof()
    
    payload = {
        "image": b64_image,
        "known_encoding": [0.1] * 128
    }
    
    req_data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=req_data, headers=headers, method='POST')
    
    print(f"Sending HTTP POST request to {url} with spoof payload...")
    with urllib.request.urlopen(req) as response:
        status_code = response.getcode()
        body = json.loads(response.read().decode('utf-8'))
        
        print("\n==========================================================")
        print("REAL FASTAPI HTTP ENDPOINT RESPONSE (POST /verify):")
        print("==========================================================")
        print(f"HTTP Status Code : {status_code}")
        print(f"HTTP JSON Body   : {json.dumps(body, indent=2)}")
        print("==========================================================")

if __name__ == "__main__":
    test_e2e_verify_spoof()
