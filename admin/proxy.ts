import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// UX-level gate only: bounce clearly-unauthenticated visitors to /login.
// Real authorization is requireAdmin*() in every page and route handler —
// this cannot verify the session or the ADMIN_EMAILS allowlist.
export function proxy(request: NextRequest) {
  const hasSession = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
  if (!hasSession) {
    const login = new URL("/login", request.url);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  // Pages only: login, the auth callback, and framework assets are public;
  // API routes are excluded so requireAdminApi can answer 401/403 JSON
  // instead of a redirect.
  matcher: ["/((?!login|auth|api|_next/static|_next/image|favicon.ico).*)"],
};
