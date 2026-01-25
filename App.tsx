
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
const DEFAULT_LINK_2 = ""; // Lien optionnel pour l'annuaire

const App: React.FC = () => {
  const [data, setData] = useState<DashboardData>(INITIAL_DATA);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('daily');
  
  // États pour les 2 sources de données
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
      // Chargement en parallèle des deux sources
      const [activityData, directoryData] = await Promise.all([
        fetchSheetData(sheetInput1.trim()),
        sheetInput2.trim() !== "" ? fetchDirectoryData(sheetInput2.trim()) : Promise.resolve(null)
      ]);
      
      if (!activityData.dailyHistory || activityData.dailyHistory.length === 0) {
        throw new Error("Source 1 : Aucune donnée d'activité trouvée.");
      }

      // Ici on pourrait fusionner directoryData dans activityData si besoin
      // Pour l'instant on met à jour l'état principal
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

  const isScriptUrlValid = scriptUrl === "" || (scriptUrl.includes("/macros/s/") && scriptUrl.includes("/exec"));

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-16 font-sans">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex h-24 items-center justify-between gap-4">
          <div className="flex items-center gap-4 shrink-0">
             <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-red-200">
               <Activity size={28}/>
             </div>
             <div className="hidden sm:block">
               <span className="font-black text-2xl tracking-tighter block leading-none">DSDSUIVI PRO</span>
               <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 block">CNTS Côte d'Ivoire</span>
             </div>
          </div>

          <nav className="hidden md:flex items-center bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200">
            <button onClick={() => setActiveTab('daily')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'daily' ? 'bg-white text-red-600 shadow-lg' : 'text-slate-500'}`}>
              <Calendar size={14} /> Prélèvements
            </button>
            <button onClick={() => setActiveTab('weekly')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'weekly' ? 'bg-white text-red-600 shadow-lg' : 'text-slate-500'}`}>
              <Layers size={14} /> Hebdo
            </button>
            <button onClick={() => setActiveTab('entry')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'entry' ? 'bg-white text-red-600 shadow-lg' : 'text-slate-500'}`}>
              <PlusCircle size={14} /> Saisie
            </button>
            <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'dashboard' ? 'bg-white text-red-600 shadow-lg' : 'text-slate-500'}`}>
              <LayoutDashboard size={14} /> Stats
            </button>
            <button onClick={() => setActiveTab('synthesis')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'synthesis' ? 'bg-white text-red-600 shadow-lg' : 'text-slate-500'}`}>
              <ClipboardList size={14} /> Synthèse
            </button>
            <button onClick={() => setActiveTab('performance')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'performance' ? 'bg-white text-red-600 shadow-lg' : 'text-slate-500'}`}>
              <BarChart3 size={14} /> Rang
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <button onClick={handleSync} disabled={loading} className="hidden lg:flex items-center gap-3 px-6 py-3.5 rounded-[1.25rem] bg-slate-900 text-white shadow-xl hover:bg-slate-800 transition-all disabled:opacity-50 group">
              <RefreshCw size={18} className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
              <div className="text-left">
                <p className="text-[11px] font-black uppercase tracking-widest leading-none">Actualiser</p>
                <p className="text-[9px] font-bold opacity-60 mt-1 uppercase">{lastSync || 'Non synchro'}</p>
              </div>
            </button>
            <button onClick={() => setShowSettings(true)} className={`p-4 rounded-2xl transition-all border ${scriptUrl === "" || sheetInput2 === "" ? 'border-amber-400 bg-amber-50 text-amber-600 animate-pulse' : 'border-slate-200 hover:bg-slate-50 text-slate-400'} relative`}>
              <Settings size={22} />
              {(scriptUrl === "" || sheetInput2 === "") && (
                <span className="absolute top-2 right-2 w-3 h-3 bg-amber-500 rounded-full border-2 border-white"></span>
              )}
            </button>
          </div>
        </div>
      </header>

      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-10 max-w-2xl w-full shadow-3xl animate-in zoom-in duration-300 border border-slate-100 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center gap-5 mb-8">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                <Database size={32} />
              </div>
              <div>
                <h3 className="font-black text-3xl uppercase tracking-tighter">Sources de Données</h3>
                <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">Liez jusqu'à 2 fichiers Google Sheets</p>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold uppercase tracking-tight">
                <AlertTriangle size={18} /> {error}
              </div>
            )}

            <div className="space-y-6 mb-8">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-2 block tracking-widest">Fichier 1 : Activité (CSV)</label>
                <input type="text" value={sheetInput1} onChange={(e) => setSheetInput1(e.target.value)} placeholder="URL CSV du fichier de prélèvements" className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.25rem] px-6 py-4 text-sm focus:border-red-500 outline-none transition-all font-semibold" />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-2 block tracking-widest">Fichier 2 : Annuaire / Config (Optionnel)</label>
                <input type="text" value={sheetInput2} onChange={(e) => setSheetInput2(e.target.value)} placeholder="URL CSV du fichier des responsables" className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.25rem] px-6 py-4 text-sm focus:border-blue-500 outline-none transition-all font-semibold" />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-2 block tracking-widest">URL d'Écriture (Apps Script)</label>
                <input type="text" value={scriptUrl} onChange={(e) => setScriptUrl(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" className={`w-full bg-slate-50 border-2 rounded-[1.25rem] px-6 py-4 text-sm outline-none transition-all font-semibold ${scriptUrl !== "" && !isScriptUrlValid ? 'border-red-300' : 'border-slate-100 focus:border-red-500'}`} />
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={handleCloseSettings} className="flex-1 px-6 py-5 rounded-[1.5rem] font-black text-xs uppercase text-slate-400 hover:bg-slate-100 transition-all border border-slate-100">Annuler</button>
              <button onClick={handleSync} disabled={loading} className="flex-[2] bg-red-600 text-white px-8 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-red-700 shadow-2xl transition-all flex items-center justify-center gap-4">
                {loading ? <RefreshCw size={22} className="animate-spin" /> : <Wifi size={22} />} Valider les sources
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-12">
        {loading && !data.dailyHistory.length ? (
          <div className="flex flex-col items-center justify-center py-48 gap-10">
             <div className="w-32 h-32 bg-white rounded-[3rem] shadow-3xl flex items-center justify-center text-red-600"><Activity size={64} className="animate-pulse" /></div>
             <p className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Analyse des flux multi-sources...</p>
          </div>
        ) : (
          <div>
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
