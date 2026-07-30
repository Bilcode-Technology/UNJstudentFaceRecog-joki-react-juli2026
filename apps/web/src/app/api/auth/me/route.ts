import { NextResponse } from 'next/server';
import { proxyToLaravel } from '@/lib/server/laravel-proxy';

export async function GET() {
  try {
    const result = await proxyToLaravel('/auth/me', {
      method: 'GET',
    });

    return NextResponse.json(result.data, { status: result.status });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: 'Unauthenticated', data: null },
      { status: 401 }
    );
  }
}
