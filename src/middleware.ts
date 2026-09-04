import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Only the routes that need a user are gated.
 *
 * `/api/stocks` and `/api/forecast` are deliberately public: they serve public market
 * data, the dashboard shows charts to signed-out visitors, and their responses are
 * CDN-cached. Gating all of `/api/*` would 401 the charts for anyone not signed in.
 */
const isProtectedRoute = createRouteMatcher([
  "/api/balance(.*)",
  "/api/recommendation(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isProtectedRoute(request)) return;

  const { userId } = await auth();
  if (userId) return;

  // `auth.protect()` answers an unauthenticated API request with a bare 404, which is
  // indistinguishable from a typo in the route. A JSON 401 is what the client can act on.
  return NextResponse.json({ error: "Sign in to use this endpoint." }, { status: 401 });
});

export const config = {
  matcher: [
    // Skip static files and Next.js internals
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
