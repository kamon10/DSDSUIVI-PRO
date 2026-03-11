
import React, { useMemo, useState } from 'react';
import { DashboardData, User, StockRecord } from '../types.ts';
import { 
  TrendingUp, AlertTriangle, ShieldCheck, Activity, 
  Zap, Package, Info, ArrowRight, BarChart3, 
  PieChart, LayoutGrid, Clock, CheckCircle2,
  ChevronRight, AlertCircle, RefreshCw, Layers
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart as RePieChart, Pie, Legend
} from 'recharts';
import { GROUP_COLORS, PRODUCT_COLORS, STOCK_FORECASTS } from '../constants.tsx';
import { StockAlert } from './StockAlert.tsx';
import { motion } from 'motion/react';

interface StockAnalysisFocusViewProps {
  data: DashboardData;
  user?: User | null;
}

const SANG_GROUPS = ["O+", "A+", "B+", "AB+", "O-", "A-", "B-", "AB-"];
const PRODUCT_TYPES = ["CGR ADULTE", "CGR PEDIATRIQUE", "CGR NOURRISSON", "CGR", "CONCENTRE DE PLAQUETTES", "PLASMA A USAGE THERAPEUTIQUE", "AUTRES"];

export const StockAnalysisFocusView: React.FC<StockAnalysisFocusViewProps> = ({ data, user }) => {
  const stock = data.stock || [];
  const [selectedPres, setSelectedPres] = useState<string>("NATIONAL");

  const presList = useMemo(() => {
    const list = Array.from(new Set(stock.map(s => s.pres))).sort();
    return ["NATIONAL", ...list];
  }, [stock]);

  const analysis = useMemo(() => {
    const filteredStock = selectedPres === "NATIONAL" 
      ? stock 
      : stock.filter(s => s.pres === selectedPres);

    const validStock = filteredStock.filter(s => {
      const g = s.groupeSanguin.replace(/\s/g, "").toUpperCase();
      return SANG_GROUPS.includes(g);
    });

    const total = validStock.reduce((acc, s) => acc + s.quantite, 0);
    const byGroup = SANG_GROUPS.reduce((acc, g) => ({ ...acc, [g]: 0 }), {} as Record<string, number>);
    const byProduct = PRODUCT_TYPES.reduce((acc, p) => ({ ...acc, [p]: 0 }), {} as Record<string, number>);
    
    const matrix: Record<string, Record<string, number>> = {};
    PRODUCT_TYPES.forEach(p => {
      matrix[p] = {};
      SANG_GROUPS.forEach(g => {
        matrix[p][g] = 0;
      });
    });

    validStock.forEach(s => {
      const g = s.groupeSanguin.replace(/\s/g, "").toUpperCase();
      const p = s.typeProduit.toUpperCase();
      
      if (byGroup[g] !== undefined) byGroup[g] += s.quantite;
      
      const matchedProduct = PRODUCT_TYPES.find(pt => {
        if (pt === "AUTRES") return false;
        const isCgr = p.includes("CGR") || p.includes("CONCENTRE DE GLOBULES") || p.includes("CONCENTRE DE GLOBULE");
        if (pt === "CGR ADULTE") return isCgr && (p.includes("ADULTE") || p.includes("ADULT") || p.includes(" AD"));
        if (pt === "CGR PEDIATRIQUE") return isCgr && (p.includes("PEDIATRIQUE") || p.includes("PEDIATRIC") || p.includes(" PED"));
        if (pt === "CGR NOURRISSON") return isCgr && (p.includes("NOURRISSON") || p.includes("NOURRISON") || p.includes(" NOUR"));
        return p.includes(pt);
      }) || "AUTRES";

      if (matchedProduct) {
        byProduct[matchedProduct] += s.quantite;
        if (matrix[matchedProduct][g] !== undefined) {
          matrix[matchedProduct][g] += s.quantite;
        }
      }
    });

    // Autonomy calculation (simplified for focus)
    const distRecords = data.distributions?.records || [];
    const uniqueDays = new Set(distRecords.map(r => r.date)).size || 1;
    const dailyConsumption: Record<string, number> = {};
    
    SANG_GROUPS.forEach(g => {
      const gDist = distRecords.filter(r => r.groupeSanguin.replace(/\s/g, "").toUpperCase() === g && r.typeProduit.toUpperCase().includes('CGR'));
      const totalDist = gDist.reduce((acc, r) => acc + r.quantite, 0);
      dailyConsumption[g] = totalDist / uniqueDays;
      
      // Fallback to forecasts if no distribution data
      if (dailyConsumption[g] === 0) {
        dailyConsumption[g] = (STOCK_FORECASTS["NATIONALE"][g] || 0);
      }
    });

    const autonomyData = SANG_GROUPS.map(g => {
      const currentStock = validStock.filter(s => s.groupeSanguin.replace(/\s/g, "").toUpperCase() === g && s.typeProduit.toUpperCase().includes('CGR')).reduce((acc, s) => acc + s.quantite, 0);
      const daily = dailyConsumption[g];
      const days = daily > 0 ? currentStock / daily : 0;
      return {
        group: g,
        days: parseFloat(days.toFixed(1)),
        stock: currentStock,
        status: days < 3 ? 'CRITIQUE' : days < 7 ? 'ALERTE' : 'OPTIMAL'
      };
    });

    const healthScore = Math.min(100, (autonomyData.reduce((acc, d) => acc + Math.min(10, d.days), 0) / (SANG_GROUPS.length * 7)) * 100);

    return { total, byGroup, byProduct, matrix, autonomyData, healthScore };
  }, [stock, selectedPres, data.distributions]);

  const recommendations = useMemo(() => {
    const recs: string[] = [];
    const criticalGroups = analysis.autonomyData.filter(d => d.status === 'CRITIQUE');
    
    if (criticalGroups.length > 0) {
      recs.push(`Urgence : Les groupes ${criticalGroups.map(g => g.group).join(', ')} sont en seuil critique (< 3 jours).`);
    }

    const oNeg = analysis.autonomyData.find(d => d.group === 'O-');
    if (oNeg && oNeg.days < 5) {
      recs.push("Priorité O- : Le stock de sécurité universel est bas. Intensifier les collectes ciblées.");
    }

    if (analysis.healthScore < 60) {
      recs.push("Alerte Globale : Le niveau de réserve national est préoccupant. Envisager un plan d'urgence.");
    } else if (analysis.healthScore > 85) {
      recs.push("Stabilité : Les réserves sont globalement satisfaisantes.");
    }

    return recs;
  }, [analysis]);

  return (
    <div className="space-y-8 pb-24 animate-in fade-in duration-700">
      <StockAlert data={data} />
      {/* Header Focus */}
      <div className="relative overflow-hidden rounded-[3.5rem] p-10 lg:p-14 text-white shadow-3xl bg-slate-900">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full -mr-40 -mt-40"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-500/10 blur-[100px] rounded-full -ml-20 -mb-20"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-8">
            <div className="w-20 h-20 rounded-[2rem] bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl">
              <BarChart3 size={40} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-4xl lg:text-6xl font-[950] uppercase tracking-tighter leading-none mb-3">Focus Analyse Stock</h2>
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
                  {selectedPres}
                </span>
                <div className="h-1 w-1 rounded-full bg-white/30"></div>
                <p className="text-white/40 font-black uppercase tracking-[0.3em] text-[10px]">
                  Analyse Stratégique & Prévisionnelle
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="relative">
                <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                <select 
                  value={selectedPres} 
                  onChange={(e) => setSelectedPres(e.target.value)}
                  className="pl-12 pr-8 py-4 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl text-xs font-black uppercase outline-none cursor-pointer hover:bg-white/20 transition-all appearance-none"
                >
                  {presList.map(p => <option key={p} value={p} className="text-slate-900">{p}</option>)}
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 rotate-90" size={16} />
             </div>
             <button className="p-4 bg-blue-600 hover:bg-blue-500 rounded-2xl shadow-xl shadow-blue-900/20 transition-all active:scale-95">
                <RefreshCw size={20} />
             </button>
          </div>
        </div>
      </div>

      {/* Bento Grid Analyse */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* KPI Santé Globale */}
        <div className="lg:col-span-1 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <ShieldCheck size={120} className="text-emerald-500" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 block mb-2">Index Santé Stock</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-6xl font-black tracking-tighter ${analysis.healthScore > 80 ? 'text-emerald-600' : analysis.healthScore > 50 ? 'text-amber-500' : 'text-rose-600'}`}>
                {Math.round(analysis.healthScore)}%
              </span>
            </div>
          </div>
          <div className="mt-8 space-y-4">
             <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${analysis.healthScore}%` }}
                  className={`h-full rounded-full ${analysis.healthScore > 80 ? 'bg-emerald-500' : analysis.healthScore > 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                />
             </div>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                {analysis.healthScore > 80 ? 'Niveau de réserve optimal' : analysis.healthScore > 50 ? 'Vigilance requise sur certains groupes' : 'Alerte : Réserve critique'}
             </p>
          </div>
        </div>

        {/* Recommandations AI */}
        <div className="lg:col-span-2 bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
           <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                 <Zap size={20} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tighter">Insights & Actions</h3>
           </div>
           <div className="space-y-4">
              {recommendations.map((rec, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors"
                >
                   <div className="mt-1"><ChevronRight size={16} className="text-blue-400" /></div>
                   <p className="text-sm font-bold leading-relaxed text-white/80">{rec}</p>
                </motion.div>
              ))}
              {recommendations.length === 0 && (
                <p className="text-sm font-bold text-white/40 italic">Aucune recommandation particulière pour le moment.</p>
              )}
           </div>
        </div>

        {/* Volume Total */}
        <div className="lg:col-span-1 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl flex flex-col justify-between">
           <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 block mb-2">Volume Consolidé</span>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-slate-900 tracking-tighter">{analysis.total.toLocaleString()}</span>
                <span className="text-xs font-bold text-slate-300 uppercase">Poches</span>
              </div>
           </div>
           <div className="mt-8 pt-8 border-t border-slate-50">
              <div className="flex justify-between items-center mb-2">
                 <span className="text-[10px] font-black uppercase text-slate-400">Mix CGR</span>
                 <span className="text-[10px] font-black text-slate-900">{Math.round((analysis.byProduct["CGR"] / (analysis.total || 1)) * 100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                 <div className="h-full bg-rose-500" style={{ width: `${(analysis.byProduct["CGR"] / (analysis.total || 1)) * 100}%` }} />
              </div>
           </div>
        </div>
      </div>

      {/* Analyse par Groupe & Autonomie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[3rem] p-10 border border-slate-100 shadow-2xl">
           <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-5">
                 <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <TrendingUp size={28} />
                 </div>
                 <div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Autonomie par Groupe</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Projection basée sur la consommation réelle</p>
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {analysis.autonomyData.map((item, i) => (
                <div key={i} className={`p-6 rounded-[2rem] border transition-all hover:shadow-xl group ${item.status === 'CRITIQUE' ? 'bg-rose-50 border-rose-100' : item.status === 'ALERTE' ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'}`}>
                   <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black shadow-lg" style={{ backgroundColor: GROUP_COLORS[item.group] }}>
                         {item.group}
                      </div>
                      {item.status === 'CRITIQUE' && <AlertTriangle size={16} className="text-rose-500 animate-pulse" />}
                   </div>
                   <div className="space-y-1">
                      <p className={`text-3xl font-black tracking-tighter ${item.status === 'CRITIQUE' ? 'text-rose-600' : item.status === 'ALERTE' ? 'text-amber-600' : 'text-emerald-600'}`}>
                         {item.days} J
                      </p>
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Autonomie</p>
                   </div>
                   <div className="mt-4 pt-4 border-t border-black/5">
                      <p className="text-[10px] font-black text-slate-900">{item.stock} <span className="opacity-40">Poches</span></p>
                   </div>
                </div>
              ))}
           </div>
        </div>

        <div className="lg:col-span-1 bg-white rounded-[3rem] p-10 border border-slate-100 shadow-2xl flex flex-col">
           <div className="flex items-center gap-5 mb-10">
              <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
                 <PieChart size={28} />
              </div>
              <div>
                 <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Mix Produit</h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Répartition par type</p>
              </div>
           </div>
           
           <div className="flex-1 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                 <RePieChart>
                    <Pie
                       data={Object.entries(analysis.byProduct)
                         .filter(([name]) => name !== "CGR" && name !== "AUTRES")
                         .map(([name, value]) => ({ name, value }))}
                       cx="50%"
                       cy="50%"
                       innerRadius="60%"
                       outerRadius="90%"
                       paddingAngle={5}
                       dataKey="value"
                       stroke="none"
                       cornerRadius={10}
                    >
                       {Object.entries(analysis.byProduct).map(([name], index) => (
                          <Cell key={`cell-${index}`} fill={PRODUCT_COLORS[name] || '#cbd5e1'} />
                       ))}
                    </Pie>
                    <Tooltip 
                       contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', padding: '1rem', fontWeight: '900' }}
                    />
                 </RePieChart>
              </ResponsiveContainer>
           </div>

           <div className="mt-8 space-y-3">
              {Object.entries(analysis.byProduct)
                .filter(([name]) => name !== "CGR" && name !== "AUTRES")
                .sort((a,b) => b[1] - a[1])
                .slice(0, 4)
                .map(([name, value], i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                   <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PRODUCT_COLORS[name] }} />
                      <span className="text-[10px] font-black uppercase text-slate-600 truncate max-w-[150px]">{name}</span>
                   </div>
                   <span className="text-[10px] font-black text-slate-900">{value.toLocaleString()}</span>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Matrice Groupe / Produit */}
      <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-2xl overflow-hidden">
         <div className="flex items-center gap-5 mb-10">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
               <LayoutGrid size={28} />
            </div>
            <div>
               <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Matrice Groupe / Produit</h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vue granulaire de l'inventaire</p>
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="border-b border-slate-100">
                     <th className="py-6 text-[11px] font-black uppercase tracking-widest text-slate-400">Type Produit</th>
                     {SANG_GROUPS.map(g => (
                        <th key={g} className="py-6 text-center text-[11px] font-black uppercase tracking-widest text-slate-400">{g}</th>
                     ))}
                     <th className="py-6 text-right text-[11px] font-black uppercase tracking-widest text-slate-400">Total</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {PRODUCT_TYPES.filter(p => p !== "CGR" && p !== "AUTRES").map(p => (
                    <tr key={p} className="group hover:bg-slate-50/50 transition-colors">
                       <td className="py-6">
                          <div className="flex items-center gap-3">
                             <div className="w-2 h-8 rounded-full" style={{ backgroundColor: PRODUCT_COLORS[p] || '#cbd5e1' }} />
                             <span className="text-[12px] font-black uppercase text-slate-800">{p}</span>
                          </div>
                       </td>
                       {SANG_GROUPS.map(g => {
                          const val = analysis.matrix[p][g];
                          return (
                            <td key={g} className={`py-6 text-center text-[13px] ${val > 0 ? 'font-black text-slate-900' : 'text-slate-200'}`}>
                               {val > 0 ? val.toLocaleString() : '-'}
                            </td>
                          );
                       })}
                       <td className="py-6 text-right text-[13px] font-black text-slate-900">
                          {analysis.byProduct[p].toLocaleString()}
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};
