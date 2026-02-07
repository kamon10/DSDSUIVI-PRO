
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { INITIAL_DATA, DEFAULT_LINK_1, DEFAULT_SCRIPT_URL } from './constants';
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
import { fetchSheetData } from './services/googleSheetService';
import { AppTab, DashboardData } from './types';
import { Activity, LayoutDashboard, RefreshCw, Settings, BarChart3, Calendar, History, FileText, AlertCircle, HeartPulse, LineChart, ArrowLeftRight, Layout, Database, Clock, Layers, Target, UserCheck, PlusSquare, Lock } from 'lucide-react';

const App: React.FC = () => {
  const [data, setData] = useState<DashboardData>(INITIAL_DATA);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('pulse'); 
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'stale'>('synced');
  
  const [sheetInput, setSheetInput] = useState(localStorage.getItem('gsheet_input_1') || DEFAULT_LINK_1);
  const [scriptUrl, setScriptUrl] = useState(localStorage.getItem('gsheet_script_url') || DEFAULT_SCRIPT_URL);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setData(result);
        setLastSync(new Date());
        setSyncStatus('synced');
        localStorage.setItem('gsheet_input_1', currentInput.trim());
      } else {
        setLastSync(new Date());
        setSyncStatus('synced');
      }
      if (!isSilent) setShowSettings(false);
      setError(null);
    } catch (err: any) {
      console.error("Sync Error:", err);
      setSyncStatus('error');
      if (!isSilent) {
        setError(err.message || "Échec de la connexion à la source.");
      }
    } finally {
      setLoading(false);
      isSyncingRef.current = false;
    }
  }, []);

  const saveSettings = () => {
    localStorage.setItem('gsheet_input_1', sheetInput);
    localStorage.setItem('gsheet_script_url', scriptUrl);
    handleSync(false, true);
  };

  useEffect(() => {
    handleSync(false, true);
  }, [handleSync]);

  useEffect(() => {
    const interval = setInterval(() => {
      handleSync(true, false);
    }, 30000); 
    return () => clearInterval(interval);
  }, [handleSync]);

  useEffect(() => {
    const staleCheck = setInterval(() => {
      if (lastSync && (new Date().getTime() - lastSync.getTime() > 300000)) {
        setSyncStatus('stale');
      }
    }, 10000);
    return () => clearInterval(staleCheck);
  }, [lastSync]);

  const navItems = [
    { id: 'pulse', icon: <HeartPulse size={16} />, label: 'Pulse' },
    { id: 'cockpit', icon: <LayoutDashboard size={16} />, label: 'Cockpit' },
    { id: 'entry', icon: <PlusSquare size={16} />, label: 'Saisie' },
    { id: 'site-focus', icon: <UserCheck size={16} />, label: 'Focus' },
    { id: 'weekly', icon: <Layers size={16} />, label: 'Semaine' },
    { id: 'evolution', icon: <LineChart size={16} />, label: 'Évol.' },
    { id: 'comparison', icon: <ArrowLeftRight size={16} />, label: 'Compare' },
    { id: 'recap', icon: <FileText size={16} />, label: 'Récap' },
    { id: 'performance', icon: <BarChart3 size={16} />, label: 'Rang' },
    { id: 'summary', icon: <Layout size={16} />, label: 'Résumé' }
  ];

  const formatLastSync = () => {
    if (!lastSync) return "--:--";
    return lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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
                 <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border ${syncStatus === 'error' ? 'bg-red-500/20 border-red-500/30' : 'bg-green-500/20 border-green-500/30'}`}>
                    <div className={`w-1 h-1 rounded-full ${syncStatus === 'error' ? 'bg-red-400' : 'bg-green-400 animate-pulse'}`}></div>
                    <span className={`text-[6px] font-black uppercase ${syncStatus === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                      {syncStatus === 'syncing' ? 'SYNC...' : syncStatus === 'error' ? 'ERROR' : 'LIVE'}
                    </span>
                 </div>
               </div>
             </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[70%] py-2">
            {navItems.map((tab) => (
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
            <div className="hidden xl:flex flex-col items-end mr-2">
               <span className="text-[7px] font-black text-white/30 uppercase tracking-widest">Dernière vérification</span>
               <div className="flex items-center gap-1 text-[9px] font-bold text-white/60">
                  <Clock size={10} className="text-blue-400" />
                  {formatLastSync()}
               </div>
            </div>
            <button 
              onClick={() => handleSync(false, true)} 
              disabled={syncStatus === 'syncing'} 
              className="p-3 bg-white/10 text-white rounded-xl shadow-md disabled:opacity-50 hover:bg-white/20 transition-all border border-white/10 flex items-center gap-2 group"
            >
              <RefreshCw size={18} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setShowSettings(true)} className="p-3 bg-white/10 rounded-xl border border-white/10 text-white hover:bg-white/20 transition-all">
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      <nav className="lg:hidden fixed bottom-6 left-4 right-4 z-[100]">
        <div className="glass-nav rounded-[2.5rem] px-4 py-3 flex justify-between items-center shadow-2xl border border-white/10 overflow-x-auto no-scrollbar">
           {navItems.map((tab) => (
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
        {loading && !data.dailyHistory.length ? (
          <div className="flex flex-col items-center justify-center py-40 gap-8">
             <div className="relative">
                <div className="absolute inset-0 bg-red-500 blur-[40px] opacity-40 animate-pulse"></div>
                <Activity size={64} className="text-red-600 animate-bounce relative z-10" />
             </div>
             <p className="text-xs font-black text-slate-800 uppercase tracking-[0.5em] animate-pulse">Chargement du Flux...</p>
          </div>
        ) : (
          <div className="page-transition">
            {syncStatus === 'error' && !loading && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between text-red-600 animate-in slide-in-from-top-4">
                 <div className="flex items-center gap-3">
                    <AlertCircle size={20} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Connexion interrompue. Nouvelle tentative en cours...</p>
                 </div>
                 <button onClick={() => handleSync(false, true)} className="px-4 py-2 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase">Réessayer maintenant</button>
              </div>
            )}
            {activeTab === 'summary' && <SummaryView data={data} setActiveTab={setActiveTab} />}
            {activeTab === 'pulse' && <PulsePerformance data={data} />}
            {activeTab === 'cockpit' && <VisualDashboard data={data} setActiveTab={setActiveTab} />}
            {activeTab === 'entry' && <DataEntryForm scriptUrl={scriptUrl} />}
            {activeTab === 'site-focus' && <SiteSynthesisView data={data} />}
            {activeTab === 'weekly' && <WeeklyView data={data} />}
            {activeTab === 'evolution' && <EvolutionView data={data} />}
            {activeTab === 'comparison' && <ComparisonView data={data} />}
            {activeTab === 'recap' && <RecapView data={data} />}
            {activeTab === 'performance' && <PerformanceView data={data} />}
            {activeTab === 'history' && <DetailedHistoryView data={data} />}
          </div>
        )}
      </main>

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
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 mb-2">
                <p className="text-[9px] font-black text-blue-800 uppercase leading-relaxed">
                  L'application synchronise automatiquement les données toutes les 30 secondes pour garantir un cockpit à jour.
                </p>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">URL Google Sheet (CSV)</label>
                <input 
                  value={sheetInput} 
                  onChange={(e) => setSheetInput(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 ring-red-50 outline-none transition-all"
                  placeholder="URL Google Sheet"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">URL Apps Script (Injection)</label>
                   <span className="flex items-center gap-1 text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-widest border border-emerald-100"><Lock size={8}/> Figé</span>
                </div>
                <div className="relative">
                  <input 
                    readOnly
                    value={scriptUrl} 
                    className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-5 py-4 text-[10px] font-bold text-slate-400 outline-none cursor-not-allowed opacity-70"
                    placeholder="URL Script Web App"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                     <Lock size={16} />
                  </div>
                </div>
                <p className="text-[8px] font-bold text-slate-400 mt-2 uppercase">L'URL d'injection a été fixée par l'administrateur.</p>
              </div>
            </div>
            {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase flex items-center gap-3"><AlertCircle size={18}/> {error}</div>}
            <div className="flex gap-4">
              <button onClick={saveSettings} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95">Valider</button>
              <button onClick={() => setShowSettings(false)} className="flex-1 border border-slate-200 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
