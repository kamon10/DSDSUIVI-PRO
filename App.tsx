
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { INITIAL_DATA, DEFAULT_LINK_1, DEFAULT_LINK_DISTRIBUTION, DEFAULT_SCRIPT_URL, SITES_DATA } from './constants';
import { VisualDashboard } from './components/VisualDashboard';
import { PerformanceView } from './components/PerformanceView';
import { DetailedHistoryView } from './components/DetailedHistoryView';
import { RecapView } from './components/RecapView';
import { PulsePerformance } from './components/PulsePerformance';
import { EvolutionView } from './components/EvolutionView';
import { ComparisonView } from './components/ComparisonView';
import { SummaryView } from './components/SummaryView';
import { WeeklyView } from './components/WeeklyView';
import { SiteSynthesisView } from './components/SiteSynthesisView';
import { DataEntryForm } from './components/DataEntryForm';
import { ContactsView } from './components/ContactsView';
import { DistributionView } from './components/DistributionView';
import { LoginView } from './components/LoginView';
import { AdminUserManagement } from './components/AdminUserManagement';
import { fetchSheetData, fetchUsers, fetchBrandingConfig } from './services/googleSheetService';
import { AppTab, DashboardData, User } from './types';
import { Activity, LayoutDashboard, RefreshCw, Settings, BarChart3, Calendar, History, FileText, AlertCircle, HeartPulse, LineChart, ArrowLeftRight, Layout, Database, Clock, Layers, Target, UserCheck, PlusSquare, Lock, LogOut, ShieldCheck, User as UserIcon, BookOpen, Truck } from 'lucide-react';

