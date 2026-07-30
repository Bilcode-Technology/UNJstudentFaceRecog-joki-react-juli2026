# Execution Prompt — Fase 6: Notifikasi (Web Push)

> Lanjutan `EXECUTION_PROMPT_FASE_5.md`. Baca bersama `PROJECT_RULES.md`.
> Ikuti format envelope global rules (`status`,`message`,`data`,`errors` + HTTP code).
> Ini fase TERAKHIR dari scope modul yang disepakati — setelah ini tidak ada
> fase lanjutan kecuali diinstruksikan baru.

## KONTEKS FASE INI

3 jenis notifikasi wajib (via Web Push, bukan cuma in-app):
1. Reminder sesi akan segera dimulai → ke Mahasiswa approved di kelas terkait.
2. Approval join diterima/ditolak → ke Mahasiswa pengaju.
3. Ada pengajuan join baru → ke KORMAT pemilik kelas.

Prasyarat: Fase 2-5 selesai. Tabel `notifications` (Laravel bawaan) sudah ada
dari Fase 1 — TIDAK PERLU migration baru untuk itu.

---

## BAGIAN 1 — Laravel: Setup Web Push

### Langkah 1
Install package `laravel-notification-channels/webpush` via composer, publish
config & migration-nya (`php artisan vendor:publish` sesuai instruksi package),
jalankan migration (ini akan membuat tabel `push_subscriptions`, TERPISAH dari
tabel `notifications` bawaan Laravel — keduanya dipakai bersamaan: `notifications`
untuk histori/in-app, `push_subscriptions` untuk data device/browser tujuan push).

### Langkah 2
Generate VAPID keys: `php artisan webpush:vapid` — pastikan hasil `VAPID_PUBLIC_KEY`
dan `VAPID_PRIVATE_KEY` masuk ke `.env` dan `.env.example` (placeholder, bukan
key asli di `.env.example`).

### Langkah 3
Tambahkan trait `NotificationChannels\WebPush\HasPushSubscriptions` ke model `User`
(atau method serupa sesuai versi package) supaya user bisa jadi notifiable
untuk web push.

### Langkah 4 — Endpoint Subscribe
**`POST /api/push/subscribe`** (auth:sanctum, role apapun)
- Body: `{ endpoint, keys: { p256dh, auth } }` (format standar Push API browser).
- Simpan/update subscription untuk user yang login (pakai method dari trait
  package, misal `updatePushSubscription(...)`).

### Kriteria Selesai Bagian 1
- [ ] VAPID keys ter-generate dan tersimpan di `.env`.
- [ ] `POST /api/push/subscribe` berhasil menyimpan subscription baru untuk user login.
- [ ] Subscribe ulang dengan endpoint sama (dari browser sama) tidak membuat duplikat (update, bukan insert baru).

---

## BAGIAN 2 — Laravel: Notification Classes & Trigger

Buat 3 Notification class (`php artisan make:notification ...`), masing-masing
implement `via()` return `['database', 'webpush']` (SATU notifikasi otomatis
tercatat di tabel `notifications` DAN terkirim via push):

### 1. `SessionReminderNotification`
- Payload: nama kelas, waktu mulai sesi, room/link (jika ada).
- Trigger: **scheduled job baru**, mirip pola `MarkAbsentStudents` di Fase 4.
  Buat command `php artisan make:command SendSessionReminders`:
  - Cari `class_sessions` yang mulai dalam **15 menit ke depan** (tentukan
    angka ini, jelaskan alasannya di ringkasan akhir) DAN belum pernah dikirim
    reminder-nya.
  - Tambahkan kolom nullable baru `reminder_sent_at` di migration terpisah
    untuk tabel `class_sessions` (field sistem murni, BUKAN pelanggaran aturan
    "kelas immutable" — itu berlaku untuk field bisnis seperti nama/kode matkul,
    bukan field housekeeping seperti ini).
  - Untuk tiap sesi yang cocok, kirim notifikasi ke semua mahasiswa `approved`
    di kelas terkait, lalu set `reminder_sent_at = now()` (mencegah kirim ganda —
    idempotent, sama seperti pola Fase 4).
  - Jadwalkan command ini di scheduler, interval wajar (misal setiap 5 menit),
    jelaskan alasan di ringkasan akhir.

### 2. `JoinRequestApprovedNotification` / `JoinRequestRejectedNotification`
- Bisa dijadikan 1 class dengan parameter status, atau 2 class terpisah —
  pilih yang lebih rapi menurut penilaian agent.
