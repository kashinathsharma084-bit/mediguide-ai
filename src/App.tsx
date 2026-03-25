/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { 
  Search, 
  Stethoscope, 
  Bell, 
  Home, 
  Camera, 
  Mic, 
  Plus, 
  X, 
  ChevronRight, 
  Info, 
  AlertTriangle,
  Clock,
  Trash2,
  CheckCircle2,
  Barcode,
  Calendar,
  Activity,
  Heart,
  ChevronDown,
  Maximize2,
  Settings,
  Globe,
  Languages,
  ShieldAlert,
  Package,
  Baby,
  FlaskConical,
  Factory,
  MapPin,
  Download,
  Share2,
  RefreshCw,
  HeartPulse,
  MessageSquare,
  Send,
  User,
  Phone,
  Video,
  VideoOff,
  MicOff,
  PhoneOff,
  Copy,
  Check,
  LogIn
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import Peer from 'peerjs';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { searchMedicine, analyzeSymptoms, getHealthTip, translateUI, generateHighResImage, findNearbyHospitals, findNearbyDoctors, translateObject, chatWithDoctor, type MedicineInfo, type SymptomAnalysis, type DoctorRecommendation } from './services/geminiService';
import { type Reminder, type AppTab, type SymptomHistoryItem, type FavoriteMedicine, type MedicineEntry } from './types';
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, db, doc, setDoc, getDoc, collection, getDocs, onSnapshot, updateDoc, deleteDoc, query, orderBy, addDoc, type User as FirebaseUser } from './firebase';
import TelehealthScreen from './components/screens/TelehealthScreen';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [symptomHistory, setSymptomHistory] = useState<SymptomHistoryItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteMedicine[]>([]);
  const [healthTip, setHealthTip] = useState<string>('');
  const [userName, setUserName] = useState<string>(() => localStorage.getItem('mediguide_user_name') || '');
  const [userAge, setUserAge] = useState<string>(() => localStorage.getItem('mediguide_user_age') || '');
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => !localStorage.getItem('mediguide_user_name'));
  const [language, setLanguage] = useState<string>(() => localStorage.getItem('mediguide_language') || 'English');
  const [translations, setTranslations] = useState<Record<string, string>>(() => {
    const lang = localStorage.getItem('mediguide_language') || 'English';
    if (lang.toLowerCase() === 'english') return {};
    const cached = localStorage.getItem(`mediguide_ui_cache_${lang.toLowerCase()}`);
    return cached ? JSON.parse(cached) : {};
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const uiStrings = [
    "Home", "Search", "Summary", "Check", "Settings",
    "Your Health Companion", "Daily Summary", "Meds", "Taken", "Checks",
    "Medication Schedule", "Today's Check-ins", "Health Tip of the Day",
    "Offline Mode", "Customize your health companion", "Language", "Current",
    "Other Language", "Type any language...", "Apply", "Symptom Checker",
    "Analyze", "History", "Describe how you're feeling...", "Emergency Warning",
    "Find Nearest Hospitals", "Medicine Search", "Search for a medicine...",
    "Scan Barcode", "Voice Search", "Favorites", "Reminders", "Add Reminder",
    "Medicine Name", "Dosage", "Time", "Date", "Add Medicine", "Add Date", "Medicines", "Dates", "Add", "Daily Schedule", "No medications scheduled for today.",
    "No health checks performed today.", "No reminders set for today", "Internet connection required for new searches.",
    "Could not find information for this medicine.", "Could not find information for this medicine. Did you mean:",
    "Internet connection required for voice input.",
    "Voice input is not supported in this browser.", "Internet connection required for camera analysis.",
    "Internet connection required for symptom analysis.", "Geolocation is not supported by your browser.",
    "Could not get your location. Please enable location services.", "AI is analyzing your symptoms...",
    "AI is searching for medicine info...",
    "Your symptoms indicate a potential medical emergency. Please contact emergency services or visit the nearest hospital immediately.",
    "Hello there!", "How are you feeling today?", "Check Symptoms", "Tip of the Day", "meds scheduled", "checks today",
    "Medicine Info", "Search usage & dosage", "Manage your meds", "Favorite Medicines", "Search More",
    "You are currently offline. AI features like symptom checking and new searches are disabled, but you can still view your reminders and favorites.",
    "Recent Searches", "No results found", "Scan a medicine barcode to get instant information", "Listening...",
    "Possible Conditions", "Recommendation", "Emergency Warning", "Dosage & Usage", "Side Effects", "Precautions",
    "Add to Favorites", "Remove from Favorites", "Medicine Details", "Close", "No reminders set for today",
    "Daily Schedule", "Add New Reminder", "Summary", "Checks", "Taken", "Meds", "Today's Check-ins", "Medication Schedule",
    "Take Photo", "Upload", "Analyzing...", "Cancel", "Capture", "Analyze This Photo", "Analyze Symptoms", "Finding Hospitals...", 
    "Suggested Medicines", "First Aid Solution", "Alternative Way", "Refresh Tip", "Share Info", "Taken today", "No reminders set yet.", "Add one to stay on track!", "New Reminder", 
    "e.g. Paracetamol", "e.g. 500mg, 1 tablet", "Add Reminder", "Offline - Analysis unavailable",
    "Symptom analysis requires an internet connection. You can still view your history.",
    "Scan a medicine barcode to get instant information", "Align barcode within the frame",
    "Welcome to MediGuide AI", "Let's get to know you better to provide personalized health insights.",
    "What is your name?", "How old are you?", "Get Started", "Please enter your name", "Please enter a valid age",
    "Hello", "Welcome back", "Chat with Doctor", "Ask about any disease...", "Doctor's Advice", "Type your message...", "Send",
    "Recommended Doctors Near You", "Call Now", "Open in Maps", "Distance", "Phone"
  ];

  useEffect(() => {
    let unsubReminders: () => void;
    let unsubSymptoms: () => void;
    let unsubFavorites: () => void;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Sync user to Firestore
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            createdAt: new Date().toISOString()
          });
        }

        // Setup listeners for user data
        unsubReminders = onSnapshot(collection(db, 'users', firebaseUser.uid, 'reminders'), (snapshot) => {
          const list = snapshot.docs.map(doc => doc.data() as Reminder);
          setReminders(list);
        });

        unsubSymptoms = onSnapshot(collection(db, 'users', firebaseUser.uid, 'symptoms'), (snapshot) => {
          const list = snapshot.docs.map(doc => doc.data() as SymptomHistoryItem);
          setSymptomHistory(list.sort((a, b) => b.timestamp - a.timestamp));
        });

        unsubFavorites = onSnapshot(collection(db, 'users', firebaseUser.uid, 'favorites'), (snapshot) => {
          const list = snapshot.docs.map(doc => doc.data() as FavoriteMedicine);
          setFavorites(list);
        });

      } else {
        setUser(null);
        setReminders([]);
        setSymptomHistory([]);
        setFavorites([]);
        if (unsubReminders) unsubReminders();
        if (unsubSymptoms) unsubSymptoms();
        if (unsubFavorites) unsubFavorites();
      }
      setAuthLoading(false);
    });
    return () => {
      unsubscribe();
      if (unsubReminders) unsubReminders();
      if (unsubSymptoms) unsubSymptoms();
      if (unsubFavorites) unsubFavorites();
    };
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    localStorage.setItem('mediguide_language', language);
    if (isOnline && language.toLowerCase() !== 'english') {
      translateUI(uiStrings, language).then(setTranslations);
    } else if (language.toLowerCase() === 'english') {
      setTranslations({});
    }
  }, [language, isOnline]);
  
  // Load data from localStorage
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const savedReminders = localStorage.getItem('mediguide_reminders');
    if (savedReminders) {
      setReminders(JSON.parse(savedReminders));
    }
    
    const savedHistory = localStorage.getItem('mediguide_symptom_history');
    if (savedHistory) {
      setSymptomHistory(JSON.parse(savedHistory));
    }

    const savedFavorites = localStorage.getItem('mediguide_favorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }

    const savedTip = localStorage.getItem('mediguide_health_tip');
    const savedTipDate = localStorage.getItem('mediguide_health_tip_date');
    const savedTipLang = localStorage.getItem('mediguide_health_tip_lang');
    const today = new Date().toDateString();

    if (savedTip && savedTipDate === today && savedTipLang === language) {
      setHealthTip(savedTip);
    } else if (isOnline) {
      getHealthTip(language).then(tip => {
        setHealthTip(tip);
        localStorage.setItem('mediguide_health_tip', tip);
        localStorage.setItem('mediguide_health_tip_date', today);
        localStorage.setItem('mediguide_health_tip_lang', language);
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [language, isOnline]);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('mediguide_reminders', JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    localStorage.setItem('mediguide_symptom_history', JSON.stringify(symptomHistory));
  }, [symptomHistory]);

  useEffect(() => {
    localStorage.setItem('mediguide_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('mediguide_language', language);
    
    if (isOnline) {
      // Translate dynamic content
      const translateDynamicContent = async () => {
        if (language.toLowerCase() === 'english') return;

        try {
          const translationPromises = [];

          if (symptomHistory.length > 0) {
            translationPromises.push(translateObject(symptomHistory, language).then(setSymptomHistory));
          }

          if (favorites.length > 0) {
            translationPromises.push(translateObject(favorites, language).then(setFavorites));
          }

          if (reminders.length > 0) {
            translationPromises.push(translateObject(reminders, language).then(setReminders));
          }

          await Promise.all(translationPromises);
        } catch (error) {
          console.error("Error in parallel translation:", error);
        }
      };

      translateDynamicContent();
    }
  }, [language, isOnline]);

  const t = (text: string) => translations[text] || text;

  const addReminder = async (reminder: Omit<Reminder, 'id' | 'active'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newReminder: Reminder = {
      ...reminder,
      id,
      active: true
    };
    
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'reminders', id), newReminder);
    } else {
      setReminders([...reminders, newReminder]);
    }
  };

  const deleteReminder = async (id: string) => {
    if (user) {
      await deleteDoc(doc(db, 'users', user.uid, 'reminders', id));
    } else {
      setReminders(reminders.filter(r => r.id !== id));
    }
  };

  const toggleReminder = async (id: string) => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;

    if (user) {
      await updateDoc(doc(db, 'users', user.uid, 'reminders', id), { active: !reminder.active });
    } else {
      setReminders(reminders.map(r => r.id === id ? { ...r, active: !r.active } : r));
    }
  };

  const markAsTaken = async (id: string) => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;

    const today = new Date().toISOString();
    const takenDates = reminder.takenDates || [];
    const alreadyTakenToday = takenDates.some(d => new Date(d).toDateString() === new Date().toDateString());
    
    if (!alreadyTakenToday) {
      const newTakenDates = [...takenDates, today];
      if (user) {
        await updateDoc(doc(db, 'users', user.uid, 'reminders', id), { takenDates: newTakenDates });
      } else {
        setReminders(reminders.map(r => r.id === id ? { ...r, takenDates: newTakenDates } : r));
      }
    }
  };

  const addToHistory = async (symptoms: string, analysis: SymptomAnalysis) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newItem: SymptomHistoryItem = {
      id,
      timestamp: Date.now(),
      symptoms,
      analysis
    };
    
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'symptoms', id), newItem);
    } else {
      setSymptomHistory([newItem, ...symptomHistory]);
    }
  };

  const deleteHistoryItem = async (id: string) => {
    if (user) {
      await deleteDoc(doc(db, 'users', user.uid, 'symptoms', id));
    } else {
      setSymptomHistory(symptomHistory.filter(item => item.id !== id));
    }
  };

  const handleRefreshTip = async () => {
    if (!isOnline) return;
    const tip = await getHealthTip(language);
    setHealthTip(tip);
    const today = new Date().toDateString();
    localStorage.setItem('mediguide_health_tip', tip);
    localStorage.setItem('mediguide_health_tip_date', today);
    localStorage.setItem('mediguide_health_tip_lang', language);
  };

  const toggleFavorite = async (medicine: MedicineInfo) => {
    const exists = favorites.find(f => f.name === medicine.name);
    if (exists) {
      if (user) {
        await deleteDoc(doc(db, 'users', user.uid, 'favorites', exists.id));
      } else {
        setFavorites(favorites.filter(f => f.name !== medicine.name));
      }
    } else {
      const id = Math.random().toString(36).substr(2, 9);
      const newFavorite = {
        id,
        name: medicine.name,
        info: medicine
      };
      if (user) {
        await setDoc(doc(db, 'users', user.uid, 'favorites', id), newFavorite);
      } else {
        setFavorites([...favorites, newFavorite]);
      }
    }
  };

  const handleOnboardingComplete = (name: string, age: string) => {
    setUserName(name);
    setUserAge(age);
    localStorage.setItem('mediguide_user_name', name);
    localStorage.setItem('mediguide_user_age', age);
    setShowOnboarding(false);
  };

  const isAdmin = user?.email === "kashinathsharma084@gmail.com";

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} t={t} />;
  }

  if (showOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} t={t} />;
  }

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-50 overflow-hidden shadow-2xl relative">
      {/* Header */}
      <header className="px-6 pt-8 pb-4 bg-white border-b border-slate-100 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary">MediGuide AI</h1>
          <p className="text-xs text-slate-500 font-medium">{t("Your Health Companion")}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Stethoscope size={20} className="text-primary" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <HomeScreen 
              key="home" 
              setActiveTab={setActiveTab} 
              reminders={reminders} 
              history={symptomHistory} 
              favorites={favorites}
              healthTip={healthTip}
              onMarkAsTaken={markAsTaken}
              language={language}
              isOnline={isOnline}
              t={t}
              userName={userName}
              onRefreshTip={handleRefreshTip}
            />
          )}
          {activeTab === 'search' && (
            <SearchScreen 
              key="search" 
              favorites={favorites} 
              onToggleFavorite={toggleFavorite} 
              language={language}
              isOnline={isOnline}
              t={t}
            />
          )}
          {activeTab === 'symptoms' && (
            <SymptomScreen 
              key="symptoms" 
              history={symptomHistory} 
              onSave={addToHistory} 
              onDeleteHistory={deleteHistoryItem}
              language={language}
              isOnline={isOnline}
              t={t}
            />
          )}
          {activeTab === 'chat' && (
            <ChatScreen 
              key="chat" 
              language={language}
              isOnline={isOnline}
              t={t}
              user={user}
            />
          )}
          {activeTab === 'reminders' && (
            <RemindersScreen 
              key="reminders" 
              reminders={reminders} 
              onAdd={addReminder} 
              onDelete={deleteReminder} 
              onToggle={toggleReminder}
              onMarkAsTaken={markAsTaken}
              t={t}
            />
          )}
          {activeTab === 'summary' && (
            <SummaryScreen 
              key="summary" 
              reminders={reminders} 
              history={symptomHistory} 
              t={t}
            />
          )}
          {activeTab === 'telehealth' && (
            <TelehealthScreen 
              key="telehealth"
              language={language}
              t={t}
              user={user}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsScreen 
              key="settings" 
              language={language} 
              setLanguage={setLanguage} 
              t={t}
              onLogout={handleLogout}
              user={user}
            />
          )}
          {activeTab === 'users' && isAdmin && (
            <UsersScreen 
              key="users"
              t={t}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-2 py-3 flex justify-between items-center safe-bottom z-50 overflow-x-auto no-scrollbar">
        <NavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<Home size={18} />} label={t("Home")} />
        <NavButton active={activeTab === 'search'} onClick={() => setActiveTab('search')} icon={<Search size={18} />} label={t("Search")} />
        <NavButton active={activeTab === 'telehealth'} onClick={() => setActiveTab('telehealth')} icon={<Video size={18} />} label={t("Call")} />
        <NavButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<MessageSquare size={18} />} label={t("Chat")} />
        <NavButton active={activeTab === 'symptoms'} onClick={() => setActiveTab('symptoms')} icon={<Stethoscope size={18} />} label={t("Check")} />
        {isAdmin && (
          <NavButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<User size={18} />} label={t("Users")} />
        )}
        <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={18} />} label={t("Settings")} />
      </nav>

      {/* Offline Mode Indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 w-full p-2 z-[60] pointer-events-none">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800 text-white rounded-lg p-2 shadow-lg flex items-center justify-center gap-2 pointer-events-auto"
          >
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{t("Offline Mode")}</span>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function LoginScreen({ onLogin, t }: { onLogin: () => void, t: (s: string) => string }) {
  return (
    <div className="flex flex-col h-screen bg-white max-w-md mx-auto overflow-hidden items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-12 flex flex-col items-center">
        {/* Minimalist Logo */}
        <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
          <Stethoscope size={32} />
        </div>
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome to MediGuide AI</h1>
          <p className="text-slate-500 text-sm">
            {t("Log in with your Google account to continue")}
          </p>
        </div>

        <div className="w-full space-y-4">
          <button 
            onClick={onLogin}
            className="w-full bg-white border border-slate-200 text-slate-700 py-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-3 hover:bg-slate-50 active:scale-[0.98] transition-all shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {t("Continue with Google")}
          </button>
        </div>

        <div className="pt-8 text-center">
          <p className="text-[11px] text-slate-400 max-w-[240px] mx-auto leading-relaxed">
            MediGuide AI provides informational guidance. 
            By logging in, you agree to our Terms and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all duration-300",
        active ? "text-primary scale-110" : "text-slate-400"
      )}
    >
      {icon}
      <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      {active && <motion.div layoutId="nav-dot" className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
    </button>
  );
}

