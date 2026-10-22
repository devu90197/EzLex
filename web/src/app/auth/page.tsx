"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowRight, RefreshCw, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

type Step = "email" | "otp" | "success";

export default function EmailOTPAuth({ onSuccess }: { onSuccess?: (uid: string) => void }) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1-minute countdown after OTP is sent
  useEffect(() => {
    if (timer > 0) {
      timerRef.current = setTimeout(() => setTimer((t) => t - 1), 1000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [timer]);

  const handleSendOTP = async () => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send_email_otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: "User" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep("otp");
      setTimer(60); // Start 60-second countdown
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    } catch (err: any) {
      setError(err.message || "Failed to send OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const fullOtp = otp.join("");
    if (fullOtp.length < 6) {
      setError("Please enter the full 6-digit OTP.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify_otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: fullOtp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Sign into Firebase with the custom token
      await signInWithCustomToken(auth, data.firebase_token);
      setStep("success");
      onSuccess?.(data.uid);
    } catch (err: any) {
      setError(err.message || "Invalid OTP. Please try again.");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleOtpInput = (val: string, idx: number) => {
    if (!/^\d?$/.test(val)) return; // Only digits
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus();
    if (!val && idx > 0) inputRefs.current[idx - 1]?.focus();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-6">
      <div className="w-full max-w-md">
        
        {/* Logo / Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-5">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Verify Your Identity</h1>
          <p className="text-slate-400 mt-2 text-sm">Secure access to EzLex</p>
        </motion.div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-2xl">

          <AnimatePresence mode="wait">

            {/* ─── Step 1: Email Input ─────────────────────────────────────────── */}
            {step === "email" && (
              <motion.div key="email" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex items-center gap-2 mb-6">
                  <Mail className="w-5 h-5 text-blue-400 shrink-0" />
                  <h2 className="text-lg font-semibold text-white">Enter your email</h2>
                </div>
                <p className="text-slate-400 text-sm mb-6">We will send a 6-digit code to this email. Valid for <strong className="text-amber-400">60 seconds only</strong>.</p>
                
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
                  placeholder="you@example.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors mb-4"
                />
                
                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm mb-4"><AlertCircle className="w-4 h-4" />{error}</div>
                )}
                
                <button
                  onClick={handleSendOTP}
                  disabled={loading}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Send OTP</span><ArrowRight className="w-4 h-4" /></>}
                </button>
              </motion.div>
            )}

            {/* ─── Step 2: OTP Input ───────────────────────────────────────────── */}
            {step === "otp" && (
              <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-lg font-semibold text-white mb-2">Enter your OTP</h2>
                <p className="text-slate-400 text-sm mb-2">A 6-digit code was sent to <strong className="text-blue-400">{email}</strong></p>
                
                {/* Countdown timer */}
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-6 ${timer > 0 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                  <div className={`w-2 h-2 rounded-full ${timer > 0 ? "bg-amber-400 animate-pulse" : "bg-red-400"}`} />
                  {timer > 0 ? `Expires in ${timer}s` : "OTP Expired"}
                </div>

                {/* 6-box OTP input */}
                <div className="flex gap-3 justify-center mb-6">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { inputRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpInput(e.target.value, idx)}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !otp[idx] && idx > 0) {
                          inputRefs.current[idx - 1]?.focus();
                        }
                      }}
                      className="w-12 h-14 text-center text-2xl font-bold bg-slate-950 border-2 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
                      style={{ borderColor: digit ? "#3b82f6" : "#334155" }}
                    />
                  ))}
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm mb-4"><AlertCircle className="w-4 h-4" />{error}</div>
                )}

                <button
                  onClick={handleVerifyOTP}
                  disabled={loading || otp.join("").length < 6 || timer === 0}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-colors mb-4"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ShieldCheck className="w-4 h-4" /><span>Verify & Login</span></>}
                </button>

                <button
                  onClick={() => { setStep("email"); setOtp(["", "", "", "", "", ""]); setError(""); }}
                  className="w-full text-slate-400 hover:text-white text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" /> Change email / Resend OTP
                </button>
              </motion.div>
            )}

            {/* ─── Step 3: Success ─────────────────────────────────────────────── */}
            {step === "success" && (
              <motion.div key="success" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-6">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck className="w-10 h-10 text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Verified Successfully!</h2>
                <p className="text-slate-400 text-sm">You are now securely logged into EzLex.</p>
                <p className="text-slate-500 text-xs mt-4">Redirecting you to your dashboard...</p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          Protected by Firebase Auth · Under IT Act 2000 · Your data is encrypted
        </p>
      </div>
    </div>
  );
}
