import React, { useMemo, useState, useRef } from 'react';
import { DashboardData, AppTab, DistributionRecord } from '../types';
import { Activity, MapPin, ChevronRight, PieChart, Users, Heart, TrendingUp, FileImage, FileText, Loader2, Target, AlertCircle, CheckCircle2, Truck, Package } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { COLORS } from '../constants';

interface SummaryViewProps {
  data: DashboardData;
  setActiveTab: (tab: AppTab) => void;
}

export const SummaryView: React.FC<SummaryViewProps> = ({ data, setActiveTab }) => {
  const [viewMode, setViewMode] = useState<'donations' | 'distribution'>('donations');
  const [exporting, setExporting] = useState<'image' | 'pdf' | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => {
    // --- STATS DONATIONS ---
    const totalMois = data.monthly.realized || 1;
    const objectiveMois = data.monthly.objective;
    const pochesRestantes = Math.max(0, objectiveMois - data.monthly.realized);
    const isReached = pochesRestantes === 0;
    
    const fixePerc = (data.monthly.fixed / totalMois) * 100;
    const mobilePerc = (data.monthly.mobile / totalMois) * 100;
    
    const regionsPerf = data.regions.map(r => {
      const total = r.sites.reduce((acc, s) => acc + s.totalMois, 0);
      const obj = r.sites.reduce((acc, s) => acc + s.objMensuel, 0);
      return {
        name: r.name.replace('PRES ', ''),
        realized: total,
        objective: obj,
        percent: obj > 0 ? (total / obj) * 100 : 0
      };
    }).sort((a, b) => b.percent - a.percent);

    // --- STATS DISTRIBUTION ---
    let distTotal = 0;
    let distRendu = 0;
    const distRegionMap = new Map<string, { qty: number, rendu: number }>();

    if (data.distributions?.records) {
      const currentMonthNum = parseInt(data.date.split('/')[1]);
      const currentYearNum = parseInt(data.date.split('/')[2]);

      data.distributions.records.forEach(r => {
        const [d, m, y] = r.date.split('/').map(Number);
        if (m === currentMonthNum && y === currentYearNum) {
          distTotal += r.quantite;
          distRendu += r.rendu;
          const reg = r.region || "AUTRES";
          const curr = distRegionMap.get(reg) || { qty: 0, rendu: 0 };
          distRegionMap.set(reg, { qty: curr.qty + r.quantite, rendu: curr.rendu + r.rendu });
        }
      });
    }

    const distRegionsPerf = Array.from(distRegionMap.entries()).map(([name, val]) => ({
      name: name.replace('PRES ', ''),
      realized: val.qty,
      percent: val.qty > 0 ? ((val.qty - val.rendu) / val.qty) * 100 : 0
    })).sort((a,b) => b.realized - a.realized);

    return { 
      fixePerc, mobilePerc, regionsPerf, pochesRestantes, isReached,
      distTotal, distRendu, distEfficiency: distTotal > 0 ? ((distTotal - distRendu) / distTotal) * 100 : 0,
      distRegionsPerf
    };
  }, [data]);

  const getVitalityClasses = (percent: number) => {
    if (percent >= 110) return { text: 'text-emerald-600', bgTag: 'bg-emerald-50', bgProgress: 'bg-emerald-500' };
    if (percent >= 100) return { text: 'text-emerald-600', bgTag: 'bg-emerald-50', bgProgress: 'bg-emerald-500' };
    if (percent >= 75) return { text: 'text-orange-500', bgTag: 'bg-orange-50', bgProgress: 'bg-orange-500' };
    return { text: 'text-red-600', bgTag: 'bg-red-50', bgProgress: 'bg-red-500' };
  };

  const handleExport = async (type: 'image' | 'pdf') => {
    if (!contentRef.current) return;
    setExporting(type);
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const element = contentRef.current;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#f8fafc' });
      const imgData = canvas.toDataURL('image/png', 1.0);
      const filename = `RESUME_CNTS_${viewMode}_${data.month.replace(/\s/g, '_')}`;
      if (type === 'image') {
        const link = document.createElement('a');
        link.download = `${filename}.png`; link.href = imgData; link.click();
      } else {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth(); 
        const ratio = pageWidth / (canvas.width / 2);
        pdf.addImage(imgData, 'PNG', 0, 10, pageWidth, (canvas.height / 2) * ratio);
        pdf.save(`${filename}.pdf`);
      }
    } catch (err) { console.error(err); } finally { setExporting(null); }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-1000">
      
      {/* SWITCH DE MODE RESUME */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 px-4">
        <div className="bg-white p-1.5 rounded-3xl shadow-xl border border-slate-100 flex gap-2">
           <button onClick={() => setViewMode('donations')} className={`px-10 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${viewMode === 'donations' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-slate-400 hover:bg-slate-50'}`}>
             <Activity size={16}/> Prélèvements
           </button>
           <button onClick={() => setViewMode('distribution')} className={`px-10 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${viewMode === 'distribution' ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' : 'text-slate-400 hover:bg-slate-50'}`}>
             <Truck size={16}/> Distribution
           </button>
        </div>
        <div className="flex gap-3">
          <button onClick={() => handleExport('image')} disabled={!!exporting} className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">
            {exporting === 'image' ? <Loader2 size={16} className="animate-spin" /> : <FileImage size={16} />} PNG
          </button>
          <button onClick={() => handleExport('pdf')} disabled={!!exporting} className={`flex items-center gap-2 px-6 py-3 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md ${viewMode === 'donations' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
            {exporting === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />} PDF
          </button>
        </div>
      </div>

      <div ref={contentRef} className="space-y-10 p-1">
        {/* CARTE VEDETTE */}
        <div 
          onClick={() => setActiveTab(viewMode === 'donations' ? 'pulse' : 'hemo-stats')}
          className="relative group overflow-hidden cursor-pointer"
        >
          <div className={`absolute -inset-1 bg-gradient-to-r ${viewMode === 'donations' ? (stats.isReached ? 'from-emerald-600 to-teal-400' : 'from-emerald-600 to-green-500') : 'from-orange-600 to-orange-400'} rounded-[4rem] blur opacity-25 group-hover:opacity-40 transition duration-1000`}></div>
          <div className="relative bg-white rounded-[4rem] p-10 lg:p-14 shadow-2xl border border-white flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="flex items-center gap-8">
              <div className={`w-20 h-20 lg:w-24 lg:h-24 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl ${viewMode === 'donations' ? (stats.isReached ? 'bg-emerald-500' : 'bg-emerald-600') : 'bg-orange-600'}`}>
                {viewMode === 'donations' ? (stats.isReached ? <CheckCircle2 size={48} /> : <Target size={48} />) : <Package size={48} />}
              </div>
              <div>
                <h2 className={`text-sm font-black uppercase tracking-[0.4em] mb-2 ${viewMode === 'donations' ? (stats.isReached ? 'text-emerald-500' : 'text-emerald-600') : 'text-orange-500'}`}>
                  {viewMode === 'donations' ? (stats.isReached ? "Objectif Atteint !" : "Reste à collecter ce mois") : "Volume Distribué ce mois"}
                </h2>
                <div className="flex items-baseline gap-4">
                  <span className="text-7xl lg:text-9xl font-black tracking-tighter text-slate-900 leading-none">
                    {viewMode === 'donations' ? stats.pochesRestantes.toLocaleString() : stats.distTotal.toLocaleString()}
                  </span>
                  <span className="text-xl lg:text-3xl font-black text-slate-300 uppercase tracking-tighter">Poches</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center lg:items-end text-center lg:text-right">
              <div className={`px-6 py-3 rounded-2xl border mb-4 ${viewMode === 'donations' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-orange-50 border-orange-100 text-orange-600'}`}>
                 <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                   {viewMode === 'donations' ? <Activity size={14}/> : <TrendingUp size={14}/>} {viewMode === 'donations' ? 'Flux National' : 'Flux Actif'}
                 </p>
              </div>
              <p className="text-sm font-bold text-slate-500 leading-relaxed max-w-[280px]">
                {viewMode === 'donations' 
                  ? `Il manque ${stats.pochesRestantes.toLocaleString()} prélèvements pour valider le contrat mensuel.`
                  : `Efficacité nette de distribution enregistrée à ${stats.distEfficiency.toFixed(1)}% ce mois.`
                }
                <span className="text-slate-900 font-black block mt-1">Détails en temps réel →</span>
              </p>
            </div>
          </div>
        </div>

        {/* RÉSUMÉ NATIONAL */}
        <div className={`relative overflow-hidden rounded-[4.5rem] p-10 lg:p-16 text-white shadow-3xl border border-white/5 transition-colors duration-700 ${viewMode === 'donations' ? 'bg-[#0f172a]' : 'bg-[#1e1b4b]'}`}>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 blur-[120px] rounded-full -mr-40 -mt-40 animate-pulse"></div>
          <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
            <div className="relative shrink-0">
               <div className="w-56 h-56 lg:w-72 lg:h-72 rounded-full border-[10px] border-white/5 flex items-center justify-center relative">
                 <div className="text-center">
                    <span className="text-6xl lg:text-7xl font-black tracking-tighter block">{viewMode === 'donations' ? data.monthly.percentage.toFixed(0) : stats.distEfficiency.toFixed(0)}%</span>
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 block mt-2">{viewMode === 'donations' ? 'Taux de Vitalité' : 'Taux d\'Utilisation'}</span>
                 </div>
                 <svg className="absolute inset-0 w-full h-full -rotate-90">
                   <circle cx="50%" cy="50%" r="48%" fill="none" stroke={viewMode === 'donations' ? COLORS.green : '#f59e0b'} strokeWidth="10" strokeDasharray="854" strokeDashoffset={(854 - (854 * Math.min(viewMode === 'donations' ? data.monthly.percentage : stats.distEfficiency, 100)) / 100).toString()} strokeLinecap="round" className="transition-all duration-1000"/>
                 </svg>
               </div>
            </div>
            <div className="flex-1 space-y-8 text-center lg:text-left">
              <div>
                <h1 className="text-4xl lg:text-6xl font-black uppercase tracking-tighter leading-none mb-4">{viewMode === 'donations' ? 'Résumé National' : 'Synthèse Flux'}</h1>
                <p className="text-white/40 font-black uppercase tracking-[0.6em] text-[10px] flex items-center justify-center lg:justify-start gap-3">
                   <Activity size={16} className={`${viewMode === 'donations' ? 'text-emerald-500' : 'text-orange-500'} animate-pulse`} /> PERFORMANCE {data.month}
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 backdrop-blur-md p-5 rounded-3xl border border-white/10 text-center">
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">{viewMode === 'donations' ? 'Réalisé Mois' : 'Distribué'}</p>
                  <p className="text-2xl font-black text-white">{viewMode === 'donations' ? data.monthly.realized.toLocaleString() : stats.distTotal.toLocaleString()}</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md p-5 rounded-3xl border border-white/10 text-center">
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">{viewMode === 'donations' ? 'Fixe' : 'Rendus'}</p>
                  <p className="text-2xl font-black text-emerald-400">{viewMode === 'donations' ? data.monthly.fixed.toLocaleString() : stats.distRendu.toLocaleString()}</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md p-5 rounded-3xl border border-white/10 text-center">
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">{viewMode === 'donations' ? 'Mobile' : 'Sorties Net'}</p>
                  <p className="text-2xl font-black text-orange-400">{viewMode === 'donations' ? data.monthly.mobile.toLocaleString() : (stats.distTotal - stats.distRendu).toLocaleString()}</p>
                </div>
                <div className={`p-5 rounded-3xl shadow-xl text-center ${viewMode === 'donations' ? 'bg-gradient-to-br from-emerald-600 to-emerald-800' : 'bg-gradient-to-br from-orange-600 to-orange-800'}`}>
                  <p className="text-[8px] font-black text-white/60 uppercase tracking-widest mb-1">Précision</p>
                  <p className="text-2xl font-black text-white">{viewMode === 'donations' ? data.monthly.percentage.toFixed(1) : stats.distEfficiency.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* VITALITÉ DES RÉGIONS (TOUS LES PRES) */}
        <div className="space-y-8">
           <div className="flex items-center gap-4 px-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${viewMode === 'donations' ? 'bg-emerald-900' : 'bg-orange-900'}`}>
                 <MapPin size={24} />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800">{viewMode === 'donations' ? 'Vitalité de toutes les Régions' : 'Flux par Région'}</h3>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {(viewMode === 'donations' ? stats.regionsPerf : stats.distRegionsPerf).map((reg, idx) => {
                const colors = getVitalityClasses(reg.percent);
                return (
                  <div 
                    key={idx} 
                    className="bg-white rounded-[2.5rem] p-8 shadow-warm border border-slate-100 transition-all hover:shadow-xl hover:scale-105"
                  >
                    <div className="flex justify-between items-start mb-6">
                       <h4 className="text-base font-black uppercase tracking-tighter text-slate-800 leading-none">{reg.name}</h4>
                       <span className={`text-[10px] font-black px-3 py-1 rounded-full ${viewMode === 'donations' ? (colors.bgTag + ' ' + colors.text) : 'bg-orange-50 text-orange-600'}`}>
                          {reg.percent.toFixed(0)}%
                       </span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-4">
                       <span className={`text-3xl font-black ${viewMode === 'donations' ? 'text-slate-900' : 'text-orange-900'}`}>{reg.realized.toLocaleString()}</span>
                       <span className="text-[10px] font-bold text-slate-300 uppercase">Poches</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                       <div className={`h-full transition-all duration-1000 ${viewMode === 'donations' ? colors.bgProgress : 'bg-orange-500'}`} style={{ width: `${Math.min(reg.percent, 100)}%` }}/>
                    </div>
                  </div>
                );
              })}
           </div>
        </div>
      </div>
    </div>
  );
};