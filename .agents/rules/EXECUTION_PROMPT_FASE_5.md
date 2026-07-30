# Execution Prompt — Fase 5: Laporan & Dashboard

> Lanjutan `EXECUTION_PROMPT_FASE_4.md`. Baca bersama `PROJECT_RULES.md`.
> Ikuti format envelope global rules (`status`,`message`,`data`,`errors` + HTTP code).
> Jangan lompat ke modul Notifikasi — itu Fase 6 terpisah.

## KONTEKS FASE INI

Fase ini murni **read/reporting** — tidak ada perubahan skema data baru, hanya
agregasi dari data yang sudah ada (courses, class_sessions, attendances).
Prasyarat: Fase 2, 3, 4 sudah selesai.

---

## BAGIAN 1 — Laravel: Modul Laporan

### Setup
Install `barryvdh/laravel-dompdf` via composer, publish config jika perlu.

### `GET /api/courses/{id}/report` (auth:sanctum, role:kormat)
- Authorize: kelas milik KORMAT ini (pakai `CoursePolicy::view` atau method sejenis yang sudah ada).
- Return data terstruktur: info kelas (nama, kode) + daftar **semua sesi** kelas ini (urut kronologis berdasarkan `meeting_date`+`start_time`) + untuk tiap sesi, daftar **semua mahasiswa approved** beserta status attendance mereka (`hadir`/`izin`/`sakit`/`alfa`/placeholder `"belum_presensi"` jika belum ada baris — SAMA seperti pola di endpoint rekap Fase 4, reuse logic yang sudah ada di `AttendanceRepository` untuk konsistensi, jangan duplikasi query).
- Sertakan `late_minutes` per baris jika status `hadir`.

### `GET /api/courses/{id}/report/export` (auth:sanctum, role:kormat)
- Authorize sama seperti di atas.
- Ambil data yang sama seperti endpoint report (reuse method/service yang sama, jangan tulis ulang query).
- Render ke Blade view baru `resources/views/reports/course-attendance.blade.php` — tabel: baris = mahasiswa, kolom = tiap sesi (atau sebaliknya, mahasiswa per baris, sesi per kolom — pilih layout yang lebih mudah dibaca untuk banyak sesi, tabel matrix mahasiswa × sesi dengan status singkat di tiap sel biasanya paling ringkas; jelaskan pilihan layout di ringkasan akhir).
- Header PDF: nama mata kuliah, kode, nama KORMAT, tanggal generate laporan.
- Generate & return sebagai **file download** (`Content-Type: application/pdf`, `Content-Disposition: attachment`), nama file misal `laporan-{course_code}-{tanggal}.pdf`.
- Buat `app/Services/ReportService.php` untuk logic ini (dipanggil dari kedua endpoint di atas).

**Selesai jika**:
- [ ] KORMAT lain (bukan pemilik) tidak bisa akses laporan kelas ini (403).
- [ ] `/report` mengembalikan data lengkap semua sesi × semua mahasiswa approved, termasuk placeholder untuk yang belum presensi.
- [ ] `/report/export` menghasilkan file PDF valid yang bisa dibuka, bukan file korup/kosong.
- [ ] Data di PDF konsisten dengan data di endpoint `/report` (sumber data sama).

---

## BAGIAN 2 — Laravel: Dashboard

### `GET /api/dashboard/kormat` (auth:sanctum, role:kormat)
Buat `app/Services/DashboardService.php`, method `getKormatDashboard(User $user)`:
- Jumlah kelas yang dikelola user ini (tidak termasuk yang archived, kecuali kamu anggap perlu ditampilkan terpisah — putuskan salah satu, default: hanya yang aktif).
- Untuk tiap kelas: jumlah mahasiswa dengan status `approved`.
- Jadwal hari ini: **WAJIB reuse method yang sudah dibuat di Fase 3** untuk `GET /api/sessions/today` (jangan tulis ulang query filter tanggal/timezone dari nol) — filter untuk kelas-kelas yang dikelola user ini.

