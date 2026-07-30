# Execution Prompt — Fase 2: Auth, Face Enrollment, BFF Proxy, RBAC

> Dokumen ini adalah instruksi eksekusi untuk coding agent, kelanjutan dari
> `EXECUTION_PROMPT_FASE_0_1.md`. WAJIB dibaca bersamaan dengan `PROJECT_RULES.md`
> sebagai konteks aturan bisnis. Kerjakan secara berurutan, per langkah.
> Jangan lompat ke modul lain (Kelas, Sesi, Presensi) di luar scope dokumen ini.

---

## KONTEKS FASE INI

Fase ini membangun jalur autentikasi lengkap yang melibatkan 3 service sekaligus:

```
Browser ──(httpOnly cookie)──▶ Next.js API Route (BFF proxy) ──(Bearer token)──▶ Laravel API ──(internal HTTP)──▶ Python Face Service
```

Scope Fase 2:
1. Laravel: endpoint register (dengan face enrollment), login, logout, me, middleware RBAC.
2. Python FastAPI: endpoint `/encode` untuk generate face embedding.
3. Next.js: BFF proxy routes + cookie handling + auth context/hooks dasar.

**Di luar scope fase ini** (jangan dikerjakan): modul kelas, sesi, presensi, laporan, dashboard, notifikasi. Cukup sampai user bisa register, login, logout, dan mengambil data profil sendiri.

---

## BAGIAN 1 — Python FastAPI: Endpoint `/encode`

### Langkah 1
Buat `app/routers/face.py` dengan endpoint:

**`POST /encode`**
- Header wajib: `X-Internal-Key` (validasi pakai dependency dari `app/core/security.py` yang sudah dibuat di Fase 0).
- Request body: `{ "image": "<base64 string>" }`
- Proses: decode base64 → deteksi wajah pakai `face_recognition` → jika tepat 1 wajah terdeteksi, generate 128-d encoding.
- Response sukses: `{ "success": true, "encoding": [ ...128 float... ] }`
- Response gagal, dengan alasan berbeda untuk keperluan logging internal (BUKAN untuk ditampilkan apa adanya ke end-user di frontend):
  - Tidak ada wajah terdeteksi: `{ "success": false, "error": "no_face_detected" }`
  - Lebih dari satu wajah terdeteksi: `{ "success": false, "error": "multiple_faces_detected" }`
  - Format gambar tidak valid: `{ "success": false, "error": "invalid_image" }`

### Langkah 2
Buat `app/services/recognition.py` berisi fungsi murni untuk encode (dipisah dari router supaya testable), memuat model `face_recognition` sekali di awal (bukan re-load tiap request, untuk efisiensi).

### Langkah 3
Daftarkan router `face` di `app/main.py`.

### Kriteria Selesai Bagian 1
- [ ] `POST /encode` bisa dites manual (misal via curl/Postman) dengan foto wajah asli dan mengembalikan array 128 angka.
- [ ] Request tanpa header `X-Internal-Key` yang valid → ditolak dengan status 401/403.
- [ ] Foto tanpa wajah terdeteksi → mengembalikan error `no_face_detected`, bukan crash/500.

---

## BAGIAN 2 — Laravel: Auth & Face Enrollment

### Langkah 1 — Setup Sanctum
1. Pastikan `laravel/sanctum` sudah terpasang dan ter-publish config-nya (jika belum dari Fase 0).
2. Konfigurasi guard API menggunakan Sanctum personal access token (bukan mode SPA cookie Sanctum bawaan — kita pakai Bearer token murni, karena cookie handling dilakukan di sisi BFF Next.js, bukan Sanctum SPA mode).

### Langkah 2 — Service untuk komunikasi ke Python
Buat `app/Services/FaceRecognitionService.php` dengan method:
- `encode(string $base64Image): array` — memanggil `POST {FACE_SERVICE_URL}/encode` di Python, mengembalikan encoding atau melempar exception custom (`FaceEncodingException`) dengan kode alasan (`no_face_detected`, dst) untuk ditangani di controller/logging, TAPI pesan yang dikembalikan ke client tetap generik sesuai keputusan sebelumnya (lihat Bagian 4).
- Tambahkan konfigurasi `FACE_SERVICE_URL` dan `FACE_SERVICE_INTERNAL_KEY` di `.env` dan `config/services.php`.

