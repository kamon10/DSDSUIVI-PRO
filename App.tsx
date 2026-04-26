
import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense, lazy } from 'react';
import { INITIAL_DATA, DEFAULT_LINK_1, DEFAULT_LINK_DISTRIBUTION, DEFAULT_LINK_STOCK, DEFAULT_LINK_GTS, DEFAULT_SCRIPT_URL, SITES_DATA, WORKING_DAYS_YEAR, getSiteByInput } from './constants.tsx';

// Lazy load components for better performance
const VisualDashboard = lazy(() => import('./components/VisualDashboard.tsx').then(m => ({ default: m.VisualDashboard })));
const GoalPulseView = lazy(() => import('./components/GoalPulseView.tsx'));
const PerformanceView = lazy(() => import('./components/PerformanceView.tsx').then(m => ({ default: m.PerformanceView })));
const RecapView = lazy(() => import('./components/RecapView.tsx'));
const PulsePerformance = lazy(() => import('./components/PulsePerformance.tsx').then(m => ({ default: m.PulsePerformance })));
const EvolutionView = lazy(() => import('./components/EvolutionView.tsx').then(m => ({ default: m.EvolutionView })));
const SummaryView = lazy(() => import('./components/SummaryView.tsx').then(m => ({ default: m.SummaryView })));
const WeeklyView = lazy(() => import('./components/WeeklyView.tsx').then(m => ({ default: m.WeeklyView })));
const SiteSynthesisView = lazy(() => import('./components/SiteSynthesisView.tsx').then(m => ({ default: m.SiteSynthesisView })));
const DataEntryForm = lazy(() => import('./components/DataEntryForm.tsx').then(m => ({ default: m.DataEntryForm })));
const ContactsView = lazy(() => import('./components/ContactsView.tsx').then(m => ({ default: m.ContactsView })));
const DistributionMapView = lazy(() => import('./components/DistributionMapView.tsx').then(m => ({ default: m.DistributionMapView })));
const AdminUserManagement = lazy(() => import('./components/AdminUserManagement.tsx').then(m => ({ default: m.AdminUserManagement })));
const DetailedHistoryView = lazy(() => import('./components/DetailedHistoryView.tsx').then(m => ({ default: m.DetailedHistoryView })));
const StockView = lazy(() => import('./components/StockView.tsx').then(m => ({ default: m.StockView })));
const StockSynthesisView = lazy(() => import('./components/StockSynthesisView.tsx').then(m => ({ default: m.StockSynthesisView })));
const StockSummaryView = lazy(() => import('./components/StockSummaryView.tsx').then(m => ({ default: m.StockSummaryView })));
const StockDetailedSynthesisView = lazy(() => import('./components/StockDetailedSynthesisView.tsx').then(m => ({ default: m.StockDetailedSynthesisView })));
const StockAnalysisFocusView = lazy(() => import('./components/StockAnalysisFocusView.tsx').then(m => ({ default: m.StockAnalysisFocusView })));
const DistributionDetailedSynthesisView = lazy(() => import('./components/DistributionDetailedSynthesisView.tsx').then(m => ({ default: m.DistributionDetailedSynthesisView })));
const StockPlanningView = lazy(() => import('./components/StockPlanningView.tsx').then(m => ({ default: m.StockPlanningView })));
const GlobalSynthesisReportView = lazy(() => import('./components/GlobalSynthesisReportView.tsx').then(m => ({ default: m.GlobalSynthesisReportView })));
const DistributionStockView = lazy(() => import('./components/DistributionStockView.tsx').then(m => ({ default: m.DistributionStockView })));
const CapacityPlanningView = lazy(() => import('./components/CapacityPlanningView.tsx'));
const ForecastingView = lazy(() => import('./components/ForecastingView.tsx').then(m => ({ default: m.ForecastingView })));
const GtsView = lazy(() => import('./components/GtsView.tsx').then(m => ({ default: m.GtsView })));
const GtsSynthesis = lazy(() => import('./components/GtsSynthesis.tsx').then(m => ({ default: m.GtsSynthesis })));
const GtsComparisonView = lazy(() => import('./components/GtsComparisonView.tsx').then(m => ({ default: m.GtsComparisonView })));
const CollectionPlanningView = lazy(() => import('./components/CollectionPlanningView.tsx').then(m => ({ default: m.CollectionPlanningView })));
const EbookView = lazy(() => import('./components/EbookView.tsx').then(m => ({ default: m.EbookView })));
const PersonnelManagement = lazy(() => import('./components/PersonnelManagement.tsx').then(m => ({ default: m.PersonnelManagement })));
const PresSlideshow = lazy(() => import('./components/PresSlideshow.tsx'));

import { LoginView } from './components/LoginView.tsx';
import { fetchSheetData, fetchUsers, fetchBrandingConfig, fetchDynamicSites } from './services/googleSheetService.ts';
import { NotificationManager } from './components/NotificationManager.tsx';
import { StockAlert } from './components/StockAlert.tsx';
import { InstallPrompt } from './components/InstallPrompt.tsx';
import { SyncStatus } from './components/SyncStatus.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { AppTab, DashboardData, User, SiteRecord } from './types.ts';
import { Activity, LayoutDashboard, RefreshCw, Settings, BarChart3, HeartPulse, LineChart, Layout, Database, Clock, Lock, LogOut, ShieldCheck, User as UserIcon, Book, BookOpen, Truck, Map as MapIcon, PlusSquare, UserCheck, FileText, AlertCircle, History, ClipboardList, Wifi, WifiOff, Package, Search, Command, TrendingUp, Zap, X, ChevronDown, ArrowRight, PieChart, Calendar, Plus, Target, Loader2, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppLoadingOverlay } from './components/AppLoadingOverlay.tsx';
import { CommandPalette } from './components/CommandPalette.tsx';

