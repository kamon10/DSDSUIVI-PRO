
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { DashboardData } from '../types';
import { WORKING_DAYS_YEAR, SITES_DATA } from '../constants';
import { ChevronDown, FileImage, FileText, Loader2, TableProperties, AlertCircle } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface RecapViewProps {
  data: DashboardData;
}

const REGION_COLORS: Record<string, string> = {
  "PRES ABIDJAN": "#e2efda", 
  "PRES BELIER": "#fff2cc",  
  "PRES GBEKE": "#d9e1f2",   
  "PRES PORO": "#daeef3",    
  "PRES INDENIE DJUABLIN": "#e7e6e6", 
  "PRES GONTOUGO": "#ebf1de", 
  "PRES HAUT SASSANDRA": "#ffffcc", 
  "PRES SAN-PEDRO": "#d8e4bc", 
  "PRES TONPKI": "#fbe5d6",    
  "PRES KABADOUGOU": "#fee5e5", 
  "AUTRES SITES": "#f2f2f2"    
};

const isValidDate = (s: string) => {
  if (!s || s === "---") return false;
  const parts = s.split('/');
  return parts.length === 3;
};

const totalWorkingDaysInMonth = (dateStr: string): number => {
  if (!isValidDate(dateStr)) return 0;
  const [d, m, y] = dateStr.split('/').map(Number);
  const startOfMonth = new Date(y, m - 1, 1);
  const endOfMonth = new Date(y, m, 0);
  let count = 0;
  let cur = new Date(startOfMonth);
  while (cur <= endOfMonth) {
    if (cur.getDay() !== 0) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

export const RecapView: React.FC<RecapViewProps> = ({ data }) => {
  const [selectedDate, setSelectedDate] = useState(data.date);
  const [exporting, setExporting] = useState<'image' | 'pdf' | null>(null);
  const recapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (data.date && data.date !== "---") {
      setSelectedDate(data.date);
    }
  }, [data.date]);

  const totalDaysMonth = useMemo(() => totalWorkingDaysInMonth(selectedDate), [selectedDate]);

  const dailyRecord = useMemo(() => 
    data.dailyHistory.find(h => h.date === selectedDate)
  , [selectedDate, data.dailyHistory]);

  const formattedData = useMemo(() => {
    if (!isValidDate(selectedDate)) return [];

    const [selD, selM, selY] = selectedDate.split('/').map(Number);

    return data.regions.map(region => {
      const regionSites = region.sites.map(site => {
        const siteDaily = dailyRecord?.sites.find(s => 
          s.name.trim().toUpperCase() === site.name.trim().toUpperCase()
        );
        
        const fixeJour = siteDaily?.fixe || 0;
        const mobileJour = siteDaily?.mobile || 0;
        const totalJour = siteDaily?.total || (fixeJour + mobileJour);

        // Calcul précis du cumul mois jusqu'à la date sélectionnée
        const totalMoisALaDate = data.dailyHistory
          .filter(h => {
            const [hD, hM, hY] = h.date.split('/').map(Number);
            return hY === selY && hM === selM && hD <= selD;
          })
          .reduce((acc, h) => {
            const s = h.sites.find(siteH => 
              siteH.name.trim().toUpperCase() === site.name.trim().toUpperCase()
            );
            return acc + (s?.total || 0);
          }, 0);

        const monthlyObj = site.objMensuel;
        const achievementGlobal = monthlyObj > 0 ? (totalMoisALaDate / monthlyObj) * 100 : 0;

        return {
          ...site,
          fixe: fixeJour,
          mobile: mobileJour,
          totalJour,
          totalMois: totalMoisALaDate,
          achievementGlobal
        };
      });

      return {
        ...region,
        sites: regionSites,
        totalJourPres: regionSites.reduce((acc, s) => acc + s.totalJour, 0),
        totalMoisPres: regionSites.reduce((acc, s) => acc + s.totalMois, 0),
        objMensPres: regionSites.reduce((acc, s) => acc + s.objMensuel, 0),
        fixePres: regionSites.reduce((acc, s) => acc + s.fixe, 0),
        mobilePres: regionSites.reduce((acc, s) => acc + s.mobile, 0)
      };
    });
  }, [data.regions, dailyRecord, selectedDate, data.dailyHistory]);

  const grandTotals = useMemo(() => {
    if (formattedData.length === 0) return null;
    
    const fixed = formattedData.reduce((acc, r) => acc + r.fixePres, 0);
    const mobile = formattedData.reduce((acc, r) => acc + r.mobilePres, 0);
    const totalJour = fixed + mobile;
    const totalMois = formattedData.reduce((acc, r) => acc + r.totalMoisPres, 0);
    const objMens = formattedData.reduce((acc, r) => acc + r.objMensPres, 0);
    const achievementGlobal = objMens > 0 ? (totalMois / objMens) * 100 : 0;

    return { fixed, mobile, totalJour, totalMois, objMens, achievementGlobal };
  }, [formattedData]);

  const handleExportImage = async () => {
    if (!recapRef.current) return;
    setExporting('image');
    try {
      const canvas = await html2canvas(recapRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `DETAIL_PRELEVEMENTS_CNTS_${selectedDate.replace(/\//g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) { console.error(err); } finally { setExporting(null); }
  };

  const handleExportPDF = async () => {
    if (!recapRef.current) return;
    setExporting('pdf');
    try {
      const canvas = await html2canvas(recapRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pageWidth / imgWidth, (pageHeight - 20) / imgHeight);
      const finalWidth = imgWidth * ratio;
      const finalHeight = imgHeight * ratio;
      pdf.addImage(imgData, 'PNG', (pageWidth - finalWidth) / 2, 10, finalWidth, finalHeight);
      pdf.save(`DETAIL_PRELEVEMENTS_CNTS_${selectedDate.replace(/\//g, '-')}.pdf`);
    } catch (err) { console.error(err); } finally { setExporting(null); }
  };

  if (!grandTotals) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
              <TableProperties size={24} />
           </div>
           <div>
              <h3 className="text-xl font-black uppercase tracking-tighter">Tableau Récapitulatif</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consolidation à la date du prélèvement</p>
           </div>
        </div>

        <div className="flex items-center gap-4 bg-blue-50 p-3 rounded-xl border border-blue-100 w-full md:w-auto">
          <span className="font-black text-blue-800 text-[10px] uppercase tracking-widest">SÉLECTION :</span>
          <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-white border border-blue-300 px-4 py-2 font-black text-blue-900 text-xs rounded-lg outline-none cursor-pointer">
            {data.dailyHistory.map(h => <option key={h.date} value={h.date}>{h.date}</option>)}
          </select>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={handleExportImage} disabled={!!exporting} className="flex-1 px-6 py-4 bg-slate-100 text-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 transition-all">
            {exporting === 'image' ? <Loader2 size={16} className="animate-spin" /> : <FileImage size={18} />} IMAGE
          </button>
          <button onClick={handleExportPDF} disabled={!!exporting} className="flex-1 px-6 py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-100">
            {exporting === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={18} />} PDF
          </button>
        </div>
      </div>

      <div ref={recapRef} className="bg-white p-6 lg:p-12 border border-slate-200 shadow-2xl overflow-x-auto rounded-[2rem]">
        <div className="flex justify-between items-end mb-8 border-b-4 border-slate-900 pb-8">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter leading-none mb-2">DETAIL PRELEVEMENTS</h1>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Cockpit de Pilotage - CNTS Côte d'Ivoire</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">DATA DU</p>
            <p className="text-2xl font-black text-slate-900">{selectedDate}</p>
          </div>
        </div>

        <table className="w-full border-collapse border-2 border-slate-800 text-[11px] font-bold">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="border-2 border-slate-800 p-3 uppercase">PRES / Région</th>
              <th className="border-2 border-slate-800 p-3 uppercase">Libellé Site</th>
              <th className="border-2 border-slate-800 p-3 uppercase">Nombre Fixe</th>
              <th className="border-2 border-slate-800 p-3 uppercase">Nombre Mobile</th>
              <th className="border-2 border-slate-800 p-3 uppercase">Total Jour</th>
              <th className="border-2 border-slate-800 p-3 uppercase">Cumul Mois</th>
              <th className="border-2 border-slate-800 p-3 uppercase">Obj. Mensuel</th>
              <th className="border-2 border-slate-800 p-3 uppercase">Atteinte (%)</th>
            </tr>
          </thead>
          <tbody>
            {formattedData.map((region, rIdx) => {
              const regionColor = REGION_COLORS[region.name] || '#ffffff';
              return (
                <React.Fragment key={rIdx}>
                  {region.sites.map((site, sIdx) => (
                    <tr key={`${rIdx}-${sIdx}`} style={{ backgroundColor: regionColor }} className="hover:brightness-95 transition-all">
                      {sIdx === 0 && (
                        <td rowSpan={region.sites.length + 1} className="border-2 border-slate-800 p-3 text-center align-middle font-black uppercase text-[12px]">
                          {region.name}
                        </td>
                      )}
                      <td className="border-2 border-slate-800 p-3 uppercase">{site.name}</td>
                      <td className="border-2 border-slate-800 p-3 text-center">{site.fixe.toLocaleString()}</td>
                      <td className="border-2 border-slate-800 p-3 text-center">{site.mobile.toLocaleString()}</td>
                      <td className="border-2 border-slate-800 p-3 text-center font-black bg-white/30">{site.totalJour.toLocaleString()}</td>
                      <td className="border-2 border-slate-800 p-3 text-center">{site.totalMois.toLocaleString()}</td>
                      <td className="border-2 border-slate-800 p-3 text-center bg-black/5">
                        {site.objMensuel.toLocaleString()}
                      </td>
                      <td className="border-2 border-slate-800 p-3 text-center font-black">
                        {site.achievementGlobal.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                  {/* Sous-total Région */}
                  <tr style={{ backgroundColor: regionColor }} className="font-black brightness-90">
                    <td className="border-2 border-slate-800 p-3 uppercase text-right">TOTAL {region.name}</td>
                    <td className="border-2 border-slate-800 p-3 text-center">{region.fixePres.toLocaleString()}</td>
                    <td className="border-2 border-slate-800 p-3 text-center">{region.mobilePres.toLocaleString()}</td>
                    <td className="border-2 border-slate-800 p-3 text-center bg-white/40">{region.totalJourPres.toLocaleString()}</td>
                    <td className="border-2 border-slate-800 p-3 text-center">{region.totalMoisPres.toLocaleString()}</td>
                    <td className="border-2 border-slate-800 p-3 text-center bg-black/5">{region.objMensPres.toLocaleString()}</td>
                    <td className="border-2 border-slate-800 p-3 text-center text-blue-800">
                      {region.objMensPres > 0 ? ((region.totalMoisPres / region.objMensPres) * 100).toFixed(1) : "0.0"}%
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-900 text-white font-black text-[13px]">
            <tr>
              <td colSpan={2} className="border-2 border-slate-800 p-5 text-center uppercase tracking-widest">TOTAL NATIONAL CONSOLIDÉ</td>
              <td className="border-2 border-slate-800 p-5 text-center">{grandTotals.fixed.toLocaleString()}</td>
              <td className="border-2 border-slate-800 p-5 text-center">{grandTotals.mobile.toLocaleString()}</td>
              <td className="border-2 border-slate-800 p-5 text-center text-red-400 bg-white/5">{grandTotals.totalJour.toLocaleString()}</td>
              <td className="border-2 border-slate-800 p-5 text-center">{grandTotals.totalMois.toLocaleString()}</td>
              <td className="border-2 border-slate-800 p-5 text-center bg-white/10">
                {grandTotals.objMens.toLocaleString()}
              </td>
              <td className="border-2 border-slate-800 p-5 text-center text-emerald-400 text-[15px]">
                {grandTotals.achievementGlobal.toFixed(2)}%
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-8 flex justify-between items-center opacity-40 italic">
          <p className="text-[9px] font-black uppercase tracking-[0.4em]">DSDSUIVI PRO - Direction du Système d'Information</p>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-slate-900 rounded-full"></div>
            <p className="text-[9px] font-black uppercase tracking-widest">Document Certifié CNTS</p>
          </div>
        </div>
      </div>
    </div>
  );
};
