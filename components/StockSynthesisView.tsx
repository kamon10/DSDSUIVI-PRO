
import React, { useMemo, useState } from 'react';
import { DashboardData, User } from '../types.ts';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, ComposedChart, Line
} from 'recharts';
import { 
  ShieldCheck, AlertTriangle, TrendingUp, Package, 
  Activity, Info, CheckCircle2, AlertCircle, Clock, Layout
} from 'lucide-react';
import { GROUP_COLORS, STOCK_FORECASTS } from '../constants.tsx';
import { StockSynthesisTableView } from './StockSynthesisTableView';

interface StockSynthesisViewProps {
  data: DashboardData;
  user?: User | null;
}

const SANG_GROUPS = ["O+", "A+", "B+", "AB+", "O-", "A-", "B-", "AB-"];

export const StockSynthesisView: React.FC<StockSynthesisViewProps> = ({ data, user }) => {
  const [viewType, setViewType] = useState<'charts' | 'table'>('charts');
  const stock = data.stock || [];

  const synthesisData = useMemo(() => {
    const national: Record<string, number> = {};
    const abidjan: Record<string, number> = {};

    SANG_GROUPS.forEach(g => {
      national[g] = 0;
      abidjan[g] = 0;
    });

    const normalize = (str: string) => 
      str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

    const excludedKeywords = ["BONOUA", "ABOISSO", "ADZOPE", "AGBOVILLE", "DABOU"];

    // Calcul des prévisions basées sur la distribution réelle (CGR)
    const distRecords = (data.distributions?.records || []).filter(r => normalize(r.typeProduit || "").includes('CGR'));
    const uniqueDays = new Set(distRecords.map(r => r.date)).size;
    
    const dynamicForecasts: Record<string, Record<string, number>> = {
      "NATIONALE": { "TOTAL": 0 },
      "ABIDJAN": { "TOTAL": 0 }
    };
    SANG_GROUPS.forEach(g => {
      dynamicForecasts["NATIONALE"][g] = 0;
      dynamicForecasts["ABIDJAN"][g] = 0;
    });

    distRecords.forEach(r => {
      const g = (r.groupeSanguin || "").replace(/\s/g, "").toUpperCase();
      if (!SANG_GROUPS.includes(g)) return;

      const site = normalize(r.site || "");
      const pres = normalize(r.region || ""); // Dans les records de distri, region est souvent le PRES

      dynamicForecasts["NATIONALE"][g] += r.quantite;
      dynamicForecasts["NATIONALE"]["TOTAL"] += r.quantite;

      const isAbidjanPres = pres.includes('ABIDJAN');
      const isExcluded = excludedKeywords.some(kw => site.includes(kw));
      if (isAbidjanPres && !isExcluded) {
        dynamicForecasts["ABIDJAN"][g] += r.quantite;
        dynamicForecasts["ABIDJAN"]["TOTAL"] += r.quantite;
      }
    });

    // Moyenne journalière
    if (uniqueDays > 0) {
      SANG_GROUPS.forEach(g => {
        dynamicForecasts["NATIONALE"][g] /= uniqueDays;
        dynamicForecasts["ABIDJAN"][g] /= uniqueDays;
      });
      dynamicForecasts["NATIONALE"]["TOTAL"] /= uniqueDays;
      dynamicForecasts["ABIDJAN"]["TOTAL"] /= uniqueDays;
    } else {
      // Fallback sur les constantes si aucune donnée de distribution
      SANG_GROUPS.forEach(g => {
        dynamicForecasts["NATIONALE"][g] = STOCK_FORECASTS["NATIONALE"][g] || 0;
        dynamicForecasts["ABIDJAN"][g] = STOCK_FORECASTS["ABIDJAN"][g] || 0;
      });
      dynamicForecasts["NATIONALE"]["TOTAL"] = STOCK_FORECASTS["NATIONALE"]["TOTAL"] || 0;
      dynamicForecasts["ABIDJAN"]["TOTAL"] = STOCK_FORECASTS["ABIDJAN"]["TOTAL"] || 0;
    }

    stock.forEach(s => {
      const typeProduit = normalize(s.typeProduit || "");
      const pres = normalize(s.pres || "");
      const site = normalize(s.site || "");
      const g = (s.groupeSanguin || "").replace(/\s/g, "").toUpperCase();

      if (typeProduit.includes('CGR')) {
        if (national[g] !== undefined) national[g] += s.quantite;
        
        const isAbidjanPres = pres.includes('ABIDJAN');
        const isExcluded = excludedKeywords.some(kw => site.includes(kw));
        
        if (isAbidjanPres && !isExcluded && abidjan[g] !== undefined) {
          abidjan[g] += s.quantite;
        }
      }
    });

    const formatData = (source: Record<string, number>, forecastKey: string) => {
      const forecasts = dynamicForecasts[forecastKey];
      return SANG_GROUPS.map(g => {
        const current = source[g];
        const dailyForecast = forecasts[g] || 0;
        const tenDayForecast = dailyForecast * 10;
        const autonomy = dailyForecast > 0 ? current / dailyForecast : 0;
        
        return {
          name: g,
          stock: current,
          prevision: tenDayForecast,
          autonomy: parseFloat(autonomy.toFixed(1)),
          daily: parseFloat(dailyForecast.toFixed(1)),
          status: autonomy < 3 ? 'CRITIQUE' : autonomy < 7 ? 'ALERTE' : 'OPTIMAL'
        };
      });
    };

    return {
      national: formatData(national, "NATIONALE"),
      abidjan: formatData(abidjan, "ABIDJAN"),
      totals: {
        national: Object.values(national).reduce((a, b) => a + b, 0),
        abidjan: Object.values(abidjan).reduce((a, b) => a + b, 0),
        forecastNational: dynamicForecasts["NATIONALE"]["TOTAL"],
        forecastAbidjan: dynamicForecasts["ABIDJAN"]["TOTAL"]
      }
    };
  }, [stock, data.distributions]);

  const renderSection = (title: string, chartData: any[], total: number, forecastKey: string) => {
    const totalForecast = forecastKey === "ABIDJAN" ? synthesisData.totals.forecastAbidjan : synthesisData.totals.forecastNational;
    const globalAutonomy = totalForecast > 0 ? total / totalForecast : 0;
    const isAbidjan = forecastKey === "ABIDJAN";

    return (
      <div className="bg-white rounded-[3rem] p-8 lg:p-12 shadow-2xl border border-slate-100 space-y-10">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${isAbidjan ? 'bg-orange-600' : 'bg-blue-600'}`}>
              <ShieldCheck size={32} className="text-white" />
            </div>
            <div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{title}</h3>
              <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest mt-1">
                {isAbidjan 
                  ? "Périmètre : Treichville, Cocody, Yopougon, Abobo, Port-Bouët, Anyama, Bingerville (Exclut : Bonoua, Aboisso, Adzopé, Agboville, Dabou)"
                  : "Analyse comparative Stock vs Prévisions (10 Jours)"}
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-slate-50 px-8 py-4 rounded-2xl border border-slate-100 flex flex-col items-center">
              <span className="text-[12px] font-black text-slate-400 uppercase mb-1">Stock Total CGR</span>
              <span className="text-2xl font-black text-slate-900">{total.toLocaleString()}</span>
            </div>
            <div className={`px-8 py-4 rounded-2xl border flex flex-col items-center shadow-sm ${globalAutonomy < 3 ? 'bg-rose-50 border-rose-100 text-rose-600' : globalAutonomy < 7 ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
              <span className="text-[12px] font-black uppercase mb-1 opacity-60">Autonomie Globale</span>
              <span className="text-2xl font-black">{globalAutonomy.toFixed(1)} Jours</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 h-[450px] bg-slate-50/50 rounded-[2.5rem] p-8 border border-slate-50">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 900, fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 900, fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', padding: '1rem', fontWeight: '900' }}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }} />
                <Bar dataKey="stock" name="Stock Actuel" radius={[10, 10, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={GROUP_COLORS[entry.name] || '#3b82f6'} />
                  ))}
                </Bar>
                <Line type="monotone" dataKey="prevision" name="Objectif 10 Jours" stroke="#ef4444" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4, fill: '#ef4444' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-4 overflow-y-auto max-h-[450px] pr-2 custom-scrollbar">
            {chartData.map((item, idx) => (
              <div key={idx} className={`p-5 rounded-2xl border transition-all flex items-center justify-between ${item.status === 'CRITIQUE' ? 'bg-rose-50 border-rose-100' : item.status === 'ALERTE' ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'}`}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black shadow-sm" style={{ backgroundColor: GROUP_COLORS[item.name] }}>
                    {item.name}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-slate-900">{item.stock}</span>
                      <span className="text-[11px] font-bold text-slate-400 uppercase">Poches</span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Prévision: {item.daily}/j</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-black ${item.status === 'CRITIQUE' ? 'text-rose-600' : item.status === 'ALERTE' ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {item.autonomy} J
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-tighter opacity-60">Autonomie</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-24">
      <div className="relative overflow-hidden rounded-[4rem] p-12 lg:p-16 text-white shadow-3xl bg-slate-900">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/20 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-10">
            <div className="w-24 h-24 rounded-[2.5rem] bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl">
              <TrendingUp size={48} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-5xl lg:text-7xl font-[950] uppercase tracking-tighter leading-none mb-4">Synthèse Stock</h2>
              <div className="flex items-center gap-6">
                <p className="text-white/40 font-black uppercase tracking-[0.5em] text-[12px] flex items-center gap-3">
                  <Clock size={16} /> Actualisé : {new Date().toLocaleTimeString()}
                </p>
                <div className="h-1 w-1 rounded-full bg-white/20"></div>
                <p className="text-white/40 font-black uppercase tracking-[0.5em] text-[12px] flex items-center gap-3">
                  <Package size={16} /> Focus : Globules Rouges (CGR)
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-6">
            <div className="flex bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/10">
              <button 
                onClick={() => setViewType('charts')}
                className={`px-6 py-2 rounded-xl text-[12px] font-black uppercase transition-all flex items-center gap-2 ${viewType === 'charts' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/60 hover:text-white'}`}
              >
                <TrendingUp size={14} /> Graphiques
              </button>
              <button 
                onClick={() => setViewType('table')}
                className={`px-6 py-2 rounded-xl text-[12px] font-black uppercase transition-all flex items-center gap-2 ${viewType === 'table' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/60 hover:text-white'}`}
              >
                <Layout size={14} /> Tableau Synthèse
              </button>
            </div>
            <div className="flex gap-6">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-[2rem] flex flex-col items-center min-w-[150px]">
                <span className="text-[11px] font-black uppercase tracking-widest text-white/40 mb-1">Total National</span>
                <span className="text-3xl font-black text-white tracking-tighter">{synthesisData.totals.national.toLocaleString()}</span>
              </div>
              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-[2rem] flex flex-col items-center min-w-[150px]">
                <span className="text-[11px] font-black uppercase tracking-widest text-white/40 mb-1">Total Abidjan</span>
                <span className="text-3xl font-black text-orange-400 tracking-tighter">{synthesisData.totals.abidjan.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {viewType === 'charts' ? (
        <>
          <div className="grid grid-cols-1 gap-12">
            {renderSection("Vision Nationale", synthesisData.national, synthesisData.totals.national, "NATIONALE")}
            {renderSection("Vision Abidjan", synthesisData.abidjan, synthesisData.totals.abidjan, "ABIDJAN")}
          </div>

          <div className="bg-slate-50 rounded-[3rem] p-10 border border-slate-200">
            <div className="flex items-center gap-4 mb-8">
              <Info size={24} className="text-slate-400" />
              <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">Méthodologie de Calcul</h4>
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
        </>
      ) : (
        <StockSynthesisTableView data={data} />
      )}
    </div>
  );
};
