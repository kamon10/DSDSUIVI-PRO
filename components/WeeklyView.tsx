
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DashboardData, DistributionRecord } from '../types';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, Area } from 'recharts';
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

const getDynamicColor = (perf: number) => {
  if (perf >= 90) return '#10b981';
  if (perf >= 75) return '#f59e0b';
  return '#ef4444';
};

const getDistColor = (eff: number) => {
  if (eff >= 95) return '#10b981';
  return '#f59e0b';
};

const THEME = {
  fixed: '#10b981',      
  mobile: '#fbbf24',     
  expedie: '#f59e0b',    
  rendu: '#f43f5e',      
  national: '#10b981',
  trend: '#3b82f6'
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
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [data.dailyHistory]);

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
    return Array.from(months).sort((a, b) => a - b);
  }, [data.dailyHistory, selectedYear]);

  const weeklyStats = useMemo(() => {
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
        formattedRange: `Semaine ${w.week}`,
        sortedRegions: Array.from(w.regionalData.entries())
          .map(([name, total]) => ({ name, total }))
          .sort((a, b) => b.total - a.total)
      }));
  }, [data, viewMode, selectedYear, selectedMonth]);

  const activeWeekData = useMemo(() => {
    if (weeklyStats.length === 0) return null;
    return selectedWeekNum ? (weeklyStats.find(w => w.week === selectedWeekNum) || weeklyStats[weeklyStats.length - 1]) : weeklyStats[weeklyStats.length - 1];
  }, [selectedWeekNum, weeklyStats]);

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
      
      {/* BANDE DES SÉLECTEURS UNIFIÉE */}
      <div className="glass-card p-2 rounded-[2.5rem] flex flex-wrap items-center justify-between gap-4 shadow-2xl transition-all border-l-8" style={{ borderLeftColor: viewMode === 'donations' ? '#10b981' : '#f59e0b' }}>
        
        {/* Palette de Mode */}
        <div className="flex bg-slate-100 p-1.5 rounded-3xl gap-1.5 ml-2">
           <button onClick={() => { setViewMode('donations'); setSelectedWeekNum(null); }} className={`px-8 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'donations' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
             <Activity size={14}/> Collecte
           </button>
           <button onClick={() => { setViewMode('distribution'); setSelectedWeekNum(null); }} className={`px-8 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'distribution' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
             <Truck size={14}/> Sortie
           </button>
        </div>

        {/* Filtres Temporels */}
        <div className="flex items-center gap-2 flex-1 justify-center">
           <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-2">
             <Calendar size={12} className="text-slate-400" />
             <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent outline-none text-[10px] font-black uppercase tracking-widest cursor-pointer text-slate-800">
               {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
             </select>
           </div>
           <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-2">
             <Layers size={12} className="text-slate-400" />
             <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="bg-transparent outline-none text-[10px] font-black uppercase tracking-widest cursor-pointer text-slate-800">
               {availableMonths.map(m => <option key={m} value={m}>{MONTHS_FR[m]}</option>)}
             </select>
           </div>
        </div>

        {/* Exports */}
        <div className="flex gap-2 mr-2">
          <button onClick={() => handleExport('image')} disabled={!!exporting} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm">
            {exporting === 'image' ? <Loader2 size={16} className="animate-spin" /> : <FileImage size={16} />}
          </button>
          <button onClick={() => handleExport('pdf')} disabled={!!exporting} className={`p-3 text-white rounded-xl shadow-md transition-all ${viewMode === 'donations' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
            {exporting === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
          </button>
        </div>
      </div>

      <div ref={contentRef} className="space-y-10 p-1">
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
            <div className="flex bg-white/5 p-5 rounded-[2rem] backdrop-blur-xl border border-white/10">
               <div className="text-center px-6 border-r border-white/10">
                 <p className="text-[8px] font-black uppercase tracking-widest text-white/30 mb-1">Moyenne Hebdo</p>
                 <p className="text-2xl font-black">{Math.round(weeklyStats.reduce((acc, w) => acc + (viewMode === 'donations' ? w.total : w.qty), 0) / (weeklyStats.length || 1))}</p>
               </div>
               <div className="text-center px-6">
                 <p className="text-[8px] font-black uppercase tracking-widest text-white/30 mb-1">Vitalité Moyenne</p>
                 <p className="text-2xl font-black text-blue-400">{Math.round(weeklyStats.reduce((acc, w) => acc + w.percentage, 0) / (weeklyStats.length || 1))}%</p>
               </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-[3.5rem] p-10 shadow-warm border border-slate-100 flex flex-col min-h-[550px]">
             <div className="flex items-center justify-between mb-12">
                <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">Évolution de la période</h3>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: viewMode === 'donations' ? THEME.fixed : THEME.expedie }}></div>
                    <span className="text-[9px] font-black text-slate-400 uppercase">{viewMode === 'donations' ? 'Fixe' : 'Expédié'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: viewMode === 'donations' ? THEME.mobile : THEME.rendu }}></div>
                    <span className="text-[9px] font-black text-slate-400 uppercase">{viewMode === 'donations' ? 'Mobile' : 'Rendu'}</span>
                  </div>
                </div>
             </div>
             
             <div className="flex-1 w-full min-h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  {weeklyStats.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 gap-4">
                      <Activity size={80} className="animate-pulse"/><p className="font-black text-xs uppercase tracking-widest">Aucune donnée</p>
                    </div>
                  ) : (
                    <ComposedChart 
                      key={`${viewMode}-${selectedMonth}-${selectedYear}`}
                      data={weeklyStats} 
                      margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                      onClick={(d: any) => d?.activePayload && setSelectedWeekNum(d.activePayload[0].payload.week)}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} tickFormatter={(v) => `S${v}`} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} />
                      <Tooltip 
                        cursor={{fill: '#f8fafc'}} 
                        contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)', padding: '1rem', fontWeight: '900' }} 
                      />
                      {viewMode === 'donations' ? (
                        <>
                          <Bar dataKey="fixed" stackId="a" fill={THEME.fixed} radius={[0, 0, 0, 0]} name="Site Fixe" />
                          <Bar dataKey="mobile" stackId="a" fill={THEME.mobile} radius={[10, 10, 0, 0]} name="Mobile" />
                          <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={4} dot={{ r: 6, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} name="Total Hebdo" />
                        </>
                      ) : (
                        <>
                          <Bar dataKey="qty" stackId="a" fill={THEME.expedie} radius={[0, 0, 0, 0]} name="Expédié" />
                          <Bar dataKey="rendu" stackId="a" fill={THEME.rendu} radius={[10, 10, 0, 0]} name="Rendu" />
                          <Line type="monotone" dataKey="qty" stroke="#6366f1" strokeWidth={4} dot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} name="Sortie Brute" />
                        </>
                      )}
                    </ComposedChart>
                  )}
                </ResponsiveContainer>
             </div>
          </div>

          <div className="bg-white rounded-[3.5rem] p-10 shadow-warm border border-slate-100 flex flex-col justify-between group overflow-hidden relative min-h-[550px]">
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Séquence Active</p>
                {activeWeekData ? (
                  <>
                    <h3 className="text-4xl font-black text-slate-800 uppercase tracking-tighter mb-10 leading-none">Semaine {activeWeekData.week}</h3>
                    <div className="grid grid-cols-1 gap-4 mb-10">
                       <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between">
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Volume Hebdo</p>
                            <p className="text-4xl font-black text-slate-900">{viewMode === 'donations' ? activeWeekData.total : activeWeekData.qty}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Vitalité</p>
                            <p className="text-4xl font-black" style={{ color: viewMode === 'donations' ? '#10b981' : '#f59e0b' }}>{activeWeekData.percentage.toFixed(0)}%</p>
                          </div>
                       </div>
                    </div>
                    <div className="space-y-3">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><MapPin size={14}/> Leader Régional</p>
                       {activeWeekData.sortedRegions.slice(0, 5).map((r: any, i: number) => (
                         <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-md transition-all">
                           <span className="text-[10px] font-black text-slate-700 uppercase truncate pr-4">{r.name}</span>
                           <span className="text-sm font-black text-slate-900">{r.total}</span>
                         </div>
                       ))}
                    </div>
                  </>
                ) : (
                  <div className="py-20 text-center text-slate-300 uppercase font-black text-[11px] tracking-[0.3em]">Choisissez un segment</div>
                )}
             </div>
             <div className="mt-10 p-6 bg-slate-900 rounded-[2.5rem] flex items-center justify-between shadow-2xl">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                   {viewMode === 'donations' ? <Zap size={24} className="text-emerald-500" /> : <Truck size={24} className="text-orange-500" />}
                </div>
                <div className="text-right">
                   <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Diagnostic Santé</p>
                   <p className="text-lg font-black uppercase text-white">{activeWeekData?.percentage >= 90 ? 'RYTHME OPTIMAL' : 'EN PROGRESSION'}</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