const App: React.FC = () => {
  const [fullData, setFullData] = useState<DashboardData>(() => {
    const saved = localStorage.getItem('hemo_full_data');
    if (!saved) return INITIAL_DATA;
    try {
      const parsed = JSON.parse(saved);
      // On s'assure que les dates sont bien des objets Date si nécessaire, 
      // mais ici DashboardData semble n'avoir que des strings/numbers
      return parsed;
    } catch (e) {
      return INITIAL_DATA;
    }
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('pulse'); 
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(() => {
    const saved = localStorage.getItem('hemo_auto_refresh');
    return saved === null ? true : saved === 'true';
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dynamicSites, setDynamicSites] = useState<any[]>([]);
  const lastOptimisticUpdateRef = useRef<number>(0);
  
  const [branding, setBranding] = useState(() => {
    const saved = localStorage.getItem('hemo_branding');
    const defaultBranding = { logo: 'https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=934812425420904', hashtag: '#DONSANG_CI' };
    if (!saved) return defaultBranding;
    try { return JSON.parse(saved); } catch (e) { return defaultBranding; }
  });

  const updateBranding = (newBranding: {logo: string, hashtag: string}) => {
    setBranding(newBranding);
    localStorage.setItem('hemo_branding', JSON.stringify(newBranding));
    handleSync(true, true); // Force a re-sync after branding update
  };

  const [sheetInput, setSheetInput] = useState(localStorage.getItem('gsheet_input_1') || DEFAULT_LINK_1);
  const [showSettings, setShowSettings] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('dsd_user');
    if (!saved) return null;
    try { return JSON.parse(saved); } catch (e) { return null; }
  });
  const [error, setError] = useState<string | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const scriptUrl = DEFAULT_SCRIPT_URL;
  const isSyncingRef = useRef(false);
  const sheetInputRef = useRef(sheetInput);
  
  useEffect(() => { sheetInputRef.current = sheetInput; }, [sheetInput]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
          console.log('SW registered: ', registration);
        }).catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
      });
    }
  }, []);

  useEffect(() => {
    console.log('[HEMO-STATS] App component mounted');
  }, []);

  const handleSync = useCallback(async (isSilent = false, force = false) => {
    if (isSyncingRef.current) return;
    
    // Garde-fou réduit à 60s pour plus de réactivité si le cache Google est à jour
    if (isSilent && !force && (Date.now() - lastOptimisticUpdateRef.current < 60000)) {
       return;
    }

    const currentInput = sheetInputRef.current;
    console.log(`[Sync] Synchronisation avec la source: ${currentInput}`);
    isSyncingRef.current = true;
    
    if (!isSilent) setLoading(true);
    setSyncStatus('syncing');

    try {
      // Récupération de TOUTES les données en parallèle pour une vitesse maximale
      const [dynSitesResult, brandingResult, dataResult] = await Promise.all([
        fetchDynamicSites(DEFAULT_SCRIPT_URL),
        fetchBrandingConfig(DEFAULT_SCRIPT_URL),
        fetchSheetData(currentInput.trim(), force, DEFAULT_LINK_DISTRIBUTION, dynamicSites, DEFAULT_LINK_STOCK, DEFAULT_LINK_GTS)
      ]);
      
      if (dynSitesResult) setDynamicSites(dynSitesResult);
      if (brandingResult) {
        setBranding(brandingResult);
        localStorage.setItem('hemo_branding', JSON.stringify(brandingResult));
      }
      
      if (dataResult) {
        // Si on a des sites dynamiques, on peut les injecter dans dataResult si nécessaire
        // Mais fetchSheetData les prend déjà en paramètre normalement.
        // Ici on simplifie pour le parallélisme pur.
        setFullData(dataResult);
        localStorage.setItem('gsheet_input_1', currentInput.trim());
        localStorage.setItem('hemo_full_data', JSON.stringify(dataResult));
      }
      
      setLastSync(new Date());
      setSyncStatus('synced');
      setError(null);
    } catch (err: any) {
      setSyncStatus('error');
      if (!isSilent) setError(err.message || "Échec de synchronisation.");
    } finally {
      setLoading(false);
      isSyncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSiteSelect = (siteName: string) => {
    setActiveTab('site-focus');
  };

  const injectOptimisticData = useCallback((newData: any) => {
    lastOptimisticUpdateRef.current = Date.now();
    setFullData(prev => {
      const updated = { ...prev };
      const dateSaisie = newData["Date Collecte"];
      const siteRawName = newData["Libelle site"];
      const siteCode = newData["Code site"];
      
      // On identifie le site canonique
      const siteInfo = getSiteByInput(siteCode) || getSiteByInput(siteRawName);
      const canonicalName = siteInfo ? siteInfo.name.toUpperCase() : siteRawName.toUpperCase();
      
      const nFixe = Number(newData["NombreFixe"]);
      const nMobile = Number(newData["NombreMobile"]);
      const nTotal = Number(newData["Total poches"]);

      let historyDay = updated.dailyHistory.find(h => h.date === dateSaisie);
      if (historyDay) {
         let siteEntry = historyDay.sites.find(s => s.name.toUpperCase() === canonicalName);
         if (siteEntry) {
            const diffFixe = nFixe - siteEntry.fixe;
            const diffMobile = nMobile - siteEntry.mobile;
            const diffTotal = nTotal - siteEntry.total;
            
            siteEntry.fixe = nFixe;
            siteEntry.mobile = nMobile;
            siteEntry.total = nTotal;
            
            historyDay.stats.fixed += diffFixe;
            historyDay.stats.mobile += diffMobile;
            historyDay.stats.realized += diffTotal;
         } else {
            historyDay.sites.push({
               name: siteInfo?.name || siteRawName,
               fixe: nFixe,
               mobile: nMobile,
               total: nTotal,
               objective: Math.round((SITES_DATA.find(s => s.name.toUpperCase() === canonicalName)?.annualObjective || 1200) / WORKING_DAYS_YEAR)
            });
            historyDay.stats.fixed += nFixe;
            historyDay.stats.mobile += nMobile;
            historyDay.stats.realized += nTotal;
         }
      }

      if (dateSaisie === updated.date) {
         const oldDayRecord = prev.dailyHistory.find(h => h.date === updated.date);
         const oldSite = oldDayRecord?.sites.find(s => s.name.toUpperCase() === canonicalName);
         const oldVal = oldSite?.total || 0;
         const diff = nTotal - oldVal;
         
         updated.daily = {
            ...updated.daily,
            realized: updated.daily.realized + diff,
            fixed: updated.daily.fixed + (nFixe - (oldSite?.fixe || 0)),
            mobile: updated.daily.mobile + (nMobile - (oldSite?.mobile || 0)),
            percentage: ((updated.daily.realized + diff) / (updated.daily.objective || 1)) * 100
         };
      }

      // Mise à jour simplifiée du mensuel
      const monthParts = dateSaisie.split('/');
      if (monthParts[1] === updated.date.split('/')[1]) {
         const isUpdate = newData.Mode === "UPDATE";
         const oldDayRecord = prev.dailyHistory.find(h => h.date === dateSaisie);
         const oldSiteVal = oldDayRecord?.sites.find(s => s.name.toUpperCase() === canonicalName)?.total || 0;
         
         updated.monthly.realized += (nTotal - (isUpdate ? oldSiteVal : 0));
         updated.monthly.percentage = (updated.monthly.realized / (updated.monthly.objective || 1)) * 100;
      }

      return updated;
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('hemo_auto_refresh', autoRefresh.toString());
  }, [autoRefresh]);

  useEffect(() => {
    // Synchronisation initiale
    // Si on a déjà des données en cache, on fait une synchro silencieuse (background)
    const hasCache = localStorage.getItem('hemo_full_data') !== null;
    handleSync(hasCache, true);
  }, [handleSync]);

  useEffect(() => {
    if (!autoRefresh) return;
    
    // Polling automatique toutes les 30 secondes pour garder les données fraîches
    const interval = setInterval(() => {
      handleSync(true, false);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [handleSync, autoRefresh]);

  const filteredData = useMemo(() => {
    if (!currentUser || currentUser.role === 'ADMIN' || currentUser.role === 'SUPERADMIN') return fullData;
    
    const filtered = { ...fullData };
    const regionName = currentUser.region || "";
    const siteName = currentUser.site || "";

    if (currentUser.role === 'PRES' && regionName.toUpperCase() !== "TOUS LES PRES") {
      filtered.regions = fullData.regions.filter(r => r.name.toUpperCase() === regionName.toUpperCase());
      filtered.dailyHistory = fullData.dailyHistory.map(h => ({
        ...h,
        sites: h.sites.filter(s => s.region?.toUpperCase() === regionName.toUpperCase()),
        stats: {
          realized: h.sites.filter(s => s.region?.toUpperCase() === regionName.toUpperCase()).reduce((acc, s) => acc + s.total, 0),
          fixed: h.sites.filter(s => s.region?.toUpperCase() === regionName.toUpperCase()).reduce((acc, s) => acc + s.fixe, 0),
          mobile: h.sites.filter(s => s.region?.toUpperCase() === regionName.toUpperCase()).reduce((acc, s) => acc + s.mobile, 0),
        }
      }));
      if (fullData.stock) {
        filtered.stock = fullData.stock.filter(s => s.pres.toUpperCase() === regionName.toUpperCase());
      }
      if (fullData.distributions) {
        filtered.distributions = {
          ...fullData.distributions,
          records: fullData.distributions.records.filter(r => r.region.toUpperCase() === regionName.toUpperCase())
        };
      }
    } 
    else if (currentUser.role === 'AGENT') {
      filtered.regions = fullData.regions.map(r => ({
        ...r,
        sites: r.sites.filter(s => s.name.toUpperCase() === siteName.toUpperCase())
      })).filter(r => r.sites.length > 0);
      
      filtered.dailyHistory = fullData.dailyHistory.map(h => ({
        ...h,
        sites: h.sites.filter(s => s.name.toUpperCase() === siteName.toUpperCase()),
        stats: {
          realized: h.sites.filter(s => s.name.toUpperCase() === siteName.toUpperCase()).reduce((acc, s) => acc + s.total, 0),
          fixed: h.sites.filter(s => s.name.toUpperCase() === siteName.toUpperCase()).reduce((acc, s) => acc + s.fixe, 0),
          mobile: h.sites.filter(s => s.name.toUpperCase() === siteName.toUpperCase()).reduce((acc, s) => acc + s.mobile, 0),
        }
      }));

      if (fullData.stock) {
        filtered.stock = fullData.stock.filter(s => s.site.toUpperCase() === siteName.toUpperCase());
      }
      if (fullData.distributions) {
        filtered.distributions = {
          ...fullData.distributions,
          records: fullData.distributions.records.filter(r => r.site.toUpperCase() === siteName.toUpperCase())
        };
      }
    }
    return filtered;
  }, [fullData, currentUser]);

  const navItems = [
    { id: 'pulse', icon: <HeartPulse size={18} />, label: 'Pulse', public: true },
    { id: 'goal-pulse', icon: <Target size={18} />, label: 'Objectifs', public: true },
    { id: 'pres-slideshow', icon: <Maximize2 size={18} />, label: 'Présentation PRES', public: false },
    { id: 'summary', icon: <Layout size={18} />, label: 'Résumé', public: false },
    { id: 'cockpit', icon: <LayoutDashboard size={18} />, label: 'Cockpit', public: false },
    { id: 'map', icon: <MapIcon size={18} />, label: 'Carte', public: false },
    { id: 'entry', icon: <PlusSquare size={18} />, label: 'Saisie', public: false },
    { id: 'recap', icon: <FileText size={18} />, label: 'Récap Coll.', public: false },
    { id: 'recap-dist', icon: <ClipboardList size={18} />, label: 'Synthèse Dist', public: false },
    { id: 'distribution-detailed', icon: <ClipboardList size={18} />, label: 'Détail Dist', public: false },
    { id: 'distribution-stock', icon: <Database size={18} />, label: 'Stock & Dist', public: false },
    { id: 'gts', icon: <Truck size={18} />, label: 'GTS', public: false },
    { id: 'gts-synthesis', icon: <PieChart size={18} />, label: 'Synthèse GTS', public: false },
    { id: 'gts-comparison', icon: <RefreshCw size={18} />, label: 'Comparaison GTS', public: false },
    { id: 'collection-planning', icon: <Calendar size={18} />, label: 'Planning Mobiles', public: false },
    { id: 'stock-summary', icon: <Layout size={18} />, label: 'Résumé Stock', public: false },
    { id: 'stock', icon: <Package size={18} />, label: 'Stock', public: false },
    { id: 'stock-focus', icon: <Zap size={18} />, label: 'Focus Analyse', public: false },
    { id: 'stock-detailed', icon: <ClipboardList size={18} />, label: 'Détail Stock', public: false },
    { id: 'stock-synthesis', icon: <TrendingUp size={18} />, label: 'Synthèse Stock', public: false },
    { id: 'stock-planning', icon: <ShieldCheck size={18} />, label: 'Planning Stock', public: false },
    { id: 'capacity-planning', icon: <Zap size={18} />, label: 'Capacité', public: false },
    { id: 'forecasting', icon: <TrendingUp size={18} />, label: 'Estimation', public: false },
    { id: 'site-focus', icon: <UserCheck size={18} />, label: 'Focus', public: false },
    { id: 'history', icon: <History size={18} />, label: 'Historique', public: false },
    { id: 'weekly', icon: <Clock size={18} />, label: 'Mensuel', public: false },
    { id: 'evolution', icon: <LineChart size={18} />, label: 'Évol.', public: false },
    { id: 'performance', icon: <BarChart3 size={18} />, label: 'Rang', public: false },
    { id: 'contact', icon: <BookOpen size={18} />, label: 'Contact', public: true },
    { id: 'ebook', icon: <Book size={18} />, label: 'E-Book Hebdo', public: false },
    { id: 'global-report', icon: <FileText size={18} />, label: 'Rapport Global', public: false },
    { id: 'personnel', icon: <UserCheck size={18} />, label: 'Personnel', public: false, superOnly: true },
    { id: 'administration', icon: <ShieldCheck size={18} />, label: 'Admin', public: false, superOnly: true }
  ];

  const visibleNavItems = navItems.filter(item => {
    if (item.public) return true;
    if (!currentUser) return false;
    if (item.superOnly && currentUser.role !== 'SUPERADMIN') return false;
    return true;
  });

  const groupedNavItems = useMemo(() => {
    const groups = [
      { id: 'pilotage', label: 'Pilotage & Monitoring', icon: <LayoutDashboard size={18} />, items: ['pulse', 'goal-pulse', 'pres-slideshow', 'summary', 'cockpit', 'map'] },
      { id: 'prelevement', label: 'Collecte & Prélèvement', icon: <Activity size={18} />, items: ['entry', 'recap', 'collection-planning', 'capacity-planning', 'forecasting', 'site-focus', 'history', 'weekly', 'evolution', 'performance'] },
      { id: 'distribution', label: 'Distribution', icon: <Truck size={18} />, items: ['recap-dist', 'distribution-detailed', 'distribution-stock'] },
      { id: 'gts', label: 'GTS', icon: <Truck size={18} />, items: ['gts', 'gts-synthesis', 'gts-comparison'] },
      { id: 'stock', label: 'Gestion des Stocks', icon: <Package size={18} />, items: ['stock-summary', 'stock', 'stock-focus', 'stock-detailed', 'stock-synthesis', 'stock-planning'] },
      { id: 'administration', label: 'Rapports & Admin', icon: <ShieldCheck size={18} />, items: ['ebook', 'global-report', 'contact', 'personnel', 'administration'] }
    ];

    return groups.map(group => ({
      ...group,
      navItems: visibleNavItems.filter(item => group.items.includes(item.id))
    })).filter(group => group.navItems.length > 0);
  }, [visibleNavItems]);

  const getRelativeSyncTime = () => {
    if (!lastSync) return "En attente...";
    const diff = Math.floor((new Date().getTime() - lastSync.getTime()) / 60000);
    if (diff < 1) return "À l'instant";
    return `Il y a ${diff} min`;
  };

  const getFullSyncTime = () => {
    if (!lastSync) return "En attente...";
    return lastSync.toLocaleString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getSituationTime = () => {
    if (!lastSync) return "En attente...";
    const date = lastSync.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `Situation au ${date} à ${time}`;
  };

  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const handleLogout = () => {
    localStorage.removeItem('dsd_user');
    setCurrentUser(null);
    setActiveTab('pulse');
  };

  const effectiveSitesList = useMemo(() => {
    return SITES_DATA.map(s => {
      const dyn = dynamicSites.find(ds => ds.code === s.code);
      return dyn ? { ...s, manager: dyn.manager, email: dyn.email, phone: dyn.phone } : s;
    });
  }, [dynamicSites]);

  return (
    <div className="flex min-h-screen bg-[#F1F5F9] bg-grid-slate-100">
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden lg:flex flex-col w-80 bg-orange-600 h-screen sticky top-0 z-[110] overflow-y-auto border-r border-white/10">
        <div className="p-10 flex items-center gap-5 border-b border-white/10">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-2xl shadow-white/20 animate-float text-orange-600">
            <Activity size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-display font-black tracking-tighter uppercase text-white leading-none">HEMO-STATS</h1>
          </div>
        </div>

        <nav className="flex-1 p-8 space-y-10">
          {groupedNavItems.map((group) => (
            <div key={group.id} className="space-y-4">
              <div className="flex items-center justify-between px-4">
                <span className="text-[10px] font-display font-black uppercase tracking-[0.25em] text-orange-100/60">{group.label}</span>
                <div className="w-10 h-[1px] bg-white/10" />
              </div>
              <div className="space-y-1.5">
                {group.navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as AppTab)}
                      className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-500 group relative overflow-hidden ${isActive ? 'bg-white text-orange-600 shadow-2xl shadow-white/20' : 'text-orange-50 hover:bg-white/10 hover:text-white'}`}
                    >
                      <span className={`${isActive ? 'text-orange-600' : 'text-orange-200 group-hover:text-white transition-colors'}`}>{item.icon}</span>
                      <span className="text-[11px] font-display font-bold uppercase tracking-widest">{item.label}</span>
                      {isActive && (
                        <motion.div 
                          layoutId="sidebar-active" 
                          className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-600 shadow-[0_0_10px_rgba(255,255,255,0.8)]" 
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-8 border-t border-white/10">
          <div className="bg-white/10 rounded-[2rem] p-6 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                <Clock size={16} />
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-display font-black uppercase tracking-widest text-orange-200">Dernière Synchronisation</span>
                <span className="text-[10px] font-mono font-bold text-white">{getFullSyncTime()}</span>
              </div>
            </div>
            <p className="text-[9px] font-medium text-orange-100/60 leading-relaxed">
              Système de monitoring en temps réel connecté aux flux nationaux.
            </p>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-[100] px-4 py-4 lg:px-10 lg:py-6">
          <div className="max-w-full mx-auto bg-orange-600 rounded-[3rem] px-8 py-5 flex items-center justify-between shadow-3xl min-h-[5.5rem] border border-white/10">
            <div className="flex items-center gap-5 cursor-pointer lg:hidden" onClick={() => setActiveTab('pulse')}>
               <div className="w-12 h-12 bg-white rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center shadow-sm">
                  <img 
                    src={branding.logo} 
                    alt="Logo" 
                    className="w-full h-full object-contain p-2" 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=934812425420904';
                    }}
                  />
               </div>
               <div className="flex flex-col">
                  <span className="font-display font-black text-xl tracking-tighter uppercase text-white leading-none">HEMO-STATS</span>
                  <div className="flex items-center gap-2 mt-1.5">
                     <div className={`w-2 h-2 rounded-full bg-white animate-pulse`}></div>
                     <span className="text-[8px] font-display font-black uppercase tracking-widest text-orange-100">Live Status</span>
                  </div>
               </div>
            </div>

            <div className="hidden lg:flex flex-col">
              <h2 className="text-2xl font-display font-black uppercase tracking-tighter text-white">
                {groupedNavItems.find(g => g.navItems.some(i => i.id === activeTab))?.navItems.find(i => i.id === activeTab)?.label || 'Cockpit'}
              </h2>
              <div className="flex items-center gap-3 mt-1.5">
                <p className="text-[11px] font-display font-bold text-orange-100 uppercase tracking-widest">
                  {getRelativeSyncTime()}
                </p>
                <div className="w-1 h-1 rounded-full bg-white/20" />
                <p className="text-[11px] font-mono font-medium text-white font-bold text-glow-orange">
                  {getFullSyncTime()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-white/10 p-1 rounded-2xl border border-white/10">
                <SyncStatus 
                  status={syncStatus}
                  isCloudSyncing={isCloudSyncing}
                  lastSync={lastSync}
                  onSync={(force) => handleSync(true, force)}
                  autoRefresh={autoRefresh}
                  onToggleAutoRefresh={setAutoRefresh}
                />
              </div>
              
              <button 
                onClick={() => setIsCommandPaletteOpen(true)}
                className="hidden md:flex items-center gap-4 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-white transition-all group backdrop-blur-sm"
              >
                <Search size={18} className="group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-display font-black uppercase tracking-widest">Recherche</span>
                <div className="flex items-center gap-1.5 ml-6">
                  <span className="px-2 py-1 bg-white/10 rounded-lg text-[9px] font-mono font-black text-white border border-white/10">⌘</span>
                  <span className="px-2 py-1 bg-white/10 rounded-lg text-[9px] font-mono font-black text-white border border-white/10">K</span>
                </div>
              </button>

              <div className="h-10 w-[1px] bg-white/10 mx-2 hidden sm:block" />

              {currentUser ? (
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-[11px] font-display font-black uppercase tracking-tight text-white leading-none">
                      {currentUser.prenoms} {currentUser.nom}
                    </span>
                    <span className="text-[9px] font-display font-bold uppercase tracking-widest text-orange-100 mt-1.5">
                      {currentUser.fonction}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-orange-600 shadow-xl relative group">
                    <UserIcon size={20} />
                    <button 
                      onClick={handleLogout}
                      className="absolute -top-2 -right-2 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity active:scale-90 border-2 border-white"
                    >
                      <LogOut size={12} />
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setShowLogin(true)} 
                  className="px-8 py-3 bg-white text-orange-600 rounded-2xl text-[11px] font-display font-black uppercase tracking-widest shadow-2xl hover:bg-orange-50 transition-all active:scale-95"
                >
                  Connexion
                </button>
              )}
              
              <div className="hidden sm:flex items-center gap-3">
                <div className="bg-white/10 p-1.5 rounded-2xl border border-white/10">
                   <NotificationManager />
                </div>
                <button 
                  onClick={() => setShowSettings(true)} 
                  className="p-3 bg-white/10 rounded-2xl border border-white/10 text-white hover:bg-white/20 transition-all"
                >
                  <Settings size={20} />
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 w-full px-4 sm:px-6 lg:px-10 py-6 lg:py-10 pb-32 pb-safe">
          <ErrorBoundary>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 p-6 bg-rose-50 border border-rose-100 rounded-[2rem] flex items-center gap-4 text-rose-600 shadow-sm"
              >
                <AlertCircle className="shrink-0" size={24} />
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1">Erreur de Synchronisation</p>
                  <p className="text-xs font-bold">{error}</p>
                </div>
                <button 
                  onClick={() => handleSync(false, true)}
                  className="px-6 py-2 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-colors shadow-lg shadow-rose-600/20"
                >
                  Réessayer
                </button>
              </motion.div>
            )}
            <StockAlert data={fullData} user={currentUser} className="mb-8" />
            
            <AppLoadingOverlay isVisible={loading && !fullData.dailyHistory.length} />

            {!fullData.dailyHistory.length && !loading ? (
              <div className="flex flex-col items-center justify-center py-48 gap-6">
                 <AlertCircle size={60} className="text-slate-300" />
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                   Aucune donnée disponible.<br/>Veuillez vérifier votre connexion ou la source.
                 </p>
              </div>
            ) : (
            <Suspense fallback={
              <div className="flex flex-col items-center justify-center py-48 gap-4 px-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full animate-pulse" />
                  <Loader2 size={40} className="text-orange-600 animate-spin relative z-10" />
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Initialisation du module</p>
                  <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-1">Allocation des ressources système...</p>
                </div>
              </div>
            }>
              <AnimatePresence mode="wait">
                <motion.div 
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="page-transition"
                >
                  {activeTab === 'pulse' && <PulsePerformance data={filteredData} user={currentUser} onLoginClick={() => setShowLogin(true)} isConnected={!!currentUser} branding={branding} setActiveTab={setActiveTab} />}
                  {activeTab === 'goal-pulse' && <GoalPulseView data={filteredData} branding={branding} />}
                  {activeTab === 'contact' && <ContactsView sites={effectiveSitesList} />}
                  {currentUser && (
                    <>
                      {activeTab === 'summary' && <SummaryView data={filteredData} user={currentUser} setActiveTab={setActiveTab} branding={branding} />}
                      {activeTab === 'pres-slideshow' && <PresSlideshow data={filteredData} />}
                      {activeTab === 'cockpit' && <VisualDashboard data={filteredData} setActiveTab={setActiveTab} user={currentUser} sites={effectiveSitesList} />}
                      {activeTab === 'map' && <DistributionMapView data={filteredData} user={currentUser} sites={effectiveSitesList} />}
                      {activeTab === 'entry' && <DataEntryForm scriptUrl={scriptUrl} data={filteredData} user={currentUser} sites={effectiveSitesList} onSyncRequest={() => handleSync(true, true)} onOptimisticUpdate={injectOptimisticData} onCloudSyncChange={setIsCloudSyncing} />}
                      {activeTab === 'site-focus' && <SiteSynthesisView data={filteredData} user={currentUser} sites={effectiveSitesList} branding={branding} />}
                      {activeTab === 'history' && <DetailedHistoryView data={filteredData} user={currentUser} sites={effectiveSitesList} />}
                      {activeTab === 'weekly' && <WeeklyView data={filteredData} user={currentUser} branding={branding} />}
                      {activeTab === 'evolution' && <EvolutionView data={filteredData} user={currentUser} branding={branding} />}
                      {activeTab === 'recap' && <RecapView data={filteredData} user={currentUser} sites={effectiveSitesList} initialMode="collecte" branding={branding} situationTime={getSituationTime()} setActiveTab={setActiveTab} />}
                      {activeTab === 'recap-dist' && <RecapView data={filteredData} user={currentUser} sites={effectiveSitesList} initialMode="distribution" branding={branding} situationTime={getSituationTime()} setActiveTab={setActiveTab} />}
                      {activeTab === 'distribution-detailed' && <DistributionDetailedSynthesisView data={filteredData} branding={branding} />}
                      {activeTab === 'distribution-stock' && <DistributionStockView data={filteredData} user={currentUser} />}
                      {activeTab === 'gts' && <GtsView data={filteredData} branding={branding} />}
                      {activeTab === 'gts-synthesis' && <GtsSynthesis data={filteredData} branding={branding} />}
                      {activeTab === 'gts-comparison' && <GtsComparisonView data={filteredData} branding={branding} />}
                      {activeTab === 'collection-planning' && <CollectionPlanningView data={filteredData} branding={branding} />}
                      {activeTab === 'stock-summary' && <StockSummaryView data={filteredData} setActiveTab={setActiveTab} branding={branding} situationTime={getSituationTime()} />}
                      {activeTab === 'stock' && <StockView data={filteredData} user={currentUser} lastSync={lastSync} onSyncRequest={() => handleSync(true, true)} situationTime={getSituationTime()} />}
                      {activeTab === 'stock-focus' && <StockAnalysisFocusView data={filteredData} user={currentUser} situationTime={getSituationTime()} />}
                      {activeTab === 'stock-detailed' && <StockDetailedSynthesisView data={filteredData} branding={branding} situationTime={getSituationTime()} />}
                      {activeTab === 'stock-synthesis' && <StockSynthesisView data={filteredData} user={currentUser} situationTime={getSituationTime()} />}
                      {activeTab === 'stock-planning' && <StockPlanningView data={filteredData} user={currentUser} sites={effectiveSitesList} situationTime={getSituationTime()} />}
                      {activeTab === 'capacity-planning' && <CapacityPlanningView data={filteredData} user={currentUser} sites={effectiveSitesList} />}
                      {activeTab === 'forecasting' && <ForecastingView data={filteredData} user={currentUser} />}
                      {activeTab === 'performance' && <PerformanceView data={filteredData} user={currentUser} sites={effectiveSitesList} />}
                      {activeTab === 'ebook' && <EbookView data={filteredData} user={currentUser} branding={branding} sites={effectiveSitesList} />}
                      {activeTab === 'global-report' && <GlobalSynthesisReportView data={filteredData} user={currentUser} branding={branding} situationTime={getSituationTime()} />}
                      {activeTab === 'personnel' && <PersonnelManagement user={currentUser} />}
                      {activeTab === 'administration' && <AdminUserManagement scriptUrl={scriptUrl} onBrandingChange={updateBranding} currentBranding={branding} sites={effectiveSitesList} onSyncRequest={() => handleSync(true, true)} user={currentUser} />}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </Suspense>
          )}
          </ErrorBoundary>
        </main>

        {/* QUICK ACTIONS FLOATING */}
        <div className="hidden lg:flex fixed bottom-8 right-8 z-[150] flex flex-col gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsCommandPaletteOpen(true)}
            className="w-14 h-14 bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-100 flex items-center justify-center group"
          >
            <Search size={24} className="group-hover:text-orange-600 transition-colors" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSync(true, true)}
            className="w-14 h-14 bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-100 flex items-center justify-center group"
          >
            <RefreshCw size={24} className={`${syncStatus === 'syncing' ? 'animate-spin' : ''} group-hover:text-emerald-600 transition-colors`} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSettings(true)}
            className="w-14 h-14 bg-slate-900 text-white rounded-2xl shadow-2xl flex items-center justify-center group"
          >
            <Plus size={24} className="group-hover:rotate-90 transition-transform" />
          </motion.button>
        </div>
      </div>

      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
        onNavigate={setActiveTab}
        sites={effectiveSitesList}
        onSiteSelect={handleSiteSelect}
        syncTime={getFullSyncTime()}
      />
      <InstallPrompt />
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-orange-600 rounded-t-[3rem] p-3 flex justify-between items-center shadow-3xl gap-2 pb-safe">
           {groupedNavItems.map((group) => {
             const isActive = group.navItems.some(item => activeTab === item.id);
             const isOpen = openGroup === group.id;

             return (
               <div key={group.id} className="flex-1">
                 <button 
                   onClick={() => setOpenGroup(isOpen ? null : group.id)}
                   className={`w-full flex flex-col items-center gap-1.5 py-3 rounded-[2rem] transition-all duration-500 active:scale-90 relative ${isActive ? 'text-white' : 'text-orange-100/60'}`}
                 >
                   <div className={`p-3 rounded-2xl transition-all duration-500 ${isActive ? 'bg-white text-orange-600 shadow-xl' : 'bg-transparent'}`}>
                    {group.icon}
                   </div>
                   <span className={`text-[8px] font-display font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-60'}`}>{group.label}</span>
                   {isActive && !isOpen && <motion.div layoutId="nav-indicator" className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-white" />}
                 </button>

                 <AnimatePresence>
                   {isOpen && (
                     <>
                       <motion.div 
                         initial={{ opacity: 0 }}
                         animate={{ opacity: 1 }}
                         exit={{ opacity: 0 }}
                         onClick={() => setOpenGroup(null)}
                         className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[-1]"
                       />
                       <motion.div 
                         initial={{ opacity: 0, y: 100 }}
                         animate={{ opacity: 1, y: 0 }}
                         exit={{ opacity: 0, y: 100 }}
                         className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[3rem] shadow-3xl border-t border-slate-100 p-6 z-[200] max-h-[85vh] overflow-y-auto"
                       >
                         <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
                         
                         <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
                                {group.icon}
                              </div>
                              <div>
                                <h4 className="text-lg font-black uppercase tracking-tighter text-slate-900">{group.label}</h4>
                                <div className="flex items-center gap-2">
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{group.navItems.length} Options</p>
                                   <div className="w-1 h-1 rounded-full bg-slate-200" />
                                   <p className="text-[8px] font-bold text-orange-500 uppercase tracking-widest">MàJ: {getFullSyncTime()}</p>
                                 </div>
                              </div>
                            </div>
                            <button onClick={() => setOpenGroup(null)} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 active:scale-90 transition-transform">
                              <X size={20} />
                            </button>
                         </div>

                         <div className="grid grid-cols-1 gap-3">
                           {group.navItems.map((item) => (
                             <button
                               key={item.id}
                               onClick={() => { setActiveTab(item.id as AppTab); setOpenGroup(null); }}
                               className={`flex items-center justify-between px-6 py-5 rounded-[1.5rem] text-left transition-all active:scale-[0.98] ${activeTab === item.id ? 'bg-slate-900 text-white shadow-2xl shadow-slate-300' : 'bg-slate-50 text-slate-600'}`}
                             >
                               <div className="flex items-center gap-4">
                                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeTab === item.id ? 'bg-white/10 text-white' : 'bg-white text-slate-400 shadow-sm'}`}>
                                  {item.icon}
                                 </div>
                                 <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
                               </div>
                               {activeTab === item.id ? (
                                 <div className="w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.5)]" />
                               ) : (
                                 <ArrowRight size={16} className="text-slate-300" />
                               )}
                             </button>
                           ))}
                         </div>
                         
                         <div className="h-12" /> {/* Spacer for safe area */}
                       </motion.div>
                     </>
                   )}
                 </AnimatePresence>
               </div>
             );
           })}
      </nav>
      {showSettings && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-8 max-w-lg w-full shadow-3xl">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black uppercase">Paramètres</h3>
                <div className="flex flex-col items-end">
                  <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Dernière Synchronisation</span>
                  <span className="text-[10px] font-bold text-orange-600">{getFullSyncTime()}</span>
                </div>
             </div>
             
             <div className="space-y-4 mb-8">
               <div>
                 <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Source Collecte (CSV)</label>
                 <input value={sheetInput} onChange={(e) => setSheetInput(e.target.value)} className="w-full bg-slate-50 border rounded-2xl px-6 py-4 text-xs font-bold outline-none" />
               </div>
               
               <div>
                 <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Source BASE (Distribution) - Lecture seule</label>
                 <input value={DEFAULT_LINK_DISTRIBUTION} readOnly className="w-full bg-slate-50 border rounded-2xl px-6 py-4 text-[10px] font-bold outline-none opacity-60 cursor-not-allowed" />
               </div>

               <div>
                 <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Source STOCK (Stock) - Lecture seule</label>
                 <input value={DEFAULT_LINK_STOCK} readOnly className="w-full bg-slate-50 border rounded-2xl px-6 py-4 text-[10px] font-bold outline-none opacity-60 cursor-not-allowed" />
               </div>
             </div>

             <div className="flex flex-col gap-4">
               <div className="flex gap-4">
                 <button onClick={() => setShowSettings(false)} className="flex-1 py-4 bg-slate-100 rounded-xl font-black text-[10px] uppercase">Annuler</button>
                 <button onClick={() => { 
                   localStorage.setItem('gsheet_input_1', sheetInput.trim()); 
                   setShowSettings(false); 
                   handleSync(false, true); 
                 }} className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase">Valider</button>
               </div>
               <button 
                 onClick={() => {
                   localStorage.removeItem('gsheet_input_1');
                   localStorage.removeItem('gsheet_input_dist');
                   localStorage.removeItem('gsheet_input_stock');
                   window.location.reload();
                 }}
                 className="w-full py-3 border-2 border-dashed border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 rounded-xl font-black text-[9px] uppercase transition-all"
               >
                 Réinitialiser tous les liens par défaut
               </button>
             </div>
          </div>
        </div>
      )}
      {showLogin && <LoginView onClose={() => setShowLogin(false)} onLogin={setCurrentUser} scriptUrl={scriptUrl} sheetUrl={sheetInput} sites={effectiveSitesList} />}
    </div>
  );
};

export default App;
