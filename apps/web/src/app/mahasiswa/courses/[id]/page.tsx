'use client';

import React, { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

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
  kormat?: { name: string; email: string };
  class_sessions: Session[];
}

export default function MahasiswaCourseDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const courseId = params.id;
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [resCourse, resSessions] = await Promise.all([
        fetch(`/api/courses/${courseId}`),
        fetch(`/api/courses/${courseId}/sessions`),
      ]);

      const dataCourse = await resCourse.json();
      const dataSessions = await resSessions.json();

      if (!resCourse.ok || dataCourse.status !== 'success') {
        throw new Error(dataCourse.message || 'Gagal memuat detail kelas');
      }

      setCourse(dataCourse.data);

      if (resSessions.ok && dataSessions.status === 'success') {
        setSessions(dataSessions.data || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Anda tidak memiliki hak akses untuk melihat kelas ini.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      loadData();
    }
  }, [isLoading, courseId]);

  if (loading) {
    return (
      <AppShell role="mahasiswa" title="Detail Kelas">
        <div className="p-8 text-center text-slate-500">Memuat detail kelas...</div>
      </AppShell>
    );
  }

  if (error || !course) {
    return (
      <AppShell role="mahasiswa" title="Kelas Tidak Ditemukan">
        <Card className="max-w-md w-full">
          <div className="p-6 text-center space-y-4">
            <div className="bg-red-50 text-unj-red p-4 rounded-xl border border-unj-red/20 text-xs font-medium">
              {error}
            </div>
            <Button variant="primary" onClick={() => router.push('/mahasiswa/courses')} className="w-full">
              &larr; Kembali ke Daftar Kelas Saya
            </Button>
          </div>
        </Card>
      </AppShell>
    );
  }

  const todayStr = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  })();

  return (
    <AppShell
      role="mahasiswa"
      title={course.name}
      breadcrumbs={[
        { label: 'Mata Kuliah Saya', href: '/mahasiswa/courses' },
        { label: course.name },
      ]}
    >
      {/* Course Header */}
      <Card>
        <CardHeader className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-unj-teal bg-unj-teal/10 px-2.5 py-1 rounded-md w-fit">
              {course.code}
            </span>
            <CardTitle className="text-2xl font-bold font-heading text-ink pt-1">{course.name}</CardTitle>
            <CardDescription>Dosen / KORMAT Pengampu: <span className="font-semibold text-ink">{course.kormat?.name || '-'}</span></CardDescription>
          </CardHeader>
        </Card>

        {/* Sessions List */}
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base">Daftar Sesi Pertemuan Kuliah</CardTitle>
            <CardDescription>Seluruh jadwal sesi pertemuan yang diselenggarakan pada mata kuliah ini</CardDescription>
          </CardHeader>

          <CardContent className="pt-2 space-y-3">
            {sessions.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">Belum ada sesi pertemuan yang dibuat oleh KORMAT.</p>
            ) : (
              sessions.map((sess) => {
                const isToday = sess.meeting_date === todayStr;

                return (
                  <div
                    key={sess.id}
                    className="p-4 rounded-xl border border-line bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-shadow hover:shadow-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={sess.meeting_type === 'online' ? 'secondary' : 'outline'}
                          label={sess.meeting_type === 'online' ? '💻 Online' : `📍 ${sess.room || 'Luring'}`}
                        />
                        {isToday && <Badge status="hadir" label="Hari Ini" />}
                      </div>
                      <h3 className="text-base font-bold text-ink">
                        {sess.meeting_date}
                      </h3>
                      <p className="text-xs text-slate-500">
                        ⏰ Jam: <span className="font-semibold text-ink">{sess.start_time} - {sess.end_time} WIB</span>
                      </p>
                    </div>

                    {isToday && (
                      <Button
                        variant="primary"
                        size="default"
                        onClick={() => router.push(`/mahasiswa/sessions/${sess.id}/attendance`)}
                        className="text-xs w-full sm:w-auto"
                      >
                        Buka Presensi Sesi &rarr;
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </AppShell>
  );
}
