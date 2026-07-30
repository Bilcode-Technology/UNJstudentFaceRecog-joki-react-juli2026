# Execution Prompt — Fase 7: Modul Superadmin

> Lanjutan `EXECUTION_PROMPT_FASE_6.md`. Baca bersama `PROJECT_RULES.md`.
> Ikuti format envelope global rules (`status`,`message`,`data`,`errors` + HTTP code).
> Fase ini menutup celah requirement yang baru disadari: staf kampus (bukan
> developer) akan berperan sebagai Superadmin operasional, sehingga WAJIB ada
> UI web, bukan cuma command Artisan.

## KONTEKS FASE INI

Superadmin butuh: kelola akun KORMAT (create/edit/nonaktifkan/hapus/reset
password) via web, PLUS monitoring read-only (daftar semua kelas & mahasiswa).
Prasyarat: Fase 2 (Auth/RBAC) sudah ada, termasuk seeder superadmin dari Fase 1.

### Keputusan Desain yang Sudah Ditentukan (ikuti persis)

1. **Nonaktifkan ≠ hapus permanen.** Tambahkan kolom `is_active` (boolean,
   default `true`) di tabel `users` (migration baru, kolom nullable/default
   supaya tidak mengganggu data existing). KORMAT yang `is_active=false`
   **tidak bisa login** (cek di flow login Fase 2 — tambahkan validasi ini,
   pesan jelas: "Akun dinonaktifkan, hubungi administrator"), tapi data kelas
   yang pernah dia buat **tetap utuh** (tidak terhapus/terpengaruh).
2. **Hapus permanen HANYA boleh** jika KORMAT tersebut **belum pernah membuat
   kelas sama sekali** (`courses()->count() === 0`) — pola yang sama persis
   dengan aturan hapus kelas di Fase 3 (kelas hanya bisa dihapus jika belum
   ada sesi). Jika sudah punya kelas, tolak hapus dengan pesan jelas, arahkan
   ke opsi nonaktifkan saja.
3. **Edit** KORMAT terbatas pada `name` dan `email` (BUKAN password — itu
   endpoint terpisah untuk reset password).
4. **Reset password**: Superadmin set password baru secara manual lewat form
   di halaman ini (BUKAN via email link/token — terlalu kompleks untuk scope
   proyek ini, cukup input password baru langsung, sama seperti saat create).
5. **Monitoring bersifat read-only** — Superadmin TIDAK bisa mengedit
   kelas/mahasiswa dari sini, cuma melihat daftar untuk keperluan pengawasan.

---

## BAGIAN 1 — Laravel: Migration & Model

### Langkah 1
Migration baru: tambah kolom `is_active` (boolean, default `true`) di tabel `users`.

### Langkah 2
Update flow login (Fase 2, `AuthController`/`AuthService`) — SEBELUM membuat
token, cek `$user->is_active === false` → tolak dengan 403, pesan: "Akun
dinonaktifkan, hubungi administrator". Ini berlaku untuk SEMUA role (tidak
cuma KORMAT), meski use case utamanya untuk KORMAT.

### Kriteria Selesai
- [ ] User dengan `is_active=false` tidak bisa login, pesan jelas.
- [ ] User dengan `is_active=true` (default) login seperti biasa, tidak ada regresi.

---

## BAGIAN 2 — Laravel: CRUD Akun KORMAT (Superadmin)

Middleware semua endpoint di bagian ini: `auth:sanctum`, `role:superadmin`.

Buat `app/Services/SuperadminService.php` dan `app/Http/Controllers/SuperadminController.php` (atau pisah jadi 2 controller: `KormatManagementController` & `MonitoringController` — pilih yang lebih rapi, jelaskan di ringkasan akhir).

**`POST /api/superadmin/kormat`**
- Validasi: `name`, `email` (unique), `password` (min 8).
- Buat user baru, assign role `kormat` via `role_user`. Bungkus DB transaction.

**`GET /api/superadmin/kormat`**
- List semua user dengan role `kormat`, sertakan jumlah kelas yang dikelola (`withCount`) dan status `is_active`.

**`GET /api/superadmin/kormat/{id}`**
- Detail 1 akun KORMAT + daftar kelas yang dia kelola (ringkas: nama, kode, jumlah mahasiswa).

**`PATCH /api/superadmin/kormat/{id}`**
- Validasi: `name`, `email` (unique kecuali milik sendiri). Update data.

