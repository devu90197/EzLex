"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Shield, MessageSquare, Mail, Zap, ToggleLeft, ToggleRight,
  Activity, RefreshCw, AlertTriangle, CheckCircle2, Loader2,
  Key, Brain, Database, TrendingUp, LogOut
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SystemConfig {
  sms_otp_enabled: boolean;
  max_daily_sms: number;
  current_daily_sms_usage: number;
  last_sms_reset: string;
  updated_at: string;
}

interface UsageStat {
  label: string;
  value: number | string;
  sub: string;
  icon: React.ReactNode;
  color: string;
}

interface ApiUsageStats {
  monthlyTotalTokens: number;
  breakdown: Record<string, { tokens: number; calls: number }>;
  recentLogs: any[];
  timestamp: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [config, setConfig]         = useState<SystemConfig | null>(null);
  const [usage, setUsage]           = useState<ApiUsageStats | null>(null);
  const [loading, setLoading]       = useState(true);
  const [toggling, setToggling]     = useState(false);
  const [error, setError]           = useState("");
  const [lastPoll, setLastPoll]     = useState<Date>(new Date());
  const [authorized, setAuthorized] = useState(false);
  const [adminKey, setAdminKey]     = useState("");
  const [keyError, setKeyError]     = useState("");

  const MASTER_KEY = process.env.NEXT_PUBLIC_ADMIN_MASTER_KEY || "EZBILLIFY-ADMIN-2026";

  // ─── Fetch system config from Supabase via API ────────────────────────────
  const fetchConfig = useCallback(async () => {
    try {
      const [configRes, usageRes] = await Promise.all([
        fetch("/api/admin/system_config"),
        fetch("/api/admin/usage_stats")
      ]);

      const configData = await configRes.json();
      const usageData = await usageRes.json();

      if (!configRes.ok) throw new Error(configData.error);
      if (!usageRes.ok) throw new Error(usageData.error);

      setConfig(configData);
      setUsage(usageData);
      setLastPoll(new Date());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Auto-poll every 10 seconds for real-time sync ───────────────────────
  useEffect(() => {
    if (!authorized) return;
    fetchConfig();
    const interval = setInterval(fetchConfig, 10000);
    return () => clearInterval(interval);
  }, [authorized, fetchConfig]);

  // ─── Toggle SMS on/off ────────────────────────────────────────────────────
  const handleToggleSMS = async () => {
    if (!config) return;
    setToggling(true);
    try {
      const res = await fetch("/api/admin/toggle_sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sms_otp_enabled: !config.sms_otp_enabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConfig((prev) => prev ? { ...prev, sms_otp_enabled: !prev.sms_otp_enabled } : prev);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setToggling(false);
    }
  };

  const handleAdminLogin = () => {
    if (adminKey === MASTER_KEY) { setAuthorized(true); setKeyError(""); }
    else setKeyError("Invalid admin key. Access denied.");
  };

  // Lock the admin panel (does NOT sign out Supabase — just clears local state)
  const handleLockAdmin = () => {
    setAuthorized(false);
    setAdminKey("");
  };

  // ─── Derived stats ────────────────────────────────────────────────────────
  const smsPercent = config ? Math.round((config.current_daily_sms_usage / config.max_daily_sms) * 100) : 0;
  const smsRemainder = config ? config.max_daily_sms - config.current_daily_sms_usage : 0;

  // ─── Admin Key Gate ───────────────────────────────────────────────────────
  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 w-full max-w-sm text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
            <Key className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Admin Access Only</h1>
          <p className="text-slate-400 text-sm mb-6">Enter your developer master key to continue.</p>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
            placeholder="••••••••••••••••"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-center text-lg font-mono tracking-widest focus:outline-none focus:border-red-500 mb-4"
          />
          {keyError && <p className="text-red-400 text-sm mb-4">{keyError}</p>}
          <button onClick={handleAdminLogin}
            className="w-full h-11 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors"
          >Unlock Dashboard</button>
        </motion.div>
      </div>
    );
  }

  // ─── Main Dashboard ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-7">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Shield className="w-7 h-7 text-red-400" />
              Developer Control Panel
            </h1>
            <p className="text-slate-400 text-sm mt-1">EzLex · Real-time API Management</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchConfig} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 text-sm transition-colors">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button onClick={handleLockAdmin} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-400 hover:text-white text-sm transition-colors">
              <Key className="w-4 h-4" /> Lock
            </button>
            <button
              onClick={async () => { window.location.href = "/login"; }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-red-500/10 border border-slate-700 hover:border-red-500/30 rounded-xl text-slate-400 hover:text-red-400 text-sm transition-colors"
            >
              <LogOut className="w-4 h-4" /> Log Out
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400">
            <AlertTriangle className="w-5 h-5 shrink-0" />{error}
          </div>
        )}

