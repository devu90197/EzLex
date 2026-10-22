'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Clock, Bot, FileEdit, FolderSearch, Eye, FileText,
  ArrowLeft, Filter, Loader2, Search
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const activityConfig: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  AI_CHAT:    { icon: <Bot className="w-4 h-4" />,          color: 'text-blue-600',    bg: 'bg-blue-50',    label: 'AI Chat'     },
  DRAFT:      { icon: <FileEdit className="w-4 h-4" />,     color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Draft'       },
  CASE_TRACK: { icon: <FolderSearch className="w-4 h-4" />, color: 'text-amber-600',   bg: 'bg-amber-50',   label: 'Case Track'  },
  RIGHTS_VIEW:{ icon: <Eye className="w-4 h-4" />,          color: 'text-purple-600',  bg: 'bg-purple-50',  label: 'Rights View' },
  DOCUMENT:   { icon: <FileText className="w-4 h-4" />,     color: 'text-rose-600',    bg: 'bg-rose-50',    label: 'Document'    },
};

function formatFull(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function groupByDate(acts: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  acts.forEach((a) => {
    const day = new Date(a.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    if (!groups[day]) groups[day] = [];
    groups[day].push(a);
  });
  return groups;
}

const TYPES = ['ALL', 'AI_CHAT', 'DRAFT', 'CASE_TRACK', 'RIGHTS_VIEW', 'DOCUMENT'];

export default function ActivityHistoryPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('ALL');
  const [search, setSearch]         = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return; }
      const res = await fetch('/api/activities?limit=100', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setActivities(d.activities || []);
      }
      setLoading(false);
    });
  }, []);

  const filtered = activities.filter((a) => {
    const matchType  = filter === 'ALL' || a.type === filter;
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || (a.summary || '').toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const grouped = groupByDate(filtered);

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <div className="max-w-4xl mx-auto px-6 pt-5">

        {/* Header */}
        <div className="flex items-center gap-4 mb-5">
          <Link href="/citizen" className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-6 h-6 text-blue-500" /> Activity History
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">All your legal workspace activity</p>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text" placeholder="Search activities..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 shadow-sm"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {TYPES.map((t) => {
              const cfg = activityConfig[t];
              return (
                <button key={t} onClick={() => setFilter(t)}
                  className={`shrink-0 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${filter === t ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                >
                  {t === 'ALL' ? 'All' : cfg?.label || t}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 md:py-12 gap-3 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading history...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 md:py-12 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4 border border-gray-100">
              <Clock className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-400 font-medium">No activities found</p>
            <p className="text-gray-300 text-sm mt-1">
              {search ? 'Try a different search term.' : 'Start using the AI chat or draft a document!'}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(grouped).map(([day, acts]) => (
              <div key={day}>
                {/* Day separator */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{day}</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                  {acts.map((act, idx) => {
                    const cfg = activityConfig[act.type] || activityConfig['AI_CHAT'];
                    let href = '#';
                    if (act.type === 'AI_CHAT') href = `/chat?aid=${act.id}`;
                    else if (act.type === 'DRAFT') href = `/citizen/drafting?aid=${act.id}`;
                    else if (act.type === 'RIGHTS_VIEW') href = `/citizen/rights?aid=${act.id}`;
                    else if (act.type === 'CASE_TRACK') href = `/citizen/cases?aid=${act.id}`;

                    return (
                      <motion.div key={act.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
                        <Link href={href} className="group flex items-center gap-4 px-6 py-4 hover:bg-white hover:z-10 relative transition-all block border-l-4 border-transparent hover:border-blue-500 hover:shadow-md">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg} group-hover:scale-110 transition-transform`}>
                            <span className={cfg.color}>{cfg.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate group-hover:text-blue-600 transition-colors uppercase tracking-tight">{act.title}</p>
                            {act.summary && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{act.summary}</p>}
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${cfg.bg} ${cfg.color} mb-1`}>{cfg.label}</span>
                            <p className="text-[10px] text-gray-300 font-medium">{formatFull(act.created_at)}</p>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}

            <p className="text-center text-gray-400 text-xs pb-4">
              Showing {filtered.length} of {activities.length} total activities
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
