import React from 'react';
import { Cpu, ShieldCheck, Search, Flame } from 'lucide-react';

export const LandingInfo: React.FC = () => {
    return (
        <div className="hidden lg:flex flex-col justify-center h-full p-12 max-w-xl text-left">
            <div className="mb-8">
                <h1 className="text-5xl font-black tracking-tighter mb-4">
                    PACT<span className="text-[var(--brand-primary)]">⁰</span>
                </h1>
                <p className="text-lg text-[var(--text-secondary)] leading-relaxed">
                    The <strong>Autonomous Commitment Engine</strong>. <br />
                    We don't trust your willpower. We trust code.
                </p>
            </div>

            <div className="space-y-6">
                <div className="flex gap-4 group">
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 h-fit group-hover:border-[var(--brand-primary)]/50 transition-colors">
                        <Cpu className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-[var(--text-primary)]">1. Smart Negotiation</h3>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">
                            <strong>Contract Agent</strong> parses your goals into strict, verifiable JSON terms.
                        </p>
                    </div>
                </div>

                <div className="flex gap-4 group">
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 h-fit group-hover:border-[var(--brand-primary)]/50 transition-colors">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-[var(--text-primary)]">2. Proof of Work</h3>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">
                            <strong>Verify Agent</strong> checks APIs (Strava/GitHub) to validate your progress. No cheating.
                        </p>
                    </div>
                </div>

                <div className="flex gap-4 group">
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 h-fit group-hover:border-[var(--brand-primary)]/50 transition-colors">
                        <Search className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-[var(--text-primary)]">3. AI Governance</h3>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">
                            <strong>Detect Agent</strong> audits every decision to ensure fairness before any action is taken.
                        </p>
                    </div>
                </div>

                <div className="flex gap-4 group">
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 h-fit group-hover:border-[var(--brand-primary)]/50 transition-colors">
                        <Flame className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                        <h3 className="font-bold text-[var(--text-primary)]">4. Real Stakes</h3>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">
                            <strong>Adapt Agent</strong> executes the penalty. Burn stakes, donate money, or face public shame.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
