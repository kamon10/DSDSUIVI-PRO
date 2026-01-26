import React, { useState, useMemo } from 'react';
import { DashboardData } from '../types';
import { getSiteObjectives, SITES_DATA } from '../constants';
import { CheckCircle2, AlertTriangle, XCircle, TrendingUp, MapPin, Target, ChevronRight, Calendar, Filter, Clock } from 'lucide-react';

interface SynthesisViewProps {
  data: DashboardData;
}

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export const SynthesisView: React.FC<SynthesisViewProps> = ({ data }) => {
  // 1. Extraction des années et mois disponibles dans l'historique
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    data.dailyHistory.forEach(h => {
      const year = h.date.split('/')[2];
      if (year) years.add(year);
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [data.dailyHistory]);

  const [selectedYear, setSelectedYear] = useState(availableYears[0] || data.year.toString());

  const availableMonths = useMemo(() => {
    const months = new Set<number>();
    data.dailyHistory.forEach(h => {
      const parts = h.date.split('/');
      if (parts[2] === selectedYear) {
        months.add(parseInt(parts[1]) - 1); // 0-indexed
      }
    });
    return Array.from(months).sort((a, b) => a - b);
  }, [data.dailyHistory, selectedYear]);

  const [selectedMonth, setSelectedMonth] = useState<number>(
    availableMonths.length > 0 ? availableMonths[availableMonths.length - 1] : new Date().getMonth()
  );

  const availableDays = useMemo(() => {
    return data.dailyHistory.filter(h => {
      const parts = h.date.split('/');
      return parts[2] === selectedYear && (parseInt(parts[1]) - 1) === selectedMonth;
    }).map(h => h.date);
  }, [data.dailyHistory, selectedYear, selectedMonth]);

  const [selectedDay, setSelectedDay] = useState(availableDays[0] || "");

  // Mettre à jour le jour sélectionné si le mois ou l'année change
  useMemo(() => {
    if (!availableDays.includes(selectedDay)) {
      setSelectedDay(availableDays[0] || "");
    }
  }, [availableDays]);

  // 2. Calcul des données pour la période sélectionnée
  const currentDayRecord = useMemo(() => 
    data.dailyHistory.find(r => r.date === selectedDay)
  , [selectedDay, data.dailyHistory]);

  const synthesisData = useMemo(() => {
    const grouped = new Map<string, any>();
    
    // On utilise SITES_DATA comme base pour ne rater aucun site même sans prélèvement
    SITES_DATA.forEach(siteBase => {
      const regName = siteBase.region || "DIRECTION NATIONALE";
      if (!grouped.has(regName)) {
        grouped.set(regName, {
          name: regName, sites: [], totalJour: 0, totalMois: 0, objMens: 0, objProrata: 0
        });
      }
      const g = grouped.get(regName);
      const siteObjs = getSiteObjectives(siteBase.name);
      
      // Récupération de la donnée réelle du jour
      const daySiteData = currentDayRecord?.sites.find(s => s.name.toUpperCase() === siteBase.name.toUpperCase());
      
      // Récupération du cumul mensuel réel
      // Note: On agrège manuellement depuis dailyHistory pour la période sélectionnée
      const monthlySum = data.dailyHistory
        .filter(h => {
          const parts = h.date.split('/');
          return parts[2] === selectedYear && (parseInt(parts[1]) - 1) === selectedMonth;
        })
        .reduce((acc, h) => {
          const site = h.sites.find(s => s.name.toUpperCase() === siteBase.name.toUpperCase());
          return acc + (site?.total || 0);
        }, 0);

      const dayOfMonth = selectedDay ? parseInt(selectedDay.split('/')[0]) : new Date().getDate();
      const objProrata = Math.round((siteObjs.monthly / 30) * dayOfMonth);

      const siteStats = {
        name: siteBase.name,
        total: daySiteData?.total || 0,
        fixe: daySiteData?.fixe || 0,
        mobile: daySiteData?.mobile || 0,
        totalMois: monthlySum,
        objMensuel: siteObjs.monthly,
        objProrata: objProrata,
        gap: siteObjs.monthly - monthlySum
      };

      g.sites.push(siteStats);
      g.totalJour += siteStats.total;
      g.totalMois += siteStats.totalMois;
      g.objMens += siteStats.objMensuel;
      g.objProrata += siteStats.objProrata;
    });

    return Array.from(grouped.values()).filter(g => g.sites.length > 0);
  }, [currentDayRecord, data.dailyHistory, selectedYear, selectedMonth, selectedDay]);

  const grandTotals = useMemo(() => {
    return synthesisData.reduce((acc, reg) => {
      acc.jour += reg.totalJour;
      acc.mois += reg.totalMois;
      acc.objMens += reg.objMens;
      return acc;
    }, { jour: 0, mois: 0, objMens: 0 });
  }, [synthesisData]);

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      
      {/* HEADER COCKPIT */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 flex flex-col lg:flex-row justify-between items-center gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-50 rounded-full -mr-32 -mt-32 opacity-50"></div>
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-20 h-20 bg-red-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-red-200">
            <TrendingUp size={38} />
          </div>
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800">Cockpit de Synthèse</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Période : {MONTHS_FR[selectedMonth]} {selectedYear}</span>
              <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
              <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">
                {selectedDay ? `Données du ${selectedDay}` : `Vue Mensuelle`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-4 relative z-10">
          <div className="bg-slate-50 px-8 py-5 rounded-[1.75rem] border border-slate-100 text-center min-w-[160px]">
            <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Réalisé {MONTHS_FR[selectedMonth]}</p>
            <p className="text-3xl font-black text-red-600">{grandTotals.mois.toLocaleString()}</p>
          </div>
          <div className="bg-slate-900 px-8 py-5 rounded-[1.75rem] text-center min-w-[160px] shadow-xl">
            <p className="text-[9px] font-black text-white/40 uppercase mb-1 tracking-widest">Objectif Mensuel</p>
            <p className="text-3xl font-black text-white">{grandTotals.objMens.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* FILTRES TEMPORELS DYNAMIQUES */}
      <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm flex flex-wrap items-center justify-center lg:justify-end gap-4">
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full">
          <Filter size={14} className="text-slate-400" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Filtres :</span>
        </div>

        {/* Sélecteur Année */}
        <div className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
          <Calendar size={14} className="text-red-500" />
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="text-xs font-black text-slate-800 bg-transparent outline-none cursor-pointer uppercase"
          >
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Sélecteur Mois */}
        <div className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
          <Clock size={14} className="text-blue-500" />
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="text-xs font-black text-slate-800 bg-transparent outline-none cursor-pointer uppercase"
          >
            {availableMonths.map(m => <option key={m} value={m}>{MONTHS_FR[m]}</option>)}
          </select>
        </div>

        {/* Sélecteur Jour */}
        <div className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-xl shadow-lg hover:bg-slate-800 transition-all">
          <Target size={14} className="text-red-400" />
          <select 
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            className="text-xs font-black bg-transparent outline-none cursor-pointer uppercase min-w-[120px]"
          >
            <option value="" className="text-slate-900">Tout le mois</option>
            {availableDays.map(d => <option key={d} value={d} className="text-slate-900">{d}</option>)}
          </select>
        </div>
      </div>

      {/* SECTIONS RÉGIONALES (Idem précédent avec données filtrées) */}
      <div className="space-y-8">
        {synthesisData.map((region) => {
          const regionPerc = (region.totalMois / region.objMens) * 100;
          return (
            <div key={region.name} className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden group transition-all hover:shadow-xl hover:border-slate-200">
              {/* Header Région */}
              <div className="bg-slate-50/50 px-10 py-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-red-600 transition-colors">
                    <MapPin size={22} />
                  </div>
                  <div>
                    <h3 className="font-black text-lg uppercase tracking-tight text-slate-800">{region.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Progression Régionale :</span>
                      <span className={`text-[10px] font-black ${regionPerc >= 75 ? 'text-green-600' : 'text-red-600'}`}>{regionPerc.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8 w-full md:w-auto">
                   <div className="hidden lg:block w-48 bg-slate-200 h-2.5 rounded-full overflow-hidden shadow-inner">
                      <div 
                        className={`h-full transition-all duration-1000 ${regionPerc >= 90 ? 'bg-green-500' : regionPerc >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(regionPerc, 100)}%` }}
                      />
                   </div>
                   <div className="text-right border-l pl-8 border-slate-200">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total {region.name}</p>
                      <p className="text-lg font-black text-slate-800">{region.totalMois.toLocaleString()} <span className="text-slate-300 text-xs">/ {region.objMens.toLocaleString()}</span></p>
                   </div>
                </div>
              </div>

              {/* Table des Sites */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 bg-slate-50/30">
                      <th className="px-10 py-5 text-left">Site de Prélèvement</th>
                      <th className="px-6 py-5 text-center">Jour (F/M)</th>
                      <th className="px-6 py-5 text-center">Cumul Mois</th>
                      <th className="px-6 py-5 text-center">Cible Prorata</th>
                      <th className="px-6 py-5 text-center">État / Taux</th>
                      <th className="px-10 py-5 text-right">Effort Restant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {region.sites.map((site: any) => {
                      const sitePerc = (site.totalMois / site.objMensuel) * 100;
                      const getStatusIcon = (p: number) => {
                        if (p >= 95) return <CheckCircle2 size={14} className="text-green-500" />;
                        if (p >= 75) return <AlertTriangle size={14} className="text-amber-500" />;
                        return <XCircle size={14} className="text-red-500" />;
                      };
                      const getStatusColor = (p: number) => {
                        if (p >= 95) return 'bg-green-100 text-green-700 border-green-200';
                        if (p >= 75) return 'bg-amber-100 text-amber-700 border-amber-200';
                        return 'bg-red-100 text-red-700 border-red-200';
                      };
                      return (
                        <tr key={site.name} className="hover:bg-slate-50/80 transition-all group">
                          <td className="px-10 py-5">
                            <div className="flex items-center gap-3">
                              <ChevronRight size={14} className="text-slate-300 group-hover:text-red-500 transition-colors" />
                              <span className="font-bold text-slate-700 text-sm uppercase tracking-tight">{site.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-slate-800">{site.total}</span>
                              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">F:{site.fixe} | M:{site.mobile}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <span className="text-sm font-black text-slate-800">{site.totalMois.toLocaleString()}</span>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <div className="flex flex-col items-center">
                              <span className={`text-xs font-black ${site.totalMois >= site.objProrata ? 'text-green-600' : 'text-amber-600'}`}>
                                {site.objProrata.toLocaleString()}
                              </span>
                              <p className="text-[7px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Cible théorique</p>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col items-center gap-1.5">
                              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-tight ${getStatusColor(sitePerc)}`}>
                                {getStatusIcon(sitePerc)}
                                {sitePerc >= 95 ? 'Excellent' : sitePerc >= 75 ? 'En cours' : 'Critique'}
                              </div>
                              <span className="text-[10px] font-black text-slate-400">{sitePerc.toFixed(1)}%</span>
                            </div>
                          </td>
                          <td className="px-10 py-5 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <span className={`text-xs font-black px-4 py-2 rounded-2xl ${site.gap <= 0 ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-500'}`}>
                                {site.gap <= 0 ? 'OBJECTIF ATTEINT' : `-${site.gap.toLocaleString()} poches`}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* RÉCAPITULATIF FINAL */}
      <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600 rounded-full blur-[120px] opacity-20 -mr-48 -mt-48"></div>
        <div className="flex flex-col lg:flex-row justify-between items-center gap-10 relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center border border-white/10">
              <Target size={32} className="text-red-500" />
            </div>
            <div>
              <h4 className="text-2xl font-black uppercase tracking-tighter">Performance {MONTHS_FR[selectedMonth]} {selectedYear}</h4>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em]">Consolidation nationale sur la période</p>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8">
            <div className="text-center">
              <p className="text-[10px] font-black text-white/30 uppercase mb-2 tracking-widest">Cumul Période</p>
              <p className="text-4xl font-black">{grandTotals.mois.toLocaleString()}</p>
            </div>
            <div className="w-px h-12 bg-white/10 hidden md:block"></div>
            <div className="text-center">
              <p className="text-[10px] font-black text-white/30 uppercase mb-2 tracking-widest">Taux Moyen</p>
              <p className="text-4xl font-black text-red-500">{((grandTotals.mois / grandTotals.objMens) * 100).toFixed(2)}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
