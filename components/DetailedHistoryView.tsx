
import React, { useState, useMemo, useEffect } from 'react';
import { DashboardData } from '../types';
import { SITES_DATA, WORKING_DAYS_YEAR } from '../constants';
import { MapPin, User, Mail, Phone, Calendar, Search, Building2, Truck, Target, CheckCircle2, XCircle, AlertTriangle, History, Zap, Globe, BarChart3 } from 'lucide-react';

interface DetailedHistoryViewProps {
  data: DashboardData;
}

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export const DetailedHistoryView: React.FC<DetailedHistoryViewProps> = ({ data }) => {
  // Liste des années et mois disponibles
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    data.dailyHistory.forEach(h => {
      const year = h.date.split('/')[2];
      if (year) years.add(year);
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [data.dailyHistory]);

  const [selectedYear, setSelectedYear] = useState(availableYears[0] || "2026");

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

  // Filtre Région avec l'option "TOUS LES SITES"
  const regions = useMemo(() => {
    const rSet = new Set<string>();
    SITES_DATA.forEach(s => rSet.add(s.region));
    return ["TOUS LES SITES", ...Array.from(rSet).sort()];
  }, []);

  const [selectedRegion, setSelectedRegion] = useState(regions[0] || "TOUS LES SITES");

  // Filtre Site (dynamique selon région ou liste complète)
  // Ajout d'une option de cumul virtuel au début de la liste
  const sitesInRegion = useMemo(() => {
    let baseSites = [];
    let label = "";
    
    if (selectedRegion === "TOUS LES SITES") {
      baseSites = [...SITES_DATA].sort((a, b) => a.name.localeCompare(b.name));
      label = "CUMUL NATIONAL (TOUS)";
    } else {
      baseSites = SITES_DATA.filter(s => s.region === selectedRegion).sort((a, b) => a.name.localeCompare(b.name));
      label = `CUMUL ${selectedRegion.replace('PRES ', '')}`;
    }

    // On ajoute l'option de cumul en haut de liste
    return [{ code: "ALL", name: label, region: selectedRegion, annualObjective: 0 }, ...baseSites];
  }, [selectedRegion]);

  const [selectedSiteCode, setSelectedSiteCode] = useState("ALL");

  // Reset le site à "ALL" quand on change de région pour avoir la vue consolidée par défaut
  useEffect(() => {
    setSelectedSiteCode("ALL");
  }, [selectedRegion]);

  // Informations sur le site ou la zone sélectionnée
  const selectionInfo = useMemo(() => {
    if (selectedSiteCode === "ALL") {
      // Vue Consolidée
      const relevantSites = selectedRegion === "TOUS LES SITES" 
        ? SITES_DATA 
        : SITES_DATA.filter(s => s.region === selectedRegion);
      
      const totalAnnualObj = relevantSites.reduce((acc, s) => acc + s.annualObjective, 0);
      
      return {
        name: selectedRegion === "TOUS LES SITES" ? "CONSOLIDATION NATIONALE" : `CONSOLIDATION : ${selectedRegion}`,
        isConsolidated: true,
        annualObjective: totalAnnualObj,
        manager: "DIRECTION NATIONALE",
        email: "contact@cntsci.org",
        phone: "+225 27 21 21 00 00",
        relevantSitesNames: new Set(relevantSites.map(s => s.name.toUpperCase()))
      };
    } else {
      // Vue Site Unique
      const site = SITES_DATA.find(s => s.code === selectedSiteCode);
      return {
        ...site,
        isConsolidated: false,
        relevantSitesNames: new Set([site?.name.toUpperCase() || ""])
      };
    }
  }, [selectedSiteCode, selectedRegion]);

  // Données historiques agrégées ou filtrées
  const historyData = useMemo(() => {
    return data.dailyHistory
      .filter(h => {
        const parts = h.date.split('/');
        return parts[2] === selectedYear && (parseInt(parts[1]) - 1) === selectedMonth;
      })
      .map(h => {
        let dailyFixe = 0;
        let dailyMobile = 0;
        let dailyTotal = 0;
        let dailyObjective = 0;

        h.sites.forEach(s => {
          if (selectionInfo.relevantSitesNames.has(s.name.toUpperCase())) {
            dailyFixe += s.fixe || 0;
            dailyMobile += s.mobile || 0;
            dailyTotal += s.total || 0;
            dailyObjective += s.objective || 0;
          }
        });

        // Si l'objectif n'est pas fourni dans les data, on utilise le prorata de l'objectif annuel
        if (dailyObjective === 0 && selectionInfo.annualObjective) {
            dailyObjective = Math.round(selectionInfo.annualObjective / WORKING_DAYS_YEAR);
        }

        return {
          date: h.date,
          fixe: dailyFixe,
          mobile: dailyMobile,
          total: dailyTotal,
          objective: dailyObjective
        };
      })
      .sort((a, b) => {
        const [da, ma, ya] = a.date.split('/');
        const [db, mb, yb] = b.date.split('/');
        return new Date(parseInt(ya), parseInt(ma)-1, parseInt(da)).getTime() - new Date(parseInt(yb), parseInt(mb)-1, parseInt(db)).getTime();
      });
  }, [data.dailyHistory, selectedYear, selectedMonth, selectionInfo]);

  // Calcul des cumuls de réalisation pour la sélection
  const performanceStats = useMemo(() => {
    let annualRealized = 0;
    let monthlyRealized = 0;

    data.dailyHistory.forEach(h => {
      const parts = h.date.split('/');
      const isSameYear = parts[2] === selectedYear;
      const isSameMonth = isSameYear && (parseInt(parts[1]) - 1) === selectedMonth;
      
      h.sites.forEach(s => {
        if (selectionInfo.relevantSitesNames.has(s.name.toUpperCase())) {
            if (isSameYear) annualRealized += s.total;
            if (isSameMonth) monthlyRealized += s.total;
        }
      });
    });

    return { annualRealized, monthlyRealized };
  }, [data.dailyHistory, selectedYear, selectedMonth, selectionInfo]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      
      {/* 1. BARRE DE FILTRES INTELLIGENTE */}
      <div className="bg-slate-900 rounded-[2.5rem] p-6 lg:p-10 shadow-2xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-[80px]"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner ${selectionInfo.isConsolidated ? 'bg-blue-600' : 'bg-white/10'}`}>
               {selectionInfo.isConsolidated ? <BarChart3 size={24} className="text-white" /> : <Search size={24} className="text-red-500" />}
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">
                {selectionInfo.isConsolidated ? "Cockpit de Consolidation" : "Historique de Site"}
              </h2>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">
                {selectionInfo.isConsolidated ? "Vue d'ensemble sur plusieurs structures" : "Consultation quotidienne personnalisée"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center lg:justify-end gap-3 w-full lg:w-auto">
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 flex items-center gap-2">
              <Calendar size={14} className="text-slate-400" />
              <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent outline-none text-xs font-black uppercase tracking-widest cursor-pointer">
                {availableYears.map(y => <option key={y} value={y} className="text-slate-900">{y}</option>)}
              </select>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 flex items-center gap-2">
              <History size={14} className="text-slate-400" />
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="bg-transparent outline-none text-xs font-black uppercase tracking-widest cursor-pointer">
                {availableMonths.map(m => <option key={m} value={m} className="text-slate-900">{MONTHS_FR[m]}</option>)}
              </select>
            </div>
            <div className={`border rounded-xl px-4 py-2 flex items-center gap-2 transition-all ${selectedRegion === "TOUS LES SITES" ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-900/20' : 'bg-white/5 border-white/10'}`}>
              <MapPin size={14} className={selectedRegion === "TOUS LES SITES" ? "text-white" : "text-slate-400"} />
              <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)} className="bg-transparent outline-none text-xs font-black uppercase tracking-widest cursor-pointer text-white">
                {regions.map(r => <option key={r} value={r} className="text-slate-900">{r}</option>)}
              </select>
            </div>
            <div className="bg-red-600 border border-red-500 rounded-xl px-4 py-2 flex items-center gap-2 shadow-lg shadow-red-900/40">
              <Building2 size={14} className="text-white" />
              <select value={selectedSiteCode} onChange={(e) => setSelectedSiteCode(e.target.value)} className="bg-transparent outline-none text-xs font-black uppercase tracking-widest cursor-pointer text-white max-w-[150px] lg:max-w-none">
                {sitesInRegion.map(s => <option key={s.code} value={s.code} className="text-slate-900">{s.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FICHE D'IDENTITÉ ET STATS CONSOLIDÉES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Bloc Responsable / Zone */}
        <div className="lg:col-span-1 bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 flex flex-col justify-between group">
          <div className="flex items-center gap-5 mb-8">
             <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform ${selectionInfo.isConsolidated ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-800'}`}>
               {selectionInfo.isConsolidated ? <Globe size={32} /> : <User size={32} />}
             </div>
             <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                 {selectionInfo.isConsolidated ? "Périmètre de Consolidation" : "Responsable Structure"}
               </p>
               <h3 className="text-lg font-black text-slate-800 uppercase leading-tight">{selectionInfo.manager || "Non défini"}</h3>
             </div>
          </div>

          <div className="space-y-3">
            {selectionInfo.isConsolidated ? (
               <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2">Sites Inclus</p>
                  <p className="text-xs font-bold text-slate-600 leading-relaxed italic">
                    Cette vue agrège les performances des {selectionInfo.relevantSitesNames.size} structures de la zone sélectionnée.
                  </p>
               </div>
            ) : (
              <>
                {selectionInfo.phone && (
                  <a href={`tel:${selectionInfo.phone}`} className="flex items-center justify-between p-4 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 hover:bg-emerald-100 transition-colors group/link">
                    <div className="flex items-center gap-3">
                      <Phone size={16} />
                      <span className="text-[11px] font-black uppercase">{selectionInfo.phone}</span>
                    </div>
                    <CheckCircle2 size={14} className="opacity-0 group-hover/link:opacity-100" />
                  </a>
                )}
                {selectionInfo.email && (
                  <a href={`mailto:${selectionInfo.email}`} className="flex items-center justify-between p-4 bg-slate-50 text-slate-700 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-colors group/link">
                    <div className="flex items-center gap-3">
                      <Mail size={16} />
                      <span className="text-[11px] font-black uppercase truncate max-w-[180px]">{selectionInfo.email}</span>
                    </div>
                    <CheckCircle2 size={14} className="opacity-0 group-hover/link:opacity-100" />
                  </a>
                )}
              </>
            )}
          </div>
        </div>

        {/* Bloc Objectifs & Performance Agrégés */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-slate-50 rounded-full -mr-24 -mt-24 pointer-events-none"></div>
          
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
              <Target size={24} />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tighter">Performance & Objectifs Consolider</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
             <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 group">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-3 tracking-widest flex items-center gap-2">
                  <Zap size={10} className="text-orange-500" /> Réalisation Annuelle
                </p>
                <div className="flex items-baseline gap-2 mb-4">
                  <p className="text-3xl font-black text-slate-800">{performanceStats.annualRealized.toLocaleString()}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                    / {selectionInfo.annualObjective?.toLocaleString()} poches
                  </p>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${selectionInfo.isConsolidated ? 'bg-blue-600' : 'bg-slate-900'}`}
                    style={{ width: `${Math.min((performanceStats.annualRealized / (selectionInfo.annualObjective || 1)) * 100, 100)}%` }}
                  ></div>
                </div>
             </div>

             <div className="p-6 bg-slate-900 rounded-3xl text-white">
                <p className="text-[9px] font-black text-white/30 uppercase mb-3 tracking-widest flex items-center gap-2">
                  <History size={10} className="text-red-400" /> Réalisation Mensuelle
                </p>
                <div className="flex items-baseline gap-2 mb-4">
                  <p className="text-3xl font-black text-white">{performanceStats.monthlyRealized.toLocaleString()}</p>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none">
                    / {Math.round((selectionInfo.annualObjective || 0) / 12).toLocaleString()} poches
                  </p>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 transition-all duration-1000"
                    style={{ width: `${Math.min((performanceStats.monthlyRealized / ((selectionInfo.annualObjective || 1) / 12)) * 100, 100)}%` }}
                  ></div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* 3. TABLEAU DES PRÉLÈVEMENTS QUOTIDIENS AGRÉGÉS */}
      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="px-10 py-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400">
                 <History size={20} />
              </div>
              <h3 className="font-black text-lg uppercase tracking-tight text-slate-800">
                Journal de collecte : {MONTHS_FR[selectedMonth]} {selectedYear}
              </h3>
           </div>
           <div className="hidden lg:flex items-center gap-6">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                 <div className="w-3 h-3 bg-blue-500 rounded-sm"></div> COLLECTE SITE FIXE
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                 <div className="w-3 h-3 bg-violet-500 rounded-sm"></div> COLLECTE MOBILE
              </div>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">
                <th className="px-10 py-6 text-left">Date de collecte</th>
                <th className="px-6 py-6 text-center">COLLECTE SITE FIXE</th>
                <th className="px-6 py-6 text-center">COLLECTE MOBILE</th>
                <th className="px-6 py-6 text-center">Total Réalisé</th>
                <th className="px-10 py-6 text-right">Performance / Jour</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {historyData.length > 0 ? historyData.map((row, idx) => {
                const perc = row.objective > 0 ? (row.total / row.objective) * 100 : 0;
                return (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-all group">
                    <td className="px-10 py-5">
                      <span className="text-sm font-black text-slate-800 uppercase tracking-tighter">{row.date}</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="text-sm font-bold text-blue-600">{row.fixe.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="text-sm font-bold text-violet-600">{row.mobile.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="text-lg font-black text-slate-900">{row.total.toLocaleString()}</span>
                    </td>
                    <td className="px-10 py-5 text-right">
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-2">
                           <span className={`text-[10px] font-black ${perc >= 100 ? 'text-green-600' : perc >= 70 ? 'text-orange-500' : 'text-red-500'}`}>
                             {perc.toFixed(1)}%
                           </span>
                           {perc >= 100 ? <CheckCircle2 size={12} className="text-green-500" /> : perc >= 70 ? <AlertTriangle size={12} className="text-orange-500" /> : <XCircle size={12} className="text-red-500" />}
                        </div>
                        <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${perc >= 100 ? 'bg-green-500' : perc >= 70 ? 'bg-orange-500' : 'bg-red-500'}`} style={{ width: `${Math.min(perc, 100)}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={5} className="px-10 py-20 text-center">
                    <p className="text-xs font-black text-slate-300 uppercase tracking-[0.3em]">Aucune donnée enregistrée pour cette période</p>
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
