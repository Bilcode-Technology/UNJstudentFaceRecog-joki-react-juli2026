import { NextResponse } from 'next/server';
import { proxyToLaravel } from '@/lib/server/laravel-proxy';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const archived = searchParams.get('archived');
  const query = archived !== null ? `?archived=${archived}` : '';

  const result = await proxyToLaravel(`/courses${query}`, { method: 'GET' });
  return NextResponse.json(result.data, { status: result.status });
}

export async function POST(request: Request) {
  const body = await request.json();
  const result = await proxyToLaravel('/courses', {
    method: 'POST',
    body,
  });
  return NextResponse.json(result.data, { status: result.status });
}
