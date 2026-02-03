import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from './AuthContext';

interface StakeData {
    current_balance: number;
    lifetime_earned: number;
    lifetime_burned: number;
}

interface StakeContextType {
    stakeData: StakeData;
    loading: boolean;
}

const StakeContext = createContext<StakeContextType | undefined>(undefined);

export const StakeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [stakeData, setStakeData] = useState<StakeData>({ current_balance: 100, lifetime_earned: 0, lifetime_burned: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setStakeData({ current_balance: 100, lifetime_earned: 0, lifetime_burned: 0 });
            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(doc(db, 'stake_ledgers', user.uid), (doc) => {
            if (doc.exists()) {
                setStakeData(doc.data() as StakeData);
            } else {
                setStakeData({ current_balance: 100, lifetime_earned: 0, lifetime_burned: 0 });
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    return (
        <StakeContext.Provider value={{ stakeData, loading }}>
            {children}
        </StakeContext.Provider>
    );
};

export const useStake = () => {
    const context = useContext(StakeContext);
    if (context === undefined) {
        throw new Error('useStake must be used within a StakeProvider');
    }
    return context;
};
