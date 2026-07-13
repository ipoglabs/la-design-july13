import { LaButton } from "@/components/la";
import { LaCard } from "@/components/la";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

/**
 * AccountCreatedStep — Step 5 · Success / Welcome screen
 *
 * TODO (API):
 *  - This page is reached after email verification token is validated
 *  - GET /api/auth/verify-email?token=xxx → validates token → sets auth session/cookie
 *  - On load: confirm session is active (redirect to /login if not)
 *  - POST /api/auth/session — return user object to display personalised greeting
 *
 * TODO (UX):
 *  - Replace "Welcome to LokalAds!" with personalised "Welcome, {firstName}!"
 *  - Confetti or subtle animation on success (optional delight layer)
 *  - Auto-advance to /register/next after 3s (with cancel option)
 */
export function AccountCreatedStep() {
  // TODO: read firstName from session/store
  const firstName = "Gopinath"; // placeholder

  return (
    <div className="w-full flex items-center justify-center bg-slate-50 px-4 py-12">
      <LaCard className="w-full max-w-sm p-8 flex flex-col items-center gap-6 text-center">
        {/* Success icon */}
        <div className="size-20 rounded-full bg-green-50 flex items-center justify-center">
          <CheckCircle className="size-10 text-green-600" />
        </div>

        {/* Heading */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-slate-800">
            Welcome to LokalAds, {firstName}!
          </h1>
          <p className="text-base text-slate-600">
            Your account has been successfully created.
          </p>
          <p className="text-sm text-slate-600">
            Your account is now ready to help you buy, sell and connect locally.
          </p>
        </div>

        {/* CTA */}
        <Link href="/register/next" className="w-full">
          <LaButton intent="primary" size="big" className="w-full">
            Continue
          </LaButton>
        </Link>
    </LaCard>
    </div>
  );
}
