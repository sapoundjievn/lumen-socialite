import { NextRequest, NextResponse } from "next/server";
import { moderateContentLocal } from "@/lib/moderation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const content = String(body?.content || "");

    const local = moderateContentLocal(content);
    if (!local.allowed) {
      return NextResponse.json(local);
    }

    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      return NextResponse.json({ allowed: true, categories: [], source: "local-only" });
    }

    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "omni-moderation-latest", input: content }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("OpenAI moderation error", res.status, errText);
      return NextResponse.json({ allowed: true, categories: [], source: "openai-error" });
    }

    const json = await res.json();
    const r = json?.results?.[0];
    if (!r) {
      return NextResponse.json({ allowed: true, categories: [] });
    }

    const categories: string[] = [];
    const c = r.categories || {};
    if (c.hate || c["hate/threatening"]) categories.push("hate");
    if (c.sexual || c["sexual/minors"]) categories.push("sexual");
    if (c.violence || c["violence/graphic"]) categories.push("violence");
    if (c.harassment || c["harassment/threatening"]) categories.push("hate");
    if (c["self-harm"]) categories.push("violence");

    if (r.flagged || categories.length) {
      return NextResponse.json({
        allowed: false,
        categories,
        reason:
          "This enlightenment was blocked by safety AI (hate, sexual, or violent content).",
        source: "openai",
      });
    }

    return NextResponse.json({ allowed: true, categories: [], source: "openai" });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ allowed: true, categories: [], error: e?.message });
  }
}
