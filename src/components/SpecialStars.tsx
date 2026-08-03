"use client";

/** Unique founder/co-founder star badges */
export default function SpecialStars({ username }: { username: string }) {
  const u = username.toLowerCase();

  if (u === "thevip") {
    return (
      <span
        className="ml-1 inline-flex items-center gap-0.5"
        title="Founder"
        style={{ fontFamily: "Times New Roman, Times, serif" }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="relative inline-flex h-[14px] w-[14px] items-center justify-center"
          >
            <svg viewBox="0 0 24 24" className="h-[14px] w-[14px] fill-[#C9A86C] drop-shadow-sm">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <svg
              viewBox="0 0 24 24"
              className="absolute h-[7px] w-[7px] fill-white"
              style={{ top: "3.5px" }}
            >
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </span>
        ))}
      </span>
    );
  }

  if (u === "kendall.vip") {
    return (
      <span
        className="ml-1 inline-flex items-center gap-0.5"
        title="Co-founder"
        style={{ fontFamily: "Times New Roman, Times, serif" }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="relative inline-flex h-[14px] w-[14px] items-center justify-center"
          >
            <svg viewBox="0 0 24 24" className="h-[14px] w-[14px] fill-[#E8A0BF] drop-shadow-sm">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <svg
              viewBox="0 0 24 24"
              className="absolute h-[7px] w-[7px] fill-white"
              style={{ top: "3.5px" }}
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
