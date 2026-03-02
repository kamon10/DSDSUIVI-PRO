
import React, { useMemo, useState } from 'react';
import { DashboardData } from '../types';
import { SITES_DATA, GROUP_COLORS, STOCK_FORECASTS } from '../constants';
import { 
  ShieldCheck, AlertTriangle, TrendingUp, Package, 
  Activity, Info, CheckCircle2, AlertCircle, Clock,
  MapPin, ChevronRight, Filter, Target, Database
} from 'lucide-react';

interface StockSynthesisTableViewProps {
  data: DashboardData;
}

const SANG_GROUPS = ["O+", "A+", "B+", "AB+", "O-", "A-", "B-", "AB-"];

export const StockSynthesisTableView: React.FC<StockSynthesisTableViewProps> = ({ data }) => {
  const stock = data.stock || [];
  const distributions = data.distributions?.records || [];

  // Calcul de la consommation moyenne journalière par site et par groupe
  const siteConsumption = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    const uniqueDaysPerSite = new Map<string, Set<string>>();

    distributions.forEach(r => {
      const site = r.site.toUpperCase();
      const group = (r.groupeSanguin || "").replace(/\s/g, "").toUpperCase();
      if (!SANG_GROUPS.includes(group)) return;

      if (!map.has(site)) {
        map.set(site, {});
        uniqueDaysPerSite.set(site, new Set());
      }
      const siteData = map.get(site)!;
      siteData[group] = (siteData[group] || 0) + r.quantite;
      siteData["TOTAL"] = (siteData["TOTAL"] || 0) + r.quantite;
      uniqueDaysPerSite.get(site)!.add(r.date);
    });

    const averages = new Map<string, Record<string, number>>();
    map.forEach((groups, site) => {
      const days = uniqueDaysPerSite.get(site)?.size || 1;
      const siteAvg: Record<string, number> = {};
      Object.entries(groups).forEach(([g, val]) => {
        siteAvg[g] = val / days;
      });
      averages.set(site, siteAvg);
    });

    return averages;
  }, [distributions]);

  const synthesisData = useMemo(() => {
    const grouped = new Map<string, any>();

    SITES_DATA.forEach(siteBase => {
      const regName = siteBase.region || "DIRECTION NATIONALE";
      if (!grouped.has(regName)) {
        grouped.set(regName, {
          name: regName, sites: [], totalStock: 0, avgCons: 0
        });
      }
      const g = grouped.get(regName);

      // Stock actuel pour ce site (CGR uniquement)
      const siteStock = stock
        .filter(s => s.site.toUpperCase() === siteBase.name.toUpperCase() && (s.typeProduit || "").toUpperCase().includes('CGR'))
        .reduce((acc, s) => acc + s.quantite, 0);

      // Consommation moyenne pour ce site
      const siteAvg = siteConsumption.get(siteBase.name.toUpperCase());
      let avgTotal = siteAvg?.TOTAL || 0;

      // Fallback sur les prévisions si pas de données de distribution
      if (avgTotal === 0) {
        const isAbidjan = ["TREICHVILLE", "COCODY", "YOPOUGON", "ABOBO", "PORT-BOUET", "ANYAMA", "BINGERVILLE"].some(kw => siteBase.name.toUpperCase().includes(kw));
        const forecastKey = isAbidjan ? "ABIDJAN" : "NATIONALE";
        // On divise par 10 car STOCK_FORECASTS est souvent sur 10j ou on prend le total
        avgTotal = (STOCK_FORECASTS[forecastKey]?.TOTAL || 0) / 30; // Approximation journalière si pas de données
      }

      // Autonomie
      const autonomy = avgTotal > 0 ? siteStock / avgTotal : 0;

      // Objectif de sécurité (7 jours)
      const safetyStock = avgTotal * 7;
      const gap = safetyStock - siteStock;

      const siteStats = {
        name: siteBase.name,
        stock: siteStock,
        autonomy: autonomy,
        avgDaily: avgTotal,
        safetyStock: safetyStock,
        gap: gap,
        status: autonomy < 3 ? 'CRITIQUE' : autonomy < 7 ? 'ALERTE' : 'OPTIMAL'
      };

      g.sites.push(siteStats);
      g.totalStock += siteStock;
      g.avgCons += avgTotal;
    });

    return Array.from(grouped.values()).filter(g => g.sites.length > 0);
  }, [stock, siteConsumption]);

  const grandTotals = useMemo(() => {
    return synthesisData.reduce((acc, reg) => {
      acc.stock += reg.totalStock;
      acc.cons += reg.avgCons;
      return acc;
    }, { stock: 0, cons: 0 });
  }, [synthesisData]);

  const globalAutonomy = grandTotals.cons > 0 ? grandTotals.stock / grandTotals.cons : 0;

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24">
      
      {/* HEADER COCKPIT STOCK */}
      <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl border border-slate-800 flex flex-col lg:flex-row justify-between items-center gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full -mr-32 -mt-32 opacity-20 blur-3xl"></div>
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-blue-900/50">
            <Database size={38} />
          </div>
          <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Synthèse des Stocks</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[12px] font-black text-white/40 uppercase tracking-widest">Périmètre : National</span>
                <div className="w-1 h-1 bg-white/20 rounded-full"></div>
                <span className="text-[12px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                  <Clock size={12} /> Actualisé : {new Date().toLocaleTimeString()}
                </span>
              </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-6 relative z-10">
          <div className="bg-white/5 backdrop-blur-md px-8 py-5 rounded-[1.75rem] border border-white/10 text-center min-w-[160px]">
            <p className="text-[11px] font-black text-white/40 uppercase mb-1 tracking-widest">Stock Total CGR</p>
            <p className="text-3xl font-black text-white">{grandTotals.stock.toLocaleString()}</p>
          </div>
          <div className={`px-8 py-5 rounded-[1.75rem] text-center min-w-[160px] shadow-xl border ${globalAutonomy < 3 ? 'bg-rose-600 border-rose-500' : globalAutonomy < 7 ? 'bg-amber-600 border-amber-500' : 'bg-emerald-600 border-emerald-500'}`}>
            <p className="text-[11px] font-black text-white/60 uppercase mb-1 tracking-widest">Autonomie Globale</p>
            <p className="text-3xl font-black text-white">{globalAutonomy.toFixed(1)} Jours</p>
          </div>
        </div>
      </div>

      {/* SECTIONS RÉGIONALES */}
      <div className="space-y-8">
        {synthesisData.map((region) => {
          const regionAutonomy = region.avgCons > 0 ? region.totalStock / region.avgCons : 0;
          return (
            <div key={region.name} className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden group transition-all hover:shadow-xl hover:border-slate-200">
              <div className="bg-slate-50/50 px-10 py-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                    <MapPin size={22} />
                  </div>
                  <div>
                    <h3 className="font-black text-lg uppercase tracking-tight text-slate-800">{region.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Autonomie Régionale :</span>
                      <span className={`text-[12px] font-black ${regionAutonomy >= 7 ? 'text-emerald-600' : regionAutonomy >= 3 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {regionAutonomy.toFixed(1)} Jours
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8 w-full md:w-auto">
                   <div className="hidden lg:block w-48 bg-slate-200 h-2.5 rounded-full overflow-hidden shadow-inner">
                      <div 
                        className={`h-full transition-all duration-1000 ${regionAutonomy >= 7 ? 'bg-emerald-500' : regionAutonomy >= 3 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{ width: `${Math.min((regionAutonomy / 10) * 100, 100)}%` }}
                      />
                   </div>
                   <div className="text-right border-l pl-8 border-slate-200">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Stock {region.name}</p>
                      <p className="text-lg font-black text-slate-800">{region.totalStock.toLocaleString()} <span className="text-slate-300 text-sm">Poches</span></p>
                   </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 bg-slate-50/30">
                      <th className="px-10 py-5 text-left">Site</th>
                      <th className="px-6 py-5 text-center">Stock CGR</th>
                      <th className="px-6 py-5 text-center">Autonomie (Jours)</th>
                      <th className="px-6 py-5 text-center">Statut</th>
                      <th className="px-10 py-5 text-right">Besoin Sécurité (7j)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {region.sites.map((site: any) => {
                      const getStatusIcon = (status: string) => {
                        if (status === 'OPTIMAL') return <CheckCircle2 size={14} className="text-emerald-500" />;
                        if (status === 'ALERTE') return <AlertCircle size={14} className="text-amber-500" />;
                        return <AlertTriangle size={14} className="text-rose-500" />;
                      };
                      const getStatusColor = (status: string) => {
                        if (status === 'OPTIMAL') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
                        if (status === 'ALERTE') return 'bg-amber-100 text-amber-700 border-amber-200';
                        return 'bg-rose-100 text-rose-700 border-rose-200';
                      };
                      
                      return (
                        <tr key={site.name} className="hover:bg-slate-50/80 transition-all group">
                          <td className="px-10 py-5">
                            <div className="flex items-center gap-3">
                              <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                              <span className="font-bold text-slate-700 text-base uppercase tracking-tight">{site.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <span className="text-base font-black text-slate-800">{site.stock.toLocaleString()}</span>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <span className={`text-base font-black ${site.autonomy < 3 ? 'text-rose-600' : site.autonomy < 7 ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {site.autonomy.toFixed(1)} J
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col items-center">
                              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-black uppercase tracking-tight ${getStatusColor(site.status)}`}>
                                {getStatusIcon(site.status)}
                                {site.status}
                              </div>
                            </div>
                          </td>
                          <td className="px-10 py-5 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <span className={`text-sm font-black px-4 py-2 rounded-2xl ${site.gap <= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}`}>
                                {site.gap <= 0 ? 'STOCK SÉCURISÉ' : `Manque ${Math.round(site.gap).toLocaleString()} poches`}
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

      {/* MÉTHODOLOGIE */}
      <div className="bg-slate-50 rounded-[3rem] p-10 border border-slate-200">
        <div className="flex items-center gap-4 mb-8">
          <Info size={24} className="text-slate-400" />
          <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">Méthodologie de Calcul Stock</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-emerald-600">
              <CheckCircle2 size={18} />
              <span className="text-[13px] font-black uppercase">Niveau Optimal</span>
            </div>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">Autonomie supérieure à 7 jours. Le stock est suffisant pour couvrir la demande prévue sans risque immédiat.</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertCircle size={18} />
              <span className="text-[13px] font-black uppercase">Niveau Alerte</span>
            </div>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">Autonomie entre 3 et 7 jours. Réapprovisionnement nécessaire pour éviter une situation critique.</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle size={18} />
              <span className="text-[13px] font-black uppercase">Niveau Critique</span>
            </div>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">Autonomie inférieure à 3 jours. Risque élevé de rupture de stock. Action prioritaire requise.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
