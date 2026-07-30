# Execution Prompt — Fase 0 & Fase 1

> Dokumen ini adalah instruksi eksekusi untuk coding agent. WAJIB dibaca bersamaan
> dengan `PROJECT_RULES.md` (aturan bisnis) sebagai konteks tambahan jika tersedia.
> Kerjakan secara berurutan, per langkah. Jangan lompat ke langkah berikutnya
> sebelum langkah sebelumnya selesai dan tidak ada error.

---

## KONTEKS PROYEK (Wajib Dipahami Sebelum Mulai)

- Aplikasi: sistem presensi kuliah berbasis face recognition (server-side) + geofencing (logging only).
- Arsitektur: monorepo berisi 3 aplikasi independen yang berkomunikasi via HTTP:
  1. **Next.js** (frontend, PWA, Tailwind) — akan di-deploy ke Vercel.
  2. **Laravel** (backend utama: auth, RBAC, business logic, REST API) — di-deploy ke VPS.
  3. **Python/FastAPI** (microservice khusus face recognition) — di-deploy di VPS yang sama, hanya diakses secara internal (localhost).
- Database: **MySQL**.
- Tidak menggunakan Docker untuk saat ini (deploy manual ke VPS). Jangan buat Dockerfile kecuali diminta eksplisit di fase lain.

---

## FASE 0 — PROJECT SCAFFOLDING

### Tujuan
Menyiapkan kerangka dasar ketiga aplikasi sesuai struktur folder monorepo yang sudah disepakati, tanpa mengisi logic bisnis apapun.

### Struktur Folder Target

```
project-root/
├── apps/
│   ├── web/                      # Next.js
│   ├── api/                      # Laravel
│   └── face-service/             # Python FastAPI
├── docs/
│   ├── PROJECT_RULES.md
│   ├── TECHNICAL_SPEC.md
│   └── ARCHITECTURE.md
├── deployment/
│   ├── nginx/
│   ├── supervisor/
│   └── scripts/
├── .gitignore
└── README.md
```

### Langkah 1 — Inisialisasi Repo
1. Buat struktur folder root sesuai di atas (folder kosong dulu untuk `docs/`, `deployment/`).
2. Buat `.gitignore` di root yang mencakup pengecualian standar untuk Node.js, PHP/Laravel, dan Python (termasuk `node_modules`, `vendor`, `__pycache__`, `.env`, `venv`, `.next`, `storage/*.key`, dll).
3. Buat `README.md` di root berisi deskripsi singkat proyek dan struktur folder (boleh ringkas, akan dilengkapi nanti).

### Langkah 2 — Setup Next.js (`apps/web`)
1. Inisialisasi project Next.js (App Router) dengan TypeScript di dalam `apps/web`.
2. Install dan konfigurasi Tailwind CSS.
3. Setup dasar PWA:
   - Buat `public/manifest.json` dengan konfigurasi standar (name, short_name, icons placeholder, theme_color, background_color, display: "standalone").
   - Setup service worker dasar untuk PWA (gunakan pendekatan yang kompatibel dengan Next.js App Router — cek pendekatan terbaru yang stabil, boleh pakai library seperti `next-pwa` atau setup manual, pilih yang paling stabil untuk versi Next.js yang dipakai).
4. Buat struktur folder dasar di `src/`: `app/`, `components/`, `lib/`, `hooks/`, `types/`.
5. Buat file `src/lib/api-client.ts` — helper dasar untuk fetch ke Laravel API (base URL dari environment variable `NEXT_PUBLIC_API_URL`), belum perlu endpoint spesifik, cukup wrapper fetch dasar dengan handling error umum.
6. Buat `.env.example` dengan variabel `NEXT_PUBLIC_API_URL`.
7. Pastikan `npm run dev` dan `npm run build` berjalan tanpa error.

### Langkah 3 — Setup Laravel (`apps/api`)
1. Inisialisasi project Laravel (versi stabil terbaru) di dalam `apps/api`.
2. Konfigurasi `.env.example` untuk koneksi MySQL (`DB_CONNECTION=mysql`, host, port, database, username, password placeholder).
3. Install package berikut (sesuai kebutuhan fase-fase berikutnya, boleh install sekarang agar siap):
   - `laravel/sanctum` (untuk autentikasi API berbasis token, dipakai nanti oleh Next.js)
