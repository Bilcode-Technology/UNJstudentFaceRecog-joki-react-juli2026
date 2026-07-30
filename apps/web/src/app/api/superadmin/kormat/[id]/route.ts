import { NextResponse } from 'next/server';
import { proxyToLaravel } from '@/lib/server/laravel-proxy';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await proxyToLaravel(`/superadmin/kormat/${id}`, { method: 'GET' });
  return NextResponse.json(result.data, { status: result.status });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const result = await proxyToLaravel(`/superadmin/kormat/${id}`, {
    method: 'PATCH',
    body,
  });
  return NextResponse.json(result.data, { status: result.status });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await proxyToLaravel(`/superadmin/kormat/${id}`, {
    method: 'DELETE',
  });
  return NextResponse.json(result.data, { status: result.status });
}
