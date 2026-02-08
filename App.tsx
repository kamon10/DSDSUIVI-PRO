import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { INITIAL_DATA, DEFAULT_LINK_1, DEFAULT_SCRIPT_URL, SITES_DATA } from './constants';
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
import { LoginView } from './components/LoginView';
import { AdminUserManagement } from './components/AdminUserManagement';
import { fetchSheetData, fetchUsers } from './services/googleSheetService';
import { AppTab, DashboardData, User } from './types';
import { Activity, LayoutDashboard, RefreshCw, Settings, BarChart3, Calendar, History, FileText, AlertCircle, HeartPulse, LineChart, ArrowLeftRight, Layout, Database, Clock, Layers, Target, UserCheck, PlusSquare, Lock, LogOut, ShieldCheck, User as UserIcon } from 'lucide-react';

const App: React.FC = () => {
  const [fullData, setFullData] = useState<DashboardData>(INITIAL_DATA);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('pulse'); 
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'stale'>('synced');
  
  const [sheetInput, setSheetInput] = useState(localStorage.getItem('gsheet_input_1') || DEFAULT_LINK_1);
  const [showSettings, setShowSettings] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(JSON.parse(localStorage.getItem('dsd_user') || 'null'));
  const [error, setError] = useState<string | null>(null);

  const scriptUrl = DEFAULT_SCRIPT_URL;
  const isSyncingRef = useRef(false);
  const sheetInputRef = useRef(sheetInput);
  
  useEffect(() => {
    sheetInputRef.current = sheetInput;
  }, [sheetInput]);

  const handleSync = useCallback(async (isSilent = false, force = false) => {
    if (isSyncingRef.current) return;
    const currentInput = sheetInputRef.current;
    if (!currentInput) return;
    
    isSyncingRef.current = true;
    if (!isSilent) setLoading(true);
    setSyncStatus('syncing');

    try {
      const result = await fetchSheetData(currentInput.trim(), force);
      if (result) {
        setFullData(result);
        setLastSync(new Date());
        setSyncStatus('synced');
        localStorage.setItem('gsheet_input_1', currentInput.trim());
      } else {
        setLastSync(new Date());
        setSyncStatus('synced');
      }
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
      // Si regionName est 'TOUS LES PRES', on ne filtre rien (vision nationale)
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
    { id: 'pulse', icon: <HeartPulse size={16} />, label: 'Pulse', public: true },
    { id: 'cockpit', icon: <LayoutDashboard size={16} />, label: 'Cockpit', public: false },
    { id: 'entry', icon: <PlusSquare size={16} />, label: 'Saisie', public: false },
    { id: 'site-focus', icon: <UserCheck size={16} />, label: 'Focus', public: false },
    { id: 'weekly', icon: <Layers size={16} />, label: 'Semaine', public: false },
    { id: 'evolution', icon: <LineChart size={16} />, label: 'Évol.', public: false },
    { id: 'comparison', icon: <ArrowLeftRight size={16} />, label: 'Compare', public: false },
    { id: 'recap', icon: <FileText size={16} />, label: 'Récap', public: false },
    { id: 'performance', icon: <BarChart3 size={16} />, label: 'Rang', public: false },
    { id: 'summary', icon: <Layout size={16} />, label: 'Résumé', public: false },
    { id: 'administration', icon: <ShieldCheck size={16} />, label: 'Admin', public: false, superOnly: true }
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
    <div className="min-h-screen pb-24 lg:pb-0 selection:bg-red-200">
      <header className="fixed top-0 left-0 right-0 z-[100] px-4 py-3 lg:px-8 lg:py-4">
        <div className="max-w-7xl mx-auto glass-nav rounded-[2rem] px-6 h-16 lg:h-20 flex items-center justify-between shadow-2xl border border-white/10">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg pulse-glow cursor-pointer" onClick={() => setActiveTab('pulse')}>
               <Activity size={22}/>
             </div>
             <div className="flex flex-col">
               <span className="font-black text-xl tracking-tighter leading-none uppercase text-white">DSDSUIVI</span>
               <div className="flex items-center gap-2 mt-1">
                 <span className="text-[8px] text-orange-400 font-black uppercase tracking-[0.3em] leading-none">Cockpit National CI</span>
                 {currentUser && (
                   <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30">
                      <span className="text-[6px] font-black uppercase text-blue-400">{currentUser.role}</span>
                   </div>
                 )}
               </div>
             </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[60%] py-2">
            {visibleNavItems.map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AppTab)} 
                className={`group flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative overflow-hidden whitespace-nowrap ${
                  activeTab === tab.id ? 'text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {activeTab === tab.id && (
                  <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-500 opacity-90 -z-10 animate-in fade-in zoom-in duration-300"></div>
                )}
                <span className={`${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110'} transition-transform`}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="hidden xl:flex flex-col items-end">
                   <span className="text-[8px] font-black text-white/50 uppercase tracking-widest">{currentUser.nom}</span>
                   <span className="text-[7px] font-bold text-white/30 uppercase">{currentUser.site || currentUser.region || 'National'}</span>
                </div>
                <button onClick={handleLogout} className="p-3 bg-white/10 rounded-xl text-white hover:bg-red-500/20 transition-all border border-white/10" title="Déconnexion">
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button onClick={() => setShowLogin(true)} className="px-6 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg flex items-center gap-2">
                <UserIcon size={14} /> Connexion
              </button>
            )}
            <button onClick={() => setShowSettings(true)} className="p-3 bg-white/10 rounded-xl border border-white/10 text-white hover:bg-white/20 transition-all">
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      <nav className="lg:hidden fixed bottom-6 left-4 right-4 z-[100]">
        <div className="glass-nav rounded-[2.5rem] px-4 py-3 flex justify-between items-center shadow-2xl border border-white/10 overflow-x-auto no-scrollbar">
           {visibleNavItems.map((tab) => (
             <button 
               key={tab.id}
               onClick={() => setActiveTab(tab.id as AppTab)}
               className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all shrink-0 ${
                 activeTab === tab.id ? 'bg-gradient-to-br from-red-600 to-orange-500 text-white shadow-lg' : 'text-slate-400'
               }`}
             >
               {tab.icon}
               <span className="text-[7px] font-black uppercase tracking-tighter">{tab.label}</span>
             </button>
           ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 lg:px-6 pt-28 lg:pt-36 pb-24">
        {loading && !fullData.dailyHistory.length ? (
          <div className="flex flex-col items-center justify-center py-40 gap-8">
             <div className="relative">
                <div className="absolute inset-0 bg-red-500 blur-[40px] opacity-40 animate-pulse"></div>
                <Activity size={64} className="text-red-600 animate-bounce relative z-10" />
             </div>
             <p className="text-xs font-black text-slate-800 uppercase tracking-[0.5em] animate-pulse">Chargement...</p>
          </div>
        ) : (
          <div className="page-transition">
            {activeTab === 'pulse' && <PulsePerformance data={filteredData} onLoginClick={() => setShowLogin(true)} isConnected={!!currentUser} />}
            
            {currentUser && (
              <>
                {activeTab === 'summary' && <SummaryView data={filteredData} setActiveTab={setActiveTab} />}
                {activeTab === 'cockpit' && <VisualDashboard data={filteredData} setActiveTab={setActiveTab} />}
                {activeTab === 'entry' && <DataEntryForm scriptUrl={scriptUrl} data={filteredData} />}
                {activeTab === 'site-focus' && <SiteSynthesisView data={filteredData} />}
                {activeTab === 'weekly' && <WeeklyView data={filteredData} />}
                {activeTab === 'evolution' && <EvolutionView data={filteredData} />}
                {activeTab === 'comparison' && <ComparisonView data={filteredData} />}
                {activeTab === 'recap' && <RecapView data={filteredData} />}
                {activeTab === 'performance' && <PerformanceView data={filteredData} />}
                {activeTab === 'history' && <DetailedHistoryView data={filteredData} />}
                {activeTab === 'administration' && <AdminUserManagement scriptUrl={scriptUrl} />}
              </>
            )}

            {!currentUser && activeTab !== 'pulse' && (
              <div className="py-40 flex flex-col items-center gap-6 text-center">
                <Lock size={64} className="text-slate-200" />
                <h2 className="text-2xl font-black uppercase text-slate-800">Accès Restreint</h2>
                <p className="text-slate-500 text-sm max-w-sm font-medium">Cette section est réservée aux agents habilités du CNTS CI. Veuillez vous connecter pour accéder au cockpit.</p>
                <button onClick={() => setShowLogin(true)} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest">Se connecter maintenant</button>
              </div>
            )}
          </div>
        )}
      </main>

      {showLogin && <LoginView onClose={() => setShowLogin(false)} onLogin={setCurrentUser} scriptUrl={scriptUrl} sheetUrl={sheetInput} />}

      {showSettings && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-8 lg:p-12 max-w-md w-full shadow-2xl border border-slate-100 space-y-8 animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center">
                  <Database size={24} />
               </div>
               <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Configuration</h3>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">URL Google Sheet (CSV)</label>
                <input 
                  value={sheetInput} 
                  onChange={(e) => setSheetInput(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 ring-red-50 outline-none transition-all"
                />
              </div>
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Système d'Injection</p>
                <p className="text-[10px] font-bold text-blue-800 uppercase leading-relaxed">URL Apps Script configurée et sécurisée par la direction.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={saveSettings} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl">Valider</button>
              <button onClick={() => setShowSettings(false)} className="flex-1 border border-slate-200 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
