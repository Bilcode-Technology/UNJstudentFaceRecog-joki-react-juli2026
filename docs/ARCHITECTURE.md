# System Architecture Overview

```
[ Client Browser / PWA (Next.js) ]
               │
               ▼ (HTTP / HTTPS)
      [ Nginx Reverse Proxy ]
               │
     ┌─────────┴─────────┐
     ▼                   ▼
[ Next.js ]     [ Laravel API (Port 8000) ]
(apps/web)               │
                         ├── (Internal HTTP localhost:8001)
                         │   headers: X-Internal-Key
                         │
                         ▼
                [ FastAPI Face Service ]
                   (apps/face-service)
                         │
                         ▼
                     [ MySQL DB ]
```
