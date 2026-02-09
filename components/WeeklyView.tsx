
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DashboardData, DistributionRecord } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Calendar, Layers, TrendingUp, Filter, Target, CheckCircle2, AlertTriangle, XCircle, Clock, MapPin, Zap, Activity, FileImage, FileText, Loader2, Truck, Package } from 'lucide-react';
import { COLORS, PRODUCT_COLORS } from '../constants';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface WeeklyViewProps {
  data: DashboardData;
}

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const getWeekNumber = (d: Date): number => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

// Couleurs locales pour garantir l'affichage harmonisé
const THEME = {
  fixed: '#10b981',      // Vert Émeraude Vibrant (Collecte)
  mobile: '#fbbf24',     // Ambre Brillant (Collecte / Mobilité)
  expedie: '#f59e0b',    // Orange Pro (Sortie)
  rendu: '#f43f5e',      // Rose-Rouge Alerte
  national: '#10b981'    // Vert National
};

export const WeeklyView: React.FC<WeeklyViewProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<'donations' | 'distribution'>('donations');
  const [exporting, setExporting] = useState<'image' | 'pdf' | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    data.dailyHistory.forEach(h => {
      const parts = h.date.split('/');
      if (parts.length === 3) years.add(parts[2]);
    });
    data.distributions?.records.forEach(r => {
      const parts = r.date.split('/');
      if (parts.length === 3) years.add(parts[2]);
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [data.dailyHistory, data.distributions]);

  // Initialisation robuste
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    if (data.dailyHistory.length > 0) return data.dailyHistory[0].date.split('/')[2];
    return availableYears[0] || new Date().getFullYear().toString();
  });

  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    if (data.dailyHistory.length > 0) return parseInt(data.dailyHistory[0].date.split('/')[1]) - 1;
    return new Date().getMonth();
  });

  const [selectedWeekNum, setSelectedWeekNum] = useState<number | null>(null);

  const availableMonths = useMemo(() => {
    const months = new Set<number>();
    data.dailyHistory.forEach(h => {
      const parts = h.date.split('/');
      if (parts[2] === selectedYear) months.add(parseInt(parts[1]) - 1);
    });
    data.distributions?.records.forEach(r => {
      const parts = r.date.split('/');
      if (parts[2] === selectedYear) months.add(parseInt(parts[1]) - 1);
    });
    return Array.from(months).sort((a, b) => a - b);
  }, [data.dailyHistory, data.distributions, selectedYear]);

  const weeklyStats = useMemo(() => {
    if (!selectedYear || selectedMonth === -1) return [];
    const weeksMap = new Map<number, any>();
    
    if (viewMode === 'donations') {
      data.dailyHistory.forEach(record => {
        const parts = record.date.split('/');
        if (parts.length !== 3) return;
        const [dStr, mStr, yStr] = parts;
        const m = parseInt(mStr) - 1;
        if (yStr === selectedYear && m === selectedMonth) {
          const dateObj = new Date(parseInt(yStr), m, parseInt(dStr));
          const weekNum = getWeekNumber(dateObj);
          if (!weeksMap.has(weekNum)) {
            weeksMap.set(weekNum, { 
              week: weekNum, fixed: 0, mobile: 0, total: 0, days: 0, 
              startDate: dateObj, endDate: dateObj, regionalData: new Map<string, number>() 
            });
          }
          const w = weeksMap.get(weekNum);
          w.fixed += record.stats.fixed || 0;
          w.mobile += record.stats.mobile || 0;
          w.total += record.stats.realized || 0;
          w.days += 1;
          if (dateObj < w.startDate) w.startDate = dateObj;
          if (dateObj > w.endDate) w.endDate = dateObj;
          record.sites.forEach(site => {
            const reg = site.region || "AUTRES";
            w.regionalData.set(reg, (w.regionalData.get(reg) || 0) + (site.total || 0));
          });
        }
      });
    } else {
      data.distributions?.records.forEach(record => {
        const parts = record.date.split('/');
        if (parts.length !== 3) return;
        const [dStr, mStr, yStr] = parts;
        const m = parseInt(mStr) - 1;
        if (yStr === selectedYear && m === selectedMonth) {
          const dateObj = new Date(parseInt(yStr), m, parseInt(dStr));
          const weekNum = getWeekNumber(dateObj);
          if (!weeksMap.has(weekNum)) {
            weeksMap.set(weekNum, { 
              week: weekNum, qty: 0, rendu: 0, total: 0, daysSet: new Set<string>(), 
              startDate: dateObj, endDate: dateObj, regionalData: new Map<string, number>() 
            });
          }
          const w = weeksMap.get(weekNum);
          w.qty += record.quantite || 0;
          w.rendu += record.rendu || 0;
          w.total += record.quantite || 0;
          w.daysSet.add(record.date);
          if (dateObj < w.startDate) w.startDate = dateObj;
          if (dateObj > w.endDate) w.endDate = dateObj;
          const reg = record.region || "AUTRES";
          w.regionalData.set(reg, (w.regionalData.get(reg) || 0) + (record.quantite || 0));
        }
      });
    }

    const monthlyObjective = data.monthly.objective || 1;
    const weeklyObjective = Math.round(monthlyObjective / 4.33);

    return Array.from(weeksMap.values())
      .sort((a, b) => a.week - b.week)
      .map(w => ({
        ...w,
        days: viewMode === 'donations' ? w.days : w.daysSet.size,
        objective: weeklyObjective,
        percentage: viewMode === 'donations' ? (w.total / weeklyObjective) * 100 : (w.qty > 0 ? ((w.qty - w.rendu) / w.qty) * 100 : 0),
        formattedRange: `Semaine ${w.week} (du ${w.startDate.getDate().toString().padStart(2, '0')}/${(w.startDate.getMonth()+1).toString().padStart(2, '0')} au ${w.endDate.getDate().toString().padStart(2, '0')}/${(w.endDate.getMonth()+1).toString().padStart(2, '0')})`,
        sortedRegions: Array.from(w.regionalData.entries())
          .map(([name, total]) => ({ name, total }))
          .sort((a, b) => b.total - a.total)
      }));
  }, [data, viewMode, selectedYear, selectedMonth]);

  const activeWeekData = useMemo(() => {
    if (weeklyStats.length === 0) return null;
    return selectedWeekNum ? (weeklyStats.find(w => w.week === selectedWeekNum) || weeklyStats[weeklyStats.length - 1]) : weeklyStats[weeklyStats.length - 1];
  }, [selectedWeekNum, weeklyStats]);

  const intensityColor = useMemo(() => {
    if (!activeWeekData) return THEME.national;
    const p = activeWeekData.percentage;
    if (viewMode === 'donations') {
      if (p >= 100) return THEME.fixed;
      if (p >= 75) return THEME.mobile;
      return THEME.rendu;
    } else {
      if (p >= 95) return THEME.fixed;
      if (p >= 90) return THEME.expedie;
      return THEME.mobile;
    }
  }, [activeWeekData, viewMode]);

  const handleExport = async (type: 'image' | 'pdf') => {
    if (!contentRef.current) return;
    setExporting(type);
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const canvas = await html2canvas(contentRef.current, { scale: 2, useCORS: true, backgroundColor: '#f8fafc' });
      const imgData = canvas.toDataURL('image/png', 1.0);
      if (type === 'image') {
        const link = document.createElement('a'); link.download = `RAPPORT_HEBDO_${viewMode}.png`; link.href = imgData; link.click();
      } else {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const ratio = pageWidth / (canvas.width / 2);
        pdf.addImage(imgData, 'PNG', 0, 10, pageWidth, (canvas.height / 2) * ratio);
        pdf.save(`RAPPORT_HEBDO_${viewMode}.pdf`);
      }
    } catch (err) { console.error(err); } finally { setExporting(null); }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24">
      
      {/* SÉLECTEUR DE MODE HARMONISÉ */}
      <div className="flex flex-wrap items-center justify-between gap-6 px-4">
        <div className="bg-white p-1.5 rounded-3xl shadow-xl border border-slate-100 flex gap-2">
           <button onClick={() => { setViewMode('donations'); setSelectedWeekNum(null); }} className={`px-10 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${viewMode === 'donations' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-slate-400 hover:bg-slate-50'}`}>
             <Activity size={16}/> Collecte
           </button>
           <button onClick={() => { setViewMode('distribution'); setSelectedWeekNum(null); }} className={`px-10 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${viewMode === 'distribution' ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' : 'text-slate-400 hover:bg-slate-50'}`}>
             <Truck size={16}/> Sortie
           </button>
        </div>
        <div className="flex gap-3">
          <button onClick={() => handleExport('image')} disabled={!!exporting} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm">
            {exporting === 'image' ? <Loader2 size={16} className="animate-spin" /> : <FileImage size={16} />}
          </button>
          <button onClick={() => handleExport('pdf')} disabled={!!exporting} className={`p-3 text-white rounded-xl shadow-md transition-all ${viewMode === 'donations' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
            {exporting === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
          </button>
        </div>
      </div>

      <div ref={contentRef} className="space-y-10 p-1">
        {/* HEADER */}
        <div className="bg-[#0f172a] rounded-[3.5rem] p-10 lg:p-14 text-white shadow-3xl overflow-hidden relative">
          <div className={`absolute top-0 right-0 w-[500px] h-[500px] blur-[120px] rounded-full -mr-40 -mt-40 opacity-20 ${viewMode === 'donations' ? 'bg-emerald-600' : 'bg-orange-600'}`}></div>
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-8">
              <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center shadow-2xl ${viewMode === 'donations' ? 'bg-emerald-600' : 'bg-orange-600'}`}>
                 {viewMode === 'donations' ? <Layers size={36} /> : <Package size={36} />}
              </div>
              <div>
                <h2 className="text-4xl font-black uppercase tracking-tighter leading-none mb-3">{viewMode === 'donations' ? 'Rythme de Collecte' : 'Flux de Distribution'}</h2>
                <p className="text-white/40 font-black uppercase tracking-[0.5em] text-[10px]">{MONTHS_FR[selectedMonth].toUpperCase()} {selectedYear}</p>
              </div>
            </div>
            <div className="flex gap-4 bg-white/5 p-2 rounded-[2rem] backdrop-blur-xl">
                <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent text-[11px] font-black uppercase tracking-widest outline-none px-4">
                  {availableYears.map(y => <option key={y} value={y} className="text-slate-900">{y}</option>)}
                </select>
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="bg-transparent text-[11px] font-black uppercase tracking-widest outline-none px-4 border-l border-white/10">
                  {availableMonths.map(m => <option key={m} value={m} className="text-slate-900">{MONTHS_FR[m]}</option>)}
                </select>
            </div>
          </div>
        </div>

        {/* SECTION GRAPHIQUE CORRIGÉE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-[3.5rem] p-10 shadow-warm border border-slate-100 flex flex-col">
             <div className="flex items-center justify-between mb-12">
                <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">{viewMode === 'donations' ? 'Analyse de Mixité' : 'Analyse des Volumes'}</h3>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: viewMode === 'donations' ? THEME.fixed : THEME.expedie }}></div><span className="text-[9px] font-black text-slate-400 uppercase">{viewMode === 'donations' ? 'Fixe' : 'Expédié'}</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: viewMode === 'donations' ? THEME.mobile : THEME.rendu }}></div><span className="text-[9px] font-black text-slate-400 uppercase">{viewMode === 'donations' ? 'Mobile' : 'Rendu'}</span></div>
                </div>
             </div>
             
             <div className="h-[450px] w-full min-h-[450px]">
                <ResponsiveContainer width="100%" height="100%">
                  {weeklyStats.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 gap-4"><Activity size={80} className="animate-pulse"/><p className="font-black text-xs uppercase tracking-widest">Aucune donnée trouvée</p></div>
                  ) : (
                    <BarChart 
                      key={`${viewMode}-${selectedMonth}-${selectedYear}`}
                      data={weeklyStats} 
                      margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                      onClick={(d) => d?.activePayload && setSelectedWeekNum(d.activePayload[0].payload.week)}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 900, fill: '#94a3b8'}} tickFormatter={(v) => `SEM ${v}`} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 900, fill: '#94a3b8'}} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)', padding: '1rem' }} />
                      {viewMode === 'donations' ? (
                        <>
                          <Bar dataKey="fixed" stackId="a" fill={THEME.fixed} radius={[0, 0, 0, 0]} name="Site Fixe" />
                          <Bar dataKey="mobile" stackId="a" fill={THEME.mobile} radius={[10, 10, 0, 0]} name="Collecte Mobile" />
                        </>
                      ) : (
                        <>
                          <Bar dataKey="qty" stackId="a" fill={THEME.expedie} radius={[0, 0, 0, 0]} name="Expédié" />
                          <Bar dataKey="rendu" stackId="a" fill={THEME.rendu} radius={[10, 10, 0, 0]} name="Rendu" />
                        </>
                      )}
                    </BarChart>
                  )}
                </ResponsiveContainer>
             </div>
          </div>

          <div className="bg-white rounded-[3.5rem] p-10 shadow-warm border border-slate-100 flex flex-col justify-between group overflow-hidden relative">
             <div className="absolute top-0 right-0 w-32 h-32 opacity-10 blur-2xl rounded-full -mr-16 -mt-16" style={{ backgroundColor: intensityColor }}></div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Séquence Active</p>
                {activeWeekData ? (
                  <>
                    <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tighter mb-10 leading-none">Semaine {activeWeekData.week}</h3>
                    <div className="grid grid-cols-2 gap-4 mb-10">
                       <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 text-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Volume</p>
                          <p className="text-3xl font-black text-slate-900">{viewMode === 'donations' ? activeWeekData.total : activeWeekData.qty}</p>
                       </div>
                       <div className="bg-slate-900 p-6 rounded-[2rem] text-center shadow-xl">
                          <p className="text-[9px] font-black text-white/30 uppercase mb-2">Taux</p>
                          <p className="text-3xl font-black" style={{ color: intensityColor }}>{activeWeekData.percentage.toFixed(0)}%</p>
                       </div>
                    </div>
                    <div className="space-y-3">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><MapPin size={14} style={{ color: intensityColor }}/> Top Régions</p>
                       {activeWeekData.sortedRegions.slice(0, 4).map((r: any, i: number) => (
                         <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                           <span className="text-[10px] font-black text-slate-600 uppercase truncate pr-4">{r.name}</span>
                           <span className="text-[10px] font-black text-slate-900">{r.total}</span>
                         </div>
                       ))}
                    </div>
                  </>
                ) : (
                  <div className="py-20 text-center text-slate-300 uppercase font-black text-[10px]">Sélectionnez un segment</div>
                )}
             </div>
             <div className="mt-10 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex items-center justify-between">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                   {viewMode === 'donations' ? <Zap size={24} style={{ color: intensityColor }} /> : <Truck size={24} style={{ color: intensityColor }} />}
                </div>
                <div className="text-right">
                   <p className="text-[9px] font-black text-slate-400 uppercase">État de santé</p>
                   <p className="text-lg font-black uppercase" style={{ color: intensityColor }}>{activeWeekData?.percentage >= 100 ? 'EXCELLENT' : 'STANDARD'}</p>
                </div>
             </div>
          </div>
        </div>

        {/* JOURNAL */}
        <div className="bg-white rounded-[4rem] shadow-2xl border border-slate-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-12 py-6 text-left">Semaine</th>
                <th className="px-8 py-6 text-center">Jours Actifs</th>
                <th className="px-8 py-6 text-center">{viewMode === 'donations' ? 'Poches' : 'Sorties Net'}</th>
                <th className="px-12 py-6 text-right">Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {weeklyStats.map((w, i) => (
                <tr key={i} onClick={() => setSelectedWeekNum(w.week)} className={`hover:bg-slate-50 cursor-pointer transition-all ${selectedWeekNum === w.week ? 'bg-slate-50' : ''}`}>
                  <td className="px-12 py-7 font-black text-slate-800 uppercase">Séquence {w.week}</td>
                  <td className="px-8 py-7 text-center font-bold text-slate-400 text-xs">{w.days} jrs</td>
                  <td className="px-8 py-7 text-center font-black text-lg text-slate-900">{viewMode === 'donations' ? w.total : (w.qty - w.rendu)}</td>
                  <td className="px-12 py-7 text-right">
                    <span className="px-4 py-1.5 rounded-full text-[10px] font-black" style={{ backgroundColor: `${intensityColor}15`, color: intensityColor }}>
                      {w.percentage.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
