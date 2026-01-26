
import React, { useState, useMemo, useEffect } from 'react';
import { DashboardData } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend, BarChart, Bar } from 'recharts';
import { TrendingUp, Calendar, Building2, Truck, Award, Target, Zap, Brain, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { getGeminiInsights } from '../services/geminiService';

const COLORS_MIX = ['#3b82f6', '#f97316'];

export const VisualDashboard: React.FC<{ data: DashboardData }> = ({ data }) => {
  const [insights, setInsights] = useState<string>("Analyse en cours par l'IA...");
  const [loadingInsights, setLoadingInsights] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const text = await getGeminiInsights(data);
        setInsights(text);
      } catch (err) {
        setInsights("L'analyse stratégique est temporairement indisponible.");
      } finally {
        setLoadingInsights(false);
      }
    };
    fetchInsights();
  }, [data]);

  // Calculs stratégiques
  const forecastAnnual = useMemo(() => {
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const currentRate = data.annual.realized / dayOfYear;
    return Math.round(currentRate * 365);
  }, [data.annual]);

  const performanceScore = Math.round((data.monthly.percentage + data.annual.percentage) / 2);

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      
      {/* SECTION 1: THE PULSE (Executive Header) */}
      <div className="bg-slate-900 rounded-[3.5rem] p-10 text-white shadow-3xl relative overflow-hidden border border-white/5">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600/20 blur-[120px] rounded-full -mr-64 -mt-64"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-600/10 blur-[100px] rounded-full -ml-32 -mb-32"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-12">
          <div className="flex items-center gap-8">
            <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-700 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-red-900/50">
              <Zap size={48} className="text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">Status National</h1>
              <p className="text-white/40 font-bold uppercase tracking-[0.3em] mt-2 text-xs">Tableau de Bord Stratégique v2.5</p>
              <div className="flex items-center gap-4 mt-4">
                <div className="px-4 py-1.5 bg-green-500/20 border border-green-500/30 rounded-full text-green-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div> Système Nominal
                </div>
                <div className="text-white/60 text-xs font-bold uppercase tracking-widest italic">MAJ : {data.date}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-10 bg-white/5 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/10">
            <div className="text-center">
              <p className="text-[10px] font-black text-white/30 uppercase mb-2 tracking-widest">Score Performance</p>
              <p className="text-5xl font-black text-white">{performanceScore}<span className="text-xl text-white/30">%</span></p>
            </div>
            <div className="w-px h-16 bg-white/10 hidden md:block"></div>
            <div className="text-center">
              <p className="text-[10px] font-black text-white/30 uppercase mb-2 tracking-widest">Projection Annuelle</p>
              <p className="text-5xl font-black text-red-500">{forecastAnnual.toLocaleString()}</p>
              <p className="text-[9px] font-bold text-white/20 uppercase mt-1 tracking-tighter">vs Obj: {data.annual.objective.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: AI INSIGHTS & ANALYTICS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* IA Strategy Box */}
        <div className="lg:col-span-2 bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Brain size={120} className="text-slate-900" />
          </div>
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
              <Brain size={24} />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">Intelligence Stratégique (Gemini)</h3>
          </div>
          
          <div className="flex-1 bg-slate-50 rounded-[2rem] p-8 border border-slate-100 relative">
            {loadingInsights ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Analyse multidimensionnelle en cours...</p>
              </div>
            ) : (
              <p className="text-slate-700 font-medium leading-relaxed italic text-lg">"{insights}"</p>
            )}
          </div>
          <div className="mt-6 flex items-center gap-2">
            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Analyse temps réel basée sur les flux Google Sheets</p>
          </div>
        </div>

        {/* Mix Activité (Fixe vs Mobile) */}
        <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 flex flex-col">
          <div className="flex items-center gap-4 mb-8">
             <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center">
               <Activity size={24} />
             </div>
             <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">Mix d'Activité</h3>
          </div>
          <div className="h-64 relative">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={[
                     { name: 'Fixe', value: data.monthly.fixed },
                     { name: 'Mobile', value: data.monthly.mobile }
                   ]}
                   innerRadius={70}
                   outerRadius={95}
                   paddingAngle={8}
                   dataKey="value"
                   startAngle={90}
                   endAngle={450}
                 >
                   {COLORS_MIX.map((color, index) => <Cell key={`cell-${index}`} fill={color} />)}
                 </Pie>
                 <Tooltip />
               </PieChart>
             </ResponsiveContainer>
             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-[10px] font-black text-slate-400 uppercase">Ratio M/F</p>
                <p className="text-3xl font-black text-slate-800">
                  {Math.round((data.monthly.mobile / (data.monthly.fixed || 1)) * 100)}%
                </p>
             </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-xs font-black text-slate-600 uppercase">Fixe: {data.monthly.fixed.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-xs font-black text-slate-600 uppercase">Mobile: {data.monthly.mobile.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: KEY PERFORMANCE METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* KPI: Journalier */}
        <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 hover:-translate-y-2 transition-all group">
          <div className="flex justify-between items-start mb-6">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-inner">
              <Calendar size={28} />
            </div>
            <div className="flex items-center gap-1 text-green-500 font-black">
              <ArrowUpRight size={18} />
              <span className="text-xs">+4%</span>
            </div>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Activité Journalière</p>
          <div className="flex items-baseline gap-2 mb-4">
             <span className="text-4xl font-black text-slate-800">{data.daily.realized}</span>
             <span className="text-sm font-bold text-slate-300">/ {data.daily.objective}</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
             <div className="h-full bg-blue-600" style={{ width: `${Math.min(data.daily.percentage, 100)}%` }}></div>
          </div>
        </div>

        {/* KPI: Mensuel */}
        <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 hover:-translate-y-2 transition-all group">
          <div className="flex justify-between items-start mb-6">
            <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-colors shadow-inner">
              <TrendingUp size={28} />
            </div>
            <div className="flex items-center gap-1 text-red-500 font-black">
              <ArrowDownRight size={18} />
              <span className="text-xs">-2%</span>
            </div>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Progression Mensuelle</p>
          <div className="flex items-baseline gap-2 mb-4">
             <span className="text-4xl font-black text-slate-800">{data.monthly.realized.toLocaleString()}</span>
             <span className="text-sm font-bold text-slate-300">/ {data.monthly.objective.toLocaleString()}</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
             <div className="h-full bg-orange-500" style={{ width: `${Math.min(data.monthly.percentage, 100)}%` }}></div>
          </div>
        </div>

        {/* KPI: Annuel */}
        <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 hover:-translate-y-2 transition-all group">
          <div className="flex justify-between items-start mb-6">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors shadow-inner">
              <Award size={28} />
            </div>
            <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Cible 2026</div>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Objectif Annuel</p>
          <div className="flex items-baseline gap-2 mb-4">
             <span className="text-4xl font-black text-slate-800">{data.annual.realized.toLocaleString()}</span>
             <span className="text-sm font-bold text-slate-300">/ {data.annual.objective.toLocaleString()}</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
             <div className="h-full bg-red-600" style={{ width: `${Math.min(data.annual.percentage, 100)}%` }}></div>
          </div>
        </div>
      </div>

      {/* SECTION 4: GEOGRAPHICAL BREAKDOWN */}
      <div className="bg-white rounded-[3.5rem] p-12 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between mb-12">
           <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-slate-900 text-white rounded-[1.75rem] flex items-center justify-center">
                <Target size={32} />
              </div>
              <div>
                <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-800">Matrice de Performance Régionale</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Analyse comparative des PRES</p>
              </div>
           </div>
        </div>

        <div className="h-[400px]">
           <ResponsiveContainer width="100%" height="100%">
             <BarChart data={data.regions.map(r => ({
               name: r.name.replace('PRES ', ''),
               realized: r.sites.reduce((acc, s) => acc + s.totalMois, 0),
               objective: r.sites.reduce((acc, s) => acc + s.objMensuel, 0)
             }))} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
               <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} tick={{fontSize: 10, fontWeight: 900}} />
               <YAxis tick={{fontSize: 10, fontWeight: 900}} />
               <Tooltip cursor={{fill: '#f1f5f9'}} />
               <Bar dataKey="realized" fill="#ef4444" radius={[6, 6, 0, 0]} name="Réalisé" />
               <Bar dataKey="objective" fill="#f1f5f9" radius={[6, 6, 0, 0]} name="Objectif" />
             </BarChart>
           </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
