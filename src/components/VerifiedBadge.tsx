"use client";

import { BadgeCheck } from "lucide-react";

/** Verified check — special accounts keep classic BadgeCheck; others by gender */
export default function VerifiedBadge({
  username,
  gender,
  size = "sm",
}: {
  username?: string | null;
  gender?: string | null;
  size?: "sm" | "md";
}) {
  const u = (username || "").toLowerCase();
  const g = (gender || "").toLowerCase();
  const dim =
    size === "md"
      ? "h-[18px] w-[18px] flex-shrink-0 sm:h-5 sm:w-5"
      : "h-4 w-4 flex-shrink-0";
  const gradId = `rb-${(u || "x").replace(/[^a-z0-9]/gi, "")}-${size}`;

  // Special accounts — classic lucide BadgeCheck (pre-gender system look)
  if (u === "thevip") {
    return (
      <BadgeCheck className={`${dim} fill-[#C9A86C] text-white`} />
    );
  }
  if (u === "kendall.vip") {
    return (
      <BadgeCheck className={`${dim} fill-[#C2185B] text-white`} />
    );
  }
  if (u === "igorpiven") {
    return (
      <BadgeCheck className={`${dim} fill-[#1D9BF0] text-white`} />
    );
  }

  // By gender
  if (g === "male" || g === "m") {
    return <BadgeCheck className={`${dim} fill-[#1D9BF0] text-white`} />;
  }
  if (g === "female" || g === "f") {
    return <BadgeCheck className={`${dim} fill-[#F8A5C2] text-white`} />;
  }
  if (g === "other" || g === "nonbinary" || g === "non-binary") {
    return (
      <svg viewBox="0 0 24 24" className={dim} aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF0018" />
            <stop offset="20%" stopColor="#FFA52C" />
            <stop offset="40%" stopColor="#FFFF41" />
            <stop offset="60%" stopColor="#008018" />
            <stop offset="80%" stopColor="#0000F9" />
            <stop offset="100%" stopColor="#86007D" />
          </linearGradient>
        </defs>
        {/* BadgeCheck-like shape */}
        <path
          fill={`url(#${gradId})`}
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
        />
      </svg>
    );
  }

  // Default champagne
  return <BadgeCheck className={`${dim} fill-[#C9A86C] text-white`} />;
}
