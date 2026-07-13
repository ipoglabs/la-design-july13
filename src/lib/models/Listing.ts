/**
 * lib/models/Listing.ts
 *
 * Mongoose model for marketplace listings.
 * This is the DB schema — distinct from the display-layer `Listing` type in types/listing.ts.
 * The batch runner queries this collection to find matches for saved alerts.
 *
 * NOTE [SCHEMA MIGRATION — 2026-07-13]: This model is a minimal stub, not yet
 * the full target schema documented in md/architecture/database/01-schema.md
 * (advId, images, attributes, sellerSnapshot, coordinates, etc. are still
 * missing). `countryCode` + `slug` were added now — ahead of the rest — because
 * the POC→PROD country-prefixed URL migration (see .github/skills/la-seo)
 * requires a per-country-unique slug to build canonical/hreflang URLs. Do NOT
 * treat this file as schema-complete; extend it incrementally per the doc.
 */

import mongoose, { Schema, Document, Model } from "mongoose";
import type { CountryCode } from "@/config";

export type ListingDbStatus = "live" | "under_review" | "expired" | "sold" | "removed";

export interface IListing extends Document {
  countryCode: CountryCode;
  slug: string;
  title: string;
  description: string;
  category: string;
  subCategory?: string;
  price: number;
  location: string;
  status: ListingDbStatus;
  sellerId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ListingSchema = new Schema<IListing>(
  {
    // Internal config key — "in" | "gb" | "sg". Must match CountryCode in
    // config/types.ts exactly (ISO 3166-1 alpha-2, lowercase — "gb" not "uk").
    countryCode: { type: String, required: true, enum: ["in", "gb", "sg"], index: true },
    // URL-safe slug, e.g. "3-bed-flat-zone-2-canary-wharf" — unique PER
    // COUNTRY, not globally (see compound index below). Generation: slugify
    // the title; on duplicate-key error (Mongo code 11000), retry once with
    // the first 6 chars of _id appended.
    slug: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, required: true, index: true },
    subCategory: { type: String, index: true },
    price: { type: Number, required: true, min: 0 },
    location: { type: String, required: true, index: true },
    status: {
      type: String,
      required: true,
      enum: ["live", "under_review", "expired", "sold", "removed"],
      default: "live",
      index: true,
    },
    sellerId: { type: Schema.Types.ObjectId, required: true, ref: "User", index: true },
  },
  { timestamps: true },
);

// Slug is unique per country, not globally — two countries may reuse the same
// slug for unrelated listings (e.g. "iphone-14-pro" in both "in" and "gb").
ListingSchema.index({ countryCode: 1, slug: 1 }, { unique: true });

// Compound index for the most common batch query: live listings by category
ListingSchema.index({ status: 1, category: 1, createdAt: -1 });

const Listing: Model<IListing> =
  mongoose.models.Listing ?? mongoose.model<IListing>("Listing", ListingSchema);

export default Listing;
