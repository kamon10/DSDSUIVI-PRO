
import React, { useMemo, useState } from 'react';
import { SITES_DATA, getSiteObjectives, COLORS } from '../constants';
import { Target, Search, Building2, MapPin, ChevronRight, Zap, Calendar } from 'lucide-react';

const REGION_COLORS: Record<string, string> = {
  "PRES ABIDJAN": "#e2efda", 
  "PRES BELIER": "#fff2cc",  
  "PRES GBEKE": "#d9e1f2",   
  "PRES PORO": "#daeef3",    
  "PRES INDENIE DJUABLIN": "#e7e6e6", 
  "PRES GONTOUGO": "#ebf1de", 
  "PRES HAUT SASSANDRA": "#ffffcc", 
  "PRES SAN-PEDRO": "#d8e4bc", 
  "PRES TONPKI": "#fbe5d6",    
  "PRES KABADOUGOU": "#fee5e5"
};

export const SiteObjectivesView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const groupedObjectives = useMemo(() => {
    const map = new Map<string, any[]>();
    
    SITES_DATA.forEach(site => {
      if (searchTerm && !site.name.toLowerCase().includes(searchTerm.toLowerCase()) && !site.code.includes(searchTerm)) {
        return;
      }
      
      const region = site.region || "DIRECTION NATIONALE";
      if (!map.has(region)) map.set(region, []);
      
      const objs = getSiteObjectives(site.name);
      map.get(region)!.push({
        ...site,
        ...objs
      });
    });

    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [searchTerm]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      
      {/* HEADER SECTION */}
      <div className="bg-[#0f172a] rounded-[3rem] p-10 lg:p-14 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-8">
            <div className="w-16 h-16 lg:w-20 lg:h-20 bg-red-600 rounded-3xl flex items-center justify-center shadow-xl border border-white/10">
              <Target size={36} className="text-white" />
            </div>
            <div>
              <h2 className="text-3xl lg:text-4xl font-black uppercase tracking-tighter leading-none mb-3">Référentiel Objectifs</h2>
              <p className="text-red-300/40 font-black uppercase tracking-[0.4em] text-[9px]">Cibles mensuelles et quotidiennes par site</p>
            </div>
          </div>

          <div className="relative w-full lg:w-96 group">
            <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Rechercher un site ou un code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:ring-2 ring-red-500 placeholder:text-white/20 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* GRID DE RÉGIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {groupedObjectives.map(([region, sites]) => (
          <div key={region} className="bg-white rounded-[3rem] shadow-warm border border-slate-100 overflow-hidden group hover:shadow-2xl transition-all duration-500">
            <div className="px-10 py-8 flex justify-between items-center border-b border-slate-50" style={{ backgroundColor: REGION_COLORS[region] || '#f8fafc' }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/50 backdrop-blur-md rounded-xl flex items-center justify-center text-slate-700 shadow-sm border border-white/50">
                  <MapPin size={20} />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900">{region}</h3>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{sites.length} SITES</span>
            </div>

            <div className="p-4 lg:p-8 space-y-4">
              {sites.map((site, idx) => (
                <div key={idx} className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 hover:bg-white hover:shadow-lg transition-all group/site">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover/site:text-red-600 transition-colors shadow-sm">
                        <Building2 size={18} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{site.code}</p>
                        <h4 className="text-sm font-black text-slate-800 uppercase leading-none">{site.name}</h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <div className="flex-1 md:w-32 bg-white rounded-xl p-3 border border-slate-100 text-center shadow-sm">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                          <Zap size={10} className="text-orange-500" />
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Cible Jour</p>
                        </div>
                        <p className="text-lg font-black text-slate-900 leading-none">
                          {site.daily} <span className="text-[9px] font-black uppercase text-slate-400 ml-1">Poches</span>
                        </p>
                      </div>
                      
                      <div className="flex-1 md:w-32 bg-slate-900 rounded-xl p-3 text-center shadow-xl">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                          <Calendar size={10} className="text-red-400" />
                          <p className="text-[8px] font-black text-white/30 uppercase tracking-widest leading-none">Cible Mois</p>
                        </div>
                        <p className="text-lg font-black text-white leading-none">
                          {site.monthly.toLocaleString()} <span className="text-[9px] font-black uppercase text-white/40 ml-1">Poches</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {groupedObjectives.length === 0 && (
          <div className="col-span-full py-40 flex flex-col items-center justify-center gap-6">
             <Target size={64} className="text-slate-200" />
             <p className="text-xs font-black text-slate-300 uppercase tracking-[0.3em]">Aucun site ne correspond à votre recherche</p>
             <button onClick={() => setSearchTerm("")} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Réinitialiser</button>
          </div>
        )}
      </div>
    </div>
  );
};
