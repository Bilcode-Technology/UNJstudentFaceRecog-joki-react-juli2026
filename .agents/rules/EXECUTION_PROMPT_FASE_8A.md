# Execution Prompt — Fase 8A: Fondasi Design System

> Lanjutan seluruh fase sebelumnya. Fase ini murni **visual/styling**, TIDAK
> mengubah logic bisnis, endpoint, atau struktur data apa pun. Baca bersama
> `PROJECT_RULES.md` untuk konteks role (Mahasiswa=mobile-first, KORMAT=desktop-friendly).

## KONTEKS FASE INI

Membangun fondasi design system yang akan dipakai ulang di seluruh halaman
(Fase 8B dst). Identitas visual mengikuti warna resmi UNJ yang sudah
diadaptasi untuk UI, mood **bersih & modern (minimalis)**.

---

## BAGIAN 1 — Tailwind Config & Design Tokens

### Warna (tambahkan ke `tailwind.config.ts` sebagai custom color, JANGAN override warna default Tailwind):
```
unj: {
  teal: '#00595C',      // primer: navigasi, tombol utama, header
  'teal-dark': '#00393B', // hover/active state teal
  gold: '#F5C518',       // aksen: highlight, badge, ikon penting
  red: '#C81E2E',        // KHUSUS status error/alfa/destructive
}
canvas: '#F7F6F3',        // background utama
ink: '#1A1F1E',           // teks utama
line: '#E4E1DA',          // border/divider
```

### Font
- Tambahkan **Plus Jakarta Sans** (via `next/font/google`) untuk heading/display.
- Tambahkan **Inter** (via `next/font/google`) untuk body text & data tabel.
- Set sebagai CSS variable (`--font-heading`, `--font-body`) dan daftarkan di `tailwind.config.ts` (`fontFamily.heading`, `fontFamily.body`).
- Body default pakai `font-body`, heading (`h1`-`h6`) pakai `font-heading`.

### Kriteria Selesai
- [ ] Warna custom bisa dipakai via class Tailwind (`bg-unj-teal`, `text-unj-gold`, dst).
- [ ] Kedua font termuat dengan benar (cek Network tab, tidak ada FOUT/FOIT berlebihan — pakai `next/font` supaya self-hosted otomatis).

---

## BAGIAN 2 — Komponen UI Reusable

Buat folder `src/components/ui/` berisi komponen dasar (styled dengan token
Bagian 1), dipakai ulang di SEMUA halaman fase berikutnya:

### `Button.tsx`
- Varian: `primary` (bg teal), `secondary` (outline teal), `danger` (bg unj-red, untuk aksi hapus/reject), `ghost` (transparan, untuk aksi sekunder).
- Ukuran: `default`, `lg` (khusus tombol besar "Presensi" di halaman mahasiswa — full width, mudah dijangkau ibu jari, sesuai prinsip mobile-first).
- State: `loading` (tampilkan spinner), `disabled`.

### `Badge.tsx` — Signature Element
- Dipakai untuk status presensi (`hadir`/`izin`/`sakit`/`alfa`/`belum_presensi`) DAN status kelas (`pending`/`approved`/`rejected`).
- Bentuk: **perisai kecil** (clip-path atau SVG sederhana berbentuk shield/perisai minimalis, TERINSPIRASI dari elemen tugu/pena di logo UNJ, disederhanakan jadi bentuk geometris — bukan reproduksi logo asli, cukup bentuk perisai/shield generik sebagai motif konsisten).
- Warna per status: `hadir`→teal, `izin`/`sakit`→gold, `alfa`→unj-red, `pending`→abu netral, `approved`→teal, `rejected`→unj-red.

### `Card.tsx`
- Container dasar untuk metrik dashboard & konten halaman, dengan border `neutral-line`, background putih, shadow halus.

### `DataTable.tsx`
- Wrapper tabel generik (header sticky untuk tabel panjang seperti rekap presensi), dipakai di halaman KORMAT (rekap, laporan, monitoring).

### `Input.tsx` & `Select.tsx`
- Styled form input dasar, dipakai di semua form (login, register, buat kelas, buat sesi, dst).

### Kriteria Selesai
- [ ] Semua komponen di atas dibuat, bisa di-import dan dipakai di halaman lain.
- [ ] Badge shield terlihat konsisten di semua varian status/warna.
- [ ] Tidak ada halaman existing yang dimodifikasi di fase ini KECUALI jika perlu contoh pemakaian minimal (opsional, boleh skip — restyle halaman penuh ada di Fase 8B dst).

---

## BAGIAN 3 — PWA Manifest & Theme Color

- Update `public/manifest.json`: `theme_color` dan `background_color` disesuaikan ke `#00595C` (unj-teal) dan `#F7F6F3` (canvas).
- Update `<meta name="theme-color">` di layout root Next.js supaya konsisten dengan manifest (mempengaruhi warna status bar browser mobile).

### Kriteria Selesai
- [ ] Manifest & meta theme-color konsisten dengan token warna Bagian 1.

---

## CATATAN UNTUK CODING AGENT

- Ini fondasi — JANGAN restyle halaman fungsional yang sudah ada (dashboard,
  presensi, dsb) di fase ini. Itu scope Fase 8B dan seterusnya.
- Jika ada keputusan detail (misal shape SVG perisai, shadow value spesifik)
  yang tidak tercakup eksplisit, putuskan dengan penilaian desain yang wajar
  dan jelaskan di ringkasan akhir.
- Laporkan hasil akhir: file yang dibuat/diubah, screenshot/deskripsi visual
  tiap komponen jika memungkinkan dijelaskan, dan konfirmasi kriteria selesai
  Bagian 1–3.
