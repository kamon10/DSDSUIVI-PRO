
import React, { useState, useEffect, useCallback } from 'react';
import { INITIAL_DATA, DEFAULT_LINK_1 } from './constants';
import { VisualDashboard } from './components/VisualDashboard';
import { PerformanceView } from './components/PerformanceView';
import { SynthesisView } from './components/SynthesisView';
import { WeeklyView } from './components/WeeklyView';
import { DailyView } from './components/DailyView';
import { DataEntryForm } from './components/DataEntryForm';
import { DetailedHistoryView } from './components/DetailedHistoryView';
import { RecapView } from './components/RecapView';
import { AIAnalystView } from './components/AIAnalystView';
import { fetchSheetData } from './services/googleSheetService';
import { AppTab, DashboardData } from './types';
import { Activity, LayoutDashboard, RefreshCw, Settings, BarChart3, ClipboardList, Calendar, PlusCircle, History, Clock, FileText, BrainCircuit, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [data, setData] = useState<DashboardData>(INITIAL_DATA);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('daily');
  
  const [sheetInput, setSheetInput] = useState(localStorage.getItem('gsheet_input_1') || DEFAULT_LINK_1);
  const [scriptUrl, setScriptUrl] = useState(localStorage.getItem('gsheet_script_url') || "");
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSync = useCallback(async () => {
    if (!sheetInput) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSheetData(sheetInput.trim());
      setData(result);
      localStorage.setItem('gsheet_input_1', sheetInput.trim());
      setShowSettings(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Échec de la connexion au fichier.");
    } finally {
      setLoading(false);
    }
  }, [sheetInput]);

  useEffect(() => {
    handleSync();
  }, []);

  const saveConfig = () => {
    localStorage.setItem('gsheet_script_url', scriptUrl.trim());
    handleSync();
  };

  return (
    <div className="min-h-screen bg-[#fffcf5] text-slate-900 pb-24 lg:pb-0 font-sans selection:bg-orange-100">
      <header className="bg-white/80 backdrop-blur-xl border-b border-orange-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 flex h-16 lg:h-20 items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center text-white shadow-lg">
               <Activity size={22}/>
             </div>
             <div className="flex flex-col">
               <span className="font-black text-lg tracking-tighter leading-none uppercase">DSDSUIVI</span>
               <span className="text-[8px] text-orange-400 font-bold uppercase tracking-widest leading-none mt-1">Cockpit CNTS</span>
             </div>
          </div>

          <nav className="hidden lg:flex items-center bg-orange-50/50 p-1 rounded-xl gap-1 border border-orange-100">
            {[
              { id: 'daily', icon: <Calendar size={14} />, label: 'Jour' },
              { id: 'recap', icon: <FileText size={14} />, label: 'Récap' },
              { id: 'history', icon: <History size={14} />, label: 'Journal' },
              { id: 'weekly', icon: <Clock size={14} />, label: 'Hebdo' },
              { id: 'entry', icon: <PlusCircle size={14} />, label: 'Saisie' },
              { id: 'dashboard', icon: <LayoutDashboard size={14} />, label: 'Stats' },
              { id: 'performance', icon: <BarChart3 size={14} />, label: 'Rang' },
              { id: 'ai-analyst', icon: <BrainCircuit size={14} />, label: 'Analyste' }
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AppTab)} 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                  activeTab === tab.id ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-orange-600'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button onClick={handleSync} disabled={loading} className="p-2.5 bg-slate-900 text-white rounded-xl shadow-md disabled:opacity-50">
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setShowSettings(true)} className="p-2.5 rounded-xl border border-orange-100 text-slate-400 hover:bg-white transition-colors">
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE NAV */}
      <nav className="lg:hidden fixed bottom-4 left-4 right-4 bg-slate-900/95 backdrop-blur-lg rounded-2xl shadow-2xl z-50 px-2 py-2 flex justify-between items-center border border-white/10 overflow-x-auto">
         {[
           { id: 'daily', icon: <Calendar size={18} />, label: 'Jour' },
           { id: 'recap', icon: <FileText size={18} />, label: 'Récap' },
           { id: 'history', icon: <History size={18} />, label: 'Journal' },
           { id: 'entry', icon: <PlusCircle size={18} />, label: 'Saisie' },
           { id: 'dashboard', icon: <LayoutDashboard size={18} />, label: 'Stats' },
           { id: 'ai-analyst', icon: <BrainCircuit size={18} />, label: 'IA' }
         ].map((tab) => (
           <button 
             key={tab.id}
             onClick={() => setActiveTab(tab.id as AppTab)}
             className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-xl transition-all ${activeTab === tab.id ? 'text-orange-500 bg-white/5' : 'text-slate-400'}`}
           >
             {tab.icon}
             <span className="text-[8px] font-black uppercase tracking-tighter">{tab.label}</span>
           </button>
         ))}
      </nav>

      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6 lg:py-10">
        {loading && !data.dailyHistory.length ? (
          <div className="flex flex-col items-center justify-center py-40 gap-6">
             <Activity size={48} className="text-orange-500 animate-pulse" />
             <p className="text-xs font-black text-orange-400 uppercase tracking-widest animate-pulse">Synchronisation du Cockpit...</p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            {activeTab === 'dashboard' && <VisualDashboard data={data} />}
            {activeTab === 'daily' && <DailyView data={data} />}
            {activeTab === 'recap' && <RecapView data={data} />}
            {activeTab === 'weekly' && <WeeklyView data={data} />}
            {activeTab === 'performance' && <PerformanceView data={data} />}
            {activeTab === 'entry' && <DataEntryForm scriptUrl={scriptUrl} />}
            {activeTab === 'history' && <DetailedHistoryView data={data} />}
            {activeTab === 'ai-analyst' && <AIAnalystView data={data} />}
          </div>
        )}
      </main>

      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl space-y-6">
            <h3 className="text-xl font-black uppercase tracking-tight text-slate-800">Configuration Source</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Lien Google Sheet (CSV)</label>
                <input 
                  value={sheetInput} 
                  onChange={(e) => setSheetInput(e.target.value)} 
                  className="w-full bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 ring-orange-500 outline-none transition-all"
                  placeholder="Coller le lien de publication"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">URL Apps Script (Injection)</label>
                <input 
                  value={scriptUrl} 
                  onChange={(e) => setScriptUrl(e.target.value)} 
                  className="w-full bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 ring-slate-900 outline-none"
                  placeholder="URL Web App"
                />
              </div>
            </div>
            {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase flex items-center gap-2"><AlertCircle size={14}/> {error}</div>}
            <div className="flex gap-3">
              <button onClick={saveConfig} className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all active:scale-95">Valider</button>
              <button onClick={() => setShowSettings(false)} className="flex-1 border border-slate-200 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
