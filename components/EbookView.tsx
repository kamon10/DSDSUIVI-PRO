
import React, { useState, useRef, useMemo } from 'react';
import { DashboardData, User } from '../types.ts';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Book, Download, ChevronLeft, ChevronRight, Printer, FileText, Heart, 
  Package, Truck, Target, Activity, BookOpen, MapPin, BarChart3, 
  PieChart, TrendingUp, Globe, ShieldCheck, UserCheck, Database, 
  Search, X, CalendarDays, Clock, ArrowRight, FileSpreadsheet,
  ChevronDown, ChevronUp, Layers, Building2, ClipboardList, ListChecks
} from 'lucide-react';
import { domToPng } from 'modern-screenshot';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { SITES_DATA, PRES_COORDINATES } from '../constants.tsx';

interface EbookViewProps {
  data: DashboardData;
  user: User | null;
  branding: { logo: string; hashtag: string };
  sites: any[];
}

export const EbookView: React.FC<EbookViewProps> = ({ data, user, branding, sites }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const ebookRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const today = new Date();
  const weekNumber = Math.ceil((today.getDate() + new Date(today.getFullYear(), today.getMonth(), 1).getDay()) / 7);
  const weekLabel = `Semaine ${weekNumber} - ${data.month} ${data.year}`;

  const MONTHS_FR = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  const SANG_GROUPS = ["A+", "A-", "AB+", "AB-", "B+", "B-", "O+", "O-"];

  // --- LOGIQUE GTS & OBJECTIFS (Issue de GoalPulseView) ---
  const gtsStats = useMemo(() => {
    if (!data.gts) return { monthly: { realized: 0, objective: 0, percentage: 0 }, annual: { realized: 0, objective: 0, percentage: 0 } };
    
    const targetMonth = MONTHS_FR.indexOf(data.month);
    const targetYear = data.year;

    const monthlyRealized = data.gts
      .filter(r => {
        const parts = r.date.split('/');
        if (parts.length !== 3) return false;
        const m = parseInt(parts[1]);
        const y = parseInt(parts[2]);
        return m === targetMonth + 1 && y === targetYear;
      })
      .reduce((acc, r) => acc + (r.total || 0), 0);

    const annualRealized = data.gts
      .filter(r => {
        const parts = r.date.split('/');
        if (parts.length !== 3) return false;
        const y = parseInt(parts[2]);
        return y === targetYear;
      })
      .reduce((acc, r) => acc + (r.total || 0), 0);

    return {
      monthly: {
        realized: monthlyRealized,
        objective: data.monthly.objective,
        percentage: data.monthly.objective > 0 ? (monthlyRealized / data.monthly.objective) * 100 : 0
      },
      annual: {
        realized: annualRealized,
        objective: data.annual.objective,
        percentage: data.annual.objective > 0 ? (annualRealized / data.annual.objective) * 100 : 0
      }
    };
  }, [data.gts, data.month, data.year, data.monthly.objective, data.annual.objective]);

  const ratioStats = useMemo(() => {
    return {
      monthly: {
        realized: gtsStats.monthly.realized,
        objective: data.monthly.realized,
        percentage: data.monthly.realized > 0 ? (gtsStats.monthly.realized / data.monthly.realized) * 100 : 0
      },
      annual: {
        realized: gtsStats.annual.realized,
        objective: data.annual.realized,
        percentage: data.annual.realized > 0 ? (gtsStats.annual.realized / data.annual.realized) * 100 : 0
      }
    };
  }, [gtsStats, data.monthly.realized, data.annual.realized]);

  // --- LOGIQUE RECAP COLL (Issue de RecapView) ---
  const formattedCollecteData = useMemo(() => {
    const selectedDate = data.date;
    if (!selectedDate) return [];

    return data.regions.map(region => {
      const sitesWithDayData = region.sites.map(s => {
        const historyForDay = data.dailyHistory.find(h => h.date === selectedDate);
        const daySiteData = historyForDay?.sites.find(ds => ds.name.toUpperCase() === s.name.toUpperCase());
        
        const totalFixe = daySiteData?.fixe || 0;
        const totalMobile = daySiteData?.mobile || 0;
        const totalJour = daySiteData?.total || 0;

        const gtsRecords = data.gts?.filter(g => g.date === selectedDate && g.site.toUpperCase() === s.name.toUpperCase());
        const totalGts = gtsRecords?.reduce((acc, g) => acc + (g.fixe || 0) + (g.mobile || 0), 0) || 0;

        const parts = selectedDate.split('/').map(Number);
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
    });
  }, [data]);

  const nationalTotals = useMemo(() => {
    return formattedCollecteData.reduce((acc, r: any) => ({
      fixe: acc.fixe + r.fixePres,
      mobile: acc.mobile + r.mobilePres,
      jour: acc.jour + r.totalJourPres,
      mois: acc.mois + r.totalMoisPres,
      objectif: acc.objectif + r.objMensPres,
      gts: acc.gts + r.gtsPres
    }), { fixe: 0, mobile: 0, jour: 0, mois: 0, objectif: 0, gts: 0 });
  }, [formattedCollecteData]);

  // --- LOGIQUE DETAIL DIST (Issue de DistributionDetailedSynthesisView) ---
  const synthesisDistData = useMemo(() => {
    const distributions = data.distributions?.records || [];
    const grouped = new Map<string, any>();
    const normalize = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim() : "";

    SITES_DATA.forEach(siteBase => {
      const regName = siteBase.region || "DIRECTION NATIONALE";
      if (!grouped.has(regName)) {
        grouped.set(regName, {
          name: regName, sites: [], totals: {
            cgrAdulte: 0, cgrPedia: 0, cgrNourri: 0, plasma: 0, plaquettes: 0, total: 0
          }
        });
      }
      const g = grouped.get(regName);
      const siteDist = distributions.filter(d => normalize(d.site) === normalize(siteBase.name));

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
        total: siteDist.reduce((acc, d) => acc + (d.quantite - (d.rendu || 0)), 0)
      };

      g.sites.push(stats);
      g.totals.cgrAdulte += stats.cgrAdulte;
      g.totals.cgrPedia += stats.cgrPedia;
      g.totals.cgrNourri += stats.cgrNourri;
      g.totals.plasma += stats.plasma;
      g.totals.plaquettes += stats.plaquettes;
      g.totals.total += stats.total;
    });

    return Array.from(grouped.values()).filter(g => g.sites.length > 0);
  }, [data.distributions]);

  const grandDistTotals = useMemo(() => {
    return synthesisDistData.reduce((acc, reg) => {
      acc.cgrAdulte += reg.totals.cgrAdulte;
      acc.cgrPedia += reg.totals.cgrPedia;
      acc.cgrNourri += reg.totals.cgrNourri;
      acc.plasma += reg.totals.plasma;
      acc.plaquettes += reg.totals.plaquettes;
      acc.total += reg.totals.total;
      return acc;
    }, { cgrAdulte: 0, cgrPedia: 0, cgrNourri: 0, plasma: 0, plaquettes: 0, total: 0 });
  }, [synthesisDistData]);

  const synthesisStockData = useMemo(() => {
    const stock = data.stock || [];
    const grouped = new Map<string, any>();
    const normalize = (s: string) => (s || "").replace(/\s/g, "").toUpperCase();

    SITES_DATA.forEach(siteBase => {
      const regName = siteBase.region || "DIRECTION NATIONALE";
      if (!grouped.has(regName)) {
        grouped.set(regName, {
          name: regName, sites: [], totals: { cgrAdulte: 0, cgrPedia: 0, cgrNourri: 0, plasma: 0, plaquettes: 0, oPlus: 0, oMoins: 0, totalCgr: 0 }
        });
      }
      const g = grouped.get(regName);
      const siteStock = stock.filter(s => normalize(s.site) === normalize(siteBase.name));

      const stats = {
        name: siteBase.name,
        cgrAdulte: siteStock.filter(s => normalize(s.typeProduit).includes('CGR') && normalize(s.typeProduit).includes('ADULTE')).reduce((acc, s) => acc + s.quantite, 0),
        cgrPedia: siteStock.filter(s => normalize(s.typeProduit).includes('CGR') && normalize(s.typeProduit).includes('PEDIA')).reduce((acc, s) => acc + s.quantite, 0),
        cgrNourri: siteStock.filter(s => normalize(s.typeProduit).includes('CGR') && normalize(s.typeProduit).includes('NOURRI')).reduce((acc, s) => acc + s.quantite, 0),
        plasma: siteStock.filter(s => normalize(s.typeProduit).includes('PLASMA')).reduce((acc, s) => acc + s.quantite, 0),
        plaquettes: siteStock.filter(s => normalize(s.typeProduit).includes('PLAQUETTE')).reduce((acc, s) => acc + s.quantite, 0),
        oPlus: siteStock.filter(s => normalize(s.typeProduit).includes('CGR') && normalize(s.groupeSanguin) === 'O+').reduce((acc, s) => acc + s.quantite, 0),
        oMoins: siteStock.filter(s => normalize(s.typeProduit).includes('CGR') && normalize(s.groupeSanguin) === 'O-').reduce((acc, s) => acc + s.quantite, 0),
        totalCgr: siteStock.filter(s => normalize(s.typeProduit).includes('CGR')).reduce((acc, s) => acc + s.quantite, 0)
      };

      g.sites.push(stats);
      g.totals.cgrAdulte += stats.cgrAdulte;
      g.totals.cgrPedia += stats.cgrPedia;
      g.totals.cgrNourri += stats.cgrNourri;
      g.totals.plasma += stats.plasma;
      g.totals.plaquettes += stats.plaquettes;
      g.totals.oPlus += stats.oPlus;
      g.totals.oMoins += stats.oMoins;
      g.totals.totalCgr += stats.totalCgr;
    });

    return Array.from(grouped.values()).filter(g => g.sites.length > 0);
  }, [data.stock]);

  const grandStockTotals = useMemo(() => {
    return synthesisStockData.reduce((acc, reg) => {
      acc.cgrAdulte += reg.totals.cgrAdulte;
      acc.cgrPedia += reg.totals.cgrPedia;
      acc.cgrNourri += reg.totals.cgrNourri;
      acc.plasma += reg.totals.plasma;
      acc.plaquettes += reg.totals.plaquettes;
      acc.oPlus += reg.totals.oPlus;
      acc.oMoins += reg.totals.oMoins;
      acc.totalCgr += reg.totals.totalCgr;
      return acc;
    }, { cgrAdulte: 0, cgrPedia: 0, cgrNourri: 0, plasma: 0, plaquettes: 0, oPlus: 0, oMoins: 0, totalCgr: 0 });
  }, [synthesisStockData]);

  // --- LOGIQUE SUIVI GTS (Issue de GtsSynthesis) ---
  const regionalGtsSynthesis = useMemo(() => {
    const gtsData = data.gts || [];
    const regions: Record<string, { fixe: number, mobile: number, auto: number, total: number, collectes: number }> = {};

    gtsData.forEach(r => {
      const reg = r.region || "AUTRES";
      if (!regions[reg]) {
        regions[reg] = { fixe: 0, mobile: 0, auto: 0, total: 0, collectes: 0 };
      }
      regions[reg].fixe += r.fixe;
      regions[reg].mobile += r.mobile;
      regions[reg].auto += r.autoTransfusion;
      regions[reg].total += r.total;
      if (r.caCode !== 'Z' && r.pvCode !== 0) {
        regions[reg].collectes += 1;
      }
    });

    return Object.entries(regions).map(([name, data]) => ({ name, ...data }));
  }, [data.gts]);

  const gtsGlobalStats = useMemo(() => {
    const gtsData = data.gts || [];
    return {
      totalRecords: gtsData.length,
      totalFixe: gtsData.reduce((acc, r) => acc + (Number(r.fixe) || 0), 0),
      totalMobile: gtsData.reduce((acc, r) => acc + (Number(r.mobile) || 0), 0),
      totalAuto: gtsData.reduce((acc, r) => acc + (Number(r.autoTransfusion) || 0), 0),
      totalQty: gtsData.reduce((acc, r) => acc + (Number(r.total) || 0), 0),
    };
  }, [data.gts]);

  const renderPulseCard = (title: string, stats: any, type: 'prel' | 'gts' | 'ratio', mode: 'monthly' | 'annual') => {
    const isRatio = type === 'ratio';
    const isSuccess = stats.percentage >= 100;
    const accentColor = type === 'prel' 
      ? (mode === 'monthly' ? 'rgba(249, 115, 22, 0.85)' : 'rgba(16, 185, 129, 0.85)')
      : type === 'gts'
        ? (mode === 'monthly' ? 'rgba(79, 70, 229, 0.85)' : 'rgba(124, 58, 237, 0.85)')
        : (mode === 'monthly' ? 'rgba(51, 65, 85, 0.85)' : 'rgba(15, 23, 42, 0.85)');
    
    const bgImage = type === 'prel'
      ? (mode === 'monthly' 
          ? "https://images.unsplash.com/photo-1615461066841-6116ecaaba7f?q=80&w=1920&auto=format&fit=crop"
          : "https://images.unsplash.com/photo-1579154235602-3c373748d17c?q=80&w=1920&auto=format&fit=crop")
      : type === 'gts'
        ? "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=1920&auto=format&fit=crop"
        : "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1920&auto=format&fit=crop";

    return (
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl shadow-md bg-slate-900">
        <div className="absolute inset-0 opacity-40 bg-cover bg-center" style={{ backgroundImage: `url(${bgImage})` }} />
        <div className="absolute inset-0" style={{ backgroundColor: accentColor }} />
        <div className="absolute inset-0 p-4 flex flex-col items-center justify-between text-white text-center">
          <div className="w-full">
            <p className="text-[7px] font-black uppercase tracking-[0.2em] opacity-80">{title}</p>
            <h2 className="text-sm font-black tracking-tighter uppercase">{isSuccess ? 'BRAVO' : 'EN COURS'}</h2>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-4xl font-black leading-none tracking-tighter">
              {stats.realized.toLocaleString()}{isRatio ? '%' : ''}
            </div>
            <p className="text-[8px] font-black uppercase tracking-widest my-1 opacity-60">SUR</p>
            <div className="text-2xl font-black leading-none tracking-tighter opacity-80">{stats.objective.toLocaleString()}{isRatio ? '%' : ''}</div>
            <div className="text-lg font-black mt-2 bg-white/20 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">{Math.round(stats.percentage)}%</div>
          </div>
          <div className="w-full">
            <p className="text-[8px] font-black uppercase tracking-tighter leading-tight opacity-80">
              {type === 'ratio' ? 'TAUX D\'ENCODAGE EFFECTUÉ' : (type === 'gts' ? 'POCHES GTS TRANSPORTÉES' : 'POCHES DE SANG COLLECTÉES')}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const TOTAL_PAGES = 19;

  const pages = [
    {
      title: "Couverture",
      icon: <Book size={24} />,
      content: (
        <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-500" />
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-32 h-32 bg-white rounded-3xl p-4 mb-8 shadow-2xl"
          >
            <img src={branding.logo} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          </motion.div>
          <h1 className="text-5xl font-black tracking-tighter uppercase mb-4">Rapport Hebdomadaire</h1>
          <p className="text-xl font-bold text-blue-400 tracking-[0.2em] uppercase mb-12">Personnel & Staff</p>
          <div className="w-24 h-1 bg-white/20 mb-12" />
          <p className="text-2xl font-black tracking-tight mb-2">{weekLabel}</p>
          <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">{branding.hashtag}</p>
          
          <div className="absolute bottom-12 left-12 text-left">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Généré par</p>
            <p className="text-sm font-bold">{user?.prenoms} {user?.nom || 'Système HEMO'}</p>
          </div>
          
          {/* Page Number for Cover */}
          <div className="absolute bottom-12 right-12">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Page 1 / {TOTAL_PAGES}</p>
          </div>
        </div>
      )
    },
    {
      title: "Sommaire",
      icon: <ListChecks size={24} />,
      content: (
        <div className="h-full bg-white p-12 flex flex-col rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
          
          <div className="flex items-center gap-4 mb-12 relative z-10">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-200">
              <ListChecks size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter uppercase text-slate-900">Sommaire</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Structure du rapport hebdomadaire</p>
            </div>
          </div>

          <div className="flex-1 space-y-4 relative z-10">
            {[
              { id: 1, title: "Couverture", page: 1 },
              { id: 2, title: "Sommaire", page: 2 },
              { id: 3, title: "Synthèse Décisionnelle", page: 3 },
              { id: 4, title: "Prélèvements (Vue d'ensemble)", page: 4 },
              { id: 5, title: "Stock National", page: 5 },
              { id: 6, title: "Distribution & Flux", page: 6 },
              { id: 7, title: "Objectifs & KPI", page: 7 },
              { id: 8, title: "Synthèse Narrative", page: 8 },
              { id: 9, title: "Détail des Prélèvements (1/2)", page: 9 },
              { id: 10, title: "Détail des Prélèvements (2/2)", page: 10 },
              { id: 11, title: "Détail des Distributions (1/2)", page: 11 },
              { id: 12, title: "Détail des Distributions (2/2)", page: 12 },
              { id: 13, title: "Détail des Stocks (1/2)", page: 13 },
              { id: 14, title: "Détail des Stocks (2/2)", page: 14 },
              { id: 15, title: "Suivi Logistique GTS (1/2)", page: 15 },
              { id: 16, title: "Suivi Logistique GTS (2/2)", page: 16 },
              { id: 17, title: "Capsules de Performance", page: 17 },
              { id: 18, title: "Cartographie Nationale", page: 18 },
              { id: 19, title: "Glossaire & Méthodologie", page: 19 },
            ].map((item) => (
              <div key={item.id} className="flex items-center group cursor-pointer" onClick={() => setCurrentPage(item.page - 1)}>
                <span className="text-xs font-black text-slate-300 w-8">{item.id.toString().padStart(2, '0')}</span>
                <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{item.title}</span>
                <div className="flex-1 border-b border-dotted border-slate-200 mx-4 mb-1" />
                <span className="text-sm font-black text-slate-900">Page {item.page}</span>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center text-white text-[8px] font-black">H</div>
              <p className="text-[8px] font-black text-slate-900 tracking-widest uppercase">HEMO-DASHBOARD</p>
            </div>
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Page 2 / {TOTAL_PAGES}</p>
          </div>
        </div>
      )
    },
    {
      title: "Synthèse Décisionnelle",
      icon: <BarChart3 size={24} />,
      content: (
        <div className="h-full bg-white p-10 flex flex-col rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
          
          <div className="flex items-center gap-4 mb-8 relative z-10">
            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-100">
              <BarChart3 size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter uppercase text-slate-900">Synthèse Décisionnelle</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Indicateurs clés de performance (KPI)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8 relative z-10">
            <div className="bg-slate-900 p-6 rounded-[2rem] shadow-2xl">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Taux de Réalisation Mensuel</p>
              <div className="flex items-end gap-4">
                <p className="text-5xl font-black text-white tracking-tighter">{Math.round(data.monthly.percentage)}%</p>
                <div className="mb-2">
                  <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Objectif</p>
                  <p className="text-sm font-bold text-white/80">{data.monthly.objective.toLocaleString()}</p>
                </div>
              </div>
              <div className="mt-4 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, data.monthly.percentage)}%` }} />
              </div>
            </div>
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Volume de Stock Total</p>
              <div className="flex items-end gap-4">
                <p className="text-5xl font-black text-slate-900 tracking-tighter">{grandStockTotals.totalCgr.toLocaleString()}</p>
                <div className="mb-2">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Poches CGR</p>
                  <p className="text-sm font-bold text-slate-600">Disponibles</p>
                </div>
              </div>
              <div className="mt-4 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: '75%' }} />
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-4 relative z-10">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Distribution</p>
                <p className="text-xl font-black text-indigo-600 tracking-tighter">{data.distributions?.stats.total.toLocaleString() || 0}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase">Poches livrées</p>
              </div>
              <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Logistique GTS</p>
                <p className="text-xl font-black text-orange-600 tracking-tighter">{gtsGlobalStats.totalQty.toLocaleString()}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase">Poches encodées</p>
              </div>
              <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Taux d'encodage</p>
                <p className="text-xl font-black text-emerald-600 tracking-tighter">{Math.round(ratioStats.monthly.percentage)}%</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase">Efficacité flux</p>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Analyse de la période</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mt-0.5">
                    <TrendingUp size={12} />
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <span className="font-bold text-slate-900">Collecte :</span> Performance stable avec une progression de {Math.round(data.monthly.percentage)}% par rapport à l'objectif mensuel.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mt-0.5">
                    <ShieldCheck size={12} />
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <span className="font-bold text-slate-900">Sécurité :</span> Le stock national de CGR (O+) est à {grandStockTotals.oPlus} unités, assurant une couverture critique.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 mt-0.5">
                    <Activity size={12} />
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <span className="font-bold text-slate-900">Logistique :</span> {gtsGlobalStats.totalQty.toLocaleString()} poches ont été tracées via le système GTS cette semaine.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center text-white text-[8px] font-black">H</div>
              <p className="text-[8px] font-black text-slate-900 tracking-widest uppercase">HEMO-DASHBOARD</p>
            </div>
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Page 3 / {TOTAL_PAGES}</p>
          </div>
        </div>
      )
    },
    {
      title: "Prélèvements",
      icon: <Heart size={24} />,
      content: (
        <div className="h-full bg-white p-10 flex flex-col rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
          
          <div className="flex items-center gap-4 mb-8 relative z-10">
            <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-100">
              <Heart size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter uppercase text-slate-900">Prélèvements</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Récapitulatif de la collecte</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6 mb-10 relative z-10">
            <div className="bg-slate-900 p-6 rounded-[2rem] shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 to-transparent opacity-50" />
              <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-2 relative z-10">Réalisé (Mois)</p>
              <p className="text-5xl font-black text-white relative z-10 tracking-tighter">{data.monthly.realized.toLocaleString()}</p>
              <div className="mt-6 h-2 bg-white/10 rounded-full overflow-hidden relative z-10">
                <div className="h-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" style={{ width: `${Math.min(100, data.monthly.percentage)}%` }} />
              </div>
              <p className="text-[10px] font-bold text-orange-400 mt-3 relative z-10 uppercase tracking-widest">{Math.round(data.monthly.percentage)}% de l'objectif</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 to-transparent opacity-50" />
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 relative z-10">Réalisé (Annuel)</p>
              <p className="text-5xl font-black text-slate-900 relative z-10 tracking-tighter">{data.annual.realized.toLocaleString()}</p>
              <div className="mt-6 h-2 bg-slate-200 rounded-full overflow-hidden relative z-10">
                <div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" style={{ width: `${Math.min(100, data.annual.percentage)}%` }} />
              </div>
              <p className="text-[10px] font-bold text-emerald-600 mt-3 relative z-10 uppercase tracking-widest">{Math.round(data.annual.percentage)}% de l'objectif</p>
            </div>
          </div>

          <div className="flex-1 overflow-hidden relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Historique des 5 derniers jours</h3>
              <div className="h-px flex-1 bg-slate-100 mx-6" />
            </div>
            <div className="space-y-3">
              {data.dailyHistory.slice(0, 6).map((day, i) => (
                <div key={i} className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <span className="text-sm font-black text-slate-700">{day.date}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Poches</p>
                      <p className="text-xl font-black text-slate-900 tracking-tighter">{day.stats.realized}</p>
                    </div>
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Branding */}
          <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center text-white text-[8px] font-black">H</div>
              <p className="text-[8px] font-black text-slate-900 tracking-widest uppercase">HEMO-DASHBOARD</p>
            </div>
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Page 4 / {TOTAL_PAGES}</p>
          </div>
        </div>
      )
    },
    {
      title: "Stock",
      icon: <Package size={24} />,
      content: (
        <div className="h-full bg-white p-10 flex flex-col rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
          
          <div className="flex items-center gap-4 mb-8 relative z-10">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-100">
              <Package size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter uppercase text-slate-900">Stock National</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">État des réserves stratégiques</p>
            </div>
          </div>

          {data.stock ? (
            <div className="grid grid-cols-1 gap-8 relative z-10">
              <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent opacity-50" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-8 relative z-10">Répartition par Groupe Sanguin</h3>
                <div className="grid grid-cols-4 gap-4 relative z-10">
                  {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(group => {
                    const count = data.stock?.filter(s => s.groupeSanguin === group).reduce((acc, s) => acc + s.quantite, 0) || 0;
                    return (
                      <div key={group} className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center group hover:bg-white/20 transition-all">
                        <p className="text-lg font-black text-white mb-1">{group}</p>
                        <p className="text-2xl font-black text-blue-400 tracking-tighter">{count}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Top 5 des Sites de Stockage</h3>
                  <div className="h-px flex-1 bg-slate-200 mx-6" />
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {Array.from(new Set(data.stock.map(s => s.site))).slice(0, 5).map((site, i) => {
                    const total = data.stock?.filter(s => s.site === site).reduce((acc, s) => acc + s.quantite, 0) || 0;
                    return (
                      <div key={site} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-4">
                          <span className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-400">{i + 1}</span>
                          <span className="text-sm font-black text-slate-700">{site}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-black text-slate-900 tracking-tighter">{total}</span>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Unités</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 italic">Données de stock non disponibles</div>
          )}

          {/* Footer Branding */}
          <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center text-white text-[8px] font-black">H</div>
              <p className="text-[8px] font-black text-slate-900 tracking-widest uppercase">HEMO-DASHBOARD</p>
            </div>
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Page 3 / {TOTAL_PAGES}</p>
          </div>
        </div>
      )
    },
    {
      title: "Distribution",
      icon: <Truck size={24} />,
      content: (
        <div className="h-full bg-white p-10 flex flex-col rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
          
          <div className="flex items-center gap-4 mb-8 relative z-10">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
              <Truck size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter uppercase text-slate-900">Distribution</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Flux vers les établissements de santé</p>
            </div>
          </div>

          {data.distributions ? (
            <div className="space-y-8 relative z-10">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-slate-900 p-6 rounded-[2rem] shadow-2xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-transparent opacity-50" />
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 relative z-10">Total Distribué</p>
                  <p className="text-5xl font-black text-white relative z-10 tracking-tighter">{data.distributions.stats.total.toLocaleString()}</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-transparent opacity-50" />
                  <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest mb-2 relative z-10">Total Rendu</p>
                  <p className="text-5xl font-black text-slate-900 relative z-10 tracking-tighter">{data.distributions.stats.totalRendu.toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dernières Distributions (Détails)</h3>
                  <div className="h-px flex-1 bg-slate-200 mx-6" />
                </div>
                <div className="space-y-3">
                  {data.distributions.records.slice(0, 7).map((record, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                          <Truck size={16} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{record.date}</span>
                          <span className="text-sm font-black text-slate-700">{record.etablissement}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black text-indigo-600 tracking-tighter">+{record.quantite}</span>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Poches</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 italic">Données de distribution non disponibles</div>
          )}

          {/* Footer Branding */}
          <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center text-white text-[8px] font-black">H</div>
              <p className="text-[8px] font-black text-slate-900 tracking-widest uppercase">HEMO-DASHBOARD</p>
            </div>
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Page 4 / {TOTAL_PAGES}</p>
          </div>
        </div>
      )
    },
    {
      title: "Objectifs",
      icon: <Target size={24} />,
      content: (
        <div className="h-full bg-white p-10 flex flex-col rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
          
          <div className="flex items-center gap-4 mb-8 relative z-10">
            <div className="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-rose-100">
              <Target size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter uppercase text-slate-900">Objectifs & KPI</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Suivi des indicateurs de performance</p>
            </div>
          </div>

          <div className="space-y-6 relative z-10">
            <div className="p-8 bg-slate-900 text-white rounded-[2.5rem] shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-600/20 to-transparent opacity-50" />
              <div className="flex justify-between items-end mb-6 relative z-10">
                <div>
                  <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2">Objectif Mensuel Global</p>
                  <p className="text-5xl font-black tracking-tighter">{data.monthly.objective.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-black text-emerald-400 tracking-tighter">{Math.round(data.monthly.percentage)}%</p>
                </div>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden relative z-10">
                <div className="h-full bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]" style={{ width: `${Math.min(100, data.monthly.percentage)}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 relative z-10">
              <div className="p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm flex flex-col justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Fixe</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-slate-900 tracking-tighter">{data.monthly.fixed.toLocaleString()}</p>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Poches</span>
                </div>
              </div>
              <div className="p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm flex flex-col justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Mobile</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-slate-900 tracking-tighter">{data.monthly.mobile.toLocaleString()}</p>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Poches</span>
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Performance Annuelle Consolidée</h3>
                <div className="h-px flex-1 bg-slate-200 mx-6" />
              </div>
              <div className="flex items-center gap-8">
                <div className="flex-1">
                  <div className="flex justify-between text-[10px] font-black uppercase mb-3 text-slate-500">
                    <span className="tracking-widest">Progression Annuelle</span>
                    <span className="text-emerald-600">{Math.round(data.annual.percentage)}%</span>
                  </div>
                  <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" style={{ width: `${Math.min(100, data.annual.percentage)}%` }} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Reste à collecter</p>
                  <p className="text-2xl font-black text-slate-900 tracking-tighter">{(data.annual.objective - data.annual.realized).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Branding */}
          <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center text-white text-[8px] font-black">H</div>
              <p className="text-[8px] font-black text-slate-900 tracking-widest uppercase">HEMO-DASHBOARD</p>
            </div>
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Page 5 / {TOTAL_PAGES}</p>
          </div>
        </div>
      )
    },
    {
      title: "Synthèse",
      icon: <Activity size={24} />,
      content: (
        <div className="h-full bg-white p-10 flex flex-col rounded-3xl shadow-xl border border-slate-100">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
              <Activity size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter uppercase text-slate-900">Synthèse Globale</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vue d'ensemble de la performance</p>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 gap-6">
            <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 relative overflow-hidden shadow-inner">
              <div className="relative z-10">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Statut Hebdomadaire</p>
                <p className="text-2xl font-medium text-slate-700 leading-relaxed italic font-serif">
                  "La semaine a été marquée par une activité soutenue. Les objectifs de collecte sont en bonne voie avec un taux de réalisation de <span className="text-emerald-600 font-black not-italic">{Math.round(data.monthly.percentage)}%</span> pour le mois de <span className="text-slate-900 font-black not-italic uppercase">{data.month}</span>. Le stock reste stable malgré une forte demande de distribution."
                </p>
              </div>
              <Activity className="absolute -bottom-20 -right-20 text-slate-200/50" size={300} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white border border-slate-100 rounded-3xl shadow-sm">
                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Collecte</p>
                <div className="w-2 h-2 rounded-full bg-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-bold">Stable</p>
              </div>
              <div className="text-center p-4 bg-white border border-slate-100 rounded-3xl shadow-sm">
                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Stock</p>
                <div className="w-2 h-2 rounded-full bg-orange-500 mx-auto mb-2" />
                <p className="text-xs font-bold">Vigilance</p>
              </div>
              <div className="text-center p-4 bg-white border border-slate-100 rounded-3xl shadow-sm">
                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Distrib.</p>
                <div className="w-2 h-2 rounded-full bg-blue-500 mx-auto mb-2" />
                <p className="text-xs font-bold">Active</p>
              </div>
            </div>

            <div className="mt-auto pt-8 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200">
                  <img src={branding.logo} alt="Logo" className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">HEMO-STATS</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Rapport Automatisé</p>
                </div>
              </div>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Page 6 / {TOTAL_PAGES}</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "DETAIL DES PRELEVEMENTS (1/2)",
      icon: <ListChecks size={24} />,
      content: (
        <div className="h-full bg-white p-6 flex flex-col rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <ListChecks size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tighter uppercase text-slate-900">DETAIL DES PRELEVEMENTS (1/2)</h2>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Détail des prélèvements par site - Partie 1</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto border border-slate-200 rounded-[2rem] shadow-inner bg-slate-50/30">
            <table className="w-full text-[11px] border-collapse">
              <thead className="sticky top-0 bg-slate-900 text-white z-20 shadow-md">
                <tr>
                  <th className="p-4 text-left border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">PRES / RÉGION</th>
                  <th className="p-4 text-left border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">LIBELLÉ SITE</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">FIXE</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">MOB.</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">TOTAL JOUR</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">ENCODÉ GTS</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">MOIS</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">OBJECTIF/M</th>
                  <th className="p-4 text-center uppercase tracking-widest text-[9px] font-black">TAUX/M</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {formattedCollecteData.slice(0, 5).map((region: any) => (
                  <React.Fragment key={region.name}>
                    {region.sites.map((site: any, idx: number) => (
                      <tr key={site.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        {idx === 0 && (
                          <td rowSpan={region.sites.length} className="p-4 font-black border-r border-slate-200 align-middle bg-slate-100 text-slate-900 text-center">
                            <div className="rotate-180 [writing-mode:vertical-lr] whitespace-nowrap py-4 tracking-widest text-[10px]">
                              {region.name.replace('PRES ', '')}
                            </div>
                          </td>
                        )}
                        <td className="p-4 font-black border-r border-slate-200 text-slate-800 uppercase tracking-tight">{site.name}</td>
                        <td className="p-4 text-center border-r border-slate-200 text-slate-600 font-mono">{site.fixe}</td>
                        <td className="p-4 text-center border-r border-slate-200 text-slate-600 font-mono">{site.mobile}</td>
                        <td className="p-4 text-center border-r border-slate-200 font-black text-slate-900 bg-slate-50/50 font-mono">{site.totalJour}</td>
                        <td className="p-4 text-center border-r border-slate-200 text-slate-600 font-mono">{site.gts}</td>
                        <td className="p-4 text-center border-r border-slate-200 font-black text-slate-900 bg-slate-50/50 font-mono">{site.totalMois}</td>
                        <td className="p-4 text-center border-r border-slate-200 text-slate-400 italic font-mono">{site.objMensuel}</td>
                        <td className="p-4 text-center">
                          <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-black border border-indigo-100">
                            {Math.round(site.achievement)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Branding */}
          <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center text-white text-[8px] font-black">H</div>
              <p className="text-[8px] font-black text-slate-900 tracking-widest uppercase">HEMO-DASHBOARD</p>
            </div>
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Page 7 / {TOTAL_PAGES}</p>
          </div>
        </div>
      )
    },
    {
      title: "DETAIL DES PRELEVEMENTS (2/2)",
      icon: <ListChecks size={24} />,
      content: (
        <div className="h-full bg-white p-6 flex flex-col rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <ListChecks size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tighter uppercase text-slate-900">DETAIL DES PRELEVEMENTS (2/2)</h2>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Détail des prélèvements par site - Partie 2</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto border border-slate-200 rounded-[2rem] shadow-inner bg-slate-50/30">
            <table className="w-full text-[11px] border-collapse">
              <thead className="sticky top-0 bg-slate-900 text-white z-20 shadow-md">
                <tr>
                  <th className="p-4 text-left border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">PRES / RÉGION</th>
                  <th className="p-4 text-left border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">LIBELLÉ SITE</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">FIXE</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">MOB.</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">TOTAL JOUR</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">ENCODÉ GTS</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">MOIS</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">OBJECTIF/M</th>
                  <th className="p-4 text-center uppercase tracking-widest text-[9px] font-black">TAUX/M</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {formattedCollecteData.slice(5).map((region: any) => (
                  <React.Fragment key={region.name}>
                    {region.sites.map((site: any, idx: number) => (
                      <tr key={site.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        {idx === 0 && (
                          <td rowSpan={region.sites.length} className="p-4 font-black border-r border-slate-200 align-middle bg-slate-100 text-slate-900 text-center">
                            <div className="rotate-180 [writing-mode:vertical-lr] whitespace-nowrap py-4 tracking-widest text-[10px]">
                              {region.name.replace('PRES ', '')}
                            </div>
                          </td>
                        )}
                        <td className="p-4 font-black border-r border-slate-200 text-slate-800 uppercase tracking-tight">{site.name}</td>
                        <td className="p-4 text-center border-r border-slate-200 text-slate-600 font-mono">{site.fixe}</td>
                        <td className="p-4 text-center border-r border-slate-200 text-slate-600 font-mono">{site.mobile}</td>
                        <td className="p-4 text-center border-r border-slate-200 font-black text-slate-900 bg-slate-50/50 font-mono">{site.totalJour}</td>
                        <td className="p-4 text-center border-r border-slate-200 text-slate-600 font-mono">{site.gts}</td>
                        <td className="p-4 text-center border-r border-slate-200 font-black text-slate-900 bg-slate-50/50 font-mono">{site.totalMois}</td>
                        <td className="p-4 text-center border-r border-slate-200 text-slate-400 italic font-mono">{site.objMensuel}</td>
                        <td className="p-4 text-center">
                          <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-black border border-indigo-100">
                            {Math.round(site.achievement)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0 bg-slate-900 text-white font-black border-t-4 border-slate-800 z-20">
                <tr>
                  <td colSpan={2} className="p-4 text-blue-400 uppercase tracking-widest text-[10px]">TOTAL NATIONAL</td>
                  <td className="p-4 text-center border-l border-slate-800 font-mono">{nationalTotals.fixe}</td>
                  <td className="p-4 text-center border-l border-slate-800 font-mono">{nationalTotals.mobile}</td>
                  <td className="p-4 text-center border-l border-slate-800 text-emerald-400 font-mono">{nationalTotals.jour}</td>
                  <td className="p-4 text-center border-l border-slate-800 font-mono">{nationalTotals.gts}</td>
                  <td className="p-4 text-center border-l border-slate-800 text-blue-400 font-mono">{nationalTotals.mois}</td>
                  <td className="p-4 text-center border-l border-slate-800 opacity-60 font-mono">{nationalTotals.objectif}</td>
                  <td className="p-4 text-center text-emerald-400 bg-emerald-900/20 border-l border-slate-800">
                    {nationalTotals.objectif > 0 ? Math.round((nationalTotals.mois / nationalTotals.objectif) * 100) : 0}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Footer Branding */}
          <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center text-white text-[8px] font-black">H</div>
              <p className="text-[8px] font-black text-slate-900 tracking-widest uppercase">HEMO-DASHBOARD</p>
            </div>
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Page 8 / {TOTAL_PAGES}</p>
          </div>
        </div>
      )
    },
    {
      title: "Détail Dist. (1/2)",
      icon: <ClipboardList size={24} />,
      content: (
        <div className="h-full bg-white p-6 flex flex-col rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
              <ClipboardList size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tighter uppercase text-slate-900">DETAIL DIST (1/2)</h2>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Synthèse détaillée par produit et région - Partie 1</p>
            </div>
          </div>

          <div className="flex-1 overflow-auto border border-slate-200 rounded-[2rem] shadow-inner bg-slate-50/30">
            <table className="w-full text-[11px] border-collapse">
              <thead className="sticky top-0 bg-slate-900 text-white z-20 shadow-md">
                <tr>
                  <th className="p-4 text-left border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">RÉGION</th>
                  <th className="p-4 text-left border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">SITE</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">CGR AD.</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">CGR PED.</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">CGR NOU.</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">PLASMA</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">PLAQ.</th>
                  <th className="p-4 text-center uppercase tracking-widest text-[9px] font-black">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {synthesisDistData.slice(0, 5).map((region) => (
                  <React.Fragment key={region.name}>
                    {region.sites.map((site: any, idx: number) => (
                      <tr key={site.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        {idx === 0 && (
                          <td rowSpan={region.sites.length} className="p-4 font-black border-r border-slate-200 align-middle bg-slate-100 text-slate-900 text-center">
                            <div className="rotate-180 [writing-mode:vertical-lr] whitespace-nowrap py-4 tracking-widest text-[10px]">
                              {region.name.replace('PRES ', '')}
                            </div>
                          </td>
                        )}
                        <td className="p-4 font-black border-r border-slate-200 text-slate-800 uppercase tracking-tight">{site.name}</td>
                        <td className="p-4 text-center border-r border-slate-200 text-slate-600 font-mono">{site.cgrAdulte || '-'}</td>
                        <td className="p-4 text-center border-r border-slate-200 text-slate-600 font-mono">{site.cgrPedia || '-'}</td>
                        <td className="p-4 text-center border-r border-slate-200 text-slate-600 font-mono">{site.cgrNourri || '-'}</td>
                        <td className="p-4 text-center border-r border-slate-200 text-slate-600 font-mono">{site.plasma || '-'}</td>
                        <td className="p-4 text-center border-r border-slate-200 text-slate-600 font-mono">{site.plaquettes || '-'}</td>
                        <td className="p-4 text-center font-black bg-orange-50/30 text-orange-700 font-mono">{site.total}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Branding */}
          <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center text-white text-[8px] font-black">H</div>
              <p className="text-[8px] font-black text-slate-900 tracking-widest uppercase">HEMO-DASHBOARD</p>
            </div>
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Page 9 / {TOTAL_PAGES}</p>
          </div>
        </div>
      )
    },
    {
      title: "Détail Dist. (2/2)",
      icon: <ClipboardList size={24} />,
      content: (
        <div className="h-full bg-white p-6 flex flex-col rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
              <ClipboardList size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tighter uppercase text-slate-900">DETAIL DIST (2/2)</h2>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Synthèse détaillée par produit et région - Partie 2</p>
            </div>
          </div>

          <div className="flex-1 overflow-auto border border-slate-200 rounded-[2rem] shadow-inner bg-slate-50/30">
            <table className="w-full text-[11px] border-collapse">
              <thead className="sticky top-0 bg-slate-900 text-white z-20 shadow-md">
                <tr>
                  <th className="p-4 text-left border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">RÉGION</th>
                  <th className="p-4 text-left border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">SITE</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">CGR AD.</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">CGR PED.</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">CGR NOU.</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">PLASMA</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">PLAQ.</th>
                  <th className="p-4 text-center uppercase tracking-widest text-[9px] font-black">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {synthesisDistData.slice(5).map((region) => (
                  <React.Fragment key={region.name}>
                    {region.sites.map((site: any, idx: number) => (
                      <tr key={site.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        {idx === 0 && (
                          <td rowSpan={region.sites.length} className="p-4 font-black border-r border-slate-200 align-middle bg-slate-100 text-slate-900 text-center">
                            <div className="rotate-180 [writing-mode:vertical-lr] whitespace-nowrap py-4 tracking-widest text-[10px]">
                              {region.name.replace('PRES ', '')}
                            </div>
                          </td>
                        )}
                        <td className="p-4 font-black border-r border-slate-200 text-slate-800 uppercase tracking-tight">{site.name}</td>
                        <td className="p-4 text-center border-r border-slate-200 text-slate-600 font-mono">{site.cgrAdulte || '-'}</td>
                        <td className="p-4 text-center border-r border-slate-200 text-slate-600 font-mono">{site.cgrPedia || '-'}</td>
                        <td className="p-4 text-center border-r border-slate-200 text-slate-600 font-mono">{site.cgrNourri || '-'}</td>
                        <td className="p-4 text-center border-r border-slate-200 text-slate-600 font-mono">{site.plasma || '-'}</td>
                        <td className="p-4 text-center border-r border-slate-200 text-slate-600 font-mono">{site.plaquettes || '-'}</td>
                        <td className="p-4 text-center font-black bg-orange-50/30 text-orange-700 font-mono">{site.total}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0 bg-slate-900 text-white font-black border-t-4 border-slate-800 z-20">
                <tr>
                  <td colSpan={2} className="p-4 text-orange-400 uppercase tracking-widest text-[10px]">TOTAL NATIONAL</td>
                  <td className="p-4 text-center border-l border-slate-800 font-mono">{grandDistTotals.cgrAdulte}</td>
                  <td className="p-4 text-center border-l border-slate-800 font-mono">{grandDistTotals.cgrPedia}</td>
                  <td className="p-4 text-center border-l border-slate-800 font-mono">{grandDistTotals.cgrNourri}</td>
                  <td className="p-4 text-center border-l border-slate-800 font-mono">{grandDistTotals.plasma}</td>
                  <td className="p-4 text-center border-l border-slate-800 font-mono">{grandDistTotals.plaquettes}</td>
                  <td className="p-4 text-center text-orange-400 bg-orange-900/20 border-l border-slate-800 font-mono">{grandDistTotals.total}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Footer Branding */}
          <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center text-white text-[8px] font-black">H</div>
              <p className="text-[8px] font-black text-slate-900 tracking-widest uppercase">HEMO-DASHBOARD</p>
            </div>
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Page 10 / {TOTAL_PAGES}</p>
          </div>
        </div>
      )
    },
    {
      title: "Détail des Stocks (1/2)",
      icon: <Database size={24} />,
      content: (
        <div className="h-full bg-white p-6 flex flex-col rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <Database size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tighter uppercase text-slate-900">Détail des Stocks (1/2)</h2>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Synthèse détaillée des réserves par site - Partie 1</p>
            </div>
          </div>

          <div className="flex-1 overflow-auto border border-slate-200 rounded-[2rem] shadow-inner bg-slate-50/30">
            <table className="w-full text-[11px] border-collapse">
              <thead className="sticky top-0 bg-slate-900 text-white z-20 shadow-md">
                <tr>
                  <th className="p-4 text-left border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">PRES / RÉGION</th>
                  <th className="p-4 text-left border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">LIBELLÉ SITE</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">CGR ADULTE</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">CGR PÉDIA.</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">CGR NOURRI.</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">CGR (O+)</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">CGR (O-)</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black bg-emerald-900/20">Total CGR</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">PLASMA</th>
                  <th className="p-4 text-center uppercase tracking-widest text-[9px] font-black">PLAQUETTES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {synthesisStockData.slice(0, 5).map((region) => (
                  <React.Fragment key={region.name}>
                    {region.sites.map((site: any, idx: number) => (
                      <tr key={site.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        {idx === 0 && (
                          <td rowSpan={region.sites.length} className="p-4 font-black border-r border-slate-200 align-middle bg-slate-100 text-slate-900 text-center">
                            <div className="rotate-180 [writing-mode:vertical-lr] whitespace-nowrap py-4 tracking-widest text-[10px]">
                              {region.name.replace('PRES ', '')}
                            </div>
                          </td>
                        )}
                        <td className="p-4 font-black border-r border-slate-200 text-slate-800 uppercase tracking-tight">{site.name}</td>
                        <td className="p-4 text-center border-r border-slate-200 text-slate-600 font-mono">{site.cgrAdulte || '-'}</td>
                        <td className="p-4 text-center border-r border-slate-200 text-slate-600 font-mono">{site.cgrPedia || '-'}</td>
                        <td className="p-4 text-center border-r border-slate-200 text-slate-600 font-mono">{site.cgrNourri || '-'}</td>
                        <td className="p-4 text-center border-r border-slate-200 text-blue-600 font-mono">{site.oPlus || '-'}</td>
                        <td className="p-4 text-center border-r border-slate-200 text-red-600 font-mono">{site.oMoins || '-'}</td>
                        <td className="p-4 text-center border-r border-slate-200 font-black text-emerald-700 bg-emerald-50 font-mono">{site.totalCgr}</td>
                        <td className="p-4 text-center border-r border-slate-200 text-slate-600 font-mono">{site.plasma || '-'}</td>
                        <td className="p-4 text-center text-slate-600 font-mono">{site.plaquettes || '-'}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Branding */}
          <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center text-white text-[8px] font-black">H</div>
              <p className="text-[8px] font-black text-slate-900 tracking-widest uppercase">HEMO-DASHBOARD</p>
            </div>
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Page 13 / {TOTAL_PAGES}</p>
          </div>
        </div>
      )
    },
    {
      title: "Détail des Stocks (2/2)",
      icon: <Database size={24} />,
      content: (
        <div className="h-full bg-white p-6 flex flex-col rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <Database size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tighter uppercase text-slate-900">Détail des Stocks (2/2)</h2>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Synthèse détaillée des réserves par site - Partie 2</p>
            </div>
          </div>

          <div className="flex-1 overflow-auto border border-slate-200 rounded-[2rem] shadow-inner bg-slate-50/30">
            <table className="w-full text-[11px] border-collapse">
              <thead className="sticky top-0 bg-slate-900 text-white z-20 shadow-md">
                <tr>
                  <th className="p-4 text-left border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">PRES / RÉGION</th>
                  <th className="p-4 text-left border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">LIBELLÉ SITE</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">CGR ADULTE</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">CGR PÉDIA.</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">CGR NOURRI.</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">CGR (O+)</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">CGR (O-)</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black bg-emerald-900/20">Total CGR</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">PLASMA</th>
                  <th className="p-4 text-center uppercase tracking-widest text-[9px] font-black">PLAQUETTES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {synthesisStockData.slice(5).map((region) => (
                  <React.Fragment key={region.name}>
                    {region.sites.map((site: any, idx: number) => (
                      <tr key={site.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        {idx === 0 && (
                          <td rowSpan={region.sites.length} className="p-4 font-black border-r border-slate-200 align-middle bg-slate-100 text-slate-900 text-center">
                            <div className="rotate-180 [writing-mode:vertical-lr] whitespace-nowrap py-4 tracking-widest text-[10px]">
                              {region.name.replace('PRES ', '')}
                            </div>
                          </td>
                        )}
                        <td className="p-4 font-black border-r border-slate-200 text-slate-800 uppercase tracking-tight">{site.name}</td>
                        <td className="p-4 text-center border-r border-slate-200 text-slate-600 font-mono">{site.cgrAdulte || '-'}</td>
                        <td className="p-4 text-center border-r border-slate-200 text-slate-600 font-mono">{site.cgrPedia || '-'}</td>
                        <td className="p-4 text-center border-r border-slate-200 text-slate-600 font-mono">{site.cgrNourri || '-'}</td>
                        <td className="p-4 text-center border-r border-slate-200 text-blue-600 font-mono">{site.oPlus || '-'}</td>
                        <td className="p-4 text-center border-r border-slate-200 text-red-600 font-mono">{site.oMoins || '-'}</td>
                        <td className="p-4 text-center border-r border-slate-200 font-black text-emerald-700 bg-emerald-50 font-mono">{site.totalCgr}</td>
                        <td className="p-4 text-center border-r border-slate-200 text-slate-600 font-mono">{site.plasma || '-'}</td>
                        <td className="p-4 text-center text-slate-600 font-mono">{site.plaquettes || '-'}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0 bg-slate-900 text-white font-black border-t-4 border-slate-800 z-20">
                <tr>
                  <td colSpan={2} className="p-4 text-blue-400 uppercase tracking-widest text-[10px]">TOTAL NATIONAL</td>
                  <td className="p-4 text-center border-l border-slate-800 font-mono">{grandStockTotals.cgrAdulte}</td>
                  <td className="p-4 text-center border-l border-slate-800 font-mono">{grandStockTotals.cgrPedia}</td>
                  <td className="p-4 text-center border-l border-slate-800 font-mono">{grandStockTotals.cgrNourri}</td>
                  <td className="p-4 text-center border-l border-slate-800 text-blue-400 font-mono">{grandStockTotals.oPlus}</td>
                  <td className="p-4 text-center border-l border-slate-800 text-red-400 font-mono">{grandStockTotals.oMoins}</td>
                  <td className="p-4 text-center border-l border-slate-800 text-emerald-400 font-mono">{grandStockTotals.totalCgr}</td>
                  <td className="p-4 text-center border-l border-slate-800 font-mono">{grandStockTotals.plasma}</td>
                  <td className="p-4 text-center border-l border-slate-800 font-mono">{grandStockTotals.plaquettes}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Footer Branding */}
          <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center text-white text-[8px] font-black">H</div>
              <p className="text-[8px] font-black text-slate-900 tracking-widest uppercase">HEMO-DASHBOARD</p>
            </div>
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Page 14 / {TOTAL_PAGES}</p>
          </div>
        </div>
      )
    },
    {
      title: "Suivi GTS (1/2)",
      icon: <Truck size={24} />,
      content: (
        <div className="h-full bg-white p-10 flex flex-col rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
          
          <div className="flex items-center gap-4 mb-8 relative z-10">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-100">
              <Truck size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter uppercase text-slate-900">Suivi GTS (1/2)</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transport et encodage logistique - Partie 1</p>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4 mb-8 relative z-10">
            {[
              { label: 'Collectes', value: gtsGlobalStats.totalRecords, color: 'slate' },
              { label: 'Fixe', value: gtsGlobalStats.totalFixe, color: 'emerald' },
              { label: 'Mobile', value: gtsGlobalStats.totalMobile, color: 'orange' },
              { label: 'Auto', value: gtsGlobalStats.totalAuto, color: 'blue' },
              { label: 'Total Qty', value: gtsGlobalStats.totalQty, color: 'indigo' }
            ].map((stat, i) => (
              <div key={i} className={`bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center relative overflow-hidden`}>
                <div className={`absolute top-0 left-0 w-1 h-full bg-${stat.color}-500`} />
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <p className={`text-xl font-black text-${stat.color}-600 tracking-tighter`}>{stat.value.toLocaleString()}</p>
              </div>
            ))}
          </div>

          <div className="flex-1 overflow-auto border border-slate-200 rounded-[2rem] shadow-inner bg-slate-50/30 relative z-10">
            <table className="w-full text-[11px] border-collapse">
              <thead className="sticky top-0 bg-slate-900 text-white z-20 shadow-md">
                <tr>
                  <th className="p-4 text-left border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">RÉGION (PRES)</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">COLL. MOB.</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">FIXE</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">MOBILE</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">AUTO</th>
                  <th className="p-4 text-center uppercase tracking-widest text-[9px] font-black">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {regionalGtsSynthesis.slice(0, 5).map((reg, idx) => (
                  <tr key={reg.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="p-4 font-black uppercase tracking-tighter text-slate-900 border-r border-slate-200">{reg.name}</td>
                    <td className="p-4 text-center font-bold text-slate-600 border-r border-slate-200 font-mono">{reg.collectes}</td>
                    <td className="p-4 text-center font-bold text-emerald-600 border-r border-slate-200 font-mono">{reg.fixe}</td>
                    <td className="p-4 text-center font-bold text-orange-600 border-r border-slate-200 font-mono">{reg.mobile}</td>
                    <td className="p-4 text-center font-bold text-blue-600 border-r border-slate-200 font-mono">{reg.auto}</td>
                    <td className="p-4 text-center font-black text-indigo-700 bg-indigo-50/30 font-mono">{reg.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Branding */}
          <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center text-white text-[8px] font-black">H</div>
              <p className="text-[8px] font-black text-slate-900 tracking-widest uppercase">HEMO-DASHBOARD</p>
            </div>
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Page 15 / {TOTAL_PAGES}</p>
          </div>
        </div>
      )
    },
    {
      title: "Suivi GTS (2/2)",
      icon: <Truck size={24} />,
      content: (
        <div className="h-full bg-white p-10 flex flex-col rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
          
          <div className="flex items-center gap-4 mb-8 relative z-10">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-100">
              <Truck size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter uppercase text-slate-900">Suivi GTS (2/2)</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transport et encodage logistique - Partie 2</p>
            </div>
          </div>

          <div className="flex-1 overflow-auto border border-slate-200 rounded-[2rem] shadow-inner bg-slate-50/30 relative z-10">
            <table className="w-full text-[11px] border-collapse">
              <thead className="sticky top-0 bg-slate-900 text-white z-20 shadow-md">
                <tr>
                  <th className="p-4 text-left border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">RÉGION (PRES)</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">COLL. MOB.</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">FIXE</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">MOBILE</th>
                  <th className="p-4 text-center border-r border-slate-700 uppercase tracking-widest text-[9px] font-black">AUTO</th>
                  <th className="p-4 text-center uppercase tracking-widest text-[9px] font-black">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {regionalGtsSynthesis.slice(5).map((reg, idx) => (
                  <tr key={reg.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="p-4 font-black uppercase tracking-tighter text-slate-900 border-r border-slate-200">{reg.name}</td>
                    <td className="p-4 text-center font-bold text-slate-600 border-r border-slate-200 font-mono">{reg.collectes}</td>
                    <td className="p-4 text-center font-bold text-emerald-600 border-r border-slate-200 font-mono">{reg.fixe}</td>
                    <td className="p-4 text-center font-bold text-orange-600 border-r border-slate-200 font-mono">{reg.mobile}</td>
                    <td className="p-4 text-center font-bold text-blue-600 border-r border-slate-200 font-mono">{reg.auto}</td>
                    <td className="p-4 text-center font-black text-indigo-700 bg-indigo-50/30 font-mono">{reg.total}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0 bg-slate-900 text-white font-black border-t-4 border-slate-800 z-20">
                <tr>
                  <td className="p-4 text-blue-400 uppercase tracking-widest text-[10px]">TOTAL NATIONAL</td>
                  <td className="p-4 text-center border-l border-slate-800 font-mono">{gtsGlobalStats.totalRecords}</td>
                  <td className="p-4 text-center border-l border-slate-800 font-mono">{gtsGlobalStats.totalFixe}</td>
                  <td className="p-4 text-center border-l border-slate-800 font-mono">{gtsGlobalStats.totalMobile}</td>
                  <td className="p-4 text-center border-l border-slate-800 font-mono">{gtsGlobalStats.totalAuto}</td>
                  <td className="p-4 text-center text-indigo-300 border-l border-slate-800 font-mono">{gtsGlobalStats.totalQty}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Footer Branding */}
          <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center text-white text-[8px] font-black">H</div>
              <p className="text-[8px] font-black text-slate-900 tracking-widest uppercase">HEMO-DASHBOARD</p>
            </div>
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Page 16 / {TOTAL_PAGES}</p>
          </div>
        </div>
      )
    },
    {
      title: "Capsules Objectifs",
      icon: <Target size={24} />,
      content: (
        <div className="h-full bg-white p-6 flex flex-col rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
              <Target size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tighter uppercase text-slate-900">Capsules Objectifs</h2>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Performance visuelle mensuelle & annuelle</p>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-4 items-center">
            {renderPulseCard(`PRÉLÈVEMENTS ${data.month.toUpperCase()}`, data.monthly, 'prel', 'monthly')}
            {renderPulseCard(`ENCODAGE GTS ${data.month.toUpperCase()}`, gtsStats.monthly, 'gts', 'monthly')}
            {renderPulseCard(`TAUX ENCODAGE ${data.month.toUpperCase()}`, ratioStats.monthly, 'ratio', 'monthly')}
            {renderPulseCard(`PRÉLÈVEMENTS ANNUELS ${data.year}`, data.annual, 'prel', 'annual')}
            {renderPulseCard(`ENCODAGE GTS ANNUELS ${data.year}`, gtsStats.annual, 'gts', 'annual')}
            {renderPulseCard(`TAUX ENCODAGE ANNUEL ${data.year}`, ratioStats.annual, 'ratio', 'annual')}
          </div>

          {/* Footer Branding */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center text-white text-[8px] font-black">H</div>
              <p className="text-[8px] font-black text-slate-900 tracking-widest uppercase">HEMO-DASHBOARD</p>
            </div>
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Page 17 / {TOTAL_PAGES}</p>
          </div>
        </div>
      )
    },
    {
      title: "Cartographie",
      icon: <Globe size={24} />,
      content: (
        <div className="h-full bg-white p-10 flex flex-col rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
          
          <div className="flex items-center gap-4 mb-8 relative z-10">
            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-100">
              <Globe size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter uppercase text-slate-900">Cartographie</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Répartition spatiale des activités</p>
            </div>
          </div>

          <div className="flex-1 relative bg-slate-900 rounded-[2.5rem] overflow-hidden p-8 shadow-2xl border border-slate-800">
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-transparent" />
            
            <div className="relative z-10 h-full flex flex-col">
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                  <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">Focus</p>
                  <p className="text-sm font-black text-white">Côte d'Ivoire</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                  <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">Régions</p>
                  <p className="text-sm font-black text-white">{Object.keys(PRES_COORDINATES).length}</p>
                </div>
                <div className="bg-emerald-600/20 backdrop-blur-md p-4 rounded-2xl border border-emerald-500/30">
                  <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">Statut</p>
                  <p className="text-sm font-black text-emerald-400">Actif</p>
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center relative">
                {/* Stylized Map Background */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                  <Globe size={300} className="text-emerald-500" />
                </div>
                
                <div className="relative w-64 h-64">
                  <div className="absolute inset-0 border-2 border-emerald-500/20 rounded-full animate-pulse" />
                  <div className="absolute inset-0 border border-emerald-500/10 rounded-full scale-125" />
                  
                  {/* Data Points - Representing PRES */}
                  {Object.entries(PRES_COORDINATES).map(([name, coords], i) => {
                    const angle = (i / Object.keys(PRES_COORDINATES).length) * Math.PI * 2;
                    const radius = 35 + (i % 3) * 5;
                    return (
                      <div 
                        key={name}
                        className="absolute flex flex-col items-center gap-1"
                        style={{ 
                          top: `${50 + Math.sin(angle) * radius}%`, 
                          left: `${50 + Math.cos(angle) * radius}%`,
                          transform: 'translate(-50%, -50%)'
                        }}
                      >
                        <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,1)] border border-white/50" />
                        <span className="text-[6px] font-black text-white/40 uppercase tracking-tighter whitespace-nowrap bg-slate-900/50 px-1 rounded">
                          {name.replace('PRES ', '')}
                        </span>
                      </div>
                    );
                  })}
                  
                  {/* Central Hub */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-[0_0_30px_rgba(16,185,129,0.5)] border-4 border-slate-900 z-20">
                      <Globe size={20} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-4 gap-3">
                {['ABIDJAN', 'BOUAKE', 'KORHOGO', 'DALOA'].map(city => (
                  <div key={city} className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                    <p className="text-[8px] font-black text-white/60 uppercase tracking-widest mb-1">{city}</p>
                    <div className="flex justify-center gap-1">
                      <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                      <div className="w-1 h-1 bg-emerald-500/30 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Branding */}
          <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center text-white text-[8px] font-black">H</div>
              <p className="text-[8px] font-black text-slate-900 tracking-widest uppercase">HEMO-DASHBOARD</p>
            </div>
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Page 18 / {TOTAL_PAGES}</p>
          </div>
        </div>
      )
    },
    {
      title: "Glossaire",
      icon: <BookOpen size={24} />,
      content: (
        <div className="h-full bg-white p-10 flex flex-col rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
          
          <div className="flex items-center gap-4 mb-8 relative z-10">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-200">
              <BookOpen size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter uppercase text-slate-900">Glossaire & Méthodologie</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Définitions et sources de données</p>
            </div>
          </div>

          <div className="flex-1 space-y-6 relative z-10 overflow-auto pr-2">
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-blue-600 border-b border-blue-100 pb-2">Terminologie</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <p className="text-sm font-black text-slate-900 uppercase tracking-tight">CGR (Concentré de Globules Rouges)</p>
                  <p className="text-xs text-slate-600 leading-relaxed">Produit sanguin labile obtenu par soustraction d'une partie du plasma d'un sang total. Utilisé pour traiter les anémies.</p>
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 uppercase tracking-tight">GTS (Global Tracking System)</p>
                  <p className="text-xs text-slate-600 leading-relaxed">Système logistique de traçabilité des poches de sang depuis le site de prélèvement jusqu'au centre de traitement.</p>
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 uppercase tracking-tight">PRES (Pôle Régional de Transfusion Sanguine)</p>
                  <p className="text-xs text-slate-600 leading-relaxed">Structure régionale coordonnant les activités de transfusion sur une zone géographique donnée.</p>
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Taux d'encodage</p>
                  <p className="text-xs text-slate-600 leading-relaxed">Ratio entre les poches physiquement collectées et les poches enregistrées dans le système GTS.</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600 border-b border-emerald-100 pb-2">Méthodologie</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Les données présentées dans ce rapport sont extraites en temps réel des bases de données opérationnelles du CNTS. Les objectifs sont fixés annuellement et déclinés mensuellement par site. Les chiffres de stock représentent l'état instantané au moment de la génération du rapport.
              </p>
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center text-white text-[8px] font-black">H</div>
              <p className="text-[8px] font-black text-slate-900 tracking-widest uppercase">HEMO-DASHBOARD</p>
            </div>
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Page 19 / {TOTAL_PAGES}</p>
          </div>
        </div>
      )
    }
  ];

  const handleExportPDF = async () => {
    setIsExporting(true);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Add capture mode class to body to disable animations globally during capture
    document.body.classList.add('ebook-capture-mode');

    try {
      for (let i = 0; i < pages.length; i++) {
        setCurrentPage(i);
        // Wait for animation and render
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        const pageElement = pageRefs.current[i];
        if (pageElement) {
          const pngData = await domToPng(pageElement, {
            scale: 3,
            backgroundColor: '#ffffff',
            width: 794, // Fixed width for A4 at 96dpi to ensure consistent layout
            height: 1123,
          });
          
          if (i > 0) pdf.addPage();
          pdf.addImage(pngData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        }
      }
      
      const dateStr = format(new Date(), 'dd_MM_yyyy');
      pdf.save(`HEMO_EBOOK_HEBDOMADAIRE_${dateStr}.pdf`);
    } catch (error) {
      console.error('Error generating E-book:', error);
    } finally {
      document.body.classList.remove('ebook-capture-mode');
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <style>{`
        .ebook-capture-mode * {
          animation: none !important;
          transition: none !important;
          transform: none !important;
        }
        .ebook-capture-mode .motion-div {
          opacity: 1 !important;
          transform: none !important;
        }
      `}</style>
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-200">
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">E-Book Hebdomadaire</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Publication du Personnel - {weekLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50 shadow-lg shadow-slate-200"
          >
            {isExporting ? <Activity className="animate-spin" size={16} /> : <Download size={16} />}
            Télécharger E-book
          </button>
        </div>
      </div>

      {/* Book Interface */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Navigation Sidebar */}
        <div className="w-full lg:w-64 space-y-2">
          {pages.map((page, index) => (
            <button
              key={index}
              onClick={() => setCurrentPage(index)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${currentPage === index ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'}`}
            >
              <span className={currentPage === index ? 'text-blue-400' : 'text-slate-300'}>{page.icon}</span>
              <span className="text-[10px] font-black uppercase tracking-widest">{page.title}</span>
              {currentPage === index && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
            </button>
          ))}
        </div>

        {/* Page Viewer */}
        <div className="flex-1 w-full flex flex-col items-center gap-6">
          <div className="relative w-full max-w-[595px] aspect-[1/1.414] group">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                ref={(el) => { pageRefs.current[currentPage] = el; }}
                initial={{ opacity: 0, rotateY: 90 }}
                animate={{ opacity: 1, rotateY: 0 }}
                exit={{ opacity: 0, rotateY: -90 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="w-full h-full preserve-3d"
              >
                {pages[currentPage].content}
              </motion.div>
            </AnimatePresence>

            {/* Navigation Arrows */}
            <button 
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className="absolute -left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 disabled:opacity-0 transition-all z-20"
            >
              <ChevronLeft size={24} />
            </button>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(pages.length - 1, prev + 1))}
              disabled={currentPage === pages.length - 1}
              className="absolute -right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 disabled:opacity-0 transition-all z-20"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Page Indicator */}
          <div className="flex items-center gap-2">
            {pages.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all ${currentPage === i ? 'w-8 bg-slate-900' : 'w-2 bg-slate-200'}`} 
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
