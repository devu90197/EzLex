import json
import os
import random
import string
import smtplib
from datetime import datetime, timezone, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from http.server import BaseHTTPRequestHandler

from supabase import create_client, Client

# --- Supabase init ---
supabase: Client = create_client(
    os.environ["NEXT_PUBLIC_SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"],  # Service role bypasses RLS
)

# --- SMTP Config ---
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
SMTP_FROM = os.environ.get("SMTP_FROM", f"EzLex <{SMTP_USER}>")

OTP_VALID_SECONDS = 60  # OTP expires in exactly 1 minute


def generate_otp(length: int = 6) -> str:
    """Generates a cryptographically random 6-digit numeric OTP."""
    return "".join(random.choices(string.digits, k=length))


def build_otp_email_html(otp: str, recipient_name: str = "User") -> str:
    """Returns a premium-styled HTML email with the OTP and 1-min countdown."""
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Your EzLex OTP</title>
    </head>
    <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="520" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;">

              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#1d4ed8,#0f766e);padding:32px 40px;text-align:center;">
                  <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.5px;">⚖️ EzLex</h1>
                  <p style="color:#bfdbfe;margin:8px 0 0;font-size:14px;">India's Trusted Legal Platform</p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:40px;">
                  <p style="color:#94a3b8;font-size:15px;margin:0 0 24px;">Hello {recipient_name},</p>
                  <p style="color:#e2e8f0;font-size:15px;line-height:1.6;margin:0 0 32px;">
                    Here is your One-Time Password (OTP) to verify your identity on EzLex. 
                    This code is valid for <strong style="color:#f59e0b;">60 seconds only</strong>.
                  </p>

                  <!-- OTP Box -->
                  <div style="background:#0f172a;border:2px dashed #3b82f6;border-radius:12px;padding:24px;text-align:center;margin-bottom:32px;">
                    <p style="color:#64748b;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">Your OTP Code</p>
                    <p style="color:#60a5fa;font-size:42px;font-weight:800;letter-spacing:12px;margin:0;font-family:'Courier New',monospace;">{otp}</p>
                    <p style="color:#ef4444;font-size:12px;margin:12px 0 0;">⏱ Expires in 60 seconds</p>
                  </div>

                  <div style="background:#1e3a5f;border-left:4px solid #3b82f6;border-radius:4px;padding:16px;margin-bottom:32px;">
                    <p style="color:#93c5fd;font-size:13px;margin:0;">
                      🔒 <strong>Never share this OTP</strong> with anyone — EzLex will never ask for your OTP. 
                      If you did not request this, please ignore this email.
                    </p>
                  </div>

                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#0f172a;padding:24px 40px;text-align:center;border-top:1px solid #1e293b;">
                  <p style="color:#475569;font-size:12px;margin:0;">
                    © 2026 EzLex · India's AI-Powered Justice Platform
                  </p>
                  <p style="color:#334155;font-size:11px;margin:8px 0 0;">
                    Under the Indian Information Technology Act, 2000
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """


def send_otp_email(to_email: str, otp: str, name: str = "User") -> bool:
    """Sends the OTP email via SMTP and returns True on success."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"{otp} — Your EzLex Login OTP"
        msg["From"] = SMTP_FROM
        msg["To"] = to_email

        html_part = MIMEText(build_otp_email_html(otp, name), "html")
        msg.attach(html_part)

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_FROM, to_email, msg.as_string())

        return True
    except Exception as e:
        print(f"[SMTP ERROR] {e}")
        return False


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))

            email = body.get("email", "").strip().lower()
            name = body.get("name", "User")

            if not email or "@" not in email:
                self._respond(400, {"error": "Invalid email address"})
                return

            # Rate-check: Block if they already got an OTP in the last 60 seconds
            now = datetime.now(timezone.utc)
            one_min_ago = now - timedelta(seconds=60)

            recent = (
                supabase.table("otp_requests")
                .select("id")
                .eq("phone", email)  # using 'phone' col for email too
                .gte("created_at", one_min_ago.isoformat())
                .execute()
            )

            if recent.data:
                self._respond(429, {"error": "OTP already sent. Please wait 60 seconds before requesting again."})
                return

            # Generate OTP
            otp = generate_otp()
            expires_at = now + timedelta(seconds=OTP_VALID_SECONDS)

            # Store in Supabase (with 1-min expiry)
            supabase.table("otp_requests").insert({
                "phone": email,       # reusing 'phone' field for email
                "otp": otp,
                "attempts": 0,
                "expires_at": expires_at.isoformat(),
            }).execute()

            # Send email
            sent = send_otp_email(email, otp, name)

            if not sent:
                self._respond(500, {"error": "Failed to send OTP email. Check SMTP configuration."})
                return

            self._respond(200, {"success": True, "message": "OTP sent to email. Valid for 60 seconds."})

        except Exception as e:
            self._respond(500, {"error": str(e)})

    def _respond(self, status: int, data: dict):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
