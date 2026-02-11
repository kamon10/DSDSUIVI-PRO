
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { DashboardData, DistributionRecord } from '../types';
import { PRES_COORDINATES, COLORS, getSiteObjectives, PRODUCT_COLORS } from '../constants';
import { Activity, Truck, Calendar, MapPin, Target, Layers, PieChart, Info, Award, Globe, Filter, Package, ChevronRight, Search } from 'lucide-react';

interface DistributionMapViewProps {
  data: DashboardData;
  sites: any[];
}

const MONTHS_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const getPerfColor = (p: number) => {
  if (p >= 100) return '#10b981'; 
  if (p >= 75) return '#f59e0b';  
  return '#ef4444';               
};

export const DistributionMapView: React.FC<DistributionMapViewProps> = ({ data, sites }) => {
  const [viewMode, setViewMode] = useState<'donations' | 'distribution'>('distribution');
  const [selectedDate, setSelectedDate] = useState(data.date);
  const [selectedPresName, setSelectedPresName] = useState<string | null>(null);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    data.dailyHistory.forEach(h => {
        const parts = h.date.split('/');
        if (parts[2]) years.add(parts[2]);
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [data.dailyHistory]);

  const [selYear, setSelYear] = useState(availableYears[0] || "2026");
  const [selMonth, setSelMonth] = useState((new Date().getMonth()).toString());

  const availableDates = useMemo(() => {
    return data.dailyHistory
      .filter(h => {
        const p = h.date.split('/');
        return p[2] === selYear && (parseInt(p[1]) - 1).toString() === selMonth;
      })
      .map(h => h.date);
  }, [data.dailyHistory, selYear, selMonth]);

  useEffect(() => {
    if (availableDates.length > 0 && !availableDates.includes(selectedDate)) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates]);

  const mapStats = useMemo(() => {
    const presMap = new Map<string, any>();
    
    Object.keys(PRES_COORDINATES).forEach(pres => {
        presMap.set(pres, { 
          name: pres, 
          realized: 0, 
          objective: 0,
          distribution: { cgr: 0, plasma: 0, platelets: 0, total: 0 }
        });
    });

    if (viewMode === 'donations') {
      const dayData = data.dailyHistory.find(h => h.date === selectedDate);
      if (dayData) {
        dayData.sites.forEach(site => {
          const region = site.region || "AUTRES";
          if (presMap.has(region)) {
            const stats = presMap.get(region);
            stats.realized += site.total;
            stats.objective += site.objective;
          }
        });
      }
    } else {
      const dayDist = data.distributions?.records.filter(r => r.date === selectedDate) || [];
      dayDist.forEach(r => {
        const region = r.region || "AUTRES";
        if (presMap.has(region)) {
          const stats = presMap.get(region);
          const qty = r.quantite || 0;
          stats.distribution.total += qty;
          const prod = r.typeProduit.toUpperCase();
          if (prod.includes("CGR")) stats.distribution.cgr += qty;
          else if (prod.includes("PLASMA")) stats.distribution.plasma += qty;
          else if (prod.includes("PLAQUETTES") || prod.includes("PLATELETS")) stats.distribution.platelets += qty;
        }
      });
    }

    return Array.from(presMap.values()).filter(p => PRES_COORDINATES[p.name]);
  }, [data, selectedDate, viewMode]);

  const handleSelectPres = (name: string) => {
    setSelectedPresName(name);
    const coords = PRES_COORDINATES[name];
    if (coords && leafletMapInstance.current) {
      leafletMapInstance.current.flyTo(coords, 9, { duration: 1.5 });
    }
  };

  useEffect(() => {
    if (!mapRef.current) return;
    
    if (!leafletMapInstance.current) {
      leafletMapInstance.current = (window as any).L.map(mapRef.current, {
        center: [7.539989, -5.547080],
        zoom: 7,
        zoomControl: false,
        dragging: true,
        scrollWheelZoom: false,
        attributionControl: false
      });

      (window as any).L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(leafletMapInstance.current);
      
      resizeObserverRef.current = new ResizeObserver(() => {
        if (leafletMapInstance.current) {
          leafletMapInstance.current.invalidateSize();
        }
      });
      resizeObserverRef.current.observe(mapRef.current);

      [50, 200, 500, 1000].forEach(delay => {
        setTimeout(() => {
          if (leafletMapInstance.current) leafletMapInstance.current.invalidateSize();
        }, delay);
      });
    }

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    mapStats.forEach(pres => {
      const coords = PRES_COORDINATES[pres.name];
      if (!coords) return;

      const value = viewMode === 'donations' ? pres.realized : pres.distribution.total;
      if (value === 0) return;

      const perf = viewMode === 'donations' 
        ? (pres.objective > 0 ? (pres.realized / pres.objective) * 100 : 0)
        : 100;

      const color = viewMode === 'donations' ? getPerfColor(perf) : '#f59e0b';
      // Bulles plus petites : réduction du multiplicateur et du rayon de base
      const radius = Math.sqrt(value) * 2 + 10;
      const isSelected = selectedPresName === pres.name;

      const circle = (window as any).L.circleMarker(coords, {
        radius: radius,
        fillColor: color,
        color: isSelected ? '#000' : 'white',
        weight: isSelected ? 4 : 2,
        opacity: 1,
        fillOpacity: isSelected ? 0.9 : 0.7,
        className: 'marker-pulse'
      }).addTo(leafletMapInstance.current);

      circle.on('click', () => handleSelectPres(pres.name));

      const label = (window as any).L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="color:white; font-weight:950; font-size:${value > 99 ? '9px' : '10px'}; text-shadow: 0 1px 3px rgba(0,0,0,0.5); text-align:center; width:100%">${value}</div>`,
        iconSize: [30, 20],
        iconAnchor: [15, 10]
      });

      const labelMarker = (window as any).L.marker(coords, { icon: label }).addTo(leafletMapInstance.current);
      labelMarker.on('click', () => handleSelectPres(pres.name));

      const popupContent = `
        <div class="p-2 font-sans min-w-[120px]">
          <p class="font-black text-[8px] uppercase text-slate-400 mb-0.5 tracking-widest">${pres.name}</p>
          <div class="flex items-center gap-2 mb-1">
             <span class="text-base font-black text-slate-800">${value}</span>
             <span class="text-[8px] font-black text-slate-400 uppercase">Poches</span>
          </div>
          ${viewMode === 'donations' ? `
            <div class="pt-1 border-t border-slate-100">
               <p class="text-[8px] font-black text-emerald-600 uppercase">Atteinte: ${perf.toFixed(1)}%</p>
            </div>
          ` : `
            <div class="space-y-1 pt-1 border-t border-slate-100">
               <div class="flex justify-between items-center"><span class="text-[7px] font-black text-slate-500 uppercase">CGR</span> <span class="text-[8px] font-black text-red-500">${pres.distribution.cgr}</span></div>
               <div class="flex justify-between items-center"><span class="text-[7px] font-black text-slate-500 uppercase">PLA.</span> <span class="text-[8px] font-black text-blue-500">${pres.distribution.plasma}</span></div>
            </div>
          `}
        </div>
      `;

      circle.bindTooltip(popupContent, { permanent: false, direction: 'top', className: 'leaflet-bubble-label' });

      markersRef.current.push(circle);
      markersRef.current.push(labelMarker);
    });
  }, [mapStats, viewMode, selectedPresName]);

  useEffect(() => {
    return () => {
      if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
      if (leafletMapInstance.current) {
        leafletMapInstance.current.remove();
        leafletMapInstance.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="bg-[#0f172a] rounded-[4rem] p-10 lg:p-14 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] -mr-40 -mt-40"></div>
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
          <div className="flex items-center gap-10">
            <div className={`w-20 h-20 lg:w-24 lg:h-24 rounded-[2.5rem] flex items-center justify-center shadow-2xl border border-white/10 transition-all duration-500 ${viewMode === 'donations' ? 'bg-emerald-600 shadow-emerald-900/40' : 'bg-orange-600 shadow-orange-900/40'}`}>
              <Globe size={40} />
            </div>
            <div>
              <h2 className="text-4xl lg:text-5xl font-black uppercase tracking-tighter leading-none mb-4">Cartographie Nationale</h2>
              <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md shadow-inner">
                 <button onClick={() => setViewMode('donations')} className={`px-10 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${viewMode === 'donations' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-white/40 hover:text-white'}`}>
                   <Activity size={16}/> Prélèvements
                 </button>
                 <button onClick={() => setViewMode('distribution')} className={`px-10 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${viewMode === 'distribution' ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' : 'text-white/40 hover:text-white'}`}>
                   <Package size={16}/> Distribution
                 </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 text-center backdrop-blur-md min-w-[220px]">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Volume National ({selectedDate})</p>
                <div className="flex items-baseline justify-center gap-3">
                   <p className="text-6xl font-black text-white">
                      {mapStats.reduce((acc, p) => acc + (viewMode === 'donations' ? p.realized : p.distribution.total), 0).toLocaleString()}
                   </p>
                </div>
                <p className="text-[10px] font-bold text-white/30 uppercase mt-2">Poches consolidées</p>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 bg-white rounded-[4rem] shadow-3xl border border-slate-100 p-6 flex flex-col items-center overflow-hidden">
           <div className="w-full aspect-square relative max-w-[700px]">
              <div ref={mapRef} className="w-full h-full border border-slate-100 shadow-inner overflow-hidden rounded-[3rem]"></div>
              
              {/* SÉLECTEUR MINI ET TRANSPARENT */}
              <div className="absolute top-6 right-6 z-[500] flex flex-col gap-2">
                 <div className="bg-white/60 backdrop-blur-md p-3 rounded-[1.5rem] shadow-xl border border-white/40 flex flex-col gap-2 transition-all hover:bg-white/90">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50/50 rounded-lg border border-slate-200/50">
                       <Calendar size={12} className="text-blue-500" />
                       <select value={selYear} onChange={(e) => setSelYear(e.target.value)} className="bg-transparent font-black text-slate-800 text-[9px] outline-none cursor-pointer uppercase">
                          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                       </select>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50/50 rounded-lg border border-slate-200/50">
                       <Layers size={12} className="text-orange-500" />
                       <select value={selMonth} onChange={(e) => setSelMonth(e.target.value)} className="bg-transparent font-black text-slate-800 text-[9px] outline-none cursor-pointer uppercase">
                          {MONTHS_FR.map((m, i) => <option key={i} value={i.toString()}>{m}</option>)}
                       </select>
                    </div>
                    <div className={`flex items-center gap-2 px-4 py-2 border rounded-lg shadow-md transition-all ${viewMode === 'donations' ? 'bg-emerald-600/80 border-emerald-500' : 'bg-orange-600/80 border-orange-500'}`}>
                       <Target size={12} className="text-white/70" />
                       <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent font-black text-white text-[9px] outline-none cursor-pointer uppercase">
                          {availableDates.map(d => <option key={d} value={d} className="text-slate-900">{d}</option>)}
                       </select>
                    </div>
                 </div>
              </div>

              {/* LÉGENDE MINI ET TRANSPARENTE */}
              <div className="absolute bottom-6 left-6 z-[500] bg-white/60 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white/40 transition-all hover:bg-white/90">
                 <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 opacity-70">Statuts</p>
                 <div className="space-y-1.5">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-[8px] font-black text-slate-700 uppercase">Cible OK</span></div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500"></div><span className="text-[8px] font-black text-slate-700 uppercase">Actif</span></div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div><span className="text-[8px] font-black text-slate-700 uppercase">Alerte</span></div>
                 </div>
              </div>
           </div>
        </div>

        <div className="lg:col-span-5 space-y-8">
           <div className="bg-white rounded-[3.5rem] p-10 shadow-warm border border-slate-100 h-full flex flex-col">
              <div className="flex items-center gap-5 mb-10">
                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${viewMode === 'donations' ? 'bg-emerald-900' : 'bg-orange-900'}`}>
                    <Award size={28} />
                 </div>
                 <div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Détail par PRES</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliquez pour localiser sur carte</p>
                 </div>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto pr-2 no-scrollbar">
                 {mapStats.sort((a,b) => (viewMode === 'donations' ? b.realized - a.realized : b.distribution.total - a.distribution.total)).map((pres, idx) => {
                    const val = viewMode === 'donations' ? pres.realized : pres.distribution.total;
                    const perc = viewMode === 'donations' ? (pres.objective > 0 ? (pres.realized / pres.objective) * 100 : 0) : 100;
                    const isSelected = selectedPresName === pres.name;
                    
                    return (
                      <div 
                        key={idx} 
                        onClick={() => handleSelectPres(pres.name)}
                        className={`group p-5 rounded-3xl border transition-all duration-300 cursor-pointer ${isSelected ? 'bg-white border-blue-400 shadow-xl scale-[1.02]' : 'bg-slate-50 border-slate-100 hover:bg-white hover:border-blue-100'}`}
                      >
                         <div className="flex justify-between items-start mb-3">
                            <div>
                               <p className={`text-[11px] font-black uppercase tracking-tight leading-none mb-1 ${isSelected ? 'text-blue-600' : 'text-slate-800'}`}>{pres.name}</p>
                               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Zone Territoriale</p>
                            </div>
                            <div className="text-right">
                               <p className={`text-xl font-black ${viewMode === 'donations' ? 'text-slate-900' : 'text-orange-600'}`}>{val.toLocaleString()}</p>
                            </div>
                         </div>
                         {viewMode === 'donations' && (
                           <div className="space-y-2">
                              <div className="flex justify-between items-center text-[9px] font-black uppercase">
                                 <span className="text-slate-400">Atteinte</span>
                                 <span style={{ color: getPerfColor(perc) }}>{perc.toFixed(1)}%</span>
                              </div>
                              <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                                 <div className="h-full transition-all duration-1000" style={{ width: `${Math.min(perc, 100)}%`, backgroundColor: getPerfColor(perc) }}></div>
                              </div>
                           </div>
                         )}
                         {viewMode === 'distribution' && isSelected && (
                           <div className="grid grid-cols-2 gap-2 mt-4 animate-in slide-in-from-top-2">
                              <div className="p-2 bg-white rounded-xl border border-slate-100 text-center">
                                 <p className="text-[7px] font-black text-slate-300 uppercase mb-0.5">CGR</p>
                                 <p className="text-xs font-black text-red-500">{pres.distribution.cgr}</p>
                              </div>
                              <div className="p-2 bg-white rounded-xl border border-slate-100 text-center">
                                 <p className="text-[7px] font-black text-slate-300 uppercase mb-0.5">Plasma</p>
                                 <p className="text-xs font-black text-blue-500">{pres.distribution.plasma}</p>
                              </div>
                           </div>
                         )}
                      </div>
                    );
                 })}
                 {mapStats.length === 0 && <div className="py-20 text-center opacity-30 italic text-xs uppercase font-black tracking-widest">Aucune donnée</div>}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
