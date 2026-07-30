import { NextResponse } from 'next/server';
import { proxyToLaravel } from '@/lib/server/laravel-proxy';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const result = await proxyToLaravel(`/superadmin/kormat/${id}/reset-password`, {
    method: 'PATCH',
    body,
  });
  return NextResponse.json(result.data, { status: result.status });
}
