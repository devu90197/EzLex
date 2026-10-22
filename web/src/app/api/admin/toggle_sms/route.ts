import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { sms_otp_enabled } = await req.json();

    const { error } = await supabase
      .from("system_config")
      .update({
        sms_otp_enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", "GLOBAL_SETTINGS");

    if (error) throw error;

    return NextResponse.json({
      success: true,
      sms_otp_enabled,
      message: sms_otp_enabled
        ? "SMS OTP has been enabled. Firebase will be used for phone verification."
        : "SMS OTP has been disabled. Users will receive Email OTP instead.",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
