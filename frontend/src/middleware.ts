import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Middleware desabilitado temporariamente
// O AuthContext já faz a verificação de autenticação no cliente
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
