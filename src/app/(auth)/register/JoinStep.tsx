import { LaButton } from "@/components/la";
import { LaCard } from "@/components/la";
import { LaSeparator } from "@/components/la";
import Link from "next/link";

/**
 * JoinStep — Step 2 · Join / Welcome screen
 *
 * TODO (API):
 *  - Google OAuth: integrate next-auth or custom OAuth flow (provider: google)
 *  - Apple OAuth: integrate next-auth or custom OAuth flow (provider: apple)
 *  - "Continue with Email" → navigate to /register/create (no API needed, client nav)
 *  - POST /api/auth/social — handle social sign-in tokens server-side
 */
export function JoinStep() {
  return (
    <div className="w-full flex items-center justify-center bg-slate-50 px-4 py-12">
      <LaCard className="w-full max-w-sm p-8 flex flex-col gap-6">
        {/* Heading */}
        <div className="flex flex-col gap-1 text-center">
          <h1 className="text-2xl font-bold text-slate-800">Join LokalAds</h1>
          <p className="text-sm text-slate-600">
            Create your free account to buy, sell and connect locally.
          </p>
        </div>

        {/* Social auth */}
        {/* TODO: wire up Google OAuth */}
        <LaButton intent="outline" size="big" className="w-full gap-3">
          {/* TODO: replace with actual Google icon */}
          <span className="text-base">G</span>
          Continue with Google
        </LaButton>

        {/* TODO: wire up Apple OAuth */}
        <LaButton intent="outline" size="big" className="w-full gap-3">
          {/* TODO: replace with actual Apple icon */}
          <span className="text-base"></span>
          Continue with Apple
        </LaButton>

        <LaSeparator label="or" />

        {/* Email path */}
        <Link href="/register/create" className="w-full">
          <LaButton intent="primary" size="big" className="w-full">
            Continue with Email
          </LaButton>
        </Link>

        {/* Sign in link */}
        <p className="text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
    </LaCard>
    </div>
  );
}
