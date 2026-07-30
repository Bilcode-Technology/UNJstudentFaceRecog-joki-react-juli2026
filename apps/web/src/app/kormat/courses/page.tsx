'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DataTable } from '@/components/ui/DataTable';
import { Dialog } from '@/components/ui/Dialog';

interface Course {
  id: number;
  name: string;
  code: string;
  join_code: string;
  is_archived: boolean;
  approved_students_count?: number;
}

export default function KormatCoursesPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [archivedFilter, setArchivedFilter] = useState(false);

  // Modal Create Course State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [form, setForm] = useState({ name: '', code: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirm Dialog State
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Archive Confirm Dialog State
  const [archiveTarget, setArchiveTarget] = useState<{ id: number; name: string; currentStatus: boolean } | null>(null);
  const [archiving, setArchiving] = useState(false);

  const isKormat = user?.roles?.some((r) => r.name === 'kormat' || r.name === 'superadmin');

  const fetchCourses = async () => {
    try {
      setLoadingCourses(true);
      const res = await fetch(`/api/courses?archived=${archivedFilter}`);
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setCourses(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCourses(false);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && isKormat) {
        fetchCourses();
      } else {
        setLoadingCourses(false);
      }
    }
  }, [isLoading, isAuthenticated, isKormat, archivedFilter]);

  const handleOpenCreateModal = () => {
    setError('');
    setSuccess('');
    setForm({ name: '', code: '' });
    setIsConfirming(false);
    setIsModalOpen(true);
  };

  const handleStepConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) return;
    setError('');
    setIsConfirming(true);
  };

  const handleExecuteCreate = async () => {
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok || data.status !== 'success') {
        let errorMsg = data.message || 'Gagal membuat kelas';
        if (data.errors && typeof data.errors === 'object') {
          const fieldErrors = Object.values(data.errors).flat().filter(Boolean);
          if (fieldErrors.length > 0) {
            errorMsg = fieldErrors.join('. ');
          }
        }
        throw new Error(errorMsg);
      }

      setSuccess('Kelas berhasil dibuat!');
      setIsModalOpen(false);
      setIsConfirming(false);
      setForm({ name: '', code: '' });
      fetchCourses();
    } catch (err: any) {
      setError(err?.message || 'Gagal membuat kelas');
      setIsConfirming(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleArchive = async (courseId: number, name: string, currentStatus: boolean) => {
    setArchiveTarget({ id: courseId, name, currentStatus });
  };

  const executeToggleArchive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      const res = await fetch(`/api/courses/${archiveTarget.id}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: !archiveTarget.currentStatus }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setArchiveTarget(null);
        fetchCourses();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setArchiving(false);
    }
  };

  const handleDelete = (courseId: number, name: string) => {
    setDeleteError('');
    setDeleteTarget({ id: courseId, name });
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/courses/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setDeleteTarget(null);
        fetchCourses();
      } else {
        setDeleteError(data.message || 'Kelas tidak dapat dihapus.');
      }
    } catch (err) {
      setDeleteError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading || loadingCourses) {
    return (
      <AppShell role="kormat" title="Kelola Kelas">
        <div className="p-8 text-center text-slate-500">Memuat data kelas...</div>
      </AppShell>
    );
  }

  if (!isKormat) {
    return (
      <AppShell role="kormat" title="Akses Ditolak">
        <Card className="p-6 text-red-600">Akses Ditolak. Halaman ini hanya untuk KORMAT / Superadmin.</Card>
      </AppShell>
    );
  }

  const columns = [
    {
      header: 'Nama Mata Kuliah',
      accessorKey: 'name',
      cell: (row: Course) => (
        <div>
          <Link
            href={`/kormat/courses/${row.id}`}
            className="font-bold text-unj-teal dark:text-teal-400 hover:underline"
          >
            {row.name}
          </Link>
          <span className="text-xs text-slate-400 block">ID #{row.id}</span>
        </div>
      ),
    },
    {
      header: 'Kode',
      accessorKey: 'code',
      cell: (row: Course) => (
        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
          {row.code}
        </span>
      ),
    },
    {
      header: 'Join Code',
      accessorKey: 'join_code',
      cell: (row: Course) => (
        <code className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold px-2 py-1 rounded text-xs">
          {row.join_code}
        </code>
      ),
    },
    {
      header: 'Mahasiswa Approved',
      accessorKey: 'approved_students_count',
      cell: (row: Course) => (
        <Badge variant="secondary">
          {row.approved_students_count ?? 0} Mhs
        </Badge>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'is_archived',
      cell: (row: Course) => (
        <Badge variant={row.is_archived ? 'warning' : 'success'}>
          {row.is_archived ? 'Diarsipkan' : 'Aktif'}
        </Badge>
      ),
    },
    {
      header: 'Aksi',
      accessorKey: 'id',
      cell: (row: Course) => (
        <div className="flex items-center justify-end gap-2">
          <Link href={`/kormat/courses/${row.id}`}>
            <Button size="sm" variant="primary">
              Detail & Sesi
            </Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleToggleArchive(row.id, row.name, row.is_archived)}
          >
            {row.is_archived ? 'Aktifkan' : 'Arsipkan'}
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDelete(row.id, row.name)}
          >
            Hapus
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell
      role="kormat"
      title="Kelola Kelas Perkuliahan"
      breadcrumbs={[{ label: 'Kelola Kelas' }]}
    >
      {/* Top Banner & Main Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
            Daftar Mata Kuliah KORMAT
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Kelola kelas perkuliahan, kode bergabung, dan pendaftaran mahasiswa.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={() => setArchivedFilter(!archivedFilter)}
          >
            {archivedFilter ? '📂 Tampilkan Kelas Aktif' : '📦 Tampilkan Kelas Diarsipkan'}
          </Button>
          <Button variant="primary" size="md" onClick={handleOpenCreateModal}>
            + Buat Kelas Baru
          </Button>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 text-sm rounded-xl">
          {success}
        </div>
      )}

      {/* Main DataTable */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {archivedFilter ? 'Daftar Kelas Diarsipkan' : 'Daftar Kelas Aktif'}
          </CardTitle>
          <Badge variant="outline">{courses.length} Kelas</Badge>
        </CardHeader>
        <CardContent>
          {courses.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Belum ada kelas yang {archivedFilter ? 'diarsipkan' : 'aktif'}.
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

      {/* Modal Reusable: Buat Kelas Baru (dengan Konfirmasi Eksplisit) */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Buat Kelas Baru"
        description="Isi nama dan kode mata kuliah. Data kelas bersifat permanen."
        maxWidth="md"
      >
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs rounded-xl border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {!isConfirming ? (
          <form onSubmit={handleStepConfirm} className="space-y-4">
            <Input
              label="Nama Mata Kuliah"
              required
              placeholder="Contoh: Pemrograman Web Lanjut"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              label="Kode Mata Kuliah"
              required
              placeholder="Contoh: CS101"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
              ⚠️ <strong>Perhatian:</strong> Sesuai aturan sistem, nama dan kode kelas tidak dapat diubah kembali setelah kelas dibuat. Join Code akan otomatis di-generate 6 karakter unik.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" variant="primary">
                Lanjut Konfirmasi &rarr;
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-unj-teal/5 dark:bg-unj-teal/10 border border-unj-teal/20 dark:border-unj-teal/30 rounded-xl text-xs text-unj-teal-dark dark:text-teal-300 space-y-2">
              <h4 className="font-bold text-sm">Konfirmasi Pembuatan Kelas:</h4>
              <div>
                <span className="text-slate-500">Nama Kelas:</span>{' '}
                <strong className="text-slate-900 dark:text-slate-100">{form.name}</strong>
              </div>
              <div>
                <span className="text-slate-500">Kode Kelas:</span>{' '}
                <strong className="text-slate-900 dark:text-slate-100">{form.code}</strong>
              </div>
              <p className="pt-2 text-[11px] text-slate-500 border-t border-unj-teal/20 dark:border-unj-teal/30">
                Apakah Anda yakin data di atas sudah benar?
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                disabled={submitting}
                onClick={() => setIsConfirming(false)}
              >
                &larr; Kembali Edit
              </Button>
              <Button
                type="button"
                variant="primary"
                isLoading={submitting}
                onClick={handleExecuteCreate}
              >
                Ya, Buat Kelas Sekarang
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={!!deleteTarget}
        onClose={() => { if (!deleting) { setDeleteTarget(null); setDeleteError(''); } }}
        title="Hapus Kelas"
        description={`Apakah Anda yakin ingin menghapus kelas "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        maxWidth="sm"
      >
        {deleteError && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-unj-red text-xs rounded-xl border border-unj-red/20">
            {deleteError}
          </div>
        )}
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-unj-red/20 rounded-xl text-xs text-red-800 dark:text-red-300">
          ⚠️ <strong>Peringatan:</strong> Kelas yang sudah memiliki sesi pertemuan tidak dapat dihapus.
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            disabled={deleting}
            onClick={() => { setDeleteTarget(null); setDeleteError(''); }}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={deleting}
            onClick={executeDelete}
          >
            Ya, Hapus Kelas
          </Button>
        </div>
      </Dialog>

      {/* Archive/Unarchive Confirmation Dialog */}
      <Dialog
        isOpen={!!archiveTarget}
        onClose={() => { if (!archiving) setArchiveTarget(null); }}
        title={archiveTarget?.currentStatus ? 'Aktifkan Kelas' : 'Arsipkan Kelas'}
        description={`Kelas "${archiveTarget?.name}" akan ${archiveTarget?.currentStatus ? 'diaktifkan kembali' : 'diarsipkan'}.`}
        maxWidth="sm"
      >
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            disabled={archiving}
            onClick={() => setArchiveTarget(null)}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={archiving}
            onClick={executeToggleArchive}
          >
            {archiveTarget?.currentStatus ? 'Ya, Aktifkan' : 'Ya, Arsipkan'}
          </Button>
        </div>
      </Dialog>
    </AppShell>
  );
}
