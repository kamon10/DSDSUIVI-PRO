
import React, { useState, useMemo, useEffect } from 'react';
import { Building2, Calendar, Save, CheckCircle2, AlertCircle, RefreshCw, Send, ChevronDown, Hash, Settings, Info, Calculator, Edit3, Plus, Smartphone, History, ArrowRight, XCircle, CloudUpload, Loader2 } from 'lucide-react';
import { saveRecordToSheet } from '../services/googleSheetService';
import { DashboardData, User } from '../types';

interface DataEntryFormProps {
  scriptUrl: string | null;
  data: DashboardData;
  user: User | null;
  sites: any[];
  onSyncRequest?: () => void;
  onOptimisticUpdate?: (payload: any) => void;
}

const MONTHS_FR_UPPER = [
  "JANVIER", "FEVRIER", "MARS", "AVRIL", "MAI", "JUIN",
  "JUILLET", "AOUT", "SEPTEMBRE", "OCTOBRE", "Novembre", "DECEMBRE"
];

export const DataEntryForm: React.FC<DataEntryFormProps> = ({ scriptUrl, data, user, sites, onSyncRequest, onOptimisticUpdate }) => {
  const [formData, setFormData] = useState({
    siteIndex: "",
    date: new Date().toISOString().split('T')[0],
    fixe: "" as string | number,
    mobile1: "" as string | number,
    mobile2: "" as string | number,
    mobile3: "" as string | number
  });

  const [status, setStatus] = useState<'idle' | 'success' | 'submitting' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const totalMobile = (Number(formData.mobile1) || 0) + (Number(formData.mobile2) || 0) + (Number(formData.mobile3) || 0);
  const totalPoches = (Number(formData.fixe) || 0) + totalMobile;

  const selectedSite = useMemo(() => {
    if (formData.siteIndex === "") return null;
    return sites[parseInt(formData.siteIndex)];
  }, [formData.siteIndex, sites]);

  useEffect(() => {
    if (selectedSite && formData.date) {
      const [y, m, d] = formData.date.split('-');
      const formattedDate = `${d}/${m}/${y}`;
      
      const existingDay = data.dailyHistory.find(h => h.date === formattedDate);
      const existingSiteData = existingDay?.sites.find(s => s.name.toUpperCase() === selectedSite.name.toUpperCase());
      
      if (existingSiteData && existingSiteData.total > 0) {
        setIsEditing(true);
        setFormData(prev => ({
          ...prev,
          fixe: existingSiteData.fixe,
          mobile1: existingSiteData.mobile,
          mobile2: "",
          mobile3: ""
        }));
      } else {
        if (isEditing) {
          setIsEditing(false);
          setFormData(prev => ({ ...prev, fixe: "", mobile1: "", mobile2: "", mobile3: "" }));
        }
      }
    }
  }, [selectedSite, formData.date, data.dailyHistory]);

  const recentEntries = useMemo(() => {
    const entries: any[] = [];
    data.dailyHistory.slice(0, 5).forEach(day => {
      day.sites.filter(s => s.total > 0).forEach(site => {
        entries.push({
          date: day.date,
          site: site.name,
          total: site.total,
          code: sites.find(sd => sd.name === site.name)?.code || ""
        });
      });
    });
    return entries.slice(0, 6);
  }, [data.dailyHistory, sites]);

  const handleEditFromHistory = (entry: any) => {
    const [d, m, y] = entry.date.split('/');
    const dateValue = `${y}-${m}-${d}`;
    const siteIdx = sites.findIndex(s => s.name === entry.site);
    
    setFormData({
      ...formData,
      siteIndex: siteIdx.toString(),
      date: dateValue
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const calculatedFields = useMemo(() => {
    if (!formData.date) return { endOfMonth: "", monthName: "" };
    const d = new Date(formData.date);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const day = String(lastDay.getDate()).padStart(2, '0');
    const month = String(lastDay.getMonth() + 1).padStart(2, '0');
    const year = lastDay.getFullYear();
    const endOfMonth = `${day}/${month}/${year}`;
    const monthName = MONTHS_FR_UPPER[d.getMonth()];
    return { endOfMonth, monthName };
  }, [formData.date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSite || !scriptUrl) return;
    
    setStatus('submitting');
    
    const [y, m, d] = formData.date.split('-');
    const payload = {
      type: 'DATA_ENTRY',
      "Date Collecte": `${d}/${m}/${y}`,
      "Code site": selectedSite.code.toString(),
      "Libelle site": selectedSite.name,
      "Date fin mois": calculatedFields.endOfMonth,
      "NombreFixe": Number(formData.fixe) || 0,
      "NombreMobile": totalMobile,
      "Total poches": totalPoches,
      "Mois": calculatedFields.monthName,
      "Mode": isEditing ? "UPDATE" : "APPEND",
      "Auteur": user ? `${user.prenoms} ${user.nom}` : "Système",
      "AuteurEmail": user?.email || ""
    };

    // 1. MISE À JOUR OPTIMISTE LOCALE (INSTANTANÉE)
    if (onOptimisticUpdate) {
       onOptimisticUpdate(payload);
    }

    // 2. SAUVEGARDE RÉELLE EN ARRIÈRE-PLAN
    (async () => {
       try {
         await saveRecordToSheet(scriptUrl, payload);
         await saveRecordToSheet(scriptUrl, {
           type: 'LOG_EVENT',
           action: isEditing ? 'MISE_A_JOUR' : 'SAISIE',
           user: user ? `${user.prenoms} ${user.nom}` : "Système",
           email: user?.email || "",
           details: `${isEditing ? 'Modification' : 'Nouvelle saisie'} pour ${selectedSite.name} le ${d}/${m}/${y} : ${totalPoches} poches`
         });
         
         // On attend un peu que Google traite avant de rafraîchir silencieusement
         setTimeout(() => {
            if (onSyncRequest) onSyncRequest();
         }, 5000);
       } catch (err) {
         console.error("Background save failed:", err);
       }
    })();

    // On bascule tout de suite sur un état de succès visuel (UI fluide)
    setTimeout(() => {
      setStatus('success');
    }, 400);
  };

  const handleReset = () => {
    setFormData({
      siteIndex: "",
      date: new Date().toISOString().split('T')[0],
      fixe: "",
      mobile1: "",
      mobile2: "",
      mobile3: ""
    });
    setIsEditing(false);
    setStatus('idle');
  };

  if (status === 'success') {
    return (
      <div className="max-w-xl mx-auto py-10 text-center animate-in zoom-in duration-300">
        <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-green-100 flex flex-col items-center">
          <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-green-100">
            <CheckCircle2 size={40} className="animate-in zoom-in duration-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-2">
            Mise à jour Réussie !
          </h2>
          <p className="text-slate-500 text-sm mb-10 font-medium px-6 leading-relaxed">
            Vos données ont été injectées localement. Tous les menus de l'application (Cockpit, Pulse, Résumé) affichent désormais les nouveaux totaux. La base de données distante est synchronisée en tâche de fond.
          </p>
          <button onClick={handleReset} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all">
            <RefreshCw size={18} /> Faire une autre saisie
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className={`bg-white rounded-[3rem] shadow-2xl border ${isEditing ? 'border-blue-200' : 'border-slate-100'} overflow-hidden transition-all duration-500`}>
        <div className={`${isEditing ? 'bg-blue-50/80' : 'bg-slate-50/80'} p-8 lg:p-12 border-b border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-8 transition-colors duration-500`}>
          <div className="flex items-center gap-6">
            <div className={`w-14 h-14 ${isEditing ? 'bg-blue-600' : 'bg-red-600'} rounded-2xl flex items-center justify-center text-white shadow-xl transition-colors duration-500`}>
              {isEditing ? <Edit3 size={28} /> : <Plus size={28} />}
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-black uppercase tracking-tighter text-slate-900">
                {isEditing ? "Modification de Saisie" : "Nouveau Relevé"}
              </h2>
              <p className={`text-[9px] font-black uppercase tracking-[0.3em] mt-1 italic ${isEditing ? 'text-blue-600' : 'text-slate-400'}`}>
                Mise à jour instantanée des tableaux de bord
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             {isEditing && (
               <button onClick={handleReset} type="button" className="p-4 bg-white border border-blue-200 text-blue-600 rounded-2xl hover:bg-blue-100 transition-all" title="Annuler la modification">
                 <XCircle size={24} />
               </button>
             )}
             <div className="bg-slate-900 px-8 py-5 rounded-[2rem] text-center shadow-xl">
                <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Poches détectées</p>
                <p className="text-3xl font-black text-white leading-none">{totalPoches}</p>
             </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 lg:p-12 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Structure de prélèvement</label>
                <div className="relative">
                  <select required disabled={isEditing && status === 'submitting'} value={formData.siteIndex} onChange={(e) => setFormData({...formData, siteIndex: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black text-slate-800 outline-none appearance-none transition-all focus:ring-4 ring-blue-50">
                    <option value="">Sélectionner un site...</option>
                    {sites.map((s, idx) => <option key={idx} value={idx}>{s.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Date de l'Activité</label>
                <input type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black text-slate-800 outline-none focus:ring-4 ring-blue-50 transition-all" />
              </div>
              <div className={`p-8 rounded-[2.5rem] border space-y-4 transition-colors ${isEditing ? 'bg-blue-50 border-blue-100' : 'bg-emerald-50 border-emerald-100'}`}>
                <label className={`text-[10px] font-black uppercase tracking-widest ${isEditing ? 'text-blue-600' : 'text-emerald-600'}`}>Nombre de Poches (FIXE)</label>
                <input type="number" min="0" placeholder="0" value={formData.fixe} onChange={(e) => setFormData({...formData, fixe: e.target.value})} className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-6 text-4xl font-black text-slate-800 outline-none text-center shadow-inner focus:ring-4 ring-blue-100" />
              </div>
            </div>
            <div className="space-y-6">
              <div className={`p-8 rounded-[3rem] border space-y-6 transition-colors ${isEditing ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
                <div className="flex justify-between items-center">
                  <label className={`text-[10px] font-black uppercase tracking-widest ${isEditing ? 'text-blue-600' : 'text-orange-600'}`}>Nombre de Poches (MOBILE)</label>
                  <div className={`${isEditing ? 'bg-blue-600' : 'bg-orange-600'} text-white px-3 py-1 rounded-full text-[10px] font-black`}>SOMME : {totalMobile}</div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <input type="number" min="0" placeholder="Saisie 1" value={formData.mobile1} onChange={(e) => setFormData({...formData, mobile1: e.target.value})} className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-2xl font-black text-slate-700 outline-none text-center shadow-sm focus:ring-4 ring-blue-100" />
                  <input type="number" min="0" placeholder="Saisie 2" value={formData.mobile2} onChange={(e) => setFormData({...formData, mobile2: e.target.value})} className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-2xl font-black text-slate-700 outline-none text-center shadow-sm focus:ring-4 ring-blue-100" />
                  <input type="number" min="0" placeholder="Saisie 3" value={formData.mobile3} onChange={(e) => setFormData({...formData, mobile3: e.target.value})} className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-2xl font-black text-slate-700 outline-none text-center shadow-sm focus:ring-4 ring-blue-100" />
                </div>
              </div>
            </div>
          </div>

          {status === 'error' && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase flex items-center gap-3"><AlertCircle size={20} /><p>{errorMessage}</p></div>}
          
          <button type="submit" disabled={!selectedSite || status === 'submitting'} className={`w-full ${isEditing ? 'bg-blue-600 shadow-blue-200' : 'bg-red-600 shadow-red-200'} text-white py-8 rounded-[2.5rem] font-black text-lg uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-4 disabled:opacity-30 active:scale-95`}>
            {status === 'submitting' ? <Loader2 className="animate-spin" size={28} /> : (isEditing ? <Save size={28} /> : <Plus size={28} />)}
            {status === 'submitting' ? "Synchronisation Locale..." : (isEditing ? "Valider la modification" : "Injecter dans DATABASE1")}
          </button>
        </form>
      </div>

      <div className="bg-slate-50 rounded-[3rem] p-10 border border-slate-200">
         <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm"><History size={24} /></div>
            <div>
               <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">Saisies Récentes</h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Modifier rapidement les derniers enregistrements</p>
            </div>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentEntries.map((entry, idx) => (
              <button 
                key={idx} 
                type="button"
                onClick={() => handleEditFromHistory(entry)}
                className="bg-white p-5 rounded-[2rem] border border-slate-200 hover:border-blue-400 hover:shadow-xl transition-all text-left group flex items-center justify-between"
              >
                <div>
                   <p className="text-[8px] font-black text-slate-300 uppercase mb-1">{entry.date} • {entry.code}</p>
                   <p className="text-xs font-black text-slate-800 uppercase truncate max-w-[150px]">{entry.site}</p>
                   <p className="text-lg font-black text-blue-600">{entry.total} <span className="text-[8px] uppercase text-slate-300">Poches</span></p>
                </div>
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                   <ArrowRight size={18} />
                </div>
              </button>
            ))}
            {recentEntries.length === 0 && (
               <div className="col-span-full py-10 text-center text-slate-300 italic text-sm">Aucun historique local disponible pour le moment.</div>
            )}
         </div>
      </div>
    </div>
  );
};
