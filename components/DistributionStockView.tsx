
import React, { useMemo, useState } from 'react';
import { DashboardData, User } from '../types';
import { Package, Truck, Search, Filter, Database, ArrowRight, Download, Info, Activity, Map as MapIcon, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { PRODUCT_COLORS, GROUP_COLORS } from '../constants';
import DatePicker, { registerLocale } from "react-datepicker";
import { fr } from 'date-fns/locale';
import "react-datepicker/dist/react-datepicker.css";

registerLocale('fr', fr);

interface DistributionStockViewProps {
  data: DashboardData;
  user: User | null;
}

export const DistributionStockView: React.FC<DistributionStockViewProps> = ({ data, user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSite, setFilterSite] = useState('TOUS');
  const [filterProduct, setFilterProduct] = useState('TOUS');
  const [filterGroup, setFilterGroup] = useState('TOUS');
  const [selectedDate, setSelectedDate] = useState(data.date);

  const stock = data.stock || [];
  const distributions = useMemo(() => {
    return (data.distributions?.records || []).filter(d => d.date === selectedDate);
  }, [data.distributions?.records, selectedDate]);

  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    dates.add(data.date);
    data.dailyHistory.forEach(h => dates.add(h.date));
    (data.distributions?.records || []).forEach(d => dates.add(d.date));
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [data.date, data.dailyHistory, data.distributions?.records]);

  const formatDateForInput = (dateStr: string) => {
    if (!dateStr || !dateStr.includes('/')) return '';
    const [d, m, y] = dateStr.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  };

  const formatDateFromInput = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const sites = useMemo(() => {
    const allSites = new Set<string>();
    stock.forEach(s => allSites.add(s.site));
    distributions.forEach(d => allSites.add(d.site));
    return ['TOUS', ...Array.from(allSites).sort()];
  }, [stock, distributions]);

  const products = useMemo(() => {
    const allProducts = new Set<string>();
    stock.forEach(s => allProducts.add(s.typeProduit));
    distributions.forEach(d => allProducts.add(d.typeProduit));
    return ['TOUS', ...Array.from(allProducts).sort()];
  }, [stock, distributions]);

  const groups = useMemo(() => {
    const allGroups = new Set<string>();
    stock.forEach(s => allGroups.add(s.groupeSanguin));
    distributions.forEach(d => allGroups.add(d.groupeSanguin));
    return ['TOUS', ...Array.from(allGroups).sort()];
  }, [stock, distributions]);

  const comparisonData = useMemo(() => {
    const map = new Map<string, { site: string, product: string, group: string, stock: number, distribution: number }>();

    const getKey = (site: string, product: string, group: string) => `${site}|${product}|${group}`;

    stock.forEach(s => {
      const key = getKey(s.site, s.typeProduit, s.groupeSanguin);
      if (!map.has(key)) {
        map.set(key, { site: s.site, product: s.typeProduit, group: s.groupeSanguin, stock: 0, distribution: 0 });
      }
      map.get(key)!.stock += s.quantite;
    });

    distributions.forEach(d => {
      const key = getKey(d.site, d.typeProduit, d.groupeSanguin);
      if (!map.has(key)) {
        map.set(key, { site: d.site, product: d.typeProduit, group: d.groupeSanguin, stock: 0, distribution: 0 });
      }
      map.get(key)!.distribution += d.quantite;
    });

    return Array.from(map.values()).filter(item => {
      const matchesSearch = item.site.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.product.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSite = filterSite === 'TOUS' || item.site === filterSite;
      const matchesProduct = filterProduct === 'TOUS' || item.product === filterProduct;
      const matchesGroup = filterGroup === 'TOUS' || item.group === filterGroup;

      return matchesSearch && matchesSite && matchesProduct && matchesGroup;
    }).sort((a, b) => a.site.localeCompare(b.site) || a.product.localeCompare(b.product) || a.group.localeCompare(b.group));
  }, [stock, distributions, searchTerm, filterSite, filterProduct, filterGroup]);

  const totals = useMemo(() => {
    return comparisonData.reduce((acc, item) => ({
      stock: acc.stock + item.stock,
      distribution: acc.distribution + item.distribution
    }), { stock: 0, distribution: 0 });
  }, [comparisonData]);

  const groupedData = useMemo(() => {
    const groups: { [site: string]: { [product: string]: { [bloodGroup: string]: { stock: number, distribution: number } } } } = {};
    
    comparisonData.forEach(item => {
      if (!groups[item.site]) groups[item.site] = {};
      if (!groups[item.site][item.product]) groups[item.site][item.product] = {};
      if (!groups[item.site][item.product][item.group]) {
        groups[item.site][item.product][item.group] = { stock: 0, distribution: 0 };
      }
      groups[item.site][item.product][item.group].stock += item.stock;
      groups[item.site][item.product][item.group].distribution += item.distribution;
    });

    return groups;
  }, [comparisonData]);

  const bloodGroups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900">Stock & Distribution</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-2 flex items-center gap-2">
            <Info size={14} className="text-blue-500" />
            Comparaison en temps réel des stocks disponibles et des volumes distribués par site pour le <span className="text-blue-600 font-black">{selectedDate}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 group-hover:scale-110 transition-transform z-10" size={16} />
            <DatePicker
              selected={selectedDate ? (function() {
                const [d, m, y] = selectedDate.split('/');
                return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
              })() : null}
              onChange={(date: Date | null) => {
                if (date) {
                  const d = String(date.getDate()).padStart(2, '0');
                  const m = String(date.getMonth() + 1).padStart(2, '0');
                  const y = date.getFullYear();
                  setSelectedDate(`${d}/${m}/${y}`);
                }
              }}
              dateFormat="dd/MM/yyyy"
              locale="fr"
              className="pl-11 pr-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black outline-none focus:ring-2 ring-blue-500/20 transition-all w-48 cursor-pointer hover:border-blue-300"
              wrapperClassName="w-full"
            />
            <div className="absolute -top-2 -right-1 bg-blue-600 text-[8px] font-black text-white px-1.5 py-0.5 rounded-full shadow-sm z-10">
              CALENDRIER
            </div>
          </div>
           <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-blue-500/20 transition-all w-64"
            />
          </div>
          <button className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg hover:bg-slate-800 transition-all active:scale-95">
            <Download size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stock Total</span>
            <Package className="text-blue-500" size={20} />
          </div>
          <div>
            <div className="text-4xl font-black text-slate-900 tracking-tighter">{totals.stock.toLocaleString()}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">Poches disponibles</div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Distribution Journalière</span>
            <Truck className="text-orange-500" size={20} />
          </div>
          <div>
            <div className="text-4xl font-black text-slate-900 tracking-tighter">{totals.distribution.toLocaleString()}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">Poches distribuées ce jour</div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ratio Stock/Dist</span>
            <Database className="text-emerald-500" size={20} />
          </div>
          <div>
            <div className="text-4xl font-black text-slate-900 tracking-tighter">
              {totals.distribution > 0 ? (totals.stock / totals.distribution).toFixed(1) : '0'}
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">Indice de couverture</div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Filtrer par Site</label>
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select 
              value={filterSite}
              onChange={(e) => setFilterSite(e.target.value)}
              className="w-full pl-11 pr-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-blue-500/20 appearance-none"
            >
              {sites.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Filtrer par Produit</label>
          <div className="relative">
            <Database className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select 
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              className="w-full pl-11 pr-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-blue-500/20 appearance-none"
            >
              {products.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Filtrer par Groupe</label>
          <div className="relative">
            <Activity className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select 
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              className="w-full pl-11 pr-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-blue-500/20 appearance-none"
            >
              {groups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest border-r border-white/10 sticky left-0 bg-slate-900 z-10 w-[250px]">Produit / Site</th>
                {bloodGroups.map(group => (
                  <th key={group} className="px-4 py-6 text-[10px] font-black uppercase tracking-widest border-r border-white/10 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="px-2 py-0.5 rounded bg-white/10">{group}</span>
                      <div className="flex gap-4 text-[8px] opacity-60">
                        <span>STK</span>
                        <span>DST</span>
                      </div>
                    </div>
                  </th>
                ))}
                <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-center bg-slate-800">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.keys(groupedData).length > 0 ? Object.entries(groupedData).map(([site, products]) => (
                <React.Fragment key={site}>
                  <tr className="bg-slate-50/80">
                    <td colSpan={bloodGroups.length + 2} className="px-8 py-3 border-y border-slate-200/60 sticky left-0">
                      <div className="flex items-center gap-2">
                        <MapIcon size={14} className="text-blue-600" />
                        <span className="text-xs font-black text-slate-900 uppercase tracking-widest">{site}</span>
                      </div>
                    </td>
                  </tr>
                  {Object.entries(products).map(([product, dataByGroup]) => {
                    const productTotalStock = Object.values(dataByGroup).reduce((sum: number, d) => sum + (d as {stock: number}).stock, 0);
                    const productTotalDist = Object.values(dataByGroup).reduce((sum: number, d) => sum + (d as {distribution: number}).distribution, 0);
                    
                    return (
                      <tr key={`${site}-${product}`} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="px-8 py-4 border-r border-slate-50 sticky left-0 bg-white group-hover:bg-blue-50/30">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PRODUCT_COLORS[product] || '#cbd5e1' }}></div>
                            <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider truncate">{product}</span>
                          </div>
                        </td>
                        {bloodGroups.map(group => {
                          const cellData = dataByGroup[group] || { stock: 0, distribution: 0 };
                          return (
                            <td key={group} className="px-4 py-4 border-r border-slate-50 text-center">
                              <div className="flex items-center justify-center gap-4">
                                <span className={`text-xs font-black ${cellData.stock > 0 ? 'text-blue-600' : 'text-slate-300'}`}>
                                  {cellData.stock > 0 ? cellData.stock.toLocaleString() : '-'}
                                </span>
                                <span className={`text-xs font-black ${cellData.distribution > 0 ? 'text-orange-600' : 'text-slate-300'}`}>
                                  {cellData.distribution > 0 ? cellData.distribution.toLocaleString() : '-'}
                                </span>
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-6 py-4 text-center bg-slate-50/50">
                          <div className="flex items-center justify-center gap-4">
                            <span className="text-xs font-black text-slate-900">{productTotalStock.toLocaleString()}</span>
                            <span className="text-xs font-black text-slate-900">{productTotalDist.toLocaleString()}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Site Sub-total Row */}
                  <tr className="bg-slate-900/5 font-black">
                    <td className="px-8 py-4 border-r border-slate-200 sticky left-0 bg-slate-100">
                      <span className="text-[10px] uppercase tracking-widest text-slate-900">Sous-total {site}</span>
                    </td>
                    {bloodGroups.map(group => {
                      const groupStock = Object.values(products).reduce((sum, p) => sum + ((p[group] as {stock: number})?.stock || 0), 0);
                      const groupDist = Object.values(products).reduce((sum, p) => sum + ((p[group] as {distribution: number})?.distribution || 0), 0);
                      return (
                        <td key={group} className="px-4 py-4 border-r border-slate-200 text-center">
                          <div className="flex items-center justify-center gap-4">
                            <span className="text-xs text-blue-700">{groupStock > 0 ? groupStock.toLocaleString() : '-'}</span>
                            <span className="text-xs text-orange-700">{groupDist > 0 ? groupDist.toLocaleString() : '-'}</span>
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-6 py-4 text-center bg-slate-200">
                      <div className="flex items-center justify-center gap-4">
                        <span className="text-xs text-slate-900">
                          {Object.values(products).reduce((sum, p) => sum + Object.values(p).reduce((s: number, d) => s + (d as {stock: number}).stock, 0), 0).toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-900">
                          {Object.values(products).reduce((sum, p) => sum + Object.values(p).reduce((s: number, d) => s + (d as {distribution: number}).distribution, 0), 0).toLocaleString()}
                        </span>
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              )) : (
                <tr>
                  <td colSpan={bloodGroups.length + 2} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <Database size={64} />
                      <p className="text-sm font-black uppercase tracking-widest">Aucune donnée correspondante</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
