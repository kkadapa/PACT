import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Activity, Bell, ShieldAlert, ArrowRight, Trash2, Edit2, X, Save } from 'lucide-react';

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
    } | undefined; // Handle missing or legacy structure
    // Legacy flat fields for fallback
    penalty_type?: string;
    penalty_amount?: number;
    created_at: any;
    user_id: string;
    terms?: string[];
}

export const Dashboard: React.FC<{ onCreateNew: () => void }> = ({ onCreateNew }) => {
    const { user } = useAuth();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editGoal, setEditGoal] = useState('');

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'contracts'),
            where('user_id', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                const fetchedContracts: Contract[] = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Contract));
                // Client-side sort fallback
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

        return () => unsubscribe();
    }, [user]);

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to void this pact? This cannot be undone.")) {
            await deleteDoc(doc(db, "contracts", id));
        }
    };

    const startEdit = (contract: Contract) => {
        setEditingId(contract.id);
        setEditGoal(contract.goal);
    };

    const saveEdit = async (id: string) => {
        if (editGoal.trim()) {
            await updateDoc(doc(db, "contracts", id), { goal: editGoal });
            setEditingId(null);
        }
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
            className="w-full max-w-4xl mx-auto p-4 space-y-8"
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
                                        className="p-4 rounded-xl bg-white/5 border border-[var(--glass-border)] flex flex-col gap-3 group hover:bg-white/10 transition-colors"
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
                                                <div className={`px-3 py-1 rounded-full text-xs font-bold ${contract.status === 'Completed' ? 'bg-green-500' : 'bg-[var(--brand-primary)]'} text-white`}>
                                                    {contract.status || 'ACTIVE'}
                                                </div>

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

                <div className="glass-panel p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <Bell className="w-5 h-5 text-[var(--brand-primary)]" />
                        <h2 className="font-semibold text-lg">Updates</h2>
                    </div>

                    <div className="space-y-4">
                        {/* Stubbed Notifications */}
                        {contracts.length > 0 && (
                            <div className="flex gap-3 text-left text-sm opacity-80">
                                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                <p>Active pacts synced to Auditor Agent.</p>
                            </div>
                        )}
                        <div className="flex gap-3 text-left text-sm opacity-50">
                            <div className="w-2 h-2 rounded-full bg-gray-500 mt-1.5 shrink-0" />
                            <p>System initialized.</p>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
