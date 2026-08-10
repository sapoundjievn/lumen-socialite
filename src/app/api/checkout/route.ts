import { NextRequest, NextResponse } from "next/server";

/**
 * Creates a Stripe Checkout Session for a LumenTunes track (platform: Lumen · Socialite).
 * Requires env: STRIPE_SECRET_KEY
 * Optional: NEXT_PUBLIC_APP_URL (defaults to request origin)
 */
export async function POST(req: NextRequest) {
  try {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      return NextResponse.json(
        {
          error:
            "Payments not configured. Add STRIPE_SECRET_KEY in Vercel environment variables.",
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const {
      trackId,
      title,
      priceCents,
      buyerId,
      artistId,
      artistUsername,
      artistStripeConnectId,
    } = body || {};

    if (!trackId || !buyerId || !artistId || !priceCents) {
      return NextResponse.json({ error: "Missing payment fields" }, { status: 400 });
    }

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      req.headers.get("origin") ||
      "https://lumen-socialite.vercel.app";

    const platformFeeRate = 0.1;
    const amount = Math.max(50, Number(priceCents));
    const fee = Math.round(amount * platformFeeRate);

    const params = new URLSearchParams();
    params.append("mode", "payment");
    // Disable Managed Payments (avoids required product tax_code on new Stripe accounts)
    params.append("managed_payments[enabled]", "false");

    // Stripe Connect: 90% to artist, 10% application fee to platform
    if (artistStripeConnectId) {
      params.append("payment_intent_data[application_fee_amount]", String(fee));
      params.append(
        "payment_intent_data[transfer_data][destination]",
        String(artistStripeConnectId)
      );
    }
    const artistQ = encodeURIComponent(artistUsername || "");
    params.append(
      "success_url",
      `${origin}/music/success?session_id={CHECKOUT_SESSION_ID}&artist=${artistQ}`
    );
    params.append("cancel_url", `${origin}/music?artist=${artistQ}`);
    params.append("line_items[0][price_data][currency]", "usd");
    params.append(
      "line_items[0][price_data][product_data][name]",
      `LumenTunes · ${title || "Track"}`
    );
    params.append(
      "line_items[0][price_data][product_data][description]",
      `Full track download · Lumen · Socialite platform fee ${Math.round(platformFeeRate * 100)}%`
    );
    params.append("line_items[0][price_data][unit_amount]", String(amount));
    params.append("line_items[0][quantity]", "1");
    params.append("metadata[track_id]", String(trackId));
    params.append("metadata[buyer_id]", String(buyerId));
    params.append("metadata[artist_id]", String(artistId));
    params.append("metadata[artist_username]", String(artistUsername || ""));
    params.append("metadata[price_cents]", String(priceCents));
    params.append("metadata[platform_fee_cents]", String(fee));

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: json?.error?.message || "Stripe checkout failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({ url: json.url, id: json.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Checkout error" }, { status: 500 });
  }
}
