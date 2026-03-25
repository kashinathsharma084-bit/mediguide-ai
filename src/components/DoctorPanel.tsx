import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Stethoscope, Clock, Calendar, MapPin, Phone, Save, Loader2, Check, X } from 'lucide-react';
import { db, auth, doc, getDoc, setDoc } from '../firebase';
import { Doctor } from '../types';
import { cn } from '../lib/utils';

interface DoctorPanelProps {
  onClose: () => void;
  t: (s: string) => string;
}

export default function DoctorPanel({ onClose, t }: DoctorPanelProps) {
  const [doctor, setDoctor] = useState<Partial<Doctor>>({
    name: '',
    speciality: '',
    sittingTime: '',
    daysAvailable: [],
    hospitalName: '',
    phone: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const fetchDoctor = async () => {
      if (!auth.currentUser) return;
      try {
        const docRef = doc(db, 'doctors', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setDoctor(docSnap.data() as Doctor);
        } else {
          // Pre-fill with user name if available
          setDoctor(prev => ({ ...prev, name: auth.currentUser?.displayName || '' }));
        }
      } catch (error) {
        console.error("Error fetching doctor profile:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDoctor();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setIsSaving(true);
    setIsSuccess(false);
    try {
      const doctorData: Doctor = {
        uid: auth.currentUser.uid,
        name: doctor.name || '',
        speciality: doctor.speciality || '',
        sittingTime: doctor.sittingTime || '',
        daysAvailable: doctor.daysAvailable || [],
        hospitalName: doctor.hospitalName || '',
        phone: doctor.phone || '',
        email: auth.currentUser.email || undefined,
        createdAt: doctor.createdAt || new Date().toISOString(),
      };
      await setDoc(doc(db, 'doctors', auth.currentUser.uid), doctorData);
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving doctor profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDay = (day: string) => {
    setDoctor(prev => {
      const days = prev.daysAvailable || [];
      if (days.includes(day)) {
        return { ...prev, daysAvailable: days.filter(d => d !== day) };
      } else {
        return { ...prev, daysAvailable: [...days, day] };
      }
    });
  };

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-[40px] border border-slate-100 shadow-2xl overflow-hidden max-w-lg w-full mx-auto"
    >
      <div className="bg-primary p-8 text-white flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <Stethoscope size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold">{t("Doctor Profile")}</h3>
            <p className="text-xs text-white/70">{t("Manage your professional information")}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSave} className="p-8 space-y-6">
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
              {t("Full Name")}
            </label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                required
                value={doctor.name}
                onChange={(e) => setDoctor(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t("Dr. John Doe")}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
              {t("Speciality")}
            </label>
            <div className="relative">
              <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                required
                value={doctor.speciality}
                onChange={(e) => setDoctor(prev => ({ ...prev, speciality: e.target.value }))}
                placeholder={t("Cardiologist, Neurologist, etc.")}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                {t("Sitting Time")}
              </label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  required
                  value={doctor.sittingTime}
                  onChange={(e) => setDoctor(prev => ({ ...prev, sittingTime: e.target.value }))}
                  placeholder={t("10:00 AM - 04:00 PM")}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                {t("Phone Number")}
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="tel"
                  required
                  value={doctor.phone}
                  onChange={(e) => setDoctor(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder={t("+1 234 567 890")}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
              {t("Hospital / Clinic Name")}
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                required
                value={doctor.hospitalName}
                onChange={(e) => setDoctor(prev => ({ ...prev, hospitalName: e.target.value }))}
                placeholder={t("City General Hospital")}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
              {t("Days Available")}
            </label>
            <div className="flex flex-wrap gap-2">
              {days.map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                    doctor.daysAvailable?.includes(day)
                      ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                      : "bg-white text-slate-400 border-slate-100 hover:border-primary/30"
                  )}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button 
          type="submit"
          disabled={isSaving}
          className="w-full bg-primary text-white py-5 rounded-3xl font-bold text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="animate-spin" size={24} />
          ) : isSuccess ? (
            <>
              <Check size={24} />
              {t("Profile Updated")}
            </>
          ) : (
            <>
              <Save size={24} />
              {t("Save Profile")}
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
}

function UserIcon({ className, size }: { className?: string, size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
