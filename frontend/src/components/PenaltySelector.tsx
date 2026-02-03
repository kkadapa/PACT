import React from 'react';
import { motion } from 'framer-motion';
import { HeartCrack, TrendingUp } from 'lucide-react';

interface PenaltyData {
    type: 'donation' | 'public_shame' | 'stake_burn';
    amount: number;
}

export const PenaltySelector: React.FC<{ onSelect: (data: PenaltyData) => void, onBack: () => void }> = ({ onSelect, onBack }) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-2xl mx-auto"
        >
            <h2 className="text-3xl font-bold mb-8">Choose your Consequence</h2>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Option 1: Earned Stake Burn */}
                <div
                    onClick={() => onSelect({ type: 'stake_burn', amount: 10 })}
                    className="glass-panel p-6 cursor-pointer hover:border-[var(--brand-primary)] transition-colors group"
                >
                    <TrendingUp className="w-12 h-12 mb-4 text-[var(--brand-primary)] group-hover:scale-110 transition-transform" />
                    <h3 className="text-xl font-bold mb-2">Earned Stake Burn</h3>
                    <p className="text-[var(--text-secondary)] text-sm">
                        You lose <strong className="text-[var(--brand-primary)]">10 points</strong> from your earned balance if you fail.
                    </p>
                    <div className="text-xs font-mono bg-emerald-100 text-emerald-800 p-2 rounded mt-2 inline-block">
                        Primary Option
                    </div>
                </div>

                {/* Option 2: Public Accountability */}
                <div
                    onClick={() => {
                        // Simulate Auth Flow
                        const isConnected = window.confirm("PACT wants to access your X (Twitter) account to post potential failures.\n\nAuthorize App?");
                        if (isConnected) {
                            onSelect({ type: 'public_shame', amount: 0 });
                        }
                    }}
                    className="glass-panel p-6 cursor-pointer hover:border-red-500 transition-colors group relative overflow-hidden"
                >
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-red-500/20 text-red-600 text-[10px] font-bold uppercase tracking-wider">
                        High Stakes
                    </div>
                    <HeartCrack className="w-12 h-12 mb-4 text-red-500 group-hover:scale-110 transition-transform" />
                    <h3 className="text-xl font-bold mb-2">Public Accountability</h3>
                    <p className="text-[var(--text-secondary)] text-sm mb-4">
                        We post your failure to X (Twitter) automatically.
                    </p>
                    <div className="text-xs font-mono bg-gray-100 border border-gray-200 p-2 rounded text-gray-800 items-center flex gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span>Authorize X (Twitter)</span>
                    </div>
                </div>
            </div>

            <button onClick={onBack} className="mt-8 btn-secondary">
                Back
            </button>
        </motion.div>
    );
};
