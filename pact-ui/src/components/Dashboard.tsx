import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Activity, Bell, ShieldAlert, ArrowRight, Trash2, Edit2, X, Save, Wallet, Flame, TrendingUp, CheckCircle, Search, Zap, ExternalLink } from 'lucide-react'; // Added icons
import axios from 'axios';

interface Contract {
    id: string;
    goal?: string; // Legacy
    goal_type?: string;
    goal_description?: string;
    target_distance_km?: number;
    status: string;
    penalty: {
        type: string;
        amount_usd?: number;
    } | undefined;
    penalty_type?: string;
    penalty_amount?: number;
    created_at: any;
    user_id: string;
    terms?: string[];
}

interface StakeData {
    current_balance: number;
    lifetime_earned: number;
    lifetime_burned: number;
}

// Agent Result Interface
interface VerificationResponse {
    verification: {
        status: string;
        confidence: number;
        failure_reason?: string;
    };
    audit: {
        verdict: string;
        reason: string;
        checks_passed: string[];
        checks_failed: string[];
    };
    enforcement?: string;
    stake_update?: any;
}

export const Dashboard: React.FC<{ onCreateNew: () => void }> = ({ onCreateNew }) => {
    const { user } = useAuth();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editGoal, setEditGoal] = useState('');

    // Stake State
    const [stakeData, setStakeData] = useState<StakeData>({ current_balance: 100, lifetime_earned: 0, lifetime_burned: 0 });

    // Verification State
    const [verifyingContract, setVerifyingContract] = useState<Contract | null>(null);
    const [evidenceText, setEvidenceText] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [agentResult, setAgentResult] = useState<VerificationResponse | null>(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'contracts'),
            where('user_id', '==', user.uid)
        );

        const stakeUnsub = onSnapshot(doc(db, 'stake_ledgers', user.uid), (doc) => {
            if (doc.exists()) {
                setStakeData(doc.data() as StakeData);
            } else {
                setStakeData({ current_balance: 100, lifetime_earned: 0, lifetime_burned: 0 });
            }
        });

        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                const fetchedContracts: Contract[] = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Contract));
                fetchedContracts.sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0));
                setContracts(fetchedContracts);
                setLoading(false);
            },
            (err) => {
                console.error("Firestore Error:", err);
                if (err.message.includes('index')) {
                    setError("Missing Firestore Index. Check console.");
                } else {
                    setError(err.message);
                }
                setLoading(false);
            }
        );

        return () => {
            unsubscribe();
            stakeUnsub();
        };
    }, [user]);

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to void this pact? This cannot be undone.")) {
            await deleteDoc(doc(db, "contracts", id));
        }
    };

    const startEdit = (contract: Contract) => {
        setEditingId(contract.id);
        setEditGoal(contract.goal || '');
    };

    const saveEdit = async (id: string) => {
        if (editGoal.trim()) {
            await updateDoc(doc(db, "contracts", id), { goal: editGoal });
            setEditingId(null);
        }
    };

    const handleVerify = async () => {
        if (!verifyingContract || !user) return;
        setIsVerifying(true);
        setAgentResult(null);

        try {
            const token = await user.getIdToken();
            const res = await axios.post(`${API_URL}/verify`, {
                contract: verifyingContract,
                user_id: user.uid,
                text_evidence: evidenceText
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log("Agent Result:", res.data);
            setAgentResult(res.data);
        } catch (err) {
            console.error(err);
            alert("Verification failed. Check console.");
        } finally {
            setIsVerifying(false);
        }
    };

    const closeVerification = () => {
        setVerifyingContract(null);
        setAgentResult(null);
        setEvidenceText('');
    };

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <div className="w-8 h-8 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center">
                <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Error Loading Pacts</h3>
                <p className="text-[var(--text-secondary)] mb-4">{error}</p>
            </div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-4xl mx-auto p-4 space-y-8 relative"
        >
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-left w-full">
                    <h1 className="text-3xl font-bold mb-1">Welcome back, {user?.displayName?.split(' ')[0]}</h1>
                    <p className="text-[var(--text-secondary)]">Your active protocols and activity logs.</p>
                </div>
                <button
                    onClick={onCreateNew}
                    className="btn-primary flex items-center gap-2 whitespace-nowrap"
                >
                    New Pact <ArrowRight className="w-4 h-4" />
                </button>
            </div>

            {/* Stake Overview Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-3">
                    <div className="glass-panel p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Wallet className="w-32 h-32" />
                        </div>

                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 relative z-10">
                            <div>
                                <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
                                    <Wallet className="w-5 h-5 text-[var(--brand-primary)]" />
                                    Stake Balance
                                </h2>
                                <p className="text-sm text-[var(--text-secondary)]">Your skin in the game.</p>
                            </div>

                            <div className="flex gap-8">
                                <div className="text-center">
                                    <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-bold mb-1">Current</p>
                                    <p className="text-3xl font-black">{stakeData.current_balance} <span className="text-sm font-normal text-[var(--text-secondary)]">pts</span></p>
                                </div>
                                <div className="w-px bg-white/10" />
                                <div className="text-center">
                                    <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-bold mb-1">Burned</p>
                                    <p className="text-3xl font-black text-red-500 flex items-center gap-1">
                                        -{stakeData.lifetime_burned} <Flame className="w-4 h-4 fill-current" />
                                    </p>
                                </div>
                                <div className="w-px bg-white/10" />
                                <div className="text-center">
                                    <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-bold mb-1">Earned</p>
                                    <p className="text-3xl font-black text-green-500 flex items-center gap-1">
                                        +{stakeData.lifetime_earned} <TrendingUp className="w-4 h-4" />
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-6 col-span-2">
                    <div className="flex items-center gap-2 mb-6">
                        <Activity className="w-5 h-5 text-[var(--brand-primary)]" />
                        <h2 className="font-semibold text-lg">Active Pacts</h2>
                    </div>

                    {contracts.length === 0 ? (
                        <div className="text-center py-10 border border-dashed border-[var(--text-secondary)] rounded-xl opacity-50">
                            <p>No active pacts found.</p>
                            <button onClick={onCreateNew} className="text-[var(--brand-primary)] underline mt-2">Create one now</button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <AnimatePresence>
                                {contracts.map(contract => (
                                    <motion.div
                                        key={contract.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="p-4 rounded-xl bg-white/5 border border-[var(--glass-border)] flex flex-col gap-3 group hover:bg-white/10 transition-all"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="text-left w-full mr-4">
                                                {editingId === contract.id ? (
                                                    <div className="flex gap-2">
                                                        <input
                                                            value={editGoal}
                                                            onChange={(e) => setEditGoal(e.target.value)}
                                                            className="w-full bg-black/20 rounded px-2 py-1 text-sm border border-white/20"
                                                            autoFocus
                                                        />
                                                        <button onClick={() => saveEdit(contract.id)} className="p-1 hover:text-green-400"><Save className="w-4 h-4" /></button>
                                                        <button onClick={() => setEditingId(null)} className="p-1 hover:text-red-400"><X className="w-4 h-4" /></button>
                                                    </div>
                                                ) : (
                                                    <h3 className="font-medium text-lg">
                                                        {contract.goal_description || contract.goal || (contract.target_distance_km ? `${contract.target_distance_km}km Run` : "General Goal")}
                                                    </h3>
                                                )}

                                                <div className="flex gap-3 text-xs text-[var(--text-secondary)] mt-1">
                                                    <span className="flex items-center gap-1">
                                                        <ShieldAlert className="w-3 h-3" />
                                                        {contract.penalty?.type === 'stake_burn' ? 'Stake Burn' :
                                                            contract.penalty?.type === 'public_shame' ? 'Public Shame' :
                                                                contract.penalty_type || 'Donation'}
                                                        {contract.penalty?.amount_usd && !['stake_burn', 'public_shame'].includes(contract.penalty.type) && ` $${contract.penalty.amount_usd}`}
                                                        {contract.penalty?.type === 'stake_burn' && ' (-10 pts)'}
                                                    </span>
                                                    {contract.created_at && (
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" /> {new Date(contract.created_at.seconds * 1000).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end gap-2">
                                                <button
                                                    onClick={() => setVerifyingContract(contract)}
                                                    className="px-3 py-1 rounded-full text-xs font-bold bg-[var(--brand-primary)] hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30 transition-all hover:scale-105"
                                                >
                                                    Prove It
                                                </button>

                                                {/* Actions */}
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => startEdit(contract)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/20 hover:text-blue-400 transition-colors" title="Edit Goal">
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={() => handleDelete(contract.id)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/20 hover:text-red-400 transition-colors" title="Delete Pact">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                <div className="glass-panel p-6 flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                        <Bell className="w-5 h-5 text-[var(--brand-primary)]" />
                        <h2 className="font-semibold text-lg">Updates</h2>
                    </div>

                    <div className="space-y-4 flex-1">
                        {/* Static Updates for now */}
                        <div className="flex gap-3 text-left text-sm opacity-80">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                            <p>Active pacts synced to Auditor Agent.</p>
                        </div>
                        <div className="flex gap-3 text-left text-sm opacity-50">
                            <div className="w-2 h-2 rounded-full bg-gray-500 mt-1.5 shrink-0" />
                            <p>System initialized.</p>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/10">
                        <div className="flex items-center justify-between opacity-50 text-xs">
                            <span>Observability by</span>
                            <div className="flex items-center gap-1 font-bold">
                                <Zap className="w-3 h-3 text-yellow-400 fill-current" />
                                OPIK
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Verification Overlay */}
            <AnimatePresence>
                {verifyingContract && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
                        onClick={(e) => { if (e.target === e.currentTarget) closeVerification() }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#0f1115] border border-[var(--glass-border)] p-6 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button onClick={closeVerification} className="absolute top-4 right-4 text-white/50 hover:text-white"><X className="w-6 h-6" /></button>

                            {!agentResult ? (
                                <>
                                    <h2 className="text-2xl font-bold mb-2">Verify Activity</h2>
                                    <p className="text-[var(--text-secondary)] mb-6">Provide evidence for the agents to inspect.</p>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">What did you do?</label>
                                            <textarea
                                                className="w-full glass-panel p-3 h-32 resize-none"
                                                placeholder="I ran 5km in the park..."
                                                value={evidenceText}
                                                onChange={(e) => setEvidenceText(e.target.value)}
                                            />
                                        </div>

                                        <button
                                            onClick={handleVerify}
                                            disabled={isVerifying || !evidenceText}
                                            className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                                        >
                                            {isVerifying ? 'Agents Analyzing...' : 'Submit Evidence'}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
                                    <div className="flex items-center justify-between pb-4 border-b border-white/10">
                                        <h2 className="text-xl font-bold flex items-center gap-2">
                                            <Zap className="text-[var(--brand-primary)]" />
                                            Proof Analysis
                                        </h2>
                                        <div className="flex items-center gap-1 text-xs px-2 py-1 bg-white/5 rounded border border-white/10">
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                            Opik Trace Active
                                        </div>
                                    </div>

                                    {/* 1. Verification Agent */}
                                    <div className="text-left space-y-2">
                                        <div className="flex items-center gap-2 text-sm font-bold text-blue-400 uppercase tracking-widest">
                                            <Search className="w-4 h-4" /> Verify Agent
                                        </div>
                                        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-bold">{agentResult.verification.status}</span>
                                                <span className="text-xs bg-black/30 px-2 py-0.5 rounded text-blue-300">
                                                    {(agentResult.verification.confidence * 100).toFixed(0)}% Confidence
                                                </span>
                                            </div>
                                            {agentResult.verification.failure_reason ? (
                                                <p className="text-sm text-red-300">🛑 {agentResult.verification.failure_reason}</p>
                                            ) : (
                                                <p className="text-sm text-[var(--text-secondary)]">Evidence matches contract requirements.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* 2. Detect Agent */}
                                    <div className="text-left space-y-2">
                                        <div className="flex items-center gap-2 text-sm font-bold text-amber-400 uppercase tracking-widest">
                                            <ShieldAlert className="w-4 h-4" /> Detect Agent (Audit)
                                        </div>
                                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-bold">{agentResult.audit.verdict}</span>
                                            </div>
                                            <p className="text-sm text-[var(--text-secondary)] mb-2">{agentResult.audit.reason}</p>
                                            {agentResult.audit.checks_failed.length > 0 && (
                                                <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded">
                                                    <strong>Flags:</strong> {agentResult.audit.checks_failed.join(', ')}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 3. Stake Update */}
                                    {agentResult.stake_update && (
                                        <div className="text-left space-y-2">
                                            <div className="flex items-center gap-2 text-sm font-bold text-green-400 uppercase tracking-widest">
                                                <Wallet className="w-4 h-4" /> Ledger Update
                                            </div>
                                            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-sm">
                                                Balance Updated.
                                            </div>
                                        </div>
                                    )}

                                    <a
                                        href="https://comet.com/opik"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block w-full py-3 text-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-[var(--text-secondary)] transition-colors mt-4 flex items-center justify-center gap-2"
                                    >
                                        View Full Trace in Comet <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
