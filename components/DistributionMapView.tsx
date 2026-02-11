import React, { useEffect, useMemo, useState, useRef } from 'react';
import { DashboardData, User } from '../types';
// Fixed error: Removed non-existent import getPerfColor
import { PRES_COORDINATES } from '../constants';
import { Activity, Truck, Calendar, MapPin, Globe, Layers, Target } from 'lucide-react';

interface DistributionMapViewProps {
  data: DashboardData;
  user?: User | null;
  sites: any[];
}

const MONTHS_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

export const DistributionMapView: React.FC<DistributionMapViewProps> = ({ data, user, sites }) => {
  const [viewMode, setViewMode] = useState<'donations' | 'distribution'>('distribution');
  const [selectedDate, setSelectedDate] = useState(data.date);
  const [selectedPresName, setSelectedPresName] = useState<string | null>(null);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

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

  const mapStats = useMemo(() => {
    const presMap = new Map<string, any>();
    
    Object.keys(PRES_COORDINATES).forEach(pres => {
        presMap.set(pres, { 
          name: pres, realized: 0, objective: 0,
          distribution: { cgr: 0, plasma: 0, platelets: 0, total: 0 }
        });
    });

    const dayData = data.dailyHistory.find(h => h.date === selectedDate);
    const dayDist = data.distributions?.records.filter(r => r.date === selectedDate) || [];

    if (viewMode === 'donations') {
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
      dayDist.forEach(r => {
        const region = r.region || "AUTRES";
        if (presMap.has(region)) {
          const stats = presMap.get(region);
          stats.distribution.total += r.quantite;
          const prod = r.typeProduit.toUpperCase();
          if (prod.includes("CGR")) stats.distribution.cgr += r.quantite;
          else if (prod.includes("PLASMA")) stats.distribution.plasma += r.quantite;
          else stats.distribution.platelets += r.quantite;
        }
      });
    }

    let results = Array.from(presMap.values()).filter(p => PRES_COORDINATES[p.name]);
    if (user?.role === 'PRES') results = results.filter(p => p.name.toUpperCase() === user.region?.toUpperCase());
    if (user?.role === 'AGENT') {
        const site = sites.find(s => s.name.toUpperCase() === user.site.toUpperCase());
        results = results.filter(p => p.name.toUpperCase() === site?.region?.toUpperCase());
    }
    return results;
  }, [data, selectedDate, viewMode, user, sites]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!leafletMapInstance.current) {
      leafletMapInstance.current = (window as any).L.map(mapRef.current, {
        center: [7.539989, -5.547080],
        zoom: 7,
        zoomControl: false, attributionControl: false
      });
      (window as any).L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(leafletMapInstance.current);
    }

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    mapStats.forEach(pres => {
      const coords = PRES_COORDINATES[pres.name];
      const value = viewMode === 'donations' ? pres.realized : pres.distribution.total;
      if (value === 0) return;
      const color = viewMode === 'donations' ? '#10b981' : '#f59e0b';
      const circle = (window as any).L.circleMarker(coords, { radius: Math.sqrt(value) * 2 + 10, fillColor: color, color: 'white', weight: 2, fillOpacity: 0.7 }).addTo(leafletMapInstance.current);
      markersRef.current.push(circle);
    });

    if (user?.role === 'PRES' || user?.role === 'AGENT') {
        const coords = PRES_COORDINATES[user.region || mapStats[0]?.name];
        if (coords) leafletMapInstance.current.setView(coords, 9);
    }
  }, [mapStats, viewMode, user]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="bg-[#0f172a] rounded-[4rem] p-10 lg:p-14 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
          <div className="flex items-center gap-10">
            <div className={`w-20 h-20 bg-emerald-600 rounded-2xl flex items-center justify-center`}><Globe size={40} /></div>
            <div>
              <h2 className="text-4xl font-black uppercase tracking-tighter">Cartographie {user?.role === 'PRES' ? user.region : 'Nationale'}</h2>
              <div className="flex bg-white/5 p-1.5 rounded-2xl mt-4">
                 <button onClick={() => setViewMode('donations')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase ${viewMode === 'donations' ? 'bg-emerald-600' : 'text-white/40'}`}>Prélèvements</button>
                 <button onClick={() => setViewMode('distribution')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase ${viewMode === 'distribution' ? 'bg-orange-600' : 'text-white/40'}`}>Distribution</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-[4rem] shadow-3xl p-6 h-[600px] overflow-hidden">
         <div ref={mapRef} className="w-full h-full rounded-[3rem]"></div>
      </div>
    </div>
  );
};