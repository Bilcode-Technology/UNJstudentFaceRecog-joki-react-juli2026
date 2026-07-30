# Execution Prompt — Fase 8B: Restyle Auth & Halaman Mahasiswa

> Lanjutan `EXECUTION_PROMPT_FASE_8A.md` — prasyarat: komponen `Button`, `Badge`,
> `Card`, `Input`, `Select`, token warna & font SUDAH ada dan berfungsi.
> Fase ini murni **restyle tampilan**, TIDAK mengubah logic bisnis, validasi,
> pemanggilan API/BFF, atau struktur data apa pun — hanya markup & styling.

## KONTEKS FASE INI

Restyle halaman Auth (dipakai semua role) dan seluruh halaman Mahasiswa,
dengan prinsip **mobile-first** (halaman ini yang paling sering dibuka dari
HP, terutama alur presensi). Gunakan KOMPONEN dari Fase 8A — JANGAN menulis
styling manual baru yang seharusnya sudah tersedia di `components/ui/`.

---

## BAGIAN 1 — Halaman Auth

### `login/page.tsx`
- Layout: card terpusat (pakai `Card`), logo/nama aplikasi di atas, form pakai `Input` untuk email/password, `Button variant="primary" size="lg"` full-width untuk submit.
- Background halaman: `canvas`.
- Link ke halaman register di bawah form.

### `register/page.tsx`
- Form pakai `Input` untuk name/email/password/nim/angkatan.
- Bagian capture foto wajah: buat lebih jelas secara visual — frame kamera dengan border radius, overlay panduan (misal outline oval/persegi di tengah frame sebagai panduan posisi wajah), tombol "Ambil Foto" jelas terpisah dari tombol "Daftar".
- Tampilkan preview foto yang sudah diambil sebelum submit, dengan opsi "Ambil Ulang".
- Tampilkan pesan error spesifik dari backend (misal "wajah tidak terdeteksi") dengan jelas di dekat area kamera, bukan di generic error banner.

### Kriteria Selesai
- [ ] Kedua halaman pakai komponen `Card`/`Input`/`Button` dari Fase 8A, tidak ada styling inline/manual yang duplikat fungsinya.
- [ ] Halaman nyaman diakses dari layar HP (tidak ada elemen terpotong/overflow).
- [ ] Alur capture foto register lebih intuitif (preview + ambil ulang), TANPA mengubah logic pengiriman data ke backend.

---

## BAGIAN 2 — Dashboard Mahasiswa

### `mahasiswa/dashboard/page.tsx`
- Grid metrik ringkas pakai `Card` (jumlah kelas diikuti; total hadir/izin/sakit/alfa lintas kelas jika data mendukung, atau per kelas dalam list ringkas).
- Widget "Jadwal Hari Ini": list card per sesi (nama kelas, jam, room/online), dengan **tombol "Presensi Sekarang"** yang menonjol jika sesi sedang dalam window aktif (bandingkan waktu sekarang dengan window sesi di client, tampilkan tombol disabled/label berbeda jika belum/sudah lewat window — murni kondisi tampilan, endpoint tetap yang sudah ada).
- Statistik kehadiran per kelas: tampilkan pakai `Badge` untuk tiap status + angka.

### Kriteria Selesai
- [ ] Dashboard nyaman dibaca sekali lihat di layar HP (single column, card-based, tidak padat).
- [ ] Tombol "Presensi Sekarang" mengarah ke halaman check-in sesi yang benar.

---

## BAGIAN 3 — Modul Kelas (Mahasiswa)

### `mahasiswa/courses/page.tsx`
- Tab "Tersedia" / "Diikuti" — pakai tab sederhana (bukan perlu library tambahan, cukup state + styling `Button ghost` untuk tab aktif/nonaktif).
- Form join dengan `join_code` — `Input` + `Button`, tampilkan feedback jelas (sukses "Pengajuan terkirim" / gagal).
- List kelas pakai `Card`, tampilkan `Badge` status (`pending`/`approved`) untuk tab "Diikuti".

