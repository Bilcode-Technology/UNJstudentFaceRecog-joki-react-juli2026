'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-xl shadow-slate-200/60 border border-slate-200 bg-white rounded-3xl">
        <CardHeader className="space-y-2 text-center pb-2 border-b-0 pt-6">
          {/* Logo UNJ */}
          <div className="mx-auto w-16 h-16 flex items-center justify-center mb-1">
            <Image
              src="/Lambang_baru_UNJ.png"
              alt="Logo UNJ"
              width={64}
              height={64}
              className="object-contain drop-shadow-xs"
              priority
            />
          </div>

          <CardTitle className="text-xl sm:text-2xl text-slate-900 font-black tracking-tight leading-tight">
            UNJ Electrical Student <br />
            <span className="text-unj-teal">Attendance System</span>
          </CardTitle>

          <CardDescription className="text-xs text-slate-500 font-medium">
            Program Studi Teknik Elektro — Universitas Negeri Jakarta
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 pt-4 p-6 sm:p-8">
          {error && (
            <div className="bg-red-50 text-red-700 p-3.5 rounded-xl text-xs font-medium border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@example.com"
            />

            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            <Button type="submit" variant="primary" size="lg" loading={loading} className="mt-2 w-full shadow-lg shadow-unj-teal/25">
              Masuk ke Portal
            </Button>
          </form>

          <p className="text-center text-xs text-slate-500 pt-3 border-t border-slate-200">
            Belum punya akun Mahasiswa?{' '}
            <Link href="/register" className="text-unj-teal font-bold hover:underline">
              Daftar di sini
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
