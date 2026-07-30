'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';

interface CourseItem {
  id: number;
  name: string;
  code: string;
  join_code: string;
  is_archived: boolean;
  students_count: number;
  class_sessions_count: number;
  kormat: {
    id: number;
    name: string;
    email: string;
  } | null;
}

export default function SuperadminCoursesPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = user?.roles?.some((r) => r.name === 'superadmin');

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/superadmin/courses');
      const json = await res.json();
      if (res.ok && json.status === 'success') {
        setCourses(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && isSuperAdmin) {
        fetchCourses();
      } else {
        setLoading(false);
      }
    }
  }, [isLoading, isAuthenticated, isSuperAdmin]);

  if (isLoading || loading) {
    return (
      <AppShell role="superadmin" title="Monitoring Kelas">
        <div className="p-8 text-center text-slate-500">Memuat monitoring kelas...</div>
      </AppShell>
    );
  }

  if (!user || !isSuperAdmin) {
    return (
      <AppShell role="superadmin" title="Akses Ditolak">
        <Card className="p-6 text-red-600">Akses Ditolak. Halaman ini khusus Superadmin.</Card>
      </AppShell>
    );
  }

  const columns = [
    {
      header: 'Mata Kuliah',
      accessorKey: 'name',
      cell: (row: CourseItem) => (
        <div>
          <span className="font-bold text-slate-900 dark:text-slate-100">{row.name}</span>
          <span className="text-xs text-slate-400 block">ID #{row.id}</span>
        </div>
      ),
    },
    {
      header: 'Kode / Join Code',
      accessorKey: 'code',
      cell: (row: CourseItem) => (
        <div>
          <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 block">
            {row.code}
          </span>
          <code className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
            {row.join_code}
          </code>
        </div>
      ),
    },
    {
      header: 'KORMAT Pemilik',
      accessorKey: 'kormat',
      cell: (row: CourseItem) => (
        <div>
          <span className="font-medium text-slate-800 dark:text-slate-200 block">
            {row.kormat?.name || 'Superadmin'}
          </span>
          <span className="text-xs text-slate-400 block">{row.kormat?.email || '-'}</span>
        </div>
      ),
    },
    {
      header: 'Mahasiswa Approved',
      accessorKey: 'students_count',
      cell: (row: CourseItem) => (
        <Badge variant="secondary">
          {row.students_count} Mhs
        </Badge>
      ),
    },
    {
      header: 'Total Sesi',
      accessorKey: 'class_sessions_count',
      cell: (row: CourseItem) => (
        <span className="font-semibold text-xs text-slate-700 dark:text-slate-300">
          {row.class_sessions_count} Sesi
        </span>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'is_archived',
      cell: (row: CourseItem) => (
        <Badge variant={row.is_archived ? 'warning' : 'success'}>
          {row.is_archived ? 'Diarsipkan' : 'Aktif'}
        </Badge>
      ),
    },
  ];

  return (
    <AppShell
      role="superadmin"
      title="Monitoring Kelas Perkuliahan (Read-Only)"
      breadcrumbs={[{ label: 'Monitoring Kelas' }]}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Daftar Seluruh Mata Kuliah di Sistem</CardTitle>
          <Badge variant="outline">{courses.length} Kelas</Badge>
        </CardHeader>
        <CardContent>
          {courses.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Belum ada mata kuliah di dalam sistem.
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={courses}
              keyExtractor={(item) => item.id}
            />
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
