import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPrivate = createRouteMatcher(["/shop(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPrivate(req)) await auth.protect();
});

export const config = {
  matcher: ["/((?!_next|photos|.*\\..*).*)", "/(api|trpc)(.*)"],
};
