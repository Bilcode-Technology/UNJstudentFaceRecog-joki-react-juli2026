import { NextResponse } from 'next/server';
import { proxyToLaravel } from '@/lib/server/laravel-proxy';

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const params = await props.params;
    const result = await proxyToLaravel(`/courses/${params.id}/students/${params.studentId}/approve`, {
      method: 'POST',
    });
    return NextResponse.json(result.data, { status: result.status });
  } catch (error: any) {
    console.error('Approve route error:', error);
    return NextResponse.json(
      { status: 'error', message: error?.message || 'Gagal memproses persetujuan di server Next.js' },
      { status: 500 }
    );
  }
}
