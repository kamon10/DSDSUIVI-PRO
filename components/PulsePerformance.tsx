
import React, { useMemo, useEffect, useState } from 'react';
import { DashboardData } from '../types';
import { Activity, Zap, TrendingUp, Flame, Waves, Heart, Target, AlertCircle, PlusCircle, Award, Trophy, Calendar, ChevronDown, Filter } from 'lucide-react';
import { COLORS } from '../constants';

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export const PulsePerformance: React.FC<{ data: DashboardData }> = ({ data }) => {
  const [pulsePhase, setPulsePhase] = useState(0);

  // --- LOGIQUE DE SÉLECTION TEMPORELLE ---
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

  // Reset selected day if month/year changes
  useEffect(() => {
    if (availableDays.length > 0 && !availableDays.includes(selectedDay)) {
      setSelectedDay(availableDays[0]);
    }
  }, [availableDays, selectedDay]);

  // --- EXTRACTION DES DONNÉES DU JOUR SÉLECTIONNÉ ---
  const dayRecord = useMemo(() => 
    data.dailyHistory.find(h => h.date === selectedDay) || data.dailyHistory[0]
  , [selectedDay, data.dailyHistory]);

  // --- CALCULS DE PERFORMANCE ---
  const perfDaily = useMemo(() => {
    if (!dayRecord) return 0;
    const realized = dayRecord.stats.realized;
    // On utilise l'objectif global de la data principale pour la vitalité
    const objective = data.daily.objective || 1; 
    return (realized / objective) * 100;
  }, [dayRecord, data.daily.objective]);

  const isHealthy = perfDaily >= 100;
  const isStruggling = perfDaily < 70;
  const pulseColor = isHealthy ? COLORS.green : isStruggling ? COLORS.red : COLORS.orange;

  // Calculer les régions pour le mois sélectionné
  const sortedRegionsForMonth = useMemo(() => {
    const regionalTotals = new Map<string, { total: number, obj: number }>();
    
    // Filtrer l'historique pour le mois sélectionné
    data.dailyHistory.filter(h => {
      const parts = h.date.split('/');
      return parts[2] === selectedYear && (parseInt(parts[1]) - 1) === selectedMonth;
    }).forEach(day => {
      day.sites.forEach(site => {
        const reg = site.region || "AUTRES SITES";
        if (!regionalTotals.has(reg)) {
          regionalTotals.set(reg, { total: 0, obj: 0 });
        }
        const current = regionalTotals.get(reg)!;
        current.total += site.total;
        current.obj += site.objective * 26; // Approximation mensuelle de l'objectif
      });
    });

    return Array.from(regionalTotals.entries()).map(([name, stats]) => ({
      name,
      percentage: stats.obj > 0 ? (stats.total / stats.obj) * 100 : 0,
      total: stats.total
    })).sort((a, b) => b.percentage - a.percentage);
  }, [data.dailyHistory, selectedYear, selectedMonth]);

  const siteChampion = useMemo(() => {
    if (!dayRecord) return null;
    const sitesWithPerf = dayRecord.sites.map(s => ({
      ...s,
      perf: s.objective > 0 ? (s.total / s.objective) * 100 : 0
    }));
    return sitesWithPerf.sort((a, b) => b.perf - a.perf)[0];
  }, [dayRecord]);

  // Animation heartbeat effect
  useEffect(() => {
    const interval = setInterval(() => {
      setPulsePhase(p => (p + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-1000">
      
      {/* TOOLBAR SÉLECTION MOIS/JOUR */}
      <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
             <Filter size={18} />
           </div>
           <div>
             <h3 className="text-sm font-black uppercase tracking-tight text-slate-800">Sélecteur de Rythme</h3>
             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Voyage dans l'historique Pulse</p>
           </div>
        </div>

        <div className="flex flex-wrap gap-2">
           <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-2">
             <Calendar size={14} className="text-blue-500" />
             <select 
               value={selectedYear} 
               onChange={(e) => setSelectedYear(e.target.value)} 
               className="bg-transparent outline-none text-[10px] font-black uppercase tracking-widest cursor-pointer text-slate-700"
             >
               {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
             </select>
           </div>
           
           <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-2">
             <Waves size={14} className="text-orange-500" />
             <select 
               value={selectedMonth} 
               onChange={(e) => setSelectedMonth(parseInt(e.target.value))} 
               className="bg-transparent outline-none text-[10px] font-black uppercase tracking-widest cursor-pointer text-slate-700"
             >
               {availableMonths.map(m => <option key={m} value={m}>{MONTHS_FR[m]}</option>)}
             </select>
           </div>

           <div className="bg-blue-600 border border-blue-500 rounded-xl px-6 py-2 flex items-center gap-2 shadow-lg shadow-blue-100">
             <Activity size={14} className="text-white" />
             <select 
               value={selectedDay} 
               onChange={(e) => setSelectedDay(e.target.value)} 
               className="bg-transparent outline-none text-[10px] font-black uppercase tracking-widest cursor-pointer text-white"
             >
               {availableDays.map(d => <option key={d} value={d} className="text-slate-900">{d}</option>)}
             </select>
           </div>
        </div>
      </div>

      {/* CENTRAL PULSE UNIT */}
      <div className="relative overflow-hidden bg-[#0f172a] rounded-[4rem] p-10 lg:p-16 text-white shadow-3xl border border-white/5">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
           <svg width="100%" height="100%" viewBox="0 0 800 400" preserveAspectRatio="none">
             <path 
               d={`M0 200 L 100 200 L 120 150 L 140 250 L 160 200 L 300 200 L 320 50 L 340 350 L 360 200 L 500 200 L 520 180 L 540 220 L 560 200 L 800 200`}
               fill="none"
               stroke={pulseColor}
               strokeWidth="4"
               strokeDasharray="1000"
               strokeDashoffset={1000 - (pulsePhase * 10)}
               className="transition-all duration-300"
             />
           </svg>
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-16">
          <div className="relative">
            <div className={`w-64 h-64 rounded-full border-[12px] flex items-center justify-center transition-all duration-500 shadow-[0_0_50px_rgba(255,255,255,0.05)]`} style={{ borderColor: `${pulseColor}22` }}>
               <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: pulseColor }}></div>
               <div className="text-center">
                  <Heart size={60} className="mx-auto mb-2 fill-current transition-transform duration-300 scale-110" style={{ color: pulseColor, transform: `scale(${1 + (pulsePhase % 10) / 40})` }} />
                  <p className="text-6xl font-black tracking-tighter">{perfDaily.toFixed(0)}%</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Vitalité {selectedDay.split('/')[0]}/{selectedDay.split('/')[1]}</p>
               </div>
               {/* Progress Ring */}
               <svg className="absolute inset-0 w-full h-full -rotate-90">
                 <circle 
                   cx="128" cy="128" r="122" 
                   fill="none" 
                   stroke={pulseColor} 
                   strokeWidth="12" 
                   strokeDasharray="766" 
                   strokeDashoffset={766 - (766 * Math.min(perfDaily, 100)) / 100}
                   strokeLinecap="round"
                   className="transition-all duration-1000"
                 />
               </svg>
            </div>
          </div>

          <div className="flex-1 space-y-10">
            <div>
              <h2 className="text-5xl font-black uppercase tracking-tighter leading-none mb-3">Rythme National</h2>
              <p className="text-white/40 font-black uppercase tracking-[0.4em] text-[10px] flex items-center gap-2">
                <Waves size={14} className="animate-pulse" /> État des Prélèvements du {selectedDay}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
               <div className="bg-white/5 backdrop-blur-md p-6 lg:p-8 rounded-[2.5rem] border border-white/10 shadow-inner group transition-all hover:bg-white/10">
                  <p className="text-[9px] font-black text-blue-400 uppercase mb-3 tracking-widest flex items-center gap-2 leading-none"><Zap size={14}/> Potentiel Fixe</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black">{dayRecord?.stats.fixed || 0}</span>
                    <span className="text-white/20 text-[10px] font-black uppercase">poches</span>
                  </div>
               </div>
               <div className="bg-white/5 backdrop-blur-md p-6 lg:p-8 rounded-[2.5rem] border border-white/10 shadow-inner group transition-all hover:bg-white/10">
                  <p className="text-[9px] font-black text-orange-400 uppercase mb-3 tracking-widest flex items-center gap-2 leading-none"><Flame size={14}/> Force Mobile</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black">{dayRecord?.stats.mobile || 0}</span>
                    <span className="text-white/20 text-[10px] font-black uppercase">poches</span>
                  </div>
               </div>
               <div className="bg-blue-600 p-6 lg:p-8 rounded-[2.5rem] border border-white/20 shadow-xl group transition-all hover:scale-105">
                  <p className="text-[9px] font-black text-white/60 uppercase mb-3 tracking-widest flex items-center gap-2 leading-none"><PlusCircle size={14}/> Cumul Journée</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-white">{(dayRecord?.stats.realized || 0).toLocaleString()}</span>
                    <span className="text-white/40 text-[10px] font-black uppercase">total</span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* PULSE GRIDS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* REGIONAL VITALITY RADAR */}
        <div className="bg-white rounded-[3.5rem] p-10 shadow-warm border border-orange-100 overflow-hidden relative">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
                 <Target size={24} />
               </div>
               <h3 className="text-xl font-black uppercase tracking-tight text-slate-800">Radar de Vitalité</h3>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Performances {MONTHS_FR[selectedMonth]}</span>
          </div>

          <div className="space-y-6">
            {sortedRegionsForMonth.slice(0, 5).map((reg, i) => (
              <div key={i} className="relative group">
                <div className="flex justify-between items-end mb-2 px-1">
                   <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{reg.name.replace('PRES ', '')}</span>
                   <span className="text-xs font-black text-slate-900">{reg.percentage.toFixed(1)}%</span>
                </div>
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                   <div 
                     className="h-full rounded-full transition-all duration-1000 shadow-sm" 
                     style={{ 
                       width: `${Math.min(reg.percentage, 100)}%`,
                       backgroundColor: reg.percentage >= 100 ? COLORS.green : reg.percentage >= 70 ? COLORS.orange : COLORS.red 
                     }}
                   ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Diagnostic Flux */}
        <div className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] rounded-[3.5rem] p-10 shadow-2xl text-white relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
           <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Activity size={24} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight">Diagnostic Flux</h3>
           </div>
           
           <div className="space-y-6">
              <div className="p-6 bg-white/5 rounded-3xl border border-white/10 italic text-sm text-blue-100 leading-relaxed relative">
                 <div className="absolute -top-3 left-6 px-3 py-1 bg-blue-600 rounded-full text-[8px] font-black uppercase tracking-widest">Analyse Pulse</div>
                 "Le rythme cardiaque national pour le {selectedDay} est de {perfDaily.toFixed(1)}%. {isHealthy ? 'Le flux est optimal et stable.' : isStruggling ? 'Alerte : Arythmie détectée dans les collectes.' : 'Rythme en phase de croissance positive.'}"
              </div>

              {/* Site Champion Indicator */}
              {siteChampion && (
                <div className="p-6 bg-gradient-to-r from-emerald-600/20 to-transparent rounded-3xl border border-emerald-500/30 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                      <Trophy size={24} />
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">Champion du Jour</p>
                      <h4 className="text-sm font-black text-white uppercase truncate max-w-[150px]">{siteChampion.name}</h4>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-emerald-400">{siteChampion.perf.toFixed(0)}%</p>
                    <p className="text-[8px] font-black text-emerald-400/40 uppercase tracking-widest">Atteinte Objectif</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                 {[
                   { label: 'PRESSION', val: isHealthy ? 'HAUTE' : isStruggling ? 'BASSES' : 'NORMALE', icon: <Waves size={14}/>, color: isHealthy ? 'text-emerald-400' : isStruggling ? 'text-red-400' : 'text-blue-400' },
                   { label: 'FORCE', val: `${Math.round(perfDaily)}%`, icon: <Zap size={14}/>, color: 'text-amber-400' },
                   { label: 'ÉTAT', val: isHealthy ? 'OK' : 'SOS', icon: <AlertCircle size={14}/>, color: isHealthy ? 'text-emerald-400' : 'text-red-400' }
                 ].map((item, i) => (
                   <div key={i} className="text-center p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className={`mx-auto mb-2 ${item.color}`}>{item.icon}</div>
                      <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">{item.label}</p>
                      <p className="text-xs font-black uppercase">{item.val}</p>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
