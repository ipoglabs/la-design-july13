import { LaButton, LaCard, LaField, LaInput } from "@/components/la";
import { DateInput } from "@/components/date-input";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/**
 * CreateAccountStep — Step 3 · Fill in account details
 *
 * TODO (API):
 *  - POST /api/auth/register — { fullName, email, password, dob, marketingConsent }
 *  - Response success → redirect to /register/verify
 *  - Response 409 (email taken) → show inline error on email field
 *  - Response 400 (validation) → map field errors to each LaField
 *  - Password strength rules: 8+ chars, uppercase, number, special char
 *  - Age gate: DOB must be 18+ years from today — DateInput emits ISO string,
 *    validate on submit: new Date(dob) <= subYears(new Date(), 18)
 *  - Terms checkbox must be checked before submit is enabled
 *
 * TODO (State):
 *  - Add Zustand or useReducer for multi-field form state
 *  - Password visibility toggle on LaInput (eye icon)
 *  - Real-time password strength indicator (4 criteria: length, uppercase, number, special)
 *
 * TODO (UX):
 *  - "Why do we ask for this?" tooltip/popover on DOB LaField hint
 *  - Terms & Conditions + Privacy Policy links open LegalDrawer or new tab
 *
 * TODO (Checkbox):
 *  - No LaCheckbox exists yet in la/ — using native <input type="checkbox"> with accent-blue-600
 *  - Replace with LaCheckbox once built in components/la/
 */
export function CreateAccountStep() {
  return (
    <div className="w-full flex items-center justify-center bg-slate-50 px-4 py-12">
      <LaCard className="w-full max-w-sm p-8 flex flex-col gap-6">
        {/* Back */}
        <Link href="/register" className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 -ml-1 w-fit">
          <ChevronLeft className="size-4" />
          Back
        </Link>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-slate-800">Create Your Account</h1>

        {/* Full Name */}
        <LaField name="fullName" label="Full Name" required>
          {/* TODO: bind value + onChange */}
          <LaInput id="fullName" placeholder="Gopinath S" />
        </LaField>

        {/* Email */}
        <LaField name="email" label="Email Address" required>
          {/* TODO: bind value + onChange + inline error state */}
          <LaInput id="email" type="email" placeholder="gopinath@email.com" />
        </LaField>

        {/* Password */}
        <LaField name="password" label="Password" required hint="8+ characters, uppercase, number, special character">
          {/* TODO: bind value + onChange + password visibility toggle */}
          {/* TODO: replace hint with real-time strength checklist component */}
          <LaInput id="password" type="password" placeholder="••••••••" />
        </LaField>

        {/* Date of Birth */}
        <LaField name="dob" label="Date of Birth" required hint="Why do we ask for this?">
          {/* TODO: "Why do we ask for this?" → open tooltip/popover on hint click */}
          {/* TODO: bind onChange → validate age >= 18 on submit */}
          {/* DateInput emits ISO string "YYYY-MM-DD" or null */}
          <DateInput
            id="dob"
            inputFormat="DMY"
            blurDisplay="long"
          />
        </LaField>

        {/* Checkboxes */}
        {/* TODO: replace with LaCheckbox once built in components/la/ */}
        <div className="flex flex-col gap-3">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" className="mt-0.5 size-4 accent-blue-600 shrink-0" />
            <span className="text-sm text-slate-700">
              I agree to the{" "}
              <Link href="/terms" className="font-medium text-blue-600 hover:underline">Terms &amp; Conditions</Link>
              {" "}and{" "}
              <Link href="/privacy" className="font-medium text-blue-600 hover:underline">Privacy Policy</Link>
            </span>
          </label>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" className="mt-0.5 size-4 accent-blue-600 shrink-0" />
            <span className="text-sm text-slate-600">
              I&apos;d like to receive product updates and offers.
            </span>
          </label>
        </div>

        {/* Submit */}
        {/* TODO: disable until terms checked + form valid */}
        {/* TODO: replace Link with router.push after form submit, passing real email */}
        <Link href="/register/verify?email=gopinath%40email.com">
          <LaButton intent="primary-blue" size="big" className="w-full">
            Create Account
          </LaButton>
        </Link>

        {/* Sign in */}
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
