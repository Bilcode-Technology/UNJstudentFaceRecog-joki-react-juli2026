# Skenario Testing End-to-End — Sistem Presensi Face Recognition

> Panduan pengujian manual menyeluruh, dari setup akun hingga seluruh alur bisnis.
> Gunakan Postman/Thunder Client untuk endpoint Laravel langsung (opsional), dan
> browser untuk pengujian via UI Next.js (BFF). Centang `[ ]` jadi `[x]` saat lulus.

## 0. Persiapan Data Uji

Buat akun-akun berikut sebelum memulai (lewat seeder/register/superadmin):

| Akun | Cara Dibuat | Role |
|---|---|---|
| Superadmin | Seeder (Fase 1) | superadmin |
| KORMAT A | Dibuat manual oleh superadmin | kormat |
| KORMAT B | Dibuat manual oleh superadmin | kormat |
| Mahasiswa 1, 2, 3 | Registrasi mandiri + face enrollment (foto wajah asli, BERBEDA orang untuk tiap akun) | mahasiswa |

> Catatan: siapkan foto wajah 3 orang berbeda (bisa pakai wajah sendiri dari 3 sudut/kondisi berbeda kalau tidak ada 3 orang asli) untuk menguji distinctness face recognition.

---

## 1. Auth & Face Enrollment (Fase 2)

- [v] Registrasi Mahasiswa 1 dengan foto wajah jelas → sukses, akun & face_encoding tersimpan.
- [v] Registrasi dengan foto **tanpa wajah** (misal foto pemandangan) → gagal, pesan spesifik jelas (bukan generik).
- [v] Registrasi dengan email yang sudah dipakai → gagal validasi (422).
- [v] Login Mahasiswa 1 dengan password benar → sukses, cookie `auth_token` ter-set httpOnly (cek DevTools).
- [v] Login dengan password salah → gagal (401/422), tidak ada cookie ter-set.
- [v] Akses halaman/endpoint ber-auth tanpa login → redirect ke `/login` (Next.js) atau 401 (Laravel langsung).
- [v] `GET /api/auth/me` setelah login → data user + role benar.
- [v] Logout → cookie terhapus, akses ulang ke halaman protected → redirect ke login lagi.
- [v] Coba akses endpoint khusus KORMAT (misal `POST /api/courses`) dengan akun Mahasiswa → 403.

---

## 2. Modul Kelas (Fase 3)

- [v] KORMAT A buat kelas baru ("Pemrograman Web", kode unik) → sukses, `join_code` 6 karakter ter-generate otomatis.
- [v] KORMAT A coba buat kelas dengan `code` yang sama persis → gagal (unique constraint).
- [v] KORMAT A lihat detail kelasnya → data lengkap, jumlah mahasiswa 0.
- [v] **KORMAT B** coba akses/edit/arsipkan kelas milik KORMAT A → 403 di semua kasus.
- [v] KORMAT A hapus kelas yang **belum punya sesi** → berhasil terhapus.
- [v] KORMAT A buat kelas baru lagi, lalu buat 1 sesi di dalamnya, lalu coba hapus kelas itu → **gagal**, pesan jelas ("sudah punya sesi pertemuan").
- [v] Mahasiswa 1 lihat daftar kelas tersedia → kelas KORMAT A muncul (belum diikuti).
- [v] Mahasiswa 1 join pakai `join_code` → status `pending`.
- [v] Mahasiswa 1 coba join kelas yang sama lagi → gagal, "sudah pernah mengajukan".
- [v] KORMAT A lihat daftar mahasiswa di kelasnya → Mahasiswa 1 muncul status `pending`.
- [v] KORMAT A approve Mahasiswa 1 → status jadi `approved`, `joined_at` terisi.
- [v] Mahasiswa 2 & 3 join kelas yang sama → KORMAT A bulk-approve keduanya sekaligus → status keduanya `approved`.
- [v] KORMAT A arsipkan kelas → kelas tidak lagi muncul di `courses/available` untuk mahasiswa baru.

---

