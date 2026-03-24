import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Calendar, Clock, User as UserIcon, Plus, History, 
  ChevronRight, CheckCircle2, AlertCircle, Loader2, X
} from 'lucide-react';
import { db, collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc, doc } from '../../firebase';
import { User } from 'firebase/auth';
import { Appointment } from '../../types';
import { cn } from '../../lib/utils';

interface AppointmentScreenProps {
  user: User;
  t: (s: string) => string;
}

export default function AppointmentScreen({ user, t }: AppointmentScreenProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAppointment, setNewAppointment] = useState<Partial<Appointment>>({
    doctorName: '',
    specialty: '',
    date: '',
    time: '',
    reason: '',
    status: 'pending'
  });

  useEffect(() => {
    const q = query(
      collection(db, 'appointments'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      setAppointments(docs);
      setIsLoading(false);
    });

    return () => unsub();
  }, [user.uid]);

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'appointments'), {
        ...newAppointment,
        userId: user.uid,
        createdAt: Date.now()
      });
      setShowAddModal(false);
      setNewAppointment({
        doctorName: '',
        specialty: '',
        date: '',
        time: '',
        reason: '',
        status: 'pending'
      });
    } catch (error) {
      console.error("Book appointment error:", error);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'appointments', id));
    } catch (error) {
      console.error("Delete appointment error:", error);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{t("Appointments")}</h2>
          <p className="text-xs text-slate-400 font-medium mt-1">{t("Manage your medical visits")}</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 active:scale-90 transition-all"
        >
          <Plus size={24} />
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 flex items-center justify-center text-slate-300">
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : appointments.length === 0 ? (
        <div className="py-20 text-center space-y-6">
          <div className="w-24 h-24 bg-slate-100 rounded-[40px] flex items-center justify-center mx-auto text-slate-300">
            <Calendar size={48} />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-slate-800">{t("No Appointments Yet")}</h3>
            <p className="text-sm text-slate-400 max-w-[200px] mx-auto leading-relaxed">
              {t("Book your first appointment with a healthcare professional.")}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appt) => (
            <div key={appt.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4 relative group">
              <button 
                onClick={() => handleDeleteAppointment(appt.id)}
                className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
              >
                <X size={16} />
              </button>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-primary shrink-0">
                  <UserIcon size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800">{appt.doctorName}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{appt.specialty}</p>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                  appt.status === 'confirmed' ? "bg-emerald-50 text-emerald-600" : 
                  appt.status === 'cancelled' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                )}>
                  {t(appt.status)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex items-center gap-3 text-slate-500">
                  <Calendar size={16} className="text-slate-400" />
                  <span className="text-xs font-medium">{appt.date}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500">
                  <Clock size={16} className="text-slate-400" />
                  <span className="text-xs font-medium">{appt.time}</span>
                </div>
              </div>

              {appt.reason && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-xs text-slate-500 leading-relaxed italic">
                    "{appt.reason}"
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Book Appointment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden"
          >
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800">{t("Book Appointment")}</h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>

              <form onSubmit={handleBookAppointment} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t("Doctor Name")}</label>
                  <input 
                    type="text"
                    required
                    placeholder={t("e.g. Dr. Sharma")}
                    onChange={(e) => setNewAppointment({...newAppointment, doctorName: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t("Specialty")}</label>
                  <input 
                    type="text"
                    required
                    placeholder={t("e.g. Cardiologist")}
                    onChange={(e) => setNewAppointment({...newAppointment, specialty: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t("Date")}</label>
                    <input 
                      type="date"
                      required
                      onChange={(e) => setNewAppointment({...newAppointment, date: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t("Time")}</label>
                    <input 
                      type="time"
                      required
                      onChange={(e) => setNewAppointment({...newAppointment, time: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t("Reason for Visit")}</label>
                  <textarea 
                    placeholder={t("Describe your concern...")}
                    onChange={(e) => setNewAppointment({...newAppointment, reason: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 h-24 resize-none"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all mt-4"
                >
                  {t("Confirm Booking")}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
