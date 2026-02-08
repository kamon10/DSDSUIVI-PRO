import React, { useState, useMemo } from 'react';
import { SITES_DATA } from '../constants';
import { User, Phone, Mail, MessageSquare, Search, Building2, MapPin, Globe, ChevronRight } from 'lucide-react';

export const ContactsView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const groupedContacts = useMemo(() => {
    const map = new Map<string, any[]>();
    
    SITES_DATA.forEach(site => {
      const matchSearch = 
        site.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        site.manager.toLowerCase().includes(searchTerm.toLowerCase()) ||
        site.region.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return;

      const region = site.region || "DIRECTION NATIONALE";
      if (!map.has(region)) map.set(region, []);
      map.get(region)!.push(site);
    });

    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [searchTerm]);

  const handleWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\s/g, '');
    const msg = `Bonjour ${name}, je vous contacte via l'application DSDSUIVI concernant votre site de prélèvement.`;
    window.open(`https://wa.me/225${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      {/* HEADER SECTION */}
      <div className="bg-[#0f172a] rounded-[3rem] p-10 lg:p-14 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-8">
            <div className="w-16 h-16 lg:w-20 lg:h-20 bg-blue-600 rounded-[2.5rem] flex items-center justify-center shadow-xl border border-white/10">
              <Globe size={36} className="text-white" />
            </div>
            <div>
              <h2 className="text-3xl lg:text-4xl font-black uppercase tracking-tighter leading-none mb-3">Annuaire des Responsables</h2>
              <p className="text-blue-300/40 font-black uppercase tracking-[0.4em] text-[10px]">Contact direct des structures déconcentrées</p>
            </div>
          </div>

          <div className="relative w-full lg:w-96 group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Rechercher un site, un nom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:ring-2 ring-blue-500 placeholder:text-white/20 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* LISTE DES CONTACTS PAR RÉGION */}
      <div className="space-y-12">
        {groupedContacts.length > 0 ? groupedContacts.map(([region, sites]) => (
          <div key={region} className="space-y-6">
            <div className="flex items-center gap-4 px-6">
               <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg">
                  <MapPin size={20} />
               </div>
               <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">{region}</h3>
               <div className="h-px flex-1 bg-slate-200"></div>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{sites.length} CONTACTS</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sites.map((site, idx) => (
                <div key={idx} className="bg-white rounded-[2.5rem] p-8 shadow-warm border border-slate-100 group hover:border-blue-200 transition-all hover:shadow-xl">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shadow-inner">
                      <Building2 size={24} />
                    </div>
                    <div className="text-right">
                       <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Code Site</p>
                       <p className="text-xs font-black text-slate-900">{site.code}</p>
                    </div>
                  </div>

                  <h4 className="text-sm font-black text-slate-800 uppercase leading-tight mb-1 group-hover:text-blue-600 transition-colors">{site.name}</h4>
                  <p className="text-xs font-bold text-slate-500 mb-8 flex items-center gap-2 italic">
                    <User size={14} className="text-slate-300" /> {site.manager}
                  </p>

                  <div className="space-y-3">
                    <a href={`tel:${site.phone.replace(/\s/g, '')}`} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-emerald-50 hover:border-emerald-100 transition-all group/btn">
                      <div className="flex items-center gap-3">
                        <Phone size={16} className="text-slate-400 group-hover/btn:text-emerald-500" />
                        <span className="text-[11px] font-black text-slate-700 uppercase">{site.phone}</span>
                      </div>
                      <ChevronRight size={14} className="text-slate-300" />
                    </a>

                    <a href={`mailto:${site.email}`} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-blue-50 hover:border-blue-100 transition-all group/btn">
                      <div className="flex items-center gap-3">
                        <Mail size={16} className="text-slate-400 group-hover/btn:text-blue-500" />
                        <span className="text-[11px] font-black text-slate-700 uppercase truncate max-w-[150px]">{site.email}</span>
                      </div>
                      <ChevronRight size={14} className="text-slate-300" />
                    </a>

                    <button 
                      onClick={() => handleWhatsApp(site.phone, site.manager)}
                      className="w-full flex items-center justify-center gap-3 py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-600 active:scale-95 transition-all"
                    >
                      <MessageSquare size={16} /> WhatsApp Direct
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )) : (
          <div className="py-40 text-center flex flex-col items-center gap-6 opacity-30">
            <Search size={64} />
            <p className="text-sm font-black uppercase tracking-widest">Aucun responsable trouvé pour cette recherche</p>
          </div>
        )}
      </div>
    </div>
  );
};