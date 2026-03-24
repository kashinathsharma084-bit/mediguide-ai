import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Trash2, Clock, CheckCircle2, X, Bell
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Reminder, MedicineEntry } from '../../types';

interface RemindersScreenProps {
  reminders: Reminder[];
  onAdd: (r: Omit<Reminder, 'id' | 'active'>) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onMarkAsTaken: (id: string) => void;
  t: (s: string) => string;
}

export default function RemindersScreen({ reminders, onAdd, onDelete, onToggle, onMarkAsTaken, t }: RemindersScreenProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [medicines, setMedicines] = useState<MedicineEntry[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [newName, setNewName] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newTime, setNewTime] = useState('08:00');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);

  const addMedicineToList = () => {
    if (!newName || !newDosage) return;
    setMedicines([...medicines, { name: newName, dosage: newDosage }]);
    setNewName('');
    setNewDosage('');
  };

  const removeMedicineFromList = (index: number) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const addDateToList = () => {
    if (!newDate || dates.includes(newDate)) return;
    setDates([...dates, newDate].sort());
  };

  const removeDateFromList = (index: number) => {
    setDates(dates.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (medicines.length === 0) return;
    onAdd({ 
      medicines, 
      time: newTime, 
      dates: dates.length > 0 ? dates : [], 
      days: dates.length > 0 ? [] : ['Daily'] 
    });
    setMedicines([]);
    setDates([]);
    setIsAdding(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-6 space-y-6"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">{t("Medication Alerts")}</h2>
        <button 
          onClick={() => setIsAdding(true)}
          className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="space-y-4">
        {reminders.length > 0 ? (
          reminders.map(r => (
            <div 
              key={r.id} 
              className={cn(
                "bg-white p-5 rounded-3xl border transition-all flex items-center gap-4",
                r.active ? "border-slate-100 shadow-sm" : "border-slate-100 opacity-60"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                r.active ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"
              )}>
                <Clock size={24} />
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
                {r.takenDates?.some(d => new Date(d).toDateString() === new Date().toDateString()) && (
                  <span className="text-[10px] font-bold text-pink-500 mt-1 flex items-center gap-1">
                    <CheckCircle2 size={10} /> {t("Taken today")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {r.active && !r.takenDates?.some(d => new Date(d).toDateString() === new Date().toDateString()) && (
                  <button 
                    onClick={() => onMarkAsTaken(r.id)}
                    className="p-2 text-primary hover:bg-primary/5 rounded-lg transition-colors"
                    title="Mark as taken"
                  >
                    <CheckCircle2 size={20} />
                  </button>
                )}
                <button 
                  onClick={() => onToggle(r.id)}
                  className={cn(
                    "w-12 h-6 rounded-full relative transition-colors duration-300",
                    r.active ? "bg-primary" : "bg-slate-300"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300",
                    r.active ? "left-7" : "left-1"
                  )} />
                </button>
                <button 
                  onClick={() => onDelete(r.id)}
                  className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
              <Bell size={40} />
            </div>
            <p className="text-slate-400 text-sm">{t("No reminders set yet.")}<br/>{t("Add one to stay on track!")}</p>
          </div>
        )}
      </div>

      {/* Add Reminder Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-md rounded-t-[40px] p-8 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">{t("New Reminder")}</h3>
                <button onClick={() => setIsAdding(false)} className="p-2 text-slate-400"><X size={24} /></button>
              </div>
              
              <div className="space-y-6">
                {/* Medicines Section */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("Medicines")}</label>
                  <div className="space-y-2">
                    {medicines.map((m, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-xs font-bold">{m.name} <span className="font-normal text-slate-500">({m.dosage})</span></span>
                        <button onClick={() => removeMedicineFromList(i)} className="text-rose-500"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="text" 
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder={t("Medicine Name")}
                      className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <input 
                      type="text" 
                      value={newDosage}
                      onChange={(e) => setNewDosage(e.target.value)}
                      placeholder={t("Dosage")}
                      className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <button 
                    onClick={addMedicineToList}
                    className="w-full py-2 border-2 border-dashed border-primary/30 text-primary rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <Plus size={14} /> {t("Add Medicine")}
                  </button>
                </div>

                {/* Time Section */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("Time")}</label>
                  <input 
                    type="time" 
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>

                {/* Dates Section */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("Dates")}</label>
                  <div className="flex flex-wrap gap-2">
                    {dates.map((d, i) => (
                      <div key={i} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-2">
                        {d}
                        <button onClick={() => removeDateFromList(i)}><X size={10} /></button>
                      </div>
                    ))}
                    {dates.length === 0 && <span className="text-[10px] text-slate-400 italic">{t("Daily Schedule")}</span>}
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="date" 
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button 
                      onClick={addDateToList}
                      className="bg-primary text-white px-4 rounded-xl text-xs font-bold"
                    >
                      {t("Add Date")}
                    </button>
                  </div>
                </div>

                <button 
                  onClick={handleSubmit}
                  disabled={medicines.length === 0}
                  className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-xl shadow-primary/20 mt-4 disabled:opacity-50"
                >
                  {t("Add Reminder")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
