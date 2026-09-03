import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED = [
  "/dashboard",
  "/new",
  "/studio",
  "/projects",
  "/templates",
  "/exports",
  "/profile",
  "/settings",
  "/admin",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }
  if (!req.cookies.get("access_token")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
