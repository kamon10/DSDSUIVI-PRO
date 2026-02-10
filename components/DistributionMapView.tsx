import React, { useEffect, useMemo, useState, useRef } from 'react';
import { DashboardData, DistributionRecord } from '../types';
import { PRES_COORDINATES, SITES_DATA, COLORS, getSiteObjectives, PRODUCT_COLORS } from '../constants';
import { Activity, Truck, Calendar, MapPin, Target, Layers, PieChart, Info, Award, Globe, Filter, Package } from 'lucide-react';

interface DistributionMapViewProps {
  data: DashboardData;
}

const MONTHS_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const getPerfColor = (p: number) => {
  if (p >= 100) return '#10b981'; // Vert Excellence
  if (p >= 75) return '#f59e0b';  // Orange Attention
  return '#ef4444';               // Rouge Alerte
};

export const DistributionMapView: React.FC<DistributionMapViewProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<'donations' | 'distribution'>('distribution');
  const [selectedDate, setSelectedDate] = useState(data.date);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // --- FILTRES TEMPORELS ---
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    data.dailyHistory.forEach(h => {
        const parts = h.date.split('/');
        if (parts[2]) years.add(parts[2]);
    });
    return Array.from(years).sort().reverse();
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

  // --- CALCUL DES DONNÉES PAR RÉGION (PRES) ---
  const mapStats = useMemo(() => {
    const presMap = new Map<string, any>();
    
    // Initialiser les PRES
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

  // --- INITIALISATION LEAFLET ---
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
    }

    // Nettoyer les anciens marqueurs
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Ajouter les bulles
    mapStats.forEach(pres => {
      const coords = PRES_COORDINATES[pres.name];
      if (!coords) return;

      const value = viewMode === 'donations' ? pres.realized : pres.distribution.total;
      if (value === 0) return;

      const perf = viewMode === 'donations' 
        ? (pres.objective > 0 ? (pres.realized / pres.objective) * 100 : 0)
        : 100;

      const color = viewMode === 'donations' ? getPerfColor(perf) : '#f59e0b';
      const radius = Math.sqrt(value) * 3 + 15;

      const circle = (window as any).L.circleMarker(coords, {
        radius: radius,
        fillColor: color,
        color: 'white',
        weight: 3,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(leafletMapInstance.current);

      const label = (window as any).L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="color:white; font-weight:950; font-size:11px; text-shadow: 0 2px 4px rgba(0,0,0,0.5); text-align:center; width:100%">${value}</div>`,
        iconSize: [40, 20],
        iconAnchor: [20, 10]
      });

      const labelMarker = (window as any).L.marker(coords, { icon: label }).addTo(leafletMapInstance.current);

      const popupContent = `
        <div class="p-3 font-sans min-w-[140px]">
          <p class="font-black text-[9px] uppercase text-slate-400 mb-1 tracking-widest">${pres.name}</p>
          <div class="flex items-center gap-2 mb-3">
             <span class="text-xl font-black text-slate-800">${value}</span>
             <span class="text-[9px] font-black text-slate-400 uppercase">Poches</span>
          </div>
          ${viewMode === 'donations' ? `
            <div class="pt-2 border-t border-slate-100">
               <p class="text-[9px] font-black text-emerald-600 uppercase">Atteinte: ${perf.toFixed(1)}%</p>
            </div>
          ` : `
            <div class="space-y-1.5 pt-2 border-t border-slate-100">
               <div class="flex justify-between items-center"><span class="text-[8px] font-black text-slate-500 uppercase">CGR</span> <span class="text-[9px] font-black text-red-500">${pres.distribution.cgr}</span></div>
               <div class="flex justify-between items-center"><span class="text-[8px] font-black text-slate-500 uppercase">PLASMA</span> <span class="text-[9px] font-black text-blue-500">${pres.distribution.plasma}</span></div>
               <div class="flex justify-between items-center"><span class="text-[8px] font-black text-slate-500 uppercase">PLAQ.</span> <span class="text-[9px] font-black text-orange-500">${pres.distribution.platelets}</span></div>
            </div>
          `}
        </div>
      `;

      circle.bindTooltip(popupContent, { permanent: false, direction: 'top', className: 'leaflet-bubble-label' });

      markersRef.current.push(circle);
      markersRef.current.push(labelMarker);
    });

  }, [mapStats, viewMode]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      
      {/* HEADER AVEC SÉLECTEUR DE MODE PALETTE */}
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
                   <Truck size={16}/> Distribution
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
        
        {/* CARTE CARRÉE FIGÉE */}
        <div className="lg:col-span-7 bg-white rounded-[4rem] shadow-3xl border border-slate-100 p-8 flex flex-col items-center overflow-hidden">
           <div className="w-full aspect-square relative max-w-[700px]">
              <div ref={mapRef} className="w-full h-full border-4 border-slate-50 shadow-inner overflow-hidden rounded-[3rem]"></div>
              
              {/* Overlay Filtres sur la carte */}
              <div className="absolute top-8 right-8 z-[500] flex flex-col gap-3">
                 <div className="bg-white/90 backdrop-blur-md p-4 rounded-[2rem] shadow-2xl border border-slate-100 flex flex-col gap-4">
                    <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                       <Calendar size={14} className="text-blue-500" />
                       <select value={selYear} onChange={(e) => setSelYear(e.target.value)} className="bg-transparent font-black text-slate-800 text-[10px] outline-none cursor-pointer uppercase">
                          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                       </select>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                       <Layers size={14} className="text-orange-500" />
                       <select value={selMonth} onChange={(e) => setSelMonth(e.target.value)} className="bg-transparent font-black text-slate-800 text-[10px] outline-none cursor-pointer uppercase">
                          {MONTHS_FR.map((m, i) => <option key={i} value={i.toString()}>{m}</option>)}
                       </select>
                    </div>
                    <div className={`flex items-center gap-3 px-6 py-3 border rounded-xl shadow-lg transition-all ${viewMode === 'donations' ? 'bg-emerald-600 border-emerald-500 shadow-emerald-100' : 'bg-orange-600 border-orange-500 shadow-orange-100'}`}>
                       <Target size={14} className="text-white/70" />
                       <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent font-black text-white text-[10px] outline-none cursor-pointer uppercase">
                          {availableDates.map(d => <option key={d} value={d}>{d}</option>)}
                       </select>
                    </div>
                 </div>
              </div>

              {/* Légende */}
              <div className="absolute bottom-8 left-8 z-[500] bg-white/90 backdrop-blur-md p-5 rounded-3xl shadow-xl border border-slate-100">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Légende Statuts</p>
                 <div className="space-y-2">
                    <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="text-[10px] font-black text-slate-700 uppercase">Objectif Atteint</span></div>
                    <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-orange-500"></div><span className="text-[10px] font-black text-slate-700 uppercase">Flux Actif</span></div>
                    <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-red-500"></div><span className="text-[10px] font-black text-slate-700 uppercase">Attention</span></div>
                 </div>
              </div>
           </div>
        </div>

        {/* CLASSEMENT LATÉRAL */}
        <div className="lg:col-span-5 space-y-8">
           <div className="bg-white rounded-[3.5rem] p-10 shadow-warm border border-slate-100 h-full flex flex-col">
              <div className="flex items-center gap-5 mb-10">
                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${viewMode === 'donations' ? 'bg-emerald-900' : 'bg-orange-900'}`}>
                    <Award size={28} />
                 </div>
                 <div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Détail par PRES</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Répartition des volumes territoriaux</p>
                 </div>
              </div>

              <div className="space-y-4 flex-1 overflow-y-auto pr-2 no-scrollbar">
                 {mapStats.sort((a,b) => (viewMode === 'donations' ? b.realized - a.realized : b.distribution.total - a.distribution.total)).map((pres, idx) => {
                    const val = viewMode === 'donations' ? pres.realized : pres.distribution.total;
                    const perc = viewMode === 'donations' ? (pres.objective > 0 ? (pres.realized / pres.objective) * 100 : 0) : 100;
                    
                    return (
                      <div key={idx} className="group p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-xl hover:border-blue-100 transition-all duration-300">
                         <div className="flex justify-between items-start mb-4">
                            <div>
                               <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight leading-none mb-1">{pres.name}</p>
                               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Zone Territoriale</p>
                            </div>
                            <div className="text-right">
                               <p className={`text-2xl font-black ${viewMode === 'donations' ? 'text-slate-900' : 'text-orange-600'}`}>{val.toLocaleString()}</p>
                               <p className="text-[8px] font-black text-slate-300 uppercase">Poches</p>
                            </div>
                         </div>
                         {viewMode === 'donations' && (
                           <div className="space-y-2">
                              <div className="flex justify-between items-center text-[10px] font-black uppercase">
                                 <span className="text-slate-400">Atteinte</span>
                                 <span style={{ color: getPerfColor(perc) }}>{perc.toFixed(1)}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                                 <div className="h-full transition-all duration-1000" style={{ width: `${Math.min(perc, 100)}%`, backgroundColor: getPerfColor(perc) }}></div>
                              </div>
                           </div>
                         )}
                         {viewMode === 'distribution' && (
                           <div className="grid grid-cols-3 gap-2 mt-4">
                              <div className="p-2 bg-white rounded-xl border border-slate-100 text-center">
                                 <p className="text-[7px] font-black text-slate-300 uppercase mb-0.5">CGR</p>
                                 <p className="text-xs font-black text-red-500">{pres.distribution.cgr}</p>
                              </div>
                              <div className="p-2 bg-white rounded-xl border border-slate-100 text-center">
                                 <p className="text-[7px] font-black text-slate-300 uppercase mb-0.5">Plasma</p>
                                 <p className="text-xs font-black text-blue-500">{pres.distribution.plasma}</p>
                              </div>
                              <div className="p-2 bg-white rounded-xl border border-slate-100 text-center">
                                 <p className="text-[7px] font-black text-slate-300 uppercase mb-0.5">Plaq.</p>
                                 <p className="text-xs font-black text-orange-500">{pres.distribution.platelets}</p>
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