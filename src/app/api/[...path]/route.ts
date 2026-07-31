import { type NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.API_URL ?? 'http://localhost:8080';

type RouteContext = { params: Promise<{ path: string[] }> };

async function forward(request: NextRequest, { params }: RouteContext) {
  const { path } = await params;
  const search = request.nextUrl.search;
  const url = `${BACKEND_URL}/api/${path.join('/')}${search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'host') headers.set(key, value);
  });

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD' && request.body !== null;
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const response = await fetch(url, { method: request.method, headers, body });

  const responseHeaders = new Headers();
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'set-cookie') responseHeaders.set(key, value);
  });
  // getSetCookie() preserves each Set-Cookie header as a separate entry
  response.headers.getSetCookie().forEach((cookie) => {
    responseHeaders.append('Set-Cookie', cookie);
  });

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
