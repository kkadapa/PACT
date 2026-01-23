import { useState, useEffect } from 'react';
import axios from 'axios';
import { GoalInput } from './components/GoalInput';
import { DateInput } from './components/DateInput';
import { PenaltySelector } from './components/PenaltySelector';
import { ContractCard } from './components/ContractCard';
import { AboutModal } from './components/AboutModal'; // Restored import
import { LoginButton } from './components/LoginButton';
import { Dashboard } from './components/Dashboard';
import { LayoutDashboard } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { StakeProvider, useStake } from './contexts/StakeContext';
import { Wallet, Info } from 'lucide-react';
import './index.css';

interface PenaltyData {
  type: 'donation' | 'public_shame' | 'stake_burn';
  amount: number;
}

function AppContent() {
  const { user, signInWithGoogle } = useAuth();
  const { stakeData } = useStake();
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState('');
  const [date, setDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contract, setContract] = useState<any>(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false); // Restored state

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  useEffect(() => {
    // Warm up backend
    axios.get(API_URL).catch(err => console.log('Waking up backend...', err));
  }, []);

  const handleGoalSubmit = (text: string) => {
    setGoal(text);
    setStep(2);
  };

  const handleDateSelect = (selectedDate: string) => {
    setDate(selectedDate);
    setStep(3);
  };

  const handlePenaltySelect = async (penalty: PenaltyData) => {
    setIsLoading(true);
    try {
      const prompt = `Goal: ${goal}. Deadline: ${date}. Penalty preference: ${penalty.type} ${penalty.amount > 0 ? `$${penalty.amount}` : ''}`;

      const res = await axios.post(`${API_URL}/negotiate`, { goal_text: prompt });
      setContract(res.data);
      setStep(4);
    } catch (err) {
      console.error(err);
      alert('Failed to negotiate contract. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!user) {
      alert("Please sign in to commit to this pact!");
      signInWithGoogle();
      return;
    }

    setIsLoading(true);
    try {
      const token = await user.getIdToken();
      await axios.post(`${API_URL}/commit`, contract, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setStep(5);
      setGoal('');
      setDate('');
      setContract(null);
    } catch (err) {
      console.error(err);
      alert('Failed to commit to pact.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetFlow = () => {
    setGoal('');
    setDate('');
    setStep(1);
  };



  // Original Single Column Layout
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative z-10 overflow-hidden">

      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-[var(--brand-primary)] rounded-full mix-blend-screen filter blur-[120px] opacity-20 pointer-events-none"></div>

      {/* Header: Logo & Auth */}
      <div className="absolute top-8 left-8 font-black text-3xl tracking-tighter opacity-80 z-20">
        PACT<span className="text-[var(--brand-primary)]">⁰</span>
      </div>

      <div className="absolute top-6 right-6 flex items-center gap-4 z-50">

        {/* Stake Balance Display */}
        <div className="group relative flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-md cursor-help">
          <Wallet className="w-4 h-4 text-[var(--brand-primary)]" />
          <span className="font-mono font-bold text-sm">${stakeData.current_balance}</span>

          {/* Tooltip */}
          <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-black/90 border border-white/10 rounded-xl text-xs text-[var(--text-secondary)] shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-[var(--brand-primary)] shrink-0 mt-0.5" />
              <p>This is your commitment stake. Make sure to hit your goals, otherwise you risk losing this balance!</p>
            </div>
          </div>
        </div>

        {user && (
          <button
            onClick={() => setStep(5)}
            className="hidden md:flex items-center gap-2 py-2 px-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm font-medium"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
        )}
        <LoginButton />
      </div>

      {/* Main Content */}
      <div className={`w-full relative z-20 transition-all duration-500 ${step === 1 ? 'max-w-full' : step === 5 ? 'max-w-5xl' : 'max-w-[440px]'}`}>
        {/* Step Indicator (Visible after Step 1) */}
        {step > 1 && step < 5 && (
          <div className="flex items-center justify-between mb-8 px-4">
            {[
              { num: 1, label: 'Goal' },
              { num: 2, label: 'Timeline' },
              { num: 3, label: 'Stakes' },
              { num: 4, label: 'Pact' }
            ].map((s) => (
              <div key={s.num} className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${step >= s.num
                    ? 'bg-[var(--brand-primary)] text-white shadow-lg shadow-blue-500/30'
                    : 'bg-white/20 text-[var(--text-secondary)]'
                    }`}
                >
                  {step > s.num ? '✓' : s.num}
                </div>
                <span className={`text-[10px] uppercase font-bold tracking-wider ${step >= s.num ? 'text-[var(--brand-primary)]' : 'text-[var(--text-secondary)]'
                  }`}>
                  {s.label}
                </span>
              </div>
            ))}

            {/* Connecting Line (Background) */}
            <div className="absolute top-[1.2rem] left-8 right-8 h-[2px] bg-white/10 -z-10" />
          </div>
        )}

        {step === 1 && <GoalInput onSubmit={handleGoalSubmit} isLoading={false} />}
        {step === 2 && <DateInput onDateSelect={handleDateSelect} onBack={() => setStep(1)} />}
        {step === 3 && <PenaltySelector onSelect={handlePenaltySelect} onBack={() => setStep(2)} />}
        {step === 4 && contract && <ContractCard contract={contract} onConfirm={handleConfirm} onBack={() => setStep(3)} />}

        {/* Dashboard integrated seamlessly */}
        {step === 5 && (
          <div className="animate-fade-in">
            <Dashboard onCreateNew={resetFlow} />
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="glow-text text-xl">Negotiating with Agents...</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="absolute bottom-6 right-8 z-20">
        <div className="flex flex-col items-end gap-2 text-sm font-medium text-[var(--text-secondary)] opacity-60">
          <button
            onClick={() => setIsAboutOpen(true)}
            className="hover:text-[var(--brand-primary)] hover:underline underline-offset-4 transition-all"
          >
            How it works
          </button>
          <a
            href="https://github.com/kkadapa"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--brand-primary)] transition-all"
          >
            Made with ☕ by @kkadapa
          </a>
        </div>
      </div>

      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StakeProvider>
        <AppContent />
      </StakeProvider>
    </AuthProvider>
  );
}