### Langkah 3 — Endpoint Register
**`POST /api/auth/register`**
- Validasi request: `name`, `email` (unique), `password` (confirmed, min 8), `nim` (unique), `angkatan`, `face_image` (base64, required).
- Panggil `FaceRecognitionService::encode($face_image)`.
  - Jika gagal (wajah tidak terdeteksi/lebih dari satu wajah) → return response gagal dengan status 422 dan pesan yang jelas untuk kasus ini SAJA (berbeda dengan check-in presensi nanti — untuk **registrasi**, pesan boleh lebih spesifik seperti "Wajah tidak terdeteksi, silakan foto ulang" karena ini membantu UX onboarding dan bukan celah keamanan seperti saat verifikasi presensi).
- Jika berhasil: buat `User` baru, assign role `mahasiswa` (via tabel `role_user`), simpan encoding ke tabel `face_encodings`.
- Semua proses (create user + simpan encoding + assign role) **wajib dibungkus DB transaction** — supaya jika salah satu langkah gagal, tidak ada data parsial yang tersimpan.
- Response sukses: data user dasar (tanpa auto-login — mahasiswa tetap harus login manual setelah registrasi, sesuai flow standar).

### Langkah 4 — Endpoint Login
**`POST /api/auth/login`**
- Validasi `email`, `password`.
- Jika valid, buat Sanctum personal access token: `$user->createToken('auth_token')->plainTextToken`.
- Response: `{ "success": true, "data": { "token": "...", "user": {...termasuk roles...} } }`.

### Langkah 5 — Endpoint Logout
**`POST /api/auth/logout`**
- Middleware `auth:sanctum`.
- Revoke token yang sedang dipakai (`$request->user()->currentAccessToken()->delete()`).

### Langkah 6 — Endpoint Me
**`GET /api/auth/me`**
- Middleware `auth:sanctum`.
- Return data user yang sedang login beserta roles-nya (eager load relasi `roles`).

### Langkah 7 — Middleware RBAC
1. Buat middleware `EnsureUserHasRole` (atau nama sejenis) yang menerima parameter role (misal `kormat`, `mahasiswa`, `superadmin`).
2. Middleware cek apakah user yang login punya salah satu role yang di-request; jika tidak, return 403.
3. Daftarkan middleware ini dengan alias di `bootstrap/app.php` (Laravel 11) atau `app/Http/Kernel.php` (tergantung versi yang dipakai di Fase 0), contoh alias: `role`.
4. Contoh pemakaian nanti (tidak perlu diterapkan ke route lain di fase ini, cukup middleware-nya siap): `Route::middleware(['auth:sanctum', 'role:kormat'])->group(...)`.

### Kriteria Selesai Bagian 2
- [ ] Register berhasil membuat user + face_encoding + role mahasiswa dalam satu transaction.
- [ ] Register dengan foto tanpa wajah terdeteksi mengembalikan pesan error yang jelas, tanpa membuat data user (rollback).
- [ ] Login mengembalikan token valid yang bisa dipakai untuk akses endpoint ber-auth.
- [ ] Logout berhasil me-revoke token (token lama tidak bisa dipakai lagi setelahnya).
- [ ] `GET /api/auth/me` mengembalikan data user + roles dengan benar.
- [ ] Middleware RBAC berhasil menolak akses (403) jika role tidak sesuai — bisa dites dengan route dummy sementara.

---

## BAGIAN 3 — Next.js: BFF Proxy & Auth Flow

### Langkah 1 — API Route: Register
Buat `app/api/auth/register/route.ts`:
- Terima request dari client (form data termasuk `face_image` base64, hasil capture dari kamera browser).
- Teruskan ke Laravel `POST {LARAVEL_API_URL}/api/auth/register`.
- Kembalikan response Laravel apa adanya ke client (tidak perlu set cookie di sini, karena register tidak auto-login).

### Langkah 2 — API Route: Login
Buat `app/api/auth/login/route.ts`:
- Terima `email`, `password` dari client.
- Teruskan ke Laravel `POST {LARAVEL_API_URL}/api/auth/login`.
- Jika sukses, ambil `token` dari response Laravel, **set sebagai httpOnly cookie** (nama cookie misal `auth_token`, dengan opsi `httpOnly: true`, `secure: true` di production, `sameSite: 'lax'` atau `'strict'`, path `/`).
- Kembalikan ke client hanya data user (TANPA token mentah di body response).

### Langkah 3 — API Route: Logout
Buat `app/api/auth/logout/route.ts`:
- Ambil token dari cookie.
- Teruskan request logout ke Laravel dengan header `Authorization: Bearer <token>`.
- Hapus cookie `auth_token` dari response (set expired/maxAge 0).

