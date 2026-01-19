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
                        <div className="mb-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 rounded-2xl bg-[var(--brand-gradient)] shadow-lg">
                                    <Cpu className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold">About PACT<span className="text-[var(--brand-primary)]">⁰</span></h2>
                                    <p className="text-sm text-[var(--text-secondary)]">The Autonomous Commitment Engine</p>
                                </div>
                            </div>

                            <p className="text-[var(--text-primary)] leading-relaxed mb-6">
                                PACT⁰ helps you achieve your goals by turning them into <strong>binding smart contracts</strong>.
                                Instead of relying on willpower, we use a team of AI agents to verify your actions and enforce real stakes if you fall short.
                            </p>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider">The AI Agent Team</h3>

                                <div className="p-4 rounded-xl bg-white/5 border border-[var(--glass-border)] hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                        <h4 className="font-bold text-[var(--text-primary)]">1. Contract Agent</h4>
                                    </div>
                                    <p className="text-sm text-[var(--text-secondary)]">Negotiates the terms with you. parses your natural language goal into a machine-verifiable JSON contract with specific deadlines and penalties.</p>
                                </div>

                                <div className="p-4 rounded-xl bg-white/5 border border-[var(--glass-border)] hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                        <h4 className="font-bold text-[var(--text-primary)]">2. Verify Agent</h4>
                                    </div>
                                    <p className="text-sm text-[var(--text-secondary)]">The Judge. Connects to APIs (Strava, Location) to validate your proof of work using strict logic gates. Checks timestamps, distances, and data integrity.</p>
                                </div>

                                <div className="p-4 rounded-xl bg-white/5 border border-[var(--glass-border)] hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                                        <h4 className="font-bold text-[var(--text-primary)]">3. Detect Agent</h4>
                                    </div>
                                    <p className="text-sm text-[var(--text-secondary)]">The Auditor. Reviews the Verify Agent's decision for potential errors or fraud. Uses Opik metrics to ensure fairness and prevent false flags.</p>
                                </div>

                                <div className="p-4 rounded-xl bg-white/5 border border-[var(--glass-border)] hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-2 h-2 rounded-full bg-red-400"></span>
                                        <h4 className="font-bold text-[var(--text-primary)]">4. Adapt Agent</h4>
                                    </div>
                                    <p className="text-sm text-[var(--text-secondary)]">The Enforcer. Executes the penalty if the contract is broken. Burns your earned stakes, donates money, or posts public accountability updates.</p>
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
