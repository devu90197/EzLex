import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email, phone } = await req.json();

    if (!email && !phone) {
      return NextResponse.json({ error: "Email or phone required" }, { status: 400 });
    }

    const cleanPhone = (phone || "").replace(/\D/g, "");

    // Check 1: Does this email already exist in auth.users? (Service role allows this)
    if (email) {
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) throw authError;

      const emailExists = authUsers.users.some(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );

      if (emailExists) {
        return NextResponse.json({
          exists: true,
          message: "An account with this email already exists. Please sign in instead.",
        });
      }
    }

    // Check 2: Does the phone number exist in profiles table?
    if (cleanPhone) {
      const { data: phoneRows, error: phoneError } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone_number", cleanPhone)
        .limit(1);

      if (phoneError) throw phoneError;

      if (phoneRows && phoneRows.length > 0) {
        return NextResponse.json({
          exists: true,
          message: "An account with this phone number already exists. Please sign in instead.",
        });
      }
    }

    return NextResponse.json({ exists: false });
  } catch (e: any) {
    console.error("[check_duplicate]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
