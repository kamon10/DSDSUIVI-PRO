
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { DashboardData, DistributionRecord } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingUp, Activity, Truck, FileImage, FileText, Calendar, Clock, CalendarDays, ChevronDown, PieChart as PieIcon, Target } from 'lucide-react';
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

  // 1. Gestion des années
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

  // 2. Gestion des mois et jours
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

  // 3. Agrégation des données pour le Camembert
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
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      
      {/* BARRE DE CONTRÔLE SUPÉRIEURE HARMONISÉE */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-2">
        <div className="flex bg-white/80 backdrop-blur-md p-1.5 rounded-[2rem] shadow-xl border border-slate-100">
           <button onClick={() => setViewMode('donations')} className={`px-10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'donations' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-slate-400 hover:text-slate-600'}`}>
             Mix Collecte
           </button>
           <button onClick={() => setViewMode('distribution')} className={`px-10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'distribution' ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' : 'text-slate-400 hover:text-slate-600'}`}>
             Mix Sortie
           </button>
        </div>

        <div className="flex items-center gap-3 bg-white/50 p-1.5 rounded-2xl border border-slate-100">
           {['day', 'month', 'year'].map(s => (
             <button key={s} onClick={() => setTimeScale(s as any)} className={`px-8 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${timeScale === s ? 'bg-white text-slate-900 shadow-lg border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
                {s === 'day' ? 'Jour' : s === 'month' ? 'Mois' : 'Année'}
             </button>
           ))}
        </div>
      </div>

      {/* ZONE GRAPHIQUE PROFESSIONNELLE AVEC CAMEMBERT */}
      <div ref={contentRef} className="p-1">
        <div className="bg-white rounded-[4rem] p-12 lg:p-20 shadow-2xl border border-slate-100 relative overflow-hidden flex flex-col min-h-[900px]">
          
          <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-12 px-4">
            <div>
              <h2 className="text-[3.5rem] font-[950] text-slate-900 leading-none tracking-tighter uppercase mb-4">
                {viewMode === 'donations' ? 'Répartition Collecte' : 'Mix de Distribution'}
              </h2>
              <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.5em] flex items-center gap-3">
                <PieIcon size={14} className="text-slate-400" />
                {timeScale === 'day' ? `Analyse du jour : ${selectedDay}` : timeScale === 'month' ? `Analyse mensuelle : ${MONTHS_FR[selectedMonth]} ${selectedYear}` : `Analyse annuelle : ${selectedYear}`}
              </p>
            </div>

            {/* LÉGENDE STYLE PILULES */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-4 px-8 py-3.5 rounded-full border border-slate-100 bg-slate-50 shadow-sm">
                <div className={`w-3.5 h-3.5 rounded-full ${viewMode === 'donations' ? 'bg-emerald-600' : 'bg-orange-600'}`}></div>
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-900">POCHES TOTALES : {totalValue.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* GRAPHIQUE CAMEMBERT (DONUT) XXL */}
          <div className="flex-1 w-full flex flex-col lg:flex-row items-center justify-center gap-16">
            <div className="relative w-full max-w-[550px] aspect-square">
              <ResponsiveContainer width="100%" height="100%">
                {pieData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-20"><Activity size={120} className="text-slate-300 animate-pulse" /><p className="text-sm font-black uppercase tracking-[0.5em]">Aucune donnée</p></div>
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
                      animationDuration={1500}
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

              {/* LABEL CENTRAL DU DONUT */}
              {totalValue > 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2">Total Global</span>
                  <span className="text-7xl font-[950] text-slate-900 tracking-tighter leading-none">{totalValue.toLocaleString()}</span>
                  <span className="text-[12px] font-black text-slate-300 uppercase tracking-widest mt-2">Poches</span>
                </div>
              )}
            </div>

            {/* DÉTAILS DE LA LÉGENDE LATÉRALE */}
            <div className="flex flex-col gap-6 w-full lg:w-96">
               {pieData.map((item, idx) => (
                 <div key={idx} className="group p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-white hover:shadow-xl transition-all duration-500">
                    <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center gap-4">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }}></div>
                          <span className="text-xs font-black text-slate-800 uppercase tracking-widest">{item.name}</span>
                       </div>
                       <span className="text-sm font-black text-slate-900">{((item.value / totalValue) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                       <span className="text-3xl font-black text-slate-900">{item.value.toLocaleString()}</span>
                       <span className="text-[10px] font-bold text-slate-400 uppercase">Poches</span>
                    </div>
                    <div className="mt-4 w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                       <div className="h-full transition-all duration-1000" style={{ width: `${(item.value / totalValue) * 100}%`, backgroundColor: item.color }}></div>
                    </div>
                 </div>
               ))}
            </div>
          </div>
          
          {/* BARRE DE NAVIGATION ET FILTRES BASSE */}
          <div className="mt-20 flex flex-wrap items-center justify-between border-t-2 border-slate-50 pt-12 px-4">
             <div className="flex items-center gap-6">
               <div className="flex items-center gap-3 px-8 py-5 bg-slate-50 border border-slate-200 rounded-[2rem] shadow-inner">
                 <Calendar size={20} className="text-slate-400" />
                 <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="bg-transparent font-[900] text-slate-800 text-sm outline-none cursor-pointer uppercase">
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                 </select>
               </div>
               {timeScale !== 'year' && (
                 <div className="flex items-center gap-3 px-8 py-5 bg-slate-50 border border-slate-200 rounded-[2rem] shadow-inner">
                   <Clock size={20} className="text-slate-400" />
                   <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="bg-transparent font-[900] text-slate-800 text-sm outline-none cursor-pointer uppercase">
                     {availableMonths.map(m => <option key={m} value={m}>{MONTHS_FR[m]}</option>)}
                   </select>
                 </div>
               )}
               {timeScale === 'day' && (
                 <div className={`flex items-center gap-4 px-8 py-5 border rounded-[2rem] text-white shadow-2xl transition-all ${viewMode === 'donations' ? 'bg-emerald-600 border-emerald-500 shadow-emerald-100' : 'bg-orange-600 border-orange-500 shadow-orange-100'}`}>
                   <CalendarDays size={20} />
                   <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="bg-transparent font-[900] text-sm outline-none cursor-pointer uppercase">
                     {availableDays.map(d => <option key={d} value={d} className="text-slate-900">{d}</option>)}
                   </select>
                 </div>
               )}
             </div>

             <div className="flex gap-4">
                <button onClick={() => handleExport('image')} className="p-5 bg-slate-100 text-slate-500 rounded-[1.5rem] hover:bg-slate-900 hover:text-white transition-all shadow-sm"><FileImage size={28}/></button>
                <button onClick={() => handleExport('pdf')} className="p-5 bg-slate-900 text-white rounded-[1.5rem] hover:bg-black transition-all shadow-2xl"><FileText size={28}/></button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
