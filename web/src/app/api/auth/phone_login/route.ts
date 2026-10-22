import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use SERVICE ROLE KEY to bypass RLS and verify user identity
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { idToken, phone: clientPhone } = await req.json();

    if (!idToken) {
      return NextResponse.json({ error: "Verification token is required." }, { status: 400 });
    }

    // 1. Verify the Firebase ID token using Google Identity Toolkit REST API
    // This confirms the phone number was actually verified by Firebase
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const fbRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );

    const fbData = await fbRes.json();
    if (!fbRes.ok || !fbData.users || fbData.users.length === 0) {
      console.error("[phone_login] Firebase verification failed:", fbData);
      return NextResponse.json({ error: "Invalid verification token." }, { status: 401 });
    }

    const firebaseUser = fbData.users[0];
    const verifiedPhone = firebaseUser.phoneNumber; // Format matches +91...

    if (!verifiedPhone) {
      return NextResponse.json({ error: "No phone number found in verification session." }, { status: 400 });
    }

    // Clean phone number (remove +91 prefix and non-digits)
    const cleanPhone = verifiedPhone.replace("+91", "").replace(/\D/g, "");

    // 2. Find user in profiles
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, role")
      .eq("phone_number", cleanPhone)
      .single();

    if (profileErr || !profile) {
      console.warn(`[phone_login] account not found for phone: ${cleanPhone}`);
      return NextResponse.json({ error: "No account found with this phone number. Please register first." }, { status: 404 });
    }

    // 3. Get the user's email from Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    
    if (authError || !authData.user || !authData.user.email) {
      console.error("[phone_login] failed to get auth user:", authError);
      return NextResponse.json({ error: "User account is incomplete. Please contact support." }, { status: 500 });
    }

    // 4. Generate a Supabase magiclink token hash for the found email
    // This hash allows us to sign the user in WITHOUT actually sending an email
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: authData.user.email,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error("[phone_login] failed to gen magiclink:", linkError);
      return NextResponse.json({ error: "Failed to generate sign-in session." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      tokenHash: linkData.properties.hashed_token,
      profile: {
        id: profile.id,
        email: authData.user.email,
        name: profile.full_name,
        role: profile.role
      }
    });

  } catch (e: any) {
    console.error("[phone_login] Unexpected server error:", e);
    return NextResponse.json({ error: "Internal server error: " + e.message }, { status: 500 });
  }
}
