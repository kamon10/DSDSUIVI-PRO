
import React, { useState, useMemo, useRef } from 'react';
import { DashboardData, User } from '../types';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, Legend, ReferenceLine 
} from 'recharts';
import { 
  Calendar, Layers, TrendingUp, Filter, Target, Activity, 
  FileImage, FileText, Loader2, Truck, Package, Clock, 
  CalendarDays, Zap, Award, Sparkles, TrendingDown, History
} from 'lucide-react';
import { COLORS } from '../constants';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface WeeklyViewProps {
  data: DashboardData;
  user?: User | null;
}

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const THEME = {
  fixed: '#10b981',      // Vert Émeraude (Collecte Fixe)
  mobile: '#fbbf24',     // Ambre (Collecte Mobile)
  total: '#3b82f6',      // Bleu (Total)
  expedie: '#f59e0b',    // Orange (Distribution Brute)
  rendu: '#f43f5e',      // Rouge (Rendus)
  net: '#10b981'         // Vert (Sorties Nettes)
};

export const WeeklyView: React.FC<WeeklyViewProps> = ({ data, user }) => {
  const [viewMode, setViewMode] = useState<'donations' | 'distribution'>('donations');
  const [timeScale, setTimeScale] = useState<'days' | 'months' | 'years'>('days');
  const [exporting, setExporting] = useState<'image' | 'pdf' | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    data.dailyHistory.forEach(h => years.add(h.date.split('/')[2]));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [data.dailyHistory]);

  const [selectedYear, setSelectedYear] = useState<string>(availableYears[0] || "2026");

  const availableMonths = useMemo(() => {
    const months = new Set<number>();
    data.dailyHistory.forEach(h => {
      const parts = h.date.split('/');
      if (parts[2] === selectedYear) months.add(parseInt(parts[1]) - 1);
    });
    return Array.from(months).sort((a, b) => a - b);
  }, [data.dailyHistory, selectedYear]);

  const [selectedMonth, setSelectedMonth] = useState<number>(availableMonths.length > 0 ? availableMonths[availableMonths.length - 1] : new Date().getMonth());

  const evolutionData = useMemo(() => {
    if (timeScale === 'days') {
      const days = data.dailyHistory.filter(h => {
        const p = h.date.split('/');
        return p[2] === selectedYear && (parseInt(p[1]) - 1) === selectedMonth;
      }).sort((a, b) => {
        const da = parseInt(a.date.split('/')[0]);
        const db = parseInt(b.date.split('/')[0]);
        return da - db;
      });

      return days.map(d => {
        const dayKey = d.date.split('/')[0];
        if (viewMode === 'donations') {
          return { name: dayKey, total: d.stats.realized, fixe: d.stats.fixed, mobile: d.stats.mobile };
        } else {
          const dists = data.distributions?.records.filter(r => r.date === d.date) || [];
          const qty = dists.reduce((acc, r) => acc + r.quantite, 0);
          const rendu = dists.reduce((acc, r) => acc + r.rendu, 0);
          return { name: dayKey, expedie: qty, rendu: rendu, net: qty - rendu };
        }
      });
    } else if (timeScale === 'months') {
      const monthlyMap = new Map<number, any>();
      data.dailyHistory.forEach(h => {
        const p = h.date.split('/');
        const y = p[2], m = parseInt(p[1]) - 1;
        if (y === selectedYear) {
          if (!monthlyMap.has(m)) monthlyMap.set(m, { m, total: 0, fixe: 0, mobile: 0, expedie: 0, rendu: 0, net: 0 });
          const entry = monthlyMap.get(m);
          entry.total += h.stats.realized;
          entry.fixe += h.stats.fixed;
          entry.mobile += h.stats.mobile;
        }
      });
      if (data.distributions?.records) {
        data.distributions.records.forEach(r => {
          const p = r.date.split('/');
          const y = p[2], m = parseInt(p[1]) - 1;
          if (y === selectedYear) {
            if (!monthlyMap.has(m)) monthlyMap.set(m, { m, total: 0, fixe: 0, mobile: 0, expedie: 0, rendu: 0, net: 0 });
            const entry = monthlyMap.get(m);
            entry.expedie += r.quantite;
            entry.rendu += r.rendu;
            entry.net += (r.quantite - r.rendu);
          }
        });
      }
      return Array.from(monthlyMap.values()).sort((a, b) => a.m - b.m).map(e => ({
        ...e, name: MONTHS_FR[e.m].substring(0, 3).toUpperCase()
      }));
    } else {
      const annualMap = new Map<string, any>();
      data.dailyHistory.forEach(h => {
        const y = h.date.split('/')[2];
        if (!annualMap.has(y)) annualMap.set(y, { y, total: 0, fixe: 0, mobile: 0, expedie: 0, rendu: 0, net: 0 });
        const entry = annualMap.get(y);
        entry.total += h.stats.realized;
        entry.fixe += h.stats.fixed;
        entry.mobile += h.stats.mobile;
      });
      if (data.distributions?.records) {
        data.distributions.records.forEach(r => {
          const y = r.date.split('/')[2];
          if (!annualMap.has(y)) annualMap.set(y, { y, total: 0, fixe: 0, mobile: 0, expedie: 0, rendu: 0, net: 0 });
          const entry = annualMap.get(y);
          entry.expedie += r.quantite;
          entry.rendu += r.rendu;
          entry.net += (r.quantite - r.rendu);
        });
      }
      return Array.from(annualMap.values()).sort((a, b) => a.y.localeCompare(b.y)).map(e => ({
        ...e, name: e.y
      }));
    }
  }, [data, viewMode, timeScale, selectedYear, selectedMonth]);

  const statsSummary = useMemo(() => {
    const sum = evolutionData.reduce((acc, curr) => ({
      val1: acc.val1 + (viewMode === 'donations' ? curr.total : curr.expedie),
      val2: acc.val2 + (viewMode === 'donations' ? curr.fixe : curr.net),
      val3: acc.val3 + (viewMode === 'donations' ? curr.mobile : curr.rendu)
    }), { val1: 0, val2: 0, val3: 0 });
    const count = evolutionData.length || 1;
    return { ...sum, avg: Math.round(sum.val1 / count) };
  }, [evolutionData, viewMode]);

  const handleExport = async (type: 'image' | 'pdf') => {
    if (!contentRef.current) return;
    setExporting(type);
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const canvas = await html2canvas(contentRef.current, { scale: 2.5, useCORS: true, backgroundColor: '#f8fafc' });
      const imgData = canvas.toDataURL('image/png', 1.0);
      const filename = `EVOLUTION_${viewMode}_${timeScale}`;
      if (type === 'image') {
        const link = document.createElement('a'); link.download = `${filename}.png`; link.href = imgData; link.click();
      } else {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pw = pdf.internal.pageSize.getWidth();
        const ratio = pw / (canvas.width / 2.5);
        pdf.addImage(imgData, 'PNG', 0, 10, pw, (canvas.height / 2.5) * ratio);
        pdf.save(`${filename}.pdf`);
      }
    } catch (err) { console.error(err); } finally { setExporting(null); }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-1000 pb-24">
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
        <div className="bg-white p-1.5 rounded-3xl shadow-xl border border-slate-100 flex gap-2">
           <button onClick={() => setViewMode('donations')} className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${viewMode === 'donations' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
             <Activity size={18}/> Prélèvements
           </button>
           <button onClick={() => setViewMode('distribution')} className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${viewMode === 'distribution' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
             <Truck size={18}/> Distribution
           </button>
        </div>
        <div className="flex bg-slate-900/5 p-1.5 rounded-2xl border border-slate-200">
           {[ { id: 'days', label: 'Jours' }, { id: 'months', label: 'Mois' }, { id: 'years', label: 'Années' } ].map(s => (
             <button key={s.id} onClick={() => setTimeScale(s.id as any)} className={`px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${timeScale === s.id ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400'}`}>
                {s.label}
             </button>
           ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleExport('image')} disabled={!!exporting} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
            {exporting === 'image' ? <Loader2 size={20} className="animate-spin" /> : <FileImage size={22} />}
          </button>
          <button onClick={() => handleExport('pdf')} disabled={!!exporting} className={`p-4 text-white rounded-xl shadow-lg ${viewMode === 'donations' ? 'bg-emerald-600' : 'bg-orange-600'}`}>
            {exporting === 'pdf' ? <Loader2 size={20} className="animate-spin" /> : <FileText size={22} />}
          </button>
        </div>
      </div>

      <div ref={contentRef} className="space-y-10 p-1">
        <div className={`relative overflow-hidden rounded-[4rem] p-12 lg:p-16 text-white shadow-3xl border border-white/5 ${viewMode === 'donations' ? 'bg-[#0f172a]' : 'bg-[#1e1b4b]'}`}>
           <div className={`absolute top-0 right-0 w-[600px] h-[600px] blur-[180px] rounded-full opacity-20 ${viewMode === 'donations' ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
           <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
              <div className="flex items-center gap-10">
                 <div className={`w-20 h-20 rounded-[2.5rem] flex items-center justify-center shadow-2xl ${viewMode === 'donations' ? 'bg-emerald-600' : 'bg-orange-600'}`}>
                    <Sparkles size={40} className="animate-pulse" />
                 </div>
                 <div>
                    <h2 className="text-5xl lg:text-6xl font-[950] uppercase tracking-tighter leading-none mb-4">Focus Évolution</h2>
                    <p className="text-white/40 font-black uppercase tracking-[0.6em] text-[10px] flex items-center gap-4">
                       <Clock size={16} /> Séquence : {timeScale === 'days' ? `${MONTHS_FR[selectedMonth]} ${selectedYear}` : timeScale === 'months' ? `Année ${selectedYear}` : 'Série Historique'}
                    </p>
                 </div>
              </div>
              <div className="flex flex-wrap justify-center gap-4 bg-white/5 p-2.5 rounded-[2.5rem] backdrop-blur-2xl border border-white/10 shadow-inner">
                 <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent text-[12px] font-black uppercase outline-none px-8 py-3 cursor-pointer">
                    {availableYears.map(y => <option key={y} value={y} className="text-slate-900">{y}</option>)}
                 </select>
                 {timeScale === 'days' && (
                   <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="bg-transparent text-[12px] font-black uppercase outline-none px-8 py-3 border-l border-white/10 cursor-pointer">
                      {availableMonths.map(m => <option key={m} value={m} className="text-slate-900">{MONTHS_FR[m]}</option>)}
                   </select>
                 )}
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
           {[
             { label: 'Volume Global', val: statsSummary.val1, color: viewMode === 'donations' ? THEME.total : THEME.expedie, icon: <Layers size={18}/> },
             { label: 'Moyenne / Séquence', val: statsSummary.avg, color: '#94a3b8', icon: <TrendingUp size={18}/> },
             { label: viewMode === 'donations' ? 'Performance Fixe' : 'Utilisation Nette', val: statsSummary.val2, color: THEME.fixed, icon: <Zap size={18}/> },
             { label: viewMode === 'donations' ? 'Performance Mobile' : 'Rendus / Pertes', val: statsSummary.val3, color: viewMode === 'donations' ? THEME.mobile : THEME.rendu, icon: <TrendingDown size={18}/> }
           ].map((stat, i) => (
             <div key={i} className="bg-white rounded-[2.5rem] p-8 shadow-warm border border-slate-100 flex flex-col hover:shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                   <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shadow-inner">{stat.icon}</div>
                   <span className="text-[10px] font-black uppercase text-slate-300">{stat.label}</span>
                </div>
                <div className="flex items-baseline gap-2">
                   <span className="text-4xl font-[950] text-slate-900 tracking-tighter">{stat.val.toLocaleString()}</span>
                   <span className="text-[10px] font-black text-slate-300 uppercase">Unités</span>
                </div>
                <div className="mt-4 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                   <div className="h-full transition-all duration-1000" style={{ width: '100%', backgroundColor: stat.color }} />
                </div>
             </div>
           ))}
        </div>

        <div className="bg-white rounded-[4rem] p-10 lg:p-16 shadow-3xl border border-slate-100 flex flex-col">
           <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
              <div>
                 <h3 className="text-3xl font-[950] text-slate-900 tracking-tighter uppercase leading-none">Courbe de Vitalité</h3>
                 <p className="text-slate-400 text-[10px] font-black uppercase mt-2 italic">Analyse des flux séquentiels par {timeScale === 'days' ? 'jour' : timeScale === 'months' ? 'mois' : 'an'}</p>
              </div>
              <div className="flex flex-wrap items-center gap-6">
                 <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-full border shadow-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: viewMode === 'donations' ? THEME.total : THEME.expedie }}></div>
                    <span className="text-[10px] font-black text-slate-600 uppercase">{viewMode === 'donations' ? 'Total' : 'Brut'}</span>
                 </div>
                 <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-full border shadow-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: viewMode === 'donations' ? THEME.fixed : THEME.net }}></div>
                    <span className="text-[10px] font-black text-slate-600 uppercase">{viewMode === 'donations' ? 'Fixe' : 'Net'}</span>
                 </div>
                 {viewMode === 'donations' && (
                   <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-full border shadow-sm">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: THEME.mobile }}></div>
                      <span className="text-[10px] font-black text-slate-600 uppercase">Mobile</span>
                   </div>
                 )}
              </div>
           </div>
           <div className="w-full h-[550px]">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={evolutionData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                    <defs>
                       <linearGradient id="colorMain" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={viewMode === 'donations' ? THEME.total : THEME.expedie} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={viewMode === 'donations' ? THEME.total : THEME.expedie} stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 900, fill: '#94a3b8'}} padding={{left: 20, right: 20}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 900, fill: '#cbd5e1'}} />
                    <Tooltip contentStyle={{ borderRadius: '2.5rem', border: 'none', boxShadow: '0 50px 100px -20px rgba(0,0,0,0.15)', padding: '2rem', fontWeight: '900' }} />
                    <Area type="monotone" dataKey={viewMode === 'donations' ? 'total' : 'expedie'} stroke={viewMode === 'donations' ? THEME.total : THEME.expedie} strokeWidth={5} fillOpacity={1} fill="url(#colorMain)" animationDuration={2500} />
                    {viewMode === 'donations' ? (
                       <>
                          <Area type="monotone" dataKey="fixe" stroke={THEME.fixed} strokeWidth={3} strokeDasharray="10 5" fill="none" animationDuration={2000} />
                          <Area type="monotone" dataKey="mobile" stroke={THEME.mobile} strokeWidth={3} strokeDasharray="5 5" fill="none" animationDuration={2000} />
                       </>
                    ) : (
                       <Area type="monotone" dataKey="net" stroke={THEME.net} strokeWidth={3} strokeDasharray="10 5" fill="none" animationDuration={2000} />
                    )}
                    <ReferenceLine y={statsSummary.avg} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: 'Moyenne', position: 'right', fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>
    </div>
  );
};
