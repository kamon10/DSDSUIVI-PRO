
import React, { useMemo, useEffect, useState, useRef } from 'react';
import { DashboardData } from '../types';
import { Activity, Zap, Flame, Waves, Heart, Target, Trophy, Calendar, Filter, Star, FileImage, FileText, Loader2, User } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const getDynamicColor = (perf: number) => {
  if (perf > 100) return '#10b981';
  if (perf === 100) return '#f59e0b';
  if (perf >= 90) return '#fb923c';
  if (perf >= 75) return '#f97316';
  if (perf >= 50) return '#ea580c';
  return '#ef4444';
};

interface PulsePerformanceProps {
  data: DashboardData;
  onLoginClick?: () => void;
  isConnected?: boolean;
}

export const PulsePerformance: React.FC<PulsePerformanceProps> = ({ data, onLoginClick, isConnected }) => {
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

  const { perfDaily, bestSite, top5Sites } = useMemo(() => {
    if (!dayRecord) return { perfDaily: 0, bestSite: null, top5Sites: [] };
    const realized = dayRecord.stats.realized;
    const objective = 1137; 
    const sitesWithPerf = dayRecord.sites.map(s => ({
      ...s,
      perf: s.objective > 0 ? (s.total / s.objective) * 100 : 0
    }));
    const best = [...sitesWithPerf].sort((a, b) => b.total - a.total)[0] || null;
    const top5 = [...sitesWithPerf].sort((a, b) => b.perf - a.perf).slice(0, 5);
    return { perfDaily: (realized / objective) * 100, bestSite: best, top5Sites: top5 };
  }, [dayRecord]);

  const nationalPulseColor = useMemo(() => getDynamicColor(perfDaily), [perfDaily]);

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
    <div className="space-y-16 lg:space-y-20 pb-10">
      <div className="glass-card p-4 rounded-[2.5rem] flex flex-wrap items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        {!isConnected && (
          <div className="absolute inset-0 bg-red-600/10 backdrop-blur-[2px] z-10 flex items-center justify-center pointer-events-none">
            <div className="bg-red-600 text-white px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest animate-pulse pointer-events-auto cursor-pointer" onClick={onLoginClick}>
              Connectez-vous pour déverrouiller le cockpit complet
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-5 px-4">
           <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
             <Filter size={20} />
           </div>
           <div>
             <h3 className="text-base font-black uppercase tracking-tighter text-slate-800">Sélecteur de Flux</h3>
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Voyage temporel CNTS</p>
           </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
           <div className="bg-white/5 border border-white/80 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-3">
             <Calendar size={14} className="text-blue-500" />
             <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent outline-none text-[11px] font-black uppercase tracking-widest cursor-pointer text-slate-800">
               {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
             </select>
           </div>
           <div className="bg-white/5 border border-white/80 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-3">
             <Waves size={14} className="text-orange-500" />
             <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="bg-transparent outline-none text-[11px] font-black uppercase tracking-widest cursor-pointer text-slate-800">
               {availableMonths.map(m => <option key={m} value={m}>{MONTHS_FR[m]}</option>)}
             </select>
           </div>
           <div className="bg-slate-900 border border-white/10 rounded-2xl px-6 py-3 flex items-center gap-3 shadow-2xl mr-2">
             <Activity size={14} className="text-red-500" />
             <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="bg-transparent outline-none text-[11px] font-black uppercase tracking-widest cursor-pointer text-white">
               {availableDays.map(d => <option key={d} value={d} className="text-slate-900">{d}</option>)}
             </select>
           </div>
           <div className="flex gap-2">
             <button onClick={() => handleExport('image')} disabled={!!exporting} className="p-3 bg-slate-100 text-slate-800 rounded-xl hover:bg-slate-200 transition-all shadow-sm">
               {exporting === 'image' ? <Loader2 size={16} className="animate-spin" /> : <FileImage size={16} />}
             </button>
             <button onClick={() => handleExport('pdf')} disabled={!!exporting} className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-md shadow-red-100">
               {exporting === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
             </button>
             {!isConnected && (
               <button onClick={onLoginClick} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-xl">
                 <User size={14} /> Accéder au Cockpit
               </button>
             )}
           </div>
        </div>
      </div>

      <div ref={pulseRef} className="space-y-12 lg:space-y-16">
        <div className="relative overflow-hidden bg-[#0f172a] rounded-[4.5rem] p-12 lg:p-20 text-white shadow-3xl border border-white/5">
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
                    <Heart size={70} className="mx-auto mb-3 fill-current transition-transform duration-300" style={{ color: nationalPulseColor, transform: `scale(${1 + (pulsePhase % 12) / 40})` }} />
                    <p className="text-7xl font-black tracking-tighter text-white">{perfDaily.toFixed(1)}%</p>
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40 mt-2">VITALITÉ NATIONALE</p>
                </div>
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="144" cy="144" r="136" fill="none" stroke={nationalPulseColor} strokeWidth="15" strokeDasharray="854" strokeDashoffset={854 - (854 * Math.min(perfDaily, 100)) / 100} strokeLinecap="round" className="transition-all duration-1000"/>
                </svg>
              </div>
            </div>
            <div className="flex-1 space-y-12 text-center lg:text-left">
              <div>
                <h2 className="text-6xl font-black uppercase tracking-tighter leading-none mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/40">Rythme National</h2>
                <p className="text-white/40 font-black uppercase tracking-[0.6em] text-[10px] flex items-center justify-center lg:justify-start gap-3">
                  <Activity size={16} className="text-red-500 animate-pulse" /> STATUT GÉNÉRAL DU {selectedDay}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-2xl group transition-all hover:bg-white/10 hover:scale-105 text-center">
                    <p className="text-[10px] font-black text-blue-400 uppercase mb-4 tracking-widest flex items-center justify-center gap-3"><Zap size={16}/> SITES FIXES</p>
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
                <div className="bg-gradient-to-br from-red-600 to-orange-600 p-8 rounded-[3rem] border border-white/20 shadow-2xl group transition-all hover:scale-105 text-center">
                    <p className="text-[10px] font-black text-white/60 uppercase mb-4 tracking-widest flex items-center justify-center gap-3"><Target size={16}/> TOTAL JOUR</p>
                    <div className="flex items-baseline justify-center gap-3">
                      <span className="text-5xl font-black text-white">{(dayRecord?.stats.realized || 0).toLocaleString()}</span>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
