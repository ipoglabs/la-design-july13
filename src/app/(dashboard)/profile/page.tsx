"use client";

/**
 * /profile — Private Profile dashboard page
 *
 * AUTH GUARD (add when real auth ships):
 *   Convert the default export to an async Server Component:
 *     const session = await getSession();
 *     if (!session) redirect("/login?redirect=/profile");
 *     return <ProfileClient user={session.user} />;
 *
 *   Until then, this renders with mock data so the full UX can be validated in POC.
 */

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { ReactNode } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Loader2,
  MapPin,
  Plus,
  XIcon,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Lock,
  Check,
  QrCode,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { useDeleteAccountStore } from "@/lib/stores/deleteAccountStore";
import { Avatar } from "@/components/avatar/Avatar";
import { LaButton, LaCard, LaInput, LaRadio, LaSwitch } from "@/components/la";
import {
  isAgeValid,
  isMeaningfulText,
  isValidFullName,
  isValidPassword,
  PASSWORD_MIN_LENGTH,
  sanitizeFreeTextInput,
  sanitizeFullNameInput,
} from "@/lib/validation";
import { LocationPicker, type LocationValue } from "@/components/location-picker";
import { DateInput } from "@/components/date-input";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import { isStageFeatureEnabled } from "@/config";
import { OtpInput } from "@/components/ui/otp-input";
import { VALID_OTP } from "@/lib/constants";
import {
  ROLES,
  BASE_ROLE,
  MAX_ROLES_PER_ACCOUNT,
  CUSTOM_ROLE_MIN_LENGTH,
  CUSTOM_ROLE_MAX_LENGTH,
  SPECIALTY_MAX_LENGTH,
  INTENT_OPTIONS,
  DEFAULT_INTENT,
  getRoleLabel,
  getIntentLabel,
  type RoleId,
  type IntentId,
} from "@/config/roles";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ── Types ──────────────────────────────────────────────────────────────────────

type BasicInfoValues = {
  fullName: string;
  dateOfBirthIso: string;
  gender: "Male" | "Female" | "Prefer not to say";
};

type ResidenceValues = {
  country: string;
  state: string;
  city: string;
};

type PhoneEntry = {
  id: string;
  number: string;
  primary: boolean;
};

type ContactValues = {
  email: string;
  emailVerified: boolean;
  phones: PhoneEntry[];
};

type SavedLocation = {
  id: number;
  flagCode: string;  // ISO 3166-1 alpha-2 lowercase, e.g. "sg", "gb", "in"
  city: string;
  region: string;
  country: string;
  primary?: boolean;
};

// ── Layout atoms ───────────────────────────────────────────────────────────────

function Section({
  label,
  actionText,
  onActionClick,
  description,
  children,
}: {
  label: string;
  actionText?: string;
  onActionClick?: () => void;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-1">
      <div className="flex items-center justify-between px-1">
        <p className="text-lg font-medium text-slate-900">{label}</p>
        {actionText && (
          <LaButton
            type="button"
            intent="link"
            size="compact"
            onClick={onActionClick}
            className="h-auto rounded-none px-0 py-0 text-sm font-semibold text-blue-700 hover:text-blue-800"
          >
            {actionText}
          </LaButton>
        )}
      </div>
      {description && (
        <p className="px-1 text-sm text-slate-700">{description}</p>
      )}
      <LaCard className="overflow-hidden">{children}</LaCard>
    </section>
  );
}

function InfoRow({
  label,
  value,
  subtext,
  subtextHref,
}: {
  label: string;
  value: string;
  subtext?: string;
  /** When provided, renders `subtext` as a link opening in a new tab (e.g. the public profile URL). */
  subtextHref?: string;
}) {
  return (
    <div className="border-b border-slate-200 px-4 py-3.5 last:border-0">
      <p className="text-sm font-medium uppercase tracking-wide text-slate-700">{label}</p>
      <p className="mt-0.5 text-base font-medium text-slate-900">{value}</p>
      {subtext && subtextHref ? (
        <a
          href={subtextHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 inline-block text-sm text-blue-800 underline underline-offset-2 hover:text-blue-900"
        >
          {subtext}
        </a>
      ) : (
        subtext && <p className="mt-0.5 text-sm text-slate-600">{subtext}</p>
      )}
    </div>
  );
}

function ContactRow({
  label,
  value,
  verified,
  onEdit,
  onRemove,
  editLabel = "Edit",
}: {
  label: string;
  value: string;
  verified?: boolean;
  onEdit?: () => void;
  onRemove?: () => void;
  /** Set to a non-"Edit" label (e.g. "Locked") to render a muted, clearly-non-interactive affordance instead of a normal action button. */
  editLabel?: string;
}) {
  const isLocked = editLabel !== "Edit";
  return (
    <div className="flex min-h-15 items-center justify-between gap-4 border-b border-slate-200 px-4 py-3.5 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-2">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-600">{label}</p>
          {verified && (
            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-sm font-semibold text-emerald-700">
              Verified
            </span>
          )}
        </div>
        <p className="truncate text-base font-medium text-slate-900">{value}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onEdit && (
          <LaButton
            type="button"
            intent="ghost"
            size="compact"
            onClick={onEdit}
            className={cn(
              "gap-1 px-2 text-sm font-semibold",
              isLocked
                ? "text-slate-400 hover:bg-transparent hover:text-slate-500"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            )}
          >
            {isLocked && <Lock className="size-3.5" strokeWidth={2} aria-hidden="true" />}
            {editLabel}
          </LaButton>
        )}
        {onRemove && (
          <button
            type="button"
            aria-label={`Remove ${label}`}
            onClick={onRemove}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
          >
            <Trash2 className="size-4" strokeWidth={1.75} />
          </button>
        )}
      </div>
    </div>
  );
}

function SettingsRow({
  label,
  subtitle,
  badge,
  onClick,
}: {
  label: string;
  subtitle?: string;
  badge?: "coming-soon";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={badge === "coming-soon"}
      className="group flex min-h-13 w-full items-center justify-between border-b border-slate-200 px-4 py-3.5 text-left last:border-0 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="flex flex-col">
        <span className="text-base font-medium text-slate-800 transition-colors group-hover:text-slate-900">
          {label}
        </span>
        {subtitle && <span className="text-sm text-slate-500">{subtitle}</span>}
      </span>
      <div className="flex shrink-0 items-center gap-2">
        {badge === "coming-soon" && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-sm font-medium text-slate-500">
            Soon
          </span>
        )}
        {!badge && <ChevronRight className="size-4 text-slate-400" />}
      </div>
    </button>
  );
}

// ── Responsive editor wrapper ──────────────────────────────────────────────────

