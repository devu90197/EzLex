// POST /api/activities/log
// Logs an activity for a logged-in user using their session token
// Guest users are NEVER stored here — they use localStorage client-side

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { activityId, type, title, summary, metadata } = await req.json();

    if (!type || !title) {
      return NextResponse.json({ error: "type and title are required." }, { status: 400 });
    }

    // Get the user's access token from the Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const accessToken = authHeader.replace("Bearer ", "");

    // Use the user's own token (respects RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
        auth:   { persistSession: false },
      }
    );

    // Get the user's ID from the token
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    const payload: any = {
      user_id:  user.id,
      type,
      title,
      summary:  summary  || null,
      metadata: metadata || {},
    };
    if (activityId) payload.id = activityId;

    const { data, error: upsertError } = await supabase
      .from("activity_logs")
      .upsert(payload)
      .select("id")
      .single();

    if (upsertError) throw upsertError;

    return NextResponse.json({ success: true, activityId: data.id });
  } catch (e: any) {
    console.error("[activities/log]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
