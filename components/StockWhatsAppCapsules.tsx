
import React, { useMemo, useRef, useState } from 'react';
import { DashboardData } from '../types';
import { Package, Share2, Download, Loader2, ShieldCheck, Activity, Zap, Droplet, AlertTriangle } from 'lucide-react';
import { domToPng } from 'modern-screenshot';

interface StockWhatsAppCapsulesProps {
  data: DashboardData;
  situationTime?: string;
  branding?: { logo: string; hashtag: string };
}

export const StockWhatsAppCapsules: React.FC<StockWhatsAppCapsulesProps> = ({ data, situationTime, branding }) => {
  const [exporting, setExporting] = useState(false);
  const capsulesRef = useRef<HTMLDivElement>(null);
  const stock = data.stock || [];

  const stats = useMemo(() => {
    const normalize = (str: string) => 
      str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim() : "";

    const totals = {
      total: 0,
      cgrTotal: 0,
      cgrAdulte: 0,
      cgrPedia: 0,
      cgrNourri: 0,
      plaquettes: 0,
      plasma: 0
    };

    stock.forEach(s => {
      const t = normalize(s.typeProduit);
      totals.total += s.quantite;

      if (t.includes('CGR')) {
        totals.cgrTotal += s.quantite;
        if (t.includes('PEDIATRIQUE')) {
          totals.cgrPedia += s.quantite;
        } else if (t.includes('NOURRISON')) {
          totals.cgrNourri += s.quantite;
        } else {
          totals.cgrAdulte += s.quantite;
        }
      } else if (t.includes('PLAQUETTE') || t.includes('PLATELET')) {
        totals.plaquettes += s.quantite;
      } else if (t.includes('PLASMA')) {
        totals.plasma += s.quantite;
      }
    });

    return totals;
  }, [stock]);

  const handleExport = async () => {
    if (!capsulesRef.current) return;
    setExporting(true);
    try {
      // Small delay to ensure rendering
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const imgData = await domToPng(capsulesRef.current, {
        scale: 3, // High quality for WhatsApp
        backgroundColor: '#ffffff',
        style: {
          padding: '20px',
          borderRadius: '0px'
        }
      });

      const link = document.createElement('a');
      link.download = `RESUME_STOCK_WHATSAPP_${new Date().getTime()}.png`;
      link.href = imgData;
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const isAlert = stats.total < 12000;

  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
            <Share2 size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900">Format WhatsApp</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Capsules de synthèse exportables</p>
          </div>
        </div>
        <button 
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md disabled:opacity-50"
        >
          {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Exporter PNG
        </button>
      </div>

      {/* The actual capsules to be exported */}
      <div className="bg-slate-50 p-6 rounded-[2rem] overflow-hidden">
        <div ref={capsulesRef} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 max-w-[500px] mx-auto">
          {/* Header in export */}
          <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
            <div className="flex items-center gap-4">
              {branding?.logo && (
                <img src={branding.logo} alt="Logo" className="h-16 w-auto object-contain" referrerPolicy="no-referrer" />
              )}
              <div>
                <h4 className="text-xl font-black uppercase tracking-tighter text-slate-900 leading-none">Résumé Stock</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">CNTS Côte d'Ivoire</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Situation au</p>
              <p className="text-lg font-black text-slate-900">{situationTime?.replace('Situation au ', '') || data.date}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {/* Total Capsule */}
            <div className={`${isAlert ? 'bg-rose-600 animate-pulse shadow-rose-200' : 'bg-slate-900'} rounded-[2.5rem] p-8 text-white flex items-center justify-between shadow-2xl transition-colors duration-500`}>
              <div className="flex items-center gap-6">
                <div className={`w-16 h-16 ${isAlert ? 'bg-white/20' : 'bg-white/10'} rounded-3xl flex items-center justify-center`}>
                  {isAlert ? <AlertTriangle size={32} className="text-white" /> : <Package size={32} className="text-white" />}
                </div>
                <div>
                  <p className={`text-[12px] font-black ${isAlert ? 'text-white/60' : 'text-white/40'} uppercase tracking-[0.2em] leading-none mb-2`}>Total Poches</p>
                  <p className="text-5xl font-black tracking-tighter leading-none">{stats.total.toLocaleString()}</p>
                </div>
              </div>
              {isAlert && (
                <div className="bg-white/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
                  ALERTE
                </div>
              )}
            </div>

            {/* CGR Capsule */}
            <div className="bg-emerald-600 rounded-[2.5rem] p-8 text-white shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center">
                    <Droplet size={32} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[12px] font-black text-white/40 uppercase tracking-[0.2em] leading-none mb-2">Total CGR</p>
                    <p className="text-5xl font-black tracking-tighter leading-none">{stats.cgrTotal.toLocaleString()}</p>
                  </div>
                </div>
                <div className="px-4 py-2 bg-white/20 rounded-full text-[11px] font-black uppercase tracking-widest">
                  Globules Rouges
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
                <div className="text-center">
                  <p className="text-[10px] font-black text-white/50 uppercase mb-2 tracking-widest">Adulte</p>
                  <p className="text-2xl font-black">{stats.cgrAdulte.toLocaleString()}</p>
                </div>
                <div className="text-center border-x border-white/10">
                  <p className="text-[10px] font-black text-white/50 uppercase mb-2 tracking-widest">Pédia</p>
                  <p className="text-2xl font-black">{stats.cgrPedia.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-white/50 uppercase mb-2 tracking-widest">Nourri</p>
                  <p className="text-2xl font-black">{stats.cgrNourri.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Plaquettes & Plasma Capsules */}
            <div className="grid grid-cols-2 gap-5">
              <div className="bg-amber-500 rounded-[2.5rem] p-8 text-white shadow-2xl">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-4">
                  <Activity size={28} className="text-white" />
                </div>
                <p className="text-[12px] font-black text-white/40 uppercase tracking-[0.2em] leading-none mb-2">Plaquettes</p>
                <p className="text-4xl font-black tracking-tighter leading-none">{stats.plaquettes.toLocaleString()}</p>
              </div>
              <div className="bg-blue-500 rounded-[2.5rem] p-8 text-white shadow-2xl">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-4">
                  <Zap size={28} className="text-white" />
                </div>
                <p className="text-[12px] font-black text-white/40 uppercase tracking-[0.2em] leading-none mb-2">Plasma</p>
                <p className="text-4xl font-black tracking-tighter leading-none">{stats.plasma.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Footer in export */}
          <div className="mt-10 pt-8 border-t border-slate-100 flex justify-between items-center">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">{branding?.hashtag || '#DonDeSang'}</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cockpit HS v4.0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
