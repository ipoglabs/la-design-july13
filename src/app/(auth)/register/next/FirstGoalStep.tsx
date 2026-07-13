import { LaCard } from "@/components/la";
import Link from "next/link";
import { Home, Briefcase, Car, ShoppingBag, Search, ChevronRight } from "lucide-react";

/**
 * FirstGoalStep — Step 6 · What would you like to do today?
 * Onboarding destination — helps new user take their first meaningful action.
 *
 * TODO (API):
 *  - POST /api/auth/onboarding-goal — { goal } → record user's first goal for personalisation
 *  - "I'll do this later" → PATCH /api/auth/onboarding-skip — mark onboarding as skipped
 *  - Each goal option navigates to the relevant product page after recording the choice
 *
 * TODO (UX):
 *  - Highlight the selected goal before navigating (brief active state)
 *  - Goals list can be personalised based on country (e.g. hide "Find a Job" in SG)
 *  - Add more goal types as product grows (config-driven, not hardcoded)
 */

const GOALS = [
  { label: "Post a Property", icon: Home,         href: "/post?category=property" },
  { label: "Find a Job",      icon: Briefcase,     href: "/listings?category=jobs" },
  { label: "Sell a Vehicle",  icon: Car,           href: "/post?category=vehicles" },
  { label: "Sell an Item",    icon: ShoppingBag,   href: "/post?category=items" },
  { label: "Browse Ads",      icon: Search,        href: "/listings" },
] as const;

export function FirstGoalStep() {
  return (
    <div className="w-full flex items-center justify-center bg-slate-50 px-4 py-12">
      <LaCard className="w-full max-w-sm p-8 flex flex-col gap-6">
        {/* Heading */}
        <div className="flex flex-col gap-1 text-center">
          <h1 className="text-2xl font-bold text-slate-800">What would you like to do today?</h1>
          <p className="text-sm text-slate-600">Let&apos;s help you get started.</p>
        </div>

        {/* Goal list */}
        {/* TODO: record goal choice via POST /api/auth/onboarding-goal before navigating */}
        <div className="flex flex-col divide-y divide-slate-100">
          {GOALS.map(({ label, icon: Icon, href }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-3 py-3.5 px-1 hover:bg-slate-50 rounded-lg transition-colors group"
            >
              <div className="size-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-blue-50 transition-colors">
                <Icon className="size-5 text-slate-600 group-hover:text-blue-600 transition-colors" />
              </div>
              <span className="flex-1 text-base font-medium text-slate-800">{label}</span>
              <ChevronRight className="size-4 text-slate-400" />
            </Link>
          ))}
        </div>

        {/* Skip */}
        {/* TODO: POST /api/auth/onboarding-skip then redirect to / */}
        <Link href="/" className="text-center text-sm text-slate-500 hover:text-slate-700 hover:underline">
          I&apos;ll do this later
        </Link>
    </LaCard>
    </div>
  );
}
