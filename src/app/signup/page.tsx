"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Basic username validation
    if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
      setError("Username can only contain letters, numbers, underscores and dots");
      setLoading(false);
      return;
    }

    const { error } = await signUp(email, password, username, displayName);

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    // Redirect after short delay
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-pearl px-4 py-10">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/logo.jpg"
            alt="Lumen Socialite"
            className="mx-auto h-16 w-16 rounded-full object-cover object-top shadow-md"
          />
          <h1 className="mt-4 text-2xl font-bold text-charcoal">Lumen · Socialite</h1>
          <p className="mt-1 text-sm text-muted">Create your account</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
          {success ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">✨</div>
              <h2 className="text-xl font-bold text-charcoal">Welcome to Lumen</h2>
              <p className="mt-2 text-muted">Your account has been created.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-pearl px-4 py-3 text-[15px] text-charcoal placeholder:text-muted-light focus:border-gold-soft focus:outline-none focus:ring-1 focus:ring-gold-soft"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    required
                    className="w-full rounded-xl border border-border bg-pearl pl-8 pr-4 py-3 text-[15px] text-charcoal placeholder:text-muted-light focus:border-gold-soft focus:outline-none focus:ring-1 focus:ring-gold-soft"
                    placeholder="username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">
                  Email
                </label>
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
                <label className="block text-sm font-medium text-charcoal mb-1.5">
                  Password
                </label>
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

              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
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
