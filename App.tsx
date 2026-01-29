
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { INITIAL_DATA, DEFAULT_LINK_1 } from './constants';
import { VisualDashboard } from './components/VisualDashboard';
import { PerformanceView } from './components/PerformanceView';
import { DailyView } from './components/DailyView';
import { DetailedHistoryView } from './components/DetailedHistoryView';
import { RecapView } from './components/RecapView';
import { PulsePerformance } from './components/PulsePerformance';
import { EvolutionView } from './components/EvolutionView';
import { ComparisonView } from './components/ComparisonView';
import { SiteObjectivesView } from './components/SiteObjectivesView';
import { SummaryView } from './components/SummaryView';
import { fetchSheetData } from './services/googleSheetService';
import { AppTab, DashboardData } from './types';
import { Activity, LayoutDashboard, RefreshCw, Settings, BarChart3, Calendar, History, FileText, AlertCircle, HeartPulse, LineChart, ArrowLeftRight, Layout, Database } from 'lucide-react';

const App: React.FC = () => {
  const [data, setData] = useState<DashboardData>(INITIAL_DATA);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('pulse'); 
  
  const [sheetInput, setSheetInput] = useState(localStorage.getItem('gsheet_input_1') || DEFAULT_LINK_1);
  const [scriptUrl, setScriptUrl] = useState(localStorage.getItem('gsheet_script_url') || "");
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sheetInputRef = useRef(sheetInput);
  useEffect(() => {
    sheetInputRef.current = sheetInput;
  }, [sheetInput]);

  const handleSync = useCallback(async (isSilent = false) => {
    const currentInput = sheetInputRef.current;
    if (!currentInput) return;
    
    if (!isSilent) setLoading(true);
    const refreshIconNode = document.getElementById('sync-icon');
    if (refreshIconNode) refreshIconNode.classList.add('animate-spin');

    try {
      const result = await fetchSheetData(currentInput.trim());
      setData(result);
      localStorage.setItem('gsheet_input_1', currentInput.trim());
      if (!isSilent) setShowSettings(false);
      setError(null);
    } catch (err: any) {
      console.error(err);
      if (!isSilent) setError(err.message || "Échec de la connexion à la source.");
    } finally {
      if (!isSilent) setLoading(false);
      if (refreshIconNode) refreshIconNode.classList.remove('animate-spin');
    }
  }, []);

  useEffect(() => {
    handleSync();
  }, [handleSync]);

  useEffect(() => {
    const interval = setInterval(() => {
      handleSync(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [handleSync]);

  const saveConfig = () => {
    localStorage.setItem('gsheet_script_url', scriptUrl.trim());
    handleSync();
  };

  const navItems = [
    { id: 'pulse', icon: <HeartPulse size={16} />, label: 'Pulse' },
    { id: 'daily', icon: <Calendar size={16} />, label: 'Jour' },
    { id: 'evolution', icon: <LineChart size={16} />, label: 'Évol.' },
    { id: 'comparison', icon: <ArrowLeftRight size={16} />, label: 'Compare' },
    { id: 'recap', icon: <FileText size={16} />, label: 'Récap' },
    { id: 'dashboard', icon: <LayoutDashboard size={16} />, label: 'Stats' },
    { id: 'performance', icon: <BarChart3 size={16} />, label: 'Rang' },
    { id: 'summary', icon: <Layout size={16} />, label: 'Résumé' }
  ];

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
                 <div className="flex items-center gap-1 bg-green-500/20 px-1.5 py-0.5 rounded-full border border-green-500/30">
                    <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-[6px] text-green-400 font-black uppercase">LIVE</span>
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
            <button 
              onClick={() => handleSync(false)} 
              disabled={loading} 
              className="p-3 bg-white/10 text-white rounded-xl shadow-md disabled:opacity-50 hover:bg-white/20 transition-all border border-white/10 flex items-center gap-2 group"
            >
              <RefreshCw id="sync-icon" size={18} className={loading ? 'animate-spin' : ''} />
              <span className="hidden lg:block text-[8px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Sync</span>
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
             <p className="text-xs font-black text-slate-800 uppercase tracking-[0.5em] animate-pulse">Initialisation du Flux National...</p>
          </div>
        ) : (
          <div className="page-transition">
            {activeTab === 'summary' && <SummaryView data={data} setActiveTab={setActiveTab} />}
            {activeTab === 'pulse' && <PulsePerformance data={data} />}
            {activeTab === 'dashboard' && <VisualDashboard data={data} />}
            {activeTab === 'daily' && <DailyView data={data} />}
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
               <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Source de Données</h3>
            </div>
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 mb-2">
                <p className="text-[9px] font-black text-blue-800 uppercase leading-relaxed">
                  L'application supporte désormais les sources <b>SQL Server</b> via une API REST. Collez simplement l'URL de votre endpoint JSON ci-dessous.
                </p>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Endpoint (CSV ou JSON API)</label>
                <input 
                  value={sheetInput} 
                  onChange={(e) => setSheetInput(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 ring-red-50 outline-none transition-all"
                  placeholder="URL Google Sheet ou API SQL"
                />
              </div>
            </div>
            {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase flex items-center gap-3"><AlertCircle size={18}/> {error}</div>}
            <div className="flex gap-4">
              <button onClick={saveConfig} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95">Sauvegarder</button>
              <button onClick={() => setShowSettings(false)} className="flex-1 border border-slate-200 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
