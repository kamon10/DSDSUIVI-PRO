
import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardData, SiteRecord, GtsRecord } from '../types';
import { Target, Trophy, Calendar, Download, Share2, ChevronRight, ChevronLeft, Heart, Activity, Clock, Zap } from 'lucide-react';
import { domToPng } from 'modern-screenshot';
import { format, differenceInDays, endOfMonth, endOfYear, parse } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SITES_DATA, getSiteByInput } from '../constants';

interface GoalPulseViewProps {
  data: DashboardData;
  branding?: { logo: string; hashtag: string };
}

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const GoalPulseView: React.FC<GoalPulseViewProps> = ({ data, branding }) => {
  const [exporting, setExporting] = useState(false);
  const pulseRef = useRef<HTMLDivElement>(null);

  // --- SDS CAPSULE LOGIC (LATEST RECORD MOBILE >= 900) ---
  const sdsData = useMemo(() => {
    let latest: { site: string; date: string; value: number; totalRecords: number; manager: string; objective: number } | null = null;
    let count = 0;
    
    // Sort history by date to find latest and count editions
    const sortedHistory = [...data.dailyHistory].sort((a, b) => {
      const dateA = parse(a.date, 'dd/MM/yyyy', new Date());
      const dateB = parse(b.date, 'dd/MM/yyyy', new Date());
      return dateA.getTime() - dateB.getTime();
    });

    sortedHistory.forEach(day => {
      day.sites.forEach(site => {
        if (site.mobile >= 1000) {
          count++;
          const siteInfo = getSiteByInput(site.name);
          const annualObj = siteInfo?.annualObjective || 15000;
          const dailyObj = Math.round(annualObj / 313); // Assuming 313 working days from constants
          
          latest = {
            site: site.name,
            date: day.date,
            value: site.mobile,
            totalRecords: count,
            manager: siteInfo?.manager || "Le Responsable de Site",
            objective: dailyObj || 1000 // Fallback to 1000 for percentage calculation if needed
          };
        }
      });
    });

    return latest;
  }, [data.dailyHistory]);

  const gtsStats = useMemo(() => {
    if (!data.gts) return { monthly: { realized: 0, objective: 0, percentage: 0 }, annual: { realized: 0, objective: 0, percentage: 0 } };
    
    const targetMonth = MONTHS_FR.indexOf(data.month);
    const targetYear = data.year;

    const monthlyRealized = data.gts
      .filter(r => {
        if (!r || !r.date) return false;
        const parts = r.date.split('/');
        if (parts.length !== 3) return false;
        const m = parseInt(parts[1]);
        const y = parseInt(parts[2]);
        return m === targetMonth + 1 && y === targetYear;
      })
      .reduce((acc, r) => acc + (Number(r.total) || 0), 0);

    const annualRealized = data.gts
      .filter(r => {
        if (!r || !r.date) return false;
        const parts = r.date.split('/');
        if (parts.length !== 3) return false;
        const y = parseInt(parts[2]);
        return y === targetYear;
      })
      .reduce((acc, r) => acc + (Number(r.total) || 0), 0);

    return {
      monthly: {
        realized: monthlyRealized,
        objective: data.monthly.objective,
        percentage: data.monthly.objective > 0 ? (monthlyRealized / data.monthly.objective) * 100 : 0
      },
      annual: {
        realized: annualRealized,
        objective: data.annual.objective,
        percentage: data.annual.objective > 0 ? (annualRealized / data.annual.objective) * 100 : 0
      }
    };
  }, [data.gts, data.month, data.year, data.monthly.objective, data.annual.objective]);

  const ratioStats = useMemo(() => {
    return {
      monthly: {
        realized: gtsStats.monthly.realized,
        objective: data.monthly.realized,
        percentage: data.monthly.realized > 0 ? (gtsStats.monthly.realized / data.monthly.realized) * 100 : 0
      },
      annual: {
        realized: gtsStats.annual.realized,
        objective: data.annual.realized,
        percentage: data.annual.realized > 0 ? (gtsStats.annual.realized / data.annual.realized) * 100 : 0
      }
    };
  }, [gtsStats, data.monthly.realized, data.annual.realized]);

  const daysRemaining = useMemo(() => {
    const now = new Date();
    const endM = endOfMonth(now);
    const endY = endOfYear(now);
    return {
      monthly: differenceInDays(endM, now),
      annual: differenceInDays(endY, now)
    };
  }, []);

  const handleExport = async () => {
    if (!pulseRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await domToPng(pulseRef.current, {
        scale: 2,
        backgroundColor: '#f8fafc',
      });
      const link = document.createElement('a');
      link.download = `OBJECTIFS_COMPLETS_${format(new Date(), 'yyyy-MM-dd')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setExporting(false);
    }
  };

  const handleCardExport = async (cardId: string, fileName: string) => {
    const element = document.getElementById(cardId);
    if (!element) return;
    
    setExporting(true);
    try {
      const dataUrl = await domToPng(element, {
        scale: 3,
        backgroundColor: '#000000',
      });
      const link = document.createElement('a');
      link.download = `${fileName}_${format(new Date(), 'yyyy-MM-dd')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Card export failed', err);
    } finally {
      setExporting(false);
    }
  };

  const renderPulseCard = (title: string, stats: any, type: 'prel' | 'gts' | 'ratio', mode: 'monthly' | 'annual') => {
    if (!stats) return null;
    const realized = Number(stats.realized) || 0;
    const objective = Number(stats.objective) || 0;
    const percentage = Number(stats.percentage) || 0;

    const cardId = `pulse-card-${type}-${mode}`;
    const isSuccess = percentage >= 100;
    const accentColor = type === 'prel' 
      ? (mode === 'monthly' ? 'rgba(249, 115, 22, 0.85)' : 'rgba(16, 185, 129, 0.85)')
      : type === 'gts'
        ? (mode === 'monthly' ? 'rgba(79, 70, 229, 0.85)' : 'rgba(124, 58, 237, 0.85)')
        : (mode === 'monthly' ? 'rgba(51, 65, 85, 0.85)' : 'rgba(15, 23, 42, 0.85)'); // Slate/Dark for ratio
    
    const bgImage = type === 'prel'
      ? (mode === 'monthly' 
          ? "https://images.unsplash.com/photo-1615461066841-6116ecaaba7f?q=80&w=1920&auto=format&fit=crop"
          : "https://images.unsplash.com/photo-1579154235602-3c373748d17c?q=80&w=1920&auto=format&fit=crop")
      : type === 'gts'
        ? "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=1920&auto=format&fit=crop"
        : "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1920&auto=format&fit=crop"; // Data/Analytics image for ratio

    const days = mode === 'monthly' ? daysRemaining.monthly : daysRemaining.annual;

    return (
      <motion.div 
        id={cardId}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: mode === 'monthly' ? 0 : 0.2 }}
        className="relative aspect-square w-full overflow-hidden rounded-[2.5rem] shadow-2xl bg-black group"
      >
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all duration-1000 group-hover:scale-110"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
        
        {/* Color Overlay */}
        <div 
          className="absolute inset-0 transition-colors duration-1000"
          style={{ backgroundColor: accentColor }}
        />

        {/* Content Overlay */}
        <div className="absolute inset-0 p-5 flex flex-col items-center justify-between text-white text-center">
          {/* Header */}
          <div className="w-full flex flex-col items-center gap-1 relative">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-80">
              {title}
            </p>
            <h2 className="text-xl font-black tracking-tighter uppercase">
              {isSuccess ? 'BRAVO' : 'EN COURS'}
            </h2>

            {/* Individual Export Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCardExport(cardId, title.replace(/\s+/g, '_'));
              }}
              className="absolute -top-1 -right-1 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm"
              title="Exporter cette capsule"
            >
              <Download size={12} />
            </button>
          </div>

          {/* Main Stats */}
          <div className="flex flex-col items-center gap-0">
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="text-[64px] font-black leading-none tracking-tighter" 
              style={{ WebkitTextStroke: '1px white', color: 'transparent' }}
            >
              {realized.toLocaleString()}
            </motion.div>
            
            <p className="text-[11px] font-black uppercase tracking-widest my-1">SUR</p>
            
            <motion.div 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-[44px] font-black leading-none tracking-tighter"
            >
              {objective.toLocaleString()}
            </motion.div>

            <motion.div 
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-2xl font-black mt-1"
            >
              {Math.round(percentage)}%
            </motion.div>
          </div>

          {/* Footer */}
          <div className="w-full flex flex-col items-center gap-2">
            <div className="flex flex-col items-center">
              <p className="text-[11px] font-black uppercase tracking-tighter">
                {type === 'ratio' ? 'TAUX D\'ENCODAGE EFFECTUÉ' : (type === 'gts' ? 'POCHES GTS TRANSPORTÉES' : 'POCHES DE SANG COLLECTÉES')}
              </p>
              <div className="w-10 h-0.5 bg-white mt-1 rounded-full opacity-50" />
            </div>

            {/* Logo and Countdown */}
            <div className="w-full flex items-center justify-between px-1">
              <div className="w-9 h-9 bg-white rounded-full p-1 shadow-xl">
                <img 
                  src={branding?.logo || 'https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=934812425420904'} 
                  alt="Logo" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="flex flex-col items-end">
                {isSuccess ? (
                  <p className="text-[12px] font-serif italic font-bold">Merci chers héros !</p>
                ) : (
                  <div className="flex flex-col items-end">
                    <p className="text-xl font-black tracking-tighter">J - {days.toString().padStart(2, '0')}</p>
                    <p className="text-[6px] font-black uppercase tracking-widest opacity-70">Jours restants</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Tableau des Objectifs</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Suivi en temps réel des performances</p>
        </div>

        <button 
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50 shadow-lg shadow-slate-200"
        >
          {exporting ? <Activity className="animate-spin" size={16} /> : <Download size={16} />}
          Exporter Dashboard
        </button>
      </div>

      {/* CAPSULE SPÉCIALE SDS */}
      {sdsData && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-[3rem] p-8 lg:p-12 text-white shadow-2xl relative overflow-hidden group border border-white/10"
        >
          {/* Background decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-indigo-500/20 transition-all duration-1000" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl -ml-32 -mb-32 group-hover:bg-rose-500/20 transition-all duration-1000" />

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
            <div className="shrink-0">
              <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-orange-900/50 rotate-3 group-hover:rotate-6 transition-all duration-500">
                <Trophy size={48} className="text-white drop-shadow-lg" />
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
                <span className="px-4 py-1.5 bg-orange-600 text-white rounded-full text-[10px] font-black tracking-widest uppercase shadow-lg shadow-orange-900/40">
                  LES SAMEDIS DE LA SOLIDARITÉ-SDS
                </span>
                <span className="px-4 py-1.5 bg-white/10 text-white rounded-full text-[10px] font-black tracking-widest uppercase backdrop-blur-md border border-white/10">
                  {sdsData.totalRecords} ème ÉDITION
                </span>
              </div>

              <h2 className="text-3xl lg:text-4xl font-black tracking-tighter uppercase mb-6 leading-none">
                PROCLAMATION DES RÉSULTATS PROVISOIRES
              </h2>

              <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 mb-8">
                <p className="text-lg font-medium text-slate-200 italic mb-4 leading-relaxed">
                  "Bonjour à tous et à toutes. Proclamation des résultats provisoires des Samedis de la Solidarité {sdsData.totalRecords} ème édition du <span className="text-white font-black not-italic bg-orange-600 px-2 rounded">{sdsData.date}</span> à <span className="text-white font-black not-italic underline decoration-orange-500 underline-offset-4">{sdsData.site.replace('CRTS DE ', '').replace('CDTS DE ', '')}</span> ({sdsData.site})."
                </p>
                
                <div className="flex flex-col sm:flex-row items-center gap-6 mt-6">
                  <div className="text-center sm:text-left">
                    <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-1">TOTAL PRÉLEVÉ</p>
                    <div className="text-5xl font-black text-white tracking-tighter flex items-center gap-2">
                      {sdsData.value} <span className="text-xs font-bold text-indigo-300 uppercase">Poches</span>
                    </div>
                  </div>
                  <div className="w-[1px] h-12 bg-white/10 hidden sm:block" />
                  <div className="text-center sm:text-left">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">PERFORMANCE</p>
                    <div className="text-5xl font-black text-emerald-400 tracking-tighter">
                      {((sdsData.value / 1000) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 text-sm font-medium text-slate-300 leading-relaxed">
                <p>
                  Merci à la dynamique équipe du <span className="text-white font-black">{sdsData.site}</span> à sa tête <span className="text-orange-400 font-black">{sdsData.manager}</span>. 
                  Bravo à toutes les équipes de soutien.
                </p>
                <p>
                  Merci au Directeur Général <span className="text-white font-black">Pr Yassongui Mamadou SEKONGO</span> et ses Directeurs centraux. 
                  À L'équipe de la Direction Générale du CNTSCI. Bravo au CNTSCI nouveau.
                </p>
                <div className="pt-4 flex flex-col gap-1 border-t border-white/5">
                  <p className="font-black text-white uppercase tracking-widest text-xs italic">
                    Ensemble nous y ARRIVERONS
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                    Le comité d'organisation des samedis de la solidarité
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Grid - 6 Pulse Cards */}
      <div ref={pulseRef} className="p-4 rounded-[4rem] bg-slate-50/50">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Prélèvements Mensuels */}
          {renderPulseCard(
            `PRÉLÈVEMENTS (DECLARATIONS) ${(data.month || '').toUpperCase()}`,
            data.monthly,
            'prel',
            'monthly'
          )}
          
          {/* GTS Mensuels */}
          {renderPulseCard(
            `ENCODAGE GTS ${(data.month || '').toUpperCase()}`,
            gtsStats.monthly,
            'gts',
            'monthly'
          )}

          {/* Taux Encodage Mensuel */}
          {renderPulseCard(
            `TAUX ENCODAGE ${(data.month || '').toUpperCase()}`,
            ratioStats.monthly,
            'ratio',
            'monthly'
          )}

          {/* Prélèvements Annuels */}
          {renderPulseCard(
            `PRÉLÈVEMENTS (DECLARATIONS) ANNUELS ${data.year || ''}`,
            data.annual,
            'prel',
            'annual'
          )}

          {/* GTS Annuels */}
          {renderPulseCard(
            `ENCODAGE GTS ANNUELS ${data.year || ''}`,
            gtsStats.annual,
            'gts',
            'annual'
          )}

          {/* Taux Encodage Annuel */}
          {renderPulseCard(
            `TAUX ENCODAGE ANNUEL ${data.year || ''}`,
            ratioStats.annual,
            'ratio',
            'annual'
          )}
        </div>
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
              <Heart size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tighter">PRÉLÈVEMENTS (DECLARATIONS)</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Performance Globale</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mensuel</p>
              <p className="text-3xl font-black text-slate-900">{data.monthly.realized.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-orange-600 mt-1">{Math.round(data.monthly.percentage)}% de l'objectif</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Annuel</p>
              <p className="text-3xl font-black text-slate-900">{data.annual.realized.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-emerald-600 mt-1">{Math.round(data.annual.percentage)}% de l'objectif</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
              <Activity size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tighter">ENCODAGE GTS</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Performance Logistique</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mensuel</p>
              <p className="text-3xl font-black text-slate-900">{gtsStats.monthly.realized.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-indigo-600 mt-1">{Math.round(gtsStats.monthly.percentage)}% de l'objectif</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Annuel</p>
              <p className="text-3xl font-black text-slate-900">{gtsStats.annual.realized.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-violet-600 mt-1">{Math.round(gtsStats.annual.percentage)}% de l'objectif</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-600">
              <Target size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tighter">TAUX D'ENCODAGE</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Efficacité Saisie</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mensuel</p>
              <p className="text-3xl font-black text-slate-900">{Math.round(ratioStats.monthly.percentage)}%</p>
              <p className="text-[10px] font-bold text-slate-500 mt-1">Encodé / Collecté</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Annuel</p>
              <p className="text-3xl font-black text-slate-900">{Math.round(ratioStats.annual.percentage)}%</p>
              <p className="text-[10px] font-bold text-slate-500 mt-1">Encodé / Collecté</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalPulseView;
