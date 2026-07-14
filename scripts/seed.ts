// scripts/seed.ts
// Run with: npx tsx scripts/seed.ts   (or: npx ts-node scripts/seed.ts)
// Requires MONGODB_URI in your environment, pointing at lokalads-staging.

import dbConnect from "../src/lib/db/dbConnect";
import User from "../src/lib/db/models/User";
import Listing from "../src/lib/db/models/Listing";
async function seed() {
  await dbConnect();

  console.log("Clearing existing staging data...");
  await User.deleteMany({});
  await Listing.deleteMany({});

  console.log("Creating dummy users...");

  const dave = await User.create({
    name: "Dave Morris",
    email: "dave.morris@example.com",
    passwordHash: "not-a-real-hash-placeholder",
    role: "Private Seller",
    location: "East London",
    tagline: "Selling my well-maintained family car",
    avatar: "/img/img1.jpg",
    verified: false,
    memberSince: new Date("2022-03-01"),
    lastActiveAt: new Date(),
    activeListingsCount: 1,
    likesCount: 42,
    followersCount: 18,
  });

  const apex = await User.create({
    name: "Apex Car Sales",
    email: "sales@apexcars.example.com",
    passwordHash: "not-a-real-hash-placeholder",
    role: "Car Dealer",
    location: "Croydon, London",
    tagline: "Trusted dealer, 500+ cars sold since 2015",
    avatar: "/img/img2.jpg",
    verified: true,
    memberSince: new Date("2015-06-01"),
    lastActiveAt: new Date(),
    activeListingsCount: 34,
    likesCount: 5200,
    followersCount: 2100,
  });

  const alice = await User.create({
    name: "Alice Chen",
    email: "alice.chen@example.com",
    passwordHash: "not-a-real-hash-placeholder",
    role: "Private Landlord",
    location: "Canary Wharf, London",
    tagline: "Renting out my second property",
    avatar: "/img/img3.jpg",
    verified: false,
    memberSince: new Date("2021-01-15"),
    lastActiveAt: new Date(),
    activeListingsCount: 2,
    likesCount: 95,
    followersCount: 40,
  });

  console.log("Creating dummy listings...");

  await Listing.create([
    // --- Vehicles: cars, 3-scenario coverage ---
    {
      country: "gb",
      category: "vehicles",
      subcategory: "cars",
      id: "veh-car-01",
      advId: "20001",
      images: [{ src: "/img/img4.jpg", alt: "2022 Toyota Camry Hybrid, front view" }],
      priceLabel: "£18,500",
      title: "2022 Toyota Camry Hybrid — 22,000 miles, Full FSH",
      detailsLabel: "22,000 MILES • HYBRID • AUTOMATIC • 1 OWNER",
      locationLabel: "East London",
      status: "active",
      listingType: "offer",
      description:
        "<p>Well looked after 2022 Toyota Camry Hybrid, one owner from new. Full Toyota service history, all receipts available.</p><p>Selling as I'm relocating abroad. Available for viewing evenings and weekends.</p>",
      keyDetails: [
        { key: "Make / Model", value: "Toyota Camry Hybrid" },
        { key: "Year / Reg", value: "2022 / 72 plate" },
        { key: "Mileage", value: "22,000 miles" },
        { key: "Fuel Type", value: "Hybrid" },
        { key: "Transmission", value: "Automatic" },
        { key: "Body Type", value: "Saloon" },
      ],
      goodToKnow: [
        { key: "Condition", value: "Excellent, no known faults" },
        { key: "MOT Expiry", value: "March 2027" },
        { key: "Service Hist.", value: "Full Toyota main dealer" },
        { key: "Owners", value: "1" },
        { key: "Part Exchange", value: "Not considered" },
      ],
      coordinates: { lat: 51.5416, lng: -0.0553 },
      seller: {
        userId: dave._id,
        name: dave.name,
        role: dave.role,
        location: dave.location,
        avatar: dave.avatar,
        verified: dave.verified,
      },
    },
    {
      country: "gb",
      category: "vehicles",
      subcategory: "cars",
      id: "veh-car-02",
      advId: "20002",
      images: [{ src: "/img/img5.jpg", alt: "2024 BMW 3 Series on dealer forecourt" }],
      priceLabel: "£32,999",
      title: "2024 BMW 3 Series M Sport — Dealer Warranty Included",
      detailsLabel: "8,500 MILES • PETROL • AUTOMATIC • DEALER",
      locationLabel: "Croydon, London",
      status: "active",
      listingType: "offer",
      description:
        "<p>Nearly-new BMW 3 Series M Sport, supplied and maintained by Apex Car Sales. Comes with 12 months warranty and full dealer aftercare.</p><p>Part exchange welcome, finance options available on request.</p>",
      keyDetails: [
        { key: "Make / Model", value: "BMW 3 Series M Sport" },
        { key: "Year / Reg", value: "2024 / 24 plate" },
        { key: "Mileage", value: "8,500 miles" },
        { key: "Fuel Type", value: "Petrol" },
        { key: "Transmission", value: "Automatic" },
        { key: "Body Type", value: "Saloon" },
      ],
      goodToKnow: [
        { key: "Condition", value: "As new" },
        { key: "MOT Expiry", value: "Not required (new)" },
        { key: "Service Hist.", value: "Full BMW dealer" },
        { key: "Owners", value: "1" },
        { key: "Part Exchange", value: "Welcome" },
      ],
      coordinates: { lat: 51.3762, lng: -0.0982 },
      seller: {
        userId: apex._id,
        name: apex.name,
        role: apex.role,
        location: apex.location,
        avatar: apex.avatar,
        verified: apex.verified,
      },
    },
    // --- Property: to_rent ---
    {
      country: "gb",
      category: "property",
      subcategory: "to_rent",
      id: "prop-rent-01",
      advId: "10001",
      images: [{ src: "/img/img6.jpg", alt: "1-bedroom flat living room, Canary Wharf" }],
      priceLabel: "£2,100",
      priceSuffix: "/ mo",
      title: "Modern 1-Bed Flat — Canary Wharf, Furnished, River Views",
      detailsLabel: "1 BED • 1 BATH • FURNISHED • AVAILABLE NOW",
      locationLabel: "Canary Wharf, London",
      status: "active",
      listingType: "offer",
      description:
        "<p>Bright and modern one-bedroom flat on the 14th floor with river views. Fully furnished, includes gym and concierge access.</p><p>Available immediately, minimum 12 month tenancy preferred.</p>",
      keyDetails: [
        { key: "Furnishing", value: "Fully Furnished" },
        { key: "Security Deposit", value: "£2,423 (5 weeks)" },
        { key: "Available From", value: "Immediately" },
        { key: "Listed By", value: "Private Landlord" },
        { key: "Min Tenancy", value: "12 months" },
        { key: "Pet Friendly", value: "No" },
      ],
      goodToKnow: [
        { key: "Available", value: "Now" },
        { key: "Agent Fee", value: "None — direct from landlord" },
        { key: "Smoking", value: "Not permitted" },
        { key: "Parking", value: "Available, additional cost" },
        { key: "Security", value: "24hr concierge" },
      ],
      coordinates: { lat: 51.5054, lng: -0.0235 },
      seller: {
        userId: alice._id,
        name: alice.name,
        role: alice.role,
        location: alice.location,
        avatar: alice.avatar,
        verified: alice.verified,
      },
    },
  ]);

  console.log("Done. Seeded 3 users and 3 listings into lokalads-staging.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});