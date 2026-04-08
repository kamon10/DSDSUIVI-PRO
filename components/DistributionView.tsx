
import React, { useMemo, useState, useEffect } from 'react';
import { DashboardData, DistributionRecord, User } from '../types';
import { Truck, Search, RefreshCw, ClipboardList, Box, ChevronDown } from 'lucide-react';
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
    <div className="space-y-12 animate-in fade-in duration-1000 pb-24">
      <div className="bg-slate-950 rounded-[4rem] p-12 lg:p-16 text-white shadow-2xl relative overflow-hidden border border-white/5">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[150px] -mr-60 -mt-60 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600/5 rounded-full blur-[100px] -ml-20 -mb-20"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-16">
          <div className="flex items-center gap-12">
            <div className="w-24 h-24 lg:w-28 lg:h-28 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] flex items-center justify-center shadow-2xl border border-white/10 group hover:scale-105 transition-transform duration-500">
              <ClipboardList size={48} className="text-white group-hover:rotate-12 transition-transform" />
            </div>
            <div>
              <h2 className="text-4xl lg:text-6xl font-display font-black uppercase tracking-tighter leading-none mb-4">Registre Distribution</h2>
              <div className="flex items-center gap-4">
                 <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                 <span className="text-blue-400/60 font-display font-bold uppercase tracking-[0.4em] text-[11px]">
                   {user?.role === 'AGENT' ? `SITE : ${user.site}` : user?.role === 'PRES' ? `PRES : ${user.region}` : 'Journal Matriciel National'}
                 </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
             <div className="bg-white/5 backdrop-blur-xl px-10 py-8 rounded-[3rem] border border-white/10 text-center min-w-[220px] group hover:bg-white/10 transition-colors">
                <p className="text-[10px] font-display font-black text-blue-400 uppercase tracking-[0.3em] mb-3">Volume Distribué (Brut)</p>
                <p className="text-5xl font-display font-black text-white tracking-tighter">{totals.qty.toLocaleString()}</p>
             </div>
             <div className="bg-emerald-500/10 backdrop-blur-xl px-10 py-8 rounded-[3rem] border border-emerald-500/20 text-center min-w-[220px] group hover:bg-emerald-500/20 transition-colors">
                <p className="text-[10px] font-display font-black text-emerald-400 uppercase tracking-[0.3em] mb-3">Efficacité Nette</p>
                <p className="text-5xl font-display font-black text-emerald-400 tracking-tighter">{(((totals.qty - totals.rendu) / (totals.qty || 1)) * 100).toFixed(1)}%</p>
             </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-10">
         <div className="bg-white/80 backdrop-blur-xl p-2.5 rounded-[2.5rem] shadow-2xl border border-white/60 flex gap-2">
            {['day', 'month', 'year'].map(m => (
              <button 
                key={m}
                onClick={() => setSynthesisMode(m as any)}
                className={`px-12 py-5 rounded-[1.5rem] text-[11px] font-display font-black uppercase tracking-[0.2em] transition-all duration-500 ${
                  synthesisMode === m ? 'bg-slate-950 text-white shadow-2xl scale-105' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                }`}
              >
                {m === 'day' ? 'Registre Jour' : m === 'month' ? 'Registre Mois' : 'Année'}
              </button>
            ))}
         </div>

         <div className="w-full bg-white/80 backdrop-blur-xl p-8 rounded-[3.5rem] shadow-2xl border border-white/60 flex flex-col lg:flex-row gap-6 items-center">
            <div className="flex-1 relative w-full group">
               <Search size={20} className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
               <input 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 placeholder="Rechercher un site, une structure ou une région..."
                 className="w-full pl-20 pr-10 py-6 bg-slate-50/50 border border-slate-100 rounded-[2.5rem] text-sm font-display font-bold outline-none focus:bg-white focus:border-blue-500 focus:ring-8 focus:ring-blue-500/5 transition-all"
               />
            </div>
            <div className="flex gap-4">
               {synthesisMode === 'day' ? (
                 <div className="relative group">
                   <select value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="bg-slate-950 text-white pl-10 pr-14 py-6 rounded-3xl text-[11px] font-display font-black uppercase tracking-widest outline-none cursor-pointer appearance-none hover:bg-slate-800 transition-all shadow-xl">
                      {availableDates.slice(0, 31).map(d => <option key={d} value={d}>{d}</option>)}
                   </select>
                   <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" size={18} />
                 </div>
               ) : (
                 <>
                   <div className="relative group">
                     <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="bg-slate-950 text-white pl-10 pr-14 py-6 rounded-3xl text-[11px] font-display font-black uppercase tracking-widest cursor-pointer outline-none appearance-none hover:bg-slate-800 transition-all shadow-xl">
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                     </select>
                     <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" size={18} />
                   </div>
                   {synthesisMode === 'month' && (
                     <div className="relative group">
                       <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="bg-white border border-slate-200 pl-10 pr-14 py-6 rounded-3xl text-[11px] font-display font-black uppercase tracking-widest cursor-pointer outline-none appearance-none hover:border-blue-500 transition-all shadow-lg">
                          <option value="ALL">Tous les mois</option>
                          {MONTHS_FR.map((m, i) => <option key={i} value={i}>{m}</option>)}
                       </select>
                       <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                     </div>
                   )}
                 </>
               )}
            </div>
         </div>
      </div>

      <div className="card-professional bg-white/90 backdrop-blur-xl border-white/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse table-fixed min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-display font-black text-slate-400 uppercase tracking-[0.25em]">
                <th className="px-8 py-8 text-left sticky left-0 bg-slate-50/80 backdrop-blur-md z-20 shadow-[4px_0_10px_rgba(0,0,0,0.03)] w-[180px]">Site Source</th>
                <th className="px-6 py-8 text-left w-[200px]">Structure</th>
                <th className="px-6 py-8 text-left w-[160px]">Produit</th>
                {SANG_GROUPS.map(g => <th key={g} className="px-2 py-8 text-center w-[60px]">{g}</th>)}
                <th className="px-6 py-8 text-right text-blue-600 w-[90px]">Rendu</th>
                <th className="px-8 py-8 text-right bg-slate-100/30 w-[100px]">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
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
                                <tr key={prodName} className="hover:bg-blue-50/30 transition-colors group">
                                  {dIdx === 0 && pIdx === 0 && (
                                    <td rowSpan={(Object.values(sitData.destinations).reduce((acc: number, d: any) => acc + Object.keys(d.products).length, 0) as number) + 1} className="px-8 py-8 align-top sticky left-0 bg-white group-hover:bg-blue-50/30 z-10 border-r border-slate-50 shadow-[4px_0_10px_rgba(0,0,0,0.02)] transition-colors">
                                      <span className="text-[14px] font-display font-black text-slate-950 uppercase leading-tight block">{sitName}</span>
                                    </td>
                                  )}
                                  {pIdx === 0 && <td rowSpan={Object.keys(destData.products).length} className="px-6 py-8 align-top"><span className="text-[13px] font-display font-bold text-slate-700 uppercase leading-tight block">{destName}</span></td>}
                                  <td className="px-6 py-6">
                                    <span className="px-4 py-2 rounded-xl text-[10px] font-display font-black border uppercase block leading-tight text-center tracking-widest shadow-sm" style={{ color: PRODUCT_COLORS[prodName] || '#64748b', borderColor: `${PRODUCT_COLORS[prodName]}33`, backgroundColor: `${PRODUCT_COLORS[prodName]}11` }}>{prodName}</span>
                                  </td>
                                  {SANG_GROUPS.map(g => {
                                    const val = prodMetrics.groups[g];
                                    return <td key={g} className={`px-2 py-6 text-center text-[14px] font-display ${val > 0 ? 'font-black text-slate-950' : 'text-slate-200'}`}>{val}</td>;
                                  })}
                                  <td className={`px-6 py-6 text-right text-[14px] font-display font-black ${prodMetrics.rendu > 0 ? 'text-blue-600' : 'text-slate-200'}`}>{prodMetrics.rendu}</td>
                                  <td className="px-8 py-6 text-right text-[14px] font-display font-black text-slate-950 bg-slate-50/30">{rowGrossTotal}</td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        ))}
                        <tr className="bg-blue-50/50 font-display font-black border-b border-blue-100/50">
                          <td colSpan={2} className="px-8 py-6 text-right pr-10">
                            <span className="text-[10px] text-slate-400 uppercase tracking-[0.3em] mr-4">SOUS-TOTAL SITE</span>
                            <span className="text-[13px] text-blue-700 font-black uppercase truncate inline-block max-w-[200px] align-middle tracking-tight">{sitName}</span>
                          </td>
                          <td className="px-6 py-6"></td>
                          {SANG_GROUPS.map(g => <td key={g} className="px-2 py-6 text-center text-[15px] text-blue-900 tracking-tighter">{siteTotals[g]}</td>)}
                          <td className="px-6 py-6 text-right text-blue-700 text-[15px] tracking-tighter">{siteRendu}</td>
                          <td className="px-8 py-6 text-right text-blue-900 bg-blue-100/20 text-[16px] tracking-tighter">{siteGrossTotal}</td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                  <tr className="bg-slate-950 text-white font-display font-black shadow-2xl relative z-20">
                    <td className="px-8 py-10 sticky left-0 bg-slate-950 z-30 border-r border-white/10"></td>
                    <td className="px-8 py-10 text-right pr-10" colSpan={2}>
                      <span className="text-[14px] uppercase tracking-[0.4em] text-blue-400">TOTAL GÉNÉRAL FILTRÉ</span>
                    </td>
                    {SANG_GROUPS.map(g => (
                      <td key={g} className="px-2 py-10 text-center text-[18px] tracking-tighter">{totals.groups[g]}</td>
                    ))}
                    <td className="px-6 py-10 text-right text-blue-400 text-[18px] tracking-tighter">{totals.rendu}</td>
                    <td className="px-8 py-10 text-right text-emerald-400 bg-white/5 text-[22px] tracking-tighter">{totals.qty}</td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td colSpan={14} className="py-60 text-center opacity-30">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8">
                      <Box size={48} className="text-slate-300"/>
                    </div>
                    <p className="text-sm font-display font-black uppercase tracking-[0.5em] text-slate-400">Aucun enregistrement pour cette sélection</p>
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
