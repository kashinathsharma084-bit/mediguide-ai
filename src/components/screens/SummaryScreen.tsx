import React from 'react';
import { motion } from 'motion/react';
import { 
  Bell, CheckCircle2, Activity, Clock, Stethoscope, Info
} from 'lucide-react';
import { Reminder, SymptomHistoryItem } from '../../types';

interface SummaryScreenProps {
  reminders: Reminder[];
  history: SymptomHistoryItem[];
  t: (s: string) => string;
}

export default function SummaryScreen({ reminders, history, t }: SummaryScreenProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const activeRemindersToday = reminders.filter(r => 
    r.active && 
    (r.days.includes('Daily') || (r.dates && r.dates.includes(todayStr)))
  );
  const today = new Date().setHours(0, 0, 0, 0);
  const todayHistory = history.filter(item => new Date(item.timestamp).setHours(0, 0, 0, 0) === today);
  
  const formattedDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-6 space-y-8"
    >
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-800">{t("Daily Summary")}</h2>
        <p className="text-sm text-slate-500 font-medium">{formattedDate}</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 mb-3">
            <Bell size={20} />
          </div>
          <div className="text-2xl font-bold text-slate-800">{activeRemindersToday.length}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("Meds")}</div>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center text-pink-500 mb-3">
            <CheckCircle2 size={20} />
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {activeRemindersToday.filter(r => r.takenDates?.some(d => new Date(d).toDateString() === new Date().toDateString())).length}
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("Taken")}</div>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 mb-3">
            <Activity size={20} />
          </div>
          <div className="text-2xl font-bold text-slate-800">{todayHistory.length}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("Checks")}</div>
        </div>
      </div>

      {/* Medication Schedule */}
      <div className="space-y-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Clock size={18} className="text-primary" />
          {t("Medication Schedule")}
        </h3>
        {activeRemindersToday.length > 0 ? (
          <div className="space-y-3">
            {activeRemindersToday.map(r => (
              <div key={r.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <Clock size={18} />
                </div>
                <div className="flex-1">
                  <div className="space-y-1">
                    {r.medicines.map((m, idx) => (
                      <h4 key={idx} className="font-bold text-sm">{m.name} <span className="text-xs font-normal text-slate-500">({m.dosage})</span></h4>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    <span className="font-bold">{r.time}</span>
                    {r.dates && r.dates.length > 0 && (
                      <span className="ml-2">• {r.dates.join(', ')}</span>
                    )}
                    {(!r.dates || r.dates.length === 0) && r.days && r.days.length > 0 && (
                      <span className="ml-2">• {r.days.join(', ')}</span>
                    )}
                  </p>
                </div>
                <CheckCircle2 size={20} className="text-slate-200" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-sm italic px-2">{t("No medications scheduled for today.")}</p>
        )}
      </div>

      {/* Today's Check-ins */}
      <div className="space-y-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Stethoscope size={18} className="text-primary" />
          {t("Today's Check-ins")}
        </h3>
        {todayHistory.length > 0 ? (
          <div className="space-y-3">
            {todayHistory.map(item => (
              <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-sm text-slate-800 line-clamp-1 italic">"{item.symptoms}"</h4>
                  <span className="text-[10px] font-bold text-slate-400">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {item.analysis.possibleConditions.map((c: any, i: number) => (
                    <span key={i} className="bg-primary/5 text-primary px-2 py-0.5 rounded-md text-[10px] font-medium">
                      {c.condition}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-sm italic px-2">{t("No health checks performed today.")}</p>
        )}
      </div>

      {/* Daily Health Tip */}
      <div className="bg-primary/5 border border-primary/10 p-5 rounded-3xl space-y-2">
        <h4 className="font-bold text-primary text-sm flex items-center gap-2">
          <Info size={16} />
          {t("Health Tip of the Day")}
        </h4>
        <p className="text-xs text-slate-600 leading-relaxed">
          {t("Staying hydrated is key to maintaining energy levels and cognitive function. Aim for at least 8 glasses of water today!")}
        </p>
      </div>
    </motion.div>
  );
}
