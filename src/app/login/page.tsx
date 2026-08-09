"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, resetPasswordForEmail } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [mode, setMode] = useState<"login" | "forgot">("login");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");

    if (mode === "forgot") {
      const { error } = await resetPasswordForEmail(email);
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      setInfo("Check your email for a link to reset your password.");
      return;
    }

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
    <div className="flex min-h-screen items-center justify-center bg-pearl px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img
            src="/logo-official.jpg"
            alt="Lumen · Socialite"
            className="mx-auto h-44 w-44 rounded-full object-cover object-center shadow-lg ring-2 ring-[#C9A86C]/35 sm:h-52 sm:w-52"
          />
          <p className="mt-4 text-sm text-muted">
            {mode === "login" ? "Sign in to continue" : "Reset your password"}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
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

            {mode === "login" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-charcoal">Password</label>
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
            )}

            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
            )}
            {info && (
              <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{info}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-gold py-3.5 text-[15px] font-bold text-white transition hover:bg-gold-deep disabled:opacity-60"
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                ? "Sign in"
                : "Send reset link"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm">
            {mode === "login" ? (
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setError("");
                  setInfo("");
                }}
                className="font-semibold text-gold-deep hover:underline"
              >
                Forgot password?
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                  setInfo("");
                }}
                className="font-semibold text-gold-deep hover:underline"
              >
                Back to sign in
              </button>
            )}
          </p>

          <p className="mt-4 text-center text-sm text-muted">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-gold-deep hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
