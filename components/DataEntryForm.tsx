
import React, { useState, useMemo, useEffect } from 'react';
import { Building2, Calendar, Save, CheckCircle2, AlertCircle, RefreshCw, Send, ChevronDown, Hash, Settings, Info, Calculator, Edit3, Plus } from 'lucide-react';
import { saveRecordToSheet } from '../services/googleSheetService';
import { SITES_DATA } from '../constants';
import { DashboardData } from '../types';

interface DataEntryFormProps {
  scriptUrl: string | null;
  data: DashboardData;
}

const MONTHS_FR_UPPER = [
  "JANVIER", "FEVRIER", "MARS", "AVRIL", "MAI", "JUIN",
  "JUILLET", "AOUT", "SEPTEMBRE", "OCTOBRE", "NOVEMBRE", "DECEMBRE"
];

export const DataEntryForm: React.FC<DataEntryFormProps> = ({ scriptUrl, data }) => {
  const [formData, setFormData] = useState({
    siteIndex: "",
    date: new Date().toISOString().split('T')[0],
    fixe: 0,
    mobile: 0
  });

  const [status, setStatus] = useState<'idle' | 'success' | 'submitting' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // CALCULS AUTOMATIQUES
  const selectedSite = useMemo(() => {
    if (formData.siteIndex === "") return null;
    return SITES_DATA[parseInt(formData.siteIndex)];
  }, [formData.siteIndex]);

  // DÉTECTION DE L'EXISTENCE D'UNE DONNÉE
  useEffect(() => {
    if (selectedSite && formData.date) {
      const [y, m, d] = formData.date.split('-');
      const formattedDate = `${d}/${m}/${y}`;
      
      const existingDay = data.dailyHistory.find(h => h.date === formattedDate);
      const existingSiteData = existingDay?.sites.find(s => s.name.toUpperCase() === selectedSite.name.toUpperCase());
      
      if (existingSiteData) {
        setIsEditing(true);
        setFormData(prev => ({
          ...prev,
          fixe: existingSiteData.fixe,
          mobile: existingSiteData.mobile
        }));
      } else {
        setIsEditing(false);
        // On ne reset pas à 0 si l'utilisateur est en train de taper pour éviter les flashs
        // Mais si on change juste le site/date et qu'on trouve rien, on peut remettre à 0
      }
    }
  }, [selectedSite, formData.date, data.dailyHistory]);

  const totalPoches = (Number(formData.fixe) || 0) + (Number(formData.mobile) || 0);

  const calculatedFields = useMemo(() => {
    if (!formData.date) return { endOfMonth: "", monthName: "" };
    const d = new Date(formData.date);
    
    // Calcul de la fin du mois
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const day = String(lastDay.getDate()).padStart(2, '0');
    const month = String(lastDay.getMonth() + 1).padStart(2, '0');
    const year = lastDay.getFullYear();
    const endOfMonth = `${day}/${month}/${year}`;
    
    // Nom du mois
    const monthName = MONTHS_FR_UPPER[d.getMonth()];
    
    return { endOfMonth, monthName };
  }, [formData.date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSite) return;
    
    const cleanUrl = scriptUrl?.trim();
    if (!cleanUrl) {
      setStatus('error');
      setErrorMessage("URL Apps Script non configurée dans les réglages.");
      return;
    }

    setStatus('submitting');
    try {
      const [y, m, d] = formData.date.split('-');
      
      // PAYLOAD CONFORME À VOTRE STRUCTURE DE FEUILLE
      const payload = {
        "Date Collecte": `${d}/${m}/${y}`,
        "Code site": selectedSite.code,
        "Libelle site": selectedSite.name,
        "Date fin mois": calculatedFields.endOfMonth,
        "Activité Fixe": "FIXE",
        "NombreFixe": Number(formData.fixe),
        "Activité Mobile": "MOBILE",
        "NombreMobile": Number(formData.mobile),
        "Total poches": totalPoches,
        "Mois": calculatedFields.monthName,
        "Mode": isEditing ? "UPDATE" : "APPEND" // Information utile pour le script
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
    setIsEditing(false);
    setStatus('idle');
  };

  if (status === 'success') {
    return (
      <div className="max-w-xl mx-auto py-10 text-center animate-in zoom-in duration-300">
        <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-green-100 flex flex-col items-center">
          <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-100">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-2">
            {isEditing ? "Mise à jour Réussie" : "Transmission Réussie"}
          </h2>
          <p className="text-slate-500 text-sm mb-8 font-medium">
            {isEditing ? "La ligne existante a été écrasée avec succès." : "Les données ont été injectées dans le fichier national."}
          </p>
          <button onClick={handleReset} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all">
            <RefreshCw size={18} /> Nouvelle saisie
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {!scriptUrl && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 animate-pulse">
           <Settings size={20} className="text-amber-600" />
           <p className="text-[10px] font-black text-amber-800 uppercase tracking-tight">Configuration requise : Veuillez renseigner l'URL Apps Script dans les réglages.</p>
        </div>
      )}

      {isEditing && (
        <div className="p-4 bg-blue-600 rounded-3xl flex items-center justify-between text-white animate-in slide-in-from-top-4 shadow-xl">
           <div className="flex items-center gap-3 px-2">
              <Edit3 size={20} />
              <p className="text-[10px] font-black uppercase tracking-widest">Saisie existante détectée • Mode Modification activé</p>
           </div>
           <button 
            onClick={() => { setFormData({...formData, fixe: 0, mobile: 0}); setIsEditing(false); }}
            className="text-[9px] font-black uppercase bg-white/20 px-4 py-2 rounded-xl hover:bg-white/30 transition-all"
           >
            Ignorer
           </button>
        </div>
      )}

      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
        {/* EN-TETE DU FORMULAIRE */}
        <div className="bg-slate-50/80 p-8 lg:p-12 border-b border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className={`w-14 h-14 ${isEditing ? 'bg-blue-600' : 'bg-red-600'} rounded-2xl flex items-center justify-center text-white shadow-xl transition-colors duration-500`}>
              {isEditing ? <Edit3 size={28} /> : <Send size={28} />}
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-black uppercase tracking-tighter text-slate-900">
                {isEditing ? "Modifier les Flux" : "Saisie des Flux"}
              </h2>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 italic">
                {isEditing ? "Mise à jour d'un enregistrement existant" : "Module d'injection temps-réel"}
              </p>
            </div>
          </div>
          
          <div className="flex gap-4 w-full lg:w-auto">
            <div className="bg-slate-900 px-8 py-5 rounded-[2rem] text-center flex-1 lg:flex-none min-w-[140px] shadow-xl">
               <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Poches Total</p>
               <p className="text-3xl font-black text-white leading-none">{totalPoches}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 lg:p-12 space-y-10">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* COLONNE GAUCHE : SÉLECTION */}
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                  <Building2 size={14} className={isEditing ? 'text-blue-600' : 'text-red-600'} /> Structure (Libelle site)
                </label>
                <div className="relative">
                  <select 
                    required
                    value={formData.siteIndex}
                    onChange={(e) => setFormData({...formData, siteIndex: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black text-slate-800 focus:ring-4 ring-slate-100 outline-none appearance-none transition-all"
                  >
                    <option value="">Sélectionner un site...</option>
                    {SITES_DATA.map((s, idx) => (
                      <option key={idx} value={idx}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                </div>
                {selectedSite && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl border border-blue-100 animate-in fade-in duration-300">
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Code Automatique :</span>
                    <span className="text-xs font-black text-blue-700">{selectedSite.code}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                  <Calendar size={14} className={isEditing ? 'text-blue-600' : 'text-red-600'} /> Date de Collecte
                </label>
                <input 
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black text-slate-800 outline-none focus:ring-4 ring-slate-100 transition-all"
                />
                {formData.date && (
                  <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-300">
                    <div className="flex flex-col p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Mois calculé</span>
                      <span className="text-[10px] font-black text-slate-700">{calculatedFields.monthName}</span>
                    </div>
                    <div className="flex flex-col p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Fin de mois</span>
                      <span className="text-[10px] font-black text-slate-700">{calculatedFields.endOfMonth}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* COLONNE DROITE : CHIFFRES */}
            <div className="space-y-8">
              <div className="bg-emerald-50/30 p-8 rounded-[2.5rem] border border-emerald-100 space-y-4">
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                    <Hash size={14} /> Activité Fixe
                  </label>
                  <span className="text-[8px] font-black px-2 py-0.5 bg-emerald-600 text-white rounded-full">FIGÉ</span>
                </div>
                <input 
                  type="number"
                  min="0"
                  value={formData.fixe}
                  onChange={(e) => setFormData({...formData, fixe: parseInt(e.target.value) || 0})}
                  className="w-full bg-white border border-emerald-200 rounded-2xl px-6 py-6 text-4xl font-black text-emerald-700 outline-none text-center shadow-inner focus:ring-4 ring-emerald-500/10 transition-all"
                />
              </div>

              <div className="bg-orange-50/30 p-8 rounded-[2.5rem] border border-orange-100 space-y-4">
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 text-[10px] font-black text-orange-600 uppercase tracking-widest">
                    <Hash size={14} /> Activité Mobile
                  </label>
                  <span className="text-[8px] font-black px-2 py-0.5 bg-orange-600 text-white rounded-full">FIGÉ</span>
                </div>
                <input 
                  type="number"
                  min="0"
                  value={formData.mobile}
                  onChange={(e) => setFormData({...formData, mobile: parseInt(e.target.value) || 0})}
                  className="w-full bg-white border border-orange-200 rounded-2xl px-6 py-6 text-4xl font-black text-orange-700 outline-none text-center shadow-inner focus:ring-4 ring-orange-500/10 transition-all"
                />
              </div>
            </div>
          </div>

          {/* RÉCAPITULATIF AVANT ENVOI */}
          <div className="p-6 bg-slate-900 rounded-[2rem] text-white/80 text-[10px] font-black uppercase tracking-widest flex flex-wrap items-center justify-center gap-x-8 gap-y-2 border border-white/5 shadow-2xl">
             <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 ${isEditing ? 'bg-blue-400' : 'bg-red-500'} rounded-full animate-pulse`}></div> 
                {isEditing ? "Mode Mise à jour actif" : "Injection directe active"}
             </div>
             <div className="flex items-center gap-2">Total : {totalPoches} poches</div>
             <div className="flex items-center gap-2 text-white">Mois : {calculatedFields.monthName}</div>
          </div>

          {status === 'error' && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-[10px] font-black uppercase flex items-center gap-3 animate-shake">
              <AlertCircle size={20} className="shrink-0" /> 
              <p>{errorMessage}</p>
            </div>
          )}

          <button 
            type="submit"
            disabled={!selectedSite || status === 'submitting'}
            className={`w-full ${isEditing ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'} text-white py-8 rounded-[2.5rem] font-black text-lg uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-4 disabled:opacity-30 active:scale-95`}
          >
            {status === 'submitting' ? <RefreshCw className="animate-spin" size={28} /> : (isEditing ? <Edit3 size={28} /> : <Plus size={28} />)}
            {status === 'submitting' ? "Transmission en cours..." : (isEditing ? "Mettre à jour l'entrée" : "Valider et Injecter")}
          </button>
        </form>
      </div>
      
      <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 flex items-start gap-4 shadow-sm">
        <Calculator size={24} className="text-blue-600 shrink-0" />
        <div>
          <h4 className="text-[11px] font-black text-blue-900 uppercase mb-1">Aide au calcul</h4>
          <p className="text-[10px] font-bold text-blue-700/70 leading-relaxed uppercase">
            L'application détecte automatiquement si une saisie existe déjà pour la date et le site choisis. Dans ce cas, elle passe en mode modification pour vous permettre d'ajuster les chiffres sans créer de doublon dans le Sheet.
          </p>
        </div>
      </div>
    </div>
  );
};
