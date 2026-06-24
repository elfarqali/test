import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session-edge";

// ═════════════════════════════════════════════════════════════════════════════
// ULTRA-MINIMAL PROXY — emergency bandwidth mode
// ═════════════════════════════════════════════════════════════════════════════
// GOAL: Block all non-browser traffic.  Pass browser traffic through instantly.
// No session decoding, no DB calls, no computation for public pages.

// ── Known bot patterns (hard block with 403) ─────────────────────────────────
const BOT_RE =
    /bot|crawl|spider|slurp|archive|scraper|Claude|GPT|CCBot|Bytespider|ChatGPT|Semrush|Ahrefs|DotBot|Petal|MJ12|DataForSeo|BLEX|Sogou|Exabot|ia_archiver|curl|wget|python|axios|node-fetch|go-http|java\/|scrapy|httpx|aiohttp|undici|got\/|HeadlessChrome|PhantomJS|Playwright|Puppeteer|libwww|lwp-|http_request|fetch\/|okhttp|ahc\//i;

// Returns a fresh 403 for each blocked request
function blocked() {
    return new NextResponse("Forbidden", {
        status: 403,
        headers: { "Cache-Control": "public, max-age=86400" },
    });
}

// ── Auth routes ──────────────────────────────────────────────────────────────
const AUTH_REQUIRED = ["/admin", "/profile", "/settings", "/history"];
const AUTH_PAGES = ["/signin", "/signup"];

export async function middleware(req: NextRequest) {
    const ua = req.headers.get("user-agent") ?? "";
    const { pathname } = req.nextUrl;

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. Block empty / short user-agents (headless scrapers, bots, curl)
    // ═══════════════════════════════════════════════════════════════════════════
    if (!ua || ua.length < 20) {
        return blocked();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. Block ALL non-browser user agents
    // ═══════════════════════════════════════════════════════════════════════════
    if (BOT_RE.test(ua)) {
        return blocked();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. API routes — block bots (already caught above), pass through for
    //    browsers.  CDN caching on the API response handles the rest.
    // ═══════════════════════════════════════════════════════════════════════════
    if (pathname.startsWith("/api/")) {
        return NextResponse.next();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. Public pages — return IMMEDIATELY.  No session check.
    //    Pages are fully static (force-static + revalidate=false).
    //    CDN serves them directly.  This proxy call is essentially free.
    // ═══════════════════════════════════════════════════════════════════════════
    if (
        pathname === "/" ||
        pathname.startsWith("/movie/") ||
        pathname.startsWith("/tv/") ||
        pathname.startsWith("/movies") ||
        pathname.startsWith("/series") ||
        pathname.startsWith("/trending") ||
        pathname.startsWith("/popular") ||
        pathname.startsWith("/search") ||
        pathname.startsWith("/live") ||
        pathname.startsWith("/discussions") ||
        pathname.startsWith("/adblock")
    ) {
        return NextResponse.next();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 5. Auth-gated routes — ONLY place we decode JWT
    // ═══════════════════════════════════════════════════════════════════════════
    const needsAuth = AUTH_REQUIRED.some((p) => pathname.startsWith(p));
    const isAuthPage = AUTH_PAGES.includes(pathname);

    if (needsAuth || isAuthPage) {
        const session = await getSessionFromRequest(req);

        if (pathname.startsWith("/admin") && (!session || session.role !== "ADMIN")) {
            const url = req.nextUrl.clone();
            url.pathname = "/signin";
            url.searchParams.set("redirect", pathname);
            return NextResponse.redirect(url);
        }

        if (needsAuth && !pathname.startsWith("/admin") && !session) {
            const url = req.nextUrl.clone();
            url.pathname = "/signin";
            url.searchParams.set("redirect", pathname);
            return NextResponse.redirect(url);
        }

        if (isAuthPage && session) {
            return NextResponse.redirect(new URL("/", req.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/admin/:path*",
        "/profile/:path*",
        "/settings/:path*",
        "/history/:path*",
        "/signin",
        "/signup",
        "/api/:path*",
        "/movie/:path*",
        "/tv/:path*",
        "/",
        "/movies/:path*",
        "/series/:path*",
        "/trending/:path*",
        "/popular/:path*",
        "/search/:path*",
        "/live/:path*",
        "/discussions/:path*",
    ],
};
