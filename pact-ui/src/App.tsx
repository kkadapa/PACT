import { useState, useEffect } from 'react';
import axios from 'axios';
import { GoalInput } from './components/GoalInput';
import { DateInput } from './components/DateInput';
import { PenaltySelector } from './components/PenaltySelector';
import { ContractCard } from './components/ContractCard';
import { AboutModal } from './components/AboutModal';
import { LoginButton } from './components/LoginButton';
import { Dashboard } from './components/Dashboard';
import { Info, LayoutDashboard } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './index.css';

interface PenaltyData {
  type: 'donation' | 'public_shame' | 'stake_burn';
  amount: number;
}

function AppContent() {
  const { user, signInWithGoogle } = useAuth();

  // Steps: 1=Goal, 2=Date, 3=Penalty, 4=Contract, 5=Dashboard
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState('');
  const [date, setDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contract, setContract] = useState<any>(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Constants
  const API_URL = 'http://127.0.0.1:8000';

  // Effect to toggle initial view based on auth
  useEffect(() => {
    if (user && step === 1) {
      // Optional: Auto-redirect logic could go here
    }
  }, [user]);

  const handleGoalSubmit = (text: string) => {
    setGoal(text);
    setStep(2); // Go to Date
  };

  const handleDateSelect = (selectedDate: string) => {
    setDate(selectedDate);
    setStep(3); // Go to Penalty
  };

  const handlePenaltySelect = async (penalty: PenaltyData) => {
    setIsLoading(true);
    try {
      // Combine all inputs for the prompt
      const prompt = `Goal: ${goal}. Deadline: ${date}. Penalty preference: ${penalty.type} ${penalty.amount > 0 ? `$${penalty.amount}` : ''}`;

      const res = await axios.post(`${API_URL}/negotiate`, { goal_text: prompt });
      setContract(res.data);
      setStep(4); // Go to Contract
    } catch (err) {
      console.error(err);
      alert('Failed to negotiate contract. Ensure backend is running.');
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
      await axios.post(
        `${API_URL}/commit`,
        contract,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Redirect to Dashboard
      setStep(5);
      setGoal('');
      setDate('');
      setContract(null);
    } catch (err) {
      console.error(err);
      alert('Failed to commit pact. details in console.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetFlow = () => {
    setGoal('');
    setDate('');
    setStep(1);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative z-10 ">
      {step !== 5 && (
        <div className="absolute top-8 left-8 font-black text-3xl tracking-tighter cursor-default select-none opacity-80 hover:opacity-100 transition-opacity">
          PACT<span className="text-[var(--brand-primary)]">⁰</span>
        </div>
      )}

      {/* Show Auth/Dashboard Controls if not on Dashboard */}
      {step !== 5 && <LoginButton />}

      {/* Dashboard Button for easier access if logged in and not on dashboard */}
      {user && step !== 5 && (
        <button
          onClick={() => setStep(5)}
          className="absolute top-24 right-6 btn-secondary flex items-center gap-2 py-2 px-4 shadow-md bg-white/10 hover:bg-white/20 backdrop-blur-md border border-[var(--glass-border)]"
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="font-semibold">View Dashboard</span>
        </button>
      )}

      {step === 1 && <GoalInput onSubmit={handleGoalSubmit} isLoading={false} />}

      {step === 2 && (
        <DateInput
          onDateSelect={handleDateSelect}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <PenaltySelector
          onSelect={handlePenaltySelect}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 && contract && (
        <ContractCard
          contract={contract}
          onConfirm={handleConfirm}
        />
      )}

      {step === 5 && (
        <Dashboard onCreateNew={resetFlow} />
      )}

      {isLoading && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="glow-text text-xl">Negotiating with Agents...</p>
          </div>
        </div>
      )}

      {/* About / Info Trigger */}
      <button
        onClick={() => setIsAboutOpen(true)}
        className="fixed bottom-6 right-6 p-3 rounded-full bg-white/20 glass-panel hover:bg-white/40 transition-all hover:scale-110 shadow-lg text-[var(--text-primary)]"
      >
        <Info className="w-6 h-6" />
      </button>

      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
