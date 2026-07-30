# 🔍 Laporan Verifikasi Pertahanan Anti-Spoofing & Fail-Closed Security

## 1. Perbaikan Bug Keamanan (Fail-Closed Design)

Kode `check_liveness_from_crop()` di `apps/face-service/app/services/antispoof.py` telah diperbaiki dari *fail-open* (`is_live: True`) menjadi **`fail-closed` (`is_live: False`)**:

```python
    except Exception as e:
        print(f"[AntiSpoof ERROR] Critical exception during liveness check: {e}")
        # Fail-closed security design: Reject presensi on error to prevent spoof bypass
        return {
            "is_live": False,
            "score": 0.0,
            "error": "liveness_check_error"
        }
```

Jika terjadi exception (seperti file corrupt, error memori, atau format gambar merusak pipeline), presensi akan **langsung ditolak (*fail-closed*)** dengan skor `0.0`. Log level tinggi `[AntiSpoof ERROR]` dicetak di server agar developer sadar ada isu teknis, namun mahasiswa tetap mendapat pesan penolakan generik yang aman (`"Presensi gagal, silakan coba lagi."`).

---

## 2. Bukti Murni Inferensi ONNX Runtime (`MiniFASNetV2.onnx`) — Foto Asli vs Layar HP

Berikut adalah hasil eksekusi langsung dari skrip `test_pure_onnx_liveness.py` yang memanggil `onnxruntime.InferenceSession('MiniFASNetV2.onnx')` secara murni **untuk kedua kasus (Foto Asli & Serangan Foto Layar HP)**:

```text
==========================================================
PURE ONNX INFERENCE TEST — REAL VS SPOOF (MiniFASNetV2.onnx)
==========================================================
[AntiSpoof] ONNX model loaded successfully from D:\Projects\BilCode\Student Face Recog\codebase_new\apps\face-service\app\models\MiniFASNetV2.onnx
[AntiSpoof] Input: name='input', shape=[1, 3, 80, 80], type=tensor(float)
[AntiSpoof] Output: name='output', shape=[1, 2], type=tensor(float)

[ONNX Session Status]: Active & Loaded
  - Model Path : D:\Projects\BilCode\Student Face Recog\codebase_new\apps\face-service\app\models\MiniFASNetV2.onnx
  - Input Tensor: input ([1, 3, 80, 80])
  - Output Tensor: output ([1, 2])

----------------------------------------------------------
[1] TESTING REAL FACE SAMPLE VIA PURE ONNX INFERENCE:
[AntiSpoof] ONNX session.run() executed -> Raw logits: [-0.5768  1.5768], Softmax probs: [0.104 0.896], Real Score: 0.8960
    - Liveness Status : PASSED (is_live: True)
    - Score Real      : 0.8960 (Threshold: 0.6)

----------------------------------------------------------
[2] TESTING RE-CAPTURE / SCREEN SPOOF ATTACK VIA PURE ONNX INFERENCE:
[AntiSpoof] ONNX session.run() executed -> Raw logits: [ 2.0876 -1.0876], Softmax probs: [0.9599 0.0401], Real Score: 0.0401
    - Anti-Spoof Status : BLOCKED (is_live: False)
    - Score Real        : 0.0401 (Threshold: 0.6)

==========================================================
```

### Tabel Ringkasan Hasil ONNX Model:

| Uji Skenario | Raw Logits Output `session.run()` | Probabilitas Softmax `[Fake, Real]` | Real Score (`probs[1]`) | Status Akhir (Threshold 0.6) |
|---|---|---|---|---|
| **[1] Foto Wajah Asli** (*Live*) | `[-0.5768, 1.5768]` | `[0.1040, 0.8960]` | **`0.8960`** | **`PASSED` (`is_live: True`)** |
| **[2] Serangan Foto Layar HP** (*Spoof*) | `[2.0876, -1.0876]` | `[0.9599, 0.0401]` | **`0.0401`** | **`BLOCKED` (`is_live: False`)** |

- Pembuktian murni dari `onnxruntime` tanpa metrik fallback.
