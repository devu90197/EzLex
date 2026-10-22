'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Search, Scale, FileText, ShieldQuestion, MapPin,
  Mic, ArrowRight, BookOpen, MessageSquare, Clock,
  Bot, FileEdit, FolderSearch, Eye, Loader2, Lock, Zap
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Guest usage management (localStorage, NOT stored in DB) ─────────────────
const GUEST_LIMIT = 3;
const today = () => new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"

function getGuestUsage(type: 'chat' | 'draft'): number {
  if (typeof window === 'undefined') return 0;
  const stored = localStorage.getItem(`guest_usage_${type}_${today()}`);
  return stored ? parseInt(stored) : 0;
}

function getGuestUsageAll(): { chat: number; draft: number } {
  return { chat: getGuestUsage('chat'), draft: getGuestUsage('draft') };
}

// ─── Activity type config ────────────────────────────────────────────────────
const activityConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  AI_CHAT:    { icon: <Bot className="w-4 h-4" />,         color: 'text-blue-600',   bg: 'bg-blue-50'   },
  DRAFT:      { icon: <FileEdit className="w-4 h-4" />,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
  CASE_TRACK: { icon: <FolderSearch className="w-4 h-4" />, color: 'text-amber-600', bg: 'bg-amber-50'   },
  RIGHTS_VIEW:{ icon: <Eye className="w-4 h-4" />,         color: 'text-purple-600', bg: 'bg-purple-50'  },
  DOCUMENT:   { icon: <FileText className="w-4 h-4" />,    color: 'text-rose-600',   bg: 'bg-rose-50'    },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs  = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr  = Math.floor(diffMin / 60);
  if (diffMin < 1)  return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr  < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function CitizenDashboard() {
  const [user, setUser]             = useState<any>(null);
  const [profile, setProfile]       = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingAct, setLoadingAct] = useState(false);
  const [guestUsage, setGuestUsage] = useState({ chat: 0, draft: 0 });

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } } };

  // ─── Auth & profile ────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchActivities(session.access_token!);
      } else {
        setGuestUsage(getGuestUsageAll());
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user) { fetchProfile(session.user.id); fetchActivities(session.access_token!); }
      else { setProfile(null); setActivities([]); setGuestUsage(getGuestUsageAll()); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('full_name, role').eq('id', userId).single();
    setProfile(data);
  };

  const fetchActivities = async (token: string) => {
    setLoadingAct(true);
    try {
      const res = await fetch('/api/activities?limit=10', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setActivities(d.activities || []);
      }
    } finally {
      setLoadingAct(false);
    }
  };

  const firstName = profile?.full_name?.split(' ')[0] || '';

  return (
    <div className="min-h-screen pb-10">

      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative px-6 py-10 md:py-12 lg:py-16 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl mix-blend-multiply" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl mix-blend-multiply" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
            <span className="inline-block py-1 px-3 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold mb-6">
              AI-Powered Legal Assistance for Every Citizen
            </span>
          </motion.div>

          <motion.h1
            className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          >
            {user && firstName
              ? <>Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{firstName}.</span></>
              : <>Demystifying Law. <br className="hidden md:block" />Providing <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Access to Justice.</span></>
            }
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-slate-600 mb-6 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
          >
            {user
              ? "Your legal workspace is ready. Ask a question, track your case, or draft a document."
              : "Ask a legal question, track your court case progress, or quickly draft a formal complaint. Completely free and open-source."
            }
          </motion.p>

          {/* Guest usage indicator */}
          {!user && (guestUsage.chat > 0 || guestUsage.draft > 0) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center gap-3 mb-6 flex-wrap">
              <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-full px-4 py-1.5 text-xs font-medium text-amber-700 shadow-sm">
                <Zap className="w-3.5 h-3.5" />
                AI Chat: {GUEST_LIMIT - guestUsage.chat} / {GUEST_LIMIT} free uses left today
              </div>
              <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-full px-4 py-1.5 text-xs font-medium text-amber-700 shadow-sm">
                <Zap className="w-3.5 h-3.5" />
                Drafting: {GUEST_LIMIT - guestUsage.draft} / {GUEST_LIMIT} free uses left today
              </div>
            </motion.div>
          )}
          {!user && (guestUsage.chat >= GUEST_LIMIT || guestUsage.draft >= GUEST_LIMIT) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center mb-6">
              <Link href="/login" className="flex items-center gap-2 bg-blue-600 text-white rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-blue-700 transition-colors shadow-md">
                <Lock className="w-4 h-4" /> Sign in for unlimited access
              </Link>
            </motion.div>
          )}

          {/* CTA button */}
          <motion.div className="flex justify-center mt-4" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3, type: "spring", stiffness: 200 }}>
            <Link href="/citizen/rights">
              <div className="relative group cursor-pointer inline-block">
                <div className="absolute inset-0 bg-blue-800 rounded-[2rem] translate-y-2 translate-x-1 blur-sm opacity-50 transition-transform group-hover:translate-y-4 group-hover:blur-md" />
                <div className="absolute inset-0 bg-blue-950 rounded-[2rem] translate-y-3 opacity-90 transition-all group-hover:translate-y-4" />
                <div className="relative flex items-center gap-6 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 p-6 sm:px-6 sm:py-6 rounded-[2rem] border border-blue-400/50 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] transform transition-transform duration-200 group-hover:-translate-y-1 group-active:translate-y-2">
                  <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md shadow-inner border border-white/20">
                    <MessageSquare className="w-10 h-10 text-white drop-shadow-md" />
                  </div>
                  <div className="text-left">
                    <p className="text-blue-100 font-medium text-sm sm:text-base uppercase tracking-widest mb-1 opacity-90">Launch Now</p>
                    <h2 className="text-white text-2xl sm:text-3xl font-extrabold tracking-tight drop-shadow-lg">AI Legal Assistance</h2>
                  </div>
                  <div className="ml-4 bg-white/20 rounded-full p-3 group-hover:bg-white transition-all duration-300">
                    <ArrowRight className="w-6 h-6 text-white group-hover:text-blue-600 transition-colors" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ─── Feature Cards ───────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 mt-4 lg:-mt-12 relative z-20">
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <motion.div variants={itemVariants}>
            <Link href="/citizen/locate" className="group block h-full bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:border-blue-100 transition-all duration-300">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-600 transition-all duration-300">
                <MapPin className="w-7 h-7 text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Find Courts &amp; Police</h3>
              <p className="text-slate-600 mb-6 line-clamp-2">Quickly locate the nearest police stations, district courts, and legal aid clinics based on your current location.</p>
              <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">Find Near Me <ArrowRight className="w-4 h-4 ml-2" /></div>
            </Link>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Link href="/citizen/cases" className="group block h-full bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:border-indigo-100 transition-all duration-300">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-indigo-600 transition-all duration-300">
                <Scale className="w-7 h-7 text-indigo-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Track Case Status</h3>
              <p className="text-slate-600 mb-6 line-clamp-2">Enter your CNR number to get real-time eCourts updates, next hearing dates, and AI summaries.</p>
              <div className="flex items-center text-indigo-600 font-semibold group-hover:translate-x-2 transition-transform">Track Progress <ArrowRight className="w-4 h-4 ml-2" /></div>
            </Link>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Link href="/citizen/drafting" className="group block h-full bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:border-emerald-100 transition-all duration-300">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-emerald-600 transition-all duration-300">
                <FileText className="w-7 h-7 text-emerald-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Draft a Document</h3>
              <p className="text-slate-600 mb-6 line-clamp-2">Chat with our AI to effortlessly draft formal FIRs, RTIs, Consumer Complaints, and Affidavits.</p>
              <div className="flex items-center text-emerald-600 font-semibold group-hover:translate-x-2 transition-transform">Start Drafting <ArrowRight className="w-4 h-4 ml-2" /></div>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── Recent Activities ───────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 mt-8">
        <div className="bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-6 h-6 text-blue-500" /> Recent Activities
            </h2>
            {user
              ? <Link href="/citizen/history" className="text-blue-600 font-medium hover:underline flex items-center text-sm">View all history <ArrowRight className="w-4 h-4 ml-1" /></Link>
              : <Link href="/login" className="text-blue-600 font-medium hover:underline flex items-center text-sm">Login to sync <ArrowRight className="w-4 h-4 ml-1" /></Link>
            }
          </div>

          {/* Logged-in user activities */}
          {user && (
            loadingAct ? (
              <div className="flex items-center justify-center py-6 gap-3 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading activities...
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3 border border-gray-100">
                  <Clock className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-gray-400 text-sm">No activities yet. Start using the AI chat or draft a document!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activities.map((act) => {
                  const cfg = activityConfig[act.type] || activityConfig['AI_CHAT'];
                  let href = '#';
                  if (act.type === 'AI_CHAT') href = `/chat?aid=${act.id}`;
                  else if (act.type === 'DRAFT') href = `/citizen/drafting?aid=${act.id}`;
                  else if (act.type === 'RIGHTS_VIEW') href = `/citizen/rights?aid=${act.id}`;
                  
                  return (
                    <motion.div key={act.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <Link href={href} className="group flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-white hover:shadow-lg hover:border-blue-200 transition-all border border-slate-100/50 block h-full">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg} group-hover:scale-110 transition-transform`}>
                            <span className={cfg.color}>{cfg.icon}</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-800 text-sm line-clamp-1 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{act.title}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(act.created_at)}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.color}`}>
                            {act.type.split('_')[0]}
                          </span>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )
          )}

          {/* Guest: prompt to sign in */}
          {!user && (
            <div className="text-center py-5">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3 border border-blue-100">
                <Lock className="w-7 h-7 text-blue-400" />
              </div>
              <p className="text-gray-500 text-sm mb-4">Sign in to save and view your activity history across sessions.</p>
              <Link href="/login"
                className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
              >
                Sign In to Sync History <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
