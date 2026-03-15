
import React, { useMemo, useState } from 'react';
import { DashboardData, User, SiteRecord } from '../types';
import { SITES_DATA, COLORS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Target, TrendingUp, Zap, AlertTriangle, CheckCircle2, Filter, Search, Download, Info } from 'lucide-react';
import { motion } from 'framer-motion';

interface CapacityPlanningViewProps {
  data: DashboardData;
  user: User | null;
  sites: any[];
}

export const CapacityPlanningView: React.FC<CapacityPlanningViewProps> = ({ data, user, sites }) => {
  const [viewMode, setViewMode] = useState<'NATIONAL' | 'ABIDJAN'>('NATIONAL');
  const [searchTerm, setSearchTerm] = useState('');

  const abidjanUrbanKeywords = ["TREICHVILLE", "BINGERVILLE", "PORT BOUET", "ABOBO", "ANYAMA", "COCODY", "YOPOUGON"];
  const excludedKeywords = ["BONOUA", "ABOISSO", "ADZOPE", "AGBOVILLE", "DABOU"];

  const normalize = (str: string) => 
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

  const siteStats = useMemo(() => {
    const stats: any[] = [];
    
    // On parcourt tous les sites de SITES_DATA
    SITES_DATA.forEach(siteInfo => {
      const siteNameNorm = normalize(siteInfo.name);
      
      // Filtrage selon le mode
      if (viewMode === 'ABIDJAN') {
        const isUrban = abidjanUrbanKeywords.some(kw => siteNameNorm.includes(kw));
        const isExcluded = excludedKeywords.some(kw => siteNameNorm.includes(kw));
        if (!isUrban || isExcluded) return;
      }

      // Calcul des perfs historiques pour ce site
      let totalPoches = 0;
      let maxPoches = 0;
      let daysWithData = 0;
      const last30Days = data.dailyHistory.slice(0, 30);

      last30Days.forEach(day => {
        const siteEntry = day.sites.find(s => normalize(s.name) === siteNameNorm);
        if (siteEntry) {
          totalPoches += siteEntry.total;
          if (siteEntry.total > maxPoches) maxPoches = siteEntry.total;
          daysWithData++;
        }
      });

      const avgDaily = daysWithData > 0 ? totalPoches / daysWithData : 0;
      const objDaily = Math.round(siteInfo.annualObjective / 313); // 313 jours ouvrés

      stats.push({
        name: siteInfo.name,
        region: siteInfo.region,
        objective: objDaily,
        average: Math.round(avgDaily),
        peak: maxPoches,
        utilization: objDaily > 0 ? (avgDaily / objDaily) * 100 : 0,
        potential: objDaily > 0 ? (maxPoches / objDaily) * 100 : 0,
        gap: objDaily - Math.round(avgDaily)
      });
    });

    return stats.filter(s => s.name.toUpperCase().includes(searchTerm.toUpperCase()));
  }, [data, viewMode, searchTerm]);

  const totals = useMemo(() => {
    return siteStats.reduce((acc, s) => ({
      objective: acc.objective + s.objective,
      average: acc.average + s.average,
      peak: acc.peak + s.peak
    }), { objective: 0, average: 0, peak: 0 });
  }, [siteStats]);

  return (
    <div className="space-y-8">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900">Capacité & Prévisions</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-2 flex items-center gap-2">
            <Info size={14} className="text-blue-500" />
            Analyse de la capacité de prélèvement basée sur les objectifs et les pics historiques
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button 
              onClick={() => setViewMode('NATIONAL')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'NATIONAL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              National
            </button>
            <button 
              onClick={() => setViewMode('ABIDJAN')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'ABIDJAN' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Abidjan Urbain
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Rechercher un site..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-blue-500/20 transition-all w-64"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Objectif Quotidien Global</span>
            <Target className="text-blue-500" size={20} />
          </div>
          <div>
            <div className="text-5xl font-black text-slate-900 tracking-tighter">{totals.objective}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">Poches / Jour</div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Moyenne Réalisée (30j)</span>
            <TrendingUp className="text-emerald-500" size={20} />
          </div>
          <div>
            <div className="text-5xl font-black text-slate-900 tracking-tighter">{totals.average}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">
              {totals.objective > 0 ? Math.round((totals.average / totals.objective) * 100) : 0}% de l'objectif
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Capacité de Pointe (Pics)</span>
            <Zap className="text-amber-500" size={20} />
          </div>
          <div>
            <div className="text-5xl font-black text-slate-900 tracking-tighter">{totals.peak}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">
              Potentiel de {totals.objective > 0 ? Math.round((totals.peak / totals.objective) * 100) : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-bottom border-slate-100">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Site de Prélèvement</th>
                <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Objectif (J)</th>
                <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Moyenne (30j)</th>
                <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Pic Historique</th>
                <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Utilisation Capacité</th>
                <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {siteStats.map((site, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">{site.name}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{site.region}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="text-sm font-black text-slate-900">{site.objective}</span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`text-sm font-black ${site.average >= site.objective ? 'text-emerald-600' : 'text-slate-600'}`}>
                      {site.average}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-black text-amber-600">{site.peak}</span>
                      <span className="text-[8px] font-bold text-amber-400 uppercase tracking-widest">Potentiel {Math.round(site.potential)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="w-full max-w-[160px]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase">{Math.round(site.utilization)}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(site.utilization, 100)}%` }}
                          className={`h-full rounded-full ${
                            site.utilization >= 90 ? 'bg-emerald-500' : 
                            site.utilization >= 50 ? 'bg-blue-500' : 
                            'bg-amber-500'
                          }`}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-center">
                      {site.average >= site.objective ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                          <CheckCircle2 size={14} />
                          <span className="text-[9px] font-black uppercase">Optimal</span>
                        </div>
                      ) : site.potential >= 100 ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                          <Zap size={14} />
                          <span className="text-[9px] font-black uppercase">Sous-Exploité</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                          <AlertTriangle size={14} />
                          <span className="text-[9px] font-black uppercase">Critique</span>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl">
          <h3 className="text-xl font-black uppercase tracking-tighter mb-8">Comparaison Capacité vs Objectif</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={siteStats} layout="vertical" margin={{ left: 40, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={120} 
                  tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-white/10">
                          <p className="text-[10px] font-black uppercase tracking-widest mb-2">{payload[0].payload.name}</p>
                          <div className="space-y-1">
                            <p className="text-xs flex justify-between gap-8">
                              <span className="opacity-60">Objectif:</span>
                              <span className="font-bold">{payload[0].payload.objective}</span>
                            </p>
                            <p className="text-xs flex justify-between gap-8">
                              <span className="opacity-60">Moyenne:</span>
                              <span className="font-bold">{payload[0].payload.average}</span>
                            </p>
                            <p className="text-xs flex justify-between gap-8">
                              <span className="opacity-60">Pic:</span>
                              <span className="font-bold text-amber-400">{payload[0].payload.peak}</span>
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="average" radius={[0, 4, 4, 0]} barSize={20}>
                  {siteStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.average >= entry.objective ? '#10b981' : '#3b82f6'} />
                  ))}
                </Bar>
                <Bar dataKey="objective" fill="#e2e8f0" radius={[0, 4, 4, 0]} barSize={8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl text-white">
          <h3 className="text-xl font-black uppercase tracking-tighter mb-8">Analyse Prévisionnelle</h3>
          <div className="space-y-6">
            <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
              <h4 className="text-xs font-black uppercase tracking-widest text-blue-400 mb-4">Recommandation Stratégique</h4>
              <p className="text-sm text-slate-300 leading-relaxed">
                {viewMode === 'ABIDJAN' 
                  ? "Pour Abidjan Urbain, la capacité de pointe montre que les sites peuvent absorber jusqu'à 150% de l'objectif quotidien. Le levier principal est l'optimisation des collectes mobiles sur les sites à fort potentiel comme Treichville et Cocody."
                  : "Au niveau National, la disparité entre les CRTS et les CDTS est marquée. Une réallocation des ressources mobiles vers les zones à fort potentiel (Bouaké, Korhogo) permettrait de stabiliser la moyenne nationale au-dessus de l'objectif."
                }
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-emerald-500/10 rounded-3xl border border-emerald-500/20">
                <div className="text-2xl font-black text-emerald-400">{Math.round(totals.average)}</div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-500/60 mt-1">Capacité Stable</div>
              </div>
              <div className="p-6 bg-amber-500/10 rounded-3xl border border-amber-500/20">
                <div className="text-2xl font-black text-amber-400">{Math.round(totals.peak)}</div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-amber-500/60 mt-1">Capacité Maximale</div>
              </div>
            </div>

            <div className="p-8 bg-blue-600 rounded-[2rem] shadow-lg shadow-blue-600/20">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Zap size={20} className="text-white" />
                </div>
                <div className="text-lg font-black uppercase tracking-tighter">Indice de Prévision</div>
              </div>
              <p className="text-xs text-blue-100 font-medium leading-relaxed mb-6">
                Basé sur les tendances actuelles, le stock national peut être maintenu à un niveau de sécurité de 10 jours si au moins 85% de la capacité de pointe est mobilisée 2 fois par semaine.
              </p>
              <button className="w-full py-4 bg-white text-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 transition-colors">
                Générer Plan de Collecte
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
