'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, BookOpen, AlertCircle, Globe } from 'lucide-react';
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function RightsDirectory() {
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState('English');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [activityId, setActivityId] = useState<string | null>(null);
  const [isResuming, setIsResuming] = useState(false);
  const [guestUsage, setGuestUsage] = useState(0);

  const today = () => new Date().toISOString().split('T')[0];
  const GUEST_LIMIT = 1;
  const GUEST_KEY = `guest_usage_all_${today()}`;

  // Check Auth & Aid
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const aid = params.get("aid");
    if (aid) setActivityId(aid);

    supabase.auth.getSession().then(({ data: { session } }) => {
       const u = session?.user ?? null;
       setUser(u);
       if (!u) {
         const used = localStorage.getItem(GUEST_KEY);
         setGuestUsage(used ? parseInt(used) : 0);
       }
    });
  }, []);

  // Resume session
  useEffect(() => {
    if (user && activityId) {
      const resume = async () => {
        setIsResuming(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch(`/api/activities?limit=100`, {
            headers: { Authorization: `Bearer ${session?.access_token}` },
          });
          if (res.ok) {
            const data = await res.json();
            const existing = data.activities?.find((a: any) => a.id === activityId);
            if (existing && existing.metadata) {
              setResult(existing.metadata.result);
              setQuery(existing.metadata.query || '');
              setLanguage(existing.metadata.language || 'English');
            }
          }
        } finally {
          setIsResuming(false);
        }
      };
      resume();
    }
  }, [user, activityId]);

  // Example placeholders
  const popularTopics = [
    { title: 'Tenant Eviction Rights', q: 'What are my rights if my landlord wants to evict me abruptly in India?' },
    { title: 'Cyber Fraud', q: 'I lost money due to an online UPI scam. What legally can I do to recover it?' },
    { title: 'Consumer Rights', q: 'I bought a defective product and the seller refuses to return it. What are my consumer rights?' },
    { title: 'Domestic Violence', q: 'What are the legal protections and rights for a victim of domestic violence in India?' }
  ];

  const handleSearch = async (e?: React.FormEvent, directQuery?: string) => {
    if (e) e.preventDefault();
    const q = directQuery || query;
    if (!q.trim()) return;

    // Guest usage check
    if (!user && guestUsage >= GUEST_LIMIT) {
       window.location.href = "/login?mode=register&reason=limit";
       return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/ai/rights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: q, language }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch AI response');

      const fullResult = data.response;
      setResult(fullResult);
      if (directQuery) setQuery(directQuery);

      // Log activity
      if (user) {
         try {
           const { data: { session } } = await supabase.auth.getSession();
           const logId = activityId; // already present or null
           const logRes = await fetch("/api/activities/log", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session?.access_token}`
              },
              body: JSON.stringify({
                activityId: logId || undefined,
                type: "RIGHTS_VIEW",
                title: `Rights: ${q.length > 40 ? q.substring(0, 40) + "..." : q}`,
                summary: `Viewed legal rights analysis in ${language}`,
                metadata: { query: q, language, result: fullResult }
              })
           });
           if (logRes.ok) {
             const logData = await logRes.json();
             if (logData.activityId && !activityId) {
               setActivityId(logData.activityId);
               window.history.replaceState(null, "", `/citizen/rights?aid=${logData.activityId}`);
             }
           }
         } catch (e) {
           console.error("Log error:", e);
         }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      // Increment Guest usage
      if (!user) {
         const newCount = guestUsage + 1;
         setGuestUsage(newCount);
         localStorage.setItem(GUEST_KEY, newCount.toString());
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-6 relative">
      <AnimatePresence>
        {isResuming && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="w-16 h-16 bg-blue-100 rounded-3xl flex items-center justify-center mb-6">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Resuming session...</h2>
            <p className="text-slate-500 max-w-xs mx-auto">Retrieving your legal analysis from the knowledge base.</p>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="max-w-4xl mx-auto space-y-5">
        
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Know Your Rights</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Get instant, AI-powered explanations of Indian laws and your legal rights, available in multiple languages.
          </p>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Describe your legal issue..."
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-slate-700"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="appearance-none pl-10 pr-10 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-slate-700 font-medium cursor-pointer"
                >
                  <option value="English">English</option>
                  <option value="Hindi">हिंदी (Hindi)</option>
                  <option value="Kannada">ಕನ್ನಡ (Kannada)</option>
                  <option value="Telugu">తెలుగు (Telugu)</option>
                  <option value="Tamil">தமிழ் (Tamil)</option>
                </select>
              </div>
              <button 
                type="submit" 
                disabled={loading || !query.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-5 md:px-6 py-4 rounded-2xl font-bold transition-colors flex items-center justify-center min-w-[140px]"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Get Clarity'}
              </button>
            </div>
          </form>
        </div>

        {/* Results Area */}
        {error && (
          <div className="bg-red-50 text-red-700 p-6 rounded-3xl border border-red-100 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {result && !loading && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-5 md:p-6 shadow-md border border-slate-200 prose prose-slate max-w-none prose-headings:text-slate-900 prose-a:text-blue-600"
          >
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100">
              <h3 className="text-xl font-bold m-0 flex items-center gap-2">
                <div className="w-2 h-8 bg-blue-600 rounded-full" />
                Legal Analysis
              </h3>
              <span className="text-xs font-semibold px-3 py-1 bg-blue-50 text-blue-700 rounded-full uppercase tracking-wider">
                {language}
              </span>
            </div>
            {/* Extremely simple Markdown renderer for the demo */}
            <div 
              className="text-slate-700 leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/\n/g, '<br/>') }} 
            />
            
            <div className="mt-5 pt-6 border-t border-slate-100 bg-slate-50 -mx-8 -mb-8 p-5 md:p-6 rounded-b-3xl">
              <p className="text-sm text-slate-500 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-500" />
                <span><strong>Disclaimer:</strong> This information is generated by AI (Gemini 1.5 Pro) based on Indian legal provisions. It is meant for educational and informational purposes only and does not constitute formal legal advice. Please consult a verified lawyer for your specific case.</span>
              </p>
            </div>
          </motion.div>
        )}

        {/* Placeholder Topics (shown when no results) */}
        {!result && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {popularTopics.map((topic, i) => (
              <button 
                key={i}
                onClick={() => handleSearch(undefined, topic.q)}
                className="text-left bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
              >
                <h4 className="font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">{topic.title}</h4>
                <p className="text-sm text-slate-500 line-clamp-2">{topic.q}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
