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
 *
 * File-size note (Golden Rule, 2026-07-14): this route file was ~2,390
 * lines — every self-contained editor/section component has been split
 * into co-located sibling files (see imports below). This file now owns
 * only state, handlers, and JSX composition for the page itself.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ShieldAlert,
  Trash2,
  Loader2,
  Plus,
  AlertCircle,
  Lock,
  Star,
  Mail,
  Phone,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useDeleteAccountStore } from "@/lib/stores/deleteAccountStore";
import { Avatar } from "@/components/avatar/Avatar";
import { LaBadge, LaButton, LaCard, LaSwitch } from "@/components/la";
import { AddPhoneEditor } from "./AddPhoneEditor";
import { ChangeEmailEditor } from "./ChangeEmailEditor";
import { cn } from "@/lib/utils";
import { isStageFeatureEnabled } from "@/config";
import {
  BASE_ROLE,
  DEFAULT_INTENT,
  getIntentLabel,
  type RoleId,
  type IntentId,
} from "@/config/roles";
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

import type {
  BasicInfoValues,
  ConnectedAccount,
  ContactValues,
  ResidenceValues,
  SavedLocation,
} from "./types";
import { Section, InfoRow, ContactRow, SettingsRow } from "./layout-atoms";
import { HandleEditor } from "./HandleEditor";
import { BasicInfoEditor, formatDobLabel, getInitials } from "./BasicInfoEditor";
import { RolesEditor, formatRoleBadge } from "./RolesEditor";
import { ResidenceEditor } from "./ResidenceEditor";
import { SavedLocationSection, INITIAL_LOCATIONS } from "./SavedLocationSection";
import { ChangePasswordEditor } from "./ChangePasswordEditor";
import {
  NotificationsEditor,
  NOTIFICATION_PREF_KEYS,
  type NotificationPrefs,
} from "./NotificationsEditor";
import { TwoFactorAuthEditor } from "./TwoFactorAuthEditor";

function buildDisplayedRoleBadges(
  roleIds: RoleId[],
  specialties: Partial<Record<RoleId, string>>,
  customRole: string | null,
) {
  const explicitRoles = [
    ...roleIds.map((id) => formatRoleBadge(id, specialties)),
    ...(customRole ? [customRole] : []),
  ];

  return explicitRoles.length > 0 ? explicitRoles : [BASE_ROLE.label];
}

export type ProfilePageMode = "profile" | "account-settings";