- Trigger: dipanggil langsung di `CourseService` pada endpoint approve/reject
  dan bulk-approve (Fase 3) — **cari komentar `// TODO: notification fase
  berikutnya`** yang sudah ditinggalkan di Fase 3, ganti dengan pemanggilan
  notifikasi ini.

### 3. `NewJoinRequestNotification`
- Trigger: dipanggil di endpoint `POST /api/courses/join` (Fase 3), kirim ke
  KORMAT pemilik kelas.

### Kriteria Selesai Bagian 2
- [ ] Approve/reject join request memicu notifikasi ke mahasiswa terkait (bisa
      dicek di tabel `notifications` meski push tidak diterima browser saat testing headless).
- [ ] Join request baru memicu notifikasi ke KORMAT pemilik kelas.
- [ ] Command reminder berjalan idempotent (jalan 2x tidak kirim reminder duplikat untuk sesi yang sama).
- [ ] Reminder hanya terkirim ke mahasiswa approved, bukan yang pending/rejected.

---

## BAGIAN 3 — Laravel: Endpoint Riwayat Notifikasi

**`GET /api/notifications`** (auth:sanctum)
- Return notifikasi milik user yang login (dari tabel `notifications` bawaan
  Laravel), urut terbaru dulu.

**`PATCH /api/notifications/{id}/read`** (auth:sanctum)
- Authorize: notifikasi ini milik user yang login.
- Tandai `read_at = now()`.

### Kriteria Selesai Bagian 3
- [ ] User hanya bisa melihat/mark-read notifikasi miliknya sendiri (403 jika mencoba punya orang lain).

---

## BAGIAN 4 — Next.js: Service Worker, Permission, & BFF Proxy

### Langkah 1 — Service Worker
Pastikan service worker PWA yang sudah ada dari Fase 0 menangani event `push`
dan `notificationclick` (tampilkan notifikasi native browser saat push masuk,
buka halaman terkait saat notifikasi diklik).

### Langkah 2 — Registrasi Push di Client
Buat hook/helper (misal `src/hooks/usePushNotification.ts`):
- Minta izin notifikasi browser (`Notification.requestPermission()`).
- Jika diizinkan, `serviceWorkerRegistration.pushManager.subscribe()` dengan
  `applicationServerKey` dari `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (env baru, tambahkan
  ke `.env.example`).
- Kirim hasil subscription ke backend lewat BFF proxy (bukan langsung ke Laravel).

### Langkah 3 — Proxy & Trigger UI
- Buat `src/app/api/push/subscribe/route.ts` (proxy POST).
- Panggil hook subscribe ini setelah login berhasil (di halaman dashboard
  masing-masing role, sekali saat mount, cukup minta izin — jangan paksa
  berulang kali jika user sudah menolak sebelumnya).

### Langkah 4 — Halaman Riwayat Notifikasi (Minimal)
- Buat halaman sederhana (misal `src/app/notifications/page.tsx`) menampilkan
  list notifikasi dari `GET /api/notifications`, dengan tombol tandai dibaca.

### Kriteria Selesai Bagian 4
- [ ] Browser benar-benar menampilkan prompt izin notifikasi (bukan dummy).
- [ ] Setelah izin diberikan, subscription tersimpan di backend (bisa dicek
      lewat tabel `push_subscriptions`).
- [ ] Notifikasi native browser muncul saat ada trigger (bisa diuji manual
      dengan approve join request saat browser mahasiswa terbuka).

---

## CATATAN UNTUK CODING AGENT

- Keputusan tidak tercakup eksplisit (interval reminder, threshold menit
  sebelum sesi, dsb) → putuskan dengan alasan jelas, WAJIB dijelaskan di
  ringkasan akhir — jangan "Open Questions: None" jika sebenarnya ada keputusan diambil.
- Reuse pola idempotency dari `MarkAbsentStudents` (Fase 4) untuk command
  reminder — jangan bangun mekanisme berbeda tanpa alasan kuat.
- Ini fase terakhir dari scope yang disepakati. Setelah selesai, JANGAN
  menambah modul/fitur baru apa pun tanpa instruksi eksplisit dari pengguna.
- Laporkan hasil akhir: file ditambah/diubah, konfirmasi kriteria selesai
  Bagian 1-4, interval & threshold yang dipilih beserta alasannya, dan catatan
  jika ada keterbatasan testing push notification di environment lokal
  (misal butuh HTTPS untuk service worker di production).
