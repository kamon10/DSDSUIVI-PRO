
import React, { useState, useMemo, useEffect } from 'react';
import { Building2, Calendar as CalendarIcon, Save, CheckCircle2, AlertCircle, RefreshCw, Send, ChevronDown, Hash, Settings, Info, Calculator, Edit3, Plus, Smartphone, History, ArrowRight, XCircle, CloudUpload, Loader2, Zap, Truck } from 'lucide-react';
import { motion } from 'motion/react';
import { saveRecordToSheet } from '../services/googleSheetService';
import { DashboardData, User } from '../types';
import DatePicker, { registerLocale } from "react-datepicker";
import { fr } from 'date-fns/locale';
import "react-datepicker/dist/react-datepicker.css";

registerLocale('fr', fr);

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
      <div className="max-w-xl mx-auto py-16 text-center animate-in zoom-in duration-500">
        <div className="card-professional p-16 bg-white/90 backdrop-blur-sm flex flex-col items-center border-emerald-100">
          <div className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-emerald-200">
            <CheckCircle2 size={48} className="animate-in zoom-in duration-700" />
          </div>
          <h2 className="text-3xl font-display font-black text-slate-950 uppercase tracking-tighter mb-4">
            Mise à jour Réussie !
          </h2>
          <p className="text-slate-500 text-sm mb-12 font-medium px-8 leading-relaxed">
            Vos données ont été injectées localement. Tous les menus de l'application (Cockpit, Pulse, Résumé) affichent désormais les nouveaux totaux. La base de données distante est synchronisée en tâche de fond.
          </p>
          <button onClick={handleReset} className="w-full bg-slate-950 text-white py-6 rounded-2xl font-display font-black text-[11px] uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/20 active:scale-95">
            <RefreshCw size={20} /> Faire une autre saisie
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-16 pb-24">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`card-professional bg-white/90 backdrop-blur-sm border-2 ${isEditing ? 'border-blue-500/20 shadow-blue-500/10' : 'border-white/60'} overflow-hidden transition-all duration-700`}
      >
        <div className={`${isEditing ? 'bg-blue-50/50' : 'bg-slate-50/50'} p-10 lg:p-16 border-b border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-10 transition-colors duration-700`}>
          <div className="flex items-center gap-8">
            <div className={`w-16 h-16 ${isEditing ? 'bg-blue-600' : 'bg-slate-950'} rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl transition-all duration-700`}>
              {isEditing ? <Edit3 size={32} /> : <Plus size={32} />}
            </div>
            <div>
              <h2 className="text-3xl lg:text-4xl font-display font-black uppercase tracking-tighter text-slate-950">
                {isEditing ? "Modification de Saisie" : "Nouveau Relevé"}
              </h2>
              <p className={`text-[11px] font-display font-bold uppercase tracking-[0.3em] mt-2 italic ${isEditing ? 'text-blue-600' : 'text-slate-400'}`}>
                Mise à jour instantanée des tableaux de bord
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
             {isEditing && (
               <button onClick={handleReset} type="button" className="p-5 bg-white border border-blue-200 text-blue-600 rounded-2xl hover:bg-blue-50 transition-all shadow-sm active:scale-95" title="Annuler la modification">
                 <XCircle size={28} />
               </button>
             )}
             <div className="bg-slate-950 px-10 py-6 rounded-[2.5rem] text-center shadow-2xl border border-white/10">
                <p className="text-[10px] font-display font-black text-white/30 uppercase tracking-[0.3em] mb-2">Poches détectées</p>
                <p className="text-4xl font-display font-black text-white leading-none tracking-tighter">{totalPoches}</p>
             </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-10 lg:p-16 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-10">
              <div className="space-y-4">
                <label className="text-[11px] font-display font-black text-slate-400 uppercase tracking-[0.25em] ml-2">Structure de prélèvement</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Building2 size={20} />
                  </div>
                  <select required disabled={isEditing && status === 'submitting'} value={formData.siteIndex} onChange={(e) => setFormData({...formData, siteIndex: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-16 pr-12 py-5 text-sm font-display font-black text-slate-950 outline-none appearance-none transition-all focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5">
                    <option value="">Sélectionner un site...</option>
                    {sites.map((s, idx) => <option key={idx} value={idx}>{s.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[11px] font-display font-black text-slate-400 uppercase tracking-[0.25em] ml-2">Date de l'Activité</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors z-10">
                    <CalendarIcon size={20} />
                  </div>
                  <DatePicker
                    selected={formData.date ? new Date(formData.date) : null}
                    onChange={(date: Date | null) => {
                      if (date) {
                        const y = date.getFullYear();
                        const m = String(date.getMonth() + 1).padStart(2, '0');
                        const d = String(date.getDate()).padStart(2, '0');
                        setFormData({...formData, date: `${y}-${m}-${d}`});
                      }
                    }}
                    dateFormat="dd/MM/yyyy"
                    locale="fr"
                    required
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-16 pr-12 py-5 text-sm font-display font-black text-slate-950 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                    wrapperClassName="w-full"
                  />
                </div>
              </div>
              <div className={`p-10 rounded-[3rem] border-2 space-y-6 transition-all duration-700 ${isEditing ? 'bg-blue-50/50 border-blue-500/10' : 'bg-emerald-50/50 border-emerald-500/10'}`}>
                <div className="flex items-center gap-4 mb-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${isEditing ? 'bg-blue-500' : 'bg-emerald-500'}`}>
                    <Zap size={20} />
                  </div>
                  <label className={`text-[11px] font-display font-black uppercase tracking-[0.25em] ${isEditing ? 'text-blue-600' : 'text-emerald-600'}`}>Nombre de Poches (FIXE)</label>
                </div>
                <input type="number" inputMode="numeric" min="0" placeholder="0" value={formData.fixe} onChange={(e) => setFormData({...formData, fixe: e.target.value})} className="w-full bg-white border border-slate-100 rounded-2xl px-8 py-8 text-6xl font-display font-black text-slate-950 outline-none text-center shadow-inner focus:ring-4 focus:ring-blue-500/5 transition-all" />
              </div>
            </div>
            <div className="space-y-8">
              <div className={`p-10 rounded-[3.5rem] border-2 space-y-8 transition-all duration-700 h-full flex flex-col ${isEditing ? 'bg-blue-50/50 border-blue-500/10' : 'bg-orange-50/50 border-orange-500/10'}`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${isEditing ? 'bg-blue-500' : 'bg-orange-500'}`}>
                      <Truck size={20} />
                    </div>
                    <label className={`text-[11px] font-display font-black uppercase tracking-[0.25em] ${isEditing ? 'text-blue-600' : 'text-orange-600'}`}>Nombre de Poches (MOBILE)</label>
                  </div>
                  <div className={`${isEditing ? 'bg-blue-600' : 'bg-orange-600'} text-white px-4 py-1.5 rounded-xl text-[11px] font-display font-black uppercase tracking-widest shadow-lg`}>SOMME : {totalMobile}</div>
                </div>
                <div className="grid grid-cols-1 gap-6 flex-1">
                  <input type="number" inputMode="numeric" min="0" placeholder="Saisie 1" value={formData.mobile1} onChange={(e) => setFormData({...formData, mobile1: e.target.value})} className="w-full bg-white border border-slate-100 rounded-2xl px-8 py-6 text-3xl font-display font-black text-slate-700 outline-none text-center shadow-sm focus:ring-4 focus:ring-blue-500/5 transition-all" />
                  <input type="number" inputMode="numeric" min="0" placeholder="Saisie 2" value={formData.mobile2} onChange={(e) => setFormData({...formData, mobile2: e.target.value})} className="w-full bg-white border border-slate-100 rounded-2xl px-8 py-6 text-3xl font-display font-black text-slate-700 outline-none text-center shadow-sm focus:ring-4 focus:ring-blue-500/5 transition-all" />
                  <input type="number" inputMode="numeric" min="0" placeholder="Saisie 3" value={formData.mobile3} onChange={(e) => setFormData({...formData, mobile3: e.target.value})} className="w-full bg-white border border-slate-100 rounded-2xl px-8 py-6 text-3xl font-display font-black text-slate-700 outline-none text-center shadow-sm focus:ring-4 focus:ring-blue-500/5 transition-all" />
                </div>
              </div>
            </div>
          </div>

          {status === 'error' && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-rose-50 text-rose-600 rounded-2xl text-[11px] font-display font-black uppercase tracking-widest flex items-center gap-4 border border-rose-100 shadow-sm"><AlertCircle size={24} /><p>{errorMessage}</p></motion.div>}
          
          <button type="submit" disabled={!selectedSite || status === 'submitting'} className={`w-full ${isEditing ? 'bg-blue-600 shadow-blue-500/20' : 'bg-slate-950 shadow-slate-900/20'} text-white py-8 rounded-[2.5rem] font-display font-black text-lg uppercase tracking-[0.3em] shadow-2xl transition-all flex items-center justify-center gap-6 disabled:opacity-30 active:scale-[0.98] group`}>
            {status === 'submitting' ? <Loader2 className="animate-spin" size={32} /> : (isEditing ? <Save size={32} /> : <Plus size={32} />)}
            {status === 'submitting' ? "Synchronisation Locale..." : (isEditing ? "Valider la modification" : "Injecter dans DATABASE1")}
          </button>
        </form>
      </motion.div>

      <div className="bg-slate-50/50 backdrop-blur-sm rounded-[4rem] p-12 lg:p-16 border border-slate-200/50 shadow-inner">
         <div className="flex items-center gap-6 mb-12">
            <div className="w-16 h-16 bg-white rounded-[1.5rem] flex items-center justify-center text-slate-400 shadow-xl border border-slate-100"><History size={28} /></div>
            <div>
               <h3 className="text-3xl font-display font-black uppercase tracking-tighter text-slate-950">Saisies Récentes</h3>
               <p className="text-[11px] font-display font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Modifier rapidement les derniers enregistrements</p>
            </div>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {recentEntries.map((entry, idx) => (
              <motion.button 
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                key={idx} 
                type="button"
                onClick={() => handleEditFromHistory(entry)}
                className="bg-white p-8 rounded-[2.5rem] border border-slate-100 hover:border-blue-400 hover:shadow-2xl transition-all text-left group flex items-center justify-between relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                   <p className="text-[10px] font-display font-black text-slate-300 uppercase tracking-widest mb-2 group-hover:text-blue-400 transition-colors">{entry.date} • {entry.code}</p>
                   <p className="text-sm font-display font-black text-slate-950 uppercase tracking-tight truncate max-w-[180px] mb-4">{entry.site}</p>
                   <div className="flex items-baseline gap-2">
                     <p className="text-3xl font-display font-black text-blue-600">{entry.total}</p>
                     <span className="text-[10px] uppercase font-display font-black text-slate-300 tracking-widest">Poches</span>
                   </div>
                </div>
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner relative z-10">
                   <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.button>
            ))}
            {recentEntries.length === 0 && (
               <div className="col-span-full py-20 text-center text-slate-300 italic font-display font-medium text-lg">Aucun historique local disponible pour le moment.</div>
            )}
         </div>
      </div>
    </div>
  );

};
