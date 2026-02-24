
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { DashboardData, User, DistributionRecord } from '../types.ts';
import { PRODUCT_COLORS } from '../constants.tsx';
import { 
  FileImage, FileText, Loader2, TableProperties, Printer, 
  Calendar, Filter, Truck, Activity, ClipboardList, Search, 
  X, MapPin, Building2, Package, Layers, CalendarDays, Clock, Target, ArrowRight,
  FileSpreadsheet
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { utils, writeFile } from 'xlsx';

interface RecapViewProps {
  data: DashboardData;
  user?: User | null;
  sites: any[];
  initialMode?: 'collecte' | 'distribution';
}

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const SANG_GROUPS = ["A+", "A-", "AB+", "AB-", "B+", "B-", "O+", "O-"];

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

const getPerfColor = (perc: number) => {
  if (perc >= 100) return 'text-emerald-600';
  if (perc >= 80) return 'text-orange-500';
  return 'text-red-600';
};

const parseDate = (dateStr: string) => {
  if (!dateStr || dateStr === "---") return new Date(0);
  const [d, m, y] = dateStr.split('/').map(Number);
  return new Date(y, m - 1, d);
};

export const RecapView: React.FC<RecapViewProps> = ({ data, sites, initialMode = 'collecte', user }) => {
  const viewMode = initialMode;
  // Échelle de temps : Jour, Mois ou Année (Spécifique DIST)
  const [distTimeScale, setDistTimeScale] = useState<'day' | 'month' | 'year'>('month');
  
  // --- ÉTATS FILTRES TEMPORELS ---
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    data.dailyHistory.forEach((h: any) => {
      const parts = h.date.split('/');
      if (parts.length === 3) years.add(parts[2]);
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [data.dailyHistory]);

  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<number>(-1);
  const [selectedDate, setSelectedDate] = useState<string>("");
  
  // --- ÉTATS PÉRIODE (NOUVEAU) ---
  const [isPeriodMode, setIsPeriodMode] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // --- ÉTATS FILTRES DE RECHERCHE (DEMANDÉS) ---
  const [filterSite, setFilterSite] = useState("ALL");
  const [filterFacility, setFilterFacility] = useState("");
  const [filterProduct, setFilterProduct] = useState("ALL");
  const [filterGroup, setFilterGroup] = useState("ALL");
  const [filterRegion, setFilterRegion] = useState("ALL"); // Optionnel mais utile pour dégrossir

  const [exporting, setExporting] = useState<'image' | 'pdf' | 'excel' | null>(null);
  const recapRef = useRef<HTMLDivElement>(null);

  // Initialisation intelligente des dates
  useEffect(() => {
    if (data.date && data.date !== "---") {
      const parts = data.date.split('/');
      if (parts.length === 3) {
        if (!selectedYear) setSelectedYear(parts[2]);
        if (selectedMonth === -1) setSelectedMonth(parseInt(parts[1]) - 1);
        if (!selectedDate) setSelectedDate(data.date);
        if (!startDate) setStartDate(data.date);
        if (!endDate) setEndDate(data.date);
      }
    }
  }, [data]);

  const allDates = useMemo(() => {
    return data.dailyHistory.map(h => h.date).sort((a, b) => parseDate(b).getTime() - parseDate(a).getTime());
  }, [data.dailyHistory]);

  // Options dynamiques pour les listes
  const regionsList = useMemo(() => Array.from(new Set(sites.map(s => s.region))).sort(), [sites]);
  const sitesList = useMemo(() => {
    if (filterRegion === "ALL") return sites.sort((a, b) => a.name.localeCompare(b.name));
    return sites.filter(s => s.region === filterRegion).sort((a, b) => a.name.localeCompare(b.name));
  }, [sites, filterRegion]);

  const productsList = useMemo(() => {
    if (!data.distributions?.records) return [];
    return Array.from(new Set(data.distributions.records.map(r => r.typeProduit))).sort();
  }, [data.distributions]);

  const availableMonths = useMemo(() => {
    if (!selectedYear) return [];
    const months = new Set<number>();
    data.dailyHistory.forEach((h: any) => {
      const parts = h.date.split('/');
      if (parts[2] === selectedYear) months.add(parseInt(parts[1]) - 1);
    });
    return Array.from(months).sort((a, b) => a - b);
  }, [data.dailyHistory, selectedYear]);

  const filteredDates = useMemo(() => {
    if (!selectedYear || selectedMonth === -1) return [];
    return data.dailyHistory.filter((h: any) => {
      const parts = h.date.split('/');
      return parts[2] === selectedYear && (parseInt(parts[1]) - 1) === selectedMonth;
    }).map((h: any) => h.date);
  }, [data.dailyHistory, selectedYear, selectedMonth]);

  // --- LOGIQUE FILTRAGE DISTRIBUTION CONSOLIDÉE ---
  const filteredDistRecords = useMemo(() => {
    if (!data.distributions?.records || !selectedYear) return [];
    
    return data.distributions.records.filter(r => {
      const parts = r.date.split('/');
      if (parts.length !== 3) return false;

      // 1. FILTRE TEMPOREL (JOUR / MOIS / ANNEE)
      let timeMatch = false;
      if (distTimeScale === 'day') {
        timeMatch = r.date === selectedDate;
      } else if (distTimeScale === 'month') {
        timeMatch = parts[2] === selectedYear && (parseInt(parts[1]) - 1) === selectedMonth;
      } else {
        timeMatch = parts[2] === selectedYear;
      }
      if (!timeMatch) return false;

      // 2. FILTRES DE RECHERCHE DEMANDÉS
      if (filterSite !== "ALL" && r.site !== filterSite) return false;
      if (filterProduct !== "ALL" && r.typeProduit !== filterProduct) return false;
      if (filterGroup !== "ALL" && r.groupeSanguin !== filterGroup) return false;
      if (filterFacility && !r.etablissement.toLowerCase().includes(filterFacility.toLowerCase())) return false;
      if (filterRegion !== "ALL" && r.region !== filterRegion) return false;

      return true;
    });
  }, [data.distributions, distTimeScale, selectedDate, selectedYear, selectedMonth, filterSite, filterProduct, filterGroup, filterFacility, filterRegion]);

  // Agrégation Matricielle pour le tableau de Distribution
  const registerData = useMemo(() => {
    const tree: any = {};
    filteredDistRecords.forEach(r => {
      const sit = r.site || "INCONNU";
      const dest = r.etablissement || "INCONNU";
      const prod = r.typeProduit || "AUTRES";
      const grp = r.groupeSanguin || "N/A";
      if (!tree[sit]) tree[sit] = { destinations: {} };
      if (!tree[sit].destinations[dest]) tree[sit].destinations[dest] = { products: {} };
      if (!tree[sit].destinations[dest].products[prod]) {
        tree[sit].destinations[dest].products[prod] = { 
          groups: Object.fromEntries(SANG_GROUPS.map(g => [g, 0])),
          rendu: 0 
        };
      }
      if (SANG_GROUPS.includes(grp)) {
        tree[sit].destinations[dest].products[prod].groups[grp] += r.quantite;
      }
      tree[sit].destinations[dest].products[prod].rendu += r.rendu;
    });
    return tree;
  }, [filteredDistRecords]);

  const distTotals = useMemo(() => {
    const globalGroups = Object.fromEntries(SANG_GROUPS.map(g => [g, 0]));
    let globalRendu = 0, globalGross = 0;
    filteredDistRecords.forEach(r => {
      const grp = r.groupeSanguin || "N/A";
      if (SANG_GROUPS.includes(grp)) globalGroups[grp] += r.quantite;
      globalRendu += r.rendu; 
      globalGross += r.quantite;
    });
    return { 
      qty: globalGross, rendu: globalRendu, groups: globalGroups,
      efficiency: globalGross > 0 ? ((globalGross - globalRendu) / globalGross) * 100 : 0
    };
  }, [filteredDistRecords]);

  // LOGIQUE COLLECTE (Mise à jour pour gérer les périodes)
  const formattedCollecteData = useMemo(() => {
    if (viewMode !== 'collecte') return [];

    let activeDates: string[] = [];
    if (isPeriodMode) {
      if (!startDate || !endDate) return [];
      const startT = parseDate(startDate).getTime();
      const endT = parseDate(endDate).getTime();
      const minT = Math.min(startT, endT);
      const maxT = Math.max(startT, endT);

      activeDates = data.dailyHistory
        .filter(h => {
          const t = parseDate(h.date).getTime();
          return t >= minT && t <= maxT;
        })
        .map(h => h.date);
    } else {
      if (!selectedDate) return [];
      activeDates = [selectedDate];
    }

    if (activeDates.length === 0) return [];

    return data.regions.map(region => {
      const filteredSites = region.sites.filter(s => {
         if (filterRegion !== "ALL" && region.name !== filterRegion) return false;
         if (filterSite !== "ALL" && s.name !== filterSite) return false;
         return true;
      });
      if (filteredSites.length === 0) return null;
      
      const sitesWithDayData = filteredSites.map(s => {
        let totalFixe = 0;
        let totalMobile = 0;
        let totalJour = 0;

        activeDates.forEach(date => {
          const historyForDay = data.dailyHistory.find(h => h.date === date);
          const daySiteData = historyForDay?.sites.find(ds => ds.name.toUpperCase() === s.name.toUpperCase());
          totalFixe += (daySiteData?.fixe || 0);
          totalMobile += (daySiteData?.mobile || 0);
          totalJour += (daySiteData?.total || 0);
        });

        // Pour le cumul mois, on prend la date la plus récente de la sélection
        const referenceDate = activeDates.sort((a, b) => parseDate(b).getTime() - parseDate(a).getTime())[0];
        const parts = referenceDate.split('/').map(Number);
        
        const cumulMois = data.dailyHistory
          .filter(h => {
            const hParts = h.date.split('/').map(Number);
            return hParts[2] === parts[2] && hParts[1] === parts[1] && hParts[0] <= parts[0];
          })
          .reduce((acc, h) => {
            const hs = h.sites.find(siteH => siteH.name.toUpperCase() === s.name.toUpperCase());
            return acc + (hs?.total || 0);
          }, 0);

        return { 
          ...s, 
          fixe: totalFixe, 
          mobile: totalMobile, 
          totalJour: totalJour, 
          totalMois: cumulMois, 
          achievement: s.objMensuel > 0 ? (cumulMois / s.objMensuel) * 100 : 0 
        };
      });

      return {
        ...region,
        sites: sitesWithDayData,
        totalJourPres: sitesWithDayData.reduce((acc, s) => acc + s.totalJour, 0),
        totalMoisPres: sitesWithDayData.reduce((acc, s) => acc + s.totalMois, 0),
        objMensPres: sitesWithDayData.reduce((acc, s) => acc + s.objMensuel, 0),
        fixePres: sitesWithDayData.reduce((acc, s) => acc + s.fixe, 0),
        mobilePres: sitesWithDayData.reduce((acc, s) => acc + s.mobile, 0)
      };
    }).filter(r => r !== null);
  }, [data, filterRegion, filterSite, selectedDate, startDate, endDate, isPeriodMode, viewMode]);

  const nationalTotals = useMemo(() => {
    return formattedCollecteData.reduce((acc, r: any) => ({
      fixe: acc.fixe + r.fixePres,
      mobile: acc.mobile + r.mobilePres,
      jour: acc.jour + r.totalJourPres,
      mois: acc.mois + r.totalMoisPres,
      objectif: acc.objectif + r.objMensPres
    }), { fixe: 0, mobile: 0, jour: 0, mois: 0, objectif: 0 });
  }, [formattedCollecteData]);

  const handleExport = async (type: 'image' | 'pdf' | 'excel') => {
    if (!recapRef.current) return;
    setExporting(type);
    await new Promise(resolve => setTimeout(resolve, 800));
    try {
      const filename = `RECAP_HS_${viewMode.toUpperCase()}_${selectedDate.replace(/\//g, '-') || 'BILAN'}`;
      const element = recapRef.current;
      
      if (type === 'excel') {
        const excelData: any[] = [];
        
        if (viewMode === 'collecte') {
          // Headers
          excelData.push(["PRES / RÉGION", "LIBELLÉ SITE", "FIXE", "MOB.", isPeriodMode ? "TOTAL" : "JOUR", "MOIS", "OBJECTIF/M", "TAUX/M"]);
          
          formattedCollecteData.forEach((region: any) => {
            region.sites.forEach((site: any) => {
              excelData.push([
                region.name,
                site.name,
                site.fixe,
                site.mobile,
                site.totalJour,
                site.totalMois,
                site.objMensuel,
                `${site.achievement.toFixed(0)}%`
              ]);
            });
            // Region Total
            const regTaux = region.objMensPres > 0 ? (region.totalMoisPres / region.objMensPres) * 100 : 0;
            excelData.push([
              `TOTAL ${region.name}`,
              "",
              region.fixePres,
              region.mobilePres,
              region.totalJourPres,
              region.totalMoisPres,
              region.objMensPres,
              `${regTaux.toFixed(0)}%`
            ]);
            excelData.push([]); // Empty row
          });
          
          // National Total
          const natTaux = nationalTotals.objectif > 0 ? (nationalTotals.mois / nationalTotals.objectif) * 100 : 0;
          excelData.push([
            "TOTAL NATIONAL",
            "",
            nationalTotals.fixe,
            nationalTotals.mobile,
            nationalTotals.jour,
            nationalTotals.mois,
            nationalTotals.objectif,
            `${natTaux.toFixed(1)}%`
          ]);
        } else {
          // Distribution Excel
          excelData.push(["Site Source", "Structure Servie", "Produit", ...SANG_GROUPS, "Rendu", "Total"]);
          
          Object.entries(registerData).forEach(([sitName, sitData]: [string, any]) => {
            Object.entries(sitData.destinations).forEach(([destName, destData]: [string, any]) => {
              Object.entries(destData.products).forEach(([prodName, prodMetrics]: [string, any]) => {
                const rowGrossTotal = SANG_GROUPS.reduce((acc, g) => acc + prodMetrics.groups[g], 0);
                const row = [
                  sitName,
                  destName,
                  prodName,
                  ...SANG_GROUPS.map(g => prodMetrics.groups[g] || 0),
                  prodMetrics.rendu || 0,
                  rowGrossTotal
                ];
                excelData.push(row);
              });
            });
            
            // Site Sub-total
            const siteTotals = Object.fromEntries(SANG_GROUPS.map(g => [g, 0]));
            let siteRendu = 0, siteGrossTotal = 0;
            Object.values(sitData.destinations).forEach((dest: any) => {
              Object.values(dest.products).forEach((prod: any) => {
                SANG_GROUPS.forEach(g => { siteTotals[g] += prod.groups[g]; siteGrossTotal += prod.groups[g]; });
                siteRendu += prod.rendu;
              });
            });
            
            excelData.push([
              `SOUS-TOTAL ${sitName}`,
              "",
              "",
              ...SANG_GROUPS.map(g => siteTotals[g]),
              siteRendu,
              siteGrossTotal
            ]);
            excelData.push([]);
          });
          
          // Global Total
          excelData.push([
            "TOTAL GÉNÉRAL CONSOLIDÉ",
            "",
            "",
            ...SANG_GROUPS.map(g => distTotals.groups[g]),
            distTotals.rendu,
            distTotals.qty
          ]);
        }

        const ws = utils.aoa_to_sheet(excelData);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Recap");
        writeFile(wb, `${filename}.xlsx`);
      } else if (type === 'image') {
        const canvas = await html2canvas(element, { scale: 2.5, useCORS: true, backgroundColor: '#ffffff' });
        const link = document.createElement('a'); link.download = `${filename}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click();
      } else {
        const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = 210, pdfHeight = 297, margin = 10;
        const targetWidth = pdfWidth - (margin * 2);
        const imgHeightInPdf = (canvas.height * targetWidth) / canvas.width;
        let heightLeft = imgHeightInPdf, position = margin;
        pdf.addImage(imgData, 'PNG', margin, position, targetWidth, imgHeightInPdf);
        heightLeft -= (pdfHeight - margin * 2);
        while (heightLeft > 0) { position = heightLeft - imgHeightInPdf + margin; pdf.addPage(); pdf.addImage(imgData, 'PNG', margin, position, targetWidth, imgHeightInPdf); heightLeft -= (pdfHeight - margin * 2); }
        pdf.save(`${filename}.pdf`);
      }
    } catch (err) { console.error(err); } finally { setExporting(null); }
  };

  const currentPeriodLabel = useMemo(() => {
    if (viewMode === 'collecte') {
      if (isPeriodMode) return `DU ${startDate} AU ${endDate}`;
      return selectedDate || '---';
    }
    if (distTimeScale === 'day') return selectedDate || '---';
    if (distTimeScale === 'month') {
        const monthName = selectedMonth >= 0 && selectedMonth < 12 ? MONTHS_FR[selectedMonth] : '---';
        return `${monthName.toUpperCase()} ${selectedYear || '---'}`;
    }
    return selectedYear || '---';
  }, [viewMode, distTimeScale, selectedDate, selectedMonth, selectedYear, isPeriodMode, startDate, endDate]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* PANEL DE FILTRES AVANCÉS (DESIGN OPTIMISÉ POUR DIST) */}
      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200 space-y-6">
        <div className="flex flex-col xl:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
             <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white ${viewMode === 'collecte' ? 'bg-indigo-600' : 'bg-orange-600'}`}>
                {viewMode === 'collecte' ? <TableProperties size={28} /> : <ClipboardList size={28} />}
             </div>
             <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">
                  {viewMode === 'collecte' ? 'Rapport des Prélèvements' : 'SYNTHESE DIST'}
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Console de Pilotage Consolidée</p>
             </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
             {/* SÉLECTEUR ÉCHELLE (Uniquement DIST) */}
             {viewMode === 'distribution' && (
               <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 mr-2">
                 {[
                   { id: 'day', label: 'Jour' },
                   { id: 'month', label: 'Mois' },
                   { id: 'year', label: 'Année' }
                 ].map(s => (
                   <button 
                    key={s.id} 
                    onClick={() => setDistTimeScale(s.id as any)}
                    className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${distTimeScale === s.id ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                   >
                     {s.label}
                   </button>
                 ))}
               </div>
             )}

             {/* TOGGLE PÉRIODE (Uniquement COLLECTE) */}
             {viewMode === 'collecte' && (
               <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 mr-2">
                 <button 
                  onClick={() => setIsPeriodMode(false)}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${!isPeriodMode ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400'}`}
                 >
                   Jour Unique
                 </button>
                 <button 
                  onClick={() => setIsPeriodMode(true)}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${isPeriodMode ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400'}`}
                 >
                   Période
                 </button>
               </div>
             )}

             {!isPeriodMode && (
               <>
                 <div className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm">
                   <Calendar size={14} className="text-slate-400" />
                   <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent font-black text-slate-800 text-[10px] outline-none cursor-pointer uppercase">
                     {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                   </select>
                 </div>

                 {(viewMode === 'collecte' || distTimeScale !== 'year') && (
                   <div className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm">
                     <Filter size={14} className="text-slate-400" />
                     <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="bg-transparent font-black text-slate-800 text-[10px] outline-none cursor-pointer uppercase">
                       {availableMonths.map(m => <option key={m} value={m}>{MONTHS_FR[m]}</option>)}
                     </select>
                   </div>
                 )}

                 {(viewMode === 'collecte' || distTimeScale === 'day') && (
                   <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border shadow-sm ${viewMode === 'collecte' ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
                     <CalendarDays size={14} className={viewMode === 'collecte' ? 'text-blue-500' : 'text-orange-500'} />
                     <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-white border border-slate-200 px-3 py-1 font-black text-slate-900 text-[10px] rounded-lg outline-none cursor-pointer">
                       {filteredDates.map(d => <option key={d} value={d}>{d}</option>)}
                     </select>
                   </div>
                 )}
               </>
             )}

             {isPeriodMode && viewMode === 'collecte' && (
               <div className="flex items-center gap-3">
                 <div className="flex items-center gap-2 bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-200 shadow-sm">
                   <span className="text-[8px] font-black uppercase text-blue-400">Du</span>
                   <select value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-white border border-slate-200 px-3 py-1 font-black text-slate-900 text-[10px] rounded-lg outline-none cursor-pointer">
                     {allDates.map(d => <option key={d} value={d}>{d}</option>)}
                   </select>
                 </div>
                 <ArrowRight size={14} className="text-slate-300" />
                 <div className="flex items-center gap-2 bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-200 shadow-sm">
                   <span className="text-[8px] font-black uppercase text-blue-400">Au</span>
                   <select value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-white border border-slate-200 px-3 py-1 font-black text-slate-900 text-[10px] rounded-lg outline-none cursor-pointer">
                     {allDates.map(d => <option key={d} value={d}>{d}</option>)}
                   </select>
                 </div>
               </div>
             )}
          </div>

          <div className="flex gap-2">
            <button onClick={() => handleExport('image')} disabled={!!exporting} className="px-5 py-3 bg-slate-100 text-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 transition-all border border-slate-200">
              {exporting === 'image' ? <Loader2 size={14} className="animate-spin" /> : <FileImage size={16} />} PNG
            </button>
            <button onClick={() => handleExport('excel')} disabled={!!exporting} className="px-5 py-3 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-100 transition-all border border-emerald-200">
              {exporting === 'excel' ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={16} />} EXCEL
            </button>
            <button onClick={() => handleExport('pdf')} disabled={!!exporting} className={`px-5 py-3 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg ${viewMode === 'collecte' ? 'bg-[#0f172a]' : 'bg-orange-600'}`}>
              {exporting === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={16} />} PDF
            </button>
          </div>
        </div>

        {/* FILTRES DE RECHERCHE AVANCÉS (DEMANDÉS) */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-6 border-t border-slate-100 ${viewMode === 'collecte' ? 'opacity-50 pointer-events-none' : ''}`}>
           {/* RECHERCHE PAR RÉGION (POUR FILTRER LE SITE) */}
           <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">PRES / Région</label>
              <div className="relative">
                <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <select value={filterRegion} onChange={(e) => {setFilterRegion(e.target.value); setFilterSite("ALL");}} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-4 ring-orange-50 appearance-none cursor-pointer">
                   <option value="ALL">Toutes Régions</option>
                   {regionsList.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
           </div>

           {/* 1. RECHERCHE PAR SITE SOURCE */}
           <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Site Source</label>
              <div className="relative">
                <Building2 size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <select value={filterSite} onChange={(e) => setFilterSite(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-4 ring-orange-50 appearance-none cursor-pointer">
                   <option value="ALL">Tous les Sites</option>
                   {sitesList.map(s => <option key={s.code} value={s.name}>{s.name}</option>)}
                </select>
              </div>
           </div>

           {/* 2. RECHERCHE PAR ÉTABLISSEMENT SANITAIRE */}
           <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Établissement Sanitaire</label>
              <div className="relative">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input 
                  value={filterFacility} 
                  onChange={(e) => setFilterFacility(e.target.value)} 
                  placeholder="Rechercher destination..." 
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-4 ring-orange-50"
                />
                {filterFacility && <button onClick={() => setFilterFacility("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"><X size={14}/></button>}
              </div>
           </div>

           {/* 3. RECHERCHE PAR TYPE DE PRODUIT */}
           <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Type de Produit</label>
              <div className="relative">
                <Package size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <select 
                  value={filterProduct} 
                  onChange={(e) => setFilterProduct(e.target.value)} 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-4 ring-orange-50 appearance-none cursor-pointer"
                >
                   <option value="ALL">Tous Produits</option>
                   {productsList.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
           </div>

           {/* 4. RECHERCHE PAR GROUPE SANGUIN */}
           <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Groupe Sanguin</label>
              <div className="relative">
                <Layers size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <select 
                  value={filterGroup} 
                  onChange={(e) => setFilterGroup(e.target.value)} 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-4 ring-orange-50 appearance-none cursor-pointer"
                >
                   <option value="ALL">Tous Groupes</option>
                   {SANG_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
           </div>
        </div>
      </div>

      {/* DOCUMENT DE SYNTHÈSE */}
      <div className="overflow-x-auto rounded-[3.5rem] shadow-3xl bg-white border border-slate-100">
        <div ref={recapRef} className="min-w-[1050px] p-12 bg-white text-slate-900" style={{ width: '100%', maxWidth: '1150px', margin: '0 auto' }}>
          
          {/* HEADER DOCUMENT */}
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-6">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-xl ${viewMode === 'collecte' ? 'bg-[#ef4444]' : 'bg-orange-600'}`}>
                 <Printer size={32} />
              </div>
              <div>
                <h1 className="text-4xl font-[900] uppercase tracking-tight text-[#0f172a] leading-none">
                  {viewMode === 'collecte' ? 'DETAIL DES PRELEVEMENTS' : 'SYNTHESE DES DISTRIBUTIONS'}
                </h1>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2 italic">CENTRE NATIONAL DE TRANSFUSION SANGUINE CI</p>
              </div>
            </div>
            <div className="bg-[#0f172a] text-white px-8 py-3 rounded-2xl text-center">
               <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">SITUATION AU</p>
               <p className="text-xl font-black">{currentPeriodLabel}</p>
            </div>
          </div>

          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-3 gap-6 mb-10">
             <div className="border-2 border-[#0f172a] p-6 rounded-xl flex flex-col items-center justify-center bg-white text-center">
                <div className="flex items-center gap-2 mb-2 text-[#0f172a]">
                   <CalendarDays size={18} /> <span className="text-[10px] font-black uppercase tracking-widest">{isPeriodMode ? 'TOTAL PÉRIODE' : 'FLUX JOUR'}</span>
                </div>
                <p className="text-5xl font-[900] text-[#0f172a] tracking-tighter">
                  {viewMode === 'collecte' ? nationalTotals.jour.toLocaleString() : distTotals.qty.toLocaleString()}
                </p>
             </div>
             <div className="border-2 border-[#0f172a] p-6 rounded-xl flex flex-col items-center justify-center bg-white text-center">
                <div className="flex items-center gap-2 mb-2 text-[#f97316]">
                   <Activity size={18} /> <span className="text-[10px] font-black uppercase tracking-widest">{viewMode === 'collecte' ? 'CUMUL MENSUEL' : 'SORTIES NETTES'}</span>
                </div>
                <p className="text-5xl font-[900] text-[#f97316] tracking-tighter">
                   {viewMode === 'collecte' ? nationalTotals.mois.toLocaleString() : (distTotals.qty - distTotals.rendu).toLocaleString()}
                </p>
             </div>
             <div className="border-2 border-[#0f172a] p-6 rounded-xl flex flex-col items-center justify-center bg-white text-center">
                <div className="flex items-center gap-2 mb-2 text-[#3b82f6]">
                   <Target size={18} /> <span className="text-[10px] font-black uppercase tracking-widest">{viewMode === 'collecte' ? 'OBJECTIF MENSUEL' : 'EFFICACITÉ NETTE'}</span>
                </div>
                <p className="text-5xl font-[900] text-[#3b82f6] tracking-tighter">
                   {viewMode === 'collecte' ? nationalTotals.objectif.toLocaleString() : distTotals.efficiency.toFixed(1) + '%'}
                </p>
             </div>
          </div>

          {/* TABLEAU RENDU */}
          {viewMode === 'collecte' ? (
            <table className="w-full border-collapse text-[11px] font-bold text-slate-950">
              <thead>
                <tr className="bg-[#0f172a] text-white h-12">
                  <th className="border border-slate-700 px-4 py-2 uppercase tracking-widest text-left w-[180px]">PRES / RÉGION</th>
                  <th className="border border-slate-700 px-4 py-2 uppercase tracking-widest text-left">LIBELLÉ SITE</th>
                  <th className="border border-slate-700 px-4 py-2 uppercase tracking-widest text-center w-[70px]">FIXE</th>
                  <th className="border border-slate-700 px-4 py-2 uppercase tracking-widest text-center w-[70px]">MOB.</th>
                  <th className="border border-slate-700 px-4 py-2 uppercase tracking-widest text-center w-[80px]">{isPeriodMode ? 'TOTAL' : 'JOUR'}</th>
                  <th className="border border-slate-700 px-4 py-2 uppercase tracking-widest text-center w-[90px]">MOIS</th>
                  <th className="border border-slate-700 px-4 py-2 uppercase tracking-widest text-center w-[100px]">OBJECTIF/M</th>
                  <th className="border border-slate-700 px-4 py-2 uppercase tracking-widest text-center w-[80px]">TAUX/M</th>
                </tr>
              </thead>
              <tbody>
                {formattedCollecteData.length > 0 ? formattedCollecteData.map((region: any, rIdx: number) => {
                  const regColor = REGION_COLORS[region.name.trim().toUpperCase()] || '#ffffff';
                  const regTaux = region.objMensPres > 0 ? (region.totalMoisPres / region.objMensPres) * 100 : 0;
                  return (
                    <React.Fragment key={rIdx}>
                      {region.sites.map((site: any, sIdx: number) => (
                        <tr key={`${rIdx}-${sIdx}`} style={{ backgroundColor: regColor }} className="h-10 hover:brightness-95 transition-all">
                          {sIdx === 0 && (
                            <td rowSpan={region.sites.length + 1} className="border border-slate-400 p-4 align-top font-black uppercase text-[12px] text-[#0f172a]" style={{ backgroundColor: regColor }}>
                              <span className="inline-block mt-1">{region.name}</span>
                            </td>
                          )}
                          <td className="border border-slate-400 px-4 py-2 uppercase text-[11px] text-[#0f172a]">{site.name}</td>
                          <td className="border border-slate-400 px-4 py-2 text-center text-[#0f172a]">{site.fixe}</td>
                          <td className="border border-slate-400 px-4 py-2 text-center text-[#0f172a]">{site.mobile}</td>
                          <td className="border border-slate-400 px-4 py-2 text-center font-black text-[#0f172a] text-[13px]">{site.totalJour}</td>
                          <td className="border border-slate-400 px-4 py-2 text-center text-[#0f172a] text-[13px]">{site.totalMois.toLocaleString()}</td>
                          <td className="border border-slate-400 px-4 py-2 text-center text-[#0f172a] text-[13px]">{site.objMensuel.toLocaleString()}</td>
                          <td className={`border border-slate-400 px-4 py-2 text-center font-black text-[14px] ${getPerfColor(site.achievement)}`}>{site.achievement.toFixed(0)}%</td>
                        </tr>
                      ))}
                      <tr className="font-black h-12 bg-slate-200/50" style={{ backgroundColor: `${regColor}dd` }}>
                        <td className="border border-slate-400 px-4 py-2 uppercase text-right pr-6 italic text-[#0f172a]">TOTAL {region.name}</td>
                        <td className="border border-slate-400 px-4 py-2 text-center text-[#0f172a]">{region.fixePres}</td>
                        <td className="border border-slate-400 px-4 py-2 text-center text-[#0f172a]">{region.mobilePres}</td>
                        <td className="border border-slate-400 px-4 py-2 text-center text-[#0f172a] text-[14px]">{region.totalJourPres}</td>
                        <td className="border border-slate-400 px-4 py-2 text-center text-[#0f172a] text-[14px]">{region.totalMoisPres.toLocaleString()}</td>
                        <td className="border border-slate-400 px-4 py-2 text-center text-[#0f172a] text-[14px]">{region.objMensPres.toLocaleString()}</td>
                        <td className={`border border-slate-400 px-4 py-2 text-center font-black text-[15px] ${getPerfColor(regTaux)}`}>{regTaux.toFixed(0)}%</td>
                      </tr>
                    </React.Fragment>
                  );
                }) : null}
              </tbody>
              <tfoot className="bg-[#0f172a] text-white font-black">
                <tr className="h-16">
                  <td colSpan={2} className="border border-slate-800 p-6 text-xl uppercase tracking-widest pl-12">TOTAL NATIONAL</td>
                  <td className="border border-slate-800 p-2 text-center text-lg">{nationalTotals.fixe.toLocaleString()}</td>
                  <td className="border border-slate-800 p-2 text-center text-lg">{nationalTotals.mobile.toLocaleString()}</td>
                  <td className="border border-slate-800 p-2 text-center text-2xl text-[#f87171]">{nationalTotals.jour.toLocaleString()}</td>
                  <td className="border border-slate-800 p-2 text-center text-2xl">{nationalTotals.mois.toLocaleString()}</td>
                  <td className="border border-slate-800 p-2 text-center text-2xl">{nationalTotals.objectif.toLocaleString()}</td>
                  <td className="border border-slate-800 p-2 text-center text-3xl text-[#f87171]">{(nationalTotals.objectif > 0 ? (nationalTotals.mois / nationalTotals.objectif) * 100 : 0).toFixed(1)}%</td>
                </tr>
              </tfoot>
            </table>
          ) : (
             <div className="border-4 border-orange-600 rounded-3xl overflow-hidden shadow-2xl">
               <table className="w-full border-collapse text-[11px] font-bold text-slate-950 leading-tight">
                  <thead>
                     <tr className="bg-orange-600 text-white h-14">
                        <th className="border-2 border-orange-700 p-4 text-left w-[180px] uppercase tracking-widest">Site Source</th>
                        <th className="border-2 border-orange-700 p-4 text-left w-[220px] uppercase tracking-widest">Structure Servie</th>
                        <th className="border-2 border-orange-700 p-4 text-left w-[150px] uppercase tracking-widest">Produit</th>
                        {SANG_GROUPS.map(g => <th key={g} className="border-2 border-orange-700 p-2 text-center w-[50px] uppercase">{g}</th>)}
                        <th className="border-2 border-orange-700 p-4 text-right w-[70px] uppercase text-red-100">Rendu</th>
                        <th className="border-2 border-orange-700 p-4 text-right w-[90px] uppercase bg-white/10 text-orange-200">Total</th>
                     </tr>
                  </thead>
                  <tbody>
                    {Object.keys(registerData).length > 0 ? (
                      Object.entries(registerData).sort().map(([sitName, sitData]: [string, any]) => {
                         const siteTotals = Object.fromEntries(SANG_GROUPS.map(g => [g, 0]));
                         let siteRendu = 0, siteGrossTotal = 0;
                         Object.values(sitData.destinations).forEach((dest: any) => {
                           Object.values(dest.products).forEach((prod: any) => {
                             SANG_GROUPS.forEach(g => { siteTotals[g] += prod.groups[g]; siteGrossTotal += prod.groups[g]; });
                             siteRendu += prod.rendu;
                           });
                         });
                         const rowCount: number = (Object.values(sitData.destinations) as any[]).reduce((acc: number, d: any) => acc + Object.keys(d.products).length, 0);
                         return (
                           <React.Fragment key={sitName}>
                             {Object.entries(sitData.destinations).sort().map(([destName, destData]: [string, any], dIdx) => (
                               <React.Fragment key={destName}>
                                 {Object.entries(destData.products).sort().map(([prodName, prodMetrics]: [string, any], pIdx) => {
                                   const rowGrossTotal = SANG_GROUPS.reduce((acc, g) => acc + prodMetrics.groups[g], 0);
                                   return (
                                     <tr key={`${destName}-${prodName}`} className="hover:bg-orange-50/50 transition-colors group">
                                       {dIdx === 0 && pIdx === 0 && (
                                         <td rowSpan={rowCount + 1} className="border-2 border-slate-200 p-4 align-top font-[900] text-orange-700 bg-orange-50/20 uppercase text-[12px]">{sitName}</td>
                                       )}
                                       {pIdx === 0 && <td rowSpan={Object.keys(destData.products).length} className="border-2 border-slate-200 p-4 align-top text-slate-800 uppercase font-[900] text-[11px]">{destName}</td>}
                                       <td className="border-2 border-slate-200 p-3">
                                         <span className="px-2 py-1.5 rounded text-[9px] font-black border uppercase block leading-tight whitespace-normal" style={{ color: PRODUCT_COLORS[prodName] || '#64748b', borderColor: `${PRODUCT_COLORS[prodName]}33`, backgroundColor: `${PRODUCT_COLORS[prodName]}11` }}>{prodName}</span>
                                       </td>
                                       {SANG_GROUPS.map(g => (
                                         <td key={g} className={`border-2 border-slate-200 p-2 text-center text-[12px] ${prodMetrics.groups[g] > 0 ? 'text-slate-950 font-black' : 'text-slate-200'}`}>{prodMetrics.groups[g] || '-'}</td>
                                       ))}
                                       <td className="border-2 border-slate-200 p-3 text-right font-black text-red-600 text-[12px]">{prodMetrics.rendu || '-'}</td>
                                       <td className="border-2 border-slate-200 p-3 text-right font-black text-slate-900 bg-slate-50/50 text-[13px]">{rowGrossTotal}</td>
                                     </tr>
                                   );
                                 })}
                               </React.Fragment>
                             ))}
                             <tr className="bg-orange-600/10 font-black h-12">
                               <td colSpan={2} className="border-2 border-slate-200 p-4 text-right uppercase tracking-wider text-orange-800 pr-8 italic">SOUS-TOTAL RÉSEAU {sitName}</td>
                               {SANG_GROUPS.map(g => <td key={g} className="border-2 border-slate-200 p-2 text-center text-orange-950 bg-white/40 text-[13px]">{siteTotals[g]}</td>)}
                               <td className="border-2 border-slate-200 p-3 text-right text-red-700 text-[13px]">{siteRendu}</td>
                               <td className="border-2 border-slate-200 p-3 text-right text-orange-900 bg-white/60 text-[15px]">{siteGrossTotal}</td>
                             </tr>
                           </React.Fragment>
                         );
                      })
                    ) : (
                      <tr><td colSpan={14} className="py-20 text-center text-slate-300 uppercase italic">Aucune donnée trouvée pour cette sélection</td></tr>
                    )}
                  </tbody>
                  <tfoot className="bg-orange-950 text-white font-black">
                    <tr className="h-16">
                      <td colSpan={3} className="border-2 border-orange-900 p-5 text-center uppercase tracking-[0.3em] text-[15px]">TOTAL GÉNÉRAL CONSOLIDÉ</td>
                      {SANG_GROUPS.map(g => <td key={g} className="border-2 border-orange-900 p-2 text-center text-[15px]">{distTotals.groups[g]}</td>)}
                      <td className="border-2 border-orange-900 p-4 text-right text-red-400 text-[15px]">{distTotals.rendu}</td>
                      <td className="border-2 border-orange-900 p-5 text-right text-orange-400 text-[24px] bg-white/5">{distTotals.qty}</td>
                    </tr>
                  </tfoot>
               </table>
            </div>
          )}

          {/* FOOTER DOCUMENT */}
          <div className="mt-12 flex justify-between items-center opacity-70 border-t-2 border-slate-100 pt-6">
            <div className="flex items-center gap-4">
              <div className={`w-5 h-5 rounded-full ${viewMode === 'collecte' ? 'bg-red-600' : 'bg-orange-600'}`}></div>
              <p className="text-[10px] font-[900] uppercase tracking-widest text-slate-900">DOCUMENT OFFICIEL CNTS - DIRECTION DES STRUCTURES DÉCONCENTRÉES</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-[900] uppercase tracking-widest text-slate-900">DSDSUIVI - {selectedDate}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
