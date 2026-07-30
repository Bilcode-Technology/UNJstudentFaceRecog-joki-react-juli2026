import { NextResponse } from 'next/server';
import { proxyToLaravel } from '@/lib/server/laravel-proxy';

export async function GET() {
  const result = await proxyToLaravel('/superadmin/kormat', { method: 'GET' });
  return NextResponse.json(result.data, { status: result.status });
}

export async function POST(request: Request) {
  const body = await request.json();
  const result = await proxyToLaravel('/superadmin/kormat', {
    method: 'POST',
    body,
  });
  return NextResponse.json(result.data, { status: result.status });
}