4. Buat struktur folder tambahan di `app/`: `Services/` (untuk nanti diisi `FaceRecognitionService.php`).
5. Pastikan CORS Laravel sudah dikonfigurasi untuk menerima request dari domain Next.js (gunakan environment variable untuk allowed origin, jangan hardcode).
6. Pastikan `php artisan serve` bisa berjalan tanpa error.

### Langkah 4 — Setup Python FastAPI (`apps/face-service`)
1. Buat struktur folder sesuai kesepakatan:
   ```
   face-service/
   ├── app/
   │   ├── main.py
   │   ├── routers/
   │   ├── services/
   │   └── core/
   ├── requirements.txt
   └── .env.example
   ```
2. Isi `requirements.txt` dengan dependency dasar: `fastapi`, `uvicorn`, `face_recognition`, `python-multipart`, `python-dotenv`. (Catatan: `face_recognition` bergantung pada `dlib` yang butuh `cmake` dan build tools saat instalasi — beri catatan di README jika environment lokal butuh instalasi tambahan.)
3. Buat `app/main.py` dengan FastAPI app dasar, termasuk 1 endpoint health-check (`GET /health`) yang mengembalikan `{"status": "ok"}`.
4. Buat `app/core/security.py` — helper untuk validasi header `X-Internal-Key` (bandingkan dengan value dari environment variable), akan dipakai di semua endpoint selain `/health`. Cukup buat fungsi/dependency-nya dulu, belum perlu endpoint yang memakainya (itu di fase lain).
5. Buat `.env.example` dengan variabel `INTERNAL_API_KEY`.
6. Pastikan service bisa dijalankan dengan `uvicorn app.main:app --reload` tanpa error, dan `/health` bisa diakses.

### Langkah 5 — Dokumentasi Deployment (Persiapan, Belum Eksekusi)
1. Buat file kosong dengan komentar template (belum perlu isi lengkap, akan dilengkapi di fase deployment):
   - `deployment/nginx/api.conf`
   - `deployment/supervisor/face-service.conf`
   - `deployment/scripts/deploy.sh`

### Kriteria Selesai Fase 0
- [ ] `npm run dev` di `apps/web` berjalan tanpa error
- [ ] `php artisan serve` di `apps/api` berjalan tanpa error
- [ ] `uvicorn app.main:app --reload` di `apps/face-service` berjalan dan `/health` merespons `{"status": "ok"}`
- [ ] Struktur folder sesuai dengan yang dispesifikasikan di atas
- [ ] Tidak ada file `.env` asli ter-commit (hanya `.env.example`)

---

## FASE 1 — DATABASE & MODEL (Laravel)

### Tujuan
Membuat seluruh migration, model, dan relasi Eloquent sesuai ERD yang sudah disepakati. **Belum ada API endpoint atau business logic di fase ini** — murni struktur data.

### ERD Referensi

**users**
- id (PK)
- name (string)
- email (string, unique)
- password (string)
- nim (string, nullable, unique)
- angkatan (string, nullable)
- timestamps

**roles**
- id (PK)
- name (string) → nilai: `superadmin`, `kormat`, `mahasiswa`

**role_user** (pivot)
- id (PK)
- user_id (FK → users)
- role_id (FK → roles)

**face_encodings**
- id (PK)
- user_id (FK → users, unique — relasi 1:1)
- encoding (JSON)
- timestamps

**courses**
- id (PK)
- kormat_id (FK → users)
- name (string)
- code (string, unique)
- join_code (string, unique) — di-generate otomatis oleh sistem
- is_archived (boolean, default false)
- timestamps

**course_student** (pivot)
- id (PK)
- course_id (FK → courses)
- user_id (FK → users)
- status (enum: `pending`, `approved`, `rejected`)
- joined_at (timestamp, nullable)
- timestamps

**class_sessions**
> Catatan: nama tabel sengaja `class_sessions`, BUKAN `sessions`, untuk menghindari konflik dengan tabel session bawaan Laravel.
- id (PK)
- course_id (FK → courses)
- meeting_type (enum: `online`, `offline`)
- room (string, nullable)
- meeting_date (date)
- start_time (time)
- end_time (time)
- timestamps

