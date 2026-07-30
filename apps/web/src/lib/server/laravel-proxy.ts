import { cookies } from 'next/headers';

const LARAVEL_API_URL = process.env.LARAVEL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface ProxyOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  token?: string;
}

export async function proxyToLaravel(endpoint: string, options: ProxyOptions = {}) {
  const cookieStore = await cookies();
  const token = options.token || cookieStore.get('auth_token')?.value;

  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${LARAVEL_API_URL}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config: RequestInit = {
    method: options.method || 'GET',
    headers,
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  };

  const response = await fetch(url, config);
  const data = await response.json().catch(() => ({}));

  return {
    status: response.status,
    ok: response.ok,
    data,
  };
}

/**
 * Proxy raw binary response from Laravel (e.g. PDF downloads) directly to Next.js client.
 */
export async function proxyRawToLaravel(endpoint: string, options: ProxyOptions = {}) {
  const cookieStore = await cookies();
  const token = options.token || cookieStore.get('auth_token')?.value;

  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${LARAVEL_API_URL}${path}`;

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config: RequestInit = {
    method: options.method || 'GET',
    headers,
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  };

  return await fetch(url, config);
}
