'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, FileText, Loader2, Target, Scale, CheckCircle2, 
  Download, ChevronLeft, Briefcase, Home, Shield, Users, Mic,
  Zap, ArrowRight, User, MapPin, CreditCard
} from 'lucide-react';

import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Message = { id: string; role: 'ai' | 'user'; content: string };
type SetupStep = 'categories' | 'details' | 'form' | 'studio';

// Mock Data for Categories & Sub-types
const CATEGORIES = [
  { id: 'agreements', title: 'Agreements & Contracts', icon: Briefcase, color: 'blue', desc: 'Rentals, NDAs, Partnerships, Employment' },
  { id: 'police', title: 'Police / FIR Drafts', icon: Shield, color: 'rose', desc: 'Theft, Fraud, Harassment, Cybercrime' },
  { id: 'consumer', title: 'Consumer Complaints', icon: Target, color: 'amber', desc: 'Defective Products, Poor Service, Refunds' },
  { id: 'rti', title: 'RTI Applications', icon: FileText, color: 'emerald', desc: 'Request Government Information & Records' },
];

const GREETING: Message = {
  id: 'greet',
  role: 'ai',
  content: "Welcome to your **Personal AI Legal Draftsman**! 🏛️\n\nI specialize in creating legally robust, bullet-proof agreements tailored to Indian laws. Select an agreement type below, fill in the specific details, and I will craft a professional document for you in seconds."
};

const AGREEMENT_TYPES = [
  { 
    id: 'rental', 
    title: 'Residential Rental Agreement', 
    icon: Home,
    time: '2 mins',
    sections: [
      { id: 'owner', label: 'Owner (Landlord) Information', icon: User },
      { id: 'tenant', label: 'Tenant Information', icon: Users },
      { id: 'property', label: 'Property Particulars', icon: MapPin },
      { id: 'lease', label: 'Lease & Financial Terms', icon: CreditCard }
    ],
    fields: [
      { section: 'owner', key: 'landlordName', label: 'Landlord Full Name', placeholder: 'e.g. Rajesh Kumar', type: 'text' },
      { section: 'owner', key: 'landlordSuite', label: 'Suite/Room No', placeholder: 'Max 10', type: 'text', maxLength: 10 },
      { section: 'owner', key: 'landlordAddress1', label: 'Address Line 1', placeholder: 'Premises 1', type: 'text', maxLength: 200 },
      { section: 'owner', key: 'landlordAddress2', label: 'Address Line 2', placeholder: 'Premises 2', type: 'text', maxLength: 200 },
      { section: 'owner', key: 'landlordLandmark', label: 'Landmark', placeholder: 'Near Park', type: 'text', maxLength: 200 },
      { section: 'owner', key: 'landlordPincode', label: 'Pincode', placeholder: '6-digit', type: 'number', maxLength: 6 },
      { section: 'owner', key: 'landlordCity', label: 'City (Auto)', placeholder: '...', type: 'text', readOnly: true },
      { section: 'owner', key: 'landlordState', label: 'State (Auto)', placeholder: '...', type: 'text', readOnly: true },

      { section: 'tenant', key: 'tenantName', label: 'Tenant Full Name', placeholder: 'e.g. Amit Sharma', type: 'text' },
      { section: 'tenant', key: 'tenantSuite', label: 'Suite/Room No', placeholder: 'Max 10', type: 'text', maxLength: 10 },
      { section: 'tenant', key: 'tenantAddress1', label: 'Address Line 1', placeholder: 'Current 1', type: 'text', maxLength: 200 },
      { section: 'tenant', key: 'tenantAddress2', label: 'Address Line 2', placeholder: 'Current 2', type: 'text', maxLength: 200 },
      { section: 'tenant', key: 'tenantLandmark', label: 'Landmark', placeholder: 'Near Market', type: 'text', maxLength: 200 },
      { section: 'tenant', key: 'tenantPincode', label: 'Pincode', placeholder: '6-digit', type: 'number', maxLength: 6 },
      { section: 'tenant', key: 'tenantCity', label: 'City (Auto)', placeholder: '...', type: 'text', readOnly: true },
      { section: 'tenant', key: 'tenantState', label: 'State (Auto)', placeholder: '...', type: 'text', readOnly: true },

      { section: 'property', key: 'propertySuite', label: 'Property House No', placeholder: 'Max 10', type: 'text', maxLength: 10 },
      { section: 'property', key: 'propertyAddress', label: 'Main Property Address', placeholder: 'Premises being rented', type: 'text', maxLength: 200 },
      { section: 'property', key: 'propertyLandmark', label: 'Property Landmark', placeholder: 'Central Park', type: 'text', maxLength: 200 },
      { section: 'property', key: 'propertyPincode', label: 'Property PIN', placeholder: 'PIN', type: 'number', maxLength: 6 },
      { section: 'property', key: 'propertyCity', label: 'City (Auto)', placeholder: '...', type: 'text', readOnly: true },
      { section: 'property', key: 'propertyState', label: 'State (Auto)', placeholder: '...', type: 'text', readOnly: true },

      { section: 'lease', key: 'monthlyRent', label: 'Monthly Rent (INR)', placeholder: 'e.g. 15,000', type: 'number' },
      { section: 'lease', key: 'securityDeposit', label: 'Security Deposit (INR)', placeholder: 'e.g. 50,000', type: 'number' },
      { section: 'lease', key: 'leaseYY', label: 'Lease Duration (Years)', type: 'select', options: ['0','1','2','3','4','5+'] },
      { section: 'lease', key: 'leaseMM', label: 'Lease Duration (Months)', type: 'select', options: ['0','1','2','3','4','5','6','7','8','9','10','11'] },
    ]
  },
  { 
    id: 'nda', 
    title: 'NDA', 
    icon: Shield,
    time: 'Coming Soon',
    comingSoon: true,
    sections: [],
    fields: []
  },
  { 
    id: 'partnership', 
    title: 'Partnership Deed', 
    icon: Users,
    time: 'Coming Soon',
    comingSoon: true,
    sections: [],
    fields: []
  }
];

