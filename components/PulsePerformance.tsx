
import React, { useMemo, useEffect, useState, useRef } from 'react';
/* Added User import */
import { DashboardData, DistributionRecord, User } from '../types';
import { Activity, Zap, Flame, Waves, Heart, Target, Trophy, Calendar, Filter, Star, FileImage, FileText, Loader2, User as UserIcon, Truck, Package } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { COLORS } from '../constants';

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const getDynamicColor = (perf: number) => {
  if (perf >= 100) return '#10b981'; // Vert Excellence
  if (perf >= 75) return '#f59e0b';  // Orange Vigilance
  return '#ef4444';               // Rouge Alerte
};

const getDistColor = (eff: number) => {
  if (eff >= 95) return '#10b981';
  return '#f59e0b'; // Palette Orange par défaut pour Distribution
};

interface PulsePerformanceProps {
  data: DashboardData;
  /* Added user prop to resolve TS error in App.tsx */
  user?: User | null;
  onLoginClick?: () => void;
  isConnected?: boolean;
}

export const PulsePerformance: React.FC<PulsePerformanceProps> = ({ data, onLoginClick, isConnected }) => {
  const [viewMode, setViewMode] = useState<'donations' | 'distribution'>('donations');
  const [pulsePhase, setPulsePhase] = useState(0);
  const [exporting, setExporting] = useState<'image' | 'pdf' | null>(null);
  const pulseRef = useRef<HTMLDivElement>(null);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    data.dailyHistory.forEach(h => {
      const parts = h.date.split('/');
      if (parts[2]) years.add(parts[2]);
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [data.dailyHistory]);

  const [selectedYear, setSelectedYear] = useState(availableYears[0] || "2026");

  const availableMonths = useMemo(() => {
    const months = new Set<number>();
    data.dailyHistory.forEach(h => {
      const parts = h.date.split('/');
      if (parts[2] === selectedYear) {
        months.add(parseInt(parts[1]) - 1);
      }
    });
    return Array.from(months).sort((a, b) => a - b);
  }, [data.dailyHistory, selectedYear]);

  const [selectedMonth, setSelectedMonth] = useState<number>(
    availableMonths.length > 0 ? availableMonths[availableMonths.length - 1] : new Date().getMonth()
  );

  const availableDays = useMemo(() => {
    return data.dailyHistory
      .filter(h => {
        const parts = h.date.split('/');
        return parts[2] === selectedYear && (parseInt(parts[1]) - 1) === selectedMonth;
      })
      .map(h => h.date);
  }, [data.dailyHistory, selectedYear, selectedMonth]);

  const [selectedDay, setSelectedDay] = useState(availableDays[0] || data.date);

  useEffect(() => {
    if (availableDays.length > 0 && !availableDays.includes(selectedDay)) {
      setSelectedDay(availableDays[0]);
    }
  }, [availableDays, selectedDay]);

  const dayRecord = useMemo(() => 
    data.dailyHistory.find(h => h.date === selectedDay) || data.dailyHistory[0]
  , [selectedDay, data.dailyHistory]);

  // Calcul des objectifs spécifiques à la journée sélectionnée
  const dayObjectives = useMemo(() => {
    if (!dayRecord) return { total: 1137, fixed: 480, mobile: 657 }; // Valeurs par défaut CNTS
    const total = dayRecord.sites.reduce((acc, s) => acc + (s.objective || 0), 0);
    // On estime la répartition de l'objectif jour (approximatif si non fourni par site)
    return {
      total: total || 1137,
      fixed: Math.round(total * 0.42), // Ratio historique CNTS
      mobile: Math.round(total * 0.58)
    };
  }, [dayRecord]);

  const distDayStats = useMemo(() => {
    if (!data.distributions?.records) return { qty: 0, efficiency: 0, rendu: 0 };
    const dayRecs = data.distributions.records.filter(r => r.date === selectedDay);
    const qty = dayRecs.reduce((acc, r) => acc + r.quantite, 0);
    const rendu = dayRecs.reduce((acc, r) => acc + r.rendu, 0);
    return {
      qty, rendu,
      efficiency: qty > 0 ? ((qty - rendu) / qty) * 100 : 0
    };
  }, [data.distributions, selectedDay]);

  const perfDaily = useMemo(() => {
    if (viewMode === 'donations') {
      const realized = dayRecord?.stats.realized || 0;
      return (realized / dayObjectives.total) * 100;
    } else {
      return distDayStats.efficiency;
    }
  }, [viewMode, dayRecord, dayObjectives, distDayStats]);

  const nationalPulseColor = useMemo(() => 
    viewMode === 'donations' ? getDynamicColor(perfDaily) : '#f59e0b'
  , [perfDaily, viewMode]);

  useEffect(() => {
    const interval = setInterval(() => { setPulsePhase(p => (p + 1) % 100); }, 40);
    return () => clearInterval(interval);
  }, []);

  const handleExport = async (type: 'image' | 'pdf') => {
    if (!pulseRef.current) return;
    setExporting(type);
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const canvas = await html2canvas(pulseRef.current, { scale: 2, useCORS: true, backgroundColor: '#f8fafc' });
      const imgData = canvas.toDataURL('image/png', 1.0);
      if (type === 'image') {
        const link = document.createElement('a'); link.download = `PULSE_${viewMode}.png`; link.href = imgData; link.click();
      } else {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const ratio = pageWidth / (canvas.width / 2);
        pdf.addImage(imgData, 'PNG', 0, 10, pageWidth, (canvas.height / 2) * ratio);
        pdf.save(`PULSE_${viewMode}.pdf`);
      }
    } catch (err) { console.error(err); } finally { setExporting(null); }
  };

  return (
    <div className="space-y-12 lg:space-y-16 pb-10">
      <div className="flex justify-center -mb-8">
        <div className="bg-white p-1.5 rounded-3xl shadow-2xl border border-slate-100 flex gap-2">
           <button onClick={() => setViewMode('donations')} className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${viewMode === 'donations' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-slate-400 hover:bg-slate-50'}`}>
             <Activity size={16}/> Prélèvements
           </button>
           <button onClick={() => setViewMode('distribution')} className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${viewMode === 'distribution' ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' : 'text-slate-400 hover:bg-slate-50'}`}>
             <Truck size={16}/> Distribution
           </button>
        </div>
      </div>

      <div className="glass-card p-4 rounded-[2.5rem] flex flex-wrap items-center justify-between gap-6 shadow-xl relative overflow-hidden mt-12">
        {!isConnected && (
          <div className="absolute inset-0 bg-emerald-600/10 backdrop-blur-[2px] z-10 flex items-center justify-center pointer-events-none">
            <div className="bg-emerald-600 text-white px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest animate-pulse pointer-events-auto cursor-pointer" onClick={onLoginClick}>
              Cockpit Restreint (Connexion Requise)
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-5 px-4">
           <div className={`w-12 h-12 text-white rounded-2xl flex items-center justify-center shadow-lg ${viewMode === 'donations' ? 'bg-emerald-600' : 'bg-orange-600'}`}>
             <Filter size={20} />
           </div>
           <div><h3 className="text-base font-black uppercase tracking-tighter text-slate-800">Flux Vital</h3><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Séquence temporelle</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
           <div className="bg-slate-100 border border-slate-200 rounded-2xl px-5 py-3 flex items-center gap-3">
             <Calendar size={14} className="text-emerald-500" />
             <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent outline-none text-[11px] font-black uppercase tracking-widest cursor-pointer text-slate-800">
               {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
             </select>
           </div>
           <div className="bg-slate-100 border border-slate-200 rounded-2xl px-5 py-3 flex items-center gap-3">
             <Waves size={14} className="text-orange-500" />
             <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="bg-transparent outline-none text-[11px] font-black uppercase tracking-widest cursor-pointer text-slate-800">
               {availableMonths.map(m => <option key={m} value={m}>{MONTHS_FR[m]}</option>)}
             </select>
           </div>
           <div className="bg-slate-900 border border-white/10 rounded-2xl px-6 py-3 flex items-center gap-3 shadow-2xl mr-2">
             <Activity size={14} className={viewMode === 'donations' ? "text-emerald-500" : "text-orange-500"} />
             <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="bg-transparent outline-none text-[11px] font-black uppercase tracking-widest cursor-pointer text-white">
               {availableDays.map(d => <option key={d} value={d}>{d}</option>)}
             </select>
           </div>
           <div className="flex gap-2">
             <button onClick={() => handleExport('image')} disabled={!!exporting} className="p-3 bg-slate-100 text-slate-800 rounded-xl hover:bg-slate-200 transition-all shadow-sm">
               {exporting === 'image' ? <Loader2 size={16} className="animate-spin" /> : <FileImage size={16} />}
             </button>
           </div>
        </div>
      </div>

      <div ref={pulseRef} className="space-y-12 lg:space-y-16">
        <div className={`relative overflow-hidden rounded-[4.5rem] p-12 lg:p-20 text-white shadow-3xl border border-white/5 transition-colors duration-700 ${viewMode === 'donations' ? 'bg-[#0f172a]' : 'bg-[#1e1b4b]'}`}>
          <div className="absolute inset-0 opacity-30 pointer-events-none overflow-hidden">
            <svg width="100%" height="100%" viewBox="0 0 800 400" preserveAspectRatio="none">
              <path d={`M0 200 L 150 200 L 170 120 L 190 280 L 210 200 L 400 200 L 420 40 L 440 360 L 460 200 L 650 200 L 670 180 L 690 220 L 710 200 L 800 200`}
                fill="none" stroke={nationalPulseColor} strokeWidth="5" strokeDasharray="1000" strokeDashoffset={1000 - (pulsePhase * 10)}
                className="transition-all duration-300" style={{ filter: `drop-shadow(0 0 10px ${nationalPulseColor})` }} />
            </svg>
          </div>
          <div className="relative z-10 flex flex-col lg:flex-row items-center gap-20">
            <div className="relative animate-float">
              <div className="w-72 h-72 rounded-full border-[15px] flex items-center justify-center transition-all duration-700 shadow-[0_0_80px_rgba(255,255,255,0.05)]" style={{ borderColor: `${nationalPulseColor}22` }}>
                <div className="absolute inset-0 rounded-full animate-ping opacity-10" style={{ backgroundColor: nationalPulseColor }}></div>
                <div className="text-center">
                    {viewMode === 'donations' ? <Heart size={70} className="mx-auto mb-3 fill-current" style={{ color: nationalPulseColor }} /> : <Truck size={70} className="mx-auto mb-3" style={{ color: nationalPulseColor }} />}
                    <p className="text-7xl font-black tracking-tighter text-white">{perfDaily.toFixed(1)}%</p>
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40 mt-2">{viewMode === 'donations' ? 'Vitalité Nationale' : 'Utilisation Nette'}</p>
                </div>
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="144" cy="144" r="136" fill="none" stroke={nationalPulseColor} strokeWidth="15" strokeDasharray="854" strokeDashoffset={854 - (854 * Math.min(perfDaily, 100)) / 100} strokeLinecap="round" className="transition-all duration-1000"/>
                </svg>
              </div>
            </div>
            <div className="flex-1 space-y-12 text-center lg:text-left">
              <h2 className="text-6xl font-black uppercase tracking-tighter leading-none mb-4">{viewMode === 'donations' ? 'PRELEVEMENTS NATIONAUX' : 'DISTRIBUTION NATIONALE'}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                {viewMode === 'donations' ? (
                  <>
                    <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 text-center">
                      <p className="text-[10px] font-black text-emerald-400 uppercase mb-4 tracking-widest">SITES FIXES</p>
                      <div className="flex flex-col items-center">
                        <p className="text-5xl font-black">{dayRecord?.stats.fixed || 0}</p>
                        <p className="text-[10px] font-bold text-white/20 uppercase mt-2">Cible : {dayObjectives.fixed}</p>
                      </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 text-center">
                      <p className="text-[10px] font-black text-orange-400 uppercase mb-4 tracking-widest">UNITÉS MOBILES</p>
                      <div className="flex flex-col items-center">
                        <p className="text-5xl font-black">{dayRecord?.stats.mobile || 0}</p>
                        <p className="text-[10px] font-bold text-white/20 uppercase mt-2">Cible : {dayObjectives.mobile}</p>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-8 rounded-[3rem] border border-white/20 text-center shadow-xl">
                      <p className="text-[10px] font-black text-white/60 uppercase mb-4 tracking-widest">TOTAL JOUR</p>
                      <div className="flex flex-col items-center">
                        <p className="text-5xl font-black text-white">{(dayRecord?.stats.realized || 0).toLocaleString()}</p>
                        <p className="text-[10px] font-black text-white/40 uppercase mt-2">Objectif : {dayObjectives.total}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 text-center"><p className="text-[10px] font-black text-orange-400 uppercase mb-4 tracking-widest">EXPÉDIÉ BRUT</p><p className="text-5xl font-black">{distDayStats.qty.toLocaleString()}</p></div>
                    <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 text-center"><p className="text-[10px] font-black text-red-400 uppercase mb-4 tracking-widest">RENDUS / PERIMÉS</p><p className="text-5xl font-black">{distDayStats.rendu.toLocaleString()}</p></div>
                    <div className="bg-gradient-to-br from-orange-600 to-orange-800 p-8 rounded-[3rem] border border-white/20 text-center shadow-xl"><p className="text-[10px] font-black text-white/60 uppercase mb-4 tracking-widest">SORTIES NETTES</p><p className="text-5xl font-black text-white">{(distDayStats.qty - distDayStats.rendu).toLocaleString()}</p></div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
