import { NextResponse } from 'next/server';
import { proxyToLaravel } from '@/lib/server/laravel-proxy';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await proxyToLaravel(`/notifications/${id}/read`, {
    method: 'PATCH',
  });
  return NextResponse.json(result.data, { status: result.status });
}
