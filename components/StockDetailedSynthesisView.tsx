
import React, { useMemo, useState, useRef } from 'react';
import { DashboardData } from '../types';
import { SITES_DATA } from '../constants';
import { Database, MapPin, ChevronRight, Clock, Package, FileImage, FileText, Loader2, FileSpreadsheet } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { utils, writeFile } from 'xlsx';
import { StockAlert } from './StockAlert.tsx';

interface StockDetailedSynthesisViewProps {
  data: DashboardData;
  branding?: { logo: string; hashtag: string };
}

export const StockDetailedSynthesisView: React.FC<StockDetailedSynthesisViewProps> = ({ data, branding }) => {
  const [exporting, setExporting] = useState<'image' | 'pdf' | 'excel' | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stock = data.stock || [];

  const synthesisData = useMemo(() => {
    const grouped = new Map<string, any>();

    // Normalize helper
    const normalize = (str: string) => 
      str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim() : "";

    SITES_DATA.forEach(siteBase => {
      const regName = siteBase.region || "DIRECTION NATIONALE";
      if (!grouped.has(regName)) {
        grouped.set(regName, {
          name: regName, sites: [], totals: {
            cgrAdulte: 0, cgrPedia: 0, cgrNourri: 0, plasma: 0, plaquettes: 0, oPlus: 0, oMoins: 0, total: 0
          }
        });
      }
      const g = grouped.get(regName);

      const siteStock = stock.filter(s => normalize(s.site) === normalize(siteBase.name));

      const stats = {
        name: siteBase.name,
        cgrAdulte: siteStock.filter(s => {
          const t = normalize(s.typeProduit);
          return t.includes('CGR') && (t.includes('ADULTE') || (!t.includes('PEDIATRIQUE') && !t.includes('NOURRISON')));
        }).reduce((acc, s) => acc + s.quantite, 0),
        cgrPedia: siteStock.filter(s => {
          const t = normalize(s.typeProduit);
          return t.includes('CGR') && t.includes('PEDIATRIQUE');
        }).reduce((acc, s) => acc + s.quantite, 0),
        cgrNourri: siteStock.filter(s => {
          const t = normalize(s.typeProduit);
          return t.includes('CGR') && t.includes('NOURRISON');
        }).reduce((acc, s) => acc + s.quantite, 0),
        plasma: siteStock.filter(s => normalize(s.typeProduit).includes('PLASMA')).reduce((acc, s) => acc + s.quantite, 0),
        plaquettes: siteStock.filter(s => {
          const t = normalize(s.typeProduit);
          return t.includes('PLAQUETTE') || t.includes('PLATELET');
        }).reduce((acc, s) => acc + s.quantite, 0),
        oPlus: siteStock.filter(s => normalize(s.typeProduit).includes('CGR') && (s.groupeSanguin || "").replace(/\s/g, "").toUpperCase() === 'O+').reduce((acc, s) => acc + s.quantite, 0),
        oMoins: siteStock.filter(s => normalize(s.typeProduit).includes('CGR') && (s.groupeSanguin || "").replace(/\s/g, "").toUpperCase() === 'O-').reduce((acc, s) => acc + s.quantite, 0),
        total: siteStock.reduce((acc, s) => acc + s.quantite, 0)
      };

      g.sites.push(stats);
      g.totals.cgrAdulte += stats.cgrAdulte;
      g.totals.cgrPedia += stats.cgrPedia;
      g.totals.cgrNourri += stats.cgrNourri;
      g.totals.plasma += stats.plasma;
      g.totals.plaquettes += stats.plaquettes;
      g.totals.oPlus += stats.oPlus;
      g.totals.oMoins += stats.oMoins;
      g.totals.total += stats.total;
    });

    return Array.from(grouped.values()).filter(g => g.sites.length > 0);
  }, [stock]);

  const grandTotals = useMemo(() => {
    return synthesisData.reduce((acc, reg) => {
      acc.cgrAdulte += reg.totals.cgrAdulte;
      acc.cgrPedia += reg.totals.cgrPedia;
      acc.cgrNourri += reg.totals.cgrNourri;
      acc.plasma += reg.totals.plasma;
      acc.plaquettes += reg.totals.plaquettes;
      acc.oPlus += reg.totals.oPlus;
      acc.oMoins += reg.totals.oMoins;
      acc.total += reg.totals.total;
      return acc;
    }, { cgrAdulte: 0, cgrPedia: 0, cgrNourri: 0, plasma: 0, plaquettes: 0, oPlus: 0, oMoins: 0, total: 0 });
  }, [synthesisData]);

  const handleExport = async (type: 'image' | 'pdf' | 'excel') => {
    if (!contentRef.current) return;
    setExporting(type);
    
    const dateStr = new Date().toISOString().split('T')[0];

    if (type === 'excel') {
      try {
        const excelData: any[] = [];
        // Header
        excelData.push(["DÉTAIL DES STOCKS - " + dateStr]);
        excelData.push([]);
        excelData.push([
          "RÉGION", 
          "SITE", 
          "CGR ADULTE", 
          "CGR PÉDIA.", 
          "CGR NOURRI.", 
          "PLASMA", 
          "PLAQUETTES", 
          "CGR (O+)", 
          "CGR (O-)", 
          "TOTAL"
        ]);

        synthesisData.forEach(region => {
          region.sites.forEach((site: any) => {
            excelData.push([
              region.name,
              site.name,
              site.cgrAdulte,
              site.cgrPedia,
              site.cgrNourri,
              site.plasma,
              site.plaquettes,
              site.oPlus,
              site.oMoins,
              site.total
            ]);
          });
          // Region Total
          excelData.push([
            `TOTAL ${region.name}`,
            "",
            region.totals.cgrAdulte,
            region.totals.cgrPedia,
            region.totals.cgrNourri,
            region.totals.plasma,
            region.totals.plaquettes,
            region.totals.oPlus,
            region.totals.oMoins,
            region.totals.total
          ]);
          excelData.push([]); // Spacer
        });

        // Grand Total
        excelData.push([
          "TOTAL NATIONAL",
          "",
          grandTotals.cgrAdulte,
          grandTotals.cgrPedia,
          grandTotals.cgrNourri,
          grandTotals.plasma,
          grandTotals.plaquettes,
          grandTotals.oPlus,
          grandTotals.oMoins,
          grandTotals.total
        ]);

        const ws = utils.aoa_to_sheet(excelData);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Stocks");
        writeFile(wb, `DETAIL_STOCK_${dateStr}.xlsx`);
      } catch (error) {
        console.error('Excel export failed:', error);
      } finally {
        setExporting(null);
      }
      return;
    }

    // Force a minimum width for the capture to ensure it looks like a desktop report even on mobile
    const originalWidth = contentRef.current.style.width;
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      contentRef.current.style.width = '1200px';
    }

    // Wait for layout adjustment
    await new Promise(res => setTimeout(res, 500));
    
    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1200, // Ensure consistent width for capture
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById('export-container');
          if (el) {
            el.style.padding = '20px';
            el.style.borderRadius = '0px';
            el.style.width = '1200px';
          }
        }
      });
      
      // Restore original width
      if (isMobile) {
        contentRef.current.style.width = originalWidth;
      }

      const imgData = canvas.toDataURL('image/png');
      
      if (type === 'image') {
        const link = document.createElement('a');
        link.download = `DETAIL_STOCK_${dateStr}.png`;
        link.href = imgData;
        link.click();
      } else {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        
        // Calculate the height of one PDF page in terms of canvas pixels
        const pageHeightInCanvasPixels = (imgWidth * pdfHeight) / pdfWidth;
        
        let heightLeft = imgHeight;
        let position = 0;
        
        // Add first page
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, (imgHeight * pdfWidth) / imgWidth);
        heightLeft -= pageHeightInCanvasPixels;
        
        // Add subsequent pages if needed
        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, (imgHeight * pdfWidth) / imgWidth);
          heightLeft -= pageHeightInCanvasPixels;
        }
        
        pdf.save(`DETAIL_STOCK_${dateStr}.pdf`);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-24">
      <StockAlert data={data} />
      {/* Export Controls */}
      <div className="flex justify-end gap-3 mb-2 no-print">
        <button 
          onClick={() => handleExport('excel')} 
          disabled={!!exporting}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[12px] font-black uppercase hover:bg-emerald-700 transition-all shadow-lg disabled:opacity-50"
        >
          {exporting === 'excel' ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
          Exporter EXCEL
        </button>
        <button 
          onClick={() => handleExport('image')} 
          disabled={!!exporting}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[12px] font-black uppercase hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
        >
          {exporting === 'image' ? <Loader2 size={14} className="animate-spin" /> : <FileImage size={14} />}
          Exporter PNG
        </button>
        <button 
          onClick={() => handleExport('pdf')} 
          disabled={!!exporting}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[12px] font-black uppercase hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50"
        >
          {exporting === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
          Exporter PDF (A4)
        </button>
      </div>

      <div ref={contentRef} id="export-container" className="space-y-6 bg-white p-1 rounded-[2rem]">
        {/* Header matching the image style but with stock info */}
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center border border-slate-100 shadow-lg overflow-hidden">
            <img src={branding?.logo} alt="Logo" className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
          </div>
          <div>
            <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-800">Détail des Stocks</h2>
            <p className="text-[14px] font-black text-slate-400 uppercase tracking-widest">Situation au {new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex gap-4 flex-wrap justify-center md:justify-end">
          <div className="bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 text-center min-w-[140px]">
            <p className="text-[12px] font-black text-slate-400 uppercase mb-1">Stock Total</p>
            <p className="text-3xl font-black text-slate-900">{grandTotals.total.toLocaleString()}</p>
          </div>
          <div className="bg-blue-600 px-6 py-3 rounded-2xl text-center min-w-[140px] shadow-lg shadow-blue-200">
            <p className="text-[12px] font-black text-white/60 uppercase mb-1">TOTAL CGR</p>
            <p className="text-3xl font-black text-white">{(grandTotals.cgrAdulte + grandTotals.cgrPedia + grandTotals.cgrNourri).toLocaleString()}</p>
          </div>
          <div className="bg-blue-50 px-6 py-3 rounded-2xl border border-blue-100 text-center min-w-[140px]">
            <p className="text-[12px] font-black text-blue-400 uppercase mb-1">Total CGR O+</p>
            <p className="text-3xl font-black text-blue-600">{grandTotals.oPlus.toLocaleString()}</p>
          </div>
          <div className="bg-red-50 px-6 py-3 rounded-2xl border border-red-100 text-center min-w-[140px]">
            <p className="text-[12px] font-black text-red-400 uppercase mb-1">Total CGR O-</p>
            <p className="text-3xl font-black text-red-600">{grandTotals.oMoins.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Table following the image layout */}
      <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[14px] font-black uppercase tracking-widest">
                <th className="px-4 py-6 text-left border-r border-white/10">PRES / RÉGION</th>
                <th className="px-4 py-6 text-left border-r border-white/10">LIBELLÉ SITE</th>
                <th className="px-2 py-6 text-center border-r border-white/10">CGR ADULTE</th>
                <th className="px-2 py-6 text-center border-r border-white/10">CGR PÉDIA.</th>
                <th className="px-2 py-6 text-center border-r border-white/10">CGR NOURRI.</th>
                <th className="px-2 py-6 text-center border-r border-white/10">PLASMA</th>
                <th className="px-2 py-6 text-center border-r border-white/10">PLAQUETTES</th>
                <th className="px-2 py-6 text-center border-r border-white/10">CGR (O+)</th>
                <th className="px-2 py-6 text-center border-r border-white/10">CGR (O-)</th>
                <th className="px-4 py-6 text-center">TOTAL</th>
              </tr>
            </thead>
            <tbody className="text-[15px] font-bold text-slate-700">
              {synthesisData.map((region) => (
                <React.Fragment key={region.name}>
                  {region.sites.map((site: any, idx: number) => (
                    <tr key={site.name} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} border-b border-slate-100 hover:bg-blue-50/30 transition-colors`}>
                      {idx === 0 && (
                        <td 
                          rowSpan={region.sites.length + 1} 
                          className="px-6 py-4 font-black text-slate-900 bg-slate-50/50 border-r border-slate-200 align-middle text-center"
                          style={{ width: '200px', minWidth: '200px' }}
                        >
                          <div className="flex flex-col items-center gap-3">
                            <MapPin size={24} className="text-blue-600" />
                            <span className="uppercase tracking-normal leading-tight text-[15px] break-words">{region.name}</span>
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-3 border-r border-slate-100 uppercase tracking-tighter">
                        <div className="flex items-center gap-2">
                          <ChevronRight size={12} className="text-slate-300" />
                          {site.name}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-center border-r border-slate-100 font-black">{site.cgrAdulte || '-'}</td>
                      <td className="px-2 py-3 text-center border-r border-slate-100 font-black">{site.cgrPedia || '-'}</td>
                      <td className="px-2 py-3 text-center border-r border-slate-100 font-black">{site.cgrNourri || '-'}</td>
                      <td className="px-2 py-3 text-center border-r border-slate-100 font-black">{site.plasma || '-'}</td>
                      <td className="px-2 py-3 text-center border-r border-slate-100 font-black">{site.plaquettes || '-'}</td>
                      <td className="px-2 py-3 text-center border-r border-slate-100 font-black text-blue-600">{site.oPlus || '-'}</td>
                      <td className="px-2 py-3 text-center border-r border-slate-100 font-black text-red-600">{site.oMoins || '-'}</td>
                      <td className="px-4 py-3 text-center font-black bg-slate-50/50">{site.total.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100/80 font-black text-slate-900 border-b border-slate-200">
                    <td className="px-4 py-4 text-right uppercase tracking-widest text-[15px]">TOTAL {region.name}</td>
                    <td className="px-2 py-4 text-center border-r border-slate-200 text-[16px]">{region.totals.cgrAdulte.toLocaleString()}</td>
                    <td className="px-2 py-4 text-center border-r border-slate-200 text-[16px]">{region.totals.cgrPedia.toLocaleString()}</td>
                    <td className="px-2 py-4 text-center border-r border-slate-200 text-[16px]">{region.totals.cgrNourri.toLocaleString()}</td>
                    <td className="px-2 py-4 text-center border-r border-slate-200 text-[16px]">{region.totals.plasma.toLocaleString()}</td>
                    <td className="px-2 py-4 text-center border-r border-slate-200 text-[16px]">{region.totals.plaquettes.toLocaleString()}</td>
                    <td className="px-2 py-4 text-center border-r border-slate-200 text-blue-700 text-[16px]">{region.totals.oPlus.toLocaleString()}</td>
                    <td className="px-2 py-4 text-center border-r border-slate-200 text-red-700 text-[16px]">{region.totals.oMoins.toLocaleString()}</td>
                    <td className="px-4 py-4 text-center bg-slate-200/50 text-[18px]">{region.totals.total.toLocaleString()}</td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-black uppercase tracking-widest text-[18px]">
                <td colSpan={2} className="px-6 py-8 text-left">TOTAL NATIONAL</td>
                <td className="px-2 py-8 text-center border-r border-white/10">{grandTotals.cgrAdulte.toLocaleString()}</td>
                <td className="px-2 py-8 text-center border-r border-white/10">{grandTotals.cgrPedia.toLocaleString()}</td>
                <td className="px-2 py-8 text-center border-r border-white/10">{grandTotals.cgrNourri.toLocaleString()}</td>
                <td className="px-2 py-8 text-center border-r border-white/10">{grandTotals.plasma.toLocaleString()}</td>
                <td className="px-2 py-8 text-center border-r border-white/10">{grandTotals.plaquettes.toLocaleString()}</td>
                <td className="px-2 py-8 text-center border-r border-white/10 text-blue-400">{grandTotals.oPlus.toLocaleString()}</td>
                <td className="px-2 py-8 text-center border-r border-white/10 text-red-400">{grandTotals.oMoins.toLocaleString()}</td>
                <td className="px-4 py-8 text-center bg-white/10 text-[22px]">{grandTotals.total.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        </div>
      </div>
    </div>
  );
};
