
import React, { useMemo, useState, useRef } from 'react';
import { DashboardData } from '../types';
import { SITES_DATA } from '../constants';
import { Truck, MapPin, ChevronRight, FileImage, FileText, Loader2, PackageOpen, Calendar as CalendarIcon, Filter, FileSpreadsheet } from 'lucide-react';
import { domToPng } from 'modern-screenshot';
import { jsPDF } from 'jspdf';
import { utils, writeFile } from 'xlsx';
import DatePicker, { registerLocale } from "react-datepicker";
import { fr } from 'date-fns/locale';
import "react-datepicker/dist/react-datepicker.css";

registerLocale('fr', fr);

interface DistributionDetailedSynthesisViewProps {
  data: DashboardData;
  branding?: { logo: string; hashtag: string };
}

type FilterType = 'all' | 'day' | 'month' | 'year' | 'period';

export const DistributionDetailedSynthesisView: React.FC<DistributionDetailedSynthesisViewProps> = ({ data, branding }) => {
  const [exporting, setExporting] = useState<'image' | 'pdf' | 'excel' | null>(null);
  const today = new Date().toISOString().split('T')[0];
  
  const [filterType, setFilterType] = useState<FilterType>('day');
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const contentRef = useRef<HTMLDivElement>(null);
  const distributions = data.distributions?.records || [];

  const filteredDistributions = useMemo(() => {
    return distributions.filter(d => {
      // d.date is in DD/MM/YYYY format from googleSheetService.ts
      const parts = d.date.split('/');
      if (parts.length !== 3) return false;
      
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const dDate = new Date(year, month, day);
      dDate.setHours(0, 0, 0, 0);
      
      if (isNaN(dDate.getTime())) return false;

      if (filterType === 'all') return true;

      if (filterType === 'day') {
        const [sY, sM, sD] = selectedDate.split('-').map(Number);
        const target = new Date(sY, sM - 1, sD);
        target.setHours(0, 0, 0, 0);
        return dDate.getTime() === target.getTime();
      }

      if (filterType === 'month') {
        const [sY, sM] = selectedMonth.split('-').map(Number);
        return dDate.getFullYear() === sY && dDate.getMonth() === (sM - 1);
      }

      if (filterType === 'year') {
        return dDate.getFullYear() === selectedYear;
      }

      if (filterType === 'period') {
        // Parse YYYY-MM-DD from inputs manually to avoid UTC/Local confusion
        const [sY, sM, sD] = startDate.split('-').map(Number);
        const start = new Date(sY, sM - 1, sD);
        start.setHours(0, 0, 0, 0);

        const [eY, eM, eD] = endDate.split('-').map(Number);
        const end = new Date(eY, eM - 1, eD);
        end.setHours(23, 59, 59, 999);

        return dDate >= start && dDate <= end;
      }

      return true;
    });
  }, [distributions, filterType, selectedDate, selectedMonth, selectedYear, startDate, endDate]);

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

      const siteDist = filteredDistributions.filter(d => normalize(d.site) === normalize(siteBase.name));

      const stats = {
        name: siteBase.name,
        cgrAdulte: siteDist.filter(d => {
          const t = normalize(d.typeProduit);
          return t.includes('CGR') && (t.includes('ADULTE') || (!t.includes('PEDIATRIQUE') && !t.includes('NOURRISON')));
        }).reduce((acc, d) => acc + (d.quantite - (d.rendu || 0)), 0),
        cgrPedia: siteDist.filter(d => {
          const t = normalize(d.typeProduit);
          return t.includes('CGR') && t.includes('PEDIATRIQUE');
        }).reduce((acc, d) => acc + (d.quantite - (d.rendu || 0)), 0),
        cgrNourri: siteDist.filter(d => {
          const t = normalize(d.typeProduit);
          return t.includes('CGR') && t.includes('NOURRISON');
        }).reduce((acc, d) => acc + (d.quantite - (d.rendu || 0)), 0),
        plasma: siteDist.filter(d => normalize(d.typeProduit).includes('PLASMA')).reduce((acc, d) => acc + (d.quantite - (d.rendu || 0)), 0),
        plaquettes: siteDist.filter(d => {
          const t = normalize(d.typeProduit);
          return t.includes('PLAQUETTE') || t.includes('PLATELET');
        }).reduce((acc, d) => acc + (d.quantite - (d.rendu || 0)), 0),
        oPlus: siteDist.filter(d => (d.groupeSanguin || "").replace(/\s/g, "").toUpperCase() === 'O+').reduce((acc, d) => acc + (d.quantite - (d.rendu || 0)), 0),
        oMoins: siteDist.filter(d => (d.groupeSanguin || "").replace(/\s/g, "").toUpperCase() === 'O-').reduce((acc, d) => acc + (d.quantite - (d.rendu || 0)), 0),
        total: siteDist.reduce((acc, d) => acc + (d.quantite - (d.rendu || 0)), 0)
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

      // Subtotal Abidjan Ville
      const abidjanVilleSites = [
        "CRTS DE TREICHVILLE",
        "CDTS DE BINGERVILLE",
        "SP HG PORT BOUET",
        "SP FSU ABOBO BAOULE",
        "SP HG ANYAMA",
        "SP CHU DE COCODY",
        "SP CHU DE YOPOUGON"
      ];
      if (regName === "PRES ABIDJAN" && abidjanVilleSites.includes(siteBase.name)) {
        if (!g.abidjanVille) g.abidjanVille = { cgrAdulte: 0, cgrPedia: 0, cgrNourri: 0, plasma: 0, plaquettes: 0, total: 0 };
        g.abidjanVille.cgrAdulte += stats.cgrAdulte;
        g.abidjanVille.cgrPedia += stats.cgrPedia;
        g.abidjanVille.cgrNourri += stats.cgrNourri;
        g.abidjanVille.plasma += stats.plasma;
        g.abidjanVille.plaquettes += stats.plaquettes;
        g.abidjanVille.total += stats.total;
      }
    });

    return Array.from(grouped.values()).filter(g => g.sites.length > 0);
  }, [filteredDistributions]);

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
        excelData.push(["DÉTAIL DES DISTRIBUTIONS - " + dateStr]);
        excelData.push([]);
        excelData.push([
          "RÉGION", 
          "SITE", 
          "CGR ADULTE", 
          "CGR PÉDIA.", 
          "CGR NOURRI.", 
          "PLASMA", 
          "PLAQUETTES", 
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
          grandTotals.total
        ]);

        const ws = utils.aoa_to_sheet(excelData);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Distributions");
        writeFile(wb, `DETAIL_DISTRIBUTION_${dateStr}.xlsx`);
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
      const imgData = await domToPng(contentRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
      });
      
      // Restore original width
      if (isMobile) {
        contentRef.current.style.width = originalWidth;
      }
      
      if (type === 'image') {
        const link = document.createElement('a');
        link.download = `DETAIL_DISTRIBUTION_${dateStr}.png`;
        link.href = imgData;
        link.click();
      } else {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const marginTop = 20;
        const marginBottom = 20;
        const marginSide = 15;
        const contentWidth = pdfWidth - (marginSide * 2);
        const contentHeight = pdfHeight - marginTop - marginBottom;
        
        const img = new Image();
        img.src = imgData;
        await new Promise((resolve) => (img.onload = resolve));

        const logoImg = new Image();
        if (branding?.logo) {
          logoImg.src = branding.logo;
          logoImg.crossOrigin = 'anonymous';
          await new Promise((resolve) => {
            logoImg.onload = resolve;
            logoImg.onerror = resolve;
          });
        }

        const imgWidth = img.width;
        const imgHeight = img.height;
        const imgHeightInPdf = (imgHeight * contentWidth) / imgWidth;
        
        const totalPages = Math.ceil(imgHeightInPdf / contentHeight);

        for (let i = 0; i < totalPages; i++) {
          if (i > 0) pdf.addPage();
          
          const position = marginTop - (i * contentHeight);
          
          pdf.addImage(imgData, 'PNG', marginSide, position, contentWidth, imgHeightInPdf);
          
          pdf.setFillColor(255, 255, 255);
          pdf.rect(0, 0, pdfWidth, marginTop, 'F');
          pdf.rect(0, pdfHeight - marginBottom, pdfWidth, marginBottom, 'F');
          
          // Header
          if (logoImg.complete && logoImg.naturalWidth > 0) {
            try {
              pdf.addImage(logoImg, 'PNG', marginSide, 5, 12, 12);
            } catch (e) {
              console.error('Could not add logo to PDF', e);
            }
          }

          pdf.setFontSize(8);
          pdf.setTextColor(100);
          pdf.setFont('helvetica', 'bold');
          pdf.text('HS COCKPIT v4.0 - DÉTAIL DE LA DISTRIBUTION', logoImg.complete && logoImg.naturalWidth > 0 ? marginSide + 15 : marginSide, 12);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`Généré le ${new Date().toLocaleString()}`, pdfWidth - marginSide, 12, { align: 'right' });
          
          pdf.setDrawColor(240);
          pdf.line(marginSide, pdfHeight - 15, pdfWidth - marginSide, pdfHeight - 15);
          pdf.text(`Document de Référence - ${branding?.hashtag || ''}`, marginSide, pdfHeight - 10);
          pdf.text(`Page ${i + 1} sur ${totalPages}`, pdfWidth - marginSide, pdfHeight - 10, { align: 'right' });
        }
        
        pdf.save(`DETAIL_DISTRIBUTION_${dateStr}.pdf`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Erreur lors de l\'export. Veuillez réessayer.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-24">
      {/* Filters & Export Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 px-3 border-r border-slate-100 mr-1">
            <Filter size={14} className="text-slate-400" />
            <span className="text-[12px] font-black uppercase text-slate-400">Filtrer par</span>
          </div>
          
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value as FilterType)}
            className="bg-slate-50 border-none rounded-lg text-[12px] font-bold uppercase px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">Tout</option>
            <option value="day">Jour</option>
            <option value="month">Mois</option>
            <option value="year">Année</option>
            <option value="period">Période</option>
          </select>

          {filterType === 'day' && (
            <DatePicker
              selected={selectedDate ? new Date(selectedDate) : null}
              onChange={(date: Date | null) => {
                if (date) {
                  const y = date.getFullYear();
                  const m = String(date.getMonth() + 1).padStart(2, '0');
                  const d = String(date.getDate()).padStart(2, '0');
                  setSelectedDate(`${y}-${m}-${d}`);
                }
              }}
              dateFormat="dd/MM/yyyy"
              locale="fr"
              className="bg-slate-50 border-none rounded-lg text-[12px] font-bold px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none w-32"
            />
          )}

          {filterType === 'month' && (
            <DatePicker
              selected={selectedMonth ? new Date(selectedMonth + "-01") : null}
              onChange={(date: Date | null) => {
                if (date) {
                  const y = date.getFullYear();
                  const m = String(date.getMonth() + 1).padStart(2, '0');
                  setSelectedMonth(`${y}-${m}`);
                }
              }}
              dateFormat="MM/yyyy"
              showMonthYearPicker
              locale="fr"
              className="bg-slate-50 border-none rounded-lg text-[12px] font-bold px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none w-32"
            />
          )}

          {filterType === 'year' && (
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-slate-50 border-none rounded-lg text-[12px] font-bold px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          )}

          {filterType === 'period' && (
            <div className="flex items-center gap-2">
              <DatePicker
                selected={startDate ? new Date(startDate) : null}
                onChange={(date: Date | null) => {
                  if (date) {
                    const y = date.getFullYear();
                    const m = String(date.getMonth() + 1).padStart(2, '0');
                    const d = String(date.getDate()).padStart(2, '0');
                    setStartDate(`${y}-${m}-${d}`);
                  }
                }}
                dateFormat="dd/MM/yyyy"
                locale="fr"
                className="bg-slate-50 border-none rounded-lg text-[12px] font-bold px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none w-32"
              />
              <span className="text-[12px] font-black text-slate-300">AU</span>
              <DatePicker
                selected={endDate ? new Date(endDate) : null}
                onChange={(date: Date | null) => {
                  if (date) {
                    const y = date.getFullYear();
                    const m = String(date.getMonth() + 1).padStart(2, '0');
                    const d = String(date.getDate()).padStart(2, '0');
                    setEndDate(`${y}-${m}-${d}`);
                  }
                }}
                dateFormat="dd/MM/yyyy"
                locale="fr"
                className="bg-slate-50 border-none rounded-lg text-[12px] font-bold px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none w-32"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3">
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
      </div>

      <div ref={contentRef} id="export-container-dist" className="space-y-6 bg-white p-1 rounded-[2rem]">
        {/* Header matching the image style but with distribution info */}
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center border border-slate-100 shadow-lg overflow-hidden">
              <img 
                src={branding?.logo} 
                alt="Logo" 
                className="w-full h-full object-contain p-2" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=934812425420904';
                }}
              />
            </div>
            <div>
              <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-800">Détail des Distributions</h2>
              <div className="flex items-center gap-2 mt-1">
                <CalendarIcon size={12} className="text-slate-400" />
                <p className="text-[14px] font-black text-slate-400 uppercase tracking-widest">
                  {filterType === 'all' && "Toutes les données"}
                  {filterType === 'day' && `Journée du ${new Date(selectedDate).toLocaleDateString()}`}
                  {filterType === 'month' && `Mois de ${new Date(selectedMonth + "-01").toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`}
                  {filterType === 'year' && `Année ${selectedYear}`}
                  {filterType === 'period' && `Période du ${new Date(startDate).toLocaleDateString()} au ${new Date(endDate).toLocaleDateString()}`}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 text-center min-w-[140px]">
              <p className="text-[12px] font-black text-slate-400 uppercase mb-1">Distribution Totale</p>
              <p className="text-3xl font-black text-slate-900">{grandTotals.total.toLocaleString()}</p>
            </div>
            <div className="bg-blue-600 px-6 py-3 rounded-2xl text-center min-w-[140px] shadow-lg shadow-blue-200">
              <p className="text-[12px] font-black text-white/60 uppercase mb-1">CGR Adulte</p>
              <p className="text-3xl font-black text-white">{grandTotals.cgrAdulte.toLocaleString()}</p>
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
                  <th className="px-4 py-6 text-center">TOTAL</th>
                </tr>
              </thead>
              <tbody className="text-[15px] font-bold text-slate-700">
                {synthesisData.map((region) => {
                  const abidjanVilleSites = [
                    "CRTS DE TREICHVILLE",
                    "CDTS DE BINGERVILLE",
                    "SP HG PORT BOUET",
                    "SP FSU ABOBO BAOULE",
                    "SP HG ANYAMA",
                    "SP CHU DE COCODY",
                    "SP CHU DE YOPOUGON"
                  ];
                  
                  const isAbidjan = region.name === "PRES ABIDJAN";
                  const abidjanSites = isAbidjan ? region.sites.filter((s: any) => abidjanVilleSites.includes(s.name)) : region.sites;
                  const otherSites = isAbidjan ? region.sites.filter((s: any) => !abidjanVilleSites.includes(s.name)) : [];
                  
                  const rows = [...abidjanSites, ...(isAbidjan ? [{ isSubtotal: true }] : []), ...otherSites];

                  return (
                    <React.Fragment key={region.name}>
                      {rows.map((row: any, idx: number) => {
                        if (row.isSubtotal) {
                          return (
                            <tr key="subtotal-abidjan" className="bg-blue-50/50 font-black text-blue-900 border-b border-blue-100">
                              <td className="px-4 py-4 text-right uppercase tracking-widest text-[13px]">SOUS-TOTAL ABIDJAN VILLE</td>
                              <td className="px-2 py-4 text-center border-r border-blue-100 text-[14px]">{region.abidjanVille.cgrAdulte.toLocaleString()}</td>
                              <td className="px-2 py-4 text-center border-r border-blue-100 text-[14px]">{region.abidjanVille.cgrPedia.toLocaleString()}</td>
                              <td className="px-2 py-4 text-center border-r border-blue-100 text-[14px]">{region.abidjanVille.cgrNourri.toLocaleString()}</td>
                              <td className="px-2 py-4 text-center border-r border-blue-100 text-[14px]">{region.abidjanVille.plasma.toLocaleString()}</td>
                              <td className="px-2 py-4 text-center border-r border-blue-100 text-[14px]">{region.abidjanVille.plaquettes.toLocaleString()}</td>
                              <td className="px-4 py-4 text-center bg-blue-100/50 text-blue-900 text-[15px]">{region.abidjanVille.total.toLocaleString()}</td>
                            </tr>
                          );
                        }

                        const site = row;
                        return (
                          <tr key={site.name} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} border-b border-slate-100 hover:bg-blue-50/30 transition-colors`}>
                            {idx === 0 && (
                              <td 
                                rowSpan={rows.length + 1} 
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
                            <td className="px-4 py-3 text-center font-black bg-slate-50/50">{site.total.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-slate-100/80 font-black text-slate-900 border-b border-slate-200">
                        <td className="px-4 py-4 text-right uppercase tracking-widest text-[15px]">TOTAL {region.name}</td>
                        <td className="px-2 py-4 text-center border-r border-slate-200 text-[16px]">{region.totals.cgrAdulte.toLocaleString()}</td>
                        <td className="px-2 py-4 text-center border-r border-slate-200 text-[16px]">{region.totals.cgrPedia.toLocaleString()}</td>
                        <td className="px-2 py-4 text-center border-r border-slate-200 text-[16px]">{region.totals.cgrNourri.toLocaleString()}</td>
                        <td className="px-2 py-4 text-center border-r border-slate-200 text-[16px]">{region.totals.plasma.toLocaleString()}</td>
                        <td className="px-2 py-4 text-center border-r border-slate-200 text-[16px]">{region.totals.plaquettes.toLocaleString()}</td>
                        <td className="px-4 py-4 text-center bg-slate-200/50 text-[18px]">{region.totals.total.toLocaleString()}</td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-black uppercase tracking-widest text-[18px]">
                  <td colSpan={2} className="px-6 py-8 text-left">TOTAL NATIONAL</td>
                  <td className="px-2 py-8 text-center border-r border-white/10">{grandTotals.cgrAdulte.toLocaleString()}</td>
                  <td className="px-2 py-8 text-center border-r border-white/10">{grandTotals.cgrPedia.toLocaleString()}</td>
                  <td className="px-2 py-8 text-center border-r border-white/10">{grandTotals.cgrNourri.toLocaleString()}</td>
                  <td className="px-2 py-8 text-center border-r border-white/10">{grandTotals.plasma.toLocaleString()}</td>
                  <td className="px-2 py-8 text-center border-r border-white/10">{grandTotals.plaquettes.toLocaleString()}</td>
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
