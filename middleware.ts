import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/projects(.*)',
  '/welcome(.*)',
  '/api/chat',
  '/api/checkout',
  '/api/code',
  '/api/portal',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/webhooks/ (webhook endpoints)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|mp4)$).*)',
  ],
};
