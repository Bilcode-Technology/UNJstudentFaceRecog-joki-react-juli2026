# Execution Prompt — Fase 10: Geofencing Radius (Blocking, Sesi Offline)

> Lanjutan seluruh fase sebelumnya. Ini PERUBAHAN keputusan bisnis dari Fase 4
> ("geofence murni logging, tidak blocking") — sekarang WAJIB ada validasi
> radius untuk sesi OFFLINE saja. Sesi ONLINE tetap tanpa validasi (logging
> saja, sesuai keputusan asli). Baca bersama `PROJECT_RULES.md`.

## KONTEKS FASE INI

Tambahkan validasi jarak (Haversine distance) antara lokasi mahasiswa saat
check-in vs titik pusat kampus, KHUSUS untuk sesi `meeting_type = offline`.

### Keputusan Desain

1. **Hanya berlaku untuk sesi offline.** Sesi online TETAP seperti Fase 4
   (lat/long disimpan apa adanya, tanpa validasi apa pun) — JANGAN ubah
   behavior sesi online.
2. **Titik pusat & radius disimpan sebagai CONFIG global** (bukan hardcode di
   banyak tempat, dan bukan per-kelas dulu — biar simpel sesuai kebutuhan
   sekarang), TAPI struktur kode dibuat supaya **mudah di-upgrade ke per-kelas/
   per-gedung nanti** tanpa rombak besar (lihat Langkah 2).
3. **Pesan error boleh spesifik** (ini bukan soal face recognition, jadi tidak
   melanggar prinsip pesan generik Fase 4) — misal: "Anda berada di luar
   radius lokasi kelas."
4. **Urutan validasi**: cek geofence **SETELAH** cek window waktu, tapi
   **SEBELUM** memanggil face recognition service (fail fast, hemat compute,
   dan tidak relevan untuk digabung dengan alasan gagal face match).

---

## BAGIAN 1 — Laravel: Config & Service

### Langkah 1 — Config
Tambahkan ke `config/attendance.php` (file yang sudah ada dari Fase 4):
```php
'geofence' => [
    'center_lat' => env('GEOFENCE_CENTER_LAT', -6.194229667565236),
    'center_lng' => env('GEOFENCE_CENTER_LNG', 106.87905999303226),
    'radius_meters' => env('GEOFENCE_RADIUS_METERS', 500),
],
```
Tambahkan variabel ini ke `.env` dan `.env.example`.

### Langkah 2 — Service Perhitungan Jarak (Desain untuk Ekstensi Masa Depan)
Buat `app/Services/GeofenceService.php` dengan method:
```php
public function getCenterFor(ClassSession $session): array // ['lat' => ..., 'lng' => ...]
public function getRadiusFor(ClassSession $session): int // meters
public function isWithinRadius(float $lat, float $lng, ClassSession $session): bool
```
- Untuk SEKARANG, `getCenterFor()` dan `getRadiusFor()` **selalu return nilai
  dari config global** (Langkah 1), TIDAK peduli sesi/kelas mana.
- **TUJUAN method dipisah per-sesi (bukan langsung baca config di tempat
  pemakaian)**: supaya nanti kalau perlu titik/radius berbeda per kelas atau
  per gedung, tinggal ubah isi 2 method ini (misal baca dari kolom baru di
  tabel `courses`), TANPA mengubah pemanggil (`AttendanceService`) sama sekali.
- Gunakan rumus **Haversine** standar untuk hitung jarak antara 2 koordinat.

### Kriteria Selesai
- [ ] `GeofenceService::isWithinRadius()` mengembalikan hasil benar untuk koordinat di dalam & di luar radius 500m dari titik yang ditentukan (uji dengan koordinat yang diketahui jaraknya).

---

## BAGIAN 2 — Laravel: Integrasi ke Check-in

Modifikasi `AttendanceService::checkIn()` (Fase 4):
1. Setelah cek window waktu (sudah ada), **tambahkan langkah baru**: jika
   `classSession->meeting_type === 'offline'`, panggil
   `GeofenceService::isWithinRadius($lat, $lng, $session)`.
   - Jika `false` → **JANGAN buat baris attendance apa pun** → return error
     jelas: "Anda berada di luar radius lokasi kelas." (HTTP 422).
   - Jika `true` atau sesi `online` → lanjut proses seperti biasa (panggil
     face recognition, dst — TIDAK ADA PERUBAHAN di langkah setelah ini).
2. Simpan `latitude`/`longitude` tetap seperti Fase 4 (apa adanya), TIDAK
   perlu kolom baru untuk menyimpan "jarak" — cukup validasi lolos/tidak.

### Kriteria Selesai
- [ ] Check-in di sesi offline dari lokasi DALAM radius 500m → lanjut proses normal (face recognition dst tidak berubah).
- [ ] Check-in di sesi offline dari lokasi DI LUAR radius 500m → ditolak dengan pesan jelas, TIDAK ada baris attendance dibuat, TIDAK memanggil face service sama sekali (hemat compute).
- [ ] Check-in di sesi ONLINE dari lokasi mana pun → TIDAK ada validasi radius sama sekali, behavior identik dengan Fase 4 (regresi check wajib dilakukan).

---

## BAGIAN 3 — Next.js: Pesan UI

Update halaman check-in mahasiswa (Fase 8B) — pastikan pesan error dari
backend ("Anda berada di luar radius lokasi kelas") ditampilkan dengan jelas
ke mahasiswa, dibedakan secara visual dari pesan gagal face recognition
generik (misal beri ikon lokasi vs ikon wajah, supaya mahasiswa paham
tindakan apa yang perlu diambil — pindah lokasi vs foto ulang).

### Kriteria Selesai
- [ ] Pesan gagal karena lokasi tampil jelas berbeda dari pesan gagal wajah, tanpa mengubah komponen/logic lain yang sudah ada.

---

## CATATAN UNTUK CODING AGENT

- JANGAN ubah behavior sesi online — regresi di sini fatal karena melanggar
  keputusan bisnis yang eksplisit (sesi online tetap non-blocking).
- Rumus Haversine harus akurat — uji dengan minimal 2 titik koordinat yang
  jaraknya sudah diketahui manual (misal pakai kalkulator jarak online)
  untuk memvalidasi implementasi sebelum dianggap selesai.
- Jika ada keputusan tidak tercakup eksplisit (misal toleransi akurasi GPS),
  putuskan dengan alasan jelas, WAJIB dijelaskan di ringkasan akhir.
- Ingatkan pengguna (saya akan teruskan ke user) bahwa jika GPS mahasiswa
  tidak akurat (misal di dalam gedung), mekanisme **override manual KORMAT**
  dari Fase 4 tetap jadi jalan keluar resmi — tidak perlu dibuat mekanisme
  toleransi tambahan di fase ini kecuali diminta eksplisit.
- Laporkan hasil akhir: file ditambah/diubah, hasil uji Haversine, konfirmasi
  kriteria selesai Bagian 1–3, dan konfirmasi eksplisit bahwa sesi online
  tidak mengalami regresi.
