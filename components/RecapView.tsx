
import React, { useMemo, useState, useRef } from 'react';
import { DashboardData } from '../types';
import { WORKING_DAYS_YEAR, SITES_DATA } from '../constants';
import { ChevronDown, Download, FileImage, FileText, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface RecapViewProps {
  data: DashboardData;
}

const REGION_COLORS: Record<string, string> = {
  "PRES ABIDJAN": "#e2efda",
  "PRES BELIER": "#ffc000",
  "PRES GBEKE": "#d9e1f2",
  "PRES PORO": "#00b0f0",
  "PRES INDENIE DJUABLIN": "#acb9ca",
  "PRES GONTOUGO": "#92d050",
  "PRES HAUT SASSANDRA": "#ffff00",
  "PRES SAN-PEDRO": "#00b050",
  "PRES TONPKI": "#ed7d31",
  "PRES KABADOUGOU": "#c00000"
};

const countWorkingDaysPassed = (dateStr: string): number => {
  if (!dateStr) return 0;
  const [d, m, y] = dateStr.split('/').map(Number);
  const startOfMonth = new Date(y, m - 1, 1);
  const currentDay = new Date(y, m - 1, d);
  let count = 0;
  let cur = new Date(startOfMonth);
  while (cur <= currentDay) {
    if (cur.getDay() !== 0) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

const totalWorkingDaysInMonth = (dateStr: string): number => {
  if (!dateStr) return 0;
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

  const workingDaysPassed = useMemo(() => countWorkingDaysPassed(selectedDate), [selectedDate]);
  const totalDaysMonth = useMemo(() => totalWorkingDaysInMonth(selectedDate), [selectedDate]);

  const dailyRecord = useMemo(() => 
    data.dailyHistory.find(h => h.date === selectedDate)
  , [selectedDate, data.dailyHistory]);

  const formattedData = useMemo(() => {
    return data.regions.map(region => {
      const regionSites = region.sites.map(site => {
        const siteBase = SITES_DATA.find(s => s.name.toUpperCase() === site.name.toUpperCase());
        const siteDaily = dailyRecord?.sites.find(s => s.name.toUpperCase() === site.name.toUpperCase());
        const fixeJour = siteDaily?.fixe || 0;
        const mobileJour = siteDaily?.mobile || 0;
        const totalJour = fixeJour + mobileJour;

        const [selD, selM, selY] = selectedDate.split('/').map(Number);
        const totalMoisALaDate = data.dailyHistory
          .filter(h => {
            const [hD, hM, hY] = h.date.split('/').map(Number);
            return hY === selY && hM === selM && hD <= selD;
          })
          .reduce((acc, h) => {
            const s = h.sites.find(siteH => siteH.name.toUpperCase() === site.name.toUpperCase());
            return acc + (s?.total || 0);
          }, 0);

        const monthlyObj = siteBase ? Math.round(siteBase.annualObjective / 12) : site.objMensuel;
        const objDate = Math.round((monthlyObj / totalDaysMonth) * workingDaysPassed);
        const achievementDate = objDate > 0 ? (totalMoisALaDate / objDate) * 100 : 0;
        const achievementGlobal = monthlyObj > 0 ? (totalMoisALaDate / monthlyObj) * 100 : 0;

        return {
          ...site,
          fixe: fixeJour,
          mobile: mobileJour,
          totalJour,
          totalMois: totalMoisALaDate,
          objDate,
          objMensuel: monthlyObj,
          achievementDate,
          achievementGlobal
        };
      });

      const totalJourPres = regionSites.reduce((acc, s) => acc + s.totalJour, 0);
      const totalMoisPres = regionSites.reduce((acc, s) => acc + s.totalMois, 0);
      const objDatePres = regionSites.reduce((acc, s) => acc + s.objDate, 0);
      const objMensPres = regionSites.reduce((acc, s) => acc + s.objMensuel, 0);
      const achievementPres = objMensPres > 0 ? (totalMoisPres / objMensPres) * 100 : 0;

      return {
        ...region,
        sites: regionSites,
        totalJourPres,
        totalMoisPres,
        objDatePres,
        objMensPres,
        achievementPres
      };
    });
  }, [data.regions, dailyRecord, workingDaysPassed, totalDaysMonth, selectedDate, data.dailyHistory]);

  const grandTotals = useMemo(() => {
    const fixed = formattedData.reduce((acc, r) => acc + r.sites.reduce((sacc, s) => sacc + s.fixe, 0), 0);
    const mobile = formattedData.reduce((acc, r) => acc + r.sites.reduce((sacc, s) => sacc + s.mobile, 0), 0);
    const totalJour = fixed + mobile;
    const totalMois = formattedData.reduce((acc, r) => acc + r.totalMoisPres, 0);
    const objDate = formattedData.reduce((acc, r) => acc + r.objDatePres, 0);
    const objMens = formattedData.reduce((acc, r) => acc + r.objMensPres, 0);
    const achievementDate = objDate > 0 ? (totalMois / objDate) * 100 : 0;
    const achievementGlobal = objMens > 0 ? (totalMois / objMens) * 100 : 0;

    return { fixed, mobile, totalJour, totalMois, objDate, objMens, achievementDate, achievementGlobal };
  }, [formattedData]);

  const handleExportImage = async () => {
    if (!recapRef.current) return;
    setExporting('image');
    try {
      const canvas = await html2canvas(recapRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `RECAP_CNTS_${selectedDate.replace(/\//g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error("Erreur export image:", err);
    } finally {
      setExporting(null);
    }
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
      const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
      const finalWidth = imgWidth * ratio;
      const finalHeight = imgHeight * ratio;
      pdf.addImage(imgData, 'PNG', (pageWidth - finalWidth) / 2, 10, finalWidth, finalHeight);
      pdf.save(`RECAP_CNTS_${selectedDate.replace(/\//g, '-')}.pdf`);
    } catch (err) {
      console.error("Erreur export PDF:", err);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* TOOLBAR EXPORT */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 no-print">
        <div className="flex items-center gap-4 bg-blue-50 p-3 rounded-xl border border-blue-100 w-full md:w-auto">
          <span className="font-black text-blue-800 text-xs uppercase tracking-tighter">PRELEVEMENTS DU :</span>
          <div className="relative inline-block flex-1 md:flex-none">
            <select 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white border border-blue-300 pl-4 pr-10 py-1.5 font-black text-blue-900 text-xs rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 ring-blue-500 w-full"
            >
              {data.dailyHistory.map(h => (
                <option key={h.date} value={h.date}>{h.date}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={handleExportImage}
            disabled={!!exporting}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            {exporting === 'image' ? <Loader2 size={16} className="animate-spin" /> : <FileImage size={16} />}
            Image
          </button>
          <button 
            onClick={handleExportPDF}
            disabled={!!exporting}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50"
          >
            {exporting === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            PDF
          </button>
        </div>
      </div>

      <div ref={recapRef} className="bg-white p-4 lg:p-10 shadow-sm border border-slate-200 overflow-x-auto min-h-screen">
        {/* HEADER PROFESSIONNEL */}
        <div className="flex justify-between items-start mb-8 border-b-2 border-slate-900 pb-6">
          <div className="space-y-1">
            <p className="font-bold text-sm">Centre National de Transfusion</p>
            <p className="font-bold text-sm">Sanguine de Côte d'Ivoire -CNTSCI</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">T. PRELV ANNUEL</p>
            <p className="text-4xl font-black text-red-600">{data.annual.realized.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-sm">Dernière mise à jour : <span className="text-red-600">{data.date}</span></p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-blue-50 p-3 border-x border-t border-blue-200 mb-0">
          <span className="font-black text-blue-800 text-xs">PRELEVEMENTS DU :</span>
          <span className="font-black text-blue-900 text-xs px-4 py-1 bg-white border border-blue-200 rounded">{selectedDate}</span>
        </div>

        {/* TABLEAU RÉCAPITULATIF */}
        <table className="w-full border-collapse border border-slate-800 text-[10px] font-bold">
          <thead>
            <tr className="bg-slate-50 text-slate-800">
              <th className="border border-slate-800 p-2 w-24">PRES</th>
              <th className="border border-slate-800 p-2">LIBELLE</th>
              <th className="border border-slate-800 p-2 w-16">FIXE</th>
              <th className="border border-slate-800 p-2 w-16">MOBILE</th>
              <th className="border border-slate-800 p-2 w-20">TOTAL JOUR</th>
              <th className="border border-slate-800 p-2 w-20">TOTAL JOUR/PRES</th>
              <th className="border border-slate-800 p-2 w-20">TOTAL MOIS</th>
              <th className="border border-slate-800 p-2 w-20">TOTAL MOIS/PRES</th>
              <th className="border border-slate-800 p-2 w-24 uppercase">OBJ DATE AU {selectedDate.split('/')[0]} {data.month}</th>
              <th className="border border-slate-800 p-2 w-20 uppercase">% D'ATTEINTE AU {selectedDate.split('/')[0]} {data.month}</th>
              <th className="border border-slate-800 p-2 w-24">OBJECTIF MENSUEL</th>
              <th className="border border-slate-800 p-2 w-24">OBJECTIF MENS/PRES</th>
              <th className="border border-slate-800 p-2 w-20">% D'ATTEINTE DE L'OBJECTIF</th>
              <th className="border border-slate-800 p-2 w-24">OBJECTIF PRES</th>
            </tr>
          </thead>
          <tbody>
            {formattedData.map((region, rIdx) => (
              <React.Fragment key={rIdx}>
                {region.sites.map((site, sIdx) => (
                  <tr key={`${rIdx}-${sIdx}`} className="hover:bg-slate-50 transition-colors">
                    {sIdx === 0 && (
                      <td 
                        rowSpan={region.sites.length} 
                        className="border border-slate-800 p-2 text-center align-middle font-black"
                        style={{ backgroundColor: REGION_COLORS[region.name] || '#ffffff', transform: 'rotate(-180deg)', writingMode: 'vertical-rl' }}
                      >
                        {region.name}
                      </td>
                    )}
                    <td className="border border-slate-800 p-2 uppercase" style={{ backgroundColor: sIdx % 2 === 0 ? '#f2f2f2' : '#ffffff' }}>
                      {site.name}
                    </td>
                    <td className="border border-slate-800 p-2 text-center" style={{ backgroundColor: '#e2efda' }}>{site.fixe > 0 ? site.fixe : '-'}</td>
                    <td className="border border-slate-800 p-2 text-center" style={{ backgroundColor: '#e2efda' }}>{site.mobile > 0 ? site.mobile : '-'}</td>
                    <td className="border border-slate-800 p-2 text-center font-black" style={{ backgroundColor: '#e2efda' }}>{site.totalJour > 0 ? site.totalJour : '-'}</td>
                    
                    {sIdx === 0 && (
                      <td 
                        rowSpan={region.sites.length} 
                        className="border border-slate-800 p-2 text-center align-middle font-black"
                        style={{ backgroundColor: REGION_COLORS[region.name] || '#ffffff' }}
                      >
                        {region.totalJourPres}
                      </td>
                    )}

                    <td className="border border-slate-800 p-2 text-center" style={{ backgroundColor: '#c6e0b4' }}>{site.totalMois.toLocaleString()}</td>

                    {sIdx === 0 && (
                      <td 
                        rowSpan={region.sites.length} 
                        className="border border-slate-800 p-2 text-center align-middle font-black"
                        style={{ backgroundColor: REGION_COLORS[region.name] || '#ffffff' }}
                      >
                        {region.totalMoisPres.toLocaleString()}
                      </td>
                    )}

                    <td className="border border-slate-800 p-2 text-center" style={{ backgroundColor: '#fff2cc' }}>{site.objDate.toLocaleString()}</td>
                    <td className="border border-slate-800 p-2 text-center" style={{ backgroundColor: '#fff2cc' }}>{site.achievementDate.toFixed(2)}%</td>
                    <td className="border border-slate-800 p-2 text-center" style={{ backgroundColor: '#ffffff' }}>{site.objMensuel.toLocaleString()}</td>

                    {sIdx === 0 && (
                      <td 
                        rowSpan={region.sites.length} 
                        className="border border-slate-800 p-2 text-center align-middle font-black"
                        style={{ backgroundColor: REGION_COLORS[region.name] || '#ffffff' }}
                      >
                        {region.objMensPres.toLocaleString()}
                      </td>
                    )}

                    <td className="border border-slate-800 p-2 text-center" style={{ backgroundColor: '#e2efda' }}>{site.achievementGlobal.toFixed(2)}%</td>

                    {sIdx === 0 && (
                      <td 
                        rowSpan={region.sites.length} 
                        className="border border-slate-800 p-2 text-center align-middle font-black"
                        style={{ backgroundColor: REGION_COLORS[region.name] || '#ffffff' }}
                      >
                        {region.achievementPres.toFixed(2)}%
                      </td>
                    )}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-200 text-slate-900 font-black">
              <td colSpan={2} className="border border-slate-800 p-3 text-center uppercase text-base">TOTAL</td>
              <td className="border border-slate-800 p-3 text-center text-sm">{grandTotals.fixed.toLocaleString()}</td>
              <td className="border border-slate-800 p-3 text-center text-sm">{grandTotals.mobile.toLocaleString()}</td>
              <td className="border border-slate-800 p-3 text-center text-sm" style={{ backgroundColor: '#ff0000', color: '#ffffff' }}>{grandTotals.totalJour.toLocaleString()}</td>
              <td className="border border-slate-800 p-3 text-center text-sm" style={{ backgroundColor: '#ff0000', color: '#ffffff' }}>{grandTotals.totalJour.toLocaleString()}</td>
              <td className="border border-slate-800 p-3 text-center text-sm">{grandTotals.totalMois.toLocaleString()}</td>
              <td className="border border-slate-800 p-3 text-center text-sm">{grandTotals.totalMois.toLocaleString()}</td>
              <td className="border border-slate-800 p-3 text-center text-sm">{grandTotals.objDate.toLocaleString()}</td>
              <td className="border border-slate-800 p-3 text-center text-sm">{grandTotals.achievementDate.toFixed(2)}%</td>
              <td className="border border-slate-800 p-3 text-center text-sm">{grandTotals.objMens.toLocaleString()}</td>
              <td className="border border-slate-800 p-3 text-center text-sm">{grandTotals.objMens.toLocaleString()}</td>
              <td className="border border-slate-800 p-3 text-center text-sm">{grandTotals.achievementGlobal.toFixed(2)}%</td>
              <td className="border border-slate-800 p-3 text-center text-sm">{grandTotals.achievementGlobal.toFixed(2)}%</td>
            </tr>
          </tfoot>
        </table>
        
        <div className="mt-8 text-[10px] italic text-slate-400">
          Note: Ce récapitulatif consolide l'ensemble des flux par Pôle Régional de Santé (PRES). Les objectifs sont proratisés selon les jours ouvrés passés à la date sélectionnée ({selectedDate}). Document généré via cockpit DSDSUIVI.
        </div>
      </div>
    </div>
  );
};
