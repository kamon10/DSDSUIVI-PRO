import React, { useMemo, useState, useEffect } from 'react';
import { DashboardData } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { ArrowLeftRight, TrendingUp, Calendar as CalendarIcon, Clock, ChevronDown, TrendingDown, Activity, ChevronLeft, ChevronRight, X, MapPin, Building2, Globe, Sparkles } from 'lucide-react';
import { COLORS, SITES_DATA } from '../constants';

interface ComparisonViewProps {
  data: DashboardData;
}

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const DAYS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] shadow-3xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
        <div className="bg-slate-900 p-8 text-white flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/20 blur-2xl rounded-full -mr-12 -mt-12"></div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 mb-1">{label}</p>
            <h4 className="text-2xl font-black uppercase tracking-tighter leading-none">{MONTHS_FR[viewDate.getMonth()]} {viewDate.getFullYear()}</h4>
          </div>
          <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all relative z-10"><X size={20}/></button>
        </div>
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all"><ChevronLeft size={20}/></button>
            <div className="flex gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-blue-200"></div>
            </div>
            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all"><ChevronRight size={20}/></button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-3">
            {DAYS_SHORT.map(d => <div key={d} className="text-[9px] font-black text-slate-300 uppercase text-center py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {monthDays.map((d, i) => {
              if (!d) return <div key={`empty-${i}`} className="aspect-square"></div>;
              const isSelected = d.dateStr === selectedDate;
              return (
                <button
                  key={d.dateStr}
                  disabled={!d.hasData}
                  onClick={() => { onSelect(d.dateStr); onClose(); }}
                  className={`aspect-square rounded-2xl text-[11px] font-black transition-all flex flex-col items-center justify-center relative group
                    ${isSelected ? 'bg-blue-600 text-white shadow-xl shadow-blue-200 scale-110' : d.hasData ? 'hover:bg-blue-50 text-slate-700' : 'opacity-10 cursor-not-allowed'}
                  `}
                >
                  {d.day}
                  {d.hasData && !isSelected && <div className="w-1 h-1 bg-blue-400 rounded-full mt-1 group-hover:scale-150 transition-transform"></div>}
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

  const regions = useMemo(() => Array.from(new Set(SITES_DATA.map(s => s.region))).sort(), []);
  
  const [scopeA, setScopeA] = useState<'national' | 'region' | 'site'>('national');
  const [regionA, setRegionA] = useState(regions[0]);
  const [siteA, setSiteA] = useState(SITES_DATA.find(s => s.region === regions[0])?.name || "");

  const [scopeB, setScopeB] = useState<'national' | 'region' | 'site'>('national');
  const [regionB, setRegionB] = useState(regions[0]);
  const [siteB, setSiteB] = useState(SITES_DATA.find(s => s.region === regions[0])?.name || "");

  const sitesA = useMemo(() => SITES_DATA.filter(s => s.region === regionA), [regionA]);
  const sitesB = useMemo(() => SITES_DATA.filter(s => s.region === regionB), [regionB]);

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

  const getCategoryColor = (name: string) => {
    if (name === 'Fixe') return COLORS.fixed;
    if (name === 'Mobile') return COLORS.mobile;
    return COLORS.total;
  };

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      {showPicker === 'A' && <ElegantDatePicker selectedDate={dateA} availableDates={availableDates} onSelect={setDateA} onClose={() => setShowPicker(null)} label="Période A" />}
      {showPicker === 'B' && <ElegantDatePicker selectedDate={dateB} availableDates={availableDates} onSelect={setDateB} onClose={() => setShowPicker(null)} label="Période B" />}

      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-400 rounded-[4rem] blur opacity-25"></div>
        <div className="relative bg-[#0f172a] rounded-[4rem] p-12 lg:p-16 text-white shadow-3xl overflow-hidden border border-white/5">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 blur-[150px] rounded-full -mr-40 -mt-40 animate-pulse"></div>
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-12">
            <div className="flex items-center gap-10">
              <div className="w-20 h-20 bg-blue-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl pulse-glow border border-white/10">
                <ArrowLeftRight size={40} />
              </div>
              <div>
                <h2 className="text-4xl lg:text-6xl font-black uppercase tracking-tighter leading-none mb-4">Comparateur</h2>
                <p className="text-blue-300/40 font-black uppercase tracking-[0.5em] text-[10px] flex items-center gap-3">
                  <Activity size={14} className="text-blue-500" /> Analyse Multidimensionnelle
                </p>
              </div>
            </div>
            <div className="flex bg-white/5 p-1.5 rounded-[2rem] border border-white/10 backdrop-blur-2xl shadow-inner">
              {['days', 'months', 'years'].map(s => (
                <button key={s} onClick={() => setScale(s as any)} className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${scale === s ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white'}`}>
                  {s.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="glass-card p-12 rounded-[3.5rem] shadow-3xl border border-white/40 relative overflow-hidden group">
           <div className="absolute top-0 left-0 w-2.5 h-full bg-blue-500 opacity-50"></div>
           <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl"><Sparkles size={24} /></div>
              <div><p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">MÉTRIQUE A</p><h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Référence Primaire</h4></div>
           </div>
           <div className="space-y-6">
              <div className="flex gap-2 p-1.5 bg-slate-100/50 rounded-2xl">{['national', 'region', 'site'].map(s => (
                <button key={s} onClick={() => setScopeA(s as any)} className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${scopeA === s ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>{s}</button>
              ))}</div>
              {scopeA !== 'national' && (
                <div className="space-y-4">
                  <div className="relative"><MapPin size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-400" /><select value={regionA} onChange={(e) => setRegionA(e.target.value)} className="w-full pl-14 pr-8 py-5 bg-white border border-slate-200 rounded-[1.5rem] text-xs font-black uppercase text-slate-800 outline-none appearance-none focus:ring-4 ring-blue-50 shadow-inner">{regions.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                  {scopeA === 'site' && <div className="relative"><Building2 size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-400" /><select value={siteA} onChange={(e) => setSiteA(e.target.value)} className="w-full pl-14 pr-8 py-5 bg-white border border-slate-200 rounded-[1.5rem] text-xs font-black uppercase text-slate-800 outline-none appearance-none focus:ring-4 ring-blue-50 shadow-inner">{sitesA.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}</select></div>}
                </div>
              )}
              {scale === 'days' ? (
                <button onClick={() => setShowPicker('A')} className="w-full bg-slate-900 text-white rounded-[1.5rem] px-8 py-5 flex items-center justify-between group hover:bg-slate-800 transition-all shadow-xl"><div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.2em]"><CalendarIcon size={18} className="text-blue-400" /> {dateA}</div><ChevronDown size={18} className="text-white/40 group-hover:text-white" /></button>
              ) : (
                <div className="flex gap-4"><select value={yearA} onChange={(e) => setYearA(Number(e.target.value))} className="flex-1 bg-white border border-slate-200 rounded-[1.5rem] px-6 py-5 text-xs font-black uppercase outline-none focus:ring-4 ring-blue-50 shadow-inner">{availableYears.map(y => <option key={y} value={y}>{y}</option>)}</select>{scale === 'months' && <select value={monthA} onChange={(e) => setMonthA(Number(e.target.value))} className="flex-1 bg-white border border-slate-200 rounded-[1.5rem] px-6 py-5 text-xs font-black uppercase outline-none focus:ring-4 ring-blue-50 shadow-inner">{MONTHS_FR.map((m, i) => <option key={i} value={i}>{m}</option>)}</select>}</div>
              )}
           </div>
           <div className="pt-10 mt-10 border-t border-slate-100 flex flex-col"><span className="text-7xl font-black text-slate-900 tracking-tighter leading-none">{comparisonResults.a.total.toLocaleString()}</span><p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em] mt-3">POCHES DE SANG RÉCOLTÉES (A)</p></div>
        </div>

        <div className="glass-card p-12 rounded-[3.5rem] shadow-3xl border border-white/40 relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-2.5 h-full bg-purple-500 opacity-50"></div>
           <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-xl"><Activity size={24} /></div>
              <div><p className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em]">MÉTRIQUE B</p><h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Point de Comparaison</h4></div>
           </div>
           <div className="space-y-6">
              <div className="flex gap-2 p-1.5 bg-slate-100/50 rounded-2xl">{['national', 'region', 'site'].map(s => (
                <button key={s} onClick={() => setScopeB(s as any)} className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${scopeB === s ? 'bg-white text-purple-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>{s}</button>
              ))}</div>
              {scopeB !== 'national' && (
                <div className="space-y-4">
                  <div className="relative"><MapPin size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-purple-400" /><select value={regionB} onChange={(e) => setRegionB(e.target.value)} className="w-full pl-14 pr-8 py-5 bg-white border border-slate-200 rounded-[1.5rem] text-xs font-black uppercase text-slate-800 outline-none appearance-none focus:ring-4 ring-purple-50 shadow-inner">{regions.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                  {scopeB === 'site' && <div className="relative"><Building2 size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-purple-400" /><select value={siteB} onChange={(e) => setSiteB(e.target.value)} className="w-full pl-14 pr-8 py-5 bg-white border border-slate-200 rounded-[1.5rem] text-xs font-black uppercase text-slate-800 outline-none appearance-none focus:ring-4 ring-purple-50 shadow-inner">{sitesB.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}</select></div>}
                </div>
              )}
              {scale === 'days' ? (
                <button onClick={() => setShowPicker('B')} className="w-full bg-slate-900 text-white rounded-[1.5rem] px-8 py-5 flex items-center justify-between group hover:bg-slate-800 transition-all shadow-xl"><div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.2em]"><CalendarIcon size={18} className="text-purple-400" /> {dateB}</div><ChevronDown size={18} className="text-white/40 group-hover:text-white" /></button>
              ) : (
                <div className="flex gap-4"><select value={yearB} onChange={(e) => setYearB(Number(e.target.value))} className="flex-1 bg-white border border-slate-200 rounded-[1.5rem] px-6 py-5 text-xs font-black uppercase outline-none focus:ring-4 ring-purple-50 shadow-inner">{availableYears.map(y => <option key={y} value={y}>{y}</option>)}</select>{scale === 'months' && <select value={monthB} onChange={(e) => setMonthB(Number(e.target.value))} className="flex-1 bg-white border border-slate-200 rounded-[1.5rem] px-6 py-5 text-xs font-black uppercase outline-none focus:ring-4 ring-purple-50 shadow-inner">{MONTHS_FR.map((m, i) => <option key={i} value={i}>{m}</option>)}</select>}</div>
              )}
           </div>
           <div className="pt-10 mt-10 border-t border-slate-100 flex flex-col"><span className="text-7xl font-black text-slate-900 tracking-tighter leading-none">{comparisonResults.b.total.toLocaleString()}</span><p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em] mt-3">POCHES DE SANG RÉCOLTÉES (B)</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
         <div className="bg-[#0f172a] rounded-[4rem] p-12 text-white flex flex-col justify-center items-center shadow-3xl relative overflow-hidden">
            <div className={`absolute -inset-1 blur-[60px] opacity-40 rounded-full transition-all duration-1000 ${comparisonResults.diff >= 0 ? 'bg-emerald-500 scale-125' : 'bg-red-500 scale-125'}`}></div>
            <div className="relative z-10 text-center">
              <p className="text-[10px] font-black opacity-40 uppercase tracking-[0.4em] mb-8">DELTA PERFORMANCE</p>
              <div className="flex flex-col items-center gap-6">
                 <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-2xl ${comparisonResults.diff >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}>{comparisonResults.diff >= 0 ? <TrendingUp size={40} /> : <TrendingDown size={40} />}</div>
                 <div><p className="text-8xl font-black tracking-tighter leading-none mb-3">{comparisonResults.diff > 0 ? '+' : ''}{comparisonResults.diff.toLocaleString()}</p><div className={`inline-flex items-center gap-2 px-6 py-2 rounded-full font-black text-lg ${comparisonResults.perc >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{comparisonResults.perc.toFixed(1)}%</div></div>
              </div>
            </div>
         </div>

         <div className="lg:col-span-2 glass-card rounded-[4rem] p-12 lg:p-16 shadow-3xl border border-white/40">
            <div className="flex items-center justify-between mb-12">
               <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800 flex items-center gap-6"><Globe size={32} className="text-blue-600" /> Analyse Mixte</h3>
               <div className="flex gap-4">
                  <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-slate-400"></div><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">A (Opaque)</span></div>
                  <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-slate-400 opacity-40"></div><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">B (40%)</span></div>
               </div>
            </div>
            
            <div className="h-80">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barGap={20}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 900, fill: '#64748b'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 900, fill: '#64748b'}} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '2rem', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)', padding: '1.5rem' }} />
                    <Bar dataKey="A" radius={[8, 8, 0, 0]} name="Période A">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-a-${index}`} fill={getCategoryColor(entry.name)} />
                      ))}
                    </Bar>
                    <Bar dataKey="B" radius={[8, 8, 0, 0]} name="Période B">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-b-${index}`} fill={getCategoryColor(entry.name)} fillOpacity={0.4} />
                      ))}
                    </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>
    </div>
  );
};
