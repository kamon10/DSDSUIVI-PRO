
import React, { useState, useEffect } from 'react';
import { INITIAL_DATA } from './constants';
import { VisualDashboard } from './components/VisualDashboard';
import { PerformanceView } from './components/PerformanceView';
import { SynthesisView } from './components/SynthesisView';
import { WeeklyView } from './components/WeeklyView';
import { DailyView } from './components/DailyView';
import { DataEntryForm } from './components/DataEntryForm';
import { fetchSheetData, fetchDirectoryData } from './services/googleSheetService';
import { AppTab, DashboardData } from './types';
import { Activity, LayoutDashboard, RefreshCw, Settings, Wifi, BarChart3, ClipboardList, Calendar, PlusCircle, Server, AlertTriangle, Layers, Database } from 'lucide-react';

const DEFAULT_LINK_1 = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSouyEoRMmp2bAoGgMOtPvN4UfjUetBXnvQBVjPdfcvLfVl2dUNe185DbR2usGyK4UO38p2sb8lBkKN/pub?gid=508129500&single=true&output=csv";

const App: React.FC = () => {
  const [data, setData] = useState<DashboardData>(INITIAL_DATA);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('daily');
  
  const [sheetInput1, setSheetInput1] = useState(localStorage.getItem('gsheet_input_1') || DEFAULT_LINK_1);
  const [sheetInput2, setSheetInput2] = useState(localStorage.getItem('gsheet_input_2') || "");
  
  const [scriptUrl, setScriptUrl] = useState(localStorage.getItem('gsheet_script_url') || "");
  const [showSettings, setShowSettings] = useState(!localStorage.getItem('gsheet_input_1'));
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(localStorage.getItem('last_sync'));

  useEffect(() => {
    handleSync();
  }, []);

  const handleSync = async () => {
    setLoading(true);
    setError(null);
    try {
      const [activityData] = await Promise.all([
        fetchSheetData(sheetInput1.trim()),
        sheetInput2.trim() !== "" ? fetchDirectoryData(sheetInput2.trim()) : Promise.resolve(null)
      ]);
      
      if (!activityData.dailyHistory || activityData.dailyHistory.length === 0) {
        throw new Error("Source principale : Aucune donnée d'activité trouvée.");
      }

      setData(activityData as DashboardData);
      
      const now = new Date().toLocaleTimeString('fr-FR');
      setLastSync(now);
      
      saveSettings();
      setShowSettings(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Échec de la synchronisation.");
      setShowSettings(true);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = () => {
    localStorage.setItem('gsheet_input_1', sheetInput1.trim());
    localStorage.setItem('gsheet_input_2', sheetInput2.trim());
    localStorage.setItem('gsheet_script_url', scriptUrl.trim());
    if (lastSync) localStorage.setItem('last_sync', lastSync);
  };

  const handleCloseSettings = () => {
    saveSettings();
    setShowSettings(false);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-24 font-sans selection:bg-red-100 selection:text-red-900">
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 flex h-24 items-center justify-between gap-8">
          <div className="flex items-center gap-5 shrink-0">
             <div className="w-12 h-12 bg-red-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl shadow-red-200 transform hover:rotate-6 transition-transform">
               <Activity size={28}/>
             </div>
             <div className="hidden sm:block">
               <span className="font-black text-2xl tracking-tighter block leading-none">DSDSUIVI PRO</span>
               <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-2 block">CNTS Côte d'Ivoire</span>
             </div>
          </div>

          <nav className="hidden lg:flex items-center bg-slate-100/60 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
            {[
              { id: 'daily', icon: <Calendar size={14} />, label: 'Prélèvements' },
              { id: 'weekly', icon: <Layers size={14} />, label: 'Hebdo' },
              { id: 'entry', icon: <PlusCircle size={14} />, label: 'Saisie' },
              { id: 'dashboard', icon: <LayoutDashboard size={14} />, label: 'Stats' },
              { id: 'synthesis', icon: <ClipboardList size={14} />, label: 'Synthèse' },
              { id: 'performance', icon: <BarChart3 size={14} />, label: 'Rang' }
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AppTab)} 
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider tab-transition ${
                  activeTab === tab.id 
                  ? 'bg-white text-red-600 shadow-lg scale-105' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <button 
              onClick={handleSync} 
              disabled={loading} 
              className="hidden md:flex items-center gap-3 px-6 py-4 rounded-[1.5rem] bg-slate-900 text-white shadow-xl hover:bg-slate-800 transition-all disabled:opacity-50 group hover:-translate-y-0.5"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest leading-none">Actualiser</p>
                <p className="text-[9px] font-bold opacity-40 mt-1 uppercase">{lastSync || 'En attente'}</p>
              </div>
            </button>
            <button 
              onClick={() => setShowSettings(true)} 
              className={`p-4 rounded-[1.25rem] transition-all border ${
                scriptUrl === "" ? 'border-amber-400 bg-amber-50 text-amber-600 animate-pulse' : 'border-slate-200 hover:bg-slate-50 text-slate-400'
              }`}
            >
              <Settings size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE NAV BAR (BOTTOM) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-slate-200 z-[60] px-6 py-4 flex justify-around items-center shadow-2xl">
         {[
           { id: 'daily', icon: <Calendar size={22} /> },
           { id: 'entry', icon: <PlusCircle size={22} /> },
           { id: 'dashboard', icon: <LayoutDashboard size={22} /> },
           { id: 'performance', icon: <BarChart3 size={22} /> }
         ].map((tab) => (
           <button 
             key={tab.id}
             onClick={() => setActiveTab(tab.id as AppTab)}
             className={`p-3 rounded-2xl transition-all ${activeTab === tab.id ? 'bg-red-600 text-white shadow-lg shadow-red-200 -translate-y-2' : 'text-slate-400'}`}
           >
             {tab.icon}
           </button>
         ))}
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-16">
        {loading && !data.dailyHistory.length ? (
          <div className="flex flex-col items-center justify-center py-56 gap-12">
             <div className="relative">
                <div className="absolute inset-0 bg-red-400 blur-3xl opacity-20 animate-pulse"></div>
                <div className="w-36 h-36 bg-white rounded-[4rem] shadow-3xl flex items-center justify-center text-red-600 relative z-10">
                  <Activity size={72} className="animate-pulse" />
                </div>
             </div>
             <div className="text-center">
               <p className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2">Chargement du Cockpit</p>
               <p className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Interconnexion des flux Google Sheets...</p>
             </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {activeTab === 'dashboard' && <VisualDashboard data={data} />}
            {activeTab === 'daily' && <DailyView data={data} />}
            {activeTab === 'weekly' && <WeeklyView data={data} />}
            {activeTab === 'synthesis' && <SynthesisView data={data} />}
            {activeTab === 'performance' && <PerformanceView data={data} />}
            {activeTab === 'entry' && <DataEntryForm scriptUrl={scriptUrl} />}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
