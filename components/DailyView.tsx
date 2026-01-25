
import React, { useState, useMemo } from 'react';
import { DashboardData } from '../types';
import { Building2, Truck, Activity, Calendar, ChevronDown } from 'lucide-react';

interface DailyViewProps {
  data: DashboardData;
}

export const DailyView: React.FC<DailyViewProps> = ({ data }) => {
  const [selectedDate, setSelectedDate] = useState(data.dailyHistory[0]?.date || "");
  
  const currentRecord = useMemo(() => 
    data.dailyHistory.find(r => r.date === selectedDate) || data.dailyHistory[0]
  , [selectedDate, data.dailyHistory]);

  // Recalcul des totaux pour garantir la cohérence visuelle
  const totals = useMemo(() => {
    if (!currentRecord) return { fixed: 0, mobile: 0, total: 0 };
    return currentRecord.sites.reduce((acc, site) => ({
      fixed: acc.fixed + (site.fixe || 0),
      mobile: acc.mobile + (site.mobile || 0),
      total: acc.total + (site.total || 0)
    }), { fixed: 0, mobile: 0, total: 0 });
  }, [currentRecord]);

  if (!currentRecord) return (
    <div className="p-20 text-center bg-white rounded-[3rem] border border-slate-200 shadow-sm">
      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
        <Activity size={40} className="text-slate-300" />
      </div>
      <p className="text-xl font-black text-slate-400 uppercase tracking-tighter">Aucune donnée disponible</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Sélecteur de Date */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-red-600 rounded-[1.75rem] flex items-center justify-center text-white shadow-xl shadow-red-100">
            <Calendar size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800">Prélèvements du Jour</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Sélectionnez la journée de collecte</p>
          </div>
        </div>

        <div className="relative w-full md:w-auto min-w-[280px]">
          <select 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full appearance-none bg-slate-900 text-white rounded-[1.5rem] px-12 py-5 text-sm font-black uppercase tracking-widest outline-none hover:bg-slate-800 transition-all cursor-pointer shadow-xl shadow-slate-200"
          >
            {data.dailyHistory.map(record => (
              <option key={record.date} value={record.date} className="text-slate-900 bg-white">{record.date}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" size={20} />
          <Activity className="absolute left-5 top-1/2 -translate-y-1/2 text-red-500 pointer-events-none" size={20} />
        </div>
      </div>

      {/* Cartes de Totaux */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Total NombreFixe */}
        <div className="bg-white p-10 rounded-[3rem] shadow-xl border-b-8 border-blue-600 flex flex-col items-center text-center relative overflow-hidden group hover:-translate-y-2 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
          <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center text-blue-600 mb-6 relative z-10 shadow-inner">
            <Building2 size={40} />
          </div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 relative z-10">Total NombreFixe</p>
          <p className="text-6xl font-black text-slate-900 leading-none relative z-10">{totals.fixed.toLocaleString()}</p>
          <div className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Structures Fixes</div>
        </div>

        {/* Total NombreMobile */}
        <div className="bg-white p-10 rounded-[3rem] shadow-xl border-b-8 border-orange-500 flex flex-col items-center text-center relative overflow-hidden group hover:-translate-y-2 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
          <div className="w-20 h-20 bg-orange-50 rounded-[2rem] flex items-center justify-center text-orange-600 mb-6 relative z-10 shadow-inner">
            <Truck size={40} />
          </div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 relative z-10">Total NombreMobile</p>
          <p className="text-6xl font-black text-slate-900 leading-none relative z-10">{totals.mobile.toLocaleString()}</p>
          <div className="mt-6 px-4 py-2 bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Unités Mobiles</div>
        </div>

        {/* TOTAL (NombreFixe + NombreMobile) */}
        <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl border-b-8 border-red-600 flex flex-col items-center text-center relative overflow-hidden group hover:-translate-y-2 transition-all duration-300">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 group-hover:scale-110 transition-transform"></div>
          <div className="w-20 h-20 bg-red-600 rounded-[2rem] flex items-center justify-center text-white mb-6 relative z-10 shadow-xl shadow-red-900/50">
            <Activity size={40} />
          </div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 relative z-10">TOTAL GENERAL</p>
          <p className="text-7xl font-black text-white leading-none relative z-10">{totals.total.toLocaleString()}</p>
          <div className="mt-6 px-6 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest animate-pulse">Fixe + Mobile</div>
        </div>
      </div>

      {/* Liste des Sites */}
      <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-200 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-red-600 to-orange-500"></div>
        <div className="px-12 py-10 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-center bg-slate-50/30 gap-6">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
               <Activity size={24} className="text-red-600" />
             </div>
             <div>
               <h3 className="font-black text-2xl text-slate-800 uppercase tracking-tighter">Détails des Sites</h3>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{currentRecord.sites.length} sites actifs le {selectedDate}</p>
             </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] uppercase font-black text-slate-400 tracking-[0.2em]">
                <th className="px-12 py-8">Site de Prélèvement</th>
                <th className="px-6 py-8 text-center text-blue-600">NombreFixe (F)</th>
                <th className="px-6 py-8 text-center text-orange-600">NombreMobile (G)</th>
                <th className="px-6 py-8 text-center bg-slate-100/30">Total (F+G)</th>
                <th className="px-12 py-8 text-right">Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentRecord.sites.map((site, idx) => {
                const perc = site.objective > 0 ? (site.total / site.objective) * 100 : 0;
                return (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-all group border-l-4 border-transparent hover:border-red-600">
                    <td className="px-12 py-8">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-red-600 group-hover:shadow-lg transition-all duration-300">
                           {site.mobile > 0 ? <Truck size={20} /> : <Building2 size={20} />}
                        </div>
                        <div>
                          <span className="font-black text-slate-800 text-sm uppercase tracking-tight block">{site.name}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{site.region}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-8 text-center">
                      <span className={`text-base font-black ${site.fixe > 0 ? 'text-blue-600' : 'text-slate-200'}`}>
                        {site.fixe > 0 ? site.fixe.toLocaleString() : "-"}
                      </span>
                    </td>
                    <td className="px-6 py-8 text-center">
                      <span className={`text-base font-black ${site.mobile > 0 ? 'text-orange-600' : 'text-slate-200'}`}>
                        {site.mobile > 0 ? site.mobile.toLocaleString() : "-"}
                      </span>
                    </td>
                    <td className="px-6 py-8 text-center bg-slate-50/50 group-hover:bg-transparent transition-colors">
                      <span className="text-xl font-black text-slate-900">{(site.fixe + site.mobile).toLocaleString()}</span>
                    </td>
                    <td className="px-12 py-8">
                      <div className="flex items-center justify-end gap-6">
                        <div className="w-32 bg-slate-100 h-2.5 rounded-full overflow-hidden hidden lg:block shadow-inner border border-slate-200">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${perc >= 100 ? 'bg-green-500 shadow-lg' : perc >= 70 ? 'bg-blue-600' : 'bg-red-600'}`} 
                            style={{ width: `${Math.min(perc, 100)}%` }}
                          />
                        </div>
                        <div className="text-right min-w-[60px]">
                           <span className={`text-xs font-black px-3 py-1 rounded-lg border ${perc >= 100 ? 'text-green-600 bg-green-50 border-green-100' : perc >= 70 ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-red-600 bg-red-50 border-red-100'}`}>
                             {perc.toFixed(0)}%
                           </span>
                        </div>
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
  );
};
