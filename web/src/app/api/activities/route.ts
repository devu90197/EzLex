// GET /api/activities?limit=20  (or ?id=<activity id> for one entry)
// Fetches the current user's recent activity log

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const accessToken = authHeader.replace("Bearer ", "");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
        auth:   { persistSession: false },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get("id");
    let query = supabase
      .from("activity_logs")
      .select("id, type, title, summary, metadata, created_at")
      .eq("user_id", user.id);
    if (id) query = query.eq("id", id);

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(id ? 1 : limit);

    if (error) throw error;

    return NextResponse.json({ activities: data || [] });
  } catch (e: any) {
    console.error("[activities]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
