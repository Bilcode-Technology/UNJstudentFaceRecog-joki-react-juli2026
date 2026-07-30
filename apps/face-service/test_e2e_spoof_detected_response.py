import urllib.request
import json
import base64
import numpy as np

# A real base64 face sample string or payload
def test_e2e_spoof_response():
    url = "http://127.0.0.1:8001/verify"
    headers = {
        "X-Internal-Key": "secret_internal_key_change_me_in_production",
        "Content-Type": "application/json"
    }

    # Generate test image array
    np.random.seed(42)
    img_bytes = b"fake_image_bytes_for_testing"
    
    # We can test with a valid 1:1 verify call to HTTP server
    payload = {
        "image": base64.b64encode(img_bytes).decode(),
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
    test_e2e_spoof_response()
