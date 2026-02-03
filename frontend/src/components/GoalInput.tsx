import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Rocket, Sparkles } from 'lucide-react';

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
            className="w-full"
        >
            <div className="relative w-24 h-24 mx-auto mb-8 flex items-center justify-center">
                {/* Gradient Defs for Icon */}
                <svg width="0" height="0" className="absolute">
                    <linearGradient id="rocket-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#22d3ee" />   {/* Cyan-400 */}
                        <stop offset="50%" stopColor="#818cf8" />  {/* Indigo-400 */}
                        <stop offset="100%" stopColor="#e879f9" /> {/* Fuchsia-400 */}
                    </linearGradient>
                </svg>

                <div className="absolute inset-0 bg-blue-500 rounded-full opacity-10 animate-ping duration-[3000ms]"></div>
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400 to-purple-500 rounded-full opacity-20 blur-2xl animate-pulse"></div>

                <Rocket
                    className="w-14 h-14 relative z-10 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)] -rotate-45"
                    style={{ stroke: "url(#rocket-gradient)" }}
                />
                <Sparkles className="absolute top-3 right-3 w-6 h-6 text-yellow-300 animate-bounce duration-[2000ms] drop-shadow-md" />
            </div>

            <div className="w-full px-4 mb-4 text-center">
                <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] whitespace-nowrap font-black tracking-tight bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 bg-clip-text text-transparent pb-4 leading-tight">
                    Define Your Mission
                </h1>
            </div>

            <p className="text-slate-500 mb-10 text-xl font-medium max-w-2xl mx-auto leading-relaxed text-center">
                Assign a directive to your autonomous squad.
            </p>

            <div className="max-w-3xl mx-auto w-full px-4">
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
                    <h3 className="text-xl font-bold text-[var(--text-secondary)] mb-4 uppercase tracking-wider pl-1 font-display">
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
                                className="glass-panel px-5 py-4 text-lg font-medium hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors text-left"
                            >
                                {goal}
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* Agent Team Display Removed */}
            </div>
        </motion.div>
    );
};
