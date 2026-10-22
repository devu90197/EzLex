"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Scale, Lock, User, Briefcase, Building, Mail, Phone,
  ShieldCheck, AlertCircle, Loader2, Eye, EyeOff, ArrowRight,
  CheckCircle2, MessageSquare, KeyRound, UserCircle
} from "lucide-react";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Types ────────────────────────────────────────────────────────────────────
type Mode        = "login" | "register";
type RegStep     = "form" | "verify-email" | "done";
type LoginMethod = "password" | "email-otp" | "phone-otp";
type Role        = "CITIZEN" | "VERIFIED_LAWYER" | "NGO_LEGAL_AID" | "GOVT_AUTHORITY";

const roleConfig = {
  CITIZEN:         { label: "Citizen",   icon: User,      ring: "ring-blue-500",    bg: "bg-blue-50",    text: "text-blue-700",    activeBg: "bg-blue-600",    btn: "bg-blue-600 hover:bg-blue-700" },
  VERIFIED_LAWYER: { label: "Lawyer",    icon: Briefcase, ring: "ring-amber-500",   bg: "bg-amber-50",   text: "text-amber-700",   activeBg: "bg-amber-600",   btn: "bg-amber-600 hover:bg-amber-700" },
  GOVT_AUTHORITY:  { label: "Authority", icon: Building,  ring: "ring-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", activeBg: "bg-emerald-600", btn: "bg-emerald-600 hover:bg-emerald-700" },
  NGO_LEGAL_AID:   { label: "NGO / Aid", icon: Scale,     ring: "ring-purple-500",  bg: "bg-purple-50",  text: "text-purple-700",  activeBg: "bg-purple-600",  btn: "bg-purple-600 hover:bg-purple-700" },
};

function useCountdown() {
  const [t, setT] = useState(0);
  const start = (secs = 60) => {
    setT(secs);
    const id = setInterval(() => setT((v) => { if (v <= 1) { clearInterval(id); return 0; } return v - 1; }), 1000);
  };
  return { t, start };
}

