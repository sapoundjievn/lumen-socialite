import { NextRequest, NextResponse } from "next/server";

const LANG: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  bg: "Bulgarian",
  ru: "Russian",
  uk: "Ukrainian",
  pl: "Polish",
  tr: "Turkish",
  ar: "Arabic",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  hi: "Hindi",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = String(body?.text || "").trim();
    const mode = body?.mode === "fix" ? "fix" : "translate";
    const target = LANG[String(body?.target || "en")] || "English";

    if (!text) {
      return NextResponse.json({ error: "Nothing to translate" }, { status: 400 });
    }

    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing in Vercel" },
        { status: 500 }
      );
    }

    const prompt =
      mode === "fix"
        ? `Rewrite this social post so the grammar, spelling, and wording are correct and natural. Keep the same meaning, language, names, @tags, and emoji. Do not add hashtags or a new style. Return only the corrected post.\n\n${text}`
        : `Translate this social post into ${target}. Keep names, @usernames, emoji, and line breaks. Do not add commentary. Return only the translation.\n\n${text}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You help Lumen · Socialite users write and read enlightenments. Return only the requested text.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("translate error", res.status, errText);
      return NextResponse.json({ error: "AI request failed" }, { status: 502 });
    }

    const json = await res.json();
    const out = String(json?.choices?.[0]?.message?.content || "").trim();
    if (!out) {
      return NextResponse.json({ error: "Empty AI response" }, { status: 502 });
    }
    return NextResponse.json({ text: out, mode, target });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "translate failed" }, { status: 500 });
  }
}
