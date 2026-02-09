
import React, { useMemo, useEffect, useState, useRef } from 'react';
import { DashboardData, DistributionRecord } from '../types';
import { Activity, Zap, Flame, Waves, Heart, Target, Trophy, Calendar, Filter, Star, FileImage, FileText, Loader2, User, Truck, Package } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { COLORS } from '../constants';

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const getDynamicColor = (perf: number) => {
  if (perf > 100) return '#10b981';
  if (perf === 100) return '#10b981';
  if (perf >= 90) return '#10b981';
  if (perf >= 75) return '#f59e0b';
  if (perf >= 50) return '#f97316';
  return '#ef4444';
};

const getDistColor = (eff: number) => {
  if (eff >= 98) return '#10b981';
  if (eff >= 95) return '#f59e0b';
  return '#f97316';
};

interface PulsePerformanceProps {
  data: DashboardData;
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
      const year = h.date.split('/')[2];
      if (year) years.add(year);
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [data.dailyHistory]);

  const [selectedYear, setSelectedYear] = useState(availableYears[0] || data.year.toString());

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

  const distDayStats = useMemo(() => {
    if (!data.distributions?.records) return { qty: 0, efficiency: 0, rendu: 0 };
    const dayRecs = data.distributions.records.filter(r => r.date === selectedDay);
    const qty = dayRecs.reduce((acc, r) => acc + r.quantite, 0);
    const rendu = dayRecs.reduce((acc, r) => acc + r.rendu, 0);
    return {
      qty,
      rendu,
      efficiency: qty > 0 ? ((qty - rendu) / qty) * 100 : 0
    };
  }, [data.distributions, selectedDay]);

  const perfDaily = useMemo(() => {
    if (viewMode === 'donations') {
      const realized = dayRecord?.stats.realized || 0;
      return (realized / 1137) * 100;
    } else {
      return distDayStats.efficiency;
    }
  }, [viewMode, dayRecord, distDayStats]);

  const nationalPulseColor = useMemo(() => 
    viewMode === 'donations' ? getDynamicColor(perfDaily) : getDistColor(perfDaily)
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
      const element = pulseRef.current;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#f8fafc' });
      const imgData = canvas.toDataURL('image/png', 1.0);
      if (type === 'image') {
        const link = document.createElement('a');
        link.download = `PULSE_CNTS_${selectedDay.replace(/\//g, '-')}.png`;
        link.href = imgData;
        link.click();
      } else {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth(); 
        const ratio = pageWidth / (canvas.width / 2);
        pdf.addImage(imgData, 'PNG', 0, 10, pageWidth, (canvas.height / 2) * ratio);
        pdf.save(`PULSE_CNTS_${selectedDay.replace(/\//g, '-')}.pdf`);
      }
    } catch (err) { console.error(err); } finally { setExporting(null); }
  };

  return (
    <div className="space-y-12 pb-10">
      
      {/* BANDE DES SÉLECTEURS DE FLUX UNIFIÉE */}
      <div className="glass-card p-2 rounded-[2.5rem] flex flex-wrap items-center justify-between gap-4 shadow-2xl relative overflow-hidden transition-all border-l-8" style={{ borderLeftColor: nationalPulseColor }}>
        {!isConnected && (
          <div className="absolute inset-0 bg-emerald-600/10 backdrop-blur-[2px] z-10 flex items-center justify-center pointer-events-none">
            <div className="bg-emerald-600 text-white px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest animate-pulse pointer-events-auto cursor-pointer" onClick={onLoginClick}>
              Connectez-vous pour déverrouiller le cockpit complet
            </div>
          </div>
        )}
        
        {/* Palette de Mode Intégrée */}
        <div className="flex bg-slate-100 p-1.5 rounded-3xl gap-1.5 ml-2">
           <button onClick={() => setViewMode('donations')} className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'donations' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
             <Activity size={14}/> Collecte
           </button>
           <button onClick={() => setViewMode('distribution')} className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'distribution' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
             <Truck size={14}/> Sortie
           </button>
        </div>

        {/* Filtres Temporels */}
        <div className="flex flex-wrap items-center gap-2 flex-1 justify-center">
           <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 flex items-center gap-2">
             <Calendar size={12} className="text-slate-400" />
             <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent outline-none text-[10px] font-black uppercase tracking-widest cursor-pointer text-slate-800">
               {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
             </select>
           </div>
           <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 flex items-center gap-2">
             <Waves size={12} className="text-slate-400" />
             <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="bg-transparent outline-none text-[10px] font-black uppercase tracking-widest cursor-pointer text-slate-800">
               {availableMonths.map(m => <option key={m} value={m}>{MONTHS_FR[m]}</option>)}
             </select>
           </div>
           <div className="bg-slate-900 border border-white/10 rounded-2xl px-5 py-2.5 flex items-center gap-3 shadow-xl">
             <Activity size={12} className={viewMode === 'donations' ? "text-emerald-500" : "text-orange-500"} />
             <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="bg-transparent outline-none text-[10px] font-black uppercase tracking-widest cursor-pointer text-white">
               {availableDays.map(d => <option key={d} value={d}>{d}</option>)}
             </select>
           </div>
        </div>

        {/* Exports */}
        <div className="flex gap-2 mr-2">
           <button onClick={() => handleExport('image')} disabled={!!exporting} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm">
             {exporting === 'image' ? <Loader2 size={16} className="animate-spin" /> : <FileImage size={16} />}
           </button>
           <button onClick={() => handleExport('pdf')} disabled={!!exporting} className={`p-3 text-white rounded-xl transition-all shadow-md ${viewMode === 'donations' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
             {exporting === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
           </button>
        </div>
      </div>

      <div ref={pulseRef} className="space-y-12 lg:space-y-16">
        <div className={`relative overflow-hidden rounded-[4.5rem] p-12 lg:p-20 text-white shadow-3xl border border-white/5 transition-colors duration-700 ${viewMode === 'donations' ? 'bg-[#0f172a]' : 'bg-[#1e1b4b]'}`}>
          <div className="absolute inset-0 opacity-30 pointer-events-none overflow-hidden">
            <svg width="100%" height="100%" viewBox="0 0 800 400" preserveAspectRatio="none">
              <path 
                d={`M0 200 L 150 200 L 170 120 L 190 280 L 210 200 L 400 200 L 420 40 L 440 360 L 460 200 L 650 200 L 670 180 L 690 220 L 710 200 L 800 200`}
                fill="none" stroke={nationalPulseColor} strokeWidth="5" strokeDasharray="1000" strokeDashoffset={1000 - (pulsePhase * 10)}
                className="transition-all duration-300" style={{ filter: `drop-shadow(0 0 10px ${nationalPulseColor})` }}
              />
            </svg>
          </div>
          <div className="relative z-10 flex flex-col lg:flex-row items-center gap-20">
            <div className="relative animate-float">
              <div className={`w-72 h-72 rounded-full border-[15px] flex items-center justify-center transition-all duration-700 shadow-[0_0_80px_rgba(255,255,255,0.05)]`} style={{ borderColor: `${nationalPulseColor}22` }}>
                <div className="absolute inset-0 rounded-full animate-ping opacity-10" style={{ backgroundColor: nationalPulseColor }}></div>
                <div className="text-center">
                    {viewMode === 'donations' ? (
                      <Heart size={70} className="mx-auto mb-3 fill-current transition-transform duration-300" style={{ color: nationalPulseColor, transform: `scale(${1 + (pulsePhase % 12) / 40})` }} />
                    ) : (
                      <Truck size={70} className="mx-auto mb-3 transition-transform duration-300" style={{ color: nationalPulseColor, transform: `scale(${1 + (pulsePhase % 12) / 40})` }} />
                    )}
                    <p className="text-7xl font-black tracking-tighter text-white">{perfDaily.toFixed(1)}%</p>
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40 mt-2">{viewMode === 'donations' ? 'VITALITÉ NATIONALE' : 'UTILISATION NETTE'}</p>
                </div>
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="144" cy="144" r="136" fill="none" stroke={nationalPulseColor} strokeWidth="15" strokeDasharray="854" strokeDashoffset={854 - (854 * Math.min(perfDaily, 100)) / 100} strokeLinecap="round" className="transition-all duration-1000"/>
                </svg>
              </div>
            </div>
            <div className="flex-1 space-y-12 text-center lg:text-left">
              <div>
                <h2 className="text-6xl font-black uppercase tracking-tighter leading-none mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/40">{viewMode === 'donations' ? 'Rythme National' : 'Flux de Sortie'}</h2>
                <p className="text-white/40 font-black uppercase tracking-[0.6em] text-[10px] flex items-center justify-center lg:justify-start gap-3">
                  <Activity size={16} className={`${viewMode === 'donations' ? 'text-emerald-500' : 'text-orange-500'} animate-pulse`} /> {viewMode === 'donations' ? 'STATUT GÉNÉRAL DU' : 'DISTRIBUTION DU'} {selectedDay}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                {viewMode === 'donations' ? (
                  <>
                    <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-2xl group transition-all hover:bg-white/10 hover:scale-105 text-center">
                        <p className="text-[10px] font-black text-emerald-400 uppercase mb-4 tracking-widest flex items-center justify-center gap-3"><Zap size={16}/> SITES FIXES</p>
                        <div className="flex items-baseline justify-center gap-3">
                          <span className="text-5xl font-black">{dayRecord?.stats.fixed || 0}</span>
                        </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-2xl group transition-all hover:bg-white/10 hover:scale-105 text-center">
                        <p className="text-[10px] font-black text-orange-400 uppercase mb-4 tracking-widest flex items-center justify-center gap-3"><Flame size={16}/> UNITÉS MOBILES</p>
                        <div className="flex items-baseline justify-center gap-3">
                          <span className="text-5xl font-black">{dayRecord?.stats.mobile || 0}</span>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-8 rounded-[3rem] border border-white/20 shadow-2xl group transition-all hover:scale-105 text-center">
                        <p className="text-[10px] font-black text-white/60 uppercase mb-4 tracking-widest flex items-center justify-center gap-3"><Target size={16}/> TOTAL JOUR</p>
                        <div className="flex items-baseline justify-center gap-3">
                          <span className="text-5xl font-black text-white">{(dayRecord?.stats.realized || 0).toLocaleString()}</span>
                        </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-2xl group transition-all hover:bg-white/10 hover:scale-105 text-center">
                        <p className="text-[10px] font-black text-orange-400 uppercase mb-4 tracking-widest flex items-center justify-center gap-3"><Package size={16}/> VOLUME EXPÉDIÉ</p>
                        <div className="flex items-baseline justify-center gap-3">
                          <span className="text-5xl font-black">{distDayStats.qty.toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-2xl group transition-all hover:bg-white/10 hover:scale-105 text-center">
                        <p className="text-[10px] font-black text-red-400 uppercase mb-4 tracking-widest flex items-center justify-center gap-3"><Waves size={16}/> RENDUS / PERIMÉS</p>
                        <div className="flex items-baseline justify-center gap-3">
                          <span className="text-5xl font-black">{distDayStats.rendu.toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-600 to-orange-800 p-8 rounded-[3rem] border border-white/20 shadow-2xl group transition-all hover:scale-105 text-center">
                        <p className="text-[10px] font-black text-white/60 uppercase mb-4 tracking-widest flex items-center justify-center gap-3"><Activity size={16}/> UTILISATION</p>
                        <div className="flex items-baseline justify-center gap-3">
                          <span className="text-5xl font-black text-white">{(distDayStats.qty - distDayStats.rendu).toLocaleString()}</span>
                        </div>
                    </div>
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
