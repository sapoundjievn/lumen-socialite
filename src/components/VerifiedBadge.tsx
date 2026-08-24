"use client";

/**
 * Lumen · Socialite verification badge — complex seal (starburst + white check).
 * Colors are permanent per account. Shape is the same seal for everyone.
 *
 * Locked colors:
 *   @thevip              → Champagne Frost Pearl
 *   @kendall.vip         → solid pink
 *   @igorpiven           → blue
 *   @JayTowers69         → blue
 *   @Tireur              → blue
 *   @berdychowski        → blue
 *   @MsKaceeQuinn        → pink
 *   @JustinHenrycomedy   → blue
 *   @mikeavramov         → red
 *   @mr.samsnuggles      → Champagne Frost Pearl
 *   @kennicktechnologies → Champagne Frost Pearl
 *   @backpainreliefclinic → pink
 *
 * Other verified users (gender at verify time):
 *   male → blue | female → light pink | other → rainbow
 */

function Seal({
  fill,
  dim,
  gid,
}: {
  fill: string;
  dim: string;
  gid?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={dim} aria-label="Verified" role="img">
      {gid ? (
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
      ) : null}
      <path
        fill={gid ? `url(#${gid})` : fill}
        d="M12 1.2l1.55 3.85 3.95-1.25-1.15 4.05 4.05 1.2-3.3 2.55 3.3 2.55-4.05 1.2 1.15 4.05-3.95-1.25L12 22.8l-1.55-3.85-3.95 1.25 1.15-4.05-4.05-1.2 3.3-2.55-3.3-2.55 4.05-1.2-1.15-4.05 3.95 1.25L12 1.2z"
      />
      <path
        fill="#fff"
        d="M10.05 15.05L6.9 11.9l1.2-1.2 1.95 1.95 5.05-5.05 1.2 1.2-6.25 6.25z"
      />
    </svg>
  );
}

export default function VerifiedBadge({
  username,
  gender,
  size = "sm",
}: {
  username?: string | null;
  gender?: string | null;
  size?: "sm" | "md";
}) {
  const u = (username || "").toLowerCase().replace(/^@/, "");
  const g = (gender || "").toLowerCase();
  const dim =
    size === "md"
      ? "h-[18px] w-[18px] flex-shrink-0 sm:h-5 sm:w-5"
      : "h-4 w-4 flex-shrink-0";
  const gid = `vb-${(u || "x").replace(/[^a-z0-9]/gi, "")}-${size}`;

  if (u === "thevip") return <Seal fill="#C9A86C" dim={dim} />;
  if (u === "kendall.vip") return <Seal fill="#C2185B" dim={dim} />;
  if (u === "igorpiven") return <Seal fill="#1D9BF0" dim={dim} />;
  if (u === "jaytowers69") return <Seal fill="#1D9BF0" dim={dim} />;
  if (u === "tireur") return <Seal fill="#1D9BF0" dim={dim} />;
  if (u === "berdychowski") return <Seal fill="#1D9BF0" dim={dim} />;
  if (u === "mskaceequinn") return <Seal fill="#EC4899" dim={dim} />;
  if (
    u === "justinhenrycomedy" ||
    u.replace(/[^a-z0-9]/g, "") === "justinhenrycomedy"
  ) {
    return <Seal fill="#1D9BF0" dim={dim} />;
  }
  if (u === "mikeavramov") return <Seal fill="#E11D48" dim={dim} />;
  if (u === "mr.samsnuggles" || u === "samsnuggles1" || u === "mrsamsnuggles") {
    return <Seal fill="#C9A86C" dim={dim} />;
  }
  if (
    u === "kennicktechnologies" ||
    u === "kennick" ||
    u === "kennicktechnologiesllc"
  ) {
    return <Seal fill="#C9A86C" dim={dim} />;
  }
  if (u === "backpainreliefclinic") return <Seal fill="#F8A5C2" dim={dim} />;

  if (g === "male" || g === "m") return <Seal fill="#1D9BF0" dim={dim} />;
  if (g === "female" || g === "f") return <Seal fill="#F8A5C2" dim={dim} />;
  if (g === "other" || g === "nonbinary" || g === "non-binary") {
    return <Seal fill="#000" dim={dim} gid={gid} />;
  }

  return <Seal fill="#C9A86C" dim={dim} />;
}
