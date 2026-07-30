'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotification } from '@/hooks/usePushNotification';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';

interface CourseStats {
  id: number;
  name: string;
  code: string;
  stats: {
    hadir: number;
    izin: number;
    sakit: number;
    alfa: number;
    total_recorded: number;
  };
}

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

interface MahasiswaDashboardData {
  summary: {
    total_approved_courses: number;
    total_hadir: number;
    total_izin: number;
    total_sakit: number;
    total_alfa: number;
  };
  courses: CourseStats[];
  today_sessions: TodaySession[];
}

export default function MahasiswaDashboardPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const { subscribeToPush } = usePushNotification();

  const [data, setData] = useState<MahasiswaDashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  const isStudent = user?.roles?.some((r) => r.name === 'mahasiswa');

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && isStudent) {
        fetchDashboardData();
        subscribeToPush();
      } else {
        setLoadingDashboard(false);
      }
    }
  }, [isLoading, isAuthenticated, isStudent]);

  const fetchDashboardData = async () => {
    try {
      setLoadingDashboard(true);
      const res = await fetch('/api/dashboard/mahasiswa');
      const json = await res.json();
      if (res.ok && json.status === 'success') {
        setData(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const getSessionState = (startTime: string, endTime: string) => {
    const now = new Date();
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (currentHHMM < startTime) {
      return { label: '⏰ Belum Dimulai', active: false };
    } else if (currentHHMM > endTime) {
      return { label: '✓ Sesi Berakhir', active: false };
    } else {
      return { label: '⚡ Presensi Sekarang', active: true };
    }
  };

  if (isLoading || loadingDashboard) {
    return (
      <AppShell role="mahasiswa" title="Dashboard Mahasiswa">
        <div className="p-8 text-center text-slate-500 font-semibold">Memuat dashboard Mahasiswa...</div>
      </AppShell>
    );
  }

  if (!user || !isStudent) {
    return (
      <AppShell role="mahasiswa" title="Akses Ditolak">
        <Card className="p-6 text-red-600 font-semibold">Akses Ditolak. Halaman ini khusus untuk Mahasiswa.</Card>
      </AppShell>
    );
  }

  const todaySessionsColumns = [
    {
      header: 'Mata Kuliah',
      accessorKey: 'course',
      cell: (row: TodaySession) => (
        <div>
          <span className="font-bold text-slate-900 dark:text-slate-100">{row.course.name}</span>
          <span className="text-xs text-unj-teal font-mono font-bold block">{row.course.code}</span>
        </div>
      ),
    },
    {
      header: 'Waktu Pertemuan',
      accessorKey: 'start_time',
      cell: (row: TodaySession) => (
        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
          ⏰ {row.start_time} - {row.end_time} WIB
        </span>
      ),
    },
    {
      header: 'Tipe / Ruang',
      accessorKey: 'meeting_type',
      cell: (row: TodaySession) => (
        <Badge variant={row.meeting_type === 'offline' ? 'outline' : 'secondary'}>
          {row.meeting_type === 'offline' ? `📍 ${row.room || 'Ruang'}` : '💻 Online'}
        </Badge>
      ),
    },
    {
      header: 'Aksi Presensi',
      accessorKey: 'id',
      cell: (row: TodaySession) => {
        const sessionState = getSessionState(row.start_time, row.end_time);
        return sessionState.active ? (
          <Link href={`/mahasiswa/sessions/${row.id}/attendance`}>
            <Button size="sm" variant="primary">
              ⚡ Presensi Sekarang &rarr;
            </Button>
          </Link>
        ) : (
          <Badge variant="neutral">{sessionState.label}</Badge>
        );
      },
    },
  ];

  const courseColumns = [
    {
      header: 'Kode',
      accessorKey: 'code',
      cell: (row: CourseStats) => (
        <span className="font-mono font-bold text-unj-teal dark:text-teal-400 text-xs">
          {row.code}
        </span>
      ),
    },
    {
      header: 'Mata Kuliah',
      accessorKey: 'name',
      cell: (row: CourseStats) => (
        <span className="font-bold text-slate-900 dark:text-slate-100">{row.name}</span>
      ),
    },
    {
      header: 'Hadir',
      accessorKey: 'hadir',
      cell: (row: CourseStats) => <Badge variant="hadir">{row.stats.hadir}</Badge>,
    },
    {
      header: 'Izin',
      accessorKey: 'izin',
      cell: (row: CourseStats) => <Badge variant="izin">{row.stats.izin}</Badge>,
    },
    {
      header: 'Sakit',
      accessorKey: 'sakit',
      cell: (row: CourseStats) => <Badge variant="sakit">{row.stats.sakit}</Badge>,
    },
    {
      header: 'Alfa',
      accessorKey: 'alfa',
      cell: (row: CourseStats) => <Badge variant="alfa">{row.stats.alfa}</Badge>,
    },
    {
      header: 'Aksi',
      accessorKey: 'id',
      cell: (row: CourseStats) => (
        <Link href={`/mahasiswa/courses/${row.id}`}>
          <Button size="sm" variant="primary">
            Detail Sesi &rarr;
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <AppShell role="mahasiswa" title="Dashboard Mahasiswa">
      {/* Banner Mahasiswa */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
            Selamat Datang, {user.name} 👋
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            NIM: <strong className="text-slate-800 dark:text-slate-200">{user.nim || 'NIM belum diisi'}</strong> | Portal Presensi Mahasiswa Teknik Elektro UNJ
          </p>
        </div>
        <Link href="/mahasiswa/courses">
          <Button variant="primary" size="md">
            🎓 Mata Kuliah Saya
          </Button>
        </Link>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">KELAS DIIKUTI</span>
          <span className="text-2xl font-extrabold text-unj-teal">{data?.summary.total_approved_courses ?? 0}</span>
        </Card>
        <Card className="p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">TOTAL HADIR</span>
          <span className="text-2xl font-extrabold text-emerald-600">{data?.summary.total_hadir ?? 0}</span>
        </Card>
        <Card className="p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">TOTAL IZIN</span>
          <span className="text-2xl font-extrabold text-amber-600">{data?.summary.total_izin ?? 0}</span>
        </Card>
        <Card className="p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">TOTAL SAKIT</span>
          <span className="text-2xl font-extrabold text-orange-600">{data?.summary.total_sakit ?? 0}</span>
        </Card>
        <Card className="p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">TOTAL ALFA</span>
          <span className="text-2xl font-extrabold text-red-600">{data?.summary.total_alfa ?? 0}</span>
        </Card>
      </div>

      {/* Today's Schedule Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              📸 Presensi Sesi Pertemuan Hari Ini
            </CardTitle>
            <CardDescription className="text-xs">Sesi perkuliahan yang terjadwal untuk hari ini</CardDescription>
          </div>
          <Badge variant="secondary">Asia/Jakarta</Badge>
        </CardHeader>

        <CardContent>
          {data?.today_sessions.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
              Tidak ada sesi perkuliahan yang dijadwalkan untuk Anda hari ini.
            </div>
          ) : (
            <DataTable
              columns={todaySessionsColumns}
              data={data?.today_sessions || []}
              keyExtractor={(item) => item.id}
            />
          )}
        </CardContent>
      </Card>

      {/* Attendance Statistics per Course */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">📊 Rekapitulasi Kehadiran Per Mata Kuliah</CardTitle>
            <CardDescription className="text-xs">Statistik presensi Anda pada tiap mata kuliah yang diikuti</CardDescription>
          </div>
          <Link href="/mahasiswa/courses">
            <Button size="sm" variant="ghost">
              Lihat Semua Kelas &rarr;
            </Button>
          </Link>
        </CardHeader>

        <CardContent>
          {data?.courses.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">Anda belum terdaftar resmi di kelas manapun.</p>
          ) : (
            <DataTable
              columns={courseColumns}
              data={data?.courses || []}
              keyExtractor={(item) => item.id}
            />
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
