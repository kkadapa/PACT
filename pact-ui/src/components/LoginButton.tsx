
import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

export const LoginButton = () => {
    const { user, signInWithGoogle, logout } = useAuth();

    return (
        <div className="z-50">
            {user ? (
                <div className="flex items-center gap-4">
                    {/* Dashboard button moved here or kept outside? keeping outside for now but aligning style */}

                    <div className="hidden md:flex items-center gap-3 bg-white/5 pr-2 pl-4 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
                        <span className="text-sm font-semibold">{user.displayName}</span>
                        {user.photoURL ? (
                            <img
                                src={user.photoURL}
                                alt="Profile"
                                className="w-8 h-8 rounded-full border border-[var(--glass-border)]"
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)] flex items-center justify-center text-white font-bold">
                                {user.displayName?.charAt(0)}
                            </div>
                        )}
                        <button
                            onClick={logout}
                            className="p-1.5 rounded-full hover:bg-white/10 text-[var(--text-secondary)] hover:text-red-400 transition-colors ml-1"
                            title="Sign Out"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
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
