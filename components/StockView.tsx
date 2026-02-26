
import React, { useState, useMemo } from 'react';
import { DashboardData, User, StockRecord } from '../types.ts';
import { Package, Search, Filter, Database, TrendingUp, AlertTriangle, ChevronDown, ChevronUp, ChevronRight, List, LayoutGrid, HeartPulse } from 'lucide-react';
import { PRODUCT_COLORS, GROUP_COLORS } from '../constants.tsx';

interface StockViewProps {
  data: DashboardData;
  user: User | null;
  lastSync?: Date | null;
  onSyncRequest?: () => void;
}

type GroupedStock = Record<string, { 
  total: number, 
  sites: Record<string, { 
    total: number, 
    products: Record<string, {
      total: number,
      records: StockRecord[]
    }>
  }> 
}>;

const SANG_GROUPS = ["A+", "A-", "AB+", "AB-", "B+", "B-", "O+", "O-"];

export const StockView: React.FC<StockViewProps> = ({ data, user, lastSync, onSyncRequest }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [filterPres, setFilterPres] = useState('TOUS');
  const [filterProduct, setFilterProduct] = useState('TOUS');
  const [filterGroup, setFilterGroup] = useState('TOUS');
  const [sortConfig, setSortConfig] = useState<{ key: keyof StockRecord; direction: 'asc' | 'desc' } | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
  const [expandedPres, setExpandedPres] = useState<Record<string, boolean>>({});

  const handleSync = () => {
    if (onSyncRequest) {
      setIsSyncing(true);
      onSyncRequest();
      setTimeout(() => setIsSyncing(false), 2000);
    }
  };

  const stock = data.stock || [];

  const presList = useMemo(() => ['TOUS', ...Array.from(new Set(stock.map(s => s.pres))).sort()], [stock]);
  const productList = useMemo(() => ['TOUS', ...Array.from(new Set(stock.map(s => s.typeProduit))).sort()], [stock]);
  const groupList = useMemo(() => ['TOUS', ...Array.from(new Set(stock.map(s => s.groupeSanguin))).sort()], [stock]);

  const filteredStock = useMemo(() => {
    const filtered = [...stock].filter(item => {
      const matchesSearch = 
        item.site.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.pres.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPres = filterPres === 'TOUS' || item.pres === filterPres;
      const matchesProduct = filterProduct === 'TOUS' || item.typeProduit === filterProduct;
      const matchesGroup = filterGroup === 'TOUS' || item.groupeSanguin === filterGroup;
      
      return matchesSearch && matchesPres && matchesProduct && matchesGroup;
    });

    if (sortConfig) {
      filtered.sort((a, b) => {
        const { key, direction } = sortConfig;
        if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
        if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [stock, searchTerm, filterPres, filterProduct, filterGroup, sortConfig]);

  const groupedStock = useMemo((): GroupedStock => {
    const groups: GroupedStock = {};

    filteredStock.forEach(item => {
      if (!groups[item.pres]) groups[item.pres] = { total: 0, sites: {} };
      if (!groups[item.pres].sites[item.site]) groups[item.pres].sites[item.site] = { total: 0, products: {} };
      if (!groups[item.pres].sites[item.site].products[item.typeProduit]) {
        groups[item.pres].sites[item.site].products[item.typeProduit] = { total: 0, records: [] };
      }
      
      groups[item.pres].total += item.quantite;
      groups[item.pres].sites[item.site].total += item.quantite;
      groups[item.pres].sites[item.site].products[item.typeProduit].total += item.quantite;
      groups[item.pres].sites[item.site].products[item.typeProduit].records.push(item);
    });

    // Sort PRES keys
    return Object.keys(groups).sort().reduce((acc, key) => {
      acc[key] = groups[key];
      return acc;
    }, {} as GroupedStock);
  }, [filteredStock]);

  const paginatedStock = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStock.slice(start, start + itemsPerPage);
  }, [filteredStock, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredStock.length / itemsPerPage);

  const stats = useMemo(() => {
    const total = filteredStock.reduce((acc, s) => acc + s.quantite, 0);
    const criticalCount = filteredStock.filter(s => s.quantite <= 5).length;
    const criticalVolume = filteredStock.filter(s => s.quantite <= 5).reduce((acc, s) => acc + s.quantite, 0);
    
    const byProduct = filteredStock.reduce((acc, s) => {
      acc[s.typeProduit] = (acc[s.typeProduit] || 0) + s.quantite;
      return acc;
    }, {} as Record<string, number>);

    const byPres = filteredStock.reduce((acc, s) => {
      acc[s.pres] = (acc[s.pres] || 0) + s.quantite;
      return acc;
    }, {} as Record<string, number>);

    const byGroup = filteredStock.reduce((acc, s) => {
      acc[s.groupeSanguin] = (acc[s.groupeSanguin] || 0) + s.quantite;
      return acc;
    }, {} as Record<string, number>);

    const totalCGR = (Object.entries(byProduct) as [string, number][]).reduce((acc, [prod, val]) => {
      if (prod.toUpperCase().includes('CGR')) return acc + val;
      return acc;
    }, 0);

    const topRegions = (Object.entries(byPres) as [string, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    return { total, criticalCount, criticalVolume, byProduct, byPres, byGroup, topRegions, totalCGR };
  }, [filteredStock]);

  const handleSort = (key: keyof StockRecord) => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(1);
  };

  const togglePres = (pres: string) => {
    setExpandedPres(prev => ({ ...prev, [pres]: !prev[pres] }));
  };

  return (
    <div className="space-y-6">
      {/* Header Professionnel */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900 p-8 rounded-[3rem] shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-emerald-500/10 rounded-full -ml-10 -mb-10 blur-2xl"></div>
        
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2rem] flex items-center justify-center shadow-inner">
            <Package className="text-white" size={36} />
          </div>
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter text-white leading-none">Gestion des Stocks</h2>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Inventaire National • Temps Réel</p>
              {lastSync && (
                <span className="text-[8px] font-black uppercase tracking-widest text-white/40 border-l border-white/10 pl-3">
                  MàJ: {lastSync.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-4">
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className={`p-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-white transition-all ${isSyncing ? 'animate-spin opacity-50' : ''}`}
          >
            <TrendingUp size={18} />
          </button>
          <div className="flex bg-white/5 backdrop-blur-md p-1.5 rounded-2xl border border-white/10">
            <button 
              onClick={() => setViewMode('grouped')}
              className={`px-5 py-2.5 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase transition-all ${viewMode === 'grouped' ? 'bg-white text-slate-900 shadow-lg' : 'text-white/60 hover:text-white'}`}
            >
              <LayoutGrid size={14} />
              Vue Groupée
            </button>
            <button 
              onClick={() => setViewMode('flat')}
              className={`px-5 py-2.5 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase transition-all ${viewMode === 'flat' ? 'bg-white text-slate-900 shadow-lg' : 'text-white/60 hover:text-white'}`}
            >
              <List size={14} />
              Vue Liste
            </button>
          </div>
        </div>
      </div>

      {/* Synthèse Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* KPI Total */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Database size={80} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Volume Total</span>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black text-slate-900 tracking-tighter">{stats.total.toLocaleString()}</span>
            <span className="text-xs font-bold text-slate-400 uppercase">Poches</span>
          </div>
          <div className="mt-6 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-slate-900 rounded-full" style={{ width: '100%' }}></div>
            </div>
          </div>
        </div>

        {/* KPI TOTAL CGR */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <HeartPulse size={80} className="text-rose-500" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 block mb-2">Total CGR</span>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black text-rose-600 tracking-tighter">{stats.totalCGR.toLocaleString()}</span>
            <span className="text-xs font-bold text-rose-400 uppercase">Poches</span>
          </div>
          <div className="mt-6 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-rose-50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-rose-500 rounded-full" 
                style={{ width: `${stats.total > 0 ? (stats.totalCGR / stats.total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* KPI Santé du Stock */}
        <div className={`p-8 rounded-[2.5rem] border shadow-xl relative overflow-hidden group transition-all ${stats.criticalCount > 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <AlertTriangle size={80} className={stats.criticalCount > 0 ? 'text-rose-500' : 'text-emerald-500'} />
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${stats.criticalCount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>Alertes Critiques</span>
          <div className="flex items-baseline gap-2">
            <span className={`text-5xl font-black tracking-tighter ${stats.criticalCount > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{stats.criticalCount}</span>
            <span className={`text-xs font-bold uppercase ${stats.criticalCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>Lignes</span>
          </div>
          <p className={`mt-4 text-[10px] font-bold uppercase tracking-wide ${stats.criticalCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {stats.criticalCount > 0 ? `${stats.criticalVolume} poches à risque immédiat` : 'Tous les niveaux sont optimaux'}
          </p>
        </div>

        {/* Mix Produit */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl lg:col-span-1">
          <div className="flex items-center justify-between mb-6">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mix Produit</span>
            <TrendingUp size={16} className="text-slate-300" />
          </div>
          <div className="space-y-4">
            {(Object.entries(stats.byProduct) as [string, number][]).sort((a,b) => b[1] - a[1]).slice(0, 3).map(([prod, val]) => (
              <div key={prod} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-slate-500 truncate">{prod}</span>
                  <span className="text-[10px] font-black text-slate-900">{stats.total > 0 ? Math.round((val / stats.total) * 100) : 0}%</span>
                </div>
                <div className="h-1 bg-slate-50 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full" 
                    style={{ 
                      width: `${stats.total > 0 ? (val / stats.total) * 100 : 0}%`,
                      backgroundColor: PRODUCT_COLORS[prod] || '#cbd5e1'
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Distribution Régionale */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl lg:col-span-1">
          <div className="flex items-center justify-between mb-6">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Top Régions</span>
            <LayoutGrid size={16} className="text-slate-300" />
          </div>
          <div className="space-y-3">
            {stats.topRegions.map(([pres, val], idx) => (
              <div key={pres} className="flex items-center justify-between p-2 rounded-xl bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-300">0{idx + 1}</span>
                  <span className="text-[10px] font-black uppercase text-slate-600 truncate max-w-[100px]">{pres}</span>
                </div>
                <span className="text-[10px] font-black text-slate-900">{val.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filtres Modernes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-white p-4 rounded-[2rem] border border-slate-100 shadow-lg">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Rechercher un site..." 
            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-slate-100 shadow-sm focus:ring-2 focus:ring-slate-900 outline-none font-bold text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <select 
            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-slate-100 shadow-sm focus:ring-2 focus:ring-slate-900 outline-none font-bold text-xs appearance-none"
            value={filterPres}
            onChange={(e) => setFilterPres(e.target.value)}
          >
            {presList.map(p => <option key={p} value={p}>{p === 'TOUS' ? 'Tous les PRES' : p}</option>)}
          </select>
        </div>

        <div className="relative">
          <Database className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <select 
            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-slate-100 shadow-sm focus:ring-2 focus:ring-slate-900 outline-none font-bold text-xs appearance-none"
            value={filterProduct}
            onChange={(e) => setFilterProduct(e.target.value)}
          >
            {productList.map(p => <option key={p} value={p}>{p === 'TOUS' ? 'Tous les Produits' : p}</option>)}
          </select>
        </div>

        <div className="relative">
          <TrendingUp className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <select 
            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-slate-100 shadow-sm focus:ring-2 focus:ring-slate-900 outline-none font-bold text-xs appearance-none"
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
          >
            {groupList.map(g => <option key={g} value={g}>{g === 'TOUS' ? 'Tous les Groupes' : g}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-[#f26522] text-white">
                <th className="px-6 py-6 text-[11px] font-black uppercase tracking-widest border-r border-white/10 w-[180px]">Site Source</th>
                <th className="px-6 py-6 text-[11px] font-black uppercase tracking-widest border-r border-white/10 w-[220px]">Structure</th>
                <th className="px-6 py-6 text-[11px] font-black uppercase tracking-widest border-r border-white/10 w-[160px]">Produit</th>
                {SANG_GROUPS.map(g => (
                  <th key={g} className="px-2 py-6 text-[11px] font-black uppercase tracking-widest border-r border-white/10 text-center w-[60px]">{g}</th>
                ))}
                <th className="px-6 py-6 text-[11px] font-black uppercase tracking-widest text-center w-[120px] bg-white/10">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(Object.entries(groupedStock) as [string, GroupedStock[string]][]).length > 0 ? (
                (Object.entries(groupedStock) as [string, GroupedStock[string]][]).map(([pres, presData]) => {
                  const presSiteCount = Object.values(presData.sites).reduce((acc, s) => acc + Object.keys(s.products).length, 0);
                  
                  return (
                    <React.Fragment key={pres}>
                      {(Object.entries(presData.sites) as [string, GroupedStock[string]['sites'][string]][]).map(([site, siteData], sIdx) => (
                        <React.Fragment key={site}>
                          {(Object.entries(siteData.products) as [string, GroupedStock[string]['sites'][string]['products'][string]][]).map(([productType, productData], pIdx) => {
                            const rowGroups = Object.fromEntries(SANG_GROUPS.map(g => [g, 0]));
                            productData.records.forEach(r => {
                              if (rowGroups[r.groupeSanguin] !== undefined) {
                                rowGroups[r.groupeSanguin] += r.quantite;
                              }
                            });

                            return (
                              <tr key={productType} className="hover:bg-slate-50 transition-colors group">
                                {sIdx === 0 && pIdx === 0 && (
                                  <td rowSpan={presSiteCount} className="px-6 py-4 align-top border-r border-slate-50 bg-white group-hover:bg-slate-50">
                                    <span className="text-[11px] font-black text-[#f26522] uppercase leading-tight">{pres}</span>
                                  </td>
                                )}
                                {pIdx === 0 && (
                                  <td rowSpan={Object.keys(siteData.products).length} className="px-6 py-4 align-top border-r border-slate-50">
                                    <span className="text-[10px] font-black text-slate-800 uppercase leading-tight">{site}</span>
                                  </td>
                                )}
                                <td className="px-6 py-4 border-r border-slate-50">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PRODUCT_COLORS[productType] || '#cbd5e1' }}></div>
                                    <span className="text-[10px] font-black uppercase text-slate-600 truncate">{productType}</span>
                                  </div>
                                </td>
                                {SANG_GROUPS.map(g => {
                                  const val = rowGroups[g];
                                  return (
                                    <td key={g} className={`px-2 py-4 text-center text-[11px] border-r border-slate-50 ${val > 0 ? 'font-black text-slate-900' : 'text-slate-200'}`}>
                                      <span className={val > 0 && val <= 5 ? 'text-rose-600' : ''}>{val}</span>
                                    </td>
                                  );
                                })}
                                <td className="px-6 py-4 text-center text-[11px] font-black text-slate-900 bg-slate-50/50">
                                  {productData.total.toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={12} className="px-6 py-32 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Database size={64} className="text-slate-100" />
                      <p className="text-sm font-black text-slate-300 uppercase tracking-[0.3em]">Aucune donnée trouvée pour cette sélection</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-[#2d1610] text-white font-black">
                <td colSpan={3} className="px-12 py-8 text-left">
                  <span className="text-2xl uppercase tracking-[0.2em] leading-none">Total Général Consolidé</span>
                </td>
                {SANG_GROUPS.map(g => (
                  <td key={g} className="px-2 py-8 text-center text-xl border-l border-white/5">
                    {stats.byGroup[g]?.toLocaleString() || 0}
                  </td>
                ))}
                <td className="px-6 py-8 text-center text-4xl border-l border-white/5 bg-white/5 text-[#f26522]">
                  {stats.total.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
