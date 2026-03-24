import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, Camera, Mic, MicOff, Info, CheckCircle2, ChevronRight, ArrowRight,
  History, Trash2, Clock, MapPin, Phone, User, X, Send, Stethoscope
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { SymptomHistoryItem, DoctorRecommendation } from '../../types';
import { analyzeSymptoms, findNearbyDoctors } from '../../services/geminiService';

interface SymptomScreenProps {
  language: string;
  isOnline: boolean;
  onSaveHistory: (h: Omit<SymptomHistoryItem, 'id'>) => void;
  history: SymptomHistoryItem[];
  onDeleteHistory: (id: string) => void;
  t: (s: string) => string;
}

export default function SymptomScreen({ language, isOnline, onSaveHistory, history, onDeleteHistory, t }: SymptomScreenProps) {
  const [view, setView] = useState<'check' | 'history'>('check');
  const [symptoms, setSymptoms] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [image, setImage] = useState<string | null>(null);
  const [doctorRecommendations, setDoctorRecommendations] = useState<DoctorRecommendation[]>([]);
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [searchRadius, setSearchRadius] = useState(5);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAnalyze = async () => {
    if (!symptoms.trim() && !image) return;
    setIsLoading(true);
    setResult(null);
    setDoctorRecommendations([]);

    try {
      const analysis = await analyzeSymptoms(symptoms, image || undefined, language);
      
      setResult(analysis);
      onSaveHistory({
        timestamp: Date.now(),
        symptoms: symptoms || (image ? "Image analysis" : ""),
        analysis,
        imageUrl: image || undefined
      });

      if (analysis.possibleConditions.length > 0) {
        fetchDoctors(analysis.possibleConditions[0].recommendedSpecialist, searchRadius);
      }
    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDoctors = async (specialty: string, radius: number) => {
    setDoctorLoading(true);
    try {
      // Get user location
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        const doctors = await findNearbyDoctors(specialty, latitude, longitude, radius, language === 'en' ? 'English' : 'Hindi');
        setDoctorRecommendations(doctors);
        setDoctorLoading(false);
      }, (err) => {
        console.error("Geolocation error:", err);
        setDoctorLoading(false);
      });
    } catch (error) {
      console.error("Fetch doctors error:", error);
      setDoctorLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-6 space-y-6"
    >
      {/* View Switcher */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl">
        <button 
          onClick={() => setView('check')}
          className={cn(
            "flex-1 py-2.5 rounded-xl text-xs font-bold transition-all",
            view === 'check' ? "bg-white text-primary shadow-sm" : "text-slate-400"
          )}
        >
          {t("Symptom Checker")}
        </button>
        <button 
          onClick={() => setView('history')}
          className={cn(
            "flex-1 py-2.5 rounded-xl text-xs font-bold transition-all",
            view === 'history' ? "bg-white text-primary shadow-sm" : "text-slate-400"
          )}
        >
          {t("Check History")}
        </button>
      </div>

      {view === 'check' ? (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Activity size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{t("How are you feeling?")}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t("Describe your symptoms")}</p>
                </div>
              </div>
              
              <textarea 
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder={t("e.g., I have a persistent headache and feel dizzy...")}
                className="w-full bg-slate-50 border-none rounded-3xl px-6 py-5 text-sm min-h-[120px] focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400"
              />

              <div className="flex gap-3">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex-1 py-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all border",
                    image ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-slate-50 border-slate-100 text-slate-600"
                  )}
                >
                  <Camera size={18} />
                  {image ? t("Image Added") : t("Add Photo")}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                <button 
                  onClick={handleAnalyze}
                  disabled={(!symptoms.trim() && !image) || isLoading || !isOnline}
                  className="flex-[2] bg-primary text-white py-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                  {t("Analyze Now")}
                </button>
              </div>
            </div>

            {image && (
              <div className="relative w-full aspect-video rounded-3xl overflow-hidden border border-slate-100">
                <img src={image} alt="Symptom" className="w-full h-full object-cover" />
                <button 
                  onClick={() => setImage(null)}
                  className="absolute top-3 right-3 w-8 h-8 bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Analysis Results */}
          {result && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2 px-1">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <h3 className="font-bold text-slate-800">{t("Analysis Results")}</h3>
              </div>

              <div className="space-y-4">
                {result.possibleConditions.map((condition: any, idx: number) => (
                  <div key={idx} className="bg-white p-6 rounded-[40px] border border-slate-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-bold text-slate-800">{condition.condition}</h4>
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-lg text-[10px] font-bold">
                            {condition.probability}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">{condition.explanation}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 pt-4 border-t border-slate-50">
                      <div className="space-y-3">
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Recommended Specialist")}</h5>
                        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
                            <User size={16} />
                          </div>
                          <span className="text-xs font-bold text-slate-700">{condition.recommendedSpecialist}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Suggested Medicines")}</h5>
                        <div className="flex flex-wrap gap-2">
                          {condition.suggestedMedicines.map((med: string, mIdx: number) => (
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
