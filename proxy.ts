import { NextResponse, type NextRequest } from 'next/server';

const STATUS_HOST = 'status.addisassistant.com';

export function proxy(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0];
  if (host !== STATUS_HOST) return NextResponse.next();

  const url = request.nextUrl.clone();
  if (url.pathname === '/') {
    url.pathname = '/docs/platform/status';
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}
