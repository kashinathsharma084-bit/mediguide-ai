import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Home, Search, Activity, MessageSquare, Bell, Video, User, 
  LogOut, Globe, Menu, X, ChevronRight, Stethoscope, 
  HeartPulse, ShieldAlert, History, Star, ArrowRight,
  Info, Clock, CheckCircle2, Plus, Trash2, Send,
  MapPin, Phone, Camera, Mic, MicOff, VideoOff, Copy, Check,
  PhoneOff, Share2, Download, Volume2, Languages, HelpCircle, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, signOut, db, collection, onSnapshot, query, where, orderBy, addDoc, doc, setDoc, limit, deleteDoc, getDoc } from '../firebase';
import { cn } from '../lib/utils';
import { Reminder, SymptomHistoryItem, MedicineInfo, NearbyPlace, DoctorRecommendation } from '../types';

// Import screens (I'll create these next)
import HomeScreen from '../components/screens/HomeScreen';
import SearchScreen from '../components/screens/SearchScreen';
import SymptomScreen from '../components/screens/SymptomScreen';
import ChatScreen from '../components/screens/ChatScreen';
import RemindersScreen from '../components/screens/RemindersScreen';
import TelehealthScreen from '../components/screens/TelehealthScreen';
import SummaryScreen from '../components/screens/SummaryScreen';
import ProfileScreen from '../components/screens/ProfileScreen';
import ProgressScreen from '../components/screens/ProgressScreen';
import AppointmentScreen from '../components/screens/AppointmentScreen';
import DoctorDashboard from '../components/screens/DoctorDashboard';
import DoctorPanel from '../components/DoctorPanel';

interface HomePageProps {
  user: any;
  language: string;
  setLanguage: (l: string) => void;
  isOnline: boolean;
  t: (s: string) => string;
}

