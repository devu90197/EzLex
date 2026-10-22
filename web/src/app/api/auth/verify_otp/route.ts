import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email, otp: otpInput } = await req.json();

    if (!email || !otpInput) {
      return NextResponse.json({ error: "Email and OTP are required." }, { status: 400 });
    }

    const now = new Date();

    // Find most recent unexpired OTP for this email
    const { data: records, error } = await supabase
      .from("otp_requests")
      .select("*")
      .eq("phone", email)
      .gte("expires_at", now.toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!records || records.length === 0) {
      return NextResponse.json(
        { error: "OTP has expired or was not sent. Please request a new one.", code: "OTP_EXPIRED" },
        { status: 400 }
      );
    }

    const record = records[0];

    // Brute-force protection: block after 3 wrong attempts
    if (record.attempts >= 3) {
      return NextResponse.json(
        { error: "Too many failed attempts. Please request a new OTP.", code: "TOO_MANY_ATTEMPTS" },
        { status: 429 }
      );
    }

    if (record.otp !== otpInput) {
      // Increment failed attempts
      await supabase
        .from("otp_requests")
        .update({ attempts: record.attempts + 1 })
        .eq("id", record.id);

      const remaining = 3 - (record.attempts + 1);
      return NextResponse.json(
        { error: `Invalid OTP. ${remaining} attempt(s) remaining.`, code: "INVALID_OTP" },
        { status: 401 }
      );
    }

    // ✅ OTP is correct — delete it (single-use)
    await supabase.from("otp_requests").delete().eq("id", record.id);

    // 🔑 Generate a Supabase sign-in token to log the user in on the client side
    let tokenHash = null;
    try {
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
      });
      if (!linkError && linkData?.properties?.hashed_token) {
        tokenHash = linkData.properties.hashed_token;
      }
    } catch (err) {
      console.error("[verify_otp] failed to gen link:", err);
    }

    // Return success with tokenHash for client-side verifyOtp
    return NextResponse.json({
      success: true,
      verified: true,
      tokenHash: tokenHash,
      message: "Email OTP verified successfully.",
    });
  } catch (e: any) {
    console.error("[verify_otp]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
