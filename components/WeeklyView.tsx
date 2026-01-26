
import React, { useState, useMemo } from 'react';
import { DashboardData } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Calendar, Layers, TrendingUp, Filter, ChevronRight, Building2, Truck, Target, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { COLORS } from '../constants';

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
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    data.dailyHistory.forEach(h => {
      const year = h.date.split('/')[2];
      if (year) years.add(year);
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [data.dailyHistory]);

  const [selectedYear, setSelectedYear] = useState(availableYears[0] || new Date().getFullYear().toString());

  const availableMonths = useMemo(() => {
    const months = new Set<number>();
    data.dailyHistory.forEach(h => {
      const parts = h.date.split('/');
      if (parts[2] === selectedYear) {
        months.add(parseInt(parts[1]) - 1);
      }
    });
    return Array.from(months).sort((a, b) => a - b);
  }, [data.dailyHistory, selectedYear]);

  const [selectedMonth, setSelectedMonth] = useState<number>(
    availableMonths.length > 0 ? availableMonths[availableMonths.length - 1] : new Date().getMonth()
  );

  const weeklyStats = useMemo(() => {
    const weeksMap = new Map<number, any>();
    
    data.dailyHistory.forEach(record => {
      const [d, m, y] = record.date.split('/');
      const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      
      if (dateObj.getFullYear().toString() === selectedYear && dateObj.getMonth() === selectedMonth) {
        const weekNum = getWeekNumber(dateObj);
        
        if (!weeksMap.has(weekNum)) {
          weeksMap.set(weekNum, {
            week: weekNum,
            fixed: 0,
            mobile: 0,
            total: 0,
            days: 0,
            startDate: dateObj,
            endDate: dateObj
          });
        }
        
        const w = weeksMap.get(weekNum);
        w.fixed += record.stats.fixed;
        w.mobile += record.stats.mobile;
        w.total += record.stats.realized;
        w.days += 1;
        if (dateObj < w.startDate) w.startDate = dateObj;
        if (dateObj > w.endDate) w.endDate = dateObj;
      }
    });

    const weeklyObjective = Math.round(data.monthly.objective / 4.33);

    return Array.from(weeksMap.values())
      .sort((a, b) => a.week - b.week)
      .map(w => ({
        ...w,
        objective: weeklyObjective,
        percentage: (w.total / weeklyObjective) * 100,
        formattedRange: `Semaine ${w.week} (du ${w.startDate.getDate().toString().padStart(2, '0')}/${(w.startDate.getMonth()+1).toString().padStart(2, '0')} au ${w.endDate.getDate().toString().padStart(2, '0')}/${(w.endDate.getMonth()+1).toString().padStart(2, '0')})`
      }));
  }, [data.dailyHistory, selectedYear, selectedMonth, data.monthly.objective]);

  const [selectedWeekNum, setSelectedWeekNum] = useState<number | null>(null);
  
  const activeWeekData = useMemo(() => 
    selectedWeekNum ? weeklyStats.find(w => w.week === selectedWeekNum) : weeklyStats[weeklyStats.length - 1]
  , [selectedWeekNum, weeklyStats]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      
      {/* 1. HEADER FILTRES HEBDO */}
      <div className="bg-slate-900 rounded-[2.5rem] p-6 lg:p-10 shadow-2xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/10 rounded-full blur-[80px]"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner">
               <Clock size={24} className="text-emerald-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">Synthèse Hebdomadaire</h2>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">Analyse des cycles de collecte par mois</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center lg:justify-end gap-3">
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 flex items-center gap-2">
              <Calendar size={14} className="text-slate-400" />
              <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent outline-none text-xs font-black uppercase tracking-widest cursor-pointer">
                {availableYears.map(y => <option key={y} value={y} className="text-slate-900">{y}</option>)}
              </select>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="bg-transparent outline-none text-xs font-black uppercase tracking-widest cursor-pointer">
                {availableMonths.map(m => <option key={m} value={m} className="text-slate-900">{MONTHS_FR[m]}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FOCUS KPI SEMAINE ACTIVE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Graphique d'évolution */}
        <div className="lg:col-span-2 bg-white rounded-[3rem] p-8 shadow-xl border border-slate-100">
           <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <TrendingUp size={20} />
                 </div>
                 <h3 className="text-lg font-black uppercase tracking-tight text-slate-800">Évolution du Mix Hebdo</h3>
              </div>
           </div>
           
           <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                {/* Use any type for data to avoid Recharts TS definition errors for activePayload */}
                <BarChart data={weeklyStats} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} onClick={(data: any) => {
                  if (data && data.activePayload) setSelectedWeekNum(data.activePayload[0].payload.week);
                }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="week" tick={{fontSize: 10, fontWeight: 900}} />
                  <YAxis tick={{fontSize: 10, fontWeight: 900}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="fixed" stackId="a" fill={COLORS.fixed} name="Fixe" />
                  <Bar dataKey="mobile" stackId="a" fill={COLORS.mobile} radius={[4, 4, 0, 0]} name="Mobile" />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Focus Details */}
        <div className="bg-slate-50 rounded-[3rem] p-8 border border-slate-200 flex flex-col justify-between">
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Détails Sélection</p>
              <h3 className="text-xl font-black text-slate-800 uppercase leading-tight">{activeWeekData?.formattedRange || "Sélectionnez une semaine"}</h3>
           </div>

           <div className="space-y-4 my-8">
              <div className="flex justify-between items-center p-4 bg-white rounded-2xl shadow-sm border-l-4 border-emerald-500">
                 <div className="flex items-center gap-3">
                    <Building2 className="text-emerald-500" size={18} />
                    <span className="text-[10px] font-black uppercase text-slate-400">Fixe</span>
                 </div>
                 <span className="text-lg font-black text-slate-800">{activeWeekData?.fixed.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white rounded-2xl shadow-sm border-l-4 border-orange-500">
                 <div className="flex items-center gap-3">
                    <Truck className="text-orange-500" size={18} />
                    <span className="text-[10px] font-black uppercase text-slate-400">Mobile</span>
                 </div>
                 <span className="text-lg font-black text-slate-800">{activeWeekData?.mobile.toLocaleString() || 0}</span>
              </div>
           </div>

           <div className="bg-slate-900 rounded-[2rem] p-6 text-white text-center shadow-xl">
              <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Performance Hebdo</p>
              <p className="text-4xl font-black text-emerald-400">{(activeWeekData?.percentage || 0).toFixed(1)}%</p>
              <div className="w-full bg-white/10 h-1 rounded-full mt-4 overflow-hidden">
                 <div className="h-full bg-emerald-500" style={{ width: `${Math.min(activeWeekData?.percentage || 0, 100)}%` }}></div>
              </div>
           </div>
        </div>
      </div>

      {/* 3. TABLEAU RÉCAPITULATIF DES SEMAINES DU MOIS */}
      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="px-10 py-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400">
                 <Layers size={20} />
              </div>
              <h3 className="font-black text-lg uppercase tracking-tight text-slate-800">
                Synthèse Mensuelle par Semaine : {MONTHS_FR[selectedMonth]} {selectedYear}
              </h3>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">
                <th className="px-10 py-6 text-left">Période Hebdomadaire</th>
                <th className="px-6 py-6 text-center">Jours de Collecte</th>
                <th className="px-6 py-6 text-center">Fixe / Mobile</th>
                <th className="px-6 py-6 text-center">Total Réalisé</th>
                <th className="px-10 py-6 text-right">Taux d'Atteinte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {weeklyStats.length > 0 ? weeklyStats.map((w, idx) => {
                const getStatusIcon = (p: number) => {
                  if (p >= 100) return <CheckCircle2 size={14} className="text-emerald-500" />;
                  if (p >= 75) return <AlertTriangle size={14} className="text-orange-500" />;
                  return <XCircle size={14} className="text-red-500" />;
                };
                
                return (
                  <tr key={idx} 
                    onClick={() => setSelectedWeekNum(w.week)}
                    className={`hover:bg-slate-50 cursor-pointer transition-all group ${selectedWeekNum === w.week ? 'bg-slate-50/80' : ''}`}
                  >
                    <td className="px-10 py-5">
                      <div className="flex items-center gap-3">
                        <ChevronRight size={14} className={`transition-transform ${selectedWeekNum === w.week ? 'rotate-90 text-red-500' : 'text-slate-300'}`} />
                        <span className="text-sm font-black text-slate-800 uppercase tracking-tighter">Semaine {w.week}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="text-xs font-bold text-slate-400">{w.days} jours actifs</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-xs font-bold text-emerald-600">{w.fixed} F</span>
                        <span className="text-slate-200">|</span>
                        <span className="text-xs font-bold text-orange-600">{w.mobile} M</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="text-lg font-black text-slate-900">{w.total.toLocaleString()}</span>
                    </td>
                    <td className="px-10 py-5 text-right">
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-2">
                           <span className={`text-[10px] font-black ${w.percentage >= 100 ? 'text-emerald-600' : w.percentage >= 75 ? 'text-orange-500' : 'text-red-500'}`}>
                             {w.percentage.toFixed(1)}%
                           </span>
                           {getStatusIcon(w.percentage)}
                        </div>
                        <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${w.percentage >= 100 ? 'bg-emerald-500' : w.percentage >= 75 ? 'bg-orange-500' : 'bg-red-500'}`} style={{ width: `${Math.min(w.percentage, 100)}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={5} className="px-10 py-20 text-center">
                    <p className="text-xs font-black text-slate-300 uppercase tracking-[0.3em]">Aucune donnée hebdomadaire pour cette période</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
