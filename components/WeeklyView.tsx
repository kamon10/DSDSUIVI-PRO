import React, { useState, useMemo, useRef } from 'react';
import { DashboardData, DistributionRecord, DailyHistoryRecord } from '../types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine } from 'recharts';
import { Calendar, Layers, TrendingUp, Filter, Target, Activity, FileImage, FileText, Loader2, Truck, Package, Clock, CalendarDays, Zap, Award } from 'lucide-react';
import { COLORS } from '../constants';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface WeeklyViewProps {
  data: DashboardData;
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

export const WeeklyView: React.FC<WeeklyViewProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<'donations' | 'distribution'>('donations');
  const [timeScale, setTimeScale] = useState<'days' | 'months' | 'years'>('days');
  const [exporting, setExporting] = useState<'image' | 'pdf' | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // --- ANALYSE DES DISPONIBILITÉS ---
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

  // --- LOGIQUE D'AGRÉGATION ÉVOLUTION ---
  const evolutionData = useMemo(() => {
    if (timeScale === 'days') {
      // Évolution par jour pour le mois sélectionné
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
      // Évolution par mois pour l'année sélectionnée
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
      // Évolution par année
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

  const totals = useMemo(() => {
    return evolutionData.reduce((acc, curr) => ({
      val1: acc.val1 + (viewMode === 'donations' ? curr.total : curr.expedie),
      val2: acc.val2 + (viewMode === 'donations' ? curr.fixe : curr.net),
      val3: acc.val3 + (viewMode === 'donations' ? curr.mobile : curr.rendu)
    }), { val1: 0, val2: 0, val3: 0 });
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
        const pageWidth = pdf.internal.pageSize.getWidth();
        const ratio = pageWidth / (canvas.width / 2.5);
        pdf.addImage(imgData, 'PNG', 0, 10, pageWidth, (canvas.height / 2.5) * ratio);
        pdf.save(`${filename}.pdf`);
      }
    } catch (err) { console.error(err); } finally { setExporting(null); }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 pb-24">
      
      {/* HEADER & SELECTORS */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
        <div className="bg-white p-1.5 rounded-3xl shadow-xl border border-slate-100 flex gap-2">
           <button onClick={() => setViewMode('donations')} className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${viewMode === 'donations' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-slate-400 hover:bg-slate-50'}`}>
             <Activity size={16}/> Prélèvements
           </button>
           <button onClick={() => setViewMode('distribution')} className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${viewMode === 'distribution' ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' : 'text-slate-400 hover:bg-slate-50'}`}>
             <Truck size={16}/> Distribution
           </button>
        </div>

        <div className="flex bg-slate-900/5 p-1.5 rounded-2xl border border-slate-200">
           {[
             { id: 'days', label: 'Jours' },
             { id: 'months', label: 'Mois' },
             { id: 'years', label: 'Années' }
           ].map(s => (
             <button 
               key={s.id} 
               onClick={() => setTimeScale(s.id as any)} 
               className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${timeScale === s.id ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
             >
                {s.label}
             </button>
           ))}
        </div>

        <div className="flex gap-2">
          <button onClick={() => handleExport('image')} disabled={!!exporting} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 shadow-sm transition-all">
            {exporting === 'image' ? <Loader2 size={16} className="animate-spin" /> : <FileImage size={18} />}
          </button>
          <button onClick={() => handleExport('pdf')} disabled={!!exporting} className={`p-3 text-white rounded-xl shadow-lg transition-all ${viewMode === 'donations' ? 'bg-emerald-600' : 'bg-orange-600'}`}>
            {exporting === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={18} />}
          </button>
        </div>
      </div>

      <div ref={contentRef} className="space-y-8 p-1">
        {/* BANNIÈRE ANALYTIQUE */}
        <div className={`relative overflow-hidden rounded-[3.5rem] p-10 lg:p-14 text-white shadow-3xl border border-white/5 transition-colors duration-1000 ${viewMode === 'donations' ? 'bg-[#0f172a]' : 'bg-[#1e1b4b]'}`}>
           <div className={`absolute top-0 right-0 w-[500px] h-[500px] blur-[150px] rounded-full -mr-40 -mt-40 opacity-20 ${viewMode === 'donations' ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
           
           <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
              <div className="flex items-center gap-8">
                 <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center shadow-2xl transition-all ${viewMode === 'donations' ? 'bg-emerald-600' : 'bg-orange-600'}`}>
                    {timeScale === 'days' ? <CalendarDays size={32} /> : timeScale === 'months' ? <Layers size={32} /> : <Award size={32} />}
                 </div>
                 <div>
                    <h2 className="text-4xl lg:text-5xl font-black uppercase tracking-tighter leading-none mb-3">Courbe d'Évolution</h2>
                    <p className="text-white/40 font-black uppercase tracking-[0.5em] text-[10px] flex items-center gap-3">
                       <Clock size={14} className={viewMode === 'donations' ? "text-emerald-500" : "text-orange-500"} /> 
                       Séquence : {timeScale === 'days' ? `${MONTHS_FR[selectedMonth]} ${selectedYear}` : timeScale === 'months' ? `Année ${selectedYear}` : 'Série Historique'}
                    </p>
                 </div>
              </div>

              <div className="flex flex-wrap justify-center gap-4 bg-white/5 p-2 rounded-[2rem] backdrop-blur-xl border border-white/10 shadow-inner">
                 <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent text-[11px] font-black uppercase tracking-widest outline-none px-6 py-2 cursor-pointer">
                    {availableYears.map(y => <option key={y} value={y} className="text-slate-900">{y}</option>)}
                 </select>
                 {timeScale === 'days' && (
                   <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="bg-transparent text-[11px] font-black uppercase tracking-widest outline-none px-6 py-2 border-l border-white/10 cursor-pointer">
                      {availableMonths.map(m => <option key={m} value={m} className="text-slate-900">{MONTHS_FR[m]}</option>)}
                   </select>
                 )}
              </div>
           </div>
        </div>

        {/* METRICS & CHART */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
           <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-[2.5rem] p-8 shadow-warm border border-slate-100 group">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{viewMode === 'donations' ? 'Total Période' : 'Expédié Brut'}</p>
                 <div className="flex items-baseline gap-2">
                    <p className="text-5xl font-[950] text-slate-900 tracking-tighter">{totals.val1.toLocaleString()}</p>
                    <p className="text-[10px] font-black text-slate-300 uppercase">Poches</p>
                 </div>
                 <div className="mt-6 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full transition-all duration-1000" style={{ width: '100%', backgroundColor: viewMode === 'donations' ? THEME.total : THEME.expedie }} />
                 </div>
              </div>

              <div className="bg-white rounded-[2.5rem] p-8 shadow-warm border border-slate-100">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{viewMode === 'donations' ? 'Collecte Fixe' : 'Sorties Nettes'}</p>
                 <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-black text-slate-800 tracking-tighter">{totals.val2.toLocaleString()}</p>
                    <p className="text-[10px] font-black text-slate-300 uppercase">{viewMode === 'donations' ? 'Sur Site' : 'Utilisation'}</p>
                 </div>
                 <div className="mt-6 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full transition-all duration-1000" style={{ width: `${(totals.val2 / (totals.val1 || 1)) * 100}%`, backgroundColor: viewMode === 'donations' ? THEME.fixed : THEME.net }} />
                 </div>
              </div>

              <div className="bg-white rounded-[2.5rem] p-8 shadow-warm border border-slate-100">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{viewMode === 'donations' ? 'Unité Mobile' : 'Rendus / Périmés'}</p>
                 <div className="flex items-baseline gap-2">
                    <p className={`text-4xl font-black tracking-tighter ${viewMode === 'donations' ? 'text-slate-800' : 'text-red-500'}`}>{totals.val3.toLocaleString()}</p>
                    <p className="text-[10px] font-black text-slate-300 uppercase">Poches</p>
                 </div>
                 <div className="mt-6 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full transition-all duration-1000" style={{ width: `${(totals.val3 / (totals.val1 || 1)) * 100}%`, backgroundColor: viewMode === 'donations' ? THEME.mobile : THEME.rendu }} />
                 </div>
              </div>
           </div>

           <div className="lg:col-span-3 bg-white rounded-[3.5rem] p-10 lg:p-14 shadow-2xl border border-slate-100 flex flex-col">
              <div className="flex items-center justify-between mb-12">
                 <h3 className="text-2xl font-[950] text-slate-900 tracking-tighter uppercase leading-none">Graphique de Performance</h3>
                 <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full" style={{ backgroundColor: viewMode === 'donations' ? THEME.total : THEME.expedie }}></div>
                       <span className="text-[9px] font-black text-slate-400 uppercase">{viewMode === 'donations' ? 'Total' : 'Brut'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full" style={{ backgroundColor: viewMode === 'donations' ? THEME.fixed : THEME.net }}></div>
                       <span className="text-[9px] font-black text-slate-400 uppercase">{viewMode === 'donations' ? 'Fixe' : 'Net'}</span>
                    </div>
                 </div>
              </div>

              <div className="flex-1 w-full min-h-[450px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={evolutionData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} padding={{left: 20, right: 20}} />
                       <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} />
                       <Tooltip 
                          contentStyle={{ borderRadius: '2rem', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)', padding: '1.5rem', fontWeight: '900' }}
                          cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }}
                       />
                       <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2rem' }} />
                       
                       {viewMode === 'donations' ? (
                         <>
                           <Line type="monotone" dataKey="total" name="Total Collecte" stroke={THEME.total} strokeWidth={5} dot={{ r: 4, strokeWidth: 2, fill: 'white' }} activeDot={{ r: 8, strokeWidth: 0 }} animationDuration={2000} />
                           <Line type="monotone" dataKey="fixe" name="Site Fixe" stroke={THEME.fixed} strokeWidth={3} strokeDasharray="5 5" dot={false} animationDuration={1500} />
                           <Line type="monotone" dataKey="mobile" name="Unité Mobile" stroke={THEME.mobile} strokeWidth={3} strokeDasharray="5 5" dot={false} animationDuration={1500} />
                         </>
                       ) : (
                         <>
                           <Line type="monotone" dataKey="expedie" name="Volume Brute" stroke={THEME.expedie} strokeWidth={5} dot={{ r: 4, strokeWidth: 2, fill: 'white' }} activeDot={{ r: 8, strokeWidth: 0 }} animationDuration={2000} />
                           <Line type="monotone" dataKey="net" name="Consommation Net" stroke={THEME.net} strokeWidth={4} dot={false} animationDuration={1500} />
                           <Line type="monotone" dataKey="rendu" name="Rendus" stroke={THEME.rendu} strokeWidth={2} strokeDasharray="4 4" dot={false} animationDuration={1000} />
                         </>
                       )}
                    </LineChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>

        {/* JOURNAL RÉCAPITULATIF */}
        <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden">
           <div className="px-10 py-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg"><Activity size={18} /></div>
                 <h3 className="font-black text-lg uppercase tracking-tight text-slate-800">Journal du Flux Temporel</h3>
              </div>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full">
                 <thead>
                    <tr className="bg-slate-50/30 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                       <th className="px-12 py-6 text-left">Période</th>
                       <th className="px-8 py-6 text-center">{viewMode === 'donations' ? 'Total' : 'Expédié'}</th>
                       <th className="px-8 py-6 text-center">{viewMode === 'donations' ? 'Fixe' : 'Rendu'}</th>
                       <th className="px-8 py-6 text-center">{viewMode === 'donations' ? 'Mobile' : 'Net'}</th>
                       <th className="px-12 py-6 text-right">Contribution</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {evolutionData.map((row, i) => {
                       const mainVal = viewMode === 'donations' ? row.total : row.expedie;
                       const perc = totals.val1 > 0 ? (mainVal / totals.val1) * 100 : 0;
                       return (
                          <tr key={i} className="hover:bg-slate-50/80 transition-colors group">
                             <td className="px-12 py-6 font-black text-slate-800 uppercase tracking-tighter">
                                {timeScale === 'days' ? `Jour ${row.name}` : timeScale === 'months' ? row.name : `Année ${row.name}`}
                             </td>
                             <td className="px-8 py-6 text-center text-sm font-black text-slate-900">{mainVal.toLocaleString()}</td>
                             <td className={`px-8 py-6 text-center text-xs font-bold ${viewMode === 'donations' ? 'text-emerald-600' : 'text-red-500'}`}>{viewMode === 'donations' ? row.fixe.toLocaleString() : row.rendu.toLocaleString()}</td>
                             <td className={`px-8 py-6 text-center text-xs font-bold ${viewMode === 'donations' ? 'text-orange-600' : 'text-emerald-600'}`}>{viewMode === 'donations' ? row.mobile.toLocaleString() : row.net.toLocaleString()}</td>
                             <td className="px-12 py-6 text-right">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black text-slate-500 uppercase">
                                   {perc.toFixed(1)}%
                                </div>
                             </td>
                          </tr>
                       );
                    })}
                 </tbody>
              </table>
           </div>
        </div>
      </div>
    </div>
  );
};