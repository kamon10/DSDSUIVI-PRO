
import React, { useMemo, useRef, useState } from 'react';
import { DashboardData, User, AppTab } from '../types';
import { 
  Package, TrendingUp, ShieldCheck, AlertTriangle, 
  Clock, MapPin, Activity, Target, Zap, 
  FileImage, FileText, Loader2, CheckCircle2,
  ChevronRight, Database, Layout
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { COLORS, GROUP_COLORS, STOCK_FORECASTS } from '../constants';

interface StockSummaryViewProps {
  data: DashboardData;
  user?: User | null;
  setActiveTab: (tab: AppTab) => void;
  branding?: { logo: string; hashtag: string };
}

const SANG_GROUPS = ["O+", "A+", "B+", "AB+", "O-", "A-", "B-", "AB-"];

export const StockSummaryView: React.FC<StockSummaryViewProps> = ({ data, setActiveTab, branding }) => {
  const [exporting, setExporting] = useState<'image' | 'pdf' | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const stockStats = useMemo(() => {
    const stock = data.stock || [];
    const normalize = (str: string) => 
      str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

    const excludedKeywords = ["BONOUA", "ABOISSO", "ADZOPE", "AGBOVILLE", "DABOU"];

    let totalNational = 0;
    let totalAbidjan = 0;
    let cgrNational = 0;
    let cgrAbidjan = 0;

    const groupNational: Record<string, number> = {};
    const groupAbidjan: Record<string, number> = {};
    SANG_GROUPS.forEach(g => {
      groupNational[g] = 0;
      groupAbidjan[g] = 0;
    });

    stock.forEach(s => {
      const type = normalize(s.typeProduit || "");
      const pres = normalize(s.pres || "");
      const site = normalize(s.site || "");
      const g = (s.groupeSanguin || "").replace(/\s/g, "").toUpperCase();

      totalNational += s.quantite;
      if (type.includes('CGR')) {
        cgrNational += s.quantite;
        if (groupNational[g] !== undefined) groupNational[g] += s.quantite;
      }

      const isAbidjanPres = pres.includes('ABIDJAN');
      const isExcluded = excludedKeywords.some(kw => site.includes(kw));
      
      if (isAbidjanPres && !isExcluded) {
        totalAbidjan += s.quantite;
        if (type.includes('CGR')) {
          cgrAbidjan += s.quantite;
          if (groupAbidjan[g] !== undefined) groupAbidjan[g] += s.quantite;
        }
      }
    });

    // Autonomie
    const forecastNational = STOCK_FORECASTS["NATIONALE"];
    const forecastAbidjan = STOCK_FORECASTS["ABIDJAN"];

    const autonomyNational = forecastNational.TOTAL > 0 ? cgrNational / forecastNational.TOTAL : 0;
    const autonomyAbidjan = forecastAbidjan.TOTAL > 0 ? cgrAbidjan / forecastAbidjan.TOTAL : 0;

    const criticalGroupsNational = SANG_GROUPS.filter(g => {
      const daily = forecastNational[g] || 0;
      return daily > 0 && (groupNational[g] / daily) < 3;
    });

    const criticalGroupsAbidjan = SANG_GROUPS.filter(g => {
      const daily = forecastAbidjan[g] || 0;
      return daily > 0 && (groupAbidjan[g] / daily) < 3;
    });

    return {
      totalNational,
      totalAbidjan,
      cgrNational,
      cgrAbidjan,
      autonomyNational,
      autonomyAbidjan,
      criticalGroupsNational,
      criticalGroupsAbidjan,
      groupNational,
      groupAbidjan
    };
  }, [data.stock]);

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
        onclone: (clonedDoc) => {
          const header = clonedDoc.querySelector('.export-header') as HTMLElement;
          if (header) header.style.display = 'flex';
        }
      });
      const imgData = canvas.toDataURL('image/png', 1.0);
      const filename = `RESUME_STOCK_${data.date.replace(/\//g, '-')}`;
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
      
      {/* HEADER ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 px-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
            <Package size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">Résumé Stock</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Situation Consolidée Nationale & Abidjan</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => handleExport('image')} disabled={!!exporting} className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">
            {exporting === 'image' ? <Loader2 size={16} className="animate-spin" /> : <FileImage size={16} />} PNG
          </button>
          <button onClick={() => handleExport('pdf')} disabled={!!exporting} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md">
            {exporting === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />} PDF
          </button>
        </div>
      </div>

      <div ref={contentRef} className="space-y-10 p-1">
        {/* HEADER EXPORT */}
        <div className="hidden export-header flex items-center justify-between border-b-2 border-slate-900 pb-6 mb-8">
          <div className="flex items-center gap-6">
            <img src={branding?.logo} alt="Logo" className="h-20 w-auto object-contain" referrerPolicy="no-referrer" />
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 leading-none">Résumé des Stocks</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2 italic">Centre National de Transfusion Sanguine CI</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Situation au</p>
            <p className="text-xl font-black text-slate-900">{data.date}</p>
          </div>
        </div>

        {/* CARTE VEDETTE - AUTONOMIE NATIONALE */}
        <div 
          onClick={() => setActiveTab('stock-synthesis')}
          className="relative group overflow-hidden cursor-pointer"
        >
          <div className={`absolute -inset-1 bg-gradient-to-r ${stockStats.autonomyNational < 3 ? 'from-rose-600 to-red-400' : stockStats.autonomyNational < 7 ? 'from-amber-600 to-orange-400' : 'from-emerald-600 to-teal-400'} rounded-[4rem] blur opacity-25 group-hover:opacity-40 transition duration-1000`}></div>
          <div className="relative bg-white rounded-[4rem] p-10 lg:p-14 shadow-2xl border border-white flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="flex items-center gap-8">
              <div className={`w-20 h-20 lg:w-24 lg:h-24 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl ${stockStats.autonomyNational < 3 ? 'bg-rose-600' : stockStats.autonomyNational < 7 ? 'bg-amber-600' : 'bg-emerald-600'}`}>
                {stockStats.autonomyNational < 3 ? <AlertTriangle size={48} /> : <ShieldCheck size={48} />}
              </div>
              <div>
                <h2 className={`text-sm font-black uppercase tracking-[0.4em] mb-2 ${stockStats.autonomyNational < 3 ? 'text-rose-600' : stockStats.autonomyNational < 7 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  Autonomie Nationale (CGR)
                </h2>
                <div className="flex items-baseline gap-4">
                  <span className="text-7xl lg:text-9xl font-black tracking-tighter text-slate-900 leading-none">
                    {stockStats.autonomyNational.toFixed(1)}
                  </span>
                  <span className="text-xl lg:text-3xl font-black text-slate-300 uppercase tracking-tighter">Jours</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center lg:items-end text-center lg:text-right">
              <div className={`px-6 py-3 rounded-2xl border mb-4 ${stockStats.autonomyNational < 3 ? 'bg-rose-50 border-rose-100 text-rose-600' : stockStats.autonomyNational < 7 ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                 <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                   <Activity size={14}/> {stockStats.autonomyNational < 3 ? 'SITUATION CRITIQUE' : stockStats.autonomyNational < 7 ? 'VIGILANCE REQUISE' : 'SITUATION OPTIMALE'}
                 </p>
              </div>
              <p className="text-sm font-bold text-slate-500 leading-relaxed max-w-[280px]">
                Le stock national de Globules Rouges permet de couvrir les besoins pour les {stockStats.autonomyNational.toFixed(1)} prochains jours.
                <span className="text-slate-900 font-black block mt-1">Détails par groupe →</span>
              </p>
            </div>
          </div>
        </div>

        {/* GRILLE DE SYNTHÈSE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ABIDJAN FOCUS */}
          <div 
            onClick={() => setActiveTab('stock-synthesis')}
            className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[4rem] p-10 lg:p-14 shadow-2xl border border-white/10 flex flex-col items-center justify-between gap-10 cursor-pointer hover:scale-[1.02] transition-all"
          >
            <div className="flex items-center gap-8 w-full">
              <div className={`w-20 h-20 lg:w-24 lg:h-24 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl ${stockStats.autonomyAbidjan < 3 ? 'bg-rose-500' : 'bg-orange-500'}`}>
                <MapPin size={48} />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-[0.4em] mb-2 text-orange-400">Focus Abidjan</h2>
                <div className="flex items-baseline gap-4">
                  <span className="text-5xl lg:text-7xl font-black tracking-tighter text-white leading-none">
                    {stockStats.autonomyAbidjan.toFixed(1)} J
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center lg:items-end text-center lg:text-right w-full">
              <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white mb-4">
                <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  <Package size={14} className="text-orange-400" /> {stockStats.cgrAbidjan.toLocaleString()} Poches CGR
                </p>
              </div>
              <p className="text-sm font-bold text-white/60 leading-relaxed max-w-[280px]">
                L'autonomie sur le périmètre Abidjan est de {stockStats.autonomyAbidjan.toFixed(1)} jours.
                <span className="text-white font-black block mt-1">Voir la synthèse Abidjan →</span>
              </p>
            </div>
          </div>

          {/* GROUPES CRITIQUES */}
          <div className="bg-white rounded-[4rem] p-10 lg:p-14 shadow-2xl border border-slate-100 flex flex-col justify-between gap-8">
            <div>
              <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 mb-6 flex items-center gap-3">
                <AlertTriangle size={24} className="text-rose-600" /> Groupes en Alerte (National)
              </h3>
              <div className="flex flex-wrap gap-4">
                {stockStats.criticalGroupsNational.length > 0 ? (
                  stockStats.criticalGroupsNational.map(g => (
                    <div key={g} className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg" style={{ backgroundColor: GROUP_COLORS[g] }}>
                        {g}
                      </div>
                      <span className="text-[10px] font-black text-rose-600 mt-2 uppercase">Critique</span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-4 p-6 bg-emerald-50 rounded-3xl border border-emerald-100 w-full">
                    <CheckCircle2 size={32} className="text-emerald-600" />
                    <p className="text-sm font-bold text-emerald-800 uppercase tracking-widest">Aucun groupe en alerte critique au niveau national</p>
                  </div>
                )}
              </div>
            </div>
            <div className="pt-6 border-t border-slate-50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seuil d'alerte : Moins de 3 jours d'autonomie</p>
            </div>
          </div>
        </div>

        {/* RÉSUMÉ CHIFFRÉ */}
        <div className="bg-slate-900 rounded-[4.5rem] p-10 lg:p-16 text-white shadow-3xl border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full -mr-40 -mt-40"></div>
          
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white/5 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/10 text-center">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Stock Total National</p>
              <p className="text-4xl font-black text-white">{stockStats.totalNational.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-white/20 uppercase mt-2">Toutes catégories</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/10 text-center">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Stock CGR National</p>
              <p className="text-4xl font-black text-emerald-400">{stockStats.cgrNational.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-emerald-400/30 uppercase mt-2">Globules Rouges</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/10 text-center">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Stock CGR Abidjan</p>
              <p className="text-4xl font-black text-orange-400">{stockStats.cgrAbidjan.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-orange-400/30 uppercase mt-2">Périmètre Restreint</p>
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-[2.5rem] shadow-xl text-center">
              <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-2">Consommation / Jour</p>
              <p className="text-4xl font-black text-white">{STOCK_FORECASTS.NATIONALE.TOTAL.toFixed(0)}</p>
              <p className="text-[10px] font-bold text-white/40 uppercase mt-2">Moyenne Nationale</p>
            </div>
          </div>
        </div>

        {/* VISION PAR GROUPE (BARRES D'AUTONOMIE) */}
        <div className="space-y-8">
          <div className="flex items-center gap-4 px-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
              <TrendingUp size={24} />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Autonomie par Groupe (National)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SANG_GROUPS.map((g) => {
              const qty = stockStats.groupNational[g] || 0;
              const daily = STOCK_FORECASTS.NATIONALE[g] || 0;
              const autonomy = daily > 0 ? qty / daily : 0;
              
              const status = autonomy < 3 ? 'CRITIQUE' : autonomy < 7 ? 'ALERTE' : 'OPTIMAL';
              const colorClass = status === 'CRITIQUE' ? 'text-rose-600 bg-rose-50 border-rose-100' : status === 'ALERTE' ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100';
              const progressClass = status === 'CRITIQUE' ? 'bg-rose-500' : status === 'ALERTE' ? 'bg-amber-500' : 'bg-emerald-500';

              return (
                <div key={g} className="bg-white rounded-[2.5rem] p-8 shadow-warm border border-slate-100 transition-all hover:shadow-xl">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md" style={{ backgroundColor: GROUP_COLORS[g] }}>
                      {g}
                    </div>
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full ${colorClass}`}>
                      {status}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-3xl font-black text-slate-900">{autonomy.toFixed(1)}</span>
                    <span className="text-[10px] font-bold text-slate-300 uppercase">Jours</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${progressClass}`} style={{ width: `${Math.min((autonomy / 15) * 100, 100)}%` }}/>
                  </div>
                  <div className="mt-4 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                    <span>Stock: {qty}</span>
                    <span>Prév: {daily.toFixed(1)}/j</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* LIENS RAPIDES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button 
            onClick={() => setActiveTab('stock-focus')}
            className="p-8 bg-white rounded-[3rem] border border-slate-100 shadow-xl flex items-center gap-6 group hover:bg-slate-50 transition-all"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap size={28} />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-1">Focus Analyse</span>
              <span className="text-base font-black text-slate-900 uppercase tracking-tighter">Matrice Groupe/Produit</span>
            </div>
            <ChevronRight size={20} className="ml-auto text-slate-300" />
          </button>

          <button 
            onClick={() => setActiveTab('stock-planning')}
            className="p-8 bg-white rounded-[3rem] border border-slate-100 shadow-xl flex items-center gap-6 group hover:bg-slate-50 transition-all"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldCheck size={28} />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block mb-1">Planning Stock</span>
              <span className="text-base font-black text-slate-900 uppercase tracking-tighter">Autonomie par Site</span>
            </div>
            <ChevronRight size={20} className="ml-auto text-slate-300" />
          </button>

          <button 
            onClick={() => setActiveTab('stock-detailed')}
            className="p-8 bg-white rounded-[3rem] border border-slate-100 shadow-xl flex items-center gap-6 group hover:bg-slate-50 transition-all"
          >
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Layout size={28} />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Détail Stock</span>
              <span className="text-base font-black text-slate-900 uppercase tracking-tighter">Vision Granulaire</span>
            </div>
            <ChevronRight size={20} className="ml-auto text-slate-300" />
          </button>
        </div>

      </div>
    </div>
  );
};
