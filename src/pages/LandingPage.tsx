import React from 'react';
import { Stethoscope, Activity, ShieldAlert, HeartPulse } from 'lucide-react';

interface LandingPageProps {
  onLogin: () => Promise<void>;
  t: (s: string) => string;
}

export default function LandingPage({ onLogin, t }: LandingPageProps) {
  const handleGetStarted = async () => {
    await onLogin();
  };

  return (
    <div className="flex flex-col h-screen bg-white max-w-md mx-auto overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-12">
        <div className="w-24 h-24 bg-primary/10 rounded-[40px] flex items-center justify-center text-primary animate-bounce">
          <Stethoscope size={48} />
        </div>
        
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-slate-800 tracking-tight">MediGuide AI</h1>
          <p className="text-slate-500 text-lg leading-relaxed max-w-[280px] mx-auto">
            {t("Your personal AI health companion for instant medical insights.")}
          </p>
        </div>

        <div className="w-full space-y-4">
          <button 
            onClick={handleGetStarted}
            className="w-full bg-primary text-white py-5 rounded-3xl font-bold text-lg shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
            <Activity size={24} />
            {t("Get Started")}
          </button>
          
          <p className="text-[10px] text-center text-slate-400 px-8 leading-relaxed">
            By continuing, you agree to our Terms of Service and Privacy Policy. 
            MediGuide AI is for educational purposes only.
          </p>
        </div>
      </div>

      <div className="p-8 bg-slate-50 border-t border-slate-100">
        <div className="flex justify-center gap-8 opacity-40 grayscale">
          <ShieldAlert size={24} />
          <HeartPulse size={24} />
          <Activity size={24} />
        </div>
      </div>
    </div>
  );
}
