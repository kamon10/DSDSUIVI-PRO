
import React, { useMemo, useState, useEffect } from 'react';
import { DashboardData } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { ArrowLeftRight, TrendingUp, Calendar as CalendarIcon, Clock, ChevronDown, TrendingDown, Minus, Activity, ChevronLeft, ChevronRight, X, MapPin, Building2, Globe } from 'lucide-react';
import { COLORS, SITES_DATA } from '../constants';

interface ComparisonViewProps {
  data: DashboardData;
}

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const DAYS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// --- Sous-composant Calendrier ---
const ElegantDatePicker: React.FC<{
  selectedDate: string;
  availableDates: string[];
  onSelect: (date: string) => void;
  onClose: () => void;
  label: string;
}> = ({ selectedDate, availableDates, onSelect, onClose, label }) => {
  const [viewDate, setViewDate] = useState(() => {
    const [d, m, y] = (selectedDate || availableDates[0] || "01/01/2026").split('/').map(Number);
    return new Date(y, m - 1, 1);
  });

  const monthDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const startingDay = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < startingDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${i.toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')}/${year}`;
      days.push({ day: i, dateStr, hasData: availableDates.includes(dateStr) });
    }
    return days;
  }, [viewDate, availableDates]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">{label}</p>
            <h4 className="text-xl font-black uppercase tracking-tight">{MONTHS_FR[viewDate.getMonth()]} {viewDate.getFullYear()}</h4>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20}/></button>
        </div>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><ChevronLeft size={20}/></button>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-blue-200"></div>
            </div>
            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><ChevronRight size={20}/></button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS_SHORT.map(d => <div key={d} className="text-[9px] font-black text-slate-400 uppercase text-center py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((d, i) => {
              if (!d) return <div key={`empty-${i}`} className="aspect-square"></div>;
              const isSelected = d.dateStr === selectedDate;
              return (
                <button
                  key={d.dateStr}
                  disabled={!d.hasData}
                  onClick={() => { onSelect(d.dateStr); onClose(); }}
                  className={`aspect-square rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center relative group
                    ${isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : d.hasData ? 'hover:bg-blue-50 text-slate-700' : 'opacity-10 cursor-not-allowed'}
                  `}
                >
                  {d.day}
                  {d.hasData && !isSelected && <div className="w-1 h-1 bg-blue-400 rounded-full mt-0.5 group-hover:bg-blue-600"></div>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ComparisonView: React.FC<ComparisonViewProps> = ({ data }) => {
  const [scale, setScale] = useState<'days' | 'months' | 'years'>('days');
  const [showPicker, setShowPicker] = useState<'A' | 'B' | null>(null);

  // --- FILTRES STRUCTURE ---
  const regions = useMemo(() => Array.from(new Set(SITES_DATA.map(s => s.region))).sort(), []);
  
  const [scopeA, setScopeA] = useState<'national' | 'region' | 'site'>('national');
  const [regionA, setRegionA] = useState(regions[0]);
  const [siteA, setSiteA] = useState(SITES_DATA.find(s => s.region === regions[0])?.name || "");

  const [scopeB, setScopeB] = useState<'national' | 'region' | 'site'>('national');
  const [regionB, setRegionB] = useState(regions[0]);
  const [siteB, setSiteB] = useState(SITES_DATA.find(s => s.region === regions[0])?.name || "");

  const sitesA = useMemo(() => SITES_DATA.filter(s => s.region === regionA), [regionA]);
  const sitesB = useMemo(() => SITES_DATA.filter(s => s.region === regionB), [regionB]);

  // --- TEMPOREL ---
  const availableDates = useMemo(() => data.dailyHistory.map(h => h.date), [data.dailyHistory]);
  const [dateA, setDateA] = useState(availableDates[0] || "");
  const [dateB, setDateB] = useState(availableDates[1] || availableDates[0] || "");

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    data.dailyHistory.forEach(h => years.add(parseInt(h.date.split('/')[2])));
    return Array.from(years).sort((a, b) => b - a);
  }, [data.dailyHistory]);
  
  const [yearA, setYearA] = useState(availableYears[0] || 2026);
  const [yearB, setYearB] = useState(availableYears[1] || availableYears[0] || 2026);

  const [monthA, setMonthA] = useState(new Date().getMonth());
  const [monthB, setMonthB] = useState((new Date().getMonth() - 1 + 12) % 12);

  // --- LOGIQUE DE CALCUL ---
  const calculateStats = (pScope: string, pRegion: string, pSite: string, pScale: string, pDate: string, pMonth: number, pYear: number) => {
    const res = { total: 0, fixed: 0, mobile: 0, label: "" };
    
    data.dailyHistory.forEach(h => {
      const [d, m, y] = h.date.split('/').map(Number);
      let matchTime = false;
      if (pScale === 'days') matchTime = h.date === pDate;
      else if (pScale === 'months') matchTime = (y === pYear && (m - 1) === pMonth);
      else matchTime = (y === pYear);

      if (matchTime) {
        h.sites.forEach(s => {
          let matchStructure = false;
          if (pScope === 'national') matchStructure = true;
          else if (pScope === 'region') matchStructure = s.region === pRegion;
          else matchStructure = s.name === pSite;

          if (matchStructure) {
            res.total += s.total;
            res.fixed += s.fixe;
            res.mobile += s.mobile;
          }
        });
      }
    });

    if (pScale === 'days') res.label = pDate;
    else if (pScale === 'months') res.label = `${MONTHS_FR[pMonth]} ${pYear}`;
    else res.label = pYear.toString();

    const scopeLabel = pScope === 'national' ? 'National' : pScope === 'region' ? pRegion : pSite;
    res.label = `${res.label} (${scopeLabel})`;
    
    return res;
  };

  const comparisonResults = useMemo(() => {
    const statsA = calculateStats(scopeA, regionA, siteA, scale, dateA, monthA, yearA);
    const statsB = calculateStats(scopeB, regionB, siteB, scale, dateB, monthB, yearB);
    const diff = statsA.total - statsB.total;
    const perc = statsB.total > 0 ? (diff / statsB.total) * 100 : 0;
    return { a: statsA, b: statsB, diff, perc };
  }, [scale, dateA, dateB, monthA, monthB, yearA, yearB, scopeA, regionA, siteA, scopeB, regionB, siteB, data.dailyHistory]);

  const chartData = [
    { name: 'Total', A: comparisonResults.a.total, B: comparisonResults.b.total },
    { name: 'Fixe', A: comparisonResults.a.fixed, B: comparisonResults.b.fixed },
    { name: 'Mobile', A: comparisonResults.a.mobile, B: comparisonResults.b.mobile },
  ];

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      
      {showPicker === 'A' && <ElegantDatePicker selectedDate={dateA} availableDates={availableDates} onSelect={setDateA} onClose={() => setShowPicker(null)} label="Période A" />}
      {showPicker === 'B' && <ElegantDatePicker selectedDate={dateB} availableDates={availableDates} onSelect={setDateB} onClose={() => setShowPicker(null)} label="Période B" />}

      {/* HEADER */}
      <div className="bg-slate-900 rounded-[3rem] p-10 lg:p-14 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-8">
            <div className="w-16 h-16 lg:w-20 lg:h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-xl">
              <ArrowLeftRight size={36} />
            </div>
            <div>
              <h2 className="text-3xl lg:text-4xl font-black uppercase tracking-tighter leading-none mb-3">Comparateur Avancé</h2>
              <p className="text-blue-300/40 font-black uppercase tracking-[0.4em] text-[9px]">Analyse granulaire par région et site</p>
            </div>
          </div>
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-md">
            {['days', 'months', 'years'].map(s => (
              <button key={s} onClick={() => setScale(s as any)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${scale === s ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'}`}>
                {s === 'days' ? 'JOURS' : s === 'months' ? 'MOIS' : 'ANNÉES'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* DUAL SELECTORS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        
        {/* CARTE A */}
        <div className="bg-white p-10 rounded-[3.5rem] shadow-warm border border-blue-50 space-y-8 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
           <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">PÉRIODE RÉFÉRENCE (A)</p>
           
           <div className="space-y-4">
              <div className="flex gap-2">
                 {['national', 'region', 'site'].map(s => (
                   <button key={s} onClick={() => setScopeA(s as any)} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${scopeA === s ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                      {s}
                   </button>
                 ))}
              </div>

              {scopeA !== 'national' && (
                 <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="relative">
                       <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                       <select value={regionA} onChange={(e) => setRegionA(e.target.value)} className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase text-slate-800 outline-none appearance-none">
                          {regions.map(r => <option key={r} value={r}>{r}</option>)}
                       </select>
                    </div>
                    {scopeA === 'site' && (
                       <div className="relative">
                          <Building2 size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <select value={siteA} onChange={(e) => setSiteA(e.target.value)} className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase text-slate-800 outline-none appearance-none">
                             {sitesA.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                          </select>
                       </div>
                    )}
                 </div>
              )}

              {scale === 'days' ? (
                <button onClick={() => setShowPicker('A')} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-6 py-4 flex items-center justify-between group">
                  <div className="flex items-center gap-4 text-xs font-black text-slate-800 uppercase tracking-widest">
                    <CalendarIcon size={16} className="text-blue-500" /> {dateA}
                  </div>
                  <ChevronDown size={16} className="text-slate-400 group-hover:text-blue-500" />
                </button>
              ) : (
                <div className="flex gap-3">
                   <select value={yearA} onChange={(e) => setYearA(Number(e.target.value))} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-xs font-black uppercase">
                      {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                   </select>
                   {scale === 'months' && (
                      <select value={monthA} onChange={(e) => setMonthA(Number(e.target.value))} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-xs font-black uppercase">
                         {MONTHS_FR.map((m, i) => <option key={i} value={i}>{m}</option>)}
                      </select>
                   )}
                </div>
              )}
           </div>
           <div className="pt-6 border-t border-slate-50 flex items-baseline gap-2">
              <span className="text-5xl font-black text-slate-900 tracking-tighter">{comparisonResults.a.total.toLocaleString()}</span>
              <span className="text-[10px] font-black text-slate-300 uppercase">Poches</span>
           </div>
        </div>

        {/* CARTE B */}
        <div className="bg-white p-10 rounded-[3.5rem] shadow-warm border border-indigo-50 space-y-8 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-2 h-full bg-indigo-500"></div>
           <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">PÉRIODE COMPARÉE (B)</p>
           
           <div className="space-y-4">
              <div className="flex gap-2">
                 {['national', 'region', 'site'].map(s => (
                   <button key={s} onClick={() => setScopeB(s as any)} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${scopeB === s ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                      {s}
                   </button>
                 ))}
              </div>

              {scopeB !== 'national' && (
                 <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="relative">
                       <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                       <select value={regionB} onChange={(e) => setRegionB(e.target.value)} className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase text-slate-800 outline-none appearance-none">
                          {regions.map(r => <option key={r} value={r}>{r}</option>)}
                       </select>
                    </div>
                    {scopeB === 'site' && (
                       <div className="relative">
                          <Building2 size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <select value={siteB} onChange={(e) => setSiteB(e.target.value)} className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase text-slate-800 outline-none appearance-none">
                             {sitesB.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                          </select>
                       </div>
                    )}
                 </div>
              )}

              {scale === 'days' ? (
                <button onClick={() => setShowPicker('B')} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-6 py-4 flex items-center justify-between group">
                  <div className="flex items-center gap-4 text-xs font-black text-slate-800 uppercase tracking-widest">
                    <CalendarIcon size={16} className="text-indigo-500" /> {dateB}
                  </div>
                  <ChevronDown size={16} className="text-slate-400 group-hover:text-indigo-500" />
                </button>
              ) : (
                <div className="flex gap-3">
                   <select value={yearB} onChange={(e) => setYearB(Number(e.target.value))} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-xs font-black uppercase">
                      {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                   </select>
                   {scale === 'months' && (
                      <select value={monthB} onChange={(e) => setMonthB(Number(e.target.value))} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-xs font-black uppercase">
                         {MONTHS_FR.map((m, i) => <option key={i} value={i}>{m}</option>)}
                      </select>
                   )}
                </div>
              )}
           </div>
           <div className="pt-6 border-t border-slate-50 flex items-baseline gap-2">
              <span className="text-5xl font-black text-slate-900 tracking-tighter">{comparisonResults.b.total.toLocaleString()}</span>
              <span className="text-[10px] font-black text-slate-300 uppercase">Poches</span>
           </div>
        </div>
      </div>

      {/* RESULTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="bg-slate-900 rounded-[3.5rem] p-10 text-white flex flex-col justify-center items-center shadow-2xl relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-40 rounded-full ${comparisonResults.diff >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
            <p className="text-[10px] font-black opacity-40 uppercase tracking-[0.3em] mb-4">DELTA PERFORMANCE</p>
            <div className="flex items-center gap-4">
               {comparisonResults.diff >= 0 ? <TrendingUp size={48} className="text-emerald-500" /> : <TrendingDown size={48} className="text-red-500" />}
               <div>
                  <p className="text-6xl font-black tracking-tighter leading-none">{comparisonResults.diff > 0 ? '+' : ''}{comparisonResults.diff.toLocaleString()}</p>
                  <p className="text-xl font-black opacity-60 mt-2">{comparisonResults.perc.toFixed(1)}%</p>
               </div>
            </div>
         </div>

         <div className="lg:col-span-2 bg-white rounded-[3.5rem] p-10 lg:p-14 shadow-warm border border-slate-100">
            <h3 className="text-xl font-black uppercase tracking-tight text-slate-800 mb-10 flex items-center gap-4">
               <Activity size={24} className="text-blue-600" /> Répartition Mix Fixe / Mobile
            </h3>
            <div className="h-64">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barGap={12}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Legend iconType="circle" />
                    <Bar dataKey="A" fill={COLORS.blue} radius={[4, 4, 0, 0]} name="Période A" />
                    <Bar dataKey="B" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="Période B" />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>
    </div>
  );
};
