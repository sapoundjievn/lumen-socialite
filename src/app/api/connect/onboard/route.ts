import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/** Create/link Stripe Express account for a musician and return onboarding URL */
export async function POST(req: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    req.headers.get("origin") ||
    "https://lumen-socialite.vercel.app";

  if (!key) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY missing" }, { status: 503 });
  }
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Supabase env missing" }, { status: 503 });
  }

  try {
    const { userId, email } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, stripe_connect_id")
      .eq("id", userId)
      .single();

    let accountId = (profile as any)?.stripe_connect_id as string | null;

    // Create Express account if needed
    if (!accountId) {
      const params = new URLSearchParams();
      params.append("type", "express");
      params.append("country", "US");
      params.append("capabilities[card_payments][requested]", "true");
      params.append("capabilities[transfers][requested]", "true");
      params.append("business_type", "individual");
      params.append("metadata[lumen_user_id]", userId);
      if (profile?.username) {
        params.append("metadata[lumen_username]", profile.username);
      }
      if (email) params.append("email", email);

      const accRes = await fetch("https://api.stripe.com/v1/accounts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
      const acc = await accRes.json();
      if (!accRes.ok) {
        return NextResponse.json(
          { error: acc?.error?.message || "Could not create Connect account" },
          { status: 400 }
        );
      }
      accountId = acc.id;
      await supabase
        .from("profiles")
        .update({ stripe_connect_id: accountId } as any)
        .eq("id", userId);
    }

    // Account Link for onboarding
    const linkParams = new URLSearchParams();
    linkParams.append("account", accountId!);
    linkParams.append("refresh_url", `${origin}/music?connect=refresh`);
    linkParams.append("return_url", `${origin}/music?connect=done`);
    linkParams.append("type", "account_onboarding");

    const linkRes = await fetch("https://api.stripe.com/v1/account_links", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: linkParams.toString(),
    });
    const link = await linkRes.json();
    if (!linkRes.ok) {
      return NextResponse.json(
        { error: link?.error?.message || "Could not create onboarding link" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      url: link.url,
      accountId,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Connect error" }, { status: 500 });
  }
}
