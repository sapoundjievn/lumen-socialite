import { NextRequest, NextResponse } from "next/server";

/** Check if Connect account can receive payouts */
export async function GET(req: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY;
  const accountId = req.nextUrl.searchParams.get("accountId");
  if (!key || !accountId) {
    return NextResponse.json({ error: "Missing key or accountId" }, { status: 400 });
  }
  try {
    const res = await fetch(`https://api.stripe.com/v1/accounts/${accountId}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const acc = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: acc?.error?.message }, { status: 400 });
    }
    return NextResponse.json({
      charges_enabled: !!acc.charges_enabled,
      payouts_enabled: !!acc.payouts_enabled,
      details_submitted: !!acc.details_submitted,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
