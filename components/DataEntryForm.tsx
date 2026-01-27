
import React, { useState, useMemo } from 'react';
import { Building2, Calendar, Save, CheckCircle2, AlertCircle, RefreshCw, Send, ChevronDown, Hash, Settings } from 'lucide-react';
import { saveRecordToSheet } from '../services/googleSheetService';
import { SITES_DATA } from '../constants';

interface DataEntryFormProps {
  scriptUrl: string | null;
}

const MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre"
];

export const DataEntryForm: React.FC<DataEntryFormProps> = ({ scriptUrl }) => {
  const [formData, setFormData] = useState({
    siteIndex: "",
    date: new Date().toISOString().split('T')[0],
    fixe: 0,
    mobile: 0
  });

  const [status, setStatus] = useState<'idle' | 'success' | 'submitting' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState("");

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

  const getMonthName = (dateStr: string) => {
    const d = new Date(dateStr);
    return MONTHS_FR[d.getMonth()];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSite) return;
    
    const cleanUrl = scriptUrl?.trim();
    if (!cleanUrl) {
      setStatus('error');
      setErrorMessage("Script URL non configurée.");
      return;
    }

    setStatus('submitting');
    try {
      const [y, m, d] = formData.date.split('-');
      
      // Alignement strict sur les en-têtes demandés par l'utilisateur
      const payload = {
        "Date Collecte": `${d}/${m}/${y}`,
        "Code site": selectedSite.code,
        "Libelle site": selectedSite.name,
        "Date fin mois": calculateEndOfMonth(formData.date),
        "Activité Fixe": "FIXE",
        "NombreFixe": Number(formData.fixe),
        "Activité Mobile": "MOBILE",
        "NombreMobile": Number(formData.mobile),
        "Total poches": total,
        "Mois": getMonthName(formData.date)
      };

      await saveRecordToSheet(cleanUrl, payload);
      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || "Erreur de transmission.");
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
      <div className="max-w-xl mx-auto py-10 text-center animate-in zoom-in duration-300">
        <div className="bg-white rounded-3xl p-10 shadow-xl border border-green-100 flex flex-col items-center">
          <CheckCircle2 size={64} className="text-green-500 mb-6" />
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-2">Transmis !</h2>
          <p className="text-slate-500 text-sm mb-8 font-bold">La donnée a été envoyée avec succès au fichier national.</p>
          <button onClick={handleReset} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3">
            <RefreshCw size={18} /> Nouvelle saisie
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {!scriptUrl && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
           <Settings size={20} className="text-amber-600 animate-spin-slow" />
           <p className="text-[10px] font-black text-amber-800 uppercase tracking-tight">Configuration requise : URL Apps Script manquante.</p>
        </div>
      )}

      <div className="bg-white rounded-2xl lg:rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-50/50 p-6 lg:p-10 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center lg:text-left">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow shadow-red-100 text-red-600">
              <Send size={24} />
            </div>
            <div>
              <h2 className="text-xl lg:text-3xl font-black uppercase tracking-tighter">Saisie Prélèvement</h2>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Injection directe dans le fichier source</p>
            </div>
          </div>
          <div className="bg-slate-900 px-8 py-3 lg:py-5 rounded-xl lg:rounded-3xl text-center w-full lg:w-auto">
             <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Total Poches</p>
             <p className="text-3xl lg:text-5xl font-black text-white leading-none">{total}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 lg:p-12 space-y-8 lg:space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
            <div className="space-y-6">
              <div className="relative">
                <label className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                  <Building2 size={12} className="text-red-600" /> Structure de collecte
                </label>
                <div className="relative">
                  <select 
                    required
                    value={formData.siteIndex}
                    onChange={(e) => setFormData({...formData, siteIndex: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl lg:rounded-2xl px-5 py-4 text-sm font-black text-slate-800 focus:ring-2 ring-red-500 outline-none appearance-none"
                  >
                    <option value="">Sélectionnez le site...</option>
                    {SITES_DATA.map((s, idx) => (
                      <option key={idx} value={idx}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                  <Calendar size={12} className="text-red-600" /> Date de collecte
                </label>
                <input 
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl lg:rounded-2xl px-5 py-4 text-sm font-black text-slate-800 outline-none focus:ring-2 ring-red-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-8">
              <div>
                <label className="flex items-center gap-2 text-[9px] font-black text-blue-600 uppercase tracking-widest mb-2 ml-1">
                  <Hash size={12} /> Prélèvements FIXE
                </label>
                <input 
                  type="number"
                  min="0"
                  value={formData.fixe}
                  onChange={(e) => setFormData({...formData, fixe: parseInt(e.target.value) || 0})}
                  className="w-full bg-blue-50/50 border border-blue-100 rounded-xl lg:rounded-2xl px-5 py-6 text-2xl lg:text-4xl font-black text-blue-700 outline-none text-center"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-[9px] font-black text-orange-600 uppercase tracking-widest mb-2 ml-1">
                  <Hash size={12} /> Prélèvements MOBILE
                </label>
                <input 
                  type="number"
                  min="0"
                  value={formData.mobile}
                  onChange={(e) => setFormData({...formData, mobile: parseInt(e.target.value) || 0})}
                  className="w-full bg-orange-50/50 border border-orange-100 rounded-xl lg:rounded-2xl px-5 py-6 text-2xl lg:text-4xl font-black text-orange-700 outline-none text-center"
                />
              </div>
            </div>
          </div>

          {status === 'error' && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-[10px] font-black uppercase flex items-center gap-3">
              <AlertCircle size={18} className="shrink-0" /> 
              <p>{errorMessage}</p>
            </div>
          )}

          <button 
            type="submit"
            disabled={!selectedSite || status === 'submitting'}
            className="w-full bg-red-600 text-white py-5 lg:py-8 rounded-2xl lg:rounded-[2.5rem] font-black text-sm lg:text-base uppercase tracking-widest hover:bg-red-700 shadow-xl shadow-red-100 transition-all flex items-center justify-center gap-4 disabled:opacity-30 active:scale-95"
          >
            {status === 'submitting' ? <RefreshCw className="animate-spin" size={24} /> : <Save size={24} />}
            {status === 'submitting' ? "Transmission en cours..." : "Valider et Injecter"}
          </button>
        </form>
      </div>
    </div>
  );
};
