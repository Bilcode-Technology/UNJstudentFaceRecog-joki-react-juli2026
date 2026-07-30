import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { proxyToLaravel } from '@/lib/server/laravel-proxy';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await proxyToLaravel('/auth/login', {
      method: 'POST',
      body,
    });

    if (result.ok && result.data?.data?.token) {
      const token = result.data.data.token;
      const user = result.data.data.user;

      const cookieStore = await cookies();
      cookieStore.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      // Sanitized response: omit raw token from JSON body payload sent to browser client
      const clientData = {
        ...result.data,
        data: {
          user,
        },
      };

      return NextResponse.json(clientData, { status: result.status });
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error?.message || 'Server error', errors: null },
      { status: 500 }
    );
  }
}
