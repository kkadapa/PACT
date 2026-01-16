import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Github, Code, Cpu } from 'lucide-react';

interface AboutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    {/* Modal Card */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, rotateX: 20 }}
                        animate={{ scale: 1, opacity: 1, rotateX: 0 }}
                        exit={{ scale: 0.9, opacity: 0, rotateX: 20 }}
                        className="glass-panel w-full max-w-lg p-8 relative overflow-hidden text-left"
                        style={{ perspective: '1000px' }}
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--glass-border)] transition-colors"
                        >
                            <X className="w-5 h-5 text-[var(--text-secondary)]" />
                        </button>

                        {/* Content */}
                        <div className="mb-8">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 rounded-2xl bg-[var(--brand-gradient)] shadow-lg">
                                    <Cpu className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold">About PACT<span className="text-[var(--brand-primary)]">⁰</span></h2>
                                    <p className="text-sm text-[var(--text-secondary)]">Autonomous Commitment Engine</p>
                                </div>
                            </div>

                            <p className="text-[var(--text-primary)] leading-relaxed mb-4">
                                PACT⁰ is not just a to-do list. It's an <strong>AI-enforced contract protocol</strong>.
                                We use autonomous agents to verify your real-world actions (via Strava, GPS, etc.)
                                and execute real consequences if you break your word.
                            </p>

                            <div className="p-4 rounded-xl bg-[var(--glass-border)] border border-[var(--glass-border)]">
                                <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">System Architecture:</p>
                                <div className="flex gap-2 text-xs font-mono text-[var(--brand-primary)]">
                                    <span className="px-2 py-1 rounded bg-white/50">Contract Agent</span>
                                    <span className="px-2 py-1 rounded bg-white/50">Verify Agent</span>
                                    <span className="px-2 py-1 rounded bg-white/50">Detect Agent</span>
                                </div>
                            </div>
                        </div>

                        {/* Innovative Contact / Signature Section */}
                        <div className="pt-6 border-t border-[var(--glass-border)]">
                            <p className="text-xs text-[var(--text-secondary)] mb-3 uppercase tracking-widest text-center">
                                Protocol Authenticated By
                            </p>

                            <a
                                href="https://github.com/kkadapa"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative flex items-center justify-between p-4 rounded-xl overflow-hidden cursor-pointer hover:bg-white/40 transition-all duration-300 border border-transparent hover:border-[var(--brand-primary)]"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                                        <Github className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg group-hover:text-[var(--brand-primary)] transition-colors">
                                            @kkadapa
                                        </h3>
                                        <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                                            <Code className="w-3 h-3" />
                                            <span>Lead Architect</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Animated Arrow/Signature Effect */}
                                <div className="opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                                    <span className="text-sm font-semibold text-[var(--brand-primary)]">Connect &rarr;</span>
                                </div>

                                {/* Background Shimmer */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                            </a>
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
