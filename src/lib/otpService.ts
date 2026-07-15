import dbConnect from "@/lib/db";
import Otp from "@/models/Otp";
import { sendEmail } from "@/lib/email";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

function generateCode(): string {
  // 6-digit numeric code, zero-padded (e.g. "042917")
  return Math.floor(100000 + Math.random() * 900000).toString();
}

interface SendOtpArgs {
  userId?: string; // optional — registration flow has no user yet
  channel: "email" | "phone";
  value: string; // the email address or phone number being verified
}

export async function sendOtpService({ channel, value }: SendOtpArgs) {
  await dbConnect();

  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // One active OTP per (target, channel) — overwrite any previous unexpired
  // one rather than accumulating rows, and reset attempts/lock on resend.
  await Otp.findOneAndUpdate(
    { target: value, channel },
    {
      target: value,
      channel,
      code,
      expiresAt,
      verified: false,
      attempts: 0,
      lockedUntil: null,
    },
    { upsert: true, new: true }
  );

  if (channel === "email") {
    const result = await sendEmail({
      type: "OTP",
      to: value,
      data: {
        code,
        expiresInMinutes: OTP_EXPIRY_MINUTES,
        purpose: "verify-email",
      },
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to send verification email");
    }
  } else {
    // Phone OTP delivery — this service doesn't send SMS itself. Your
    // existing /api/sms/send-otp route already handles SMS dispatch
    // separately; if you want phone OTPs to also flow through this
    // service/Otp model for consistency, wire an SMS provider call here.
    throw new Error(
      "Phone OTP delivery not implemented in otpService — use /api/sms/send-otp for phone."
    );
  }

  return { success: true };
}

interface VerifyOtpArgs {
  userId?: string;
  channel: "email" | "phone";
  value: string;
  otp: string;
}

export async function verifyOtpService({ channel, value, otp }: VerifyOtpArgs) {
  await dbConnect();

  const record = await Otp.findOne({ target: value, channel });

  if (!record) {
    throw new Error("No verification code found — request a new one.");
  }

  if (record.lockedUntil && record.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((record.lockedUntil.getTime() - Date.now()) / 60000);
    throw new Error(`Too many attempts. Try again in ${minutesLeft} minute(s).`);
  }

  if (record.expiresAt < new Date()) {
    throw new Error("This code has expired — request a new one.");
  }

  if (record.code !== otp) {
    record.attempts += 1;

    if (record.attempts >= MAX_ATTEMPTS) {
      record.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
    }
    await record.save();

    throw new Error("Incorrect code.");
  }

  record.verified = true;
  await record.save();

  return { success: true };
}