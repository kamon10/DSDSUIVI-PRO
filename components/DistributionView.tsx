
import React, { useMemo, useState, useEffect } from 'react';
import { DashboardData, DistributionRecord, User } from '../types';
import { Truck, Search, RefreshCw, ClipboardList, Box } from 'lucide-react';
import { PRODUCT_COLORS } from '../constants';

const MONTHS_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const SANG_GROUPS = ["A+", "A-", "AB+", "AB-", "B+", "B-", "O+", "O-"];

interface DistributionViewProps {
  data: DashboardData;
  user?: User | null;
}

export const DistributionView: React.FC<DistributionViewProps> = ({ data, user }) => {
  const dist = data.distributions;

  const [synthesisMode, setSynthesisMode] = useState<'day' | 'month' | 'year'>('month');
  const [filterYear, setFilterYear] = useState<string>("ALL");
  const [filterMonth, setFilterMonth] = useState<string>("ALL");
  const [filterDate, setFilterDate] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const years = useMemo(() => {
    if (!dist?.records.length) return [];
    return Array.from(new Set(dist.records.map((r: DistributionRecord) => r.date.split('/')[2]))).sort().reverse();
  }, [dist]);

  const availableDates = useMemo(() => {
    if (!dist?.records.length) return [];
    return Array.from(new Set(dist.records.map((r: DistributionRecord) => r.date))).sort((a: any, b: any) => {
      const [da, ma, ya] = (a as string).split('/').map(Number);
      const [db, mb, yb] = (b as string).split('/').map(Number);
      return new Date(yb, mb - 1, db).getTime() - new Date(ya, ma - 1, da).getTime();
    });
  }, [dist]);

  useEffect(() => {
    if (years.length > 0 && filterYear === "ALL") setFilterYear(years[0]);
    if (availableDates.length > 0 && filterDate === "ALL") setFilterDate(availableDates[0]);
    if (synthesisMode === 'month' && filterMonth === "ALL" && dist?.records.length) {
      const latestMonth = dist.records[0].date.split('/')[1];
      setFilterMonth((parseInt(latestMonth) - 1).toString());
    }
  }, [dist, synthesisMode, years, availableDates]);

  const filteredRecords = useMemo(() => {
    if (!dist?.records.length) return [];
    return dist.records.filter(r => {
      const parts = r.date.split('/');
      const d = r.date;
      const m = (parseInt(parts[1]) - 1).toString();
      const y = parts[2];
      
      let timeMatch = true;
      if (synthesisMode === 'day') timeMatch = filterDate === "ALL" || d === filterDate;
      else if (synthesisMode === 'month') timeMatch = (filterYear === "ALL" || y === filterYear) && (filterMonth === "ALL" || m === filterMonth);
      else if (synthesisMode === 'year') timeMatch = filterYear === "ALL" || y === filterYear;

      const matchSearch = searchTerm === "" || 
        r.etablissement.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.site.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.region.toLowerCase().includes(searchTerm.toLowerCase());

      return timeMatch && matchSearch;
    });
  }, [dist, synthesisMode, filterYear, filterMonth, filterDate, searchTerm]);

  const registerData = useMemo(() => {
    const tree: any = {};
    filteredRecords.forEach(r => {
      const sit = r.site || "INCONNU";
      const dest = r.etablissement || "INCONNU";
      const prod = r.typeProduit || "AUTRES";
      const grp = r.groupeSanguin || "N/A";
      if (!tree[sit]) tree[sit] = { destinations: {} };
      if (!tree[sit].destinations[dest]) tree[sit].destinations[dest] = { products: {} };
      if (!tree[sit].destinations[dest].products[prod]) {
        tree[sit].destinations[dest].products[prod] = { 
          groups: Object.fromEntries(SANG_GROUPS.map(g => [g, 0])),
          rendu: 0 
        };
      }
      if (SANG_GROUPS.includes(grp)) {
        tree[sit].destinations[dest].products[prod].groups[grp] += r.quantite;
      }
      tree[sit].destinations[dest].products[prod].rendu += r.rendu;
    });
    return tree;
  }, [filteredRecords]);

  const totals = useMemo(() => {
    const globalGroups = Object.fromEntries(SANG_GROUPS.map(g => [g, 0]));
    let globalRendu = 0;
    let globalGross = 0;

    filteredRecords.forEach(r => {
      const grp = r.groupeSanguin || "N/A";
      if (SANG_GROUPS.includes(grp)) {
        globalGroups[grp] += r.quantite;
      }
      globalRendu += r.rendu;
      globalGross += r.quantite;
    });

    return { 
      qty: globalGross, 
      rendu: globalRendu,
      groups: globalGroups
    };
  }, [filteredRecords]);

  if (!dist || !dist.records.length) {
    return (
      <div className="py-40 flex flex-col items-center justify-center gap-6 text-center">
        <RefreshCw size={80} className="text-slate-300 animate-spin-slow" />
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Initialisation du Registre...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="bg-[#0f172a] rounded-[4rem] p-10 lg:p-14 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] -mr-40 -mt-40"></div>
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
          <div className="flex items-center gap-10">
            <div className="w-20 h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[2.5rem] flex items-center justify-center shadow-2xl border border-white/10">
              <ClipboardList size={40} className="text-white" />
            </div>
            <div>
              <h2 className="text-4xl lg:text-5xl font-black uppercase tracking-tighter leading-none mb-3">REGISTRE DE DISTRIBUTION</h2>
              <div className="flex items-center gap-3">
                 <span className="text-indigo-400/60 font-black uppercase tracking-[0.4em] text-[10px]">
                   {user?.role === 'AGENT' ? `SITE : ${user.site}` : user?.role === 'PRES' ? `PRES : ${user.region}` : 'Journal Matriciel National'}
                 </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
             <div className="bg-white/5 backdrop-blur-md px-8 py-6 rounded-[2.5rem] border border-white/10 text-center min-w-[180px]">
                <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Volume Distribué (Brut)</p>
                <p className="text-4xl font-black text-white">{totals.qty.toLocaleString()}</p>
             </div>
             <div className="bg-emerald-500/10 backdrop-blur-md px-8 py-6 rounded-[2.5rem] border border-emerald-500/20 text-center min-w-[180px]">
                <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">Efficacité Nette</p>
                <p className="text-4xl font-black text-emerald-400">{(((totals.qty - totals.rendu) / (totals.qty || 1)) * 100).toFixed(1)}%</p>
             </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-8">
         <div className="bg-white p-2 rounded-[2rem] shadow-xl border border-slate-100 flex gap-2">
            {['day', 'month', 'year'].map(m => (
              <button 
                key={m}
                onClick={() => setSynthesisMode(m as any)}
                className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  synthesisMode === m ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'
                }`}
              >
                {m === 'day' ? 'Registre Jour' : m === 'month' ? 'Registre Mois' : 'Année'}
              </button>
            ))}
         </div>

         <div className="w-full bg-white p-6 rounded-[3rem] shadow-warm border border-slate-100 flex flex-col lg:flex-row gap-4 items-center">
            <div className="flex-1 relative w-full">
               <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" />
               <input 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 placeholder="Filtrer les lignes..."
                 className="w-full pl-16 pr-8 py-5 bg-slate-50 border border-slate-200 rounded-[2rem] text-xs font-bold outline-none focus:ring-4 ring-indigo-50"
               />
            </div>
            <div className="flex gap-3">
               {synthesisMode === 'day' ? (
                 <select value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="bg-indigo-600 text-white px-6 py-4 rounded-xl text-[10px] font-black uppercase outline-none cursor-pointer">
                    {availableDates.slice(0, 31).map(d => <option key={d} value={d}>{d}</option>)}
                 </select>
               ) : (
                 <>
                   <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="bg-slate-900 text-white px-6 py-4 rounded-xl text-[10px] font-black uppercase cursor-pointer outline-none">
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                   </select>
                   {synthesisMode === 'month' && (
                     <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="bg-white border border-slate-200 px-6 py-4 rounded-xl text-[10px] font-black uppercase cursor-pointer outline-none">
                        <option value="ALL">Tous les mois</option>
                        {MONTHS_FR.map((m, i) => <option key={i} value={i}>{m}</option>)}
                     </select>
                   )}
                 </>
               )}
            </div>
         </div>
      </div>

      <div className="bg-white rounded-[4rem] shadow-3xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse table-fixed min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-4 py-6 text-left sticky left-0 bg-slate-50 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)] w-[140px]">Site Source</th>
                <th className="px-4 py-6 text-left w-[150px]">Structure</th>
                <th className="px-4 py-6 text-left w-[120px]">Produit</th>
                {SANG_GROUPS.map(g => <th key={g} className="px-1 py-6 text-center w-[45px]">{g}</th>)}
                <th className="px-4 py-6 text-right text-indigo-600 w-[65px]">Rendu</th>
                <th className="px-4 py-6 text-right bg-slate-100/50 w-[70px]">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.keys(registerData).length > 0 ? (
                <>
                  {Object.entries(registerData).sort().map(([sitName, sitData]: [string, any]) => {
                    const siteTotals = Object.fromEntries(SANG_GROUPS.map(g => [g, 0]));
                    let siteRendu = 0; let siteGrossTotal = 0;
                    Object.values(sitData.destinations).forEach((dest: any) => {
                      Object.values(dest.products).forEach((prod: any) => {
                        SANG_GROUPS.forEach(g => { siteTotals[g] += prod.groups[g]; siteGrossTotal += prod.groups[g]; });
                        siteRendu += prod.rendu;
                      });
                    });
                    return (
                      <React.Fragment key={sitName}>
                        {Object.entries(sitData.destinations).sort().map(([destName, destData]: [string, any], dIdx) => (
                          <React.Fragment key={destName}>
                            {Object.entries(destData.products).sort().map(([prodName, prodMetrics]: [string, any], pIdx) => {
                              const rowGrossTotal = SANG_GROUPS.reduce((acc, g) => acc + prodMetrics.groups[g], 0);
                              return (
                                <tr key={prodName} className="hover:bg-slate-50/50 transition-colors group">
                                  {dIdx === 0 && pIdx === 0 && (
                                    <td rowSpan={(Object.values(sitData.destinations).reduce((acc: number, d: any) => acc + Object.keys(d.products).length, 0) as number) + 1} className="px-4 py-4 align-top sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-50 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                      <span className="text-[11px] font-black text-red-600 uppercase leading-tight">{sitName}</span>
                                    </td>
                                  )}
                                  {pIdx === 0 && <td rowSpan={Object.keys(destData.products).length} className="px-4 py-4 align-top"><span className="text-[10px] font-black text-slate-800 uppercase leading-tight">{destName}</span></td>}
                                  <td className="px-4 py-3">
                                    <span className="px-2 py-0.5 rounded text-[8px] font-black border uppercase block truncate max-w-[110px]" style={{ color: PRODUCT_COLORS[prodName] || '#64748b', borderColor: `${PRODUCT_COLORS[prodName]}33`, backgroundColor: `${PRODUCT_COLORS[prodName]}11` }}>{prodName}</span>
                                  </td>
                                  {SANG_GROUPS.map(g => {
                                    const val = prodMetrics.groups[g];
                                    return <td key={g} className={`px-1 py-3 text-center text-[10px] ${val > 0 ? 'font-black text-slate-900' : 'text-slate-200'}`}>{val}</td>;
                                  })}
                                  <td className={`px-4 py-3 text-right text-[10px] font-black ${prodMetrics.rendu > 0 ? 'text-indigo-600' : 'text-slate-200'}`}>{prodMetrics.rendu}</td>
                                  <td className="px-4 py-3 text-right text-[10px] font-black text-slate-900 bg-slate-50/30">{rowGrossTotal}</td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        ))}
                        <tr className="bg-indigo-50/30 font-black border-b-2 border-indigo-100">
                          <td className="px-4 py-4 sticky left-0 bg-indigo-50/30 z-10 border-r border-indigo-100/50 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                            {/* Colonne Site Source vide pour le sous-total */}
                          </td>
                          <td className="px-4 py-4 text-right pr-6">
                            <span className="text-[8px] text-slate-400 uppercase tracking-[0.2em] mr-2">SOUS-TOTAL</span>
                            <span className="text-[10px] text-indigo-700 font-black uppercase truncate inline-block max-w-[150px] align-middle">{sitName}</span>
                          </td>
                          <td className="px-4 py-4">
                            {/* Colonne Produit vide pour le sous-total */}
                          </td>
                          {SANG_GROUPS.map(g => <td key={g} className="px-1 py-4 text-center text-[11px] text-indigo-900">{siteTotals[g]}</td>)}
                          <td className="px-4 py-4 text-right text-indigo-700 text-[11px]">{siteRendu}</td>
                          <td className="px-4 py-4 text-right text-indigo-900 bg-indigo-100/20 text-[11px]">{siteGrossTotal}</td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                  {/* TOTAL GÉNÉRAL EN BAS DU TABLEAU */}
                  <tr className="bg-slate-900 text-white font-black">
                    <td className="px-4 py-6 sticky left-0 bg-slate-900 z-20 border-r border-slate-800"></td>
                    <td className="px-4 py-6 text-right pr-6" colSpan={2}>
                      <span className="text-[10px] uppercase tracking-[0.3em]">TOTAL GÉNÉRAL FILTRÉ</span>
                    </td>
                    {SANG_GROUPS.map(g => (
                      <td key={g} className="px-1 py-6 text-center text-[12px]">{totals.groups[g]}</td>
                    ))}
                    <td className="px-4 py-6 text-right text-indigo-400 text-[12px]">{totals.rendu}</td>
                    <td className="px-4 py-6 text-right text-emerald-400 bg-white/10 text-[14px]">{totals.qty}</td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td colSpan={14} className="py-40 text-center opacity-20">
                    <Box size={64} className="mx-auto mb-4"/>
                    <p className="text-xs font-black uppercase tracking-[0.4em]">Aucun enregistrement pour cette sélection</p>
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
