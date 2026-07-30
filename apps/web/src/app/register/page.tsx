'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    nim: '',
    angkatan: '',
  });

  const [faceImage, setFaceImage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [cameraError, setCameraError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const startCamera = async () => {
    try {
      setCameraError('');
      setError('');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Akses kamera di HP memerlukan koneksi HTTPS atau localhost. Silakan gunakan tombol Unggah File di bawah.');
        return;
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      } catch (e) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      setMediaStream(stream);
      setIsCameraActive(true);
    } catch (err) {
      setCameraError('Gagal mengakses kamera. Di perangkat HP, pastikan akses lewat HTTPS atau gunakan tombol Unggah File.');
    }
  };

  useEffect(() => {
    if (isCameraActive && mediaStream && videoRef.current) {
      videoRef.current.srcObject = mediaStream;
      videoRef.current.play().catch((err) => console.error('Video play error:', err));
    }
  }, [isCameraActive, mediaStream]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setFaceImage(dataUrl);
        setCameraError('');
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFaceImage(reader.result as string);
        setCameraError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCameraError('');
    setSuccess('');

    if (!faceImage) {
      setCameraError('Wajib mengambil/mengunggah foto wajah untuk enrollment presensi.');
      return;
    }

    try {
      setLoading(true);
      const res = await register({
        ...form,
        face_image: faceImage,
      });

      setSuccess(res.message || 'Registrasi berhasil! Mengalihkan ke halaman login...');
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (err: any) {
      const msg = err?.message || 'Registrasi gagal.';
      if (
        msg.toLowerCase().includes('wajah') ||
        msg.toLowerCase().includes('face') ||
        msg.toLowerCase().includes('foto')
      ) {
        setCameraError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-unj-teal border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Memeriksa status sesi...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4 py-8">
      <Card className="max-w-md w-full shadow-md">
        <CardHeader className="space-y-1 text-center pb-3">
          <CardTitle className="text-2xl text-ink font-bold">Pendaftaran Mahasiswa</CardTitle>
          <CardDescription>Lengkapi data diri dan daftarkan foto wajah Anda</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 text-unj-red p-3.5 rounded-xl text-xs font-medium border border-unj-red/20">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-unj-teal/10 text-unj-teal p-3.5 rounded-xl text-xs font-semibold border border-unj-teal/20">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <Input
              label="Nama Lengkap"
              type="text"
              name="name"
              required
              value={form.name}
              onChange={handleChange}
              placeholder="Contoh: Ahmad Fauzi"
            />

            <Input
              label="Email"
              type="email"
              name="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="ahmad@student.unj.ac.id"
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="NIM"
                type="text"
                name="nim"
                required
                value={form.nim}
                onChange={handleChange}
                placeholder="1313620001"
              />
              <Input
                label="Angkatan"
                type="text"
                name="angkatan"
                required
                value={form.angkatan}
                onChange={handleChange}
                placeholder="2024"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Password"
                type="password"
                name="password"
                required
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
              />
              <Input
                label="Konfirmasi Password"
                type="password"
                name="password_confirmation"
                required
                value={form.password_confirmation}
                onChange={handleChange}
                placeholder="••••••••"
              />
            </div>

            {/* Face Enrollment Camera Box */}
            <div className="space-y-2 pt-3 border-t border-line">
              <label className="block text-xs font-semibold text-ink">
                Face Enrollment (Foto Wajah) <span className="text-unj-red">*</span>
              </label>
              <p className="text-xs text-slate-500">
                Posisikan wajah berada di dalam area panduan oval dengan pencahayaan terang.
              </p>

              {isCameraActive ? (
                <div className="space-y-2">
                  <div className="relative w-full h-52 bg-slate-900 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    {/* Face Alignment Guide Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-36 h-48 border-2 border-dashed border-unj-gold/90 rounded-[50%] shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                    </div>
                  </div>
                  <Button type="button" variant="primary" onClick={capturePhoto} className="w-full">
                    📸 Ambil Foto Wajah
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {faceImage ? (
                    <div className="relative rounded-2xl overflow-hidden border border-line bg-slate-900">
                      <img src={faceImage} alt="Preview Wajah" className="w-full h-52 object-cover" />
                      <div className="absolute bottom-2 right-2 flex gap-2">
                        <Button
                          type="button"
                          variant="danger"
                          onClick={() => setFaceImage('')}
                          className="text-xs px-3 py-1.5"
                        >
                          Hapus & Ambil Ulang
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button type="button" variant="secondary" onClick={startCamera} className="flex-1">
                        📷 Buka Kamera
                      </Button>
                      <label className="flex-1">
                        <Button type="button" variant="ghost" className="w-full border border-line" onClick={() => document.getElementById('file-upload-input')?.click()}>
                          📁 Unggah File
                        </Button>
                        <input
                          id="file-upload-input"
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Camera specific error message placed directly under camera box */}
              {cameraError && (
                <div className="bg-red-50 text-unj-red p-3 rounded-xl text-xs font-medium border border-unj-red/20 flex items-start gap-2">
                  <span>⚠️</span>
                  <span>{cameraError}</span>
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />
            </div>

            <Button type="submit" variant="primary" size="lg" loading={loading} className="mt-4">
              Daftar Sekarang
            </Button>
          </form>

          <p className="text-center text-xs text-slate-500 pt-2 border-t border-line">
            Sudah punya akun?{' '}
            <a href="/login" className="text-unj-teal font-semibold hover:underline">
              Login di sini
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
