
import React, { useMemo, useState } from 'react';
import { DashboardData } from '../types.ts';
import { Truck, RefreshCw, AlertCircle, CheckCircle2, Search, Calendar, MapPin, Package } from 'lucide-react';
import { motion } from 'framer-motion';

interface GtsComparisonViewProps {
  data: DashboardData;
  branding: { logo: string; hashtag: string };
}

export const GtsComparisonView: React.FC<GtsComparisonViewProps> = ({ data, branding }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const todayStr = new Date().toLocaleDateString('en-CA');
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Create a site-to-region lookup map
  const siteRegionMap = useMemo(() => {
    const map: Record<string, string> = {};
    data.regions.forEach(reg => {
      reg.sites.forEach(site => {
        map[site.name] = reg.name;
      });
    });
    // Also check GTS data for regions if not in sites
    data.gts?.forEach(r => {
      if (r.region && !map[r.site]) {
        map[r.site] = r.region;
      }
    });
    return map;
  }, [data.regions, data.gts]);

  const years = useMemo(() => {
    const yrs = new Set<string>();
    data.dailyHistory.forEach(day => {
      const parts = day.date.split('/');
      if (parts.length === 3) yrs.add(parts[2]);
    });
    data.gts?.forEach(r => {
      if (r.date) {
        const parts = r.date.split('/');
        if (parts.length === 3) yrs.add(parts[2]);
      }
    });
    return Array.from(yrs).sort((a, b) => b.localeCompare(a));
  }, [data.dailyHistory, data.gts]);

  const months = [
    { value: '01', label: 'Janvier' }, { value: '02', label: 'Février' }, { value: '03', label: 'Mars' },
    { value: '04', label: 'Avril' }, { value: '05', label: 'Mai' }, { value: '06', label: 'Juin' },
    { value: '07', label: 'Juillet' }, { value: '08', label: 'Août' }, { value: '09', label: 'Septembre' },
    { value: '10', label: 'Octobre' }, { value: '11', label: 'Novembre' }, { value: '12', label: 'Décembre' }
  ];

  const comparisonData = useMemo(() => {
    const comparison: Record<string, {
      date: string;
      site: string;
      region: string;
      prelFixe: number;
      prelMobile: number;
      gtsFixe: number;
      gtsMobile: number;
    }> = {};

    // 1. Process Prélèvement data from dailyHistory
    data.dailyHistory.forEach(day => {
      day.sites.forEach(site => {
        const key = `${day.date}_${site.name}`;
        if (!comparison[key]) {
          comparison[key] = {
            date: day.date,
            site: site.name,
            region: site.region || siteRegionMap[site.name] || 'AUTRES',
            prelFixe: 0,
            prelMobile: 0,
            gtsFixe: 0,
            gtsMobile: 0
          };
        }
        comparison[key].prelFixe += site.fixe;
        comparison[key].prelMobile += site.mobile;
      });
    });

    // 2. Process GTS data
    data.gts?.forEach(record => {
      const key = `${record.date}_${record.site}`;
      if (!comparison[key]) {
        comparison[key] = {
          date: record.date,
          site: record.site,
          region: record.region || siteRegionMap[record.site] || 'AUTRES',
          prelFixe: 0,
          prelMobile: 0,
          gtsFixe: 0,
          gtsMobile: 0
        };
      }
      comparison[key].gtsFixe += record.fixe;
      comparison[key].gtsMobile += record.mobile;
    });

    return Object.values(comparison)
      .filter(item => {
        const matchesSearch = 
          item.site.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.date.includes(searchTerm);
        
        let matchesDate = true;
        if (item.date) {
          const parts = item.date.split('/');
          let itemDate: Date | null = null;
          if (parts.length === 3) {
            const [d, m, y] = parts;
            itemDate = new Date(`${y}-${m}-${d}`);
          } else {
            const dt = new Date(item.date);
            if (!isNaN(dt.getTime())) {
              itemDate = dt;
            }
          }

          if (itemDate && !isNaN(itemDate.getTime())) {
            if (startDate) {
              const start = new Date(startDate);
              start.setHours(0, 0, 0, 0);
              if (itemDate < start) matchesDate = false;
            }
            if (endDate) {
              const end = new Date(endDate);
              end.setHours(23, 59, 59, 999);
              if (itemDate > end) matchesDate = false;
            }
          }
        }

        return matchesSearch && matchesDate;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [data, searchTerm, startDate, endDate, siteRegionMap]);

  const groupedData = useMemo(() => {
    const regions: Record<string, {
      items: typeof comparisonData,
      subtotal: {
        prelFixe: number;
        prelMobile: number;
        gtsFixe: number;
        gtsMobile: number;
      }
    }> = {};

    comparisonData.forEach(item => {
      const reg = item.region;
      if (!regions[reg]) {
        regions[reg] = {
          items: [],
          subtotal: { prelFixe: 0, prelMobile: 0, gtsFixe: 0, gtsMobile: 0 }
        };
      }
      regions[reg].items.push(item);
      regions[reg].subtotal.prelFixe += item.prelFixe;
      regions[reg].subtotal.prelMobile += item.prelMobile;
      regions[reg].subtotal.gtsFixe += item.gtsFixe;
      regions[reg].subtotal.gtsMobile += item.gtsMobile;
    });

    return regions;
  }, [comparisonData]);

  const totals = useMemo(() => {
    return comparisonData.reduce((acc, curr) => ({
      prelFixe: acc.prelFixe + curr.prelFixe,
      prelMobile: acc.prelMobile + curr.prelMobile,
      gtsFixe: acc.gtsFixe + curr.gtsFixe,
      gtsMobile: acc.gtsMobile + curr.gtsMobile,
    }), { prelFixe: 0, prelMobile: 0, gtsFixe: 0, gtsMobile: 0 });
  }, [comparisonData]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <RefreshCw className="text-indigo-600" size={28} />
            COMPARAISON PRÉLÈVEMENT VS GTS
          </h2>
          <p className="text-slate-500 font-medium">Vérification de la cohérence entre saisies et transports</p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100">
          <span className="text-indigo-700 font-bold text-sm">{branding.hashtag}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            TOTAUX PRÉLÈVEMENT (DECLARÉ)
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
              <p className="text-[10px] font-black text-emerald-700 uppercase mb-1">Fixe</p>
              <p className="text-2xl font-black text-emerald-900">{totals.prelFixe}</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
              <p className="text-[10px] font-black text-emerald-700 uppercase mb-1">Mobile</p>
              <p className="text-2xl font-black text-emerald-900">{totals.prelMobile}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            TOTAUX GTS (ENCODAGE)
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
              <p className="text-[10px] font-black text-indigo-700 uppercase mb-1">Fixe</p>
              <p className="text-2xl font-black text-indigo-900">{totals.gtsFixe}</p>
            </div>
            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
              <p className="text-[10px] font-black text-indigo-700 uppercase mb-1">Mobile</p>
              <p className="text-2xl font-black text-indigo-900">{totals.gtsMobile}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Rechercher par site ou date..."
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200">
                <span className="text-[10px] font-black text-slate-400 uppercase">Du</span>
                <input 
                  type="date"
                  className="bg-transparent text-xs font-bold text-slate-600 outline-none cursor-pointer"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200">
                <span className="text-[10px] font-black text-slate-400 uppercase">Au</span>
                <input 
              type="date"
                  className="bg-transparent text-xs font-bold text-slate-600 outline-none cursor-pointer"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              {(startDate !== todayStr || endDate !== todayStr) && (
                <button 
                  onClick={() => { setStartDate(todayStr); setEndDate(todayStr); }}
                  className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest"
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 size={14} /> COHÉRENT
            </div>
            <div className="flex items-center gap-2 text-rose-600">
              <AlertCircle size={14} /> ÉCART DÉTECTÉ
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Date / Site</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center bg-emerald-50/30">Prél. Fixe</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center bg-indigo-50/30">GTS Fixe</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center bg-emerald-50/30">Prél. Mob.</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center bg-indigo-50/30">GTS Mob.</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {Object.keys(groupedData).length > 0 ? (
                <>
                  {Object.entries(groupedData).map(([region, regionData], regIdx) => (
                    <React.Fragment key={region}>
                      <tr className="bg-indigo-50/30">
                        <td colSpan={6} className="px-6 py-3">
                          <div className="flex items-center gap-2 text-indigo-700 font-black text-xs uppercase tracking-widest">
                            <Package size={14} />
                            {region}
                          </div>
                        </td>
                      </tr>
                      {regionData.items.map((item, idx) => {
                        const diffFixe = item.prelFixe - item.gtsFixe;
                        const diffMobile = item.prelMobile - item.gtsMobile;
                        const hasDiff = diffFixe !== 0 || diffMobile !== 0;

                        return (
                          <motion.tr 
                            key={`${item.date}_${item.site}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: idx * 0.01 }}
                            className="hover:bg-slate-50/80 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-900 flex items-center gap-2">
                                  <MapPin size={12} className="text-indigo-500" />
                                  {item.site}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-2 mt-1">
                                  <Calendar size={10} />
                                  {item.date}
                                </span>
                              </div>
                            </td>
                            <td className={`px-6 py-4 text-center font-black text-sm ${diffFixe !== 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                              {item.prelFixe}
                            </td>
                            <td className={`px-6 py-4 text-center font-black text-sm ${diffFixe !== 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                              {item.gtsFixe}
                            </td>
                            <td className={`px-6 py-4 text-center font-black text-sm ${diffMobile !== 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                              {item.prelMobile}
                            </td>
                            <td className={`px-6 py-4 text-center font-black text-sm ${diffMobile !== 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                              {item.gtsMobile}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {hasDiff ? (
                                <div className="inline-flex items-center gap-1 px-2 py-1 bg-rose-100 text-rose-700 rounded-lg text-[9px] font-black uppercase">
                                  <AlertCircle size={10} /> Écart
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[9px] font-black uppercase">
                                  <CheckCircle2 size={10} /> OK
                                </div>
                              )}
                            </td>
                          </motion.tr>
                        );
                      })}
                      {/* Sous-total PRES */}
                      <tr className="bg-slate-50 font-black text-slate-900">
                        <td className="px-6 py-4 text-xs uppercase tracking-widest">Sous-total {region}</td>
                        <td className="px-6 py-4 text-center text-indigo-700">{regionData.subtotal.prelFixe}</td>
                        <td className="px-6 py-4 text-center text-indigo-700">{regionData.subtotal.gtsFixe}</td>
                        <td className="px-6 py-4 text-center text-indigo-700">{regionData.subtotal.prelMobile}</td>
                        <td className="px-6 py-4 text-center text-indigo-700">{regionData.subtotal.gtsMobile}</td>
                        <td className="px-6 py-4 text-center">
                          {(regionData.subtotal.prelFixe - regionData.subtotal.gtsFixe !== 0 || 
                            regionData.subtotal.prelMobile - regionData.subtotal.gtsMobile !== 0) ? (
                            <span className="text-rose-600 text-[9px] uppercase">Écart Régional</span>
                          ) : (
                            <span className="text-emerald-600 text-[9px] uppercase">Cohérent</span>
                          )}
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                  {/* TOTAL GENERAL */}
                  <tr className="bg-slate-900 text-white font-black">
                    <td className="px-6 py-6 text-sm uppercase tracking-[0.2em]">TOTAL GENERAL</td>
                    <td className="px-6 py-6 text-center text-xl text-emerald-400">{totals.prelFixe}</td>
                    <td className="px-6 py-6 text-center text-xl text-indigo-400">{totals.gtsFixe}</td>
                    <td className="px-6 py-6 text-center text-xl text-emerald-400">{totals.prelMobile}</td>
                    <td className="px-6 py-6 text-center text-xl text-indigo-400">{totals.gtsMobile}</td>
                    <td className="px-6 py-6 text-center">
                      {(totals.prelFixe - totals.gtsFixe !== 0 || 
                        totals.prelMobile - totals.gtsMobile !== 0) ? (
                        <span className="text-rose-400 text-xs uppercase tracking-widest">Écart National</span>
                      ) : (
                        <span className="text-emerald-400 text-xs uppercase tracking-widest">Cohérent</span>
                      )}
                    </td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <Truck size={48} className="opacity-20" />
                      <p className="font-bold">Aucune donnée trouvée</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
