---
trigger: always_on
---

# Execution Prompt — Fase 3: Modul Kelas & Sesi Pertemuan

> Dokumen ini adalah instruksi eksekusi untuk coding agent, kelanjutan dari
> `EXECUTION_PROMPT_FASE_2.md`. WAJIB dibaca bersamaan dengan `PROJECT_RULES.md`
> (aturan bisnis) dan mengikuti format response envelope sesuai global rules
> project (`status: "success"|"error"`, `message`, `data`, `errors`, beserta HTTP
> status code yang sesuai). Kerjakan secara berurutan, per langkah. Jangan lompat
> ke modul Presensi/Laporan/Dashboard/Notifikasi — itu di luar scope dokumen ini.

---

## KONTEKS FASE INI

Fase ini membangun modul **Kelas (Courses)** dan **Sesi Pertemuan (Class Sessions)**,
mencakup sisi KORMAT (buat kelas, kelola approval mahasiswa, buat sesi) dan sisi
Mahasiswa (lihat kelas tersedia, join kelas, lihat sesi).

**Prasyarat**: Fase 2 (Auth, RBAC middleware `role:kormat`/`role:mahasiswa`, BFF
proxy) sudah selesai dan berjalan.

**Di luar scope fase ini** (jangan dikerjakan): endpoint presensi/check-in,
laporan, dashboard, notifikasi. Cukup sampai data kelas & sesi bisa dikelola
penuh dan mahasiswa bisa join.

---

## BAGIAN 1 — Laravel: Modul Kelas (Courses)

### Langkah 1 — Authorization Policy
1. Buat `app/Policies/CoursePolicy.php` dengan method minimal:
   - `update(User $user, Course $course)`: true HANYA jika `$course->kormat_id === $user->id`.
   - `delete(User $user, Course $course)`: true HANYA jika `$course->kormat_id === $user->id` DAN kelas tersebut **belum memiliki `class_sessions` sama sekali**.
   - `view(User $user, Course $course)`: true jika user adalah KORMAT pemilik ATAU mahasiswa dengan status `approved` di kelas tersebut.
2. Daftarkan policy ini di provider yang sesuai (`AuthServiceProvider` atau cara registrasi policy sesuai versi Laravel yang dipakai).
3. **Wajib**: setiap endpoint yang memodifikasi/menghapus kelas HARUS memanggil `$this->authorize(...)` atau `Gate::authorize(...)` menggunakan policy ini — JANGAN hanya mengandalkan filter query `where('kormat_id', ...)` tanpa authorization check eksplisit, supaya percobaan akses ke kelas KORMAT lain mengembalikan 403 yang jelas (bukan 404 yang ambigu).

### Langkah 2 — Auto-generate `join_code`
Pastikan (atau perbaiki jika perlu) generator `join_code` di model `Course`:
- 6 karakter, kombinasi huruf besar (A-Z) dan angka (0-9).
- Cek keunikan terhadap kolom `join_code` sebelum disimpan; jika bentrok, generate ulang (retry loop dengan batas wajar, misal maksimal 5 kali percobaan sebelum melempar exception).

### Langkah 3 — Endpoint Kelas (Sisi KORMAT)
Middleware: `auth:sanctum`, `role:kormat`.

**`POST /api/courses`**
- Validasi: `name` (required), `code` (required, unique).
- `kormat_id` diambil dari user yang login (JANGAN terima dari request body).
- `join_code` di-generate otomatis (Langkah 2), tidak diterima dari input.
- Response: data kelas yang baru dibuat.

**`GET /api/courses`**
- List kelas milik KORMAT yang login saja (filter `kormat_id`).
- Sertakan jumlah mahasiswa approved per kelas (misal pakai `withCount` dengan kondisi status `approved`).
- Query param opsional `?archived=true/false` untuk filter status arsip (default: tampilkan yang tidak diarsipkan).

**`GET /api/courses/{id}`**
- Authorize pakai `CoursePolicy::view`.
- Detail kelas + daftar sesi ringkas + jumlah mahasiswa per status (pending/approved/rejected).

**`DELETE /api/courses/{id}`**
- Authorize pakai `CoursePolicy::delete` (otomatis menolak jika bukan pemilik ATAU jika sudah punya sesi).
- Jika authorize gagal karena sudah ada sesi, pastikan pesan error jelas menyebutkan alasannya (misal: "Kelas tidak dapat dihapus karena sudah memiliki sesi pertemuan").

**`PATCH /api/courses/{id}/archive`**
- Authorize pakai `CoursePolicy::update`.
- Toggle atau set `is_archived` (tentukan salah satu: body `{ "is_archived": true/false }` eksplisit, LEBIH DISARANKAN daripada toggle otomatis, supaya idempotent).

