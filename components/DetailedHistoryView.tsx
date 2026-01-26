
import React, { useState, useMemo } from 'react';
import { DashboardData } from '../types';
import { SITES_DATA, WORKING_DAYS_YEAR } from '../constants';
import { MapPin, User, Mail, Phone, Calendar, Search, Building2, Truck, Target, CheckCircle2, XCircle, AlertTriangle, History } from 'lucide-react';

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

  // Filtre Région
  const regions = useMemo(() => {
    const rSet = new Set<string>();
    SITES_DATA.forEach(s => rSet.add(s.region));
    return Array.from(rSet).sort();
  }, []);

  const [selectedRegion, setSelectedRegion] = useState(regions[0] || "");

  // Filtre Site (dynamique selon région)
  const sitesInRegion = useMemo(() => {
    return SITES_DATA.filter(s => s.region === selectedRegion).sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedRegion]);

  const [selectedSiteCode, setSelectedSiteCode] = useState(sitesInRegion[0]?.code || "");

  const siteInfo = useMemo(() => {
    return SITES_DATA.find(s => s.code === selectedSiteCode);
  }, [selectedSiteCode]);

  // Données historiques pour le site sélectionné
  const historyData = useMemo(() => {
    if (!siteInfo) return [];
    
    return data.dailyHistory
      .filter(h => {
        const parts = h.date.split('/');
        return parts[2] === selectedYear && (parseInt(parts[1]) - 1) === selectedMonth;
      })
      .map(h => {
        const siteData = h.sites.find(s => s.name.toUpperCase() === siteInfo.name.toUpperCase());
        return {
          date: h.date,
          fixe: siteData?.fixe || 0,
          mobile: siteData?.mobile || 0,
          total: siteData?.total || 0,
          objective: siteData?.objective || Math.round(siteInfo.annualObjective / WORKING_DAYS_YEAR)
        };
      })
      .sort((a, b) => {
        const [da, ma, ya] = a.date.split('/');
        const [db, mb, yb] = b.date.split('/');
        return new Date(parseInt(yb), parseInt(mb)-1, parseInt(db)).getTime() - new Date(parseInt(ya), parseInt(ma)-1, parseInt(da)).getTime();
      });
  }, [data.dailyHistory, selectedYear, selectedMonth, selectedSiteCode, siteInfo]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      
      {/* 1. BARRE DE FILTRES INTELLIGENTE */}
      <div className="bg-slate-900 rounded-[2.5rem] p-6 lg:p-10 shadow-2xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-[80px]"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner">
               <Search size={24} className="text-red-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">Historique de Site</h2>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">Consultation quotidienne personnalisée</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center lg:justify-end gap-3 w-full lg:w-auto">
            {/* Année */}
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 flex items-center gap-2">
              <Calendar size={14} className="text-slate-400" />
              <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent outline-none text-xs font-black uppercase tracking-widest cursor-pointer">
                {availableYears.map(y => <option key={y} value={y} className="text-slate-900">{y}</option>)}
              </select>
            </div>
            {/* Mois */}
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 flex items-center gap-2">
              <History size={14} className="text-slate-400" />
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="bg-transparent outline-none text-xs font-black uppercase tracking-widest cursor-pointer">
                {availableMonths.map(m => <option key={m} value={m} className="text-slate-900">{MONTHS_FR[m]}</option>)}
              </select>
            </div>
            {/* Région */}
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 flex items-center gap-2">
              <MapPin size={14} className="text-slate-400" />
              <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)} className="bg-transparent outline-none text-xs font-black uppercase tracking-widest cursor-pointer">
                {regions.map(r => <option key={r} value={r} className="text-slate-900">{r}</option>)}
              </select>
            </div>
            {/* Site */}
            <div className="bg-red-600 border border-red-500 rounded-xl px-4 py-2 flex items-center gap-2 shadow-lg shadow-red-900/40">
              <Building2 size={14} className="text-white" />
              <select value={selectedSiteCode} onChange={(e) => setSelectedSiteCode(e.target.value)} className="bg-transparent outline-none text-xs font-black uppercase tracking-widest cursor-pointer text-white">
                {sitesInRegion.map(s => <option key={s.code} value={s.code} className="text-slate-900">{s.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FICHE D'IDENTITÉ ET CONTACTS */}
      {siteInfo && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Bloc Responsable */}
          <div className="lg:col-span-1 bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 flex flex-col justify-between group">
            <div className="flex items-center gap-5 mb-8">
               <div className="w-16 h-16 bg-slate-50 text-slate-800 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                 <User size={32} />
               </div>
               <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Responsable Structure</p>
                 <h3 className="text-lg font-black text-slate-800 uppercase leading-tight">{siteInfo.manager || "Non défini"}</h3>
               </div>
            </div>

            <div className="space-y-3">
              {siteInfo.phone && (
                <a href={`tel:${siteInfo.phone}`} className="flex items-center justify-between p-4 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 hover:bg-emerald-100 transition-colors group/link">
                  <div className="flex items-center gap-3">
                    <Phone size={16} />
                    <span className="text-[11px] font-black uppercase">{siteInfo.phone}</span>
                  </div>
                  <CheckCircle2 size={14} className="opacity-0 group-hover/link:opacity-100" />
                </a>
              )}
              {siteInfo.email && (
                <a href={`mailto:${siteInfo.email}`} className="flex items-center justify-between p-4 bg-slate-50 text-slate-700 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-colors group/link">
                  <div className="flex items-center gap-3">
                    <Mail size={16} />
                    <span className="text-[11px] font-black uppercase truncate max-w-[180px]">{siteInfo.email}</span>
                  </div>
                  <CheckCircle2 size={14} className="opacity-0 group-hover/link:opacity-100" />
                </a>
              )}
            </div>
          </div>

          {/* Bloc Objectifs & Stats */}
          <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-slate-50 rounded-full -mr-24 -mt-24 pointer-events-none"></div>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                <Target size={24} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tighter">Objectifs de Performance</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
               <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Cible Annuelle</p>
                  <p className="text-3xl font-black text-slate-800">{siteInfo.annualObjective.toLocaleString()} <span className="text-xs text-slate-400 font-medium tracking-normal lowercase">poches / an</span></p>
               </div>
               <div className="p-6 bg-slate-900 rounded-3xl text-white">
                  <p className="text-[9px] font-black text-white/30 uppercase mb-2 tracking-widest">Cible Mensuelle</p>
                  <p className="text-3xl font-black text-white">{Math.round(siteInfo.annualObjective / 12).toLocaleString()} <span className="text-xs text-white/30 font-medium tracking-normal lowercase">poches / mois</span></p>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TABLEAU DES PRÉLÈVEMENTS QUOTIDIENS */}
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
                 <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div> Fixe
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                 <div className="w-3 h-3 bg-orange-500 rounded-sm"></div> Mobile
              </div>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">
                <th className="px-10 py-6 text-left">Date de collecte</th>
                <th className="px-6 py-6 text-center">Structure Fixe</th>
                <th className="px-6 py-6 text-center">Unité Mobile</th>
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
                      <span className="text-sm font-bold text-emerald-600">{row.fixe}</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="text-sm font-bold text-orange-600">{row.mobile}</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="text-lg font-black text-slate-900">{row.total}</span>
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
