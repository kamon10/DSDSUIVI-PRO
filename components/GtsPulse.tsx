
import React, { useMemo } from 'react';
import { DashboardData, GtsRecord } from '../types';
import { Activity, Zap, Clock, CheckCircle2, AlertCircle, Truck, Database, TrendingUp, ArrowUpRight, ArrowDownRight, User, MapPin } from 'lucide-react';
import { motion } from 'motion/react';

interface GtsPulseProps {
  data: DashboardData;
  branding: { logo: string; hashtag: string };
}

export const GtsPulse: React.FC<GtsPulseProps> = ({ data, branding }) => {
  const gtsData = data.gts || [];
  const today = new Date();
  const day = today.getDate().toString().padStart(2, '0');
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const year = today.getFullYear();
  const todayStr = `${day}/${month}/${year}`;
  
  const stats = useMemo(() => {
    const total = gtsData.length;
    
    // Find the latest date in the GTS data
    let latestDate = "";
    if (total > 0) {
      const sortedDates = [...new Set(gtsData.map(r => r.date))].sort((a, b) => {
        const pA = a.split('/');
        const pB = b.split('/');
        return new Date(parseInt(pB[2]), parseInt(pB[1]) - 1, parseInt(pB[0])).getTime() - 
               new Date(parseInt(pA[2]), parseInt(pA[1]) - 1, parseInt(pA[0])).getTime();
      });
      latestDate = sortedDates[0];
    }

    // Records for the latest date (or today if no data)
    const todayRecords = gtsData.filter(r => r.date === (latestDate || todayStr)).length;
    const todayVolume = gtsData
      .filter(r => r.date === (latestDate || todayStr))
      .reduce((acc, r) => acc + (Number(r.fixe) || 0) + (Number(r.mobile) || 0), 0);
    const todayAutoTransfusion = gtsData
      .filter(r => r.date === (latestDate || todayStr))
      .reduce((acc, r) => acc + (Number(r.autoTransfusion) || 0), 0);
    
    // Volume this month (sum of fixe and mobile)
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const monthVolume = gtsData.reduce((acc, r) => {
      const parts = r.date.split('/');
      if (parts.length === 3 && parseInt(parts[1]) === currentMonth && parseInt(parts[2]) === currentYear) {
        return acc + (Number(r.fixe) || 0) + (Number(r.mobile) || 0);
      }
      return acc;
    }, 0);
    const monthAutoTransfusion = gtsData.reduce((acc, r) => {
      const parts = r.date.split('/');
      if (parts.length === 3 && parseInt(parts[1]) === currentMonth && parseInt(parts[2]) === currentYear) {
        return acc + (Number(r.autoTransfusion) || 0);
      }
      return acc;
    }, 0);

    // Data Quality: Records with both caCode and pvCode
    const completeRecords = gtsData.filter(r => r.caCode && r.pvCode !== undefined).length;
    const qualityScore = total > 0 ? Math.round((completeRecords / total) * 100) : 0;

    // Recent entries
    const recentEntries = [...gtsData]
      .sort((a, b) => {
        const parseDate = (d: string) => {
          const p = d.split('/');
          return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0])).getTime();
        };
        return parseDate(b.date) - parseDate(a.date);
      })
      .slice(0, 10);

    // Encoding by site
    const siteEncoding: Record<string, number> = {};
    const caCodeDistribution: Record<string, number> = {};
    
    gtsData.forEach(r => {
      siteEncoding[r.site] = (siteEncoding[r.site] || 0) + 1;
      if (r.caCode) {
        caCodeDistribution[r.caCode] = (caCodeDistribution[r.caCode] || 0) + 1;
      }
    });

    const topSites = Object.entries(siteEncoding)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topCaCodes = Object.entries(caCodeDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return { 
      total, 
      todayRecords, 
      todayVolume,
      todayAutoTransfusion,
      monthVolume, 
      monthAutoTransfusion,
      qualityScore, 
      recentEntries, 
      topSites, 
      topCaCodes,
      latestDate: latestDate || todayStr
    };
  }, [gtsData, todayStr]);

  if (gtsData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div className="p-6 bg-slate-50 rounded-full mb-6">
          <Truck size={48} className="text-slate-300" />
        </div>
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Aucune donnée GTS</h3>
        <p className="text-slate-500 mt-2 text-[10px] font-bold uppercase tracking-widest">En attente de synchronisation...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Zap className="text-orange-600" size={28} />
            PULSE GTS
          </h2>
          <p className="text-slate-500 font-medium">Performance et Qualité de l'Encodage</p>
        </div>
        <div className="flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-2xl border border-orange-100">
          <span className="text-orange-700 font-bold text-sm">{branding.hashtag}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <motion.div whileHover={{ y: -5 }} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl flex items-center gap-6">
          <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 shadow-inner">
            <Database size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Encodé</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{stats.total}</span>
              <span className="text-[10px] font-bold text-orange-500 uppercase">Global</span>
            </div>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl flex items-center gap-6">
          <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 shadow-inner">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Encodage au {stats.latestDate}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{stats.todayVolume}</span>
              <span className="text-[10px] font-bold text-orange-500 flex items-center gap-0.5">Poches</span>
            </div>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl flex items-center gap-6">
          <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 shadow-inner">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Volume Mensuel</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{stats.monthVolume.toLocaleString()}</span>
              <span className="text-[10px] font-bold text-orange-500 uppercase">Poches</span>
            </div>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl flex items-center gap-6">
          <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 shadow-inner">
            <Zap size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auto Transfusion</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{stats.todayAutoTransfusion}</span>
              <span className="text-[10px] font-bold text-purple-500 uppercase">Poches</span>
            </div>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl flex items-center gap-6">
          <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 shadow-inner">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score Qualité</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{stats.qualityScore}%</span>
              <span className="text-[10px] font-bold text-orange-500 uppercase">Précision</span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[3rem] p-8 border border-slate-100 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter">Flux d'Encodage Récent</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dernières entrées validées</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {stats.recentEntries.map((entry, i) => (
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                key={`${entry.site}-${entry.date}-${i}`}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 font-black text-xs shadow-sm group-hover:text-orange-600 transition-colors">
                    {entry.date.substring(0, 5)}
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800 uppercase">{entry.site}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <MapPin size={10} /> {entry.region || 'N/A'} • {entry.lieu || 'Site Fixe'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-4 border-r border-slate-200 pr-4">
                    <div className="text-center">
                      <p className="text-[10px] font-black text-orange-600">{entry.fixe}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">Fixe</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black text-orange-600">{entry.mobile}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">Mob.</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black text-purple-600">{entry.autoTransfusion}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">Auto</p>
                    </div>
                  </div>
                  <div className="text-right min-w-[60px]">
                    <p className="text-sm font-black text-slate-900">{entry.total}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Total</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {entry.caCode && entry.pvCode !== undefined ? (
                      <CheckCircle2 size={16} className="text-orange-500" />
                    ) : (
                      <AlertCircle size={16} className="text-orange-500" />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl">
            <h3 className="text-lg font-black uppercase tracking-tighter mb-6 flex items-center gap-2">
              <TrendingUp size={20} className="text-orange-400" />
              Top Sites Encodeurs
            </h3>
            <div className="space-y-6">
              {stats.topSites.map(([site, count], i) => (
                <div key={site} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <p className="text-xs font-black uppercase tracking-tight text-white/80">{site}</p>
                    <p className="text-sm font-black text-orange-400">{count} <span className="text-[10px] text-white/40">Rec.</span></p>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / stats.topSites[0][1]) * 100}%` }}
                      className="h-full bg-orange-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-xl">
            <h3 className="text-lg font-black uppercase tracking-tighter mb-4 text-slate-900">Qualité de Saisie</h3>
            <div className="space-y-4">
              <div className="p-6 bg-orange-50 rounded-3xl border border-orange-100">
                <div className="flex items-center gap-3 mb-3">
                  <AlertCircle className="text-orange-600" size={16} />
                  <p className="text-[11px] font-black uppercase tracking-widest text-orange-900">Analyse</p>
                </div>
                <p className="text-xs text-orange-700 leading-relaxed font-medium">
                  {stats.qualityScore > 90 
                    ? "L'encodage est excellent. La majorité des enregistrements comportent les codes CA et PV requis."
                    : "Attention : certains enregistrements manquent de codes de prélèvement ou d'activité. Une vérification est conseillée."}
                </p>
              </div>

              {stats.topCaCodes.length > 0 && (
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Top Codes Activité (CA)</p>
                  <div className="flex flex-wrap gap-2">
                    {stats.topCaCodes.map(([code, count]) => (
                      <div key={code} className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-2 shadow-sm">
                        <span className="text-[10px] font-black text-orange-600">{code}</span>
                        <span className="text-[10px] font-bold text-slate-400">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