**`GET /api/courses/{id}/students`**
- Authorize pakai `CoursePolicy::view`.
- List semua mahasiswa di kelas ini beserta status (`pending`/`approved`/`rejected`) dan `joined_at`.
- Query param opsional `?status=pending` untuk filter.

**`POST /api/courses/{id}/students/{student_id}/approve`**
- Authorize: kelas harus milik KORMAT yang login.
- Set status `course_student` jadi `approved`, isi `joined_at` = now().
- Trigger notifikasi ke mahasiswa (siapkan pemanggilan notifikasi, meskipun implementasi lengkap notifikasi ada di fase terpisah — cukup panggil helper/placeholder yang jelas ditandai `// TODO: notification fase berikutnya` jika modul notifikasi belum ada).

**`POST /api/courses/{id}/students/bulk-approve`**
- Body: `{ "student_ids": [1, 2, 3] }`.
- Approve semua sekaligus, dibungkus DB transaction.

**`POST /api/courses/{id}/students/{student_id}/reject`**
- Set status jadi `rejected`.

### Langkah 4 — Endpoint Kelas (Sisi Mahasiswa)
Middleware: `auth:sanctum`, `role:mahasiswa`.

**`GET /api/courses/available`**
- Kelas yang: **belum ada record** `course_student` untuk mahasiswa ini, DAN `is_archived = false`.

**`GET /api/courses/joined`**
- Kelas dengan record `course_student` milik mahasiswa ini, status `approved` ATAU `pending` (tampilkan keduanya, beri field `status` di response supaya frontend bisa bedakan tampilan).

**`POST /api/courses/join`**
- Body: `{ "join_code": "ABC123" }`.
- Validasi: kode ditemukan, kelas tidak archived, mahasiswa belum punya record di kelas ini (cegah duplicate join request — jika sudah ada record dengan status apapun, tolak dengan pesan jelas, misal "Anda sudah pernah mengajukan bergabung ke kelas ini").
- Buat record `course_student` status `pending`.

**`GET /api/courses/{id}`** (versi mahasiswa)
- Authorize pakai `CoursePolicy::view` (otomatis menolak jika belum approved).
- Return detail kelas TANPA data sensitif administratif (misal tidak perlu return daftar semua mahasiswa lain di endpoint ini untuk mahasiswa biasa — itu privilege KORMAT saja).

### Kriteria Selesai Bagian 1
- [ ] KORMAT A tidak bisa update/delete/archive kelas milik KORMAT B (return 403, dites manual dengan 2 akun KORMAT berbeda).
- [ ] Kelas yang sudah punya minimal 1 sesi tidak bisa dihapus (return error jelas, bukan 500).
- [ ] `join_code` selalu 6 karakter, unik, dan tidak bisa di-set manual dari request.
- [ ] Mahasiswa tidak bisa melihat kelas archived di `courses/available`.
- [ ] Mahasiswa tidak bisa mengajukan join dua kali ke kelas yang sama.
- [ ] Bulk approve berhasil mengubah banyak status sekaligus dalam satu transaction.

---

## BAGIAN 2 — Laravel: Modul Sesi Pertemuan (Class Sessions)

### Langkah 1 — Authorization
Tambahkan method di `CoursePolicy` atau buat `ClassSessionPolicy` terpisah (pilih
yang menurut agent lebih rapi, tapi konsisten): pastikan hanya KORMAT pemilik
`course` terkait yang bisa membuat/melihat sesi milik kelasnya melalui endpoint
KORMAT.

### Langkah 2 — Endpoint Sesi (Sisi KORMAT)
Middleware: `auth:sanctum`, `role:kormat`.

**`POST /api/courses/{id}/sessions`**
- Authorize: kelas harus milik KORMAT yang login.
- Validasi: `meeting_type` (required, in: `online`,`offline`), `room` (required_if meeting_type=offline), `meeting_date` (required, date, tidak boleh tanggal yang sudah lewat — tentukan sendiri apakah validasi ini strict atau tidak, TAPI beri catatan di response/log jika diputuskan tidak strict), `start_time`, `end_time` (harus setelah `start_time`).
- Response: data sesi yang dibuat.

**`GET /api/courses/{id}/sessions`**
- Authorize: kelas milik KORMAT yang login (untuk endpoint versi KORMAT ini).
- List semua sesi kelas ini, urutkan dari yang terbaru/tanggal terdekat (tentukan urutan yang masuk akal, misal descending berdasarkan `meeting_date`).

### Langkah 3 — Endpoint Sesi (Sisi Mahasiswa & Umum)
Middleware: `auth:sanctum` (kedua role bisa akses, dengan authorization berbeda).

