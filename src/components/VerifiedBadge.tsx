"use client";

import { BadgeCheck } from "lucide-react";

/**
 * PERMANENT verified badge designs — NEVER change once assigned.
 * Same simple BadgeCheck shape as founders for every special account.
 *
 * Locked forever:
 *   @thevip              → Champagne Frost Pearl
 *   @kendall.vip         → solid pink
 *   @igorpiven           → blue
 *   @mikeavramov         → red
 *   @mr.samsnuggles      → Champagne Frost Pearl
 *   @kennicktechnologies → half pink / half Champagne Frost Pearl
 *
 * Other verified users (by gender at verify time):
 *   male → blue | female → light pink | other → rainbow
 */
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
  const gid = `vb-${(u || "x").replace(/[^a-z0-9]/gi, "")}-${size}`;

  // ===== PERMANENT — do not alter these accounts =====
  if (u === "thevip") {
    return <BadgeCheck className={`${dim} fill-[#C9A86C] text-white`} />;
  }
  if (u === "kendall.vip") {
    return <BadgeCheck className={`${dim} fill-[#C2185B] text-white`} />;
  }
  if (u === "igorpiven") {
    return <BadgeCheck className={`${dim} fill-[#1D9BF0] text-white`} />;
  }
  if (u === "mikeavramov") {
    return <BadgeCheck className={`${dim} fill-[#E11D48] text-white`} />;
  }
  if (u === "mr.samsnuggles" || u === "samsnuggles1" || u === "mrsamsnuggles") {
    return <BadgeCheck className={`${dim} fill-[#C9A86C] text-white`} />;
  }

  // KenNick Technologies LLC — same simple badge shape, 2 colors permanent
  if (
    u === "kennicktechnologies" ||
    u === "kennick" ||
    u === "kennicktechnologiesllc"
  ) {
    return (
      <svg viewBox="0 0 24 24" className={dim} aria-label="Verified" role="img">
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="50%" stopColor="#C2185B" />
            <stop offset="50%" stopColor="#C9A86C" />
          </linearGradient>
        </defs>
        {/* Same badge+check silhouette style as BadgeCheck */}
        <path
          fill={`url(#${gid})`}
          d="M12 2L9.19 4.54 5.4 4.36 4.36 8.14 1.82 10.95 4.36 13.76 5.4 17.54 9.19 17.36 12 19.9 14.81 17.36 18.6 17.54 19.64 13.76 22.18 10.95 19.64 8.14 18.6 4.36 14.81 4.54 12 2z"
        />
        <path
          fill="#fff"
          d="M10.1 14.95l-3.05-3.05 1.13-1.13 1.92 1.92 4.72-4.72 1.13 1.13-5.85 5.85z"
        />
      </svg>
    );
  }

  // ===== Standard verified (gender) — permanent once verified with that gender =====
  if (g === "male" || g === "m") {
    return <BadgeCheck className={`${dim} fill-[#1D9BF0] text-white`} />;
  }
  if (g === "female" || g === "f") {
    return <BadgeCheck className={`${dim} fill-[#F8A5C2] text-white`} />;
  }
  if (g === "other" || g === "nonbinary" || g === "non-binary") {
    return (
      <svg viewBox="0 0 24 24" className={dim} aria-label="Verified" role="img">
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF0018" />
            <stop offset="20%" stopColor="#FFA52C" />
            <stop offset="40%" stopColor="#FFFF41" />
            <stop offset="60%" stopColor="#008018" />
            <stop offset="80%" stopColor="#0000F9" />
            <stop offset="100%" stopColor="#86007D" />
          </linearGradient>
        </defs>
        <path
          fill={`url(#${gid})`}
          d="M12 2L9.19 4.54 5.4 4.36 4.36 8.14 1.82 10.95 4.36 13.76 5.4 17.54 9.19 17.36 12 19.9 14.81 17.36 18.6 17.54 19.64 13.76 22.18 10.95 19.64 8.14 18.6 4.36 14.81 4.54 12 2z"
        />
        <path
          fill="#fff"
          d="M10.1 14.95l-3.05-3.05 1.13-1.13 1.92 1.92 4.72-4.72 1.13 1.13-5.85 5.85z"
        />
      </svg>
    );
  }

  return <BadgeCheck className={`${dim} fill-[#C9A86C] text-white`} />;
}
