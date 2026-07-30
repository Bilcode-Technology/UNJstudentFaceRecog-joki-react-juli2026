'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';

interface StudentItem {
  id: number;
  name: string;
  email: string;
  nim: string | null;
  angkatan: string | null;
  is_active: boolean;
  courses_count: number;
}

export default function SuperadminStudentsPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = user?.roles?.some((r) => r.name === 'superadmin');

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/superadmin/students');
      const json = await res.json();
      if (res.ok && json.status === 'success') {
        setStudents(json.data || []);
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
        fetchStudents();
      } else {
        setLoading(false);
      }
    }
  }, [isLoading, isAuthenticated, isSuperAdmin]);

  if (isLoading || loading) {
    return (
      <AppShell role="superadmin" title="Monitoring Mahasiswa">
        <div className="p-8 text-center text-slate-500">Memuat monitoring mahasiswa...</div>
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
      header: 'Nama Mahasiswa',
      accessorKey: 'name',
      cell: (row: StudentItem) => (
        <div>
          <span className="font-bold text-slate-900 dark:text-slate-100">{row.name}</span>
          <span className="text-xs text-slate-400 block">ID #{row.id}</span>
        </div>
      ),
    },
    {
      header: 'Email',
      accessorKey: 'email',
      cell: (row: StudentItem) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
          {row.email}
        </span>
      ),
    },
    {
      header: 'NIM',
      accessorKey: 'nim',
      cell: (row: StudentItem) => (
        <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
          {row.nim || '-'}
        </span>
      ),
    },
    {
      header: 'Angkatan',
      accessorKey: 'angkatan',
      cell: (row: StudentItem) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {row.angkatan || '-'}
        </span>
      ),
    },
    {
      header: 'Kelas Diikuti',
      accessorKey: 'courses_count',
      cell: (row: StudentItem) => (
        <Badge variant="secondary">
          {row.courses_count} Kelas
        </Badge>
      ),
    },
    {
      header: 'Status Akun',
      accessorKey: 'is_active',
      cell: (row: StudentItem) => (
        <Badge variant={row.is_active ? 'success' : 'danger'}>
          {row.is_active ? 'Aktif' : 'Nonaktif'}
        </Badge>
      ),
    },
  ];

  return (
    <AppShell
      role="superadmin"
      title="Monitoring Mahasiswa (Read-Only)"
      breadcrumbs={[{ label: 'Monitoring Mahasiswa' }]}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Daftar Mahasiswa Terdaftar di Sistem</CardTitle>
          <Badge variant="outline">{students.length} Mahasiswa</Badge>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Belum ada mahasiswa yang terdaftar di dalam sistem.
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={students}
              keyExtractor={(item) => item.id}
            />
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
