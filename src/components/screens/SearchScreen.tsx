import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, X, Star, Share2, Download, Volume2, Languages, HelpCircle,
  Camera, Mic, MicOff, Info, CheckCircle2, ChevronRight, ArrowRight, HeartPulse
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { MedicineInfo } from '../../types';
import { searchMedicine } from '../../services/geminiService';

interface SearchScreenProps {
  language: string;
  isOnline: boolean;
  t: (s: string) => string;
}

export default function SearchScreen({ language, isOnline, t }: SearchScreenProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState<MedicineInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (val.length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await searchMedicine(val, language);
      if (res?.suggestions) {
        setResults(res.suggestions);
      }
      if (res?.info) {
        setSelectedMedicine(res.info);
        setResults([]);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = async (med: string) => {
    setQuery(med);
    setResults([]);
    setIsLoading(true);
    try {
      const res = await searchMedicine(med, language);
      if (res?.info) {
        setSelectedMedicine(res.info);
      }
    } catch (error) {
      console.error("Select error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert(t("Speech recognition is not supported in this browser."));
      return;
    }
    
    // @ts-ignore
    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      handleSearch(transcript);
    };
    
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-6 space-y-6"
    >
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-800">{t("Medicine Search")}</h2>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Search size={20} />
          </div>
          <input 
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={t("Search by medicine name...")}
            className="w-full bg-white border border-slate-100 rounded-3xl pl-12 pr-12 py-4 text-sm shadow-sm focus:ring-2 focus:ring-primary/20 transition-all"
          />
          <button 
            onClick={toggleListening}
            className={cn(
              "absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all",
              isListening ? "bg-rose-500 text-white animate-pulse" : "bg-slate-50 text-slate-400"
            )}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        </div>

        {/* Search Results Dropdown */}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white border border-slate-100 rounded-3xl shadow-xl overflow-hidden z-30 relative"
            >
              {results.map((med, idx) => (
                <button 
                  key={idx}
                  onClick={() => handleSelect(med)}
                  className="w-full px-6 py-4 text-left text-sm hover:bg-slate-50 flex items-center justify-between border-b border-slate-50 last:border-0"
                >
                  <span className="font-medium text-slate-700">{med}</span>
                  <ChevronRight size={16} className="text-slate-300" />
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">{t("Fetching medicine details...")}</p>
        </div>
      )}

      {/* Medicine Details */}
      {selectedMedicine && !isLoading && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden"
        >
          {/* Header */}
          <div className="bg-primary p-8 text-white space-y-4">
            <div className="flex justify-between items-start">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <HeartPulse size={32} />
              </div>
              <div className="flex gap-2">
                <button className="p-2.5 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
                  <Share2 size={18} />
                </button>
                <button className="p-2.5 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
                  <Download size={18} />
                </button>
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold">{selectedMedicine.name}</h3>
              <p className="text-white/70 text-xs mt-1 font-medium">{selectedMedicine.dosage}</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-100 px-4 overflow-x-auto no-scrollbar">
            {['overview', 'uses', 'side-effects', 'warnings'].map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={cn(
                  "px-4 py-4 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all relative",
                  activeSection === section ? "text-primary" : "text-slate-400"
                )}
              >
                {t(section.replace('-', ' '))}
                {activeSection === section && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            {activeSection === 'overview' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Usage")}</h4>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">{selectedMedicine.usage}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t("Dosage")}</h4>
                    <p className="text-xs font-bold text-slate-700">{selectedMedicine.dosage}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t("Status")}</h4>
                    <p className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={12} /> {t("Verified")}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Doctor Advice")}</h4>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium italic">{selectedMedicine.doctorAdvice}</p>
                </div>
              </div>
            )}

            {activeSection === 'uses' && (
              <div className="space-y-4">
                <div className="flex items-start gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                    <CheckCircle2 size={14} />
                  </div>
                  <p className="text-sm text-slate-600 font-medium">{selectedMedicine.usage}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Active Ingredients")}</h4>
                  <p className="text-sm text-slate-600 font-medium">{selectedMedicine.activeIngredients}</p>
                </div>
              </div>
            )}

            {activeSection === 'side-effects' && (
              <div className="space-y-4">
                <div className="flex items-start gap-4 bg-rose-50/50 p-4 rounded-2xl border border-rose-100">
                  <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center text-rose-500 shrink-0 mt-0.5">
                    <Info size={14} />
                  </div>
                  <p className="text-sm text-slate-600 font-medium">{selectedMedicine.sideEffects}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Interactions")}</h4>
                  <p className="text-sm text-slate-600 font-medium">{selectedMedicine.interactions}</p>
                </div>
              </div>
            )}

            {activeSection === 'warnings' && (
              <div className="space-y-4">
                <div className="flex items-start gap-4 bg-amber-50 p-4 rounded-2xl border border-amber-100">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
                    <Info size={14} />
                  </div>
                  <p className="text-sm text-slate-600 font-medium">{selectedMedicine.precautions}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Contraindications")}</h4>
                  <p className="text-sm text-slate-600 font-medium">{selectedMedicine.contraindications}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Pregnancy Safety")}</h4>
                  <p className="text-sm text-slate-600 font-medium">{selectedMedicine.pregnancySafety}</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Placeholder */}
      {!selectedMedicine && !isLoading && (
        <div className="py-20 text-center space-y-6">
          <div className="w-24 h-24 bg-slate-100 rounded-[40px] flex items-center justify-center mx-auto text-slate-300">
            <Search size={48} />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-slate-800">{t("Search for Medicines")}</h3>
            <p className="text-sm text-slate-400 max-w-[200px] mx-auto leading-relaxed">
              {t("Get detailed information about any medication instantly.")}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
