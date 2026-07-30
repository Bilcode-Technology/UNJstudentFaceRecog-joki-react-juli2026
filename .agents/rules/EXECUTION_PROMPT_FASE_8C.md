# Execution Prompt — Fase 8C: Restyle KORMAT & Superadmin

> Lanjutan `EXECUTION_PROMPT_FASE_8A.md`/`8B.md` — prasyarat: komponen `ui/`
> Fase 8A sudah ada. Murni restyle, TIDAK mengubah logic/endpoint/validasi.
> Prinsip: **desktop-friendly** (data-dense, sidebar, tabel lebar) tapi tetap
> jangan sampai rusak di layar tablet/HP (tetap responsive, bukan desktop-only).

## KONTEKS FASE INI

Restyle seluruh halaman KORMAT & Superadmin. Berbeda dari Fase 8B (mobile-first,
kartu besar), di sini prioritas keterbacaan data padat: tabel, grid metrik,
sidebar navigasi — karena KORMAT/Superadmin biasanya kerja dari laptop/desktop.

---

## BAGIAN 1 — Shared Desktop Shell

Buat `src/components/layout/AppShell.tsx` (dipakai bersama oleh halaman
KORMAT & Superadmin, item navigasi beda per role):
- **Sidebar** (collapsible di layar sempit, jadi drawer/hamburger di mobile —
  JANGAN desktop-only, tetap harus bisa diakses dari tablet/HP meski
  prioritas utamanya desktop): logo/nama app, menu navigasi sesuai role,
  highlight menu aktif.
- **Topbar**: breadcrumb halaman saat ini, info user login (nama + tombol
  logout), ikon notifikasi (link ke `/notifications`, tampilkan dot jika ada
  yang belum dibaca — reuse data yang sudah ada dari Fase 6).
- Menu KORMAT: Dashboard, Kelas, Notifikasi.
- Menu Superadmin: Dashboard, Kelola KORMAT, Monitoring Kelas, Monitoring Mahasiswa.

### Kriteria Selesai
- [ ] Shell dipakai konsisten di semua halaman KORMAT & Superadmin (bukan tiap halaman bikin layout sendiri).
- [ ] Sidebar tetap bisa diakses (drawer) di layar sempit, tidak hilang total.

---

## BAGIAN 2 — Dashboard KORMAT

### `kormat/dashboard/page.tsx`
- Grid metrik 4 kolom (desktop) → responsive jadi 2/1 kolom di layar sempit, pakai `Card`: jumlah kelas aktif, jumlah kelas diarsipkan, total mahasiswa approved lintas kelas, jumlah sesi hari ini.
- Widget "Jadwal Hari Ini": tabel ringkas (bukan card besar seperti versi mahasiswa) — kolom: nama kelas, jam, room/online, jumlah mahasiswa.
- List kelas yang dikelola: ringkas dengan link ke detail.

### Kriteria Selesai
- [ ] Layout memanfaatkan lebar layar desktop (grid, bukan single column memanjang).

---

## BAGIAN 3 — Modul Kelas (KORMAT)

### `kormat/courses/page.tsx`
- `DataTable`: nama, kode, jumlah mahasiswa, status archived, aksi (lihat/arsipkan/hapus).
- Modal/form "Buat Kelas Baru" — **WAJIB tetap ada konfirmasi eksplisit sebelum submit** (sesuai aturan bisnis: kelas immutable), styling modal konfirmasi yang jelas (bukan `window.confirm()` browser bawaan, buat komponen dialog yang konsisten dengan design system).

### `kormat/courses/[id]/page.tsx`
- Info kelas di `Card` header + tombol export laporan (link ke halaman report).
- Tab/section "Mahasiswa": `DataTable` dengan checkbox untuk bulk-approve, tombol approve/reject per baris, filter status.
- Tab/section "Sesi": `DataTable` daftar sesi + tombol "Buat Sesi Baru" (modal form: meeting_type, room conditional, tanggal, jam).

