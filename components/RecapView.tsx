
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
  FileSpreadsheet, ChevronLeft, ChevronRight
} from 'lucide-react';
import { domToPng } from 'modern-screenshot';
import { jsPDF } from 'jspdf';
import { utils, writeFile } from 'xlsx';

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
  // Échelle de temps : Jour, Mois ou Année (Spécifique DIST)
  const [distTimeScale, setDistTimeScale] = useState<'day' | 'month' | 'year'>('month');
  
  // --- ÉTATS FILTRES TEMPORELS ---
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
  
  // --- ÉTATS PÉRIODE (NOUVEAU) ---
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

  const allDates = useMemo(() => {
    if (!data?.dailyHistory) return [];
    return data.dailyHistory.map(h => h.date).sort((a, b) => parseDate(b).getTime() - parseDate(a).getTime());
  }, [data?.dailyHistory]);

  // Options dynamiques pour les listes
  const regionsList = useMemo(() => Array.from(new Set(sites.map(s => s.region))).sort(), [sites]);
  const sitesList = useMemo(() => {
    if (filterRegion === "ALL") return sites.sort((a, b) => a.name.localeCompare(b.name));
    return sites.filter(s => s.region === filterRegion).sort((a, b) => a.name.localeCompare(b.name));
  }, [sites, filterRegion]);

  const productsList = useMemo(() => {
    if (!data?.distributions?.records) return [];
    return Array.from(new Set(data.distributions.records.map(r => r.typeProduit))).sort();
  }, [data?.distributions]);

  const availableMonths = useMemo(() => {
    if (!selectedYear || !data?.dailyHistory) return [];
    const months = new Set<number>();
    data.dailyHistory.forEach((h: any) => {
      const parts = h.date.split('/');
      if (parts[2] === selectedYear) months.add(parseInt(parts[1]) - 1);
    });
    if (data.distributions?.records) {
      data.distributions.records.forEach(r => {
        const parts = r.date.split('/');
        if (parts.length === 3 && parts[2] === selectedYear) {
          months.add(parseInt(parts[1]) - 1);
        }
      });
    }
    return Array.from(months).sort((a, b) => a - b);
  }, [data?.dailyHistory, data?.distributions, selectedYear]);

  const filteredDates = useMemo(() => {
    if (!selectedYear || selectedMonth === -1 || !data?.dailyHistory) return [];
    return data.dailyHistory.filter((h: any) => {
      const parts = h.date.split('/');
      return parts[2] === selectedYear && (parseInt(parts[1]) - 1) === selectedMonth;
    }).map((h: any) => h.date);
  }, [data?.dailyHistory, selectedYear, selectedMonth]);

  // --- LOGIQUE FILTRAGE DISTRIBUTION CONSOLIDÉE ---
  const filteredDistRecords = useMemo(() => {
    if (!data?.distributions?.records || !selectedYear) return [];
    
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

  const abidjanVilleDistributionSubtotal = useMemo(() => {
    if (!data) return null;
    const abidjanVilleSites = [
      "CRTS DE TREICHVILLE",
      "CDTS DE BINGERVILLE",
      "SP HG PORT BOUET",
      "SP FSU ABOBO BAOULE",
      "SP HG ANYAMA",
      "SP CHU DE COCODY",
      "SP CHU DE YOPOUGON"
    ];
    
    const totals = {
      groups: Object.fromEntries(SANG_GROUPS.map(g => [g, 0])),
      rendu: 0,
      gross: 0
    };
    
    let hasData = false;
    Object.entries(registerData).forEach(([sitName, sitData]: [string, any]) => {
      if (abidjanVilleSites.includes(sitName)) {
        hasData = true;
        Object.values(sitData.destinations).forEach((dest: any) => {
          Object.values(dest.products).forEach((prod: any) => {
            SANG_GROUPS.forEach(g => {
              totals.groups[g] += prod.groups[g];
              totals.gross += prod.groups[g];
            });
            totals.rendu += prod.rendu;
          });
        });
      }
    });
    
    return hasData ? totals : null;
  }, [registerData]);

  // LOGIQUE COLLECTE (Mise à jour pour gérer les périodes)
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

        // GTS Data
        let totalGts = 0;
        activeDates.forEach(date => {
          const gtsRecords = data.gts?.filter(g => g.date === date && g.site.toUpperCase() === s.name.toUpperCase());
          gtsRecords?.forEach(g => {
            totalGts += (g.fixe || 0) + (g.mobile || 0);
          });
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
          gts: totalGts,
          achievement: s.objMensuel > 0 ? (cumulMois / s.objMensuel) * 100 : 0 
        };
      });

      const abidjanVilleSites = [
        "CRTS DE TREICHVILLE",
        "CDTS DE BINGERVILLE",
        "SP HG PORT BOUET",
        "SP FSU ABOBO BAOULE",
        "SP HG ANYAMA",
        "SP CHU DE COCODY",
        "SP CHU DE YOPOUGON"
      ];
      
      const abidjanVilleData = region.name === "PRES ABIDJAN" ? sitesWithDayData.filter(s => abidjanVilleSites.includes(s.name)) : [];
      const abidjanVilleTotals = abidjanVilleData.length > 0 ? {
        fixe: abidjanVilleData.reduce((acc, s) => acc + s.fixe, 0),
        mobile: abidjanVilleData.reduce((acc, s) => acc + s.mobile, 0),
        jour: abidjanVilleData.reduce((acc, s) => acc + s.totalJour, 0),
        gts: abidjanVilleData.reduce((acc, s) => acc + s.gts, 0),
        mois: abidjanVilleData.reduce((acc, s) => acc + s.totalMois, 0),
        obj: abidjanVilleData.reduce((acc, s) => acc + s.objMensuel, 0),
        taux: abidjanVilleData.reduce((acc, s) => acc + s.objMensuel, 0) > 0 
          ? (abidjanVilleData.reduce((acc, s) => acc + s.totalMois, 0) / abidjanVilleData.reduce((acc, s) => acc + s.objMensuel, 0)) * 100 
          : 0
      } : null;

      return {
        ...region,
        sites: sitesWithDayData,
        totalJourPres: sitesWithDayData.reduce((acc, s) => acc + s.totalJour, 0),
        totalMoisPres: sitesWithDayData.reduce((acc, s) => acc + s.totalMois, 0),
        objMensPres: sitesWithDayData.reduce((acc, s) => acc + s.objMensuel, 0),
        fixePres: sitesWithDayData.reduce((acc, s) => acc + s.fixe, 0),
        mobilePres: sitesWithDayData.reduce((acc, s) => acc + s.mobile, 0),
        gtsPres: sitesWithDayData.reduce((acc, s) => acc + (s.gts || 0), 0),
        abidjanVille: abidjanVilleTotals
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

  if (!data) return null;

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
          excelData.push(["PRES / RÉGION", "LIBELLÉ SITE", "FIXE", "MOB.", isPeriodMode ? "TOTAL" : "TOTAL JOUR", "ENCODÉ GTS", "MOIS", "OBJECTIF/M", "TAUX/M"]);
          
          formattedCollecteData.forEach((region: any) => {
            region.sites.forEach((site: any) => {
              excelData.push([
                region.name,
                site.name,
                site.fixe,
                site.mobile,
                site.totalJour,
                site.gts,
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
              region.gtsPres,
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
            nationalTotals.gts,
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
        // Force a width that accommodates the widest table (Distribution is min-w-1200)
        const originalWidth = element.style.width;
        const originalMaxWidth = element.style.maxWidth;
        
        element.style.width = '1250px';
        element.style.maxWidth = 'none';
        
        await new Promise(res => setTimeout(res, 800));

        const imgData = await domToPng(element, { 
          scale: 2.5, 
          backgroundColor: '#ffffff',
        });

        element.style.width = originalWidth;
        element.style.maxWidth = originalMaxWidth;

        const link = document.createElement('a'); 
        link.download = `${filename}.png`; 
        link.href = imgData; 
        link.click();
      } else {
        // Force a width that accommodates the widest table
        const originalWidth = element.style.width;
        const originalMaxWidth = element.style.maxWidth;
        
        element.style.width = '1250px';
        element.style.maxWidth = 'none';
        
        await new Promise(res => setTimeout(res, 800));

        const imgData = await domToPng(element, { 
          scale: 2, 
          backgroundColor: '#ffffff',
        });

        element.style.width = originalWidth;
        element.style.maxWidth = originalMaxWidth;

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

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const marginTop = 20;
        const marginBottom = 20;
        const marginSide = 15;
        const contentWidth = pdfWidth - (marginSide * 2);
        const contentHeight = pdfHeight - marginTop - marginBottom;
        
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
          pdf.text('HS COCKPIT v4.0 - RÉCAPITULATIF DES ACTIVITÉS', logoImg.complete && logoImg.naturalWidth > 0 ? marginSide + 15 : marginSide, 12);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`Généré le ${new Date().toLocaleString()}`, pdfWidth - marginSide, 12, { align: 'right' });
          
          pdf.setDrawColor(240);
          pdf.line(marginSide, pdfHeight - 15, pdfWidth - marginSide, pdfHeight - 15);
          pdf.text(`Document de Référence - ${branding?.hashtag || ''}`, marginSide, pdfHeight - 10);
          pdf.text(`Page ${i + 1} sur ${totalPages}`, pdfWidth - marginSide, pdfHeight - 10, { align: 'right' });
        }
        
        pdf.save(`${filename}.pdf`);
      }
    } catch (err) { 
      console.error(err); 
      alert('Erreur lors de l\'export. Veuillez réessayer.');
    } finally { setExporting(null); }
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
             <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white ${viewMode === 'collecte' ? 'bg-orange-600' : 'bg-orange-600'}`}>
                {viewMode === 'collecte' ? <TableProperties size={28} /> : <ClipboardList size={28} />}
             </div>
             <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">
                  {viewMode === 'collecte' ? 'Rapport des Prélèvements' : 'SYNTHESE DIST'}
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Console de Pilotage Consolidée</p>
             </div>
          </div>

          <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
            <button 
              onClick={() => setViewMode('collecte')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'collecte' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Prélèvements
            </button>
            <button 
              onClick={() => setViewMode('distribution')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'distribution' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Distribution
            </button>
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
                   <CalendarIcon size={14} className="text-slate-400" />
                   <DatePicker
                     selected={selectedYearObj}
                     onChange={(date) => {
                       if (date) {
                         setSelectedYear(date.getFullYear().toString());
                       }
                     }}
                     showYearPicker
                     dateFormat="yyyy"
                     locale="fr"
                     className="bg-transparent font-black text-slate-800 text-[10px] outline-none cursor-pointer uppercase w-12"
                   />
                 </div>

                 {(viewMode === 'collecte' || distTimeScale !== 'year') && (
                   <div className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm">
                     <Filter size={14} className="text-slate-400" />
                     <DatePicker
                       selected={selectedMonthObj}
                       onChange={(date) => {
                         if (date) {
                           setSelectedMonth(date.getMonth());
                           setSelectedYear(date.getFullYear().toString());
                         } else {
                           setSelectedMonth(-1);
                         }
                       }}
                       showMonthYearPicker
                       dateFormat="MMMM yyyy"
                       locale="fr"
                       placeholderText="Tous les mois"
                       isClearable={viewMode === 'distribution'}
                       className="bg-transparent font-black text-slate-800 text-[10px] outline-none cursor-pointer uppercase w-32"
                     />
                   </div>
                 )}

                 {(viewMode === 'collecte' || distTimeScale === 'day') && (
                   <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border shadow-sm ${viewMode === 'collecte' ? 'bg-orange-50 border-orange-200' : 'bg-orange-50 border-orange-200'}`}>
                     <CalendarDays size={14} className={viewMode === 'collecte' ? 'text-orange-500' : 'text-orange-500'} />
                     <DatePicker
                       selected={selectedDateObj}
                       onChange={(date) => {
                         if (date) setSelectedDate(formatDate(date));
                       }}
                       dateFormat="dd/MM/yyyy"
                       locale="fr"
                       className="bg-white border border-slate-200 px-3 py-1 font-black text-slate-900 text-[10px] rounded-lg outline-none cursor-pointer w-24"
                     />
                   </div>
                 )}
               </>
             )}

             {isPeriodMode && viewMode === 'collecte' && (
               <div className="flex items-center gap-3">
                 <div className="flex items-center gap-2 bg-orange-50 px-4 py-2.5 rounded-xl border border-orange-200 shadow-sm">
                   <span className="text-[8px] font-black uppercase text-orange-400">Du</span>
                   <DatePicker
                     selected={startDateObj}
                     onChange={(date) => {
                       if (date) setStartDate(formatDate(date));
                     }}
                     dateFormat="dd/MM/yyyy"
                     locale="fr"
                     className="bg-white border border-slate-200 px-3 py-1 font-black text-slate-900 text-[10px] rounded-lg outline-none cursor-pointer w-24"
                   />
                 </div>
                 <ArrowRight size={14} className="text-slate-300" />
                 <div className="flex items-center gap-2 bg-orange-50 px-4 py-2.5 rounded-xl border border-orange-200 shadow-sm">
                   <span className="text-[8px] font-black uppercase text-orange-400">Au</span>
                   <DatePicker
                     selected={endDateObj}
                     onChange={(date) => {
                       if (date) setEndDate(formatDate(date));
                     }}
                     dateFormat="dd/MM/yyyy"
                     locale="fr"
                     className="bg-white border border-slate-200 px-3 py-1 font-black text-slate-900 text-[10px] rounded-lg outline-none cursor-pointer w-24"
                   />
                 </div>
               </div>
             )}
          </div>

          <div className="flex gap-2">
            <button onClick={() => handleExport('image')} disabled={!!exporting} className="px-5 py-3 bg-slate-100 text-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 transition-all border border-slate-200">
              {exporting === 'image' ? <Loader2 size={14} className="animate-spin" /> : <FileImage size={16} />} PNG
            </button>
            <button onClick={() => handleExport('excel')} disabled={!!exporting} className="px-5 py-3 bg-orange-50 text-orange-700 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-orange-100 transition-all border border-orange-200">
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
        <div ref={recapRef} className="min-w-[1000px] p-8 bg-white text-slate-900" style={{ width: '100%', maxWidth: '1150px', margin: '0 auto' }}>
          
          {/* HEADER DOCUMENT */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center bg-white shadow-xl overflow-hidden border border-slate-100`}>
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
                <h1 className="text-3xl font-[900] uppercase tracking-tight text-[#0f172a] leading-none">
                  {viewMode === 'collecte' ? 'DETAIL DES PRELEVEMENTS' : 'SYNTHESE DES DISTRIBUTIONS'}
                </h1>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2 italic">CENTRE NATIONAL DE TRANSFUSION SANGUINE CI</p>
              </div>
            </div>
            <div className="bg-orange-600 text-white px-6 py-2 rounded-2xl text-center">
               <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">SITUATION AU</p>
               <p className="text-xl font-black">{currentPeriodLabel}</p>
               {situationTime && (
                 <p className="text-[8px] font-bold text-orange-400 mt-1 uppercase tracking-widest">{situationTime}</p>
               )}
            </div>
          </div>

          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-3 gap-4 mb-10">
             <div className="border-2 border-orange-600 p-4 rounded-xl flex flex-col items-center justify-center bg-white text-center">
                <div className="flex items-center gap-2 mb-2 text-orange-600">
                   <CalendarDays size={18} /> <span className="text-[10px] font-black uppercase tracking-widest">{isPeriodMode ? 'TOTAL PÉRIODE' : 'FLUX JOUR'}</span>
                </div>
                <p className="text-5xl font-[900] text-[#0f172a] tracking-tighter">
                  {viewMode === 'collecte' ? nationalTotals.jour.toLocaleString() : distTotals.qty.toLocaleString()}
                </p>
             </div>
             <div className="border-2 border-orange-600 p-4 rounded-xl flex flex-col items-center justify-center bg-white text-center">
                <div className="flex items-center gap-2 mb-2 text-[#f97316]">
                   <Activity size={18} /> <span className="text-[10px] font-black uppercase tracking-widest">{viewMode === 'collecte' ? 'CUMUL MENSUEL' : 'SORTIES NETTES'}</span>
                </div>
                <p className="text-5xl font-[900] text-[#f97316] tracking-tighter">
                   {viewMode === 'collecte' ? nationalTotals.mois.toLocaleString() : (distTotals.qty - distTotals.rendu).toLocaleString()}
                </p>
             </div>
             <div className="border-2 border-orange-600 p-4 rounded-xl flex flex-col items-center justify-center bg-white text-center">
                <div className="flex items-center gap-2 mb-2 text-orange-600">
                   <Target size={18} /> <span className="text-[10px] font-black uppercase tracking-widest">{viewMode === 'collecte' ? 'OBJECTIF MENSUEL' : 'EFFICACITÉ NETTE'}</span>
                </div>
                <p className="text-5xl font-[900] text-[#f97316] tracking-tighter">
                   {viewMode === 'collecte' ? nationalTotals.objectif.toLocaleString() : distTotals.efficiency.toFixed(1) + '%'}
                </p>
             </div>
          </div>

          {/* TABLEAU RENDU */}
          {viewMode === 'collecte' ? (
            <>
              <div className="overflow-x-auto custom-scrollbar bg-white rounded-3xl shadow-xl border border-slate-200">
              <table className="w-full border-collapse text-[11px] font-bold text-slate-950 min-w-[950px]">
              <thead className="sticky top-0 z-20">
                <tr className="bg-slate-900 text-white h-12">
                  <th className="px-4 py-2 uppercase tracking-widest text-left w-[120px] font-black text-[10px]">PRES / RÉGION</th>
                  <th className="px-4 py-2 uppercase tracking-widest text-left w-[220px] font-black text-[10px]">LIBELLÉ SITE</th>
                  <th className="px-2 py-2 uppercase tracking-widest text-center w-[60px] font-black text-[10px]">FIXE</th>
                  <th className="px-2 py-2 uppercase tracking-widest text-center w-[60px] font-black text-[10px]">MOB.</th>
                  <th className="px-2 py-2 uppercase tracking-widest text-center w-[90px] font-black text-[10px]">{isPeriodMode ? 'TOTAL' : 'TOTAL JOUR'}</th>
                  <th className="px-2 py-2 uppercase tracking-widest text-center w-[90px] font-black text-[10px] bg-slate-800">ENCODÉ GTS</th>
                  <th className="px-2 py-2 uppercase tracking-widest text-center w-[90px] font-black text-[10px]">MOIS</th>
                  <th className="px-2 py-2 uppercase tracking-widest text-center w-[100px] font-black text-[10px]">OBJECTIF/M</th>
                  <th className="px-2 py-2 uppercase tracking-widest text-center w-[80px] font-black text-[10px]">TAUX/M</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {formattedCollecteData.length > 0 ? formattedCollecteData.map((region: any, rIdx: number) => {
                  const regColor = REGION_COLORS[region.name.trim().toUpperCase()] || '#ffffff';
                  const regTaux = region.objMensPres > 0 ? (region.totalMoisPres / region.objMensPres) * 100 : 0;
                  
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
                    <React.Fragment key={rIdx}>
                      {rows.map((row: any, idx: number) => {
                        if (row.isSubtotal) {
                          return (
                            <tr key="subtotal-abidjan" className="font-black h-12 bg-orange-50/50">
                              <td className="px-4 py-2 uppercase text-right pr-4 italic text-orange-900 border-r border-slate-100">SOUS-TOTAL ABIDJAN VILLE</td>
                              <td className="px-2 py-2 text-center text-orange-900 font-mono">{region.abidjanVille.fixe}</td>
                              <td className="px-2 py-2 text-center text-orange-900 font-mono">{region.abidjanVille.mobile}</td>
                              <td className={`px-2 py-2 text-center text-[13px] font-mono font-black ${region.abidjanVille.jour === region.abidjanVille.gts ? 'text-orange-600' : 'text-red-600'}`}>{region.abidjanVille.jour}</td>
                              <td className={`px-2 py-2 text-center text-[13px] font-mono font-black ${region.abidjanVille.gts === region.abidjanVille.jour ? 'text-orange-600' : 'text-red-600'}`}>{region.abidjanVille.gts}</td>
                              <td className="px-2 py-2 text-center text-orange-900 text-[13px] font-mono">{region.abidjanVille.mois.toLocaleString()}</td>
                              <td className="px-2 py-2 text-center text-orange-900 text-[13px] font-mono">{region.abidjanVille.obj.toLocaleString()}</td>
                              <td className={`px-2 py-2 text-center font-black text-[14px] font-mono ${getPerfColor(region.abidjanVille.taux)}`}>{region.abidjanVille.taux.toFixed(0)}%</td>
                            </tr>
                          );
                        }

                        const site = row;
                        return (
                          <tr key={`${rIdx}-${idx}`} style={{ backgroundColor: `${regColor}33` }} className="h-11 hover:bg-slate-50 transition-colors group">
                            {idx === 0 && (
                              <td rowSpan={rows.length + 1} className="px-4 py-4 align-top font-black uppercase text-[10px] text-slate-900 border-r border-slate-100" style={{ backgroundColor: regColor }}>
                                <div className="sticky top-16">
                                  {region.name}
                                </div>
                              </td>
                            )}
                            <td className="px-4 py-2 uppercase text-[10px] text-slate-700 font-bold border-r border-slate-100">
                              <button 
                                onClick={() => onSiteClick?.(site.name)}
                                className="hover:text-orange-600 transition-colors text-left font-black"
                              >
                                {site.name}
                              </button>
                            </td>
                            <td className="px-2 py-2 text-center text-slate-600 font-mono">{site.fixe}</td>
                            <td className="px-2 py-2 text-center text-slate-600 font-mono">{site.mobile}</td>
                            <td className={`px-2 py-2 text-center font-mono font-black text-[13px] ${site.totalJour === site.gts ? 'text-orange-600' : 'text-red-600'}`}>{site.totalJour}</td>
                            <td className={`px-2 py-2 text-center font-mono font-black text-[13px] bg-slate-50/50 ${site.gts === site.totalJour ? 'text-orange-600' : 'text-red-600'}`}>{site.gts}</td>
                            <td className="px-2 py-2 text-center text-slate-800 text-[13px] font-mono">{site.totalMois.toLocaleString()}</td>
                            <td className="px-2 py-2 text-center text-slate-400 text-[13px] font-mono">{site.objMensuel.toLocaleString()}</td>
                            <td className={`px-2 py-2 text-center font-mono font-black text-[14px] ${getPerfColor(site.achievement)}`}>{site.achievement.toFixed(0)}%</td>
                          </tr>
                        );
                      })}
                      <tr className="font-black h-12 bg-slate-900 text-white">
                        <td className="px-4 py-2 uppercase text-right pr-4 italic text-slate-300 border-r border-slate-800">TOTAL {region.name}</td>
                        <td className="px-2 py-2 text-center font-mono">{region.fixePres}</td>
                        <td className="px-2 py-2 text-center font-mono">{region.mobilePres}</td>
                        <td className={`px-2 py-2 text-center text-[14px] font-mono font-black ${region.totalJourPres === region.gtsPres ? 'text-orange-400' : 'text-rose-400'}`}>{region.totalJourPres}</td>
                        <td className={`px-2 py-2 text-center font-mono font-black text-[14px] bg-slate-800 ${region.gtsPres === region.totalJourPres ? 'text-orange-400' : 'text-rose-400'}`}>{region.gtsPres}</td>
                        <td className="px-2 py-2 text-center text-[14px] font-mono">{region.totalMoisPres.toLocaleString()}</td>
                        <td className="px-2 py-2 text-center text-slate-400 text-[14px] font-mono">{region.objMensPres.toLocaleString()}</td>
                        <td className={`px-2 py-2 text-center font-mono font-black text-[16px] ${getPerfColor(regTaux)}`}>{regTaux.toFixed(0)}%</td>
                      </tr>
                    </React.Fragment>
                  );
                }) : null}
              </tbody>
              <tfoot className="bg-white text-slate-950 font-black border-t-4 border-slate-900">
                <tr className="h-24">
                  <td colSpan={2} className="px-8 py-4 text-4xl uppercase tracking-tighter bg-slate-50">TOTAL NATIONAL</td>
                  <td className="px-2 py-2 text-center text-3xl font-mono bg-white">{nationalTotals.fixe.toLocaleString()}</td>
                  <td className="px-2 py-2 text-center text-3xl font-mono bg-white">{nationalTotals.mobile.toLocaleString()}</td>
                  <td className={`px-2 py-2 text-center text-6xl font-mono font-black ${nationalTotals.jour === nationalTotals.gts ? 'text-orange-600' : 'text-red-600'}`}>{nationalTotals.jour.toLocaleString()}</td>
                  <td className={`px-2 py-2 text-center text-6xl font-mono font-black bg-slate-50 ${nationalTotals.gts === nationalTotals.jour ? 'text-orange-600' : 'text-red-600'}`}>{nationalTotals.gts.toLocaleString()}</td>
                  <td className="px-2 py-2 text-center text-3xl font-mono bg-white">{nationalTotals.mois.toLocaleString()}</td>
                  <td className="px-2 py-2 text-center text-3xl font-mono text-slate-400 bg-white">{nationalTotals.objectif.toLocaleString()}</td>
                  <td className={`px-2 py-2 text-center text-4xl font-mono font-black ${getPerfColor(nationalTotals.taux)}`}>{nationalTotals.taux.toFixed(0)}%</td>
                </tr>
              </tfoot>
              </table>
              </div>
              <div className="h-12"></div>
           </>
           ) : (
          <>
             <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-x-auto custom-scrollbar">
               <table className="w-full border-collapse text-[11px] font-bold text-slate-950 leading-tight min-w-[1100px]">
                  <thead className="sticky top-0 z-20">
                     <tr className="bg-slate-900 text-white h-14">
                        <th className="px-4 py-2 text-left w-[150px] uppercase tracking-widest font-black text-[10px]">Site Source</th>
                        <th className="px-4 py-2 text-left w-[180px] uppercase tracking-widest font-black text-[10px]">Structure Servie</th>
                        <th className="px-4 py-2 text-left w-[140px] uppercase tracking-widest font-black text-[10px]">Produit</th>
                        {SANG_GROUPS.map(g => (
                <th 
                  key={g} 
                  className="px-1 py-2 text-center w-[55px] uppercase text-slate-950 font-black text-[11px]"
                  style={{ backgroundColor: GROUP_COLORS[g] || '#f1f5f9' }}
                >
                  {g}
                </th>
              ))}
                        <th className="px-4 py-2 text-right w-[70px] uppercase tracking-widest font-black text-[10px] text-rose-400">Rendu</th>
                        <th className="px-4 py-2 text-right w-[90px] uppercase tracking-widest font-black text-[10px] bg-slate-800 text-orange-400">Total</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
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
                                   const isPlasma = prodName.toUpperCase().includes('PLASMA');
                                   const isCgr = prodName.toUpperCase().includes('CGR');
                                   
                                   let rowBg = '';
                                   if (isPlasma) rowBg = 'bg-yellow-50';
                                   else if (prodName.toUpperCase().includes('CGR ADULTE')) rowBg = 'bg-orange-50';
                                   else if (prodName.toUpperCase().includes('CGR NOURRISSON')) rowBg = 'bg-orange-50/70';
                                   else if (prodName.toUpperCase().includes('CGR PEDIATRIQUE')) rowBg = 'bg-orange-50/40';

                                   return (
                                     <tr key={`${destName}-${prodName}`} className={`${rowBg || (pIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30')} hover:bg-slate-100 transition-colors group`}>
                                       {dIdx === 0 && pIdx === 0 && (
                                         <td rowSpan={rowCount + 1} className="px-4 py-4 align-top font-black text-orange-700 bg-orange-50/30 uppercase text-[10px] border-r border-slate-100">
                                           <div className="sticky top-20">
                                              <button 
                                                onClick={() => onSiteClick?.(sitName)}
                                                className="hover:text-orange-900 transition-colors text-left font-black"
                                              >
                                                {sitName}
                                              </button>
                                           </div>
                                         </td>
                                       )}
                                       {pIdx === 0 && <td rowSpan={Object.keys(destData.products).length} className="px-4 py-4 align-top text-slate-800 uppercase font-bold text-[10px] border-r border-slate-100">{destName}</td>}
                                       <td className="px-4 py-3 border-r border-slate-100">
                                         <span className="px-2 py-1 rounded-full text-[9px] font-black border uppercase inline-block leading-tight" style={{ color: isCgr || isPlasma ? 'inherit' : (PRODUCT_COLORS[prodName] || '#64748b'), borderColor: isCgr || isPlasma ? 'currentColor' : `${PRODUCT_COLORS[prodName]}33`, backgroundColor: isCgr || isPlasma ? 'transparent' : `${PRODUCT_COLORS[prodName]}11` }}>{prodName}</span>
                                       </td>
                                       {SANG_GROUPS.map(g => (
                                         <td 
                                           key={g} 
                                           className={`px-1 py-3 text-center text-[11px] font-mono ${prodMetrics.groups[g] > 0 ? 'font-black' : 'text-slate-200'}`}
                                           style={{ 
                                             backgroundColor: prodMetrics.groups[g] > 0 ? `${GROUP_COLORS[g]}22` : 'transparent',
                                             color: prodMetrics.groups[g] > 0 ? GROUP_COLORS[g] : 'inherit'
                                           }}
                                         >
                                           {prodMetrics.groups[g] || '-'}
                                         </td>
                                       ))}
                                       <td className="px-4 py-3 text-right font-mono font-black text-rose-600 text-[11px]">{prodMetrics.rendu || '-'}</td>
                                       <td className="px-4 py-3 text-right font-mono font-black text-slate-900 bg-slate-50/50 text-[12px]">{rowGrossTotal}</td>
                                     </tr>
                                   );
                                 })}
                               </React.Fragment>
                             ))}
                             <tr className="bg-slate-900 text-white font-black h-12">
                               <td colSpan={2} className="px-4 py-2 text-right uppercase tracking-widest text-slate-400 pr-6 italic text-[10px] border-r border-slate-800">SOUS-TOTAL RÉSEAU {sitName}</td>
                               {SANG_GROUPS.map(g => <td key={g} className="px-1 py-2 text-center text-white bg-slate-800 font-mono text-[11px]">{siteTotals[g]}</td>)}
                               <td className="px-4 py-2 text-right text-rose-400 font-mono text-[12px]">{siteRendu}</td>
                               <td className="px-4 py-2 text-right text-orange-400 font-mono text-[14px] bg-slate-800">{siteGrossTotal}</td>
                             </tr>
                           </React.Fragment>
                         );
                      })
                    ) : (
                      <tr><td colSpan={14} className="py-24 text-center text-slate-300 uppercase font-black tracking-widest italic">Aucune donnée trouvée pour cette sélection</td></tr>
                    )}
                  </tbody>
                  <tfoot className="bg-white text-slate-950 font-black border-t-4 border-slate-900">
                    <tr className="h-24">
                      <td colSpan={3} className="px-8 py-4 text-center uppercase tracking-tighter text-3xl bg-slate-50">TOTAL GÉNÉRAL CONSOLIDÉ</td>
                      {SANG_GROUPS.map(g => <td key={g} className="px-1 py-2 text-center text-2xl font-mono bg-white">{distTotals.groups[g]}</td>)}
                      <td className="px-4 py-2 text-right text-2xl font-mono text-rose-600 bg-white">{distTotals.rendu}</td>
                      <td className="px-4 py-2 text-right text-6xl font-mono text-orange-600 bg-slate-50">{distTotals.qty}</td>
                    </tr>
                    {abidjanVilleDistributionSubtotal && (
                      <tr className="h-14 bg-orange-600 text-white">
                        <td colSpan={3} className="px-6 py-2 text-right uppercase tracking-widest text-[12px] italic pr-8 bg-orange-700">SOUS-TOTAL ABIDJAN VILLE</td>
                        {SANG_GROUPS.map(g => <td key={g} className="px-1 py-2 text-center text-[14px] font-mono bg-orange-700/50">{abidjanVilleDistributionSubtotal.groups[g]}</td>)}
                        <td className="px-4 py-2 text-right text-orange-100 text-[14px] font-mono bg-orange-700/50">{abidjanVilleDistributionSubtotal.rendu}</td>
                        <td className="px-4 py-2 text-right text-orange-50 text-[24px] font-mono font-black bg-orange-800">{abidjanVilleDistributionSubtotal.gross}</td>
                      </tr>
                    )}
                  </tfoot>
               </table>
            </div>
            <div className="h-12"></div> {/* Espace de sécurité final */}
          </>
          )}

          {/* FOOTER DOCUMENT */}
          <div className="mt-12 flex justify-between items-center opacity-70 border-t-2 border-slate-100 pt-6">
            <div className="flex items-center gap-4">
              <div className={`w-5 h-5 rounded-full ${viewMode === 'collecte' ? 'bg-orange-600' : 'bg-orange-600'}`}></div>
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
}
