/**
 * app/api/profile/check-handle/route.ts
 *
 * POST /api/profile/check-handle — check if a profile handle is available
 *
 * Request body: { handle: string }
 *
 * Responses:
 *   200 { available: boolean, handle: string }  — result (available = true/false)
 *   400 { error: string }                        — invalid format
 *
 * TODO [INTEGRATION]: Replace the hard-coded TAKEN_HANDLES set with a real DB query:
 *   const existing = await User.exists({ handle });
 *   return NextResponse.json({ available: !existing, handle });
 */

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

// Handle must be 3–20 lowercase letters, numbers, or underscores.
const HANDLE_REGEX = /^[a-z0-9_]{3,20}$/;

// Generous enough for interactive typing (debounced) but blocks scripted enumeration.
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

/**
 * Hard-coded reserved/taken handles for POC.
 * In production, query the User collection instead.
 */
const TAKEN_HANDLES = new Set([
  // Reserved system names
  "admin",
  "lokalads",
  "support",
  "help",
  "info",
  "moderator",
  "api",
  "www",
  "mail",
  "root",
  "system",
  "status",
  "bot",
  "team",
  // Demo/test accounts
  "anto27",
  "gopi",
  "john",
  "jane",
  "test",
  "user",
  "demo",
]);

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`check-handle:${ip}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return rateLimitResponse(60);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const raw =
    body !== null &&
    typeof body === "object" &&
    "handle" in body &&
    typeof (body as Record<string, unknown>).handle === "string"
      ? (body as { handle: string }).handle.trim().toLowerCase()
      : null;

  if (!raw || !HANDLE_REGEX.test(raw)) {
    return NextResponse.json(
      {
        error:
          "Invalid handle. Use 3–30 characters: lowercase letters, numbers, or underscores only.",
      },
      { status: 400 },
    );
  }

  const available = !TAKEN_HANDLES.has(raw);

  return NextResponse.json({ available, handle: raw });
}
