import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ListingModel from "@/lib/models/Listing";
import {
  COUNTRY_CONFIGS,
  getAppStage,
  getListingsDataSource,
  type CountryCode,
} from "@/config";
import {
  getListingsForMarket,
  getCountsForMarket,
  isKnownCategory,
  isKnownSubcategory,
} from "@/lib/mock/country-map";
import type { ListingsApiResponse } from "@/types/listings-api";

const COUNTRY_CODES = Object.keys(COUNTRY_CONFIGS) as CountryCode[];

function parseCountryCode(raw: string | null): CountryCode | null {
  if (!raw) return null;
  const normalized = raw.toLowerCase();
  return COUNTRY_CODES.includes(normalized as CountryCode)
    ? (normalized as CountryCode)
    : null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ category: string }> },
) {
  const { category } = await params;
  const searchParams = req.nextUrl.searchParams;
  const country = parseCountryCode(searchParams.get("country"));

  if (!country) {
    return NextResponse.json(
      { error: "validation_error", message: "country must be one of: in, gb, sg" },
      { status: 400 },
    );
  }

  if (!isKnownCategory(category)) {
    return NextResponse.json(
      { error: "not_found", message: `unknown category: ${category}` },
      { status: 404 },
    );
  }

  const subRaw = searchParams.get("sub");
  if (subRaw && !isKnownSubcategory(category, subRaw)) {
    return NextResponse.json(
      { error: "validation_error", message: `sub is invalid for category=${category}` },
      { status: 400 },
    );
  }
  const sub = subRaw && isKnownSubcategory(category, subRaw) ? subRaw : null;

  const stage = getAppStage();
  const source = getListingsDataSource(country, stage);

  if (source === "db") {
    await dbConnect();

    const query: Record<string, unknown> = {
      countryCode: country,
      category,
      status: "live",
    };
    if (sub) query.subCategory = sub;

    const dbItems = await ListingModel.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // TODO [API INTEGRATION]: Map Listing Mongo documents to canonical `Listing` UI shape.
    // TODO [API INTEGRATION]: Add server-side pagination + metadata contracts.
    // TODO [API INTEGRATION]: Replace placeholder empty items with mapped DB payload.
    const response: ListingsApiResponse = {
      ok: true,
      source,
      market: country,
      categoryId: category,
      subCategoryId: sub,
      currency: COUNTRY_CONFIGS[country].currency,
      total: dbItems.length,
      generatedAt: new Date().toISOString(),
      countsBySubcategory: getCountsForMarket(category, country),
      items: [],
    };

    return NextResponse.json(response);
  }

  const items = getListingsForMarket(category, country, sub ?? undefined);
  const response: ListingsApiResponse = {
    ok: true,
    source,
    market: country,
    categoryId: category,
    subCategoryId: sub,
    currency: COUNTRY_CONFIGS[country].currency,
    total: items.length,
    generatedAt: new Date().toISOString(),
    countsBySubcategory: getCountsForMarket(category, country),
    items,
  };

  return NextResponse.json(response);
}
