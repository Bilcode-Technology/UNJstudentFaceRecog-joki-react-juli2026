import urllib.request
import json
import base64
import os
import numpy as np
from PIL import Image
import io

def generate_sample_face_b64():
    img_np = np.zeros((200, 200, 3), dtype=np.uint8)
    # High-frequency screen subpixel Moiré grid lines
    img_np[::2, :, :] = 255
    img_np[:, ::2, :] = 255
    buf = io.BytesIO()
    Image.fromarray(img_np).save(buf, format="JPEG")
    return base64.b64encode(buf.getvalue()).decode()

def test_fastapi_verify_spoof_response():
    url = "http://127.0.0.1:8001/verify"
    headers = {
        "X-Internal-Key": "secret_internal_key_change_me_in_production",
        "Content-Type": "application/json"
    }

    # Set ANTISPOOF_THRESHOLD high to trigger spoof_detected logic in verify_face()
    os.environ["ANTISPOOF_THRESHOLD"] = "0.99"
    
    b64_img = generate_sample_face_b64()
    
    payload = {
        "image": b64_img,
        "known_encoding": [0.1] * 128
    }

    req_data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=req_data, headers=headers, method='POST')

    print(f"Sending HTTP POST request to {url}...")
    try:
        with urllib.request.urlopen(req) as response:
            status_code = response.getcode()
            body = json.loads(response.read().decode('utf-8'))
            
            print("\n==========================================================")
            print("REAL FASTAPI HTTP ENDPOINT RESPONSE (POST /verify):")
            print("==========================================================")
            print(f"HTTP Status Code : {status_code}")
            print(f"HTTP JSON Body   : {json.dumps(body, indent=2)}")
            print("==========================================================")
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code} - {e.read().decode('utf-8')}")

if __name__ == "__main__":
    test_fastapi_verify_spoof_response()
