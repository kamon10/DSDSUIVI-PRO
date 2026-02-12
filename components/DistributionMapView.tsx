
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { DashboardData, User } from '../types';
import { PRES_COORDINATES, SITES_DATA } from '../constants';
import { Globe, Plus, Minus, Maximize2, Activity, Truck } from 'lucide-react';

interface DistributionMapViewProps {
  data: DashboardData;
  user?: User | null;
  sites: any[];
}

// Coordonnées optimisées pour un bloc carré (Focus Terre)
// On resserre légèrement les longitudes pour que l'Est (-2.4) ne soit pas coupé
const CI_BOUNDS: [[number, number], [number, number]] = [
  [4.25, -8.70], // Sud-Ouest
  [10.85, -2.40] // Nord-Est
];

export const DistributionMapView: React.FC<DistributionMapViewProps> = ({ data, user, sites }) => {
  const [viewMode, setViewMode] = useState<'donations' | 'distribution'>('distribution');
  const [selectedDate, setSelectedDate] = useState(data.date);
  const [isDrilledDown, setIsDrilledDown] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Agrégation des données nationales/régionales
  const regionStats = useMemo(() => {
    const presMap = new Map<string, any>();
    
    Object.keys(PRES_COORDINATES).forEach(pres => {
        presMap.set(pres, { 
          name: pres, realized: 0, fixed: 0, mobile: 0,
          distribution: { cgr: 0, plasma: 0, platelets: 0, total: 0 }
        });
    });

    const dayData = data.dailyHistory.find(h => h.date === selectedDate);
    const dayDist = data.distributions?.records.filter(r => r.date === selectedDate) || [];

    dayData?.sites.forEach(site => {
      const region = site.region || "AUTRES";
      if (presMap.has(region)) {
        const stats = presMap.get(region);
        stats.realized += site.total;
        stats.fixed += site.fixe;
        stats.mobile += site.mobile;
      }
    });

    dayDist.forEach(r => {
      const region = r.region || "AUTRES";
      if (presMap.has(region)) {
        const stats = presMap.get(region);
        stats.distribution.total += r.quantite;
        const prod = r.typeProduit.toUpperCase();
        if (prod.includes("CGR")) stats.distribution.cgr += r.quantite;
        else if (prod.includes("PLASMA")) stats.distribution.plasma += r.quantite;
        else if (prod.includes("PLAQUETTE") || prod.includes("PLATELET")) stats.distribution.platelets += r.quantite;
      }
    });

    return Array.from(presMap.values()).filter(p => PRES_COORDINATES[p.name]);
  }, [data, selectedDate]);

  // Agrégation par site pour le drill-down
  const siteStats = useMemo(() => {
    if (!selectedRegion) return [];
    
    const dayData = data.dailyHistory.find(h => h.date === selectedDate);
    const dayDist = data.distributions?.records.filter(r => r.date === selectedDate) || [];
    
    return SITES_DATA.filter(s => s.region === selectedRegion).map(siteBase => {
      const dSite = dayData?.sites.find(s => s.name.toUpperCase() === siteBase.name.toUpperCase());
      const distSite = dayDist.filter(r => r.site.toUpperCase() === siteBase.name.toUpperCase());
      
      const distribution = {
        total: distSite.reduce((acc, r) => acc + r.quantite, 0),
        cgr: distSite.filter(r => r.typeProduit.toUpperCase().includes("CGR")).reduce((acc, r) => acc + r.quantite, 0),
        plasma: distSite.filter(r => r.typeProduit.toUpperCase().includes("PLASMA")).reduce((acc, r) => acc + r.quantite, 0),
        platelets: distSite.filter(r => r.typeProduit.toUpperCase().includes("PLAQUETTE") || r.typeProduit.toUpperCase().includes("PLATELET")).reduce((acc, r) => acc + r.quantite, 0)
      };

      return {
        name: siteBase.name,
        coords: siteBase.coords,
        realized: dSite?.total || 0,
        fixed: dSite?.fixe || 0,
        mobile: dSite?.mobile || 0,
        distribution
      };
    });
  }, [selectedRegion, data, selectedDate]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!leafletMapInstance.current) {
      leafletMapInstance.current = (window as any).L.map(mapRef.current, {
        zoomControl: false, 
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        boxZoom: true
      });
      
      (window as any).L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(leafletMapInstance.current);
      
      // Ajustement initial pour remplir le carré (padding à 0 pour zoomer au max)
      leafletMapInstance.current.fitBounds(CI_BOUNDS, { padding: [0, 0] });

      leafletMapInstance.current.on('zoomend', () => {
        const curZoom = leafletMapInstance.current.getZoom();
        // Seuil de retour à la vue nationale si on dézoome
        if (curZoom <= 6.8) {
          setIsDrilledDown(false);
          setSelectedRegion(null);
        }
      });
    }

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const activeData = isDrilledDown ? siteStats : regionStats;

    activeData.forEach((item: any) => {
      const coords = isDrilledDown ? item.coords : PRES_COORDINATES[item.name];
      if (!coords) return;

      const val = viewMode === 'donations' ? item.realized : item.distribution.total;
      
      if (val === 0 && !isDrilledDown) return;

      const mainColor = viewMode === 'donations' ? '#10b981' : '#f59e0b';
      const label = isDrilledDown ? item.name.replace('CDTS DE ', '').replace('CRTS DE ', '').replace('SP ', '').substring(0, 10) + '.' : item.name.replace('PRES ', '');

      const icon = (window as any).L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div class="flex flex-col items-center">
            <div class="relative group cursor-pointer scale-90 lg:scale-100">
              <div class="w-14 h-14 rounded-full flex flex-col items-center justify-center text-white font-black shadow-2xl transition-all hover:scale-110 border-2 border-white" style="background-color: ${mainColor}; box-shadow: 0 8px 20px -4px ${mainColor}80">
                <span class="text-[13px] leading-none">${val}</span>
                <span class="text-[5px] uppercase tracking-tighter opacity-70">${viewMode === 'donations' ? 'Poches' : 'Sorties'}</span>
                
                ${viewMode === 'distribution' && val > 0 ? `
                  <div class="absolute -top-3 -right-3 flex flex-col gap-0.5 pointer-events-none z-50">
                    <div class="bg-red-600 text-[6px] px-1.5 py-0.5 rounded-full border border-white font-black shadow-sm">CGR:${item.distribution.cgr}</div>
                    <div class="bg-blue-600 text-[6px] px-1.5 py-0.5 rounded-full border border-white font-black shadow-sm">P:${item.distribution.plasma}</div>
                    <div class="bg-purple-600 text-[6px] px-1.5 py-0.5 rounded-full border border-white font-black shadow-sm">PLT:${item.distribution.platelets}</div>
                  </div>
                ` : ''}

                ${viewMode === 'donations' && val > 0 ? `
                  <div class="absolute -top-3 -right-3 flex flex-col gap-0.5 pointer-events-none z-50">
                    <div class="bg-emerald-700 text-[6px] px-1.5 py-0.5 rounded-full border border-white font-black shadow-sm">F:${item.fixed}</div>
                    <div class="bg-orange-500 text-[6px] px-1.5 py-0.5 rounded-full border border-white font-black shadow-sm">M:${item.mobile}</div>
                  </div>
                ` : ''}
              </div>
              <div class="mt-1 bg-slate-900/90 backdrop-blur-md px-2 py-0.5 rounded-full text-[7px] font-black text-white uppercase text-center truncate w-20 border border-white/10">
                ${label}
              </div>
            </div>
          </div>
        `,
        iconSize: [56, 70],
        iconAnchor: [28, 35]
      });

      const marker = (window as any).L.marker(coords, { icon }).addTo(leafletMapInstance.current);
      
      if (!isDrilledDown) {
        marker.on('click', () => {
          const regionSites = SITES_DATA.filter(s => s.region === item.name);
          const points = regionSites.map(s => s.coords);
          
          if (points.length > 0) {
            const bounds = (window as any).L.latLngBounds(points);
            // Zoom centré sur la zone du PRES avec marge de sécurité
            leafletMapInstance.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 11, animate: true });
          } else {
            leafletMapInstance.current.setView(coords, 10, { animate: true });
          }
          
          setSelectedRegion(item.name);
          setIsDrilledDown(true);
        });
      }
      
      markersRef.current.push(marker);
    });

  }, [regionStats, siteStats, viewMode, isDrilledDown, selectedRegion]);

  const handleZoom = (delta: number) => {
    if (leafletMapInstance.current) {
      leafletMapInstance.current.setZoom(leafletMapInstance.current.getZoom() + delta);
    }
  };

  const handleResetView = () => {
    if (leafletMapInstance.current) {
      // Retour au cadrage optimal CI
      leafletMapInstance.current.fitBounds(CI_BOUNDS, { padding: [0, 0], animate: true });
      setIsDrilledDown(false);
      setSelectedRegion(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-24">
      <div className="bg-[#0f172a] rounded-[3rem] p-8 lg:p-10 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px] -mr-32 -mt-32"></div>
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className={`w-16 h-16 bg-emerald-600 rounded-[2rem] flex items-center justify-center shadow-2xl border border-white/10`}><Globe size={32} /></div>
            <div>
              <h2 className="text-3xl lg:text-4xl font-black uppercase tracking-tighter leading-none mb-2">Cartographie Dynamique</h2>
              <p className="text-emerald-400 font-black uppercase tracking-[0.4em] text-[9px]">Côte d'Ivoire • Pilotage Spatial</p>
            </div>
          </div>
          <div className="bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-xl flex gap-1">
             <button onClick={() => setViewMode('donations')} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'donations' ? 'bg-emerald-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}>
               <Activity size={14}/> Collecte
             </button>
             <button onClick={() => setViewMode('distribution')} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'distribution' ? 'bg-orange-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}>
               <Truck size={14}/> Distribution
             </button>
          </div>
        </div>
      </div>

      {/* Bloc Carte Carré avec remplissage maximum */}
      <div className="max-w-4xl mx-auto w-full aspect-square bg-slate-200 rounded-[3rem] shadow-3xl p-4 relative overflow-hidden border-2 border-white">
         {/* Boutons de contrôle personnalisés */}
         <div className="absolute top-8 right-8 z-[1000] flex flex-col gap-2">
            <button onClick={() => handleZoom(1)} className="w-12 h-12 bg-white rounded-xl shadow-2xl flex items-center justify-center text-slate-800 hover:bg-slate-50 border border-slate-100 transition-all active:scale-90"><Plus size={20} strokeWidth={3} /></button>
            <button onClick={() => handleZoom(-1)} className="w-12 h-12 bg-white rounded-xl shadow-2xl flex items-center justify-center text-slate-800 hover:bg-slate-50 border border-slate-100 transition-all active:scale-90"><Minus size={20} strokeWidth={3} /></button>
            <button onClick={handleResetView} className="w-12 h-12 bg-slate-900 rounded-xl shadow-2xl flex items-center justify-center text-white hover:bg-black border border-slate-800 transition-all active:scale-90 mt-2" title="Vue Nationale"><Maximize2 size={20} /></button>
         </div>

         {/* Marqueur de focus contextuel discret */}
         {isDrilledDown && (
           <div className="absolute bottom-8 left-8 z-[1000] bg-slate-900/90 backdrop-blur-xl px-6 py-3 rounded-full shadow-2xl border border-white/20 animate-in slide-in-from-left-4">
              <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-3">
                 <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                 Focus : {selectedRegion?.replace('PRES ', '')}
              </p>
           </div>
         )}

         {/* Conteneur Leaflet occupant 100% de l'espace interne */}
         <div ref={mapRef} className="w-full h-full rounded-[2.5rem] z-0 bg-white shadow-inner"></div>
      </div>
    </div>
  );
};
