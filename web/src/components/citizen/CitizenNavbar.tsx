'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale, Menu, X, UserCircle, LogOut, ChevronDown, History
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CitizenNavbar = () => {
  const [isOpen, setIsOpen]       = useState(false);
  const [user, setUser]           = useState<any>(null);
  const [profile, setProfile]     = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', userId)
      .single();
    setProfile(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/citizen';
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <nav className="fixed top-0 w-full z-50 glass !rounded-none !border-x-0 !border-t-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/citizen" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Scale className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-gray-900">
                EzLex <span className="text-blue-600">Citizen</span>
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/citizen/rights" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
              Know Your Rights
            </Link>
            <Link href="/citizen/cases" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
              Track Case
            </Link>
            <Link href="/citizen/drafting" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
              Draft Document
            </Link>

            {user ? (
              /* ─── Logged-in: Profile + Logout ─── */
              <div className="flex items-center gap-2">
                {/* Profile dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                      {initials}
                    </div>
                    <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">{displayName}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {showDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50"
                      >
                        <div className="px-4 py-2 border-b border-gray-50 mb-1">
                          <p className="text-xs text-gray-400">Signed in as</p>
                          <p className="text-sm font-semibold text-gray-800 truncate">{user.email}</p>
                          {profile?.role && (
                            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                              {profile.role.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                        <Link href="/citizen/history" onClick={() => setShowDropdown(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                        >
                          <History className="w-4 h-4" /> Activity History
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" /> Log Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              /* ─── Guest: Sign In button ─── */
              <Link
                href="/login"
                className="flex items-center gap-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 px-4 py-2 rounded-full transition-all hover:shadow-md"
              >
                <UserCircle className="w-4 h-4" />
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="flex items-center md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-gray-600 hover:text-gray-900 focus:outline-none">
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden bg-white border-t border-gray-100 px-4 pt-2 pb-4 space-y-1 shadow-lg"
          >
            <Link href="/citizen/rights" className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50">Know Your Rights</Link>
            <Link href="/citizen/cases"  className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50">Track Case</Link>
            <Link href="/citizen/drafting" className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50">Draft Document</Link>
            {user ? (
              <>
                <Link href="/citizen/history" className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50">Activity History</Link>
                <button onClick={handleLogout} className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-red-500 hover:bg-red-50">Log Out</button>
              </>
            ) : (
              <Link href="/login" className="block px-3 py-2 rounded-md text-sm font-medium text-gray-900 bg-gray-100 hover:bg-gray-200">Sign In</Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default CitizenNavbar;
