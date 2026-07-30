# Execution Prompt — Fase 9: Anti-Spoofing (Liveness) Face Recognition

> Lanjutan seluruh fase sebelumnya. Ini PERUBAHAN keputusan bisnis dari
> asumsi awal ("liveness tidak diperlukan") — sekarang WAJIB ada deteksi
> anti-spoofing untuk mencegah kecurangan (foto dari foto/layar HP orang lain).
> Baca bersama `PROJECT_RULES.md`. Ikuti format envelope global rules.

## KONTEKS FASE INI

Tambahkan deteksi anti-spoofing (texture-based, mendeteksi foto/layar vs
wajah asli) ke `apps/face-service`, diterapkan di endpoint `/verify` (dipakai
saat presensi — target utama pencegahan kecurangan). Gunakan model open-source
berbasis CNN ringan (misal arsitektur mirip **MiniFASNet/Silent-Face-Anti-Spoofing**),
CPU-friendly karena VPS tidak ada GPU.

### Keputusan Desain

1. **Pesan kegagalan anti-spoofing ke user TETAP GENERIK**, sama seperti
   pesan kegagalan face match: `"Presensi gagal, silakan coba lagi."` —
   JANGAN beri tahu user bahwa sistem mendeteksi ini foto/layar (supaya tidak
   memberi petunjuk cara mengakali sistem). Alasan detail (`spoof_detected`)
   HANYA untuk log internal, sama seperti pola `no_face_detected` yang sudah ada.
2. Anti-spoofing check dijalankan **SEBELUM** face matching (fail fast — kalau
   terdeteksi spoof, tidak perlu lanjut hitung face distance).
3. Terapkan **HANYA di `/verify`** (presensi) untuk sekarang, BUKAN di
   `/encode` (registrasi) — supaya tidak menambah friksi di alur onboarding;
   bisa diperluas ke registrasi di fase terpisah nanti jika diperlukan.

---

## BAGIAN 1 — Python FastAPI: Model Anti-Spoofing

### Langkah 1
Install dependency tambahan: `torch`, `torchvision` (CPU-only build, gunakan
index CPU-only PyTorch untuk menghindari ukuran install yang besar), atau
alternatif library anti-spoofing lain yang lebih ringan jika agent menemukan
opsi yang lebih sesuai untuk CPU-only VPS kecil — **jelaskan pilihan library
di ringkasan akhir beserta alasan (ukuran model, kecepatan inferensi)**.

### Langkah 2
Buat `app/services/antispoof.py` berisi fungsi `check_liveness(image) -> dict`:
- Decode base64 → jalankan model anti-spoofing → hasilkan skor real/fake.
- Threshold configurable via env `ANTISPOOF_THRESHOLD` (cari nilai default
  yang wajar dari dokumentasi model yang dipakai, biasanya sekitar 0.5-0.7 —
  sebutkan nilai yang dipilih di ringkasan akhir).
- Return: `{"is_live": true|false, "score": 0.xx}`.

### Langkah 3
Modifikasi endpoint `POST /verify` di `app/routers/face.py`:
1. Jalankan `check_liveness()` DULU.
2. Jika `is_live: false` → return `{"success": false, "error": "spoof_detected"}`
   (kode alasan internal, TIDAK diteruskan mentah ke user — sama seperti pola
   `no_face_detected`/`invalid_image` yang sudah ada).
3. Jika `is_live: true` → lanjut proses face matching seperti biasa (tidak berubah).

### Langkah 4 — Performa
Ukur waktu eksekusi `/verify` dengan anti-spoofing aktif (sebelum vs sesudah
penambahan ini) di environment testing kamu — laporkan angkanya di ringkasan
akhir. Jika waktu proses jadi signifikan lebih lambat (>2-3 detik per request),
catat sebagai **catatan untuk pertimbangan spek VPS saat deployment** (mungkin
perlu RAM lebih besar dari estimasi awal Fase 0).

### Kriteria Selesai
- [ ] Foto wajah asli (live) → `is_live: true`, lanjut proses matching normal.
- [ ] Foto hasil foto ulang dari layar HP/print out → terdeteksi `is_live: false`.
- [ ] Endpoint tidak crash/500 untuk input gambar apa pun (edge case ditangani).
- [ ] Waktu eksekusi per request tercatat & dilaporkan.

---

## BAGIAN 2 — Laravel: Tidak Ada Perubahan Endpoint, Hanya Verifikasi Pesan

Karena `FaceRecognitionService::verify()` di Laravel (Fase 4) meneruskan
`error` dari Python sebagai kode internal (bukan pesan mentah ke user), TIDAK
PERLU perubahan kode Laravel untuk pesan generik ke user — **verifikasi ulang**
bahwa ini masih benar (baca kembali `AttendanceService::checkIn()`), dan
tambahkan logging: jika `error === 'spoof_detected'`, catat di log Laravel
dengan level lebih tinggi (misal `warning`, bukan `info` biasa) supaya KORMAT/
developer bisa memantau pola kecurangan yang terdeteksi dari log, meski user
tetap menerima pesan generik yang sama.

### Kriteria Selesai
- [ ] Tidak ada perubahan pesan ke end-user (tetap generik seperti sebelumnya).
- [ ] Log Laravel mencatat kejadian `spoof_detected` secara terpisah/lebih terlihat untuk keperluan monitoring.

---

## CATATAN UNTUK CODING AGENT

- JANGAN mengubah pesan error yang diterima mahasiswa — ini prinsip yang
  sudah berkali-kali ditegaskan sejak Fase 4, berlaku juga untuk kegagalan
  anti-spoofing.
- Jika model anti-spoofing yang dipilih ternyata terlalu berat untuk CPU biasa
  (waktu proses tidak wajar, >5 detik), **berhenti dan laporkan ke pengguna**
  sebelum melanjutkan — jangan paksakan model yang tidak proporsional untuk
  skala/budget proyek ini, cari alternatif lebih ringan atau tanyakan dulu.
- Laporkan hasil akhir: file ditambah/diubah, library yang dipilih & alasannya,
  threshold yang dipakai, waktu eksekusi rata-rata, dan konfirmasi kriteria
  selesai Bagian 1–2.