        {/* ─── Top Stats Row ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
          {[
            { label: "AI Tokens (Mo)",   value: usage?.monthlyTotalTokens?.toLocaleString() ?? "0", sub: "Gemini 2.5/1.5 Usage", icon: <Brain className="w-5 h-5" />, color: "text-blue-400" },
            { label: "API Requests",    value: Object.values(usage?.breakdown ?? {}).reduce((s, b) => s + b.calls, 0), sub: "Total calls this month", icon: <Zap className="w-5 h-5 text-amber-500" />, color: "text-amber-400" },
            { label: "SMS Used Today",   value: config?.current_daily_sms_usage ?? "—", sub: `of ${config?.max_daily_sms ?? 10} free`, icon: <MessageSquare className="w-5 h-5" />, color: (config?.current_daily_sms_usage ?? 0) >= (config?.max_daily_sms ?? 10) ? "text-red-400" : "text-emerald-400" },
            { label: "SMS Remaining",    value: smsRemainder,  sub: "resets at midnight",  icon: <CheckCircle2 className="w-5 h-5" />,   color: smsRemainder <= 2 ? "text-amber-400" : "text-emerald-400" },
            { label: "Last Sync",         value: lastPoll.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), sub: "polls 10s", icon: <Activity className="w-5 h-5" />, color: "text-slate-300" },
          ].map((stat) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4"
            >
              <div className={`${stat.color} mb-2`}>{stat.icon}</div>
              <div className={`text-2xl font-bold ${stat.color}`}>{loading ? "—" : stat.value}</div>
              <div className="text-slate-500 text-xs mt-1">{stat.sub}</div>
              <div className="text-slate-400 text-sm font-medium mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* ─── SMS OTP Toggle Card ───────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${config?.sms_otp_enabled ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                <MessageSquare className={`w-5 h-5 ${config?.sms_otp_enabled ? "text-emerald-400" : "text-red-400"}`} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">SMS OTP (Firebase)</h2>
                <p className="text-slate-400 text-sm">10 free SMS/day via Firebase Spark Plan</p>
              </div>
            </div>

            {/* The actual Toggle Button */}
            <button
              onClick={handleToggleSMS}
              disabled={toggling || loading}
              className={`flex items-center gap-3 px-5 py-3 rounded-xl border font-semibold text-sm transition-all ${
                config?.sms_otp_enabled
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20"
                  : "bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20"
              } disabled:opacity-50`}
            >
              {toggling
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : config?.sms_otp_enabled
                  ? <><ToggleRight className="w-6 h-6" /> SMS ON</>
                  : <><ToggleLeft className="w-6 h-6" /> SMS OFF</>
              }
            </button>
          </div>