export default function HomePage({ user, language, setLanguage, isOnline, t }: HomePageProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [history, setHistory] = useState<SymptomHistoryItem[]>([]);
  const [isDoctor, setIsDoctor] = useState(false);
  const [showDoctorRegistration, setShowDoctorRegistration] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Check if user is a doctor
    const doctorRef = doc(db, 'doctors', user.uid);
    getDoc(doctorRef).then(docSnap => {
      if (docSnap.exists()) {
        setIsDoctor(true);
      }
    });

    const remindersQuery = query(collection(db, 'reminders'), where('userId', '==', user.uid));
    const unsubReminders = onSnapshot(remindersQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reminder));
      setReminders(data);
    });

    const historyQuery = query(
      collection(db, 'history'), 
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    const unsubHistory = onSnapshot(historyQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SymptomHistoryItem));
      setHistory(data);
    });

    return () => {
      unsubReminders();
      unsubHistory();
    };
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const addReminder = async (reminder: Omit<Reminder, 'id' | 'active'>) => {
    if (!user) return;
    await addDoc(collection(db, 'reminders'), {
      ...reminder,
      userId: user.uid,
      active: true,
      takenDates: []
    });
  };

  const deleteReminder = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'reminders', id));
    } catch (error) {
      console.error("Delete reminder error:", error);
    }
  };

  const toggleReminder = async (id: string) => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;
    await setDoc(doc(db, 'reminders', id), { ...reminder, active: !reminder.active }, { merge: true });
  };

  const markAsTaken = async (id: string) => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;
    const today = new Date().toISOString().split('T')[0];
    const takenDates = reminder.takenDates || [];
    if (!takenDates.includes(today)) {
      await setDoc(doc(db, 'reminders', id), { 
        ...reminder, 
        takenDates: [...takenDates, today] 
      }, { merge: true });
    }
  };

  const deleteHistory = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'history', id));
    } catch (error) {
      console.error("Delete history error:", error);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <HomeScreen onNavigate={setActiveTab} reminders={reminders} history={history} t={t} />;
      case 'search': return <SearchScreen language={language} isOnline={isOnline} t={t} />;
      case 'check': return <SymptomScreen language={language} isOnline={isOnline} onSaveHistory={(h) => addDoc(collection(db, 'history'), { ...h, userId: user.uid })} history={history} onDeleteHistory={deleteHistory} t={t} />;
      case 'chat': return <ChatScreen language={language} isOnline={isOnline} t={t} />;
      case 'reminders': return <RemindersScreen reminders={reminders} onAdd={addReminder} onDelete={deleteReminder} onToggle={toggleReminder} onMarkAsTaken={markAsTaken} t={t} />;
      case 'telehealth': return <TelehealthScreen language={language} t={t} user={user} />;
      case 'summary': return <SummaryScreen reminders={reminders} history={history} t={t} />;
      case 'profile': return <ProfileScreen user={user} t={t} />;
      case 'progress': return <ProgressScreen user={user} t={t} />;
      case 'appointments': return <AppointmentScreen user={user} t={t} />;
      case 'doctor': return <DoctorDashboard user={user} t={t} />;
      default: return <HomeScreen onNavigate={setActiveTab} reminders={reminders} history={history} t={t} />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white max-w-md mx-auto overflow-hidden shadow-2xl relative">
      {/* Header */}
      <header className="bg-white px-6 py-4 flex items-center justify-between border-b border-slate-100 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-600 active:scale-90 transition-all"
          >
            <Menu size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-none">MediGuide</h1>
            <p className="text-[10px] text-primary font-bold uppercase tracking-wider mt-1">AI Health Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveTab('summary')}
            className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary relative active:scale-90 transition-all"
          >
            <Bell size={20} />
            {reminders.filter(r => r.active).length > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-pink-500 rounded-full border-2 border-white" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden border border-slate-200"
          >
            {user.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User size={20} />
            )}
          </button>
          {isDoctor && (
            <button 
              onClick={() => setActiveTab('doctor')}
              className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
                activeTab === 'doctor' ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-primary/10 text-primary"
              )}
            >
              <Stethoscope size={20} />
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50/50 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white/80 backdrop-blur-xl border-t border-slate-100 px-6 py-4 flex items-center justify-between absolute bottom-0 left-0 right-0 z-20 safe-bottom">
        {[
          { id: 'home', icon: Home, label: 'Home' },
          { id: 'search', icon: Search, label: 'Search' },
          { id: 'check', icon: Activity, label: 'Check' },
          { id: 'chat', icon: MessageSquare, label: 'Chat' },
          { id: 'telehealth', icon: Video, label: 'Tele' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all duration-300",
              activeTab === tab.id ? "text-primary scale-110" : "text-slate-300 hover:text-slate-400"
            )}
          >
            <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
            <span className={cn(
              "text-[9px] font-bold uppercase tracking-tighter",
              activeTab === tab.id ? "opacity-100" : "opacity-0"
            )}>{t(tab.label)}</span>
          </button>
        ))}
      </nav>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
            />
            <motion.aside 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-[101] shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-slate-50">
                <div className="flex items-center justify-between mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Stethoscope size={24} />
                  </div>
                  <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                    <X size={24} />
                  </button>
                </div>
                <h2 className="text-xl font-bold text-slate-800">MediGuide AI</h2>
                <p className="text-xs text-slate-400 mt-1">Version 2.0.4 • Premium</p>
              </div>

              <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
                <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Main Menu</p>
                {[
                  { id: 'home', icon: Home, label: 'Dashboard' },
                  { id: 'progress', icon: Activity, label: 'Health Progress' },
                  { id: 'appointments', icon: Calendar, label: 'Appointments' },
                  { id: isDoctor ? 'doctor' : 'register-doctor', icon: Stethoscope, label: isDoctor ? 'Doctor Panel' : 'Join as Doctor' },
                  { id: 'check', icon: HeartPulse, label: 'Symptom Checker' },
                  { id: 'search', icon: Search, label: 'Medicine Search' },
                  { id: 'reminders', icon: Bell, label: 'Medication Alerts' },
                  { id: 'telehealth', icon: Video, label: 'Telehealth' },
                  { id: 'summary', icon: History, label: 'Health Summary' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { 
                      if (item.id === 'register-doctor') {
                        setShowDoctorRegistration(true);
                      } else {
                        setActiveTab(item.id); 
                      }
                      setIsSidebarOpen(false); 
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all",
                      activeTab === item.id ? "bg-primary/5 text-primary" : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <item.icon size={20} />
                    <span className="font-bold text-sm">{t(item.label)}</span>
                  </button>
                ))}

                <div className="pt-6 mt-6 border-t border-slate-50">
                  <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Settings</p>
                  <button 
                    onClick={() => { setActiveTab('profile'); setIsSidebarOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all",
                      activeTab === 'profile' ? "bg-primary/5 text-primary" : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <User size={20} />
                    <span className="font-bold text-sm">{t("Edit Profile")}</span>
                  </button>
                  <button 
                    onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
                    className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <Globe size={20} />
                      <span className="font-bold text-sm">{t("Language")}</span>
                    </div>
                    <span className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded-lg uppercase">{language === 'en' ? 'English' : 'हिंदी'}</span>
                  </button>
                </div>
              </div>

              <div className="p-6 border-t border-slate-50">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-rose-500 hover:bg-rose-50 transition-all"
                >
                  <LogOut size={20} />
                  <span className="font-bold text-sm">{t("Sign Out")}</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDoctorRegistration && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <DoctorPanel 
              onClose={() => {
                setShowDoctorRegistration(false);
                // Re-check doctor status after closing
                const doctorRef = doc(db, 'doctors', user.uid);
                getDoc(doctorRef).then(docSnap => {
                  if (docSnap.exists()) setIsDoctor(true);
                });
              }} 
              t={t} 
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
