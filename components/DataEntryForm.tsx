
import React, { useState, useMemo } from 'react';
import { Building2, Truck, Calendar, Save, CheckCircle2, AlertCircle, RefreshCcw, Send, Code, ChevronDown, Hash, Settings } from 'lucide-react';
import { saveRecordToSheet } from '../services/googleSheetService';
import { SITES_DATA } from '../constants';

interface DataEntryFormProps {
  scriptUrl: string | null;
}

export const DataEntryForm: React.FC<DataEntryFormProps> = ({ scriptUrl }) => {
  const [formData, setFormData] = useState({
    siteIndex: "",
    date: new Date().toISOString().split('T')[0],
    fixe: 0,
    mobile: 0
  });

  const [status, setStatus] = useState<'idle' | 'success' | 'submitting' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  const selectedSite = useMemo(() => {
    if (formData.siteIndex === "") return null;
    return SITES_DATA[parseInt(formData.siteIndex)];
  }, [formData.siteIndex]);

  const total = (Number(formData.fixe) || 0) + (Number(formData.mobile) || 0);

  const calculateEndOfMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const day = String(lastDay.getDate()).padStart(2, '0');
    const month = String(lastDay.getMonth() + 1).padStart(2, '0');
    const year = lastDay.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSite) return;
    
    const cleanUrl = scriptUrl?.trim();
    if (!cleanUrl || cleanUrl === "") {
      setStatus('error');
      setErrorMessage("L'URL Apps Script n'est pas configurée. Cliquez sur l'icône 'Engrenage' en haut à droite pour la renseigner.");
      return;
    }

    setStatus('submitting');
    try {
      const [y, m, d] = formData.date.split('-');
      const dateCollecte = `${d}/${m}/${y}`;
      const dateFinMois = calculateEndOfMonth(formData.date);

      const payload = {
        dateCollecte: dateCollecte,      
        codeSite: selectedSite.code,      
        libelleSite: selectedSite.name,   
        dateFinMois: dateFinMois,         
        activiteFixe: "FIXE",             
        nombreFixe: Number(formData.fixe),
        activiteMobile: "MOBILE",         
        nombreMobile: Number(formData.mobile), 
        totalPoches: total                
      };

      await saveRecordToSheet(cleanUrl, payload);
      setTimeout(() => setStatus('success'), 1200);
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || "Impossible de joindre le script.");
    }
  };

  const handleReset = () => {
    setFormData({
      siteIndex: "",
      date: new Date().toISOString().split('T')[0],
      fixe: 0,
      mobile: 0
    });
    setStatus('idle');
  };

  if (status === 'success') {
    return (
      <div className="max-w-2xl mx-auto py-12 animate-in zoom-in duration-500 text-center">
        <div className="bg-white rounded-[4rem] p-16 shadow-3xl border border-green-100 flex flex-col items-center text-center">
          <div className="w-32 h-32 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-10 shadow-inner">
            <CheckCircle2 size={80} />
          </div>
          <h2 className="text-4xl font-black text-slate-800 uppercase tracking-tighter mb-4">Transmission Réussie</h2>
          <p className="text-slate-500 font-bold mb-12 text-lg">
            La ligne a été ajoutée dans <span className="text-red-600 font-black">DATABASE1</span>.
          </p>
          <button onClick={handleReset} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-4 shadow-2xl">
            <RefreshCcw size={20} /> Nouvelle saisie
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* Alerte si configuration manquante */}
      {(!scriptUrl || scriptUrl === "") && (
        <div className="mb-8 p-6 bg-amber-50 border-2 border-amber-200 rounded-[2rem] flex items-center justify-between gap-6 shadow-sm">
           <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-amber-200 text-amber-700 rounded-2xl flex items-center justify-center shrink-0">
               <Settings size={24} className="animate-spin-slow" />
             </div>
             <div>
               <p className="text-sm font-black text-amber-800 uppercase tracking-tight">Configuration Requise</p>
               <p className="text-xs font-bold text-amber-600">Vous devez renseigner l'URL de votre Apps Script (onglet DATABASE1) dans les réglages pour pouvoir envoyer des données.</p>
             </div>
           </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-10">
         <div>
            <h1 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">Système d'Injection de Données</h1>
            <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Fichier : DSDSUIVI2026</h2>
         </div>
         <button onClick={() => setShowHelp(!showHelp)} className="flex items-center gap-3 text-[11px] font-black uppercase text-blue-600 bg-blue-50 px-6 py-3 rounded-full hover:bg-blue-100 transition-all shadow-sm">
           <Code size={18} /> Code Apps Script
         </button>
      </div>

      {showHelp && (
        <div className="mb-10 p-10 bg-slate-900 rounded-[3rem] text-white shadow-3xl animate-in slide-in-from-top-4 duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
          <h3 className="font-black text-2xl uppercase tracking-tighter mb-6 flex items-center gap-4">
            <AlertCircle className="text-red-500" size={32} /> Code Apps Script Requis
          </h3>
          <p className="text-slate-400 font-medium mb-8 text-sm leading-relaxed">
            Collez ce code dans votre éditeur Google Apps Script (Extensions &gt; Apps Script) :
          </p>
          <div className="bg-black/50 p-6 rounded-2xl border border-white/10 font-mono text-[11px] text-blue-300 overflow-x-auto mb-8">
            <pre>{`function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("DATABASE1") || ss.insertSheet("DATABASE1");
  try {
    var d = JSON.parse(e.postData.contents);
    sheet.appendRow([
      d.dateCollecte, d.codeSite, d.libelleSite, d.dateFinMois, 
      d.activiteFixe, d.nombreFixe, d.activiteMobile, d.nombreMobile, d.totalPoches
    ]);
    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.toString()).setMimeType(ContentService.MimeType.TEXT);
  }
}`}</pre>
          </div>
          <ul className="space-y-3 text-xs font-bold uppercase tracking-tight text-slate-400">
             <li className="flex items-center gap-3"><div className="w-2 h-2 bg-red-500 rounded-full"></div> Déployer en tant qu'application Web (Accès : Tout le monde)</li>
             <li className="flex items-center gap-3"><div className="w-2 h-2 bg-red-500 rounded-full"></div> Copier l'URL /exec dans les réglages (icône roue dentée)</li>
          </ul>
        </div>
      )}

      <div className="bg-white rounded-[4rem] shadow-4xl border border-slate-100 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-red-600 via-red-500 to-orange-400"></div>
        
        <div className="bg-slate-50/50 p-12 border-b border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="flex items-center gap-8">
            <div className="w-20 h-20 bg-white border border-slate-200 rounded-[2rem] flex items-center justify-center shadow-xl text-red-600">
              <Send size={36} />
            </div>
            <div>
              <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-800">Saisie Active</h2>
              <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> Canal Sécurisé DATABASE1
              </p>
            </div>
          </div>
          
          <div className="flex gap-6 items-center">
              <div className="bg-white px-8 py-6 rounded-[2rem] text-center min-w-[240px] border border-slate-100 shadow-sm group">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-red-500 transition-colors">SITE SÉLECTIONNÉ</p>
                <p className="text-xl font-black text-slate-900 leading-tight uppercase line-clamp-2">{selectedSite?.name || "---"}</p>
                <p className="text-[9px] font-bold text-slate-300 mt-1">CODE: {selectedSite?.code || "0000"}</p>
              </div>
              <div className="bg-slate-900 px-10 py-6 rounded-[2rem] text-center min-w-[180px] shadow-3xl">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">TOTAL POCHES</p>
                <p className="text-5xl font-black text-white leading-none">{total}</p>
              </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-12 lg:p-20 space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div className="space-y-12">
              <div className="relative">
                <label className="flex items-center gap-3 text-[11px] font-black text-slate-500 uppercase tracking-widest mb-5 ml-2">
                  <Building2 size={16} className="text-red-600" /> Libellé Site (Col C)
                </label>
                <div className="relative">
                  <select 
                    required
                    value={formData.siteIndex}
                    onChange={(e) => setFormData({...formData, siteIndex: e.target.value})}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] px-8 py-6 text-base font-black text-slate-700 focus:border-red-500 focus:bg-white outline-none transition-all cursor-pointer appearance-none shadow-sm"
                  >
                    <option value="">-- Sélectionner le site --</option>
                    {SITES_DATA.map((s, idx) => (
                      <option key={idx} value={idx}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={24} />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-3 text-[11px] font-black text-slate-500 uppercase tracking-widest mb-5 ml-2">
                  <Calendar size={16} className="text-red-600" /> Date Collecte (Col A)
                </label>
                <input 
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] px-8 py-6 text-base font-black text-slate-700 focus:border-red-500 focus:bg-white outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-12">
              <div className="relative">
                <label className="flex items-center gap-3 text-[11px] font-black text-blue-600 uppercase tracking-widest mb-5 ml-2">
                  <Hash size={16} /> Nombre Fixe (Col F)
                </label>
                <input 
                  type="number"
                  min="0"
                  value={formData.fixe}
                  onChange={(e) => setFormData({...formData, fixe: parseInt(e.target.value) || 0})}
                  className="w-full bg-blue-50/50 border-2 border-blue-100 rounded-[2rem] px-8 py-6 text-4xl font-black text-blue-700 focus:border-blue-500 focus:bg-white outline-none transition-all shadow-inner"
                />
              </div>

              <div className="relative">
                <label className="flex items-center gap-3 text-[11px] font-black text-orange-600 uppercase tracking-widest mb-5 ml-2">
                  <Hash size={16} /> Nombre Mobile (Col H)
                </label>
                <input 
                  type="number"
                  min="0"
                  value={formData.mobile}
                  onChange={(e) => setFormData({...formData, mobile: parseInt(e.target.value) || 0})}
                  className="w-full bg-orange-50/50 border-2 border-orange-100 rounded-[2rem] px-8 py-6 text-4xl font-black text-orange-700 focus:border-orange-500 focus:bg-white outline-none transition-all shadow-inner"
                />
              </div>
            </div>
          </div>

          {status === 'error' && (
            <div className="p-8 bg-red-50 text-red-600 rounded-[2.5rem] border border-red-100 text-sm font-black uppercase tracking-tight flex items-start gap-5 animate-shake">
              <AlertCircle size={32} className="shrink-0" /> 
              <p>{errorMessage}</p>
            </div>
          )}

          <div className="pt-16 border-t border-slate-100 flex justify-center">
            <button 
              type="submit"
              disabled={!selectedSite || status === 'submitting'}
              className="w-full lg:w-auto min-w-[400px] bg-red-600 text-white px-16 py-8 rounded-[2.5rem] font-black text-base uppercase tracking-[0.3em] hover:bg-red-700 shadow-4xl shadow-red-200 transition-all flex items-center justify-center gap-6 disabled:opacity-30 disabled:grayscale transform hover:-translate-y-1 active:scale-95"
            >
              {status === 'submitting' ? <RefreshCcw className="animate-spin" size={32} /> : <Save size={32} />}
              {status === 'submitting' ? "Synchronisation..." : "Injecter les données"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
