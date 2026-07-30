'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function SuperadminDashboardPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  const isSuperAdmin = user?.roles?.some((r) => r.name === 'superadmin');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <AppShell role="superadmin" title="Dashboard Superadmin">
        <div className="p-8 text-center text-slate-500">Memuat dashboard Superadmin...</div>
      </AppShell>
    );
  }

  if (!user || !isSuperAdmin) {
    return (
      <AppShell role="superadmin" title="Akses Ditolak">
        <Card className="p-6 text-red-600">Akses Ditolak. Halaman ini khusus untuk Superadmin.</Card>
      </AppShell>
    );
  }

  return (
    <AppShell role="superadmin" title="Dashboard Administrator Utama">
      {/* Welcome Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
          Superadmin Portal
        </span>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
          Selamat Datang, {user.name} 👋
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Pusat kendali akun Koordinator Mata Kuliah (KORMAT) dan pengawasan seluruh aktivitas akademik perkuliahan.
        </p>
      </div>

      {/* Action / Module Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Kelola KORMAT */}
        <Card className="p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl">
              👥
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Manajemen KORMAT
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tambah akun KORMAT baru, ubah data, atur status aktif/nonaktif, reset password, atau hapus akun.
            </p>
          </div>
          <Link href="/superadmin/kormat">
            <Button variant="primary" size="md" className="w-full">
              Kelola Akun KORMAT &rarr;
            </Button>
          </Link>
        </Card>

        {/* Card 2: Monitoring Courses */}
        <Card className="p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl">
              📚
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Monitoring Kelas
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pengawasan read-only seluruh daftar mata kuliah di sistem beserta KORMAT pemilik dan jumlah mahasiswa.
            </p>
          </div>
          <Link href="/superadmin/courses">
            <Button variant="outline" size="md" className="w-full">
              Lihat Semua Kelas &rarr;
            </Button>
          </Link>
        </Card>

        {/* Card 3: Monitoring Students */}
        <Card className="p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center text-2xl">
              🎓
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Monitoring Mahasiswa
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pengawasan read-only seluruh daftar mahasiswa terdaftar, NIM, angkatan, dan status registrasi wajah.
            </p>
          </div>
          <Link href="/superadmin/students">
            <Button variant="secondary" size="md" className="w-full">
              Lihat Semua Mahasiswa &rarr;
            </Button>
          </Link>
        </Card>
      </div>
    </AppShell>
  );
}
