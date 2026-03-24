
import React, { useState, useMemo, useEffect } from 'react';
import { Building2, Calendar as CalendarIcon, Save, CheckCircle2, AlertCircle, RefreshCw, ChevronDown, Edit3, Loader2, ArrowLeft, ArrowRight, Search, Filter, Table as TableIcon, Info } from 'lucide-react';
import { saveRecordToSheet } from '../services/googleSheetService';
import { DashboardData, User } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parse } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MonthlyEntryViewProps {
  scriptUrl: string | null;
  data: DashboardData;
  user: User | null;
  sites: any[];
  onSyncRequest?: () => void;
  onOptimisticUpdate?: (payload: any) => void;
}

const MONTHS = [
  { value: 0, label: 'Janvier' },
  { value: 1, label: 'Février' },
  { value: 2, label: 'Mars' },
  { value: 3, label: 'Avril' },
  { value: 4, label: 'Mai' },
  { value: 5, label: 'Juin' },
  { value: 6, label: 'Juillet' },
  { value: 7, label: 'Août' },
  { value: 8, label: 'Septembre' },
  { value: 9, label: 'Octobre' },
  { value: 10, label: 'Novembre' },
  { value: 11, label: 'Décembre' }
];

const MONTHS_FR_UPPER = [
  "JANVIER", "FEVRIER", "MARS", "AVRIL", "MAI", "JUIN",
  "JUILLET", "AOUT", "SEPTEMBRE", "OCTOBRE", "Novembre", "DECEMBRE"
];

