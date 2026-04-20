
import React, { useMemo, useState, useRef, useEffect } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { fr } from 'date-fns/locale/fr';
import "react-datepicker/dist/react-datepicker.css";
import { DashboardData, User, DistributionRecord, AppTab } from '../types.ts';
import { PRODUCT_COLORS, GROUP_COLORS } from '../constants.tsx';
import { 
  FileImage, FileText, Loader2, TableProperties, Printer, 
  Calendar as CalendarIcon, Filter, Truck, Activity, ClipboardList, Search, 
  X, MapPin, Building2, Package, Layers, CalendarDays, Clock, Target, ArrowRight,
  FileSpreadsheet, ChevronLeft, ChevronRight, Zap
} from 'lucide-react';
import { domToPng } from 'modern-screenshot';
import { jsPDF } from 'jsPDF';
import { utils, writeFile } from 'xlsx';
import { motion } from 'motion/react';

registerLocale('fr', fr);

interface RecapViewProps {
  data: DashboardData;
  user?: User | null;
  sites: any[];
  initialMode?: 'collecte' | 'distribution';
  branding?: { logo: string; hashtag: string };
  situationTime?: string;
  setActiveTab?: (tab: AppTab) => void;
  onSiteClick?: (siteName: string) => void;
}

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const SANG_GROUPS = ["A+", "A-", "AB+", "AB-", "B+", "B-", "O+", "O-"];

const REGION_COLORS: Record<string, string> = {
  "PRES ABIDJAN": "#fff7ed", 
  "PRES BELIER": "#fff2cc",  
  "PRES GBEKE": "#ffedd5",   
  "PRES PORO": "#daeef3",    
  "PRES INDENIE DJUABLIN": "#e7e6e6", 
  "PRES GONTOUGO": "#ebf1de", 
  "PRES HAUT SASSANDRA": "#ffffcc", 
  "PRES SAN-PEDRO": "#d8e4bc", 
  "PRES TONPKI": "#fbe5d6",    
  "PRES KABADOUGOU": "#fee5e5"
};

const getPerfColor = (perc: number) => {
  if (perc >= 100) return 'text-orange-600';
  if (perc >= 80) return 'text-orange-500';
  return 'text-red-600';
};

const parseDate = (dateStr: string) => {
  if (!dateStr || dateStr === "---") return new Date(0);
  const [d, m, y] = dateStr.split('/').map(Number);
  return new Date(y, m - 1, d);
};

