"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-pearl px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/logo.jpg"
            alt="Lumen Socialite"
            className="mx-auto h-16 w-16 rounded-full object-cover object-top shadow-md"
          />
          <h1 className="mt-4 text-2xl font-bold text-charcoal">Lumen · Socialite</h1>
          <p className="mt-1 text-sm text-muted">Sign in to continue</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
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
                placeholder="••••••••"
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
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            Don’t have an account?{" "}
            <Link href="/signup" className="font-semibold text-gold-deep hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
