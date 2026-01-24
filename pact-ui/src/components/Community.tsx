import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { TrustScore } from './TrustScore';
import { Trophy, Activity, Users } from 'lucide-react';

interface FeedItem {
    type: string;
    user_name: string;
    user_photo?: string;
    goal_description: string;
    status: string;
    timestamp: string;
    evidence_summary: string;
    trust_score_delta: number;
}

interface LeaderboardUser {
    user_id: string;
    display_name: string;
    photo_url?: string;
    trust_score: number;
    contracts_completed: number;
}

export const Community: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'feed' | 'leaderboard'>('feed');
    const [feed, setFeed] = useState<FeedItem[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // 10s poll
        return () => clearInterval(interval);
    }, [activeTab]);

    const fetchData = async () => {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        try {
            if (activeTab === 'feed') {
                const res = await axios.get(`${API_URL}/feed`);
                setFeed(res.data);
            } else {
                const res = await axios.get(`${API_URL}/leaderboard`);
                setLeaderboard(res.data);
            }
        } catch (e) {
            console.error("Failed to fetch community data", e);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto p-4 space-y-6 font-mono text-white">
            {/* Tabs */}
            <div className="flex space-x-4 border-b border-white/10 pb-2">
                <button
                    onClick={() => setActiveTab('feed')}
                    className={`px-4 py-2 flex items-center gap-2 ${activeTab === 'feed' ? 'border-b-2 border-pink-500 text-pink-500' : 'text-gray-400'}`}
                >
                    <Activity size={18} /> The Buzz
                </button>
                <button
                    onClick={() => setActiveTab('leaderboard')}
                    className={`px-4 py-2 flex items-center gap-2 ${activeTab === 'leaderboard' ? 'border-b-2 border-yellow-500 text-yellow-500' : 'text-gray-400'}`}
                >
                    <Trophy size={18} /> Leaderboard
                </button>
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
                <AnimatePresence mode='wait'>
                    {activeTab === 'feed' ? (
                        <motion.div
                            key="feed"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                        >
                            {feed.length === 0 && <div className="text-center text-gray-500 mt-10">No recent activity on the Nexus.</div>}
                            {feed.map((item, idx) => (
                                <div key={idx} className="bg-black/40 border border-white/10 p-4 rounded-lg flex gap-4 backdrop-blur-sm">
                                    {item.user_photo ? (
                                        <img src={item.user_photo} className="w-10 h-10 rounded-full border border-pink-500/30" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                                            <Users size={16} />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-pink-400">{item.user_name}</h4>
                                            <span className={`text-xs px-2 py-1 rounded ${item.status === 'SUCCESS' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {item.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-300 mt-1">{item.goal_description}</p>
                                        <p className="text-xs text-gray-500 mt-2 font-italic">"{item.evidence_summary}"</p>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="leaderboard"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-2"
                        >
                            {leaderboard.map((user, idx) => (
                                <div key={user.user_id} className="flex items-center justify-between bg-black/40 border border-white/10 p-3 rounded-lg hover:border-yellow-500/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <span className="text-xl font-bold text-gray-500 w-6">#{idx + 1}</span>
                                        {user.photo_url ? (
                                            <img src={user.photo_url} className="w-8 h-8 rounded-full" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-gray-800" />
                                        )}
                                        <div>
                                            <div className="font-medium text-white">{user.display_name}</div>
                                            <div className="text-xs text-gray-400">{user.contracts_completed} Agreements Fulfilled</div>
                                        </div>
                                    </div>
                                    <TrustScore score={user.trust_score} size="sm" />
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
