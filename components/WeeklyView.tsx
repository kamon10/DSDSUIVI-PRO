
import React, { useState, useMemo } from 'react';
import { DashboardData } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { Calendar, Layers, TrendingUp, Filter, ChevronRight, Building2, Truck } from 'lucide-react';

interface WeeklyViewProps {
  data: DashboardData;
}

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

// Helper pour calculer le numéro de semaine d'une date (ISO)
const getWeekNumber = (d: Date): number => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

export const WeeklyView: React.FC<WeeklyViewProps> = ({ data }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  // Extraction des données hebdomadaires
  const weeklyStats = useMemo(() => {
    const weeksMap = new Map<number, any>();
    
    data.dailyHistory.forEach(record => {
      const [d, m, y] = record.date.split('/');
      const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      
      // On ne traite que le mois sélectionné
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

    // Objectif hebdo théorique (Objectif mensuel / 4.33 semaines par mois)
    const weeklyObjective = Math.round(data.monthly.objective / 4.33);

    return Array.from(weeksMap.values())
      .sort((a, b) => a.week - b.week)
      .map(w => ({
        ...w,
        objective: weeklyObjective,
        percentage: (w.total / weeklyObjective) * 100,
        formattedRange: `Du ${w.startDate.getDate().toString().padStart(2, '0')} au ${w.endDate.getDate().toString().padStart(2, '0')}`
      }));
  }, [data.dailyHistory, selectedYear, selectedMonth, data.monthly.objective]);

  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  
  const activeWeekData = useMemo(() => 
    selectedWeek ? weeklyStats.find(w => w.week === selectedWeek) : weeklyStats[weeklyStats.length - 1]
  , [selectedWeek, weeklyStats]);

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      
      {/* HEADER STRATÉGIQUE */}
      <div className="bg-slate-900 rounded-[3.5rem] p-10 text-white shadow-3xl relative overflow-hidden border border-white/5">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/20 blur-[100px] rounded-full -mr-40 -mt-40"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-900/50">
              <Layers size={40} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">Synthèse Hebdomadaire</h1>
              <p className="text-white/40 font-bold uppercase tracking-[0.3em] mt-2 text-[10px]">Analyse des cycles de collecte</p>
              <div className="mt-4 flex gap-4">
                <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                   <Calendar size={14} className="text-blue-400" />
                   <select 
                     value={selectedYear} 
                     onChange={(e) => setSelectedYear(e.target.value)}
                     className="bg-transparent text-xs font-black uppercase outline-none cursor-pointer"
                   >
                     {[2025, 2026, 2027].map(y => <option key={y} value={y} className="text-slate-900">{y}</option>)}
                   </select>
                </div>
                <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                   <Filter size={14} className="text-blue-400" />
                   <select 
                     value={selectedMonth} 
                     onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                     className="bg-transparent text-xs font-black uppercase outline-none cursor-pointer"
                   >
                     {MONTHS_FR.map((m, i) => <option key={i} value={i} className="text-slate-900">{m}</option>)}
                   </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-6">
             {weeklyStats.map(w => (
               <button 
                 key={w.week}
                 onClick={() => setSelectedWeek(w.week)}
                 className={`px-6 py-4 rounded-2xl border transition-all flex flex-col items-center ${
                   (selectedWeek === w.week || (!selectedWeek && activeWeekData?.week === w.week))
                   ? 'bg-blue-600 border-blue-400 shadow-xl shadow-blue-900/40 scale-105'
                   : 'bg-white/5 border-white/10 hover:bg-white/10'
                 }`}
               >
                 <span className="text-[9px] font-black uppercase opacity-40 mb-1">Sem. {w.week}</span>
                 <span className="text-lg font-black">{w.total.toLocaleString()}</span>
                 <div className="w-8 h-1 bg-white/20 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-white" style={{ width: `${Math.min(w.percentage, 100)}%` }}></div>
                 </div>
               </button>
             ))}
          </div>
        </div>
      </div>

      {/* SECTION ANALYSIS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Graphique de Mix Hebdomadaire */}
        <div className="lg:col-span-2 bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100">
           <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                    <TrendingUp size={24} />
                 </div>
                 <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">Évolution du Mix Hebdo</h3>
              </div>
              <div className="flex gap-4">
                 <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-[10px] font-black uppercase text-slate-400">Fixe</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span className="text-[10px] font-black uppercase text-slate-400">Mobile</span>
                 </div>
              </div>
           </div>
           
           <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyStats} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="week" tick={{fontSize: 10, fontWeight: 900}} label={{ value: 'N° de Semaine', position: 'insideBottom', offset: -10, fontSize: 10 }} />
                  <YAxis tick={{fontSize: 10, fontWeight: 900}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="fixed" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} name="Fixe" />
                  <Bar dataKey="mobile" stackId="a" fill="#f97316" radius={[6, 6, 0, 0]} name="Mobile" />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Focus Semaine Sélectionnée */}
        <div className="bg-slate-50 rounded-[3rem] p-10 border border-slate-200 flex flex-col justify-between">
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Focus Semaine {activeWeekData?.week}</p>
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-1">{activeWeekData?.formattedRange}</h3>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-tight">{MONTHS_FR[selectedMonth]} {selectedYear}</p>
           </div>

           <div className="space-y-6 my-10">
              <div className="flex justify-between items-center p-6 bg-white rounded-3xl shadow-sm">
                 <div className="flex items-center gap-4">
                    <Building2 className="text-blue-500" size={24} />
                    <span className="text-xs font-black uppercase text-slate-400">Structures Fixes</span>
                 </div>
                 <span className="text-xl font-black text-slate-800">{activeWeekData?.fixed.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-6 bg-white rounded-3xl shadow-sm">
                 <div className="flex items-center gap-4">
                    <Truck className="text-orange-500" size={24} />
                    <span className="text-xs font-black uppercase text-slate-400">Unités Mobiles</span>
                 </div>
                 <span className="text-xl font-black text-slate-800">{activeWeekData?.mobile.toLocaleString()}</span>
              </div>
           </div>

           <div className="bg-slate-900 rounded-[2rem] p-8 text-white text-center shadow-xl">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Taux d'Atteinte Hebdo</p>
              <p className="text-5xl font-black text-blue-400">{activeWeekData?.percentage.toFixed(1)}%</p>
              <div className="w-full bg-white/10 h-1.5 rounded-full mt-6 overflow-hidden">
                 <div className="h-full bg-blue-500" style={{ width: `${Math.min(activeWeekData?.percentage || 0, 100)}%` }}></div>
              </div>
           </div>
        </div>
      </div>

      {/* PERFORMANCE RÉGIONALE DE LA SEMAINE */}
      <div className="bg-white rounded-[3rem] p-12 shadow-xl border border-slate-100">
        <div className="flex items-center gap-6 mb-12">
           <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
             <Layers size={28} />
           </div>
           <div>
             <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Répartition Régionale de la Semaine</h3>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Contribution des PRES sur la période sélectionnée</p>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {data.regions.map(region => {
             const weekTotal = data.dailyHistory
               .filter(record => {
                 const [d, m, y] = record.date.split('/');
                 const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                 return getWeekNumber(dateObj) === activeWeekData?.week && dateObj.getFullYear().toString() === selectedYear;
               })
               .reduce((acc, record) => {
                 const regSites = record.sites.filter(s => s.region === region.name);
                 return acc + regSites.reduce((sum, s) => sum + s.total, 0);
               }, 0);

             return (
               <div key={region.name} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 hover:bg-white hover:shadow-lg transition-all group">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-red-500 transition-colors truncate">
                   {region.name.replace('PRES ', '')}
                 </p>
                 <p className="text-2xl font-black text-slate-800">{weekTotal.toLocaleString()}</p>
                 <div className="flex items-center gap-2 mt-4">
                    <ChevronRight size={14} className="text-slate-300" />
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Poches collectées</span>
                 </div>
               </div>
             );
           })}
        </div>
      </div>

    </div>
  );
};
