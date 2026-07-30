# Project Rules — Aplikasi Presensi Kuliah (Face Recognition + Geofencing)

> Dokumen ini adalah rangkuman kesepakatan bisnis & fungsional yang menjadi acuan utama
> pengembangan aplikasi. Coding agent WAJIB mengikuti aturan di dokumen ini sebagai
> source of truth sebelum mengambil keputusan teknis lain yang bertentangan.

## 1. Konteks Umum

- Aplikasi web PWA yang akan di-submit ke Play Store (via TWA).
- Stack: Next.js + Tailwind (frontend), Laravel (backend), repo monolit.
- Sifat aplikasi: internal tool/dashboard (bukan aplikasi publik konsumen).
- Fokus utama: presensi mata kuliah berbasis **face recognition real-time** + **geofencing**.
- Tidak mengikuti pola Google Classroom secara struktural untuk penjadwalan
  (Google Classroom tidak punya konsep jadwal/sesi pertemuan — sistem ini butuh itu).

## 2. Desain Responsif

- Aplikasi **wajib responsive untuk mobile, tablet, DAN desktop**.
- Role **Mahasiswa** → prioritas mobile-first (pemakaian on-the-go).
- Role **KORMAT** → wajib nyaman diakses dari desktop (banyak input data, tabel,
  rekap), tapi tetap mobile-friendly untuk pengecekan cepat dari HP.
- Gunakan pendekatan Tailwind mobile-first (`sm:`, `md:`, `lg:`, `xl:`) sejak awal
  komponen dibuat — jangan hardcode ukuran fixed.

## 3. Role & Autentikasi

- Role sistem: **Superadmin**, **KORMAT**, **Mahasiswa**.
- RBAC (Role-Based Access Control) diterapkan untuk seluruh sistem.
- **Registrasi mandiri hanya untuk Mahasiswa** (nama, NIM, angkatan, email, password).
  - Proses registrasi mahasiswa **wajib menyertakan face enrollment**
    (pendaftaran data wajah yang akan dipakai sebagai referensi presensi seterusnya).
- **KORMAT tidak bisa mendaftar sendiri** — akun KORMAT dibuat/didaftarkan oleh **Superadmin**.
- **Multi-role dimungkinkan**: satu akun bisa berperan sebagai KORMAT di satu mata
  kuliah, sekaligus sebagai Mahasiswa di mata kuliah lain.

## 4. Modul Kelas (Course)

- Field kelas: nama mata kuliah, kode mata kuliah, ruang kelas (jika relevan untuk
  sesi luring — ruang kelas levelnya mengikuti sesi, bukan wajib fixed di kelas).
- **Kelas bersifat immutable setelah dibuat** — field identitas (nama matkul, kode
  matkul, dsb) tidak bisa diubah setelah disimpan.
- **Wajib ada konfirmasi/warning** kepada KORMAT sebelum submit pembuatan kelas,
  karena data tidak bisa direvisi setelah tersimpan.
- **Kelas tidak terikat semester/periode akademik** — dibuat bebas kapan saja.
- **Wajib ada fitur arsip/nonaktifkan kelas** (karena tidak ada batas semester,
  supaya kelas lama tidak menumpuk di daftar aktif).
- **Kelas hanya bisa dihapus KORMAT jika belum memiliki sesi pertemuan sama sekali.**
  Kelas yang sudah punya minimal 1 sesi pertemuan dianggap "sudah berjalan" dan
  tidak bisa dihapus.
- Satu kelas hanya dikelola oleh **satu KORMAT**. Satu KORMAT bisa mengelola
  **banyak kelas**.
- KORMAT bisa melihat daftar kelas yang dikelola, jumlah mahasiswa terdaftar per
  kelas, dan detail daftar nama mahasiswa per kelas.

### 4.1 Join Kelas (Mahasiswa)

- Mahasiswa melihat daftar kelas yang tersedia (dibuat KORMAT) yang **belum**
  diikuti, termasuk status pengajuan yang masih pending.
- Mahasiswa mengajukan join via kode kelas.
- **Join tidak instan** — wajib melalui approval KORMAT.
- KORMAT menerima **notifikasi** setiap ada pengajuan join baru.
- KORMAT bisa approve secara **bulk** (banyak sekaligus).
- Approval bersifat **"terima siapa saja yang mengajukan"** — tanpa validasi
  tambahan (misal cocok NIM/mata kuliah yang seharusnya diambil).
- Mahasiswa menerima **notifikasi** saat pengajuan diterima/ditolak.

## 5. Modul Sesi Pertemuan (Meeting Session)

- Sesi pertemuan **dibuat manual satu per satu** oleh KORMAT (bukan generate
  otomatis berdasarkan pola berulang/periodik).
