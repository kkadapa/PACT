import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, LogOut, User } from 'lucide-react';
import { motion } from 'framer-motion';

export const LoginButton = () => {
    const { user, signInWithGoogle, logout } = useAuth();

    return (
        <div className="absolute top-6 right-6 z-50">
            {user ? (
                <div className="flex items-center gap-3">
                    <div className="hidden md:block text-right">
                        <p className="text-xs text-[var(--text-secondary)]">Signed in as</p>
                        <p className="text-sm font-semibold">{user.displayName}</p>
                    </div>
                    <button
                        onClick={logout}
                        className="p-2 rounded-full glass-panel hover:bg-white/10 transition-colors group"
                        title="Sign Out"
                    >
                        <LogOut className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-red-400 transition-colors" />
                    </button>
                    {user.photoURL && (
                        <img
                            src={user.photoURL}
                            alt="Profile"
                            className="w-10 h-10 rounded-full border-2 border-[var(--glass-border)]"
                        />
                    )}
                </div>
            ) : (
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={signInWithGoogle}
                    className="flex items-center gap-2 px-4 py-2 rounded-full glass-panel hover:bg-white/20 transition-all shadow-lg"
                >
                    <div className="p-1 bg-white rounded-full">
                        <img
                            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                            alt="G"
                            className="w-4 h-4"
                        />
                    </div>
                    <span className="font-medium text-sm">Sign In</span>
                </motion.button>
            )}
        </div>
    );
};
