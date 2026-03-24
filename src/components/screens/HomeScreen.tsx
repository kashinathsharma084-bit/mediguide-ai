import React from 'react';
import { motion } from 'motion/react';
import { 
  ChevronRight, Stethoscope, HeartPulse, ShieldAlert, History, Star, ArrowRight,
  Clock, CheckCircle2, Info, Activity
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Reminder, SymptomHistoryItem } from '../../types';

interface HomeScreenProps {
  onNavigate: (tab: string) => void;
  reminders: Reminder[];
  history: SymptomHistoryItem[];
  t: (s: string) => string;
}

export default function HomeScreen({ onNavigate, reminders, history, t }: HomeScreenProps) {
  const activeReminders = reminders.filter(r => r.active);
  const recentHistory = history.slice(0, 3);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-8"
    >
      {/* Welcome Section */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-800">{t("Good Morning!")}</h2>
        <p className="text-sm text-slate-500 font-medium">{t("How are you feeling today?")}</p>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => onNavigate('check')}
          className="bg-primary p-6 rounded-[32px] text-white space-y-4 shadow-xl shadow-primary/20 active:scale-95 transition-all text-left group"
        >
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Stethoscope size={24} />
          </div>
          <div>
            <h3 className="font-bold text-sm leading-tight">{t("Symptom Checker")}</h3>
            <p className="text-[10px] text-white/70 mt-1 font-medium">{t("AI-powered analysis")}</p>
          </div>
        </button>
        <button 
          onClick={() => onNavigate('search')}
          className="bg-white p-6 rounded-[32px] border border-slate-100 space-y-4 shadow-sm active:scale-95 transition-all text-left group"
        >
          <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <HeartPulse size={24} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-800 leading-tight">{t("Medicine Search")}</h3>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">{t("Find info instantly")}</p>
          </div>
        </button>
      </div>

      {/* Active Reminders Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Clock size={18} className="text-primary" />
            {t("Upcoming Meds")}
          </h3>
          <button onClick={() => onNavigate('reminders')} className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
            {t("View All")} <ChevronRight size={12} />
          </button>
        </div>
        
        {activeReminders.length > 0 ? (
          <div className="space-y-3">
            {activeReminders.slice(0, 2).map(r => (
              <div key={r.id} className="bg-white p-4 rounded-3xl border border-slate-100 flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                  <Clock size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-xs text-slate-800">{r.medicines[0].name}</h4>
                  <p className="text-[10px] text-slate-400 font-medium">{r.time} • {r.medicines[0].dosage}</p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300">
                  <CheckCircle2 size={16} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 p-6 rounded-3xl border border-dashed border-slate-200 text-center">
            <p className="text-xs text-slate-400 font-medium">{t("No active reminders for today.")}</p>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <History size={18} className="text-primary" />
            {t("Recent History")}
          </h3>
          <button onClick={() => onNavigate('check')} className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
            {t("See History")} <ChevronRight size={12} />
          </button>
        </div>
        
        {recentHistory.length > 0 ? (
          <div className="space-y-3">
            {recentHistory.map(item => (
              <div key={item.id} className="bg-white p-4 rounded-3xl border border-slate-100 flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <Activity size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-xs text-slate-800 line-clamp-1 italic">"{item.symptoms}"</h4>
                  <p className="text-[10px] text-slate-400 font-medium">{new Date(item.timestamp).toLocaleDateString()}</p>
                </div>
                <ArrowRight size={14} className="text-slate-300" />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 p-6 rounded-3xl border border-dashed border-slate-200 text-center">
            <p className="text-xs text-slate-400 font-medium">{t("Your health checks will appear here.")}</p>
          </div>
        )}
      </div>

      {/* Health Tips Section */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-[40px] text-white space-y-4 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -ml-12 -mb-12" />
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
            <ShieldAlert size={20} className="text-primary" />
          </div>
          <h3 className="font-bold text-sm">{t("Health Tip of the Day")}</h3>
        </div>
        <p className="text-xs text-white/70 leading-relaxed font-medium">
          {t("Staying hydrated is key to maintaining energy levels and cognitive function. Aim for at least 8 glasses of water today!")}
        </p>
        <button className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-2 pt-2">
          {t("Learn More")} <ArrowRight size={12} />
        </button>
      </div>
    </motion.div>
  );
}
