
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Command, X, ArrowRight, Activity, LayoutDashboard, Map, PlusSquare, Package, UserCheck, History, BarChart3, Settings } from 'lucide-react';
import { AppTab, SiteRecord } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: AppTab) => void;
  sites: SiteRecord[];
  onSiteSelect: (siteName: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate, sites, onSiteSelect }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // This is handled by parent but just in case
      }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const navigationItems = [
    { id: 'pulse', label: 'Pulse - Vitalité Nationale', icon: <Activity size={16} /> },
    { id: 'cockpit', label: 'Cockpit - Dashboard Global', icon: <LayoutDashboard size={16} /> },
    { id: 'map', label: 'Carte - Distribution Géographique', icon: <Map size={16} /> },
    { id: 'entry', label: 'Saisie - Nouveau Rapport', icon: <PlusSquare size={16} /> },
    { id: 'stock', label: 'Stock - Inventaire National', icon: <Package size={16} /> },
    { id: 'site-focus', label: 'Focus - Analyse par Site', icon: <UserCheck size={16} /> },
    { id: 'history', label: 'Historique - Rapports Passés', icon: <History size={16} /> },
    { id: 'performance', label: 'Performance - Classement', icon: <BarChart3 size={16} /> },
  ];

  const filteredNav = navigationItems.filter(item => 
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  const filteredSites = sites.filter(site => 
    site.name.toLowerCase().includes(query.toLowerCase()) || 
    site.region?.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[500] flex items-start justify-center pt-[15vh] px-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
        >
          <div className="flex items-center px-6 py-4 border-b border-slate-100">
            <Search className="text-slate-400 mr-4" size={20} />
            <input 
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une vue, un site, une région..."
              className="flex-1 bg-transparent border-none outline-none text-slate-800 font-bold text-base placeholder:text-slate-300"
            />
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest">ESC</span>
              <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar">
            {query === '' && (
              <div className="mb-6 px-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Actions Rapides</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => onNavigate('entry')} className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-emerald-50 rounded-2xl transition-colors group">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <PlusSquare size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-[11px] font-black text-slate-800 uppercase">Nouvelle Saisie</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Rapport de collecte</p>
                    </div>
                  </button>
                  <button onClick={() => onNavigate('stock')} className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-blue-50 rounded-2xl transition-colors group">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Package size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-[11px] font-black text-slate-800 uppercase">État des Stocks</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Inventaire national</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            <div className="mb-6">
              <p className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Navigation</p>
              <div className="space-y-1">
                {filteredNav.map(item => (
                  <button 
                    key={item.id}
                    onClick={() => { onNavigate(item.id as AppTab); onClose(); }}
                    className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-2xl transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-slate-400 group-hover:text-slate-900 transition-colors">
                        {item.icon}
                      </div>
                      <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900">{item.label}</span>
                    </div>
                    <ArrowRight size={14} className="text-slate-200 group-hover:text-slate-900 transition-colors" />
                  </button>
                ))}
              </div>
            </div>

            {filteredSites.length > 0 && (
              <div>
                <p className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Sites & Structures</p>
                <div className="space-y-1">
                  {filteredSites.map(site => (
                    <button 
                      key={site.name}
                      onClick={() => { onSiteSelect(site.name); onClose(); }}
                      className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-2xl transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                          <Map size={14} />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-700 group-hover:text-slate-900">{site.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{site.region}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-900">{site.totalMois} poches</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Ce mois</p>
                        </div>
                        <ArrowRight size={14} className="text-slate-200 group-hover:text-slate-900 transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {query !== '' && filteredNav.length === 0 && filteredSites.length === 0 && (
              <div className="py-12 text-center">
                <Command className="mx-auto text-slate-200 mb-4" size={40} />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aucun résultat pour "{query}"</p>
              </div>
            )}
          </div>

          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-black text-slate-500 shadow-sm">↑↓</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase">Naviguer</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-black text-slate-500 shadow-sm">ENTER</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase">Sélectionner</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Command size={12} className="text-slate-300" />
              <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">HEMO-COCKPIT v2.5</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
