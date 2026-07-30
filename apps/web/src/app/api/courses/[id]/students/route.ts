import { NextResponse } from 'next/server';
import { proxyToLaravel } from '@/lib/server/laravel-proxy';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const query = status ? `?status=${status}` : '';

  const result = await proxyToLaravel(`/courses/${params.id}/students${query}`, { method: 'GET' });
  return NextResponse.json(result.data, { status: result.status });
}
