import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

const POPULAR_RESOLUTIONS = [
    "🏋️ Exercise 3x/week",
    "💰 Save $500 this month",
    "🧘 Meditate 10min daily",
    "🥗 Eat 5 servings of veg",
    "👨‍👩‍👧‍👦 Weekly family dinner",
    "✈️ Plan a weekend trip",
    "🎸 Learn a new skill",
    "🚭 Quit smoking/vaping",
    "🛑 No work after 6 PM",
    "📵 Screen time < 2h/day"
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
            <Flame className="w-16 h-16 mx-auto mb-6 text-[var(--brand-primary)] drop-shadow-[0_0_15px_rgba(37,99,235,0.5)]" />
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

            <div className="text-left">
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
        </motion.div>
    );
};