## 3. Sesi Pertemuan (Fase 3)

- [v] KORMAT A buat sesi baru dengan `meeting_type = offline`, tanpa isi `room` → gagal validasi (room wajib jika offline).
- [v] KORMAT A buat sesi offline dengan `room` terisi, tanggal hari ini, `start_time`/`end_time` sesuai jam berjalan (untuk keperluan test presensi realtime nanti) → sukses.
- [ ] Buat sesi dengan `end_time` lebih awal dari `start_time` → gagal validasi (422).
- [ ] Buat sesi dengan `meeting_date` kemarin (tanggal lampau) → gagal validasi (jika sudah diterapkan sesuai Fase 3).
- [v] Mahasiswa yang **belum approved** di kelas ini coba lihat daftar sesi → 403.
- [v] Mahasiswa yang approved lihat daftar sesi → berhasil, sesi hari ini muncul.
- [v] `GET /api/sessions/today` untuk KORMAT A → sesi yang baru dibuat muncul.
- [v] `GET /api/sessions/today` untuk Mahasiswa 1 (approved) → sesi yang sama muncul.

---

## 4. Presensi (Fase 4) — Bagian Paling Kritis

> Siapkan 1 sesi aktif (window `start_time`–`end_time` mencakup waktu sekarang) sebelum mulai bagian ini.

- [ ] Mahasiswa 1 check-in dengan foto wajah **sendiri yang valid**, dalam 5 menit pertama sejak `start_time` → sukses, `status='hadir'`, `late_minutes=0`.
- [ ] Mahasiswa 2 check-in dengan foto wajah **sendiri**, tapi **setelah 5 menit** dari `start_time` (tunggu atau buat sesi dengan start_time mundur) → sukses, `status='hadir'`, `late_minutes` terisi angka **mentah** sesuai menit keterlambatan (bukan dikurangi 5).
- [ ] Mahasiswa 3 check-in dengan **foto wajah Mahasiswa 1** (foto orang lain) → **gagal**, pesan generik persis: `"Presensi gagal, silakan coba lagi."` — **tidak ada baris attendance dibuat** (cek langsung ke DB/rekap).
- [ ] Mahasiswa 3 coba lagi dengan foto **wajahnya sendiri** setelah kegagalan di atas → sukses (buktikan **tidak ada limit retry**).
- [ ] Mahasiswa 1 (sudah check-in) coba check-in lagi di sesi yang sama → ditolak, "sudah tercatat untuk sesi ini".
- [ ] Buat sesi baru dengan window sudah **lewat** (`end_time` di masa lalu) → mahasiswa coba check-in → ditolak, "sesi sudah berakhir".
- [ ] Cek permintaan izin lokasi browser benar-benar muncul saat proses check-in (bukan dummy), dan `latitude`/`longitude` tersimpan di baris attendance apa adanya (tanpa validasi jarak/radius apa pun, baik online maupun offline).
- [ ] Mahasiswa lain (belum check-in) ajukan **Izin** → langsung tercatat status `izin`, tanpa approval, tanpa upload bukti.
- [ ] Mahasiswa lain lagi ajukan **Sakit** → langsung tercatat status `sakit`.
- [ ] Mahasiswa yang sudah ajukan izin, coba check-in lagi di sesi sama → ditolak (duplikat).
- [ ] KORMAT A lihat rekap sesi ini → semua mahasiswa approved muncul, termasuk yang **belum presensi sama sekali** dengan placeholder `"belum_presensi"`.
- [ ] KORMAT A override status salah satu mahasiswa yang belum presensi jadi `hadir` manual → berhasil, `is_manual_override=true`, `overridden_by` terisi ID KORMAT A.
- [ ] Buat sesi baru dengan `end_time` beberapa menit dari sekarang, biarkan lewat tanpa ada mahasiswa yang presensi/izin sama sekali → jalankan command `mark:absent-students` (atau signature yang dipakai) secara manual → mahasiswa yang tidak presensi otomatis jadi `alfa`.
- [ ] Jalankan command yang sama dua kali berturut-turut → tidak ada duplikat/error (idempotent).

