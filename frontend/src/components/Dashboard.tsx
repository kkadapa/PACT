import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Activity, ShieldAlert, Trash2, Edit2, X, Wallet, Flame, TrendingUp, CheckCircle, Search, Zap, Paperclip, Loader2, AlarmClock } from 'lucide-react';
import axios from 'axios';
import { AgentStatusOverlay } from './AgentStatusOverlay';
import { EditContractModal } from './EditContractModal';

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
    deadline_utc?: string | any; // Firestore Timestamp or String
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
    opik_trace_id?: string;
}

export const Dashboard: React.FC<{ onCreateNew: () => void }> = ({ onCreateNew }) => {
    const { user } = useAuth();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reminder, setReminder] = useState<string | null>(null);

    // Edit State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

    // Stake State
    const [stakeData, setStakeData] = useState<StakeData>({ current_balance: 100, lifetime_earned: 0, lifetime_burned: 0 });

    // Verification State
    const [verifyingContract, setVerifyingContract] = useState<Contract | null>(null);
    const [evidenceText, setEvidenceText] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [agentResult, setAgentResult] = useState<VerificationResponse | null>(null);

    // Upload State
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

                // Reminder Logic
                const now = new Date();
                const urgentContract = fetchedContracts.find(c => {
                    if (c.status !== 'Active' || !c.deadline_utc) return false;
                    let deadline;
                    // Handle Firestore Timestamp vs ISO String
                    if (typeof c.deadline_utc === 'string') {
                        deadline = new Date(c.deadline_utc.replace('Z', '')); // basic parsing
                    } else if (c.deadline_utc?.seconds) {
                        deadline = new Date(c.deadline_utc.seconds * 1000);
                    } else {
                        return false;
                    }

                    const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
                    return hoursLeft > 0 && hoursLeft < 24;
                });

                if (urgentContract) {
                    setReminder(`⏰ ACTION REQUIRED: "${urgentContract.goal_description || 'Your Goal'}" expires in < 24 hours!`);
                } else {
                    setReminder(null);
                }

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
        setSelectedContract(contract);
        setIsEditModalOpen(true);
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setSelectedFile(event.target.files[0]);
        }
    };

    const handleVerify = async () => {
        if (!verifyingContract || !user) return;
        setIsVerifying(true);
        setAgentResult(null);

        try {
            const token = await user.getIdToken();
            let imageUrl = null;

            // 1. Upload Image if selected
            if (selectedFile) {
                setUploading(true);
                const formData = new FormData();
                formData.append('file', selectedFile);

                // Note: Ensure /upload_evidence endpoint exists in api.py
                try {
                    const uploadRes = await axios.post(`${API_URL}/upload_evidence`, formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        }
                    });
                    imageUrl = uploadRes.data.url;
                } catch (uploadErr) {
                    console.error("Upload failed, using fallback/mock url if configured", uploadErr);
                    // Fallback or alert? For now proceed without image or with partial data
                }
                setUploading(false);
            }

            // 2. Verify
            const res = await axios.post(`${API_URL}/verify`, {
                contract: verifyingContract,
                user_id: user.uid,
                text_evidence: evidenceText,
                image_url: imageUrl
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log("Agent Result:", res.data);

            // Artificial delay to let the animation finish if API is too fast
            setTimeout(() => {
                setAgentResult(res.data);
                setIsVerifying(false);
            }, 3000);

        } catch (err) {
            console.error(err);
            alert("Verification failed. Check console.");
            setIsVerifying(false);
            setUploading(false);
        }
    };

    const closeVerification = () => {
        setVerifyingContract(null);
        setAgentResult(null);
        setEvidenceText('');
        setSelectedFile(null);
        setUploading(false);
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
            <div className="p-8 text-center bg-red-900/20 border border-red-500/50 rounded-xl">
                <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2 text-red-400">SYSTEM ERROR</h3>
                <p className="text-[var(--text-secondary)] mb-4 font-mono text-sm">{error}</p>
            </div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-5xl mx-auto p-4 space-y-8 relative font-mono"
        >
            {/* Reminder Banner */}
            <AnimatePresence>
                {reminder && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-amber-500/10 border border-amber-500/50 text-amber-500 px-4 py-3 flex items-center justify-between overflow-hidden"
                    >
                        <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-sm">
                            <AlarmClock className="w-4 h-4" />
                            {reminder}
                        </div>
                        <button onClick={() => setReminder(null)} className="hover:text-white"><X className="w-4 h-4" /></button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header / HUD Top */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-[var(--brand-primary)] pb-4">
                <div className="text-left w-full">
                    <div className="text-[10px] text-[var(--brand-primary)] uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                        <div className="w-2 h-2 bg-[var(--brand-primary)] animate-pulse rounded-full"></div>
                        Operator Status: Online
                    </div>
                    <h1 className="text-4xl font-black mb-1 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500 uppercase tracking-tighter">
                        Command Nexus // {user?.displayName?.split(' ')[0]}
                    </h1>
                </div>
                <button
                    onClick={onCreateNew}
                    className="btn-primary flex items-center gap-2 whitespace-nowrap"
                >
                    Initialize Protocol +
                </button>
            </div>

            {/* Top Row: Trust Score */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-3">
                    <div className="glass-panel p-6 relative overflow-hidden border-l-4 border-l-[var(--brand-primary)]">
                        {/* Deco Background */}
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Wallet className="w-48 h-48" />
                        </div>
                        <div className="absolute bottom-0 left-20 w-32 h-1 bg-[var(--brand-primary)] opacity-20"></div>

                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 relative z-10">
                            <div>
                                <h2 className="text-sm font-bold flex items-center gap-2 mb-1 text-[var(--brand-primary)] uppercase tracking-widest">
                                    <Activity className="w-4 h-4" />
                                    Trust Score
                                </h2>
                                <p className="text-xs text-[var(--text-secondary)]">Reputation within the network.</p>
                            </div>

                            <div className="flex gap-12 items-end">
                                <div className="text-right">
                                    <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest mb-2">Trust Points</p>
                                    <p className="text-5xl font-black tabular-nums tracking-tighter text-white shadow-brand-glow">
                                        {stakeData.current_balance}
                                    </p>
                                </div>

                                <div className="flex gap-8 text-right pb-1">
                                    <div>
                                        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest mb-1">Penalties</p>
                                        <p className="text-xl font-bold text-red-500 flex items-center justify-end gap-1">
                                            -{stakeData.lifetime_burned} <Flame className="w-3 h-3 fill-current" />
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest mb-1">Rewards</p>
                                        <p className="text-xl font-bold text-green-500 flex items-center justify-end gap-1">
                                            +{stakeData.lifetime_earned} <TrendingUp className="w-3 h-3" />
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Active Protocols List */}
                <div className="col-span-2 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-[var(--brand-primary)]">
                            <ShieldAlert className="w-4 h-4" />
                            <h2 className="font-bold text-sm uppercase tracking-widest">Active Protocols</h2>
                        </div>
                        <div className="h-px flex-1 bg-[var(--brand-primary)] opacity-20 ml-4"></div>
                        <span className="text-xs text-[var(--text-secondary)] ml-2">{contracts.length} ACTIVE</span>
                    </div>

                    {contracts.length === 0 ? (
                        <div className="text-center py-16 border border-dashed border-gray-700 rounded-xl bg-black/20">
                            <p className="text-[var(--text-secondary)] mb-4">No active protocols detected.</p>
                            <button onClick={onCreateNew} className="text-[var(--brand-primary)] text-sm hover:underline uppercase tracking-wide">
                                &gt; Initialize New Protocol
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <AnimatePresence>
                                {contracts.map(contract => (
                                    <motion.div
                                        key={contract.id}
                                        layout
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="p-5 rounded-none border-l-2 border-l-[var(--brand-primary)] bg-gradient-to-r from-[rgba(0,240,255,0.05)] to-transparent border-y border-r border-white/5 hover:border-white/20 transition-all group relative"
                                    >
                                        {/* Corner Deco */}
                                        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/30 opactiy-0 group-hover:opacity-100 transition-opacity"></div>
                                        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/30 opactiy-0 group-hover:opacity-100 transition-opacity"></div>

                                        <div className="flex justify-between items-start">
                                            <div className="text-left w-full mr-4">
                                                <h3 className="font-bold text-lg text-white mb-1 tracking-tight">
                                                    {contract.goal_description || contract.goal || (contract.target_distance_km ? `Subject: Run ${contract.target_distance_km}km` : "Subject: General Goal")}
                                                </h3>

                                                <div className="flex gap-4 text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                                                    <span className="flex items-center gap-1">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${contract.status === 'Completed' ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`}></span>
                                                        {contract.status || 'ACTIVE'}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <ShieldAlert className={`w-3 h-3 ${contract.penalty?.type === 'stake_burn' ? 'text-red-500' : 'text-orange-500'}`} />
                                                        <span className={contract.penalty?.type === 'stake_burn' ? 'text-red-400' : 'text-orange-400'}>
                                                            {contract.penalty?.type === 'stake_burn' ? 'STAKE BURN' :
                                                                contract.penalty?.type === 'public_shame' ? 'PUBLIC SHAME' :
                                                                    contract.penalty?.type === 'donation' ? 'DONATION' : 'PENALTY'}
                                                        </span>
                                                        {(contract.penalty?.amount_usd || contract.penalty_amount) &&
                                                            <span className="text-white ml-1">
                                                                ${contract.penalty?.amount_usd || contract.penalty_amount}
                                                            </span>
                                                        }
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
                                                    className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-[var(--brand-primary)] text-black hover:bg-white hover:text-black transition-all clip-path-slant"
                                                    style={{ clipPath: 'polygon(10px 0, 100% 0, 100% 100%, 0 100%)' }}
                                                >
                                                    Start Verify
                                                </button>

                                                {/* Actions */}
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => startEdit(contract)} className="p-1.5 hover:text-[var(--brand-primary)] transition-colors">
                                                        <Edit2 className="w-3 h-3" />
                                                    </button>
                                                    <button onClick={() => handleDelete(contract.id)} className="p-1.5 hover:text-red-500 transition-colors">
                                                        <Trash2 className="w-3 h-3" />
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

                {/* System Logs Panel */}
                <div className="glass-panel p-6 flex flex-col border-t-2 border-t-[var(--brand-secondary)]">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity className="w-4 h-4 text-[var(--brand-secondary)]" />
                        <h2 className="font-bold text-sm uppercase tracking-widest text-[var(--brand-secondary)]">System Logs</h2>
                    </div>

                    <div className="space-y-2 flex-1 font-mono text-xs overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                        {contracts.map((c, i) => (
                            <div key={i} className="flex gap-2 text-[var(--text-secondary)] opacity-80 border-b border-white/5 pb-2">
                                <span className="text-[var(--brand-primary)]">[{new Date().getHours()}:0{i}]</span>
                                <span>Protocol {c.id.slice(0, 4)}... initialized.</span>
                            </div>
                        ))}
                        <div className="flex gap-2 text-[var(--text-secondary)] opacity-50">
                            <span className="text-gray-600">[SYS]</span>
                            <span>Daemon process active.</span>
                        </div>
                        <div className="flex gap-2 text-[var(--text-secondary)] opacity-50">
                            <span className="text-gray-600">[SYS]</span>
                            <span>Observability connected.</span>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between opacity-70 text-[10px] uppercase tracking-widest">
                            <span>Monitoring</span>
                            <div className="flex items-center gap-1 font-bold text-white">
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
                        {/* AGENT ACTIVITY VISUALIZER */}
                        {isVerifying ? (
                            <AgentStatusOverlay isOpen={isVerifying} />
                        ) : (
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                className="bg-[#030014] border border-[var(--brand-primary)] p-0 rounded-none w-full max-w-lg shadow-[0_0_50px_rgba(0,240,255,0.2)] relative overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="bg-[var(--brand-primary)] p-1"></div> {/* Top Bar */}

                                <div className="p-8 relative">
                                    <button onClick={closeVerification} className="absolute top-4 right-4 text-white/50 hover:text-white"><X className="w-6 h-6" /></button>

                                    {!agentResult ? (
                                        <>
                                            <h2 className="text-xl font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                                                <Search className="text-[var(--brand-primary)]" />
                                                Verification
                                            </h2>
                                            <p className="text-[var(--text-secondary)] text-sm mb-6 font-mono border-b border-white/10 pb-4">
                                                UPLOAD EVIDENCE FOR ANALYSIS //
                                            </p>

                                            <div className="space-y-4">
                                                <div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--brand-primary)]">Mission Report</label>
                                                        {uploading && <div className="text-[10px] text-[var(--brand-primary)] animate-pulse flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> UPLOADING...</div>}
                                                    </div>

                                                    {/* File Input */}
                                                    <div className="mb-4">
                                                        <label className={`flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/20 rounded-lg cursor-pointer hover:border-[var(--brand-primary)] hover:bg-white/10 transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                                            <input type="file" className="hidden" onChange={handleFileSelect} accept="image/*" />
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedFile ? 'bg-green-500/20 text-green-400' : 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]'}`}>
                                                                {selectedFile ? <CheckCircle className="w-4 h-4" /> : <Paperclip className="w-4 h-4" />}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-bold uppercase tracking-wider text-white">
                                                                    {selectedFile ? "Evidence Attached" : "Attach Visual Proof"}
                                                                </span>
                                                                <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                                                                    {selectedFile ? selectedFile.name : "SUPPORTS: JPG, PNG, WEBP"}
                                                                </span>
                                                            </div>
                                                        </label>
                                                    </div>

                                                    <textarea
                                                        className="w-full !bg-black/50 !border-white/20 p-4 h-24 resize-none font-mono text-sm focus:!border-[var(--brand-primary)] placeholder-white/20"
                                                        placeholder="Enter descriptive details (time, location, conditions)..." // Updated placeholder
                                                        value={evidenceText}
                                                        onChange={(e) => setEvidenceText(e.target.value)}
                                                    />
                                                </div>

                                                <button
                                                    onClick={handleVerify}
                                                    disabled={isVerifying || (!evidenceText && !selectedFile)}
                                                    className="btn-primary w-full py-4 flex items-center justify-center gap-2 text-lg hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    INITIATE SCAN
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2 font-mono">
                                            <div className="flex items-center justify-between pb-4 border-b border-white/10">
                                                <h2 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
                                                    <CheckCircle className="text-green-400" />
                                                    Analysis Complete
                                                </h2>
                                                <div className="flex items-center gap-1 text-[10px] px-2 py-1 bg-white/5 border border-white/10 uppercase">
                                                    ID: {agentResult.opik_trace_id ? agentResult.opik_trace_id.slice(-6) : 'LOCAL'}
                                                </div>
                                            </div>

                                            {/* 1. Verification Agent */}
                                            <div className="text-left space-y-2">
                                                <div className="flex items-center gap-2 text-xs font-bold text-[var(--brand-primary)] uppercase tracking-widest">
                                                    <Search className="w-3 h-3" /> Agent 01: Verify
                                                </div>
                                                <div className="p-4 bg-[var(--brand-primary)]/5 border-l-2 border-[var(--brand-primary)]">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="font-bold text-white">{agentResult.verification.status}</span>
                                                        <span className="text-[10px] text-[var(--brand-primary)]">
                                                            CONFIDENCE: {(agentResult.verification.confidence * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                    {agentResult.verification.failure_reason ? (
                                                        <p className="text-sm text-red-400">&gt;&gt; {agentResult.verification.failure_reason}</p>
                                                    ) : (
                                                        <p className="text-sm text-[var(--text-secondary)]">&gt;&gt; Evidence aligned with protocol.</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-left space-y-2">
                                                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest">
                                                    <ShieldAlert className="w-3 h-3" /> Agent 02: Audit
                                                </div>
                                                <div className="p-4 bg-amber-500/5 border-l-2 border-amber-500">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="font-bold text-white uppercase">{agentResult.audit.verdict}</span>
                                                    </div>
                                                    <p className="text-sm text-[var(--text-secondary)] mb-2">&gt;&gt; {agentResult.audit.reason}</p>
                                                </div>
                                            </div>

                                            {/* 3. Stake Update (Financial Impact) */}
                                            {agentResult.stake_update && (
                                                <div className="text-left space-y-2">
                                                    <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-widest">
                                                        <Wallet className="w-3 h-3" /> Agent 03: Financial Impact
                                                    </div>
                                                    <div className={`p-4 border-l-2 ${agentResult.stake_update.action === 'BURN' ? 'bg-red-500/10 border-red-500' : agentResult.stake_update.action === 'EARN' ? 'bg-green-500/10 border-green-500' : 'bg-gray-500/10 border-gray-500'}`}>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className={`font-bold uppercase ${agentResult.stake_update.action === 'BURN' ? 'text-red-400' : agentResult.stake_update.action === 'EARN' ? 'text-green-400' : 'text-gray-400'}`}>
                                                                {agentResult.stake_update.action || 'NO ACTION'}
                                                            </span>
                                                            <span className="font-mono font-bold text-white">
                                                                {agentResult.stake_update.amount > 0 ? `$${agentResult.stake_update.amount}` : '$0'}
                                                            </span>
                                                        </div>
                                                        {agentResult.stake_update.reason && (
                                                            <p className="text-sm text-[var(--text-secondary)]">&gt;&gt; {agentResult.stake_update.reason}</p>
                                                        )}
                                                        {agentResult.stake_update.error && (
                                                            <p className="text-sm text-red-500">&gt;&gt; ERROR: {agentResult.stake_update.error}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            <a
                                                href={agentResult.opik_trace_id ? `https://comet.com/opik/traces/${agentResult.opik_trace_id}` : "https://comet.com/opik"}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block w-full py-3 text-center border border-white/20 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-all uppercase tracking-widest text-xs mt-6"
                                            >
                                                Access Flight Data Recorder [OPIK]
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <AnimatePresence>
                {isEditModalOpen && selectedContract && (
                    <EditContractModal
                        contract={selectedContract}
                        isOpen={isEditModalOpen}
                        onClose={() => setIsEditModalOpen(false)}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
};
