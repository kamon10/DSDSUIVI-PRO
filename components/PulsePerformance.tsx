import React, { useMemo, useEffect, useState, useRef } from 'react';
import { DashboardData } from '../types';
import { Activity, Zap, Flame, Waves, Heart, Target, Trophy, Calendar, Filter, Star, FileImage, FileText, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const getDynamicColor = (perf: number) => {
  if (perf > 100) return '#10b981'; // Vert (Objectif dépassé)
  if (perf === 100) return '#f59e0b'; // Orange (Objectif atteint)
  if (perf >= 90) return '#fb923c';  // Orange corail
  if (perf >= 75) return '#f97316';  // Orange vif
  if (perf >= 50) return '#ea580c';  // Rouge-Orange
  return '#ef4444';                  // Rouge alerte
};

export const PulsePerformance: React.FC<{ data: DashboardData }> = ({ data }) => {
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

    return { 
      perfDaily: (realized / objective) * 100, 
      bestSite: best,
      top5Sites: top5
    };
  }, [dayRecord]);

  const nationalPulseColor = useMemo(() => getDynamicColor(perfDaily), [perfDaily]);
  const championPulseColor = useMemo(() => bestSite ? getDynamicColor(bestSite.perf) : '#f59e0b', [bestSite]);

  const isHealthy = perfDaily >= 100;

  useEffect(() => {
    const interval = setInterval(() => {
      setPulsePhase(p => (p + 1) % 100);
    }, 40);
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
    } catch (err) { console.error("Export Pulse Error:", err); } finally { setExporting(null); }
  };

  return (
    <div className="space-y-16 lg:space-y-20 pb-10">
      <div className="glass-card p-4 rounded-[2.5rem] flex flex-wrap items-center justify-between gap-6 shadow-xl">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="glass-card rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full -mr-32 -mt-32"></div>
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-2xl">
                  <Trophy size={28} />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Cibles de Vitalité</h3>
              </div>
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Top 5 Performance %</div>
            </div>
            <div className="space-y-8">
              {top5Sites.map((site, i) => {
                const sColor = getDynamicColor(site.perf);
                return (
                  <div key={i} className="relative group">
                    <div className="flex justify-between items-end mb-3 px-2">
                      <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-slate-300">{i+1}</span>
                          <span className="text-sm font-black" style={{ color: sColor }}>{site.perf.toFixed(1)}%</span>
                          <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{site.name}</span>
                      </div>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-50 shadow-inner">
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(site.perf, 100)}%`, backgroundColor: sColor }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-900 rounded-[3.5rem] p-12 shadow-3xl text-white relative overflow-hidden border border-white/5">
            <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full blur-[100px]" style={{ backgroundColor: `${championPulseColor}11` }}></div>
            <div className="flex items-center gap-5 mb-10">
                <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-red-900/50">
                  <Activity size={28} />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tighter">CHAMPION DU JOUR</h3>
            </div>
            {bestSite && (
              <div className="bg-white/5 rounded-[2.5rem] p-8 border border-white/10 shadow-inner overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 text-slate-900 rounded-2xl flex items-center justify-center shadow-2xl transition-colors duration-1000 shrink-0" style={{ backgroundColor: championPulseColor }}>
                      <Star size={32} />
                    </div>
                    <div>
                      <div className="flex items-center gap-4">
                         <span className="text-4xl font-black transition-colors duration-1000" style={{ color: championPulseColor }}>{bestSite.perf.toFixed(1)}%</span>
                         <h4 className="text-2xl font-black uppercase tracking-tighter text-white leading-none">{bestSite.name}</h4>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative w-full h-4 bg-white/5 rounded-full mb-14 mt-10">
                  <div className={`h-full transition-all duration-1000 rounded-full relative ${bestSite.perf >= 100 ? 'animate-pulse' : ''}`} style={{ width: `${Math.min((bestSite.perf / 125) * 100, 100)}%`, backgroundColor: championPulseColor, boxShadow: `0 0 20px ${championPulseColor}66` }}>
                     <div className="absolute top-0 right-0 translate-x-1/2 -translate-y-[130%] flex flex-col items-center">
                        <div className="px-2 py-1 rounded-xl bg-emerald-600 border shadow-xl flex items-center" style={{ borderColor: 'white' }}>
                           <span className="text-xs font-black text-white">{bestSite.total}</span>
                        </div>
                        <div className="w-px h-3 bg-white/40 mt-1"></div>
                     </div>
                  </div>
                  <div className="absolute top-0 left-[80%] h-full w-0.5 bg-white/60 z-10 shadow-[0_0_8px_white]">
                     <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex flex-col items-center">
                       <div className="w-px h-10 bg-white/30 mb-1"></div>
                       <span className="text-[10px] font-black text-white bg-orange-500 px-2 py-0.5 rounded border border-white/10">{bestSite.objective}</span>
                     </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 pt-4">
                    <div className="bg-white/5 p-4 rounded-2xl text-center border border-white/5"><p className="text-[8px] font-black text-white/30 uppercase mb-1">Fixe</p><p className="text-xl font-black text-emerald-400">{bestSite.fixe}</p></div>
                    <div className="bg-white/5 p-4 rounded-2xl text-center border border-white/5"><p className="text-[8px] font-black text-white/30 uppercase mb-1">Mobile</p><p className="text-xl font-black text-orange-400">{bestSite.mobile}</p></div>
                    <div className="bg-white/10 p-4 rounded-2xl text-center border border-white/10"><p className="text-[8px] font-black text-white/30 uppercase mb-1">Total</p><p className="text-xl font-black text-white">{bestSite.total}</p></div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-6 mt-8">
              <div className="p-6 bg-white/5 rounded-3xl border border-white/10 text-center">
                  <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mb-2">TENSION</p>
                  <p className={`text-xl font-black transition-colors duration-1000 ${isHealthy ? 'text-emerald-400' : 'text-orange-400 uppercase'}`}>{isHealthy ? 'STABLE' : 'VARIABLE'}</p>
              </div>
              <div className="p-6 bg-white/5 rounded-3xl border border-white/10 text-center">
                  <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mb-2">VITALITÉ IA</p>
                  <p className="text-xl font-black transition-colors duration-1000" style={{ color: nationalPulseColor }}>{perfDaily.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};