**`GET /api/courses/{id}/sessions`** (dipakai ulang, tapi untuk mahasiswa)
- Jika yang mengakses adalah mahasiswa: authorize bahwa dia `approved` di kelas ini (pakai `CoursePolicy::view`) sebelum menampilkan sesi.
- Pertimbangkan: gunakan controller/route yang sama dengan Langkah 2 di atas, tapi authorization logic membedakan berdasarkan role user yang login (bukan endpoint terpisah) — supaya tidak duplikasi kode. Putuskan pendekatan mana yang lebih bersih, dan jelaskan keputusan itu di ringkasan akhir.

**`GET /api/sessions/{id}`**
- Detail satu sesi. Authorize: user adalah KORMAT pemilik kelas terkait ATAU mahasiswa approved di kelas terkait.

**`GET /api/sessions/today`**
- Return sesi-sesi yang `meeting_date` = tanggal hari ini (sesuai timezone aplikasi — pastikan konfigurasi `config/app.php` timezone sudah diset ke `Asia/Jakarta`).
- Untuk KORMAT: sesi dari semua kelas yang dia kelola.
- Untuk mahasiswa: sesi dari semua kelas yang dia ikuti (status approved).
- Endpoint ini akan dipakai nanti oleh modul Dashboard (fase terpisah) — cukup pastikan data yang dikembalikan lengkap (termasuk info kelas terkait: nama, kode).

### Kriteria Selesai Bagian 2
- [ ] KORMAT hanya bisa membuat sesi di kelas miliknya sendiri.
- [ ] Mahasiswa yang belum approved di suatu kelas tidak bisa melihat sesi kelas tersebut (403).
- [ ] `end_time` yang lebih awal dari `start_time` ditolak validasi (422).
- [ ] `room` wajib diisi jika `meeting_type = offline`, dan validasi ini benar-benar diuji.
- [ ] `/api/sessions/today` mengembalikan data yang sesuai timezone Jakarta, bukan UTC mentah.

---

## BAGIAN 3 — Next.js: BFF Proxy Routes untuk Kelas & Sesi

### Langkah 1
Gunakan helper `laravel-proxy.ts` yang sudah dibuat di Fase 2 (JANGAN menulis
ulang logic ambil-cookie dari awal). Buat API Route baru yang mem-proxy setiap
endpoint Laravel di Bagian 1 & 2 di atas, dengan pola path yang konsisten
(misal `src/app/api/courses/route.ts`, `src/app/api/courses/[id]/route.ts`,
`src/app/api/courses/[id]/sessions/route.ts`, dst — sesuaikan dengan
konvensi routing dinamis Next.js App Router).

### Langkah 2 — Halaman Minimal untuk Testing
Buat halaman fungsional minimal (belum perlu polish desain final, cukup
menunjukkan alur bekerja):
- `/kormat/courses` — list kelas KORMAT + tombol buat kelas baru (form sederhana) + tombol arsip/hapus.
- `/kormat/courses/[id]` — detail kelas: list mahasiswa (dengan tombol approve/reject/bulk-approve) + list sesi + tombol buat sesi baru.
- `/mahasiswa/courses` — tab/list "Tersedia" (dengan input join_code) dan "Diikuti".
- `/mahasiswa/courses/[id]` — detail kelas + list sesi.

> Catatan: halaman ini boleh sangat sederhana (tabel HTML biasa + Tailwind minimal), fokus ke fungsionalitas dan pembuktian alur data end-to-end, bukan estetika. Styling final ada di fase terpisah.

### Kriteria Selesai Bagian 3
- [ ] Dari halaman `/kormat/courses`, KORMAT bisa membuat kelas baru dan melihatnya muncul di list.
- [ ] Dari halaman detail kelas, KORMAT bisa approve/reject mahasiswa dan melihat perubahan status langsung.
- [ ] Dari halaman `/mahasiswa/courses`, mahasiswa bisa memasukkan join_code dan melihat status pending muncul di tab "Diikuti".
- [ ] Semua request melewati BFF proxy Next.js (bukan langsung fetch ke Laravel dari client component), bisa diverifikasi lewat Network tab browser (URL yang terlihat adalah domain Next.js, bukan domain/IP Laravel).

---

## CATATAN UNTUK CODING AGENT

- Jika ada keputusan teknis yang tidak tercakup secara eksplisit di dokumen ini atau `PROJECT_RULES.md`, **berhenti dan tanyakan ke pengguna**, jangan berasumsi sendiri.
- Ikuti format response envelope sesuai global rules project (`status`, `message`, `data`, `errors`) — JANGAN kembali ke format lama (`success: true/false`) yang pernah dibahas di awal, itu sudah digantikan.
- Setelah Fase 3 selesai, JANGAN lanjut membangun modul Presensi/Laporan/Dashboard/Notifikasi tanpa instruksi/prompt fase berikutnya.
- Laporkan hasil akhir dalam bentuk ringkasan: file yang ditambahkan/diubah, konfirmasi kriteria selesai Bagian 1–3, dan jelaskan keputusan desain apa pun yang diputuskan sendiri oleh agent supaya bisa direview oleh pengguna.