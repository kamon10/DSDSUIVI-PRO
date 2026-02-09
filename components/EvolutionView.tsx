
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { DashboardData, DistributionRecord } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingUp, Activity, Truck, FileImage, FileText, Calendar, Clock, CalendarDays, ChevronDown, PieChart as PieIcon, Target, Filter } from 'lucide-react';
import { COLORS, PRODUCT_COLORS } from '../constants';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface EvolutionViewProps {
  data: DashboardData;
}

const MONTHS_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

export const EvolutionView: React.FC<EvolutionViewProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<'donations' | 'distribution'>('donations');
  const [timeScale, setTimeScale] = useState<'day' | 'month' | 'year'>('month');
  const [exporting, setExporting] = useState<'image' | 'pdf' | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const availableYears = useMemo(() => {
    if (!data.dailyHistory || data.dailyHistory.length === 0) return [new Date().getFullYear()];
    const years = new Set<number>();
    data.dailyHistory.forEach(h => {
      const parts = h.date.split('/');
      if (parts.length === 3) {
        const y = parseInt(parts[2]);
        if (!isNaN(y)) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [data.dailyHistory]);

  const [selectedYear, setSelectedYear] = useState<number>(availableYears[0]);
  const [selectedMonth, setSelectedMonth] = useState<number>(-1);
  const [selectedDay, setSelectedDay] = useState<string>("");

  const availableMonths = useMemo(() => {
    const months = new Set<number>();
    data.dailyHistory.forEach(h => {
      const parts = h.date.split('/').map(Number);
      if (parts[2] === selectedYear) months.add(parts[1] - 1);
    });
    return Array.from(months).sort((a, b) => a - b);
  }, [data.dailyHistory, selectedYear]);

  const availableDays = useMemo(() => {
    return data.dailyHistory
      .filter(h => {
        const parts = h.date.split('/').map(Number);
        return parts[2] === selectedYear && (parts[1] - 1) === selectedMonth;
      })
      .map(h => h.date);
  }, [data.dailyHistory, selectedYear, selectedMonth]);

  useEffect(() => {
    if (data.dailyHistory && data.dailyHistory.length > 0) {
      const latest = data.dailyHistory[0];
      const parts = latest.date.split('/').map(Number);
      setSelectedYear(parts[2]);
      setSelectedMonth(parts[1] - 1);
      setSelectedDay(latest.date);
    }
  }, [data.dailyHistory]);

  const pieData = useMemo(() => {
    if (viewMode === 'donations') {
      let filtered = data.dailyHistory;
      if (timeScale === 'day') {
        filtered = data.dailyHistory.filter(h => h.date === selectedDay);
      } else if (timeScale === 'month') {
        filtered = data.dailyHistory.filter(h => {
          const p = h.date.split('/').map(Number);
          return p[2] === selectedYear && (p[1] - 1) === selectedMonth;
        });
      } else {
        filtered = data.dailyHistory.filter(h => parseInt(h.date.split('/')[2]) === selectedYear);
      }

      const sums = filtered.reduce((acc, curr) => ({
        fixe: acc.fixe + curr.stats.fixed,
        mobile: acc.mobile + curr.stats.mobile
      }), { fixe: 0, mobile: 0 });

      return [
        { name: 'SITES FIXES', value: sums.fixe, color: '#10b981' },
        { name: 'UNITÉS MOBILES', value: sums.mobile, color: '#f59e0b' }
      ].filter(d => d.value > 0);
    } else {
      const distRecords: DistributionRecord[] = data.distributions?.records || [];
      let targetRecords = distRecords;

      if (timeScale === 'day') {
        targetRecords = distRecords.filter(r => r.date === selectedDay);
      } else if (timeScale === 'month') {
        targetRecords = distRecords.filter(r => {
          const p = r.date.split('/').map(Number);
          return p[2] === selectedYear && (p[1] - 1) === selectedMonth;
        });
      } else {
        targetRecords = distRecords.filter(r => parseInt(r.date.split('/')[2]) === selectedYear);
      }

      const prodMap = new Map<string, number>();
      targetRecords.forEach(r => {
        const prod = r.typeProduit.startsWith("CGR") ? "CGR" : r.typeProduit;
        prodMap.set(prod, (prodMap.get(prod) || 0) + r.quantite);
      });

      return Array.from(prodMap.entries()).map(([name, value]) => ({
        name,
        value,
        color: PRODUCT_COLORS[name] || '#6366f1'
      })).sort((a,b) => b.value - a.value);
    }
  }, [data, viewMode, timeScale, selectedYear, selectedMonth, selectedDay]);

  const totalValue = useMemo(() => pieData.reduce((acc, curr) => acc + curr.value, 0), [pieData]);

  const handleExport = async (type: 'image' | 'pdf') => {
    if (!contentRef.current) return;
    setExporting(type);
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const canvas = await html2canvas(contentRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png', 1.0);
      if (type === 'image') {
        const link = document.createElement('a');
        link.download = `MIX_${viewMode}_${timeScale}.png`; link.href = imgData; link.click();
      } else {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const ratio = pageWidth / (canvas.width / 2);
        pdf.addImage(imgData, 'PNG', 0, 10, pageWidth, (canvas.height / 2) * ratio);
        pdf.save(`MIX_${viewMode}_${timeScale}.pdf`);
      }
    } catch (err) { console.error(err); } finally { setExporting(null); }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24">
      
      {/* BANDE DE CONTRÔLE UNIFIÉE */}
      <div className="glass-card p-2 rounded-[2.5rem] flex flex-wrap items-center justify-between gap-4 shadow-2xl relative transition-all border-l-8" style={{ borderLeftColor: viewMode === 'donations' ? '#10b981' : '#f59e0b' }}>
        
        {/* Palette de Mode */}
        <div className="flex bg-slate-100 p-1.5 rounded-3xl gap-1.5 ml-2">
           <button onClick={() => setViewMode('donations')} className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'donations' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
             <Activity size={14}/> Mix Collecte
           </button>
           <button onClick={() => setViewMode('distribution')} className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'distribution' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
             <Truck size={14}/> Mix Sortie
           </button>
        </div>

        {/* Sélecteurs Temporels */}
        <div className="flex items-center gap-2 flex-1 justify-center">
           <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
              {['day', 'month', 'year'].map(s => (
                <button key={s} onClick={() => setTimeScale(s as any)} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${timeScale === s ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400'}`}>
                   {s === 'day' ? 'Jour' : s === 'month' ? 'Mois' : 'Année'}
                </button>
              ))}
           </div>
           
           <div className="hidden lg:flex items-center gap-2">
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-2">
                 <Calendar size={12} className="text-slate-400" />
                 <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="bg-transparent font-black text-slate-800 text-[10px] outline-none cursor-pointer uppercase">
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                 </select>
              </div>
              {timeScale !== 'year' && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-2">
                   <Clock size={12} className="text-slate-400" />
                   <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="bg-transparent font-black text-slate-800 text-[10px] outline-none cursor-pointer uppercase">
                     {availableMonths.map(m => <option key={m} value={m}>{MONTHS_FR[m]}</option>)}
                   </select>
                </div>
              )}
           </div>
        </div>

        {/* Exports */}
        <div className="flex gap-2 mr-2">
           <button onClick={() => handleExport('image')} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm"><FileImage size={16}/></button>
           <button onClick={() => handleExport('pdf')} className="p-3 bg-slate-900 text-white rounded-xl hover:bg-black shadow-lg"><FileText size={16}/></button>
        </div>
      </div>

      {/* ZONE GRAPHIQUE */}
      <div ref={contentRef} className="p-1">
        <div className="bg-white rounded-[4rem] p-12 lg:p-20 shadow-2xl border border-slate-100 relative overflow-hidden flex flex-col min-h-[850px]">
          
          <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-12 px-4">
            <div>
              <h2 className="text-[3rem] font-[950] text-slate-900 leading-none tracking-tighter uppercase mb-4">
                {viewMode === 'donations' ? 'Répartition Collecte' : 'Mix de Distribution'}
              </h2>
              <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.5em] flex items-center gap-3">
                <PieIcon size={14} className="text-slate-400" />
                {timeScale === 'day' ? `Analyse du jour : ${selectedDay}` : timeScale === 'month' ? `Analyse mensuelle : ${MONTHS_FR[selectedMonth]} ${selectedYear}` : `Analyse annuelle : ${selectedYear}`}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-4 px-8 py-3.5 rounded-full border border-slate-100 bg-slate-50 shadow-sm">
                <div className={`w-3.5 h-3.5 rounded-full ${viewMode === 'donations' ? 'bg-emerald-600' : 'bg-orange-600'}`}></div>
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-900">POCHES TOTALES : {totalValue.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full flex flex-col lg:flex-row items-center justify-center gap-16">
            <div className="relative w-full max-w-[500px] aspect-square">
              <ResponsiveContainer width="100%" height="100%">
                {pieData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-20"><Activity size={100} className="text-slate-300 animate-pulse" /><p className="text-xs font-black uppercase tracking-[0.5em]">Aucune donnée</p></div>
                ) : (
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius="65%"
                      outerRadius="90%"
                      paddingAngle={10}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={20}
                      startAngle={90}
                      endAngle={450}
                      animationDuration={1200}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '2rem', border: 'none', boxShadow: '0 50px 100px -20px rgba(0,0,0,0.2)', padding: '1.5rem', fontWeight: '900' }}
                    />
                  </PieChart>
                )}
              </ResponsiveContainer>

              {totalValue > 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2">Total Global</span>
                  <span className="text-6xl font-[950] text-slate-900 tracking-tighter leading-none">{totalValue.toLocaleString()}</span>
                  <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest mt-2">Poches</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-5 w-full lg:w-96">
               {pieData.map((item, idx) => (
                 <div key={idx} className="group p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-white hover:shadow-xl transition-all duration-500">
                    <div className="flex items-center justify-between mb-3">
                       <div className="flex items-center gap-4">
                          <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                          <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">{item.name}</span>
                       </div>
                       <span className="text-xs font-black text-slate-900">{((item.value / totalValue) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                       <span className="text-2xl font-black text-slate-900">{item.value.toLocaleString()}</span>
                       <span className="text-[9px] font-bold text-slate-400 uppercase">Poches</span>
                    </div>
                    <div className="mt-3 w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                       <div className="h-full transition-all duration-1000" style={{ width: `${(item.value / totalValue) * 100}%`, backgroundColor: item.color }}></div>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
