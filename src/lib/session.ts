import type { AuthUser } from "@/types/auth";

/**
 * Returns the authenticated user from the session, or null if not logged in.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TODO [AUTH — BEFORE PRODUCTION]: Replace this stub with your real auth provider.
 *
 * Option A — NextAuth v5:
 *   import { auth } from "@/auth";
 *   const session = await auth();
 *   if (!session?.user) return null;
 *   return { id: session.user.id, name: session.user.name ?? "", ... } satisfies AuthUser;
 *
 * Option B — Lucia / better-auth:
 *   const { user } = await validateRequest();
 *   if (!user) return null;
 *   return { id: user.id, name: user.name, ... } satisfies AuthUser;
 *
 * AuthUser shape (src/types/auth.ts):
 *   { id, name, initials, avatarUrl?, role: "member"|"admin", status }
 *
 * Required cookie settings (set on login):
 *   httpOnly: true  — XSS protection (JS cannot read)
 *   secure: true    — HTTPS only in production
 *   sameSite: "lax" — CSRF protection
 *   maxAge: 60 * 60 * 24 * 30  — 30 days
 *
 * Password reset invalidation:
 *   Increment users.sessionVersion in DB on reset.
 *   Compare JWT sessionVersion with DB value here — return null if mismatch.
 *
 * This function is safe to call from Server Components and root layouts.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * POC MODE — returns a mock user so the full app shell (AppHeader avatar,
 * dashboard pages) can be reviewed without real auth.
 * Remove the mock return below and uncomment your real provider above.
 */
export async function getSession(): Promise<AuthUser | null> {
  // ─── POC MOCK — remove this block when real auth is wired ────────────────
  // TODO [AUTH — BEFORE PRODUCTION]: Delete the 5 lines below.
  return {
    id:       "mock-user-001",
    name:     "Gopinath Krishnamoorthi",
    initials: "GK",
    role:     "member",
    status:   "online",
  } satisfies AuthUser;
  // ─────────────────────────────────────────────────────────────────────────
}