### `mahasiswa/courses/[id]/page.tsx`
- Info kelas (nama, kode, KORMAT) di `Card` header.
- List sesi di bawahnya, tiap sesi jadi `Card` kecil dengan tanggal/jam dan `Badge` jika relevan (misal "Hari Ini").

### Kriteria Selesai
- [ ] Kedua halaman konsisten memakai komponen Fase 8A.
- [ ] Tab & badge status berfungsi visual dengan benar sesuai data asli dari API.

---

## BAGIAN 4 — Presensi (Halaman Paling Kritis)

### `mahasiswa/sessions/[id]/attendance/page.tsx`
- **Prioritas utama**: tombol "Presensi" jadi elemen paling dominan di halaman — `Button variant="primary" size="lg"` full-width, posisi mudah dijangkau ibu jari (bagian bawah layar, bukan di atas).
- Alur visual saat presensi:
  1. Tampilkan preview kamera jelas sebelum capture.
  2. Setelah capture, tampilkan status loading (spinner) saat request diproses.
  3. Hasil sukses → tampilkan dengan jelas (ikon centang + `Badge` status `hadir`, tampilkan `late_minutes` jika ada dengan bahasa ramah misal "Anda terlambat 7 menit").
  4. Hasil gagal → tampilkan pesan generik (sesuai aturan bisnis, JANGAN diubah teksnya), dengan tombol "Coba Lagi" yang jelas dan mudah diklik ulang (ingat: tidak ada limit retry).
- Tombol terpisah untuk "Ajukan Izin" / "Ajukan Sakit" — buat lebih kecil/sekunder (`Button variant="secondary"` atau `ghost`) supaya tidak bersaing secara visual dengan tombol utama "Presensi".
- Indikator status izin lokasi browser (jika ditolak user, tampilkan pesan jelas kenapa dibutuhkan — TANPA mengubah bahwa ini tetap wajib diminta sesuai Fase 4).

### Kriteria Selesai
- [ ] Tombol presensi jelas jadi fokus utama halaman, mudah dijangkau di HP.
- [ ] Alur loading → sukses/gagal tervisualisasikan dengan jelas, tidak ada state "blank"/tidak jelas saat menunggu response.
- [ ] Pesan gagal generik TETAP sama persis tekstualnya (jangan direvisi jadi lebih "ramah" — itu keputusan sadar dari Fase 4, styling boleh dipercantik tapi teks pesan tidak berubah).

---

## BAGIAN 5 — Notifikasi

### `notifications/page.tsx`
- List notifikasi pakai `Card` tipis per item, badge kecil untuk yang belum dibaca (misal dot/indicator di `unj-teal`).
- Tombol "Tandai Dibaca" per item, styling minimal (`ghost` button/icon).

### Kriteria Selesai
- [ ] Halaman nyaman dibaca dan dibedakan jelas antara sudah/belum dibaca secara visual.

---

## CATATAN UNTUK CODING AGENT

- JANGAN mengubah endpoint yang dipanggil, validasi, atau logic apa pun —
  fase ini murni tampilan. Kalau menemukan bug/inkonsistensi logic saat
  restyle, **laporkan terpisah**, jangan diam-diam diperbaiki di sini.
- Semua styling WAJIB memakai komponen dari `components/ui/` (Fase 8A) — kalau
  ada kebutuhan varian baru yang belum ada, tambahkan sebagai prop baru di
  komponen terkait (bukan bikin styling manual terpisah di halaman).
- Setelah Fase 8B selesai, JANGAN lanjut restyle halaman KORMAT/Superadmin
  tanpa instruksi Fase 8C.
- Laporkan hasil akhir: file yang diubah, konfirmasi kriteria selesai
  Bagian 1–5, dan screenshot/deskripsi visual jika memungkinkan.
