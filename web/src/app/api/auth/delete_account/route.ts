// POST /api/auth/delete_account
// Permanently deletes the signed-in user's account (profile and activity
// history cascade via foreign keys). Required for Google Play's account-deletion policy.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // Identify the caller from their own token; never trust a user id from the body
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user) {
      return NextResponse.json({ error: "Invalid session. Please sign in again." }, { status: 401 });
    }

    await supabaseAdmin.from("activity_logs").delete().eq("user_id", user.id);
    await supabaseAdmin.from("profiles").delete().eq("id", user.id);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (error) throw error;

    return NextResponse.json({ success: true, message: "Your account has been deleted." });
  } catch (e: any) {
    console.error("[delete_account]", e);
    return NextResponse.json({ error: "Could not delete the account. Please try again." }, { status: 500 });
  }
}
