import { NextResponse } from 'next/server';
import { proxyToLaravel } from '@/lib/server/laravel-proxy';

export async function GET() {
  const result = await proxyToLaravel('/sessions/today', { method: 'GET' });
  return NextResponse.json(result.data, { status: result.status });
}
