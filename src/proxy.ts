import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Clerk request context for the whole app.
 *
 * This file is `proxy.ts`, not `middleware.ts`: Next 16 deprecated the old filename.
 *
 * There is deliberately **no** `createRouteMatcher` path list here. Clerk Core 3
 * deprecates it, and the reasoning is sound — matching on paths can diverge from how
 * Next actually routes a request, which silently leaves a "protected" resource
 * reachable. Authorization instead lives next to the data it guards: every route that
 * touches a user's balance or spends money on a Claude call does its own
 * `const { userId } = await auth()` check and answers 401 itself.
 *
 * `/api/stocks` and `/api/forecast` stay public — they serve public market data and the
 * dashboard shows charts to signed-out visitors.
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip static files and Next.js internals
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
