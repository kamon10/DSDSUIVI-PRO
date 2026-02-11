import React, { useState, useMemo, useEffect } from 'react';
import { DashboardData, User as UserType } from '../types';
import { WORKING_DAYS_YEAR } from '../constants';
import { MapPin, User, Mail, Phone, Calendar, Search, Building2, Target, History, Globe, BarChart3 } from 'lucide-react';

interface DetailedHistoryViewProps {
  data: DashboardData;
  user?: UserType | null;
  sites: any[];
}

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export const DetailedHistoryView: React.FC<DetailedHistoryViewProps> = ({ data, user, sites }) => {
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

  // Restriction des Régions
  const regions = useMemo(() => {
    const rSet = new Set<string>();
    sites.forEach(s => rSet.add(s.region));
    const allRegions = Array.from(rSet).sort();
    if (!user || user.role === 'ADMIN' || user.role === 'SUPERADMIN') return ["TOUS LES SITES", ...allRegions];
    if (user.role === 'PRES') return [user.region || ""];
    if (user.role === 'AGENT') {
        const site = sites.find(s => s.name.toUpperCase() === user.site.toUpperCase());
        return [site?.region || ""];
    }
    return [];
  }, [sites, user]);

  const [selectedRegion, setSelectedRegion] = useState(regions[0]);

  // Restriction des Sites
  const sitesInRegion = useMemo(() => {
    let baseSites = [];
    let label = "";
    
    if (selectedRegion === "TOUS LES SITES") {
      baseSites = [...sites].sort((a, b) => a.name.localeCompare(b.name));
      label = "CUMUL NATIONAL (TOUS)";
    } else {
      baseSites = sites.filter(s => s.region === selectedRegion).sort((a, b) => a.name.localeCompare(b.name));
      label = `CUMUL ${selectedRegion.replace('PRES ', '')}`;
    }

    const filteredSites = (user?.role === 'AGENT') 
        ? baseSites.filter(s => s.name.toUpperCase() === user.site.toUpperCase())
        : baseSites;

    if (user?.role === 'AGENT') return filteredSites;

    return [{ code: "ALL", name: label, region: selectedRegion, annualObjective: 0 }, ...filteredSites];
  }, [selectedRegion, sites, user]);

  const [selectedSiteCode, setSelectedSiteCode] = useState("ALL");

  useEffect(() => {
    if (user?.role === 'AGENT' && sitesInRegion.length > 0) {
        setSelectedSiteCode(sitesInRegion[0].code);
    } else if (selectedSiteCode === 'ALL' && user?.role === 'AGENT') {
        setSelectedSiteCode(sitesInRegion[0]?.code || "");
    }
  }, [selectedRegion, user, sitesInRegion]);

  const selectionInfo = useMemo(() => {
    if (selectedSiteCode === "ALL") {
      const relevantSites = selectedRegion === "TOUS LES SITES" 
        ? sites 
        : sites.filter(s => s.region === selectedRegion);
      
      const totalAnnualObj = relevantSites.reduce((acc, s) => acc + s.annualObjective, 0);
      
      return {
        name: selectedRegion === "TOUS LES SITES" ? "CONSOLIDATION NATIONALE" : `CONSOLIDATION : ${selectedRegion}`,
        isConsolidated: true,
        annualObjective: totalAnnualObj,
        manager: user?.role === 'PRES' ? "DIRECTION REGIONALE" : "DIRECTION NATIONALE",
        relevantSitesNames: new Set(relevantSites.map(s => s.name.toUpperCase()))
      };
    } else {
      const site = sites.find(s => s.code === selectedSiteCode);
      return {
        ...site,
        isConsolidated: false,
        relevantSitesNames: new Set([site?.name.toUpperCase() || ""])
      };
    }
  }, [selectedSiteCode, selectedRegion, sites, user]);

  const historyData = useMemo(() => {
    return data.dailyHistory
      .filter(h => {
        const parts = h.date.split('/');
        return parts[2] === selectedYear && (parseInt(parts[1]) - 1) === selectedMonth;
      })
      .map(h => {
        let dailyFixe = 0, dailyMobile = 0, dailyTotal = 0, dailyObjective = 0;
        h.sites.forEach(s => {
          if (selectionInfo.relevantSitesNames.has(s.name.toUpperCase())) {
            dailyFixe += s.fixe || 0; dailyMobile += s.mobile || 0; dailyTotal += s.total || 0; dailyObjective += s.objective || 0;
          }
        });
        if (dailyObjective === 0 && selectionInfo.annualObjective) {
            dailyObjective = Math.round(selectionInfo.annualObjective / WORKING_DAYS_YEAR);
        }
        return { date: h.date, fixe: dailyFixe, mobile: dailyMobile, total: dailyTotal, objective: dailyObjective };
      })
      .sort((a, b) => {
        const [da, ma, ya] = a.date.split('/');
        const [db, mb, yb] = b.date.split('/');
        return new Date(parseInt(ya), parseInt(ma)-1, parseInt(da)).getTime() - new Date(parseInt(yb), parseInt(mb)-1, parseInt(db)).getTime();
      });
  }, [data.dailyHistory, selectedYear, selectedMonth, selectionInfo]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
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
            </div>
          </div>

          <div className="flex flex-wrap justify-center lg:justify-end gap-3 w-full lg:w-auto">
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 flex items-center gap-2">
              <Calendar size={14} className="text-slate-400" />
              <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent outline-none text-xs font-black uppercase tracking-widest cursor-pointer">
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {user?.role !== 'AGENT' && (
              <div className={`border rounded-xl px-4 py-2 flex items-center gap-2 transition-all ${selectedRegion === "TOUS LES SITES" ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-900/20' : 'bg-white/5 border-white/10'}`}>
                <MapPin size={14} className={selectedRegion === "TOUS LES SITES" ? "text-white" : "text-slate-400"} />
                <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)} disabled={user?.role === 'PRES'} className="bg-transparent outline-none text-xs font-black uppercase tracking-widest cursor-pointer text-white">
                  {regions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            )}
            <div className="bg-red-600 border border-red-500 rounded-xl px-4 py-2 flex items-center gap-2 shadow-lg shadow-red-900/40">
              <Building2 size={14} className="text-white" />
              <select value={selectedSiteCode} onChange={(e) => setSelectedSiteCode(e.target.value)} disabled={user?.role === 'AGENT'} className="bg-transparent outline-none text-xs font-black uppercase tracking-widest cursor-pointer text-white max-w-[150px] lg:max-w-none">
                {sitesInRegion.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="px-10 py-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
           <h3 className="font-black text-lg uppercase tracking-tight text-slate-800">
             Journal de collecte : {MONTHS_FR[selectedMonth]} {selectedYear}
           </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">
                <th className="px-10 py-6 text-left">Date</th>
                <th className="px-6 py-6 text-center">FIXE</th>
                <th className="px-6 py-6 text-center">MOBILE</th>
                <th className="px-6 py-6 text-center">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {historyData.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-all">
                  <td className="px-10 py-5 font-black text-slate-800">{row.date}</td>
                  <td className="px-6 py-5 text-center text-emerald-600 font-bold">{row.fixe}</td>
                  <td className="px-6 py-5 text-center text-orange-600 font-bold">{row.mobile}</td>
                  <td className="px-6 py-5 text-center text-slate-900 font-black">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};