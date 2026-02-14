
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { INITIAL_DATA, DEFAULT_LINK_1, DEFAULT_LINK_DISTRIBUTION, DEFAULT_SCRIPT_URL, SITES_DATA } from './constants.tsx';
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
import { fetchSheetData, fetchUsers, fetchBrandingConfig, fetchDynamicSites } from './services/googleSheetService.ts';
import { AppTab, DashboardData, User } from './types.ts';
import { Activity, LayoutDashboard, RefreshCw, Settings, BarChart3, HeartPulse, LineChart, Layout, Database, Clock, Lock, LogOut, ShieldCheck, User as UserIcon, BookOpen, Truck, Map as MapIcon, PlusSquare, UserCheck, FileText, AlertCircle, History, ClipboardList } from 'lucide-react';

const App: React.FC = () => {
  const [fullData, setFullData] = useState<DashboardData>(INITIAL_DATA);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('pulse'); 
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'stale'>('synced');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dynamicSites, setDynamicSites] = useState<any[]>([]);
  
  const [branding, setBranding] = useState(() => {
    const saved = localStorage.getItem('hemo_branding');
    const defaultBranding = { logo: './assets/logo.svg', hashtag: '#DONSANG_CI' };
    if (!saved) return defaultBranding;
    try { return JSON.parse(saved); } catch (e) { return defaultBranding; }
  });

  const updateBranding = (newBranding: {logo: string, hashtag: string}) => {
    setBranding(newBranding);
    localStorage.setItem('hemo_branding', JSON.stringify(newBranding));
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

  const scriptUrl = DEFAULT_SCRIPT_URL;
  const isSyncingRef = useRef(false);
  const sheetInputRef = useRef(sheetInput);
  
  useEffect(() => { sheetInputRef.current = sheetInput; }, [sheetInput]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSync = useCallback(async (isSilent = false, force = false) => {
    if (isSyncingRef.current) return;
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
      const dataResult = await fetchSheetData(currentInput.trim(), force, DEFAULT_LINK_DISTRIBUTION, dynSitesResult || []);
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

  // Rafraîchissement initial
  useEffect(() => { handleSync(false, true); }, [handleSync]);

  // Rafraîchissement automatique toutes les 15 secondes
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      handleSync(true, true);
    }, 15000);
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
      if (filtered.distributions) {
        filtered.distributions = {
          ...filtered.distributions,
          records: filtered.distributions.records.filter(r => r.region.toUpperCase() === regionName.toUpperCase())
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
      if (filtered.distributions) {
        filtered.distributions = {
          ...filtered.distributions,
          records: filtered.distributions.records.filter(r => r.site.toUpperCase() === siteName.toUpperCase())
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
               <img src={branding.logo} alt="Logo" className="w-full h-full object-contain p-1.5" />
             </div>
             <span className="font-black text-lg tracking-tighter uppercase text-slate-900">HS</span>
          </div>
          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto no-scrollbar">
            {visibleNavItems.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as AppTab)} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${activeTab === tab.id || (activeTab === 'recap-dist' && tab.id === 'recap-dist') ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}>
                {tab.icon} <span className="text-[10px] font-black uppercase">{tab.label}</span>
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
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
          <div className="page-transition">
            {activeTab === 'pulse' && <PulsePerformance data={filteredData} user={currentUser} onLoginClick={() => setShowLogin(true)} isConnected={!!currentUser} />}
            {activeTab === 'contact' && <ContactsView sites={effectiveSitesList} />}
            {currentUser && (
              <>
                {activeTab === 'summary' && <SummaryView data={filteredData} user={currentUser} setActiveTab={setActiveTab} />}
                {activeTab === 'cockpit' && <VisualDashboard data={filteredData} setActiveTab={setActiveTab} user={currentUser} sites={effectiveSitesList} />}
                {activeTab === 'map' && <DistributionMapView data={filteredData} user={currentUser} sites={effectiveSitesList} />}
                {activeTab === 'entry' && <DataEntryForm scriptUrl={scriptUrl} data={filteredData} user={currentUser} sites={effectiveSitesList} />}
                {activeTab === 'site-focus' && <SiteSynthesisView data={filteredData} user={currentUser} sites={effectiveSitesList} />}
                {activeTab === 'history' && <DetailedHistoryView data={filteredData} user={currentUser} sites={effectiveSitesList} />}
                {activeTab === 'weekly' && <WeeklyView data={filteredData} user={currentUser} />}
                {activeTab === 'evolution' && <EvolutionView data={filteredData} user={currentUser} />}
                {activeTab === 'recap' && <RecapView data={filteredData} user={currentUser} sites={effectiveSitesList} initialMode="collecte" />}
                {activeTab === 'recap-dist' && <RecapView data={filteredData} user={currentUser} sites={effectiveSitesList} initialMode="distribution" />}
                {activeTab === 'performance' && <PerformanceView data={filteredData} user={currentUser} sites={effectiveSitesList} />}
                {activeTab === 'administration' && <AdminUserManagement scriptUrl={scriptUrl} onBrandingChange={updateBranding} currentBranding={branding} sites={effectiveSitesList} onSyncRequest={() => handleSync(true, true)} />}
              </>
            )}
          </div>
        )}
      </main>
      <nav className="lg:hidden fixed bottom-6 left-4 right-4 z-[100] glass-nav rounded-3xl p-2 flex justify-between items-center shadow-2xl overflow-x-auto no-scrollbar gap-2">
           {visibleNavItems.map((tab) => (
             <button key={tab.id} onClick={() => setActiveTab(tab.id as AppTab)} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl shrink-0 min-w-[60px] ${activeTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>
               {tab.icon} <span className="text-[8px] font-black uppercase">{tab.label}</span>
             </button>
           ))}
      </nav>
      {showSettings && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-8 max-w-lg w-full shadow-3xl">
             <h3 className="text-xl font-black uppercase mb-6">Source Core-DB</h3>
             <input value={sheetInput} onChange={(e) => setSheetInput(e.target.value)} className="w-full bg-slate-50 border rounded-2xl px-6 py-4 text-xs font-bold mb-8 outline-none" />
             <div className="flex gap-4">
               <button onClick={() => setShowSettings(false)} className="flex-1 py-4 bg-slate-100 rounded-xl font-black text-[10px] uppercase">Annuler</button>
               <button onClick={() => { localStorage.setItem('gsheet_input_1', sheetInput.trim()); setShowSettings(false); handleSync(false, true); }} className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase">Valider</button>
             </div>
          </div>
        </div>
      )}
      {showLogin && <LoginView onClose={() => setShowLogin(false)} onLogin={setCurrentUser} scriptUrl={scriptUrl} sheetUrl={sheetInput} sites={effectiveSitesList} />}
    </div>
  );
};

export default App;
