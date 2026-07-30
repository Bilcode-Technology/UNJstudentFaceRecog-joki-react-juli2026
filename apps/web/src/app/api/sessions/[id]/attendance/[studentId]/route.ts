import { NextResponse } from 'next/server';
import { proxyToLaravel } from '@/lib/server/laravel-proxy';

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string; studentId: string }> }
) {
  const params = await props.params;
  const body = await request.json();
  const result = await proxyToLaravel(`/sessions/${params.id}/attendance/${params.studentId}`, {
    method: 'PATCH',
    body,
  });
  return NextResponse.json(result.data, { status: result.status });
}
