import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Stethoscope, Calendar, Clock, User as UserIcon, 
  CheckCircle2, XCircle, Loader2, Phone, MapPin,
  ChevronRight, Save, Edit3, MessageSquare
} from 'lucide-react';
import { db, collection, query, where, orderBy, onSnapshot, doc, updateDoc, getDoc } from '../../firebase';
import { User } from 'firebase/auth';
import { Appointment, Doctor } from '../../types';
import { cn } from '../../lib/utils';
import DoctorPanel from '../DoctorPanel';

interface DoctorDashboardProps {
  user: User;
  t: (s: string) => string;
}

export default function DoctorDashboard({ user, t }: DoctorDashboardProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctorProfile, setDoctorProfile] = useState<Doctor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditProfile, setShowEditProfile] = useState(false);

  useEffect(() => {
    // Fetch doctor profile
    const fetchProfile = async () => {
      const docRef = doc(db, 'doctors', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setDoctorProfile(docSnap.data() as Doctor);
      }
    };

    fetchProfile();

    // Fetch appointments where doctorUid matches
    const q = query(
      collection(db, 'appointments'),
      where('doctorUid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      setAppointments(docs);
      setIsLoading(false);
    });

    return () => unsub();
  }, [user.uid]);

  const handleUpdateStatus = async (appointmentId: string, status: 'confirmed' | 'cancelled') => {
    try {
      await updateDoc(doc(db, 'appointments', appointmentId), { status });
    } catch (error) {
      console.error("Update appointment status error:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-8 pb-24"
    >
      {/* Header & Profile Summary */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">{t("Doctor Dashboard")}</h2>
          <button 
            onClick={() => setShowEditProfile(true)}
            className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all"
          >
            <Edit3 size={20} />
          </button>
        </div>

        {doctorProfile ? (
          <div className="bg-primary text-white p-6 rounded-[32px] shadow-xl shadow-primary/20 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-[24px] flex items-center justify-center">
                <Stethoscope size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold">{doctorProfile.name}</h3>
                <p className="text-xs text-white/70 font-medium uppercase tracking-widest">{doctorProfile.speciality}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/10">
              <div className="flex items-center gap-2 text-xs text-white/80">
                <Clock size={14} />
                <span>{doctorProfile.sittingTime}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/80">
                <MapPin size={14} />
                <span className="truncate">{doctorProfile.hospitalName}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-100 p-6 rounded-[32px] space-y-4 text-center">
            <p className="text-sm text-amber-700 font-medium">{t("Complete your doctor profile to start receiving appointments.")}</p>
            <button 
              onClick={() => setShowEditProfile(true)}
              className="bg-amber-500 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-amber-500/20"
            >
              {t("Setup Profile")}
            </button>
          </div>
        )}
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="font-bold text-slate-800">{t("Patient Appointments")}</h3>
          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg uppercase tracking-wider">
            {appointments.length} {t("Total")}
          </span>
        </div>

        {appointments.length === 0 ? (
          <div className="py-12 text-center space-y-4 bg-white rounded-[32px] border border-slate-100">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
              <Calendar size={32} />
            </div>
            <p className="text-xs text-slate-400 font-medium">{t("No appointments booked yet.")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appt) => (
              <div key={appt.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                      <UserIcon size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{t("Patient")}</h4>
                      <p className="text-[10px] text-slate-400 font-medium">{t("ID")}: {appt.userId.slice(0, 8)}...</p>
                    </div>
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                    appt.status === 'confirmed' ? "bg-emerald-50 text-emerald-600" : 
                    appt.status === 'cancelled' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                  )}>
                    {t(appt.status)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-2 border-y border-slate-50">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Calendar size={14} className="text-slate-400" />
                    <span className="text-xs font-medium">{appt.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Clock size={14} className="text-slate-400" />
                    <span className="text-xs font-medium">{appt.time}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Reason")}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{appt.reason || t("No reason provided")}</p>
                </div>

                {appt.status === 'pending' && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button 
                      onClick={() => handleUpdateStatus(appt.id, 'confirmed')}
                      className="flex items-center justify-center gap-2 bg-emerald-500 text-white py-3 rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                    >
                      <CheckCircle2 size={16} />
                      {t("Confirm")}
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus(appt.id, 'cancelled')}
                      className="flex items-center justify-center gap-2 bg-rose-500 text-white py-3 rounded-xl text-xs font-bold shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
                    >
                      <XCircle size={16} />
                      {t("Cancel")}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <DoctorPanel onClose={() => setShowEditProfile(false)} t={t} />
        </div>
      )}
    </motion.div>
  );
}
