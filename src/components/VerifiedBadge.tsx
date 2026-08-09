"use client";

import { BadgeCheck } from "lucide-react";

/**
 * Verified badge colors
 * PERMANENT (never change):
 *   @thevip       → solid Champagne Frost Pearl
 *   @kendall.vip  → solid pink
 * Everyone else (when verified) by gender choice:
 *   male   → blue
 *   female → light pink
 *   other  → rainbow
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
  const gradId = `rb-${(u || "x").replace(/[^a-z0-9]/gi, "")}-${size}`;

  // ===== PERMANENT founder badges — do not alter =====
  if (u === "thevip") {
    return <BadgeCheck className={`${dim} fill-[#C9A86C] text-white`} />;
  }
  if (u === "kendall.vip") {
    return <BadgeCheck className={`${dim} fill-[#C2185B] text-white`} />;
  }
  // Optional fixed blue for Igor (remove this block if he should follow gender only)
  if (u === "igorpiven") {
    return <BadgeCheck className={`${dim} fill-[#1D9BF0] text-white`} />;
  }
  // Mike Avramov — permanent solid red verification
  if (u === "mikeavramov") {
    return <BadgeCheck className={`${dim} fill-[#E11D48] text-white`} />;
  }
  // Mr. Sam Snuggles — champagne frost pearl (same family as @thevip)
  if (u === "mr.samsnuggles" || u === "samsnuggles1" || u === "mrsamsnuggles") {
    return <BadgeCheck className={`${dim} fill-[#C9A86C] text-white`} />;
  }
  // KenNick Technologies — half pink / half champagne frost pearl
  if (u === "kennicktechnologies" || u === "kennick" || u === "kennicktechnologiesllc") {
    const gid = `kn-badge-${size}`;
    return (
      <svg viewBox="0 0 24 24" className={dim} aria-hidden>
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E91E63" />
            <stop offset="50%" stopColor="#E91E63" />
            <stop offset="50%" stopColor="#C9A86C" />
            <stop offset="100%" stopColor="#C9A86C" />
          </linearGradient>
        </defs>
        <path
          fill={`url(#${gid})`}
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
        />
      </svg>
    );
  }

  // ===== Everyone else: by gender choice =====
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
        <path
          fill={`url(#${gradId})`}
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
        />
      </svg>
    );
  }

  // Verified but no gender set yet
  return <BadgeCheck className={`${dim} fill-[#C9A86C] text-white`} />;
}
