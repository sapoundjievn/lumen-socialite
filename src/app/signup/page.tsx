"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Building2, Music } from "lucide-react";
import { signUp } from "@/lib/auth";
import { cn } from "@/lib/utils";

type AccountType = "personal" | "business" | "musician";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("personal");
  const [agreeFee, setAgreeFee] = useState(false);
  const [agreeCopyright, setAgreeCopyright] = useState(false);
  const [eSignature, setESignature] = useState("");
  const [agreeGuidelines, setAgreeGuidelines] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
      setError("Username can only contain letters, numbers, underscores and dots");
      setLoading(false);
      return;
    }

    if (!agreeGuidelines) {
      setError("You must agree to the Community Guidelines to create an account");
      setLoading(false);
      return;
    }

    if (accountType === "personal" && !gender) {
      setError("Please select your gender");
      setLoading(false);
      return;
    }

    if (accountType === "musician") {
      if (!agreeFee || !agreeCopyright) {
        setError("You must accept the musician fee and copyright terms");
        setLoading(false);
        return;
      }
      if (!eSignature.trim() || eSignature.trim().length < 2) {
        setError("Type your full legal name as electronic signature");
        setLoading(false);
        return;
      }
    }

    const { error } = await signUp(
      email,
      password,
      username,
      displayName,
      accountType === "personal" ? gender : undefined,
      accountType,
      accountType === "musician"
        ? { signature: eSignature.trim(), agreeFee, agreeCopyright }
        : undefined
    );

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 1500);
  };

  const types: { id: AccountType; label: string; desc: string; icon: typeof User }[] = [
    { id: "personal", label: "Personal", desc: "For individuals", icon: User },
    { id: "business", label: "Business", desc: "Companies · banner only", icon: Building2 },
    { id: "musician", label: "Musician", desc: "Upload & sell music · 10% fee", icon: Music },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-pearl px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img
            src="/logo-official.png"
            alt="Lumen · Socialite"
            className="mx-auto h-44 w-44 rounded-full object-contain object-center shadow-lg ring-2 ring-[#C9A86C]/35 sm:h-52 sm:w-52"
          />
          <p className="mt-1 text-sm text-muted">Create your account</p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
          {success ? (
            <div className="py-6 text-center">
              <div className="mb-3 text-4xl">✨</div>
              <h2 className="text-xl font-bold text-charcoal">Welcome to Lumen</h2>
              <p className="mt-2 text-muted">Your account has been created.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-charcoal">
                  Account type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {types.map(({ id, label, desc, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setAccountType(id)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition",
                        accountType === id
                          ? "border-gold bg-gold/10 text-charcoal"
                          : "border-border text-muted hover:bg-champagne/30"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-[12px] font-bold leading-tight">{label}</span>
                      <span className="text-[10px] leading-tight text-muted">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-charcoal">
                  {accountType === "business" ? "Company name" : "Display name"}
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-pearl px-4 py-3 text-[15px] text-charcoal placeholder:text-muted-light focus:border-gold-soft focus:outline-none focus:ring-1 focus:ring-gold-soft"
                  placeholder={
                    accountType === "business"
                      ? "Company name"
                      : accountType === "musician"
                      ? "Artist name"
                      : "Your name"
                  }
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-charcoal">Username</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full rounded-xl border border-border bg-pearl py-3 pl-8 pr-4 text-[15px] text-charcoal placeholder:text-muted-light focus:border-gold-soft focus:outline-none focus:ring-1 focus:ring-gold-soft"
                    placeholder="username"
                  />
                </div>
              </div>

              {accountType === "personal" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-charcoal">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    required
                    className="w-full rounded-xl border border-border bg-pearl px-4 py-3 text-[15px] text-charcoal focus:border-gold-soft focus:outline-none focus:ring-1 focus:ring-gold-soft"
                  >
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-charcoal">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-pearl px-4 py-3 text-[15px] text-charcoal placeholder:text-muted-light focus:border-gold-soft focus:outline-none focus:ring-1 focus:ring-gold-soft"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-charcoal">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-border bg-pearl px-4 py-3 text-[15px] text-charcoal placeholder:text-muted-light focus:border-gold-soft focus:outline-none focus:ring-1 focus:ring-gold-soft"
                  placeholder="At least 6 characters"
                />
              </div>

              {accountType === "musician" && (
                <div className="space-y-3 rounded-xl border border-border bg-champagne/30 p-3">
                  <p className="text-[12px] font-bold text-charcoal">Musician Agreement</p>
                  <p className="text-[12px] leading-5 text-muted">
                    Musicians can upload tracks and sell them on Lumen. Platform fee:{" "}
                    <span className="font-semibold text-charcoal">10% per sale</span>. You keep 90%.
                    By signing, you agree this fee applies to every sale on Lumen.
                  </p>
                  <label className="flex items-start gap-2 text-[12px] text-charcoal">
                    <input
                      type="checkbox"
                      checked={agreeFee}
                      onChange={(e) => setAgreeFee(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>I agree to the 10% platform fee on every music sale on Lumen Socialite.</span>
                  </label>
                  <label className="flex items-start gap-2 text-[12px] text-charcoal">
                    <input
                      type="checkbox"
                      checked={agreeCopyright}
                      onChange={(e) => setAgreeCopyright(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      I own the copyright (or have exclusive rights) to any music I upload. I will only
                      upload tracks I have the legal right to sell. False claims may result in removal
                      and account action.
                    </span>
                  </label>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted">
                      Electronic signature (type your full legal name)
                    </label>
                    <input
                      type="text"
                      value={eSignature}
                      onChange={(e) => setESignature(e.target.value)}
                      placeholder="Full legal name"
                      className="w-full rounded-xl border border-border bg-white px-3 py-2 text-[14px] text-charcoal"
                    />
                    <p className="mt-1 text-[10px] text-muted">
                      Typing your name is your electronic signature and forms a binding agreement.
                    </p>
                  </div>
                </div>
              )}
              {accountType === "business" && (
                <p className="rounded-lg bg-champagne/40 px-3 py-2 text-[12px] text-muted">
                  Business profiles use a company banner (no profile photo). You can change the
                  banner anytime.
                </p>
              )}


              <div className="space-y-2 rounded-xl border border-border bg-pearl p-3">
                <p className="text-[12px] font-bold text-charcoal">Community Guidelines</p>
                <ul className="list-disc space-y-1 pl-4 text-[11px] leading-4 text-muted">
                  <li>Be respectful. No harassment, hate, or threats.</li>
                  <li>No illegal content, scams, or spam.</li>
                  <li>Only post content you have the right to share.</li>
                  <li>No impersonation of others or fake identity for harm.</li>
                  <li>Keep Lumen safe — report abuse when you see it.</li>
                  <li>We may remove content or accounts that break these rules.</li>
                </ul>
                <label className="flex items-start gap-2 pt-1 text-[12px] text-charcoal">
                  <input
                    type="checkbox"
                    checked={agreeGuidelines}
                    onChange={(e) => setAgreeGuidelines(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    I have read and agree to the Lumen · Socialite Community Guidelines. This applies
                    to Personal, Business, and Musician accounts.
                  </span>
                </label>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-gold py-3.5 text-[15px] font-bold text-white transition hover:bg-gold-deep disabled:opacity-60"
              >
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>
          )}

          {!success && (
            <p className="mt-6 text-center text-sm text-muted">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-gold-deep hover:underline">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
