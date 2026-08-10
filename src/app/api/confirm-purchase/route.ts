import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/** After Stripe redirect: verify session paid and record ownership */
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

    if (session.payment_status !== "paid") {
      return NextResponse.json({
        error: "Payment not completed",
        status: session.payment_status,
      });
    }

    const meta = session.metadata || {};
    const trackId = meta.track_id;
    const buyerId = meta.buyer_id;
    const artistId = meta.artist_id;
    const priceCents = Number(meta.price_cents || session.amount_total || 0);
    const fee = Number(meta.platform_fee_cents || Math.round(priceCents * 0.1));

    const supabase = createClient(supabaseUrl, serviceKey);
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
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, trackId, artistId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
