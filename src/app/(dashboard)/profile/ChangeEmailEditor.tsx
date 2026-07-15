"use client";

/**
 * ChangeEmailEditor — 4-stage flow for changing the account email in
 * Contact Information on /profile.
 *
 * Stage 1 "enter-email":       new email entry + availability check.
 * Stage 2 "verify-new-email":  OtpVerify — proves the user owns the
 *   new address.
 * Stage 3 "verify-phone":      OtpVerify — second factor via the
 *   account's primary phone (guaranteed to exist, see standing rule:
 *   "Primary phone number is mandatory, always"). No back-link here — once
 *   the new email is verified, the only way out is Cancel (discards
 *   everything) or completing this step.
 * Stage 4 "confirm":           real review screen (shows the new email once
 *   more + explicit "Confirm Change") — never auto-commits right after the
 *   phone OTP passes.
 *
 * Cancel at any stage discards everything; nothing is saved on the account
 * until Stage 4's Confirm Change succeeds. Design locked 2026-07-14.
 *
 * TODO [INTEGRATION]: replace the setTimeout mocks with real endpoints:
 *   POST  /api/profile/email/check-availability { email }
 *   POST  /api/profile/email/send-otp            { email }
 *   POST  /api/profile/email/verify-otp          { email, otp }
 *   POST  /api/profile/phone/send-otp             (resend — reuse existing)
 *   POST  /api/profile/phone/verify-otp           { phone, otp } (reuse existing)
 *   PATCH /api/profile/email                      { email } — commits the
 *     change and fires a fire-and-forget security notice to the OLD email.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LaInput } from "@/components/la";
import { OtpVerify } from "@/components/otp-verify";
import { VALID_OTP } from "@/lib/constants";
import { isValidEmail } from "@/lib/validation";
import { ResponsiveEditor } from "./ResponsiveEditor";

// Demo-only: pretend this address is already taken, so the availability
// check has something to reject. Real check happens server-side.
const DEMO_TAKEN_EMAIL = "taken@example.com";

type Stage = "enter-email" | "verify-new-email" | "verify-phone" | "confirm";

const STAGE_TITLES: Record<Stage, string> = {
  "enter-email": "Change Email Address",
  "verify-new-email": "Verify New Email",
  "verify-phone": "Verify Your Identity",
  confirm: "Confirm Email Change",
};

export function ChangeEmailEditor({
  open,
  onOpenChange,
  currentEmail,
  primaryPhone,
  onVerified,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail: string;
  /** The account's primary phone, used as the second-factor destination in Stage 3. Always present per the primary-phone-mandatory rule. */
  primaryPhone: string;
  onVerified: (newEmail: string) => void;
}) {
  const [stage, setStage] = useState<Stage>("enter-email");
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [otpError, setOtpError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fresh state every time the dialog opens
  useEffect(() => {
    if (open) {
      setStage("enter-email");
      setNewEmail("");
      setEmailError("");
      setCheckingAvailability(false);
      setOtpError(false);
      setVerifying(false);
      setSaving(false);
    }
  }, [open]);

  function handleSendCode() {
    const trimmed = newEmail.trim();
    if (!trimmed) {
      setEmailError("Please enter your new email address.");
      return;
    }
    if (!isValidEmail(trimmed)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    if (trimmed.toLowerCase() === currentEmail.toLowerCase()) {
      setEmailError("This is already your current email address.");
      return;
    }
    setEmailError("");
    setCheckingAvailability(true);
    // TODO [INTEGRATION]: POST /api/profile/email/check-availability
    setTimeout(() => {
      setCheckingAvailability(false);
      if (trimmed.toLowerCase() === DEMO_TAKEN_EMAIL) {
        setEmailError("This email is already registered to another account.");
        return;
      }
      // TODO [INTEGRATION]: POST /api/profile/email/send-otp
      setStage("verify-new-email");
    }, 600);
  }

  function handleNewEmailOtpComplete(otp: string) {
    setVerifying(true);
    // TODO [INTEGRATION]: POST /api/profile/email/verify-otp
    setTimeout(() => {
      setVerifying(false);
      if (otp === VALID_OTP) {
        setOtpError(false);
        setStage("verify-phone");
      } else {
        setOtpError(true);
      }
    }, 700);
  }

  function handlePhoneOtpComplete(otp: string) {
    setVerifying(true);
    // TODO [INTEGRATION]: POST /api/profile/phone/verify-otp
    setTimeout(() => {
      setVerifying(false);
      if (otp === VALID_OTP) {
        setOtpError(false);
        setStage("confirm");
      } else {
        setOtpError(true);
      }
    }, 700);
  }

  function handleOtpErrorCleared() {
    setOtpError(false);
  }

  function handleResendOtp() {
    // TODO [INTEGRATION]: resend for the current stage —
    //   verify-new-email → POST /api/profile/email/send-otp
    //   verify-phone      → POST /api/profile/phone/send-otp
    toast.info("Code resent");
  }

  function handleBackToEnterEmail() {
    setStage("enter-email");
    setOtpError(false);
  }

  function handleConfirm() {
    setSaving(true);
    // TODO [INTEGRATION]: PATCH /api/profile/email { email: newEmail }
    //   Server also fires a fire-and-forget security notice to the OLD
    //   email address confirming this change was made.
    setTimeout(() => {
      setSaving(false);
      onVerified(newEmail.trim());
    }, 700);
  }

  const trimmedNewEmail = newEmail.trim();

  return (
    <ResponsiveEditor
      open={open}
      onOpenChange={onOpenChange}
      title={STAGE_TITLES[stage]}
      onSave={stage === "confirm" ? handleConfirm : handleSendCode}
      saveLabel={
        stage === "confirm"
          ? saving
            ? "Saving..."
            : "Confirm Change"
          : checkingAvailability
            ? "Checking..."
            : "Send code"
      }
      saveDisabled={stage === "confirm" ? saving : checkingAvailability}
      hideSaveButton={stage === "verify-new-email" || stage === "verify-phone"}
    >
      {stage === "enter-email" && (
        <div className="space-y-4 px-6 py-5">
          <p className="text-sm leading-snug text-slate-500">
            Enter the new email address you&apos;d like to use. We&apos;ll send a code to confirm
            it&apos;s yours.
          </p>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">New Email Address</p>
            <LaInput
              type="email"
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                if (emailError) setEmailError("");
              }}
              placeholder="you@example.com"
              autoComplete="email"
              status={emailError ? "error" : "default"}
            />
          </div>
          {emailError && (
            <p role="alert" className="text-sm font-medium text-rose-600">
              {emailError}
            </p>
          )}
        </div>
      )}

      {stage === "verify-new-email" && (
        <div className="px-6 py-5">
          <OtpVerify
            destination={trimmedNewEmail}
            demoCode={VALID_OTP}
            verifying={verifying}
            error={otpError}
            onErrorCleared={handleOtpErrorCleared}
            onComplete={handleNewEmailOtpComplete}
            onResend={handleResendOtp}
            backLabel="Change email"
            onBack={handleBackToEnterEmail}
          />
        </div>
      )}

      {stage === "verify-phone" && (
        <div className="space-y-4 px-6 py-5">
          <p className="text-center text-sm text-slate-600">
            For your security, we need to confirm this change with your primary phone number.
          </p>
          <OtpVerify
            destination={primaryPhone}
            demoCode={VALID_OTP}
            verifying={verifying}
            error={otpError}
            onErrorCleared={handleOtpErrorCleared}
            onComplete={handlePhoneOtpComplete}
            onResend={handleResendOtp}
          />
        </div>
      )}

      {stage === "confirm" && (
        <div className="space-y-3 px-6 py-5">
          <p className="text-sm text-slate-700">You&apos;re changing your account email to:</p>
          <p className="text-lg font-semibold text-slate-900">{trimmedNewEmail}</p>
          <p className="text-sm text-slate-500">
            We&apos;ll send a security alert to your old email ({currentEmail}) letting you know
            this change was made.
          </p>
        </div>
      )}
    </ResponsiveEditor>
  );
}