// --- Screens ---

function OnboardingScreen({ onComplete, t }: { onComplete: (name: string, age: string) => void, t: (s: string) => string }) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("Please enter your name"));
      return;
    }
    if (!age || isNaN(Number(age)) || Number(age) <= 0) {
      setError(t("Please enter a valid age"));
      return;
    }
    onComplete(name.trim(), age);
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white overflow-hidden shadow-2xl relative p-8 justify-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="space-y-2 text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-[30px] flex items-center justify-center text-primary mx-auto mb-6">
            <Heart size={40} fill="currentColor" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">{t("Welcome to MediGuide AI")}</h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            {t("Let's get to know you better to provide personalized health insights.")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("What is your name?")}</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="e.g. John Doe"
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("How old are you?")}</label>
            <input 
              type="number" 
              value={age}
              onChange={(e) => { setAge(e.target.value); setError(''); }}
              placeholder="e.g. 25"
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          {error && (
            <p className="text-rose-500 text-xs font-bold flex items-center gap-1">
              <AlertTriangle size={14} /> {error}
            </p>
          )}

          <button 
            type="submit"
            className="w-full bg-primary text-white py-5 rounded-2xl font-bold shadow-xl shadow-primary/20 transition-transform active:scale-[0.98]"
          >
            {t("Get Started")}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function SettingsScreen({ language, setLanguage, t, onLogout, user }: { language: string, setLanguage: (l: string) => void, t: (s: string) => string, onLogout: () => void, user: FirebaseUser | null }) {
  const commonLanguages = [
    'English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Korean', 'Hindi', 'Arabic', 'Portuguese', 'Russian', 'Italian', 'Vietnamese', 'Thai', 'Bengali'
  ];
  const [customLang, setCustomLang] = useState('');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6 space-y-8"
    >
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-800">{t("Settings")}</h2>
        <p className="text-sm text-slate-500 font-medium">{t("Customize your health companion")}</p>
      </div>

      {/* User Profile Section */}
      {user && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <img 
            src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
            alt={user.displayName || 'User'} 
            className="w-16 h-16 rounded-2xl object-cover border-2 border-primary/10"
          />
          <div className="flex-1">
            <h3 className="font-bold text-slate-800">{user.displayName}</h3>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
          <button 
            onClick={onLogout}
            className="p-3 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors"
            title="Logout"
          >
            <X size={20} />
          </button>
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Globe size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">{t("Language")}</h3>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{t("Current")}: {language}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {commonLanguages.map(lang => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={cn(
                "px-4 py-3 rounded-xl text-xs font-bold transition-all border",
                language === lang 
                  ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                  : "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100"
              )}
            >
              {lang}
            </button>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-50">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">{t("Other Language")}</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={customLang}
              onChange={(e) => setCustomLang(e.target.value)}
              placeholder={t("Type any language...")}
              className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button 
              onClick={() => {
                if (customLang.trim()) {
                  setLanguage(customLang.trim());
                  setCustomLang('');
                }
              }}
              className="bg-primary text-white px-4 py-3 rounded-xl text-xs font-bold shadow-lg shadow-primary/20"
            >
              {t("Apply")}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
            <Info size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">{t("System Information")}</h3>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{t("Project Details")}</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("Computer Languages Used")}</label>
            <div className="flex flex-wrap gap-2">
              {['TypeScript', 'React', 'Tailwind CSS', 'Node.js'].map(lang => (
                <span key={lang} className="bg-slate-50 text-slate-600 px-3 py-1 rounded-full text-[10px] font-bold border border-slate-100">{lang}</span>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("Data Storage")}</label>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Cloud Database</span>
                <span className="font-bold text-slate-700">Firebase Firestore</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Authentication</span>
                <span className="font-bold text-slate-700">Firebase Auth</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Local Cache</span>
                <span className="font-bold text-slate-700">Browser LocalStorage</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("Deployment Status")}</label>
            <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-700">{t("Application is Live & Healthy")}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-100/50 rounded-3xl p-6 border border-dashed border-slate-200">
        <div className="flex items-center gap-3 mb-3">
          <Languages size={20} className="text-slate-400" />
          <h4 className="font-bold text-sm text-slate-700">{t("Multi-language Support")}</h4>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          {t("MediGuide AI uses advanced language models to provide medical information and symptom analysis in your preferred language. Changing the language will affect all AI-generated content.")}
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex items-start gap-4">
        <AlertTriangle size={24} className="text-amber-600 shrink-0 mt-1" />
        <div className="space-y-1">
          <h4 className="font-bold text-amber-900 text-sm">Medical Disclaimer</h4>
          <p className="text-xs text-amber-800 leading-relaxed">
            This application provides AI-generated information for educational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function HomeScreen({ setActiveTab, reminders, history, favorites, healthTip, onMarkAsTaken, language, isOnline, t, userName, onRefreshTip }: { setActiveTab: (tab: AppTab) => void, reminders: Reminder[], history: SymptomHistoryItem[], favorites: FavoriteMedicine[], healthTip: string, onMarkAsTaken: (id: string) => void, language: string, isOnline: boolean, t: (s: string) => string, userName: string, onRefreshTip: () => void }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const activeRemindersToday = reminders.filter(r => 
    r.active && 
    (r.days.includes('Daily') || (r.dates && r.dates.includes(todayStr)))
  );
  const today = new Date().setHours(0, 0, 0, 0);
  const todayHistory = history.filter(item => new Date(item.timestamp).setHours(0, 0, 0, 0) === today);
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6 space-y-8"
    >
      {/* Welcome Card */}
      <div className="bg-gradient-to-br from-primary to-primary-dark rounded-3xl p-6 text-white shadow-xl shadow-primary/20">
        <h2 className="text-xl font-bold mb-1">{t("Hello")}, {userName}!</h2>
        <p className="text-white/80 text-sm mb-6">{t("How are you feeling today?")}</p>
        <div className="flex gap-3">
          <button 
            onClick={() => setActiveTab('symptoms')}
            className="bg-white text-primary px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
          >
            {t("Check Symptoms")} <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Offline Warning */}
      {!isOnline && (
        <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-slate-400" />
          <p className="text-[10px] text-slate-600 font-medium leading-tight">
            {t("You are currently offline. AI features like symptom checking and new searches are disabled, but you can still view your reminders and favorites.")}
          </p>
        </div>
      )}

      {/* Daily Health Tip */}
      {healthTip && (
        <div className="bg-pink-50 border border-pink-100 rounded-3xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Activity size={64} className="text-pink-600" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-pink-500" />
                <span className="text-[10px] font-bold text-pink-600 uppercase tracking-widest">{t("Tip of the Day")}</span>
              </div>
              <button 
                onClick={onRefreshTip}
                className="p-1.5 rounded-full bg-white/50 text-pink-600 hover:bg-white transition-colors"
                title={t("Refresh Tip")}
              >
                <RefreshCw size={12} />
              </button>
            </div>
            <p className="text-sm text-pink-900 font-medium leading-relaxed">
              "{healthTip}"
            </p>
          </div>
        </div>
      )}

      {/* Daily Summary Preview */}
      <button 
        onClick={() => setActiveTab('summary')}
        className="w-full bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 text-left"
      >
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          <Calendar size={24} />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-slate-800">{t("Daily Summary")}</h3>
          <p className="text-[10px] text-slate-500 font-medium">
            {activeRemindersToday.length} {t("meds scheduled")} • {todayHistory.length} {t("checks today")}
          </p>
        </div>
        <ChevronRight size={20} className="text-slate-300" />
      </button>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <ActionCard 
          icon={<Search className="text-rose-500" />} 
          title={t("Medicine Info")} 
          desc={t("Search usage & dosage")} 
          onClick={() => setActiveTab('search')}
          color="bg-rose-50"
        />
        <ActionCard 
          icon={<Bell className="text-amber-500" />} 
          title={t("Reminders")} 
          desc={t("Manage your meds")} 
          onClick={() => setActiveTab('reminders')}
          color="bg-amber-50"
        />
      </div>

      {/* Favorite Medicines */}
      {favorites.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800">{t("Favorite Medicines")}</h3>
            <button onClick={() => setActiveTab('search')} className="text-primary text-xs font-bold">{t("Search More")}</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
            {favorites.map(fav => (
              <button 
                key={fav.id}
                onClick={() => setActiveTab('search')}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm min-w-[140px] text-left shrink-0"
              >
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-50 mb-3 border border-slate-100">
                  {fav.info?.imageUrl ? (
                    <img 
                      src={fav.info.imageUrl} 
                      alt={fav.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-red-500">
                      <Heart size={20} fill="currentColor" />
                    </div>
                  )}
                  <div className="absolute top-1 right-1 bg-white/90 backdrop-blur-sm p-1 rounded-full text-red-500 shadow-sm">
                    <Heart size={10} fill="currentColor" />
                  </div>
                </div>
                <h4 className="font-bold text-xs text-slate-800 line-clamp-1">{fav.name}</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">{t("View Details")}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Reminders */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-800">{t("Upcoming Today")}</h3>
          <button onClick={() => setActiveTab('reminders')} className="text-primary text-xs font-bold">{t("View All")}</button>
        </div>
        {activeRemindersToday.length > 0 ? (
          <div className="space-y-3">
            {activeRemindersToday.slice(0, 2).map(r => (
              <div key={r.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <Clock size={20} />
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
                {r.takenDates?.some(d => new Date(d).toDateString() === new Date().toDateString()) ? (
                  <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center">
                    <CheckCircle2 size={18} />
                  </div>
                ) : (
                  <button 
                    onClick={() => onMarkAsTaken(r.id)}
                    className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-100/50 rounded-2xl p-8 text-center border border-dashed border-slate-200">
            <p className="text-slate-400 text-sm italic">{t("No reminders set for today")}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ActionCard({ icon, title, desc, onClick, color }: { icon: React.ReactNode, title: string, desc: string, onClick: () => void, color: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn("p-4 rounded-3xl text-left transition-transform active:scale-95 border border-slate-100", color)}
    >
      <div className="bg-white w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-sm">
        {icon}
      </div>
      <h4 className="font-bold text-sm text-slate-800">{title}</h4>
      <p className="text-[10px] text-slate-500 mt-1 leading-tight">{desc}</p>
    </button>
  );
}

function SearchScreen({ favorites, onToggleFavorite, language, isOnline, t }: { favorites: FavoriteMedicine[], onToggleFavorite: (med: MedicineInfo) => void, language: string, isOnline: boolean, t: (s: string) => string }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MedicineInfo | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [highResLoading, setHighResLoading] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const handleShare = async () => {
    if (!result) return;
    
    const shareData: ShareData = {
      title: `Medicine Info: ${result.name}`,
      text: `Check out this information about ${result.name}:\n\nUsage: ${result.usage}\nDosage: ${result.dosage}\n\nShared via MediGuide AI`,
    };

    try {
      if (navigator.share) {
        // Try to include the image if available
        if (result.imageUrl && result.imageUrl.startsWith('data:')) {
          try {
            const response = await fetch(result.imageUrl);
            const blob = await response.blob();
            const file = new File([blob], `${result.name.replace(/\s+/g, '_')}.png`, { type: 'image/png' });
            
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              shareData.files = [file];
            }
          } catch (imgErr) {
            console.error("Could not process image for sharing:", imgErr);
          }
        }
        await navigator.share(shareData);
      } else {
        // Fallback: Copy to clipboard
        const textToCopy = `${shareData.title}\n\n${shareData.text}`;
        await navigator.clipboard.writeText(textToCopy);
        alert("Medicine info copied to clipboard!");
      }
    } catch (err) {
      // Don't alert on user cancel
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error("Error sharing:", err);
      }
    }
  };

  const handleDownload = () => {
    if (!result) return;

    const content = `
MEDI-GUIDE AI: MEDICINE INFORMATION
-----------------------------------
Name: ${result.name}
Usage: ${result.usage}
Dosage: ${result.dosage}
Side Effects: ${result.sideEffects}
Interactions: ${result.interactions}
Precautions: ${result.precautions}
Contraindications: ${result.contraindications}
Storage: ${result.storage}
Pregnancy Safety: ${result.pregnancySafety}
Active Ingredients: ${result.activeIngredients}
Manufacturer Info: ${result.manufacturerInfo}

Generated on: ${new Date().toLocaleString()}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${result.name.replace(/\s+/g, '_')}_info.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Also download image if available
    if (result.imageUrl && result.imageUrl.startsWith('data:')) {
      const imgLink = document.createElement('a');
      imgLink.href = result.imageUrl;
      imgLink.download = `${result.name.replace(/\s+/g, '_')}_image.png`;
      document.body.appendChild(imgLink);
      imgLink.click();
      document.body.removeChild(imgLink);
    }
  };

  useEffect(() => {
    if (result && isOnline && language.toLowerCase() !== 'english') {
      translateObject(result, language).then(translated => {
        setResult(translated);
      });
    }
  }, [language, isOnline]);

  const handleSearch = async (queryToSearch?: string) => {
    if (!isOnline) {
      setError('Internet connection required for new searches.');
      return;
    }
    const finalQuery = queryToSearch || query;
    if (!finalQuery.trim()) return;
    
    setLoading(true);
    setError('');
    setResult(null);
    setSuggestions([]);
    
    const searchResult = await searchMedicine(finalQuery, language);
    if (searchResult) {
      if (searchResult.info) {
        setResult(searchResult.info);
      } else if (searchResult.suggestions && searchResult.suggestions.length > 0) {
        setSuggestions(searchResult.suggestions);
        setError(t("Could not find information for this medicine. Did you mean:"));
      } else {
        setError(t("Could not find information for this medicine."));
      }
    } else {
      setError(t("Could not find information for this medicine."));
    }
    setLoading(false);
  };

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const handleVoiceInput = () => {
    if (!isOnline) {
      alert("Internet connection required for voice input.");
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      handleSearch(transcript);
    };
    recognition.start();
  };

  const startScanning = async () => {
    if (!isOnline) {
      alert("Internet connection required for barcode scanning.");
      return;
    }
    setIsScanning(true);
    setError('');
    
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;
        
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 150 }
          },
          (decodedText) => {
            setQuery(decodedText);
            stopScanning();
          },
          (errorMessage) => {
            // Silently ignore scan errors
          }
        );
      } catch (err) {
        console.error("Scanner error:", err);
        setError("Could not start camera. Please check permissions.");
        setIsScanning(false);
      }
    }, 100);
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const handleHighRes = async () => {
    if (!result || !isOnline) return;
    
    try {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await (window as any).aistudio.openSelectKey();
      }
      
      setHighResLoading(true);
      const highResUrl = await generateHighResImage(result.name, "1K");
      if (highResUrl) {
        setResult({ ...result, imageUrl: highResUrl });
      } else {
        alert("Failed to generate high-resolution image. Please ensure you have a valid API key selected.");
      }
    } catch (err: any) {
      console.error("High-res error:", err);
      if (err.message?.includes("Requested entity was not found")) {
        await (window as any).aistudio.openSelectKey();
      } else {
        alert("An error occurred while generating the high-resolution image.");
      }
    } finally {
      setHighResLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 space-y-6"
    >
      <h2 className="text-xl font-bold text-slate-800">{t("Medicine Search")}</h2>
      
      <div className="space-y-4">
        <form onSubmit={onFormSubmit} className="relative">
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isListening ? t("Listening...") : t("Search for a medicine...")}
            className={cn(
              "w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 pr-24 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all",
              isListening && "border-primary ring-2 ring-primary/10"
            )}
          />
          <div className="absolute right-2 top-2 flex gap-1">
            <button 
              type="button"
              onClick={handleVoiceInput}
              className={cn(
                "p-2 transition-colors",
                isListening ? "text-primary animate-pulse" : "text-slate-400 hover:text-primary"
              )}
            >
              <Mic size={20} />
            </button>
            <button 
              type="submit"
              className="bg-primary text-white p-2 rounded-xl shadow-lg shadow-primary/20"
            >
              <Search size={20} />
            </button>
          </div>
        </form>

        <button 
          onClick={startScanning}
          className="w-full flex items-center justify-center gap-3 bg-slate-100 hover:bg-slate-200 text-slate-700 py-4 rounded-2xl font-bold transition-all border border-slate-200"
        >
          <Barcode size={24} />
          {t("Scan Barcode")}
        </button>
      </div>

      {isScanning && (
        <div className="fixed inset-0 z-[110] bg-black flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-sm aspect-square bg-slate-900 rounded-3xl overflow-hidden relative border-2 border-primary">
            <div id="reader" className="w-full h-full"></div>
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-40 border-2 border-white/50 rounded-lg" />
            </div>
          </div>
          <p className="text-white text-sm mt-8 font-medium">{t("Scan a medicine barcode to get instant information")}</p>
          <button 
            onClick={stopScanning}
            className="mt-12 bg-white/10 text-white px-8 py-3 rounded-full font-bold border border-white/20"
          >
            {t("Close")}
          </button>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">{t("AI is searching for medicine info...")}</p>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 space-y-4 shadow-sm shadow-rose-100/50">
          <div className="flex items-center gap-3 text-rose-600">
            <AlertTriangle size={20} />
            <p className="text-sm font-bold leading-tight">{error}</p>
          </div>
          
          {suggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">{t("Suggested Medicines")}</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setQuery(suggestion);
                      handleSearch(suggestion);
                    }}
                    className="bg-white border border-rose-200 text-rose-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-rose-100 active:scale-95 transition-all shadow-sm"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {result && !isScanning && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-2xl font-bold text-primary pr-12">{result.name}</h3>
              <div className="absolute top-6 right-6 flex gap-2">
                <label className="p-2 rounded-full bg-slate-50 text-slate-500 hover:text-primary transition-all cursor-pointer" title="Upload Image">
                  <Camera size={20} />
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setResult({ ...result, userImageUrl: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }} 
                  />
                </label>
                <button 
                  onClick={() => onToggleFavorite(result)}
                  className={cn(
                    "p-2 rounded-full transition-all",
                    favorites.find(f => f.name === result.name) 
                      ? "bg-red-50 text-red-500" 
                      : "bg-slate-50 text-slate-300 hover:text-red-400"
                  )}
                >
                  <Heart size={20} fill={favorites.find(f => f.name === result.name) ? "currentColor" : "none"} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {result.imageUrl && (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("AI Generated Image")}</p>
                  <div className="relative rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 aspect-square group cursor-pointer" onClick={() => setIsZoomed(true)}>
                    <img 
                      src={result.imageUrl} 
                      alt={result.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <div className="bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0 duration-300">
                        <Maximize2 size={20} className="text-primary" />
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={handleHighRes}
                    disabled={highResLoading || !isOnline}
                    className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 py-2 rounded-xl text-[10px] font-bold border border-slate-100 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {highResLoading ? (
                      <div className="w-3 h-3 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
                    ) : (
                      <Maximize2 size={12} />
                    )}
                    {highResLoading ? 'Generating...' : 'High-Res'}
                  </button>
                </div>
              )}

              {result.userImageUrl && (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("Your Uploaded Image")}</p>
                  <div className="relative rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 aspect-square group">
                    <img 
                      src={result.userImageUrl} 
                      alt="User uploaded" 
                      className="w-full h-full object-cover"
                    />
                    <button 
                      onClick={() => setResult({ ...result, userImageUrl: undefined })}
                      className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 mb-6">
              <button 
                onClick={handleShare}
                className="flex-1 bg-primary text-white py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Share2 size={18} />
                {t("Share Info")}
              </button>
              <button 
                onClick={handleDownload}
                className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-2xl font-bold text-sm border border-slate-200 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Download size={18} />
                {t("Download")}
              </button>
            </div>
            
            <InfoSection title="Usage" content={result.usage} icon={<Info size={16} />} />
            <InfoSection title="Dosage" content={result.dosage} icon={<Clock size={16} />} />
            <InfoSection title="Side Effects" content={result.sideEffects} icon={<AlertTriangle size={16} />} color="text-amber-600" expandable />
            <InfoSection title="Interactions" content={result.interactions} icon={<X size={16} />} color="text-red-600" expandable />
            <InfoSection title="Precautions" content={result.precautions} icon={<AlertTriangle size={16} />} color="text-amber-600" expandable />
            <InfoSection title="Contraindications" content={result.contraindications} icon={<ShieldAlert size={16} />} color="text-red-700" expandable />
            <InfoSection title="Storage" content={result.storage} icon={<Package size={16} />} expandable />
            <InfoSection title="Pregnancy & Breastfeeding" content={result.pregnancySafety} icon={<Baby size={16} />} expandable />
            <InfoSection title="Active Ingredients" content={result.activeIngredients} icon={<FlaskConical size={16} />} expandable />
            <InfoSection title="Brand & Generic Info" content={result.manufacturerInfo} icon={<Factory size={16} />} expandable />
            
            {result.doctorAdvice && (
              <div className="mt-8 bg-primary/5 rounded-3xl p-6 border border-primary/10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Stethoscope size={20} className="text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold text-primary">{t("Doctor's Advice")}</h4>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">MediGuide AI Physician</p>
                  </div>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed italic">
                  "{result.doctorAdvice}"
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Zoom Modal */}
      <AnimatePresence>
        {isZoomed && result?.imageUrl && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setIsZoomed(false)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl aspect-square rounded-3xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={result.imageUrl} 
                alt={result.name} 
                className="w-full h-full object-contain bg-slate-900"
                referrerPolicy="no-referrer"
              />
              <button 
                onClick={() => setIsZoomed(false)}
                className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md border border-white/20 transition-colors"
              >
                <X size={24} />
              </button>
              <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end">
                <div>
                  <h3 className="text-white text-xl font-bold">{result.name}</h3>
                  <p className="text-white/60 text-sm mt-1">AI Generated Visual Representation</p>
                  <div className="flex gap-3 mt-4">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare();
                      }}
                      className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-xl backdrop-blur-md border border-white/20 transition-colors flex items-center gap-2 text-xs font-bold"
                    >
                      <Share2 size={16} /> Share
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload();
                      }}
                      className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-xl backdrop-blur-md border border-white/20 transition-colors flex items-center gap-2 text-xs font-bold"
                    >
                      <Download size={16} /> Download
                    </button>
                  </div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleHighRes();
                  }}
                  disabled={highResLoading}
                  className="bg-white text-primary px-4 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 disabled:opacity-50"
                >
                  {highResLoading ? (
                    <div className="w-3 h-3 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  ) : (
                    <Maximize2 size={14} />
                  )}
                  {highResLoading ? 'Generating...' : 'Request 1K High-Res'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function InfoSection({ title, content, icon, color = "text-primary", expandable = false }: { title: string, content: string, icon: React.ReactNode, color?: string, expandable?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(!expandable);

  return (
    <div className="mb-6 last:mb-0">
      <button 
        disabled={!expandable}
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center justify-between w-full text-left mb-2",
          expandable && "cursor-pointer hover:opacity-80"
        )}
      >
        <div className={cn("flex items-center gap-2 font-bold text-xs uppercase tracking-wider", color)}>
          {icon}
          {title}
        </div>
        {expandable && (
          <ChevronDown 
            size={16} 
            className={cn("text-slate-300 transition-transform", isExpanded && "rotate-180")} 
          />
        )}
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.p 
            initial={expandable ? { height: 0, opacity: 0 } : false}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="text-sm text-slate-600 leading-relaxed overflow-hidden"
          >
            {content}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function SymptomScreen({ history, onSave, onDeleteHistory, language, isOnline, t }: { 
  history: SymptomHistoryItem[], 
  onSave: (symptoms: string, analysis: SymptomAnalysis) => void,
  onDeleteHistory: (id: string) => void,
  language: string,
  isOnline: boolean,
  t: (s: string) => string
}) {
  const [symptoms, setSymptoms] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SymptomAnalysis | null>(null);
  const [view, setView] = useState<'check' | 'history'>('check');
  const [hospitalInfo, setHospitalInfo] = useState<string | null>(null);
  const [hospitalLoading, setHospitalLoading] = useState(false);
  const [doctorRecommendations, setDoctorRecommendations] = useState<DoctorRecommendation[]>([]);
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [searchRadius, setSearchRadius] = useState(5);

  const handleFindHospitals = async () => {
    setHospitalLoading(true);
    try {
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        setHospitalLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        const info = await findNearbyHospitals(latitude, longitude, language);
        setHospitalInfo(info);
        setHospitalLoading(false);
      }, (error) => {
        console.error("Geolocation error:", error);
        alert("Could not get your location. Please enable location services.");
        setHospitalLoading(false);
      });
    } catch (error) {
      console.error("Error in handleFindHospitals:", error);
      setHospitalLoading(false);
    }
  };
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isOnline && language.toLowerCase() !== 'english') {
      if (result) {
        translateObject(result, language).then(translated => {
          setResult(translated);
        });
      }
      if (hospitalInfo) {
        translateObject(hospitalInfo, language).then(translated => {
          setHospitalInfo(translated);
        });
      }
    }
  }, [language, isOnline]);

  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    if (!isOnline) {
      alert("Internet connection required for camera analysis.");
      return;
    }
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error("Camera error:", err);
      setIsCameraActive(false);
      alert("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImage(dataUrl);
        stopCamera();
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isOnline) {
      alert("Internet connection required for image analysis.");
      return;
    }
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!isOnline) {
      alert("Internet connection required for symptom analysis.");
      return;
    }
    if (!symptoms.trim() && !image) return;
    
    setLoading(true);
    setResult(null);
    setDoctorRecommendations([]);
    
    const analysis = await analyzeSymptoms(symptoms, image || undefined, language);
    if (analysis) {
      setResult(analysis);
      setHospitalInfo(null); // Reset hospital info on new analysis
      onSave(symptoms, analysis);
      
      // Fetch doctor recommendations lazily
      if (analysis.possibleConditions.length > 0) {
        const specialist = analysis.possibleConditions[0].recommendedSpecialist;
        fetchDoctors(specialist, searchRadius);
      }
    }
    setLoading(false);
  };

  const fetchDoctors = async (specialist: string, radius: number) => {
    setDoctorLoading(true);
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;
          const doctors = await findNearbyDoctors(specialist, latitude, longitude, radius, language);
          setDoctorRecommendations(doctors);
          setDoctorLoading(false);
        }, (error) => {
          console.error("Geolocation error:", error);
          setDoctorLoading(false);
        });
      } else {
        setDoctorLoading(false);
      }
    } catch (err) {
      console.error("Error fetching doctors:", err);
      setDoctorLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 space-y-6"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">{t("Symptom Checker")}</h2>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setView('check')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
              view === 'check' ? "bg-white text-primary shadow-sm" : "text-slate-500"
            )}
          >
            {t("Check")}
          </button>
          <button 
            onClick={() => setView('history')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
              view === 'history' ? "bg-white text-primary shadow-sm" : "text-slate-500"
            )}
          >
            {t("History")}
          </button>
        </div>
      </div>
      
      {view === 'check' ? (
        <div className="space-y-4">
          {!isOnline && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3">
              <AlertTriangle size={20} className="text-red-400" />
              <p className="text-[10px] text-red-600 font-medium leading-tight">
                {t("Symptom analysis requires an internet connection. You can still view your history.")}
              </p>
            </div>
          )}
          <div className="relative">
            <textarea 
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              disabled={!isOnline}
              placeholder={isOnline ? t("Describe how you're feeling...") : t("Offline - Analysis unavailable")}
              className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 h-32 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>

          <div className="flex gap-3">
            <button 
              onClick={startCamera}
              disabled={!isOnline}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 p-4 rounded-2xl border border-slate-200 transition-colors flex flex-col items-center justify-center gap-2 disabled:opacity-50"
            >
              <Camera size={24} />
              <span className="text-[10px] font-bold uppercase">{t("Take Photo")}</span>
            </button>
            <label className={cn(
              "flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 p-4 rounded-2xl border border-slate-200 cursor-pointer transition-colors flex flex-col items-center justify-center gap-2",
              !isOnline && "opacity-50 cursor-not-allowed"
            )}>
              <Plus size={24} />
              <span className="text-[10px] font-bold uppercase">{t("Upload")}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={!isOnline} />
            </label>
            <button 
              onClick={() => {
                setSymptoms('');
                setImage(null);
                setResult(null);
              }}
              className="bg-slate-100 text-slate-600 p-4 rounded-2xl border border-slate-200"
            >
              <Trash2 size={24} />
            </button>
          </div>

          {isCameraActive && (
            <div className="fixed inset-0 z-[110] bg-black flex flex-col items-center justify-center p-6">
              <div className="w-full max-w-sm aspect-square bg-slate-900 rounded-3xl overflow-hidden relative border-2 border-primary">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex gap-4 mt-12">
                <button 
                  onClick={stopCamera}
                  className="bg-white/10 text-white px-8 py-3 rounded-full font-bold border border-white/20"
                >
                  {t("Cancel")}
                </button>
                <button 
                  onClick={capturePhoto}
                  className="bg-primary text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-primary/20"
                >
                  {t("Capture")}
                </button>
              </div>
            </div>
          )}

          {image && (
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 group">
              <img src={image} alt="Uploaded" className="w-full h-48 object-cover" />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <button 
                  onClick={handleAnalyze}
                  disabled={loading || !isOnline}
                  className="bg-white/90 backdrop-blur-sm text-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50"
                >
                  <Search size={14} />
                  {loading ? t("Analyzing...") : t("Analyze This Photo")}
                </button>
              </div>
              <button 
                onClick={() => setImage(null)}
                className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <button 
            onClick={handleAnalyze}
            disabled={loading || (!symptoms.trim() && !image)}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-xl shadow-primary/20 disabled:opacity-50 transition-all active:scale-95"
          >
            {loading ? t("Analyzing...") : t("Analyze Symptoms")}
          </button>

          {loading && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-sm text-slate-500 font-medium">{t("AI is analyzing your symptoms...")}</p>
            </div>
          )}

          {result && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {result.isEmergency ? (
                <div className="bg-red-50 border border-red-200 p-6 rounded-3xl space-y-4">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                      <AlertTriangle size={28} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-red-900">{t("Emergency Warning")}</h3>
                      <p className="text-xs text-red-800 font-medium leading-relaxed">
                        {t("Your symptoms indicate a potential medical emergency. Please contact emergency services or visit the nearest hospital immediately.")}
                      </p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleFindHospitals}
                    disabled={hospitalLoading}
                    className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-200 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {hospitalLoading ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <MapPin size={18} />
                    )}
                    {hospitalLoading ? t("Finding Hospitals...") : t("Find Nearest Hospitals")}
                  </button>

                  {hospitalInfo && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-white/50 rounded-2xl p-4 border border-red-100"
                    >
                      <div className="prose prose-sm prose-slate max-w-none">
                        <div className="text-[11px] text-red-900 whitespace-pre-wrap">
                          {hospitalInfo}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex gap-3">
                  <AlertTriangle size={20} className="text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-800 font-medium">{result.advice}</p>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="font-bold text-slate-800 px-1">{t("Possible Conditions")}</h3>
                {result.possibleConditions.map((condition, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                    <h4 className="font-bold text-primary mb-2">{condition.condition}</h4>
                    <p className="text-xs text-slate-600 mb-4 leading-relaxed">{condition.description}</p>
                    
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("First Aid Solution")}</p>
                        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                          {condition.firstAid}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("Alternative Way")}</p>
                        <p className="text-xs text-slate-600 leading-relaxed bg-amber-50/50 p-3 rounded-xl border border-amber-100/50">
                          {condition.alternativeTreatments}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("Suggested Medicines")}</p>
                        <div className="flex flex-wrap gap-2">
                          {condition.suggestedMedicines.map((med, mIdx) => (
                            <span key={mIdx} className="bg-primary/5 text-primary px-3 py-1 rounded-lg text-[10px] font-semibold border border-primary/10">
                              {med}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recommended Doctors Section */}
              {(doctorLoading || doctorRecommendations.length > 0) && (
                <div className="space-y-4 mt-8 pt-8 border-t border-slate-100">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="font-bold text-slate-800">{t("Recommended Doctors Near You")}</h3>
                      {doctorLoading && (
                        <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                      )}
                    </div>

                    {/* Radius Adjustment */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("Search Radius")}</span>
                        <span className="text-xs font-bold text-primary">{searchRadius} km</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="20" 
                        step="1"
                        value={searchRadius}
                        onChange={(e) => setSearchRadius(parseInt(e.target.value))}
                        onMouseUp={() => {
                          if (result && result.possibleConditions.length > 0) {
                            fetchDoctors(result.possibleConditions[0].recommendedSpecialist, searchRadius);
                          }
                        }}
                        onTouchEnd={() => {
                          if (result && result.possibleConditions.length > 0) {
                            fetchDoctors(result.possibleConditions[0].recommendedSpecialist, searchRadius);
                          }
                        }}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {doctorRecommendations.map((doc, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-primary/5 flex items-center justify-center text-primary shrink-0">
                              <User size={20} />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800 text-sm">{doc.name}</h4>
                              <p className="text-[10px] text-primary font-bold uppercase tracking-wider">{doc.specialty}</p>
                            </div>
                          </div>
                          <div className="bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-500">{doc.distance}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <MapPin size={12} className="shrink-0" />
                          <p className="line-clamp-1">{doc.address}</p>
                        </div>

                        <div className="flex gap-2 mt-1">
                          <a 
                            href={`tel:${doc.phone}`}
                            className="flex-1 bg-primary/5 text-primary py-2.5 rounded-xl font-bold text-[10px] flex items-center justify-center gap-2 border border-primary/10 active:scale-95 transition-all"
                          >
                            <Phone size={14} />
                            {t("Call Now")}
                          </a>
                          <a 
                            href={doc.mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-slate-50 text-slate-600 py-2.5 rounded-xl font-bold text-[10px] flex items-center justify-center gap-2 border border-slate-100 active:scale-95 transition-all"
                          >
                            <MapPin size={14} />
                            {t("Open in Maps")}
                          </a>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {history.length > 0 ? (
            history.map((item) => (
              <div key={item.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {new Date(item.timestamp).toLocaleDateString()} • {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <h4 className="font-bold text-sm text-slate-800 mt-1 line-clamp-1 italic">"{item.symptoms}"</h4>
                  </div>
                  <button 
                    onClick={() => onDeleteHistory(item.id)}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="pt-2 border-t border-slate-50">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">Findings</p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.analysis.possibleConditions.map((c: any, i: number) => (
                      <span key={i} className="bg-primary/5 text-primary px-2 py-0.5 rounded-md text-[10px] font-medium">
                        {c.condition}
                      </span>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setResult(item.analysis);
                    setSymptoms(item.symptoms);
                    setView('check');
                  }}
                  className="w-full text-center py-2 text-[10px] font-bold text-slate-400 uppercase hover:text-primary transition-colors"
                >
                  View Full Details
                </button>
              </div>
            ))
          ) : (
            <div className="py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <Clock size={40} />
              </div>
              <p className="text-slate-400 text-sm">No history yet.<br/>Your checks will appear here.</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function ChatScreen({ language, isOnline, t, user }: { language: string, isOnline: boolean, t: (s: string) => string, user: FirebaseUser | null }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: t("Hello! I'm your MediGuide AI doctor. How can I help you today? You can ask me about any disease, symptoms, or general health concerns.") }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error("Geolocation error:", err)
      );
    }
  }, []);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'users', user.uid, 'chats'), orderBy('timestamp', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => doc.data() as { role: 'user' | 'model', text: string });
        if (list.length > 0) {
          setMessages(list);
        }
      });
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !isOnline) return;

    const userMessage = input.trim();
    setInput('');
    
    const userMsgObj = { role: 'user' as const, text: userMessage, timestamp: new Date().toISOString(), userId: user?.uid || 'anonymous' };
    
    if (user) {
      await addDoc(collection(db, 'users', user.uid, 'chats'), userMsgObj);
    } else {
      setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    }
    
    setIsLoading(true);

    try {
      // Prepare history for the API call
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const response = await chatWithDoctor(userMessage, history, language, location?.lat, location?.lng);
      const modelMsgObj = { role: 'model' as const, text: response, timestamp: new Date().toISOString(), userId: user?.uid || 'anonymous' };
      
      if (user) {
        await addDoc(collection(db, 'users', user.uid, 'chats'), modelMsgObj);
      } else {
        setMessages(prev => [...prev, { role: 'model', text: response }]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg = t("I'm sorry, I'm having trouble connecting right now. Please try again later.");
      if (user) {
        await addDoc(collection(db, 'users', user.uid, 'chats'), { role: 'model', text: errorMsg, timestamp: new Date().toISOString(), userId: user.uid });
      } else {
        setMessages(prev => [...prev, { role: 'model', text: errorMsg }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full bg-slate-50"
    >
      {/* Header */}
      <div className="bg-white px-6 py-4 border-b border-slate-100 flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Stethoscope size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="font-bold text-slate-800 leading-none">{t("Chat with Doctor")}</h2>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Online & Ready</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {messages.map((msg, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, scale: 0.95, x: msg.role === 'user' ? 10 : -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            className={cn(
              "flex gap-3 max-w-[85%]",
              msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
              msg.role === 'user' ? "bg-primary text-white" : "bg-white border border-slate-100 text-primary shadow-sm"
            )}>
              {msg.role === 'user' ? <User size={14} /> : <Stethoscope size={14} />}
            </div>
            <div className={cn(
              "p-4 rounded-3xl text-sm leading-relaxed shadow-sm markdown-body",
              msg.role === 'user' 
                ? "bg-primary text-white rounded-tr-none" 
                : "bg-white text-slate-700 border border-slate-100 rounded-tl-none"
            )}>
              <ReactMarkdown>{msg.text}</ReactMarkdown>
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex gap-3 max-w-[85%] mr-auto">
            <div className="w-8 h-8 rounded-full bg-white border border-slate-100 text-primary shadow-sm flex items-center justify-center shrink-0">
              <Stethoscope size={14} />
            </div>
            <div className="bg-white p-4 rounded-3xl rounded-tl-none border border-slate-100 flex gap-1 items-center">
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-100 safe-bottom">
        <div className="relative flex items-center gap-2">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t("Ask about any disease...")}
            className="flex-1 bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading || !isOnline}
            className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 active:scale-90 transition-all disabled:opacity-50 disabled:grayscale"
          >
            <Send size={20} />
          </button>
        </div>
        <p className="text-[10px] text-center text-slate-400 mt-3 font-medium">
          AI Doctor can make mistakes. Always consult a real physician for diagnosis.
        </p>
      </div>
    </motion.div>
  );
}

function RemindersScreen({ reminders, onAdd, onDelete, onToggle, onMarkAsTaken, t }: { 
  reminders: Reminder[], 
  onAdd: (r: Omit<Reminder, 'id' | 'active'>) => void,
  onDelete: (id: string) => void,
  onToggle: (id: string) => void,
  onMarkAsTaken: (id: string) => void,
  t: (s: string) => string
}) {
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
      exit={{ opacity: 0, x: -20 }}
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

function UsersScreen({ t }: { t: (s: string) => string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userData, setUserData] = useState<{ chats: any[], reminders: any[], symptoms: any[] }>({ chats: [], reminders: [], symptoms: [] });
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const usersList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(usersList);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleSelectUser = async (u: any) => {
    setSelectedUser(u);
    setDataLoading(true);
    try {
      const [chatsSnap, remindersSnap, symptomsSnap] = await Promise.all([
        getDocs(collection(db, 'users', u.id, 'chats')),
        getDocs(collection(db, 'users', u.id, 'reminders')),
        getDocs(collection(db, 'users', u.id, 'symptoms'))
      ]);

      setUserData({
        chats: chatsSnap.docs.map(doc => doc.data()),
        reminders: remindersSnap.docs.map(doc => doc.data()),
        symptoms: symptomsSnap.docs.map(doc => doc.data())
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setDataLoading(false);
    }
  };

  if (selectedUser) {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="p-6 space-y-6"
      >
        <button 
          onClick={() => setSelectedUser(null)}
          className="flex items-center gap-2 text-primary font-bold text-sm"
        >
          <ChevronRight className="rotate-180" size={18} />
          {t("Back to Users")}
        </button>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <img 
            src={selectedUser.photoURL || `https://ui-avatars.com/api/?name=${selectedUser.displayName}`} 
            alt={selectedUser.displayName} 
            className="w-16 h-16 rounded-2xl object-cover"
          />
          <div>
            <h3 className="font-bold text-slate-800 text-lg">{selectedUser.displayName}</h3>
            <p className="text-xs text-slate-500">{selectedUser.email}</p>
            <p className="text-[10px] text-slate-400 mt-1">UID: {selectedUser.uid}</p>
          </div>
        </div>

        {dataLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{t("Loading Data...")}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Reminders */}
            <section className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Bell size={14} /> {t("Reminders")} ({userData.reminders.length})
              </h4>
              <div className="space-y-2">
                {userData.reminders.map((r: any) => (
                  <div key={r.id} className="bg-white p-4 rounded-2xl border border-slate-100 text-sm">
                    <p className="font-bold text-slate-800">{r.medicines.map((m: any) => m.name).join(', ')}</p>
                    <p className="text-xs text-slate-500">{r.time} - {r.days.join(', ')}</p>
                  </div>
                ))}
                {userData.reminders.length === 0 && <p className="text-xs text-slate-400 italic">{t("No reminders")}</p>}
              </div>
            </section>

            {/* Symptoms */}
            <section className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Stethoscope size={14} /> {t("Symptom History")} ({userData.symptoms.length})
              </h4>
              <div className="space-y-2">
                {userData.symptoms.map((s: any) => (
                  <div key={s.id} className="bg-white p-4 rounded-2xl border border-slate-100 text-sm">
                    <p className="font-bold text-slate-800">{s.symptoms}</p>
                    <p className="text-[10px] text-slate-500">{new Date(s.timestamp).toLocaleString()}</p>
                  </div>
                ))}
                {userData.symptoms.length === 0 && <p className="text-xs text-slate-400 italic">{t("No history")}</p>}
              </div>
            </section>

            {/* Chats */}
            <section className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <MessageSquare size={14} /> {t("Chat History")} ({userData.chats.length})
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto p-2 bg-slate-100 rounded-2xl">
                {userData.chats.map((c: any, i: number) => (
                  <div key={i} className={cn(
                    "p-3 rounded-xl text-xs mb-2 max-w-[90%]",
                    c.role === 'user' ? "bg-primary text-white ml-auto" : "bg-white text-slate-700"
                  )}>
                    {c.text}
                  </div>
                ))}
                {userData.chats.length === 0 && <p className="text-xs text-slate-400 italic p-2">{t("No chats")}</p>}
              </div>
            </section>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{t("User Management")}</h2>
          <p className="text-xs text-slate-500 mt-1">{t("Admin access to user data")}</p>
          <a 
            href={`https://console.firebase.google.com/project/gen-lang-client-0001480080/firestore/databases/ai-studio-5d9c1fd7-6267-40d9-ac73-63a263f23758/data`}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-primary font-bold hover:underline mt-2 inline-block"
          >
            {t("Open Firebase Console")}
          </a>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          <User size={24} />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{t("Loading Users...")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {users.map(u => (
            <button 
              key={u.id} 
              onClick={() => handleSelectUser(u)}
              className="w-full bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 text-left active:scale-[0.98] transition-transform"
            >
              <img 
                src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} 
                alt={u.displayName} 
                className="w-12 h-12 rounded-xl object-cover"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-800 truncate">{u.displayName}</h3>
                <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
                <p className="text-[9px] text-slate-400 mt-1">UID: {u.uid}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Joined</p>
                <p className="text-[10px] font-bold text-slate-700">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</p>
              </div>
            </button>
          ))}
          {users.length === 0 && (
            <div className="text-center py-20 text-slate-400 italic">
              {t("No users found in database.")}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function SummaryScreen({ reminders, history, t }: { reminders: Reminder[], history: SymptomHistoryItem[], t: (s: string) => string }) {
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
      exit={{ opacity: 0, x: -20 }}
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

      {/* Daily Health Tip (Static for now) */}
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

