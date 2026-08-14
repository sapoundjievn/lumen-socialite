"use client";

/** Unique founder/co-founder star badges with identity line */
export default function SpecialStars({ username }: { username: string }) {
  const u = username.toLowerCase();

  if (u === "thevip") {
    return (
      <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-1.5">
        <span
          className="inline-flex shrink-0 items-center gap-0.5"
          title="Founder"
          style={{ fontFamily: "Times New Roman, Times, serif" }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="relative inline-flex h-[12px] w-[12px] items-center justify-center sm:h-[14px] sm:w-[14px]"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-full w-full fill-[#C9A86C]"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <svg
                viewBox="0 0 24 24"
                className="absolute h-[6px] w-[6px] fill-white sm:h-[7px] sm:w-[7px]"
                style={{ top: "3px" }}
              >
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </span>
          ))}
        </span>
        <span
          className="text-[11px] font-semibold leading-snug text-[#8B6914] sm:text-[12px] sm:leading-none"
          style={{ fontFamily: "Times New Roman, Times, serif" }}
        >
          Identity Verified • The VIP • Founder/Creator of the Platform
        </span>
      </div>
    );
  }

  if (u === "kendall.vip") {
    return (
      <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-1.5">
        <span
          className="inline-flex shrink-0 items-center gap-0.5"
          title="Co-founder"
          style={{ fontFamily: "Times New Roman, Times, serif" }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="relative inline-flex h-[12px] w-[12px] items-center justify-center sm:h-[14px] sm:w-[14px]"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-full w-full fill-[#E91E63]"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <svg
                viewBox="0 0 24 24"
                className="absolute h-[6px] w-[6px] fill-white sm:h-[7px] sm:w-[7px]"
                style={{ top: "3px" }}
              >
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </span>
          ))}
        </span>
        <span
          className="text-[11px] font-semibold leading-snug text-[#C2185B] sm:text-[12px] sm:leading-none"
          style={{ fontFamily: "Times New Roman, Times, serif" }}
        >
          Identity Verified • VIP • Co-founder
        </span>
      </div>
    );
  }


  if (u === "kennicktechnologies" || u === "kennick" || u === "kennicktechnologiesllc") {
    return (
      <span
        className="inline-flex items-center gap-0.5"
        title="KenNick Technologies LLC · Property of @thevip & @kendall.vip"
        style={{ fontFamily: "Times New Roman, Times, serif" }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="relative inline-flex h-[11px] w-[11px] items-center justify-center sm:h-[13px] sm:w-[13px]"
          >
            <svg viewBox="0 0 24 24" className="h-full w-full">
              <defs>
                <linearGradient id={`kn-star-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#E91E63" />
                  <stop offset="50%" stopColor="#E91E63" />
                  <stop offset="50%" stopColor="#C9A86C" />
                  <stop offset="100%" stopColor="#C9A86C" />
                </linearGradient>
              </defs>
              <path
                fill={`url(#kn-star-${i})`}
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              />
            </svg>
            <svg
              viewBox="0 0 24 24"
              className="absolute h-[5px] w-[5px] fill-white sm:h-[6px] sm:w-[6px]"
              style={{ top: "2.5px" }}
            >
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </span>
        ))}
      </span>
    );
  }

  return null;
}
