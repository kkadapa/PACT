import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Calendar, FileText } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface Contract {
    id: string;
    goal?: string;
    goal_description?: string;
    deadline_utc?: string | any;
}

interface EditContractModalProps {
    contract: Contract;
    isOpen: boolean;
    onClose: () => void;
    onSave?: () => void;
}

export const EditContractModal: React.FC<EditContractModalProps> = ({ contract, isOpen, onClose, onSave }) => {
    // Initial state from contract prop
    // Use goal_description as primary, fallback to goal
    const initialGoal = contract.goal_description || contract.goal || '';

    // Parse initial date
    let initialDate = '';
    if (contract.deadline_utc) {
        if (typeof contract.deadline_utc === 'string') {
            // Basic ISO string handling
            initialDate = contract.deadline_utc.split('T')[0];
        } else if (contract.deadline_utc.seconds) {
            // Firestore Timestamp
            initialDate = new Date(contract.deadline_utc.seconds * 1000).toISOString().split('T')[0];
        }
    }

    const [goalText, setGoalText] = useState(initialGoal);
    const [deadline, setDeadline] = useState(initialDate);
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updates: any = {
                goal_description: goalText,
                // If legacy 'goal' field exists, update it too for consistency
                goal: goalText
            };

            if (deadline) {
                // Save as ISO string for simplicity or construct Date
                // App seems to handle mixed types, let's stick to ISO string for new edits
                const dateObj = new Date(deadline);
                // Set to end of day? Or just date. Let's keep it simple.
                updates.deadline_utc = dateObj.toISOString();
            }

            await updateDoc(doc(db, "contracts", contract.id), updates);

            if (onSave) onSave();
            onClose();
        } catch (e) {
            console.error("Failed to update goal", e);
            alert("Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg bg-[#050505] border border-[var(--brand-primary)] rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,240,255,0.2)]"
            >
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[var(--brand-primary)]/10">
                    <h2 className="text-lg font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[var(--brand-primary)]" />
                        Edit Protocol
                    </h2>
                    <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-[var(--brand-primary)] uppercase tracking-wider mb-2">
                            Mission Directive
                        </label>
                        <textarea
                            value={goalText}
                            onChange={(e) => setGoalText(e.target.value)}
                            className="w-full bg-black/50 border border-white/20 rounded p-3 text-white font-mono text-sm focus:border-[var(--brand-primary)] focus:outline-none h-32 resize-none"
                            placeholder="State your goal clearly..."
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-[var(--brand-primary)] uppercase tracking-wider mb-2">
                            Completion Deadline
                        </label>
                        <div className="relative">
                            <Calendar className="absolute top-3 left-3 w-4 h-4 text-gray-500" />
                            <input
                                type="date"
                                value={deadline}
                                onChange={(e) => setDeadline(e.target.value)}
                                className="w-full bg-black/50 border border-white/20 rounded p-3 pl-10 text-white font-mono text-sm focus:border-[var(--brand-primary)] focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 flex justify-end gap-3 bg-black/20">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-[var(--text-secondary)] hover:text-white uppercase tracking-wider transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2 bg-[var(--brand-primary)] text-black text-xs font-bold uppercase tracking-wider rounded hover:bg-white transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSaving ? 'Saving...' : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
