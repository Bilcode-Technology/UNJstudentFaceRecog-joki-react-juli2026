'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface TodaySession {
  id: number;
  meeting_type: string;
  room: string | null;
  meeting_date: string;
  start_time: string;
  end_time: string;
  course: {
    id: number;
    name: string;
    code: string;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  const [todaySessions, setTodaySessions] = useState<TodaySession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const isSuperAdmin = user?.roles?.some((r) => r.name === 'superadmin');
  const isKormat = user?.roles?.some((r) => r.name === 'kormat');
  const isMahasiswa = user?.roles?.some((r) => r.name === 'mahasiswa');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!isLoading && isAuthenticated && user) {
      const isSuperAdmin = user.roles?.some((r) => r.name === 'superadmin');
      const isKormat = user.roles?.some((r) => r.name === 'kormat');
      const isMahasiswa = user.roles?.some((r) => r.name === 'mahasiswa');

      if (isSuperAdmin) {
        router.replace('/superadmin/dashboard');
      } else if (isKormat) {
        router.replace('/kormat/dashboard');
      } else if (isMahasiswa) {
        router.replace('/mahasiswa/dashboard');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTodaySessions();
    }
  }, [isAuthenticated]);

  const fetchTodaySessions = async () => {
    try {
      setLoadingSessions(true);
      const res = await fetch('/api/sessions/today');
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setTodaySessions(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSessions(false);
    }
  };

  if (isLoading || isSuperAdmin || isKormat || isMahasiswa) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-unj-teal border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Mengalihkan ke dashboard...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-unj-teal">
              {isKormat ? 'Portal Koordinator Matkul' : isMahasiswa ? 'Portal Mahasiswa' : 'Sistem Presensi'}
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard Utama</h1>
            <p className="text-sm text-slate-500">Selamat datang kembali, <span className="font-semibold text-slate-800">{user.name}</span>!</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm"
          >
            Logout
          </button>
        </div>

        {/* Action Modules Nav Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            🚀 Menu Utama & Fitur Sistem
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isKormat && (
              <a
                href="/kormat/courses"
                className="group p-5 rounded-xl border border-unj-teal/30 bg-gradient-to-br from-unj-teal/5 to-unj-teal/10 hover:border-unj-teal/60 hover:shadow-md transition-all block"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">📚</span>
                  <span className="text-xs font-semibold bg-unj-teal text-white px-2 py-0.5 rounded-full">
                    Akses KORMAT
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-unj-teal transition-colors">
                  Kelola Kelas & Sesi Pertemuan &rarr;
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Buat kelas baru, dapatkan join code, kelola pengajuan mahasiswa (approve/reject), buat sesi pertemuan, dan lakukan override presensi manual.
                </p>
              </a>
            )}

            {isMahasiswa && (
              <a
                href="/mahasiswa/courses"
                className="group p-5 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 hover:border-emerald-400 hover:shadow-md transition-all block"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">🎓</span>
                  <span className="text-xs font-semibold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                    Akses Mahasiswa
                  </span>
                </div>
                <h3 className="text-lg font-bold text-emerald-950 group-hover:text-emerald-600 transition-colors">
                  Mata Kuliah & Presensi Saya &rarr;
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Lihat daftar kelas diikuti, masukkan kode kelas untuk join, lihat jadwal sesi hari ini, dan lakukan check-in presensi berbasis wajah (Face Recognition).
                </p>
              </a>
            )}
          </div>
        </div>

        {/* Today's Sessions Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              📅 Sesi Pertemuan Hari Ini
            </h2>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              Timezone: Asia/Jakarta
            </span>
          </div>

          {loadingSessions ? (
            <p className="text-sm text-slate-500 py-4">Memuat sesi hari ini...</p>
          ) : todaySessions.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p className="text-sm font-medium text-slate-600">Tidak ada sesi pertemuan yang dijadwalkan hari ini.</p>
              <p className="text-xs text-slate-400 mt-1">
                {isKormat ? 'Anda dapat membuat sesi baru dari menu Kelola Kelas.' : 'Silakan cek menu Mata Kuliah Saya.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {todaySessions.map((session) => (
                <div
                  key={session.id}
                  className="p-4 border rounded-xl bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-unj-teal/30 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-unj-teal bg-unj-teal/10 px-2 py-0.5 rounded">
                        {session.course.code}
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        {session.meeting_type === 'offline' ? `📍 Ruang: ${session.room}` : '💻 Online'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{session.course.name}</h3>
                    <p className="text-xs text-slate-600 font-medium">
                      ⏰ Jam: {session.start_time} - {session.end_time} WIB
                    </p>
                  </div>

                  <div>
                    {isKormat && (
                      <a
                        href={`/kormat/sessions/${session.id}/attendance`}
                        className="px-4 py-2 bg-unj-teal hover:bg-unj-teal-dark text-white font-medium text-xs rounded-lg inline-block shadow-sm transition-colors"
                      >
                        Rekap & Override Presensi &rarr;
                      </a>
                    )}
                    {isMahasiswa && (
                      <a
                        href={`/mahasiswa/sessions/${session.id}/attendance`}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg inline-block shadow-sm transition-colors"
                      >
                        Presensi Wajah / Izin &rarr;
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Info & BFF Status Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Detail Profil Pengguna (Sanctum Session)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs text-slate-600 bg-slate-50 p-4 rounded-lg">
            <div>
              <span className="font-medium text-slate-400 block">NAMA</span>
              <span className="font-semibold text-slate-800">{user.name}</span>
            </div>
            <div>
              <span className="font-medium text-slate-400 block">EMAIL</span>
              <span className="font-semibold text-slate-800">{user.email}</span>
            </div>
            <div>
              <span className="font-medium text-slate-400 block">ROLE HAK AKSES</span>
              <span className="font-semibold text-unj-teal uppercase">
                {user.roles?.map((r) => r.name).join(', ') || '-'}
              </span>
            </div>
            <div>
              <span className="font-medium text-slate-400 block">NIM</span>
              <span className="font-semibold text-slate-800">{user.nim || '-'}</span>
            </div>
            <div>
              <span className="font-medium text-slate-400 block">ANGKATAN</span>
              <span className="font-semibold text-slate-800">{user.angkatan || '-'}</span>
            </div>
            <div>
              <span className="font-medium text-slate-400 block">SYSTEM ID</span>
              <span className="font-semibold text-slate-800">#{user.id}</span>
            </div>
          </div>

          <div className="p-3 bg-unj-teal/5 border border-unj-teal/20 text-unj-teal-dark rounded-lg text-xs flex items-center gap-2">
            <span>🛡️</span>
            <span>
              <strong>BFF Proxy Status:</strong> Berhasil terhubung. Token tersimpan terisolasi dalam <code>httpOnly cookie</code>.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
