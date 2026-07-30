'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DataTable } from '@/components/ui/DataTable';
import { Dialog } from '@/components/ui/Dialog';

interface KormatUser {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  courses_count: number;
  created_at: string;
}

export default function KormatManagementPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  const [kormatList, setKormatList] = useState<KormatUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals state using reusable Dialog
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // Form states
  const [selectedKormat, setSelectedKormat] = useState<KormatUser | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', password_confirmation: '' });
  const [submitting, setSubmitting] = useState(false);

  const isSuperAdmin = user?.roles?.some((r) => r.name === 'superadmin');

  const fetchKormatList = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch('/api/superadmin/kormat');
      const json = await res.json();
      if (res.ok && json.status === 'success') {
        setKormatList(json.data || []);
      } else {
        setErrorMsg(json.message || 'Gagal mengambil daftar KORMAT');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Terjadi kesalahan jaringan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && isSuperAdmin) {
        fetchKormatList();
      } else {
        setLoading(false);
      }
    }
  }, [isLoading, isAuthenticated, isSuperAdmin]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      setErrorMsg(null);
      const res = await fetch('/api/superadmin/kormat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const json = await res.json();
      if (res.ok && json.status === 'success') {
        setSuccessMsg('Akun KORMAT berhasil dibuat');
        setShowAddModal(false);
        setFormData({ name: '', email: '', password: '', password_confirmation: '' });
        fetchKormatList();
      } else {
        setErrorMsg(json.message || 'Gagal membuat akun KORMAT');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Terjadi kesalahan saat membuat KORMAT');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKormat) return;
    setSubmitting(true);

    try {
      setErrorMsg(null);
      const res = await fetch(`/api/superadmin/kormat/${selectedKormat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
        }),
      });

      const json = await res.json();
      if (res.ok && json.status === 'success') {
        setSuccessMsg('Data KORMAT berhasil diperbarui');
        setShowEditModal(false);
        setSelectedKormat(null);
        fetchKormatList();
      } else {
        setErrorMsg(json.message || 'Gagal memperbarui KORMAT');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Terjadi kesalahan saat memperbarui KORMAT');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (kormat: KormatUser) => {
    try {
      setErrorMsg(null);
      const targetState = !kormat.is_active;
      const res = await fetch(`/api/superadmin/kormat/${kormat.id}/deactivate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: targetState }),
      });

      const json = await res.json();
      if (res.ok && json.status === 'success') {
        setSuccessMsg(`Akun KORMAT berhasil ${targetState ? 'diaktifkan' : 'dinonaktifkan'}`);
        fetchKormatList();
      } else {
        setErrorMsg(json.message || 'Gagal mengubah status akun KORMAT');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Terjadi kesalahan jaringan');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKormat) return;

    if (formData.password !== formData.password_confirmation) {
      setErrorMsg('Konfirmasi password tidak cocok');
      return;
    }

    setSubmitting(true);
    try {
      setErrorMsg(null);
      const res = await fetch(`/api/superadmin/kormat/${selectedKormat.id}/reset-password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: formData.password,
          password_confirmation: formData.password_confirmation,
        }),
      });

      const json = await res.json();
      if (res.ok && json.status === 'success') {
        setSuccessMsg('Password KORMAT berhasil diperbarui');
        setShowResetModal(false);
        setSelectedKormat(null);
        setFormData({ name: '', email: '', password: '', password_confirmation: '' });
      } else {
        setErrorMsg(json.message || 'Gagal mereset password KORMAT');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Terjadi kesalahan saat mereset password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (kormat: KormatUser) => {
    if (kormat.courses_count > 0) return;

    if (!confirm(`Apakah Anda yakin ingin menghapus akun ${kormat.name}?`)) return;

    try {
      setErrorMsg(null);
      const res = await fetch(`/api/superadmin/kormat/${kormat.id}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (res.ok && json.status === 'success') {
        setSuccessMsg('Akun KORMAT berhasil dihapus');
        fetchKormatList();
      } else {
        setErrorMsg(json.message || 'Gagal menghapus KORMAT');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Terjadi kesalahan saat menghapus KORMAT');
    }
  };

  if (isLoading || loading) {
    return (
      <AppShell role="superadmin" title="Kelola KORMAT">
        <div className="p-8 text-center text-slate-500">Memuat manajemen KORMAT...</div>
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
      header: 'Nama Lengkap',
      accessorKey: 'name',
      cell: (row: KormatUser) => (
        <div>
          <span className="font-bold text-slate-900 dark:text-slate-100">{row.name}</span>
          <span className="text-xs text-slate-400 block">ID #{row.id}</span>
        </div>
      ),
    },
    {
      header: 'Email',
      accessorKey: 'email',
      cell: (row: KormatUser) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
          {row.email}
        </span>
      ),
    },
    {
      header: 'Kelas Managed',
      accessorKey: 'courses_count',
      cell: (row: KormatUser) => (
        <Badge variant="secondary">
          {row.courses_count} Kelas
        </Badge>
      ),
    },
    {
      header: 'Status Akun',
      accessorKey: 'is_active',
      cell: (row: KormatUser) => (
        <Badge variant={row.is_active ? 'success' : 'danger'}>
          {row.is_active ? 'Aktif' : 'Nonaktif'}
        </Badge>
      ),
    },
    {
      header: 'Aksi',
      accessorKey: 'id',
      cell: (row: KormatUser) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedKormat(row);
              setFormData({ ...formData, name: row.name, email: row.email });
              setShowEditModal(true);
            }}
          >
            Edit
          </Button>

          <Button
            size="sm"
            variant={row.is_active ? 'warning' : 'success'}
            onClick={() => handleToggleActive(row)}
          >
            {row.is_active ? 'Nonaktifkan' : 'Aktifkan'}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSelectedKormat(row);
              setFormData({ name: '', email: '', password: '', password_confirmation: '' });
              setShowResetModal(true);
            }}
          >
            Reset Pass
          </Button>

          <div className="relative group inline-block">
            <Button
              size="sm"
              variant="danger"
              disabled={row.courses_count > 0}
              onClick={() => handleDelete(row)}
            >
              Hapus
            </Button>
            {row.courses_count > 0 && (
              <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-lg z-20 pointer-events-none">
                ⚠️ KORMAT masih mengelola {row.courses_count} kelas. Hapus/pindahkan kelas terlebih dahulu.
              </div>
            )}
          </div>
        </div>
      ),
    },
  ];

  return (
    <AppShell
      role="superadmin"
      title="Manajemen Akun KORMAT"
      breadcrumbs={[{ label: 'Kelola KORMAT' }]}
    >
      {/* Top Banner Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
            Daftar Akun Koordinator Matkul
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Kelola hak akses KORMAT, aktivasi akun, dan reset kredensial.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => {
            setFormData({ name: '', email: '', password: '', password_confirmation: '' });
            setShowAddModal(true);
          }}
        >
          + Tambah KORMAT Baru
        </Button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-xl">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-xs rounded-xl">
          {successMsg}
        </div>
      )}

      {/* Main Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Daftar Pengguna Role KORMAT</CardTitle>
          <Badge variant="outline">{kormatList.length} Akun</Badge>
        </CardHeader>
        <CardContent>
          {kormatList.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Belum ada akun KORMAT terdaftar.
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={kormatList}
              keyExtractor={(item) => item.id}
            />
          )}
        </CardContent>
      </Card>

      {/* Modal 1: Tambah KORMAT */}
      <Dialog
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Tambah Akun KORMAT Baru"
        description="Masukkan nama, email resmi, dan password awal untuk KORMAT baru."
        maxWidth="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Nama Lengkap KORMAT"
            required
            placeholder="Contoh: KORMAT Pemrograman Web"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Email Official"
            type="email"
            required
            placeholder="kormat@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label="Password Awal"
            type="password"
            required
            minLength={8}
            placeholder="Minimal 8 karakter"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowAddModal(false)}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              Simpan Akun KORMAT
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal 2: Edit KORMAT */}
      <Dialog
        isOpen={showEditModal && !!selectedKormat}
        onClose={() => {
          setShowEditModal(false);
          setSelectedKormat(null);
        }}
        title="Edit Data KORMAT"
        description={`Mengubah informasi akun ID #${selectedKormat?.id}`}
        maxWidth="md"
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <Input
            label="Nama Lengkap KORMAT"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Email Official"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowEditModal(false);
                setSelectedKormat(null);
              }}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal 3: Reset Password */}
      <Dialog
        isOpen={showResetModal && !!selectedKormat}
        onClose={() => {
          setShowResetModal(false);
          setSelectedKormat(null);
        }}
        title={`Reset Password — ${selectedKormat?.name}`}
        description="Masukkan password baru untuk pengguna KORMAT ini."
        maxWidth="md"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <Input
            label="Password Baru"
            type="password"
            required
            minLength={8}
            placeholder="Minimal 8 karakter"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
          <Input
            label="Konfirmasi Password Baru"
            type="password"
            required
            minLength={8}
            placeholder="Ulangi password baru"
            value={formData.password_confirmation}
            onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowResetModal(false);
                setSelectedKormat(null);
              }}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              Reset Password Now
            </Button>
          </div>
        </form>
      </Dialog>
    </AppShell>
  );
}
