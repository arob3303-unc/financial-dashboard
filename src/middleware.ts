import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Everything under /api touches either the user's stored balance or a paid Claude
// call, so it is gated here as well as inside each route handler.
const isApiRoute = createRouteMatcher(["/api/(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (!isApiRoute(request)) return;

  const { userId } = await auth();
  if (userId) return;

  // `auth.protect()` answers an unauthenticated API request with a bare 404, which
  // is indistinguishable from a typo in the route. A JSON 401 is what the client
  // can actually act on.
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
