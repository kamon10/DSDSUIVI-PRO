
import React, { useMemo, useState } from 'react';
import { DashboardData, GtsRecord } from '../types.ts';
import { Calendar, MapPin, Clock, CheckCircle2, AlertCircle, ChevronRight, Filter, Search, PlusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSiteByInput } from '../constants.tsx';

interface CollectionPlanningViewProps {
  data: DashboardData;
  branding: { logo: string; hashtag: string };
}

export const CollectionPlanningView: React.FC<CollectionPlanningViewProps> = ({ data, branding }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRegion, setFilterRegion] = useState('TOUS');

  const gtsData = data.gts || [];

  // 1. Extract realized mobile collections
  const realizedMobileCollections = useMemo(() => {
    return gtsData.filter(r => r.mobile > 0);
  }, [gtsData]);

  // 2. Group by Site and Lieu to find patterns
  const siteLieuHistory = useMemo(() => {
    const history: Record<string, { 
      site: string; 
      lieu: string; 
      region: string; 
      lastDate: string; 
      totalMobile: number;
      count: number;
      dates: Date[];
    }> = {};

    realizedMobileCollections.forEach(r => {
      const key = `${r.site}_${r.lieu || 'SITE_MOBILE'}`;
      if (!history[key]) {
        // Try to find region from SITES_DATA if missing in record
        let region = r.region;
        if (!region || region === 'AUTRES') {
          const siteInfo = getSiteByInput(r.site);
          if (siteInfo && siteInfo.region) {
            region = siteInfo.region;
          }
        }

        history[key] = {
          site: r.site,
          lieu: r.lieu || 'SITE_MOBILE',
          region: region || 'AUTRES',
          lastDate: r.date,
          totalMobile: 0,
          count: 0,
          dates: []
        };
      }

      history[key].totalMobile += r.mobile;
      history[key].count += 1;
      
      const parts = r.date.split('/');
      if (parts.length === 3) {
        const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        if (!isNaN(d.getTime())) {
          history[key].dates.push(d);
          // Update last date if this one is newer
          const currentLast = new Date(history[key].lastDate.split('/').reverse().join('-'));
          if (d > currentLast) {
            history[key].lastDate = r.date;
          }
        }
      }
    });

    return Object.values(history).sort((a, b) => b.lastDate.split('/').reverse().join('-').localeCompare(a.lastDate.split('/').reverse().join('-')));
  }, [realizedMobileCollections]);

  // 3. Propose planning for the next 14 days
  const proposedPlanning = useMemo(() => {
    const planning: { 
      date: string; 
      site: string; 
      lieu: string; 
      region: string; 
      reason: string;
      priority: 'HAUTE' | 'MOYENNE' | 'BASSE';
    }[] = [];

    const today = new Date();
    
    siteLieuHistory.forEach(h => {
      const lastDate = new Date(h.lastDate.split('/').reverse().join('-'));
      const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      // Simple logic: if it's been more than 45 days, suggest/predict a new collection
      // Mobile collections follow the blood donation frequency (every 2 months / 60 days)
      if (diffDays >= 45) {
        const nextDate = new Date(lastDate);
        nextDate.setDate(lastDate.getDate() + 60);
        
        // If the calculated next date is in the past, suggest for tomorrow
        const finalDate = nextDate < today ? new Date(today.getTime() + 86400000) : nextDate;
        
        planning.push({
          date: finalDate.toLocaleDateString('fr-FR'),
          site: h.site,
          lieu: h.lieu,
          region: h.region,
          reason: diffDays >= 60 
            ? `En retard de ${diffDays - 60} jours (Cycle: 2 mois)`
            : `Prévu dans ${60 - diffDays} jours`,
          priority: diffDays > 75 ? 'HAUTE' : diffDays >= 60 ? 'MOYENNE' : 'BASSE'
        });
      }
    });

    return planning.sort((a, b) => a.date.split('/').reverse().join('-').localeCompare(b.date.split('/').reverse().join('-')));
  }, [siteLieuHistory]);

  const filteredHistory = siteLieuHistory.filter(h => {
    const matchesSearch = h.site.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         h.lieu.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRegion = filterRegion === 'TOUS' || h.region === filterRegion;
    return matchesSearch && matchesRegion;
  });

  const regionsList = Array.from(new Set(siteLieuHistory.map(h => h.region))).sort();

  // Group filtered history by region then site
  const groupedHistory = useMemo(() => {
    const groups: Record<string, Record<string, typeof siteLieuHistory>> = {};
    
    filteredHistory.forEach(h => {
      if (!groups[h.region]) groups[h.region] = {};
      if (!groups[h.region][h.site]) groups[h.region][h.site] = [];
      groups[h.region][h.site].push(h);
    });

    return groups;
  }, [filteredHistory]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Calendar className="text-indigo-600" size={28} />
            GESTION DES COLLECTES MOBILES
          </h2>
          <p className="text-slate-500 font-medium">Analyse des réalisations mobiles et proposition de planning (Cycle: 2 mois)</p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100">
          <span className="text-indigo-700 font-bold text-sm">{branding.hashtag}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Realized Collections Analysis */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
            <div className="p-8 border-b border-slate-50 bg-slate-50/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                  <CheckCircle2 size={20} className="text-emerald-500" />
                  Historique des Collectes Mobiles
                </h3>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                      type="text"
                      placeholder="Rechercher..."
                      className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <select 
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black uppercase outline-none"
                    value={filterRegion}
                    onChange={(e) => setFilterRegion(e.target.value)}
                  >
                    <option value="TOUS">Toutes Régions</option>
                    {regionsList.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Site / Lieu</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Dernière Date</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Total Poches</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Fréquence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {Object.entries(groupedHistory).map(([region, sites]) => (
                    <React.Fragment key={region}>
                      {/* Region Header */}
                      <tr className="bg-indigo-50/30">
                        <td colSpan={4} className="px-8 py-3">
                          <span className="text-[11px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                            <Filter size={12} /> PRES: {region}
                          </span>
                        </td>
                      </tr>
                      {Object.entries(sites).map(([site, items]) => (
                        <React.Fragment key={`${region}_${site}`}>
                          {/* Site Sub-header */}
                          <tr className="bg-slate-50/30">
                            <td colSpan={4} className="px-10 py-2">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                CENTRE: {site}
                              </span>
                            </td>
                          </tr>
                          {items.map((h, idx) => (
                            <motion.tr 
                              key={`${h.site}_${h.lieu}`}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="hover:bg-slate-50/80 transition-colors group"
                            >
                              <td className="px-12 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 font-black text-[10px]">
                                    {h.lieu.substring(0, 2)}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{h.lieu}</span>
                                    <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                      <MapPin size={8} /> {h.site}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-4 text-center">
                                <span className="text-xs font-bold text-slate-600">{h.lastDate}</span>
                              </td>
                              <td className="px-8 py-4 text-center">
                                <span className="text-sm font-black text-indigo-600">{h.totalMobile}</span>
                              </td>
                              <td className="px-8 py-4 text-center">
                                <div className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-500">
                                  {h.count} collectes
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Proposed Planning */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
            <h3 className="text-lg font-black flex items-center gap-2 mb-6 uppercase tracking-tight relative z-10">
              <Clock size={20} className="text-blue-400" />
              Planning Proposé
            </h3>
            
            <div className="space-y-4 relative z-10">
              {proposedPlanning.length > 0 ? (
                proposedPlanning.slice(0, 8).map((p, idx) => (
                  <motion.div 
                    key={`${p.date}_${p.site}_${p.lieu}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl hover:bg-white/15 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{p.date}</span>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${
                        p.priority === 'HAUTE' ? 'bg-rose-500/20 text-rose-400' : 
                        p.priority === 'MOYENNE' ? 'bg-orange-500/20 text-orange-400' : 
                        'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {p.priority}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-black uppercase tracking-tight">{p.site}</span>
                      <span className="text-[10px] font-bold text-white/60 flex items-center gap-1 mt-1">
                        <MapPin size={10} /> {p.lieu}
                      </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[9px] font-medium text-white/40 italic">{p.reason}</span>
                      <ChevronRight size={14} className="text-white/20 group-hover:text-white/60 transition-colors" />
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="py-12 text-center">
                  <AlertCircle size={40} className="text-white/10 mx-auto mb-4" />
                  <p className="text-xs font-bold text-white/40">Aucune proposition pour le moment</p>
                </div>
              )}
            </div>

            {proposedPlanning.length > 8 && (
              <button className="w-full mt-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                Voir tout le planning
              </button>
            )}
          </div>

          <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl">
            <h3 className="text-sm font-black uppercase tracking-widest mb-4">Aide au Planning</h3>
            <p className="text-xs font-medium text-indigo-100 leading-relaxed">
              Les propositions sont basées sur un cycle de 2 mois (60 jours) par lieu, correspondant à la fréquence recommandée pour le don de sang.
            </p>
            <button className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white text-indigo-600 px-4 py-2 rounded-xl shadow-lg hover:bg-indigo-50 transition-colors">
              <PlusCircle size={14} /> Créer un événement
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