export default function RecapView({ data, sites, initialMode = 'collecte', user, branding, situationTime, setActiveTab, onSiteClick }: RecapViewProps) {
  const [viewMode, setViewMode] = useState<'collecte' | 'distribution'>(initialMode);
  const [distTimeScale, setDistTimeScale] = useState<'day' | 'month' | 'year'>('month');
  
  const availableYears = useMemo(() => {
    if (!data?.dailyHistory) return [];
    const years = new Set<string>();
    data.dailyHistory.forEach((h: any) => {
      const parts = h.date.split('/');
      if (parts.length === 3) years.add(parts[2]);
    });
    if (data.distributions?.records) {
      data.distributions.records.forEach(r => {
        const parts = r.date.split('/');
        if (parts.length === 3) years.add(parts[2]);
      });
    }
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [data?.dailyHistory, data?.distributions]);

  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<number>(-1);
  const [selectedDate, setSelectedDate] = useState<string>("");
  
  const [isPeriodMode, setIsPeriodMode] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const selectedDateObj = useMemo(() => selectedDate ? parseDate(selectedDate) : null, [selectedDate]);
  const startDateObj = useMemo(() => startDate ? parseDate(startDate) : null, [startDate]);
  const endDateObj = useMemo(() => endDate ? parseDate(endDate) : null, [endDate]);
  const selectedMonthObj = useMemo(() => {
    if (selectedMonth === -1 || !selectedYear) return null;
    return new Date(parseInt(selectedYear), selectedMonth, 1);
  }, [selectedMonth, selectedYear]);
  const selectedYearObj = useMemo(() => selectedYear ? new Date(parseInt(selectedYear), 0, 1) : null, [selectedYear]);

  const formatDate = (date: Date) => {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  const [filterSite, setFilterSite] = useState("ALL");
  const [filterFacility, setFilterFacility] = useState("");
  const [filterProduct, setFilterProduct] = useState("ALL");
  const [filterGroup, setFilterGroup] = useState("ALL");
  const [filterRegion, setFilterRegion] = useState("ALL");

  const [exporting, setExporting] = useState<'image' | 'pdf' | 'excel' | null>(null);
  const recapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data?.date || data.date === "---") return;
    const parts = data.date.split('/');
    if (parts.length === 3) {
      if (!selectedYear) setSelectedYear(parts[2]);
      if (selectedMonth === -1) setSelectedMonth(parseInt(parts[1]) - 1);
      if (!selectedDate) setSelectedDate(data.date);
      if (!startDate) setStartDate(data.date);
      if (!endDate) setEndDate(data.date);
    }
  }, [data]);

  const productsList = useMemo(() => {
    if (!data?.distributions?.records) return [];
    return Array.from(new Set(data.distributions.records.map(r => r.typeProduit))).sort();
  }, [data?.distributions]);

  const regionsList = useMemo(() => Array.from(new Set(sites.map(s => s.region))).sort(), [sites]);
  const sitesList = useMemo(() => {
    if (filterRegion === "ALL") return sites.sort((a, b) => a.name.localeCompare(b.name));
    return sites.filter(s => s.region === filterRegion).sort((a, b) => a.name.localeCompare(b.name));
  }, [sites, filterRegion]);

  const filteredDistRecords = useMemo(() => {
    if (!data?.distributions?.records || !selectedYear) return [];
    
    return data.distributions.records.filter(r => {
      const parts = r.date.split('/');
      if (parts.length !== 3) return false;

      let timeMatch = false;
      if (distTimeScale === 'day') {
        timeMatch = r.date === selectedDate;
      } else if (distTimeScale === 'month') {
        timeMatch = parts[2] === selectedYear && (parseInt(parts[1]) - 1) === selectedMonth;
      } else {
        timeMatch = parts[2] === selectedYear;
      }
      if (!timeMatch) return false;

      if (filterSite !== "ALL" && r.site !== filterSite) return false;
      if (filterProduct !== "ALL" && r.typeProduit !== filterProduct) return false;
      if (filterGroup !== "ALL" && r.groupeSanguin !== filterGroup) return false;
      if (filterFacility && !r.etablissement.toLowerCase().includes(filterFacility.toLowerCase())) return false;
      if (filterRegion !== "ALL" && r.region !== filterRegion) return false;

      return true;
    });
  }, [data.distributions, distTimeScale, selectedDate, selectedYear, selectedMonth, filterSite, filterProduct, filterGroup, filterFacility, filterRegion]);

  const registerData = useMemo(() => {
    if (!data) return {};
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
    if (!data) return { qty: 0, rendu: 0, groups: Object.fromEntries(SANG_GROUPS.map(g => [g, 0])), efficiency: 0 };
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

  const formattedCollecteData = useMemo(() => {
    if (viewMode !== 'collecte' || !data) return [];

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

        let totalGts = 0;
        activeDates.forEach(date => {
          const gtsRecords = data.gts?.filter(g => g.date === date && g.site.toUpperCase() === s.name.toUpperCase());
          gtsRecords?.forEach(g => {
            totalGts += (g.fixe || 0) + (g.mobile || 0);
          });
        });

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
          gts: totalGts,
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
        mobilePres: sitesWithDayData.reduce((acc, s) => acc + s.mobile, 0),
        gtsPres: sitesWithDayData.reduce((acc, s) => acc + (s.gts || 0), 0)
      };
    }).filter(r => r !== null);
  }, [data, filterRegion, filterSite, selectedDate, startDate, endDate, isPeriodMode, viewMode]);

  const nationalTotals = useMemo(() => {
    const totals = formattedCollecteData.reduce((acc, r: any) => ({
      fixe: acc.fixe + (r.fixePres || 0),
      mobile: acc.mobile + (r.mobilePres || 0),
      jour: acc.jour + (r.totalJourPres || 0),
      mois: acc.mois + (r.totalMoisPres || 0),
      objectif: acc.objectif + (r.objMensPres || 0),
      gts: acc.gts + (r.gtsPres || 0)
    }), { fixe: 0, mobile: 0, jour: 0, mois: 0, objectif: 0, gts: 0 });
    
    return {
      ...totals,
      taux: totals.objectif > 0 ? (totals.mois / totals.objectif) * 100 : 0
    };
  }, [formattedCollecteData]);

  const handleExport = async (type: 'image' | 'pdf' | 'excel') => {
    if (!recapRef.current) return;
    setExporting(type);
    await new Promise(resolve => setTimeout(resolve, 800));
    try {
      const filename = `RECAP_HS_${viewMode.toUpperCase()}_${selectedDate.replace(/\//g, '-') || 'BILAN'}`;
      if (type === 'excel') {
         // Logic for excel
         const excelData: any[] = [];
         if (viewMode === 'collecte') {
           excelData.push(["PRES / RÉGION", "LIBELLÉ SITE", "FIXE", "MOB.", isPeriodMode ? "TOTAL" : "TOTAL JOUR", "ENCODÉ GTS", "MOIS", "OBJECTIF/M", "TAUX/M"]);
           formattedCollecteData.forEach((region: any) => {
             region.sites.forEach((site: any) => {
               excelData.push([region.name, site.name, site.fixe, site.mobile, site.totalJour, site.gts, site.totalMois, site.objMensuel, `${site.achievement.toFixed(0)}%`]);
             });
           });
         } else {
           excelData.push(["Source", "Dest", "Prod", ...SANG_GROUPS, "Rendu", "Total"]);
           Object.entries(registerData).forEach(([sit, sitD]: [string, any]) => {
             Object.entries(sitD.destinations).forEach(([dest, destD]: [string, any]) => {
               Object.entries(destD.products).forEach(([prod, prM]: [string, any]) => {
                 excelData.push([sit, dest, prod, ...SANG_GROUPS.map(g => prM.groups[g]), prM.rendu, SANG_GROUPS.reduce((a, g) => a + prM.groups[g], 0)]);
               });
             });
           });
         }
         const ws = utils.aoa_to_sheet(excelData);
         const wb = utils.book_new();
         utils.book_append_sheet(wb, ws, "Recap");
         writeFile(wb, `${filename}.xlsx`);
      } else {
        const element = recapRef.current;
        const imgData = await domToPng(element, { scale: 2, backgroundColor: '#ffffff' });
        if (type === 'image') {
          const link = document.createElement('a'); 
          link.download = `${filename}.png`; 
          link.href = imgData; 
          link.click();
        } else {
          const pdf = new jsPDF('p', 'mm', 'a4');
          pdf.addImage(imgData, 'PNG', 10, 10, 190, (190 * element.offsetHeight) / element.offsetWidth);
          pdf.save(`${filename}.pdf`);
        }
      }
    } catch (err) { console.error(err); } finally { setExporting(null); }
  };

  const currentPeriodLabel = useMemo(() => {
    if (viewMode === 'collecte') {
      if (isPeriodMode) return `DU ${startDate} AU ${endDate}`;
      return selectedDate || '---';
    }
    if (distTimeScale === 'day') return selectedDate || '---';
    if (distTimeScale === 'month') return `${MONTHS_FR[selectedMonth]?.toUpperCase() || '---'} ${selectedYear || '---'}`;
    return selectedYear || '---';
  }, [viewMode, distTimeScale, selectedDate, selectedMonth, selectedYear, isPeriodMode, startDate, endDate]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-orange-200 space-y-6">
        <div className="flex flex-col xl:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
             <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white bg-orange-600`}>
                {viewMode === 'collecte' ? <TableProperties size={28} /> : <ClipboardList size={28} />}
             </div>
             <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter text-orange-950 leading-none">
                   {viewMode === 'collecte' ? 'Rapport des Prélèvements' : 'SYNTHESE DIST'}
                </h3>
                <p className="text-[10px] font-black text-orange-300 uppercase tracking-widest mt-1 italic">Console de Pilotage Consolidée</p>
             </div>
          </div>

          <div className="flex bg-orange-50 p-1.5 rounded-2xl gap-1">
            <button onClick={() => setViewMode('collecte')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'collecte' ? 'bg-white text-orange-600 shadow-sm' : 'text-orange-400 hover:text-orange-600'}`}>Prélèvements</button>
            <button onClick={() => setViewMode('distribution')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'distribution' ? 'bg-white text-orange-600 shadow-sm' : 'text-orange-400 hover:text-orange-600'}`}>Distribution</button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
             {viewMode === 'distribution' && (
               <div className="flex bg-orange-50 p-1.5 rounded-2xl border border-orange-100 mr-2">
                 {['day', 'month', 'year'].map(s => (
                   <button key={s} onClick={() => setDistTimeScale(s as any)} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${distTimeScale === s ? 'bg-white text-orange-950 shadow-md' : 'text-orange-400'}`}>{s === 'day' ? 'Jour' : s === 'month' ? 'Mois' : 'Année'}</button>
                 ))}
               </div>
             )}
             {viewMode === 'collecte' && (
               <div className="flex bg-orange-50 p-1.5 rounded-2xl border border-orange-100 mr-2">
                 <button onClick={() => setIsPeriodMode(false)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${!isPeriodMode ? 'bg-white text-orange-950 shadow-md' : 'text-orange-400'}`}>Jour Unique</button>
                 <button onClick={() => setIsPeriodMode(true)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${isPeriodMode ? 'bg-white text-orange-950 shadow-md' : 'text-orange-400'}`}>Période</button>
               </div>
             )}
             {!isPeriodMode && (
               <div className="flex items-center gap-2 bg-orange-50 px-4 py-2.5 rounded-xl border border-orange-100 shadow-sm">
                 <CalendarIcon size={14} className="text-orange-400" />
                 <DatePicker selected={selectedYearObj} onChange={(d) => d && setSelectedYear(d.getFullYear().toString())} showYearPicker dateFormat="yyyy" locale="fr" className="bg-transparent font-black text-orange-800 text-[10px] outline-none cursor-pointer uppercase w-12" />
               </div>
             )}
             {!isPeriodMode && (viewMode === 'collecte' || distTimeScale !== 'year') && (
               <div className="flex items-center gap-2 bg-orange-50 px-4 py-2.5 rounded-xl border border-orange-100 shadow-sm">
                 <Filter size={14} className="text-orange-400" />
                 <DatePicker selected={selectedMonthObj} onChange={(d) => { if (d) { setSelectedMonth(d.getMonth()); setSelectedYear(d.getFullYear().toString()); } }} showMonthYearPicker dateFormat="MMMM yyyy" locale="fr" className="bg-transparent font-black text-orange-850 text-[10px] outline-none cursor-pointer uppercase w-32" />
               </div>
             )}
             {!isPeriodMode && (viewMode === 'collecte' || distTimeScale === 'day') && (
               <div className="flex items-center gap-2 bg-orange-50 px-4 py-2.5 rounded-xl border border-orange-200 shadow-sm">
                 <CalendarDays size={14} className="text-orange-500" />
                 <DatePicker selected={selectedDateObj} onChange={(d) => d && setSelectedDate(formatDate(d))} dateFormat="dd/MM/yyyy" locale="fr" className="bg-white border border-orange-100 px-3 py-1 font-black text-orange-950 text-[10px] rounded-lg outline-none cursor-pointer w-24" />
               </div>
             )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleExport('image')} className="px-5 py-3 bg-orange-50 text-orange-800 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 border border-orange-200 transition-all font-display hover:bg-orange-100">{exporting === 'image' ? <Loader2 size={14} className="animate-spin" /> : <FileImage size={16} />} PNG</button>
            <button onClick={() => handleExport('excel')} className="px-5 py-3 bg-orange-100 text-orange-900 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 border border-orange-200 transition-all font-display hover:bg-orange-200">{exporting === 'excel' ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={16} />} EXCEL</button>
            <button onClick={() => handleExport('pdf')} className="px-5 py-3 bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg transition-all font-display hover:bg-orange-500">{exporting === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={16} />} PDF</button>
          </div>
        </div>
      </div>

      <div ref={recapRef} className="card-professional bg-white p-10 lg:p-16 space-y-12 border-orange-100">
         <div className="flex justify-between items-center border-b-[3px] border-orange-950 pb-8">
            <div className="flex items-center gap-8">
               <img src={branding?.logo || 'https://cntsci.net/wp-content/uploads/2021/04/cropped-logo-cnts-1.png'} alt="Logo" className="h-20 grayscale brightness-0 opacity-80" />
               <div>
                  <h1 className="text-4xl font-display font-black uppercase tracking-tighter text-orange-950">Bilan Consolidé Activités</h1>
                  <p className="text-base font-display font-bold text-orange-400 uppercase tracking-[0.3em] mt-2 underline decoration-orange-300 decoration-2 underline-offset-8">Cockpit National HEMO-STATS</p>
               </div>
            </div>
            <div className="text-right">
               <p className="text-[10px] font-display font-black text-orange-300 uppercase tracking-widest mb-2">Période du Rapport</p>
               <div className="px-6 py-4 bg-orange-950 text-white rounded-3xl shadow-xl">
                  <p className="text-2xl font-display font-black uppercase tracking-tighter">{currentPeriodLabel}</p>
               </div>
            </div>
         </div>

         {viewMode === 'collecte' ? (
           <div className="space-y-10">
              <div className="grid grid-cols-4 gap-8">
                 <div className="bg-orange-50/50 p-8 rounded-[3rem] border border-orange-100 text-center">
                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-3">Fixe</p>
                    <p className="text-4xl font-black text-orange-950">{nationalTotals.fixe.toLocaleString()}</p>
                 </div>
                 <div className="bg-orange-50/50 p-8 rounded-[3rem] border border-orange-100 text-center">
                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-3">Mobile</p>
                    <p className="text-4xl font-black text-orange-950">{nationalTotals.mobile.toLocaleString()}</p>
                 </div>
                 <div className="bg-orange-600 p-8 rounded-[3rem] shadow-2xl text-center">
                    <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-3">Global</p>
                    <p className="text-4xl font-black text-white">{nationalTotals.jour.toLocaleString()}</p>
                 </div>
                 <div className="bg-orange-50/50 p-8 rounded-[3rem] border border-orange-100 text-center">
                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-3">Efficience</p>
                    <p className="text-4xl font-black text-orange-600">{nationalTotals.taux.toFixed(1)}%</p>
                 </div>
              </div>

              <div className="overflow-hidden bg-white rounded-[3.5rem] border border-orange-950 shadow-2xl">
                 <table className="w-full border-collapse font-display text-[11px] font-bold">
                    <thead>
                       <tr className="bg-orange-950 text-white h-16">
                          <th className="px-8 text-left uppercase tracking-widest font-black text-[10px]">PRES / RÉGION</th>
                          <th className="px-4 text-center uppercase tracking-widest font-black text-[10px]">FIXE</th>
                          <th className="px-4 text-center uppercase tracking-widest font-black text-[10px]">MOB.</th>
                          <th className="px-4 text-center uppercase tracking-widest font-black text-[10px] bg-orange-900 border-x border-white/10">TOTAL</th>
                          <th className="px-4 text-center uppercase tracking-widest font-black text-[10px]">ENCODÉ GTS</th>
                          <th className="px-4 text-center uppercase tracking-widest font-black text-[10px]">MOIS</th>
                          <th className="px-4 text-center uppercase tracking-widest font-black text-[10px]">OBJ/M</th>
                          <th className="px-8 text-center uppercase tracking-widest font-black text-[10px]">TAUX/M</th>
                       </tr>
                    </thead>
                    <tbody>
                       {formattedCollecteData.map((reg, ri) => (
                         <React.Fragment key={ri}>
                            <tr className="h-10 bg-orange-50/50">
                               <td colSpan={8} className="px-8 font-black text-orange-900 uppercase tracking-tighter italic border-y border-orange-200">
                                  {reg.name}
                               </td>
                            </tr>
                            {reg.sites.map((s, si) => (
                               <tr key={si} className="h-12 border-b border-orange-50 hover:bg-orange-50/30 transition-colors">
                                  <td className="px-10 text-orange-950 font-black uppercase text-[10px]">{s.name}</td>
                                  <td className="text-center text-orange-600/60 font-mono">{s.fixe}</td>
                                  <td className="text-center text-orange-600/60 font-mono">{s.mobile}</td>
                                  <td className="text-center text-orange-950 font-mono font-black text-[13px] bg-orange-50">{s.totalJour}</td>
                                  <td className="text-center text-orange-400 font-mono italic">{s.gts || 0}</td>
                                  <td className="text-center text-orange-950 font-mono">{s.totalMois}</td>
                                  <td className="text-center text-orange-300 font-mono">{s.objMensuel}</td>
                                  <td className={`px-8 text-center font-black ${getPerfColor(s.achievement)}`}>{s.achievement.toFixed(0)}%</td>
                               </tr>
                            ))}
                            <tr className="h-14 bg-orange-950 text-white font-black text-[11px]">
                               <td className="px-8 uppercase tracking-widest">SOUS-TOTAL {reg.name}</td>
                               <td className="text-center font-mono opacity-60">{reg.fixePres}</td>
                               <td className="text-center font-mono opacity-60">{reg.mobilePres}</td>
                               <td className="text-center font-mono text-[16px] bg-orange-600">{reg.totalJourPres}</td>
                               <td className="text-center font-mono opacity-60">{reg.gtsPres}</td>
                               <td className="text-center font-mono opacity-60">{reg.totalMoisPres}</td>
                               <td className="text-center font-mono opacity-60">{reg.objMensPres}</td>
                               <td className="px-8 text-center text-[16px] text-orange-300">{(reg.objMensPres > 0 ? (reg.totalMoisPres / reg.objMensPres) * 100 : 0).toFixed(1)}%</td>
                            </tr>
                         </React.Fragment>
                       ))}
                       <tr className="h-20 bg-orange-950 text-white border-t-8 border-white">
                          <td className="px-8 text-2xl font-black uppercase tracking-tighter">TOTAL NATIONAL</td>
                          <td className="text-center text-xl font-mono text-orange-400">{nationalTotals.fixe}</td>
                          <td className="text-center text-xl font-mono text-orange-400">{nationalTotals.mobile}</td>
                          <td className="text-center text-4xl font-mono bg-orange-600">{nationalTotals.jour}</td>
                          <td className="text-center text-xl font-mono text-orange-400">{nationalTotals.gts}</td>
                          <td className="text-center text-xl font-mono text-orange-400">{nationalTotals.mois}</td>
                          <td className="text-center text-xl font-mono text-white/40">{nationalTotals.objectif}</td>
                          <td className="px-8 text-center text-4xl font-black text-orange-300">{nationalTotals.taux.toFixed(1)}%</td>
                       </tr>
                    </tbody>
                 </table>
              </div>
           </div>
         ) : (
           <div className="space-y-12">
              <div className="grid grid-cols-4 gap-8">
                <div className="bg-orange-50/50 p-8 rounded-[3rem] border border-orange-100 text-center">
                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-3">Volume Brut</p>
                    <p className="text-4xl font-black text-orange-950">{distTotals.qty.toLocaleString()}</p>
                 </div>
                 <div className="bg-orange-50/50 p-8 rounded-[3rem] border border-orange-100 text-center">
                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-3">Poches Rendues</p>
                    <p className="text-4xl font-black text-rose-600">{distTotals.rendu.toLocaleString()}</p>
                 </div>
                 <div className="bg-orange-600 p-8 rounded-[3rem] shadow-2xl text-center">
                    <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-3">Flux Net Servi</p>
                    <p className="text-4xl font-black text-white">{(distTotals.qty - distTotals.rendu).toLocaleString()}</p>
                 </div>
                 <div className="bg-orange-50/50 p-8 rounded-[3rem] border border-orange-100 text-center">
                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-3">Efficience Flux</p>
                    <p className="text-4xl font-black text-orange-600">{distTotals.efficiency.toFixed(1)}%</p>
                 </div>
              </div>

              <div className="overflow-x-auto bg-white rounded-[3.5rem] border border-orange-950 shadow-2xl">
                 <table className="w-full min-w-[1200px] border-collapse font-display text-[10px] font-bold">
                    <thead>
                       <tr className="bg-orange-950 text-white h-16">
                          <th className="px-8 text-left uppercase tracking-widest font-black sticky left-0 z-20 bg-orange-950">Source & Destination</th>
                          <th className="px-4 text-center uppercase tracking-widest font-black">Produit</th>
                          {SANG_GROUPS.map(g => <th key={g} className="px-2 text-center uppercase tracking-tighter text-[9px] min-w-[50px]">{g}</th>)}
                          <th className="px-4 text-center uppercase tracking-widest font-black text-rose-400">Rendu</th>
                          <th className="px-8 text-center uppercase tracking-widest font-black bg-orange-900">Total</th>
                       </tr>
                    </thead>
                    <tbody>
                       {Object.entries(registerData).map(([sit, sitD]: [string, any], si) => (
                         <React.Fragment key={si}>
                            <tr className="h-10 bg-orange-950/90 text-white">
                               <td colSpan={3+SANG_GROUPS.length} className="px-8 font-black uppercase tracking-widest text-[11px] italic sticky left-0 z-10">
                                  {sit}
                               </td>
                            </tr>
                            {Object.entries(sitD.destinations).map(([dest, destD]: [string, any], di) => (
                               Object.entries(destD.products).map(([prod, prM]: [string, any], pi) => {
                                 const totalP = SANG_GROUPS.reduce((a, g) => a + prM.groups[g], 0);
                                 return (
                                   <tr key={`${si}-${di}-${pi}`} className="h-12 border-b border-orange-50 hover:bg-orange-50/30 transition-colors group">
                                      <td className="px-10 text-orange-950 font-black uppercase tracking-tight truncate max-w-[250px] sticky left-0 z-10 bg-white group-hover:bg-orange-50/30">{dest}</td>
                                      <td className="px-4 text-center text-orange-400 font-black italic">{prod}</td>
                                      {SANG_GROUPS.map(g => <td key={g} className="text-center font-mono text-orange-600/70 border-x border-orange-50/30">{prM.groups[g] || '-'}</td>)}
                                      <td className="text-center font-mono font-black text-rose-500">{prM.rendu || '-'}</td>
                                      <td className="px-8 text-center font-mono font-black text-[13px] bg-orange-50/50">{totalP}</td>
                                   </tr>
                                 );
                               })
                            ))}
                         </React.Fragment>
                       ))}
                       <tr className="h-20 bg-orange-950 text-white border-t-8 border-orange-100">
                          <td colSpan={2} className="px-8 text-2xl font-black uppercase tracking-tighter sticky left-0 z-10 bg-orange-950">TOTAL CONSOLIDÉ</td>
                          {SANG_GROUPS.map(g => <td key={g} className="text-center text-lg font-mono text-orange-400">{distTotals.groups[g]}</td>)}
                          <td className="text-center text-2xl font-mono text-rose-500">{distTotals.rendu}</td>
                          <td className="px-8 text-center text-4xl font-mono bg-orange-600 text-white border-l border-white/20">{distTotals.qty}</td>
                       </tr>
                    </tbody>
                 </table>
              </div>
           </div>
         )}
         
         <div className="pt-10 flex justify-between items-end border-t border-orange-100">
            <div className="space-y-2">
               <p className="text-[10px] font-display font-black text-orange-950 uppercase tracking-widest flex items-center gap-3">
                  <Zap size={14} className="text-orange-500" /> Certification Officielle du Registre
               </p>
               <p className="text-[10px] font-display font-bold text-orange-300 uppercase tracking-widest leading-relaxed">Les données présentées dans ce rapport sont extraites en temps réel du cœur de réseau CNTS et font l'objet d'une validation hiérarchique.</p>
            </div>
            <div className={`p-6 rounded-[2rem] border border-orange-100 flex items-center gap-6 ${viewMode === 'collecte' ? 'shadow-lg bg-orange-50/50' : 'shadow-lg bg-orange-50/50'}`}>
                <div className="text-center px-4 border-r border-orange-200">
                   <p className="text-[8px] font-black text-orange-400 uppercase tracking-widest">Version</p>
                   <p className="text-xs font-black text-orange-950">Cockpit v4.0</p>
                </div>
                <div className="text-center px-4">
                   <p className="text-[8px] font-black text-orange-400 uppercase tracking-widest">Sécurité</p>
                   <p className="text-xs font-black text-orange-950 flex items-center gap-2"><Target size={12} className="text-orange-500" /> SSL-CRYPT</p>
                </div>
            </div>
         </div>
      </div>
    </div>
  );
}
