
import React, { useState, useMemo, useEffect } from 'react';
import { DashboardData } from '../types.ts';
import { Search, Filter, Truck, Calendar, MapPin, Package, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface GtsViewProps {
  data: DashboardData;
  branding: { logo: string; hashtag: string };
}

export const GtsView: React.FC<GtsViewProps> = ({ data, branding }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const firstDayOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState<string>(firstDayOfYear);
  const [endDate, setEndDate] = useState<string>(todayStr);

  const gtsData = data.gts || [];

  useEffect(() => {
    console.log("[GtsView] Données reçues:", gtsData.length, "enregistrements.");
  }, [gtsData.length]);

  const filteredGts = useMemo(() => {
    return gtsData.filter(r => {
      const matchesSearch = 
        r.site.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.lieu && r.lieu.toLowerCase().includes(searchTerm.toLowerCase()));
      
      let matchesDate = true;
      if (r.date) {
        // Parse DD/MM/YYYY to Date object for comparison
        const parts = r.date.split('/');
        let itemDate: Date | null = null;
        if (parts.length === 3) {
          const [d, m, y] = parts;
          itemDate = new Date(`${y}-${m}-${d}`);
        } else {
          const dt = new Date(r.date);
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
    });
  }, [gtsData, searchTerm, startDate, endDate]);

  const stats = useMemo(() => {
    const totalRecords = filteredGts.length;
    const totalFixe = filteredGts.reduce((acc, r) => acc + (Number(r.fixe) || 0), 0);
    const totalMobile = filteredGts.reduce((acc, r) => acc + (Number(r.mobile) || 0), 0);
    const totalAuto = filteredGts.reduce((acc, r) => acc + (Number(r.autoTransfusion) || 0), 0);
    const totalQty = filteredGts.reduce((acc, r) => acc + (Number(r.total) || 0), 0);

    return { totalRecords, totalFixe, totalMobile, totalAuto, totalQty };
  }, [filteredGts]);

  const groupedData = useMemo(() => {
    const regions: Record<string, {
      sites: Record<string, { 
        fixe: number, 
        mobile: number, 
        auto: number, 
        total: number, 
        collectes: number,
        records: any[] 
      }>,
      subtotal: {
        fixe: number,
        mobile: number,
        auto: number,
        total: number,
        collectes: number
      }
    }> = {};

    filteredGts.forEach(r => {
      const reg = r.region || "AUTRES";
      const site = r.site;

      if (!regions[reg]) {
        regions[reg] = { 
          sites: {}, 
          subtotal: { fixe: 0, mobile: 0, auto: 0, total: 0, collectes: 0 } 
        };
      }
      
      if (!regions[reg].sites[site]) {
        regions[reg].sites[site] = { fixe: 0, mobile: 0, auto: 0, total: 0, collectes: 0, records: [] };
      }

      const siteData = regions[reg].sites[site];
      const sub = regions[reg].subtotal;

      siteData.fixe += r.fixe;
      siteData.mobile += r.mobile;
      siteData.auto += r.autoTransfusion;
      siteData.total += r.total;
      
      sub.fixe += r.fixe;
      sub.mobile += r.mobile;
      sub.auto += r.autoTransfusion;
      sub.total += r.total;

      if (r.caCode !== 'Z' && r.pvCode !== 0) {
        siteData.collectes += 1;
        sub.collectes += 1;
      }
      siteData.records.push(r);
    });

    return regions;
  }, [filteredGts]);

  const getPvLabel = (code: number) => {
    switch(code) {
      case 0: return "NON PRELEVE";
      case 1: return "SANG TOTAL";
      case 2: return "TUBE";
      case 3: return "AUTOTRANSFUSION";
      case 4: return "TUBE AUTOTRANSFUSION";
      default: return "INCONNU";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Truck className="text-indigo-600" size={28} />
            SUIVI GTS
          </h2>
          <p className="text-slate-500 font-medium">Récapitulatif par PRES et par Site</p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100">
          <span className="text-indigo-700 font-bold text-sm">{branding.hashtag}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">COLLECTES REALISÉES</p>
          <p className="text-2xl font-black text-slate-900">{stats.totalRecords}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">POCHES COL. FIXE</p>
          <p className="text-2xl font-black text-emerald-600">{stats.totalFixe}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">POCHES COL. MOB</p>
          <p className="text-2xl font-black text-orange-600">{stats.totalMobile}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Auto Transfusion</p>
          <p className="text-2xl font-black text-blue-600">{stats.totalAuto}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Poches</p>
          <p className="text-2xl font-black text-indigo-600">{stats.totalQty}</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Rechercher un site..."
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

              {(startDate !== firstDayOfYear || endDate !== todayStr) && (
                <button 
                  onClick={() => { setStartDate(firstDayOfYear); setEndDate(todayStr); }}
                  className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest"
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">PRES / Site</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Collectes Réalisées</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">POCHES COL. FIXE</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">POCHES COL. MOB</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Auto Transf.</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Total Poches</th>
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
                      {Object.entries(regionData.sites).map(([siteName, siteStats], siteIdx) => (
                        <motion.tr 
                          key={`${region}-${siteName}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: (regIdx * 5 + siteIdx) * 0.01 }}
                          className="hover:bg-slate-50/80 transition-colors group"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-slate-900 font-black text-sm pl-4">
                              <MapPin size={14} className="text-indigo-500" />
                              {siteName}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-slate-700">
                            {siteStats.collectes}
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-emerald-600">
                            {siteStats.fixe}
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-orange-600">
                            {siteStats.mobile}
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-blue-600">
                            {siteStats.auto}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-lg font-black text-indigo-600">{siteStats.total}</span>
                          </td>
                        </motion.tr>
                      ))}
                      {/* Sous-total PRES */}
                      <tr className="bg-slate-50 font-black text-slate-900">
                        <td className="px-6 py-4 text-xs uppercase tracking-widest">Sous-total {region}</td>
                        <td className="px-6 py-4 text-center">{regionData.subtotal.collectes}</td>
                        <td className="px-6 py-4 text-center text-emerald-700">{regionData.subtotal.fixe}</td>
                        <td className="px-6 py-4 text-center text-orange-700">{regionData.subtotal.mobile}</td>
                        <td className="px-6 py-4 text-center text-blue-700">{regionData.subtotal.auto}</td>
                        <td className="px-6 py-4 text-center text-indigo-700">{regionData.subtotal.total}</td>
                      </tr>
                    </React.Fragment>
                  ))}
                  {/* TOTAL GENERAL */}
                  <tr className="bg-slate-900 text-white font-black">
                    <td className="px-6 py-6 text-sm uppercase tracking-[0.2em]">TOTAL GENERAL</td>
                    <td className="px-6 py-6 text-center text-xl">{stats.totalRecords}</td>
                    <td className="px-6 py-6 text-center text-xl text-emerald-400">{stats.totalFixe}</td>
                    <td className="px-6 py-6 text-center text-xl text-orange-400">{stats.totalMobile}</td>
                    <td className="px-6 py-6 text-center text-xl text-blue-400">{stats.totalAuto}</td>
                    <td className="px-6 py-6 text-center text-2xl text-indigo-400">{stats.totalQty}</td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <Truck size={48} className="opacity-20" />
                      <p className="font-bold">Aucune donnée trouvée</p>
                      {gtsData.length > 0 && (
                        <p className="text-[10px] uppercase tracking-widest opacity-60">
                          {gtsData.length} enregistrements trouvés hors filtres de date ou recherche
                        </p>
                      )}
                      {gtsData.length === 0 && (
                        <p className="text-[10px] uppercase tracking-widest opacity-60">
                          La source GTS semble vide ou n'a pas pu être chargée
                        </p>
                      )}
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

const ArrowRight = ({ size, className }: { size: number, className: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12h14m-7-7 7 7-7 7"/>
  </svg>
);
