'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { DataTable } from '@/components/ui/DataTable';

interface RecapItem {
  student_id: number;
  name: string;
  email: string;
  nim: string;
  angkatan: string;
  attendance_id: number | null;
  status: 'hadir' | 'izin' | 'sakit' | 'alfa' | 'belum_presensi';
  late_minutes: number | null;
  checked_in_at: string | null;
  latitude: number | null;
  longitude: number | null;
  is_manual_override: boolean;
  overridden_by: number | null;
}

interface SessionInfo {
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

export default function KormatAttendanceRecapPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const sessionId = params.id;
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [recap, setRecap] = useState<RecapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStudentId, setUpdatingStudentId] = useState<number | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resSess, resRecap] = await Promise.all([
        fetch(`/api/sessions/${sessionId}`),
        fetch(`/api/sessions/${sessionId}/attendance`),
      ]);

      const dataSess = await resSess.json();
      const dataRecap = await resRecap.json();

      if (resSess.ok && dataSess.status === 'success') {
        setSession(dataSess.data);
      }
      if (resRecap.ok && dataRecap.status === 'success') {
        setRecap(dataRecap.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      loadData();
    }
  }, [isLoading, sessionId]);

  const handleOverride = async (studentId: number, newStatus: string) => {
    setUpdatingStudentId(studentId);

    // Optimistic local state update
    setRecap((prev) =>
      prev.map((item) =>
        item.student_id === studentId
          ? { ...item, status: newStatus as any, is_manual_override: true }
          : item
      )
    );

    try {
      const res = await fetch(`/api/sessions/${sessionId}/attendance/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok || data.status !== 'success') {
        alert(data.message || 'Gagal melakukan override presensi');
        loadData(); // Revert on failure
      }
    } catch (err) {
      alert('Terjadi kesalahan');
      loadData(); // Revert on failure
    } finally {
      setUpdatingStudentId(null);
    }
  };

  if (loading || !session) {
    return (
      <AppShell role="kormat" title="Rekap Presensi">
        <div className="p-8 text-center text-slate-500">Memuat rekap presensi...</div>
      </AppShell>
    );
  }

  const columns = [
    {
      header: 'Mahasiswa',
      accessorKey: 'name',
      cell: (row: RecapItem) => (
        <div>
          <span className="font-bold text-slate-900 dark:text-slate-100">{row.name}</span>
          <span className="text-xs text-slate-400 block">{row.email}</span>
        </div>
      ),
    },
    {
      header: 'NIM',
      accessorKey: 'nim',
      cell: (row: RecapItem) => (
        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
          {row.nim || '-'}
        </span>
      ),
    },
    {
      header: 'Waktu / Keterlambatan',
      accessorKey: 'checked_in_at',
      cell: (row: RecapItem) => (
        <div className="text-xs">
          {row.checked_in_at ? (
            <div>
              <span className="font-medium text-slate-700 dark:text-slate-300 block">
                {row.checked_in_at}
              </span>
              {row.late_minutes !== null && (
                <span className="font-bold text-amber-600">
                  {row.late_minutes === 0 ? 'Tepat Waktu' : `Late +${row.late_minutes} min`}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400">-</span>
          )}
        </div>
      ),
    },
    {
      header: 'Lokasi (GPS)',
      accessorKey: 'latitude',
      cell: (row: RecapItem) => (
        <div className="text-xs">
          {row.latitude && row.longitude ? (
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              📍 Terdeteksi
            </span>
          ) : (
            <span className="text-slate-400">-</span>
          )}
        </div>
      ),
    },
    {
      header: 'Status Presensi',
      accessorKey: 'status',
      cell: (row: RecapItem) => (
        <div className="flex flex-col gap-1">
          <Badge
            variant={
              row.status === 'hadir'
                ? 'success'
                : row.status === 'izin' || row.status === 'sakit'
                ? 'warning'
                : row.status === 'alfa'
                ? 'danger'
                : 'neutral'
            }
          >
            {row.status === 'belum_presensi' ? 'Belum Presensi' : row.status.toUpperCase()}
          </Badge>
          {row.is_manual_override && (
            <span className="text-[10px] font-semibold text-unj-teal dark:text-teal-400">
              (Override Manual)
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Override Status (KORMAT)',
      accessorKey: 'student_id',
      cell: (row: RecapItem) => (
        <div className="w-40 ml-auto">
          <Select
            size="sm"
            disabled={updatingStudentId === row.student_id}
            value={row.status}
            onChange={(e) => handleOverride(row.student_id, e.target.value)}
            options={[
              { label: 'Belum Presensi', value: 'belum_presensi', disabled: true },
              { label: 'Set HADIR', value: 'hadir' },
              { label: 'Set IZIN', value: 'izin' },
              { label: 'Set SAKIT', value: 'sakit' },
              { label: 'Set ALFA', value: 'alfa' },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <AppShell
      role="kormat"
      title="Rekap & Override Presensi"
      breadcrumbs={[
        { label: 'Kelola Kelas', href: '/kormat/courses' },
        { label: session.course.code, href: `/kormat/courses/${session.course.id}` },
        { label: `Sesi ${session.meeting_date}` },
      ]}
    >
      {/* Session Header Card */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase text-unj-teal bg-unj-teal/10 dark:bg-unj-teal/20 px-2 py-0.5 rounded">
                {session.course.code}
              </span>
              <Badge variant={session.meeting_type === 'offline' ? 'outline' : 'secondary'}>
                {session.meeting_type === 'offline' ? `📍 Ruang: ${session.room}` : '💻 Online'}
              </Badge>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {session.course.name}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              📅 Tanggal Sesi: {session.meeting_date} (⏰ {session.start_time} - {session.end_time} WIB)
            </p>
          </div>

          <Link href={`/kormat/courses/${session.course.id}`}>
            <span className="text-xs font-semibold text-unj-teal hover:underline">
              &larr; Detail Kelas
            </span>
          </Link>
        </div>
      </Card>

      {/* Main Table Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Daftar Rekapitulasi Presensi Mahasiswa</CardTitle>
          <Badge variant="outline">{recap.length} Mahasiswa</Badge>
        </CardHeader>
        <CardContent>
          {recap.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              Belum ada mahasiswa terdaftar di kelas ini.
            </p>
          ) : (
            <DataTable
              columns={columns}
              data={recap}
              keyExtractor={(item) => item.student_id}
            />
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