          {/* SMS Usage Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Daily SMS usage</span>
              <span className={smsPercent >= 100 ? "text-red-400 font-bold" : ""}>{config?.current_daily_sms_usage ?? 0} / {config?.max_daily_sms ?? 10}</span>
            </div>
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(smsPercent, 100)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`h-full rounded-full ${smsPercent >= 100 ? "bg-red-500" : smsPercent >= 70 ? "bg-amber-500" : "bg-emerald-500"}`}
              />
            </div>
            {smsPercent >= 100 && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Daily SMS limit reached! System has auto-switched to <strong>Email OTP fallback</strong>. Toggle above will auto-reset tomorrow.
              </div>
            )}
            {!config?.sms_otp_enabled && smsPercent < 100 && (
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                SMS OTP is <strong>manually disabled</strong>. Users will receive Email OTP instead.
              </div>
            )}
            {config?.sms_otp_enabled && smsPercent < 100 && (
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                SMS OTP is active. {smsRemainder} message(s) remaining today.
              </div>
            )}
          </div>
        </motion.div>

        {/* ─── AI API Usage Breakdown ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          
          <div className="space-y-4">
               <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-1">Gemini API Consumption</h3>
               {[
                 { label: "Drafting Engine", endpoint: "/api/ai/draft", color: "blue" },
                 { label: "Legal Rights Analysis", endpoint: "/api/ai/rights", color: "purple" },
               ].map((api) => {
                 const stats = usage?.breakdown[api.endpoint] || { tokens: 0, calls: 0 };
                 const percent = Math.min((stats.tokens / 50000) * 100, 100); 
                 return (
                    <motion.div key={api.label} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg bg-${api.color}-500/20 flex items-center justify-center text-${api.color}-400`}>
                             <Brain className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-white tracking-tight block">{api.label}</span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{stats.calls} Total Calls</span>
                          </div>
                        </div>
                        <div className="text-right">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-${api.color}-400 border border-slate-700 block`}>{stats.tokens.toLocaleString()} tokens</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} className={`h-full bg-${api.color}-500`} />
                      </div>
                      <div className="flex justify-between mt-2 text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                        <span>Usage Intensity</span>
                        <span>{percent.toFixed(1)}% of Quota</span>
                      </div>
                    </motion.div>
                 );
               })}
          </div>

          <div>
             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-1 mb-4">Live API Activity Log</h3>
             <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <table className="w-full text-xs">
                  <thead className="bg-slate-800/50 text-slate-400 font-bold uppercase border-b border-slate-700">
                    <tr>
                      <th className="px-3 py-3 text-left w-10">#</th>
                      <th className="px-4 py-3 text-left">Timestamp</th>
                      <th className="px-4 py-3 text-left">Endpoint</th>
                      <th className="px-4 py-3 text-center">Requests</th>
                      <th className="px-4 py-3 text-right">Tokens</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {usage?.recentLogs && usage.recentLogs.length > 0 ? usage.recentLogs.map((log, i) => (
                      <motion.tr 
                        key={log.id} 
                        initial={i === 0 ? { backgroundColor: "rgba(59, 130, 246, 0.2)" } : {}}
                        animate={i === 0 ? { 
                            backgroundColor: "rgba(15, 23, 42, 0)",
                            boxShadow: ["0 0 0px rgba(59, 130, 246, 0)", "0 0 10px rgba(59, 130, 246, 0.3)", "0 0 0px rgba(59, 130, 246, 0)"] 
                        } : {}}
                        transition={i === 0 ? { 
                            boxShadow: { repeat: Infinity, duration: 2 },
                            backgroundColor: { duration: 3 } 
                        } : {}}
                        className="hover:bg-slate-800/30 transition-colors relative"
                      >
                        <td className="px-3 py-3 text-slate-600 font-bold text-[10px]">{i + 1}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{new Date(log.created_at).toLocaleTimeString()}</td>
                        <td className="px-4 py-3 text-slate-300 font-mono text-[10px]">{log.endpoint}</td>
                        <td className="px-4 py-3 text-center text-amber-400 font-bold bg-amber-500/10 border-x border-slate-800">1 Call</td>
                        <td className="px-4 py-3 text-right font-bold text-blue-400">{log.total_tokens}</td>
                      </motion.tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-5 text-center text-slate-600 font-medium italic">No recent AI activity detected...</td>
                      </tr>
                    )}
                  </tbody>
                </table>
             </div>
          </div>

        </div>

        <p className="text-center text-slate-600 text-[10px] uppercase font-bold tracking-widest mt-5">
          Auto-refreshes every 10 seconds · Last Sync: {lastPoll.toLocaleTimeString("en-IN")}
        </p>
      </div>
    </div>
  );
}
