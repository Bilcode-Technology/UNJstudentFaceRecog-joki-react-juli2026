import { NextResponse } from 'next/server';
import { proxyToLaravel } from '@/lib/server/laravel-proxy';

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const body = await request.json();
  const result = await proxyToLaravel(`/courses/${params.id}/archive`, {
    method: 'PATCH',
    body,
  });
  return NextResponse.json(result.data, { status: result.status });
}
