import React, { useState, useMemo, useEffect } from 'react';
import { DashboardData, User } from '../types';
import { SITES_DATA, COLORS, getSiteObjectives } from '../constants';
import { 
  Building2, User as UserIcon, Phone, Mail, MapPin, Search, 
  ChevronRight, Target, Zap, Activity, Award, 
  History, Calendar, PieChart, TrendingUp, MessageSquare
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid, Cell, PieChart as RePieChart, Pie
} from 'recharts';

interface SiteSynthesisViewProps {
  data: DashboardData;
  user?: User | null;
}

const getStatusColor = (percentage: number) => {
  if (percentage >= 100) return COLORS.green;
  if (percentage >= 70) return COLORS.orange;
  return COLORS.red;
};

export const SiteSynthesisView: React.FC<SiteSynthesisViewProps> = ({ data, user }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSiteCode, setSelectedSiteCode] = useState(SITES_DATA[0].code);

  // Initialisation automatique basée sur le centre de la session connectée
  useEffect(() => {
    if (user && user.role === 'AGENT' && user.site) {
      const site = SITES_DATA.find(s => s.name.toUpperCase() === user.site.toUpperCase());
      if (site) {
        setSelectedSiteCode(site.code);
      }
    }
  }, [user]);

  const filteredSites = useMemo(() => {
    if (!searchTerm) return SITES_DATA.slice(0, 10);
    return SITES_DATA.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.code.includes(searchTerm)
    ).slice(0, 10);
  }, [searchTerm]);

  const selectedSiteInfo = useMemo(() => 
    SITES_DATA.find(s => s.code === selectedSiteCode) || SITES_DATA[0]
  , [selectedSiteCode]);

  const siteStats = useMemo(() => {
    const siteName = selectedSiteInfo.name.toUpperCase();
    
    // Récupérer les données déjà agrégées par le service pour éviter les écarts
    const siteInData = data.regions
      .flatMap(r => r.sites)
      .find(s => s.name.toUpperCase() === siteName);

    const objs = getSiteObjectives(selectedSiteInfo.name);

    // Historique récent (7 derniers jours d'activité)
    const recentHistory = data.dailyHistory
      .map(h => {
        const s = h.sites.find(site => site.name.toUpperCase() === siteName);
        return {
          date: h.date,
          total: s?.total || 0,
          fixe: s?.fixe || 0,
          mobile: s?.mobile || 0,
          objective: s?.objective || objs.daily
        };
      })
      .filter(h => h.total > 0 || h.date === data.date)
      .slice(0, 7)
      .reverse();

    // Cumul annuel basé sur l'historique complet pour ce site
    const annualRealized = data.dailyHistory
      .filter(h => h.date.split('/')[2] === data.year.toString())
      .reduce((acc, h) => {
        const site = h.sites.find(s => s.name.toUpperCase() === siteName);
        return acc + (site?.total || 0);
      }, 0);

    return {
      monthly: {
        total: siteInData?.totalMois || 0,
        fixe: siteInData?.monthlyFixed || 0,
        mobile: siteInData?.monthlyMobile || 0,
        objective: siteInData?.objMensuel || objs.monthly,
        percentage: (siteInData?.totalMois && siteInData?.objMensuel) ? (siteInData.totalMois / siteInData.objMensuel) * 100 : 0
      },
      annual: {
        realized: annualRealized,
        objective: objs.annual,
        percentage: objs.annual > 0 ? (annualRealized / objs.annual) * 100 : 0
      },
      daily: {
        total: siteInData?.totalJour || 0,
        fixe: siteInData?.fixe || 0,
        mobile: siteInData?.mobile || 0,
        objective: objs.daily,
        percentage: objs.daily > 0 ? ((siteInData?.totalJour || 0) / objs.daily) * 100 : 0
      },
      recentHistory
    };
  }, [selectedSiteInfo, data]);

  const mixData = [
    { name: 'Fixe', value: siteStats.monthly.fixe || 1, fill: COLORS.fixed },
    { name: 'Mobile', value: siteStats.monthly.mobile || 0, fill: COLORS.mobile }
  ];

  const handleWhatsAppRelance = () => {
    if (!selectedSiteInfo.phone) return;
    const msg = `Bonjour ${selectedSiteInfo.manager}, je reviens vers vous concernant les prélèvements du site ${selectedSiteInfo.name}. La situation actuelle est de ${siteStats.monthly.total} poches pour un objectif de ${siteStats.monthly.objective} (${siteStats.monthly.percentage.toFixed(1)}%). Courage pour la suite !`;
    window.open(`https://wa.me/225${selectedSiteInfo.phone.replace(/\s/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="bg-[#0f172a] rounded-[3.5rem] p-8 lg:p-12 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-[120px] -mr-32 -mt-32"></div>
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-red-600 rounded-[2rem] flex items-center justify-center shadow-xl shadow-red-900/40">
              <Building2 size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter leading-none mb-2">Focus Centre</h2>
              <p className="text-white/40 font-black uppercase tracking-[0.4em] text-[9px]">Analyse de performance individuelle</p>
            </div>
          </div>

          <div className="relative w-full lg:w-96">
            <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-500 rounded-2xl blur opacity-20"></div>
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <input 
                type="text"
                placeholder="Rechercher un site..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-black text-white outline-none focus:ring-2 ring-red-50 placeholder:text-white/20"
              />
              {searchTerm && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[200] overflow-hidden">
                  {filteredSites.map(s => (
                    <button 
                      key={s.code}
                      onClick={() => {
                        setSelectedSiteCode(s.code);
                        setSearchTerm("");
                      }}
                      className="w-full flex items-center gap-4 px-4 py-3 hover:bg-slate-50 rounded-xl transition-all text-left group"
                    >
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-red-500">
                        <MapPin size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-slate-800 uppercase truncate">{s.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">{s.code} • {s.region}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1 space-y-10">
          <div className="bg-white rounded-[3.5rem] p-10 shadow-warm border border-slate-100 flex flex-col items-center text-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
            <div className="w-24 h-24 bg-slate-900 text-white rounded-[2.5rem] flex items-center justify-center mb-6 shadow-2xl relative z-10">
              <UserIcon size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-tight mb-2 relative z-10">{selectedSiteInfo.name}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 relative z-10">CODE : {selectedSiteInfo.code} • {selectedSiteInfo.region}</p>
            <div className="w-full space-y-3 mb-10">
              <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 flex items-center gap-4">
                 <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400"><Award size={18} /></div>
                 <div className="text-left">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Responsable</p>
                    <p className="text-[11px] font-black text-slate-800 uppercase leading-none">{selectedSiteInfo.manager}</p>
                 </div>
              </div>
              <div className="flex gap-2">
                 <a href={`tel:${selectedSiteInfo.phone}`} className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-slate-50 transition-all shadow-sm group/btn">
                    <Phone size={16} className="text-emerald-500 group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[9px] font-black text-slate-700 uppercase">Appeler</span>
                 </a>
                 <a href={`mailto:${selectedSiteInfo.email}`} className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-slate-50 transition-all shadow-sm group/btn">
                    <Mail size={16} className="text-blue-500 group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[9px] font-black text-slate-700 uppercase">Email</span>
                 </a>
                 <button onClick={handleWhatsAppRelance} className="flex-1 bg-emerald-500 rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 group/btn">
                    <MessageSquare size={16} className="text-white group-hover/btn:scale-110 transition-transform" /><span className="text-[9px] font-black text-white uppercase">Relance</span>
                 </button>
              </div>
            </div>
            <div className="w-full pt-10 border-t border-slate-50">
               <div className="flex items-center justify-between mb-6"><h4 className="text-xs font-black uppercase text-slate-800">Mix Mensuel</h4><PieChart size={16} className="text-slate-300" /></div>
               <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie data={mixData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={8} dataKey="value" stroke="none" />
                    </RePieChart>
                  </ResponsiveContainer>
               </div>
               <div className="flex justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.fixed }}></div><span className="text-[9px] font-black text-slate-500 uppercase">Fixe</span></div>
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.mobile }}></div><span className="text-[9px] font-black text-slate-500 uppercase">Mobile</span></div>
               </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/20 blur-[60px] rounded-full"></div>
               <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center"><Target size={20}/></div>
                  <h4 className="text-lg font-black uppercase tracking-tighter">Performance Mensuelle</h4>
               </div>
               <div className="flex items-baseline gap-2 mb-4">
                  <p className="text-5xl font-black">{siteStats.monthly.total.toLocaleString()}</p>
                  <p className="text-sm font-black text-white/40 uppercase">/ {siteStats.monthly.objective.toLocaleString()}</p>
               </div>
               <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Progression</span>
                  <span className="text-sm font-black" style={{ color: getStatusColor(siteStats.monthly.percentage) }}>{siteStats.monthly.percentage.toFixed(1)}%</span>
               </div>
               <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full transition-all duration-1000" style={{ width: `${Math.min(siteStats.monthly.percentage, 100)}%`, backgroundColor: getStatusColor(siteStats.monthly.percentage) }} />
               </div>
            </div>

            <div className="bg-white rounded-[3rem] p-8 shadow-warm border border-slate-100 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16"></div>
               <div className="flex items-center gap-4 mb-6 relative z-10">
                  <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center"><TrendingUp size={20}/></div>
                  <h4 className="text-lg font-black uppercase tracking-tighter text-slate-900">Performance Annuelle</h4>
               </div>
               <div className="flex items-baseline gap-2 mb-4 relative z-10">
                  <p className="text-5xl font-black text-slate-900">{siteStats.annual.realized.toLocaleString()}</p>
                  <p className="text-sm font-black text-slate-400 uppercase">/ {siteStats.annual.objective.toLocaleString()}</p>
               </div>
               <div className="flex items-center justify-between mb-2 relative z-10">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Progression</span>
                  <span className="text-sm font-black text-slate-900">{siteStats.annual.percentage.toFixed(1)}%</span>
               </div>
               <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden relative z-10">
                  <div className="h-full bg-slate-900 transition-all duration-1000" style={{ width: `${Math.min(siteStats.annual.percentage, 100)}%` }} />
               </div>
            </div>
          </div>

          <div className="bg-white rounded-[3rem] p-10 shadow-warm border border-slate-100">
             <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-slate-50 text-slate-800 rounded-2xl flex items-center justify-center"><Activity size={24}/></div>
                   <h4 className="text-xl font-black uppercase tracking-tighter text-slate-900">Activité Récente</h4>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-[9px] font-black text-slate-400 uppercase">Fixe</span></div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500"></div><span className="text-[9px] font-black text-slate-400 uppercase">Mobile</span></div>
                </div>
             </div>
             <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={siteStats.recentHistory}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} tickFormatter={(v) => v.split('/')[0]} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)', padding: '1rem' }} />
                      <Bar dataKey="fixe" stackId="a" fill={COLORS.fixed} radius={[0, 0, 0, 0]} name="Fixe" />
                      <Bar dataKey="mobile" stackId="a" fill={COLORS.mobile} radius={[4, 4, 0, 0]} name="Mobile" />
                   </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
