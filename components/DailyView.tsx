
import React, { useState, useMemo, useEffect } from 'react';
import { DashboardData } from '../types';
// Added missing Building2 and Truck icon imports
import { Calendar, ChevronDown, Zap, Layers, Activity, TrendingUp, Filter, Building2, Truck } from 'lucide-react';
import { COLORS } from '../constants';

interface DailyViewProps {
  data: DashboardData;
}

export const DailyView: React.FC<DailyViewProps> = ({ data }) => {
  const [selectedDate, setSelectedDate] = useState<string>("");

  useEffect(() => {
    if (data.dailyHistory.length > 0) {
      const exists = data.dailyHistory.some(h => h.date === selectedDate);
      if (!selectedDate || !exists) {
        setSelectedDate(data.dailyHistory[0].date);
      }
    }
  }, [data.dailyHistory, selectedDate]);

  const currentRecord = useMemo(() => {
    if (data.dailyHistory.length === 0) return null;
    return data.dailyHistory.find(r => r.date === selectedDate) || data.dailyHistory[0];
  }, [selectedDate, data.dailyHistory]);

  const activeSites = useMemo(() => {
    if (!currentRecord) return [];
    return currentRecord.sites.filter(site => site.total > 0);
  }, [currentRecord]);

  const totals = useMemo(() => {
    if (!currentRecord) return { fixed: 0, mobile: 0, total: 0 };
    return currentRecord.sites.reduce((acc, site) => ({
      fixed: acc.fixed + (site.fixe || 0),
      mobile: acc.mobile + (site.mobile || 0),
      total: acc.total + (site.total || 0)
    }), { fixed: 0, mobile: 0, total: 0 });
  }, [currentRecord]);

  if (!currentRecord) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* HEADER BLUE/INDIGO */}
      <div className="relative overflow-hidden bg-blue-600 rounded-[3rem] p-10 lg:p-14 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-400/20 blur-[120px] rounded-full -mr-32 -mt-32"></div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-8">
            <div className="w-16 h-16 lg:w-20 lg:h-20 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-inner border border-white/20">
              <Activity size={36} className="text-white" />
            </div>
            <div>
              <h2 className="text-3xl lg:text-4xl font-black uppercase tracking-tighter leading-tight">Journal Quotidien</h2>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <div className="flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full border border-white/10">
                   <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]"></div>
                   <span className="text-[10px] font-black uppercase tracking-widest">{activeSites.length} SITES EN ACTIVITÉ</span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative bg-white/10 backdrop-blur-xl rounded-[2rem] px-8 py-5 flex items-center gap-4 w-full lg:w-auto border border-white/10">
            <Filter size={18} className="text-blue-200" />
            <select 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm font-black uppercase tracking-widest outline-none cursor-pointer w-full text-white"
            >
              {data.dailyHistory.map(record => (
                <option key={record.date} value={record.date} className="text-slate-900">{record.date}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI GRID 3 COLORS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white rounded-[2.5rem] p-10 border border-emerald-100 shadow-xl transition-all hover:scale-[1.02] border-b-[6px] border-b-emerald-500">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><Building2 size={20}/></div>
             <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Fixe</p>
          </div>
          <p className="text-6xl font-black text-slate-900 tracking-tighter">{totals.fixed}</p>
        </div>
        
        <div className="bg-white rounded-[2.5rem] p-10 border border-amber-100 shadow-xl transition-all hover:scale-[1.02] border-b-[6px] border-b-amber-500">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center"><Truck size={20}/></div>
             <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Total Mobile</p>
          </div>
          <p className="text-6xl font-black text-slate-900 tracking-tighter">{totals.mobile}</p>
        </div>
        
        <div className="bg-[#0f172a] rounded-[2.5rem] p-10 shadow-2xl transition-all hover:scale-[1.02] border-b-[6px] border-b-blue-600">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center"><Zap size={20}/></div>
             <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Cumul Journée</p>
          </div>
          <p className="text-7xl font-black text-white tracking-tighter">{totals.total}</p>
        </div>
      </div>

      {/* TABLEAU LISTE */}
      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="px-10 py-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-black text-xl text-slate-900 uppercase tracking-tight">Liste des collectes du {currentRecord.date}</h3>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] bg-white px-4 py-2 rounded-full border border-slate-200">Data Source A-J</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b bg-slate-50/20">
                <th className="px-10 py-6 text-left">Site de Collecte</th>
                <th className="px-6 py-6 text-center">Site Fixe</th>
                <th className="px-6 py-6 text-center">Site Mobile</th>
                <th className="px-10 py-6 text-right">Total Jour</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {activeSites.map((site, idx) => (
                <tr key={idx} className="hover:bg-blue-50/30 transition-all group cursor-default">
                  <td className="px-10 py-6">
                     <p className="font-black text-slate-800 text-base uppercase group-hover:text-blue-600 transition-colors">{site.name}</p>
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{site.region || "DIRECTION NATIONALE"}</p>
                  </td>
                  <td className="px-6 py-6 text-center">
                    {/* Fixed property name from fixed to fixe */}
                    <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black">{site.fixe}</span>
                  </td>
                  <td className="px-6 py-6 text-center">
                    <span className="px-4 py-1.5 bg-amber-50 text-amber-600 rounded-full text-xs font-black">{site.mobile}</span>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <span className="text-2xl font-black text-slate-900 group-hover:scale-110 inline-block transition-transform">{site.total}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-[#0f172a] text-white font-black text-sm">
              <tr>
                <td className="px-10 py-8 uppercase tracking-[0.2em]">TOTAL NATIONAL CONSOLIDÉ</td>
                <td className="px-6 py-8 text-center text-emerald-400">{totals.fixed}</td>
                <td className="px-6 py-8 text-center text-amber-400">{totals.mobile}</td>
                <td className="px-10 py-8 text-right text-3xl font-black text-blue-400 bg-white/5">{totals.total}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
