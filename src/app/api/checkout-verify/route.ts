import { NextRequest, NextResponse } from "next/server";

/**
 * Stripe Checkout for Lumen · Socialite identity verification.
 * Full amount → platform (no Connect split).
 * $60 personal / $168 business|musician per year.
 */
export async function POST(req: NextRequest) {
  try {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "Payments not configured. Add STRIPE_SECRET_KEY in Vercel." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { userId, username, amountCents, planLabel, accountType } = body || {};
    if (!userId || !amountCents) {
      return NextResponse.json({ error: "Missing userId or amount" }, { status: 400 });
    }

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      req.headers.get("origin") ||
      "https://lumen-socialite.vercel.app";

    const amount = Math.max(50, Number(amountCents));
    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("managed_payments[enabled]", "false");
    params.append(
      "success_url",
      `${origin}/verify/success?session_id={CHECKOUT_SESSION_ID}`
    );
    params.append("cancel_url", `${origin}/verify`);
    params.append("line_items[0][price_data][currency]", "usd");
    params.append(
      "line_items[0][price_data][product_data][name]",
      `Lumen · Socialite · ${planLabel || "Verification"}`
    );
    params.append(
      "line_items[0][price_data][product_data][description]",
      `Annual verification · ${accountType || "personal"} · @${username || "user"}`
    );
    params.append("line_items[0][price_data][unit_amount]", String(amount));
    params.append("line_items[0][quantity]", "1");
    params.append("metadata[type]", "verification");
    params.append("metadata[user_id]", String(userId));
    params.append("metadata[username]", String(username || ""));
    params.append("metadata[account_type]", String(accountType || "personal"));
    params.append("metadata[amount_cents]", String(amount));

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
        { error: json?.error?.message || "Checkout failed" },
        { status: 400 }
      );
    }
    return NextResponse.json({ url: json.url, id: json.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Checkout error" }, { status: 500 });
  }
}
