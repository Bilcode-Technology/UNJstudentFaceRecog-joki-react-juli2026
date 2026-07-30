import { NextResponse } from 'next/server';
import { proxyToLaravel } from '@/lib/server/laravel-proxy';

export async function POST(request: Request) {
  const body = await request.json();
  const result = await proxyToLaravel('/push/subscribe', {
    method: 'POST',
    body,
  });
  return NextResponse.json(result.data, { status: result.status });
}