export function ProfilePageScreen({ mode = "profile" }: { mode?: ProfilePageMode }) {
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
  const [changeEmailEditorOpen, setChangeEmailEditorOpen] = useState(false);
  const [phoneEditorId, setPhoneEditorId] = useState<string | null>(null);
  const [addPhoneEditorOpen, setAddPhoneEditorOpen] = useState(false);
  const [phonePendingDelete, setPhonePendingDelete] = useState<string | null>(null);
  const [accountPendingDisconnect, setAccountPendingDisconnect] = useState<ConnectedAccount["provider"] | null>(null);
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
  // runs a small side business, and works part-time as a property agent
  // (specialized as "Real Estate Agent"). Every account is ALWAYS an
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
  const [customRole, setCustomRole] = useState<string | null>(null);
  const [contact, setContact] = useState<ContactValues>({
    email: "gopi@lokalads.com",
    emailVerified: true,
    phones: [
      { id: "p1", number: "+65 9123 4567", primary: true, visibleToBuyers: false },
      { id: "p2", number: "+65 8345 6789", primary: false, visibleToBuyers: false },
    ],
  });
  const [residence, setResidence] = useState<ResidenceValues>({
    country: "India",
    state: "Tamil Nadu",
    city: "Tiruchirappalli",
  });

  const [locations, setLocations] = useState<SavedLocation[]>(INITIAL_LOCATIONS);
  const primaryLocation = locations.find((l) => l.primary) ?? null;
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([
    {
      provider: "google",
      status: "connected",
      maskedIdentifier: "g*****n@gmail.com",
      linkedAtIso: "2026-07-12",
      lastUsedLabel: "Last used 2 days ago",
      isPrimary: false,
    },
    {
      provider: "apple",
      status: "connected",
      maskedIdentifier: "Private relay (hides email)",
      linkedAtIso: "2026-01-03",
      lastUsedLabel: "Last used today",
      isPrimary: false,
    },
    {
      provider: "magic_link",
      status: "connected",
      maskedIdentifier: "gopi@lokalads.com",
      linkedAtIso: "2026-07-10",
      lastUsedLabel: "Last used today",
      isPrimary: true,
    },
  ]);

  const connectedMethodsCount = connectedAccounts.filter((a) => a.status === "connected").length;

  const getDisconnectBlockReason = (account: ConnectedAccount): string | null => {
    if (account.status !== "connected") return null;
    if (connectedMethodsCount <= 1) return "Add another sign-in method before disconnecting this one.";
    return null;
  };

  const providerLabel = (provider: ConnectedAccount["provider"]): string => {
    if (provider === "google") return "Google";
    if (provider === "apple") return "Apple";
    return "Email Magic Link";
  };

  const formatLinkedDate = (iso: string | null): string => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const connectMethod = (provider: ConnectedAccount["provider"]) => {
    const now = new Date().toISOString();
    setConnectedAccounts((prev) => {
      const hasPrimaryConnected = prev.some((a) => a.status === "connected" && a.isPrimary);
      return prev.map((a) =>
        a.provider === provider
          ? {
              ...a,
              status: "connected" as const,
              linkedAtIso: a.linkedAtIso ?? now,
              lastUsedLabel: "Last used today",
              isPrimary: hasPrimaryConnected ? a.isPrimary : true,
            }
          : a
      );
    });
    toast.success(`${providerLabel(provider)} connected.`);
  };

  const requestDisconnectMethod = (provider: ConnectedAccount["provider"]) => {
    const target = connectedAccounts.find((a) => a.provider === provider);
    if (!target || target.status !== "connected") return;
    if (connectedMethodsCount <= 1) {
      toast.error("Add another sign-in method before disconnecting this one.");
      return;
    }
    setAccountPendingDisconnect(provider);
  };

  const confirmDisconnectMethod = () => {
    if (!accountPendingDisconnect) return;
    const provider = accountPendingDisconnect;
    setConnectedAccounts((prev) => {
      const next = prev.map((a) =>
        a.provider === provider
          ? {
              ...a,
              status: "not_connected" as const,
              linkedAtIso: null,
              lastUsedLabel: null,
              isPrimary: false,
            }
          : a
      );

      const hasPrimaryConnected = next.some((a) => a.status === "connected" && a.isPrimary);
      if (hasPrimaryConnected) return next;

      const fallbackPrimary = next.find((a) => a.status === "connected");
      if (!fallbackPrimary) return next;

      return next.map((a) =>
        a.provider === fallbackPrimary.provider ? { ...a, isPrimary: true } : a
      );
    });
    setAccountPendingDisconnect(null);
    toast.success(`${providerLabel(provider)} disconnected.`);
  };

  const openPhoneEditor = (id: string) => {
    setPhoneEditorId(id);
    setPhoneEditorOpen(true);
  };

  const handleEmailVerified = (newEmail: string) => {
    setContact((prev) => ({ ...prev, email: newEmail, emailVerified: true }));
    setChangeEmailEditorOpen(false);
    toast.success("Email updated");
  };

  const handlePhoneVerified = (fullNumber: string) => {
    const newId = `phone-${Date.now()}`;
    setContact((prev) => ({
      ...prev,
      phones: [
        ...prev.phones,
        { id: newId, number: fullNumber, primary: prev.phones.length === 0, visibleToBuyers: false },
      ],
    }));
    setAddPhoneEditorOpen(false);
    toast.success("Phone number added");
  };

  const handlePhoneEditVerified = (fullNumber: string) => {
    setContact((prev) => ({
      ...prev,
      phones: prev.phones.map((p) => p.id === phoneEditorId ? { ...p, number: fullNumber } : p),
    }));
    setPhoneEditorOpen(false);
    toast.success("Phone number updated");
  };

  const removePhone = (id: string) => {
    // TODO [INTEGRATION]: DELETE /api/profile/phone/{id}
    // Defense-in-depth: the trash-icon button only renders when there's more
    // than one number, but this guard stays here too (not just at render) —
    // per the standing rule, an account must never end up with zero phones.
    setContact((prev) => {
      if (prev.phones.length <= 1) return prev;
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
    // TODO [INTEGRATION]: PATCH /api/profile/phone/{id} { primary: true }
    setContact((prev) => ({
      ...prev,
      phones: prev.phones.map((p) => ({ ...p, primary: p.id === id })),
    }));
  };

  const setPhoneVisibility = (id: string, visible: boolean) => {
    // TODO [INTEGRATION]: PATCH /api/profile/phone/{id} { visibleToBuyers: visible }
    setContact((prev) => ({
      ...prev,
      phones: prev.phones.map((p) => (p.id === id ? { ...p, visibleToBuyers: visible } : p)),
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
          <h1 className={cn("text-2xl font-bold text-slate-900", mode === "profile" ? "mb-2" : "mb-4")}>
            {mode === "profile" ? "My Profile" : "Account Settings"}
          </h1>
          {mode === "profile" && (
            <p className="mb-4 text-sm text-slate-600">
              Manage your public identity and how buyers see you.
            </p>
          )}

          <div className="flex flex-col gap-6">
            {/* ── Identity card ── */}
            <div className={mode === "profile" ? "" : "hidden"}>
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
                  const badgeLabels = buildDisplayedRoleBadges(roleIds, specialties, customRole);
                  return (
                    <div className="flex flex-wrap gap-1.5">
                      {badgeLabels.map((label) => {
                        const isBase = label === BASE_ROLE.label;
                        return (
                          <span
                            key={label}
                            title={isBase ? `${label} — default when no roles are selected` : label}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold",
                              isBase
                                ? "bg-slate-100 text-slate-600"
                                : "border border-blue-400 bg-blue-100 text-blue-900"
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
            </div>

          {/* ── Section 1: Public Profile ── */}
          <div className={mode === "profile" ? "" : "hidden"}>
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
              <LaButton asChild intent="primary-blue" size="default" className="shrink-0">
                <a href={`/u/${handle}`} target="_blank" rel="noopener noreferrer">
                  Preview
                </a>
              </LaButton>
            </div>
          </Section>
          </div>

          {/* ── Section 2: Basic Info ── */}
          <div className={mode === "profile" ? "" : "hidden"}>
          <Section
            label="Basic Info"
            actionText="Edit"
            onActionClick={() => setBasicInfoEditorOpen(true)}
          >
            <InfoRow label="Full Name" value={basicInfo.fullName} />
            <InfoRow label="Date of Birth" value={formatDobLabel(basicInfo.dateOfBirthIso)} />
            <InfoRow label="Gender" value={basicInfo.gender} />
          </Section>
          </div>

          {/* ── Section 3: Roles ── */}
          <div className={mode === "profile" ? "" : "hidden"}>
          <Section
            label="Roles"
            actionText="Edit"
            onActionClick={() => setRolesEditorOpen(true)}
            description="How you use LokalAds — shown as badges on your public profile. If you pick no explicit roles, we show Individual by default."
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
              {(() => {
                const hasExplicitRoles = roleIds.length > 0 || Boolean(customRole);

                if (!hasExplicitRoles) {
                  return (
                    <span
                      title={`${BASE_ROLE.label} — shown until you pick a role`}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600"
                    >
                      <Lock className="size-3.5" />
                      {BASE_ROLE.label}
                    </span>
                  );
                }

                return (
                  <>
                    {roleIds.map((id) => (
                      <span
                        key={id}
                        className="rounded-full border border-blue-400 bg-blue-100 px-3 py-1.5 text-sm font-semibold text-blue-900"
                      >
                        {formatRoleBadge(id, specialties)}
                      </span>
                    ))}
                    {customRole && (
                      <span className="rounded-full border-2 border-dashed border-blue-500 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-900">
                        {customRole}
                      </span>
                    )}
                  </>
                );
              })()}
            </div>
          </Section>
          </div>

          {/* ── Section 4: Contact Information ── */}
          <div className={mode === "account-settings" ? "" : "hidden"}>
          <Section
            label="Contact Information"
            description="Your email is always private. Choose which phone numbers are visible to buyers."
          >
            {/* Email */}
            <ContactRow
              label="Email"
              value={contact.email}
              verified={contact.emailVerified}
              icon={Mail}
              onEdit={() => {
                // Guard: the email-change journey's 2nd factor is the primary
                // phone, which is guaranteed to exist once onboarding is done —
                // but defend against the edge case anyway (e.g. a fresh/mock
                // account with zero phones on file).
                if (contact.phones.length === 0) {
                  toast.info("Add a phone number before changing your email.");
                  return;
                }
                setChangeEmailEditorOpen(true);
              }}
            />

            {/* Phone list */}
            {contact.phones.map((phone, index) => (
              <div
                key={phone.id}
                className={cn(
                  "border-b border-slate-200 px-4 py-3.5 last:border-0",
                  phone.primary && "border-lime-200 bg-lime-100/80"
                )}
              >
                <div className="flex min-h-15 items-center justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Phone className="size-7 shrink-0 text-slate-500" strokeWidth={1.75} />
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex items-center gap-2">
                        <p className="text-sm font-medium uppercase tracking-wide text-slate-600">
                          Phone {index + 1}
                        </p>
                        {phone.primary && (
                          <LaBadge
                            intent="danger"
                            variant="solid"
                            size="md"
                            className="gap-1 bg-rose-600 text-white hover:bg-rose-600"
                          >
                            <Star className="size-3" fill="currentColor" strokeWidth={0} />
                            Primary
                          </LaBadge>
                        )}
                      </div>
                      {/* Never truncate — the owner must always be able to fully read their own number */}
                      <p className="break-all text-base font-medium text-slate-900">{phone.number}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <LaButton
                      type="button"
                      intent="ghost"
                      size="default"
                      onClick={() => openPhoneEditor(phone.id)}
                      className="px-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    >
                      Edit
                    </LaButton>
                    {contact.phones.length > 1 && (
                      <LaButton
                        type="button"
                        intent="ghost"
                        size="default"
                        iconOnly
                        aria-label={`Remove phone ${index + 1}`}
                        onClick={() => setPhonePendingDelete(phone.id)}
                        className="rounded-md text-slate-500 hover:bg-rose-50 hover:text-rose-500"
                      >
                        <Trash2 className="size-4" strokeWidth={1.75} />
                      </LaButton>
                    )}
                  </div>
                </div>

                {/* "Set primary" gets its own full-width row — kept out of the row
                    above so Edit/Trash never have to compete with it for space,
                    which is what was squeezing the phone number into an ellipsis
                    on narrow viewports. */}
                {contact.phones.length > 1 && !phone.primary && (
                  <div className="mt-2">
                    <LaButton
                      type="button"
                      intent="outline"
                      size="default"
                      onClick={() => setPrimaryPhone(phone.id)}
                      className="px-3 text-sm"
                    >
                      Set primary
                    </LaButton>
                  </div>
                )}

                {/* Per-number visibility consent — default OFF, buyers reach seller via Chat until opted in */}
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2 text-sm text-slate-500">
                    {phone.visibleToBuyers ? (
                      <Eye className="size-4 shrink-0 text-slate-500" strokeWidth={1.75} />
                    ) : (
                      <EyeOff className="size-4 shrink-0 text-slate-500" strokeWidth={1.75} />
                    )}
                    <span className="truncate">
                      {phone.visibleToBuyers ? "Visible to buyers" : "Hidden — reachable via Chat only"}
                    </span>
                  </div>
                  <LaSwitch
                    size="default"
                    checked={phone.visibleToBuyers}
                    onCheckedChange={(checked) => setPhoneVisibility(phone.id, checked)}
                    aria-label="Show to buyers"
                    className="shrink-0"
                  />
                </div>
              </div>
            ))}

            {/* Add phone / empty state / max reached */}
            {contact.phones.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5">
                  <AlertCircle className="size-4 shrink-0 text-amber-600" />
                  <p className="text-sm font-medium text-amber-800">
                    You need a phone number to post an ad.
                  </p>
                </div>
                <LaButton
                  type="button"
                  intent="primary-blue"
                  size="default"
                  onClick={() => setAddPhoneEditorOpen(true)}
                  className="mt-1 gap-1 px-3 text-sm font-semibold"
                >
                  <Plus className="size-3.5" />
                  Add phone number
                </LaButton>
              </div>
            ) : contact.phones.length < MAX_PHONES ? (
              <div className="flex min-h-12 items-center justify-between gap-4 px-4 py-3">
                <p className="text-sm text-slate-500">
                  {contact.phones.length === 1
                    ? "Add a backup number"
                    : `${contact.phones.length} of ${MAX_PHONES} numbers added`}
                </p>
                <LaButton
                  type="button"
                  intent="primary-blue"
                  size="default"
                  onClick={() => setAddPhoneEditorOpen(true)}
                  className="gap-1 px-3 text-sm font-semibold"
                >
                  <Plus className="size-3.5" />
                  Add
                </LaButton>
              </div>
            ) : (
              <div className="px-4 py-3">
                <p className="text-sm text-slate-500">Maximum {MAX_PHONES} phone numbers added.</p>
              </div>
            )}
          </Section>
          </div>

          {/* ── Section 5: Saved Locations ── */}
          <div className={mode === "account-settings" ? "" : "hidden"}>
          <SavedLocationSection locations={locations} setLocations={setLocations} />
          </div>

          {/* ── Section 6: My Residence ── */}
          <div className={mode === "profile" ? "" : "hidden"}>
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
          </div>

          {/* ── Section 7: Login and Security ── */}
          <div className={mode === "account-settings" ? "" : "hidden"}>
          <Section
            label="Login and Security"
            description="See your sign-in methods at a glance."
          >
            {connectedAccounts.map((account, index) => {
              const disconnectBlockReason = getDisconnectBlockReason(account);
              const isDisconnectBlocked = Boolean(disconnectBlockReason);

              return (
                <div
                  key={account.provider}
                  className={cn(
                    "px-4 py-3.5",
                    index < connectedAccounts.length - 1 && "border-b border-slate-200"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold text-slate-900">{providerLabel(account.provider)}</p>
                        {account.status === "connected" ? (
                          <LaBadge intent="success" size="md" className="gap-1 bg-emerald-50 text-emerald-700">
                            <ShieldCheck className="size-3" />
                            Connected
                          </LaBadge>
                        ) : (
                          <LaBadge intent="neutral" size="md">Not connected</LaBadge>
                        )}
                        {account.isPrimary && account.status === "connected" && (
                          <LaBadge intent="neutral" size="md">Default</LaBadge>
                        )}
                      </div>

                      {account.maskedIdentifier && (
                        <p className="mt-1 text-base font-medium text-slate-900">{account.maskedIdentifier}</p>
                      )}

                      <p className="mt-0.5 text-sm text-slate-600">
                        {account.status === "connected"
                          ? `Linked ${formatLinkedDate(account.linkedAtIso)}${account.lastUsedLabel ? ` · ${account.lastUsedLabel}` : ""}`
                          : "Connect to use this sign-in method"}
                      </p>

                      {disconnectBlockReason && (
                        <p className="mt-0.5 text-sm text-slate-500">
                          {disconnectBlockReason}
                        </p>
                      )}
                    </div>

                    {account.status === "connected" ? (
                      <LaButton
                        type="button"
                        intent="outline"
                        size="default"
                        onClick={() => requestDisconnectMethod(account.provider)}
                        disabled={isDisconnectBlocked}
                        className="h-10 min-w-32 shrink-0 justify-center border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 focus-visible:ring-rose-400"
                      >
                        Disconnect
                      </LaButton>
                    ) : (
                      <LaButton
                        type="button"
                        intent="primary-blue"
                        size="default"
                        onClick={() => connectMethod(account.provider)}
                        className="h-10 min-w-32 shrink-0 justify-center"
                      >
                        Connect
                      </LaButton>
                    )}
                  </div>
                </div>
              );
            })}
          </Section>
          </div>

          {/* ── Section 8: Account Settings ── */}
          <div className={mode === "account-settings" ? "" : "hidden"}>
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
          </div>

          {/* ── Section 9: Danger Zone ── */}
          <div className={mode === "account-settings" ? "" : "hidden"}>
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
        <AddPhoneEditor
          open={phoneEditorOpen}
          onOpenChange={setPhoneEditorOpen}
          initialValue={contact.phones.find((p) => p.id === phoneEditorId)?.number ?? ""}
          existingNumbers={contact.phones.filter((p) => p.id !== phoneEditorId).map((p) => p.number)}
          defaultCountryHint={residence.country}
          onVerified={handlePhoneEditVerified}
        />
      )}
      {addPhoneEditorOpen && (
        <AddPhoneEditor
          open={addPhoneEditorOpen}
          onOpenChange={setAddPhoneEditorOpen}
          existingNumbers={contact.phones.map((p) => p.number)}
          defaultCountryHint={residence.country}
          onVerified={handlePhoneVerified}
        />
      )}
      {changeEmailEditorOpen && (
        <ChangeEmailEditor
          open={changeEmailEditorOpen}
          onOpenChange={setChangeEmailEditorOpen}
          currentEmail={contact.email}
          primaryPhone={contact.phones.find((p) => p.primary)?.number ?? ""}
          onVerified={handleEmailVerified}
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

      {/* Connected account disconnect confirmation */}
      <AlertDialog open={!!accountPendingDisconnect} onOpenChange={(open) => !open && setAccountPendingDisconnect(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2 className="size-5 text-rose-500" />
            </AlertDialogMedia>
            <AlertDialogTitle>
              Disconnect {accountPendingDisconnect ? providerLabel(accountPendingDisconnect) : "account"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You will no longer be able to sign in with this method.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDisconnectMethod}>
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
