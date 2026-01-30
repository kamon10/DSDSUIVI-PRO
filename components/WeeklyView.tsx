import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DashboardData } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Calendar, Layers, TrendingUp, Filter, Target, CheckCircle2, AlertTriangle, XCircle, Clock, MapPin, Zap, Activity, FileImage, FileText, Loader2 } from 'lucide-react';
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

const getWeekNumber = (d: Date): number => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

export const WeeklyView: React.FC<WeeklyViewProps> = ({ data }) => {
  const [exporting, setExporting] = useState<'image' | 'pdf' | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // 1. Extraire les années disponibles
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    data.dailyHistory.forEach(h => {
      const year = h.date.split('/')[2];
      if (year) years.add(year);
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [data.dailyHistory]);

  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<number>(-1);
  const [selectedWeekNum, setSelectedWeekNum] = useState<number | null>(null);

  // Synchronisation des filtres dès que les données arrivent
  useEffect(() => {
    if (data.dailyHistory.length > 0) {
      const latest = data.dailyHistory[0]; // Le service trie par date décroissante
      const [,, y] = latest.date.split('/');
      const m = parseInt(latest.date.split('/')[1]) - 1;
      
      if (!selectedYear || !availableYears.includes(selectedYear)) {
        setSelectedYear(y);
      }
      if (selectedMonth === -1) {
        setSelectedMonth(m);
      }
    }
  }, [data.dailyHistory, availableYears, selectedYear, selectedMonth]);

  // Extraire les mois pour l'année sélectionnée
  const availableMonths = useMemo(() => {
    const months = new Set<number>();
    data.dailyHistory.forEach(h => {
      const parts = h.date.split('/');
      if (parts[2] === selectedYear) {
        months.add(parseInt(parts[1]) - 1);
      }
    });
    const sorted = Array.from(months).sort((a, b) => a - b);
    // Auto-ajustement si le mois n'est plus disponible pour l'année choisie
    if (selectedMonth !== -1 && !months.has(selectedMonth) && sorted.length > 0) {
      setSelectedMonth(sorted[sorted.length - 1]);
    }
    return sorted;
  }, [data.dailyHistory, selectedYear, selectedMonth]);

  // Calcul des statistiques hebdomadaires
  const weeklyStats = useMemo(() => {
    if (!selectedYear || selectedMonth === -1) return [];

    const weeksMap = new Map<number, any>();
    
    data.dailyHistory.forEach(record => {
      const parts = record.date.split('/');
      const d = parseInt(parts[0]);
      const m = parseInt(parts[1]) - 1;
      const y = parts[2];
      
      if (y === selectedYear && m === selectedMonth) {
        const dateObj = new Date(parseInt(y), m, d);
        const weekNum = getWeekNumber(dateObj);
        
        if (!weeksMap.has(weekNum)) {
          weeksMap.set(weekNum, {
            week: weekNum,
            fixed: 0,
            mobile: 0,
            total: 0,
            days: 0,
            startDate: dateObj,
            endDate: dateObj,
            regionalData: new Map<string, number>()
          });
        }
        
        const w = weeksMap.get(weekNum);
        w.fixed += record.stats.fixed;
        w.mobile += record.stats.mobile;
        w.total += record.stats.realized;
        w.days += 1;
        if (dateObj < w.startDate) w.startDate = dateObj;
        if (dateObj > w.endDate) w.endDate = dateObj;

        record.sites.forEach(site => {
          const reg = site.region || "AUTRES";
          const currentVal = w.regionalData.get(reg) || 0;
          w.regionalData.set(reg, currentVal + site.total);
        });
      }
    });

    const monthlyObjective = data.monthly.objective || 1;
    const weeklyObjective = Math.round(monthlyObjective / 4.33);

    return Array.from(weeksMap.values())
      .sort((a, b) => a.week - b.week)
      .map(w => ({
        ...w,
        objective: weeklyObjective,
        percentage: (w.total / weeklyObjective) * 100,
        formattedRange: `Semaine ${w.week} (du ${w.startDate.getDate().toString().padStart(2, '0')}/${(w.startDate.getMonth()+1).toString().padStart(2, '0')} au ${w.endDate.getDate().toString().padStart(2, '0')}/${(w.endDate.getMonth()+1).toString().padStart(2, '0')})`,
        sortedRegions: Array.from(w.regionalData.entries())
          .map(([name, total]) => ({ name, total }))
          .sort((a, b) => b.total - a.total)
      }));
  }, [data.dailyHistory, selectedYear, selectedMonth, data.monthly.objective]);

  const activeWeekData = useMemo(() => {
    if (weeklyStats.length === 0) return null;
    return selectedWeekNum ? (weeklyStats.find(w => w.week === selectedWeekNum) || weeklyStats[weeklyStats.length - 1]) : weeklyStats[weeklyStats.length - 1];
  }, [selectedWeekNum, weeklyStats]);

  const intensityColor = useMemo(() => {
    if (!activeWeekData) return COLORS.blue;
    const p = activeWeekData.percentage;
    if (p >= 100) return COLORS.green;
    if (p >= 75) return COLORS.orange;
    return COLORS.red;
  }, [activeWeekData]);

  const handleExport = async (type: 'image' | 'pdf') => {
    if (!contentRef.current) return;
    setExporting(type);
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const element = contentRef.current;
      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true, 
        backgroundColor: '#f8fafc',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png', 1.0);
      const monthLabel = selectedMonth !== -1 ? MONTHS_FR[selectedMonth] : 'HEBDO';
      const filename = `RAPPORT_HEBDO_${monthLabel}_${selectedYear}`.replace(/\s/g, '_');

      if (type === 'image') {
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = imgData;
        link.click();
      } else {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth(); 
        const pageHeight = pdf.internal.pageSize.getHeight();
        const ratio = pageWidth / (canvas.width / 2);
        const finalWidth = pageWidth;
        const finalHeight = (canvas.height / 2) * ratio;
        let drawHeight = finalHeight;
        let drawWidth = finalWidth;
        if (finalHeight > pageHeight - 20) {
          const scaleFactor = (pageHeight - 20) / finalHeight;
          drawHeight = finalHeight * scaleFactor;
          drawWidth = finalWidth * scaleFactor;
        }
        pdf.addImage(imgData, 'PNG', (pageWidth - drawWidth) / 2, 10, drawWidth, drawHeight, undefined, 'FAST');
        pdf.save(`${filename}.pdf`);
      }
    } catch (err) {
      console.error("Export Weekly Error:", err);
    } finally {
      setExporting(null);
    }
  };

  if (data.dailyHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-6 opacity-20">
        <Layers size={64} className="text-slate-300 animate-pulse" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.5em]">Aucune donnée historique détectée</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24">
      
      {/* 0. BOUTONS D'EXPORTATION */}
      <div className="flex justify-end gap-3 px-4">
        <button onClick={() => handleExport('image')} disabled={!!exporting} className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">
          {exporting === 'image' ? <Loader2 size={16} className="animate-spin" /> : <FileImage size={16} />} Exporter PNG
        </button>
        <button onClick={() => handleExport('pdf')} disabled={!!exporting} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md">
          {exporting === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />} Rapport PDF
        </button>
      </div>

      <div ref={contentRef} className="space-y-10 p-1">
        {/* 1. HEADER COCKPIT HEBDO */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 via-blue-500 to-indigo-400 rounded-[3.5rem] blur opacity-20"></div>
          <div className="relative bg-[#0f172a] rounded-[3.5rem] p-10 lg:p-14 text-white shadow-3xl overflow-hidden border border-white/5">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-600/10 blur-[120px] rounded-full -mr-40 -mt-40 animate-pulse"></div>
            
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
              <div className="flex items-center gap-8">
                <div className="w-16 h-16 lg:w-20 lg:h-20 bg-emerald-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl pulse-glow">
                   <Layers size={36} />
                </div>
                <div>
                  <h2 className="text-4xl font-black uppercase tracking-tighter leading-none mb-3">Rythme Hebdomadaire</h2>
                  <p className="text-emerald-300/40 font-black uppercase tracking-[0.6em] text-[10px] flex items-center gap-3">
                    <Activity size={14} className="text-emerald-500 animate-pulse" /> 
                    PERFORMANCE {selectedMonth !== -1 ? MONTHS_FR[selectedMonth].toUpperCase() : '...'} {selectedYear || '...'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap justify-center lg:justify-end gap-3 bg-white/5 p-2 rounded-[2rem] border border-white/10 backdrop-blur-xl">
                <div className="flex items-center gap-2 px-6 py-3 border-r border-white/10">
                  <Calendar size={14} className="text-emerald-400" />
                  <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent outline-none text-[11px] font-black uppercase tracking-widest cursor-pointer hover:text-emerald-400 transition-colors">
                    {availableYears.map(y => <option key={y} value={y} className="text-slate-900">{y}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 px-6 py-3">
                  <Filter size={14} className="text-blue-400" />
                  <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="bg-transparent outline-none text-[11px] font-black uppercase tracking-widest cursor-pointer hover:text-blue-400 transition-colors">
                    {availableMonths.map(m => <option key={m} value={m} className="text-slate-900">{MONTHS_FR[m]}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. ANALYSE COMPARATIVE DES SEMAINES */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-[3.5rem] p-10 shadow-warm border border-slate-100 flex flex-col group">
             <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <TrendingUp size={24} />
                   </div>
                   <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">Mix de Collecte par Semaine</h3>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-[9px] font-black text-emerald-700 uppercase">Fixe</span>
                  </div>
                  <div className="flex items-center gap-2 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    <span className="text-[9px] font-black text-orange-700 uppercase">Mobile</span>
                  </div>
                </div>
             </div>
             
             <div className="flex-1 min-h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%" key={`${selectedMonth}-${selectedYear}`}>
                  <BarChart data={weeklyStats} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} onClick={(data: any) => {
                    if (data && data.activePayload) setSelectedWeekNum(data.activePayload[0].payload.week);
                  }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 900, fill: '#64748b'}} tickFormatter={(v) => `S${v}`} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 900, fill: '#64748b'}} />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}} 
                      contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)', padding: '1.5rem' }} 
                    />
                    <Bar dataKey="fixed" stackId="a" fill={COLORS.fixed} name="Fixe">
                      {weeklyStats.map((entry, index) => (
                        <Cell key={`cell-f-${index}`} fillOpacity={selectedWeekNum === entry.week ? 1 : 0.8} />
                      ))}
                    </Bar>
                    <Bar dataKey="mobile" stackId="a" fill={COLORS.mobile} radius={[8, 8, 0, 0]} name="Mobile">
                      {weeklyStats.map((entry, index) => (
                        <Cell key={`cell-m-${index}`} fillOpacity={selectedWeekNum === entry.week ? 1 : 0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
             </div>
             <p className="text-center text-[9px] font-black text-slate-300 uppercase tracking-widest mt-6">Cliquez sur une barre pour isoler l'analyse d'une semaine</p>
          </div>

          <div className="bg-white rounded-[3.5rem] p-10 shadow-warm border border-slate-100 flex flex-col justify-between relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 opacity-10 blur-2xl rounded-full -mr-16 -mt-16 transition-all duration-1000" style={{ backgroundColor: intensityColor }}></div>
             
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Clock size={14} style={{ color: intensityColor }} /> Focus Période
                </p>
                {activeWeekData ? (
                  <>
                    <h3 className="text-2xl font-black text-slate-800 uppercase leading-none tracking-tighter mb-8">
                      {activeWeekData.formattedRange.split('(')[0]}
                      <span className="block text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest italic">
                        {activeWeekData.formattedRange.match(/\(([^)]+)\)/)?.[1] || ""}
                      </span>
                    </h3>

                    <div className="grid grid-cols-2 gap-4 mb-10">
                       <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 text-center group/kpi">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover/kpi:text-emerald-500 transition-colors">Réalisé</p>
                          <p className="text-3xl font-black text-slate-900">{activeWeekData.total.toLocaleString()}</p>
                       </div>
                       <div className="bg-slate-900 p-6 rounded-[2rem] text-center shadow-xl group/kpi">
                          <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1 group-hover/kpi:text-red-400 transition-colors">Atteinte</p>
                          <p className="text-3xl font-black" style={{ color: intensityColor }}>{activeWeekData.percentage.toFixed(0)}%</p>
                       </div>
                    </div>

                    <div className="space-y-4 mb-8">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                        <MapPin size={14} className="text-blue-500" /> Contribution Régionale
                      </p>
                      <div className="space-y-3 max-h-[160px] overflow-y-auto no-scrollbar pr-2">
                         {activeWeekData.sortedRegions.slice(0, 4).map((reg: any, i: number) => (
                           <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-white hover:shadow-sm transition-all">
                              <span className="text-[10px] font-black text-slate-700 uppercase truncate pr-4">{reg.name.replace('PRES ', '')}</span>
                              <div className="flex items-center gap-3">
                                 <span className="text-[10px] font-black text-slate-900">{reg.total.toLocaleString()}</span>
                                 <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: i === 0 ? COLORS.green : i === 1 ? COLORS.blue : '#cbd5e1' }}></div>
                              </div>
                           </div>
                         ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-20 text-center text-slate-300 uppercase font-black text-[10px] tracking-widest">
                    Sélectionnez une semaine
                  </div>
                )}
             </div>

             {activeWeekData && (
               <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Intensité</p>
                    <p className="text-lg font-black uppercase tracking-tighter" style={{ color: intensityColor }}>
                      {activeWeekData.percentage >= 100 ? 'Élite' : activeWeekData.percentage >= 75 ? 'Standard' : 'Critique'}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-300 shadow-sm">
                     <Zap size={24} style={{ fill: activeWeekData.percentage >= 100 ? intensityColor : 'none', color: intensityColor }} />
                  </div>
               </div>
             )}
          </div>
        </div>

        {/* 3. TABLEAU RÉCAPITULATIF PROFESSIONNEL */}
        <div className="bg-white rounded-[4rem] shadow-2xl border border-slate-100 overflow-hidden">
          <div className="px-12 py-10 border-b border-slate-50 bg-slate-50/50 flex flex-col lg:flex-row justify-between items-center gap-6">
             <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
                   <Activity size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800 leading-none mb-1">Journal de Séquences</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Comparaison des performances par semaine</p>
                </div>
             </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-50 bg-slate-50/30">
                  <th className="px-12 py-6 text-left">Séquence</th>
                  <th className="px-8 py-6 text-center">Activité</th>
                  <th className="px-8 py-6 text-center">Mix Fixe/Mob..</th>
                  <th className="px-8 py-6 text-center">Total</th>
                  <th className="px-12 py-6 text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {weeklyStats.length > 0 ? weeklyStats.map((w, idx) => {
                  const sColor = w.percentage >= 100 ? COLORS.green : w.percentage >= 75 ? COLORS.orange : COLORS.red;
                  return (
                    <tr key={idx} 
                      onClick={() => setSelectedWeekNum(w.week)}
                      className={`hover:bg-slate-50 cursor-pointer transition-all group ${selectedWeekNum === w.week ? 'bg-slate-50/80' : ''}`}
                    >
                      <td className="px-12 py-7">
                        <div className="flex items-center gap-5">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${selectedWeekNum === w.week ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 group-hover:text-slate-600'}`}>
                             <Calendar size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Semaine {w.week}</p>
                            <p className="text-[10px] font-bold text-slate-400 tracking-tighter uppercase">{w.formattedRange.match(/\(([^)]+)\)/)?.[1] || ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-7 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-50 rounded-full border border-slate-100 text-[10px] font-black text-slate-500 uppercase">
                          {w.days} jours actifs
                        </div>
                      </td>
                      <td className="px-8 py-7 text-center">
                        <div className="flex items-center justify-center gap-4">
                          <div className="text-center">
                            <p className="text-xs font-black text-emerald-600">{w.fixed.toLocaleString()}</p>
                            <p className="text-[8px] font-black text-slate-300 uppercase">Fixe</p>
                          </div>
                          <div className="w-px h-6 bg-slate-100"></div>
                          <div className="text-center">
                            <p className="text-xs font-black text-orange-600">{w.mobile.toLocaleString()}</p>
                            <p className="text-[8px] font-black text-slate-300 uppercase">Mobile</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-7 text-center">
                        <p className="text-lg font-black text-slate-900">{w.total.toLocaleString()}</p>
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Poches</p>
                      </td>
                      <td className="px-12 py-7 text-right">
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-3">
                             <span className="text-sm font-black" style={{ color: sColor }}>{w.percentage.toFixed(1)}%</span>
                             {w.percentage >= 100 ? <CheckCircle2 size={16} className="text-emerald-500" /> : w.percentage >= 75 ? <AlertTriangle size={16} className="text-orange-500" /> : <XCircle size={16} className="text-red-500" />}
                          </div>
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                            <div className="h-full transition-all duration-1000" style={{ backgroundColor: sColor, width: `${Math.min(w.percentage, 100)}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={5} className="px-10 py-32 text-center">
                      <div className="flex flex-col items-center gap-6 opacity-20">
                        <Layers size={64} className="text-slate-300" />
                        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.5em]">Aucune séquence détectée pour cette période</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};