
import React, { useMemo, useState } from 'react';
import { DashboardData, User, SiteRecord, StockRecord } from '../types';
import { SITES_DATA, COLORS, STOCK_FORECASTS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Package, ShieldCheck, AlertTriangle, CheckCircle2, Search, Info, TrendingUp, Clock, Zap } from 'lucide-react';
import { motion } from 'motion/react';

interface StockPlanningViewProps {
  data: DashboardData;
  user: User | null;
  sites: any[];
}

export const StockPlanningView: React.FC<StockPlanningViewProps> = ({ data, user, sites }) => {
  const [viewMode, setViewMode] = useState<'NATIONAL' | 'ABIDJAN'>('NATIONAL');
  const [searchTerm, setSearchTerm] = useState('');

  const abidjanUrbanKeywords = ["TREICHVILLE", "BINGERVILLE", "PORT BOUET", "ABOBO", "ANYAMA", "COCODY", "YOPOUGON"];
  const excludedKeywords = ["BONOUA", "ABOISSO", "ADZOPE", "AGBOVILLE", "DABOU"];

  const normalize = (str: string) => 
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

  const siteStockStats = useMemo(() => {
    const stats: any[] = [];
    const stock = data.stock || [];
    
    SITES_DATA.forEach(siteInfo => {
      const siteNameNorm = normalize(siteInfo.name);
      
      // Filtrage selon le mode
      if (viewMode === 'ABIDJAN') {
        const isUrban = abidjanUrbanKeywords.some(kw => siteNameNorm.includes(kw));
        const isExcluded = excludedKeywords.some(kw => siteNameNorm.includes(kw));
        if (!isUrban || isExcluded) return;
      }

      // Calcul du stock pour ce site
      const siteRecords = stock.filter(s => normalize(s.site || "") === siteNameNorm);
      const totalStock = siteRecords.reduce((acc, s) => acc + s.quantite, 0);
      const cgrStock = siteRecords.filter(s => normalize(s.typeProduit || "").includes('CGR')).reduce((acc, s) => acc + s.quantite, 0);

      // Calcul de la consommation réelle basée sur la distribution (CGR)
      const siteDistRecords = (data.distributions?.records || []).filter(r => 
        normalize(r.site || "") === siteNameNorm && 
        normalize(r.typeProduit || "").includes('CGR')
      );
      
      const uniqueDays = new Set(siteDistRecords.map(r => r.date)).size;
      const totalDistributed = siteDistRecords.reduce((acc, r) => acc + r.quantite, 0);
      
      // Si on a des données de distribution, on utilise la moyenne réelle, sinon on garde l'objectif par défaut
      const dailyConsumption = uniqueDays > 0 
        ? totalDistributed / uniqueDays 
        : (siteInfo.annualObjective / 313);

      const autonomy = dailyConsumption > 0 ? cgrStock / dailyConsumption : 0;

      stats.push({
        name: siteInfo.name,
        region: siteInfo.region,
        totalStock,
        cgrStock,
        dailyConsumption: Math.round(dailyConsumption * 10) / 10,
        autonomy: parseFloat(autonomy.toFixed(1)),
        status: autonomy < 3 ? 'CRITIQUE' : autonomy < 7 ? 'ALERTE' : 'OPTIMAL'
      });
    });

    return stats.filter(s => s.name.toUpperCase().includes(searchTerm.toUpperCase()))
                .sort((a, b) => a.autonomy - b.autonomy);
  }, [data, viewMode, searchTerm]);

  const totals = useMemo(() => {
    return siteStockStats.reduce((acc, s) => ({
      totalStock: acc.totalStock + s.totalStock,
      cgrStock: acc.cgrStock + s.cgrStock,
      dailyConsumption: acc.dailyConsumption + s.dailyConsumption
    }), { totalStock: 0, cgrStock: 0, dailyConsumption: 0 });
  }, [siteStockStats]);

  const globalAutonomy = totals.dailyConsumption > 0 ? totals.cgrStock / totals.dailyConsumption : 0;

  return (
    <div className="space-y-8">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900">Synthèse Stock par Site</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-2 flex items-center gap-2">
            <Info size={14} className="text-blue-500" />
            Analyse de l'autonomie des stocks (CGR) basée sur la distribution réelle moyenne
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
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stock Total (CGR)</span>
            <Package className="text-blue-500" size={20} />
          </div>
          <div>
            <div className="text-5xl font-black text-slate-900 tracking-tighter">{totals.cgrStock.toLocaleString()}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">Poches disponibles</div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Autonomie Globale</span>
            <Clock className="text-emerald-500" size={20} />
          </div>
          <div>
            <div className={`text-5xl font-black tracking-tighter ${globalAutonomy < 3 ? 'text-rose-600' : globalAutonomy < 7 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {globalAutonomy.toFixed(1)}
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">Jours de couverture</div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sites en Alerte</span>
            <AlertTriangle className="text-amber-500" size={20} />
          </div>
          <div>
            <div className="text-5xl font-black text-slate-900 tracking-tighter">
              {siteStockStats.filter(s => s.status !== 'OPTIMAL').length}
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">
              Sur {siteStockStats.length} sites analysés
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
                <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Stock CGR</th>
                <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Consommation (J)</th>
                <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Autonomie</th>
                <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Niveau de Sécurité</th>
                <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {siteStockStats.map((site, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">{site.name}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{site.region}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="text-sm font-black text-slate-900">{site.cgrStock}</span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="text-sm font-black text-slate-400">{site.dailyConsumption}</span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="flex flex-col items-center">
                      <span className={`text-sm font-black ${
                        site.status === 'CRITIQUE' ? 'text-rose-600' : 
                        site.status === 'ALERTE' ? 'text-amber-600' : 
                        'text-emerald-600'
                      }`}>
                        {site.autonomy} J
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="w-full max-w-[160px]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase">
                          {site.autonomy >= 10 ? '10+ J' : `${site.autonomy} J`}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((site.autonomy / 10) * 100, 100)}%` }}
                          className={`h-full rounded-full ${
                            site.status === 'OPTIMAL' ? 'bg-emerald-500' : 
                            site.status === 'ALERTE' ? 'bg-amber-500' : 
                            'bg-rose-500'
                          }`}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-center">
                      {site.status === 'OPTIMAL' ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                          <CheckCircle2 size={14} />
                          <span className="text-[9px] font-black uppercase">Optimal</span>
                        </div>
                      ) : site.status === 'ALERTE' ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
                          <AlertTriangle size={14} />
                          <span className="text-[9px] font-black uppercase">Alerte</span>
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
          <h3 className="text-xl font-black uppercase tracking-tighter mb-8">Autonomie par Site (Jours)</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={siteStockStats} layout="vertical" margin={{ left: 40, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 15]} hide />
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
                              <span className="opacity-60">Stock CGR:</span>
                              <span className="font-bold">{payload[0].payload.cgrStock}</span>
                            </p>
                            <p className="text-xs flex justify-between gap-8">
                              <span className="opacity-60">Consommation:</span>
                              <span className="font-bold">{payload[0].payload.dailyConsumption}/j</span>
                            </p>
                            <p className="text-xs flex justify-between gap-8">
                              <span className="opacity-60">Autonomie:</span>
                              <span className={`font-bold ${
                                payload[0].payload.status === 'CRITIQUE' ? 'text-rose-400' : 
                                payload[0].payload.status === 'ALERTE' ? 'text-amber-400' : 
                                'text-emerald-400'
                              }`}>{payload[0].payload.autonomy} J</span>
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="autonomy" radius={[0, 4, 4, 0]} barSize={20}>
                  {siteStockStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={
                      entry.status === 'OPTIMAL' ? '#10b981' : 
                      entry.status === 'ALERTE' ? '#f59e0b' : 
                      '#f43f5e'
                    } />
                  ))}
                </Bar>
                <ReferenceLine x={3} stroke="#f43f5e" strokeDasharray="3 3" label={{ position: 'top', value: 'Critique', fill: '#f43f5e', fontSize: 8, fontWeight: 900 }} />
                <ReferenceLine x={7} stroke="#f59e0b" strokeDasharray="3 3" label={{ position: 'top', value: 'Alerte', fill: '#f59e0b', fontSize: 8, fontWeight: 900 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl text-white">
          <h3 className="text-xl font-black uppercase tracking-tighter mb-8">Analyse des Stocks</h3>
          <div className="space-y-6">
            <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
              <h4 className="text-xs font-black uppercase tracking-widest text-blue-400 mb-4">Recommandation Logistique</h4>
              <p className="text-sm text-slate-300 leading-relaxed">
                {viewMode === 'ABIDJAN' 
                  ? "Pour Abidjan Urbain, l'autonomie moyenne est de " + globalAutonomy.toFixed(1) + " jours. Les sites comme Treichville et Cocody doivent maintenir un stock tampon plus important pour absorber les pics de demande des CHU."
                  : "Au niveau National, la disparité d'autonomie entre les régions nécessite une régulation active. Les sites en zone 'Critique' doivent être réapprovisionnés prioritairement par les sites en zone 'Optimal' via le réseau de distribution."
                }
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-rose-500/10 rounded-3xl border border-rose-500/20">
                <div className="text-2xl font-black text-rose-400">
                  {siteStockStats.filter(s => s.status === 'CRITIQUE').length}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-rose-500/60 mt-1">Sites Critiques</div>
              </div>
              <div className="p-6 bg-emerald-500/10 rounded-3xl border border-emerald-500/20">
                <div className="text-2xl font-black text-emerald-400">
                  {siteStockStats.filter(s => s.status === 'OPTIMAL').length}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-500/60 mt-1">Sites Optimaux</div>
              </div>
            </div>

            <div className="p-8 bg-emerald-600 rounded-[2rem] shadow-lg shadow-emerald-600/20">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <ShieldCheck size={20} className="text-white" />
                </div>
                <div className="text-lg font-black uppercase tracking-tighter">Sécurité Sanitaire</div>
              </div>
              <p className="text-xs text-emerald-100 font-medium leading-relaxed mb-6">
                L'objectif est d'atteindre une autonomie minimale de 7 jours sur l'ensemble des sites urbains d'Abidjan pour garantir une réponse immédiate aux urgences vitales.
              </p>
              <button className="w-full py-4 bg-white text-emerald-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-50 transition-colors">
                Planifier Réapprovisionnement
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