**`PATCH /api/superadmin/kormat/{id}/deactivate`**
- Body: `{ "is_active": true|false }` (eksplisit, bukan toggle otomatis — supaya idempotent).

**`PATCH /api/superadmin/kormat/{id}/reset-password`**
- Body: `{ "password": "...", "password_confirmation": "..." }` (validasi confirmed, min 8). Update password (hashed).

**`DELETE /api/superadmin/kormat/{id}`**
- Cek `courses()->count() === 0` dulu (lihat keputusan #2 di atas) — jika tidak, 422 dengan pesan jelas. Jika ya, hapus user (dan role_user terkait).

### Kriteria Selesai
- [ ] Create KORMAT baru berhasil, langsung bisa dipakai login (`is_active=true` default).
- [ ] Deactivate KORMAT → akun itu tidak bisa login lagi, tapi kelas & datanya tetap utuh dan tetap bisa diakses mahasiswa yang approved (data tidak ikut hilang).
- [ ] Hapus KORMAT yang sudah punya kelas → ditolak, pesan jelas.
- [ ] Hapus KORMAT yang belum pernah punya kelas → berhasil.
- [ ] Reset password berhasil, KORMAT bisa login pakai password baru.

---

## BAGIAN 3 — Laravel: Monitoring Read-Only

**`GET /api/superadmin/courses`** (auth:sanctum, role:superadmin)
- List SEMUA kelas di sistem (lintas KORMAT), dengan info: nama, kode, nama KORMAT pemilik, jumlah mahasiswa approved, status archived.

**`GET /api/superadmin/students`** (auth:sanctum, role:superadmin)
- List SEMUA mahasiswa, dengan info: nama, NIM, angkatan, jumlah kelas yang diikuti (approved).

Keduanya read-only, tidak perlu endpoint edit/hapus di sini.

### Kriteria Selesai
- [ ] Kedua endpoint mengembalikan data lintas seluruh sistem (bukan cuma milik satu KORMAT), karena ini akses Superadmin.

---

## BAGIAN 4 — Next.js: BFF Proxy & UI Superadmin

### Proxy Routes
Buat proxy untuk semua endpoint Bagian 2 & 3 di atas mengikuti pola `laravel-proxy.ts` yang sudah ada, path prefix `superadmin/...`.

### Halaman
- `superadmin/dashboard` — landing setelah login (tambahkan redirect role `superadmin` di logic login yang sudah ada dari Fase 5).
- `superadmin/kormat` — tabel daftar KORMAT (nama, email, jumlah kelas, status aktif), tombol "Tambah KORMAT Baru" (form: nama, email, password), aksi per baris: Edit, Nonaktifkan/Aktifkan, Reset Password, Hapus (disabled/beri tooltip jelas jika kelas > 0).
- `superadmin/courses` — tabel monitoring semua kelas (read-only).
- `superadmin/students` — tabel monitoring semua mahasiswa (read-only).

Styling minimal, fokus fungsionalitas — konsisten dengan pola halaman fase-fase sebelumnya.

### Kriteria Selesai
- [ ] Login superadmin (pakai akun seeder dari Fase 1) redirect ke `/superadmin/dashboard`.
- [ ] Semua aksi CRUD KORMAT bisa dilakukan dari UI ini, termasuk tombol hapus yang otomatis ter-disable/beri pesan jika KORMAT masih punya kelas.
- [ ] Halaman monitoring courses & students menampilkan data lintas sistem dengan benar.

---

## CATATAN UNTUK CODING AGENT

- Keputusan tidak tercakup eksplisit di sini/`PROJECT_RULES.md` → putuskan dengan
  alasan jelas, WAJIB dijelaskan di ringkasan akhir — jangan "Open Questions: None".
- Perhatikan: penambahan `is_active` di tabel `users` ini **field sistem**,
  BUKAN pelanggaran aturan lain manapun — berlaku untuk semua role, meski use
  case utamanya KORMAT.
- Setelah Fase 7 selesai, seluruh scope modul aplikasi (sesuai `PROJECT_RULES.md`
  yang sudah diperbarui secara implisit dengan celah Superadmin ini) dianggap
  LENGKAP. Jangan tambah fitur baru tanpa instruksi eksplisit.
- Laporkan hasil akhir: file ditambah/diubah, konfirmasi kriteria selesai
  Bagian 1–4, dan pilihan struktur controller (gabung/pisah) beserta alasannya.