export const MonthlyEntryView: React.FC<MonthlyEntryViewProps> = ({ scriptUrl, data, user, sites, onSyncRequest, onOptimisticUpdate }) => {
  const [selectedSiteIndex, setSelectedSiteIndex] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ fixe: 0, mobile: 0 });
  const [submittingDay, setSubmittingDay] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  const selectedSite = useMemo(() => {
    if (selectedSiteIndex === "") return null;
    return sites[parseInt(selectedSiteIndex)];
  }, [selectedSiteIndex, sites]);

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(new Date(selectedYear, selectedMonth));
    const end = endOfMonth(start);
    return eachDayOfInterval({ start, end });
  }, [selectedMonth, selectedYear]);

  const monthlyData = useMemo(() => {
    if (!selectedSite) return [];

    return daysInMonth.map(day => {
      const dateStr = format(day, 'dd/MM/yyyy');
      const historyDay = data.dailyHistory.find(h => h.date === dateStr);
      const siteData = historyDay?.sites.find(s => s.name.toUpperCase() === selectedSite.name.toUpperCase());

      return {
        date: day,
        dateStr,
        fixe: siteData?.fixe || 0,
        mobile: siteData?.mobile || 0,
        total: siteData?.total || 0,
        exists: !!siteData && siteData.total > 0
      };
    });
  }, [selectedSite, daysInMonth, data.dailyHistory]);

  const handleStartEdit = (dayData: any) => {
    setEditingDay(dayData.dateStr);
    setEditValues({ fixe: dayData.fixe, mobile: dayData.mobile });
  };

  const handleCancelEdit = () => {
    setEditingDay(null);
  };

  const handleSaveRow = async (dayData: any) => {
    if (!selectedSite || !scriptUrl) return;
    
    setSubmittingDay(dayData.dateStr);
    setStatus({ type: null, message: '' });

    const dateObj = dayData.date;
    const d = String(dateObj.getDate()).padStart(2, '0');
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const y = dateObj.getFullYear();
    
    // Calculate end of month for the payload
    const lastDayOfMonth = endOfMonth(dateObj);
    const endOfMonthStr = format(lastDayOfMonth, 'dd/MM/yyyy');
    const monthName = MONTHS_FR_UPPER[dateObj.getMonth()];

    const totalPoches = Number(editValues.fixe) + Number(editValues.mobile);

    const payload = {
      type: 'DATA_ENTRY',
      "Date Collecte": `${d}/${m}/${y}`,
      "Code site": selectedSite.code.toString(),
      "Libelle site": selectedSite.name,
      "Date fin mois": endOfMonthStr,
      "NombreFixe": Number(editValues.fixe) || 0,
      "NombreMobile": Number(editValues.mobile) || 0,
      "Total poches": totalPoches,
      "Mois": monthName,
      "Mode": dayData.exists ? "UPDATE" : "APPEND",
      "Auteur": user ? `${user.prenoms} ${user.nom}` : "Système",
      "AuteurEmail": user?.email || ""
    };

    try {
      // Optimistic update
      if (onOptimisticUpdate) {
        onOptimisticUpdate(payload);
      }

      await saveRecordToSheet(scriptUrl, payload);
      
      // Log event
      await saveRecordToSheet(scriptUrl, {
        type: 'LOG_EVENT',
        action: dayData.exists ? 'MISE_A_JOUR' : 'SAISIE',
        user: user ? `${user.prenoms} ${user.nom}` : "Système",
        email: user?.email || "",
        details: `Modification mensuelle pour ${selectedSite.name} le ${dayData.dateStr} : ${totalPoches} poches`
      });

      setStatus({ type: 'success', message: `Enregistré pour le ${dayData.dateStr}` });
      setEditingDay(null);
      
      if (onSyncRequest) {
        setTimeout(onSyncRequest, 2000);
      }
    } catch (err: any) {
      console.error("Save failed:", err);
      setStatus({ type: 'error', message: `Erreur: ${err.message}` });
    } finally {
      setSubmittingDay(null);
      setTimeout(() => setStatus({ type: null, message: '' }), 3000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 p-8 lg:p-12">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 mb-12">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
              <TableIcon size={28} />
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-black uppercase tracking-tighter text-slate-900">
                Modification Mensuelle
              </h2>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] mt-1 text-slate-400 italic">
                Ajustement des prélèvements par site et par jour
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-2">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Site</label>
              <div className="relative">
                <select 
                  value={selectedSiteIndex} 
                  onChange={(e) => setSelectedSiteIndex(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-black text-slate-800 outline-none appearance-none pr-10"
                >
                  <option value="">Choisir un site...</option>
                  {sites.map((s, idx) => <option key={idx} value={idx}>{s.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Mois</label>
              <div className="relative">
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-black text-slate-800 outline-none appearance-none pr-10"
                >
                  {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Année</label>
              <div className="relative">
                <select 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-black text-slate-800 outline-none appearance-none pr-10"
                >
                  {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              </div>
            </div>
          </div>
        </div>

        {!selectedSite ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
              <Search size={40} />
            </div>
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Veuillez sélectionner un site pour commencer</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[2rem] border border-slate-100 shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Date</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Fixe</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Mobile</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Total</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {monthlyData.map((day) => {
                  const isEditing = editingDay === day.dateStr;
                  const isSubmitting = submittingDay === day.dateStr;

                  return (
                    <tr key={day.dateStr} className={`hover:bg-slate-50/50 transition-colors ${isEditing ? 'bg-indigo-50/30' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-900">{day.dateStr}</span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                            {format(day.date, 'EEEE', { locale: fr })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isEditing ? (
                          <input 
                            type="number" 
                            value={editValues.fixe} 
                            onChange={(e) => setEditValues({...editValues, fixe: parseInt(e.target.value) || 0})}
                            className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 text-center font-black text-indigo-600 outline-none focus:ring-2 ring-indigo-100"
                          />
                        ) : (
                          <span className={`text-sm font-black ${day.fixe > 0 ? 'text-indigo-600' : 'text-slate-300'}`}>{day.fixe}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isEditing ? (
                          <input 
                            type="number" 
                            value={editValues.mobile} 
                            onChange={(e) => setEditValues({...editValues, mobile: parseInt(e.target.value) || 0})}
                            className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 text-center font-black text-emerald-600 outline-none focus:ring-2 ring-emerald-100"
                          />
                        ) : (
                          <span className={`text-sm font-black ${day.mobile > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>{day.mobile}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-sm font-black ${day.total > 0 ? 'text-slate-900' : 'text-slate-200'}`}>
                          {isEditing ? (Number(editValues.fixe) + Number(editValues.mobile)) : day.total}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={handleCancelEdit}
                              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                              title="Annuler"
                            >
                              <RefreshCw size={16} />
                            </button>
                            <button 
                              onClick={() => handleSaveRow(day)}
                              disabled={isSubmitting}
                              className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
                              title="Enregistrer"
                            >
                              {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleStartEdit(day)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Modifier"
                          >
                            <Edit3 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {status.type && (
        <div className={`fixed bottom-8 right-8 p-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50 animate-in slide-in-from-bottom-4 duration-300 ${status.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
          {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="text-xs font-black uppercase tracking-tight">{status.message}</span>
        </div>
      )}

      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-blue-400">
            <Info size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black uppercase tracking-tighter">Mode Édition Mensuelle</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ajustement rapide des données historiques</p>
          </div>
        </div>
        <p className="text-xs font-medium text-slate-400 leading-relaxed max-w-3xl">
          Cette vue vous permet de parcourir tous les jours du mois sélectionné pour un site donné. 
          Vous pouvez corriger les erreurs de saisie passées ou compléter les jours manquants. 
          Chaque modification est enregistrée individuellement et synchronisée avec la base de données centrale.
        </p>
      </div>
    </div>
  );
};
