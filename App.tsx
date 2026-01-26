
import React, { useState, useEffect } from 'react';
import { INITIAL_DATA } from './constants';
import { VisualDashboard } from './components/VisualDashboard';
import { PerformanceView } from './components/PerformanceView';
import { SynthesisView } from './components/SynthesisView';
import { WeeklyView } from './components/WeeklyView';
import { DailyView } from './components/DailyView';
import { DataEntryForm } from './components/DataEntryForm';
import { DetailedHistoryView } from './components/DetailedHistoryView';
import { fetchSheetData, fetchDirectoryData } from './services/googleSheetService';
import { AppTab, DashboardData } from './types';
import { Activity, LayoutDashboard, RefreshCw, Settings, BarChart3, ClipboardList, Calendar, PlusCircle, Layers, History } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 lg:pb-0 font-sans selection:bg-red-100 transition-colors duration-300">
      <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 flex h-16 lg:h-20 items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-100">
               <Activity size={22}/>
             </div>
             <div className="flex flex-col">
               <span className="font-black text-lg tracking-tighter leading-none">DSDSUIVI</span>
               <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">CNTS CI</span>
             </div>
          </div>

          <nav className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl">
            {[
              { id: 'daily', icon: <Calendar size={14} />, label: 'Prélèvements' },
              { id: 'history', icon: <History size={14} />, label: 'Journal' },
              { id: 'entry', icon: <PlusCircle size={14} />, label: 'Saisie' },
              { id: 'dashboard', icon: <LayoutDashboard size={14} />, label: 'Stats' },
              { id: 'synthesis', icon: <ClipboardList size={14} />, label: 'Synthèse' },
              { id: 'performance', icon: <BarChart3 size={14} />, label: 'Rang' }
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AppTab)} 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                  activeTab === tab.id ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 lg:gap-4">
            <button onClick={handleSync} disabled={loading} className="p-2.5 bg-slate-900 text-white rounded-xl shadow-md disabled:opacity-50">
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setShowSettings(true)} className={`p-2.5 rounded-xl border ${scriptUrl === "" ? 'border-amber-400 bg-amber-50 text-amber-600 animate-pulse' : 'border-slate-200 text-slate-400'}`}>
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE TAB BAR */}
      <nav className="lg:hidden fixed bottom-4 left-4 right-4 bg-slate-900/95 backdrop-blur-lg rounded-2xl shadow-2xl z-50 px-2 py-2 flex justify-between items-center border border-white/10">
         {[
           { id: 'daily', icon: <Calendar size={20} />, label: 'Jour' },
           { id: 'history', icon: <History size={20} />, label: 'Journal' },
           { id: 'entry', icon: <PlusCircle size={20} />, label: 'Saisie' },
           { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Stats' },
           { id: 'performance', icon: <BarChart3 size={20} />, label: 'Rang' }
         ].map((tab) => (
           <button 
             key={tab.id}
             onClick={() => setActiveTab(tab.id as AppTab)}
             className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-xl transition-all ${activeTab === tab.id ? 'text-red-500 bg-white/5' : 'text-slate-400'}`}
           >
             {tab.icon}
             <span className="text-[8px] font-black uppercase tracking-tighter">{tab.label}</span>
           </button>
         ))}
      </nav>

      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6 lg:py-10">
        {loading && !data.dailyHistory.length ? (
          <div className="flex flex-col items-center justify-center py-20 gap-6">
             <Activity size={48} className="text-red-600 animate-pulse" />
             <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Connexion sécurisée...</p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            {activeTab === 'dashboard' && <VisualDashboard data={data} />}
            {activeTab === 'daily' && <DailyView data={data} />}
            {activeTab === 'weekly' && <WeeklyView data={data} />}
            {activeTab === 'synthesis' && <SynthesisView data={data} />}
            {activeTab === 'performance' && <PerformanceView data={data} />}
            {activeTab === 'entry' && <DataEntryForm scriptUrl={scriptUrl} />}
            {activeTab === 'history' && <DetailedHistoryView data={data} />}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
