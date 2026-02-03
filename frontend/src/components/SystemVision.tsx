import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Activity, Terminal, Clock } from 'lucide-react';

interface Trace {
    id: string;
    name: string;
    start_time: string;
    duration: number;
    status: string;
    feedback_scores?: any[];
}

export const SystemVision: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [traces, setTraces] = useState<Trace[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTraces();
        const interval = setInterval(fetchTraces, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchTraces = async () => {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        try {
            const res = await axios.get(`${API_URL}/opik/traces`);
            setTraces(res.data);
            setLoading(false);
        } catch (e) {
            console.error("Failed to fetch Opik traces", e);
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-4xl h-[80vh] bg-[#050505] border border-[var(--brand-primary)] rounded-xl overflow-hidden flex flex-col shadow-[0_0_50px_rgba(255,107,0,0.2)]"
            >
                {/* Header */}
                <div className="p-4 border-b border-[var(--brand-primary)]/30 flex justify-between items-center bg-[#0a0500]">
                    <div className="flex items-center gap-3">
                        <Terminal className="w-6 h-6 text-[var(--brand-primary)]" />
                        <div>
                            <h2 className="text-xl font-bold text-white uppercase tracking-widest">Opik System Vision</h2>
                            <p className="text-xs text-[var(--brand-secondary)] font-mono">LIVE AGENT OBSERVABILITY LAYER</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="px-4 py-2 hover:bg-white/10 rounded text-[var(--text-secondary)] font-mono">
                        [CLOSE_CONNECTION]
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 font-mono custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-[var(--brand-primary)] animate-pulse">
                            Establishing Neural Link...
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {traces.length === 0 && (
                                <div className="text-center text-gray-500 py-20">
                                    No active traces detected in the workspace.
                                </div>
                            )}
                            {traces.map((trace) => (
                                <div key={trace.id} className="border border-[var(--glass-border)] bg-white/5 p-4 rounded hover:border-[var(--brand-primary)] transition-colors group">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <Activity className={`w-4 h-4 ${trace.status === 'success' || trace.status === 'SUCCESS' ? 'text-green-500' : 'text-red-500'}`} />
                                            <span className="font-bold text-white tracking-wide">{trace.name.toUpperCase()}</span>
                                        </div>
                                        <span className="text-xs text-[var(--text-secondary)] font-mono opacity-60">{trace.id.slice(0, 8)}...</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-xs text-gray-400 mt-2">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            <span>{new Date(trace.start_time).toLocaleTimeString()}</span>
                                        </div>
                                        <div>
                                            Duration: <span className="text-white">{(trace.duration || 0).toFixed(2)}s</span>
                                        </div>
                                        <div>
                                            Status: <span className={trace.status === 'success' || trace.status === 'SUCCESS' ? 'text-green-400' : 'text-red-400'}>{trace.status}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-[var(--brand-primary)]/30 bg-[#0a0500] text-xs text-[var(--text-secondary)] font-mono flex justify-between">
                    <span>CONNECTED TO: OPIK Cloud [pact-demo]</span>
                    <span>SDK Latency: 42ms</span>
                </div>
            </motion.div>
        </div>
    );
};
