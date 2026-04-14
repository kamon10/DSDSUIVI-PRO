
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Play, Pause, Maximize2, Minimize2, Activity, MapPin, Calendar, TrendingUp, Clock } from 'lucide-react';
import { DashboardData, RegionData, SiteRecord } from '../types.ts';

interface PresSlideshowProps {
  data: DashboardData;
}

const PresSlideshow: React.FC<PresSlideshowProps> = ({ data }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(data.date);

  // Reconstruct regions based on selected date
  const displayRegions = useMemo(() => {
    if (selectedDate === data.date) {
      return data.regions.filter(r => r.sites.length > 0);
    }

    const record = data.dailyHistory.find(h => h.date === selectedDate);
    if (!record) return data.regions.filter(r => r.sites.length > 0);

    // Mapping site to region from current data
    const siteToRegion: Record<string, string> = {};
    data.regions.forEach(r => {
      r.sites.forEach(s => {
        siteToRegion[s.name] = r.name;
      });
    });

    // Calculate monthly totals up to this selected date
    const [selDay, selMonth, selYear] = selectedDate.split('/').map(Number);
    const monthRecords = data.dailyHistory.filter(h => {
      const [hDay, hMonth, hYear] = h.date.split('/').map(Number);
      return hMonth === selMonth && hYear === selYear && (hYear < selYear || (hYear === selYear && hMonth < selMonth) || (hYear === selYear && hMonth === selMonth && hDay <= selDay));
    });

    const monthlyTotals: Record<string, number> = {};
    monthRecords.forEach(h => {
      h.sites.forEach(s => {
        monthlyTotals[s.name] = (monthlyTotals[s.name] || 0) + s.total;
      });
    });

    const regionsMap: Record<string, SiteRecord[]> = {};
    record.sites.forEach(s => {
      const regionName = s.region || siteToRegion[s.name] || 'AUTRE';
      if (!regionsMap[regionName]) regionsMap[regionName] = [];
      
      const originalSite = data.regions.flatMap(r => r.sites).find(os => os.name === s.name);

      regionsMap[regionName].push({
        name: s.name,
        region: regionName,
        totalJour: s.total,
        totalMois: monthlyTotals[s.name] || 0,
        objMensuel: originalSite?.objMensuel || 0,
        fixe: s.fixe,
        mobile: s.mobile
      });
    });

    return Object.entries(regionsMap)
      .map(([name, sites]) => ({ name, sites }))
      .filter(r => r.sites.length > 0);
  }, [selectedDate, data]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [selectedDate]);

  useEffect(() => {
    let interval: any;
    if (isAutoPlay) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % displayRegions.length);
      }, 10000); // 10 seconds per slide
    }
    return () => clearInterval(interval);
  }, [isAutoPlay, displayRegions.length]);

  if (displayRegions.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-slate-500 font-medium">
        Aucune donnée par PRES disponible.
      </div>
    );
  }

  const currentRegion = displayRegions[currentIndex];

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % displayRegions.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + displayRegions.length) % displayRegions.length);

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
              Slide {currentIndex + 1} sur {displayRegions.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm">
            <Clock size={16} className="text-orange-500" />
            <select 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-[10px] font-black uppercase outline-none cursor-pointer bg-transparent"
            >
              <option value={data.date}>Aujourd'hui ({data.date})</option>
              {data.dailyHistory.filter(h => h.date !== data.date).map(h => (
                <option key={h.date} value={h.date}>{h.date}</option>
              ))}
            </select>
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
            key={currentRegion.name}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-0 p-8 flex flex-col"
          >
            {/* Region Title */}
            <div className="mb-10 text-center">
              <motion.h3 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl font-black text-slate-900 uppercase tracking-tight mb-2"
              >
                {currentRegion.name}
              </motion.h3>
              <div className="h-1.5 w-24 bg-orange-500 mx-auto rounded-full" />
            </div>

            {/* Region Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <StatBox 
                label="Total Jour" 
                value={currentRegion.sites.reduce((acc, s) => acc + (s.totalJour || 0), 0)} 
                icon={<Calendar className="text-blue-500" />}
                color="blue"
              />
              <StatBox 
                label="Total Mois" 
                value={currentRegion.sites.reduce((acc, s) => acc + (s.totalMois || 0), 0)} 
                icon={<Activity className="text-orange-500" />}
                color="orange"
              />
              <StatBox 
                label="Objectif Mensuel" 
                value={currentRegion.sites.reduce((acc, s) => acc + (s.objMensuel || 0), 0)} 
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
                      <th className="px-6 py-2 text-center">Jour</th>
                      <th className="px-6 py-2 text-center">Mois</th>
                      <th className="px-6 py-2 text-center">Objectif</th>
                      <th className="px-6 py-2 text-right">Réalisation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRegion.sites.sort((a, b) => (b.totalMois || 0) - (a.totalMois || 0)).map((site, idx) => (
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
            animate={{ width: `${((currentIndex + 1) / displayRegions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Indicators */}
      <div className="flex justify-center gap-2 mt-8">
        {displayRegions.map((_, idx) => (
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
