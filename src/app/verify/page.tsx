"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck, Upload, Camera, CreditCard, CheckCircle2 } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";

type DocType = "id" | "drivers_license" | "passport";

export default function VerifyPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [docType, setDocType] = useState<DocType>("id");
  const [docFront, setDocFront] = useState<File | null>(null);
  const [docBack, setDocBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);

  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const me = await getCurrentProfile();
      setProfile(me);
      if (me) {
        const { data } = await supabase
          .from("verification_requests")
          .select("status")
          .eq("user_id", me.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data?.status) setExistingStatus(data.status);
        if (me.verified) setExistingStatus("approved");
      }
      setLoading(false);
    })();
  }, []);

  async function uploadFile(file: File, path: string) {
    const { error } = await supabase.storage
      .from("verification")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    const { data } = supabase.storage.from("verification").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit() {
    if (!profile) {
      setError("Please sign in first");
      return;
    }
    if (!docFront || !selfie) {
      setError("Document front and selfie are required");
      return;
    }
    if (docType !== "passport" && !docBack) {
      setError("Please upload the back of your ID / license");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const base = `${profile.id}/${Date.now()}`;
      const frontUrl = await uploadFile(docFront, `${base}/front`);
      const backUrl = docBack ? await uploadFile(docBack, `${base}/back`) : null;
      const selfieUrl = await uploadFile(selfie, `${base}/selfie`);

      const { error: insErr } = await supabase.from("verification_requests").insert({
        user_id: profile.id,
        doc_type: docType,
        doc_front_url: frontUrl,
        doc_back_url: backUrl,
        selfie_url: selfieUrl,
        status: "pending_payment",
        paid: false,
        amount_cents: 6000,
        currency: "usd",
      });
      if (insErr) throw insErr;

      setDone(true);
      setStep(4);
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function markPaidDemo() {
    // Placeholder until Stripe is connected — marks paid + pending review
    if (!profile) return;
    setSubmitting(true);
    const { data: row } = await supabase
      .from("verification_requests")
      .select("id")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (row) {
      await supabase
        .from("verification_requests")
        .update({
          paid: true,
          paid_at: new Date().toISOString(),
          status: "pending_review",
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
    }
    setSubmitting(false);
    setExistingStatus("pending_review");
    alert("Payment recorded (demo). Stripe live checkout can be connected next. Status: pending review.");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[1280px] justify-center">
      <div className="hidden sm:flex">
        <Sidebar />
      </div>

      <main className="w-full max-w-[600px] border-x-0 border-border pb-16 sm:border-x sm:pb-0">
        <div className="sticky top-0 z-10 border-b border-border bg-pearl/85 backdrop-blur-md">
          <div className="flex items-center gap-3 px-4 py-3">
            <Link
              href="/more"
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-champagne/40"
            >
              <ArrowLeft className="h-5 w-5 text-charcoal" />
            </Link>
            <h1 className="text-xl font-bold text-charcoal">Get verified</h1>
          </div>
        </div>

        <div className="px-4 py-6">
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-border bg-pearl-soft p-4">
            <ShieldCheck className="mt-0.5 h-8 w-8 flex-shrink-0 text-gold-deep" />
            <div>
              <h2 className="text-lg font-bold text-charcoal">Lumen Identity Verification</h2>
              <p className="mt-1 text-[14px] leading-5 text-muted">
                Verify with government ID and a live selfie.{" "}
                <span className="font-semibold text-charcoal">$60 / year</span> per account.
                Badge color follows your gender setting (or special founder colors).
              </p>
            </div>
          </div>

          {!profile ? (
            <div className="text-center">
              <p className="text-muted">Sign in to start verification.</p>
              <Link href="/login" className="mt-4 inline-block font-semibold text-gold-deep">
                Sign in
              </Link>
            </div>
          ) : existingStatus === "approved" || profile.verified ? (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
              <p className="mt-3 font-bold text-charcoal">You are verified</p>
            </div>
          ) : existingStatus === "pending_review" ? (
            <div className="rounded-2xl border border-border bg-white p-6 text-center">
              <p className="font-bold text-charcoal">Under review</p>
              <p className="mt-2 text-sm text-muted">
                We received your documents and payment. You’ll get a badge when approved.
              </p>
            </div>
          ) : (
            <>
              {/* Steps */}
              <div className="mb-6 flex gap-2 text-[12px] font-medium text-muted">
                {[1, 2, 3, 4].map((s) => (
                  <div
                    key={s}
                    className={`flex-1 rounded-full py-1 text-center ${
                      step >= s ? "bg-gold/20 text-gold-deep" : "bg-champagne/40"
                    }`}
                  >
                    {s === 1 ? "ID type" : s === 2 ? "Upload" : s === 3 ? "Selfie" : "Pay"}
                  </div>
                ))}
              </div>

              {step === 1 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-charcoal">Choose document type</p>
                  {(
                    [
                      ["id", "National ID card"],
                      ["drivers_license", "Driver’s license"],
                      ["passport", "Passport"],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setDocType(val)}
                      className={`w-full rounded-xl border px-4 py-3 text-left text-[15px] font-medium transition ${
                        docType === val
                          ? "border-gold bg-gold/10 text-charcoal"
                          : "border-border text-charcoal hover:bg-champagne/30"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="mt-4 w-full rounded-full bg-gold py-3 font-bold text-white hover:bg-gold-deep"
                  >
                    Continue
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted">
                    Upload a clear photo of your document. No glare, all corners visible.
                  </p>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-charcoal">
                      Front of document *
                    </label>
                    <button
                      type="button"
                      onClick={() => frontRef.current?.click()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-pearl px-4 py-8 text-sm text-muted hover:bg-champagne/30"
                    >
                      <Upload className="h-5 w-5" />
                      {docFront ? docFront.name : "Upload front"}
                    </button>
                    <input
                      ref={frontRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => setDocFront(e.target.files?.[0] || null)}
                    />
                  </div>
                  {docType !== "passport" && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-charcoal">
                        Back of document *
                      </label>
                      <button
                        type="button"
                        onClick={() => backRef.current?.click()}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-pearl px-4 py-8 text-sm text-muted hover:bg-champagne/30"
                      >
                        <Upload className="h-5 w-5" />
                        {docBack ? docBack.name : "Upload back"}
                      </button>
                      <input
                        ref={backRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => setDocBack(e.target.files?.[0] || null)}
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 rounded-full border border-border py-3 font-semibold text-charcoal"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="flex-1 rounded-full bg-gold py-3 font-bold text-white hover:bg-gold-deep"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted">
                    Take a selfie holding your document next to your face (or a clear face selfie).
                    This confirms you own the ID.
                  </p>
                  <button
                    type="button"
                    onClick={() => selfieRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-pearl px-4 py-12 text-sm text-muted hover:bg-champagne/30"
                  >
                    <Camera className="h-8 w-8" />
                    {selfie ? selfie.name : "Take or upload selfie"}
                  </button>
                  <input
                    ref={selfieRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={(e) => setSelfie(e.target.files?.[0] || null)}
                  />
                  {error && (
                    <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="flex-1 rounded-full border border-border py-3 font-semibold text-charcoal"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={async () => {
                        await handleSubmit();
                      }}
                      className="flex-1 rounded-full bg-gold py-3 font-bold text-white hover:bg-gold-deep disabled:opacity-60"
                    >
                      {submitting ? "Uploading..." : "Submit & pay"}
                    </button>
                  </div>
                </div>
              )}

              {(step === 4 || done) && (
                <div className="space-y-4 text-center">
                  <CreditCard className="mx-auto h-10 w-10 text-gold-deep" />
                  <h3 className="text-lg font-bold text-charcoal">Pay $60 / year</h3>
                  <p className="text-sm text-muted">
                    Documents uploaded. Complete payment to start review. Stripe live payments can be
                    connected next — demo records payment for now.
                  </p>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={markPaidDemo}
                    className="w-full rounded-full bg-gold py-3.5 font-bold text-white hover:bg-gold-deep disabled:opacity-60"
                  >
                    {submitting ? "Processing..." : "Pay $60 (demo)"}
                  </button>
                  <p className="text-[12px] text-muted">
                    Real card checkout (Stripe) can be added when you provide keys.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
