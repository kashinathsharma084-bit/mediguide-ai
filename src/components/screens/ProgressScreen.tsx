import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar
} from 'recharts';
import { 
  Activity, Heart, Thermometer, Weight, Droplets, Plus, 
  History, TrendingUp, Calendar, Loader2
} from 'lucide-react';
import { db, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from '../../firebase';
import { User } from 'firebase/auth';
import { VitalSigns } from '../../types';
import { cn } from '../../lib/utils';

interface ProgressScreenProps {
  user: User;
  t: (s: string) => string;
}

export default function ProgressScreen({ user, t }: ProgressScreenProps) {
  const [vitals, setVitals] = useState<VitalSigns[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVital, setNewVital] = useState<Partial<VitalSigns>>({});
  const [activeMetric, setActiveMetric] = useState<'weight' | 'bloodPressure' | 'heartRate' | 'temperature'>('heartRate');

  useEffect(() => {
    const q = query(
      collection(db, 'vitals'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'asc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VitalSigns));
      setVitals(docs);
      setIsLoading(false);
    });

    return () => unsub();
  }, [user.uid]);

  const handleAddVital = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'vitals'), {
        ...newVital,
        userId: user.uid,
        timestamp: Date.now()
      });
      setShowAddModal(false);
      setNewVital({});
    } catch (error) {
      console.error("Add vital error:", error);
    }
  };

  const chartData = vitals.map(v => ({
    date: new Date(v.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    weight: v.weight,
    systolic: v.bloodPressureSystolic,
    diastolic: v.bloodPressureDiastolic,
    heartRate: v.heartRate,
    temperature: v.temperature,
    bloodSugar: v.bloodSugar
  }));

  const metrics = [
    { id: 'heartRate', label: t("Heart Rate"), icon: Heart, color: '#f43f5e', unit: 'bpm' },
    { id: 'bloodPressure', label: t("Blood Pressure"), icon: Activity, color: '#8b5cf6', unit: 'mmHg' },
    { id: 'weight', label: t("Weight"), icon: Weight, color: '#0ea5e9', unit: 'kg' },
    { id: 'temperature', label: t("Temperature"), icon: Thermometer, color: '#f59e0b', unit: '°C' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{t("Health Progress")}</h2>
          <p className="text-xs text-slate-400 font-medium mt-1">{t("Track your vitals and trends")}</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 active:scale-90 transition-all"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        {metrics.map((m) => {
          const lastVital = vitals[vitals.length - 1];
          let value = '--';
          if (lastVital) {
            if (m.id === 'bloodPressure') {
              value = lastVital.bloodPressureSystolic ? `${lastVital.bloodPressureSystolic}/${lastVital.bloodPressureDiastolic}` : '--';
            } else {
              value = (lastVital as any)[m.id]?.toString() || '--';
            }
          }

          return (
            <button
              key={m.id}
              onClick={() => setActiveMetric(m.id as any)}
              className={cn(
                "p-5 rounded-[32px] border transition-all text-left space-y-3",
                activeMetric === m.id 
                  ? "bg-white border-primary shadow-sm ring-1 ring-primary/10" 
                  : "bg-slate-50 border-slate-100 hover:bg-white"
              )}
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", activeMetric === m.id ? "bg-primary/10 text-primary" : "bg-white text-slate-400")}>
                <m.icon size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.label}</p>
                <p className="text-lg font-bold text-slate-800">
                  {value} <span className="text-[10px] font-medium text-slate-400">{m.unit}</span>
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Chart Section */}
      <div className="bg-white p-6 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" />
            {metrics.find(m => m.id === activeMetric)?.label} {t("Trends")}
          </h3>
          <div className="flex gap-2">
            <div className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest">7 Days</div>
          </div>
        </div>

        <div className="h-64 w-full">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-slate-300">
              <Loader2 className="animate-spin" size={32} />
            </div>
          ) : vitals.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-2">
              <History size={40} />
              <p className="text-xs font-medium">{t("No data points yet")}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {activeMetric === 'bloodPressure' ? (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorBP" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="systolic" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorBP)" strokeWidth={3} />
                  <Area type="monotone" dataKey="diastolic" stroke="#a78bfa" fillOpacity={0} strokeWidth={2} />
                </AreaChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey={activeMetric} 
                    stroke={metrics.find(m => m.id === activeMetric)?.color} 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: metrics.find(m => m.id === activeMetric)?.color, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent History */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-800 px-2">{t("Recent Logs")}</h3>
        <div className="space-y-3">
          {vitals.slice().reverse().slice(0, 5).map((v) => (
            <div key={v.id} className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                  <Calendar size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700">
                    {new Date(v.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                {v.heartRate && (
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-700">{v.heartRate}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">BPM</p>
                  </div>
                )}
                {v.bloodPressureSystolic && (
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-700">{v.bloodPressureSystolic}/{v.bloodPressureDiastolic}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">mmHg</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Vital Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden"
          >
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800">{t("Add Vital Signs")}</h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>

              <form onSubmit={handleAddVital} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t("Heart Rate")}</label>
                    <input 
                      type="number"
                      placeholder="bpm"
                      onChange={(e) => setNewVital({...newVital, heartRate: parseInt(e.target.value)})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t("Weight")}</label>
                    <input 
                      type="number"
                      placeholder="kg"
                      onChange={(e) => setNewVital({...newVital, weight: parseFloat(e.target.value)})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t("Systolic")}</label>
                    <input 
                      type="number"
                      placeholder="mmHg"
                      onChange={(e) => setNewVital({...newVital, bloodPressureSystolic: parseInt(e.target.value)})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t("Diastolic")}</label>
                    <input 
                      type="number"
                      placeholder="mmHg"
                      onChange={(e) => setNewVital({...newVital, bloodPressureDiastolic: parseInt(e.target.value)})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t("Temperature")}</label>
                  <input 
                    type="number"
                    step="0.1"
                    placeholder="°C"
                    onChange={(e) => setNewVital({...newVital, temperature: parseFloat(e.target.value)})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all mt-4"
                >
                  {t("Save Vitals")}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
