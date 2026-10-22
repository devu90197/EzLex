import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use SERVICE ROLE KEY — bypasses RLS, needed to write profile data on behalf of new user
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[register] Request body:", { ...body, password: "***" });
    
    const { email, password, fullName, phone, role, officialId } = body;

    if (!email || !password || !fullName || !phone) {
      return NextResponse.json({ error: "Required fields are missing: email, password, name, or phone." }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
       return NextResponse.json({ error: "Invalid phone number. Must be at least 10 digits." }, { status: 400 });
    }

    // Step 1: Create the user in Supabase Auth
    // Uses SERVICE ROLE KEY to bypass email verification and RLS
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone_number: cleanPhone,
        role: role || "CITIZEN",
      },
    });

    if (authError) {
      console.error("[register] Auth Error:", authError);
      // Supabase returns 400 for existing users, trigger failures, etc.
      return NextResponse.json({ error: `Auth Error: ${authError.message}` }, { status: 400 });
    }

    const userId = authData.user.id;
    console.log("[register] User created in Auth:", userId);

    // Step 2: Ensure profile exists (The trigger usually handles this, but we do it manually for extra reliability)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        full_name: fullName,
        phone_number: cleanPhone,
        role: role || "CITIZEN",
        bar_council_id: officialId || null,
      });

    if (profileError) {
      console.error("[register] Profile Error:", profileError);
      // We don't delete the user here, just report it. The user exists in Auth now.
      return NextResponse.json({ 
        success: true, 
        userId, 
        warning: "Account created, but profile setup failed. Please try logging in.",
        error: profileError.message 
      });
    }

    return NextResponse.json({
      success: true,
      userId,
      message: "Account created successfully.",
    });
  } catch (e: any) {
    console.error("[register] Unexpected Error:", e);
    return NextResponse.json({ error: `Server Error: ${e.message}` }, { status: 500 });
  }
}