const App: React.FC = () => {
  const [fullData, setFullData] = useState<DashboardData>(INITIAL_DATA);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('pulse'); 
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'stale'>('synced');
  
  // --- BRANDING DYNAMIQUE ---
  const [branding, setBranding] = useState(() => {
    const saved = localStorage.getItem('hemo_branding');
    const defaultBranding = {
      logo: './assets/logo.svg',
      hashtag: '#DONSANG_CI'
    };
    if (!saved) return defaultBranding;
    return JSON.parse(saved);
  });

  const updateBranding = (newBranding: {logo: string, hashtag: string}) => {
    setBranding(newBranding);
    localStorage.setItem('hemo_branding', JSON.stringify(newBranding));
  };

  const [sheetInput, setSheetInput] = useState(localStorage.getItem('gsheet_input_1') || DEFAULT_LINK_1);
  const [distSheetInput] = useState(DEFAULT_LINK_DISTRIBUTION); 
  const [showSettings, setShowSettings] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(JSON.parse(localStorage.getItem('dsd_user') || 'null'));
  const [error, setError] = useState<string | null>(null);

  const scriptUrl = DEFAULT_SCRIPT_URL;
  const isSyncingRef = useRef(false);
  const sheetInputRef = useRef(sheetInput);
  const distInputRef = useRef(distSheetInput);
  
  useEffect(() => {
    sheetInputRef.current = sheetInput;
    distInputRef.current = distSheetInput;
  }, [sheetInput, distSheetInput]);

  const handleSync = useCallback(async (isSilent = false, force = false) => {
    if (isSyncingRef.current) return;
    const currentInput = sheetInputRef.current;
    const currentDistInput = distInputRef.current;
    const currentScript = DEFAULT_SCRIPT_URL;
    
    isSyncingRef.current = true;
    if (!isSilent) setLoading(true);
    setSyncStatus('syncing');

    try {
      // Synchronisation parallèle des données et du branding centralisé
      const [dataResult, brandingResult] = await Promise.all([
        fetchSheetData(currentInput.trim(), force, currentDistInput.trim()),
        fetchBrandingConfig(currentScript)
      ]);

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
      if (!isSilent) setError(err.message || "Échec de la connexion.");
    } finally {
      setLoading(false);
      isSyncingRef.current = false;
    }
  }, []);

  useEffect(() => { handleSync(false, true); }, [handleSync]);

  const saveSettings = () => {
    localStorage.setItem('gsheet_input_1', sheetInput.trim());
    setShowSettings(false);
    handleSync(false, true);
  };

  const filteredData = useMemo(() => {
    if (!currentUser || currentUser.role === 'ADMIN' || currentUser.role === 'SUPERADMIN') {
      return fullData;
    }

    const filtered = { ...fullData };

    if (currentUser.role === 'PRES') {
      const regionName = currentUser.region || "";
      if (regionName.toUpperCase() !== "TOUS LES PRES") {
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
      }
    } else if (currentUser.role === 'AGENT') {
      const siteName = currentUser.site || "";
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
    }

    const mRealized = filtered.regions.reduce((acc, r) => acc + r.sites.reduce((sAcc, s) => sAcc + s.totalMois, 0), 0);
    const mObj = filtered.regions.reduce((acc, r) => acc + r.sites.reduce((sAcc, s) => sAcc + s.objMensuel, 0), 0);
    
    filtered.monthly = {
      realized: mRealized,
      objective: mObj || 1,
      percentage: mObj > 0 ? (mRealized / mObj) * 100 : 0,
      fixed: filtered.regions.reduce((acc, r) => acc + r.sites.reduce((sAcc, s) => sAcc + (s.monthlyFixed || 0), 0), 0),
      mobile: filtered.regions.reduce((acc, r) => acc + r.sites.reduce((sAcc, s) => sAcc + (s.monthlyMobile || 0), 0), 0),
    };

    return filtered;
  }, [fullData, currentUser]);

  const navItems = [
    { id: 'pulse', icon: <HeartPulse size={14} />, label: 'Pulse', public: true },
    { id: 'summary', icon: <Layout size={14} />, label: 'Résumé', public: false },
    { id: 'cockpit', icon: <LayoutDashboard size={14} />, label: 'Cockpit', public: false },
    { id: 'entry', icon: <PlusSquare size={14} />, label: 'Saisie', public: false },
    { id: 'hemo-stats', icon: <Truck size={14} />, label: 'HEMO-STATS', public: false },
    { id: 'site-focus', icon: <UserCheck size={14} />, label: 'Focus', public: false },
    { id: 'weekly', icon: <Layers size={14} />, label: 'Semaine', public: false },
    { id: 'evolution', icon: <LineChart size={14} />, label: 'Évol.', public: false },
    { id: 'comparison', icon: <ArrowLeftRight size={14} />, label: 'Compare', public: false },
    { id: 'recap', icon: <FileText size={14} />, label: 'Récap', public: false },
    { id: 'performance', icon: <BarChart3 size={14} />, label: 'Rang', public: false },
    { id: 'contact', icon: <BookOpen size={14} />, label: 'Contact', public: true },
    { id: 'administration', icon: <ShieldCheck size={14} />, label: 'Admin', public: false, superOnly: true }
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

  return (
    <div className="min-h-screen pb-24 lg:pb-0 selection:bg-blue-100">
      <header className="fixed top-0 left-0 right-0 z-[100] px-4 py-3 lg:px-8 lg:py-6">
        <div className="max-w-7xl mx-auto glass-nav rounded-[3.5rem] px-8 py-6 flex flex-col lg:flex-row items-center justify-between shadow-2xl min-h-[7rem] gap-4">
          <div className="flex items-center gap-5 shrink-0">
             <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-xl pulse-glow cursor-pointer transition-transform hover:scale-110 active:scale-95 border border-slate-100 overflow-hidden" onClick={() => setActiveTab('pulse')}>
               <img src={branding.logo} alt="HEMO-STATS Logo" className="w-full h-full object-contain p-1" />
             </div>
             <div className="flex flex-col justify-center">
               <span className="font-black text-2xl tracking-tighter leading-none uppercase text-slate-900">HEMO-STATS</span>
               <div className="flex items-start gap-2 mt-1">
                 <div className="flex flex-col max-w-[45px] leading-[1.1] pt-0.5">
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest break-words leading-[1.2]">
                      {branding.hashtag.replace('_', ' ')}
                    </span>
                 </div>
                 {currentUser && (
                   <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 ml-1">
                      <span className="text-[6px] font-black uppercase text-white tracking-tighter">{currentUser.role}</span>
                   </div>
                 )}
               </div>
             </div>
          </div>

          <nav className="hidden lg:grid grid-cols-7 gap-x-1 gap-y-2 mx-8 flex-1 justify-items-center">
            {visibleNavItems.map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AppTab)} 
                className={`group flex items-center gap-2 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all relative overflow-hidden whitespace-nowrap w-full justify-center ${
                  activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-900 bg-slate-50/50'
                }`}
              >
                {activeTab === tab.id && (
                  <div className="absolute inset-0 bg-slate-900 -z-10 animate-in fade-in zoom-in duration-500"></div>
                )}
                <span className={`${activeTab === tab.id ? 'scale-110 text-white' : 'group-hover:scale-110'} transition-transform`}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4 shrink-0">
            {currentUser ? (
              <div className="flex items-center gap-4">
                <div className="hidden xl:flex flex-col items-end">
                   <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest leading-none mb-1">{currentUser.nom}</span>
                   <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">{currentUser.site || currentUser.region || 'National'}</span>
                </div>
                <button onClick={handleLogout} className="p-3 bg-slate-100 rounded-2xl text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all border border-slate-200" title="Déconnexion">
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button onClick={() => setShowLogin(true)} className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl flex items-center gap-2.5">
                <UserIcon size={14} /> Connexion
              </button>
            )}
            <button onClick={() => setShowSettings(true)} className="p-3 bg-slate-100 rounded-2xl border border-slate-200 text-slate-600 hover:bg-white transition-all shadow-sm">
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      <nav className="lg:hidden fixed bottom-6 left-4 right-4 z-[100]">
        <div className="glass-nav rounded-[2.5rem] px-5 py-4 flex justify-between items-center shadow-2xl border border-slate-100 overflow-x-auto no-scrollbar gap-2">
           {visibleNavItems.map((tab) => (
             <button 
               key={tab.id}
               onClick={() => setActiveTab(tab.id as AppTab)}
               className={`flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-[1.5rem] transition-all shrink-0 ${
                 activeTab === tab.id ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400'
               }`}
             >
               {tab.icon}
               <span className="text-[8px] font-black uppercase tracking-tighter">{tab.label}</span>
             </button>
           ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 pt-48 lg:pt-64 pb-24">
        {loading && !fullData.dailyHistory.length ? (
          <div className="flex flex-col items-center justify-center py-48 gap-10">
             <div className="relative">
                <div className="absolute inset-0 bg-blue-500 blur-[50px] opacity-20 animate-pulse"></div>
                <Activity size={72} className="text-blue-600 animate-bounce relative z-10" />
             </div>
             <p className="text-[11px] font-black text-slate-900 uppercase tracking-[0.6em] animate-pulse">Synchronisation Vitale...</p>
          </div>
        ) : (
          <div className="page-transition">
            {activeTab === 'pulse' && <PulsePerformance data={filteredData} onLoginClick={() => setShowLogin(true)} isConnected={!!currentUser} />}
            {activeTab === 'contact' && <ContactsView />}
            
            {currentUser && (
              <>
                {activeTab === 'summary' && <SummaryView data={filteredData} setActiveTab={setActiveTab} />}
                {activeTab === 'cockpit' && <VisualDashboard data={filteredData} setActiveTab={setActiveTab} user={currentUser} />}
                {activeTab === 'entry' && <DataEntryForm scriptUrl={scriptUrl} data={fullData} />}
                {activeTab === 'hemo-stats' && <DistributionView data={filteredData} />}
                {activeTab === 'site-focus' && <SiteSynthesisView data={filteredData} user={currentUser} />}
                {activeTab === 'weekly' && <WeeklyView data={filteredData} />}
                {activeTab === 'evolution' && <EvolutionView data={filteredData} />}
                {activeTab === 'comparison' && <ComparisonView data={filteredData} />}
                {activeTab === 'recap' && <RecapView data={filteredData} />}
                {activeTab === 'performance' && <PerformanceView data={filteredData} />}
                {activeTab === 'administration' && <AdminUserManagement scriptUrl={scriptUrl} onBrandingChange={updateBranding} currentBranding={branding} />}
              </>
            )}

            {!currentUser && activeTab !== 'pulse' && activeTab !== 'contact' && (
              <div className="py-48 flex flex-col items-center gap-8 text-center glass-card rounded-[4rem] max-w-2xl mx-auto">
                <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400">
                  <Lock size={40} />
                </div>
                <div>
                  <h2 className="text-3xl font-black uppercase text-slate-900 tracking-tighter mb-3">Accès Restreint</h2>
                  <p className="text-slate-500 text-sm max-w-sm font-medium leading-relaxed">Cette section est réservée aux agents habilités du CNTS CI. Veuillez vous connecter pour accéder au cockpit complet.</p>
                </div>
                <button onClick={() => setShowLogin(true)} className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:bg-black transition-all active:scale-95">Se connecter maintenant</button>
              </div>
            )}
          </div>
        )}
      </main>

      {showSettings && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[4rem] p-12 lg:p-16 max-w-xl w-full shadow-3xl border border-slate-100 animate-in zoom-in-95 duration-500">
             <div className="flex items-center gap-6 mb-12">
               <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-800 shadow-inner"><Settings size={32} /></div>
               <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Architecture</h3>
             </div>
             <div className="space-y-10">
               <div className="space-y-4">
                 <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Source Core-Database</label>
                 <input 
                   value={sheetInput} 
                   onChange={(e) => setSheetInput(e.target.value)}
                   className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-8 py-5 text-sm font-bold text-slate-600 outline-none focus:ring-4 ring-blue-50 transition-all"
                 />
               </div>
               <div className="p-8 bg-blue-50 border border-blue-100 rounded-[2.5rem] flex items-start gap-6">
                  <Database size={24} className="text-blue-600 shrink-0 mt-1" />
                  <p className="text-[11px] font-bold text-blue-800 leading-relaxed uppercase tracking-tight">
                    Le flux de distribution (HEMO-STATS) est synchronisé sur le canal national prioritaire pour préserver l'intégrité de la supply chain sanguine.
                  </p>
               </div>
               <div className="flex gap-4 pt-4">
                 <button onClick={() => setShowSettings(false)} className="flex-1 px-8 py-6 border border-slate-200 text-slate-500 rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all">Annuler</button>
                 <button onClick={saveSettings} className="flex-1 px-8 py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-2xl active:scale-95">Valider</button>
               </div>
             </div>
          </div>
        </div>
      )}

      {showLogin && <LoginView onClose={() => setShowLogin(false)} onLogin={setCurrentUser} scriptUrl={scriptUrl} sheetUrl={sheetInput} />}

      {error && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[200] px-10 py-5 bg-rose-600 text-white rounded-3xl shadow-3xl flex items-center gap-5 animate-in slide-in-from-bottom-12 transition-all">
           <AlertCircle size={24} />
           <p className="text-xs font-black uppercase tracking-widest leading-none">{error}</p>
           <button onClick={() => setError(null)} className="ml-6 opacity-60 hover:opacity-100 text-xl font-bold">×</button>
        </div>
      )}
    </div>
  );
};

export default App;
