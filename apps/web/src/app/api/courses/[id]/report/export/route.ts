import { NextResponse } from 'next/server';
import { proxyRawToLaravel } from '@/lib/server/laravel-proxy';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const res = await proxyRawToLaravel(`/courses/${params.id}/report/export`, { method: 'GET' });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({ message: 'Gagal mengeksport PDF' }));
    return NextResponse.json(errorJson, { status: res.status });
  }

  const pdfBuffer = await res.arrayBuffer();
  const contentType = res.headers.get('Content-Type') || 'application/pdf';
  const contentDisposition = res.headers.get('Content-Disposition') || `attachment; filename="laporan-${params.id}.pdf"`;

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': contentDisposition,
    },
  });
}
