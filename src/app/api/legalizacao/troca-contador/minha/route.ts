import { type NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.API_URL ?? 'http://localhost:8080';

export async function GET(request: NextRequest) {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'host') headers.set(key, value);
  });

  const response = await fetch(`${BACKEND_URL}/api/client/legalizacao/troca-contador/minha`, {
    method: 'GET',
    headers,
  });

  if (response.status === 204) {
    return NextResponse.json(null, { status: 200 });
  }

  if (!response.ok) {
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
    });
  }

  return NextResponse.json(await response.json());
}
