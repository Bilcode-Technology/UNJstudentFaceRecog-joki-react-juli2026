'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotification } from '@/hooks/usePushNotification';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';

interface CourseSummary {
  id: number;
  name: string;
  code: string;
  join_code: string;
  approved_students_count: number;
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

interface KormatDashboardData {
  summary: {
    total_active_courses: number;
    total_archived_courses: number;
    total_approved_students: number;
  };
  courses: CourseSummary[];
  today_sessions: TodaySession[];
}

export default function KormatDashboardPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const { subscribeToPush } = usePushNotification();

  const [data, setData] = useState<KormatDashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  const isKormat = user?.roles?.some((r) => r.name === 'kormat' || r.name === 'superadmin');

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && isKormat) {
        fetchDashboardData();
        subscribeToPush();
      } else {
        setLoadingDashboard(false);
      }
    }
  }, [isLoading, isAuthenticated, isKormat]);

  const fetchDashboardData = async () => {
    try {
      setLoadingDashboard(true);
      const res = await fetch('/api/dashboard/kormat');
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

  if (isLoading || loadingDashboard) {
    return (
      <AppShell role="kormat" title="Dashboard KORMAT">
        <div className="p-8 text-center text-slate-500">Memuat dashboard KORMAT...</div>
      </AppShell>
    );
  }

  if (!user || !isKormat) {
    return (
      <AppShell role="kormat" title="Akses Ditolak">
        <Card className="p-6 text-red-600">Akses Ditolak. Halaman ini khusus untuk KORMAT / Superadmin.</Card>
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
          <span className="text-xs text-unj-teal block font-mono font-semibold">{row.course.code}</span>
        </div>
      ),
    },
    {
      header: 'Waktu Pertemuan',
      accessorKey: 'start_time',
      cell: (row: TodaySession) => (
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
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
      header: 'Aksi',
      accessorKey: 'id',
      cell: (row: TodaySession) => (
        <Link href={`/kormat/sessions/${row.id}/attendance`}>
          <Button size="sm" variant="primary">
            Rekap & Override &rarr;
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <AppShell role="kormat" title="Dashboard KORMAT">
      {/* Top Banner Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
            Selamat Datang, {user.name} 👋
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Ringkasan statistik kelas dan jadwal presensi hari ini.
          </p>
        </div>
        <Link href="/kormat/courses">
          <Button variant="primary" size="md">
            + Kelola Kelas Baru
          </Button>
        </Link>
      </div>

      {/* Grid Metrik 4 Kolom (Desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-400">Kelas Aktif</span>
          <div className="text-3xl font-extrabold text-unj-teal">{data?.summary.total_active_courses ?? 0}</div>
          <span className="text-xs text-slate-500">Mata kuliah aktif</span>
        </Card>

        <Card className="p-5 space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-400">Total Mahasiswa</span>
          <div className="text-3xl font-extrabold text-emerald-600">{data?.summary.total_approved_students ?? 0}</div>
          <span className="text-xs text-slate-500">Terdaftar resmi</span>
        </Card>

        <Card className="p-5 space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-400">Sesi Hari Ini</span>
          <div className="text-3xl font-extrabold text-amber-500">{data?.today_sessions.length ?? 0}</div>
          <span className="text-xs text-slate-500">Jadwal perkuliahan</span>
        </Card>

        <Card className="p-5 space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-400">Kelas Diarsipkan</span>
          <div className="text-3xl font-extrabold text-slate-400">{data?.summary.total_archived_courses ?? 0}</div>
          <span className="text-xs text-slate-500">Arsip semester lalu</span>
        </Card>
      </div>

      {/* Widget Jadwal Hari Ini (DataTable Data-Dense) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>📅 Sesi Pertemuan Hari Ini (Asia/Jakarta)</CardTitle>
          <Badge variant="outline">{data?.today_sessions.length ?? 0} Sesi</Badge>
        </CardHeader>
        <CardContent>
          {data?.today_sessions.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              Tidak ada sesi perkuliahan yang dijadwalkan untuk hari ini.
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

      {/* Managed Courses Grid */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>📚 Daftar Kelas Aktif & Akses Laporan</CardTitle>
          <Link href="/kormat/courses">
            <Button size="sm" variant="ghost">
              Lihat Semua &rarr;
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {data?.courses.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">Belum ada kelas aktif.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data?.courses.map((course) => (
                <div
                  key={course.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 hover:border-unj-teal/30 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-mono font-bold text-unj-teal uppercase">
                        {course.code}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {course.name}
                      </h3>
                    </div>
                    <Badge variant="secondary">
                      {course.approved_students_count} Mhs
                    </Badge>
                  </div>

                  <div className="text-xs text-slate-500">
                    Join Code:{' '}
                    <code className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-slate-100">
                      {course.join_code}
                    </code>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <Link href={`/kormat/courses/${course.id}/report`}>
                      <Button size="sm" variant="outline">
                        📊 Laporan & Export
                      </Button>
                    </Link>
                    <Link href={`/kormat/courses/${course.id}`}>
                      <Button size="sm" variant="primary">
                        Detail & Sesi &rarr;
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
