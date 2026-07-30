'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DataTable } from '@/components/ui/DataTable';
import { Dialog } from '@/components/ui/Dialog';

interface Student {
  id: number;
  name: string;
  email: string;
  nim: string;
  angkatan: string;
  pivot: {
    status: 'pending' | 'approved' | 'rejected';
    joined_at: string | null;
  };
}

interface Session {
  id: number;
  meeting_type: 'online' | 'offline';
  room: string | null;
  meeting_date: string;
  start_time: string;
  end_time: string;
}

interface CourseDetail {
  id: number;
  name: string;
  code: string;
  join_code: string;
  is_archived: boolean;
  pending_students_count: number;
  approved_students_count: number;
  rejected_students_count: number;
  class_sessions: Session[];
}

export default function KormatCourseDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const courseId = params.id;
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [studentStatusFilter, setStudentStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [loading, setLoading] = useState(true);

  // Active Tab: 'students' | 'sessions'
  const [activeTab, setActiveTab] = useState<'students' | 'sessions'>('students');

  // Modal Create Session State
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    meeting_type: 'offline',
    room: 'Ruang 301',
    meeting_date: new Date().toISOString().split('T')[0],
    start_time: '08:00',
    end_time: '10:00',
  });
  const [sessionError, setSessionError] = useState('');
  const [sessionSuccess, setSessionSuccess] = useState('');
  const [submittingSession, setSubmittingSession] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resCourse, resStudents] = await Promise.all([
        fetch(`/api/courses/${courseId}`),
        fetch(`/api/courses/${courseId}/students`),
      ]);

      const dataCourse = await resCourse.json();
      const dataStudents = await resStudents.json();

      if (resCourse.ok && dataCourse.status === 'success') {
        setCourse(dataCourse.data);
      }
      if (resStudents.ok && dataStudents.status === 'success') {
        setStudents(dataStudents.data || []);
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
  }, [isLoading, courseId]);

  const handleApproveSingle = async (studentId: number) => {
    try {
      const res = await fetch(`/api/courses/${courseId}/students/${studentId}/approve`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        loadData();
      } else {
        alert(data.message || 'Gagal menyetujui');
      }
    } catch (err) {
      alert('Terjadi kesalahan');
    }
  };

  const handleRejectSingle = async (studentId: number) => {
    try {
      const res = await fetch(`/api/courses/${courseId}/students/${studentId}/reject`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        loadData();
      } else {
        alert(data.message || 'Gagal menolak');
      }
    } catch (err) {
      alert('Terjadi kesalahan');
    }
  };

  const handleBulkApprove = async () => {
    if (selectedStudents.length === 0) return;

    try {
      const res = await fetch(`/api/courses/${courseId}/students/bulk-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_ids: selectedStudents }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setSelectedStudents([]);
        loadData();
      } else {
        alert(data.message || 'Gagal memproses persetujuan masal');
      }
    } catch (err) {
      alert('Terjadi kesalahan');
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setSessionError('');
    setSessionSuccess('');
    setSubmittingSession(true);

    try {
      const res = await fetch(`/api/courses/${courseId}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionForm),
      });

      const data = await res.json();

      if (!res.ok || data.status !== 'success') {
        let errorMsg = data.message || 'Gagal membuat sesi';
        if (data.errors && typeof data.errors === 'object') {
          const fieldErrors = Object.values(data.errors).flat().filter(Boolean);
          if (fieldErrors.length > 0) {
            errorMsg = fieldErrors.join('. ');
          }
        }
        throw new Error(errorMsg);
      }

      setSessionSuccess('Sesi pertemuan berhasil dibuat!');
      setIsSessionModalOpen(false);
      loadData();
    } catch (err: any) {
      setSessionError(err?.message || 'Gagal membuat sesi');
    } finally {
      setSubmittingSession(false);
    }
  };

  const toggleSelectStudent = (id: number) => {
    if (selectedStudents.includes(id)) {
      setSelectedStudents(selectedStudents.filter((sid) => sid !== id));
    } else {
      setSelectedStudents([...selectedStudents, id]);
    }
  };

  if (loading || !course) {
    return (
      <AppShell role="kormat" title="Detail Kelas">
        <div className="p-8 text-center text-slate-500">Memuat detail kelas...</div>
      </AppShell>
    );
  }

  const filteredStudents = students.filter((s) => {
    if (studentStatusFilter === 'all') return true;
    return s.pivot?.status === studentStatusFilter;
  });

  const pendingCount = students.filter((s) => s.pivot?.status === 'pending').length;

  const studentColumns = [
    {
      header: (
        <span className="text-[10px] font-bold uppercase text-slate-400">Pilih</span>
      ),
      accessorKey: 'id',
      cell: (row: Student) =>
        row.pivot?.status === 'pending' ? (
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-slate-300 text-unj-teal focus:ring-unj-teal/50"
            checked={selectedStudents.includes(row.id)}
            onChange={() => toggleSelectStudent(row.id)}
          />
        ) : null,
    },
    {
      header: 'Mahasiswa',
      accessorKey: 'name',
      cell: (row: Student) => (
        <div>
          <span className="font-bold text-slate-900 dark:text-slate-100">{row.name}</span>
          <span className="text-xs text-slate-400 block">{row.email}</span>
        </div>
      ),
    },
    {
      header: 'NIM / Angkatan',
      accessorKey: 'nim',
      cell: (row: Student) => (
        <div>
          <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
            {row.nim || '-'}
          </span>
          <span className="text-[10px] text-slate-400 block">Thn: {row.angkatan || '-'}</span>
        </div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'pivot.status',
      cell: (row: Student) => (
        <Badge
          variant={
            row.pivot?.status === 'approved'
              ? 'success'
              : row.pivot?.status === 'pending'
              ? 'warning'
              : 'danger'
          }
        >
          {row.pivot?.status === 'approved'
            ? 'Disetujui'
            : row.pivot?.status === 'pending'
            ? 'Pending'
            : 'Ditolak'}
        </Badge>
      ),
    },
    {
      header: 'Aksi',
      accessorKey: 'id',
      cell: (row: Student) =>
        row.pivot?.status === 'pending' ? (
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="success"
              onClick={() => handleApproveSingle(row.id)}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => handleRejectSingle(row.id)}
            >
              Reject
            </Button>
          </div>
        ) : null,
    },
  ];

  const sessionColumns = [
    {
      header: 'Tipe Pertemuan',
      accessorKey: 'meeting_type',
      cell: (row: Session) => (
        <Badge variant={row.meeting_type === 'offline' ? 'outline' : 'secondary'}>
          {row.meeting_type === 'offline' ? `📍 Offline (${row.room})` : '💻 Online'}
        </Badge>
      ),
    },
    {
      header: 'Tanggal',
      accessorKey: 'meeting_date',
      cell: (row: Session) => (
        <span className="font-medium text-slate-800 dark:text-slate-200">
          {row.meeting_date}
        </span>
      ),
    },
    {
      header: 'Jam Pertemuan',
      accessorKey: 'start_time',
      cell: (row: Session) => (
        <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
          ⏰ {row.start_time} - {row.end_time} WIB
        </span>
      ),
    },
    {
      header: 'Aksi',
      accessorKey: 'id',
      cell: (row: Session) => (
        <Link href={`/kormat/sessions/${row.id}/attendance`}>
          <Button size="sm" variant="primary">
            Rekap & Override &rarr;
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <AppShell
      role="kormat"
      title={course.name}
      breadcrumbs={[
        { label: 'Kelola Kelas', href: '/kormat/courses' },
        { label: course.code },
      ]}
    >
      {/* Course Info Card Header */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase text-unj-teal bg-unj-teal/10 dark:bg-unj-teal/20 px-2 py-0.5 rounded">
                {course.code}
              </span>
              <Badge variant={course.is_archived ? 'warning' : 'success'}>
                {course.is_archived ? 'Diarsipkan' : 'Aktif'}
              </Badge>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {course.name}
            </h2>
            <p className="text-xs text-slate-500">
              Join Code Kelas:{' '}
              <code className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded font-mono font-bold text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700">
                {course.join_code}
              </code>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/kormat/courses/${courseId}/report`}>
              <Button variant="outline" size="md">
                📊 Laporan & Export PDF
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Metrics Subbar */}
        <div className="grid grid-cols-3 gap-4 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-center">
          <div>
            <span className="text-xs text-slate-400 block uppercase font-medium">Pending</span>
            <span className="text-lg font-bold text-amber-500">{course.pending_students_count} Mhs</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block uppercase font-medium">Approved</span>
            <span className="text-lg font-bold text-emerald-600">{course.approved_students_count} Mhs</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block uppercase font-medium">Rejected</span>
            <span className="text-lg font-bold text-red-500">{course.rejected_students_count} Mhs</span>
          </div>
        </div>
      </Card>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('students')}
          className={`py-3 px-6 border-b-2 font-bold text-sm transition-colors ${
            activeTab === 'students'
              ? 'border-unj-teal text-unj-teal dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          🎓 Daftar Mahasiswa ({students.length})
          {pendingCount > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-amber-500 text-slate-950 font-bold rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`py-3 px-6 border-b-2 font-bold text-sm transition-colors ${
            activeTab === 'sessions'
              ? 'border-unj-teal text-unj-teal dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          📅 Sesi Pertemuan ({course.class_sessions?.length || 0})
        </button>
      </div>

      {/* TAB 1: Mahasiswa Management */}
      {activeTab === 'students' && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CardTitle>Persetujuan & Daftar Mahasiswa</CardTitle>
              <div className="w-36">
                <Select
                  value={studentStatusFilter}
                  onChange={(e) => setStudentStatusFilter(e.target.value as any)}
                  options={[
                    { label: 'Semua Status', value: 'all' },
                    { label: 'Pending', value: 'pending' },
                    { label: 'Approved', value: 'approved' },
                    { label: 'Rejected', value: 'rejected' },
                  ]}
                />
              </div>
            </div>

            {pendingCount > 0 && (
              <Button
                variant="success"
                size="sm"
                disabled={selectedStudents.length === 0}
                onClick={handleBulkApprove}
              >
                Approve Masal ({selectedStudents.length})
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {filteredStudents.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">
                Tidak ada data mahasiswa dengan filter status ini.
              </p>
            ) : (
              <DataTable
                columns={studentColumns}
                data={filteredStudents}
                keyExtractor={(item) => item.id}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 2: Sessions Management */}
      {activeTab === 'sessions' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Daftar Sesi Pertemuan Perkuliahan</CardTitle>
            <Button variant="primary" size="sm" onClick={() => setIsSessionModalOpen(true)}>
              + Buat Sesi Baru
            </Button>
          </CardHeader>
          <CardContent>
            {!course.class_sessions || course.class_sessions.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                Belum ada sesi pertemuan yang dibuat untuk kelas ini.
              </div>
            ) : (
              <DataTable
                columns={sessionColumns}
                data={course.class_sessions}
                keyExtractor={(item) => item.id}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal Reusable: Buat Sesi Baru */}
      <Dialog
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        title="Buat Sesi Pertemuan Baru"
        description={`Mata Kuliah: ${course.name} (${course.code})`}
        maxWidth="lg"
      >
        {sessionError && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs rounded-xl border border-red-200 dark:border-red-800">
            {sessionError}
          </div>
        )}
        {sessionSuccess && (
          <div className="p-3 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 text-xs rounded-xl border border-green-200 dark:border-green-800">
            {sessionSuccess}
          </div>
        )}

        <form onSubmit={handleCreateSession} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Jenis Pertemuan"
              value={sessionForm.meeting_type}
              onChange={(e) =>
                setSessionForm({ ...sessionForm, meeting_type: e.target.value as any })
              }
              options={[
                { label: 'Offline (Luring)', value: 'offline' },
                { label: 'Online (Daring)', value: 'online' },
              ]}
            />

            {sessionForm.meeting_type === 'offline' && (
              <Input
                label="Ruang Kelas"
                required
                placeholder="Contoh: Ruang 301"
                value={sessionForm.room}
                onChange={(e) => setSessionForm({ ...sessionForm, room: e.target.value })}
              />
            )}
          </div>

          <Input
            label="Tanggal Pertemuan"
            type="date"
            required
            value={sessionForm.meeting_date}
            onChange={(e) => setSessionForm({ ...sessionForm, meeting_date: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Jam Mulai"
              type="time"
              required
              value={sessionForm.start_time}
              onChange={(e) => setSessionForm({ ...sessionForm, start_time: e.target.value })}
            />
            <Input
              label="Jam Selesai"
              type="time"
              required
              value={sessionForm.end_time}
              onChange={(e) => setSessionForm({ ...sessionForm, end_time: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsSessionModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={submittingSession}>
              Simpan Sesi Pertemuan
            </Button>
          </div>
        </form>
      </Dialog>
    </AppShell>
  );
}
