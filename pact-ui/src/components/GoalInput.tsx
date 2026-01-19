import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Target } from 'lucide-react';

const POPULAR_RESOLUTIONS = [
    "💪 Do 100 pushups/day",
    "🏋️ Exercise 3x/week",
    "💰 Save $500 this month",
    "🧘 Meditate 10min daily",
    "🥗 Eat 5 servings of veg",
    "🛑 No work after 6 PM",
    "📚 Read 1 book/month",
    "💧 Drink 8 glasses of water/day",
    "🚶 Walk 10,000 steps/day",
    "🧘 Meditate 20min/day",
    "👨‍👩‍👧‍👦 Weekly family dinner",
    "✈️ Plan a weekend trip",
    "🎸 Learn a new skill",
    "🚭 Quit smoking/vaping",
    "🛑 No work after 6 PM",
    "📵 Screen time < 2h/day",
    "🤝 Attend 1 Networking Event/month"
];

export const GoalInput: React.FC<{ onSubmit: (goal: string) => void, isLoading: boolean }> = ({ onSubmit, isLoading }) => {
    const [input, setInput] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) onSubmit(input);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xl mx-auto w-full"
        >
            <Target className="w-16 h-16 mx-auto mb-6 text-[var(--brand-primary)] drop-shadow-[0_0_15px_rgba(37,99,235,0.5)]" />
            <h1 className="text-4xl font-bold mb-2">What will you prove?</h1>
            <p className="text-[var(--text-secondary)] mb-8">
                Tell us your goal. Our agents will hold you to it.
            </p>

            <form onSubmit={handleSubmit} className="relative mb-12 flex flex-col items-center gap-4">
                <input
                    type="text"
                    placeholder="e.g., Run 10km"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading}
                    autoFocus
                    className="w-full glass-panel"
                />


                <button
                    type="submit"
                    disabled={isLoading || !input}
                    className="btn-primary w-full text-lg px-8 py-3 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all mt-4"
                >
                    {isLoading ? 'Negotiating...' : 'Next: Set Deadline'}
                </button>
            </form>

            <div className="text-left mb-12">
                <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4 uppercase tracking-wider pl-1">
                    Top Resolutions 2026
                </h3>
                <div className="flex flex-wrap gap-3">
                    {POPULAR_RESOLUTIONS.map((goal, idx) => (
                        <motion.button
                            key={idx}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onSubmit(goal)}
                            disabled={isLoading}
                            className="glass-panel px-4 py-3 text-sm font-medium hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors text-left"
                        >
                            {goal}
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Agent Team Display */}
            <div className="pt-8 border-t border-[var(--glass-border)]">
                <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-6 uppercase tracking-wider text-center">
                    Your Autonomous Squad
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white/5 border border-[var(--glass-border)] hover:bg-white/10 transition-colors text-left">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                            <span className="font-bold text-sm">Contract</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)]">Negotiates terms & deadlines.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-[var(--glass-border)] hover:bg-white/10 transition-colors text-left">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            <span className="font-bold text-sm">Verify</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)]">Validates proof via APIs.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-[var(--glass-border)] hover:bg-white/10 transition-colors text-left">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                            <span className="font-bold text-sm">Detect</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)]">Audits for fairness & fraud.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-[var(--glass-border)] hover:bg-white/10 transition-colors text-left">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-2 h-2 rounded-full bg-red-400"></span>
                            <span className="font-bold text-sm">Adapt</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)]">Enforces penalty stakes.</p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