---

## 5. Laporan (Fase 5)

- [ ] KORMAT A akses `GET /api/courses/{id}/report` → data lengkap semua sesi × semua mahasiswa approved.
- [ ] **KORMAT B** coba akses laporan kelas milik KORMAT A → 403.
- [ ] KORMAT A klik "Export PDF" → file PDF terunduh, bisa dibuka, isinya konsisten dengan data di halaman preview (jumlah sesi, status per mahasiswa, `late_minutes` sesuai).

---

## 6. Dashboard (Fase 5)

- [ ] Login sebagai KORMAT A → otomatis redirect ke `/kormat/dashboard`. Cek: jumlah kelas aktif benar, jumlah mahasiswa approved per kelas benar, jadwal hari ini menampilkan sesi yang relevan.
- [ ] Login sebagai Mahasiswa 1 → redirect ke `/mahasiswa/dashboard`. Cek: jumlah kelas diikuti benar, statistik hadir/izin/sakit/alfa per kelas sesuai dengan hasil testing Bagian 4, jadwal hari ini benar.

---

## 7. Notifikasi (Fase 6)

- [ ] Saat login pertama kali (dashboard mount), browser menampilkan prompt izin notifikasi (nyata, bukan dummy).
- [ ] Setelah izin diberikan, cek tabel `push_subscriptions` — ada baris baru untuk user ini.
- [ ] Mahasiswa baru join kelas → KORMAT pemilik kelas menerima notifikasi (cek `GET /api/notifications` KORMAT, dan jika browser KORMAT terbuka & subscribed, cek juga native push notification muncul).
- [ ] KORMAT approve/reject join request → Mahasiswa terkait menerima notifikasi serupa.
- [ ] Buat sesi dengan `start_time` 10-15 menit dari sekarang, jalankan command reminder manual → mahasiswa approved di kelas itu menerima notifikasi reminder; `reminder_sent_at` di sesi tersebut terisi.
- [ ] Jalankan command reminder yang sama lagi → tidak ada notifikasi reminder duplikat terkirim.
- [ ] Buka `/notifications` → daftar notifikasi user muncul, klik "Tandai Dibaca" → `read_at` ter-update.
- [ ] Coba akses/mark-read notifikasi milik user lain (pakai ID notifikasi orang lain) → 403/404.

---

## 8. Skenario Lintas Modul (Full End-to-End)

Simulasikan 1 alur penuh dari nol untuk memastikan semua modul terhubung mulus:

1. [ ] Mahasiswa baru (Mahasiswa 4) registrasi + face enrollment.
2. [ ] Mahasiswa 4 login, lihat dashboard kosong (belum ada kelas).
3. [ ] Mahasiswa 4 join kelas KORMAT A → KORMAT A dapat notifikasi → KORMAT A approve → Mahasiswa 4 dapat notifikasi.
4. [ ] KORMAT A buat sesi baru untuk hari ini.
5. [ ] Mahasiswa 4 dapat reminder (jika dalam window 15 menit) → cek dashboard, sesi muncul di "jadwal hari ini".
6. [ ] Mahasiswa 4 check-in dengan wajah asli → sukses, muncul di dashboard sebagai statistik hadir bertambah.
7. [ ] KORMAT A lihat rekap sesi, lihat Mahasiswa 4 sudah hadir.
8. [ ] KORMAT A export laporan PDF → Mahasiswa 4 muncul di laporan dengan status benar.
9. [ ] Semua langkah di atas dilakukan **hanya lewat UI Next.js** (tidak langsung ke Laravel), verifikasi lewat Network tab bahwa semua request melalui domain Next.js (BFF), bukan domain/IP Laravel langsung.

---

## Catatan Pelaporan Bug

Jika ada langkah yang gagal, catat: nomor skenario, hasil aktual vs yang diharapkan, dan screenshot/response body jika memungkinkan — supaya lebih mudah diteruskan kembali ke coding agent sebagai instruksi perbaikan yang presisi (bukan sekadar "ada bug di presensi").
