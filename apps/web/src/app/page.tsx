'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      badge: 'Selamat Datang',
      title: 'UNJ Electrical Student Attendance System',
      description:
        'Platform presensi perkuliahan digital resmi Mahasiswa Teknik Elektro Universitas Negeri Jakarta berbasis kecerdasan buatan.',
      icon: '⚡',
    },
    {
      badge: 'Teknologi Cerdas',
      title: 'Verifikasi Wajah & Geofencing Lokasi',
      description:
        'Presensi cepat dan valid dalam hitungan detik dengan AI Face Recognition server-side dan konfirmasi radius lokasi perkuliahan.',
      icon: '📸',
    },
    {
      badge: 'Transparan & Real-Time',
      title: 'Pantau Rekap Kehadiran Kuliah',
      description:
        'Dapatkan rekapitulasi persentase kehadiran per mata kuliah secara transparan serta laporan resmi siap cetak.',
      icon: '📊',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between overflow-x-hidden font-sans">
      {/* Top Header Navbar */}
      <header className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 flex justify-between items-center border-b border-slate-200 sticky top-0 bg-white/95 backdrop-blur-md z-40 shadow-xs">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative w-10 h-10 flex-shrink-0">
            <Image
              src="/Lambang_baru_UNJ.png"
              alt="Logo UNJ"
              width={40}
              height={40}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 block leading-tight">
              UNJ Electrical Attendance
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-unj-teal block">
              Teknik Elektro UNJ
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 bg-unj-teal hover:bg-unj-teal-dark text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md shadow-unj-teal/20"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold rounded-xl transition-all border border-slate-300"
          >
            Daftar
          </Link>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MOBILE VIEW: Interactive 3-Page Onboarding Splash Slider (< 768px)         */}
      {/* ========================================================================= */}
      <main className="block md:hidden flex-1 px-6 py-8 my-auto">
        <div className="flex flex-col justify-between h-full min-h-[500px] max-w-sm mx-auto bg-white border border-slate-200 rounded-3xl p-6 shadow-xl shadow-slate-200/60 relative">
          {/* Top Skip Button */}
          <div className="flex justify-between items-center">
            <span className="px-3 py-1 bg-unj-teal/10 border border-unj-teal/30 text-unj-teal text-[10px] font-bold rounded-full uppercase tracking-wider">
              {slides[currentSlide].badge}
            </span>
            {currentSlide < slides.length - 1 && (
              <button
                onClick={() => setCurrentSlide(slides.length - 1)}
                className="text-xs text-slate-500 hover:text-unj-teal font-semibold underline"
              >
                Lewati &rarr;
              </button>
            )}
          </div>

          {/* Slide Content Body */}
          <div className="my-auto py-6 space-y-4 text-center">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-unj-teal/10 border border-unj-teal/20 flex items-center justify-center text-4xl shadow-sm">
              {slides[currentSlide].icon}
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 leading-tight">
              {slides[currentSlide].title}
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed px-2">
              {slides[currentSlide].description}
            </p>
          </div>

          {/* Controls & CTA Footer */}
          <div className="space-y-6 pt-4">
            {/* Pagination Indicators */}
            <div className="flex justify-center items-center gap-2">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    currentSlide === idx ? 'w-8 bg-unj-teal' : 'w-2 bg-slate-300'
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Slide Action Buttons */}
            {currentSlide < slides.length - 1 ? (
              <button
                onClick={() => setCurrentSlide((prev) => prev + 1)}
                className="w-full py-3.5 bg-unj-teal hover:bg-unj-teal-dark text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-unj-teal/25"
              >
                Lanjutkan &rarr;
              </button>
            ) : (
              <div className="space-y-2">
                <Link
                  href="/login"
                  className="block text-center w-full py-3.5 bg-unj-teal hover:bg-unj-teal-dark text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-unj-teal/25"
                >
                  Masuk ke Portal
                </Link>
                <Link
                  href="/register"
                  className="block text-center w-full py-3.5 bg-white hover:bg-slate-100 text-slate-800 font-bold text-sm rounded-xl transition-all border border-slate-300"
                >
                  Registrasi Mahasiswa Baru
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* DESKTOP VIEW: Hero Section & Features Grid Showcase (>= 768px)              */}
      {/* ========================================================================= */}
      <main className="hidden md:block max-w-7xl mx-auto w-full px-6 py-12 space-y-16 my-auto">
        {/* Hero Section */}
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-unj-teal/10 border border-unj-teal/25 text-unj-teal text-xs font-bold rounded-full uppercase tracking-wider shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Portal Resmi Presensi Mahasiswa Teknik Elektro UNJ
          </div>

          <div className="flex justify-center items-center gap-4 pt-2">
            <Image
              src="/Lambang_baru_UNJ.png"
              alt="Logo UNJ Large"
              width={100}
              height={100}
              className="object-contain drop-shadow-sm"
            />
          </div>

          <h1 className="text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-tight">
            UNJ Electrical Student <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-unj-teal via-teal-700 to-emerald-600">
              Attendance System
            </span>
          </h1>

          <p className="text-slate-600 text-lg max-w-2xl mx-auto leading-relaxed">
            Sistem presensi digital terintegrasi berbasis kecerdasan buatan (Verifikasi Wajah AI 1:1), validasi lokasi geofencing presisi, dan rekapitulasi real-time.
          </p>

          <div className="flex justify-center items-center gap-4 pt-4">
            <Link
              href="/login"
              className="px-8 py-4 bg-unj-teal hover:bg-unj-teal-dark text-white font-extrabold text-base rounded-2xl transition-all shadow-xl shadow-unj-teal/25 transform hover:-translate-y-0.5"
            >
              Masuk ke Dashboard Portal &rarr;
            </Link>
            <Link
              href="/register"
              className="px-8 py-4 bg-white hover:bg-slate-100 text-slate-800 font-extrabold text-base rounded-2xl transition-all border border-slate-300 shadow-xs transform hover:-translate-y-0.5"
            >
              Registrasi Akun Mahasiswa
            </Link>
          </div>
        </div>

        {/* Features Grid (3 Columns) */}
        <div className="grid grid-cols-3 gap-6 pt-6">
          <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-3 hover:border-unj-teal/40 hover:shadow-md transition-all group">
            <div className="w-12 h-12 rounded-xl bg-unj-teal/10 text-unj-teal flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              📸
            </div>
            <h3 className="font-bold text-slate-900 text-lg">AI Face Recognition 1:1</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Verifikasi presensi berbasis Euclidean Distance yang aman dari foto manipulasi dan terisolasi server-side.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-3 hover:border-emerald-300 hover:shadow-md transition-all group">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              📍
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Geofencing Location</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Memastikan mahasiswa melakukan check-in di lokasi ruang kelas atau kampus yang telah ditentukan.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-3 hover:border-purple-300 hover:shadow-md transition-all group">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              📊
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Transparansi Laporan</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Rekapitulasi persentase kehadiran transparan per mata kuliah dan dukungan ekspor dokumen PDF resmi.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full px-6 py-6 border-t border-slate-200 text-center text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <Image
            src="/Lambang_baru_UNJ.png"
            alt="Logo UNJ Small"
            width={20}
            height={20}
            className="object-contain"
          />
          <span className="font-semibold text-slate-700">&copy; {new Date().getFullYear()} UNJ Electrical Student Attendance System</span>
        </div>
        <span>Program Studi Teknik Elektro — Universitas Negeri Jakarta</span>
      </footer>
    </div>
  );
}
