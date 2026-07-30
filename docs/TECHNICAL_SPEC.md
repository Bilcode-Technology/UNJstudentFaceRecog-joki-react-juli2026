# Technical Specification

## Core Stack Specifications

1. **Frontend (apps/web)**
   - Framework: Next.js (App Router)
   - Language: TypeScript
   - Styling: Tailwind CSS
   - PWA: Web App Manifest & Service Worker

2. **Backend API (apps/api)**
   - Framework: Laravel 11
   - Auth: Laravel Sanctum (Token-based API Authentication)
   - Database: MySQL 8.0+
   - Architecture: Controller-Service-Repository Pattern

3. **Face Recognition Microservice (apps/face-service)**
   - Framework: Python FastAPI
   - Port: 8001 (Internal access only)
   - Header Auth: `X-Internal-Key`
   - Core Libraries: `face_recognition`, `uvicorn`, `fastapi`
