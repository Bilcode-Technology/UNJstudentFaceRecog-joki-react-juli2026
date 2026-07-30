# Execution Prompt — Fase 4: Modul Presensi

> Dokumen ini adalah instruksi eksekusi untuk coding agent, kelanjutan dari
> `EXECUTION_PROMPT_FASE_3.md`. WAJIB dibaca bersamaan dengan `PROJECT_RULES.md`.
> Ikuti format response envelope sesuai global rules project (`status`,
> `message`, `data`, `errors`, HTTP status code yang sesuai). Kerjakan secara
> berurutan. Jangan lompat ke modul Laporan/Dashboard/Notifikasi — di luar
> scope dokumen ini.

---

## KONTEKS FASE INI

Fase ini adalah **modul paling krusial** dari aplikasi: presensi berbasis face
recognition (server-side, 1:1 verification) dengan logging lokasi (non-blocking),
alur izin/sakit, override manual oleh KORMAT, dan job terjadwal untuk penentuan
status Alfa otomatis.

**Prasyarat**: Fase 2 (Auth, RBAC) dan Fase 3 (Courses, Class Sessions) sudah
selesai dan berjalan.

### Rekap Aturan Bisnis Wajib (Non-Negotiable)

Baca ulang sebelum implementasi, karena ini yang paling sering salah diasumsikan:

1. **Toleransi keterlambatan: 5 menit, FIXED untuk seluruh sistem** (bukan
   custom per kelas). Simpan sebagai config, bukan hardcode angka di banyak tempat.
2. **Presensi dalam 5 menit pertama sejak sesi mulai → status `hadir`, `late_minutes = 0`.**
3. **Presensi setelah 5 menit tapi masih dalam durasi sesi → tetap `hadir`, TAPI
   `late_minutes` dicatat sebagai jumlah menit sejak `start_time` (nilai mentah,
   BUKAN dikurangi toleransi).** Contoh: sesi mulai 08:00, mahasiswa presensi
   jam 08:12 → `late_minutes = 12`, status tetap `hadir`.
4. **Presensi setelah `end_time` sesi terlewati → TIDAK BISA check-in sama sekali**
   (window sudah tertutup). Status Alfa ditentukan lewat scheduled job, BUKAN
   saat itu juga.
5. **Tidak ada limit retry** face recognition — mahasiswa boleh coba berkali-kali
   selama window presensi masih terbuka.
6. **Foto TIDAK disimpan** di database maupun filesystem, baik di Laravel maupun
   Python — hanya hasil match, waktu, dan koordinat lokasi yang disimpan.
7. **Geofencing bersifat informasi/logging saja** — TIDAK memblokir proses
   check-in, berlaku sama untuk sesi online maupun offline. Cukup simpan
   `latitude`/`longitude` yang dikirim client, TIDAK PERLU menghitung jarak
   ke kampus atau validasi radius apapun di fase ini.
8. **Pesan error check-in HARUS generik**: `"Presensi gagal, silakan coba lagi."`
   — jangan pernah membedakan alasan (tidak ada wajah/tidak cocok/dsb) di
   response endpoint ini (beda dengan endpoint register di Fase 2 yang boleh spesifik).
9. **Izin/Sakit**: mahasiswa ajukan sendiri, **langsung tercatat tanpa approval
   dan tanpa upload bukti**.
10. **KORMAT bisa override status attendance secara manual** kapan saja
    (termasuk untuk mahasiswa yang belum punya baris attendance sama sekali).
11. Baris `attendances` dibuat **on-demand** (saat check-in/izin-sakit/override),
    KECUALI untuk status `alfa` yang dibuat lewat scheduled job.

---

## BAGIAN 1 — Python FastAPI: Endpoint `/verify`

### Langkah 1
Buat endpoint baru di `app/routers/face.py`:

