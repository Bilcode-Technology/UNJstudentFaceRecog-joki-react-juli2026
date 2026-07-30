import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { proxyToLaravel } from '@/lib/server/laravel-proxy';

export async function POST() {
  try {
    const result = await proxyToLaravel('/auth/logout', {
      method: 'POST',
    });

    const cookieStore = await cookies();
    cookieStore.delete('auth_token');

    return NextResponse.json(
      { status: 'success', message: 'Logout berhasil', data: null },
      { status: 200 }
    );
  } catch (error: any) {
    const cookieStore = await cookies();
    cookieStore.delete('auth_token');

    return NextResponse.json(
      { status: 'success', message: 'Logout lokal berhasil', data: null },
      { status: 200 }
    );
  }
}
