import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { createHash } from "crypto";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const articleId = body?.articleId as string | undefined;
    const slug = body?.slug as string | undefined;

    if (!articleId && !slug) {
      return NextResponse.json({ error: "Missing article id or slug" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
    const supabaseKey = serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseKey);

    let resolvedId = articleId;
    if (!resolvedId && slug) {
      const { data } = await supabase.from("articles").select("id").eq("slug", slug).maybeSingle();
      resolvedId = data?.id ?? undefined;
    }

    if (!resolvedId) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const h = headers();
    const ip = (h.get("x-forwarded-for") || "").split(",")[0]?.trim();
    const userAgent = h.get("user-agent") || "";
    const ipHash = ip ? createHash("sha256").update(ip).digest("hex") : null;

    const { error } = await supabase.from("article_views").insert({
      article_id: resolvedId,
      ip_hash: ipHash,
      user_agent: userAgent,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 200 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed" }, { status: 200 });
  }
}