**attendances**
- id (PK)
- class_session_id (FK → class_sessions)
- user_id (FK → users)
- status (enum: `hadir`, `izin`, `sakit`, `alfa`)
- late_minutes (integer, nullable, default 0)
- checked_in_at (timestamp, nullable)
- latitude (decimal, nullable)
- longitude (decimal, nullable)
- is_manual_override (boolean, default false)
- overridden_by (FK → users, nullable)
- timestamps

**notifications**
- Gunakan tabel bawaan Laravel Notification (`php artisan notifications:table`), JANGAN buat migration manual untuk ini.

### Langkah 1 — Migration
1. Buat migration untuk seluruh tabel di atas sesuai urutan dependency (tabel tanpa foreign key dulu, baru yang bergantung).
2. Gunakan `foreignId()->constrained()->cascadeOnDelete()` atau `nullOnDelete()` sesuai konteks (gunakan penilaianmu: relasi yang jika induknya dihapus, datanya juga tidak relevan lagi → cascade; relasi yang harus tetap ada historinya meski induk dihapus → nullOnDelete, khususnya untuk `overridden_by` di tabel attendances).
3. Semua tabel wajib punya `timestamps()`.
4. Jalankan `php artisan migrate` dan pastikan semua tabel berhasil dibuat tanpa error di MySQL.

### Langkah 2 — Model & Relasi Eloquent
Buat model untuk setiap tabel (kecuali pivot murni tanpa kolom tambahan — gunakan relasi `belongsToMany` langsung jika sesuai), dengan relasi berikut:

**User**
- `belongsToMany(Role::class)` via `role_user`
- `hasOne(FaceEncoding::class)`
- `hasMany(Course::class, 'kormat_id')` — kelas yang dia kelola sebagai KORMAT
- `belongsToMany(Course::class)->using(CourseStudent model jika ada kolom tambahan)` via `course_student`, dengan pivot columns `status`, `joined_at`
- `hasMany(Attendance::class)`

**Role**
- `belongsToMany(User::class)` via `role_user`

**FaceEncoding**
- `belongsTo(User::class)`
- Tambahkan **cast** `encoding` sebagai `array` (karena disimpan JSON)

**Course**
- `belongsTo(User::class, 'kormat_id')`
- `belongsToMany(User::class)` via `course_student`, dengan pivot `status`, `joined_at`
- `hasMany(ClassSession::class)`
- Tambahkan logic di model (boot method atau observer) untuk auto-generate `join_code` unik (misal 6 karakter alfanumerik random) saat record dibuat, jika belum diisi

**ClassSession**
- `belongsTo(Course::class)`
- `hasMany(Attendance::class)`

**Attendance**
- `belongsTo(ClassSession::class)`
- `belongsTo(User::class)`
- `belongsTo(User::class, 'overridden_by')` — beri nama relasi `overriddenBy`

### Langkah 3 — Seeder Dasar
1. Buat seeder untuk tabel `roles` — isi 3 baris: `superadmin`, `kormat`, `mahasiswa`.
2. Buat seeder untuk 1 akun superadmin default (email & password dari environment variable atau nilai default yang jelas disebutkan di README, JANGAN hardcode credential produksi).
3. Daftarkan seeder di `DatabaseSeeder.php`.
4. Jalankan `php artisan migrate:fresh --seed` dan pastikan berhasil tanpa error.

### Kriteria Selesai Fase 1
- [ ] Seluruh migration berhasil dijalankan di MySQL tanpa error
- [ ] Seluruh model beserta relasi Eloquent sudah dibuat dan bisa diuji lewat `php artisan tinker` (misal `Course::first()->students`, `User::first()->roles`, dll menghasilkan output yang sesuai)
- [ ] Seeder role & superadmin berjalan dengan baik
- [ ] Tidak ada business logic (belum ada Controller/API endpoint) — murni struktur data

---

## CATATAN UNTUK CODING AGENT

- Jika ada keputusan teknis yang tidak tercakup secara eksplisit di dokumen ini (`PROJECT_RULES.md` atau prompt ini), **berhenti dan tanyakan ke pengguna**, jangan berasumsi sendiri.
- Setelah Fase 0 dan Fase 1 selesai, JANGAN lanjut ke pembuatan API endpoint atau frontend logic tanpa instruksi/prompt fase berikutnya.
- Laporkan hasil akhir tiap fase dalam bentuk ringkasan: apa yang sudah dibuat, file apa saja yang ditambahkan/diubah, dan konfirmasi kriteria selesai sudah terpenuhi.
