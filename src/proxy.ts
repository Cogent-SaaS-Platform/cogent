import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * Next.js 16 Edge Gateway Proxy (ADR-005 & Phase A2)
 * Replaces deprecated src/middleware.ts in accordance with Next.js 16 architecture rules.
 * Strictly narrows public endpoints; enforces active Clerk session and org context for all cockpits and APIs.
 */

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)', // Paystack & Clerk incoming webhooks verified by cryptographic signatures
  '/api/inngest(.*)',  // Inngest durable execution worker endpoints verified by signing keys
  '/api/health',       // Synthetic uptime monitoring probe
]);

const isClerkConfigured =
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
  Boolean(process.env.CLERK_SECRET_KEY);

const handler = isClerkConfigured
  ? clerkMiddleware(async (auth, req) => {
      // In development mode without Clerk keys, allow local cockpit navigation
      if (process.env.NODE_ENV === 'development' && !isClerkConfigured) {
        return;
      }

      if (!isPublicRoute(req)) {
        const isApiRoute = req.nextUrl.pathname.startsWith('/api/');

        // In test mode, allow through unless explicitly testing edge proxy
        if (process.env.NODE_ENV === 'test' && !process.env.TEST_EDGE_PROXY) {
          return;
        }

        const authObj = await auth();
        const { userId, orgId } = authObj;

        if (!userId) {
          if (isApiRoute) {
            return NextResponse.json(
              { error: 'Unauthorized: Authentication session required' },
              { status: 401 }
            );
          }
          await auth.protect();
          return;
        }

        if (!orgId) {
          if (isApiRoute) {
            return NextResponse.json(
              { error: 'Forbidden: Active organization context required' },
              { status: 403 }
            );
          }
          const signInUrl = new URL('/sign-in', req.url);
          return NextResponse.redirect(signInUrl);
        }
      }
    })
  : (req: any) => {
      if (process.env.NODE_ENV === 'production' && !isPublicRoute(req)) {
        if (req.nextUrl.pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Unauthorized: Security infrastructure not initialized' },
            { status: 401 }
          );
        }
        return NextResponse.redirect(new URL('/sign-in', req.url));
      }
      return NextResponse.next();
    };

export default handler;
export const proxy = handler;

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
