"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, resetPasswordForEmail } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  loginWithBiometrics,
  enableBiometricLogin,
  platformAuthenticatorAvailable,
  hasBiometricEnrollment,
} from "@/lib/biometrics";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [bioOk, setBioOk] = useState(false);
  const [bioEnrolled, setBioEnrolled] = useState(false);

  useEffect(() => {
    (async () => {
      setBioOk(await platformAuthenticatorAvailable());
      setBioEnrolled(hasBiometricEnrollment());
    })();
  }, []);

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
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && bioOk && !hasBiometricEnrollment()) {
        const enable = window.confirm(
          "Enable fingerprint / Face ID / Windows Hello for faster sign-in on this device?"
        );
        if (enable) {
          const r = await enableBiometricLogin({
            userId: session.user.id,
            email: session.user.email || email,
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          });
          if (!r.ok) console.warn(r.error);
        }
      } else if (session && hasBiometricEnrollment()) {
        // refresh stored tokens
        await enableBiometricLogin({
          userId: session.user.id,
          email: session.user.email || email,
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
      }
    } catch {
      /* ignore */
    }
    router.push("/");
    router.refresh();
  };

  async function handleBiometric() {
    setLoading(true);
    setError("");
    const r = await loginWithBiometrics();
    if (!r.ok || !r.refresh_token || !r.access_token) {
      setError(r.error || "Biometric sign-in failed");
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.setSession({
      access_token: r.access_token,
      refresh_token: r.refresh_token,
    });
    if (error) {
      setError(error.message + " — sign in with password once to refresh biometrics.");
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-pearl px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img
            src="/logo-official.png"
            alt="Lumen · Socialite"
            className="mx-auto h-28 w-28 sm:h-32 sm:w-32 object-contain object-center bg-transparent"
          />
          <p className="mt-4 text-sm text-muted">
            {mode === "login" ? t("continue") : t("resetPassword")}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-charcoal">{t("email")}</label>
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
                <label className="mb-1.5 block text-sm font-medium text-charcoal">{t("password")}</label>
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
      <p className="mt-6 text-center text-[12px] text-muted">
          <Link href="/privacy" className="hover:underline">Privacy</Link>
          {" · "}
          <Link href="/terms" className="hover:underline">Terms</Link>
          {" · "}
          <Link href="/support" className="hover:underline">Support</Link>
        </p>
      </div>
    </div>
  );
}

