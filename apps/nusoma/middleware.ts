import { getSessionCookie } from 'better-auth/cookies'
import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger/console-logger'
import { getBaseDomain } from '@/lib/urls/utils'
import { env } from './lib/env'

const logger = createLogger('Middleware')

// Environment flag to check if we're in development mode
const isDevelopment = env.NODE_ENV === 'development'
const protectedRoutes = [
  '/chat',
  '/logs',
  '/workspace',
  '/settings',
  '/tasks',
  '/marketplace',
  '/projects',
  '/workers',
]

const SUSPICIOUS_UA_PATTERNS = [
  /^\s*$/, // Empty user agents
  /\.\./, // Path traversal attempt
  /<\s*script/i, // Potential XSS payloads
  /^\(\)\s*{/, // Command execution attempt
  /\b(sqlmap|nikto|gobuster|dirb|nmap)\b/i, // Known scanning tools
]

const BASE_DOMAIN = getBaseDomain()

// Function to check if a path is protected
function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some((route) => pathname.startsWith(route))
}

export async function middleware(request: NextRequest) {
  // Check for active session
  const sessionCookie = getSessionCookie(request)
  const hasActiveSession = !!sessionCookie

  const url = request.nextUrl
  const hostname = request.headers.get('host') || ''

  // Extract subdomain
  const isCustomDomain =
    hostname !== BASE_DOMAIN &&
    !hostname.startsWith('www.') &&
    hostname.includes(isDevelopment ? 'localhost' : 'nusoma.app')
  const subdomain = isCustomDomain ? hostname.split('.')[0] : null

  // Handle chat subdomains
  if (subdomain && isCustomDomain) {
    // Special case for API requests from the subdomain
    if (url.pathname.startsWith('/api/chat/')) {
      // Already an API request, let it go through
      return NextResponse.next()
    }

    // Rewrite to the chat page but preserve the URL in browser
    return NextResponse.rewrite(new URL(`/chat/${subdomain}${url.pathname}`, request.url))
  }

  // Handle root path redirection
  if (url.pathname === '/') {
    if (hasActiveSession) {
      return NextResponse.redirect(new URL('/workspace', request.url))
    }
    return NextResponse.redirect(new URL('/auth/sign-in', request.url))
  }

  // Check if the path is exactly /workspace
  if (url.pathname === '/workspace') {
    if (hasActiveSession) {
      // We will let the /workspace page handle the redirect to the first workspace
      return NextResponse.next()
    }
    return NextResponse.redirect(new URL('/auth/sign-in', request.url))
  }

  // Handle protected routes that require authentication
  if (isProtectedRoute(url.pathname)) {
    if (!hasActiveSession) {
      return NextResponse.redirect(new URL('/auth/sign-in', request.url))
    }
    return NextResponse.next()
  }

  // Allow access to invitation links
  if (request.nextUrl.pathname.startsWith('/invite/')) {
    if (
      !hasActiveSession &&
      !request.nextUrl.pathname.endsWith('/auth/sign-in') &&
      !request.nextUrl.pathname.endsWith('/auth/sign-up') &&
      !request.nextUrl.search.includes('callbackUrl')
    ) {
      const token = request.nextUrl.searchParams.get('token')
      const inviteId = request.nextUrl.pathname.split('/').pop()
      const callbackParam = encodeURIComponent(
        `/invite/${inviteId}${token ? `?token=${token}` : ''}`
      )
      return NextResponse.redirect(
        new URL(`/auth/sign-in?callbackUrl=${callbackParam}&invite_flow=true`, request.url)
      )
    }
    return NextResponse.next()
  }

  // Allow access to workspace invitation API endpoint
  if (request.nextUrl.pathname.startsWith('/api/workspaces/invitations')) {
    if (request.nextUrl.pathname.includes('/accept') && !hasActiveSession) {
      const token = request.nextUrl.searchParams.get('token')
      if (token) {
        return NextResponse.redirect(new URL(`/invite/${token}?token=${token}`, request.url))
      }
    }
    return NextResponse.next()
  }

  // Check if this is a webhook endpoint that should be exempt from User-Agent validation
  const isWebhookEndpoint = url.pathname.startsWith('/api/webhooks/trigger/')

  const userAgent = request.headers.get('user-agent') || ''
  const isSuspicious = SUSPICIOUS_UA_PATTERNS.some((pattern) => pattern.test(userAgent))

  // Block suspicious requests, but exempt webhook endpoints from User-Agent validation only
  if (isSuspicious && !isWebhookEndpoint) {
    logger.warn('Blocked suspicious request', {
      userAgent,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      url: request.url,
      method: request.method,
      pattern: SUSPICIOUS_UA_PATTERNS.find((pattern) => pattern.test(userAgent))?.toString(),
    })
    return new NextResponse(null, {
      status: 403,
      statusText: 'Forbidden',
      headers: {
        'Content-Type': 'text/plain',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Content-Security-Policy': "default-src 'none'",
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    })
  }

  const response = NextResponse.next()
  response.headers.set('Vary', 'User-Agent')
  return response
}

// Update matcher to include invitation routes
export const config = {
  matcher: [
    '/',
    '/workspace/:path*',
    '/settings/:path*',
    '/logs/:path*',
    '/tasks/:path*',
    '/marketplace/:path*',
    '/projects/:path*',
    '/workers/:path*',
    '/chat/:path*',
    '/auth/sign-in',
    '/auth/sign-up',
    '/invite/:path*',
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
}
