import { NextResponse } from 'next/server';
import { proxyToLaravel } from '@/lib/server/laravel-proxy';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const body = await request.json().catch(() => ({}));
    const result = await proxyToLaravel(`/courses/${params.id}/students/bulk-approve`, {
      method: 'POST',
      body,
    });
    return NextResponse.json(result.data, { status: result.status });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error?.message || 'Gagal memproses persetujuan masal di server Next.js' },
      { status: 500 }
    );
  }
}
