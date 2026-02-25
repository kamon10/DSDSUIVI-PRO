
import React, { useState, useMemo } from 'react';
import { DashboardData, User, StockRecord, DistributionRecord } from '../types.ts';
import { Package, Search, Filter, Database, TrendingUp, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { PRODUCT_COLORS, GROUP_COLORS } from '../constants.tsx';

interface StockViewProps {
  data: DashboardData;
  user: User | null;
}

export const StockView: React.FC<StockViewProps> = ({ data, user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPres, setFilterPres] = useState('TOUS');
  const [filterProduct, setFilterProduct] = useState('TOUS');
  const [filterGroup, setFilterGroup] = useState('TOUS');
  const [sortConfig, setSortConfig] = useState<{ key: keyof StockRecord; direction: 'asc' | 'desc' } | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [showComparison, setShowComparison] = useState(false);

  const stock = data.stock || [];

  const presList = useMemo(() => ['TOUS', ...Array.from(new Set(stock.map(s => s.pres))).sort()], [stock]);
  const productList = useMemo(() => ['TOUS', ...Array.from(new Set(stock.map(s => s.typeProduit))).sort()], [stock]);
  const groupList = useMemo(() => ['TOUS', ...Array.from(new Set(stock.map(s => s.groupeSanguin))).sort()], [stock]);

  const filteredStock = useMemo(() => {
    const filtered = stock.filter(item => {
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

  const paginatedStock = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStock.slice(start, start + itemsPerPage);
  }, [filteredStock, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredStock.length / itemsPerPage);

  const stats = useMemo(() => {
    const total = filteredStock.reduce((acc, s) => acc + s.quantite, 0);
    const byProduct = filteredStock.reduce((acc, s) => {
      acc[s.typeProduit] = (acc[s.typeProduit] || 0) + s.quantite;
      return acc;
    }, {} as Record<string, number>);
    
    return { total, byProduct };
  }, [filteredStock]);

  const aggregatedDistributions = useMemo(() => {
    const agg = new Map<string, number>();
    if (!data.distributions) return agg;

    data.distributions.records.forEach(dist => {
      const key = `${dist.site}|${dist.typeProduit}|${dist.groupeSanguin}`.toUpperCase();
      agg.set(key, (agg.get(key) || 0) + dist.quantite);
    });
    return agg;
  }, [data.distributions]);

  const comparisonResults = useMemo(() => {
    const results: { stockItem: StockRecord; distributedQty: number; discrepancy: number; status: string }[] = [];

    filteredStock.forEach(stockItem => {
      const key = `${stockItem.site}|${stockItem.typeProduit}|${stockItem.groupeSanguin}`.toUpperCase();
      const distributedQty = aggregatedDistributions.get(key) || 0;
      const discrepancy = stockItem.quantite - distributedQty;
      let status = '';

      if (discrepancy > 0) {
        status = 'Surplus';
      } else if (discrepancy < 0) {
        status = 'Manque';
      } else {
        status = 'Conforme';
      }

      results.push({ stockItem, distributedQty, discrepancy, status });
    });
    return results;
  }, [filteredStock, aggregatedDistributions]);

  const handleSort = (key: keyof StockRecord) => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-[2.5rem] border border-slate-100 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
            <Package className="text-white" size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Gestion des Stocks</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Inventaire temps réel par PRES et Site</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowComparison(prev => !prev)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-colors ${showComparison ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {showComparison ? 'Voir Stock Réel' : 'Comparer Distribution'}
          </button>
          <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
            <span className="text-[10px] font-black uppercase text-emerald-600 block">Total Poches</span>
            <span className="text-xl font-black text-emerald-700">{stats.total.toLocaleString()}</span>
          </div>
          <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
            <span className="text-[10px] font-black uppercase text-blue-600 block">Sites Actifs</span>
            <span className="text-xl font-black text-blue-700">{new Set(filteredStock.map(s => s.site)).size}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {showComparison ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">PRES</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Site / Structure</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Type Produit</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Groupe</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Stock Réel</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Distribué</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Écart</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {comparisonResults.length > 0 ? (
                  comparisonResults.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4"><span className="text-[10px] font-black uppercase text-slate-400">{item.stockItem.pres}</span></td>
                      <td className="px-6 py-4"><span className="text-xs font-bold text-slate-900">{item.stockItem.site}</span></td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PRODUCT_COLORS[item.stockItem.typeProduit] || '#cbd5e1' }}></div>
                          <span className="text-[10px] font-black uppercase text-slate-600">{item.stockItem.typeProduit}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-block px-3 py-1 rounded-lg text-[10px] font-black text-white shadow-sm" style={{ backgroundColor: GROUP_COLORS[item.stockItem.groupeSanguin] || '#64748b' }}>
                          {item.stockItem.groupeSanguin}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-sm font-black ${item.stockItem.quantite <= 5 ? 'text-rose-600' : 'text-slate-900'}`}>
                          {item.stockItem.quantite}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-black text-slate-900">{item.distributedQty}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-sm font-black ${item.discrepancy !== 0 ? (item.discrepancy > 0 ? 'text-green-600' : 'text-red-600') : 'text-slate-900'}`}>
                          {item.discrepancy}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-lg text-[10px] font-black text-white shadow-sm ${item.status === 'Conforme' ? 'bg-emerald-500' : item.status === 'Surplus' ? 'bg-orange-500' : 'bg-rose-500'}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <Database size={48} className="text-slate-200" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aucun résultat de comparaison trouvé</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th onClick={() => handleSort('pres')} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-slate-900 transition-colors">
                  <div className="flex items-center gap-2">PRES {sortConfig?.key === 'pres' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</div>
                </th>
                <th onClick={() => handleSort('site')} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-slate-900 transition-colors">
                  <div className="flex items-center gap-2">Site / Structure {sortConfig?.key === 'site' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</div>
                </th>
                <th onClick={() => handleSort('typeProduit')} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-slate-900 transition-colors">
                  <div className="flex items-center gap-2">Type Produit {sortConfig?.key === 'typeProduit' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</div>
                </th>
                <th onClick={() => handleSort('groupeSanguin')} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-slate-900 transition-colors text-center">
                  <div className="flex items-center justify-center gap-2">Groupe {sortConfig?.key === 'groupeSanguin' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</div>
                </th>
                <th onClick={() => handleSort('quantite')} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-slate-900 transition-colors text-right">
                  <div className="flex items-center justify-end gap-2">Stock {sortConfig?.key === 'quantite' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedStock.length > 0 ? (
                paginatedStock.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black uppercase text-slate-400">{item.pres}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-900">{item.site}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PRODUCT_COLORS[item.typeProduit] || '#cbd5e1' }}></div>
                        <span className="text-[10px] font-black uppercase text-slate-600">{item.typeProduit}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-block px-3 py-1 rounded-lg text-[10px] font-black text-white shadow-sm" style={{ backgroundColor: GROUP_COLORS[item.groupeSanguin] || '#64748b' }}>
                        {item.groupeSanguin}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className={`text-sm font-black ${item.quantite <= 5 ? 'text-rose-600' : 'text-slate-900'}`}>
                          {item.quantite}
                        </span>
                        {item.quantite <= 5 && (
                          <div className="flex items-center gap-1 mt-1">
                            <AlertTriangle size={10} className="text-rose-500" />
                            <span className="text-[8px] font-black uppercase text-rose-500">Stock Critique</span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Database size={48} className="text-slate-200" />
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aucun stock trouvé pour ces filtres</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400">
              Page {currentPage} sur {totalPages} ({filteredStock.length} résultats)
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase disabled:opacity-50 transition-all active:scale-95"
              >
                Précédent
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase disabled:opacity-50 transition-all active:scale-95"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
      )}
  );
};
