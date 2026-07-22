import { notFound } from "next/navigation";
import LaDevClient from "./LaDevClient";

/**
 * /la-dev — dev-only user lookup + permanent delete, so a test account's
 * email/phone can be freed up (unique indexes) to re-run the registration
 * flow. Basic-Auth gated in proxy.ts like /design-system and /snippets;
 * also hard-blocked in production here regardless, since a permanent
 * cross-user delete tool has no business existing outside dev.
 */
export default function LaDevPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <LaDevClient />;
}
