/**
 * resolveIdentity — shared by Login's MethodStep (Google/Apple) and
 * VerifyStep (Magic Link/Phone OTP) — the one fork point both call right
 * after identity is proven.
 *
 * Calls `POST /api/auth/resolve-identity` (passing the `proof` token
 * minted by whichever identity-proof route ran just before this — see
 * `lib/auth-proof.ts`) and then either:
 *   - `matched: true`  → shows a welcome-back toast, redirects to
 *     `redirectTarget` (the `?redirect=` param or `/`)
 *   - `matched: false` → hands off into the shared `onboardingStore`
 *     (Register's store, renamed 2026-07-16 — see its header) via
 *     `setMethod` + `markAccountCreated`, then redirects to
 *     `/register/details` to complete the still-missing DOB/Gender/Role.
 *     This is intentional, not a bug — see `onboardingStore.ts` header
 *     and `DetailsStep.tsx`/`RoleStep.tsx` mount-guard comments.
 *
 * 2026-07-16 audit fix: for `magic_link`/`phone_otp`, this also calls
 * `setVerified(true)` on the shared store before handing off — without
 * it, `DetailsStep`'s mount guard (which requires `verified` for these
 * two methods) bounced the user straight back to `/register/verify` for
 * a second, never-actually-(re)sent code. Google/Apple never verify, so
 * this is a no-op for them either way.
 *
 * Also propagates the raw `?redirect=` param (not just the "/" fallback)
 * into the no-match hand-off, so a user arriving via e.g.
 * `/login?redirect=/post` still lands on `/post` after completing
 * Register's Details/Role steps, instead of losing the target.
 */
import { toast } from "sonner";
import type { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/lib/stores/onboardingStore";
import type { SignupMethod } from "@/lib/stores/loginStore";
import { withRedirectParam } from "@/lib/utils";

interface ResolveIdentityParams {
  method: SignupMethod;
  identifier: string | null;
  fullName?: string;
  proof: string;
  /** Raw `?redirect=` value, or null if absent — distinct from `redirectTarget`. */
  redirectParam: string | null;
  redirectTarget: string;
  router: ReturnType<typeof useRouter>;
}

export async function resolveIdentity({
  method,
  identifier,
  fullName,
  proof,
  redirectParam,
  redirectTarget,
  router,
}: ResolveIdentityParams): Promise<void> {
  const res = await fetch("/api/auth/resolve-identity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method, identifier, fullName, proof }),
  });
  if (!res.ok) throw new Error(`resolve-identity failed (${res.status})`);
  const { data } = (await res.json()) as { data: { matched: boolean } };

  if (data.matched) {
    const firstName = fullName?.trim().split(/\s+/)[0] || "back";
    toast.success(`Welcome ${firstName === "back" ? "back" : firstName}!`);
    router.push(redirectTarget);
    return;
  }

  // No matching account — hand off into the shared onboarding store and
  // converge onto Register's own Details/Role screens.
  const { setMethod, setVerified, markAccountCreated } = useOnboardingStore.getState();
  setMethod(method, identifier);
  if (method === "magic_link" || method === "phone_otp") {
    setVerified(true);
  }
  markAccountCreated(fullName);
  router.push(withRedirectParam("/register/details", redirectParam));
}
