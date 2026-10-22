import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Two-step password reset:
//   { email, otp }               → checks the code (step 2: "verify your email")
//   { email, otp, newPassword }  → checks the code again, sets the password, burns the code
export async function POST(req: NextRequest) {
  try {
    const { email, otp: otpInput, newPassword } = await req.json();

    if (!email || !otpInput) {
      return NextResponse.json({ error: "Email and OTP are required." }, { status: 400 });
    }
    if (newPassword !== undefined && String(newPassword).length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const { data: records, error } = await supabase
      .from("otp_requests")
      .select("*")
      .eq("phone", `reset:${email}`)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!records || records.length === 0) {
      return NextResponse.json(
        { error: "Reset code has expired or was not sent. Please request a new one.", code: "OTP_EXPIRED" },
        { status: 400 }
      );
    }

    const record = records[0];

    // Brute-force protection: block after 3 wrong attempts
    if (record.attempts >= 3) {
      return NextResponse.json(
        { error: "Too many failed attempts. Please request a new code.", code: "TOO_MANY_ATTEMPTS" },
        { status: 429 }
      );
    }

    if (record.otp !== otpInput) {
      await supabase
        .from("otp_requests")
        .update({ attempts: record.attempts + 1 })
        .eq("id", record.id);

      const remaining = 3 - (record.attempts + 1);
      return NextResponse.json(
        { error: `Invalid code. ${remaining} attempt(s) remaining.`, code: "INVALID_OTP" },
        { status: 401 }
      );
    }

    // Step 2 only: code is valid, keep it for the final step
    if (newPassword === undefined) {
      return NextResponse.json({ success: true, verified: true });
    }

    const { data: { users } } = await supabase.auth.admin.listUsers();
    const user = users.find((u) => u.email === email);
    if (!user) {
      return NextResponse.json({ error: "No account found for this email." }, { status: 404 });
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, { password: newPassword });
    if (updateError) throw updateError;

    // ✅ Single-use: delete the reset code
    await supabase.from("otp_requests").delete().eq("id", record.id);

    return NextResponse.json({ success: true, message: "Password updated. You can now sign in." });
  } catch (e: any) {
    console.error("[reset_password]", e);
    return NextResponse.json({ error: e.message || "Failed to reset password." }, { status: 500 });
  }
}
