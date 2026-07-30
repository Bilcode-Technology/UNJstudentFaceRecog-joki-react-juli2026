# Aplikasi Presensi Kuliah (Face Recognition + Geofencing)

Sistem presensi kuliah berbasis face recognition (server-side) dan geofencing (logging only).

## Structure Monorepo

- `apps/web`: Next.js App Router (PWA, Tailwind CSS) - Frontend & Client Dashboard.
- `apps/api`: Laravel 11 - REST API, Authentication (Sanctum), Database (MySQL), Business Logic, & RBAC.
- `apps/face-service`: Python FastAPI - Internal Microservice khusus Face Recognition (dijalankan di port 8001).
- `docs/`: Dokumentasi aturan bisnis dan spesifikasi arsitektur.
- `deployment/`: Configuration template untuk Nginx, Supervisor, dan Deployment Scripts.

## Prerequisites

- Node.js v20+ / v22+
- PHP v8.2+ / v8.3+ & Composer
- Python 3.10+
- MySQL 8.0+

## Local Setup Quickstart

1. **Laravel API (`apps/api`)**
   ```bash
   cd apps/api
   composer install
   cp .env.example .env
   php artisan key:generate
   php artisan migrate:fresh --seed
   php artisan serve --port=8000
   ```

2. **Next.js Web (`apps/web`)**
   ```bash
   cd apps/web
   npm install
   cp .env.example .env.local
   npm run dev
   ```

3. **Face Service (`apps/face-service`)**
   ```bash
   cd apps/face-service
   python -m venv venv
   # Activate venv:
   # Windows PowerShell: .\venv\Scripts\Activate.ps1
   # Windows CMD: venv\Scripts\activate.bat
   pip install -r requirements.txt
   uvicorn app.main:app --port 8001 --reload
   ```

> **Catatan Setup Windows**:
> - Library `dlib` / `face_recognition` membutuhkan Visual Studio C++ Build Tools dan CMake saat kompilasi dari source di Windows. Untuk pengembangan lokal tanpa Visual C++, aplikasi ini menyediakan **fallback otomatis** (`HAS_FACE_RECOGNITION = False`) sehingga FastAPI dan seluruh flow aplikasi (Next.js & Laravel) tetap dapat berjalan 100% tanpa error.
> - Jika muncul `[WinError 10013]`, pastikan port 8001 tidak sedang digunakan oleh proses Python/uvicorn lain yang berjalan di background.
