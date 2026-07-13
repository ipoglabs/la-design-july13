"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { OtpInput } from "@/components/ui/otp-input";
import { LaButton, LaCard } from "@/components/la";
import { useResendTimer } from "@/lib/hooks/useResendTimer";
import { maskEmail } from "@/lib/utils";
import { VALID_OTP } from "@/lib/constants";

interface Props {
  /** Email collected at /register/create — passed via searchParams */
  email: string;
}

/**
 * VerifyEmailStep — Step 4 · OTP verification
 *
 * Email is already known from /register/create — we never ask for it again.
 * Page flow: /register/create → /register/verify?email=xxx → this step.
 *
 * TODO (API):
 *  - On mount: POST /api/auth/send-email-otp { email } — trigger OTP send automatically
 *  - handleOtpComplete: POST /api/auth/verify-email-otp { email, otp }
 *    → success: router.push("/register/success")
 *    → 400/401: setOtpError(true)
 *  - handleResend: POST /api/auth/send-email-otp { email } — resend OTP
 *  - Rate-limit resend server-side (60s cooldown also enforced client-side via useResendTimer)
 *
 * TODO (State):
 *  - Pass email via auth store (Zustand) instead of URL param before going to production
 *    (URL param is fine for POC but exposes email in browser history)
 *
 * TODO (Change Email):
 *  - "Change Email" → router.push("/register/create") — user corrects email and resubmits
 */
export function VerifyEmailStep({ email }: Props) {
  const router = useRouter();
  const [otpError, setOtpError] = useState(false);
  const [otpErrorMsg, setOtpErrorMsg] = useState("");
  const [verifying, setVerifying] = useState(false);
  const { seconds, enabled, reset } = useResendTimer(60);

  function handleOtpComplete(otp: string) {
    setVerifying(true);
    // TODO: [API] replace with POST /api/auth/verify-email-otp { email, otp }
    setTimeout(() => {
      setVerifying(false);
      if (otp === VALID_OTP) {
        router.push("/register/success");
      } else {
        setOtpError(true);
        setOtpErrorMsg("Incorrect code. Please try again.");
      }
    }, 700);
  }

  const handleOtpErrorCleared = useCallback(() => {
    setOtpError(false);
    setOtpErrorMsg("");
  }, []);

  function handleResend() {
    reset();
    // TODO: [API] POST /api/auth/send-email-otp { email }
  }

  return (
    <div className="w-full flex items-center justify-center bg-slate-50 px-4 py-12">
      <LaCard className="w-full max-w-sm p-8 flex flex-col gap-5">

        {/* Heading */}
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-slate-800">Enter the 6-digit code</h1>
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm text-slate-600">
              Sent to <span className="font-medium text-slate-800">{maskEmail(email, "partial")}</span>
            </p>
            <span className="text-slate-400">·</span>
            <button
              type="button"
              onClick={() => router.push("/register/create")}
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              Change
            </button>
          </div>
        </div>

        {/* OTP input */}
        <OtpInput
          error={otpError}
          disabled={verifying}
          onComplete={handleOtpComplete}
          onErrorCleared={handleOtpErrorCleared}
        />

        {/* Status messages */}
        {verifying && <p className="text-sm text-slate-500">Verifying&hellip;</p>}
        {otpErrorMsg && <p className="text-sm text-rose-600">{otpErrorMsg}</p>}

        {/* Resend */}
        <div className="flex items-center gap-1.5">
          <p className="text-sm text-slate-500">Didn&apos;t receive it?</p>
          {enabled ? (
            <button
              type="button"
              onClick={handleResend}
              className="text-sm font-semibold text-slate-800 hover:underline"
            >
              Resend
            </button>
          ) : (
            <p className="text-sm text-slate-500">
              Resend in <span className="font-bold text-slate-800">{seconds}s</span>
            </p>
          )}
        </div>

        {/* Demo hint — remove before production */}
        {/* TODO: REMOVE — dev/POC only */}
        <p className="text-sm text-slate-400 text-center">
          Demo OTP: <span className="font-medium">{VALID_OTP}</span>
        </p>

    </LaCard>
    </div>
  );
}
