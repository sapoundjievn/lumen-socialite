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
    const expandId = (raw: string) => {
      const s = String(raw).replace(/-/g, "");
      if (s.length !== 32) return raw;
      return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`;
    };
    const trackIds = `${meta.track_ids || ""},${meta.track_ids_2 || ""},${trackId || ""}`
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean)
      .map(expandId)
      .filter((id: string, i: number, arr: string[]) => arr.indexOf(id) === i);
    const buyerId = meta.buyer_id;
    const artistId = meta.artist_id;
    const priceCents = Number(meta.price_cents || session.amount_total || 0);
    const fee = Number(meta.platform_fee_cents || Math.round(priceCents * 0.1));

    if (!trackIds.length || !buyerId || !artistId) {
      return NextResponse.json(
        { error: "Missing track/buyer/artist in session metadata", meta },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const per = Math.round(priceCents / trackIds.length);
    const perFee = Math.round(fee / trackIds.length);

    for (const id of trackIds) {
      const row = {
        track_id: id,
        buyer_id: buyerId,
        artist_id: artistId,
        price_cents: per,
        platform_fee_cents: perFee,
        stripe_session_id: session.id,
      } as any;
      const { error } = await supabase
        .from("music_purchases")
        .upsert(row, { onConflict: "buyer_id,track_id" });
      if (error) {
        await supabase.from("music_purchases").insert(row);
      }
    }

    return NextResponse.json({
      ok: true,
      trackId: trackIds[0],
      trackIds,
      artistId,
      artistUsername: meta.artist_username || null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