### Kriteria Selesai
- [ ] Modal konfirmasi buat kelas benar-benar menahan submit sampai user konfirmasi eksplisit (bukan cuma alert kosmetik).
- [ ] Bulk-approve di UI benar-benar memanggil endpoint bulk (bukan looping single-approve per checkbox yang dicentang).

---

## BAGIAN 4 — Rekap & Override Presensi (KORMAT)

### `kormat/sessions/[id]/attendance/page.tsx`
- `DataTable` semua mahasiswa approved: nama, NIM, status (`Badge`), `late_minutes` (jika ada), waktu check-in, lokasi (opsional, boleh cuma indikator ada/tidak ada tanpa perlu peta).
- Kolom "Belum Presensi" ditampilkan dengan `Badge` neutral yang jelas beda dari status resmi lainnya.
- Kontrol override: dropdown/select status per baris + tombol simpan, atau modal edit per baris — pilih yang lebih efisien untuk data banyak baris (dropdown inline kemungkinan lebih cepat dipakai KORMAT untuk banyak mahasiswa sekaligus).

### Kriteria Selesai
- [ ] Override per baris berfungsi tanpa reload halaman penuh (update state lokal setelah sukses).

---

## BAGIAN 5 — Laporan (KORMAT)

### `kormat/courses/[id]/report/page.tsx`
- Preview tabel matriks (mahasiswa × sesi) — `DataTable` dengan header sticky (karena berpotensi banyak kolom sesi, aktifkan scroll horizontal).
- Tombol "Export PDF" menonjol di atas tabel, tampilkan loading state saat proses download.

### Kriteria Selesai
- [ ] Tabel matriks nyaman dibaca meski kolom sesi banyak (scroll horizontal, header tetap terlihat).

---

## BAGIAN 6 — Superadmin

### `superadmin/dashboard/page.tsx`
- Grid metrik ringkas: total KORMAT aktif, total mahasiswa, total kelas.

### `superadmin/kormat/page.tsx`
- `DataTable`: nama, email, jumlah kelas, status aktif (`Badge`), aksi (Edit, Nonaktifkan/Aktifkan, Reset Password, Hapus).
- Tombol Hapus **disabled dengan tooltip jelas** jika KORMAT masih punya kelas (bukan cuma gagal setelah diklik).
- Modal/form terpisah untuk: Tambah KORMAT, Edit KORMAT, Reset Password — gunakan komponen dialog yang sama dengan modal konfirmasi kelas di Bagian 3 (konsisten, reusable).

### `superadmin/courses/page.tsx` & `superadmin/students/page.tsx`
- `DataTable` read-only sesuai data yang sudah ada dari Fase 7 (tidak perlu aksi apa pun di sini, murni monitoring).

### Kriteria Selesai
- [ ] Semua modal (buat KORMAT, edit, reset password, konfirmasi hapus) pakai komponen dialog yang sama, tidak reinvent per halaman.
- [ ] Tombol hapus KORMAT ter-disable otomatis sesuai kondisi data (bukan hanya validasi di backend).

---

## CATATAN UNTUK CODING AGENT

- Buat 1 komponen `Dialog`/`Modal` reusable di `components/ui/` (kalau belum
  ada dari Fase 8A) — dipakai di SEMUA modal fase ini (konfirmasi buat kelas,
  buat sesi, CRUD KORMAT), jangan bikin modal terpisah-pisah per halaman.
- JANGAN mengubah logic/endpoint apa pun — restyle murni. Laporkan terpisah
  jika menemukan bug saat proses ini.
- Ini fase terakhir dari scope UI/UX polish yang disepakati. Setelah selesai,
  JANGAN restyle/tambah halaman baru tanpa instruksi eksplisit.
- Laporkan hasil akhir: file diubah, konfirmasi kriteria selesai Bagian 1–6,
  dan keputusan desain (misal dropdown vs modal untuk override) beserta alasannya.
