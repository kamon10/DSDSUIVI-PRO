import React, { useMemo, useState, useEffect, useRef } from 'react';
import { DashboardData } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Line } from 'recharts';
import { BarChart3, TrendingUp, Calendar, Filter, Zap, Activity, ChevronDown, Clock, FileImage, FileText, Loader2 } from 'lucide-react';
import { COLORS } from '../constants';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface EvolutionViewProps {
  data: DashboardData;
}

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const MONTHS_SHORT = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
  "Jul", "Août", "Sep", "Oct", "Nov", "Déc"
];

export const EvolutionView: React.FC<EvolutionViewProps> = ({ data }) => {
  const [timeScale, setTimeScale] = useState<'days' | 'months' | 'years'>('days');
  const [exporting, setExporting] = useState<'image' | 'pdf' | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    data.dailyHistory.forEach(h => {
      const year = parseInt(h.date.split('/')[2]);
      if (!isNaN(year)) years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [data.dailyHistory]);

  const [selectedYear, setSelectedYear] = useState<number>(availableYears[0] || data.year);

  const availableMonths = useMemo(() => {
    const months = new Set<number>();
    data.dailyHistory.forEach(h => {
      const parts = h.date.split('/').map(Number);
      if (parts[2] === selectedYear) {
        months.add(parts[1] - 1);
      }
    });
    return Array.from(months).sort((a, b) => a - b);
  }, [data.dailyHistory, selectedYear]);

  const [selectedMonth, setSelectedMonth] = useState<number>(
    availableMonths.includes(new Date().getMonth()) ? new Date().getMonth() : (availableMonths[availableMonths.length - 1] || 0)
  );

  useEffect(() => {
    if (!availableMonths.includes(selectedMonth) && availableMonths.length > 0) {
      setSelectedMonth(availableMonths[availableMonths.length - 1]);
    }
  }, [selectedYear, availableMonths, selectedMonth]);

  const dailyEvolution = useMemo(() => {
    return [...data.dailyHistory]
      .filter(h => {
        const parts = h.date.split('/').map(Number);
        return parts[2] === selectedYear && (parts[1] - 1) === selectedMonth;
      })
      .sort((a, b) => {
        const [da, ma, ya] = a.date.split('/').map(Number);
        const [db, mb, yb] = b.date.split('/').map(Number);
        return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
      })
      .map(h => ({
        name: h.date.split('/')[0],
        date: h.date,
        fullName: `le ${h.date}`,
        total: h.stats.realized,
        fixe: h.stats.fixed,
        mobile: h.stats.mobile
      }));
  }, [data.dailyHistory, selectedYear, selectedMonth]);

  const monthlyEvolution = useMemo(() => {
    const monthsMap = new Map<number, any>();
    data.dailyHistory.forEach(h => {
      const parts = h.date.split('/').map(Number);
      if (parts[2] === selectedYear) {
        const monthIdx = parts[1] - 1;
        if (!monthsMap.has(monthIdx)) {
          monthsMap.set(monthIdx, { 
            name: MONTHS_SHORT[monthIdx], 
            fullName: `en ${MONTHS_FR[monthIdx]} ${selectedYear}`, 
            total: 0, fixe: 0, mobile: 0 
          });
        }
        const m = monthsMap.get(monthIdx);
        m.total += h.stats.realized;
        m.fixe += h.stats.fixed;
        m.mobile += h.stats.mobile;
      }
    });
    return Array.from(monthsMap.entries()).sort((a, b) => a[0] - b[0]).map(entry => entry[1]);
  }, [data.dailyHistory, selectedYear]);

  const yearlyEvolution = useMemo(() => {
    const yearsMap = new Map<number, any>();
    data.dailyHistory.forEach(h => {
      const parts = h.date.split('/').map(Number);
      const year = parts[2];
      if (!yearsMap.has(year)) {
        yearsMap.set(year, { 
          name: year.toString(), 
          fullName: `en ${year}`, 
          total: 0, fixe: 0, mobile: 0 
        });
      }
      const y = yearsMap.get(year);
      y.total += h.stats.realized;
      y.fixe += h.stats.fixed;
      y.mobile += h.stats.mobile;
    });
    return Array.from(yearsMap.entries()).sort((a, b) => a[0] - b[0]).map(entry => entry[1]);
  }, [data.dailyHistory]);

  const activeData = useMemo(() => {
    if (timeScale === 'days') return dailyEvolution;
    if (timeScale === 'months') return monthlyEvolution;
    return yearlyEvolution;
  }, [timeScale, dailyEvolution, monthlyEvolution, yearlyEvolution]);

  const stats = useMemo(() => {
    if (activeData.length === 0) return { avg: 0, max: 0, maxLabel: '', maxSite: '', min: 0, minLabel: '', minSite: '' };
    const values = activeData.map(d => d.total);
    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);
    const maxItem = [...activeData].reverse().find(d => d.total === maxVal);
    const minItem = [...activeData].reverse().find(d => d.total === minVal);
    let maxSiteName = "";
    let minSiteName = "";
    if (timeScale === 'days' && maxItem && minItem) {
      const maxDay = data.dailyHistory.find(h => h.date === (maxItem as any).date);
      const minDay = data.dailyHistory.find(h => h.date === (minItem as any).date);
      if (maxDay) {
        const sorted = [...maxDay.sites].sort((a, b) => b.total - a.total);
        if (sorted[0]) maxSiteName = sorted[0].name;
      }
      if (minDay) {
        const sorted = [...minDay.sites].filter(s => s.total > 0).sort((a, b) => a.total - b.total);
        if (sorted[0]) minSiteName = sorted[0].name;
      }
    }
    return {
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      max: maxVal,
      maxLabel: maxItem ? maxItem.fullName : '',
      maxSite: maxSiteName,
      min: minVal,
      minLabel: minItem ? minItem.fullName : '',
      minSite: minSiteName
    };
  }, [activeData, data.dailyHistory, timeScale]);

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
      if (type === 'image') {
        const link = document.createElement('a');
        link.download = `EVOLUTION_CNTS_${timeScale}.png`;
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
        pdf.save(`EVOLUTION_CNTS_${timeScale}.pdf`);
      }
    } catch (err) {
      console.error("Export Evolution Error:", err);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="bg-slate-900 rounded-[3rem] p-10 lg:p-14 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-12">
          <div className="flex items-center gap-8">
            <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center shadow-xl border border-white/10">
              <TrendingUp size={36} className="text-white" />
            </div>
            <div>
              <h2 className="text-3xl lg:text-4xl font-black uppercase tracking-tighter leading-none mb-3">Courbes d'Évolution</h2>
              <p className="text-blue-300/40 font-black uppercase tracking-[0.4em] text-[9px]">Analyse des cycles de collecte nationale</p>
            </div>
          </div>
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-md">
            {[
              { id: 'days', label: 'JOURS', icon: <Activity size={12}/> },
              { id: 'months', label: 'MOIS', icon: <Calendar size={12}/> },
              { id: 'years', label: 'ANNÉES', icon: <BarChart3 size={12}/> }
            ].map(scale => (
              <button 
                key={scale.id}
                onClick={() => setTimeScale(scale.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  timeScale === scale.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                }`}
              >
                {scale.icon} {scale.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] shadow-warm border border-orange-50 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
              <Filter size={20} />
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtrage Temporel</p>
              <h4 className="text-sm font-black text-slate-800 uppercase">
                {timeScale === 'days' ? `${MONTHS_FR[selectedMonth]} ${selectedYear}` : timeScale === 'months' ? `Année ${selectedYear}` : "Historique Global"}
              </h4>
           </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
           {timeScale !== 'years' && (
              <div className="relative">
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700 outline-none pr-10 appearance-none cursor-pointer"
                >
                  {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
           )}
           {timeScale === 'days' && (
              <div className="relative">
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="bg-blue-600 text-white border border-blue-500 rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-widest outline-none pr-10 appearance-none cursor-pointer"
                >
                  {availableMonths.map(m => <option key={m} value={m} className="text-slate-900">{MONTHS_FR[m]}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" />
              </div>
           )}
           <div className="flex gap-2 ml-2">
             <button onClick={() => handleExport('image')} disabled={!!exporting} className="p-3 bg-slate-100 text-slate-800 rounded-xl hover:bg-slate-200 transition-all">
               {exporting === 'image' ? <Loader2 size={16} className="animate-spin" /> : <FileImage size={16} />}
             </button>
             <button onClick={() => handleExport('pdf')} disabled={!!exporting} className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-md">
               {exporting === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
             </button>
           </div>
        </div>
      </div>

      <div ref={contentRef} className="space-y-10 p-1">
        <div className="bg-white rounded-[3.5rem] p-10 lg:p-14 shadow-warm border border-orange-100 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row justify-between items-center mb-12 gap-6">
             <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Tendances de Collecte</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                  {timeScale === 'days' ? `Évolution quotidienne : ${MONTHS_FR[selectedMonth]} ${selectedYear}` : timeScale === 'months' ? `Mois de l'année ${selectedYear}` : "Progression annuelle"}
                </p>
             </div>
             <div className="flex gap-4">
                <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
                   <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                   <span className="text-[9px] font-black uppercase text-blue-700 tracking-widest">Total</span>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                   <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                   <span className="text-[9px] font-black uppercase text-emerald-700 tracking-widest">Site Fixe</span>
                </div>
                <div className="flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-full border border-orange-100">
                   <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                   <span className="text-[9px] font-black uppercase text-orange-700 tracking-widest">Mobile</span>
                </div>
             </div>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {activeData.length === 0 ? (
                <div className="flex items-center justify-center h-full flex-col gap-4">
                  <Activity size={48} className="text-slate-200 animate-pulse" />
                  <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Aucune donnée</p>
                </div>
              ) : timeScale === 'days' ? (
                <AreaChart data={activeData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.1}/>
                      <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} />
                  <Tooltip contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="total" stroke={COLORS.blue} fillOpacity={1} fill="url(#colorTotal)" strokeWidth={4} name="Total" />
                  <Area type="monotone" dataKey="fixe" stroke={COLORS.fixed} fill="transparent" strokeWidth={2} name="Fixe" strokeDasharray="5 5" />
                  <Area type="monotone" dataKey="mobile" stroke={COLORS.mobile} fill="transparent" strokeWidth={2} name="Mobile" strokeDasharray="5 5" />
                </AreaChart>
              ) : (
                <BarChart data={activeData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} />
                  <Tooltip contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="fixe" fill={COLORS.fixed} radius={[6, 6, 0, 0]} name="Fixe" />
                  <Bar dataKey="mobile" fill={COLORS.mobile} radius={[6, 6, 0, 0]} name="Mobile" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { label: 'Moyenne Période', value: stats.avg, icon: <Activity size={24}/>, light: 'bg-blue-50', text: 'text-blue-600' },
            { label: 'Record Maximal', value: stats.max, date: stats.maxLabel, icon: <Zap size={24}/>, light: 'bg-orange-50', text: 'text-orange-600' },
            { label: 'Point Bas', value: stats.min, date: stats.minLabel, icon: <TrendingUp size={24}/>, light: 'bg-red-50', text: 'text-red-600' }
          ].map((item, i) => (
            <div key={i} className="bg-white p-10 rounded-[3rem] shadow-warm border border-orange-50 flex items-center justify-between">
              <div className="flex items-center gap-6">
                 <div className={`w-14 h-14 ${item.light} ${item.text} rounded-2xl flex items-center justify-center`}>{item.icon}</div>
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                    <p className="text-4xl font-black text-slate-900 tracking-tighter">{item.value.toLocaleString()}</p>
                    {item.date && <p className="text-[9px] font-black text-slate-500 uppercase mt-1">{item.date}</p>}
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};