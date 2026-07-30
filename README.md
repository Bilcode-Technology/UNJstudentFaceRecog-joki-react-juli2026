# Aplikasi Presensi Kuliah (Face Recognition + Geofencing)

Sistem presensi kuliah berbasis face recognition (server-side) dan geofencing (logging only).

## Struktur Monorepo

- `apps/web`: Next.js App Router (PWA, Tailwind CSS) - Frontend & Client Dashboard (Port 3000).
- `apps/api`: Laravel 11 - REST API, Authentication (Sanctum), Database (MySQL), Business Logic, & RBAC (Port 8000).
- `apps/face-service`: Python FastAPI - Internal Microservice khusus Face Recognition & Anti-Spoofing (Port 8001).
- `docs/`: Dokumentasi aturan bisnis dan spesifikasi arsitektur.
- `deployment/`: Configuration template untuk Nginx, Supervisor, dan Deployment Scripts.

---

## Prerequisites (Prasyarat Sistem)

- Node.js v20+ / v22+
- PHP v8.2+ / v8.3+ & Composer
- Python 3.10+
- MySQL 8.0+ (Pastikan service MySQL berjalan)

---

## Local Setup Quickstart (Langkah-Langkah Setup)

### 1. Python Face Service (`apps/face-service`)
Microservice ini disarankan untuk dijalankan terlebih dahulu (port 8001):
```bash
cd apps/face-service

# Buat virtual environment
python -m venv venv

# Aktivasi venv:
# Windows PowerShell: .\venv\Scripts\Activate.ps1
# Windows CMD: venv\Scripts\activate.bat
# Linux/macOS: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Jalankan service
uvicorn app.main:app --port 8001 --reload
```

### 2. Laravel API (`apps/api`)
```bash
cd apps/api

# Install dependencies PHP
composer install

# Copy environment file & Generate Key
cp .env.example .env
php artisan key:generate

# Pastikan database 'student_face_recog' sudah dibuat di MySQL,
# lalu jalankan migrasi & seeder data awal:
php artisan migrate:fresh --seed

# Buat symbolic link storage (WAJIB agar foto presensi/wajah dapat diakses publik)
php artisan storage:link

# Jalankan server API (port 8000)
php artisan serve --port=8000
```

### 3. Next.js Web Frontend (`apps/web`)
```bash
cd apps/web

# Install dependencies Node.js
npm install

# Copy environment file
cp .env.example .env.local

# Jalankan server pengembang (port 3000)
npm run dev
```

---

## Akun Default Hasil Seeder (`php artisan db:seed`)

Setelah seeder berhasil dijalankan, Anda dapat menggunakan akun berikut untuk menguji aplikasi:

| Role | Email | Password |
| --- | --- | --- |
| **Super Admin** | `admin@example.com` | `password123` |
| **KORMAT A** | `kormata@example.com` | `password123` |
| **KORMAT B** | `kormatb@example.com` | `password123` |
| **Mahasiswa** | *Dapat mendaftar melalui menu Register di Web Frontend* |

---

## Catatan Setup & Troubleshooting

- **Windows Build Tools (`dlib` / `face_recognition`)**:
  Library `dlib` membutuhkan Visual Studio C++ Build Tools & CMake saat kompilasi dari source di Windows.