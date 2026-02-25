
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DashboardData, User, DistributionRecord } from '../types.ts';
import { getSiteObjectives, PRODUCT_COLORS, GROUP_COLORS } from '../constants.tsx';
import { 
  Building2, User as UserIcon, Phone, MapPin, Target, Activity, Award, 
  History, Calendar, PieChart, MessageSquare,
  Truck, ClipboardList, BarChart3, Package, RefreshCw,
  ArrowRight, Clock, CalendarDays, ChevronDown, Globe, Layers,
  FileImage, FileText, Loader2, Hospital, Zap
} from 'lucide-react';
import { 
  BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid, Cell, PieChart as RePieChart, Pie, LabelList, Legend
} from 'recharts';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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
  const [selectedValue, setSelectedValue] = useState("ALL");
  const [viewMode, setViewMode] = useState<'donations' | 'distribution'>('donations');
  const [exporting, setExporting] = useState<'image' | 'pdf' | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [timeScale, setTimeScale] = useState<'day' | 'month' | 'year'>('month');
  const [selYear, setSelYear] = useState<string>("");
  const [selMonth, setSelMonth] = useState<string>("");
  const [selDate, setSelDate] = useState<string>("");

  const availableSites = useMemo(() => {
    if (!user || user.role === 'ADMIN' || user.role === 'SUPERADMIN') return sites;
    if (user.role === 'PRES') return sites.filter(s => s.region.toUpperCase() === user.region?.toUpperCase());
    if (user.role === 'AGENT') return sites.filter(s => s.name.toUpperCase() === user.site.toUpperCase());
    return [];
  }, [sites, user]);

  const availableRegions = useMemo(() => Array.from(new Set(availableSites.map((s: any) => s.region))).sort(), [availableSites]);

  useEffect(() => {
    if (user?.role === 'AGENT' && user.site) {
      const site = sites.find((s: any) => s.name.toUpperCase() === user.site.toUpperCase());
      if (site) setSelectedValue(`SITE:${site.code}`);
    } else if (user?.role === 'PRES' && user.region) {
      setSelectedValue(`REGION:${user.region}`);
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
    data.dailyHistory.forEach((h: any) => years.add(h.date.split('/')[2]));
    return Array.from(years).sort().reverse();
  }, [data.dailyHistory]);

  const isNational = selectedValue === "ALL";
  const isRegion = selectedValue.startsWith("REGION:");
  const isSite = selectedValue.startsWith("SITE:");

  const selectionInfo = useMemo(() => {
    if (isNational) {
      return { 
        name: user?.role === 'PRES' ? `CUMUL ${user.region}` : "CONSOLIDATION NATIONALE", 
        region: user?.region || "NATIONAL", 
        type: 'NATIONAL', 
        manager: user?.role === 'PRES' ? "DIRECTION REGIONALE" : "DIRECTION NATIONALE" 
      };
    }
    if (isRegion) {
      const regionName = selectedValue.split(":")[1];
      return { name: `PRES ${regionName.replace('PRES ', '')}`, region: regionName, type: 'REGION', manager: "DIRECTION REGIONALE" };
    }
    const siteCode = selectedValue.split(":")[1];
    const site = sites.find(s => s.code === siteCode);
    return { ...site, type: 'SITE' };
  }, [selectedValue, sites, user, isNational, isRegion]);

  const relevantHistory = useMemo(() => {
    return data.dailyHistory.filter((h: any) => {
      const parts = h.date.split('/');
      const y = parts[2];
      const m = (parseInt(parts[1]) - 1).toString();
      const d = h.date;
      if (timeScale === 'day') return d === selDate;
      if (timeScale === 'month') return y === selYear && m === selMonth;
      return y === selYear;
    });
  }, [data.dailyHistory, timeScale, selYear, selMonth, selDate]);

  const stats = useMemo(() => {
    let r = 0, f = 0, m = 0, o = 0;
    const targetedSites = availableSites.filter(s => {
      if (isNational) return true;
      if (isRegion) return s.region === selectionInfo.region;
      return s.code === selectedValue.split(":")[1];
    });

    relevantHistory.forEach((h: any) => {
      const filteredSites = h.sites.filter((s: any) => targetedSites.some(as => as.name.toUpperCase() === s.name.toUpperCase()));
      r += filteredSites.reduce((acc: number, s: any) => acc + s.total, 0);
      f += filteredSites.reduce((acc: number, s: any) => acc + s.fixe, 0);
      m += filteredSites.reduce((acc: number, s: any) => acc + s.mobile, 0);
    });

    const totalAnnualObj = targetedSites.reduce((acc, s) => acc + s.annualObjective, 0);
    if (timeScale === 'day') o = Math.round(totalAnnualObj / 313);
    else if (timeScale === 'year') o = totalAnnualObj;
    else o = Math.round(totalAnnualObj / 12);
    
    const chartData = relevantHistory.slice().reverse().map((h: any) => {
      const filteredSites = h.sites.filter((s: any) => targetedSites.some(as => as.name.toUpperCase() === s.name.toUpperCase()));
      return { 
        date: h.date, 
        fixe: filteredSites.reduce((acc: number, s: any) => acc + s.fixe, 0),
        mobile: filteredSites.reduce((acc: number, s: any) => acc + s.mobile, 0),
        total: filteredSites.reduce((acc: number, s: any) => acc + s.total, 0)
      };
    });

    return { realized: r, fixed: f, mobile: m, objective: o, percentage: o > 0 ? (r / o) * 100 : 0, chartData };
  }, [selectionInfo, relevantHistory, isNational, isRegion, timeScale, availableSites, selectedValue]);

  const distributionStats = useMemo(() => {
    if (!data.distributions?.records) return null;
    const targetedSites = availableSites.filter(s => {
      if (isNational) return true;
      if (isRegion) return s.region === selectionInfo.region;
      return s.code === selectedValue.split(":")[1];
    });

    const filtered = data.distributions.records.filter((r: DistributionRecord) => {
      const parts = r.date.split('/');
      const y = parts[2], m = (parseInt(parts[1]) - 1).toString(), d = r.date;
      const matchTime = timeScale === 'day' ? d === selDate : timeScale === 'month' ? (y === selYear && m === selMonth) : (y === selYear);
      const matchScope = targetedSites.some(s => s.name.toUpperCase() === r.site.toUpperCase());
      return matchTime && matchScope;
    });

    if (filtered.length === 0) return null;
    let tq = 0, tr = 0;
    const prodMap = new Map<string, number>(), grpMap = new Map<string, number>();
    const facilityMap = new Map<string, { total: number, cgr: number, plasma: number, platelets: number }>();

    filtered.forEach((r: DistributionRecord) => {
      tq += r.quantite; tr += r.rendu;
      const prodName = r.typeProduit || "AUTRES";
      prodMap.set(prodName, (prodMap.get(prodName) || 0) + r.quantite);
      grpMap.set(r.groupeSanguin, (grpMap.get(r.groupeSanguin) || 0) + r.quantite);
      const facName = r.etablissement || "INCONNU";
      if (!facilityMap.has(facName)) facilityMap.set(facName, { total: 0, cgr: 0, plasma: 0, platelets: 0 });
      const f = facilityMap.get(facName)!;
      f.total += r.quantite;
      const p = prodName.toUpperCase();
      if (p.includes("CGR")) f.cgr += r.quantite;
      else if (p.includes("PLASMA")) f.plasma += r.quantite;
      else if (p.includes("PLAQUETTE") || p.includes("PLATELET")) f.platelets += r.quantite;
    });

    return { 
      totalQty: tq, totalRendu: tr, efficiency: tq > 0 ? ((tq - tr) / tq) * 100 : 0, 
      productChart: Array.from(prodMap.entries()).map(([name, value]) => ({ name, value, fill: PRODUCT_COLORS[name] || '#f59e0b' })).sort((a,b) => b.value - a.value),
      groupChart: Array.from(grpMap.entries()).map(([name, value]) => ({ name, value, fill: GROUP_COLORS[name] || '#64748b' })).sort((a,b) => b.value - a.value),
      topFacilities: Array.from(facilityMap.entries()).sort((a, b) => b[1].total - a[1].total).slice(0, 8).map(([name, stats]) => ({ name, ...stats }))
    };
  }, [data.distributions, timeScale, selYear, selMonth, selDate, availableSites, isNational, isRegion, selectedValue, selectionInfo]);

  const presAggregatedData = useMemo(() => {
    const targetedSites = availableSites.filter(s => {
      if (isNational) return true;
      if (isRegion) return s.region === selectionInfo.region;
      return false;
    });

    if (targetedSites.length === 0 || isSite) return [];
    const presMap = new Map<string, any>();
    if (viewMode === 'donations') {
      relevantHistory.forEach((h: any) => {
        const filteredSites = h.sites.filter((s: any) => targetedSites.some(as => as.name.toUpperCase() === s.name.toUpperCase()));
        filteredSites.forEach((s: any) => {
          const r = isNational ? (s.region || "AUTRES") : s.name;
          if (!presMap.has(r)) presMap.set(r, { name: r, total: 0 });
          presMap.get(r).total += s.total;
        });
      });
    } else {
      const records = data.distributions?.records || [];
      const filtered = records.filter((r: DistributionRecord) => {
        const parts = r.date.split('/');
        const y = parts[2], m = (parseInt(parts[1]) - 1).toString();
        const matchTime = timeScale === 'day' ? r.date === selDate : timeScale === 'month' ? (y === selYear && m === selMonth) : (y === selYear);
        const matchScope = targetedSites.some(s => s.name.toUpperCase() === r.site.toUpperCase());
        return matchTime && matchScope;
      });
      filtered.forEach((r: DistributionRecord) => {
        const key = isNational ? (r.region || "AUTRES") : r.site;
        if (!presMap.has(key)) presMap.set(key, { name: key, total: 0, cgr: 0, plasma: 0, platelets: 0 });
        const entry = presMap.get(key);
        entry.total += r.quantite;
        const prod = r.typeProduit.toUpperCase();
        if (prod.includes("CGR")) entry.cgr += r.quantite;
        else if (prod.includes("PLASMA")) entry.plasma += r.quantite;
        else if (prod.includes("PLAQUETTE") || prod.includes("PLATELET")) entry.platelets += r.quantite;
      });
    }
    return Array.from(presMap.values()).sort((a, b) => b.total - a.total);
  }, [isNational, isRegion, isSite, relevantHistory, viewMode, data.distributions, timeScale, selYear, selMonth, selDate, availableSites, selectionInfo]);

  const handleExport = async (type: 'image' | 'pdf') => {
    if (!contentRef.current) return;
    setExporting(type);
    await new Promise(res => setTimeout(res, 500));
    try {
      const canvas = await html2canvas(contentRef.current, { scale: 2, useCORS: true, backgroundColor: '#f8fafc' });
      const img = canvas.toDataURL('image/png');
      if (type === 'image') {
        const l = document.createElement('a'); l.download = 'FOCUS.png'; l.href = img; l.click();
      } else {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pw = pdf.internal.pageSize.getWidth();
        pdf.addImage(img, 'PNG', 0, 0, pw, (canvas.height / canvas.width) * pw);
        pdf.save('FOCUS.pdf');
      }
    } finally { setExporting(null); }
  };

  return (
    <div className="space-y-8 pb-24">
      <div className="bg-[#0f172a] rounded-[3rem] p-8 text-white flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-6">
           <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${viewMode === 'donations' ? 'bg-emerald-600' : 'bg-orange-600'}`}>
             {viewMode === 'donations' ? <Building2 size={28} /> : <Truck size={28} />}
           </div>
           <div>
             <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Focus Analyse</h2>
             <div className="flex bg-white/5 p-1 rounded-xl mt-2">
               <button onClick={() => setViewMode('donations')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase ${viewMode === 'donations' ? 'bg-emerald-600' : 'text-white/40'}`}>Prélèvements</button>
               <button onClick={() => setViewMode('distribution')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase ${viewMode === 'distribution' ? 'bg-orange-600' : 'text-white/40'}`}>Distribution</button>
             </div>
           </div>
        </div>
        {user?.role !== 'AGENT' ? (
          <select value={selectedValue} onChange={(e) => setSelectedValue(e.target.value)} className="w-full lg:w-72 bg-white/5 border border-white/10 p-4 rounded-xl text-xs font-black outline-none cursor-pointer">
            <option value="ALL" className="bg-slate-900">{user?.role === 'PRES' ? `CUMUL ${user.region}` : "CONSOLIDATION NATIONALE"}</option>
            {availableRegions.map(r => (
              <optgroup key={r} label={r} className="bg-slate-900">
                <option value={`REGION:${r}`} className="font-black text-blue-400">AGRÉGATION {r.replace('PRES ', '')}</option>
                {availableSites.filter(s => s.region === r).map(s => <option key={s.code} value={`SITE:${s.code}`}>{s.name}</option>)}
              </optgroup>
            ))}
          </select>
        ) : (
          <div className="px-6 py-4 bg-white/10 border border-white/20 rounded-xl text-xs font-black uppercase tracking-widest">{user.site}</div>
        )}
      </div>

      <div className="bg-white p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm border">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          {['day', 'month', 'year'].map(s => (
            <button key={s} onClick={() => setTimeScale(s as any)} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase ${timeScale === s ? 'bg-white shadow-sm' : 'text-slate-400'}`}>
              {s === 'day' ? 'Jour' : s === 'month' ? 'Mois' : 'Année'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
           <select value={selYear} onChange={(e) => setSelYear(e.target.value)} className="bg-slate-50 border p-2 rounded-lg text-[10px] font-black uppercase">{availableYears.map(y => <option key={y} value={y}>{y}</option>)}</select>
           {timeScale !== 'year' && <select value={selMonth} onChange={(e) => setSelMonth(e.target.value)} className="bg-slate-50 border p-2 rounded-lg text-[10px] font-black uppercase">{MONTHS_FR.map((m,i) => <option key={i} value={i.toString()}>{m}</option>)}</select>}
           <button onClick={() => handleExport('image')} disabled={!!exporting} className="p-2 border rounded-lg bg-white shadow-sm">{exporting ? <Loader2 size={16} className="animate-spin"/> : <FileImage size={16}/>}</button>
        </div>
      </div>

      <div ref={contentRef} className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-1">
        <div className="lg:col-span-1 bg-white rounded-[2.5rem] p-8 border shadow-sm">
           <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-white ${isNational ? 'bg-slate-900' : isRegion ? 'bg-blue-600' : 'bg-red-600'}`}>
             {isNational ? <Globe size={32} /> : isRegion ? <MapPin size={32} /> : <Building2 size={32} />}
           </div>
           <h3 className="text-2xl font-[950] uppercase leading-tight mb-2 text-slate-900 tracking-tighter">{selectionInfo.name}</h3>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 border-b pb-4">{selectionInfo.region}</p>
           
           {(isNational || isRegion) ? (
             <div className="space-y-3">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{isNational ? "Rapport par PRES" : "Détail du PRES"}</p>
               {presAggregatedData.map((p, i) => (
                 <div key={i} className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 hover:shadow-md transition-shadow group">
                   <div className="flex flex-col gap-2 mb-3">
                     {/* NOM AVANT LE TOTAL */}
                     <p className="text-sm font-[950] uppercase text-slate-900 tracking-tighter leading-none group-hover:text-blue-600 transition-colors">
                        {p.name.toUpperCase().startsWith("PRES ") ? p.name : `PRES ${p.name}`}
                     </p>
                     <div className="flex items-baseline gap-2">
                       <span className="text-xl font-black text-slate-900">{p.total.toLocaleString()}</span>
                       <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Poches</span>
                     </div>
                   </div>
                   {viewMode === 'distribution' && (
                     <div className="grid grid-cols-3 gap-1.5 mt-4">
                        <div className="text-center bg-white rounded-xl p-2 border border-slate-100 shadow-sm">
                           <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">CGR</p>
                           <p className="text-[11px] font-black text-red-500">{p.cgr}</p>
                        </div>
                        <div className="text-center bg-white rounded-xl p-2 border border-slate-100 shadow-sm">
                           <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">PLASMA</p>
                           <p className="text-[11px] font-black text-blue-500">{p.plasma}</p>
                        </div>
                        <div className="text-center bg-white rounded-xl p-2 border border-slate-100 shadow-sm">
                           <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">PLAT.</p>
                           <p className="text-[11px] font-black text-emerald-500">{p.platelets}</p>
                        </div>
                     </div>
                   )}
                 </div>
               ))}
             </div>
           ) : (
             <div className="space-y-4">
               <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3">
                 <Award size={18} className="text-slate-400"/>
                 <div><p className="text-[8px] font-black text-slate-400 uppercase">Responsable</p><p className="text-[11px] font-black uppercase text-slate-900">{selectionInfo.manager || 'Non assigné'}</p></div>
               </div>
               <div className="flex gap-2">
                 {selectionInfo.phone && <a href={`tel:${selectionInfo.phone}`} className="flex-1 p-3 bg-emerald-500 text-white rounded-xl text-center text-[9px] font-black uppercase">Appeler</a>}
                 <button className="flex-1 p-3 bg-slate-900 text-white rounded-xl text-center text-[9px] font-black uppercase">Email</button>
               </div>
             </div>
           )}
        </div>
        <div className="lg:col-span-2 space-y-8">
           {viewMode === 'donations' ? (
             <div className="contents">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
                      <div className="relative z-10">
                        <p className="text-[9px] font-black text-white/40 uppercase mb-4 tracking-widest">Performance Volume</p>
                        <div className="flex items-baseline gap-2 mb-4"><span className="text-5xl font-black">{stats.realized.toLocaleString()}</span><span className="text-xs font-black text-white/30">/ {stats.objective.toLocaleString()}</span></div>
                        <div className="flex justify-between items-center mb-2"><span className="text-[9px] font-black uppercase">Taux d'Atteinte</span><span className="text-sm font-black" style={{ color: getStatusColor(stats.percentage) }}>{stats.percentage.toFixed(1)}%</span></div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full transition-all" style={{ width: `${Math.min(stats.percentage, 100)}%`, backgroundColor: getStatusColor(stats.percentage) }}/></div>
                      </div>
                   </div>
                   <div className="bg-white rounded-[2.5rem] p-8 border shadow-sm flex flex-col justify-between">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-6">Mix de la Collecte</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl text-center"><p className="text-[8px] font-black text-slate-400 uppercase mb-1">Fixe</p><p className="text-2xl font-black text-emerald-600">{stats.fixed.toLocaleString()}</p></div>
                        <div className="p-4 bg-slate-50 rounded-2xl text-center"><p className="text-[8px] font-black text-slate-400 uppercase mb-1">Mobile</p><p className="text-2xl font-black text-orange-600">{stats.mobile.toLocaleString()}</p></div>
                      </div>
                   </div>
                </div>
                <div className="bg-white rounded-[2.5rem] p-8 border shadow-sm">
                   <p className="text-[10px] font-black uppercase text-slate-400 mb-8">Historique d'Activité de la Période</p>
                   <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                         <ReBarChart data={stats.chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900}} />
                            <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }} />
                            <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Poches" />
                         </ReBarChart>
                      </ResponsiveContainer>
                   </div>
                </div>
             </div>
           ) : (
             distributionStats ? (
               <div className="contents">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-orange-900 rounded-[2.5rem] p-8 text-white flex flex-col justify-center">
                       <p className="text-[9px] font-black text-white/40 uppercase mb-4 tracking-widest">Volume Distribué Brut</p>
                       <p className="text-6xl font-black">{distributionStats.totalQty.toLocaleString()}</p>
                       <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center"><span className="text-[9px] font-black uppercase">Utilisation Nette</span><span className="text-2xl font-black text-emerald-400">{distributionStats.efficiency.toFixed(1)}%</span></div>
                    </div>
                    <div className="bg-white rounded-[2.5rem] p-8 border shadow-sm flex flex-col justify-center">
                       <p className="text-[9px] font-black text-slate-400 uppercase mb-4">Retours & Périmés</p>
                       <p className="text-6xl font-black text-orange-600">{distributionStats.totalRendu.toLocaleString()}</p>
                       <p className="text-[8px] font-black text-slate-300 uppercase mt-4">Volume non utilisé sur la période</p>
                    </div>
                 </div>

                 <div className="bg-white rounded-[3rem] p-10 shadow-warm border border-orange-100">
                    <div className="flex items-center gap-5 mb-10">
                       <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center shadow-lg"><PieChart size={28}/></div>
                       <div>
                          <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Synthèse Analytique du Flux</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mix Produits & Groupes Sanguins</p>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                       <div className="space-y-8">
                          <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                             <Package size={16} className="text-orange-500" /> Repartition par produit
                          </p>
                          <div className="h-[300px] w-full bg-slate-50/50 rounded-3xl p-6">
                             <ResponsiveContainer width="100%" height="100%">
                                <ReBarChart data={distributionStats.productChart} layout="vertical" margin={{ left: -10, right: 40 }}>
                                   <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                   <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} />
                                   {/* Augmentation POLICE axe Y pour PNG */}
                                   <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 950, fill: '#1e293b'}} width={130} />
                                   <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '2rem', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)', padding: '1rem' }} />
                                   <Bar dataKey="value" radius={[0, 10, 10, 0]} name="Poches">
                                      {distributionStats.productChart.map((entry, index) => <Cell key={`cell-p-${index}`} fill={entry.fill} />)}
                                      {/* Augmentation POLICE étiquette droite */}
                                      <LabelList dataKey="value" position="right" style={{ fill: '#0f172a', fontSize: '15px', fontWeight: '950' }} />
                                   </Bar>
                                </ReBarChart>
                             </ResponsiveContainer>
                          </div>
                       </div>

                       <div className="space-y-8">
                          <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                             <ClipboardList size={16} className="text-orange-500" /> Repartition par groupe sanguin
                          </p>
                          <div className="h-[300px] w-full bg-slate-50/50 rounded-3xl p-6 relative">
                             <ResponsiveContainer width="100%" height="100%">
                                <RePieChart>
                                   <Pie
                                      data={distributionStats.groupChart}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius="50%"
                                      outerRadius="80%"
                                      paddingAngle={4}
                                      dataKey="value"
                                      stroke="none"
                                      cornerRadius={8}
                                      animationDuration={1500}
                                   >
                                      {distributionStats.groupChart.map((entry, index) => (
                                         <Cell key={`cell-g-${index}`} fill={entry.fill} />
                                      ))}
                                   </Pie>
                                   <Tooltip 
                                      contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', padding: '1rem', fontWeight: '900' }}
                                   />
                                   <Legend 
                                      verticalAlign="bottom" 
                                      height={36} 
                                      iconType="circle" 
                                      wrapperStyle={{ fontSize: '10px', fontWeight: '950', textTransform: 'uppercase', letterSpacing: '0.5px' }} 
                                   />
                                </RePieChart>
                             </ResponsiveContainer>
                          </div>
                       </div>
                    </div>
                 </div>

                 {(isNational || isRegion) && (
                   <div className="bg-white rounded-[3rem] p-10 shadow-warm border border-slate-100">
                      <div className="flex items-center gap-5 mb-10">
                        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-lg"><Hospital size={28}/></div>
                        <div>
                          <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Top Établissements Servis</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Palmarès par volume & mix produits</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        {distributionStats.topFacilities.map((fac, idx) => (
                          <div key={idx} className="flex flex-col md:flex-row items-center justify-between p-6 bg-slate-50 rounded-3xl hover:bg-white hover:shadow-xl transition-all group border border-transparent hover:border-indigo-100">
                             <div className="flex flex-col gap-1 mb-4 md:mb-0">
                                {/* NOM AVANT LE TOTAL */}
                                <p className="text-sm font-[950] text-slate-900 uppercase leading-none tracking-tight truncate max-w-[350px] group-hover:text-indigo-600 transition-colors mb-2">
                                   {fac.name}
                                </p>
                                <div className="flex items-baseline gap-2">
                                   <span className="text-xl font-black text-indigo-600">{fac.total.toLocaleString()}</span>
                                   <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Poches</span>
                                </div>
                             </div>
                             <div className="flex items-center gap-6">
                                <div className="grid grid-cols-3 gap-2">
                                   <div className="text-center px-4 py-2 bg-white rounded-xl border border-slate-100 shadow-sm min-w-[70px]">
                                      <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">CGR</p>
                                      <p className="text-[13px] font-black text-red-500">{fac.cgr}</p>
                                   </div>
                                   <div className="text-center px-4 py-2 bg-white rounded-xl border border-slate-100 shadow-sm min-w-[70px]">
                                      <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">PLASMA</p>
                                      <p className="text-[13px] font-black text-amber-500">{fac.plasma}</p>
                                   </div>
                                   <div className="text-center px-4 py-2 bg-white rounded-xl border border-slate-100 shadow-sm min-w-[70px]">
                                      <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">PLAT.</p>
                                      <p className="text-[13px] font-black text-indigo-500">{fac.platelets}</p>
                                   </div>
                                </div>
                             </div>
                          </div>
                        ))}
                      </div>
                   </div>
                 )}
               </div>
             ) : <div className="p-20 text-center text-slate-300 uppercase text-[10px] font-black">Aucune distribution enregistrée</div>
           )}
        </div>
      </div>
    </div>
  );
};
