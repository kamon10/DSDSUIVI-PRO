import React, { useMemo, useState, useRef } from 'react';
import { DashboardData, AppTab } from '../types';
import { Activity, MapPin, ChevronRight, PieChart, Users, Heart, TrendingUp, FileImage, FileText, Loader2, Target, AlertCircle, CheckCircle2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { COLORS } from '../constants';

interface SummaryViewProps {
  data: DashboardData;
  setActiveTab: (tab: AppTab) => void;
}

export const SummaryView: React.FC<SummaryViewProps> = ({ data, setActiveTab }) => {
  const [exporting, setExporting] = useState<'image' | 'pdf' | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => {
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

    return { fixePerc, mobilePerc, regionsPerf, pochesRestantes, isReached };
  }, [data]);

  const handleExport = async (type: 'image' | 'pdf') => {
    if (!contentRef.current) return;
    setExporting(type);
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const element = contentRef.current;
      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true, 
        backgroundColor: '#f8fafc',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png', 1.0);
      if (type === 'image') {
        const link = document.createElement('a');
        link.download = `RESUME_CNTS_${data.month.replace(/\s/g, '_')}.png`;
        link.href = imgData;
        link.click();
      } else {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth(); 
        const pageHeight = pdf.internal.pageSize.getHeight();
        const ratio = pageWidth / (canvas.width / 2);
        const finalWidth = pageWidth;
        const finalHeight = (canvas.height / 2) * ratio;
        let drawHeight = finalHeight;
        let drawWidth = finalWidth;
        if (finalHeight > pageHeight - 20) {
          const scaleFactor = (pageHeight - 20) / finalHeight;
          drawHeight = finalHeight * scaleFactor;
          drawWidth = finalWidth * scaleFactor;
        }
        pdf.addImage(imgData, 'PNG', (pageWidth - drawWidth) / 2, 10, drawWidth, drawHeight, undefined, 'FAST');
        pdf.save(`RESUME_CNTS_${data.month.replace(/\s/g, '_')}.pdf`);
      }
    } catch (err) {
      console.error("Export Summary Error:", err);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-1000">
      <div className="flex justify-end gap-3 px-4">
        <button onClick={() => handleExport('image')} disabled={!!exporting} className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
          {exporting === 'image' ? <Loader2 size={16} className="animate-spin" /> : <FileImage size={16} />} Exporter PNG
        </button>
        <button onClick={() => handleExport('pdf')} disabled={!!exporting} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">
          {exporting === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />} Exporter PDF
        </button>
      </div>

      <div ref={contentRef} className="space-y-10 p-1">
        {/* CARTE VEDETTE : RESTE À COLLECTER -> Lien vers Pulse */}
        <div 
          onClick={() => setActiveTab('pulse')}
          className="relative group overflow-hidden cursor-pointer"
        >
          <div className={`absolute -inset-1 bg-gradient-to-r ${stats.isReached ? 'from-emerald-600 to-teal-400' : 'from-red-600 to-orange-500'} rounded-[4rem] blur opacity-25 group-hover:opacity-40 transition duration-1000`}></div>
          <div className="relative bg-white rounded-[4rem] p-10 lg:p-14 shadow-2xl border border-white flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="flex items-center gap-8">
              <div className={`w-20 h-20 lg:w-24 lg:h-24 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl ${stats.isReached ? 'bg-emerald-500' : 'bg-red-600'}`}>
                {stats.isReached ? <CheckCircle2 size={48} /> : <Target size={48} />}
              </div>
              <div>
                <h2 className={`text-sm font-black uppercase tracking-[0.4em] mb-2 ${stats.isReached ? 'text-emerald-500' : 'text-red-500'}`}>
                  {stats.isReached ? "Objectif Atteint !" : "Reste à collecter ce mois"}
                </h2>
                <div className="flex items-baseline gap-4">
                  <span className="text-7xl lg:text-9xl font-black tracking-tighter text-slate-900 leading-none">
                    {stats.pochesRestantes.toLocaleString()}
                  </span>
                  <span className="text-xl lg:text-3xl font-black text-slate-300 uppercase tracking-tighter">Poches</span>
                </div>
              </div>
            </div>
            {!stats.isReached && (
              <div className="flex flex-col items-center lg:items-end text-center lg:text-right">
                <div className="bg-red-50 px-6 py-3 rounded-2xl border border-red-100 mb-4">
                   <p className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-2">
                     <AlertCircle size={14}/> Effort requis
                   </p>
                </div>
                <p className="text-sm font-bold text-slate-500 leading-relaxed max-w-[280px]">
                  Il manque <span className="text-red-600">{stats.pochesRestantes.toLocaleString()} prélèvements</span> pour valider le contrat mensuel. <span className="text-slate-900 font-black block mt-1">Cliquez pour voir le Pulse →</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RÉSUMÉ NATIONAL -> Lien vers Cockpit */}
        <div 
          onClick={() => setActiveTab('cockpit')}
          className="relative overflow-hidden bg-[#0f172a] rounded-[4.5rem] p-10 lg:p-16 text-white shadow-3xl border border-white/5 group cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600/10 blur-[120px] rounded-full -mr-40 -mt-40 animate-pulse"></div>
          <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
            <div className="relative shrink-0">
               <div className="w-56 h-56 lg:w-72 lg:h-72 rounded-full border-[10px] border-white/5 flex items-center justify-center relative">
                 <div className="text-center">
                    <span className="text-6xl lg:text-7xl font-black tracking-tighter block">{data.monthly.percentage.toFixed(0)}%</span>
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 block mt-2">Taux de Vitalité</span>
                 </div>
                 <svg className="absolute inset-0 w-full h-full -rotate-90">
                   <circle cx="50%" cy="50%" r="48%" fill="none" stroke={data.monthly.percentage >= 100 ? '#10b981' : '#ef4444'} strokeWidth="10" strokeDasharray="854" strokeDashoffset={(854 - (854 * Math.min(data.monthly.percentage, 100)) / 100).toString()} strokeLinecap="round" className="transition-all duration-1000"/>
                 </svg>
               </div>
            </div>
            <div className="flex-1 space-y-8 text-center lg:text-left">
              <div>
                <h1 className="text-4xl lg:text-6xl font-black uppercase tracking-tighter leading-none mb-4">Résumé National</h1>
                <p className="text-white/40 font-black uppercase tracking-[0.6em] text-[10px] flex items-center justify-center lg:justify-start gap-3">
                   <Activity size={16} className="text-red-500 animate-pulse" /> PERFORMANCE CONSOLIDÉE {data.month}
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 backdrop-blur-md p-5 rounded-3xl border border-white/10">
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Réalisé Jour</p>
                  <p className="text-2xl font-black text-white">{data.daily.realized.toLocaleString()}</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md p-5 rounded-3xl border border-white/10">
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Réalisé Mois</p>
                  <p className="text-2xl font-black text-white">{data.monthly.realized.toLocaleString()}</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md p-5 rounded-3xl border border-white/10">
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Objectif Mois</p>
                  <p className="text-2xl font-black text-white">{data.monthly.objective.toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-red-600 to-orange-600 p-5 rounded-3xl shadow-xl">
                  <p className="text-[8px] font-black text-white/60 uppercase tracking-widest mb-1">Précision</p>
                  <p className="text-2xl font-black text-white">{data.monthly.percentage.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MIX DE COLLECTE -> Lien vers Évolution */}
        <div 
          onClick={() => setActiveTab('evolution')}
          className="bg-white rounded-[3.5rem] p-10 shadow-xl border border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-10 cursor-pointer hover:border-blue-200 transition-all"
        >
           <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center shrink-0">
                 <PieChart size={32} />
              </div>
              <div>
                 <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Mix de Collecte National</h3>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Voir l'évolution temporelle →</p>
              </div>
           </div>
           <div className="flex-1 max-w-2xl space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sites Fixes</span>
                  <span className="text-base font-black text-emerald-600">{stats.fixePerc.toFixed(0)}%</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${stats.fixePerc}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Unités Mobiles</span>
                  <span className="text-base font-black text-orange-500">{stats.mobilePerc.toFixed(0)}%</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${stats.mobilePerc}%` }}></div>
                </div>
              </div>
           </div>
        </div>

        {/* VITALITÉ DES RÉGIONS -> Lien vers Performance */}
        <div className="space-y-8">
           <div className="flex items-center gap-4 px-6">
              <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                 <MapPin size={24} />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Vitalité des Régions</h3>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.regionsPerf.map((reg, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setActiveTab('performance')}
                  className="bg-white rounded-[2.5rem] p-8 shadow-warm border border-slate-100 cursor-pointer hover:shadow-xl hover:scale-105 transition-all"
                >
                  <div className="flex justify-between items-start mb-6">
                     <h4 className="text-base font-black uppercase tracking-tighter text-slate-800 leading-none">{reg.name}</h4>
                     <span className={`text-[10px] font-black px-3 py-1 rounded-full ${reg.percent >= 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {reg.percent.toFixed(0)}%
                     </span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-4">
                     <span className="text-3xl font-black text-slate-900">{reg.realized.toLocaleString()}</span>
                     <span className="text-[10px] font-bold text-slate-300 uppercase">Poches</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                     <div className={`h-full transition-all duration-1000 ${reg.percent >= 100 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${Math.min(reg.percent, 100)}%` }}/>
                  </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};