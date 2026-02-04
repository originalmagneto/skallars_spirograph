import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { createHash } from "crypto";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const eventType = body?.eventType as string | undefined;
    if (!eventType) {
      return NextResponse.json({ error: "Missing eventType" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
    const supabaseKey = serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const h = headers();
    const ip = (h.get("x-forwarded-for") || "").split(",")[0]?.trim();
    const userAgent = h.get("user-agent") || "";
    const ipHash = ip ? createHash("sha256").update(ip).digest("hex") : null;

    const { error } = await supabase.from("analytics_events").insert({
      event_type: eventType,
      page: body?.page ?? null,
      block_id: body?.blockId ?? null,
      article_id: body?.articleId ?? null,
      label: body?.label ?? null,
      href: body?.href ?? null,
      metadata: body?.metadata ?? {},
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
