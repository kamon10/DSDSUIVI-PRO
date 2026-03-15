
import React, { useRef, useState, useMemo } from 'react';
import { DashboardData, User } from '../types';
import { FileText, Download, Loader2, Activity, Truck, Package, Calendar, MapPin, TrendingUp, ShieldCheck } from 'lucide-react';
import { domToPng } from 'modern-screenshot';
import { jsPDF } from 'jspdf';
import { SITES_DATA } from '../constants';

interface GlobalSynthesisReportViewProps {
  data: DashboardData;
  user: User | null;
  branding?: { logo: string; hashtag: string };
  situationTime?: string;
}

export const GlobalSynthesisReportView: React.FC<GlobalSynthesisReportViewProps> = ({ data, user, branding, situationTime }) => {
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => {
    // Collection Stats
    const dailyColl = data.daily.realized;
    const monthlyColl = data.monthly.realized;
    const annualColl = data.annual.realized;

    // Distribution Stats
    const distRecords = data.distributions?.records || [];
    const totalDist = distRecords.reduce((acc, r) => acc + r.quantite, 0);
    const totalRendu = distRecords.reduce((acc, r) => acc + r.rendu, 0);

    // Stock Stats
    const stock = data.stock || [];
    const totalStock = stock.reduce((acc, s) => acc + s.quantite, 0);
    const cgrStock = stock.filter(s => s.typeProduit.toUpperCase().includes('CGR')).reduce((acc, s) => acc + s.quantite, 0);

    return {
      collection: { daily: dailyColl, monthly: monthlyColl, annual: annualColl },
      distribution: { total: totalDist, rendu: totalRendu },
      stock: { total: totalStock, cgr: cgrStock }
    };
  }, [data]);

  const handleExport = async (type: 'image' | 'pdf') => {
    if (!reportRef.current) return;
    setExporting(true);

    try {
      const imgData = await domToPng(reportRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
      });

      const filename = `RAPPORT_GLOBAL_${new Date().toISOString().split('T')[0]}`;

      if (type === 'image') {
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = imgData;
        link.click();
      } else {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const targetWidth = pdfWidth - (margin * 2);
        
        const img = new Image();
        img.src = imgData;
        await new Promise((resolve) => (img.onload = resolve));

        const imgWidth = img.width;
        const imgHeight = img.height;
        const imgHeightInPdf = (imgHeight * targetWidth) / imgWidth;
        
        let heightLeft = imgHeightInPdf;
        let position = margin;
        let page = 0;

        // Add first page
        pdf.addImage(imgData, 'PNG', margin, position, targetWidth, imgHeightInPdf);
        heightLeft -= (pdfHeight - margin * 2);
        
        // Add subsequent pages if needed
        while (heightLeft > 0) {
          page++;
          position = margin - (page * (pdfHeight - margin * 2));
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', margin, position, targetWidth, imgHeightInPdf);
          heightLeft -= (pdfHeight - margin * 2);
        }
        
        pdf.save(`${filename}.pdf`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Erreur lors de l\'export. Veuillez réessayer.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-8 pb-24">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Rapport Global de Synthèse</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Génération de document de référence (PDF/PNG)</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => handleExport('image')}
            disabled={exporting}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-900 rounded-2xl text-[12px] font-black uppercase hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
          >
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            PNG
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[12px] font-black uppercase hover:bg-slate-800 transition-all shadow-xl disabled:opacity-50"
          >
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            PDF
          </button>
        </div>
      </div>

      <div ref={reportRef} className="bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100 space-y-12 max-w-[1000px] mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-8">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-lg flex items-center justify-center">
              <img src={branding?.logo} alt="Logo" className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
            </div>
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900">Rapport d'Activité</h1>
              <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[12px] mt-1">Direction Nationale / Cockpit de Pilotage</p>
              <div className="flex items-center gap-3 mt-4">
                <div className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-600">
                  {situationTime || `Situation au ${new Date().toLocaleDateString()}`}
                </div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Document Officiel</p>
            <p className="text-lg font-black text-slate-900 mt-1">{branding?.hashtag}</p>
          </div>
        </div>

        {/* Section 1: Prélèvements */}
        <section className="space-y-6">
          <div className="flex items-center gap-4 border-l-4 border-blue-600 pl-6">
            <Activity className="text-blue-600" size={24} />
            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">1. Activité de Prélèvement</h2>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Réalisé Jour</p>
              <p className="text-3xl font-black text-slate-900">{stats.collection.daily.toLocaleString()}</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Réalisé Mois</p>
              <p className="text-3xl font-black text-slate-900">{stats.collection.monthly.toLocaleString()}</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Réalisé Annuel</p>
              <p className="text-3xl font-black text-slate-900">{stats.collection.annual.toLocaleString()}</p>
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl border border-slate-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                  <th className="px-6 py-4">Région / PRES</th>
                  <th className="px-6 py-4 text-center">Objectif</th>
                  <th className="px-6 py-4 text-center">Réalisé</th>
                  <th className="px-6 py-4 text-center">%</th>
                </tr>
              </thead>
              <tbody className="text-[12px] font-bold text-slate-700">
                {data.regions.map((reg, idx) => {
                  const regRealized = reg.sites.reduce((acc, s) => acc + (s.totalJour || 0), 0);
                  const regObj = reg.sites.reduce((acc, s) => acc + (s.objDate || 0), 0);
                  const perc = regObj > 0 ? (regRealized / regObj) * 100 : 0;
                  return (
                    <tr key={idx} className="border-b border-slate-50">
                      <td className="px-6 py-3 uppercase">{reg.name}</td>
                      <td className="px-6 py-3 text-center">{regObj.toLocaleString()}</td>
                      <td className="px-6 py-3 text-center font-black">{regRealized.toLocaleString()}</td>
                      <td className="px-6 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full ${perc >= 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {perc.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 2: Distribution */}
        <section className="space-y-6">
          <div className="flex items-center gap-4 border-l-4 border-emerald-600 pl-6">
            <Truck className="text-emerald-600" size={24} />
            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">2. Activité de Distribution</h2>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Distribué (Poches)</p>
              <p className="text-3xl font-black text-slate-900">{stats.distribution.total.toLocaleString()}</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Rendu (Poches)</p>
              <p className="text-3xl font-black text-slate-900">{stats.distribution.rendu.toLocaleString()}</p>
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl border border-slate-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                  <th className="px-6 py-4">Type de Produit</th>
                  <th className="px-6 py-4 text-center">Quantité</th>
                  <th className="px-6 py-4 text-center">Rendu</th>
                  <th className="px-6 py-4 text-center">Net</th>
                </tr>
              </thead>
              <tbody className="text-[12px] font-bold text-slate-700">
                {Array.from(new Set((data.distributions?.records || []).map(r => r.typeProduit))).map((type, idx) => {
                  const records = (data.distributions?.records || []).filter(r => r.typeProduit === type);
                  const q = records.reduce((acc, r) => acc + r.quantite, 0);
                  const r = records.reduce((acc, r) => acc + r.rendu, 0);
                  return (
                    <tr key={idx} className="border-b border-slate-50">
                      <td className="px-6 py-3 uppercase">{type}</td>
                      <td className="px-6 py-3 text-center">{q.toLocaleString()}</td>
                      <td className="px-6 py-3 text-center text-rose-600">{r.toLocaleString()}</td>
                      <td className="px-6 py-3 text-center font-black">{(q - r).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 3: Stocks */}
        <section className="space-y-6">
          <div className="flex items-center gap-4 border-l-4 border-amber-600 pl-6">
            <Package className="text-amber-600" size={24} />
            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">3. Situation des Stocks</h2>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Stock Total National</p>
              <p className="text-3xl font-black text-slate-900">{stats.stock.total.toLocaleString()}</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Stock CGR (Globules Rouges)</p>
              <p className="text-3xl font-black text-blue-600">{stats.stock.cgr.toLocaleString()}</p>
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl border border-slate-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                  <th className="px-6 py-4">Groupe Sanguin</th>
                  <th className="px-6 py-4 text-center">Stock CGR</th>
                  <th className="px-6 py-4 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="text-[12px] font-bold text-slate-700">
                {["O+", "A+", "B+", "AB+", "O-", "A-", "B-", "AB-"].map((group, idx) => {
                  const q = (data.stock || []).filter(s => s.groupeSanguin.replace(/\s/g, '').toUpperCase() === group && s.typeProduit.toUpperCase().includes('CGR')).reduce((acc, s) => acc + s.quantite, 0);
                  return (
                    <tr key={idx} className="border-b border-slate-50">
                      <td className="px-6 py-3 font-black">{group}</td>
                      <td className="px-6 py-3 text-center">{q.toLocaleString()}</td>
                      <td className="px-6 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full ${q > 500 ? 'bg-emerald-100 text-emerald-700' : q > 200 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                          {q > 500 ? 'Optimal' : q > 200 ? 'Alerte' : 'Critique'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-slate-100 pt-8 flex justify-between items-end">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Signé par le Responsable</p>
            <div className="h-12 w-48 border-b border-slate-200"></div>
            <p className="text-[9px] font-bold text-slate-400 uppercase">{user?.prenoms} {user?.nom}</p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">Généré via HS Cockpit v4.0</p>
            <p className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">{new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
