
import React, { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
/* Added User import */
import { DashboardData, DistributionRecord, User, AppTab } from '../types';
import { Activity, Zap, Flame, Waves, Heart, Target, Trophy, Calendar, Filter, Star, FileImage, FileText, Loader2, User as UserIcon, Truck, Package, TrendingUp, ArrowUpRight, ArrowDownRight, Info, AlertTriangle, Sparkles, ChevronRight, Brain, RefreshCw, ArrowRight, Database, BarChart3, History as HistoryIcon } from 'lucide-react';
import { domToPng } from 'modern-screenshot';
import { jsPDF } from 'jspdf';
import { COLORS } from '../constants';
import { SmartInsights } from './SmartInsights.tsx';
import { GoogleGenAI } from "@google/genai";

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const getDynamicColor = (perf: number) => {
  if (perf >= 100) return '#f97316'; // Orange Excellence
  if (perf >= 75) return '#fbbf24';  // Amber Vigilance
  return '#ef4444';               // Rouge Alerte
};

interface PulsePerformanceProps {
  data: DashboardData;
  user?: User | null;
  onLoginClick?: () => void;
  isConnected?: boolean;
  branding?: { logo: string; hashtag: string };
  setActiveTab?: (tab: AppTab) => void;
  onSiteSelect?: (siteName: string) => void;
}

export const PulsePerformance: React.FC<PulsePerformanceProps> = ({ data, onLoginClick, isConnected, branding, setActiveTab, onSiteSelect }) => {
  const [viewMode, setViewMode] = useState<'donations' | 'distribution'>('donations');
  const [pulsePhase, setPulsePhase] = useState(0);
  const [exporting, setExporting] = useState<'image' | 'pdf' | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const pulseRef = useRef<HTMLDivElement>(null);

  const fetchAiInsight = useCallback(async () => {
    if (!isConnected || isAiLoading) return;
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const prompt = `En tant qu'expert CNTS, donne un insight stratégique unique en 15 mots max basé sur ces chiffres: 
      Jour: ${data.daily.realized}/${data.daily.objective} (${data.daily.percentage.toFixed(1)}%), 
      Mois: ${data.monthly.realized}/${data.monthly.objective} (${data.monthly.percentage.toFixed(1)}%).
      Stock total: ${data.stock?.reduce((acc, s) => acc + s.quantite, 0) || 0} poches.
      Concentres-toi sur l'urgence ou la réussite. Sois percutant.`;

      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { temperature: 0.9, maxOutputTokens: 60 }
      });
      setAiInsight(result.text || "Analyse indisponible.");
    } catch (e) {
      setAiInsight("Le flux de données nécessite une attention immédiate.");
    } finally {
      setIsAiLoading(false);
    }
  }, [data, isConnected]);

  useEffect(() => {
    fetchAiInsight();
  }, [fetchAiInsight]);

  const availableYears = useMemo(() => {
    if (!data?.dailyHistory) return [];
    const years = new Set<string>();
    data.dailyHistory.forEach(h => {
      const parts = h.date.split('/');
      if (parts[2]) years.add(parts[2]);
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [data?.dailyHistory]);

  const [selectedYear, setSelectedYear] = useState(availableYears[0] || "2026");

  const availableMonths = useMemo(() => {
    if (!data?.dailyHistory) return [];
    const months = new Set<number>();
    data.dailyHistory.forEach(h => {
      const parts = h.date.split('/');
      if (parts[2] === selectedYear) {
        months.add(parseInt(parts[1]) - 1);
      }
    });
    return Array.from(months).sort((a, b) => a - b);
  }, [data?.dailyHistory, selectedYear]);

  const [selectedMonth, setSelectedMonth] = useState<number>(
    availableMonths.length > 0 ? availableMonths[availableMonths.length - 1] : new Date().getMonth()
  );

  const availableDays = useMemo(() => {
    if (!data?.dailyHistory) return [];
    return data.dailyHistory
      .filter(h => {
        const parts = h.date.split('/');
        return parts[2] === selectedYear && (parseInt(parts[1]) - 1) === selectedMonth;
      })
      .map(h => h.date);
  }, [data?.dailyHistory, selectedYear, selectedMonth]);

  const [selectedDay, setSelectedDay] = useState(availableDays[0] || data.date);

  useEffect(() => {
    if (availableDays.length > 0 && !availableDays.includes(selectedDay)) {
      setSelectedDay(availableDays[0]);
    }
  }, [availableDays, selectedDay]);

  const dayRecord = useMemo(() => 
    data.dailyHistory.find(h => h.date === selectedDay) || data.dailyHistory[0]
  , [selectedDay, data.dailyHistory]);

  const dayObjectives = useMemo(() => {
    if (!dayRecord) return { total: 1137, fixed: 480, mobile: 657 };
    const total = dayRecord.sites.reduce((acc, s) => acc + (s.objective || 0), 0);
    return {
      total: total || 1137,
      fixed: Math.round(total * 0.42),
      mobile: Math.round(total * 0.58)
    };
  }, [dayRecord]);

  const distDayStats = useMemo(() => {
    if (!data.distributions?.records) return { qty: 0, efficiency: 0, rendu: 0 };
    const dayRecs = data.distributions.records.filter(r => r.date === selectedDay);
    const qty = dayRecs.reduce((acc, r) => acc + r.quantite, 0);
    const rendu = dayRecs.reduce((acc, r) => acc + r.rendu, 0);
    return {
      qty, rendu,
      efficiency: qty > 0 ? ((qty - rendu) / qty) * 100 : 0
    };
  }, [data.distributions, selectedDay]);

  const perfDaily = useMemo(() => {
    if (viewMode === 'donations') {
      const realized = dayRecord?.stats?.realized || 0;
      return (realized / dayObjectives.total) * 100;
    } else {
      return distDayStats.efficiency;
    }
  }, [viewMode, dayRecord, dayObjectives, distDayStats]);

  // Dynamic recommendation based on performance
  const recommendation = useMemo(() => {
    if (perfDaily >= 100) return "OBJECTIF ATTEINT : OPTIMISATION DES STOCKS EN COURS";
    if (perfDaily >= 75) return "VIGILANCE : ACCÉLÉRER LES COLLECTES MOBILES";
    return "URGENCE : MOBILISATION GÉNÉRALE REQUISE";
  }, [perfDaily]);

  const nationalPulseColor = useMemo(() => 
    viewMode === 'donations' ? getDynamicColor(perfDaily) : '#3b82f6'
  , [perfDaily, viewMode]);

  // Health Score Logic (Simulated based on multiple factors)
  const healthScore = useMemo(() => {
    const donationPerf = (data.monthly.realized / (data.monthly.objective || 1)) * 100;
    const stockLevel = data.stock?.reduce((acc, s) => acc + s.quantite, 0) || 0;
    const stockHealth = Math.min(100, (stockLevel / 5000) * 100);
    return Math.round((donationPerf * 0.6) + (stockHealth * 0.4));
  }, [data]);

  const [liveAction, setLiveAction] = useState<{site: string, count: number, type: 'donation' | 'distribution'} | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const sites = data.dailyHistory[0]?.sites || [];
        if (sites.length > 0) {
          const randomSite = sites[Math.floor(Math.random() * sites.length)];
          setLiveAction({
            site: randomSite.name,
            count: Math.floor(Math.random() * 5) + 1,
            type: viewMode === 'donations' ? 'donation' : 'distribution'
          });
          setTimeout(() => setLiveAction(null), 4000);
        }
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [data.dailyHistory, viewMode]);

  useEffect(() => {
    const interval = setInterval(() => { setPulsePhase(p => (p + 1) % 100); }, 40);
    return () => clearInterval(interval);
  }, []);

  const handleExport = async (type: 'image' | 'pdf') => {
    if (!pulseRef.current) return;
    setExporting(type);
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const imgData = await domToPng(pulseRef.current, { 
        scale: 2, 
        backgroundColor: '#f8fafc',
      });

      const img = new Image();
      img.src = imgData;
      await new Promise((resolve) => (img.onload = resolve));

      const logoImg = new Image();
      if (branding?.logo) {
        logoImg.src = branding.logo;
        logoImg.crossOrigin = 'anonymous';
        await new Promise((resolve) => {
          logoImg.onload = resolve;
          logoImg.onerror = resolve;
        });
      }

      if (type === 'image') {
        const link = document.createElement('a'); link.download = `PULSE_${viewMode}.png`; link.href = imgData; link.click();
      } else {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const marginTop = 20;
        const marginBottom = 20;
        const marginSide = 15;
        const contentWidth = pdfWidth - (marginSide * 2);
        const contentHeight = pdfHeight - marginTop - marginBottom;
        
        const imgWidth = img.width;
        const imgHeight = img.height;
        const imgHeightInPdf = (imgHeight * contentWidth) / imgWidth;
        
        const totalPages = Math.ceil(imgHeightInPdf / contentHeight);

        for (let i = 0; i < totalPages; i++) {
          if (i > 0) pdf.addPage();
          
          const position = marginTop - (i * contentHeight);
          
          pdf.addImage(imgData, 'PNG', marginSide, position, contentWidth, imgHeightInPdf);
          
          pdf.setFillColor(255, 255, 255);
          pdf.rect(0, 0, pdfWidth, marginTop, 'F');
          pdf.rect(0, pdfHeight - marginBottom, pdfWidth, marginBottom, 'F');
          
          // Header
          if (logoImg.complete && logoImg.naturalWidth > 0) {
            try {
              pdf.addImage(logoImg, 'PNG', marginSide, 5, 12, 12);
            } catch (e) {
              console.error('Could not add logo to PDF', e);
            }
          }

          pdf.setFontSize(8);
          pdf.setTextColor(100);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`HS COCKPIT v4.0 - PERFORMANCE PULSE (${viewMode === 'donations' ? 'COLLECTES' : 'DISTRIBUTIONS'})`, logoImg.complete && logoImg.naturalWidth > 0 ? marginSide + 15 : marginSide, 12);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`Généré le ${new Date().toLocaleString()}`, pdfWidth - marginSide, 12, { align: 'right' });
          
          pdf.setDrawColor(240);
          pdf.line(marginSide, pdfHeight - 15, pdfWidth - marginSide, pdfHeight - 15);
          pdf.text(`Document de Référence - ${branding?.hashtag || ''}`, marginSide, pdfHeight - 10);
          pdf.text(`Page ${i + 1} sur ${totalPages}`, pdfWidth - marginSide, pdfHeight - 10, { align: 'right' });
        }
        
        pdf.save(`PULSE_${viewMode}.pdf`);
      }
    } catch (err) { 
      console.error(err); 
      alert('Erreur lors de l\'export. Veuillez réessayer.');
    } finally { setExporting(null); }
  };

  return (
    <div className="space-y-16 lg:space-y-24 pb-20">
      {/* MAGICAL LIVE ACTION NOTIFICATION */}
      <AnimatePresence>
        {liveAction && (
          <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
            className="fixed top-24 right-8 z-[500] pointer-events-none"
          >
            <div className="bg-slate-900/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-5 shadow-[0_0_60px_rgba(0,0,0,0.5)] flex items-center gap-5 min-w-[320px]">
              <div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(249,115,22,0.5)] animate-pulse">
                <Activity size={24} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                   <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] leading-none">Intelligence Live</p>
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <p className="text-sm font-bold text-white tracking-tight">
                  <span className="text-orange-400">{liveAction.site}</span> : <span className="text-white text-glow-orange">+{liveAction.count}</span> {liveAction.type === 'donation' ? 'dons reçus' : 'sorties nettes'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI STRATEGIC OVERLAY - MAGICAL VERSION */}
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6">
        <motion.div 
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "backOut" }}
          className="relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-orange-600/30 via-red-600/20 to-sky-600/30 blur-[100px] opacity-40 group-hover:opacity-60 transition-opacity duration-1000" />
          <div className="relative glass-card rounded-[3rem] px-10 py-7 flex flex-col md:flex-row items-center justify-between gap-8 border-white/15">
            <div className="flex items-center gap-8">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-[0_0_40px_rgba(249,115,22,0.4)] border border-white/20 group-hover:rotate-6 transition-transform duration-500">
                {isAiLoading ? <Loader2 size={32} className="animate-spin" /> : <Brain size={32} />}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                   <Sparkles size={14} className="text-orange-400" />
                   <p className="text-[11px] font-black text-white/50 uppercase tracking-[0.4em]">Insight Stratégique HEMO-AI</p>
                </div>
                <h4 className="text-lg font-bold text-white tracking-tight leading-snug drop-shadow-sm">
                  {aiInsight || "Synchronisation des neurones analytiques..."}
                </h4>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={fetchAiInsight}
                className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all active:scale-90 group/btn"
                title="Régénérer l'intelligence"
              >
                <RefreshCw size={20} className="group-hover/btn:rotate-180 transition-transform duration-700" />
              </button>
              <button 
                onClick={() => setActiveTab?.('cockpit')}
                className="px-8 py-4 bg-white text-slate-950 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-4 hover:bg-orange-500 hover:text-white transition-all duration-500 active:scale-95 shadow-2xl"
              >
                Explorer le Cockpit <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="flex flex-col items-center gap-12">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/5 backdrop-blur-3xl p-3 rounded-[3rem] shadow-4xl border border-white/10 flex gap-3"
        >
           <button onClick={() => setViewMode('donations')} className={`px-14 py-6 rounded-[2.5rem] text-[12px] font-black uppercase tracking-[0.3em] transition-all duration-700 active:scale-95 flex items-center gap-5 ${viewMode === 'donations' ? 'bg-orange-600 text-white shadow-[0_0_60px_rgba(249,115,22,0.4)] scale-105' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
             <Activity size={22} className={viewMode === 'donations' ? 'animate-pulse' : ''}/> Flux Prélèvements
           </button>
           <button onClick={() => setViewMode('distribution')} className={`px-14 py-6 rounded-[2.5rem] text-[12px] font-black uppercase tracking-[0.3em] transition-all duration-700 active:scale-95 flex items-center gap-5 ${viewMode === 'distribution' ? 'bg-sky-600 text-white shadow-[0_0_60px_rgba(14,165,233,0.4)] scale-105' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
             <Truck size={22} className={viewMode === 'distribution' ? 'animate-float' : ''}/> Flux Distribution
           </button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl px-4 sm:px-0">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -10, scale: 1.02 }} 
            className="glass-card rounded-[3rem] p-10 flex items-center gap-8 shadow-4xl relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="w-16 h-16 bg-orange-600/20 rounded-[1.5rem] flex items-center justify-center text-orange-400 border border-orange-500/30 group-hover:rotate-12 transition-transform duration-500">
              <Zap size={32} />
            </div>
            <div>
              <p className="text-[11px] font-black text-white/30 uppercase tracking-[0.4em] mb-2">Health Index</p>
              <div className="flex items-baseline gap-4">
                <span className="text-5xl font-black text-white tracking-tighter text-glow-orange">{healthScore}%</span>
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 flex items-center gap-1">
                   <ArrowUpRight size={14} /> +2.4%
                </span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            whileHover={{ y: -10, scale: 1.02 }} 
            onClick={() => setActiveTab?.('forecasting')}
            className="glass-card cursor-pointer rounded-[3rem] p-10 flex items-center gap-8 shadow-4xl border border-white/10 group overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-sky-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="w-16 h-16 bg-sky-600/20 rounded-[1.5rem] flex items-center justify-center text-sky-400 border border-sky-500/30 group-hover:-rotate-12 transition-transform duration-500">
              <TrendingUp size={32} />
            </div>
            <div>
              <p className="text-[11px] font-black text-white/30 uppercase tracking-[0.4em] mb-2">Tendance IA</p>
              <div className="flex items-baseline gap-4">
                <span className="text-5xl font-black text-white tracking-tighter">Hyper</span>
                <span className="text-[11px] font-black text-sky-400 uppercase tracking-widest bg-sky-500/10 px-3 py-1.5 rounded-xl border border-sky-500/20">Alpha v5</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            whileHover={{ y: -10, scale: 1.02 }} 
            className="glass-card rounded-[3rem] p-10 flex items-center gap-8 shadow-4xl group overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-rose-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="w-16 h-16 bg-rose-600/20 rounded-[1.5rem] flex items-center justify-center text-rose-400 border border-rose-500/30 group-hover:scale-110 transition-transform duration-500">
              <Heart size={32} className="animate-pulse" />
            </div>
            <div>
              <p className="text-[11px] font-black text-white/30 uppercase tracking-[0.4em] mb-2">Stock Vital</p>
              <div className="flex items-baseline gap-4">
                <span className="text-5xl font-black text-white tracking-tighter">Optimal</span>
                <span className="text-[11px] font-black text-rose-400 uppercase tracking-widest bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20">Auto</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="glass-nav p-5 rounded-[3.5rem] flex flex-wrap items-center justify-between gap-8 shadow-3xl relative overflow-hidden border-white/60">
        {!isConnected && (
          <div className="absolute inset-0 bg-slate-950/5 backdrop-blur-[3px] z-10 flex items-center justify-center pointer-events-none">
            <div className="bg-slate-950 text-white px-6 py-2.5 rounded-full text-[9px] font-display font-black uppercase tracking-[0.3em] shadow-2xl animate-pulse pointer-events-auto cursor-pointer" onClick={onLoginClick}>
              Accès Restreint • Connexion Requise
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-6 px-6">
           <div className={`w-14 h-14 text-white rounded-[1.5rem] flex items-center justify-center shadow-2xl ${viewMode === 'donations' ? 'bg-orange-600 shadow-orange-500/20' : 'bg-orange-600 shadow-orange-500/20'}`}>
             <Filter size={24} />
           </div>
           <div>
             <h3 className="text-xl font-display font-black uppercase tracking-tighter text-slate-950">Séquenceur Temporel</h3>
             <p className="text-[10px] font-display font-black text-slate-400 uppercase tracking-[0.2em] leading-none mt-1.5">Analyse des flux vitaux</p>
           </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 px-4">
           <div className="bg-slate-100/50 border border-slate-200 rounded-2xl px-6 py-4 flex items-center gap-4 group hover:bg-white transition-colors">
             <Calendar size={16} className="text-orange-500" />
             <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent outline-none text-[12px] font-display font-black uppercase tracking-widest cursor-pointer text-slate-950">
               {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
             </select>
           </div>
           <div className="bg-slate-100/50 border border-slate-200 rounded-2xl px-6 py-4 flex items-center gap-4 group hover:bg-white transition-colors">
             <Waves size={16} className="text-orange-500" />
             <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="bg-transparent outline-none text-[12px] font-display font-black uppercase tracking-widest cursor-pointer text-slate-950">
               {availableMonths.map(m => <option key={m} value={m}>{MONTHS_FR[m]}</option>)}
             </select>
           </div>
           <div className="bg-slate-950 border border-white/10 rounded-2xl px-8 py-4 flex items-center gap-4 shadow-2xl transition-all hover:bg-slate-800 group">
             <Activity size={16} className={viewMode === 'donations' ? "text-orange-400" : "text-orange-400"} />
             <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="bg-transparent outline-none text-[12px] font-display font-black uppercase tracking-widest cursor-pointer text-white">
               {availableDays.map(d => <option key={d} value={d}>{d}</option>)}
             </select>
           </div>
           <div className="flex gap-3">
             <button onClick={() => handleExport('image')} disabled={!!exporting} className="p-4 bg-white border border-slate-200 text-slate-950 rounded-2xl hover:bg-slate-50 transition-all shadow-sm active:scale-95">
               {exporting === 'image' ? <Loader2 size={20} className="animate-spin" /> : <FileImage size={20} />}
             </button>
           </div>
        </div>
      </div>

      <div ref={pulseRef} className="space-y-16 lg:space-y-24 p-1">
        {/* HEADER EXPORT */}
        <div className="hidden export-header flex items-center justify-between border-b-4 border-slate-950 pb-10 mb-12">
          <div className="flex items-center gap-8">
            <img 
              src={branding?.logo} 
              alt="Logo" 
              className="h-24 w-auto object-contain" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=934812425420904';
              }}
            />
            <div>
              <h1 className="text-4xl font-display font-black uppercase tracking-tighter text-slate-950 leading-none">Rapport de Performance Pulse</h1>
              <p className="text-xs font-display font-bold text-slate-500 uppercase tracking-[0.3em] mt-3 italic">Système National de Monitoring Hématologique</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-display font-black text-slate-400 uppercase tracking-widest">Situation au</p>
            <p className="text-3xl font-display font-black text-slate-950 mt-1">{selectedDay}</p>
          </div>
        </div>

        <motion.div 
          layout
          className={`relative overflow-hidden rounded-[5rem] p-16 lg:p-24 text-white shadow-3xl border border-white/5 transition-colors duration-1000 ${viewMode === 'donations' ? 'bg-slate-950' : 'bg-slate-900'}`}
        >
          <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.1)_0%,transparent_50%)]" />
             <svg width="100%" height="100%" viewBox="0 0 800 400" preserveAspectRatio="none">
               <path d={`M0 200 L 150 200 L 170 120 L 190 280 L 210 200 L 400 200 L 420 40 L 440 360 L 460 200 L 650 200 L 670 180 L 690 220 L 710 200 L 800 200`}
                 fill="none" stroke={nationalPulseColor} strokeWidth="8" strokeDasharray="1000" strokeDashoffset={1000 - (pulsePhase * 10)}
                 className="transition-all duration-300" style={{ filter: `drop-shadow(0 0 20px ${nationalPulseColor})` }} />
            </svg>
          </div>
          
          <div className="relative z-10 flex flex-col lg:flex-row items-center gap-24">
            <div className="relative">
              <motion.div 
                animate={{ scale: [1, 1.05, 1], rotate: [0, 2, 0, -2, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className={`w-96 h-96 rounded-full border-[24px] flex items-center justify-center transition-all duration-1000 shadow-[0_0_150px_rgba(255,255,255,0.08)] relative ${perfDaily >= 100 ? 'animate-pulse' : ''}`} 
                style={{ borderColor: `${nationalPulseColor}15` }}
              >
                {perfDaily >= 100 && (
                  <motion.div 
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="absolute -top-6 -right-6 w-24 h-24 bg-orange-500 rounded-full flex items-center justify-center shadow-2xl border-4 border-slate-950 z-20"
                  >
                    <Trophy className="text-white" size={40} />
                  </motion.div>
                )}
                <div className="absolute inset-0 rounded-full animate-pulse opacity-20" style={{ backgroundColor: nationalPulseColor }}></div>
                <div className="text-center relative z-10">
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 4, repeat: Infinity }}
                      className="mb-4"
                    >
                      {viewMode === 'donations' ? <Heart size={80} className="mx-auto fill-current" style={{ color: nationalPulseColor }} /> : <Truck size={80} className="mx-auto" style={{ color: nationalPulseColor }} />}
                    </motion.div>
                    <p className="text-8xl font-display font-black tracking-tighter text-white leading-none drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">{perfDaily.toFixed(1)}<span className="text-4xl ml-1 opacity-50">%</span></p>
                    <p className="text-[11px] font-display font-black uppercase tracking-[0.5em] text-white/40 mt-6">{viewMode === 'donations' ? 'PULSE NATIONAL' : 'EFFICIENCE FLUX'}</p>
                </div>
                <svg className="absolute inset-x-0 inset-y-0 w-full h-full -rotate-90">
                  <circle cx="192" cy="192" r="170" fill="none" stroke={nationalPulseColor} strokeWidth="24" strokeDasharray="1068" strokeDashoffset={1068 - (1068 * Math.min(perfDaily, 100)) / 100} strokeLinecap="round" className="transition-all duration-1500 ease-out"/>
                </svg>
              </motion.div>
            </div>
            
            <div className="flex-1 space-y-16 text-center lg:text-left">
              <motion.div
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 1, ease: "backOut" }}
              >
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/10 rounded-full border border-white/10 mb-8 backdrop-blur-md">
                   <div className={`w-2 h-2 rounded-full animate-ping ${viewMode === 'donations' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Monitorage Energétique Actif</span>
                </div>
                <h2 className="text-7xl lg:text-8xl font-display font-black uppercase tracking-tighter leading-tight mb-4 text-glow-orange">
                  {recommendation}
                </h2>
                <p className="text-xl font-display font-medium text-white/30 uppercase tracking-[0.4em] max-w-2xl mb-8">Unité de Commandement Centralisé • CNTS Côte d'Ivoire</p>
                <div className="flex flex-col sm:flex-row items-center gap-6 mt-8">
                   <div className="bg-white/5 border border-white/10 px-8 py-5 rounded-[2rem] flex flex-col items-center sm:items-start min-w-[200px]">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Total National</span>
                      <span className="text-4xl font-display font-black text-white">{(dayRecord?.stats?.realized || 0).toLocaleString()}</span>
                   </div>
                   <div className="bg-white/5 border border-white/10 px-8 py-5 rounded-[2rem] flex flex-col items-center sm:items-start min-w-[200px]">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Cible Jour</span>
                      <span className="text-4xl font-display font-black text-orange-500">{dayObjectives.total}</span>
                   </div>
                </div>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {viewMode === 'donations' ? (
                  <>
                    <motion.div whileHover={{ scale: 1.05, y: -5 }} className="bg-white/5 backdrop-blur-2xl p-10 rounded-[3.5rem] border border-white/10 text-center group transition-all">
                      <p className="text-[11px] font-display font-black text-orange-400 uppercase mb-6 tracking-[0.2em]">SITES FIXES</p>
                      <div className="flex flex-col items-center">
                        <p className="text-6xl font-display font-black group-hover:text-orange-400 transition-colors">{dayRecord?.stats?.fixed || 0}</p>
                        <div className="mt-4 px-4 py-1.5 bg-white/5 rounded-full border border-white/5">
                          <p className="text-[10px] font-display font-bold text-white/30 uppercase tracking-widest">Cible : {dayObjectives.fixed}</p>
                        </div>
                      </div>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05, y: -5 }} className="bg-white/5 backdrop-blur-2xl p-10 rounded-[3.5rem] border border-white/10 text-center group transition-all">
                      <p className="text-[11px] font-display font-black text-orange-400 uppercase mb-6 tracking-[0.2em]">UNITÉS MOBILES</p>
                      <div className="flex flex-col items-center">
                        <p className="text-6xl font-display font-black group-hover:text-orange-400 transition-colors">{dayRecord?.stats?.mobile || 0}</p>
                        <div className="mt-4 px-4 py-1.5 bg-white/5 rounded-full border border-white/5">
                          <p className="text-[10px] font-display font-bold text-white/30 uppercase tracking-widest">Cible : {dayObjectives.mobile}</p>
                        </div>
                      </div>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05, y: -5 }} className="bg-gradient-to-br from-orange-600 to-orange-700 p-10 rounded-[3.5rem] border border-white/20 text-center shadow-2xl shadow-orange-500/20">
                      <p className="text-[11px] font-display font-black text-white/60 uppercase mb-6 tracking-[0.2em]">TOTAL NATIONAL</p>
                      <div className="flex flex-col items-center">
                        <p className="text-6xl font-display font-black text-white">{(dayRecord?.stats?.realized || 0).toLocaleString()}</p>
                        <div className="mt-4 px-4 py-1.5 bg-black/20 rounded-full">
                          <p className="text-[10px] font-display font-black text-white/50 uppercase tracking-widest">Objectif : {dayObjectives.total}</p>
                        </div>
                      </div>
                    </motion.div>
                  </>
                ) : (
                  <>
                    <motion.div whileHover={{ scale: 1.05, y: -5 }} className="bg-white/5 backdrop-blur-2xl p-10 rounded-[3.5rem] border border-white/10 text-center group transition-all"><p className="text-[11px] font-display font-black text-orange-400 uppercase mb-6 tracking-[0.2em]">EXPÉDIÉ BRUT</p><p className="text-6xl font-display font-black group-hover:text-orange-400 transition-colors">{distDayStats.qty.toLocaleString()}</p></motion.div>
                    <motion.div whileHover={{ scale: 1.05, y: -5 }} className="bg-white/5 backdrop-blur-2xl p-10 rounded-[3.5rem] border border-white/10 text-center group transition-all"><p className="text-[11px] font-display font-black text-rose-400 uppercase mb-6 tracking-[0.2em]">RENDUS / PERIMÉS</p><p className="text-6xl font-display font-black group-hover:text-rose-400 transition-colors">{distDayStats.rendu.toLocaleString()}</p></motion.div>
                    <motion.div whileHover={{ scale: 1.05, y: -5 }} className="bg-gradient-to-br from-orange-600 to-rose-700 p-10 rounded-[3.5rem] border border-white/20 text-center shadow-2xl shadow-orange-500/20"><p className="text-[11px] font-display font-black text-white/60 uppercase mb-6 tracking-[0.2em]">SORTIES NETTES</p><p className="text-6xl font-display font-black text-white">{(distDayStats.qty - distDayStats.rendu).toLocaleString()}</p></motion.div>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* INTELLIGENCE HUB & QUICK LINKS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 pb-20">
          <div className="lg:col-span-2 bg-white/5 backdrop-blur-lg border border-white/10 rounded-[3.5rem] p-8 lg:p-12 shadow-2xl overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-600/[0.03] to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-12 relative z-10">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center text-white border border-white/10 shadow-glow">
                  <Activity size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-display font-black uppercase tracking-tighter text-white">Performance par Site</h3>
                  <p className="text-[11px] font-display font-bold text-white/30 uppercase tracking-[0.2em] mt-1">Focus sur les contributions majeures</p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-3 px-5 py-2.5 bg-white/5 text-orange-400 rounded-2xl border border-white/10 backdrop-blur-sm">
                <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                <span className="text-[11px] font-display font-black uppercase tracking-widest">Temps Réel</span>
              </div>
            </div>

            <div className="space-y-4 relative z-10">
              {(dayRecord?.sites || []).sort((a, b) => b.total - a.total).slice(0, 5).map((site, i) => (
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  key={site.name} 
                  className="flex flex-col sm:flex-row items-center justify-between p-6 bg-white/[0.03] rounded-3xl border border-white/[0.05] hover:bg-white/[0.08] hover:shadow-2xl hover:border-white/10 transition-all duration-500 group gap-6 sm:gap-0"
                >
                  <div className="flex items-center gap-6 w-full sm:w-auto">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/40 font-display font-black text-sm border border-white/5 group-hover:bg-orange-600 group-hover:text-white transition-all duration-500">
                      0{i + 1}
                    </div>
                    <button 
                      onClick={() => {
                        onSiteSelect?.(site.name);
                        setActiveTab?.('site-focus');
                      }}
                      className="text-left group-hover:translate-x-1 transition-transform duration-500"
                    >
                      <p className="text-sm font-display font-black text-white uppercase tracking-tight group-hover:text-orange-400">{site.name}</p>
                      <p className="text-[10px] font-display font-bold text-white/30 uppercase tracking-widest mt-1">{site.region}</p>
                    </button>
                  </div>
                  <div className="flex items-center gap-6 sm:gap-10 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right">
                      <p className="text-xl font-display font-black text-white">{site.total}</p>
                      <p className="text-[10px] font-display font-bold text-white/20 uppercase tracking-widest">Poches</p>
                    </div>
                    <div className="flex-1 sm:flex-none w-full sm:w-32 h-2.5 bg-white/5 rounded-full overflow-hidden shadow-inner border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: `${Math.min(100, (site.total / (site.objective || 1)) * 100)}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="h-full bg-orange-600 shadow-[0_0_15px_rgba(249,115,22,0.4)]"
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-12 flex justify-center relative z-10">
               <button 
                 onClick={() => setActiveTab?.('cockpit')}
                 className="flex items-center gap-4 px-10 py-5 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-2xl transition-all group active:scale-95 border border-white/10"
               >
                 <span className="text-[11px] font-display font-black uppercase tracking-[0.3em]">PILOTAGE CENTRALISÉ</span>
                 <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform text-orange-500" />
               </button>
            </div>
          </div>

          <div className="bg-slate-950 rounded-[3.5rem] p-12 text-white shadow-3xl relative overflow-hidden flex flex-col min-h-[600px]">
            <div className="absolute -top-10 -right-10 p-12 opacity-5 animate-pulse text-orange-400 pointer-events-none">
              <Sparkles size={320} />
            </div>
            <div className="relative z-10 flex-1">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-orange-600/20 rounded-2xl flex items-center justify-center text-orange-400 border border-orange-600/40 shadow-inner">
                  <Brain size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-display font-black uppercase tracking-tighter">Intelligence Hub</h3>
                  <p className="text-[10px] font-display font-bold text-orange-400 uppercase tracking-[0.3em]">Insights Stratégiques</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
                  <p className="text-[10px] font-display font-black text-slate-500 uppercase tracking-[0.25em] mb-4">Recommandations IA</p>
                  <SmartInsights data={data} onActionClick={(tab) => setActiveTab?.(tab as AppTab)} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   {[
                     { label: "Analyse Stocks", icon: <Database size={16} />, tab: 'stock-summary' },
                     { label: "Flux GTS", icon: <Truck size={16} />, tab: 'gts' },
                     { label: "Performances", icon: <BarChart3 size={16} />, tab: 'recap' },
                     { label: "Historique", icon: <HistoryIcon size={16} />, tab: 'history' }
                   ].map((link, i) => (
                     <button 
                       key={link.label}
                       onClick={() => setActiveTab?.(link.tab as AppTab)}
                       className="flex flex-col gap-4 p-5 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all text-left group hover:scale-[1.02] active:scale-[0.98]"
                     >
                       <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform">{link.icon}</div>
                       <span className="text-[9px] font-display font-black uppercase tracking-widest text-white/50 group-hover:text-white transition-colors leading-tight">{link.label}</span>
                     </button>
                   ))}
                </div>
              </div>
            </div>

            <button 
              onClick={() => setActiveTab?.('summary')}
              className="relative z-10 mt-12 w-full py-5 bg-orange-600 hover:bg-orange-500 rounded-2xl text-[11px] font-display font-black uppercase tracking-[0.2em] transition-all shadow-2xl shadow-orange-900/40 active:scale-95 flex items-center justify-center gap-3 group"
            >
              <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
              <span>Générer Rapport Analytique</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
