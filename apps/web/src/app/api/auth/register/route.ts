import { NextResponse } from 'next/server';
import { proxyToLaravel } from '@/lib/server/laravel-proxy';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await proxyToLaravel('/auth/register', {
      method: 'POST',
      body,
    });

    return NextResponse.json(result.data, { status: result.status });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error?.message || 'Server error', errors: null },
      { status: 500 }
    );
  }
}
