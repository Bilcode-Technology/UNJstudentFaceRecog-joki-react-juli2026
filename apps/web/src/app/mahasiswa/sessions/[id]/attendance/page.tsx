'use client';

import React, { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

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

export default function MahasiswaAttendancePage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const sessionId = params.id;
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Camera & Geolocation State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState('');

  // Form & Result State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<any>(null);
  const [permissionType, setPermissionType] = useState<'izin' | 'sakit'>('izin');
  const [submittingPermission, setSubmittingPermission] = useState(false);

  useEffect(() => {
    fetchSessionInfo();
    requestLocation();
  }, [sessionId]);

  const fetchSessionInfo = async () => {
    try {
      setLoadingSession(true);
      const res = await fetch(`/api/sessions/${sessionId}`);
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setSession(data.data);
      } else {
        setError(data.message || 'Gagal memuat info sesi');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSession(false);
    }
  };

  const requestLocation = () => {
    setLocationError('');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        (err) => {
          setLocationError('Gagal mendapatkan lokasi. Pastikan izin lokasi browser diaktifkan.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLocationError('Browser Anda tidak mendukung Geolocation.');
    }
  };

  const startCamera = async () => {
    try {
      setError('');
      setCapturedImage(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Akses kamera di HP memerlukan koneksi HTTPS atau localhost. Silakan gunakan koneksi HTTPS / tunneling.');
        return;
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      } catch (e) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      setMediaStream(stream);
      setCameraActive(true);
    } catch (err) {
      setError('Gagal mengakses kamera. Di perangkat HP, pastikan situs diakses melalui HTTPS.');
    }
  };

  useEffect(() => {
    if (cameraActive && mediaStream && videoRef.current) {
      videoRef.current.srcObject = mediaStream;
      videoRef.current.play().catch((err) => console.error('Video play error:', err));
    }
  }, [cameraActive, mediaStream]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth || 640;
        canvasRef.current.height = videoRef.current.videoHeight || 480;
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.9);
        setCapturedImage(dataUrl);

        // Stop camera stream
        if (mediaStream) {
          mediaStream.getTracks().forEach((t) => t.stop());
          setMediaStream(null);
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        setCameraActive(false);
      }
    }
  };

  const handleCheckIn = async () => {
    if (!capturedImage) {
      setError('Silakan ambil foto wajah terlebih dahulu.');
      return;
    }
    if (!coords) {
      requestLocation();
      setError('Mendapatkan koordinat lokasi... Silakan klik tombol Kirim Presensi kembali.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const res = await fetch(`/api/sessions/${sessionId}/attendance/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: capturedImage,
          latitude: coords.latitude,
          longitude: coords.longitude,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.status !== 'success') {
        throw new Error(data.message || 'Presensi gagal, silakan coba lagi.');
      }

      setSuccessData(data.data);
    } catch (err: any) {
      setError(err?.message || 'Presensi gagal, silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmittingPermission(true);

    try {
      const res = await fetch(`/api/sessions/${sessionId}/attendance/permission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: permissionType }),
      });

      const data = await res.json();

      if (!res.ok || data.status !== 'success') {
        throw new Error(data.message || 'Gagal mengajukan izin/sakit');
      }

      setSuccessData(data.data);
    } catch (err: any) {
      setError(err?.message || 'Gagal mengajukan izin/sakit');
    } finally {
      setSubmittingPermission(false);
    }
  };

  if (loadingSession || isLoading) {
    return <div className="p-6 text-slate-500 font-body">Memuat sesi presensi...</div>;
  }

  if (!session) {
    return <div className="p-6 text-unj-red font-body">Info sesi tidak ditemukan.</div>;
  }

  return (
    <div className="min-h-screen bg-canvas p-4 sm:p-6 font-body pb-12">
      <div className="max-w-xl mx-auto space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.push(`/mahasiswa/courses/${session.course.id}`)}
          className="text-xs text-unj-teal pl-0 hover:bg-transparent"
        >
          &larr; Kembali ke Detail Kelas
        </Button>

        {/* Session Header Info */}
        <Card>
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-unj-teal bg-unj-teal/10 px-2.5 py-1 rounded-md">
                {session.course.code}
              </span>
              <Badge
                status={session.meeting_type === 'online' ? 'approved' : 'pending'}
                label={session.meeting_type === 'online' ? '💻 Online' : `📍 ${session.room || 'Luring'}`}
              />
            </div>
            <CardTitle className="text-2xl font-bold font-heading text-ink pt-1">{session.course.name}</CardTitle>
            <CardDescription>
              Tanggal: <span className="font-semibold text-ink">{session.meeting_date}</span> ({session.start_time} - {session.end_time} WIB)
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Location Status Bar */}
        <Card>
          <CardContent className="p-4 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="font-semibold text-slate-700 block">Koordinat Lokasi Geofencing:</span>
              {coords ? (
                <span className="text-ink font-mono text-[11px] font-semibold bg-slate-100 px-2 py-0.5 rounded">
                  Lat: {coords.latitude.toFixed(6)}, Lng: {coords.longitude.toFixed(6)}
                </span>
              ) : (
                <span className="text-amber-700 font-medium">{locationError || 'Mengambil koordinat lokasi...'}</span>
              )}
            </div>
            <Button variant="ghost" onClick={requestLocation} className="text-xs text-unj-teal hover:underline p-1">
              Refresh Lokasi
            </Button>
          </CardContent>
        </Card>

        {/* Success Alert */}
        {successData && (
          <Card className="border-unj-teal/40 bg-unj-teal/5">
            <CardContent className="p-6 text-center space-y-3">
              <div className="mx-auto w-14 h-14 bg-unj-teal/20 rounded-full flex items-center justify-center text-unj-teal">
                <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold font-heading text-ink">Status Presensi Berhasil Dicatat!</h2>
              <div className="flex justify-center">
                <Badge status={successData.status} className="text-sm px-4 py-1.5" />
              </div>
              {successData.late_minutes !== null && successData.late_minutes !== undefined && (
                <p className="text-xs text-slate-600 font-medium pt-1">
                  {successData.late_minutes === 0 ? '✓ Tepat Waktu (Late 0 min)' : `⚠️ Anda terlambat ${successData.late_minutes} menit`}
                </p>
              )}
              <Button variant="primary" onClick={() => router.push('/mahasiswa/dashboard')} className="mt-2 w-full">
                Kembali ke Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        {!successData && (
          <>
            {/* Check-in Section */}
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-base">Check-in Presensi Wajah</CardTitle>
                <CardDescription>Posisikan wajah Anda tepat di dalam frame kamera</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 pt-1">
                {/* Camera Preview */}
                <div className="relative w-full aspect-video bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center shadow-inner">
                  {capturedImage ? (
                    <img src={capturedImage} alt="Captured face" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover ${cameraActive ? '' : 'hidden'}`} />
                      {cameraActive && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div className="w-36 h-48 border-2 border-dashed border-unj-gold rounded-[50%] shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                        </div>
                      )}
                    </>
                  )}

                  {!cameraActive && !capturedImage && (
                    <Button variant="primary" onClick={startCamera} className="shadow-lg">
                      📸 Buka Kamera Wajah
                    </Button>
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden" />

                {/* Error Banner inside camera section */}
                {error && (
                  error.toLowerCase().includes('radius') || error.toLowerCase().includes('lokasi') ? (
                    <div className="bg-amber-50 text-amber-900 p-4 rounded-xl text-xs font-semibold border border-amber-300 text-center space-y-2 shadow-sm">
                      <div className="flex items-center justify-center gap-1.5 text-amber-800 font-bold text-sm">
                        <span>📍</span>
                        <span>Lokasi Di Luar Radius Geofencing</span>
                      </div>
                      <p className="text-amber-800">{error}</p>
                      <p className="text-[11px] text-amber-700 font-normal">
                        Pastikan Anda berada di sekitar gedung kelas/kampus dan izin lokasi browser aktif, atau hubungi KORMAT untuk override manual.
                      </p>
                      <Button variant="ghost" size="default" onClick={requestLocation} className="text-xs text-amber-900 hover:bg-amber-100 font-semibold px-3 py-1 mt-1">
                        🔄 Refresh Lokasi GPS
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-red-50 text-unj-red p-3.5 rounded-xl text-xs font-semibold border border-unj-red/20 text-center space-y-2">
                      <div className="flex items-center justify-center gap-1.5 font-bold text-sm">
                        <span>📸</span>
                        <span>Kendala Presensi Wajah</span>
                      </div>
                      <p>{error}</p>
                      {error.includes('gagal') && (
                        <Button variant="danger" size="default" onClick={startCamera} className="text-xs px-4 py-1.5 mt-1">
                          Coba Lagi
                        </Button>
                      )}
                    </div>
                  )
                )}

                {/* Camera Action Buttons */}
                {cameraActive && (
                  <Button variant="primary" size="lg" onClick={capturePhoto} className="w-full shadow-md">
                    📸 Ambil Foto Wajah
                  </Button>
                )}

                {capturedImage && (
                  <div className="space-y-2">
                    <Button
                      variant="primary"
                      size="lg"
                      loading={submitting}
                      onClick={handleCheckIn}
                      className="w-full shadow-md"
                    >
                      Kirim Presensi
                    </Button>
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={startCamera}
                      className="w-full border border-line text-xs"
                    >
                      Foto Ulang
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Permission Form (Izin / Sakit) */}
            <Card>
              <CardHeader className="py-3 border-b-0">
                <CardTitle className="text-sm">Atau Ajukan Form Izin / Sakit</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <form onSubmit={handleSubmitPermission} className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <Select
                      value={permissionType}
                      onChange={(e) => setPermissionType(e.target.value as any)}
                      options={[
                        { value: 'izin', label: 'Ajukan Izin' },
                        { value: 'sakit', label: 'Ajukan Sakit' },
                      ]}
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="secondary"
                    loading={submittingPermission}
                    className="w-full sm:w-auto text-xs"
                  >
                    Kirim Form
                  </Button>
                </form>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
