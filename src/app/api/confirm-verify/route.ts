import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/** After Stripe payment: mark verification request paid + pending_review */
export async function POST(req: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!key || !supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  try {
    const { sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ error: "Missing session" }, { status: 400 });
    }

    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${sessionId}`,
      { headers: { Authorization: `Bearer ${key}` } }
    );
    const session = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: session?.error?.message || "Session lookup failed" },
        { status: 400 }
      );
    }

    if (session.payment_status !== "paid" && session.status !== "complete") {
      return NextResponse.json({
        error: "Payment not completed",
        status: session.payment_status,
      });
    }

    if (session.metadata?.type !== "verification") {
      return NextResponse.json({ error: "Not a verification session" }, { status: 400 });
    }

    const userId = session.metadata?.user_id;
    if (!userId) {
      return NextResponse.json({ error: "Missing user_id in metadata" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: row } = await supabase
      .from("verification_requests")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (row?.id) {
      await supabase
        .from("verification_requests")
        .update({
          paid: true,
          paid_at: new Date().toISOString(),
          status: "pending_review",
          updated_at: new Date().toISOString(),
          stripe_session_id: session.id,
        } as any)
        .eq("id", row.id);
    } else {
      await supabase.from("verification_requests").insert({
        user_id: userId,
        paid: true,
        paid_at: new Date().toISOString(),
        status: "pending_review",
        stripe_session_id: session.id,
      } as any);
    }

    return NextResponse.json({ ok: true, userId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
