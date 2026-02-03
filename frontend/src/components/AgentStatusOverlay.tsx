import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, ShieldCheck, Search, Zap, CheckCircle2 } from 'lucide-react';

interface AgentLog {
    id: string;
    agent: 'contract' | 'verify' | 'detect' | 'adapt';
    message: string;
    status: 'pending' | 'active' | 'completed';
    timestamp: number;
}

const LOG_SEQUENCE = [
    { agent: 'verify', message: 'Analyzing evidence semantics...', delay: 0 },
    { agent: 'verify', message: 'Checking Strava/GPS consistency...', delay: 800 },
    { agent: 'detect', message: 'Auditing for fraud patterns...', delay: 1800 },
    { agent: 'detect', message: 'Reviewing enforcement safety limits...', delay: 2400 },
    { agent: 'adapt', message: 'Updating Ledger & User Stats...', delay: 3000 },
] as const;

export const AgentStatusOverlay: React.FC<{ isOpen: boolean }> = ({ isOpen }) => {
    const [logs, setLogs] = useState<AgentLog[]>([]);

    useEffect(() => {
        if (!isOpen) {
            setLogs([]);
            return;
        }

        let timeouts: ReturnType<typeof setTimeout>[] = [];
        const startTime = Date.now();

        LOG_SEQUENCE.forEach((step, index) => {
            const timeout = setTimeout(() => {
                setLogs(prev => [
                    ...prev.map(l => l.status === 'active' ? { ...l, status: 'completed' as const } : l),
                    {
                        id: `log-${index}`,
                        agent: step.agent,
                        message: step.message,
                        status: 'active',
                        timestamp: Date.now() - startTime
                    }
                ]);
            }, step.delay);
            timeouts.push(timeout);
        });

        // Completion Log
        timeouts.push(setTimeout(() => {
            setLogs(prev => prev.map(l => ({ ...l, status: 'completed' })));
        }, 3800));

        return () => timeouts.forEach(clearTimeout);
    }, [isOpen]);

    if (!isOpen) return null;

    const getIcon = (agent: string) => {
        switch (agent) {
            case 'verify': return <Search className="w-4 h-4 text-blue-400" />;
            case 'detect': return <ShieldCheck className="w-4 h-4 text-amber-400" />;
            case 'adapt': return <Zap className="w-4 h-4 text-red-400" />;
            default: return <Bot className="w-4 h-4 text-gray-400" />;
        }
    };

    return (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-6"
            onClick={(e) => e.stopPropagation()} // Prevent closing parent modal
        >
            <div className="w-full max-w-md bg-[#0f1115] border border-[var(--glass-border)] rounded-2xl p-6 shadow-2xl overflow-hidden relative">

                {/* Header */}
                <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                    <div className="relative">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-ping absolute top-0 right-0" />
                        <Bot className="w-8 h-8 text-[var(--brand-primary)]" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">PACT Agent Swarm</h3>
                        <p className="text-xs text-[var(--text-secondary)]">Live Execution Trace</p>
                    </div>
                </div>

                {/* Logs */}
                <div className="space-y-3 font-mono text-sm min-h-[200px]">
                    <AnimatePresence mode='popLayout'>
                        {logs.map((log) => (
                            <motion.div
                                key={log.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`flex items-center gap-3 p-2 rounded-lg ${log.status === 'active'
                                    ? 'bg-white/10 border-l-2 border-[var(--brand-primary)]'
                                    : 'opacity-60'
                                    }`}
                            >
                                <span className="p-1.5 bg-black/40 rounded-md border border-white/5">
                                    {getIcon(log.agent)}
                                </span>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center text-xs opacity-50 mb-0.5">
                                        <span className="uppercase tracking-wider font-bold">{log.agent} Agent</span>
                                        <span>+{log.timestamp}ms</span>
                                    </div>
                                    <p className={log.status === 'active' ? 'text-white' : 'text-[var(--text-secondary)]'}>
                                        {log.message}
                                    </p>
                                </div>
                                {log.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {logs.length === 0 && (
                        <div className="text-center text-[var(--text-secondary)] italic opacity-50 pt-10">
                            Initializing agents...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
