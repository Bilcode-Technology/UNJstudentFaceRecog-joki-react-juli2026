import { NextResponse } from 'next/server';
import { proxyToLaravel } from '@/lib/server/laravel-proxy';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const result = await proxyToLaravel(`/courses/${params.id}/report`, { method: 'GET' });
  return NextResponse.json(result.data, { status: result.status });
}
