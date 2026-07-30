'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

interface Course {
  id: number;
  name: string;
  code: string;
  kormat?: { name: string; email: string };
  students?: Array<{ pivot: { status: 'pending' | 'approved' } }>;
}

export default function MahasiswaCoursesPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<'available' | 'joined'>('joined');
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [joinedCourses, setJoinedCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [joining, setJoining] = useState(false);

  const isStudent = user?.roles?.some((r) => r.name === 'mahasiswa');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchCourses = async () => {
    try {
      setLoadingCourses(true);
      const [resAvail, resJoined] = await Promise.all([
        fetch('/api/courses/available'),
        fetch('/api/courses/joined'),
      ]);

      const dataAvail = await resAvail.json();
      const dataJoined = await resJoined.json();

      if (resAvail.ok && dataAvail.status === 'success') {
        setAvailableCourses(dataAvail.data || []);
      }
      if (resJoined.ok && dataJoined.status === 'success') {
        setJoinedCourses(dataJoined.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCourses(false);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && isStudent) {
        fetchCourses();
      } else {
        setLoadingCourses(false);
      }
    }
  }, [isLoading, isAuthenticated, isStudent]);

  const handleJoin = async (codeToSubmit: string) => {
    setError('');
    setSuccess('');
    setJoining(true);

    try {
      const res = await fetch('/api/courses/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ join_code: codeToSubmit }),
      });

      const data = await res.json();

      if (!res.ok || data.status !== 'success') {
        let errorMsg = data.message || 'Gagal mengajukan join kelas';
        if (data.errors && typeof data.errors === 'object') {
          const fieldErrors = Object.values(data.errors).flat().filter(Boolean);
          if (fieldErrors.length > 0) {
            errorMsg = fieldErrors.join('. ');
          }
        }
        throw new Error(errorMsg);
      }

      setSuccess('Pengajuan bergabung kelas berhasil dikirim! Menunggu persetujuan KORMAT.');
      setJoinCodeInput('');
      fetchCourses();
      setActiveTab('joined');
    } catch (err: any) {
      setError(err?.message || 'Gagal mengajukan join kelas');
    } finally {
      setJoining(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    handleJoin(joinCodeInput.trim());
  };

  if (isLoading || loadingCourses) {
    return (
      <AppShell role="mahasiswa" title="Mata Kuliah Saya">
        <div className="p-8 text-center text-slate-500">Memuat data kelas...</div>
      </AppShell>
    );
  }

  if (!isStudent) {
    return (
      <AppShell role="mahasiswa" title="Akses Ditolak">
        <Card className="p-6 text-unj-red font-semibold">Akses Ditolak. Halaman ini khusus untuk Mahasiswa.</Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      role="mahasiswa"
      title="Mata Kuliah Saya"
      breadcrumbs={[{ label: 'Mata Kuliah Saya' }]}
    >
      <div className="space-y-5">
        <Card>
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold font-heading text-ink">Mata Kuliah Saya</CardTitle>
            <CardDescription>Bergabung dengan kelas kuliah menggunakan Kode Join dari KORMAT</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-0">
            {/* Join Form */}
            <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-2 items-end">
              <div className="flex-1 w-full">
                <Input
                  type="text"
                  required
                  placeholder="Masukkan Kode Join (misal: ABC123)"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  className="uppercase font-mono tracking-wider font-bold"
                />
              </div>
              <Button type="submit" variant="primary" loading={joining} className="w-full sm:w-auto whitespace-nowrap">
                Gabung Kelas
              </Button>
            </form>

            {error && (
              <div className="bg-red-50 text-unj-red p-3 rounded-xl text-xs font-medium border border-unj-red/20">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-unj-teal/10 text-unj-teal p-3 rounded-xl text-xs font-semibold border border-unj-teal/20">
                {success}
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex border-b border-line pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('joined')}
                className={`py-2.5 px-4 font-semibold text-xs transition-colors border-b-2 -mb-px ${
                  activeTab === 'joined'
                    ? 'border-unj-teal text-unj-teal font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Kelas Diikuti ({joinedCourses.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('available')}
                className={`py-2.5 px-4 font-semibold text-xs transition-colors border-b-2 -mb-px ${
                  activeTab === 'available'
                    ? 'border-unj-teal text-unj-teal font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Kelas Tersedia ({availableCourses.length})
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Tab Content */}
        {activeTab === 'joined' ? (
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base">Daftar Kelas Diikuti / Pengajuan Pending</CardTitle>
            </CardHeader>
            <CardContent className="pt-2 space-y-3">
              {joinedCourses.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">Anda belum mengikuti atau mengajukan kelas apapun.</p>
              ) : (
                joinedCourses.map((c) => {
                  const status = c.students?.[0]?.pivot?.status;
                  return (
                    <div
                      key={c.id}
                      className="p-4 rounded-xl border border-line bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-shadow hover:shadow-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-unj-teal bg-unj-teal/10 px-2 py-0.5 rounded-md">
                          {c.code}
                        </span>
                        <h3 className="text-base font-bold text-ink pt-1">
                          {status === 'approved' ? (
                            <a href={`/mahasiswa/courses/${c.id}`} className="hover:underline text-unj-teal">
                              {c.name}
                            </a>
                          ) : (
                            c.name
                          )}
                        </h3>
                        <p className="text-xs text-slate-500">Dosen / KORMAT: {c.kormat?.name || '-'}</p>
                      </div>
                      <div>
                        {status === 'approved' ? (
                          <Badge status="approved" />
                        ) : (
                          <Badge status="pending" label="Menunggu Approval" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base">Daftar Kelas Tersedia</CardTitle>
            </CardHeader>
            <CardContent className="pt-2 space-y-3">
              {availableCourses.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">Tidak ada kelas baru yang tersedia saat ini.</p>
              ) : (
                availableCourses.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl border border-line bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-shadow hover:shadow-xs"
                  >
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-unj-teal bg-unj-teal/10 px-2 py-0.5 rounded-md">
                        {c.code}
                      </span>
                      <h3 className="text-base font-bold text-ink pt-1">{c.name}</h3>
                      <p className="text-xs text-slate-500">Dosen / KORMAT: {c.kormat?.name || '-'}</p>
                    </div>
                    <Button
                      variant="primary"
                      size="default"
                      onClick={() => handleJoin((c as any).join_code || '')}
                      className="text-xs"
                    >
                      Ajukan Join
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
