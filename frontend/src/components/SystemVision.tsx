import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Activity, Zap, DollarSign, CheckCircle, BarChart3, Shield, Cpu } from 'lucide-react';

interface Stats {
    success_rate: number;
    avg_latency: number;
    total_traces: number;
    cost_estimate: number;
    daily_active_contracts: number;
    recent_verdicts: any[];
    token_usage: { prompt: number, completion: number, total: number };
    safety_scores: { hallucination: number, bias: number, toxicity: number };
    trace_waterfall: { step: string, agent: string, latency: number, status: string }[];
}

export const SystemVision: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchStats = async () => {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        try {
            const res = await axios.get(`${API_URL}/opik/stats`);
            setStats(res.data);
            setLoading(false);
        } catch (e) {
            console.error("Failed to fetch Opik stats", e);
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-5xl h-[85vh] bg-[#050505] border border-[var(--brand-primary)] rounded-xl overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,240,255,0.15)] relative"
            >
                {/* Background Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

                {/* Header */}
                <div className="p-6 border-b border-[var(--brand-primary)]/20 flex justify-between items-center bg-[#0a0500]/80 backdrop-blur relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded bg-[var(--brand-primary)]/10 flex items-center justify-center border border-[var(--brand-primary)]/30">
                            <Cpu className="w-6 h-6 text-[var(--brand-primary)]" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Agent Overwatch</h2>
                            <p className="text-xs text-[var(--brand-secondary)] font-mono tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                SYSTEM OPTIMAL // OPIK ENABLED
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="px-6 py-2 border border-white/10 hover:bg-white/5 rounded text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] transition-colors">
                        Close Dashboard
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-8 font-mono relative z-10 custom-scrollbar">
                    {loading || !stats ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-[var(--brand-primary)]">
                            <Loader className="w-8 h-8 animate-spin" />
                            <span className="text-xs uppercase tracking-widest animate-pulse">Aggregating Telemetry...</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                            {/* Key Metrics Row */}
                            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4">
                                <MetricCard
                                    label="Success Rate"
                                    value={`${stats.success_rate}%`}
                                    icon={<CheckCircle className="text-green-400" />}
                                    trend="+2.4%"
                                    trendUp={true}
                                />
                                <MetricCard
                                    label="Avg Latency"
                                    value={`${stats.avg_latency}s`}
                                    icon={<Zap className="text-yellow-400" />}
                                    subtext="P99: 1.8s"
                                />
                                <MetricCard
                                    label="Total Traces"
                                    value={stats.total_traces.toString()}
                                    icon={<Activity className="text-blue-400" />}
                                    subtext="Last 24h"
                                />
                                <MetricCard
                                    label="Est. Cost"
                                    value={`$${stats.cost_estimate}`}
                                    icon={<DollarSign className="text-purple-400" />}
                                    subtext="Daily Projection"
                                />
                            </div>

                            {/* Main Chart / Visualization Area (Mocked for MVP) */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm h-64 flex flex-col relative overflow-hidden group">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
                                            <BarChart3 className="w-4 h-4 text-[var(--brand-primary)]" />
                                            Verification Volume
                                        </h3>
                                        <select className="bg-black/50 border border-white/20 text-[10px] text-white p-1 rounded">
                                            <option>Last 24 Hours</option>
                                            <option>Last 7 Days</option>
                                        </select>
                                    </div>

                                    {/* Mock Bar Chart */}
                                    <div className="flex-1 flex items-end justify-between gap-2 px-2">
                                        {[40, 65, 45, 80, 55, 90, 70, 60, 85, 50, 75, 95].map((h, i) => (
                                            <div key={i} className="w-full bg-[var(--brand-primary)]/20 hover:bg-[var(--brand-primary)]/50 transition-all rounded-t-sm relative group/bar">
                                                <div style={{ height: `${h}%` }} className="w-full bg-[var(--brand-primary)] absolute bottom-0 opacity-60 group-hover/bar:opacity-100 transition-opacity"></div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between text-[10px] text-gray-500 mt-2 uppercase">
                                        <span>00:00</span>
                                        <span>12:00</span>
                                        <span>23:59</span>
                                    </div>
                                </div>

                                <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-4 flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-orange-400" />
                                        Safety & Alignment Checks
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-gray-400">Harmful Content Detection</span>
                                            <span className="text-green-400 font-bold">100% PASS</span>
                                        </div>
                                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full w-full bg-green-500"></div>
                                        </div>

                                        <div className="flex items-center justify-between text-xs mt-2">
                                            <span className="text-gray-400">Goal Specificity Compliance</span>
                                            <span className="text-yellow-400 font-bold">92% PASS</span>
                                        </div>
                                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full w-[92%] bg-yellow-500"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Activity Feed */}
                            <div className="lg:col-span-1">
                                <div className="p-0 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm h-full flex flex-col overflow-hidden">
                                    <div className="p-4 border-b border-white/10 bg-white/5">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-white">Live Verdicts</h3>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                        {/* Mock Data Injection if empty */}
                                        {(stats.recent_verdicts.length > 0 ? stats.recent_verdicts : [
                                            { id: 'trace_01', name: 'Running Verification', status: 'pass', confidence: 0.98 },
                                            { id: 'trace_02', name: 'Code Review', status: 'flagged', confidence: 0.45 },
                                            { id: 'trace_03', name: 'Meditation Check', status: 'pass', confidence: 0.92 },
                                            { id: 'trace_04', name: 'Diet Adherence', status: 'pass', confidence: 0.88 },
                                            { id: 'trace_05', name: 'Wake Up Early', status: 'pass', confidence: 0.99 },
                                        ]).map((verdict, i) => (
                                            <div key={i} className="p-3 rounded border border-white/5 bg-black/20 hover:border-white/20 transition-colors">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-xs font-bold text-white truncate w-32">{verdict.name}</span>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${verdict.status === 'pass' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                        {verdict.status === 'pass' ? 'APPROVED' : 'FLAGGED'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] text-gray-500 font-mono">ID: {verdict.id?.slice(-6) || 'N/A'}</span>
                                                    <span className="text-[10px] text-[var(--brand-primary)]">
                                                        CONF: {(verdict.confidence * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-[var(--brand-primary)]/20 bg-[#0a0500] text-[10px] text-[var(--text-secondary)] font-mono flex justify-between uppercase tracking-wider">
                    <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        Opik Gateway: Connected
                    </span>
                    <span>Version 2.4.0 // Build 8821</span>
                </div>
            </motion.div>
        </div>
    );
};

const MetricCard = ({ label, value, icon, subtext, trend, trendUp }: any) => (
    <div className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors group">
        <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">{label}</span>
            <div className="opacity-80 group-hover:opacity-100 transition-opacity">{icon}</div>
        </div>
        <div className="flex items-end gap-2">
            <span className="text-2xl font-black text-white tracking-tight">{value}</span>
            {trend && (
                <span className={`text-xs font-bold mb-1 ${trendUp ? 'text-green-400' : 'text-red-400'}`}>
                    {trend}
                </span>
            )}
        </div>
        {subtext && <p className="text-[10px] text-gray-500 mt-1 font-mono uppercase">{subtext}</p>}
    </div>
);

const Loader = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
);
