
import React, { useMemo, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
/* Added User import */
import { DashboardData, DistributionRecord, User, AppTab } from '../types';
import { Activity, Zap, Flame, Waves, Heart, Target, Trophy, Calendar, Filter, Star, FileImage, FileText, Loader2, User as UserIcon, Truck, Package, TrendingUp, ArrowUpRight, ArrowDownRight, Info, AlertTriangle } from 'lucide-react';
import { domToPng } from 'modern-screenshot';
import { jsPDF } from 'jspdf';
import { COLORS } from '../constants';

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
}

export const PulsePerformance: React.FC<PulsePerformanceProps> = ({ data, onLoginClick, isConnected, branding, setActiveTab }) => {
  const [viewMode, setViewMode] = useState<'donations' | 'distribution'>('donations');
  const [pulsePhase, setPulsePhase] = useState(0);
  const [exporting, setExporting] = useState<'image' | 'pdf' | null>(null);
  const [showLiveFeed, setShowLiveFeed] = useState(true);
  const pulseRef = useRef<HTMLDivElement>(null);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    data.dailyHistory.forEach(h => {
      const parts = h.date.split('/');
      if (parts[2]) years.add(parts[2]);
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [data.dailyHistory]);

  const [selectedYear, setSelectedYear] = useState(availableYears[0] || "2026");

  const availableMonths = useMemo(() => {
    const months = new Set<number>();
    data.dailyHistory.forEach(h => {
      const parts = h.date.split('/');
      if (parts[2] === selectedYear) {
        months.add(parseInt(parts[1]) - 1);
      }
    });
    return Array.from(months).sort((a, b) => a - b);
  }, [data.dailyHistory, selectedYear]);

  const [selectedMonth, setSelectedMonth] = useState<number>(
    availableMonths.length > 0 ? availableMonths[availableMonths.length - 1] : new Date().getMonth()
  );

  const availableDays = useMemo(() => {
    return data.dailyHistory
      .filter(h => {
        const parts = h.date.split('/');
        return parts[2] === selectedYear && (parseInt(parts[1]) - 1) === selectedMonth;
      })
      .map(h => h.date);
  }, [data.dailyHistory, selectedYear, selectedMonth]);

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
      const realized = dayRecord?.stats.realized || 0;
      return (realized / dayObjectives.total) * 100;
    } else {
      return distDayStats.efficiency;
    }
  }, [viewMode, dayRecord, dayObjectives, distDayStats]);

  const nationalPulseColor = useMemo(() => 
    viewMode === 'donations' ? getDynamicColor(perfDaily) : '#f59e0b'
  , [perfDaily, viewMode]);

  // Health Score Logic (Simulated based on multiple factors)
  const healthScore = useMemo(() => {
    const donationPerf = (data.monthly.realized / (data.monthly.objective || 1)) * 100;
    const stockLevel = data.stock?.reduce((acc, s) => acc + s.quantite, 0) || 0;
    const stockHealth = Math.min(100, (stockLevel / 5000) * 100);
    return Math.round((donationPerf * 0.6) + (stockHealth * 0.4));
  }, [data]);

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
      <div className="flex flex-col items-center gap-10">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/80 backdrop-blur-xl p-2 rounded-[2.5rem] shadow-3xl border border-white/40 flex gap-2"
        >
           <button onClick={() => setViewMode('donations')} className={`px-12 py-5 rounded-[2rem] text-[11px] font-display font-black uppercase tracking-[0.2em] transition-all duration-500 active:scale-95 flex items-center gap-4 ${viewMode === 'donations' ? 'bg-slate-950 text-white shadow-2xl shadow-slate-900/20' : 'text-slate-400 hover:bg-slate-50'}`}>
             <Activity size={18} className={viewMode === 'donations' ? 'text-orange-400' : ''}/> Prélèvements
           </button>
           <button onClick={() => setViewMode('distribution')} className={`px-12 py-5 rounded-[2rem] text-[11px] font-display font-black uppercase tracking-[0.2em] transition-all duration-500 active:scale-95 flex items-center gap-4 ${viewMode === 'distribution' ? 'bg-slate-950 text-white shadow-2xl shadow-slate-900/20' : 'text-slate-400 hover:bg-slate-50'}`}>
             <Truck size={18} className={viewMode === 'distribution' ? 'text-orange-400' : ''}/> Distribution
           </button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
          <motion.div whileHover={{ y: -8 }} className="card-professional p-8 flex items-center gap-8 bg-white/80 backdrop-blur-sm">
            <div className="w-16 h-16 bg-orange-50 rounded-3xl flex items-center justify-center text-orange-600 shadow-inner relative overflow-hidden group">
              <div className="absolute inset-0 bg-orange-600 opacity-0 group-hover:opacity-10 transition-opacity" />
              <Zap size={28} className="relative z-10" />
            </div>
            <div>
              <p className="text-[10px] font-display font-black text-slate-400 uppercase tracking-[0.25em] mb-1">Health Score National</p>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-display font-black text-slate-950 tracking-tighter">{healthScore}%</span>
                <span className="text-[11px] font-bold text-orange-500 flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-lg"><ArrowUpRight size={14} /> +2.4%</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -8 }} 
            onClick={() => setActiveTab?.('forecasting')}
            className="card-professional p-8 flex items-center gap-8 bg-white/80 backdrop-blur-sm cursor-pointer"
          >
            <div className="w-16 h-16 bg-orange-50 rounded-3xl flex items-center justify-center text-orange-600 shadow-inner relative overflow-hidden group">
              <div className="absolute inset-0 bg-orange-600 opacity-0 group-hover:opacity-10 transition-opacity" />
              <TrendingUp size={28} className="relative z-10" />
            </div>
            <div>
              <p className="text-[10px] font-display font-black text-slate-400 uppercase tracking-[0.25em] mb-1">Tendance Flux</p>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-display font-black text-slate-950 tracking-tighter">Stable</span>
                <span className="text-[11px] font-display font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg">Prévision +5%</span>
              </div>
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -8 }} className="card-professional p-8 flex items-center gap-8 bg-white/80 backdrop-blur-sm">
            <div className="w-16 h-16 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-600 shadow-inner relative overflow-hidden group">
              <div className="absolute inset-0 bg-rose-600 opacity-0 group-hover:opacity-10 transition-opacity" />
              <Package size={28} className="relative z-10" />
            </div>
            <div>
              <p className="text-[10px] font-display font-black text-slate-400 uppercase tracking-[0.25em] mb-1">Disponibilité Stock</p>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-display font-black text-slate-950 tracking-tighter">Optimal</span>
                <span className="text-[11px] font-display font-bold text-rose-500 uppercase tracking-widest bg-rose-50 px-2 py-1 rounded-lg">12 Jours</span>
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
          className={`relative overflow-hidden rounded-[5rem] p-16 lg:p-24 text-white shadow-3xl border border-white/5 transition-colors duration-1000 ${viewMode === 'donations' ? 'bg-slate-950' : 'bg-orange-950'}`}
        >
          <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
            <svg width="100%" height="100%" viewBox="0 0 800 400" preserveAspectRatio="none">
              <path d={`M0 200 L 150 200 L 170 120 L 190 280 L 210 200 L 400 200 L 420 40 L 440 360 L 460 200 L 650 200 L 670 180 L 690 220 L 710 200 L 800 200`}
                fill="none" stroke={nationalPulseColor} strokeWidth="8" strokeDasharray="1000" strokeDashoffset={1000 - (pulsePhase * 10)}
                className="transition-all duration-300" style={{ filter: `drop-shadow(0 0 20px ${nationalPulseColor})` }} />
            </svg>
          </div>
          
          <div className="relative z-10 flex flex-col lg:flex-row items-center gap-24">
            <div className="relative">
              <motion.div 
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-80 h-80 rounded-full border-[20px] flex items-center justify-center transition-all duration-1000 shadow-[0_0_100px_rgba(255,255,255,0.05)]" 
                style={{ borderColor: `${nationalPulseColor}15` }}
              >
                <div className="absolute inset-0 rounded-full animate-pulse opacity-20" style={{ backgroundColor: nationalPulseColor }}></div>
                <div className="text-center relative z-10">
                    {viewMode === 'donations' ? <Heart size={80} className="mx-auto mb-4 fill-current" style={{ color: nationalPulseColor }} /> : <Truck size={80} className="mx-auto mb-4" style={{ color: nationalPulseColor }} />}
                    <p className="text-8xl font-display font-black tracking-tighter text-white leading-none">{perfDaily.toFixed(1)}<span className="text-4xl ml-1 opacity-50">%</span></p>
                    <p className="text-[11px] font-display font-black uppercase tracking-[0.6em] text-white/40 mt-4">{viewMode === 'donations' ? 'Vitalité Nationale' : 'Efficience Flux'}</p>
                </div>
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="160" cy="160" r="150" fill="none" stroke={nationalPulseColor} strokeWidth="20" strokeDasharray="942" strokeDashoffset={942 - (942 * Math.min(perfDaily, 100)) / 100} strokeLinecap="round" className="transition-all duration-1000 ease-out"/>
                </svg>
              </motion.div>
            </div>
            
            <div className="flex-1 space-y-16 text-center lg:text-left">
              <motion.div
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8 }}
              >
                <h2 className="text-7xl font-display font-black uppercase tracking-tighter leading-[0.85] mb-6">
                  {viewMode === 'donations' ? 'FLUX DE PRELEVEMENTS' : 'LOGISTIQUE DISTRIBUTION'}
                </h2>
                <p className="text-lg font-display font-medium text-white/40 uppercase tracking-widest">Monitoring National en Temps Réel</p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {viewMode === 'donations' ? (
                  <>
                    <motion.div whileHover={{ scale: 1.05, y: -5 }} className="bg-white/5 backdrop-blur-2xl p-10 rounded-[3.5rem] border border-white/10 text-center group transition-all">
                      <p className="text-[11px] font-display font-black text-orange-400 uppercase mb-6 tracking-[0.2em]">SITES FIXES</p>
                      <div className="flex flex-col items-center">
                        <p className="text-6xl font-display font-black group-hover:text-orange-400 transition-colors">{dayRecord?.stats.fixed || 0}</p>
                        <div className="mt-4 px-4 py-1.5 bg-white/5 rounded-full border border-white/5">
                          <p className="text-[10px] font-display font-bold text-white/30 uppercase tracking-widest">Cible : {dayObjectives.fixed}</p>
                        </div>
                      </div>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05, y: -5 }} className="bg-white/5 backdrop-blur-2xl p-10 rounded-[3.5rem] border border-white/10 text-center group transition-all">
                      <p className="text-[11px] font-display font-black text-orange-400 uppercase mb-6 tracking-[0.2em]">UNITÉS MOBILES</p>
                      <div className="flex flex-col items-center">
                        <p className="text-6xl font-display font-black group-hover:text-orange-400 transition-colors">{dayRecord?.stats.mobile || 0}</p>
                        <div className="mt-4 px-4 py-1.5 bg-white/5 rounded-full border border-white/5">
                          <p className="text-[10px] font-display font-bold text-white/30 uppercase tracking-widest">Cible : {dayObjectives.mobile}</p>
                        </div>
                      </div>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05, y: -5 }} className="bg-gradient-to-br from-orange-600 to-orange-700 p-10 rounded-[3.5rem] border border-white/20 text-center shadow-2xl shadow-orange-500/20">
                      <p className="text-[11px] font-display font-black text-white/60 uppercase mb-6 tracking-[0.2em]">TOTAL NATIONAL</p>
                      <div className="flex flex-col items-center">
                        <p className="text-6xl font-display font-black text-white">{(dayRecord?.stats.realized || 0).toLocaleString()}</p>
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

        {/* Live Activity Feed Simulation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 card-professional p-12 bg-white/90 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-slate-950 rounded-3xl flex items-center justify-center text-white shadow-2xl">
                  <Activity size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-display font-black uppercase tracking-tighter text-slate-950">Performance par Site</h3>
                  <p className="text-[11px] font-display font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Top 5 des contributions journalières</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-5 py-2.5 bg-orange-50 text-orange-600 rounded-2xl border border-orange-100">
                <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                <span className="text-[11px] font-display font-black uppercase tracking-widest">Live Feed</span>
              </div>
            </div>

            <div className="space-y-5">
              {dayRecord?.sites.sort((a, b) => b.total - a.total).slice(0, 5).map((site, i) => (
                <motion.div 
                  initial={{ x: -30, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  key={site.name} 
                  className="flex items-center justify-between p-6 bg-slate-50/50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-xl hover:border-white transition-all duration-500 group"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 font-display font-black text-sm shadow-sm border border-slate-100 group-hover:bg-slate-950 group-hover:text-white transition-all duration-500">
                      0{i + 1}
                    </div>
                    <button 
                      onClick={() => setActiveTab?.('site-focus')}
                      className="text-left group-hover:translate-x-1 transition-transform duration-500"
                    >
                      <p className="text-sm font-display font-black text-slate-950 uppercase tracking-tight">{site.name}</p>
                      <p className="text-[10px] font-display font-bold text-slate-400 uppercase tracking-widest mt-1">{site.region}</p>
                    </button>
                  </div>
                  <div className="flex items-center gap-10">
                    <div className="text-right">
                      <p className="text-xl font-display font-black text-slate-950">{site.total}</p>
                      <p className="text-[10px] font-display font-bold text-slate-400 uppercase tracking-widest">Poches</p>
                    </div>
                    <div className="w-32 h-2.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
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
          </div>

          <div className="bg-slate-950 rounded-[3.5rem] p-12 text-white shadow-3xl relative overflow-hidden flex flex-col">
            <div className="absolute -top-10 -right-10 p-12 opacity-5 animate-pulse">
              <Zap size={240} />
            </div>
            <div className="relative z-10 flex-1">
              <h3 className="text-2xl font-display font-black uppercase tracking-tighter mb-3">Intelligence Stratégique</h3>
              <p className="text-[11px] font-display font-bold text-orange-400 uppercase tracking-[0.3em] mb-12">Analyse Prédictive IA v4.2</p>
              
              <div className="space-y-8">
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 hover:bg-white/10 transition-colors group"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform">
                      <Star size={20} />
                    </div>
                    <p className="text-[12px] font-display font-black uppercase tracking-widest">Optimisation Flux</p>
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed font-medium">
                    Le site de <span className="text-white font-bold">TREICHVILLE</span> surperforme de <span className="text-orange-400">15%</span>. Réaffectation conseillée d'une unité mobile vers <span className="text-white font-bold">ABOBO</span>.
                  </p>
                </motion.div>

                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 hover:bg-white/10 transition-colors group"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                      <AlertTriangle size={20} />
                    </div>
                    <p className="text-[12px] font-display font-black uppercase tracking-widest">Alerte Critique</p>
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed font-medium">
                    Le groupe <span className="text-rose-400 font-bold">O-</span> est en baisse critique. Priorité absolue aux collectes ciblées région <span className="text-white font-bold">BELIER</span>.
                  </p>
                </motion.div>
              </div>
            </div>

            <button className="relative z-10 mt-12 w-full py-5 bg-orange-600 hover:bg-orange-500 rounded-2xl text-[11px] font-display font-black uppercase tracking-[0.2em] transition-all shadow-2xl shadow-orange-900/40 active:scale-95">
              Générer Rapport Analytique
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
