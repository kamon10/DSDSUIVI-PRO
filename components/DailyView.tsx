
import React, { useState, useMemo, useEffect } from 'react';
import { DashboardData } from '../types';
import { Calendar, ChevronDown, Zap, Layers, Activity, TrendingUp, Filter, Building2, Truck, AlertCircle, Clock, MessageSquare } from 'lucide-react';
import { COLORS, SITES_DATA } from '../constants';

interface DailyViewProps {
  data: DashboardData;
}

export const DailyView: React.FC<DailyViewProps> = ({ data }) => {
  const [selectedDate, setSelectedDate] = useState<string>("");

  useEffect(() => {
    if (data.dailyHistory.length > 0) {
      const exists = data.dailyHistory.some(h => h.date === selectedDate);
      if (!selectedDate || !exists) {
        setSelectedDate(data.dailyHistory[0].date);
      }
    }
  }, [data.dailyHistory, selectedDate]);

  const currentRecord = useMemo(() => {
    if (data.dailyHistory.length === 0) return null;
    return data.dailyHistory.find(r => r.date === selectedDate) || data.dailyHistory[0];
  }, [selectedDate, data.dailyHistory]);

  const activeSites = useMemo(() => {
    if (!currentRecord) return [];
    return currentRecord.sites.filter(site => site.total > 0);
  }, [currentRecord]);

  const missingSites = useMemo(() => {
    if (!currentRecord) return [];
    const activeNames = new Set(activeSites.map(s => s.name.trim().toUpperCase()));
    return SITES_DATA.filter(site => !activeNames.has(site.name.trim().toUpperCase()));
  }, [activeSites, currentRecord]);

  const totals = useMemo(() => {
    if (!currentRecord) return { fixed: 0, mobile: 0, total: 0 };
    return currentRecord.sites.reduce((acc, site) => ({
      // Fixed: use 'site.fixe' instead of 'site.fixed' as per types.ts interface
      fixed: acc.fixed + (site.fixe || 0),
      mobile: acc.mobile + (site.mobile || 0),
      total: acc.total + (site.total || 0)
    }), { fixed: 0, mobile: 0, total: 0 });
  }, [currentRecord]);

  const handleWhatsAppRelauch = (site: any) => {
    if (!site.phone) return;
    
    // Nettoyage du numéro : enlever les espaces et ajouter l'indicatif pays
    const cleanPhone = site.phone.replace(/\s/g, '');
    const formattedPhone = cleanPhone.startsWith('225') ? cleanPhone : `225${cleanPhone}`;
    
    const message = encodeURIComponent(
      `Données de prélèvement pour le site *${site.name}* pour la journée du *${selectedDate}*.\n\nMerci de bien vouloir communiquer vos chiffres de prélèvements dès que possible.\n\nCordialement,\nLa DSD CNTSCI.`
    );
    
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
  };

  if (!currentRecord) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* HEADER BLUE/INDIGO */}
      <div className="relative overflow-hidden bg-blue-600 rounded-[3rem] p-10 lg:p-14 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-400/20 blur-[120px] rounded-full -mr-32 -mt-32"></div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-8">
            <div className="w-16 h-16 lg:w-20 lg:h-20 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-inner border border-white/20">
              <Activity size={36} className="text-white" />
            </div>
            <div>
              <h2 className="text-3xl lg:text-4xl font-black uppercase tracking-tighter leading-tight">Journal Quotidien</h2>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <div className="flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full border border-white/10">
                   <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]"></div>
                   <span className="text-[10px] font-black uppercase tracking-widest">{activeSites.length} SITES ACTIFS</span>
                </div>
                {missingSites.length > 0 && (
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-red-500/20 rounded-full border border-red-400/30">
                     <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                     <span className="text-[10px] font-black uppercase tracking-widest">{missingSites.length} EN ATTENTE</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="relative bg-white/10 backdrop-blur-xl rounded-[2rem] px-8 py-5 flex items-center gap-4 w-full lg:w-auto border border-white/10">
            <Filter size={18} className="text-blue-200" />
            <select 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm font-black uppercase tracking-widest outline-none cursor-pointer w-full text-white"
            >
              {data.dailyHistory.map(record => (
                <option key={record.date} value={record.date} className="text-slate-900">{record.date}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI GRID 3 COLORS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white rounded-[2.5rem] p-10 border border-emerald-100 shadow-xl transition-all hover:scale-[1.02] border-b-[6px] border-b-emerald-500">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><Building2 size={20}/></div>
             <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Fixe</p>
          </div>
          <p className="text-6xl font-black text-slate-900 tracking-tighter">{totals.fixed}</p>
        </div>
        
        <div className="bg-white rounded-[2.5rem] p-10 border border-amber-100 shadow-xl transition-all hover:scale-[1.02] border-b-[6px] border-b-amber-500">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center"><Truck size={20}/></div>
             <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Total Mobile</p>
          </div>
          <p className="text-6xl font-black text-slate-900 tracking-tighter">{totals.mobile}</p>
        </div>
        
        <div className="bg-[#0f172a] rounded-[2.5rem] p-10 shadow-2xl transition-all hover:scale-[1.02] border-b-[6px] border-b-blue-600">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center"><Zap size={20}/></div>
             <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Cumul Journée</p>
          </div>
          <p className="text-7xl font-black text-white tracking-tighter">{totals.total}</p>
        </div>
      </div>

      {/* SECTION SITES MANQUANTS AVEC RELANCE WHATSAPP */}
      {missingSites.length > 0 && (
        <div className="bg-white rounded-[3rem] shadow-xl border border-red-100 overflow-hidden">
          <div className="px-10 py-6 bg-red-50 border-b border-red-100 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-red-500 shadow-sm">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="font-black text-lg text-red-900 uppercase tracking-tight">Sites en attente de saisie ({missingSites.length})</h3>
                <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest">Aucune donnée reçue pour le {selectedDate}</p>
              </div>
            </div>
            <div className="hidden md:block">
               <span className="text-[8px] font-black text-red-300 uppercase tracking-[0.3em]">Action requise immédiate</span>
            </div>
          </div>
          <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-red-50/20">
            {missingSites.map((site, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-red-50 shadow-sm group hover:border-emerald-200 transition-all">
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center text-red-300 group-hover:bg-emerald-50 group-hover:text-emerald-400 transition-colors">
                    <Building2 size={16} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[10px] font-black text-slate-700 uppercase leading-none truncate">{site.name}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 truncate">{site.manager || site.region}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  {site.phone ? (
                    <button 
                      onClick={() => handleWhatsAppRelauch(site)}
                      className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center hover:bg-emerald-600 hover:scale-110 active:scale-95 transition-all shadow-lg shadow-emerald-100"
                      title="Relancer par WhatsApp"
                    >
                      <MessageSquare size={16} />
                    </button>
                  ) : (
                    <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse mr-2"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TABLEAU LISTE */}
      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="px-10 py-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-black text-xl text-slate-900 uppercase tracking-tight">Liste des collectes du {currentRecord.date}</h3>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] bg-white px-4 py-2 rounded-full border border-slate-200">Data Source A-J</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b bg-slate-50/20">
                <th className="px-10 py-6 text-left">Site de Collecte</th>
                <th className="px-6 py-6 text-center">Site Fixe</th>
                <th className="px-6 py-6 text-center">Site Mobile</th>
                <th className="px-10 py-6 text-right">Total Jour</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {activeSites.map((site, idx) => (
                <tr key={idx} className="hover:bg-blue-50/30 transition-all group cursor-default">
                  <td className="px-10 py-6">
                     <p className="font-black text-slate-800 text-base uppercase group-hover:text-blue-600 transition-colors">{site.name}</p>
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{site.region || "DIRECTION NATIONALE"}</p>
                  </td>
                  <td className="px-6 py-6 text-center">
                    <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black">{site.fixe}</span>
                  </td>
                  <td className="px-6 py-6 text-center">
                    <span className="px-4 py-1.5 bg-amber-50 text-amber-600 rounded-full text-xs font-black">{site.mobile}</span>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <span className="text-2xl font-black text-slate-900 group-hover:scale-110 inline-block transition-transform">{site.total}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-[#0f172a] text-white font-black text-sm">
              <tr>
                <td className="px-10 py-8 uppercase tracking-[0.2em]">TOTAL NATIONAL CONSOLIDÉ</td>
                <td className="px-6 py-8 text-center text-emerald-400">{totals.fixed}</td>
                <td className="px-6 py-8 text-center text-amber-400">{totals.mobile}</td>
                <td className="px-10 py-8 text-right text-3xl font-black text-blue-400 bg-white/5">{totals.total}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
