import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Calendar, Activity, DollarSign } from 'lucide-react';

interface ContractProps {
    goal_type: string;
    goal_description?: string;
    target_distance_km?: number;
    deadline_utc: string;
    confidence_required: number;
    penalty: {
        type: string;
        amount_usd?: number;
        destination?: string;
    };
}

export const ContractCard: React.FC<{ contract: ContractProps, onConfirm: () => void, onBack: () => void }> = ({ contract, onConfirm, onBack }) => {
    const deadline = new Date(contract.deadline_utc).toLocaleString();

    const renderGoal = () => {
        if (contract.goal_description) return contract.goal_description;
        if (contract.target_distance_km) return `${contract.target_distance_km}km Run`;
        return "General Activity";
    };

    const renderStakes = () => {
        if (contract.penalty.type === 'stake_burn') {
            return `${contract.penalty.amount_usd} Point Burn`;
        }
        if (contract.penalty.type === 'public_shame') {
            return "Public Accountability (X Post)";
        }
        // Fallback or Donation
        return `$${contract.penalty.amount_usd} Donation to ${contract.penalty.destination || 'Charity'}`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel p-8 max-w-md mx-auto text-left"
        >
            <div className="flex items-center gap-3 mb-6 border-b border-gray-700 pb-4">
                <ShieldCheck className="text-[var(--brand-primary)] w-8 h-8" />
                <h2 className="text-xl font-bold">Contract Generated</h2>
            </div>

            <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                    <Activity className="text-[var(--text-secondary)]" />
                    <div>
                        <span className="block text-sm text-[var(--text-secondary)]">Goal</span>
                        <span className="text-lg font-semibold">{renderGoal()}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Calendar className="text-[var(--text-secondary)]" />
                    <div>
                        <span className="block text-sm text-[var(--text-secondary)]">Deadline</span>
                        <span className="text-lg font-semibold">{deadline}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <DollarSign className="text-red-400" />
                    <div>
                        <span className="block text-sm text-[var(--text-secondary)]">Stakes</span>
                        <span className="text-lg font-semibold text-red-400">
                            {renderStakes()}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex gap-4">
                <button
                    onClick={onBack}
                    className="btn-secondary flex-1"
                >
                    Back
                </button>
                <button onClick={onConfirm} className="btn-primary flex-[2]">
                    Sign Pact & Commit
                </button>
            </div>
        </motion.div>
    );
};
