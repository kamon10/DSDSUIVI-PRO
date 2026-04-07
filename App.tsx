
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { INITIAL_DATA, DEFAULT_LINK_1, DEFAULT_LINK_DISTRIBUTION, DEFAULT_LINK_STOCK, DEFAULT_LINK_GTS, DEFAULT_SCRIPT_URL, SITES_DATA, WORKING_DAYS_YEAR, getSiteByInput } from './constants.tsx';
import { VisualDashboard } from './components/VisualDashboard.tsx';
import { GoalPulseView } from './components/GoalPulseView.tsx';
import { PerformanceView } from './components/PerformanceView.tsx';
import { RecapView } from './components/RecapView.tsx';
import { PulsePerformance } from './components/PulsePerformance.tsx';
import { EvolutionView } from './components/EvolutionView.tsx';
import { SummaryView } from './components/SummaryView.tsx';
import { WeeklyView } from './components/WeeklyView.tsx';
import { SiteSynthesisView } from './components/SiteSynthesisView.tsx';
import { DataEntryForm } from './components/DataEntryForm.tsx';
import { ContactsView } from './components/ContactsView.tsx';
import { DistributionMapView } from './components/DistributionMapView.tsx';
import { LoginView } from './components/LoginView.tsx';
import { AdminUserManagement } from './components/AdminUserManagement.tsx';
import { DetailedHistoryView } from './components/DetailedHistoryView.tsx';
import { StockView } from './components/StockView.tsx';
import { StockSynthesisView } from './components/StockSynthesisView.tsx';
import { StockSummaryView } from './components/StockSummaryView.tsx';
import { StockDetailedSynthesisView } from './components/StockDetailedSynthesisView.tsx';
import { StockAnalysisFocusView } from './components/StockAnalysisFocusView.tsx';
import { DistributionDetailedSynthesisView } from './components/DistributionDetailedSynthesisView.tsx';
import { StockPlanningView } from './components/StockPlanningView.tsx';
import { GlobalSynthesisReportView } from './components/GlobalSynthesisReportView.tsx';
import { DistributionStockView } from './components/DistributionStockView.tsx';
import { CapacityPlanningView } from './components/CapacityPlanningView.tsx';
import { GtsView } from './components/GtsView.tsx';
import { GtsSynthesis } from './components/GtsSynthesis.tsx';
import { GtsComparisonView } from './components/GtsComparisonView.tsx';
import { CollectionPlanningView } from './components/CollectionPlanningView.tsx';
import { EbookView } from './components/EbookView.tsx';
import { PersonnelManagement } from './components/PersonnelManagement.tsx';
import { DonorManagement } from './components/DonorManagement.tsx';
import { fetchSheetData, fetchUsers, fetchBrandingConfig, fetchDynamicSites } from './services/googleSheetService.ts';
import { NotificationManager } from './components/NotificationManager.tsx';
import { StockAlert } from './components/StockAlert.tsx';
import { InstallPrompt } from './components/InstallPrompt.tsx';
import { AppTab, DashboardData, User, SiteRecord } from './types.ts';
import { Activity, LayoutDashboard, RefreshCw, Settings, BarChart3, HeartPulse, LineChart, Layout, Database, Clock, Lock, LogOut, ShieldCheck, User as UserIcon, Book, BookOpen, Truck, Map as MapIcon, PlusSquare, UserCheck, FileText, AlertCircle, History, ClipboardList, Wifi, WifiOff, Package, Search, Command, TrendingUp, Zap, X, ChevronDown, ArrowRight, PieChart, Calendar, Plus, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CommandPalette } from './components/CommandPalette.tsx';

