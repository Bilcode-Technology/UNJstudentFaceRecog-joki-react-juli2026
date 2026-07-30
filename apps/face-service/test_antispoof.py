import time
import base64
import numpy as np
from PIL import Image, ImageDraw
import io
from app.services.recognition import verify_face, encode_face
from app.services.antispoof import check_liveness_from_crop

def create_synthetic_face_image():
    # Create a synthetic image with a face-like structure
    img = Image.new("RGB", (300, 300), color=(240, 240, 240))
    draw = ImageDraw.Draw(img)
    # Head
    draw.ellipse([80, 50, 220, 230], fill=(235, 195, 160))
    # Eyes
    draw.ellipse([110, 100, 135, 120], fill=(50, 50, 50))
    draw.ellipse([165, 100, 190, 120], fill=(50, 50, 50))
    # Nose
    draw.line([150, 120, 150, 160], fill=(180, 130, 100), width=3)
    # Mouth
    draw.arc([120, 160, 180, 195], start=0, end=180, fill=(180, 50, 50), width=3)
    
    buffered = io.BytesIO()
    img.save(buffered, format="JPEG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return img_str

def test_liveness_performance():
    print("Testing Anti-Spoofing Performance & Logic...")
    img_b64 = create_synthetic_face_image()
    
    start_time = time.time()
    # Dummy encoding
    dummy_encoding = [0.0] * 128
    res = verify_face(img_b64, dummy_encoding)
    elapsed_ms = (time.time() - start_time) * 1000.0
    
    print(f"Verify Result: {res}")
    print(f"Execution Latency: {elapsed_ms:.2f} ms")
    return elapsed_ms

if __name__ == "__main__":
    test_liveness_performance()