**`POST /verify`**
- Header wajib: `X-Internal-Key` (pakai dependency yang sudah ada).
- Request body: `{ "image": "<base64 string>", "known_encoding": [128 float] }`
- Proses: decode base64 → deteksi & encode wajah dari foto baru → hitung jarak
  (`face_distance`) terhadap `known_encoding` → tentukan `match` berdasarkan
  threshold (gunakan nilai standar library `face_recognition`, yaitu **0.6**;
  jadikan threshold ini configurable via environment variable
  `FACE_MATCH_THRESHOLD` dengan default 0.6, jangan hardcode angka mentah di kode).
- Response sukses (wajah terdeteksi, baik match maupun tidak):
  `{ "success": true, "match": true|false, "distance": 0.42 }`
- Response gagal (tidak ada wajah terdeteksi di foto baru, atau format gambar
  invalid): `{ "success": false, "error": "no_face_detected" }` atau
  `"invalid_image"` — kode alasan ini untuk KEPERLUAN INTERNAL/LOGGING Laravel
  saja, TIDAK diteruskan apa adanya ke end-user (lihat aturan #8 di atas).

### Langkah 2
Tambahkan fungsi `verify_face()` di `app/services/recognition.py`, terpisah
dari `encode_face()` yang sudah ada di Fase 2, tapi boleh reuse helper decode
base64 yang sama.

### Kriteria Selesai Bagian 1
- [ ] `/verify` dengan foto sama persis (atau sangat mirip) dengan encoding
      referensi → `match: true`, distance kecil (< 0.6).
- [ ] `/verify` dengan foto wajah berbeda orang → `match: false`.
- [ ] `/verify` dengan foto tanpa wajah → `success: false, error: "no_face_detected"`,
      bukan crash 500.

---

## BAGIAN 2 — Laravel: Endpoint Presensi

### Langkah 1 — Config Toleransi
Tambahkan `config/attendance.php` (buat file config baru) berisi:
```php
return [
    'tolerance_minutes' => env('ATTENDANCE_TOLERANCE_MINUTES', 5),
];
```
Gunakan `config('attendance.tolerance_minutes')` di seluruh logic terkait —
JANGAN hardcode angka `5` langsung di Controller/Service.

### Langkah 2 — Authorization
Buat `app/Policies/AttendancePolicy.php` (atau tambahkan method di policy yang
sudah ada, sesuaikan dengan penilaian agent):
- Mahasiswa hanya bisa check-in/ajukan izin-sakit untuk dirinya sendiri, dan
  hanya jika statusnya `approved` di kelas terkait sesi tersebut.
- KORMAT hanya bisa melihat rekap/override attendance untuk sesi milik kelas
  yang dia kelola sendiri.

### Langkah 3 — Endpoint Check-in
**`POST /api/sessions/{id}/attendance/check-in`**
Middleware: `auth:sanctum`, `role:mahasiswa`.

Alur wajib (ikuti urutan ini persis):
1. Validasi request: `image` (base64, required), `latitude` (required, numeric),
   `longitude` (required, numeric).
2. Cek mahasiswa `approved` di kelas terkait sesi ini — jika tidak, 403.
3. Cek **belum ada baris `attendances`** untuk kombinasi user+sesi ini dengan
   status selain hasil check-in sebelumnya yang gagal (karena check-in gagal
   TIDAK membuat baris apapun — lihat langkah 6) — jika **sudah ada baris**
   (artinya sudah pernah presensi/izin/sakit untuk sesi ini), tolak dengan
   pesan jelas: "Anda sudah tercatat untuk sesi ini."
4. Cek window waktu: waktu sekarang harus **antara `start_time` dan `end_time`**
   sesi (gabungkan dengan `meeting_date` untuk perbandingan datetime penuh,
   perhatikan timezone `Asia/Jakarta`). Jika sudah lewat `end_time` atau belum
   masuk `start_time`, tolak dengan pesan jelas (boleh spesifik di sini karena
   ini bukan soal face recognition, misal: "Sesi belum dimulai" / "Sesi sudah berakhir").
5. Ambil `encoding` milik mahasiswa dari tabel `face_encodings`. Jika mahasiswa
   somehow tidak punya encoding (data tidak konsisten), kembalikan error yang
   jelas ke KORMAT/log, tapi ke mahasiswa tetap pesan generik sesuai aturan #8.
6. Panggil `FaceRecognitionService` method baru `verify(string $base64Image, array $knownEncoding): array`
   yang memanggil Python `/verify`.
   - Jika `match: false` ATAU Python mengembalikan `success: false` (no face
     detected/invalid image) → **JANGAN buat baris attendance apapun** →
     response ke client: `{"status": "error", "message": "Presensi gagal, silakan coba lagi."}`
     dengan HTTP status yang sesuai (422).
7. Jika `match: true`:
   - Hitung `minutes_since_start` = selisih menit antara waktu check-in dan `start_time` sesi.
   - Jika `minutes_since_start <= tolerance_minutes` → `late_minutes = 0`.
   - Jika `minutes_since_start > tolerance_minutes` → `late_minutes = minutes_since_start` (nilai mentah, sesuai aturan #3).
   - Buat baris `attendances`: `status = 'hadir'`, `late_minutes`, `checked_in_at = now()`,
     `latitude`, `longitude` (dari request, disimpan apa adanya, TIDAK divalidasi
     jaraknya), `is_manual_override = false`.
   - Bungkus pembuatan baris ini dalam DB transaction sederhana (untuk konsistensi,
     meski cuma 1 insert, supaya polanya seragam dengan bagian lain).
   - Response sukses: data attendance yang baru dibuat.

### Langkah 4 — Endpoint Izin/Sakit
**`POST /api/sessions/{id}/attendance/permission`**
Middleware: `auth:sanctum`, `role:mahasiswa`.

- Validasi: `status` (required, in: `izin`,`sakit`).
- Cek mahasiswa `approved` di kelas terkait.
- Cek belum ada baris attendance untuk sesi ini (cegah duplikat, sama seperti
  check-in) — jika sudah ada, tolak dengan pesan jelas.
- Cek window: boleh diajukan kapan saja **sebelum `end_time` sesi terlewati**
  (gunakan batas yang sama dengan check-in, TIDAK perlu menunggu sesi dimulai
  — mahasiswa mungkin sudah tahu akan izin/sakit sebelum kelas mulai).
- Buat baris attendance: `status` sesuai input, `late_minutes = null`,
  `checked_in_at = null`, tanpa lokasi.

### Langkah 5 — Endpoint Rekap Presensi (Sisi KORMAT)
**`GET /api/sessions/{id}/attendance`**
Middleware: `auth:sanctum`, `role:kormat`.

- Authorize: sesi harus milik kelas yang dikelola KORMAT ini.
- Return **SEMUA mahasiswa approved di kelas ini**, digabung dengan data
  attendance mereka untuk sesi ini JIKA ADA (left join / manual merge) — untuk
  mahasiswa yang belum punya baris attendance sama sekali (belum presensi,
  belum diproses job alfa), tampilkan status placeholder yang jelas, misal
  `"status": "belum_presensi"` (bukan salah satu dari 4 enum status resmi,
  murni untuk keperluan tampilan bahwa baris belum ada di database).

### Langkah 6 — Endpoint Override Manual (Sisi KORMAT)
**`PATCH /api/sessions/{id}/attendance/{student_id}`**
Middleware: `auth:sanctum`, `role:kormat`.

> Catatan desain: pakai path dengan `student_id` (bukan `attendance_id`), karena
> KORMAT perlu bisa override mahasiswa yang **belum punya baris attendance
> sama sekali** (misal set manual jadi `hadir` untuk mahasiswa yang wajahnya
> gagal dikenali berkali-kali). Gunakan `updateOrCreate` berdasarkan
> `class_session_id` + `user_id`.

- Authorize: sesi harus milik kelas yang dikelola KORMAT ini, DAN `student_id`
  harus mahasiswa `approved` di kelas tersebut.
- Validasi: `status` (required, in: `hadir`,`izin`,`sakit`,`alfa`).
- `updateOrCreate`: set `status` sesuai input, `is_manual_override = true`,
  `overridden_by = $request->user()->id`. Jika membuat baris baru (belum ada
  sebelumnya), `late_minutes` dan `checked_in_at`/lokasi tetap `null` (karena
  ini override manual, bukan hasil check-in asli).

### Kriteria Selesai Bagian 2
- [ ] Check-in dengan wajah cocok & tepat waktu → `hadir`, `late_minutes = 0`.
- [ ] Check-in dengan wajah cocok tapi lewat toleransi → `hadir`, `late_minutes` terisi sesuai perhitungan mentah (bukan dikurangi toleransi).
- [ ] Check-in dengan wajah tidak cocok → TIDAK ada baris attendance dibuat, response generik.
- [ ] Check-in setelah `end_time` sesi lewat → ditolak, tidak bisa check-in.
- [ ] Check-in dua kali untuk sesi yang sama → ditolak di percobaan kedua.
- [ ] Izin/sakit langsung tercatat tanpa approval.
- [ ] KORMAT bisa override attendance mahasiswa yang belum punya baris sama sekali (updateOrCreate berfungsi).
- [ ] Rekap presensi KORMAT menampilkan semua mahasiswa approved, termasuk yang belum ada baris attendance-nya.

---

## BAGIAN 3 — Laravel: Scheduled Job Auto-Alfa

### Langkah 1 — Command/Job
Buat Artisan Command baru, misal `app/Console/Commands/MarkAbsentStudents.php`
(`php artisan make:command MarkAbsentStudents`).

Logic:
1. Ambil semua `class_sessions` yang **sudah berakhir** (`meeting_date` +
   `end_time` sudah lewat dari waktu sekarang, dalam timezone `Asia/Jakarta`),
   DAN yang berakhir dalam rentang wajar ke belakang (misal 24 jam terakhir,
   supaya command tidak query seluruh histori tabel setiap kali dijalankan —
   gunakan judgment untuk batas ini).
2. Untuk setiap sesi tersebut, ambil semua mahasiswa `approved` di kelas terkait.
3. Untuk mahasiswa yang **belum punya baris `attendances`** untuk sesi ini →
   buat baris baru: `status = 'alfa'`, `late_minutes = null`,
   `checked_in_at = null`, `is_manual_override = false`.
4. Mahasiswa yang sudah punya baris (hadir/izin/sakit/sudah di-override
   KORMAT) → **dilewati** (ini yang membuat proses idempotent — command ini
   aman dijalankan berkali-kali tanpa efek samping ganda).

### Langkah 2 — Penjadwalan
Daftarkan command ini untuk berjalan otomatis secara berkala (misal setiap
5-10 menit — tentukan interval yang wajar, jelaskan alasannya di ringkasan
akhir) menggunakan Laravel Task Scheduling, sesuai lokasi registrasi yang
berlaku untuk versi Laravel yang dipakai di project ini (`routes/console.php`
untuk Laravel 11, atau `app/Console/Kernel.php` untuk versi lebih lama —
sesuaikan dengan apa yang sudah ter-setup dari Fase 0).

### Langkah 3 — Catatan Operasional
Tambahkan catatan di `README.md` (atau `docs/`) bahwa Laravel Scheduler ini
butuh **cron job aktif di VPS** (`* * * * * php artisan schedule:run`) supaya
benar-benar berjalan di production — sertakan reminder ini di ringkasan akhir
pengerjaan, karena ini bagian infrastruktur yang mudah terlewat saat deploy.

### Kriteria Selesai Bagian 3
- [ ] Command bisa dijalankan manual (`php artisan mark:absent-students` atau
      nama signature yang dipilih) dan menghasilkan baris `alfa` yang benar
      untuk mahasiswa yang belum presensi di sesi yang sudah lewat.
- [ ] Menjalankan command dua kali berturut-turut tidak menghasilkan baris
      duplikat atau error.
- [ ] Mahasiswa yang sudah izin/sakit/hadir tidak ikut ter-mark alfa.

---

## BAGIAN 4 — Next.js: BFF Proxy & UI Presensi

### Langkah 1 — BFF Proxy Routes
Gunakan `laravel-proxy.ts` yang sudah ada. Buat route baru:
- `src/app/api/sessions/[id]/attendance/check-in/route.ts` (`POST`)
- `src/app/api/sessions/[id]/attendance/permission/route.ts` (`POST`)
- `src/app/api/sessions/[id]/attendance/route.ts` (`GET`, untuk rekap KORMAT)
- `src/app/api/sessions/[id]/attendance/[studentId]/route.ts` (`PATCH`, override)

### Langkah 2 — Halaman Check-in (Mahasiswa)
Buat halaman fungsional minimal, misal `src/app/mahasiswa/sessions/[id]/attendance/page.tsx`:
- Tampilkan info sesi (nama kelas, waktu).
- Tombol "Presensi" yang membuka kamera (`getUserMedia`), capture 1 foto.
- **Wajib** minta izin lokasi browser (`navigator.geolocation.getCurrentPosition`)
  sebelum/bersamaan dengan submit — kirim `latitude`/`longitude` bersama foto.
- Tampilkan hasil: sukses (dengan info jika terlambat, tampilkan `late_minutes`)
  atau gagal (pesan generik, dengan tombol coba lagi — TIDAK ADA batas jumlah percobaan).
- Tombol terpisah untuk ajukan "Izin" atau "Sakit" (tanpa kamera/lokasi).

### Langkah 3 — Halaman Rekap & Override (KORMAT)
Buat halaman fungsional minimal, misal `src/app/kormat/sessions/[id]/attendance/page.tsx`:
- Tabel semua mahasiswa approved di kelas ini, dengan kolom status (termasuk
  placeholder "Belum Presensi" untuk yang belum ada baris), `late_minutes`
  (jika ada), waktu check-in (jika ada).
- Setiap baris punya dropdown/tombol untuk override status manual → memanggil
  endpoint PATCH override.

> Catatan: styling boleh sangat minimal, fokus ke fungsionalitas dan
> pembuktian alur end-to-end (termasuk memastikan kamera & geolocation browser
> benar-benar diminta izinnya).

### Kriteria Selesai Bagian 4
- [ ] Mahasiswa bisa presensi dari halaman ini dengan kamera & lokasi browser
      benar-benar diminta izinnya (bukan dummy/placeholder value).
- [ ] KORMAT bisa melihat rekap dan melakukan override dari halaman ini,
      termasuk untuk mahasiswa yang belum punya baris attendance sama sekali.

---

## CATATAN UNTUK CODING AGENT

- Jika ada keputusan teknis yang tidak tercakup secara eksplisit di dokumen
  ini atau `PROJECT_RULES.md`, **berhenti dan tanyakan ke pengguna**, jangan
  berasumsi sendiri — terutama untuk interval scheduled job dan penamaan
  signature command, yang meski diberi kebebasan menentukan, WAJIB dijelaskan
  alasannya di ringkasan akhir, bukan hanya "Open Questions: None".
- Patuhi aturan pesan generik untuk check-in (aturan #8) — JANGAN disamakan
  dengan pola pesan spesifik yang dipakai di endpoint register (Fase 2).
  Ini DUA konteks berbeda dengan aturan berbeda meskipun sama-sama memanggil
  face recognition service.
- Setelah Fase 4 selesai, JANGAN lanjut membangun modul Laporan/Dashboard/
  Notifikasi tanpa instruksi/prompt fase berikutnya.
- Laporkan hasil akhir dalam bentuk ringkasan: file yang ditambahkan/diubah,
  konfirmasi kriteria selesai Bagian 1–4, interval scheduled job yang dipilih
  beserta alasannya, dan reminder soal kebutuhan cron job aktif di VPS untuk production.
