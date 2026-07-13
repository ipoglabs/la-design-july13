// ── Email Engine — Provider ───────────────────────────────────────────────────
// Thin wrapper around the email sending provider (Resend).
// This is the ONLY file that knows about Resend. Swap this file to change provider.
// All other engine files are provider-agnostic.
//
// To migrate to Cloudflare Email Workers:
//   1. Replace the Resend import + client with CF Email Workers API
//   2. Adapt sendViaProvider() to match CF API shape
//   3. Zero changes needed in index.ts, renderer.ts, or any caller

import { Resend } from "resend";
import type { EmailRenderResult, EmailSendResult } from "./types";

// ── Email format guard (task 2b) ─────────────────────────────────────────────
// Basic runtime check before we touch the provider.
// Catches obvious mistakes (empty string, missing @) without a heavy validation lib.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

// ── Resend client ─────────────────────────────────────────────────────────────
// Lazily initialised — only created when first email is sent.
// Throws clearly if RESEND_API_KEY is missing rather than silently failing.
//
// TODO(dev — before first real send):
//   1. Sign up at https://resend.com and get a free API key
//   2. Add RESEND_API_KEY=re_... to .env.local
//   3. Add EMAIL_FROM=no-reply@yourdomain.com to .env.local
//   4. Verify your sending domain in the Resend dashboard
//      (for testing only, Resend's onboarding@resend.dev works without verification)
//   5. Set NEXT_PUBLIC_APP_URL=https://yourdomain.com in production env
let _client: Resend | null = null;

function getClient(): Resend {
  if (!_client) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "[EmailEngine] RESEND_API_KEY is not set. Add it to .env.local to send emails."
      );
    }
    _client = new Resend(apiKey);
  }
  return _client;
}

// ── Send function ─────────────────────────────────────────────────────────────

export async function sendViaProvider(
  to: string,
  render: EmailRenderResult
): Promise<EmailSendResult> {
  // Runtime email format guard
  if (!isValidEmail(to)) {
    return { success: false, error: `Invalid recipient address: "${to}"` };
  }

  const from = process.env.EMAIL_FROM ?? "no-reply@lokalads.com";

  try {
    const client = getClient();
    const { error } = await client.emails.send({
      from,
      to,
      subject: render.subject,
      html: render.html,
      text: render.text,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown provider error";
    return { success: false, error: message };
  }
}
