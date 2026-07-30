import { NextResponse } from 'next/server';
import { proxyToLaravel } from '@/lib/server/laravel-proxy';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const body = await request.json();
  const result = await proxyToLaravel(`/sessions/${params.id}/attendance/permission`, {
    method: 'POST',
    body,
  });
  return NextResponse.json(result.data, { status: result.status });
}
