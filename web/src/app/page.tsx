"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, MotionValue } from "framer-motion";
import { Shield, Scale, Users, FileText, ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import Link from "next/link";

const roles = [
  {
    title: "Citizen",
    description: "File complaints, seek legal guidance, and track your case status anonymously or securely.",
    icon: <Users className="w-8 h-8 text-blue-600" />,
    href: "/citizen",
  },
  {
    title: "Verified Lawyer",
    description: "Access pro-bono cases, provide legal counsel, and review submitted citizen plaints.",
    icon: <Scale className="w-8 h-8 text-indigo-600" />,
    href: "/login",
  },
  {
    title: "Government Authority",
    description: "Police and Court officials portal to view jurisdictional cases and act on FIR drafts.",
    icon: <Shield className="w-8 h-8 text-emerald-600" />,
    href: "/login",
  },
  {
    title: "NGO / Legal Aid",
    description: "Connect with marginalized groups seeking justice and offer organizational support.",
    icon: <FileText className="w-8 h-8 text-amber-600" />,
    href: "/login",
  },
];

const scenes = [
  { kicker: "Scene 01", title: "Know your rights.", body: "Plain-language answers grounded in the Bharatiya Nyaya Sanhita and Indian law." },
  { kicker: "Scene 02", title: "Draft in minutes.", body: "AI-assisted legal drafts, complaints and notices — ready to print and file." },
  { kicker: "Scene 03", title: "Track every step.", body: "From FIR to verdict, follow your case with full transparency." },
];

/* Opening shot: the title starts close-up and pulls back into the frame as you scroll */
function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 2.4]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const blur = useTransform(scrollYProgress, [0, 0.7], ["blur(0px)", "blur(14px)"]);
  const barH = useTransform(scrollYProgress, [0, 1], ["0vh", "9vh"]);

  return (
    <section ref={ref} className="relative h-[140vh]">
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden px-6">
        {/* Letterbox bars slide in like a widescreen frame */}
        <motion.div style={{ height: barH }} className="fixed top-0 inset-x-0 bg-slate-950 z-40 pointer-events-none" />
        <motion.div style={{ height: barH }} className="fixed bottom-0 inset-x-0 bg-slate-950 z-40 pointer-events-none" />

        <motion.div style={{ scale, opacity, filter: blur }} className="text-center max-w-4xl will-change-transform">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="glass inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold text-blue-700 mb-5"
          >
            <Sparkles className="w-4 h-4" /> Powered by BNS & Indian Legal Framework
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, scale: 1.4, filter: "blur(20px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl md:text-8xl font-black tracking-tighter text-slate-900"
          >
            Ez<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-fuchsia-500">Lex</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 1 }}
            className="mt-6 text-lg md:text-2xl text-slate-600 max-w-2xl mx-auto"
          >
            AI-powered justice for every citizen, lawyer and authority.
          </motion.p>
        </motion.div>

        <motion.div style={{ opacity }} className="absolute bottom-10 flex flex-col items-center text-slate-500 text-xs tracking-[0.3em] uppercase">
          Scroll
          <ChevronDown className="w-5 h-5 mt-1 animate-bounce" />
        </motion.div>
      </div>
    </section>
  );
}

/* Each scene zooms in from deep in the frame, holds, then pushes past the camera */
function Scene({ scene }: { scene: (typeof scenes)[number] }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 0.4, 0.6, 1], [0.55, 1, 1, 1.6]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 0.95], [0, 1, 1, 0]);
  const blur = useTransform(scrollYProgress, [0, 0.35, 0.65, 1], ["blur(16px)", "blur(0px)", "blur(0px)", "blur(16px)"]);

  return (
    <section ref={ref} className="relative h-[130vh]">
      <div className="sticky top-0 h-screen flex items-center justify-center px-6 overflow-hidden">
        <motion.div style={{ scale, opacity, filter: blur }} className="glass rounded-[2.5rem] p-6 md:p-7 md:p-10 max-w-3xl text-center will-change-transform">
          <p className="text-xs font-bold tracking-[0.4em] uppercase text-indigo-600 mb-4">{scene.kicker}</p>
          <h2 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900">{scene.title}</h2>
          <p className="mt-6 text-lg md:text-xl text-slate-600">{scene.body}</p>
        </motion.div>
      </div>
    </section>
  );
}

function RoleCard({ role, idx, progress }: { role: (typeof roles)[number]; idx: number; progress: MotionValue<number> }) {
  const start = idx * 0.08;
  const scale = useTransform(progress, [start, start + 0.35], [0.7, 1]);
  const opacity = useTransform(progress, [start, start + 0.3], [0, 1]);
  const y = useTransform(progress, [start, start + 0.35], [120, 0]);

  return (
    <motion.div style={{ scale, opacity, y }} className="h-full">
      <Link href={role.href} className="glass group block h-full p-5 md:p-6 rounded-3xl transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="glass p-4 rounded-2xl mb-6">{role.icon}</div>
          <ArrowRight className="w-6 h-6 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
        </div>
        <h3 className="text-2xl font-bold mb-3 text-slate-900">{role.title}</h3>
        <p className="text-slate-600 leading-relaxed">{role.description}</p>
      </Link>
    </motion.div>
  );
}

function Finale() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const titleScale = useTransform(scrollYProgress, [0, 1], [0.6, 1]);

  return (
    <section ref={ref} className="relative min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <motion.h2 style={{ scale: titleScale }} className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 text-center mb-8">
        Choose your role
      </motion.h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl w-full">
        {roles.map((role, idx) => (
          <RoleCard key={role.title} role={role} idx={idx} progress={scrollYProgress} />
        ))}
      </div>
      <p className="mt-10 text-sm text-slate-500">© 2026 EzLex · India&apos;s AI-Powered Justice Platform</p>
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="no-cine relative text-slate-900">
      <Hero />
      {scenes.map((s) => (
        <Scene key={s.kicker} scene={s} />
      ))}
      <Finale />
    </div>
  );
}
