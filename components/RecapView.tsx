import React, { useMemo, useState, useRef, useEffect } from 'react';
import { DashboardData } from '../types';
import { SITES_DATA } from '../constants';
import { FileImage, FileText, Loader2, TableProperties, Printer, CalendarCheck, BarChart3, Target, Calendar, Filter } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface RecapViewProps {
  data: DashboardData;
}

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

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
  "PRES KABADOUGOU": "#fee5e5"
};

const isValidDate = (s: string) => {
  if (!s || s === "---") return false;
  const parts = s.split('/');
  return parts.length === 3;
};

const getPerfColor = (perc: number) => {
  if (perc > 100) return 'text-emerald-600';
  if (perc === 100) return 'text-orange-500';
  return 'text-red-600';
};

export const RecapView: React.FC<RecapViewProps> = ({ data }) => {
  // 1. Extraction des années disponibles
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    data.dailyHistory.forEach(h => {
      const year = h.date.split('/')[2];
      if (year) years.add(year);
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [data.dailyHistory]);

  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<number>(-1);
  const [selectedDate, setSelectedDate] = useState(data.date);
  
  const [exporting, setExporting] = useState<'image' | 'pdf' | null>(null);
  const recapRef = useRef<HTMLDivElement>(null);

  // Initialisation par rapport à la date la plus récente
  useEffect(() => {
    if (data.date && data.date !== "---" && !selectedYear) {
      const parts = data.date.split('/');
      setSelectedYear(parts[2]);
      setSelectedMonth(parseInt(parts[1]) - 1);
      setSelectedDate(data.date);
    }
  }, [data.date]);

  // Extraction des mois disponibles pour l'année sélectionnée
  const availableMonths = useMemo(() => {
    if (!selectedYear) return [];
    const months = new Set<number>();
    data.dailyHistory.forEach(h => {
      const parts = h.date.split('/');
      if (parts[2] === selectedYear) {
        months.add(parseInt(parts[1]) - 1);
      }
    });
    return Array.from(months).sort((a, b) => a - b);
  }, [data.dailyHistory, selectedYear]);

  // Filtrage des dates de situation (jours) disponibles pour le couple Année/Mois
  const filteredDates = useMemo(() => {
    return data.dailyHistory.filter(h => {
      const parts = h.date.split('/');
      return parts[2] === selectedYear && (parseInt(parts[1]) - 1) === selectedMonth;
    }).map(h => h.date);
  }, [data.dailyHistory, selectedYear, selectedMonth]);

  // Ajustement automatique de la date quand on change de mois
  useEffect(() => {
    if (filteredDates.length > 0 && !filteredDates.includes(selectedDate)) {
      setSelectedDate(filteredDates[0]);
    }
  }, [filteredDates, selectedDate]);

  const dailyRecord = useMemo(() => 
    data.dailyHistory.find(h => h.date === selectedDate)
  , [selectedDate, data.dailyHistory]);

  const formattedData = useMemo(() => {
    if (!isValidDate(selectedDate)) return [];
    const [selD, selM, selY] = selectedDate.split('/').map(Number);
    const isCurrentLatest = selectedDate === data.date;

    const getSitePriority = (name: string) => {
      const n = name.toUpperCase();
      if (n.startsWith('CRTS')) return 1;
      if (n.startsWith('CDTS')) return 2;
      if (n.startsWith('SP')) return 3;
      return 4;
    };

    return data.regions.map(region => {
      const sortedBaseSites = [...region.sites].sort((a, b) => {
        const pA = getSitePriority(a.name);
        const pB = getSitePriority(b.name);
        if (pA !== pB) return pA - pB;
        return a.name.localeCompare(b.name);
      });

      const regionSites = sortedBaseSites.map(site => {
        if (isCurrentLatest) {
          const achievementGlobal = site.objMensuel > 0 ? (site.totalMois / site.objMensuel) * 100 : 0;
          return {
            ...site,
            fixe: site.fixe,
            mobile: site.mobile,
            totalJour: site.totalJour,
            totalMois: site.totalMois,
            achievementGlobal
          };
        }

        const siteDaily = dailyRecord?.sites.find(s => 
          s.name.trim().toUpperCase() === site.name.trim().toUpperCase()
        );
        
        const fixeJour = siteDaily?.fixe || 0;
        const mobileJour = siteDaily?.mobile || 0;
        const totalJour = siteDaily?.total || (fixeJour + mobileJour);

        // Recalcul du cumul mensuel arrêté au jour choisi
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
  }, [data.regions, dailyRecord, selectedDate, data.dailyHistory, data.date]);

  const grandTotals = useMemo(() => {
    if (formattedData.length === 0 || !isValidDate(selectedDate)) return null;
    
    if (selectedDate === data.date) {
      return { 
        fixed: data.monthly.fixed, 
        mobile: data.monthly.mobile, 
        totalJour: data.daily.realized, 
        totalMois: data.monthly.realized, 
        objMens: data.monthly.objective, 
        achievementGlobal: data.monthly.percentage 
      };
    }

    const fixed = formattedData.reduce((acc, r) => acc + r.fixePres, 0);
    const mobile = formattedData.reduce((acc, r) => acc + r.mobilePres, 0);
    const totalJour = formattedData.reduce((acc, r) => acc + r.totalJourPres, 0);
    const totalMois = formattedData.reduce((acc, r) => acc + r.totalMoisPres, 0);
    const objMens = formattedData.reduce((acc, r) => acc + r.objMensPres, 0);
    const achievementGlobal = objMens > 0 ? (totalMois / objMens) * 100 : 0;
    
    return { 
      fixed, 
      mobile, 
      totalJour, 
      totalMois, 
      objMens, 
      achievementGlobal 
    };
  }, [formattedData, selectedDate, data]);

  const handleExport = async (type: 'image' | 'pdf') => {
    if (!recapRef.current) return;
    setExporting(type);
    await new Promise(resolve => setTimeout(resolve, 800));
    try {
      const element = recapRef.current;
      const canvas = await html2canvas(element, { scale: 2.5, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png', 1.0);
      if (type === 'image') {
        const link = document.createElement('a');
        link.download = `RECAP_CNTS_${selectedDate.replace(/\//g, '-')}.png`;
        link.href = imgData;
        link.click();
      } else {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const ratio = pageWidth / (canvas.width / 2.5);
        pdf.addImage(imgData, 'PNG', 0, 10, pageWidth, (canvas.height / 2.5) * ratio);
        pdf.save(`RECAP_CNTS_${selectedDate.replace(/\//g, '-')}.pdf`);
      }
    } catch (err) { console.error("Export Error:", err); } finally { setExporting(null); }
  };

  if (!grandTotals) return null;

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-10">
      
      {/* BARRE DE SÉLECTION DYNAMIQUE */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
              <TableProperties size={24} />
           </div>
           <div>
              <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 leading-none">Situation Nationale</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Synthèse détaillée par PRES et CDTS</p>
           </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {/* SÉLECTEUR ANNÉE */}
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
            <Calendar size={14} className="text-slate-400" />
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent font-black text-slate-800 text-xs outline-none cursor-pointer uppercase">
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* SÉLECTEUR MOIS */}
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
            <Filter size={14} className="text-slate-400" />
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="bg-transparent font-black text-slate-800 text-xs outline-none cursor-pointer uppercase">
              {availableMonths.map(m => <option key={m} value={m}>{MONTHS_FR[m]}</option>)}
            </select>
          </div>

          {/* SÉLECTEUR JOUR (SITUATION AU) */}
          <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
            <span className="font-black text-blue-800 text-[9px] uppercase tracking-widest">Situation au :</span>
            <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-white border border-blue-200 px-3 py-1 font-black text-blue-900 text-xs rounded-lg outline-none cursor-pointer">
              {filteredDates.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => handleExport('image')} disabled={!!exporting} className="px-4 py-2.5 bg-slate-100 text-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 transition-all">
            {exporting === 'image' ? <Loader2 size={12} className="animate-spin" /> : <FileImage size={14} />} Image
          </button>
          <button onClick={() => handleExport('pdf')} disabled={!!exporting} className="px-4 py-2.5 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-100">
            {exporting === 'pdf' ? <Loader2 size={12} className="animate-spin" /> : <FileText size={14} />} PDF
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[2.5rem] shadow-2xl bg-white border border-slate-100">
        <div ref={recapRef} className="min-w-[850px] p-6 bg-white text-slate-900" style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
          <div className="flex justify-between items-center mb-6 border-b-2 border-slate-900 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                <Printer size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tighter leading-none text-slate-900">DETAIL DES PRELEVEMENTS</h1>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">Centre National de Transfusion Sanguine CI</p>
              </div>
            </div>
            <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-center">
              <p className="text-[7px] font-black uppercase tracking-[0.4em] mb-0.5 opacity-50">SITUATION AU</p>
              <p className="text-xl font-black leading-none">{selectedDate}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="border-2 border-slate-900 p-3 flex flex-col items-center justify-center bg-slate-50">
               <div className="flex items-center gap-2 mb-1">
                 <CalendarCheck size={14} className="text-slate-900" />
                 <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Flux du Jour</span>
               </div>
               <p className="text-3xl font-black text-slate-900 leading-none">{grandTotals.totalJour.toLocaleString()}</p>
            </div>
            <div className="border-2 border-slate-900 p-3 flex flex-col items-center justify-center bg-orange-50/30">
               <div className="flex items-center gap-2 mb-1">
                 <BarChart3 size={14} className="text-orange-600" />
                 <span className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-400">CUMUL MENSUEL NATIONAL</span>
               </div>
               <p className="text-3xl font-black text-orange-600 leading-none">{grandTotals.totalMois.toLocaleString()}</p>
            </div>
            <div className="border-2 border-slate-900 p-3 flex flex-col items-center justify-center bg-blue-50/30">
               <div className="flex items-center gap-2 mb-1">
                 <Target size={14} className="text-blue-600" />
                 <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500">OBJECTIF MENSUEL NATIONAL</span>
               </div>
               <p className="text-3xl font-black text-blue-600 leading-none">{grandTotals.objMens.toLocaleString()}</p>
            </div>
          </div>

          <table className="w-full border-collapse border-2 border-slate-900 text-[10px] font-bold text-slate-950 leading-tight">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="border border-slate-800 p-2 uppercase tracking-widest text-center text-[10px] w-[200px]">PRES / Région</th>
                <th className="border border-slate-800 p-2 uppercase tracking-widest text-left text-[11px]">Libellé Site</th>
                <th className="border border-slate-800 p-2 uppercase tracking-widest text-center text-[10px] w-[50px]">Fixe</th>
                <th className="border border-slate-800 p-2 uppercase tracking-widest text-center text-[10px] w-[50px]">Mob.</th>
                <th className="border border-slate-800 p-2 uppercase tracking-widest text-center text-[10px] w-[60px] bg-white/10">Jour</th>
                <th className="border border-slate-800 p-2 uppercase tracking-widest text-center text-[10px] w-[70px]">Mois</th>
                <th className="border border-slate-800 p-2 uppercase tracking-widest text-center text-[10px] w-[70px]">Objectif/M</th>
                <th className="border border-slate-800 p-2 uppercase tracking-widest text-center text-[10px] w-[60px]">Taux/M</th>
              </tr>
            </thead>
            <tbody>
              {formattedData.map((region, rIdx) => {
                const regionNameKey = region.name.trim().toUpperCase();
                const regionColor = REGION_COLORS[regionNameKey] || '#ffffff';
                const regionPerf = region.objMensPres > 0 ? (region.totalMoisPres / region.objMensPres) * 100 : 0;
                return (
                  <React.Fragment key={rIdx}>
                    {region.sites.map((site, sIdx) => (
                      <tr key={`${rIdx}-${sIdx}`} style={{ backgroundColor: regionColor }} className="hover:brightness-95 transition-all">
                        {sIdx === 0 && (
                          <td rowSpan={region.sites.length + 1} className="border border-slate-800 p-2 text-center align-top font-black uppercase text-[11px] text-slate-950 w-[200px]" style={{ backgroundColor: regionColor }}>
                            <span className="inline-block pt-2">{region.name}</span>
                          </td>
                        )}
                        <td className="border border-slate-800 p-1.5 uppercase text-slate-950 text-[10px] h-7 leading-none">{site.name}</td>
                        <td className="border border-slate-800 p-1.5 text-center text-[11px] text-slate-950">{site.fixe.toLocaleString()}</td>
                        <td className="border border-slate-800 p-1.5 text-center text-[11px] text-slate-950">{site.mobile.toLocaleString()}</td>
                        <td className="border border-slate-800 p-1.5 text-center font-black bg-white/50 text-[12px] text-slate-950">{site.totalJour.toLocaleString()}</td>
                        <td className="border border-slate-800 p-1.5 text-center text-[11px] text-slate-950">{site.totalMois.toLocaleString()}</td>
                        <td className="border border-slate-800 p-1.5 text-center bg-black/5 text-[11px] text-slate-950">{site.objMensuel.toLocaleString()}</td>
                        <td className={`border border-slate-800 p-1.5 text-center font-black text-[12px] ${getPerfColor(site.achievementGlobal)}`}>{site.achievementGlobal.toFixed(0)}%</td>
                      </tr>
                    ))}
                    <tr style={{ backgroundColor: regionColor }} className="font-black brightness-90">
                      <td className="border border-slate-800 p-1.5 uppercase text-right text-slate-950 text-[10px] h-7 pr-3 leading-none">TOTAL {region.name}</td>
                      <td className="border border-slate-800 p-1.5 text-center text-[11px] text-slate-950">{region.fixePres.toLocaleString()}</td>
                      <td className="border border-slate-800 p-1.5 text-center text-[11px] text-slate-950">{region.mobilePres.toLocaleString()}</td>
                      <td className="border border-slate-800 p-1.5 text-center bg-white/60 text-[13px] text-slate-950">{region.totalJourPres.toLocaleString()}</td>
                      <td className="border border-slate-800 p-1.5 text-center text-[11px] text-slate-950">{region.totalMoisPres.toLocaleString()}</td>
                      <td className="border border-slate-800 p-1.5 text-center bg-black/5 text-[11px] text-slate-950">{region.objMensPres.toLocaleString()}</td>
                      <td className={`border border-slate-800 p-1.5 text-center text-[12px] font-black ${getPerfColor(regionPerf)}`}>{regionPerf.toFixed(0)}%</td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-900 text-white font-black">
              <tr>
                <td colSpan={2} className="border border-slate-800 p-3 text-center uppercase tracking-[0.1em] text-[12px]">TOTAL NATIONAL</td>
                <td className="border border-slate-800 p-3 text-center text-[12px]">{grandTotals.fixed.toLocaleString()}</td>
                <td className="border border-slate-800 p-3 text-center text-[12px]">{grandTotals.mobile.toLocaleString()}</td>
                <td className="border border-slate-800 p-3 text-center text-red-400 bg-white/10 text-[18px]">{grandTotals.totalJour.toLocaleString()}</td>
                <td className="border border-slate-800 p-3 text-center text-[12px]">{grandTotals.totalMois.toLocaleString()}</td>
                <td className="border border-slate-800 p-3 text-center bg-white/10 text-[12px]">{grandTotals.objMens.toLocaleString()}</td>
                <td className={`border border-slate-800 p-3 text-center text-[18px] ${getPerfColor(grandTotals.achievementGlobal)}`}>{grandTotals.achievementGlobal.toFixed(1)}%</td>
              </tr>
            </tfoot>
          </table>

          <div className="mt-4 flex justify-between items-center opacity-70 italic border-t-2 border-slate-100 pt-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-slate-900 rounded-full"></div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-900">Document Officiel CNTS - Direction des Structures déconcentrées</p>
            </div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-900">DSDSUIVI - {selectedDate}</p>
          </div>
        </div>
      </div>
    </div>
  );
};