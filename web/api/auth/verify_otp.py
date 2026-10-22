import json
import os
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler

import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
from supabase import create_client, Client

# Init Firebase Admin SDK (only once)
if not firebase_admin._apps:
    service_account_path = os.environ.get(
        "FIREBASE_SERVICE_ACCOUNT_PATH",
        "./api/firebase-service-account.json"
    )
    cred = credentials.Certificate(service_account_path)
    firebase_admin.initialize_app(cred)

supabase: Client = create_client(
    os.environ["NEXT_PUBLIC_SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"],
)


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))

            email = body.get("email", "").strip().lower()
            otp_input = body.get("otp", "").strip()

            if not email or not otp_input:
                self._respond(400, {"error": "Email and OTP are required."})
                return

            now = datetime.now(timezone.utc)

            # Lookup the most recent unexpired OTP for this email
            result = (
                supabase.table("otp_requests")
                .select("*")
                .eq("phone", email)
                .gte("expires_at", now.isoformat())
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )

            if not result.data:
                self._respond(400, {"error": "OTP has expired or was not sent. Please request a new one.", "code": "OTP_EXPIRED"})
                return

            record = result.data[0]

            # Check too many attempts (brute-force protection)
            if record["attempts"] >= 3:
                self._respond(429, {"error": "Too many failed attempts. Please request a new OTP.", "code": "TOO_MANY_ATTEMPTS"})
                return

            if record["otp"] != otp_input:
                # Increment failed attempts
                supabase.table("otp_requests").update(
                    {"attempts": record["attempts"] + 1}
                ).eq("id", record["id"]).execute()

                remaining = 3 - (record["attempts"] + 1)
                self._respond(401, {
                    "error": f"Invalid OTP. {remaining} attempt(s) remaining.",
                    "code": "INVALID_OTP"
                })
                return

            # ✅ OTP is VALID — delete it immediately (single-use)
            supabase.table("otp_requests").delete().eq("id", record["id"]).execute()

            # Generate a Firebase Custom Token for this email UID
            uid = email.replace("@", "_").replace(".", "_")  # Deterministic UID from email
            firebase_token = firebase_auth.create_custom_token(uid, {
                "email": email,
                "verified": True
            }).decode("utf-8")

            self._respond(200, {
                "success": True,
                "firebase_token": firebase_token,
                "uid": uid,
                "message": "OTP verified. Logging you in..."
            })

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
