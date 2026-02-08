
import React, { useState, useMemo, useEffect } from 'react';
import { Building2, Calendar, Save, CheckCircle2, AlertCircle, RefreshCw, Send, ChevronDown, Hash, Settings, Info, Calculator, Edit3, Plus, Smartphone, History, ArrowRight, XCircle } from 'lucide-react';
import { saveRecordToSheet } from '../services/googleSheetService';
import { SITES_DATA } from '../constants';
import { DashboardData } from '../types';

interface DataEntryFormProps {
  scriptUrl: string | null;
  data: DashboardData;
}

const MONTHS_FR_UPPER = [
  "JANVIER", "FEVRIER", "MARS", "AVRIL", "MAI", "JUIN",
  "JUILLET", "AOUT", "SEPTEMBRE", "OCTOBRE", "Novembre", "DECEMBRE"
];

export const DataEntryForm: React.FC<DataEntryFormProps> = ({ scriptUrl, data }) => {
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
    return SITES_DATA[parseInt(formData.siteIndex)];
  }, [formData.siteIndex]);

  // Détecter si une saisie existe déjà pour le site et la date sélectionnés
  useEffect(() => {
    if (selectedSite && formData.date) {
      const [y, m, d] = formData.date.split('-');
      const formattedDate = `${d}/${m}/${y}`;
      
      const existingDay = data.dailyHistory.find(h => h.date === formattedDate);
      const existingSiteData = existingDay?.sites.find(s => s.name.toUpperCase() === selectedSite.name.toUpperCase());
      
      if (existingSiteData && existingSiteData.total > 0) {
        setIsEditing(true);
        // On ne pré-remplit que si on n'est pas déjà en train de taper (pour éviter de reset les champs pendant la saisie)
        setFormData(prev => ({
          ...prev,
          fixe: existingSiteData.fixe,
          mobile1: existingSiteData.mobile,
          mobile2: "", // Les détails m1, m2, m3 sont agrégés dans le CSV
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
    // Liste des 5 dernières saisies toutes structures confondues
    const entries: any[] = [];
    data.dailyHistory.slice(0, 3).forEach(day => {
      day.sites.filter(s => s.total > 0).forEach(site => {
        entries.push({
          date: day.date,
          site: site.name,
          total: site.total,
          code: SITES_DATA.find(sd => sd.name === site.name)?.code || ""
        });
      });
    });
    return entries.slice(0, 5);
  }, [data.dailyHistory]);

  const handleEditFromHistory = (entry: any) => {
    const [d, m, y] = entry.date.split('/');
    const dateValue = `${y}-${m}-${d}`;
    const siteIdx = SITES_DATA.findIndex(s => s.name === entry.site);
    
    setFormData({
      ...formData,
      siteIndex: siteIdx.toString(),
      date: dateValue
    });
    // L'useEffect s'occupera du reste (remplissage des chiffres et passage en mode edit)
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
    try {
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
        "Mode": isEditing ? "UPDATE" : "APPEND"
      };

      await saveRecordToSheet(scriptUrl, payload);
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
          <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-100">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-2">
            {isEditing ? "Mise à jour Réussie" : "Transmission Réussie"}
          </h2>
          <p className="text-slate-500 text-sm mb-8 font-medium">Les données ont été injectées dans DATABASE1.</p>
          <button onClick={handleReset} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all">
            <RefreshCw size={18} /> Nouvelle saisie
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
                {isEditing ? "Vous modifiez une information déjà existante" : "Ajout d'une nouvelle ligne dans DATABASE1"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             {isEditing && (
               <button onClick={handleReset} className="p-4 bg-white border border-blue-200 text-blue-600 rounded-2xl hover:bg-blue-100 transition-all" title="Annuler la modification">
                 <XCircle size={24} />
               </button>
             )}
             <div className="bg-slate-900 px-8 py-5 rounded-[2rem] text-center shadow-xl">
                <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Total à injecter</p>
                <p className="text-3xl font-black text-white leading-none">{totalPoches}</p>
             </div>
          </div>
        </div>

        