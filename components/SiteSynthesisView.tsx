
import React, { useState, useMemo, useEffect } from 'react';
import { DashboardData, User, DistributionRecord } from '../types';
import { COLORS, getSiteObjectives, PRODUCT_COLORS } from '../constants';
import { 
  Building2, User as UserIcon, Phone, MapPin, Target, Activity, Award, 
  History, Calendar, PieChart, MessageSquare,
  Truck, ClipboardList, BarChart3, Package, RefreshCw,
  ArrowRight, CheckCircle, BarChart, Clock, CalendarDays, ChevronDown
} from 'lucide-react';
import { 
  BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid, Cell, PieChart as RePieChart, Pie
} from 'recharts';

interface SiteSynthesisViewProps {
  data: DashboardData;
  user?: User | null;
  sites: any[];
}

const MONTHS_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const getStatusColor = (percentage: number) => {
  if (percentage >= 100) return '#10b981';
  if (percentage >= 75) return '#f59e0b';
  return '#ef4444';
};

export const SiteSynthesisView: React.FC<SiteSynthesisViewProps> = ({ data, user, sites }) => {
  const [selectedSiteCode, setSelectedSiteCode] = useState(sites[0]?.code || "");
  const [viewMode, setViewMode] = useState<'donations' | 'distribution'>('donations');
  
  const [timeScale, setTimeScale] = useState<'day' | 'month' | 'year'>('month');
  const [selYear, setSelYear] = useState<string>("");
  const [selMonth, setSelMonth] = useState<string>("");
  const [selDate, setSelDate] = useState<string>("");

  const availableRegions = useMemo(() => {
    return Array.from(new Set(sites.map(s => s.region))).sort();
  }, [sites]);

  useEffect(() => {
    if (user && user.role === 'AGENT' && user.site) {
      const site = sites.find(s => s.name.toUpperCase() === user.site.toUpperCase());
      if (site) setSelectedSiteCode(site.code);
    } else if (sites.length > 0 && !selectedSiteCode) {
      setSelectedSiteCode(sites[0].code);
    }

    if (data.dailyHistory.length > 0) {
      const latest = data.dailyHistory[0];
      const parts = latest.date.split('/');
      setSelYear(parts[2]);
      setSelMonth((parseInt(parts[1]) - 1).toString());
      setSelDate(latest.date);
    }
  }, [user, data.dailyHistory, sites]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    data.dailyHistory.forEach(h => years.add(h.date.split('/')[2]));
    return Array.from(years).sort().reverse();
  }, [data.dailyHistory]);

  const availableDates = useMemo(() => {
    return data.dailyHistory
      .filter(h => {
        const parts = h.date.split('/');
        return parts[2] === selYear && (parseInt(parts[1]) - 1).toString() === selMonth;
      })
      .map(h => h.date);
  }, [data.dailyHistory, selYear, selMonth]);

  const selectedSiteInfo = useMemo(() => 
    sites.find(s => s.code === selectedSiteCode) || sites[0] || {}
  , [selectedSiteCode, sites]);

  const siteStats = useMemo(() => {
    if (!selectedSiteInfo.name) return { realized: 0, fixed: 0, mobile: 0, objective: 0, percentage: 0, chartData: [] };
    const siteName = selectedSiteInfo.name.toUpperCase();
    const siteObjs = getSiteObjectives(selectedSiteInfo.name);

    const relevantHistory = data.dailyHistory.filter(h => {
      const parts = h.date.split('/');
      const y = parts[2];
      const m = (parseInt(parts[1]) - 1).toString();
      const d = h.date;

      if (timeScale === 'day') return d === selDate;
      if (timeScale === 'month') return y === selYear && m === selMonth;
      return y === selYear;
    });

    const totalRealized = relevantHistory.reduce((acc, h) => {
      const s = h.sites.find(site => site.name.toUpperCase() === siteName);
      return acc + (s?.total || 0);
    }, 0);

    const totalFixed = relevantHistory.reduce((acc, h) => {
      const s = h.sites.find(site => site.name.toUpperCase() === siteName);
      return acc + (s?.fixe || 0);
    }, 0);

    const totalMobile = relevantHistory.reduce((acc, h) => {
      const s = h.sites.find(site => site.name.toUpperCase() === siteName);
      return acc + (s?.mobile || 0);
    }, 0);

    let currentObjective = siteObjs.monthly;
    if (timeScale === 'day') currentObjective = siteObjs.daily;
    if (timeScale === 'year') currentObjective = siteObjs.annual;

    const percentage = currentObjective > 0 ? (totalRealized / currentObjective) * 100 : 0;

    const chartData = relevantHistory.slice(0, 7).reverse().map(h => {
      const s = h.sites.find(site => site.name.toUpperCase() === siteName);
      return {
        date: h.date,
        fixe: s?.fixe || 0,
        mobile: s?.mobile || 0,
        total: s?.total || 0
      };
    });

    return {
      realized: totalRealized,
      fixed: totalFixed,
      mobile: totalMobile,
      objective: currentObjective,
      percentage,
      chartData
    };
  }, [selectedSiteInfo, data.dailyHistory, timeScale, selYear, selMonth, selDate]);

  const distributionStats = useMemo(() => {
    if (!selectedSiteInfo.name) return null;
    const distRecords = data.distributions?.records;
    if (!distRecords || distRecords.length === 0) return null;
    
    const siteRecords = distRecords.filter((r: DistributionRecord) => {
      const siCodeNum = parseInt(r.codeSite);
      const selectedCodeNum = parseInt(selectedSiteInfo.code);
      
      const matchMappedCode = !isNaN(siCodeNum) && siCodeNum * 1000 === selectedCodeNum;
      const matchDirectCode = r.codeSite === selectedSiteInfo.code;
      const matchName = r.site.toUpperCase().includes(selectedSiteInfo.name.toUpperCase()) || 
                        selectedSiteInfo.name.toUpperCase().includes(r.site.toUpperCase());

      if (!(matchMappedCode || matchDirectCode || matchName)) return false;

      const parts = r.date.split('/');
      const y = parts[2];
      const m = (parseInt(parts[1]) - 1).toString();
      const d = r.date;

      if (timeScale === 'day') return d === selDate;
      if (timeScale === 'month') return y === selYear && m === selMonth;
      return y === selYear;
    });

    if (siteRecords.length === 0) return null;

    const totalQty = siteRecords.reduce((acc, r) => acc + r.quantite, 0);
    const totalRendu = siteRecords.reduce((acc, r) => acc + r.rendu, 0);
    
    const prodMap = new Map<string, number>();
    const groupMap = new Map<string, number>();
    const facilityMap = new Map<string, number>();
    
    siteRecords.forEach(r => {
      prodMap.set(r.typeProduit, (prodMap.get(r.typeProduit) || 0) + r.quantite);
      groupMap.set(r.groupeSanguin, (groupMap.get(r.groupeSanguin) || 0) + r.quantite);
      facilityMap.set(r.etablissement, (facilityMap.get(r.etablissement) || 0) + r.quantite);
    });

    const productChart = Array.from(prodMap.entries()).map(([name, value]) => ({
      name, value, fill: PRODUCT_COLORS[name] || '#f59e0b'
    })).sort((a,b) => b.value - a.value);

    return {
      totalQty,
      totalRendu,
      efficiency: totalQty > 0 ? ((totalQty - totalRendu) / totalQty) * 100 : 0,
      productChart,
      groupMap: Array.from(groupMap.entries()).sort((a,b) => b[1] - a[1]),
      facilities: Array.from(facilityMap.entries()).sort((a,b) => b[1] - a[1]).slice(0, 6)
    };
  }, [selectedSiteInfo, data.distributions, timeScale, selYear, selMonth, selDate]);

  const mixData = [
    { name: 'Fixe', value: siteStats.fixed || 1, fill: '#10b981' },
    { name: 'Mobile', value: siteStats.mobile || 0, fill: '#f59e0b' }
  ];

  const handleWhatsAppRelance = () => {
    if (!selectedSiteInfo.phone) return;
    const msg = `Bonjour ${selectedSiteInfo.manager}, je reviens vers vous concernant la situation du site ${selectedSiteInfo.name}. Données actuelles : ${siteStats.realized} poches prélèvées sur la période.`;
    window.open(`https://wa.me/225${selectedSiteInfo.phone.replace(/\s/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (!sites.length) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="bg-[#0f172a] rounded-[3.5rem] p-8 lg:p-12 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/5 rounded-full blur-[120px] -mr-32 -mt-32"></div>
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
          <div className="flex items-center gap-8">
            <div className={`w-16 h-16 lg:w-20 lg:h-20 rounded-[2rem] flex items-center justify-center shadow-2xl transition-all duration-500 ${viewMode === 'donations' ? 'bg-emerald-600 shadow-emerald-900/40' : 'bg-orange-600 shadow-orange-900/40'}`}>
              {viewMode === 'donations' ? <Building2 size={36} /> : <Truck size={36} />}
            </div>
            <div>
              <h2 className="text-3xl lg:text-4xl font-black uppercase tracking-tighter leading-none mb-3">Focus Analyse</h2>
              <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-md shadow-inner">
                 <button onClick={() => setViewMode('donations')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'donations' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-white/40 hover:text-white'}`}>
                   <Activity size={14}/> Prélèvements
                 </button>
                 <button onClick={() => setViewMode('distribution')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'distribution' ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' : 'text-white/40 hover:text-white'}`}>
                   <Package size={14}/> Distribution
                 </button>
              </div>
            </div>
          </div>

          <div className="relative w-full lg:w-[400px]">
            <div className={`absolute -inset-1 rounded-2xl blur opacity-20 transition-colors duration-500 ${viewMode === 'donations' ? 'bg-emerald-600' : 'bg-orange-600'}`}></div>
            <div className="relative">
              <MapPin size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30" />
              <select 
                value={selectedSiteCode}
                onChange={(e) => setSelectedSiteCode(e.target.value)}
                className="w-full pl-14 pr-10 py-5 bg-white/5 border border-white/10 rounded-2xl text-sm font-black text-white outline-none focus:ring-2 ring-white/20 appearance-none cursor-pointer transition-all"
              >
                {availableRegions.map(region => (
                  <optgroup key={region} label={region} className="bg-slate-900 text-slate-400 font-black uppercase text-[10px]">
                    {sites.filter(s => s.region === region).map(site => (
                      <option key={site.code} value={site.code} className="text-white bg-slate-900 font-bold py-2">
                        {site.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
           {['day', 'month', 'year'].map(scale => (
             <button 
               key={scale}
               onClick={() => setTimeScale(scale as any)}
               className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeScale === scale ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
             >
               {scale === 'day' ? 'Jour' : scale === 'month' ? 'Mois' : 'Année'}
             </button>
           ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
           <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 border border-slate-200 rounded-2xl group hover:border-emerald-300 transition-all">
              <Calendar size={14} className="text-slate-400 group-hover:text-emerald-500" />
              <select value={selYear} onChange={(e) => setSelYear(e.target.value)} className="bg-transparent outline-none text-xs font-black uppercase tracking-widest cursor-pointer text-slate-700">
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
           </div>

           {timeScale !== 'year' && (
             <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 border border-slate-200 rounded-2xl group hover:border-emerald-300 transition-all">
                <Clock size={14} className="text-slate-400 group-hover:text-emerald-500" />
                <select value={selMonth} onChange={(e) => setSelMonth(e.target.value)} className="bg-transparent outline-none text-xs font-black uppercase tracking-widest cursor-pointer text-slate-700">
                  {MONTHS_FR.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
             </div>
           )}

           {timeScale === 'day' && (
             <div className={`flex items-center gap-3 px-6 py-3 border rounded-2xl shadow-lg transition-all ${viewMode === 'donations' ? 'bg-emerald-600 border-emerald-500 shadow-emerald-100' : 'bg-orange-600 border-orange-500 shadow-orange-100'}`}>
                <CalendarDays size={14} className="text-white/70" />
                <select value={selDate} onChange={(e) => setSelDate(e.target.value)} className="bg-transparent outline-none text-xs font-black uppercase tracking-widest cursor-pointer text-white">
                  {availableDates.map(d => <option key={d} value={d} className="text-slate-900">{d}</option>)}
                </select>
             </div>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1 space-y-10">
          <div className="bg-white rounded-[3.5rem] p-10 shadow-warm border border-slate-100 flex flex-col items-center text-center relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform ${viewMode === 'donations' ? 'bg-emerald-50' : 'bg-orange-50'}`}></div>
            <div className={`w-24 h-24 text-white rounded-[2.5rem] flex items-center justify-center mb-6 shadow-2xl relative z-10 ${viewMode === 'donations' ? 'bg-emerald-900' : 'bg-orange-900'}`}>
              <UserIcon size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-tight mb-2 relative z-10">{selectedSiteInfo.name}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 relative z-10">CI • {selectedSiteInfo.region}</p>
            
            <div className="w-full space-y-3 mb-10">
              <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 flex items-center gap-4">
                 <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400"><Award size={18} /></div>
                 <div className="text-left">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Responsable</p>
                    <p className="text-[11px] font-black text-slate-800 uppercase leading-none">{selectedSiteInfo.manager || 'Non assigné'}</p>
                 </div>
              </div>
              <div className="flex gap-2">
                 <a href={`tel:${selectedSiteInfo.phone?.replace(/\s/g, '') || ''}`} className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-slate-50 transition-all shadow-sm group/btn text-center">
                    <Phone size={16} className="mx-auto text-emerald-500 group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[9px] font-black text-slate-700 uppercase">Appeler</span>
                 </a>
                 <button onClick={handleWhatsAppRelance} className="flex-1 bg-emerald-500 rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 group/btn">
                    <MessageSquare size={16} className="text-white group-hover/btn:scale-110 transition-transform" /><span className="text-[9px] font-black text-white uppercase">Relance</span>
                 </button>
              </div>
            </div>

            {viewMode === 'donations' ? (
              <div className="w-full pt-10 border-t border-slate-50 animate-in fade-in zoom-in duration-500">
                <div className="flex items-center justify-between mb-6"><h4 className="text-xs font-black uppercase text-slate-800">Mix de Collecte</h4><PieChart size={16} className="text-slate-300" /></div>
                <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie data={mixData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={8} dataKey="value" stroke="none" />
                      </RePieChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#10b981' }}></div><span className="text-[9px] font-black text-slate-500 uppercase">Fixe</span></div>
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div><span className="text-[9px] font-black text-slate-500 uppercase">Mobile</span></div>
                </div>
              </div>
            ) : (
              <div className="w-full pt-10 border-t border-slate-50 animate-in fade-in zoom-in duration-500">
                <div className="flex items-center justify-between mb-6"><h4 className="text-xs font-black uppercase text-slate-800">Flux Groupes</h4><ClipboardList size={16} className="text-slate-300" /></div>
                <div className="space-y-2 max-h-[220px] overflow-y-auto no-scrollbar pr-1">
                   {distributionStats?.groupMap.map(([name, val], i) => (
                     <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-orange-50/30 transition-colors border border-transparent hover:border-orange-100">
                        <span className="text-xs font-black text-slate-700">{name}</span>
                        <div className="flex items-center gap-3">
                           <span className="text-[10px] font-black text-orange-600">{val}</span>
                           <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-orange-500" style={{ width: `${(val / (distributionStats.totalQty || 1)) * 100}%` }} />
                           </div>
                        </div>
                     </div>
                   ))}
                   {(!distributionStats) && <div className="py-10 text-center opacity-30 italic text-[10px] uppercase font-black tracking-widest">Aucune distribution</div>}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-10">
          {viewMode === 'donations' && (
            <div className="contents animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/20 blur-[60px] rounded-full"></div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center"><Target size={20}/></div>
                    <h4 className="text-lg font-black uppercase tracking-tighter">Performance Période</h4>
                  </div>
                  <div className="flex items-baseline gap-2 mb-4">
                    <p className="text-5xl font-black">{siteStats.realized.toLocaleString()}</p>
                    <p className="text-sm font-black text-white/40 uppercase">/ {siteStats.objective.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Vitalité Site</span>
                    <span className="text-sm font-black" style={{ color: getStatusColor(siteStats.percentage) }}>{siteStats.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full transition-all duration-1000" style={{ width: `${Math.min(siteStats.percentage, 100)}%`, backgroundColor: getStatusColor(siteStats.percentage) }} />
                  </div>
                </div>

                <div className="bg-white rounded-[3.5rem] p-8 shadow-warm border border-slate-100 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16"></div>
                  <div className="flex items-center gap-4 mb-6 relative z-10">
                    <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg"><History size={20}/></div>
                    <h4 className="text-lg font-black uppercase tracking-tighter text-slate-900">Composition Flux</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4 relative z-10">
                     <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Fixe</p>
                        <p className="text-2xl font-black text-emerald-600">{siteStats.fixed}</p>
                     </div>
                     <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Mobile</p>
                        <p className="text-2xl font-black text-orange-600">{siteStats.mobile}</p>
                     </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[3.5rem] p-10 lg:p-14 shadow-warm border border-slate-100">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 bg-slate-50 text-slate-800 rounded-2xl flex items-center justify-center"><Activity size={24}/></div>
                  <h4 className="text-xl font-black uppercase tracking-tighter text-slate-900">Activité de la Période (7 derniers jours)</h4>
                </div>
                <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReBarChart data={siteStats.chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} tickFormatter={(v) => v.split('/')[0]} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} />
                          <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)', padding: '1rem' }} />
                          <Bar dataKey="fixe" stackId="a" fill={'#10b981'} radius={[0, 0, 0, 0]} name="Fixe" />
                          <Bar dataKey="mobile" stackId="a" fill={'#f59e0b'} radius={[6, 6, 0, 0]} name="Mobile" />
                      </ReBarChart>
                    </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'distribution' && (
            <div className="contents animate-in fade-in duration-500">
              {distributionStats ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-orange-900 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 blur-[60px] rounded-full"></div>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center"><Package size={20}/></div>
                        <h4 className="text-lg font-black uppercase tracking-tighter">Volume Expédié</h4>
                      </div>
                      <div className="flex items-baseline gap-2 mb-4">
                        <p className="text-5xl font-black">{distributionStats.totalQty.toLocaleString()}</p>
                        <p className="text-[10px] font-black text-orange-300/40 uppercase tracking-widest">Poches (Brut)</p>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300/40">Taux d'Utilisation</span>
                        <span className="text-sm font-black text-emerald-400">{distributionStats.efficiency.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${distributionStats.efficiency}%` }} />
                      </div>
                    </div>

                    <div className="bg-white rounded-[3.5rem] p-8 shadow-warm border border-orange-100 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -mr-16 -mt-16"></div>
                      <div className="flex items-center gap-4 mb-6 relative z-10">
                        <div className="w-10 h-10 bg-orange-600 text-white rounded-xl flex items-center justify-center shadow-lg"><RefreshCw size={20}/></div>
                        <h4 className="text-lg font-black uppercase tracking-tighter text-slate-900">Retours & Périmés</h4>
                      </div>
                      <div className="flex items-baseline gap-2 mb-4 relative z-10">
                        <p className="text-5xl font-black text-orange-600">{distributionStats.totalRendu.toLocaleString()}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Poches</p>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 relative z-10">
                         <p className="text-[10px] font-bold text-orange-800 leading-tight">Objectif Qualité : Taux de retour cible inférieur à 5%.</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="bg-white rounded-[3.5rem] p-10 shadow-warm border border-orange-100">
                        <div className="flex items-center gap-4 mb-10">
                           <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center"><BarChart3 size={24}/></div>
                           <h4 className="text-xl font-black uppercase tracking-tighter text-slate-900">Mix par Produit</h4>
                        </div>
                        <div className="h-[320px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <ReBarChart data={distributionStats.productChart} layout="vertical" margin={{ left: 20 }}>
                                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                  <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} />
                                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 8, fontWeight: 900, fill: '#64748b'}} width={100} />
                                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)', padding: '1rem' }} />
                                  <Bar dataKey="value" radius={[0, 10, 10, 0]} name="Poches">
                                    {distributionStats.productChart.map((entry, index) => (
                                        <Cell key={`cell-dist-${index}`} fill={entry.fill} />
                                    ))}
                                  </Bar>
                              </ReBarChart>
                            </ResponsiveContainer>
                        </div>
                     </div>

                     <div className="bg-white rounded-[3.5rem] p-10 shadow-warm border border-orange-100 flex flex-col">
                        <div className="flex items-center gap-4 mb-10">
                           <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center"><ArrowRight size={24}/></div>
                           <h4 className="text-xl font-black uppercase tracking-tighter text-slate-900">Top Destinations</h4>
                        </div>
                        <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar pr-2">
                           {distributionStats.facilities.map(([name, val], i) => (
                             <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-orange-200 transition-all group">
                                <div className="min-w-0">
                                   <p className="text-[10px] font-black text-slate-800 uppercase truncate leading-tight">{name}</p>
                                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Livraisons Site</p>
                                </div>
                                <div className="text-right ml-4 shrink-0">
                                   <p className="text-lg font-black text-orange-600">{val.toLocaleString()}</p>
                                   <div className="flex items-center gap-1">
                                      <CheckCircle size={10} className="text-emerald-500" />
                                      <span className="text-[8px] font-black text-slate-300 uppercase">Confirmés</span>
                                   </div>
                                </div>
                             </div>
                           ))}
                        </div>
                     </div>
                  </div>
                </>
              ) : (
                <div className="py-32 flex flex-col items-center justify-center gap-8 bg-white rounded-[4rem] border border-slate-100 shadow-warm text-center">
                   <Package size={80} className="text-slate-200" />
                   <div>
                      <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-400">Aucune donnée sur cette période</p>
                      <p className="text-[10px] font-bold text-slate-300 italic mt-2">Veuillez ajuster les filtres ou vérifier les saisies HEMO-STATS</p>
                   </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