### `GET /api/dashboard/mahasiswa` (auth:sanctum, role:mahasiswa)
Method `getMahasiswaDashboard(User $user)`:
- Jumlah kelas yang diikuti (status `approved`).
- Statistik kehadiran **per kelas**: hitung jumlah baris attendance dengan status `hadir`/`izin`/`sakit`/`alfa` untuk tiap kelas yang diikuti (group by course, group by status — gunakan query aggregate, jangan loop manual per baris jika bisa dihindari).
- Jadwal hari ini: reuse method yang sama dari Fase 3, filter untuk kelas yang diikuti (approved) oleh user ini.

**Selesai jika**:
- [ ] Dashboard KORMAT menampilkan angka yang benar dan konsisten dengan data courses/course_student yang ada.
- [ ] Dashboard Mahasiswa menampilkan statistik hadir/izin/sakit/alfa yang akurat per kelas.
- [ ] Kedua endpoint memakai ulang logic `sessions/today` dari Fase 3, tidak menduplikasi query filter tanggal/timezone.

---

## BAGIAN 3 — Next.js: BFF Proxy & UI

### Proxy Routes
- `courses/[id]/report` (GET)
- `courses/[id]/report/export` (GET) — **PENTING**: route handler ini harus meneruskan response **binary** dari Laravel apa adanya (bukan di-parse sebagai JSON), termasuk header `Content-Type: application/pdf` dan `Content-Disposition`, supaya browser bisa langsung download/preview PDF-nya.
- `dashboard/kormat` (GET)
- `dashboard/mahasiswa` (GET)

### Halaman Dashboard
- `kormat/dashboard` — jumlah kelas, jumlah mahasiswa per kelas, jadwal hari ini.
- `mahasiswa/dashboard` — jumlah kelas diikuti, statistik hadir/izin/sakit/alfa per kelas (tabel/list sederhana), jadwal hari ini.
- Jadikan ini halaman **landing setelah login** untuk masing-masing role (redirect dari `/login` sesuai role user, tentukan logic ini di `useAuth`/halaman login yang sudah ada dari Fase 2).

### Halaman Laporan (KORMAT)
- `kormat/courses/[id]/report` — tampilkan data laporan (tabel matrix sesi × mahasiswa atau format lain yang readable) + tombol "Export PDF" yang men-trigger download dari endpoint export.

Styling minimal, fokus fungsionalitas.

**Selesai jika**:
- [ ] Login KORMAT langsung diarahkan ke `/kormat/dashboard`, login Mahasiswa ke `/mahasiswa/dashboard`.
- [ ] Tombol Export PDF di halaman laporan berhasil mengunduh file PDF yang valid lewat browser.
- [ ] Semua request tetap melalui BFF proxy Next.js.

---

## CATATAN UNTUK CODING AGENT

- Jika ada keputusan yang tidak tercakup eksplisit di sini/`PROJECT_RULES.md` (misal layout tabel PDF, apakah kelas archived dihitung di dashboard), **berhenti dan tanya user**, atau putuskan dengan alasan jelas yang WAJIB disebutkan di ringkasan akhir — jangan "Open Questions: None" begitu saja jika sebenarnya ada keputusan yang diambil.
- **Wajib reuse logic/service yang sudah ada** dari fase-fase sebelumnya (query rekap attendance dari Fase 4, query sessions/today dari Fase 3) — jangan menulis ulang query yang sama di tempat berbeda, ini prinsip DRY yang penting untuk maintainability jangka panjang mengingat scope proyek yang terbatas.
- Setelah Fase 5 selesai, JANGAN lanjut membangun modul Notifikasi tanpa instruksi/prompt Fase 6.
- Laporkan hasil akhir: file yang ditambahkan/diubah, konfirmasi kriteria selesai Bagian 1–3, keputusan desain (layout PDF, dsb) beserta alasannya, dan screenshot/contoh output PDF jika memungkinkan dijelaskan strukturnya.
