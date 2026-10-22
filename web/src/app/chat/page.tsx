"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Send, Paperclip, Bot, User, Scale, ShieldAlert, Users, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    type?: "text" | "document" | "authority-link";
}

export default function ChatDashboard() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            role: "assistant",
            content: "Namaste. I am your AI Legal Assistant powered by BNS and the Indian Justice System. How can I assist you today? (You can type or use the microphone to speak).",
        }
    ]);
    const [input, setInput] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [interimResult, setInterimResult] = useState("");
    const [loggingOut, setLoggingOut] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Logout — signs out session only, ALL data stays in Supabase
    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await supabase.auth.signOut();
        } finally {
            window.location.href = "/login";
        }
    };

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Handle Speech Recognition (Web Speech API)
    const toggleRecording = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Your browser doesn't support speech recognition.");
            return;
        }

        // @ts-ignore - WebkitSpeechRecognition is not standard TS
        const recognition = new window.webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-IN'; // Can be dynmically switched to hi-IN, kn-IN

        if (isRecording) {
            recognition.stop();
            setIsRecording(false);
            if (interimResult) {
                setInput((prev) => prev + " " + interimResult);
                setInterimResult("");
            }
            return;
        }

        setIsRecording(true);
        recognition.start();

        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    setInput((prev) => prev + " " + event.results[i][0].transcript);
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            setInterimResult(interimTranscript);
        };

        recognition.onerror = () => {
            setIsRecording(false);
        };
    };

    const [user, setUser] = useState<any>(null);
    const [guestUsage, setGuestUsage] = useState(0);
    const [activityId, setActivityId] = useState<string | null>(null);
    const [isLoadingSession, setIsLoadingSession] = useState(false);

    const today = () => new Date().toISOString().split('T')[0];
    const GUEST_LIMIT = 3;

    // Check for activity ID in URL to resume session
    useEffect(() => {
        const getSession = async () => {
            const params = new URLSearchParams(window.location.search);
            const aid = params.get("aid");
            if (aid) setActivityId(aid);

            const { data: { session } } = await supabase.auth.getSession();
            const currentUser = session?.user ?? null;
            setUser(currentUser);

            if (!currentUser) {
                const used = localStorage.getItem(`guest_usage_chat_${today()}`);
                setGuestUsage(used ? parseInt(used) : 0);
            } else if (aid) {
                // Resume session if aid is present
                setIsLoadingSession(true);
                try {
                    const res = await fetch(`/api/activities?limit=100`, {
                         headers: { "Authorization": `Bearer ${session?.access_token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        const existing = data.activities?.find((a: any) => a.id === aid);
                        if (existing && existing.metadata?.messages) {
                            setMessages(existing.metadata.messages);
                        }
                    }
                } catch (e) {
                    console.error("Failed to resume session:", e);
                } finally {
                    setIsLoadingSession(false);
                }
            }
        };
        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (!session?.user) {
                const used = localStorage.getItem(`guest_usage_chat_${today()}`);
                setGuestUsage(used ? parseInt(used) : 0);
            }
        });

        return () => subscription.unsubscribe();
    }, [activityId]);

    const handleSend = async () => {
        if (!input.trim()) return;

        // Guest limit check
        if (!user) {
            if (guestUsage >= GUEST_LIMIT) {
                alert("Guest limit reached (3/day). Please sign in for unlimited access.");
                window.location.href = "/login";
                return;
            }
            const newCount = guestUsage + 1;
            setGuestUsage(newCount);
            localStorage.setItem(`guest_usage_chat_${today()}`, newCount.toString());
        }

        const newUserMsg: Message = { id: Date.now().toString(), role: "user", content: input };
        const updatedMessages = [...messages, newUserMsg];
        setMessages(updatedMessages);

        const userQuery = input;
        setInput("");

        // Simulate AI Response (In real app, call your API)
        const assistantMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "I am analyzing this against the Bharatiya Nyaya Sanhita (BNS)... Connecting to Vector Database to fetch the exact statute and draft your legal outline."
        };
        
        const finalMessages = [...updatedMessages, assistantMsg];

        // Logging for Authenticated Users
        if (user) {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.access_token) {
                    const logRes = await fetch("/api/activities/log", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${session.access_token}`
                        },
                        body: JSON.stringify({
                            activityId: activityId || undefined,
                            type: "AI_CHAT",
                            title: userQuery.length > 40 ? userQuery.substring(0, 40) + "..." : userQuery,
                            summary: "Legal query regarding BNS/IPC statutes",
                            metadata: { messages: finalMessages }
                        })
                    });
                    if (logRes.ok) {
                        const logData = await logRes.json();
                        if (logData.activityId && !activityId) {
                            setActivityId(logData.activityId);
                            // Update URL without refresh
                            window.history.replaceState(null, "", `/chat?aid=${logData.activityId}`);
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to log activity:", e);
            }
        }

        setTimeout(() => {
            setMessages(finalMessages);
        }, 800);
    };

    return (
        <div className="flex h-screen bg-slate-50 text-gray-900 overflow-hidden relative">
            <AnimatePresence>
                {isLoadingSession && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
                    >
                        <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-blue-500/20">
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Restoring conversation...</h2>
                        <p className="text-slate-500 max-w-xs mx-auto">Retrieving your legal workspace messages from your secure history.</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <div className="w-72 border-r border-gray-100 bg-white hidden md:flex flex-col p-5">
                <div className="flex items-center gap-2.5 mb-5 px-1">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                        <Scale className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-lg tracking-tight text-gray-900">Legal <span className="text-blue-600">Workbench</span></span>
                </div>

                <div className="space-y-3 flex-1">
                    <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                        <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">
                            {user ? "User Session" : "Guest Session"}
                        </h3>
                        <p className="text-sm text-gray-700">
                            {user ? (
                                <>ID: <span className="font-mono text-blue-600 font-semibold">{user.email?.split('@')[0]}</span></>
                            ) : (
                                <>Usage: <span className="font-mono text-blue-600 font-semibold">{guestUsage} / {GUEST_LIMIT}</span> used</>
                            )}
                        </p>
                        {!user && (
                            <div className="mt-2 text-[10px] text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg">
                                Guests are limited to 3 sessions per day.
                            </div>
                        )}
                        <div className="flex gap-2 mt-2">
                            <span className="px-2 py-0.5 text-xs rounded-full border border-blue-200 bg-blue-100 text-blue-700">Language: Auto</span>
                        </div>
                    </div>

                    <div className="mt-4">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Action Modules</h3>
                        <ul className="space-y-1">
                            <li className="px-3 py-2.5 text-sm rounded-xl bg-gray-50 hover:bg-blue-50 cursor-pointer text-gray-600 hover:text-blue-700 flex items-center gap-2.5 transition-colors border border-transparent hover:border-blue-100">
                                <ShieldAlert className="w-4 h-4 text-blue-500 shrink-0" /> Track FIR Drafts
                            </li>
                            <li className="px-3 py-2.5 text-sm rounded-xl hover:bg-gray-50 cursor-pointer text-gray-500 hover:text-gray-700 flex items-center gap-2.5 transition-colors">
                                <Users className="w-4 h-4 shrink-0" /> Nearby Police Stations
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Logout */}
                <div className="border-t border-gray-100 pt-4 mt-4">
                    <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        {loggingOut ? "Signing out..." : "Log Out"}
                    </button>
                    <p className="text-center text-gray-400 text-xs mt-2">Your data is saved securely.</p>
                </div>
            </div>

            {/* Main Chat */}
            <div className="flex-1 flex flex-col relative bg-white">
                {/* Top bar */}
                <div className="h-14 border-b border-gray-100 flex items-center px-6 gap-3 bg-white">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-900">AI Legal Assistant</p>
                        <p className="text-xs text-gray-400">Powered by BNS · IPC · Indian Justice System</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs text-gray-400">Online</span>
                    </div>
                </div>

                {/* Chat area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 bg-slate-50">
                    {messages.map((msg, idx) => (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={msg.id}
                            className={`flex gap-3 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                        >
                            <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${msg.role === 'assistant' ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-gray-200 text-gray-600'}`}>
                                {msg.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                            </div>
                            <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-tr-sm shadow-sm'
                                : 'bg-white text-gray-700 border border-gray-100 rounded-tl-sm shadow-sm'
                                }`}>
                                {msg.content}
                            </div>
                        </motion.div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <div className="p-4 bg-white border-t border-gray-100 z-10 w-full">
                    <div className="max-w-4xl mx-auto relative flex items-end gap-2 p-2 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all shadow-sm">

                        <Button variant="ghost" size="icon" className="shrink-0 text-gray-400 hover:text-blue-600 mb-1">
                            <Paperclip className="w-5 h-5" />
                        </Button>

                        <div className="flex-1 relative">
                            {(isRecording || interimResult) && (
                                <div className="absolute -top-10 left-0 bg-red-50 text-red-500 px-3 py-1 rounded-full text-xs font-medium border border-red-200 flex items-center gap-2 shadow-sm">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    Listening: {interimResult || "Speak now..."}
                                </div>
                            )}
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                className="w-full bg-transparent border-none focus:ring-0 resize-none py-3 text-sm text-gray-800 placeholder:text-gray-400 max-h-32 min-h-[44px]"
                                placeholder="Type your legal issue or press the microphone to dictate..."
                                rows={1}
                            />
                        </div>

                        <Button
                            onClick={toggleRecording}
                            variant="ghost"
                            size="icon"
                            className={`shrink-0 mb-1 transition-colors ${isRecording ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20 hover:text-red-400' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Mic className="w-5 h-5" />
                        </Button>

                        <Button
                            onClick={handleSend}
                            className="shrink-0 mb-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-900/20"
                        >
                            <Send className="w-4 h-4 mr-2" /> Send
                        </Button>

                    </div>
                    <div className="text-center mt-3 text-xs text-slate-500">
                        AI can make mistakes. Laws vary by jurisdiction. Always consult a verified legal professional before acting.
                    </div>
                </div>

            </div>
        </div>
    );
}