- Field sesi: hari, tanggal, jam mulai, jam selesai.
- **Jenis pertemuan (daring/luring) ditentukan per SESI**, bukan per kelas —
  fleksibel, bisa berbeda tiap minggu untuk kelas yang sama.
- Ruang kelas (jika luring) mengikuti level sesi.
- Sesi punya relasi ke Kelas induknya.

## 6. Modul Presensi

### 6.1 Mekanisme

- Presensi dilakukan mahasiswa dengan menekan **tombol Presensi** (bukan continuous
  live scanning) → capture wajah sekali → dikirim & diproses **di sisi server**.
- **Face recognition**: dicocokkan dengan data enrollment saat registrasi.
  - **Tidak ada batas maksimal retry** untuk mahasiswa.
  - Jika gagal berkali-kali, mahasiswa **wajib lapor manual ke KORMAT**.
  - **KORMAT punya akses untuk override/set status kehadiran secara manual**
    (Hadir/Izin/Sakit/Alfa) sebagai mekanisme koreksi.
- **Geofencing**: dicatat sebagai **informasi/logging saja** — TIDAK memblokir
  proses presensi (berlaku sama untuk kelas daring maupun luring). Lokasi
  presensi (bukan foto) tetap direkam sebagai data pendukung.
- **Foto saat presensi TIDAK disimpan** — hanya hasil match, waktu presensi, dan
  lokasi (koordinat) yang disimpan.

### 6.2 Window Presensi & Status Kehadiran

- Window presensi **otomatis terbuka/tertutup** oleh sistem berdasarkan jam mulai
  & selesai sesi.
- **Toleransi keterlambatan: 5 menit, fixed untuk seluruh sistem** (bukan
  custom per kelas/KORMAT).
- Aturan status:
  - Presensi dalam 5 menit pertama sejak sesi mulai → **Hadir** (tepat waktu).
  - Presensi setelah 5 menit tapi masih dalam durasi sesi berlangsung → tetap
    **Hadir**, namun sistem **mencatat jumlah menit keterlambatan**.
  - Presensi setelah durasi sesi berakhir (tidak presensi sama sekali) → **Alfa**.
- **Izin/Sakit**: mahasiswa mengajukan sendiri, status **langsung tercatat**
  tanpa approval dan **tanpa upload bukti/surat**.
- KORMAT **tidak memonitor presensi secara real-time** — hanya melihat rekap
  **setelah sesi selesai**.

## 7. Modul Laporan

- Laporan **hanya bisa diakses oleh KORMAT** (mahasiswa tidak punya akses laporan
  terpisah — statistik kehadiran pribadi cukup lewat dashboard mahasiswa).
- Cakupan laporan: **per kelas**, berisi rekap kehadiran seluruh mahasiswa,
  dirinci **per sesi pertemuan**.
- Wajib mendukung **export ke PDF**.

## 8. Modul Notifikasi

- Implementasi menggunakan **Web Push API** (Service Worker + Push API,
  kompatibel dengan target Android/TWA via Chrome).
- Notifikasi yang wajib ada:
  1. Reminder kelas/sesi akan segera dimulai (ke Mahasiswa).
  2. Approval join kelas diterima/ditolak (ke Mahasiswa).
  3. Ada pengajuan join baru yang perlu di-approve (ke KORMAT).

## 9. Modul Dashboard

### 9.1 Dashboard KORMAT
- Jumlah kelas yang dikelola.
- Jumlah mahasiswa terdaftar per kelas.
- Jadwal sesi kelas pada hari berjalan.

### 9.2 Dashboard Mahasiswa
- Jumlah kelas yang diikuti (sudah bergabung).
- Statistik kehadiran per kelas: jumlah Hadir, Izin, Sakit, Alfa.
- Jadwal sesi kelas pada hari berjalan.

## 10. Hal yang Masih Perlu Diklarifikasi / Belum Diputuskan

> Bagian ini WAJIB ditanyakan ulang ke pemilik proyek sebelum diimplementasikan,
> jangan diasumsikan oleh coding agent.

- Detail radius geofence (jarak dalam meter dari titik kampus UNJ) — belum
  ditentukan angka pastinya, meski sudah disepakati sifatnya non-blocking/logging.
- Detail teknis integrasi face recognition (library/model/service yang dipakai
  di sisi server) belum dibahas — akan masuk tahap desain teknis.
- Detail arsitektur API antara Next.js (frontend) dan Laravel (backend) belum dibahas.
- Detail ERD/skema database belum dibuat — menyusul di tahap desain teknis.
- Detail penyimpanan data lokasi (format, presisi, retention policy) belum dibahas.

---

**Catatan untuk coding agent:** Dokumen ini adalah hasil brainstorming bisnis,
BUKAN spesifikasi teknis final. Sebelum membuat keputusan arsitektur (ERD, API
contract, folder structure, dsb) yang tidak tercakup di sini, konfirmasi dulu ke
pengguna alih-alih berasumsi.