export default function AuthPage() {
  const [mode, setMode]       = useState<Mode>("login");
  const [role, setRole]       = useState<Role>("CITIZEN");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const cfg = roleConfig[role];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get("mode");
    if (m === "register") setMode("register");
    const r = params.get("reason");
    if (r === "limit") setError("Daily free credit used. Please sign up for unlimited AI legal assistance.");
  }, []);

  // Register
  const [regStep, setRegStep]       = useState<RegStep>("form");
  const [fullName, setFullName]     = useState("");
  const [regEmail, setRegEmail]     = useState("");
  const [regPhone, setRegPhone]     = useState("");
  const [regPass, setRegPass]       = useState("");
  const [officialId, setOfficialId] = useState("");
  const [emailOtp, setEmailOtp]     = useState("");
  const emailTimer = useCountdown();

  // Login
  const [loginMethod, setLoginMethod]   = useState<LoginMethod>("password");
  const [loginEmail, setLoginEmail]     = useState("");
  const [loginPhone, setLoginPhone]     = useState("");
  const [loginPass, setLoginPass]       = useState("");
  const [loginOtp, setLoginOtp]         = useState("");
  const [loginStep, setLoginStep]       = useState<"form"|"otp">("form");
  const loginTimer = useCountdown();
  const loginCaptchaRef  = useRef<RecaptchaVerifier | null>(null);
  const loginConfirmRef  = useRef<ConfirmationResult | null>(null);

  // Forgot password: email → verify code → new password → done
  const [forgotStep, setForgotStep]     = useState<null | "email" | "otp" | "password" | "done">(null);
  const [resetOtp, setResetOtp]         = useState("");
  const [newPass, setNewPass]           = useState("");
  const [confirmPass, setConfirmPass]   = useState("");
  const resetTimer = useCountdown();

  const ic = "w-full bg-white border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none transition-all text-sm shadow-sm";

  const ensureCaptcha = (id: string, ref: React.MutableRefObject<RecaptchaVerifier | null>) => {
    if (!ref.current) ref.current = new RecaptchaVerifier(auth, id, { size: "invisible" });
    return ref.current;
  };

  // Register: step 1 — check duplicate + send email OTP
  const handleRegisterSubmit = async () => {
    if (!fullName || !regEmail || !regPhone || !regPass) { setError("All fields are required."); return; }
    if (regPhone.replace(/\D/g, "").length < 10) { setError("Enter a valid 10-digit phone number."); return; }
    setError(""); setLoading(true);
    try {
      const dup = await fetch("/api/auth/check_duplicate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regEmail, phone: regPhone }),
      });
      const dd = await dup.json(); if (!dup.ok) throw new Error(dd.error);
      if (dd.exists) { setError(dd.message); return; }
      const r = await fetch("/api/auth/send_email_otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regEmail, name: fullName }),
      });
      const rd = await r.json(); if (!r.ok) throw new Error(rd.error);
      setRegStep("verify-email"); emailTimer.start(60);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  // Register: step 2 — verify email OTP → call backend to create account with all data
  const handleVerifyEmail = async () => {
    setError(""); setLoading(true);
    try {
      // 1. Verify the email OTP
      const otpRes = await fetch("/api/auth/verify_otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regEmail, otp: emailOtp }),
      });
      const otpData = await otpRes.json();
      if (!otpRes.ok) throw new Error(otpData.error);

      // 2. Call backend register route — uses SERVICE ROLE KEY to create user
      const regRes = await fetch("/api/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: regEmail, password: regPass, fullName, phone: regPhone, role, officialId,
        }),
      });
      const regData = await regRes.json();
      if (!regRes.ok) throw new Error(regData.error);

      // 3. Log user in with the password they just created via Server Proxy
      const logRes = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regEmail, password: regPass }),
      });
      const ld = await logRes.json(); if (!logRes.ok) throw new Error(ld.error);

      // Restore session locally
      if (ld.data?.session) {
        await supabase.auth.setSession({
          access_token: ld.data.session.access_token,
          refresh_token: ld.data.session.refresh_token
        });
      }

      setRegStep("done");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };
  // Login: password
  const handlePasswordLogin = async () => {
    setError(""); setLoading(true);
    try {
      // Proxy through server to bypass DNS/Firewall issues
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });
      const d = await res.json(); if (!res.ok) throw new Error(d.error);

      // Manually set session on the client for subsequent SDK usage
      if (d.data?.session) {
        const { error: sessErr } = await supabase.auth.setSession({
          access_token: d.data.session.access_token,
          refresh_token: d.data.session.refresh_token
        });
        if (sessErr) throw sessErr;
      }

      window.location.href = role === "CITIZEN" ? "/citizen" : "/admin/dashboard";
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  // Forgot password
  const handleSendResetOtp = async () => {
    if (!loginEmail.includes("@")) { setError("Enter your registered email address."); return; }
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/send_email_otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, name: "User", flow: "reset" }),
      });
      const d = await res.json(); if (!res.ok) throw new Error(d.error);
      setResetOtp(""); setForgotStep("otp"); resetTimer.start(600);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleVerifyResetOtp = async () => {
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/reset_password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, otp: resetOtp }),
      });
      const d = await res.json(); if (!res.ok) throw new Error(d.error);
      setForgotStep("password");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleResetPassword = async () => {
    if (newPass.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPass !== confirmPass) { setError("Passwords do not match."); return; }
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/reset_password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, otp: resetOtp, newPassword: newPass }),
      });
      const d = await res.json(); if (!res.ok) throw new Error(d.error);
      setNewPass(""); setConfirmPass(""); setLoginPass("");
      setForgotStep("done");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  // Login: email OTP
  const handleSendLoginEmailOtp = async () => {
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/send_email_otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, name: "User", flow: "login" }),
      });
      const d = await res.json(); if (!res.ok) throw new Error(d.error);
      setLoginStep("otp"); loginTimer.start(60);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };


  const handleVerifyLoginEmailOtp = async () => {
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/verify_otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, otp: loginOtp }),
      });
      const d = await res.json(); 
      if (!res.ok) throw new Error(d.error);

      if (d.tokenHash) {
        // Log user in using the Magic Link token hash returned from the backend
        const { error: verifyErr } = await supabase.auth.verifyOtp({
          token_hash: d.tokenHash,
          type: 'magiclink'
        });
        if (verifyErr) throw verifyErr;
      }

      window.location.href = role === "CITIZEN" ? "/citizen" : "/admin/dashboard";
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  // Login: phone OTP
  const handleSendLoginPhoneOtp = async () => {
    setError(""); setLoading(true);
    try {
      // Manual check for phone existence before sending Firebase OTP
      const checkRes = await fetch("/api/auth/check_duplicate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: loginPhone }),
      });
      const checkData = await checkRes.json();
      if (!checkRes.ok) throw new Error(checkData.error || "Server error while verification"); 
      if (!checkData.exists) {
        throw new Error("Phone number not found. Please register first to create an account.");
      }

      if (loginCaptchaRef.current) { loginCaptchaRef.current.clear(); loginCaptchaRef.current = null; }
      const verifier = ensureCaptcha("login-captcha", loginCaptchaRef);
      loginConfirmRef.current = await signInWithPhoneNumber(auth, `+91${loginPhone}`, verifier);
      setLoginStep("otp"); loginTimer.start(60);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };
  const handleVerifyLoginPhoneOtp = async () => {
    setError(""); setLoading(true);
    try {
      if (!loginConfirmRef.current) throw new Error("Session expired. Please try again.");
      
      // 1. Confirm the Firebase OTP
      const userCred = await loginConfirmRef.current.confirm(loginOtp);
      const idToken = await userCred.user.getIdToken();

      // 2. Call the new bridge API to exchange Firebase verification for a Supabase session
      const res = await fetch("/api/auth/phone_login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, phone: loginPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to link phone verification with user profile.");

      if (data.tokenHash) {
        // 3. Log user in using the Magic Link token hash returned from the backend
        const { error: verifyErr } = await supabase.auth.verifyOtp({
          token_hash: data.tokenHash,
          type: 'magiclink'
        });
        if (verifyErr) throw verifyErr;
      }

      window.location.href = role === "CITIZEN" ? "/citizen" : "/admin/dashboard";
    } catch (e: any) { 
      setError(e.message); 
      console.error("[phone_login] verification failed:", e);
    }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Invisible reCAPTCHA */}
      <div id="login-captcha" />

      {/* Navbar */}
      <nav className="w-full bg-white/80 backdrop-blur-md border-b border-gray-100 fixed top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          <Link href="/citizen" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Scale className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-900">EzLex <span className="text-blue-600">Citizen</span></span>
          </Link>
          <Link href="/citizen" className="text-sm text-gray-500 hover:text-blue-600 transition-colors flex items-center gap-1">
            ← Back to Portal
          </Link>
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 pt-20 pb-8">
        <div className="w-full max-w-lg">

          {/* Header */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
              <ShieldCheck className="w-3.5 h-3.5" /> Secure · Encrypted · IT Act 2000
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-gray-500 text-sm">
              {mode === "login"
                ? "Sign in to access your legal workspace."
                : "Register to save your cases, documents & rights info."}
            </p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-100/80 border border-gray-100 p-5 md:p-6">

            {/* Mode toggle */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl mb-6">
              {(["login", "register"] as Mode[]).map((m) => (
                <button key={m} onClick={() => { setMode(m); setRegStep("form"); setLoginStep("form"); setForgotStep(null); setError(""); }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all ${mode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                >{m === "login" ? "Sign In" : "Create Account"}</button>
              ))}
            </div>

            {/* Role selector */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              {(Object.keys(roleConfig) as Role[]).map((r) => {
                const c = roleConfig[r]; const Icon = c.icon;
                const active = role === r;
                return (
                  <button key={r} onClick={() => setRole(r)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-medium transition-all ${active ? `${c.bg} ${c.text} border-transparent ring-2 ${c.ring}` : "bg-gray-50 text-gray-500 border-gray-100 hover:border-gray-200 hover:text-gray-700"}`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${active ? c.activeBg : "bg-gray-200"}`}>
                      <Icon className={`w-3.5 h-3.5 ${active ? "text-white" : "text-gray-500"}`} />
                    </div>
                    {c.label}
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">

              {/* ─── REGISTER FORM ─────────────────────────────────────────── */}
              {mode === "register" && regStep === "form" && (
                <motion.div key="reg" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                  <input className={ic} placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  <input className={ic} type="email" placeholder="Email Address" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-mono">+91</span>
                    <input className={`${ic} pl-14`} type="tel" maxLength={10} placeholder="10-digit Mobile Number" value={regPhone} onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, ""))} />
                  </div>
                  <div className="relative">
                    <input className={`${ic} pr-12`} type={showPass ? "text" : "password"} placeholder="Create Password (min. 8 chars)" value={regPass} onChange={(e) => setRegPass(e.target.value)} />
                    <button onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {role !== "CITIZEN" && <input className={ic} placeholder="Official ID / Bar Council No." value={officialId} onChange={(e) => setOfficialId(e.target.value)} />}
                  {error && <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 border border-red-100 rounded-xl px-3 py-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
                  <button onClick={handleRegisterSubmit} disabled={loading}
                    className={`w-full h-12 rounded-xl ${cfg.btn} text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-sm mt-1`}
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Send Email Verification</span><ArrowRight className="w-4 h-4" /></>}
                  </button>
                </motion.div>
              )}

              {/* ─── VERIFY EMAIL OTP ──────────────────────────────────────── */}
              {mode === "register" && regStep === "verify-email" && (
                <motion.div key="verify" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <Mail className="w-5 h-5 text-blue-600 shrink-0" />
                    <div><p className="text-sm font-semibold text-gray-800">Check your email</p><p className="text-xs text-gray-500">6-digit code sent to {regEmail}</p></div>
                  </div>
                  <TimerBadgeLight t={emailTimer.t} />
                  <input className={ic} type="text" inputMode="numeric" maxLength={6} placeholder="Enter 6-digit code" value={emailOtp} onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ""))} />
                  {error && <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 border border-red-100 rounded-xl px-3 py-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
                  <button onClick={handleVerifyEmail} disabled={loading || emailOtp.length < 6 || emailTimer.t === 0}
                    className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-sm">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ShieldCheck className="w-4 h-4" /><span>Verify &amp; Create Account</span></>}
                  </button>
                  <button onClick={() => { setRegStep("form"); setEmailOtp(""); setError(""); }} className="w-full text-gray-400 hover:text-gray-600 text-sm text-center transition-colors">← Change details</button>
                </motion.div>
              )}

              {/* ─── REGISTER DONE ─────────────────────────────────────────── */}
              {mode === "register" && regStep === "done" && (
                <motion.div key="done" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-6">
                  <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4 border-4 border-emerald-200">
                    <ShieldCheck className="w-10 h-10 text-emerald-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Registration Complete!</h2>
                  <p className="text-gray-500 text-sm mb-1">Email verified. Phone number saved to your profile.</p>
                  <p className="text-gray-400 text-xs mb-6">Welcome to EzLex.</p>
                  <button onClick={() => window.location.href = "/citizen"} className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all shadow-sm">
                    Go to Citizen Portal →
                  </button>
                </motion.div>
              )}

              {/* ─── LOGIN FORM ────────────────────────────────────────────── */}
              {mode === "login" && loginStep === "form" && !forgotStep && (
                <motion.div key="login" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                  {/* Login method tabs */}
                  <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl">
                    {([
                      { id: "password",  label: "Password",  icon: <KeyRound className="w-3.5 h-3.5" /> },
                      { id: "email-otp", label: "Email OTP", icon: <Mail className="w-3.5 h-3.5" /> },
                      { id: "phone-otp", label: "Phone OTP", icon: <Phone className="w-3.5 h-3.5" /> },
                    ] as { id: LoginMethod; label: string; icon: React.ReactNode }[]).map((m) => (
                      <button key={m.id} onClick={() => { setLoginMethod(m.id); setError(""); }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${loginMethod === m.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                      >{m.icon}{m.label}</button>
                    ))}
                  </div>

                  {/* Password */}
                  {loginMethod === "password" && <>
                    <input className={ic} type="email" placeholder="Email Address" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                    <div className="relative">
                      <input className={`${ic} pr-12`} type={showPass ? "text" : "password"} placeholder="Password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePasswordLogin()} />
                      <button onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="flex justify-end -mt-1">
                      <button onClick={() => { setForgotStep("email"); setError(""); }} className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                        Forgot password?
                      </button>
                    </div>
                  </>}

                  {/* Email OTP */}
                  {loginMethod === "email-otp" && <input className={ic} type="email" placeholder="Registered Email Address" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />}

                  {/* Phone OTP */}
                  {loginMethod === "phone-otp" && (
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-mono">+91</span>
                      <input className={`${ic} pl-14`} type="tel" maxLength={10} placeholder="Registered Mobile Number" value={loginPhone} onChange={(e) => setLoginPhone(e.target.value.replace(/\D/g, ""))} />
                    </div>
                  )}

                  {error && <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 border border-red-100 rounded-xl px-3 py-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

                  <button
                    onClick={loginMethod === "password" ? handlePasswordLogin : loginMethod === "email-otp" ? handleSendLoginEmailOtp : handleSendLoginPhoneOtp}
                    disabled={loading}
                    className={`w-full h-12 rounded-xl ${cfg.btn} text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-sm`}
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>{loginMethod === "password" ? "Sign In Securely" : loginMethod === "email-otp" ? "Send Email OTP" : "Send SMS OTP"}</span><ArrowRight className="w-4 h-4" /></>}
                  </button>
                </motion.div>
              )}

              {/* ─── LOGIN OTP ENTRY ───────────────────────────────────────── */}
              {mode === "login" && loginStep === "otp" && (
                <motion.div key="login-otp" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    {loginMethod === "email-otp" ? <Mail className="w-5 h-5 text-blue-600 shrink-0" /> : <Phone className="w-5 h-5 text-blue-600 shrink-0" />}
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Enter your OTP</p>
                      <p className="text-xs text-gray-500">Code sent to {loginMethod === "email-otp" ? loginEmail : `+91 ${loginPhone}`}</p>
                    </div>
                  </div>
                  <TimerBadgeLight t={loginTimer.t} />
                  <input className={ic} type="text" inputMode="numeric" maxLength={6} placeholder="Enter 6-digit code" value={loginOtp} onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, ""))} />
                  {error && <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 border border-red-100 rounded-xl px-3 py-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
                  <button
                    onClick={loginMethod === "email-otp" ? handleVerifyLoginEmailOtp : handleVerifyLoginPhoneOtp}
                    disabled={loading || loginOtp.length < 6 || loginTimer.t === 0}
                    className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-sm">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ShieldCheck className="w-4 h-4" /><span>Verify &amp; Sign In</span></>}
                  </button>
                  <button onClick={() => { setLoginStep("form"); setLoginOtp(""); setError(""); }} className="w-full text-gray-400 hover:text-gray-600 text-sm text-center transition-colors">← Change method</button>
                </motion.div>
              )}

              {/* ─── FORGOT PASSWORD ───────────────────────────────────────── */}
              {mode === "login" && forgotStep && (
                <motion.div key={`forgot-${forgotStep}`} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                  {/* Step indicator */}
                  {forgotStep !== "done" && (
                    <div className="flex items-center gap-2">
                      {(["email", "otp", "password"] as const).map((s, i) => {
                        const reached = ["email", "otp", "password"].indexOf(forgotStep) >= i;
                        return <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${reached ? "bg-blue-600" : "bg-gray-200"}`} />;
                      })}
                    </div>
                  )}

                  {forgotStep === "email" && <>
                    <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                      <KeyRound className="w-5 h-5 text-blue-600 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Forgot your password?</p>
                        <p className="text-xs text-gray-500">We&apos;ll email a verification code to reset it.</p>
                      </div>
                    </div>
                    <input className={ic} type="email" placeholder="Registered Email Address" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSendResetOtp()} />
                  </>}

                  {forgotStep === "otp" && <>
                    <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                      <Mail className="w-5 h-5 text-blue-600 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Verify your email</p>
                        <p className="text-xs text-gray-500">Code sent to {loginEmail}</p>
                      </div>
                    </div>
                    <TimerBadgeLight t={resetTimer.t} />
                    <input className={ic} type="text" inputMode="numeric" maxLength={6} placeholder="Enter 6-digit code" value={resetOtp} onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => e.key === "Enter" && resetOtp.length === 6 && handleVerifyResetOtp()} />
                  </>}

                  {forgotStep === "password" && <>
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Email verified</p>
                        <p className="text-xs text-gray-500">Choose a new password (min. 8 characters).</p>
                      </div>
                    </div>
                    <div className="relative">
                      <input className={`${ic} pr-12`} type={showPass ? "text" : "password"} placeholder="New Password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
                      <button onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <input className={ic} type={showPass ? "text" : "password"} placeholder="Confirm New Password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleResetPassword()} />
                  </>}

                  {forgotStep === "done" && (
                    <div className="text-center py-4 space-y-3">
                      <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
                      <p className="text-lg font-bold text-gray-900">Password reset!</p>
                      <p className="text-sm text-gray-500">Sign in with your new password.</p>
                    </div>
                  )}

                  {error && <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 border border-red-100 rounded-xl px-3 py-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

                  <button
                    onClick={
                      forgotStep === "email" ? handleSendResetOtp :
                      forgotStep === "otp" ? handleVerifyResetOtp :
                      forgotStep === "password" ? handleResetPassword :
                      () => { setForgotStep(null); setLoginMethod("password"); setError(""); }
                    }
                    disabled={loading || (forgotStep === "otp" && (resetOtp.length < 6 || resetTimer.t === 0))}
                    className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-sm">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>
                      <span>{forgotStep === "email" ? "Send Verification Code" : forgotStep === "otp" ? "Verify Email" : forgotStep === "password" ? "Reset Password" : "Back to Sign In"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>}
                  </button>

                  {forgotStep === "otp" && (
                    <button onClick={handleSendResetOtp} disabled={loading || resetTimer.t > 540} className="w-full text-blue-600 hover:text-blue-700 disabled:text-gray-300 text-sm text-center transition-colors">
                      Resend code
                    </button>
                  )}
                  {forgotStep !== "done" && (
                    <button onClick={() => { setForgotStep(null); setResetOtp(""); setError(""); }} className="w-full text-gray-400 hover:text-gray-600 text-sm text-center transition-colors">← Back to sign in</button>
                  )}
                </motion.div>
              )}

            </AnimatePresence>

            {/* Footer note */}
            <div className="flex items-center justify-center gap-2 mt-6 text-gray-400 text-xs">
              <Lock className="w-3 h-3" /> AES-256 encrypted · Indian IT Act 2000 compliant
            </div>
          </div>

          {/* Switch mode link */}
          <p className="text-center text-sm text-gray-500 mt-6">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              className="text-blue-600 font-semibold hover:underline"
            >{mode === "login" ? "Create one free" : "Sign in"}</button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Light Timer Badge ────────────────────────────────────────────────────────
function TimerBadgeLight({ t }: { t: number }) {
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
      t > 0 ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-red-50 text-red-600 border border-red-200"
    }`}>
      <div className={`w-2 h-2 rounded-full animate-pulse ${t > 0 ? "bg-amber-400" : "bg-red-400"}`} />
      {t > 0 ? `Expires in ${t}s` : "OTP Expired — please resend"}
    </div>
  );
}
