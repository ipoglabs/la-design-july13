import { Schema, model, models, Types, Document } from "mongoose";
import bcrypt from "bcryptjs";

/**
 * Matches the REAL production schema in `lokalads.users` (confirmed from a
 * live document, 2026-07-14) — not the earlier invented mock-card shape.
 * Key differences from the old draft:
 *   - name is firstName + lastName, not a single `name` field
 *   - phone is `primaryNumber`, not `phone`
 *   - password field is literally `password` (already bcrypt, $2b$10$...),
 *     not `passwordHash`
 *   - no `avatar`/`cover`/`tagline`/`verified`/counts — those were invented
 *     for the mock seller-card UI and don't exist on real accounts. If your
 *     UI needs an avatar/verified badge, that likely lives in a separate
 *     profile/agency collection — flag if so and I'll model that too.
 *   - `role` values seen so far: "agency" — treating as open string since
 *     the full enum isn't confirmed; tighten this once you share the list
 *     of valid roles used elsewhere in your auth code.
 */

export interface IAuditEntry {
  IPAddress: string;
  Device: string;
  at: Date;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  userId: string; // sequential display id, e.g. "000000000027"
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  gender?: string;
  locality?: string;
  email: string;
  isEmailVerified: boolean;
  primaryNumber?: string;
  isPrimaryNumberVerified: boolean;
  password: string;
  comparePassword(candidate: string): Promise<boolean>;
  role: string; // e.g. "agency" — see note above on tightening this
  provider: string; // "credentials" | "google" (next-auth) etc.
  accountStatus: string; // e.g. "Pending" — confirm full set of values
  isNewUser: boolean;
  isTermsAndConditionAccepted: boolean;
  isPrivacyAndPolicyAccepted: boolean;
  isCookiesPolicyAccepted: boolean;
  marketingOptIn: boolean;
  isSuspended: boolean;
  reported: boolean;
  audit: IAuditEntry[];
  isDeleted: boolean;
  otp?: string | null;
  reports: unknown[]; // shape unconfirmed — tighten once you share a populated example
  createdAt: Date;
  updatedAt: Date;
}

const AuditEntrySchema = new Schema<IAuditEntry>(
  {
    IPAddress: { type: String, required: true },
    Device: { type: String, required: true },
    at: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    userId: { type: String, required: true, unique: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date },
    gender: { type: String },
    locality: { type: String },

    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    isEmailVerified: { type: Boolean, default: false },

    primaryNumber: { type: String, unique: true, sparse: true, trim: true },
    isPrimaryNumberVerified: { type: Boolean, default: false },

    password: { type: String, required: true, select: false },

    role: { type: String, required: true },
    provider: { type: String, required: true, default: "credentials" },
    accountStatus: { type: String, required: true, default: "Pending" },

    isNewUser: { type: Boolean, default: true },
    isTermsAndConditionAccepted: { type: Boolean, default: false },
    isPrivacyAndPolicyAccepted: { type: Boolean, default: false },
    isCookiesPolicyAccepted: { type: Boolean, default: false },
    marketingOptIn: { type: Boolean, default: false },

    isSuspended: { type: Boolean, default: false },
    reported: { type: Boolean, default: false },
    audit: { type: [AuditEntrySchema], default: [] },
    isDeleted: { type: Boolean, default: false },
    otp: { type: String, default: null },
    reports: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true } // produces createdAt/updatedAt exactly as seen in the real doc
);

// Hash `password` automatically whenever it's set/changed. Assign the PLAIN
// password to this field — never pre-hash it yourself, or it'll double-hash.
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.comparePassword = async function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

export default models.User || model<IUser>("User", UserSchema);