
import React, { useState, useMemo } from 'react';
import { DashboardData } from '../types';
import { Building2, Truck, Activity, Calendar, ChevronDown, Target, Zap, ArrowRight, Layers, MapPin, User, Mail, Phone, ClipboardCheck } from 'lucide-react';
import { COLORS, SITES_DATA } from '../constants';

interface DailyViewProps {
  data: DashboardData;
}

export const DailyView: React.FC<DailyViewProps> = ({ data }) => {
  const [selectedDate, setSelectedDate] = useState(data.dailyHistory[0]?.date || "");
  
  const currentRecord = useMemo(() => 
    data.dailyHistory.find(r => r.date === selectedDate) || data.dailyHistory[0]
  , [selectedDate, data.dailyHistory]);

  const totals = useMemo(() => {
    if (!currentRecord) return { fixed: 0, mobile: 0, total: 0 };
    return currentRecord.sites.reduce((acc, site) => ({
      fixed: acc.fixed + (site.fixe || 0),
      mobile: acc.mobile + (site.mobile || 0),
      total: acc.total + (site.total || 0)
    }), { fixed: 0, mobile: 0, total: 0 });
  }, [currentRecord]);

  const dailyPercentage = useMemo(() => {
    if (!currentRecord || totals.total === 0) return 0;
    const dailyGoal = data.daily.objective; 
    return (totals.total / dailyGoal) * 100;
  }, [totals.total, data.daily.objective, currentRecord]);

  const reportedSitesCount = useMemo(() => {
    if (!currentRecord) return 0;
    // On compte les sites présents dans l'historique pour ce jour
    return currentRecord.sites.length;
  }, [currentRecord]);

  const totalSitesExpected = SITES_DATA.length;

  const performanceStatus = useMemo(() => {
    if (totals.total > data.daily.objective) return "Dépassé";
    if (totals.total === data.daily.objective) return "Atteint";
    return "En dessous";
  }, [totals.total, data.daily.objective]);

  if (!currentRecord) return null;

  return (
    <div className="space-y-6 lg:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 1. HEADER COMMAND CENTER (RED GRADIENT) */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[2rem] lg:rounded-[3.5rem] p-6 lg:p-12 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/20 blur-[100px] rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-600/10 blur-[100px] rounded-full -ml-32 -mb-32"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-5 lg:gap-8">
            <div className="w-14 h-14 lg:w-20 lg:h-20 bg-gradient-to-br from-red-600 to-red-800 rounded-2xl lg:rounded-3xl flex items-center justify-center shadow-2xl shadow-red-900/50">
              <Zap size={32} className="text-white fill-white/20 hidden lg:block" />
              <Zap size={24} className="text-white fill-white/20 lg:hidden" />
            </div>
            <div>
              <h2 className="text-2xl lg:text-4xl font-black uppercase tracking-tighter leading-tight">SUIVI DES PRÉLÈVEMENTS</h2>
              <div className="flex flex-wrap items-center gap-3 mt-1 lg:mt-2">
                <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/10">
                   <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-white/70">Collecte en Direct</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-600/20 rounded-full border border-blue-500/30">
                   <ClipboardCheck size={12} className="text-blue-400" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                    Saisie : {reportedSitesCount} / {totalSitesExpected} Sites
                   </span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Record du {currentRecord.date}</span>
              </div>
            </div>
          </div>

          <div className="relative group w-full lg:w-auto">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-1000"></div>
            <div className="relative bg-slate-800 rounded-2xl px-6 py-4 flex items-center gap-4">
              <Calendar size={18} className="text-red-500" />
              <select 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-sm font-black uppercase tracking-widest outline-none cursor-pointer w-full lg:w-48"
              >
                {data.dailyHistory.map(record => (
                  <option key={record.date} value={record.date} className="text-slate-900">{record.date}</option>
                ))}
              </select>
              <ChevronDown size={16} className="text-slate-500" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. BENTO KPI GRID (GREEN, ORANGE, RED) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card Fixe (GREEN) */}
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
          <Building2 size={80} className="absolute -bottom-4 -right-4 text-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <Building2 size={20} />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">COLLECTE SITE FIXE</span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-5xl font-black text-slate-900 tracking-tighter">{totals.fixed}</p>
            <p className="text-sm font-bold text-slate-300 uppercase">Poches</p>
          </div>
          <div className="mt-6 h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${Math.min((totals.fixed / (totals.total || 1)) * 100, 100)}%` }}></div>
          </div>
        </div>

        {/* Card Mobile (ORANGE) */}
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
          <Truck size={80} className="absolute -bottom-4 -right-4 text-orange-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
              <Truck size={20} />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">COLLECTE MOBILE</span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-5xl font-black text-slate-900 tracking-tighter">{totals.mobile}</p>
            <p className="text-sm font-bold text-slate-300 uppercase">Poches</p>
          </div>
          <div className="mt-6 h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500" style={{ width: `${Math.min((totals.mobile / (totals.total || 1)) * 100, 100)}%` }}></div>
          </div>
        </div>

        {/* Card Total (RED) */}
        <div className="bg-slate-900 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/20 rounded-full blur-3xl"></div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-white/10 text-white rounded-xl flex items-center justify-center">
              <Activity size={20} />
            </div>
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Réalisé Journalier</span>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-6xl font-black text-white tracking-tighter leading-none">{totals.total}</p>
            <div className="text-right">
              <p className={`text-xl font-black ${dailyPercentage >= 100 ? 'text-green-400' : 'text-red-500'}`}>
                {dailyPercentage.toFixed(1)}%
              </p>
              <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">de l'objectif</p>
            </div>
          </div>
          <div className="mt-8 flex items-center gap-4">
             <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-red-600 shadow-lg shadow-red-500/50 transition-all duration-1000" style={{ width: `${Math.min(dailyPercentage, 100)}%` }}></div>
             </div>
             <Target size={16} className="text-white/20" />
          </div>
        </div>
      </div>

      {/* 3. PERFORMANCE PULSE BAR (WITH DYNAMIC TARGET & STATUS) */}
      <div className="bg-white rounded-full p-2 border border-slate-200 shadow-inner flex items-center gap-4 overflow-visible">
        <div className="bg-slate-900 px-6 py-2 rounded-full hidden md:block shrink-0">
          <span className="text-[9px] font-black text-white uppercase tracking-widest whitespace-nowrap">Pulse Performance</span>
        </div>
        
        {/* Container relatif pour la barre et le marqueur */}
        <div className="flex-1 flex gap-1 h-3 px-2 relative items-center">
          {Array.from({ length: 12 }).map((_, i) => {
             const step = (i + 1) * 10;
             let barColor = 'bg-slate-100';
             
             if (step <= dailyPercentage) {
               if (i < 10) {
                 // Zone normale (0-100%)
                 if (step <= 40) barColor = 'bg-red-500 shadow-sm';
                 else if (step <= 80) barColor = 'bg-orange-500 shadow-sm';
                 else barColor = 'bg-emerald-500 shadow-sm';
               } else {
                 // Zone de sur-performance (>100%)
                 barColor = 'bg-indigo-600 shadow-[0_0_12px_rgba(79,70,229,0.5)]';
               }
             }

             return (
               <div key={i} className={`flex-1 h-full rounded-sm transition-all duration-700 ${barColor} relative`}>
                 {/* Marqueur de cible (après le 10ème segment) - TRAIT NOIR, BULLE VERTE */}
                 {i === 9 && (
                   <div className="absolute -right-[2px] top-[-16px] bottom-[-16px] w-1 bg-slate-900 z-10 flex flex-col items-center shadow-lg">
                     <div className="absolute -top-7 whitespace-nowrap text-[8px] font-black text-white bg-emerald-600 px-2 py-0.5 border border-emerald-600 rounded shadow-md ring-2 ring-white">
                       OBJ: {data.daily.objective}
                     </div>
                   </div>
                 )}
               </div>
             );
          })}
        </div>

        <div className="px-6 flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-black uppercase transition-colors duration-500 ${
            totals.total > data.daily.objective ? 'text-indigo-600' : 
            totals.total === data.daily.objective ? 'text-emerald-600' : 'text-slate-400'
          }`}>
            Cible: {performanceStatus} ({totals.total})
          </span>
          <ArrowRight size={14} className="text-slate-300" />
        </div>
      </div>

      {/* 4. SITE MATRIX */}
      <div className="bg-white rounded-[2.5rem] lg:rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden relative">
        <div className="px-8 py-8 lg:px-12 lg:py-12 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-slate-50 text-slate-800 rounded-2xl flex items-center justify-center shadow-inner">
               <Layers size={24} />
             </div>
             <div>
               <h3 className="font-black text-xl lg:text-2xl text-slate-900 uppercase tracking-tighter">DÉTAIL PRÉLÈVEMENTS PAR STRUCTURES</h3>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                {reportedSitesCount} structures sur {totalSitesExpected} ont renseigné leurs données
               </p>
             </div>
          </div>
          <div className="hidden lg:flex gap-3">
             <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100">COLLECTE SITE FIXE</div>
             <div className="px-4 py-2 bg-orange-50 text-orange-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-orange-100">COLLECTE MOBILE</div>
          </div>
        </div>

        {/* Desktop Premium Table */}
        <div className="hidden lg:block">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] border-b border-slate-50">
                <th className="px-12 py-6">Centre / Région</th>
                <th className="px-8 py-6">Responsable</th>
                <th className="px-8 py-6 text-center">Objectif Jour</th>
                <th className="px-8 py-6 text-center">Prélèvements (F+M)</th>
                <th className="px-12 py-6 text-right">Taux d'Atteinte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {currentRecord.sites.map((site, idx) => {
                const percOfObj = site.objective > 0 ? (site.total / site.objective) * 100 : 0;
                return (
                  <tr key={idx} className="group hover:bg-slate-50/80 transition-all">
                    <td className="px-12 py-8">
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-10 rounded-full transition-all duration-500 ${percOfObj >= 100 ? 'bg-emerald-500' : percOfObj >= 60 ? 'bg-orange-500' : 'bg-red-500'}`}></div>
                        <div>
                          <p className="font-black text-slate-800 text-lg uppercase tracking-tight">{site.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <MapPin size={10} className="text-slate-400" />
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{site.region}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-8">
                      {site.manager ? (
                        <div className="flex flex-col gap-1">
                          <p className="text-[11px] font-black text-slate-700 uppercase">{site.manager}</p>
                          <div className="flex items-center gap-3">
                            {site.email && (
                              <a href={`mailto:${site.email}`} className="text-slate-400 hover:text-red-500 transition-colors">
                                <Mail size={12} />
                              </a>
                            )}
                            {site.phone && (
                              <a href={`tel:${site.phone}`} className="text-slate-400 hover:text-emerald-500 transition-colors">
                                <Phone size={12} />
                              </a>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-300 font-bold uppercase">Non assigné</span>
                      )}
                    </td>
                    <td className="px-8 py-8 text-center">
                       <span className="text-lg font-black text-slate-400 tracking-tighter">{site.objective || 0}</span>
                    </td>
                    <td className="px-8 py-8 text-center">
                       <div className="inline-flex flex-col items-center">
                         <span className="text-2xl font-black text-slate-900 tracking-tighter">{site.total}</span>
                         <div className="flex justify-center gap-3 mt-1">
                           <span className="text-[10px] font-bold text-emerald-400">{site.fixe || 0}F</span>
                           <span className="text-[10px] font-bold text-orange-400">{site.mobile || 0}M</span>
                         </div>
                       </div>
                    </td>
                    <td className="px-12 py-8 text-right">
                       <div className="flex flex-col items-end gap-1.5">
                          <span className={`text-sm font-black ${percOfObj >= 100 ? 'text-emerald-600' : 'text-slate-800'}`}>{percOfObj.toFixed(1)}%</span>
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                             <div className={`h-full ${percOfObj >= 100 ? 'bg-emerald-500' : 'bg-slate-900'}`} style={{ width: `${Math.min(percOfObj, 100)}%` }}></div>
                          </div>
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Premium Cards */}
        <div className="lg:hidden p-4 space-y-4 bg-slate-50/50">
          {currentRecord.sites.map((site, idx) => {
            const perc = site.objective > 0 ? (site.total / site.objective) * 100 : 0;
            return (
              <div key={idx} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-black text-sm text-slate-800 uppercase leading-tight">{site.name}</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">{site.region}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-slate-900 leading-none">{site.total} <span className="text-slate-300 text-[10px]">/ {site.objective}</span></p>
                    <p className="text-[8px] font-black text-slate-400 uppercase mt-1 tracking-widest">Réalisé / Obj</p>
                  </div>
                </div>
                
                {site.manager && (
                  <div className="bg-slate-50 rounded-2xl p-3 flex items-center justify-between border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 shadow-sm">
                        <User size={14} />
                      </div>
                      <p className="text-[9px] font-black text-slate-600 uppercase truncate max-w-[120px]">{site.manager}</p>
                    </div>
                    <div className="flex items-center gap-2">
                       {site.email && (
                        <a href={`mailto:${site.email}`} className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-red-500 shadow-sm">
                          <Mail size={12} />
                        </a>
                      )}
                      {site.phone && (
                        <a href={`tel:${site.phone}`} className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-emerald-500 shadow-sm">
                          <Phone size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-2 rounded-xl flex items-center justify-between ${site.fixe > 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-300 border border-slate-100 opacity-30'}`}>
                    <Building2 size={14} />
                    <span className="text-xs font-black">{site.fixe || 0} F</span>
                  </div>
                  <div className={`p-2 rounded-xl flex items-center justify-between ${site.mobile > 0 ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-slate-50 text-slate-300 border border-slate-100 opacity-30'}`}>
                    <Truck size={14} />
                    <span className="text-xs font-black">{site.mobile || 0} M</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${perc >= 100 ? 'bg-emerald-500' : 'bg-slate-800'}`} style={{ width: `${Math.min(perc, 100)}%` }}></div>
                  </div>
                  <span className={`text-[10px] font-black ${perc >= 100 ? 'text-emerald-600' : 'text-slate-400'}`}>{perc.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
