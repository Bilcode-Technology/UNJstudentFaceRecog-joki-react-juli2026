import os
import cv2
import numpy as np
import base64
import io
from PIL import Image
from app.services.antispoof import get_onnx_session, check_liveness_from_crop

def run_pure_onnx_test():
    print("==========================================================")
    print("PURE ONNX INFERENCE TEST (MiniFASNetV2.onnx)")
    print("==========================================================")
    
    # 1. Confirm session loading
    session = get_onnx_session()
    if session is None:
        print("ERROR: ONNX Session failed to load!")
        return

    # 2. Generate test RGB image
    np.random.seed(42)
    img_np = np.random.randint(100, 220, (300, 300, 3), dtype=np.uint8)
    face_box = (40, 260, 260, 40) # (top, right, bottom, left)

    print("\nExecuting check_liveness_from_crop() via ONNX runtime...")
    result = check_liveness_from_crop(img_np, face_box)
    
    print("\n----------------------------------------------------------")
    print(f"ONNX Model Prediction Result:")
    print(f"  - is_live     : {result['is_live']}")
    print(f"  - real_score  : {result['score']}")
    print("----------------------------------------------------------")
    print("Pure ONNX test completed successfully.")
    print("==========================================================")

if __name__ == "__main__":
    run_pure_onnx_test()