### Langkah 4 — API Route: Me
Buat `app/api/auth/me/route.ts`:
- Ambil token dari cookie.
- Teruskan ke Laravel `GET /api/auth/me` dengan header Authorization.
- Kembalikan data user ke client.

### Langkah 5 — Helper Proxy Generik (untuk dipakai fase berikutnya)
Buat helper reusable, misal `src/lib/server/laravel-proxy.ts`, berisi fungsi generik yang:
- Mengambil token dari cookie (server-side, pakai `cookies()` dari `next/headers`).
- Melakukan fetch ke Laravel dengan method, path, dan body yang fleksibel, otomatis menambahkan header `Authorization: Bearer <token>` jika token ada.
- Menangani error dari Laravel secara konsisten (meneruskan status code & pesan).

Ini akan dipakai berulang di fase-fase berikutnya (modul kelas, sesi, presensi) supaya tidak perlu menulis ulang logic ambil-token-dan-forward setiap kali bikin route baru.

### Langkah 6 — Auth Context / Hook di Client
Buat `src/hooks/useAuth.ts` (atau context provider jika dianggap lebih sesuai oleh agent):
- Fungsi `login(email, password)`, `logout()`, `getMe()` yang memanggil API Route internal (bukan langsung ke Laravel).
- State dasar: `user`, `isLoading`, `isAuthenticated`.

### Langkah 7 — Halaman Dasar (Minimal, Belum Perlu Styling Final)
Buat halaman minimal untuk keperluan testing manual end-to-end:
- `/register` — form registrasi termasuk capture foto dari kamera (pakai `navigator.mediaDevices.getUserMedia` atau elemen `<input type="file" accept="image/*" capture="user">` sebagai fallback sederhana).
- `/login` — form login.
- `/dashboard` (placeholder kosong) — halaman yang cuma bisa diakses jika `isAuthenticated`, sebagai bukti proteksi route berjalan (redirect ke `/login` jika belum login).

> Catatan: styling/UI final BUKAN fokus fase ini. Cukup fungsional untuk membuktikan alur BFF bekerja end-to-end. Styling dengan Tailwind akan diperhalus di fase terpisah (frontend polish).

### Kriteria Selesai Bagian 3
- [ ] Register dari halaman `/register` (termasuk capture foto) berhasil membuat user baru di Laravel.
- [ ] Login dari halaman `/login` berhasil, cookie `auth_token` ter-set sebagai httpOnly (bisa diverifikasi lewat DevTools → Application → Cookies, pastikan flag httpOnly aktif dan value TIDAK bisa diakses lewat `document.cookie` di console).
- [ ] Mengakses `/dashboard` tanpa login → redirect ke `/login`.
- [ ] Mengakses `/dashboard` setelah login → berhasil, dan bisa menampilkan data dari `GET /api/auth/me` (via proxy).
- [ ] Logout berhasil menghapus cookie dan mengembalikan user ke state belum login.

---

## BAGIAN 4 — Penegasan Aturan Pesan Error (Wajib Dipatuhi)

Untuk menghindari kebingungan antara dua konteks error yang mirip tapi beda aturan:

| Konteks | Endpoint | Boleh pesan spesifik? |
|---|---|---|
| **Registrasi** (enrollment wajah) | `/api/auth/register` | **Ya** — boleh sebutkan alasan spesifik (tidak ada wajah/lebih dari satu wajah), karena ini membantu UX onboarding dan bukan celah keamanan |
| **Presensi/check-in** (fase berikutnya, TIDAK termasuk fase ini) | `/api/sessions/{id}/attendance/check-in` | **Tidak** — HARUS pesan generik "Presensi gagal, silakan coba lagi", TANPA membedakan alasan teknis |

Ini penting supaya agent tidak menyamaratakan kedua kasus tersebut hanya karena keduanya sama-sama memanggil face recognition service.

---

## CATATAN UNTUK CODING AGENT

- Jika ada keputusan teknis yang tidak tercakup secara eksplisit di dokumen ini atau `PROJECT_RULES.md`, **berhenti dan tanyakan ke pengguna**, jangan berasumsi sendiri.
- Setelah Fase 2 selesai, JANGAN lanjut membangun modul Kelas/Sesi/Presensi/Laporan/Dashboard tanpa instruksi/prompt fase berikutnya.
- Laporkan hasil akhir dalam bentuk ringkasan: file apa saja yang ditambahkan/diubah, konfirmasi kriteria selesai di Bagian 1–3 sudah terpenuhi, dan sebutkan jika ada keputusan kecil yang terpaksa diambil sendiri (nama variabel, dsb) supaya bisa direview.
