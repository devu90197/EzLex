'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, Scale, RefreshCw, AlertCircle, ArrowLeft, ExternalLink, Landmark, ChevronDown, History } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type CaseType = { value: string; label: string };
type Section = { id: string; title: string; html: string; failed?: boolean };

const benches = [
  { value: 'B', label: 'Bengaluru Bench' },
  { value: 'D', label: 'Dharwad Bench' },
  { value: 'K', label: 'Kalaburagi Bench' },
];

const API = '/api/court/karnataka-hc';
const field = 'w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-slate-800 text-sm';

export default function CaseTracker() {
  const [types, setTypes] = useState<CaseType[]>([]);
  const [bench, setBench] = useState('B');
  const [caseType, setCaseType] = useState('');
  const [caseNo, setCaseNo] = useState('');
  const [caseYear, setCaseYear] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaImg, setCaptchaImg] = useState('');
  const [session, setSession] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ found: boolean; html: string; status?: string; fields?: { label: string; value: string }[]; sections: Section[] } | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const toggle = (id: string) => setOpen((o) => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const loadCaptcha = async () => {
    setCaptchaLoading(true); setCaptcha('');
    try {
      const res = await fetch(`${API}?action=captcha`);
      const d = await res.json(); if (!res.ok) throw new Error(d.error);
      setSession(d.session); setCaptchaImg(d.image);
    } catch (e: any) { setError(e.message); }
    finally { setCaptchaLoading(false); }
  };

  // Reopen a saved search from Activity History (?aid=...)
  useEffect(() => {
    const aid = new URLSearchParams(window.location.search).get('aid');
    if (!aid) return;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const res = await fetch(`/api/activities?id=${encodeURIComponent(aid)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const act = res.ok ? (await res.json()).activities?.[0] : null;
      const m = act?.metadata;
      if (!m?.result) return;
      setBench(m.bench); setCaseType(m.caseType); setCaseNo(m.caseNo); setCaseYear(m.caseYear);
      setResult(m.result); setSavedAt(act.created_at);
    });
  }, []);

  useEffect(() => {
    fetch(`${API}?action=types`).then((r) => r.json()).then((d) => setTypes(d.types || [])).catch(() => {});
    loadCaptcha();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, bench, caseType, caseNo, caseYear, captcha }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error); if (d.code === 'BAD_CAPTCHA') loadCaptcha(); return; }
      setResult(d); setOpen(new Set()); setSavedAt(null);
      if (d.found) saveToHistory(d);
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally { setLoading(false); }
  };

  // Signed-in users get every successful search in Activity History
  const saveToHistory = async (d: NonNullable<typeof result>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const benchName = benches.find((b) => b.value === bench)?.label || bench;
      const petitioner = d.fields?.find((f) => f.label === 'Petitioner')?.value;
      const respondent = d.fields?.find((f) => f.label === 'Respondent')?.value;
      const res = await fetch('/api/activities/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          type: 'CASE_TRACK',
          title: `Case: ${caseType} ${caseNo}/${caseYear}`,
          summary: [d.status, benchName, petitioner && respondent ? `${petitioner} vs ${respondent}` : ''].filter(Boolean).join(' · '),
          metadata: { bench, caseType, caseNo, caseYear, result: d },
        }),
      });
      if (res.ok) {
        const { activityId } = await res.json();
        if (activityId) window.history.replaceState(null, '', `/citizen/cases?aid=${activityId}`);
      }
    } catch { /* history is best-effort; the result is already on screen */ }
  };

  const newSearch = () => {
    setResult(null); setError(''); setSavedAt(null); loadCaptcha();
    window.history.replaceState(null, '', '/citizen/cases');
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-indigo-100 text-indigo-600">
            <Scale className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Track Your Case</h1>
          <p className="text-base text-slate-600 max-w-2xl mx-auto">
            Live case status from the <strong>High Court of Karnataka</strong>. Enter your case details and the captcha shown by the court.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!result ? (
            <motion.form key="form" onSubmit={handleSearch} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-slate-100 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
                <Landmark className="w-4 h-4" /> Search by Case Number
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-600">Bench *</span>
                  <select className={field} value={bench} onChange={(e) => setBench(e.target.value)}>
                    {benches.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-600">Case Type *</span>
                  <select className={field} value={caseType} onChange={(e) => setCaseType(e.target.value)} required>
                    <option value="">{types.length ? 'Select Case Type' : 'Loading case types…'}</option>
                    {types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-600">Case Number *</span>
                  <input className={field} inputMode="numeric" maxLength={6} placeholder="e.g. 12345" value={caseNo}
                    onChange={(e) => setCaseNo(e.target.value.replace(/\D/g, ''))} required />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-600">Case Year *</span>
                  <input className={field} inputMode="numeric" maxLength={4} placeholder="e.g. 2024" value={caseYear}
                    onChange={(e) => setCaseYear(e.target.value.replace(/\D/g, ''))} required />
                </label>
              </div>

              {/* Court captcha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-600">Captcha (from the court)</span>
                  <div className="flex items-center gap-2">
                    <div className="h-12 flex-1 rounded-2xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                      {captchaLoading || !captchaImg
                        ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                        // eslint-disable-next-line @next/next/no-img-element
                        : <img src={captchaImg} alt="Court captcha" className="h-full object-contain" />}
                    </div>
                    <button type="button" onClick={loadCaptcha} title="New captcha"
                      className="h-12 w-12 shrink-0 rounded-2xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600 transition-colors">
                      <RefreshCw className={`w-4 h-4 ${captchaLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-600">Enter Captcha *</span>
                  <input className={`${field} font-mono tracking-widest`} inputMode="numeric" maxLength={6} placeholder="6 digits" value={captcha}
                    onChange={(e) => setCaptcha(e.target.value.replace(/\D/g, ''))} required />
                </label>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-2xl px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />{error}
                </div>
              )}

              <button type="submit" disabled={loading || captchaLoading}
                className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2 transition-all">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Search className="w-4 h-4" /> Get Case Status</>}
              </button>
            </motion.form>
          ) : (
            <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button onClick={newSearch} className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                  <ArrowLeft className="w-4 h-4" /> New search
                </button>
                <a href="https://judiciary.karnataka.gov.in/casemenu.php" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700">
                  Source: High Court of Karnataka <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              {savedAt && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-amber-50 border border-amber-100 px-4 py-2.5 text-xs text-amber-800">
                  <span className="inline-flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    Saved result from {new Date(savedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button onClick={() => { setResult(null); setSavedAt(null); loadCaptcha(); }} className="inline-flex items-center gap-1 font-semibold text-amber-900 hover:underline">
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh live
                  </button>
                </div>
              )}
              <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
                {!result.found ? (
                  <p className="text-center text-slate-600 py-6">No case found for these details. Check the bench, case type, number and year.</p>
                ) : result.fields?.length ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <p className="text-base font-bold text-slate-900">{result.fields.find((f) => f.label === 'Case Number')?.value}</p>
                      {result.status && (
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${/dispos/i.test(result.status) ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {result.status}
                        </span>
                      )}
                    </div>
                    <dl className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                      {result.fields.filter((f) => f.label !== 'Case Number').map((f) => (
                        <div key={f.label} className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 min-w-0">
                          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 truncate">{f.label}</dt>
                          <dd className="text-xs sm:text-sm font-semibold text-slate-800 break-words">{f.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </>
                ) : (
                  <div className="court-result overflow-x-auto" dangerouslySetInnerHTML={{ __html: result.html }} />
                )}
              </div>

              {/* Detailed sections, like the court's expandable panels */}
              {result.found && result.sections?.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-sm font-bold text-slate-700">Full case details</h2>
                    <button onClick={() => setOpen(open.size ? new Set() : new Set(result.sections.filter((s) => s.html).map((s) => s.id)))}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                      {open.size ? 'Collapse all' : 'Expand all'}
                    </button>
                  </div>
                  {result.sections.map((sec) => {
                    const isOpen = open.has(sec.id);
                    const empty = !sec.html;
                    return (
                      <div key={sec.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <button onClick={() => !empty && toggle(sec.id)} disabled={empty}
                          className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left disabled:cursor-default">
                          <span className={`text-sm font-semibold ${empty ? 'text-slate-400' : 'text-slate-800'}`}>{sec.title}</span>
                          {empty
                            ? <span className="text-[11px] text-slate-400 shrink-0">{sec.failed ? 'Could not load' : 'No records'}</span>
                            : <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
                        </button>
                        <AnimatePresence initial={false}>
                          {isOpen && !empty && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="court-result overflow-auto max-h-[60vh] px-4 pb-3" data-lenis-prevent dangerouslySetInnerHTML={{ __html: sec.html }} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