function ResponsiveEditor({
  open,
  onOpenChange,
  title,
  children,
  onSave,
  saveLabel = "Save Changes",
  saveDisabled = false,
  hideSaveButton = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  onSave: () => void;
  saveLabel?: string;
  saveDisabled?: boolean;
  /** Hide the primary action button — for steps where the body itself drives progress (e.g. an auto-submitting OTP field). Cancel remains available. */
  hideSaveButton?: boolean;
}) {
  const isTablet = useMediaQuery("(min-width: 768px)");

  if (isTablet) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[85vh] max-w-md flex-col gap-0 p-0" showCloseButton>
          <DialogHeader className="border-b border-slate-200 px-6 py-4">
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          <DialogFooter className="mx-0 mb-0 rounded-b-xl border-t border-slate-100 px-6 py-4">
            <LaButton type="button" intent="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </LaButton>
            {!hideSaveButton && (
              <LaButton type="button" onClick={onSave} disabled={saveDisabled}>
                {saveLabel}
              </LaButton>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} noBodyStyles shouldScaleBackground={false}>
      <DrawerContent className="max-h-[90dvh]">
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerClose asChild>
            <button
              type="button"
              className="rounded-md p-1.5 text-slate-500 opacity-70 transition-opacity hover:bg-slate-100 hover:opacity-100"
            >
              <XIcon className="size-4" />
              <span className="sr-only">Close</span>
            </button>
          </DrawerClose>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        <DrawerFooter className={cn("grid gap-3", hideSaveButton ? "grid-cols-1" : "grid-cols-2")}>
          <DrawerClose asChild>
            <LaButton type="button" intent="outline" className="w-full">
              Cancel
            </LaButton>
          </DrawerClose>
          {!hideSaveButton && (
            <LaButton
              type="button"
              onClick={onSave}
              className="w-full"
              disabled={saveDisabled}
            >
              {saveLabel}
            </LaButton>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

// ── Handle Editor ──────────────────────────────────────────────────────────────

const HANDLE_REGEX = /^[a-z0-9_]{3,20}$/;

function HandleEditor({
  open,
  onOpenChange,
  currentHandle,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentHandle: string;
  onSave: (handle: string) => void;
}) {
  const isTablet = useMediaQuery("(min-width: 768px)");
  const [draft, setDraft] = useState(currentHandle);
  const [checkState, setCheckState] = useState<"idle" | "checking" | "available" | "taken">("idle");

  // Reset to current handle each time the editor opens
  useEffect(() => {
    if (open) {
      setDraft(currentHandle);
      setCheckState("idle");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isValidFormat = HANDLE_REGEX.test(draft);
  const isUnchanged = draft === currentHandle;
  const canSave = checkState === "available";

  const handleInputChange = (raw: string) => {
    // Strip disallowed chars, enforce lowercase
    const cleaned = raw.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
    setDraft(cleaned);
  };

  // Auto-check availability as the user types (debounced) — no manual button.
  useEffect(() => {
    if (!open || !isValidFormat || isUnchanged) {
      setCheckState("idle");
      return;
    }
    setCheckState("checking");
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/profile/check-handle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handle: draft }),
          signal: controller.signal,
        });
        const data = (await res.json()) as { available: boolean };
        setCheckState(data.available ? "available" : "taken");
      } catch (err) {
        if ((err as Error).name !== "AbortError") setCheckState("idle");
      }
    }, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [draft, isValidFormat, isUnchanged, open]);

  const handleSave = () => {
    onSave(draft);
    onOpenChange(false);
  };

  const form = (
    <div className="space-y-2 px-6 py-5">
      {/* Live URL preview — read-only, sits above the input */}
      <p className="break-all text-xl text-slate-500">
        lokalads.com/<span className="font-semibold text-slate-800">{draft || "your-handle"}</span>
      </p>

      {/* Plain input — nothing but the handle itself, unambiguous to edit */}
      <div
        className={cn(
          "flex items-stretch overflow-hidden rounded-md border-[1.5px] border-gray-700/55 bg-white",
          "focus-within:bg-yellow-50 focus-within:ring-2 focus-within:ring-blue-500/25 focus-within:ring-offset-1",
          checkState === "taken" && "border-red-500"
        )}
      >
        <input
          value={draft}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="jane_smith"
          autoComplete="off"
          spellCheck={false}
          aria-label="Handle"
          className="min-w-0 flex-1 bg-transparent py-2.5 pr-2 pl-3 text-base font-medium text-gray-900 placeholder:font-normal placeholder:text-gray-500 focus:outline-none"
        />
        <span className="flex shrink-0 items-center pr-3" aria-hidden={checkState === "idle"}>
          {checkState === "checking" && <Loader2 className="size-4 animate-spin text-slate-400" />}
          {checkState === "available" && <CheckCircle2 className="size-4 text-emerald-600" />}
          {checkState === "taken" && <AlertCircle className="size-4 text-rose-500" />}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {checkState === "available" ? (
            <span className="font-medium text-emerald-700">Available</span>
          ) : checkState === "taken" ? (
            <span className="font-medium text-rose-700">Already taken — try another</span>
          ) : (
            "3–20 characters · lowercase letters, numbers, underscores"
          )}
        </p>
        <p
          className={`shrink-0 text-sm tabular-nums ${draft.length > 17 ? "font-semibold text-amber-600" : "text-slate-400"}`}
        >
          {draft.length}/20
        </p>
      </div>
    </div>
  );

  // Handle editor has custom save-disabled logic, so it doesn't use ResponsiveEditor.
  if (isTablet) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md gap-0 p-0" showCloseButton>
          <DialogHeader className="border-b border-slate-200 px-6 py-4">
            <DialogTitle>Set Your Handle</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto">{form}</div>
          <DialogFooter className="mx-0 mb-0 rounded-b-xl border-t border-slate-100 px-6 py-4">
            <LaButton type="button" intent="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </LaButton>
            <LaButton type="button" onClick={handleSave} disabled={!canSave}>
              Set Handle
            </LaButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} noBodyStyles shouldScaleBackground={false}>
      <DrawerContent className="max-h-[90dvh]">
        <DrawerHeader>
          <DrawerTitle>Set Your Handle</DrawerTitle>
          <DrawerClose asChild>
            <button
              type="button"
              className="rounded-md p-1.5 text-slate-500 opacity-70 transition-opacity hover:bg-slate-100 hover:opacity-100"
            >
              <XIcon className="size-4" />
              <span className="sr-only">Close</span>
            </button>
          </DrawerClose>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{form}</div>
        <DrawerFooter className="grid grid-cols-2 gap-3">
          <DrawerClose asChild>
            <LaButton type="button" intent="outline" className="w-full">
              Cancel
            </LaButton>
          </DrawerClose>
          <LaButton type="button" onClick={handleSave} className="w-full" disabled={!canSave}>
            Set Handle
          </LaButton>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

// ── Basic Info Editor ──────────────────────────────────────────────────────────

function formatDobLabel(iso: string): string {
  if (!iso) return "—";
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** First letter of the first two words in a name, e.g. "Gopinath Krishnamoorthi" → "GK". */
function getInitials(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0]!.charAt(0);
  const second = words.length > 1 ? words[1]!.charAt(0) : "";
  return (first + second).toUpperCase();
}

function BasicInfoEditor({
  open,
  onOpenChange,
  value,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: BasicInfoValues;
  onSave: (next: BasicInfoValues) => void;
}) {
  const [draft, setDraft] = useState<BasicInfoValues>(value);
  const [nameTouched, setNameTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(value);
      setNameTouched(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Validation ──────────────────────────────────────────────────────────
  const trimmedName = draft.fullName.trim();
  const nameError =
    trimmedName.length === 0 ? "Full name is required" :
    trimmedName.length < 2 ? "Enter at least 2 characters" :
    trimmedName.length > 60 ? "Keep it under 60 characters" :
    !isValidFullName(trimmedName) ? "Enter a valid name" :
    null;

  const isDobComplete = !!draft.dateOfBirthIso;
  const isAdult = isDobComplete && isAgeValid(draft.dateOfBirthIso, 18);
  const dobError = isDobComplete && !isAdult ? "You must be at least 18 years old" : undefined;

  const canSave = !nameError && isDobComplete && isAdult;

  const handleSave = () => {
    if (!canSave) return;
    // TODO [INTEGRATION]: PATCH /api/profile/basic-info
    //   body: { fullName: trimmedName, dateOfBirthIso: draft.dateOfBirthIso, gender: draft.gender }
    //   Server must re-validate (never trust client input) — see md/architecture/api/04-input-validation.md
    onSave({ ...draft, fullName: trimmedName });
    onOpenChange(false);
  };

  return (
    <ResponsiveEditor
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Basic Info"
      onSave={handleSave}
      saveDisabled={!canSave}
    >
      <div className="space-y-5 px-6 py-5">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Full Name</p>
          <LaInput
            value={draft.fullName}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                fullName: sanitizeFullNameInput(e.target.value).slice(0, 60),
              }))
            }
            onBlur={() => setNameTouched(true)}
            placeholder="Enter your full name"
            maxLength={60}
            status={nameTouched && nameError ? "error" : "default"}
          />
          {nameTouched && nameError && (
            <p role="alert" className="text-sm font-medium text-red-600">
              {nameError}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Date of Birth</p>
          <DateInput
            value={draft.dateOfBirthIso}
            onChange={(iso) => setDraft((prev) => ({ ...prev, dateOfBirthIso: iso ?? "" }))}
            inputClassName="h-10 rounded-md border-[1.5px] border-slate-300 bg-white"
            error={dobError}
          />
        </div>

        <div className="space-y-2.5">
          <p className="text-sm font-medium text-slate-700">Gender</p>
          <div className="flex flex-wrap gap-5">
            {(["Male", "Female", "Prefer not to say"] as const).map((g) => (
              <LaRadio
                key={g}
                name="basic-info-gender"
                value={g}
                label={g}
                checked={draft.gender === g}
                onChange={() => setDraft((prev) => ({ ...prev, gender: g }))}
              />
            ))}
          </div>
        </div>
      </div>
    </ResponsiveEditor>
  );
}

// ── Roles Editor ───────────────────────────────────────────────────────────────

/** Shape saved by RolesEditor: an optional private intent, canonical role ids
 * the user picked, an optional specialty per specializable role id, and one
 * optional free-text "say it in your own words" custom role. The implicit
 * `BASE_ROLE` (Individual) is never part of this shape — it's not a choice,
 * it's always true. */
interface RolesValue {
  /** Required — always set, defaults to "both" (the only option that's never wrong for a new account). */
  intent: IntentId;
  roleIds: RoleId[];
  specialties: Partial<Record<RoleId, string>>;
  customRole: string | null;
}

/** Role label, suffixed with its specialty when one is set (e.g. "Skilled Worker / Tradesperson · Plumber"). Ignores a specialty that's just punctuation/whitespace once sanitized — e.g. a lone "-" never shows up. */
function formatRoleBadge(id: RoleId, specialties: Partial<Record<RoleId, string>>) {
  const specialty = specialties[id]?.trim();
  return specialty && isMeaningfulText(specialty) ? `${getRoleLabel(id)} · ${specialty}` : getRoleLabel(id);
}

function RolesEditor({
  open,
  onOpenChange,
  value,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: RolesValue;
  onSave: (next: RolesValue) => void;
}) {
  const [draftIntent, setDraftIntent] = useState<IntentId>(value.intent);
  const [draftRoleIds, setDraftRoleIds] = useState<RoleId[]>(value.roleIds);
  const [draftSpecialties, setDraftSpecialties] = useState<Partial<Record<RoleId, string>>>(
    value.specialties
  );
  const [draftCustomRole, setDraftCustomRole] = useState<string | null>(value.customRole);
  const [customInput, setCustomInput] = useState("");

  useEffect(() => {
    if (open) {
      setDraftIntent(value.intent);
      setDraftRoleIds(value.roleIds);
      setDraftSpecialties(value.specialties);
      setDraftCustomRole(value.customRole);
      setCustomInput("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const additionalCount = draftRoleIds.length + (draftCustomRole ? 1 : 0);
  const atCap = additionalCount >= MAX_ROLES_PER_ACCOUNT;

  const toggleRole = (id: RoleId) => {
    setDraftRoleIds((prev) => {
      if (prev.includes(id)) {
        setDraftSpecialties((specialties) => {
          const next = { ...specialties };
          delete next[id];
          return next;
        });
        return prev.filter((r) => r !== id);
      }
      if (additionalCount >= MAX_ROLES_PER_ACCOUNT) {
        toast.info(`You can select up to ${MAX_ROLES_PER_ACCOUNT} additional roles.`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (!isMeaningfulText(trimmed) || trimmed.length < CUSTOM_ROLE_MIN_LENGTH) {
      toast.info(`Enter at least ${CUSTOM_ROLE_MIN_LENGTH} characters.`);
      return;
    }
    if (trimmed.length > CUSTOM_ROLE_MAX_LENGTH) {
      toast.info(`Keep it under ${CUSTOM_ROLE_MAX_LENGTH} characters.`);
      return;
    }
    const isDuplicate = ROLES.some((r) => r.label.toLowerCase() === trimmed.toLowerCase());
    if (isDuplicate) {
      toast.info("That role is already in the list above — select it instead.");
      return;
    }
    if (additionalCount >= MAX_ROLES_PER_ACCOUNT) {
      toast.info(`You can select up to ${MAX_ROLES_PER_ACCOUNT} additional roles.`);
      return;
    }
    setDraftCustomRole(trimmed);
    setCustomInput("");
  };

  const handleSave = () => {
    // Drop any specialty that's empty or just punctuation/whitespace once
    // sanitized (e.g. a lone "-") — never persist garbage, even though the
    // display layer already guards against showing it.
    const cleanSpecialties: Partial<Record<RoleId, string>> = {};
    for (const [id, value] of Object.entries(draftSpecialties)) {
      const trimmed = value?.trim();
      if (trimmed && isMeaningfulText(trimmed)) cleanSpecialties[id as RoleId] = trimmed;
    }
    onSave({
      intent: draftIntent,
      roleIds: draftRoleIds,
      specialties: cleanSpecialties,
      customRole: draftCustomRole,
    });
    onOpenChange(false);
  };

  return (
    <ResponsiveEditor
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Your Roles"
      onSave={handleSave}
    >
      <div className="space-y-4 px-6 py-5">

        {/* Private intent — deliberately styled neutral/slate, never blue like the
            public hat badges below, so it visually reads as "context for us", not
            "credential shown to others". */}
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-700">Why are you here?</p>
          <div className="flex flex-wrap gap-2">
            {INTENT_OPTIONS.map((opt) => {
              const selected = draftIntent === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setDraftIntent(opt.id)}
                  className={cn(
                    "rounded-full border-[1.5px] px-3.5 py-1.5 text-sm font-semibold transition-colors",
                    selected
                      ? "border-slate-700 bg-slate-700 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 flex items-center gap-1 text-sm text-slate-500">
            <Lock className="size-3.5" />
            Private — helps us personalize your experience, never shown on your profile
          </p>
        </div>

        {/* Live "review" strip — updates as you tap, doubles as the review step */}
        {(draftRoleIds.length > 0 || draftCustomRole) && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-3">
            <div className="flex flex-wrap gap-1.5">
              {draftRoleIds.map((id) => (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-600 py-1 pl-3 pr-1.5 text-sm font-semibold text-white"
                >
                  {formatRoleBadge(id, draftSpecialties)}
                  <button
                    type="button"
                    onClick={() => toggleRole(id)}
                    aria-label={`Remove ${getRoleLabel(id)}`}
                    className="rounded-full p-0.5 hover:bg-blue-700"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </span>
              ))}
              {draftCustomRole && (
                <span className="inline-flex items-center gap-1 rounded-full border-2 border-dashed border-blue-600 bg-white py-1 pl-3 pr-1.5 text-sm font-semibold text-blue-700">
                  {draftCustomRole}
                  <button
                    type="button"
                    onClick={() => setDraftCustomRole(null)}
                    aria-label={`Remove ${draftCustomRole}`}
                    className="rounded-full p-0.5 hover:bg-blue-100"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </span>
              )}
            </div>
            <p className="mt-2 text-sm font-medium text-blue-700">
              {additionalCount} of {MAX_ROLES_PER_ACCOUNT} additional roles
            </p>
          </div>
        )}

        <div>
          <p className="mb-2 text-sm font-semibold text-slate-700">
            You&apos;re always an {BASE_ROLE.label} — add any extra hats you wear
          </p>
          <div className="flex flex-col gap-2">
            {ROLES.map((role) => {
              const id = role.id as RoleId;
              const selected = draftRoleIds.includes(id);
              const disabled = !selected && atCap;
              return (
                <div
                  key={role.id}
                  className={cn(
                    "rounded-xl border-[1.5px] transition-colors",
                    selected
                      ? "border-blue-500 bg-blue-50"
                      : disabled
                        ? "border-slate-200 bg-slate-50 opacity-60"
                        : "border-slate-300 bg-white hover:border-slate-400"
                  )}
                >
                  <button
                    type="button"
                    aria-pressed={selected}
                    disabled={disabled}
                    onClick={() => toggleRole(id)}
                    className="w-full px-3.5 py-2.5 text-left"
                  >
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        selected ? "text-blue-700" : "text-slate-800"
                      )}
                    >
                      {role.label}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">{role.description}</p>
                  </button>
                  {/* Inline specialty — surfaced immediately under the role that needs
                      it, so it's impossible to miss (unlike the unrelated free-text box
                      further down, which is only for roles not in this list at all). */}
                  {selected && role.specializable && (
                    <div className="border-t border-blue-200 px-3.5 py-2.5">
                      <p className="mb-1.5 text-sm font-medium text-slate-700">
                        What&apos;s your specialty?
                      </p>
                      <LaInput
                        value={draftSpecialties[id] ?? ""}
                        onChange={(e) => {
                          const clean = sanitizeFreeTextInput(e.target.value).slice(
                            0,
                            SPECIALTY_MAX_LENGTH
                          );
                          setDraftSpecialties((prev) => ({ ...prev, [id]: clean }));
                        }}
                        placeholder={role.specialtyPlaceholder ?? "Add your specialty"}
                        maxLength={SPECIALTY_MAX_LENGTH}
                        className="bg-white"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-slate-700">
            Don&apos;t see your exact role? Say it in your own words
          </p>
          {draftCustomRole ? (
            <p className="text-sm text-slate-500">
              Remove &ldquo;{draftCustomRole}&rdquo; above to add a different one.
            </p>
          ) : (
            <div className="flex gap-2">
              <LaInput
                value={customInput}
                onChange={(e) =>
                  setCustomInput(sanitizeFreeTextInput(e.target.value).slice(0, CUSTOM_ROLE_MAX_LENGTH))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustom();
                  }
                }}
                placeholder="e.g. Egg Farm Owner, Wedding Photographer"
                maxLength={CUSTOM_ROLE_MAX_LENGTH}
                disabled={atCap}
                className="flex-1"
              />
              <LaButton
                type="button"
                intent="secondary"
                size="compact"
                onClick={handleAddCustom}
                disabled={atCap || customInput.trim().length === 0}
              >
                <Plus className="size-3.5" />
                Add
              </LaButton>
            </div>
          )}
        </div>
      </div>
    </ResponsiveEditor>
  );
}

// ── Phone Editor ───────────────────────────────────────────────────────────────

function PhoneEditor({
  open,
  onOpenChange,
  currentValue,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentValue: string;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState(currentValue);

  useEffect(() => {
    if (open) setDraft(currentValue);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSave = () => {
    onSave(draft);
    onOpenChange(false);
  };

  return (
    <ResponsiveEditor
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Phone Number"
      onSave={handleSave}
      saveDisabled={!draft.trim()}
    >
      <div className="space-y-4 px-6 py-5">
        <p className="text-sm leading-snug text-slate-500">
          Changing your phone number may require re-verification in a future update.
        </p>
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Phone Number</p>
          <LaInput
            type="tel"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="+65 9123 4567"
            autoComplete="tel"
          />
        </div>
      </div>
    </ResponsiveEditor>
  );
}

// ── Residence Editor ───────────────────────────────────────────────────────────

function pickerValueToResidence(v: LocationValue): ResidenceValues {
  const parts = (v.sublabel ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  let country = "";
  let state = "";
  if (parts.length >= 2) {
    country = countryFromToken(parts[parts.length - 1]).country;
    state = parts.slice(0, -1).join(", ");
  } else if (parts.length === 1) {
    country = countryFromToken(parts[0]).country;
  } else {
    country = countryFromToken(v.label).country;
  }
  return { city: v.label, state, country };
}

function residenceToPickerValue(r: ResidenceValues): LocationValue {
  const sublabel = [r.state, r.country].filter(Boolean).join(", ");
  return { label: r.city, sublabel };
}

function ResidenceEditor({
  open,
  onOpenChange,
  value,
  onSave,
  primaryLocation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: ResidenceValues;
  onSave: (next: ResidenceValues) => void;
  primaryLocation?: SavedLocation | null;
}) {
  const hasExisting = Boolean(value.city);
  const [pickerValue, setPickerValue] = useState<LocationValue | null>(
    hasExisting ? residenceToPickerValue(value) : null,
  );

  useEffect(() => {
    if (open) setPickerValue(value.city ? residenceToPickerValue(value) : null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const usePrimary = () => {
    if (!primaryLocation) return;
    setPickerValue({
      label: primaryLocation.city,
      sublabel: [primaryLocation.region, primaryLocation.country].filter(Boolean).join(", "),
    });
  };

  const handleSave = () => {
    if (!pickerValue) return;
    onSave(pickerValueToResidence(pickerValue));
    onOpenChange(false);
  };

  const current = pickerValue ? pickerValueToResidence(pickerValue) : null;
  const isSet = Boolean(current?.city);

  return (
    <ResponsiveEditor
      open={open}
      onOpenChange={onOpenChange}
      title="My Residence"
      onSave={handleSave}
      saveDisabled={!isSet}
    >
      <div className="space-y-5 px-6 py-5">
        <p className="text-sm text-slate-500">
          Shown on your public profile so buyers know where you are.
        </p>

        {/* ── State A: location already set — show it, offer to change ── */}
        {isSet && current ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <p className="text-base font-semibold text-slate-900">{current.city}</p>
                {current.state && <p className="text-sm text-slate-500">{current.state}</p>}
                <p className="text-sm text-slate-500">{current.country}</p>
              </div>
              <LocationPicker
                value={pickerValue}
                onChange={setPickerValue}
                searchProvider="google"
                countryScope={["SG", "UK", "IN"]}
                trigger="link"
                triggerClassName="text-sm font-medium text-blue-600 hover:text-blue-700 shrink-0 whitespace-nowrap mt-0.5"
              />
            </div>
          </div>
        ) : (
          /* ── State B: no location — picker is the main action ── */
          <div className="space-y-3">
            <LocationPicker
              value={pickerValue}
              onChange={setPickerValue}
              searchProvider="google"
              countryScope={["SG", "UK", "IN"]}
              trigger="pill"
              placeholder="Search for your city…"
            />
            {primaryLocation && (
              <button
                type="button"
                onClick={usePrimary}
                className="flex w-full items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-sm font-medium text-violet-700 transition hover:bg-violet-100"
              >
                <MapPin className="size-3.5 shrink-0" />
                Use my primary saved location ({primaryLocation.city})
              </button>
            )}
          </div>
        )}
      </div>
    </ResponsiveEditor>
  );
}

// ── Saved Location section ─────────────────────────────────────────────────────

const INITIAL_LOCATIONS: SavedLocation[] = [
  { id: 1, flagCode: "sg", city: "Marina Bay", region: "Central Region", country: "Singapore", primary: true },
  { id: 2, flagCode: "gb", city: "Canary Wharf", region: "London, England", country: "United Kingdom" },
  { id: 3, flagCode: "in", city: "Tiruchirappalli", region: "Tamil Nadu", country: "India" },
];

function countryFromToken(token: string): { country: string; flagCode: string } {
  const lower = token.trim().toLowerCase();
  if (["uk", "united kingdom", "england", "scotland", "wales", "gb"].includes(lower))
    return { country: "United Kingdom", flagCode: "gb" };
  if (["sg", "singapore"].includes(lower))
    return { country: "Singapore", flagCode: "sg" };
  if (["in", "india"].includes(lower))
    return { country: "India", flagCode: "in" };
  return { country: token.trim(), flagCode: "un" };
}

function mapPickerValueToSavedLocation(v: LocationValue): SavedLocation {
  const parts = (v.sublabel ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  let country = "";
  let region = "";

  if (parts.length >= 2) {
    country = countryFromToken(parts[parts.length - 1]).country;
    region = parts.slice(0, -1).join(", ");
  } else if (parts.length === 1) {
    country = countryFromToken(parts[0]).country;
  } else {
    country = countryFromToken(v.label).country;
  }

  const flag = countryFromToken(country).flagCode;
  return { id: Date.now() + Math.floor(Math.random() * 1000), flagCode: flag, city: v.label, region, country };
}

function SavedLocationSection({
  locations,
  setLocations,
}: {
  locations: SavedLocation[];
  setLocations: Dispatch<SetStateAction<SavedLocation[]>>;
}) {
  const [pendingDelete, setPendingDelete] = useState<SavedLocation | null>(null);
  const pickerHostRef = useRef<HTMLDivElement>(null);

  const openLocationPicker = () => {
    const trigger = pickerHostRef.current?.querySelector<HTMLButtonElement>(
      'button[aria-haspopup="dialog"]',
    );
    trigger?.click();
  };

  const handleAddLocation = (value: LocationValue | null) => {
    if (!value) return;
    const next = mapPickerValueToSavedLocation(value);
    const isDuplicate = locations.some(
      (l) =>
        l.city.toLowerCase() === next.city.toLowerCase() &&
        l.country.toLowerCase() === next.country.toLowerCase(),
    );
    if (!isDuplicate) setLocations((prev) => [...prev, next]);
  };

  const confirmDelete = () => {
    if (pendingDelete) setLocations((prev) => prev.filter((l) => l.id !== pendingDelete.id));
    setPendingDelete(null);
  };

  return (
    <>
      <section className="space-y-1">
        <div className="flex items-center justify-between px-1">
          <p className="text-lg font-medium text-slate-900">Saved Locations</p>
          <LaButton
            type="button"
            intent="ghost"
            size="compact"
            onClick={openLocationPicker}
            className="gap-1 px-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <Plus className="size-3.5" />
            Add
          </LaButton>
        </div>
        <p className="px-1 text-sm text-slate-700">Only visible to you. Controls what local listings you see.</p>

        {/* Hidden LocationPicker trigger */}
        <div ref={pickerHostRef} aria-hidden="true" className="fixed -left-full top-0">
          <LocationPicker
            onChange={handleAddLocation}
            searchProvider="google"
            countryScope={["SG", "UK", "IN"]}
          />
        </div>

        <LaCard className="overflow-hidden">
          {locations.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-slate-500">
              No saved locations yet
            </div>
          )}
          {locations.map((loc) => (
            <div
              key={loc.id}
              className="flex items-center gap-3 border-b border-slate-200 px-4 py-3.5 last:border-0"
            >
              <img
                src={`/flags/${loc.flagCode}.svg`}
                alt={loc.country}
                width={24}
                height={16}
                className="shrink-0 rounded-sm object-contain"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold text-slate-900">{loc.city}</p>
                  {loc.primary && (
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-sm font-semibold text-violet-700">
                      Primary
                    </span>
                  )}
                </div>
                {(loc.region || loc.country) && (
                  <p className="text-sm text-slate-500">
                    {[loc.region, loc.country].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
              <button
                type="button"
                aria-label={`Remove ${loc.city}`}
                onClick={() => setPendingDelete(loc)}
                className="shrink-0 text-slate-400 transition-colors hover:text-rose-500"
              >
                <Trash2 className="size-4" strokeWidth={1.75} />
              </button>
            </div>
          ))}
        </LaCard>
      </section>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <MapPin className="size-5 text-rose-500" />
            </AlertDialogMedia>
            <AlertDialogTitle>Remove location?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.city}, {pendingDelete?.country} will be removed from your saved
              locations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Change Password ──────────────────────────────────────────────────────────────

interface ChangePasswordValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const EMPTY_PASSWORD_FORM: ChangePasswordValues = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

function ChangePasswordEditor({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [draft, setDraft] = useState<ChangePasswordValues>(EMPTY_PASSWORD_FORM);
  const [saving, setSaving] = useState(false);
  const [currentTouched, setCurrentTouched] = useState(false);
  const [newTouched, setNewTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(EMPTY_PASSWORD_FORM);
      setSaving(false);
      setCurrentTouched(false);
      setNewTouched(false);
      setConfirmTouched(false);
    }
  }, [open]);

  const currentError =
    currentTouched && draft.currentPassword.length === 0 ? "Enter your current password" : null;

  const newError = !newTouched
    ? null
    : draft.newPassword.length === 0
      ? "Enter a new password"
      : !isValidPassword(draft.newPassword)
        ? `At least ${PASSWORD_MIN_LENGTH} characters, with letters and numbers`
        : draft.newPassword === draft.currentPassword && draft.currentPassword.length > 0
          ? "New password must be different from your current password"
          : null;

  const confirmError =
    confirmTouched && draft.confirmPassword !== draft.newPassword ? "Passwords don't match" : null;

  const canSave =
    draft.currentPassword.length > 0 &&
    isValidPassword(draft.newPassword) &&
    draft.newPassword !== draft.currentPassword &&
    draft.confirmPassword === draft.newPassword;

  const handleSave = () => {
    setCurrentTouched(true);
    setNewTouched(true);
    setConfirmTouched(true);
    if (!canSave) return;
    setSaving(true);
    // TODO [INTEGRATION]: POST /api/profile/change-password
    //   body: { currentPassword, newPassword }
    //   Server must re-verify currentPassword against the stored hash before
    //   accepting newPassword — never trust client-side validation alone.
    setTimeout(() => {
      setSaving(false);
      onOpenChange(false);
      toast.success("Password updated");
    }, 700);
  };

  return (
    <ResponsiveEditor
      open={open}
      onOpenChange={onOpenChange}
      title="Change Password"
      onSave={handleSave}
      saveLabel={saving ? "Saving..." : "Save Changes"}
      saveDisabled={saving}
    >
      <div className="space-y-4 px-6 py-5">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Current Password</p>
          <LaInput
            type="password"
            showPasswordToggle
            value={draft.currentPassword}
            onChange={(e) => setDraft((prev) => ({ ...prev, currentPassword: e.target.value }))}
            onBlur={() => setCurrentTouched(true)}
            autoComplete="current-password"
            status={currentError ? "error" : "default"}
          />
          {currentError && (
            <p role="alert" className="text-sm font-medium text-red-600">
              {currentError}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">New Password</p>
          <LaInput
            type="password"
            showPasswordToggle
            value={draft.newPassword}
            onChange={(e) => setDraft((prev) => ({ ...prev, newPassword: e.target.value }))}
            onBlur={() => setNewTouched(true)}
            autoComplete="new-password"
            status={newError ? "error" : "default"}
          />
          {newError ? (
            <p role="alert" className="text-sm font-medium text-red-600">
              {newError}
            </p>
          ) : (
            <p className="text-sm text-slate-500">
              At least {PASSWORD_MIN_LENGTH} characters, with letters and numbers
            </p>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Confirm New Password</p>
          <LaInput
            type="password"
            showPasswordToggle
            value={draft.confirmPassword}
            onChange={(e) => setDraft((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            onBlur={() => setConfirmTouched(true)}
            autoComplete="new-password"
            status={confirmError ? "error" : "default"}
          />
          {confirmError && (
            <p role="alert" className="text-sm font-medium text-red-600">
              {confirmError}
            </p>
          )}
        </div>
      </div>
    </ResponsiveEditor>
  );
}

// ── Notifications Editor ────────────────────────────────────────────────────────

interface NotificationPrefs {
  newMessages: boolean;
  listingUpdates: boolean;
  savedSearchAlerts: boolean;
  marketingEmails: boolean;
}

const NOTIFICATION_PREF_KEYS: (keyof NotificationPrefs)[] = [
  "newMessages",
  "listingUpdates",
  "savedSearchAlerts",
  "marketingEmails",
];

function NotificationsEditor({
  open,
  onOpenChange,
  value,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: NotificationPrefs;
  onSave: (next: NotificationPrefs) => void;
}) {
  const [draft, setDraft] = useState<NotificationPrefs>(value);

  useEffect(() => {
    if (open) setDraft(value);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSave = () => {
    onSave(draft);
    onOpenChange(false);
  };

  return (
    <ResponsiveEditor
      open={open}
      onOpenChange={onOpenChange}
      title="Notification Preferences"
      onSave={handleSave}
    >
      <div className="px-6 py-2">
        <p className="mb-1 mt-3 text-sm font-semibold text-slate-700">Activity</p>
        <div className="divide-y divide-slate-200">
          <LaSwitch
            label="New messages"
            description="Someone messages you about a listing"
            checked={draft.newMessages}
            onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, newMessages: checked }))}
          />
          <LaSwitch
            label="Listing updates"
            description="Status changes on ads you've posted"
            checked={draft.listingUpdates}
            onCheckedChange={(checked) =>
              setDraft((prev) => ({ ...prev, listingUpdates: checked }))
            }
          />
          <LaSwitch
            label="Saved search alerts"
            description="New listings matching your saved searches"
            checked={draft.savedSearchAlerts}
            onCheckedChange={(checked) =>
              setDraft((prev) => ({ ...prev, savedSearchAlerts: checked }))
            }
          />
        </div>
        <p className="mb-1 mt-5 text-sm font-semibold text-slate-700">Marketing</p>
        <div className="divide-y divide-slate-200">
          <LaSwitch
            label="Marketing emails"
            description="Offers, tips, and product news from LokalAds"
            checked={draft.marketingEmails}
            onCheckedChange={(checked) =>
              setDraft((prev) => ({ ...prev, marketingEmails: checked }))
            }
          />
        </div>
      </div>
    </ResponsiveEditor>
  );
}

// ── Two-Factor Authentication Editor ────────────────────────────────────────────

// Demo-only values — a real integration generates a per-user secret + QR
// server-side and never exposes it in client source.
const MOCK_2FA_SECRET = "JBSW Y3DP EHPK 3PXP";
const MOCK_BACKUP_CODES = [
  "4F7K-9XQ2", "8H3L-6WZP", "2D9R-4TVN", "7G1M-8YXK", "5B6C-3PQW",
  "9J4H-7RTL", "1K8N-5MXD", "6P2V-9WZQ", "3T7Y-4HLR", "8Q5F-2NVK",
];

type TwoFactorStep = "setup" | "verify" | "backup" | "enabled";

const TWO_FACTOR_TITLES: Record<TwoFactorStep, string> = {
  setup: "Set Up Two-Factor Authentication",
  verify: "Verify Your App",
  backup: "Save Backup Codes",
  enabled: "Two-Factor Authentication",
};

function TwoFactorAuthEditor({
  open,
  onOpenChange,
  enabled,
  onEnable,
  onDisable,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enabled: boolean;
  onEnable: () => void;
  onDisable: () => void;
}) {
  const [step, setStep] = useState<TwoFactorStep>("setup");
  const [otpError, setOtpError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [confirmDisableOpen, setConfirmDisableOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(enabled ? "enabled" : "setup");
      setOtpError(false);
      setVerifying(false);
      setBackupConfirmed(false);
      setDisabling(false);
      setConfirmDisableOpen(false);
    }
  }, [open, enabled]);

  function handleCopySecret() {
    if (!navigator.clipboard) {
      toast.error("Copy not supported in this browser — please type the code manually");
      return;
    }
    navigator.clipboard
      .writeText(MOCK_2FA_SECRET.replace(/\s/g, ""))
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Couldn't copy — please copy manually"));
  }

  function handleOtpComplete(otp: string) {
    setVerifying(true);
    // TODO [INTEGRATION]: POST /api/profile/2fa/verify — verify the TOTP code
    // server-side against the secret generated at setup time.
    setTimeout(() => {
      setVerifying(false);
      if (otp === VALID_OTP) {
        setStep("backup");
      } else {
        setOtpError(true);
      }
    }, 700);
  }

  function handleOtpErrorCleared() {
    setOtpError(false);
  }

  function handleEnableConfirm() {
    // TODO [INTEGRATION]: POST /api/profile/2fa/enable — persist enabled
    // state + backup codes hash server-side.
    onEnable();
    onOpenChange(false);
    toast.success("Two-factor authentication enabled");
  }

  function handleDisableConfirm() {
    setDisabling(true);
    // TODO [INTEGRATION]: POST /api/profile/2fa/disable
    setTimeout(() => {
      setDisabling(false);
      setConfirmDisableOpen(false);
      onDisable();
      onOpenChange(false);
      toast.success("Two-factor authentication disabled");
    }, 500);
  }

  const footerByStep: Record<TwoFactorStep, { label: string; disabled: boolean; onSave: () => void }> = {
    setup: { label: "Continue", disabled: false, onSave: () => setStep("verify") },
    verify: { label: "", disabled: true, onSave: () => {} },
    backup: { label: "Done", disabled: !backupConfirmed, onSave: handleEnableConfirm },
    enabled: { label: "Disable", disabled: false, onSave: () => setConfirmDisableOpen(true) },
  };
  const footer = footerByStep[step];

  return (
    <>
      <ResponsiveEditor
        open={open}
        onOpenChange={onOpenChange}
        title={TWO_FACTOR_TITLES[step]}
        onSave={footer.onSave}
        saveLabel={footer.label}
        saveDisabled={footer.disabled}
        hideSaveButton={step === "verify"}
      >
        {step === "setup" && (
          <div className="space-y-4 px-6 py-5">
            <p className="text-sm text-slate-600">
              Scan this QR code with an authenticator app like Google Authenticator or Authy.
            </p>
            <div className="flex justify-center">
              <div className="flex size-40 items-center justify-center rounded-lg border-2 border-slate-300 bg-slate-50">
                <QrCode className="size-20 text-slate-400" strokeWidth={1} />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-slate-700">Can&apos;t scan? Enter this code manually</p>
              <button
                type="button"
                onClick={handleCopySecret}
                className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-left transition hover:border-slate-400"
              >
                <span className="font-mono text-sm font-semibold tracking-wider text-slate-800">
                  {MOCK_2FA_SECRET}
                </span>
                <Copy className="size-4 shrink-0 text-slate-500" />
              </button>
            </div>
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-4 px-6 py-5">
            <p className="text-sm text-slate-600">Enter the 6-digit code from your authenticator app.</p>
            <OtpInput
              error={otpError}
              disabled={verifying}
              onComplete={handleOtpComplete}
              onErrorCleared={handleOtpErrorCleared}
            />
            {verifying ? (
              <p className="text-center text-sm text-slate-500">Verifying&hellip;</p>
            ) : otpError ? (
              <p className="text-center text-sm font-medium text-red-600">Incorrect code. Try again.</p>
            ) : (
              <p className="text-center text-sm text-slate-500">
                Demo OTP: <span className="font-bold tracking-widest text-slate-700">{VALID_OTP}</span>
              </p>
            )}
          </div>
        )}

        {step === "backup" && (
          <div className="space-y-4 px-6 py-5">
            <p className="text-sm text-slate-600">
              Save these backup codes somewhere safe. Each code can be used once if you lose access
              to your authenticator app.
            </p>
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-300 bg-slate-50 p-4">
              {MOCK_BACKUP_CODES.map((code) => (
                <span key={code} className="font-mono text-sm font-semibold text-slate-700">
                  {code}
                </span>
              ))}
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg py-1 transition hover:opacity-80 focus-within:ring-2 focus-within:ring-blue-300">
              <input
                type="checkbox"
                checked={backupConfirmed}
                onChange={() => setBackupConfirmed((v) => !v)}
                className="sr-only"
              />
              <div
                className={cn(
                  "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition",
                  backupConfirmed ? "border-blue-500 bg-blue-500" : "border-slate-400 bg-white"
                )}
              >
                {backupConfirmed && <Check className="size-2.5 text-white" strokeWidth={3} />}
              </div>
              <p className="text-sm font-medium text-slate-700">
                I&apos;ve saved these codes somewhere safe
              </p>
            </label>
          </div>
        )}

        {step === "enabled" && (
          <div className="space-y-4 px-6 py-5">
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3.5">
              <ShieldCheck className="size-5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Two-factor authentication is on</p>
                <p className="text-sm text-emerald-700">Your account has an extra layer of protection.</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              You&apos;ll be asked for a code from your authenticator app when signing in from a new device.
            </p>
          </div>
        )}
      </ResponsiveEditor>

      <AlertDialog open={confirmDisableOpen} onOpenChange={(open) => !disabling && setConfirmDisableOpen(open)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <AlertCircle className="size-5 text-rose-500" />
            </AlertDialogMedia>
            <AlertDialogTitle>Disable two-factor authentication?</AlertDialogTitle>
            <AlertDialogDescription>
              This will make your account less secure — you won&apos;t be asked for a code when
              signing in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disabling}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={disabling} onClick={handleDisableConfirm}>
              {disabling ? "Disabling..." : "Yes, Disable"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const {
    checkEligibility,
    isLoading: deleteLoading,
    error: deleteError,
    reset: resetDelete,
  } = useDeleteAccountStore();

  // Editor visibility
  const [handleEditorOpen, setHandleEditorOpen] = useState(false);
  const [basicInfoEditorOpen, setBasicInfoEditorOpen] = useState(false);
  const [rolesEditorOpen, setRolesEditorOpen] = useState(false);
  const [residenceEditorOpen, setResidenceEditorOpen] = useState(false);
  const [phoneEditorOpen, setPhoneEditorOpen] = useState(false);
  const [phoneEditorId, setPhoneEditorId] = useState<string | null>(null);
  const [phonePendingDelete, setPhonePendingDelete] = useState<string | null>(null);
  const MAX_PHONES = 3;

  // Account Settings
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [notificationsEditorOpen, setNotificationsEditorOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationPrefs>({
    newMessages: true,
    listingUpdates: true,
    savedSearchAlerts: true,
    marketingEmails: false,
  });
  const notificationsOnCount = NOTIFICATION_PREF_KEYS.filter((key) => notifications[key]).length;
  const showTwoFactor = isStageFeatureEnabled("twoFactorAuth");
  const [twoFactorEditorOpen, setTwoFactorEditorOpen] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Profile data (mock — swap with session/API data when auth ships)
  const [handle, setHandle] = useState("anto27");
  const [basicInfo, setBasicInfo] = useState<BasicInfoValues>({
    fullName: "Gopinath Krishnamoorthi",
    dateOfBirthIso: "1990-05-14",
    gender: "Male",
  });
  // Roles example mirrors a real multi-hat user: owns a flat they rent out,
  // runs a small side business, works part-time as a property agent
  // (specialized as "Real Estate Agent"), and also names a specific side
  // hustle the canonical list can't capture. Every account is ALWAYS an
  // Individual (BASE_ROLE, implicit — not stored here, never a choice).
  // `intent` is a private-only preference (never shown publicly) capturing
  // why they're here today — separate from identity. roleIds only holds the
  // *additional* hats; specialties holds one optional refinement per
  // specializable role; customRole holds the one optional free-text
  // "own words" entry.
  const [intent, setIntent] = useState<IntentId>(DEFAULT_INTENT);
  const [roleIds, setRoleIds] = useState<RoleId[]>([
    "business_owner",
    "property_owner",
    "agent_broker",
  ]);
  const [specialties, setSpecialties] = useState<Partial<Record<RoleId, string>>>({
    agent_broker: "Real Estate Agent",
  });
  const [customRole, setCustomRole] = useState<string | null>("Egg Farm Owner");
  const [contact, setContact] = useState<ContactValues>({
    email: "gopi@lokalads.com",
    emailVerified: true,
    phones: [
      { id: "p1", number: "+65 9123 4567", primary: true },
      { id: "p2", number: "+65 8345 6789", primary: false },
    ],
  });
  const [residence, setResidence] = useState<ResidenceValues>({
    country: "India",
    state: "Tamil Nadu",
    city: "Tiruchirappalli",
  });

  const [locations, setLocations] = useState<SavedLocation[]>(INITIAL_LOCATIONS);
  const primaryLocation = locations.find((l) => l.primary) ?? null;

  const openPhoneEditor = (id: string) => {
    setPhoneEditorId(id);
    setPhoneEditorOpen(true);
  };

  const addPhone = () => {
    const newId = `phone-${Date.now()}`;
    setContact((prev) => ({
      ...prev,
      phones: [...prev.phones, { id: newId, number: "", primary: false }],
    }));
    openPhoneEditor(newId);
  };

  const savePhone = (number: string) => {
    setContact((prev) => ({
      ...prev,
      phones: prev.phones.map((p) => p.id === phoneEditorId ? { ...p, number } : p),
    }));
  };

  const removePhone = (id: string) => {
    setContact((prev) => {
      const filtered = prev.phones.filter((p) => p.id !== id);
      const hasPrimary = filtered.some((p) => p.primary);
      return {
        ...prev,
        phones: hasPrimary ? filtered : filtered.map((p, i) => ({ ...p, primary: i === 0 })),
      };
    });
    setPhonePendingDelete(null);
  };

  const setPrimaryPhone = (id: string) => {
    setContact((prev) => ({
      ...prev,
      phones: prev.phones.map((p) => ({ ...p, primary: p.id === id })),
    }));
  };

  const handleDeleteClick = async () => {
    resetDelete();
    const eligible = await checkEligibility();
    // TODO: update to real delete-account route when auth ships
    if (eligible) router.push("/delete-account/confirm");
  };

  return (
    <>
      <main className="min-h-screen bg-[#eaeff5]">
        <div className="mx-auto max-w-xl px-4 pb-16 pt-5 sm:px-6">
          <h1 className="mb-4 text-2xl font-bold text-slate-900">My Profile</h1>

          <div className="flex flex-col gap-6">
            {/* ── Identity card ── */}
            <LaCard className="overflow-hidden border-slate-200 bg-white p-0">
              <div className="h-1.5 w-full bg-linear-to-r from-rose-500 to-rose-400" />
              {/* Avatar+name row, then all role badges wrap freely on their own row
                  below — never truncated or collapsed to a "+N" count. Roles are
                  useful identity info, not clutter to hide. */}
              <div className="flex flex-col gap-3 px-4 py-4">
                <div className="flex items-center gap-3">
                  <Avatar initials={getInitials(basicInfo.fullName)} size="lg" />
                  <div className="min-w-0">
                    <h2 className="text-base font-bold leading-tight text-slate-900">
                      {basicInfo.fullName}
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-600">
                      @{handle} · Member since 2022
                    </p>
                  </div>
                </div>
                {(() => {
                  const badgeLabels = [
                    BASE_ROLE.label,
                    ...roleIds.map((id) => formatRoleBadge(id, specialties)),
                    ...(customRole ? [customRole] : []),
                  ];
                  return (
                    <div className="flex flex-wrap gap-1.5">
                      {badgeLabels.map((label, index) => {
                        const isBase = index === 0 && label === BASE_ROLE.label;
                        return (
                          <span
                            key={label}
                            title={isBase ? `${label} — can't be removed` : label}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold",
                              isBase
                                ? "bg-slate-100 text-slate-600"
                                : "bg-blue-100 text-blue-700"
                            )}
                          >
                            {isBase && <Lock className="size-3 shrink-0" />}
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </LaCard>

          {/* ── Section 1: Public Profile ── */}
          <Section
            label="Public Profile"
            actionText="Set Handle"
            onActionClick={() => setHandleEditorOpen(true)}
          >
            <div className="border-b border-slate-200 px-4 py-3.5">
              <p className="text-base font-medium text-slate-900">
                <span className="mr-1.5 text-sm font-medium uppercase tracking-wide text-slate-700">
                  Handle:
                </span>
                @{handle}
              </p>
              <a
                href={`/u/${handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 inline-block text-sm text-blue-800 underline underline-offset-2 hover:text-blue-900"
              >
                lokalads.com/{handle}
              </a>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <p className="text-sm text-slate-500">
                See what buyers see when they view your profile
              </p>
              <LaButton asChild intent="primary-blue" size="compact" className="shrink-0">
                <a href={`/u/${handle}`} target="_blank" rel="noopener noreferrer">
                  Preview
                </a>
              </LaButton>
            </div>
          </Section>

          {/* ── Section 2: Basic Info ── */}
          <Section
            label="Basic Info"
            actionText="Edit"
            onActionClick={() => setBasicInfoEditorOpen(true)}
          >
            <InfoRow label="Full Name" value={basicInfo.fullName} />
            <InfoRow label="Date of Birth" value={formatDobLabel(basicInfo.dateOfBirthIso)} />
            <InfoRow label="Gender" value={basicInfo.gender} />
          </Section>

          {/* ── Section 3: Roles ── */}
          <Section
            label="Roles"
            actionText="Edit"
            onActionClick={() => setRolesEditorOpen(true)}
            description="How you use LokalAds — shown as badges on your public profile. You're always an Individual; the rest are extra hats you wear."
          >
            <div className="flex items-center gap-1.5 border-b border-slate-200 px-4 py-3 text-sm text-slate-600">
              <Lock className="size-3.5 text-slate-400" />
              Here for:
              <span className="font-semibold text-slate-800">
                {getIntentLabel(intent)}
              </span>
              <span className="text-slate-400">(private)</span>
            </div>
            <div className="flex flex-wrap gap-2 px-4 py-4">
              <span
                title={`${BASE_ROLE.label} — can't be removed`}
                className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600"
              >
                <Lock className="size-3.5" />
                {BASE_ROLE.label}
              </span>
              {roleIds.map((id) => (
                <span
                  key={id}
                  className="rounded-full border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700"
                >
                  {formatRoleBadge(id, specialties)}
                </span>
              ))}
              {customRole && (
                <span className="rounded-full border-2 border-dashed border-blue-400 bg-white px-3 py-1.5 text-sm font-semibold text-blue-700">
                  {customRole}
                </span>
              )}
            </div>
          </Section>

          {/* ── Section 4: Contact Information ── */}
          <Section
            label="Contact Information"
            description="Your primary number is shared with buyers when you reply to their messages."
          >
            {/* Email */}
            <ContactRow
              label="Email"
              value={contact.email}
              verified={contact.emailVerified}
              editLabel="Locked"
              onEdit={() => toast.info("To change your email, please contact support. Email changes require identity verification.")}
            />

            {/* Phone list */}
            {contact.phones.map((phone, index) => (
              <div
                key={phone.id}
                className="flex min-h-15 items-center justify-between gap-4 border-b border-slate-200 px-4 py-3.5 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    <p className="text-sm font-medium uppercase tracking-wide text-slate-600">
                      Phone {index + 1}
                    </p>
                    {contact.phones.length > 1 && phone.primary && (
                      <span className="rounded bg-rose-600 px-1.5 py-0.5 text-sm font-semibold text-white">
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="truncate text-base font-medium text-slate-900">{phone.number}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {contact.phones.length > 1 && !phone.primary && (
                    <LaButton
                      type="button"
                      intent="outline"
                      size="compact"
                      onClick={() => setPrimaryPhone(phone.id)}
                      className="px-2 text-sm"
                    >
                      Set primary
                    </LaButton>
                  )}
                  <LaButton
                    type="button"
                    intent="ghost"
                    size="compact"
                    onClick={() => openPhoneEditor(phone.id)}
                    className="px-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  >
                    Edit
                  </LaButton>
                  {contact.phones.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Remove phone ${index + 1}`}
                      onClick={() => setPhonePendingDelete(phone.id)}
                      className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
                    >
                      <Trash2 className="size-4" strokeWidth={1.75} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Add phone / max reached */}
            {contact.phones.length < MAX_PHONES ? (
              <div className="flex min-h-12 items-center justify-between gap-4 px-4 py-3">
                <p className="text-sm text-slate-400">
                  {contact.phones.length === 1
                    ? "Add a backup number"
                    : `${contact.phones.length} of ${MAX_PHONES} numbers added`}
                </p>
                <LaButton
                  type="button"
                  intent="ghost"
                  size="compact"
                  onClick={addPhone}
                  className="shrink-0 gap-1 px-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                >
                  <Plus className="size-3.5" />
                  Add
                </LaButton>
              </div>
            ) : (
              <div className="px-4 py-3">
                <p className="text-sm text-slate-400">Maximum {MAX_PHONES} phone numbers added.</p>
              </div>
            )}
          </Section>

          {/* ── Section 4: Saved Locations ── */}
          <SavedLocationSection locations={locations} setLocations={setLocations} />

          {/* ── Section 5: My Residence ── */}
          <Section
            label="My Residence"
            actionText="Edit"
            onActionClick={() => setResidenceEditorOpen(true)}
            description="Shown on your public profile so buyers know where you are."
          >
            <InfoRow label="City" value={residence.city} />
            <InfoRow label="State / Region" value={residence.state} />
            <InfoRow label="Country" value={residence.country} />
          </Section>

          {/* ── Section 6: Account Settings ── */}
          <Section label="Account Settings">
            <SettingsRow label="Change Password" onClick={() => setChangePasswordOpen(true)} />
            <SettingsRow
              label="Notifications"
              subtitle={`${notificationsOnCount} of ${NOTIFICATION_PREF_KEYS.length} on`}
              onClick={() => setNotificationsEditorOpen(true)}
            />
            {showTwoFactor && (
              <SettingsRow
                label="Two-Factor Authentication"
                subtitle={twoFactorEnabled ? "On" : "Off"}
                onClick={() => setTwoFactorEditorOpen(true)}
              />
            )}
          </Section>

          {/* ── Section 7: Danger Zone ── */}
          <section className="space-y-1">
            <div className="flex items-center justify-between px-1">
              <p className="text-lg font-medium text-slate-900">Danger Zone</p>
            </div>
            <LaCard className="overflow-hidden border-slate-200 bg-white p-0">
              {/* amber warning stripe — same language as identity card's violet stripe */}
              <div className="h-1.5 w-full bg-linear-to-r from-amber-400 to-rose-400" />
              <div className="flex items-start gap-3 px-4 pb-3 pt-4">
                <ShieldAlert
                  className="mt-0.5 size-5 shrink-0 text-amber-500"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">Permanent action</p>
                  {deleteError ? (
                    <p className="mt-0.5 text-sm text-rose-600">{deleteError}</p>
                  ) : (
                    <p className="mt-0.5 text-sm font-normal text-slate-600">
                      Deleting your account is irreversible. All your data will be permanently
                      removed.
                    </p>
                  )}
                </div>
              </div>
              <div className="px-4 pb-4">
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={handleDeleteClick}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-rose-300 bg-rose-50 px-4 py-1.5 text-sm font-semibold text-rose-600 transition hover:border-rose-500 hover:bg-rose-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleteLoading ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  )}
                  Delete Account
                </button>
              </div>
            </LaCard>
          </section>
          </div>
        </div>
      </main>

      {/* ── Editors (conditional render = fresh state on each open) ── */}
      {handleEditorOpen && (
        <HandleEditor
          open={handleEditorOpen}
          onOpenChange={setHandleEditorOpen}
          currentHandle={handle}
          onSave={setHandle}
        />
      )}
      {basicInfoEditorOpen && (
        <BasicInfoEditor
          open={basicInfoEditorOpen}
          onOpenChange={setBasicInfoEditorOpen}
          value={basicInfo}
          onSave={setBasicInfo}
        />
      )}
      {rolesEditorOpen && (
        <RolesEditor
          open={rolesEditorOpen}
          onOpenChange={setRolesEditorOpen}
          value={{ intent, roleIds, specialties, customRole }}
          onSave={(next) => {
            setIntent(next.intent);
            setRoleIds(next.roleIds);
            setSpecialties(next.specialties);
            setCustomRole(next.customRole);
          }}
        />
      )}
      {phoneEditorOpen && phoneEditorId && (
        <PhoneEditor
          open={phoneEditorOpen}
          onOpenChange={(open) => {
            setPhoneEditorOpen(open);
            // If editor closed without saving, remove any empty phone entry
            if (!open) {
              setContact((prev) => ({
                ...prev,
                phones: prev.phones.filter((p) => p.id !== phoneEditorId || p.number !== ""),
              }));
            }
          }}
          currentValue={contact.phones.find((p) => p.id === phoneEditorId)?.number ?? ""}
          onSave={savePhone}
        />
      )}
      {residenceEditorOpen && (
        <ResidenceEditor
          open={residenceEditorOpen}
          onOpenChange={setResidenceEditorOpen}
          value={residence}
          onSave={setResidence}
          primaryLocation={primaryLocation}
        />
      )}
      {changePasswordOpen && (
        <ChangePasswordEditor open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
      )}
      {notificationsEditorOpen && (
        <NotificationsEditor
          open={notificationsEditorOpen}
          onOpenChange={setNotificationsEditorOpen}
          value={notifications}
          onSave={setNotifications}
        />
      )}
      {showTwoFactor && twoFactorEditorOpen && (
        <TwoFactorAuthEditor
          open={twoFactorEditorOpen}
          onOpenChange={setTwoFactorEditorOpen}
          enabled={twoFactorEnabled}
          onEnable={() => setTwoFactorEnabled(true)}
          onDisable={() => setTwoFactorEnabled(false)}
        />
      )}

      {/* Phone removal confirmation */}
      <AlertDialog open={!!phonePendingDelete} onOpenChange={(open) => !open && setPhonePendingDelete(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2 className="size-5 text-rose-500" />
            </AlertDialogMedia>
            <AlertDialogTitle>Remove this number?</AlertDialogTitle>
            <AlertDialogDescription>
              {contact.phones.find((p) => p.id === phonePendingDelete)?.number} will be removed from your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => phonePendingDelete && removePhone(phonePendingDelete)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
