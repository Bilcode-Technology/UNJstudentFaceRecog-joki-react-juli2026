'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface ReportData {
  course: {
    id: number;
    name: string;
    code: string;
    join_code: string;
    kormat_name: string;
    kormat_email: string;
    generated_at: string;
  };
  sessions: Array<{
    id: number;
    meeting_type: string;
    room: string | null;
    meeting_date: string;
    start_time: string;
    end_time: string;
  }>;
  students: Array<{
    student_id: number;
    name: string;
    nim: string | null;
    email: string;
    angkatan: string | null;
    stats: {
      hadir: number;
      izin: number;
      sakit: number;
      alfa: number;
      belum_presensi: number;
      total_sessions: number;
      attendance_percentage: number;
    };
    sessions: Record<number, {
      session_id: number;
      status: 'hadir' | 'izin' | 'sakit' | 'alfa' | 'belum_presensi';
      late_minutes: number | null;
      checked_in_at: string | null;
    }>;
  }>;
}

export default function KormatCourseReportPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  const courseId = params.id;
  const [report, setReport] = useState<ReportData | null>(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const isKormat = user?.roles?.some((r) => r.name === 'kormat' || r.name === 'superadmin');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && isKormat) {
      fetchReport();
    }
  }, [isAuthenticated, isKormat, courseId]);

  const fetchReport = async () => {
    try {
      setLoadingReport(true);
      const res = await fetch(`/api/courses/${courseId}/report`);
      const json = await res.json();
      if (res.ok && json.status === 'success') {
        setReport(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleExportPdf = () => {
    setIsExporting(true);
    window.open(`/api/courses/${courseId}/report/export`, '_blank');
    setTimeout(() => setIsExporting(false), 2000);
  };

  if (isLoading || loadingReport) {
    return (
      <AppShell role="kormat" title="Laporan Presensi">
        <div className="p-8 text-center text-slate-500">Memuat laporan presensi...</div>
      </AppShell>
    );
  }

  if (!isKormat || !report) {
    return (
      <AppShell role="kormat" title="Akses Ditolak">
        <Card className="p-6 text-red-600">Gagal memuat laporan atau Anda tidak memiliki akses.</Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      role="kormat"
      title="Laporan Rekapitulasi Presensi"
      breadcrumbs={[
        { label: 'Kelola Kelas', href: '/kormat/courses' },
        { label: report.course.code, href: `/kormat/courses/${report.course.id}` },
        { label: 'Laporan PDF' },
      ]}
    >
      {/* Report Header Card */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <span className="text-xs font-mono font-bold uppercase text-unj-teal bg-unj-teal/10 dark:bg-unj-teal/20 px-2 py-0.5 rounded">
              {report.course.code}
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {report.course.name}
            </h2>
            <p className="text-xs text-slate-500">
              Koordinator Matkul: {report.course.kormat_name} ({report.course.kormat_email}) | Cetak: {report.course.generated_at} WIB
            </p>
          </div>

          <Button
            variant="success"
            size="md"
            isLoading={isExporting}
            onClick={handleExportPdf}
          >
            📥 Export Laporan PDF
          </Button>
        </div>
      </Card>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-400">Total Sesi</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{report.sessions.length} Sesi</div>
        </Card>
        <Card className="p-4 space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-400">Mahasiswa Approved</span>
          <div className="text-2xl font-bold text-unj-teal">{report.students.length} Orang</div>
        </Card>
        <Card className="p-4 space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-400">Rata-Rata Kehadiran</span>
          <div className="text-2xl font-bold text-emerald-600">
            {report.students.length > 0
              ? roundNumber(
                  report.students.reduce((acc, curr) => acc + curr.stats.attendance_percentage, 0) /
                    report.students.length
                )
              : 0}
            %
          </div>
        </Card>
        <Card className="p-4 space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-400">Join Code</span>
          <div className="text-2xl font-mono font-bold text-slate-800 dark:text-slate-200">{report.course.join_code}</div>
        </Card>
      </div>

      {/* Matrix Table with Horizontal Scroll & Sticky Headers */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Matriks Kehadiran Mahasiswa Per Sesi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300">
                  <th className="p-3 sticky left-0 bg-slate-100 dark:bg-slate-800 z-10">No</th>
                  <th className="p-3 sticky left-8 bg-slate-100 dark:bg-slate-800 z-10">NIM</th>
                  <th className="p-3 sticky left-28 bg-slate-100 dark:bg-slate-800 z-10 border-r border-slate-200 dark:border-slate-700">Nama Mahasiswa</th>
                  {report.sessions.map((s, idx) => (
                    <th key={s.id} className="p-2 text-center border-r border-slate-200 dark:border-slate-800 min-w-[50px]">
                      S{idx + 1}<br />
                      <span className="font-normal text-[9px] text-slate-400">{s.meeting_date}</span>
                    </th>
                  ))}
                  <th className="p-2 text-center border-l bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-bold">H</th>
                  <th className="p-2 text-center bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 font-bold">I</th>
                  <th className="p-2 text-center bg-orange-50 dark:bg-orange-950/40 text-orange-900 dark:text-orange-300 font-bold">S</th>
                  <th className="p-2 text-center bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-300 font-bold">A</th>
                  <th className="p-3 text-right bg-unj-teal/10 dark:bg-unj-teal/20 text-unj-teal dark:text-teal-300 font-bold">% Hadir</th>
                </tr>
              </thead>
              <tbody>
                {report.students.map((student, idx) => (
                  <tr key={student.student_id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3 text-slate-400 sticky left-0 bg-white dark:bg-slate-900">{idx + 1}</td>
                    <td className="p-3 font-mono font-medium text-slate-700 dark:text-slate-300 sticky left-8 bg-white dark:bg-slate-900">{student.nim || '-'}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-slate-100 sticky left-28 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">{student.name}</td>
                    {report.sessions.map((s) => {
                      const att = student.sessions[s.id];
                      const status = att?.status || 'belum_presensi';
                      return (
                        <td key={s.id} className="p-2 text-center border-r border-slate-200 dark:border-slate-800">
                          {status === 'hadir' && (
                            <span className="inline-block font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                              H{att?.late_minutes ? <span className="text-[9px] text-amber-600 ml-0.5">+{att.late_minutes}m</span> : ''}
                            </span>
                          )}
                          {status === 'izin' && <span className="inline-block font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">I</span>}
                          {status === 'sakit' && <span className="inline-block font-bold text-orange-600 bg-orange-50 dark:bg-orange-950/60 px-1.5 py-0.5 rounded">S</span>}
                          {status === 'alfa' && <span className="inline-block font-bold text-red-600 bg-red-50 dark:bg-red-950/60 px-1.5 py-0.5 rounded">A</span>}
                          {status === 'belum_presensi' && <span className="text-slate-300 dark:text-slate-700">-</span>}
                        </td>
                      );
                    })}
                    <td className="p-2 text-center border-l font-bold text-emerald-600">{student.stats.hadir}</td>
                    <td className="p-2 text-center font-bold text-amber-600">{student.stats.izin}</td>
                    <td className="p-2 text-center font-bold text-orange-600">{student.stats.sakit}</td>
                    <td className="p-2 text-center font-bold text-red-600">{student.stats.alfa}</td>
                    <td className="p-3 text-right font-bold text-unj-teal dark:text-teal-400 bg-unj-teal/5 dark:bg-unj-teal/10">
                      {student.stats.attendance_percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function roundNumber(num: number) {
  return Math.round(num * 10) / 10;
}