export default function DocumentDrafting() {
  const [step, setStep] = useState<SetupStep>('categories');
  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [documentGenerated, setDocumentGenerated] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const [user, setUser] = useState<any>(null);
  const [guestUsage, setGuestUsage] = useState(0);
  const [activityId, setActivityId] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  
  // New state for form-based drafting
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const today = () => new Date().toISOString().split('T')[0];
  const GUEST_LIMIT = 1;
  const GUEST_KEY = `guest_usage_all_${today()}`;

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Pincode fetch logic
  const lastFetched = useRef<Record<string, string>>({});
  
  useEffect(() => {
    const checkPin = async (prefix: string) => {
        const pin = formValues[`${prefix}Pincode`];
        if (pin && pin.length === 6 && lastFetched.current[prefix] !== pin) {
            lastFetched.current[prefix] = pin;
            try {
                const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
                const data = await res.json();
                if (data[0].Status === "Success") {
                    const postOffice = data[0].PostOffice[0];
                    setFormValues(prev => ({
                        ...prev,
                        [`${prefix}City`]: postOffice.District,
                        [`${prefix}State`]: postOffice.State
                    }));
                }
            } catch (e) {
                console.error("Pincode error:", e);
            }
        }
    }
    checkPin('landlord');
    checkPin('tenant');
    checkPin('property');
  }, [formValues]);

  useEffect(() => {
    // Check Auth & Activity ID
    const getSession = async () => {
      const params = new URLSearchParams(window.location.search);
      const aid = params.get("aid");
      if (aid) setActivityId(aid);

      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        const used = localStorage.getItem(GUEST_KEY);
        setGuestUsage(used ? parseInt(used) : 0);
      } else if (aid) {
        // Resume drafting session
        setIsLoadingSession(true);
        try {
          const res = await fetch(`/api/activities?limit=100`, {
            headers: { "Authorization": `Bearer ${session?.access_token}` }
          });
          if (res.ok) {
            const data = await res.json();
            const existing = data.activities?.find((a: any) => a.id === aid);
            if (existing && existing.metadata) {
              const meta = existing.metadata;
              if (meta.selectedSubId || meta.selectedSub?.id) {
                const sid = meta.selectedSubId || meta.selectedSub.id;
                const type = AGREEMENT_TYPES.find(t => t.id === sid);
                setSelectedSub(type || meta.selectedSub);
              }
              if (meta.messages) setMessages(meta.messages);
              if (meta.extractedData) {
                setExtractedData(meta.extractedData);
                setDocumentGenerated(true);
              }
              if (meta.step) setStep(meta.step);
              if (meta.isComplete) setIsComplete(true);
            }
          }
        } catch (e) {
          console.error("Failed to resume drafting session:", e);
        } finally {
          setIsLoadingSession(false);
        }
      }
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        const used = localStorage.getItem(GUEST_KEY);
        setGuestUsage(used ? parseInt(used) : 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [activityId]);

  const startForm = (docType: any) => {
    if (!user && guestUsage >= GUEST_LIMIT) {
       window.location.href = "/login?mode=register&reason=limit";
       return;
    }
    setSelectedSub(docType);
    const initialForm: Record<string, string> = {};
    docType.fields.forEach((f: any) => initialForm[f.key] = "");
    setFormValues(initialForm);
    setStep('form');
  };

  const handleGenerate = async () => {
    if (!selectedSub) return;
    
    // Validate all fields
    const missingFields = selectedSub.fields.some((f: any) => !formValues[f.key]);
    if (missingFields) {
      alert("Please fill in all details to generate a legally robust document.");
      return;
    }

    setStep('studio');
    setMessages([
        GREETING,
        {
          id: 'gen-start',
          role: 'ai',
          content: "*Memorizing your inputs... Analyzing Indian Legal Statutes... Generating your document...*"
        }
    ]);
    setIsTyping(true);
    setDocumentGenerated(false);
    setIsComplete(false);

    // Build the "Master Prompt" — Optimized for under 1000 tokens total
    const details = selectedSub.fields
      .filter((f: any) => formValues[f.key]?.trim() && !f.readOnly)
      .map((f: any) => `${f.key}:${formValues[f.key].trim()}`)
      .join("|");

    const masterPrompt = `Draft ${selectedSub.title}. Lease: ${formValues.leaseYY}Y ${formValues.leaseMM}M. Data: ${details}. Keep it concise, professional, legally dense. Max 800 output tokens. JSON only.`;

    // Process the prompt via our existing AI logic (but adapted for master prompt)
    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: masterPrompt };
    
    // We don't show the master prompt to user in chat, we just send it.
    try {
      const res = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [userMessage], // Only send this master message
          documentType: selectedSub.title
        }),
      });

      if (!res.ok) throw new Error('Failed to fetch AI response');
      
      const data = await res.json();
      let aiResponseText = data.response;
      
      try {
        const jsonStr = aiResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        if (parsed.extractedData) {
          setExtractedData(parsed.extractedData);
          setDocumentGenerated(true); 
          setIsComplete(true);
        }
        setMessages(prev => [...prev.slice(0, -1), { 
          id: Date.now().toString(), 
          role: 'ai', 
          content: parsed.message || "Your document has been generated successfully! You can preview it on the right." 
        }]);
      } catch (e) {
        console.error("Master prompt response was not JSON:", e);
        setMessages(prev => [...prev.slice(0, -1), { id: Date.now().toString(), role: 'ai', content: "Document generated! Check the preview." }]);
      }
    } catch (error) {
       console.error(error);
       setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', content: "Failed to generate document. Please try again." }]);
    } finally {
      setIsTyping(false);
      // Increment Guest Usage after successful generation attempt
      if (!user) {
        const newCount = guestUsage + 1;
        setGuestUsage(newCount);
        localStorage.setItem(GUEST_KEY, newCount.toString());
      }
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    // Guest limit check (only on first message of the studio session)
    if (!user && messages.length === 1) { 
        if (guestUsage >= GUEST_LIMIT) {
            window.location.href = "/login?mode=register&reason=limit";
            return;
        }
        const newCount = guestUsage + 1;
        setGuestUsage(newCount);
        localStorage.setItem(GUEST_KEY, newCount.toString());
    }

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input };
    const updatedMessages = [...messages, userMessage];
    
    setMessages(updatedMessages);
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: updatedMessages,
          documentType: selectedSub?.title || 'Legal Document'
        }),
      });

      if (!res.ok) throw new Error('Failed to fetch AI response');
      
      const data = await res.json();
      let aiText = data.response;
      let newExtractedData = extractedData;
      let newIsComplete = isComplete;
      
      // The AI is now strictly instructed to return JSON on EVERY turn
      try {
        const jsonStr = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        if (parsed.message) aiText = parsed.message;
        if (parsed.extractedData) {
          newExtractedData = parsed.extractedData;
          setExtractedData(parsed.extractedData);
          setDocumentGenerated(true); 
        }
        if (parsed.status === 'COMPLETE') {
          newIsComplete = true;
          setIsComplete(true);
        }
      } catch (e) {
        console.error("Failed to parse progressive AI JSON block:", e);
      }

      const finalMessages: Message[] = [...updatedMessages, { id: Date.now().toString(), role: 'ai', content: aiText }];
      setMessages(finalMessages);

      // Log activity to DB if authenticated
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
                          type: "DRAFT",
                          title: `Drafting: ${selectedSub?.title || 'Legal Document'}`,
                          summary: `Drafting session for a ${selectedSub?.title}`,
                          metadata: {
                              selectedSubId: selectedSub?.id,
                              messages: finalMessages,
                              extractedData: newExtractedData,
                              step: 'studio',
                              isComplete: newIsComplete
                          }
                      })
                  });
                  if (logRes.ok) {
                      const logData = await logRes.json();
                      if (logData.activityId && !activityId) {
                          setActivityId(logData.activityId);
                          window.history.replaceState(null, "", `/citizen/drafting?aid=${logData.activityId}`);
                      }
                  }
              }
          } catch (e) {
              console.error("Failed to log drafting activity:", e);
          }
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'ai', content: "Sorry, I am having trouble connecting to the drafting engine right now. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const exportToPDF = async () => {
    if (isExporting) return;
    setIsExporting(true);
    
    try {
      const element = document.getElementById('printable-legal-document');
      if (!element) throw new Error("Document element not found");

      const dataUrl = await toPng(element, {
        pixelRatio: 3,
        backgroundColor: '#ffffff'
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (element.offsetHeight * pdfWidth) / element.offsetWidth;

      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      const fileName = `${selectedSub?.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (e) {
      console.error("Failed to generate PDF:", e);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 relative">
      <AnimatePresence>
        {isLoadingSession && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-blue-500/20">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Resuming session...</h2>
            <p className="text-slate-500 max-w-xs mx-auto">Retrieving your legal draft and conversation from our secure cloud.</p>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Header Area */}
      {step !== 'studio' && (
        <div className="max-w-4xl mx-auto text-center mb-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-block py-1 px-3 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold mb-4">
              AI Drafting Studio
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
              Create Formal Legal Documents
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Select what you need to draft. Our AI will guide you step-by-step and automatically format the final document to official Indian legal standards.
            </p>
            {!user && (
                <div className="mt-6 flex justify-center">
                    <div className="bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5 text-xs font-medium text-amber-700 shadow-sm flex items-center gap-2">
                        Guest Usage: {guestUsage} / {GUEST_LIMIT} drafts used today
                    </div>
                </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Step 1: Categories */}
      {step === 'categories' && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {CATEGORIES.map((cat, i) => {
            const Icon = cat.icon;
            const isActive = cat.id === 'agreements';
            return (
              <motion.div 
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => isActive && setStep('details')}
                className={`relative bg-white rounded-3xl p-5 md:p-6 border ${isActive ? 'border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-200 cursor-pointer transition-all duration-300 group' : 'border-slate-100 opacity-60 grayscale cursor-not-allowed'}`}
              >
                {!isActive && (
                  <div className="absolute top-6 right-6 px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold uppercase tracking-wider">
                    Coming Soon
                  </div>
                )}
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${isActive ? 'bg-blue-50 group-hover:bg-blue-600 transition-colors' : 'bg-slate-100'}`}>
                  <Icon className={`w-8 h-8 ${isActive ? 'text-blue-600 group-hover:text-white transition-colors' : 'text-slate-400'}`} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">{cat.title}</h3>
                <p className="text-slate-500 font-medium">{cat.desc}</p>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* Step 2: Sub-Type Details (Specific to Agreements) */}
      {step === 'details' && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
          className="max-w-5xl mx-auto"
        >
          <button 
            onClick={() => setStep('categories')}
            className="flex items-center text-slate-500 hover:text-blue-600 mb-5 font-medium transition-colors"
          >
            <ChevronLeft className="w-5 h-5 mr-1" /> Back to Categories
          </button>
          
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-5 md:p-6 sm:p-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-5 border-b border-slate-100 pb-6 flex items-center gap-4">
              <Briefcase className="w-8 h-8 text-blue-600" /> Choose Agreement Type
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {AGREEMENT_TYPES.map((type, i) => {
                const Icon = type.icon;
                return (
                  <div key={type.id} className={`bg-slate-50 rounded-3xl p-6 border ${type.comingSoon ? 'border-slate-100 opacity-60 grayscale' : 'border-slate-100 hover:border-blue-300'} transition-colors flex flex-col h-full`}>
                    <div className="flex justify-between items-start mb-6">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${type.comingSoon ? 'bg-slate-300' : 'bg-white'}`}>
                        <Icon className={`w-6 h-6 ${type.comingSoon ? 'text-slate-500' : 'text-slate-700'}`} />
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${type.comingSoon ? 'bg-slate-200 text-slate-500' : 'bg-blue-100 text-blue-700'}`}>
                        {type.time} ⚡
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-slate-900 mb-4">{type.title}</h3>
                    
                    {!type.comingSoon && (
                      <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 mb-6">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Required Info</p>
                        <ul className="text-sm text-slate-600 space-y-1">
                          {type.fields.slice(0, 4).map((f: any, j: number) => (
                            <li key={j} className="flex items-start">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500 mr-2 shrink-0 mt-1" />
                              <span className="text-xs">{f.label}</span>
                            </li>
                          ))}
                          {type.fields.length > 4 && <li className="text-[10px] text-slate-400 pl-5">+ {type.fields.length - 4} more details</li>}
                        </ul>
                      </div>
                    )}
                    
                    {type.comingSoon ? (
                      <div className="w-full bg-slate-200 text-slate-500 text-center font-bold py-3 rounded-xl mt-auto italic">
                        Coming Soon
                      </div>
                    ) : (
                      <button 
                        onClick={() => startForm(type)}
                        className="w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors mt-auto"
                      >
                        Continue to Details
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Step 2.5: Document Details Form */}
      {step === 'form' && selectedSub && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
          className="max-w-4xl mx-auto"
        >
          <button 
            onClick={() => setStep('details')}
            className="flex items-center text-slate-500 hover:text-blue-600 mb-5 font-medium transition-colors"
          >
            <ChevronLeft className="w-5 h-5 mr-1" /> Back to Choice
          </button>

          <div className="max-w-6xl mx-auto pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6 pb-5 border-b border-slate-100">
              <div>
                <h2 className="text-3xl font-black text-black mb-2 tracking-tight">Drafting Suite</h2>
                <div className="text-slate-500 flex items-center gap-2 font-medium">
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                  Currently Drafting: <span className="font-bold text-black">{selectedSub.title}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                 <div className="bg-emerald-50 px-5 py-2.5 rounded-2xl flex items-center gap-2 border border-emerald-100 shadow-sm">
                   <Shield className="w-5 h-5 text-emerald-600" />
                   <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">Enterprise Secured</span>
                 </div>
              </div>
            </div>

            <div className="space-y-6">
              {(selectedSub?.sections || []).map((section: any) => (
                <motion.div 
                  key={section.id} 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
                >
                  <div className="bg-slate-50/50 border-b border-slate-100 px-5 md:px-6 py-6 flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm text-blue-600">
                      <section.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-black tracking-tight">{section.label}</h3>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Section {section.id.toUpperCase()}</p>
                    </div>
                  </div>

                  <div className="p-5 md:p-6 md:p-7">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-8">
                      {selectedSub.fields
                        .filter((f: any) => f.section === section.id)
                        .map((f: any) => (
                          <div key={f.key} className={f.type === 'textarea' ? 'md:col-span-2 lg:col-span-3' : ''}>
                            <label className="block text-[13px] font-black text-black mb-3 ml-1 uppercase tracking-wide">
                                {f.label}
                                {f.maxLength && (
                                  <span className={`ml-2 text-[10px] font-bold ${ (formValues[f.key]?.length || 0) >= f.maxLength ? 'text-red-500' : 'text-slate-400' }`}>
                                    ({formValues[f.key]?.length || 0}/{f.maxLength})
                                  </span>
                                )}
                            </label>
                            {f.type === 'select' ? (
                              <select
                                value={formValues[f.key] || ""}
                                onChange={(e) => setFormValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/5 outline-none transition-all text-sm font-bold text-black shadow-sm"
                              >
                                <option value="">Select...</option>
                                {f.options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                            ) : (
                              <input 
                                type={f.type}
                                value={formValues[f.key] || ""}
                                readOnly={f.readOnly}
                                maxLength={f.maxLength}
                                onChange={(e) => setFormValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                                placeholder={f.placeholder}
                                className={`w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/5 outline-none transition-all text-sm font-bold text-black shadow-sm placeholder:text-slate-300 ${f.readOnly ? 'opacity-50 cursor-not-allowed bg-slate-50 border-dashed' : ''}`}
                              />
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Sticky Action Bar */}
            <div className="mt-8 bg-black rounded-[2.5rem] p-6 md:p-7 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-5 shadow-2xl shadow-blue-900/20 border border-white/10 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] pointer-events-none rounded-full" />
               <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/10 blur-[100px] pointer-events-none rounded-full" />
               
               <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-amber-500 bg-amber-500/10 p-2 rounded-xl">
                      <Zap className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-black text-white">Ready for Generation?</h3>
                  </div>
                  <p className="text-slate-400 text-sm max-w-md leading-relaxed font-medium">
                    Verified duration: <span className="text-blue-400 font-bold">{formValues.leaseYY || 0} Years, {formValues.leaseMM || 0} Months</span>. All data will be processed via Enterprise AI with Indian Legal Statutory alignment.
                  </p>
               </div>

               <div className="flex items-center gap-4 w-full md:w-auto">
                 <button 
                   onClick={() => setStep('details')}
                   className="px-5 md:px-6 py-5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-sm transition-all border border-white/5"
                 >
                   BACK
                 </button>
                 <button 
                  onClick={handleGenerate}
                  className="flex-1 md:flex-none px-6 md:px-8 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-lg transition-all shadow-xl shadow-blue-600/40 hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 group"
                 >
                   <span>GENERATE DRAFT</span>
                   <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                 </button>
               </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Step 3: The Drafting Studio (Split View) */}
      {step === 'studio' && selectedSub && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="max-w-[100rem] mx-auto flex flex-col lg:flex-row gap-6 h-[calc(100vh-6rem)]"
        >
          {/* Left Panel: AI Interviewer */}
          <div className="flex flex-col w-full lg:w-[450px] shrink-0 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative">
            
            <div className="bg-blue-600 p-5 text-white flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <button onClick={() => setStep('details')} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="font-bold">AI Paralegal</h2>
                  <p className="text-blue-200 text-xs">Generating: {selectedSub.title}</p>
                </div>
              </div>
              {!user && (
                 <div className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">
                    Guest: {guestUsage}/{GUEST_LIMIT}
                 </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50">
              <AnimatePresence>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl p-4 text-sm ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-sm' 
                        : 'bg-white border border-slate-200 text-slate-700 shadow-sm rounded-bl-sm prose prose-sm prose-p:my-1 prose-strong:text-slate-900'
                    }`}>
                      <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
                    </div>
                  </motion.div>
                ))}
                {isTyping && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="bg-white border border-slate-200 text-slate-500 shadow-sm rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-slate-100 z-10">
              <form onSubmit={handleSend} className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <textarea 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e as any);
                      }
                    }}
                    rows={input.split('\n').length > 1 ? Math.min(input.split('\n').length, 5) : 1}
                    placeholder="Type in English, Hindi, Tamil..."
                    disabled={isTyping}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm transition-all text-slate-700 disabled:opacity-50 resize-none overflow-y-auto"
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
                    <Mic className="w-4 h-4" />
                  </button>
                </div>
                <button 
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="w-12 h-12 shrink-0 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
                >
                  <Send className="w-5 h-5 ml-1" />
                </button>
              </form>
            </div>
          </div>

          {/* Right Panel: Live Document Preview */}
          <div className="flex-1 bg-slate-900 rounded-3xl shadow-xl border border-slate-800 flex flex-col overflow-hidden relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
            
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-400" />
                <span className="text-white font-medium text-sm tracking-wide">LIVE PREVIEW</span>
              </div>
              {documentGenerated && (
                <button 
                  onClick={exportToPDF}
                  disabled={isExporting}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition-colors"
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 
                  {isExporting ? 'Generating PDF...' : 'Save PDF to Folder'}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-auto p-4 sm:p-6 flex justify-center items-start bg-slate-900">
              <div id="printable-legal-document" className="w-[794px] min-w-[794px] min-h-[1123px] bg-white shadow-2xl transition-all duration-700 relative text-justify mx-auto">
                {!documentGenerated ? (
                  <div className="absolute inset-0 p-12 opacity-20">
                    <div className="w-full h-8 bg-slate-300 rounded mb-6 w-1/2 mx-auto"></div>
                    <div className="space-y-4">
                      <div className="w-full h-4 bg-slate-300 rounded"></div>
                      <div className="w-[90%] h-4 bg-slate-300 rounded"></div>
                      <div className="w-[95%] h-4 bg-slate-300 rounded"></div>
                    </div>
                    <div className="mt-6 w-full h-4 bg-slate-300 rounded"></div>
                    <div className="mt-4 w-[70%] h-4 bg-slate-300 rounded"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-slate-800">
                      <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
                      <p className="font-bold tracking-widest uppercase">Analyzing &amp; Drafting...</p>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontFamily: "'Times New Roman', Times, serif" }} className="p-10 sm:p-8 text-black text-[12pt] leading-[1.6]">
                    {extractedData?.fullDraft ? (
                      <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-p:mb-4 prose-strong:font-bold prose-h1:text-center prose-h1:underline prose-h1:uppercase prose-h1:text-xl">
                        <ReactMarkdown>{extractedData.fullDraft}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="text-justify">
                        <h1 className="text-center font-bold text-[16pt] mb-6 uppercase underline tracking-normal">
                          {selectedSub?.title || 'Legal Document'}
                        </h1>
                    <p className="indent-12 mb-6">
                      This Agreement is made and executed on this <strong>{new Date().toLocaleDateString('en-IN')}</strong> at Bengaluru, Karnataka, by and between:
                    </p>
                    <p className="mb-6 pl-8 border-l-4 border-slate-200" suppressHydrationWarning>
                      <strong>Mr./Ms. {extractedData?.landlordName || '[Landlord Name]'}</strong>, residing at {extractedData?.landlordAddress || '[Landlord Address]'}, hereinafter referred to as the <strong>"OWNER/LICENSOR"</strong> (which expression shall mean and include wherever the context so requires, his/her heirs, legal representatives, executors, administrators and assigns) of the FIRST PART.
                    </p>
                    <p className="mb-5 text-center text-[12pt] font-bold uppercase text-slate-800 tracking-wide">AND</p>
                    <p className="mb-6 pl-8 border-l-4 border-slate-200" suppressHydrationWarning>
                      <strong>Mr./Ms. {extractedData?.tenantName || '[Tenant Name]'}</strong>, residing at {extractedData?.tenantAddress || '[Tenant Address]'}, hereinafter referred to as the <strong>"TENANT/LICENSEE"</strong> (which expression shall mean and include wherever the context so requires, his/her heirs, legal representatives, executors, administrators and assigns) of the SECOND PART.
                    </p>
                    <p className="mb-5" suppressHydrationWarning>
                      WHERE the Tenant has requested the owner to let out the premises to run the <strong>{extractedData?.propertyAddress || '[Property Address]'}</strong>. In consideration of the rent hereinafter and the conditions hereinafter stated.
                    </p>
                    <h3 className="font-bold mb-4 uppercase text-[12pt] mt-5 pb-2">NOW THIS AGREEMENT WITNESSETH AS FOLLOWS:</h3>
                    <ol className="list-decimal pl-6 space-y-4 mb-6 text-justify" suppressHydrationWarning>
                      <li>The tenant shall pay a monthly rent of <strong>₹{extractedData?.monthlyRent || '[Amount]'}</strong> on or before 10th of every English Calendar month.</li>
                      <li>The Total Security Deposit is <strong>₹{extractedData?.securityDeposit || '[Amount]'}</strong> by way of Cash, to the owner as advance security deposit, which sum the owner hereby acknowledges, the said sum shall carry no interest but refundable to the tenant on the termination of tenancy.</li>
                      <li>The tenancy shall be in force for a period of <strong>{extractedData?.leaseTerm || '11 months'}</strong>. And the month of tenancy being the English calendar month.</li>
                      <li>The Owner shall have the right to terminate the tenancy if the tenant fails to pay the rents regularly for a period of One-month or commits breach or any other actions that may cause to the neighbors or others in the locality and any of the terms herein and take this possession of the residence.</li>
                      <li>The tenant shall use the premises only for Residential purpose and not for any offensive or objectionable purpose and will not sublet, under lease or part with the possession of all or any portion of the premises, to whomsoever or make any alterations therein.</li>
                      <li>It is hereby agreed that One-Month's notice on either side is required for the termination of the tenancy.</li>
                      <li>The tenant shall pay electricity as per bill issued by the concerned authority every month without fail.</li>
                      <li>After 11 months the rent will be increased by 08% of existing rent.</li>
                      <li>The Tenant shall pay the painting charges, One Month's Rental Charges of security deposit, to the Owner at the time of vacating or the owner shall deduct from the security deposit.</li>
                    </ol>
                    <h4 className="font-bold mb-2 uppercase text-[12pt]">SCHEDULE</h4>
                    <p className="mb-8" suppressHydrationWarning>
                      All that piece and parcel of the said schedule premises: <strong>{extractedData?.propertyAddress || '[Property Address]'}</strong>.<br/>
                      Consisting of: Two Bed rooms with wardrobes, Hall, Kitchen with wardrobes, One TV cabinet, two Bathrooms, 4 FANS, one geyser and Water and Electricity facilities.
                    </p>
                    <p className="mb-5 uppercase">IN WITNESSE WHEREOF the parties have set their respective hands unto this agreement the day, the month, year first above written.</p>
                    <div className="mt-5 pt-5 flex justify-between">
                      <div className="text-center w-1/3">
                        <h4 className="font-bold mb-6 text-left uppercase">WITNESSES:</h4>
                        <div className="space-y-5 text-left">
                          <div className="flex gap-2">
                            <span>1.</span>
                            <div className="flex-1 border-b border-black"></div>
                          </div>
                          <div className="flex gap-2">
                            <span>2.</span>
                            <div className="flex-1 border-b border-black"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col justify-between items-end w-1/3 space-y-8">
                        <div className="text-center" suppressHydrationWarning>
                           <p className="font-bold text-[12pt] uppercase border-t border-black pt-2 w-48 mx-auto">OWNER</p>
                           <p className="mt-1">(Mr./Ms. {extractedData?.landlordName || '...............................'})</p>
                        </div>
                        <div className="text-center" suppressHydrationWarning>
                           <p className="font-bold text-[12pt] uppercase border-t border-black pt-2 w-48 mx-auto">TENANT</p>
                           <p className="mt-1">(Mr./Ms. {extractedData?.tenantName || '...............................'})</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <style jsx global>{`
          @media print {
            body * { visibility: hidden; }
            .printable-document, .printable-document * { visibility: visible; }
            .printable-document { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; margin: 0; padding: 0; }
            @page { margin: 2cm; }
          }
        `}</style>
      </div>
    </motion.div>
  )}

    </div>
  );
}
