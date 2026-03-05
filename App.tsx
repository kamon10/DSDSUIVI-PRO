
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { INITIAL_DATA, DEFAULT_LINK_1, DEFAULT_LINK_DISTRIBUTION, DEFAULT_LINK_STOCK, DEFAULT_SCRIPT_URL, SITES_DATA, WORKING_DAYS_YEAR, getSiteByInput } from './constants.tsx';
import { VisualDashboard } from './components/VisualDashboard.tsx';
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
import { StockDetailedSynthesisView } from './components/StockDetailedSynthesisView.tsx';
import { DistributionDetailedSynthesisView } from './components/DistributionDetailedSynthesisView.tsx';
import { StockPlanningView } from './components/StockPlanningView.tsx';
import { DistributionStockView } from './components/DistributionStockView.tsx';
import { CapacityPlanningView } from './components/CapacityPlanningView.tsx';
import { fetchSheetData, fetchUsers, fetchBrandingConfig, fetchDynamicSites } from './services/googleSheetService.ts';
import { NotificationManager } from './components/NotificationManager.tsx';
import { InstallPrompt } from './components/InstallPrompt.tsx';
import { AppTab, DashboardData, User, SiteRecord } from './types.ts';
import { Activity, LayoutDashboard, RefreshCw, Settings, BarChart3, HeartPulse, LineChart, Layout, Database, Clock, Lock, LogOut, ShieldCheck, User as UserIcon, BookOpen, Truck, Map as MapIcon, PlusSquare, UserCheck, FileText, AlertCircle, History, ClipboardList, Wifi, WifiOff, Package, Search, Command, TrendingUp, Zap, X, ChevronDown, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

  const handleSync = useCallback(async (isSilent = false, force = false) => {
    if (isSyncingRef.current) return;
    
    // Garde-fou réduit à 60s pour plus de réactivité si le cache Google est à jour
    if (isSilent && !force && (Date.now() - lastOptimisticUpdateRef.current < 60000)) {
       return;
    }

    const currentInput = sheetInputRef.current;
    isSyncingRef.current = true;
    
    if (!isSilent) setLoading(true);
    setSyncStatus('syncing');

    try {
      const [dynSitesResult, brandingResult] = await Promise.all([
        fetchDynamicSites(DEFAULT_SCRIPT_URL),
        fetchBrandingConfig(DEFAULT_SCRIPT_URL)
      ]);
      
      if (dynSitesResult) setDynamicSites(dynSitesResult);
      
      const dataResult = await fetchSheetData(currentInput.trim(), force, DEFAULT_LINK_DISTRIBUTION, dynSitesResult || [], DEFAULT_LINK_STOCK);
      
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
    { id: 'summary', icon: <Layout size={18} />, label: 'Résumé', public: false },
    { id: 'cockpit', icon: <LayoutDashboard size={18} />, label: 'Cockpit', public: false },
    { id: 'map', icon: <MapIcon size={18} />, label: 'Carte', public: false },
    { id: 'entry', icon: <PlusSquare size={18} />, label: 'Saisie', public: false },
    { id: 'recap', icon: <FileText size={18} />, label: 'Récap Coll.', public: false },
    { id: 'recap-dist', icon: <ClipboardList size={18} />, label: 'Synthèse Dist', public: false },
    { id: 'distribution-detailed', icon: <ClipboardList size={18} />, label: 'Détail Dist', public: false },
    { id: 'distribution-stock', icon: <Database size={18} />, label: 'Stock & Dist', public: false },
    { id: 'stock', icon: <Package size={18} />, label: 'Stock', public: false },
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
      { id: 'prelevement', label: 'Prélèvement', icon: <Activity size={18} />, items: ['pulse', 'summary', 'cockpit', 'map', 'entry', 'recap', 'capacity-planning', 'site-focus', 'history', 'weekly', 'evolution', 'performance'] },
      { id: 'distribution', label: 'Distribution', icon: <Truck size={18} />, items: ['recap-dist', 'distribution-detailed', 'distribution-stock'] },
      { id: 'stock', label: 'Stock', icon: <Package size={18} />, items: ['stock', 'stock-detailed', 'stock-synthesis', 'stock-planning'] },
      { id: 'administration', label: 'Administration', icon: <ShieldCheck size={18} />, items: ['administration', 'contact'] }
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
    <div className="min-h-screen pb-24 lg:pb-0">
      <header className="fixed top-0 left-0 right-0 z-[100] px-4 py-3 lg:px-6 lg:py-4">
        <div className="max-w-full mx-auto glass-nav rounded-[2.5rem] px-6 py-4 flex items-center justify-between shadow-2xl min-h-[5rem]">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveTab('pulse')}>
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
                    <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                    <span className="text-[7px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">
                       {getRelativeSyncTime()}
                    </span>
                </div>
             </div>
          </div>
          <nav className="hidden lg:flex items-center gap-1">
            {groupedNavItems.map((group) => {
              const isActive = group.navItems.some(item => activeTab === item.id);
              const isOpen = openGroup === group.id;
              
              return (
                <div 
                  key={group.id} 
                  className="relative"
                  onMouseEnter={() => setOpenGroup(group.id)}
                  onMouseLeave={() => setOpenGroup(null)}
                >
                  <button 
                    onClick={() => setOpenGroup(isOpen ? null : group.id)}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl transition-all duration-300 active:scale-95 group ${isActive ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-900'}`}
                  >
                    <span className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'}`}>{group.icon}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">{group.label}</span>
                    <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} ${isActive ? 'text-white/50' : 'text-slate-300'}`} />
                  </button>
                  
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full left-0 mt-2 w-72 bg-white rounded-[2rem] shadow-3xl border border-slate-100 p-3 z-[200] origin-top-left"
                      >
                        <div className="px-4 py-2 mb-2 border-b border-slate-50">
                          <span className="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em]">{group.label}</span>
                        </div>
                        <div className="space-y-1">
                          {group.navItems.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => { setActiveTab(item.id as AppTab); setOpenGroup(null); }}
                              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all group/item ${activeTab === item.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                              <div className="flex items-center gap-3">
                                <span className={`${activeTab === item.id ? 'text-white' : 'text-slate-400 group-hover/item:text-slate-900'}`}>{item.icon}</span>
                                <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                              </div>
                              {activeTab === item.id && <motion.div layoutId="active-dot" className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </nav>
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
                  <span className="text-[7px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">
                    {currentUser.role === 'AGENT' ? currentUser.site : currentUser.role === 'PRES' ? currentUser.region : 'DIRECTION NATIONALE'}
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
      <main className="max-w-7xl mx-auto px-4 lg:px-8 pt-28 pb-24">
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
              {activeTab === 'pulse' && <PulsePerformance data={filteredData} user={currentUser} onLoginClick={() => setShowLogin(true)} isConnected={!!currentUser} branding={branding} />}
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
                  {activeTab === 'recap' && <RecapView data={filteredData} user={currentUser} sites={effectiveSitesList} initialMode="collecte" branding={branding} />}
                  {activeTab === 'recap-dist' && <RecapView data={filteredData} user={currentUser} sites={effectiveSitesList} initialMode="distribution" branding={branding} />}
                  {activeTab === 'distribution-detailed' && <DistributionDetailedSynthesisView data={filteredData} branding={branding} />}
                  {activeTab === 'distribution-stock' && <DistributionStockView data={filteredData} user={currentUser} />}
                  {activeTab === 'stock' && <StockView data={filteredData} user={currentUser} lastSync={lastSync} onSyncRequest={() => handleSync(true, true)} />}
                  {activeTab === 'stock-detailed' && <StockDetailedSynthesisView data={filteredData} branding={branding} />}
                  {activeTab === 'stock-synthesis' && <StockSynthesisView data={filteredData} user={currentUser} />}
                  {activeTab === 'stock-planning' && <StockPlanningView data={filteredData} user={currentUser} sites={effectiveSitesList} />}
                  {activeTab === 'capacity-planning' && <CapacityPlanningView data={filteredData} user={currentUser} sites={effectiveSitesList} />}
                  {activeTab === 'performance' && <PerformanceView data={filteredData} user={currentUser} sites={effectiveSitesList} />}
                  {activeTab === 'administration' && <AdminUserManagement scriptUrl={scriptUrl} onBrandingChange={updateBranding} currentBranding={branding} sites={effectiveSitesList} onSyncRequest={() => handleSync(true, true)} />}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
        onNavigate={setActiveTab}
        sites={effectiveSitesList}
        onSiteSelect={handleSiteSelect}
      />
      <InstallPrompt />
      <nav className="lg:hidden fixed bottom-6 left-4 right-4 z-[100] glass-nav rounded-[2.5rem] p-2 flex justify-between items-center shadow-2xl gap-1">
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
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{group.navItems.length} Options disponibles</p>
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
             <h3 className="text-xl font-black uppercase mb-6">Paramètres des Sources</h3>
             
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
