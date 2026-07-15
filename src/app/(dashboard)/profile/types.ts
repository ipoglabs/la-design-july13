/**
 * Shared value types for the /profile page and its co-located editors.
 * Split out of page.tsx (Golden Rule file-size split, 2026-07-14) so every
 * editor file can import these without depending on page.tsx itself.
 */

export type BasicInfoValues = {
  fullName: string;
  dateOfBirthIso: string;
  gender: "Male" | "Female" | "Prefer not to say";
};

export type ResidenceValues = {
  country: string;
  state: string;
  city: string;
};

export type PhoneEntry = {
  id: string;
  number: string;
  primary: boolean;
  /** Consent to show this number on public listings/profile. Defaults to
   *  false — buyers reach the seller via Chat until explicitly opted in. */
  visibleToBuyers: boolean;
};

export type ContactValues = {
  email: string;
  emailVerified: boolean;
  phones: PhoneEntry[];
};

export type SavedLocation = {
  id: number;
  flagCode: string; // ISO 3166-1 alpha-2 lowercase, e.g. "sg", "gb", "in"
  city: string;
  region: string;
  country: string;
  primary?: boolean;
};

export type ConnectedAccountProvider = "google" | "apple" | "magic_link";

export type ConnectedAccountStatus = "connected" | "not_connected";

export type ConnectedAccount = {
  provider: ConnectedAccountProvider;
  status: ConnectedAccountStatus;
  maskedIdentifier: string | null;
  linkedAtIso: string | null;
  lastUsedLabel: string | null;
  isPrimary: boolean;
};