const App: React.FC = () => {
  const [fullData, setFullData] = useState<DashboardData>(INITIAL_DATA);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('pulse'); 
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
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
  const [sheetInputDist, setSheetInputDist] = useState(localStorage.getItem('gsheet_input_dist') || DEFAULT_LINK_DISTRIBUTION);
  const [sheetInputStock, setSheetInputStock] = useState(localStorage.getItem('gsheet_input_stock') || DEFAULT_LINK_STOCK);
  const [sheetInputGts, setSheetInputGts] = useState(localStorage.getItem('gsheet_input_gts') || DEFAULT_LINK_GTS);
  const [sheetInputDonor, setSheetInputDonor] = useState(localStorage.getItem('gsheet_input_donor') || "https://docs.google.com/spreadsheets/d/e/2PACX-1vS9CBR20IhIgLrI4kKRDV9IDkdB5DzzntJlBFSVhdN7gA_6WOfC-f5xZ7IhCr4rQIdu5Bho3fgHGvih/pub?output=csv");
  const [showSettings, setShowSettings] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('dsd_user');
    if (!saved) return null;
    try { return JSON.parse(saved); } catch (e) { return null; }
  });
  const [error, setError] = useState<string | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Migration for old spreadsheet ID
  useEffect(() => {
    const oldId = "2PACX-1vSouyEoRMmp2bAoGgMOtPvN4UfjUetBXnvQBVjPdfcvLfVl2dUNe185DbR2usGyK4UO38p2sb8lBkKN";
    const newId = "2PACX-1vS9CBR20IhIgLrI4kKRDV9IDkdB5DzzntJlBFSVhdN7gA_6WOfC-f5xZ7IhCr4rQIdu5Bho3fgHGvih";
    
    const checkAndUpdate = (key: string, current: string, setter: (v: string) => void) => {
      if (current.includes(oldId)) {
        const updated = current.replace(oldId, newId);
        setter(updated);
        localStorage.setItem(key, updated);
        return true;
      }
      return false;
    };
    
    let changed = false;
    changed = checkAndUpdate('gsheet_input_1', sheetInput, setSheetInput) || changed;
    changed = checkAndUpdate('gsheet_input_dist', sheetInputDist, setSheetInputDist) || changed;
    changed = checkAndUpdate('gsheet_input_stock', sheetInputStock, setSheetInputStock) || changed;
    changed = checkAndUpdate('gsheet_input_gts', sheetInputGts, setSheetInputGts) || changed;
    changed = checkAndUpdate('gsheet_input_donor', sheetInputDonor, setSheetInputDonor) || changed;
    
    if (changed) {
      console.log("[Migration] Old Google Sheets links detected and updated.");
      handleSync(true, true);
    }
  }, []);

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

  const handleSync = useCallback(async (isSilent = false, force = false) => {
    if (isSyncingRef.current) return;
    
    // Garde-fou réduit à 60s pour plus de réactivité si le cache Google est à jour
    if (isSilent && !force && (Date.now() - lastOptimisticUpdateRef.current < 60000)) {
       return;
    }

    const currentInput = sheetInputRef.current;
    const currentDist = localStorage.getItem('gsheet_input_dist') || DEFAULT_LINK_DISTRIBUTION;
    const currentStock = localStorage.getItem('gsheet_input_stock') || DEFAULT_LINK_STOCK;
    const currentGts = localStorage.getItem('gsheet_input_gts') || DEFAULT_LINK_GTS;
    
    isSyncingRef.current = true;
    
    if (!isSilent) setLoading(true);
    setSyncStatus('syncing');

    try {
      const [dynSitesResult, brandingResult] = await Promise.all([
        fetchDynamicSites(DEFAULT_SCRIPT_URL),
        fetchBrandingConfig(DEFAULT_SCRIPT_URL)
      ]);
      
      if (dynSitesResult) setDynamicSites(dynSitesResult);
      
      const dataResult = await fetchSheetData(
        currentInput.trim(), 
        force, 
        currentDist.trim(), 
        dynSitesResult || [], 
        currentStock.trim(), 
        currentGts.trim()
      );
      
      if (dataResult) {
        setFullData(dataResult);
        localStorage.setItem('gsheet_input_1', currentInput.trim());
      }
      
      if (brandingResult) {
        setBranding(brandingResult);
        localStorage.setItem('hemo_branding', JSON.stringify(brandingResult));
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
    // Synchronisation initiale
    handleSync(false, true);
    
    // Polling automatique toutes les 2 minutes pour garder les données fraîches
    const interval = setInterval(() => {
      handleSync(true, false);
    }, 120000);
    
    return () => clearInterval(interval);
  }, [handleSync]);

  useEffect(() => {
    const refreshInterval = setInterval(() => {
      handleSync(true, false);
    }, 30000);
    return () => clearInterval(refreshInterval);
  }, [handleSync]);

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
    { id: 'site-focus', icon: <UserCheck size={18} />, label: 'Focus', public: false },
    { id: 'history', icon: <History size={18} />, label: 'Historique', public: false },
    { id: 'weekly', icon: <Clock size={18} />, label: 'Mensuel', public: false },
    { id: 'evolution', icon: <LineChart size={18} />, label: 'Évol.', public: false },
    { id: 'performance', icon: <BarChart3 size={18} />, label: 'Rang', public: false },
    { id: 'contact', icon: <BookOpen size={18} />, label: 'Contact', public: true },
    { id: 'ebook', icon: <Book size={18} />, label: 'E-Book Hebdo', public: false },
    { id: 'global-report', icon: <FileText size={18} />, label: 'Rapport Global', public: false },
    { id: 'personnel', icon: <UserCheck size={18} />, label: 'Personnel', public: false, superOnly: true },
    { id: 'donor', icon: <UserIcon size={18} />, label: 'Gestion Donneur', public: true },
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
      { id: 'prelevement', label: 'Prélèvement', icon: <Activity size={18} />, items: ['pulse', 'goal-pulse', 'summary', 'cockpit', 'map', 'entry', 'recap', 'capacity-planning', 'site-focus', 'history', 'weekly', 'evolution', 'performance'] },
      { id: 'distribution', label: 'Distribution', icon: <Truck size={18} />, items: ['recap-dist', 'distribution-detailed', 'distribution-stock'] },
      { id: 'gts', label: 'GTS & Planning', icon: <Truck size={18} />, items: ['gts', 'gts-synthesis', 'gts-comparison', 'collection-planning'] },
      { id: 'stock', label: 'Stock', icon: <Package size={18} />, items: ['stock-summary', 'stock', 'stock-focus', 'stock-detailed', 'stock-synthesis', 'stock-planning'] },
      { id: 'donneurs', label: 'Donneurs', icon: <HeartPulse size={18} />, items: ['donor'] },
      { id: 'administration', label: 'Administration', icon: <ShieldCheck size={18} />, items: ['administration', 'personnel', 'ebook', 'global-report', 'contact'] }
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
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-100 h-screen sticky top-0 z-[110] overflow-y-auto">
        <div className="p-8 flex items-center gap-4 border-b border-slate-50">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-xl shadow-slate-200">
            <Activity className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase text-slate-900 leading-none">HEMO</h1>
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-blue-500 mt-1 block">Cockpit Live</span>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-8">
          {groupedNavItems.map((group) => (
            <div key={group.id} className="space-y-3">
              <div className="flex items-center justify-between px-4">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{group.label}</span>
                <div className="w-8 h-[1px] bg-slate-100" />
              </div>
              <div className="space-y-1">
                {group.navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as AppTab)}
                      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${isActive ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                      <span className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'}`}>{item.icon}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
                      {isActive && <motion.div layoutId="sidebar-active" className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-50">
          <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                <Clock size={14} />
              </div>
              <div className="flex flex-col">
                <span className="text-[7px] font-black uppercase tracking-widest text-slate-400">Dernière MàJ</span>
                <span className="text-[9px] font-bold text-slate-900">{getFullSyncTime()}</span>
              </div>
            </div>
            <p className="text-[8px] font-medium text-slate-400 leading-relaxed">
              Les données sont synchronisées en temps réel avec les serveurs nationaux.
            </p>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-[100] px-4 py-3 lg:px-6 lg:py-4 bg-[#f8fafc]/80 backdrop-blur-md">
          <div className="max-w-full mx-auto glass-nav rounded-[2.5rem] px-6 py-4 flex items-center justify-between shadow-2xl min-h-[5rem]">
            <div className="flex items-center gap-4 cursor-pointer lg:hidden" onClick={() => setActiveTab('pulse')}>
               <div className="w-10 h-10 bg-white rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center shadow-sm">
                  <img 
                    src={branding.logo} 
                    alt="Logo" 
                    className="w-full h-full object-contain p-1.5" 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=934812425420904';
                    }}
                  />
               </div>
               <div className="flex flex-col">
                  <span className="font-black text-lg tracking-tighter uppercase text-slate-900 leading-none">HS</span>
                  <div className="flex items-center gap-1.5 mt-1">
                     <div className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'syncing' ? 'bg-blue-500 animate-ping' : syncStatus === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                     <span className="text-[7px] font-black uppercase tracking-widest text-slate-400">Live</span>
                  </div>
               </div>
            </div>

            <div className="hidden lg:flex flex-col">
              <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900">
                {groupedNavItems.find(g => g.navItems.some(i => i.id === activeTab))?.navItems.find(i => i.id === activeTab)?.label || 'Cockpit'}
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                {getRelativeSyncTime()} <span className="opacity-60">({getFullSyncTime()})</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => handleSync(true, true)}
                disabled={syncStatus === 'syncing'}
                className={`p-2.5 rounded-2xl transition-all active:scale-95 ${syncStatus === 'syncing' ? 'bg-slate-100 text-slate-400 animate-spin' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'}`}
                title="Actualiser les données"
              >
                <RefreshCw size={18} />
              </button>
              <button 
                onClick={() => setIsCommandPaletteOpen(true)}
                className="hidden md:flex items-center gap-3 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-2xl text-slate-500 transition-all group"
              >
                <Search size={16} className="group-hover:text-slate-900" />
                <span className="text-[10px] font-black uppercase tracking-widest">Rechercher...</span>
                <div className="flex items-center gap-1 ml-4">
                  <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[8px] font-black text-slate-400">⌘</span>
                  <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[8px] font-black text-slate-400">K</span>
                </div>
              </button>
              {currentUser ? (
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex flex-col items-end border-r border-slate-200 pr-4">
                    <span className="text-[10px] font-black uppercase tracking-tighter text-slate-900 leading-none">
                      {currentUser.prenoms} {currentUser.nom}
                    </span>
                    <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500 mt-1">
                      {currentUser.fonction}
                    </span>
                  </div>
                  <button onClick={handleLogout} className="p-2.5 bg-slate-100 rounded-xl text-slate-600 hover:text-rose-600 border border-slate-200 transition-colors shadow-sm">
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowLogin(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg">Connexion</button>
              )}
              <NotificationManager />
              <button onClick={() => setShowSettings(true)} className="p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-slate-600 shadow-sm"><Settings size={16} /></button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 lg:px-8 py-8 pb-32 pb-safe">
          <StockAlert data={fullData} user={currentUser} className="mb-8" />
          {loading && !fullData.dailyHistory.length ? (
            <div className="flex flex-col items-center justify-center py-48 gap-6">
               <Activity size={60} className="text-blue-600 animate-pulse" />
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Initialisation du Cockpit...</p>
            </div>
          ) : (
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
                    {activeTab === 'cockpit' && <VisualDashboard data={filteredData} setActiveTab={setActiveTab} user={currentUser} sites={effectiveSitesList} />}
                    {activeTab === 'map' && <DistributionMapView data={filteredData} user={currentUser} sites={effectiveSitesList} />}
                    {activeTab === 'entry' && <DataEntryForm scriptUrl={scriptUrl} data={filteredData} user={currentUser} sites={effectiveSitesList} onSyncRequest={() => handleSync(true, true)} onOptimisticUpdate={injectOptimisticData} />}
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
                    {activeTab === 'performance' && <PerformanceView data={filteredData} user={currentUser} sites={effectiveSitesList} />}
                    {activeTab === 'donor' && <DonorManagement csvUrl={sheetInputDonor} />}
                    {activeTab === 'ebook' && <EbookView data={filteredData} user={currentUser} branding={branding} sites={effectiveSitesList} />}
                    {activeTab === 'global-report' && <GlobalSynthesisReportView data={filteredData} user={currentUser} branding={branding} situationTime={getSituationTime()} />}
                    {activeTab === 'personnel' && <PersonnelManagement user={currentUser} />}
                    {activeTab === 'administration' && <AdminUserManagement scriptUrl={scriptUrl} onBrandingChange={updateBranding} currentBranding={branding} sites={effectiveSitesList} onSyncRequest={() => handleSync(true, true)} user={currentUser} />}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>

        {/* QUICK ACTIONS FLOATING */}
        <div className="hidden lg:flex fixed bottom-8 right-8 z-[150] flex flex-col gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsCommandPaletteOpen(true)}
            className="w-14 h-14 bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-100 flex items-center justify-center group"
          >
            <Search size={24} className="group-hover:text-blue-600 transition-colors" />
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
      <nav className="lg:hidden fixed bottom-6 bottom-safe left-4 right-4 z-[100] glass-nav rounded-[2.5rem] p-2 flex justify-between items-center shadow-2xl gap-1 mb-safe">
           {groupedNavItems.map((group) => {
             const isActive = group.navItems.some(item => activeTab === item.id);
             const isOpen = openGroup === group.id;

             return (
               <div key={group.id} className="flex-1">
                 <button 
                   onClick={() => setOpenGroup(isOpen ? null : group.id)}
                   className={`w-full flex flex-col items-center gap-1 py-3 rounded-3xl transition-all duration-300 active:scale-90 relative ${isActive ? 'text-slate-900' : 'text-slate-400'}`}
                 >
                   <div className={`p-2 rounded-2xl transition-all ${isActive ? 'bg-slate-900 text-white shadow-lg' : 'bg-transparent'}`}>
                    {group.icon}
                   </div>
                   <span className={`text-[7px] font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-60'}`}>{group.label}</span>
                   {isActive && !isOpen && <motion.div layoutId="nav-indicator" className="absolute -bottom-1 w-1 h-1 rounded-full bg-slate-900" />}
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
                                   <p className="text-[8px] font-bold text-blue-500 uppercase tracking-widest">MàJ: {getFullSyncTime()}</p>
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
                                 <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]" />
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
                  <span className="text-[10px] font-bold text-blue-600">{getFullSyncTime()}</span>
                </div>
             </div>
             
             <div className="space-y-4 mb-8">
               <div>
                 <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Source Collecte (CSV)</label>
                 <input value={sheetInput} onChange={(e) => setSheetInput(e.target.value)} className="w-full bg-slate-50 border rounded-2xl px-6 py-4 text-xs font-bold outline-none" />
               </div>
               
               <div>
                 <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Source BASE (Distribution)</label>
                 <input value={sheetInputDist} onChange={(e) => setSheetInputDist(e.target.value)} className="w-full bg-slate-50 border rounded-2xl px-6 py-4 text-[10px] font-bold outline-none" />
               </div>

               <div>
                 <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Source STOCK (Stock)</label>
                 <input value={sheetInputStock} onChange={(e) => setSheetInputStock(e.target.value)} className="w-full bg-slate-50 border rounded-2xl px-6 py-4 text-[10px] font-bold outline-none" />
               </div>

               <div>
                 <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Source GTS (GTS)</label>
                 <input value={sheetInputGts} onChange={(e) => setSheetInputGts(e.target.value)} className="w-full bg-slate-50 border rounded-2xl px-6 py-4 text-[10px] font-bold outline-none" />
               </div>

               <div>
                 <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Source DONNEURS (Gestion Donneur)</label>
                 <input value={sheetInputDonor} onChange={(e) => setSheetInputDonor(e.target.value)} className="w-full bg-slate-50 border rounded-2xl px-6 py-4 text-[10px] font-bold outline-none" />
               </div>
             </div>

             <div className="flex flex-col gap-4">
               <div className="flex gap-4">
                 <button onClick={() => setShowSettings(false)} className="flex-1 py-4 bg-slate-100 rounded-xl font-black text-[10px] uppercase">Annuler</button>
                 <button onClick={() => { 
                   localStorage.setItem('gsheet_input_1', sheetInput.trim()); 
                   localStorage.setItem('gsheet_input_dist', sheetInputDist.trim());
                   localStorage.setItem('gsheet_input_stock', sheetInputStock.trim());
                   localStorage.setItem('gsheet_input_gts', sheetInputGts.trim());
                   localStorage.setItem('gsheet_input_donor', sheetInputDonor.trim());
                   setShowSettings(false); 
                   handleSync(false, true); 
                 }} className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase">Valider</button>
               </div>
               <button 
                 onClick={() => {
                   localStorage.removeItem('gsheet_input_1');
                   localStorage.removeItem('gsheet_input_dist');
                   localStorage.removeItem('gsheet_input_stock');
                   localStorage.removeItem('gsheet_input_gts');
                   localStorage.removeItem('gsheet_input_donor');
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
