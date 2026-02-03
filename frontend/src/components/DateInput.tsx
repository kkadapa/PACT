import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, ArrowRight } from 'lucide-react';

export const DateInput: React.FC<{ onDateSelect: (date: string) => void, onBack: () => void }> = ({ onDateSelect, onBack }) => {
    const [date, setDate] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (date) onDateSelect(date);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-xl mx-auto w-full"
        >
            <CalendarClock className="w-16 h-16 mx-auto mb-6 text-[var(--brand-primary)] drop-shadow-[0_0_15px_rgba(37,99,235,0.5)]" />
            <h1 className="text-3xl font-bold mb-2">When is the deadline?</h1>
            <p className="text-[var(--text-secondary)] mb-8">
                Give yourself enough time, but not too much.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col items-center gap-6">
                <input
                    type="date"
                    className="w-full glass-panel text-center text-xl p-4"
                    min={new Date().toISOString().split('T')[0]}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    autoFocus
                    required
                />

                <div className="flex gap-4 w-full">
                    <button
                        type="button"
                        onClick={onBack}
                        className="btn-secondary flex-1"
                    >
                        Back
                    </button>
                    <button
                        type="submit"
                        disabled={!date}
                        className="btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                        Next Step <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </form>
        </motion.div>
    );
};
