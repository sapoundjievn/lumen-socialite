import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/** Stripe webhook: mark track as purchased after successful payment */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!secret || !supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  try {
    const body = await req.json();
    // For production, verify Stripe-Signature with STRIPE_WEBHOOK_SECRET.
    // Checkout success page also finalizes purchase as a backup.

    const type = body?.type;
    if (type !== "checkout.session.completed") {
      return NextResponse.json({ received: true });
    }

    const session = body.data?.object;
    const meta = session?.metadata || {};
    const trackId = meta.track_id;
    const buyerId = meta.buyer_id;
    const artistId = meta.artist_id;
    const priceCents = Number(meta.price_cents || 0);
    const fee = Number(meta.platform_fee_cents || Math.round(priceCents * 0.1));

    if (!trackId || !buyerId || !artistId) {
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    await supabase.from("music_purchases").upsert(
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

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
