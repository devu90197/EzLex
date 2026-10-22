import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

// Court lookups and AI retries can take longer than the default serverless limit
export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// SMTP Transporter using Gmail App Password
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const OTP_VALID_SECONDS = 60;
const RESET_OTP_VALID_SECONDS = 600;

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function buildEmailHTML(otp: string, name: string, isReset = false): string {
  const validFor = isReset ? "10 minutes" : "60 seconds";
  const purpose = isReset ? "reset your EzLex password" : "verify your identity";
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>Your EzLex OTP</title></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#1d4ed8,#0f766e);padding:28px 40px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">⚖️ EzLex</h1>
            <p style="color:#bfdbfe;margin:6px 0 0;font-size:13px;">India's Trusted Legal Platform</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="color:#94a3b8;font-size:14px;margin:0 0 20px;">Hello ${name},</p>
            <p style="color:#e2e8f0;font-size:14px;line-height:1.7;margin:0 0 28px;">
              Your One-Time Password (OTP) to ${purpose} is below.<br/>
              <strong style="color:#f59e0b;">This code expires in ${validFor}.</strong>
            </p>
            <div style="background:#0f172a;border:2px dashed #3b82f6;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
              <p style="color:#64748b;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 10px;">Your OTP Code</p>
              <p style="color:#60a5fa;font-size:44px;font-weight:800;letter-spacing:14px;margin:0;font-family:'Courier New',monospace;">${otp}</p>
              <p style="color:#ef4444;font-size:12px;margin:10px 0 0;">⏱ Expires in ${validFor} — do not share</p>
            </div>
            <div style="background:#1e3a5f;border-left:4px solid #3b82f6;border-radius:4px;padding:14px;">
              <p style="color:#93c5fd;font-size:12px;margin:0;">
                🔒 EzLex will <strong>NEVER</strong> ask for your OTP. If you did not request this, ignore this email.
              </p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#0f172a;padding:20px 40px;text-align:center;border-top:1px solid #1e293b;">
            <p style="color:#475569;font-size:11px;margin:0;">© 2026 EzLex · India's AI-Powered Justice Platform</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const { email, name = "User", flow = "register" } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    // NEW: Check user existence for login flow
    if (flow === "login" || flow === "reset") {
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", (await supabase.auth.admin.listUsers()).data.users.find(u => u.email === email)?.id)
        .single();
        
      // Simpler check: check if user exists in auth.users by email
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const userFound = users.find(u => u.email === email);

      if (!userFound) {
        return NextResponse.json(
          { error: "User not found. Please register first to create an account." },
          { status: 404 }
        );
      }
    }

    const isReset = flow === "reset";
    // Reset codes live under their own key so they can't be used to log in (and vice versa)
    const otpKey = isReset ? `reset:${email}` : email;
    const validSeconds = isReset ? RESET_OTP_VALID_SECONDS : OTP_VALID_SECONDS;

    const now = new Date();
    const oneMinAgo = new Date(now.getTime() - OTP_VALID_SECONDS * 1000);

    // Rate-check: Block if OTP was already sent in the last 60 seconds
    const { data: recent } = await supabase
      .from("otp_requests")
      .select("id")
      .eq("phone", otpKey) // using 'phone' field for email
      .gte("created_at", oneMinAgo.toISOString())
      .limit(1);

    if (recent && recent.length > 0) {
      return NextResponse.json(
        { error: "OTP already sent. Please wait 60 seconds before requesting again." },
        { status: 429 }
      );
    }

    const otp = generateOTP();
    const expiresAt = new Date(now.getTime() + validSeconds * 1000);

    // Store OTP in Supabase
    const { data: inserted, error: insertError } = await supabase.from("otp_requests").insert({
      phone: otpKey,
      otp,
      attempts: 0,
      expires_at: expiresAt.toISOString(),
    }).select("id").single();

    if (insertError) throw insertError;

    // Send email via SMTP
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `EzLex <${process.env.SMTP_USER}>`,
        to: email,
        subject: isReset ? `${otp} — Reset your EzLex password` : `${otp} — Your EzLex Login OTP`,
        html: buildEmailHTML(otp, name, isReset),
      });
    } catch (mailErr) {
      // Undelivered code must not trigger the 60s resend block
      await supabase.from("otp_requests").delete().eq("id", inserted.id);
      console.error("[send_email_otp] SMTP failure:", mailErr);
      return NextResponse.json(
        { error: "We couldn't send the email right now. Please try again in a few minutes." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `OTP sent to email. Valid for ${isReset ? "10 minutes" : "60 seconds"}.`,
    });
  } catch (e: any) {
    console.error("[send_email_otp]", e);
    return NextResponse.json({ error: e.message || "Failed to send OTP." }, { status: 500 });
  }
}
