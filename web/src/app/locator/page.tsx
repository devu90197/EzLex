"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Search, Phone, Shield, Building2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

// Mock data (Normally retrieved from Database / eCourts Open Data)
const authorities = [
    { id: 1, type: "Police Station", name: "Koramangala Police Station", dist: "1.2 km", address: "Koramangala 8th Block, Bangalore", phone: "100" },
    { id: 2, type: "Legal Aid Office", name: "District Legal Services Authority", dist: "3.5 km", address: "City Civil Court Complex, Bangalore", phone: "080-221314" },
    { id: 3, type: "Women Protection Cell", name: "Mahila Sahayavani", dist: "4.1 km", address: "Police Commissioner's Office, Infantry Rd", phone: "1091" },
];

export default function LocatorPage() {
    const [pincode, setPincode] = useState("");
    const [results, setResults] = useState<typeof authorities>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleSearch = () => {
        if (!pincode) return;
        setIsLoading(true);
        // Simulate API delay for Supabase Location Search
        setTimeout(() => {
            setResults(authorities);
            setIsLoading(false);
        }, 800);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-6 items-center">

            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl w-full mt-5"
            >
                <div className="text-center mb-6">
                    <MapPin className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold tracking-tight mb-3">Find Legal Authorities</h1>
                    <p className="text-slate-400">Enter your Pincode or let the AI locate the appropriate jurisdiction for your incident.</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-2 flex gap-2 max-w-xl mx-auto shadow-2xl relative z-10">
                    <input
                        type="text"
                        placeholder="Enter Pincode or City..."
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        className="flex-1 bg-transparent border-none text-white px-4 focus:ring-0 placeholder:text-slate-600"
                    />
                    <Button onClick={handleSearch} disabled={isLoading} className="bg-blue-600 hover:bg-blue-500 text-white rounded-2xl px-5 md:px-6 h-12">
                        {isLoading ? "Searching..." : <><Search className="w-4 h-4 mr-2" /> Find</>}
                    </Button>
                </div>

                {results.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {results.map((item, idx) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl hover:border-slate-600 transition-colors group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-2 rounded-xl ${item.type === 'Police Station' ? 'bg-emerald-500/10 text-emerald-400' :
                                            item.type === 'Legal Aid Office' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
                                        }`}>
                                        {item.type === 'Police Station' ? <Shield className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                                    </div>
                                    <span className="text-xs font-medium text-slate-500 bg-slate-800 px-2 py-1 rounded">{item.dist}</span>
                                </div>
                                <h3 className="text-lg font-semibold mb-1">{item.name}</h3>
                                <p className="text-sm text-slate-400 mb-4">{item.address}</p>

                                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                                    <a href={`tel:${item.phone}`} className="flex items-center text-sm text-blue-400 hover:text-blue-300">
                                        <Phone className="w-4 h-4 mr-2" /> {item.phone}
                                    </a>
                                    <Button variant="ghost" size="icon" className="text-slate-400 group-hover:text-white">
                                        <ExternalLink className="w-4 h-4" />
                                    </Button>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}

            </motion.div>
        </div>
    );
}
