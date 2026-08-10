import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/** After Stripe redirect: verify session paid and record ownership */
export async function POST(req: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Prefer service role so RLS cannot block purchase recording
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!key) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY missing" }, { status: 503 });
  }
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Supabase env missing" }, { status: 503 });
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

    // paid or no_payment_required
    if (session.payment_status !== "paid" && session.status !== "complete") {
      return NextResponse.json({
        error: "Payment not completed",
        status: session.payment_status,
        sessionStatus: session.status,
      });
    }

    const meta = session.metadata || {};
    const trackId = meta.track_id;
    const buyerId = meta.buyer_id;
    const artistId = meta.artist_id;
    const priceCents = Number(meta.price_cents || session.amount_total || 0);
    const fee = Number(meta.platform_fee_cents || Math.round(priceCents * 0.1));

    if (!trackId || !buyerId || !artistId) {
      return NextResponse.json(
        { error: "Missing track/buyer/artist in session metadata", meta },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Upsert ownership
    const { error } = await supabase.from("music_purchases").upsert(
      {
        track_id: trackId,
        buyer_id: buyerId,
        artist_id: artistId,
        price_cents: priceCents,
        platform_fee_cents: fee,
        stripe_session_id: session.id,
      } as any,
      { onConflict: "buyer_id,track_id" }
    );

    if (error) {
      // Fallback insert
      const { error: e2 } = await supabase.from("music_purchases").insert({
        track_id: trackId,
        buyer_id: buyerId,
        artist_id: artistId,
        price_cents: priceCents,
        platform_fee_cents: fee,
        stripe_session_id: session.id,
      } as any);
      if (e2) {
        return NextResponse.json(
          { error: e2.message || error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      trackId,
      artistId,
      artistUsername: meta.artist_username || null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
