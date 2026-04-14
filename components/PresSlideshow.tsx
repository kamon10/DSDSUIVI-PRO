
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Play, Pause, Maximize2, Minimize2, Activity, MapPin, Calendar, TrendingUp, Clock, Package, Truck, BarChart3, Download, X } from 'lucide-react';
import { DashboardData, RegionData, SiteRecord, StockRecord, DistributionRecord, GtsRecord } from '../types.ts';
import pptxgen from "pptxgenjs";

interface PresSlideshowProps {
  data: DashboardData;
}

type SlideType = 'COLLECTION' | 'STOCK' | 'DISTRIBUTION' | 'GTS_COMPARISON' | 'FAMILY_HEADER';

interface Slide {
  type: SlideType;
  regionName: string;
  sites: SiteRecord[];
  stock: StockRecord[];
  distributions: DistributionRecord[];
  gts: GtsRecord[];
  familyTitle?: string;
}

const PresSlideshow: React.FC<PresSlideshowProps> = ({ data }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [startDate, setStartDate] = useState(data.date);
  const [endDate, setEndDate] = useState(data.date);

  const parseDate = (dateStr: string) => {
    const [d, m, y] = dateStr.split('/').map(Number);
    return new Date(y, m - 1, d).getTime();
  };

  // Reconstruct slides based on selected period and region data
  const slides = useMemo(() => {
    const regions = data.regions.filter(r => r.sites.length > 0);
    
    const startTs = parseDate(startDate);
    const endTs = parseDate(endDate);
    
    // Filter history for the selected period
    const periodRecords = data.dailyHistory.filter(h => {
      const hTs = parseDate(h.date);
      return hTs >= Math.min(startTs, endTs) && hTs <= Math.max(startTs, endTs);
    });

    // Aggregate site totals for the period
    const periodSiteTotals: Record<string, number> = {};
    periodRecords.forEach(h => {
      h.sites.forEach(s => {
        periodSiteTotals[s.name] = (periodSiteTotals[s.name] || 0) + s.total;
      });
    });
    
    // Calculate monthly totals up to the end date
    const [endDay, endMonth, endYear] = endDate.split('/').map(Number);
    const monthRecords = data.dailyHistory.filter(h => {
      const [hDay, hMonth, hYear] = h.date.split('/').map(Number);
      return hMonth === endMonth && hYear === endYear && hDay <= endDay;
    });

    const monthlyTotals: Record<string, number> = {};
    monthRecords.forEach(h => {
      h.sites.forEach(s => {
        monthlyTotals[s.name] = (monthlyTotals[s.name] || 0) + s.total;
      });
    });

    // Mapping site to region
    const siteToRegion: Record<string, string> = {};
    data.regions.forEach(r => {
      r.sites.forEach(s => {
        siteToRegion[s.name] = r.name;
      });
    });

    const collectionSlides: Slide[] = [];
    const stockSlides: Slide[] = [];
    const distributionSlides: Slide[] = [];
    const gtsSlides: Slide[] = [];

    regions.forEach(region => {
      const regionName = region.name;
      
      const regionSites: SiteRecord[] = [];
      region.sites.forEach(os => {
        regionSites.push({
          ...os,
          totalJour: periodSiteTotals[os.name] || 0,
          totalMois: monthlyTotals[os.name] || 0,
        });
      });

      if (regionSites.length === 0) return;

      const regionStock = (data.stock || []).filter(s => s.pres.toUpperCase() === regionName.toUpperCase());

      const regionDistributions = (data.distributions?.records || []).filter(r => {
        const rTs = parseDate(r.date);
        return r.region.toUpperCase() === regionName.toUpperCase() && 
               rTs >= Math.min(startTs, endTs) && rTs <= Math.max(startTs, endTs);
      });

      const regionGts: GtsRecord[] = [];
      const gtsBySite: Record<string, number> = {};
      
      (data.gts || []).forEach(g => {
        const gTs = parseDate(g.date);
        if (g.region?.toUpperCase() === regionName.toUpperCase() && 
            gTs >= Math.min(startTs, endTs) && gTs <= Math.max(startTs, endTs)) {
          gtsBySite[g.site] = (gtsBySite[g.site] || 0) + g.total;
        }
      });

      Object.entries(gtsBySite).forEach(([site, total]) => {
        regionGts.push({ site, total, date: `${startDate} - ${endDate}`, region: regionName, fixe: 0, mobile: 0, autoTransfusion: 0 });
      });

      collectionSlides.push({ type: 'COLLECTION', regionName, sites: regionSites, stock: [], distributions: [], gts: [] });
      
      if (regionStock.length > 0) {
        stockSlides.push({ type: 'STOCK', regionName, sites: regionSites, stock: regionStock, distributions: [], gts: [] });
      }
      
      if (regionDistributions.length > 0) {
        distributionSlides.push({ type: 'DISTRIBUTION', regionName, sites: regionSites, stock: [], distributions: regionDistributions, gts: [] });
      }

      if (regionGts.length > 0) {
        gtsSlides.push({ type: 'GTS_COMPARISON', regionName, sites: regionSites, stock: [], distributions: [], gts: regionGts });
      }
    });

    const allSlides: Slide[] = [];

    if (collectionSlides.length > 0) {
      allSlides.push({ type: 'FAMILY_HEADER', familyTitle: 'PRELEVEMENT', regionName: '', sites: [], stock: [], distributions: [], gts: [] });
      allSlides.push(...collectionSlides);
    }

    if (stockSlides.length > 0) {
      allSlides.push({ type: 'FAMILY_HEADER', familyTitle: 'STOCK', regionName: '', sites: [], stock: [], distributions: [], gts: [] });
      allSlides.push(...stockSlides);
    }

    if (distributionSlides.length > 0) {
      allSlides.push({ type: 'FAMILY_HEADER', familyTitle: 'DISTRIBUTION', regionName: '', sites: [], stock: [], distributions: [], gts: [] });
      allSlides.push(...distributionSlides);
    }

    if (gtsSlides.length > 0) {
      allSlides.push({ type: 'FAMILY_HEADER', familyTitle: 'COMPARAISON PRELEVEMENT / GTS', regionName: '', sites: [], stock: [], distributions: [], gts: [] });
      allSlides.push(...gtsSlides);
    }

    return allSlides;
  }, [startDate, endDate, data]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [startDate, endDate]);

  useEffect(() => {
    let interval: any;
    if (isAutoPlay) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % slides.length);
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [isAutoPlay, slides.length]);

  const exportToPPTX = () => {
    const pres = new pptxgen();
    pres.layout = 'LAYOUT_WIDE';

    slides.forEach(slide => {
      const pptSlide = pres.addSlide();
      
      if (slide.type === 'FAMILY_HEADER') {
        pptSlide.background = { color: 'F97316' }; // Orange-500
        pptSlide.addText(slide.familyTitle || '', { 
          x: 0, y: 0, w: '100%', h: '100%', 
          fontSize: 60, bold: true, color: 'FFFFFF', 
          align: 'center', valign: 'middle' 
        });
        return;
      }

      // Background and Title
      pptSlide.addText(slide.regionName, { x: 0.5, y: 0.5, w: '90%', h: 1, fontSize: 36, bold: true, color: '333333', align: 'center' });
      pptSlide.addText(slide.type === 'COLLECTION' ? 'Réalisation Collecte' : 
                      slide.type === 'STOCK' ? 'État des Stocks' : 
                      slide.type === 'DISTRIBUTION' ? 'Distribution PSL' : 'COMPARAISON DECLARATION / GTS', 
                      { x: 0.5, y: 1.2, w: '90%', h: 0.5, fontSize: 20, color: '666666', align: 'center' });
      pptSlide.addText(startDate === endDate ? startDate : `${startDate} - ${endDate}`, { x: 0.5, y: 1.6, w: '90%', h: 0.3, fontSize: 14, color: '999999', align: 'center' });

      if (slide.type === 'COLLECTION') {
        const rows = [['Site', startDate === endDate ? 'Jour' : 'Période', 'Mois', 'Objectif', '%']];
        slide.sites.forEach(s => {
          rows.push([s.name, s.totalJour.toString(), s.totalMois.toString(), s.objMensuel.toString(), Math.round((s.totalMois / (s.objMensuel || 1)) * 100) + '%']);
        });
        pptSlide.addTable(rows as any, { x: 0.5, y: 2.2, w: 12.3, colW: [4, 2, 2, 2, 2.3], border: { pt: 1, color: 'E2E8F0' }, fontSize: 12 });
      } else if (slide.type === 'STOCK') {
        const stockByGroup: Record<string, number> = {};
        slide.stock.forEach(s => {
          stockByGroup[s.groupeSanguin] = (stockByGroup[s.groupeSanguin] || 0) + s.quantite;
        });
        const rows = [['Groupe Sanguin', 'Quantité']];
        Object.entries(stockByGroup).forEach(([group, qty]) => {
          rows.push([group, qty.toString()]);
        });
        pptSlide.addTable(rows as any, { x: 0.5, y: 2.2, w: 12.3, colW: [6, 6.3], border: { pt: 1, color: 'E2E8F0' }, fontSize: 14 });
      } else if (slide.type === 'DISTRIBUTION') {
        const distByGroup: Record<string, number> = {};
        slide.distributions.forEach(d => {
          distByGroup[d.groupeSanguin] = (distByGroup[d.groupeSanguin] || 0) + d.quantite;
        });
        const rows = [['Groupe Sanguin', 'Distribué']];
        Object.entries(distByGroup).forEach(([group, qty]) => {
          rows.push([group, qty.toString()]);
        });
        pptSlide.addTable(rows as any, { x: 0.5, y: 2.2, w: 12.3, colW: [6, 6.3], border: { pt: 1, color: 'E2E8F0' }, fontSize: 14 });
      } else if (slide.type === 'GTS_COMPARISON') {
        const rows = [['Site', 'DECLARATION', 'ENCODAGE GTS', 'Écart']];
        slide.sites.forEach(s => {
          const gtsMatch = slide.gts.find(g => g.site.toUpperCase() === s.name.toUpperCase());
          const gtsTotal = gtsMatch ? gtsMatch.total : 0;
          rows.push([s.name, s.totalJour.toString(), gtsTotal.toString(), (s.totalJour - gtsTotal).toString()]);
        });
        pptSlide.addTable(rows as any, { x: 0.5, y: 2.2, w: 12.3, colW: [4, 3, 3, 2.3], border: { pt: 1, color: 'E2E8F0' }, fontSize: 12 });
      }
    });

    pres.writeFile({ fileName: `Presentation_HEMO_STATS_${startDate.replace(/\//g, '-')}_${endDate.replace(/\//g, '-')}.pptx` });
  };

  if (slides.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-slate-500 font-medium">
        Aucune donnée disponible pour cette période.
      </div>
    );
  }

  const currentSlide = slides[currentIndex];

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className={`relative flex flex-col ${isFullscreen ? 'fixed inset-0 z-[200] bg-slate-900 p-8' : 'w-full max-w-7xl mx-auto p-4'}`}>
      {/* Header Controls */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500 rounded-lg shadow-lg shadow-orange-500/20">
            <Activity className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
              Présentation par PRES
            </h2>
            <p className="text-sm text-slate-500 font-medium">
              Slide {currentIndex + 1} sur {slides.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={exportToPPTX}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all font-bold text-xs uppercase"
          >
            <Download size={16} />
            PPTX
          </button>

          {/* Period Selector */}
          <div className="flex items-center gap-4 px-4 py-2 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase">Du</span>
              <select 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-[10px] font-black uppercase outline-none cursor-pointer bg-transparent"
              >
                <option value={data.date}>{data.date}</option>
                {data.dailyHistory.filter(h => h.date !== data.date).map(h => (
                  <option key={h.date} value={h.date}>{h.date}</option>
                ))}
              </select>
            </div>
            <div className="w-px h-4 bg-slate-200" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase">Au</span>
              <select 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-[10px] font-black uppercase outline-none cursor-pointer bg-transparent"
              >
                <option value={data.date}>{data.date}</option>
                {data.dailyHistory.filter(h => h.date !== data.date).map(h => (
                  <option key={h.date} value={h.date}>{h.date}</option>
                ))}
              </select>
            </div>
          </div>

          <button 
            onClick={() => setIsAutoPlay(!isAutoPlay)}
            className={`p-3 rounded-xl transition-all ${isAutoPlay ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
          >
            {isAutoPlay ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button 
            onClick={toggleFullscreen}
            className="p-3 bg-white text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all"
          >
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
        </div>
      </div>

      {/* Slide Content */}
      <div className="relative flex-1 min-h-[600px] overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.type === 'FAMILY_HEADER' ? `header-${currentSlide.familyTitle}` : `${currentSlide.regionName}-${currentSlide.type}`}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`absolute inset-0 p-8 flex flex-col ${currentSlide.type === 'FAMILY_HEADER' ? 'bg-orange-500 items-center justify-center text-white' : ''}`}
          >
            {currentSlide.type === 'FAMILY_HEADER' ? (
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-8 mx-auto"
                >
                  <Activity size={48} className="text-white" />
                </motion.div>
                <motion.h1 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-7xl font-black uppercase tracking-tighter mb-4"
                >
                  {currentSlide.familyTitle}
                </motion.h1>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: 200 }}
                  transition={{ delay: 0.6, duration: 0.8 }}
                  className="h-2 bg-white rounded-full mx-auto"
                />
              </div>
            ) : (
              <>
                {/* Region Title */}
                <div className="mb-6 text-center">
                  <motion.h3 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-5xl font-black text-slate-900 uppercase tracking-tight mb-2"
                  >
                    {currentSlide.regionName}
                  </motion.h3>
                  <div className="flex items-center justify-center gap-3">
                    <div className="h-1.5 w-12 bg-orange-500 rounded-full" />
                    <span className="text-lg font-bold text-slate-400 uppercase tracking-widest">
                      {currentSlide.type === 'COLLECTION' ? 'Réalisation Collecte' : 
                       currentSlide.type === 'STOCK' ? 'État des Stocks' : 
                       currentSlide.type === 'DISTRIBUTION' ? 'Distribution PSL' : 'COMPARAISON DECLARATION / GTS'}
                    </span>
                    <div className="h-1.5 w-12 bg-orange-500 rounded-full" />
                  </div>
                </div>

                {currentSlide.type === 'COLLECTION' && (
                  <>
                    {/* Region Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                      <StatBox 
                        label={startDate === endDate ? "Total Jour" : "Total Période"} 
                        value={currentSlide.sites.reduce((acc, s) => acc + (s.totalJour || 0), 0)} 
                        icon={<Calendar className="text-blue-500" />}
                        color="blue"
                      />
                      <StatBox 
                        label="Total Mois" 
                        value={currentSlide.sites.reduce((acc, s) => acc + (s.totalMois || 0), 0)} 
                        icon={<Activity className="text-orange-500" />}
                        color="orange"
                      />
                      <StatBox 
                        label="Objectif Mensuel" 
                        value={currentSlide.sites.reduce((acc, s) => acc + (s.objMensuel || 0), 0)} 
                        icon={<TrendingUp className="text-green-500" />}
                        color="green"
                      />
                    </div>

                    {/* Sites Table */}
                    <div className="flex-1 overflow-hidden flex flex-col">
                      <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <MapPin size={20} className="text-slate-400" />
                        Détail par Site
                      </h4>
                      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        <table className="w-full border-separate border-spacing-y-3">
                          <thead>
                            <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                              <th className="px-6 py-2">Site</th>
                              <th className="px-6 py-2 text-center">{startDate === endDate ? "Jour" : "Période"}</th>
                              <th className="px-6 py-2 text-center">Mois</th>
                              <th className="px-6 py-2 text-center">Objectif</th>
                              <th className="px-6 py-2 text-right">Réalisation</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentSlide.sites.sort((a, b) => (b.totalMois || 0) - (a.totalMois || 0)).map((site, idx) => (
                              <motion.tr 
                                key={site.name}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-slate-50 hover:bg-slate-100 transition-colors rounded-2xl overflow-hidden"
                              >
                                <td className="px-6 py-4 font-bold text-slate-700 rounded-l-2xl border-l-4 border-orange-500">
                                  {site.name}
                                </td>
                                <td className="px-6 py-4 text-center font-mono font-bold text-blue-600">
                                  {site.totalJour || 0}
                                </td>
                                <td className="px-6 py-4 text-center font-mono font-bold text-orange-600">
                                  {site.totalMois || 0}
                                </td>
                                <td className="px-6 py-4 text-center font-mono text-slate-500">
                                  {site.objMensuel || 0}
                                </td>
                                <td className="px-6 py-4 text-right rounded-r-2xl">
                                  <div className="flex items-center justify-end gap-3">
                                    <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-orange-500" 
                                        style={{ width: `${Math.min(100, ((site.totalMois || 0) / (site.objMensuel || 1)) * 100)}%` }}
                                      />
                                    </div>
                                    <span className="text-sm font-black text-slate-900 w-12">
                                      {Math.round(((site.totalMois || 0) / (site.objMensuel || 1)) * 100)}%
                                    </span>
                                  </div>
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}

                {currentSlide.type === 'STOCK' && (
                  <div className="flex-1 flex flex-col">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
                      <StatBox 
                        label="Total Stock" 
                        value={currentSlide.stock.reduce((acc, s) => acc + s.quantite, 0)} 
                        icon={<Package className="text-purple-500" />}
                        color="blue"
                      />
                      <StatBox 
                        label="Groupes Différents" 
                        value={new Set(currentSlide.stock.map(s => s.groupeSanguin)).size} 
                        icon={<Activity className="text-rose-500" />}
                        color="orange"
                      />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                      {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(group => {
                        const qty = currentSlide.stock.filter(s => s.groupeSanguin === group).reduce((acc, s) => acc + s.quantite, 0);
                        return (
                          <div key={group} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center justify-center text-center">
                            <span className="text-2xl font-black text-rose-600 mb-1">{group}</span>
                            <span className="text-3xl font-black text-slate-900">{qty}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase mt-2">Poches</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {currentSlide.type === 'DISTRIBUTION' && (
                  <div className="flex-1 flex flex-col">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                      <StatBox 
                        label="Total Distribué" 
                        value={currentSlide.distributions.reduce((acc, d) => acc + d.quantite, 0)} 
                        icon={<Truck className="text-indigo-500" />}
                        color="blue"
                      />
                      <StatBox 
                        label="Rendus / Périmés" 
                        value={currentSlide.distributions.reduce((acc, d) => acc + (d.rendu || 0), 0)} 
                        icon={<X className="text-rose-500" />}
                        color="orange"
                      />
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Distribution by Product Type */}
                        <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                          <h5 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Par Type de Produit</h5>
                          <div className="space-y-4">
                            {Array.from(new Set(currentSlide.distributions.map(d => d.typeProduit))).map(type => {
                              const qty = currentSlide.distributions.filter(d => d.typeProduit === type).reduce((acc, d) => acc + d.quantite, 0);
                              const total = currentSlide.distributions.reduce((acc, d) => acc + d.quantite, 0);
                              return (
                                <div key={type} className="flex flex-col gap-2">
                                  <div className="flex justify-between items-end">
                                    <span className="text-sm font-bold text-slate-700">{type}</span>
                                    <span className="text-sm font-black text-slate-900">{qty}</span>
                                  </div>
                                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500" style={{ width: `${(qty / total) * 100}%` }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        {/* Distribution by Group */}
                        <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                          <h5 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Par Groupe Sanguin</h5>
                          <div className="grid grid-cols-4 gap-4">
                            {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(group => {
                              const qty = currentSlide.distributions.filter(d => d.groupeSanguin === group).reduce((acc, d) => acc + d.quantite, 0);
                              return (
                                <div key={group} className="flex flex-col items-center">
                                  <span className="text-xs font-black text-rose-600">{group}</span>
                                  <span className="text-lg font-black text-slate-900">{qty}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {currentSlide.type === 'GTS_COMPARISON' && (
                  <div className="flex-1 flex flex-col">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                      <StatBox 
                        label={startDate === endDate ? "DECLARATION" : "DECLARATION PERIODE"} 
                        value={currentSlide.sites.reduce((acc, s) => acc + (s.totalJour || 0), 0)} 
                        icon={<Activity className="text-orange-500" />}
                        color="orange"
                      />
                      <StatBox 
                        label={startDate === endDate ? "ENCODAGE GTS" : "ENCODAGE GTS PERIODE"} 
                        value={currentSlide.gts.reduce((acc, g) => acc + g.total, 0)} 
                        icon={<BarChart3 className="text-blue-500" />}
                        color="blue"
                      />
                      <StatBox 
                        label="Écart Global" 
                        value={currentSlide.sites.reduce((acc, s) => acc + (s.totalJour || 0), 0) - currentSlide.gts.reduce((acc, g) => acc + g.total, 0)} 
                        icon={<TrendingUp className="text-emerald-500" />}
                        color="green"
                      />
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                      <table className="w-full border-separate border-spacing-y-3">
                        <thead>
                          <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <th className="px-6 py-2">Site</th>
                            <th className="px-6 py-2 text-center">{startDate === endDate ? "DECLARATION" : "DECLARATION PERIODE"}</th>
                            <th className="px-6 py-2 text-center">{startDate === endDate ? "ENCODAGE GTS" : "ENCODAGE GTS PERIODE"}</th>
                            <th className="px-6 py-2 text-right">Écart</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentSlide.sites.map((site, idx) => {
                            const gtsMatch = currentSlide.gts.find(g => g.site.toUpperCase() === site.name.toUpperCase());
                            const gtsTotal = gtsMatch ? gtsMatch.total : 0;
                            const diff = site.totalJour - gtsTotal;
                            return (
                              <tr key={site.name} className="bg-slate-50 rounded-2xl overflow-hidden">
                                <td className="px-6 py-4 font-bold text-slate-700 rounded-l-2xl border-l-4 border-orange-500">{site.name}</td>
                                <td className="px-6 py-4 text-center font-mono font-bold text-slate-900">{site.totalJour}</td>
                                <td className="px-6 py-4 text-center font-mono font-bold text-blue-600">{gtsTotal}</td>
                                <td className={`px-6 py-4 text-right font-mono font-black rounded-r-2xl ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {diff > 0 ? '+' : ''}{diff}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        <button 
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-white/80 backdrop-blur-md text-slate-800 rounded-full shadow-xl hover:bg-white transition-all z-10 border border-slate-100"
        >
          <ChevronLeft size={32} />
        </button>
        <button 
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-white/80 backdrop-blur-md text-slate-800 rounded-full shadow-xl hover:bg-white transition-all z-10 border border-slate-100"
        >
          <ChevronRight size={32} />
        </button>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-100">
          <motion.div 
            className="h-full bg-orange-500"
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / slides.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Indicators */}
      <div className="flex justify-center gap-2 mt-8">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-2 rounded-full transition-all ${idx === currentIndex ? 'w-8 bg-orange-500' : 'w-2 bg-slate-300 hover:bg-slate-400'}`}
          />
        ))}
      </div>
    </div>
  );
};

const StatBox = ({ label, value, icon, color }: { label: string, value: number, icon: React.ReactNode, color: string }) => {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    green: 'bg-green-50 text-green-600 border-green-100'
  };

  return (
    <div className={`p-6 rounded-3xl border ${colorClasses[color]} flex items-center gap-5 shadow-sm`}>
      <div className="p-4 bg-white rounded-2xl shadow-sm">
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold opacity-70 uppercase tracking-wider">{label}</p>
        <p className="text-3xl font-black">{value.toLocaleString()}</p>
      </div>
    </div>
  );
};

export default PresSlideshow;
