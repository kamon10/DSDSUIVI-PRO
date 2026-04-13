
import React, { useMemo, useState } from 'react';
import { DashboardData } from '../types.ts';
import { Truck, PieChart, BarChart3, TrendingUp, Package, MapPin, Activity, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart as RePieChart, Pie } from 'recharts';

interface GtsSynthesisProps {
  data: DashboardData;
  branding: { logo: string; hashtag: string };
}

export const GtsSynthesis: React.FC<GtsSynthesisProps> = ({ data, branding }) => {
  const todayStr = new Date().toLocaleDateString('en-CA');
  const [startDate, setStartDate] = useState<string>('2024-01-01');
  const [endDate, setEndDate] = useState<string>('2026-12-31');

  const gtsData = data.gts || [];

  const filteredGtsData = useMemo(() => {
    return gtsData.filter(r => {
      let matchesDate = true;
      if (r.date) {
        const parts = r.date.split('/');
        let itemDate: Date | null = null;
        if (parts.length === 3) {
          const [d, m, y] = parts;
          itemDate = new Date(`${y}-${m}-${d}`);
        } else {
          const dt = new Date(r.date);
          if (!isNaN(dt.getTime())) {
            itemDate = dt;
          }
        }

        if (itemDate && !isNaN(itemDate.getTime())) {
          if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            if (itemDate < start) matchesDate = false;
          }
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (itemDate > end) matchesDate = false;
          }
        }
      }
      return matchesDate;
    });
  }, [gtsData, startDate, endDate]);

  const stats = useMemo(() => {
    const totalRecords = filteredGtsData.length;
    const totalFixe = filteredGtsData.reduce((acc, r) => acc + (Number(r.fixe) || 0), 0);
    const totalMobile = filteredGtsData.reduce((acc, r) => acc + (Number(r.mobile) || 0), 0);
    const totalAuto = filteredGtsData.reduce((acc, r) => acc + (Number(r.autoTransfusion) || 0), 0);
    const totalQty = filteredGtsData.reduce((acc, r) => acc + (Number(r.total) || 0), 0);

    return { totalRecords, totalFixe, totalMobile, totalAuto, totalQty };
  }, [filteredGtsData]);

  const regionalSynthesis = useMemo(() => {
    const regions: Record<string, { 
      fixe: number, 
      mobile: number, 
      auto: number, 
      total: number, 
      collectes: number 
    }> = {};

    filteredGtsData.forEach(r => {
      const reg = r.region || "AUTRES";
      if (!regions[reg]) {
        regions[reg] = { fixe: 0, mobile: 0, auto: 0, total: 0, collectes: 0 };
      }
      regions[reg].fixe += r.fixe;
      regions[reg].mobile += r.mobile;
      regions[reg].auto += r.autoTransfusion;
      regions[reg].total += r.total;
      if (r.caCode !== 'Z' && r.pvCode !== 0) {
        regions[reg].collectes += 1;
      }
    });

    return Object.entries(regions).map(([name, data]) => ({ name, ...data }));
  }, [filteredGtsData]);

  const chartData = regionalSynthesis.map(r => ({
    name: r.name,
    Fixe: r.fixe,
    Mobile: r.mobile,
    Auto: r.auto
  }));

  const pieData = [
    { name: 'Fixe', value: stats.totalFixe, color: '#10b981' },
    { name: 'Mobile', value: stats.totalMobile, color: '#f97316' },
    { name: 'Auto Transf.', value: stats.totalAuto, color: '#3b82f6' }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <PieChart className="text-indigo-600" size={28} />
            SYNTHÈSE GTS
          </h2>
          <p className="text-slate-500 font-medium">Analyse globale des collectes et transports</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase">Du</span>
            <input 
              type="date"
              className="bg-transparent text-xs font-bold text-slate-600 outline-none cursor-pointer"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase">Au</span>
            <input 
              type="date"
              className="bg-transparent text-xs font-bold text-slate-600 outline-none cursor-pointer"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {(startDate !== todayStr || endDate !== todayStr) && (
            <button 
              onClick={() => { setStartDate(todayStr); setEndDate(todayStr); }}
              className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest"
            >
              Réinitialiser
            </button>
          )}

          <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100">
            <span className="text-indigo-700 font-bold text-sm">{branding.hashtag}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">COLLECTES REALISÉES</p>
          <p className="text-2xl font-black text-slate-900">{stats.totalRecords}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">POCHES COL. FIXE</p>
          <p className="text-2xl font-black text-emerald-600">{stats.totalFixe}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">POCHES COL. MOB</p>
          <p className="text-2xl font-black text-orange-600">{stats.totalMobile}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Auto Transfusion</p>
          <p className="text-2xl font-black text-blue-600">{stats.totalAuto}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Poches</p>
          <p className="text-2xl font-black text-indigo-600">{stats.totalQty}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
              <BarChart3 size={20} className="text-indigo-500" />
              Répartition par Région (PRES)
            </h3>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  interval={0} 
                  height={80}
                  stroke="#94a3b8"
                  fontSize={10}
                  fontWeight="bold"
                />
                <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="Fixe" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="Mobile" fill="#f97316" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="Auto" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-8 uppercase tracking-tight">
            <TrendingUp size={20} className="text-indigo-500" />
            Proportions Globales
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4 mt-4">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs font-bold text-slate-600">{item.name}</span>
                </div>
                <span className="text-sm font-black text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-slate-50 bg-slate-50/50">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
            <Package size={20} className="text-indigo-500" />
            Récapitulatif par PRES
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Région (PRES)</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Collectes Mobiles</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">POCHES COL. FIXE</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">POCHES COL. MOB</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Auto Transf.</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Total Poches</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {regionalSynthesis.map((reg, idx) => (
                <motion.tr 
                  key={reg.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black text-xs">
                        {reg.name.substring(0, 2)}
                      </div>
                      <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{reg.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-center">
                    <span className="text-sm font-bold text-slate-600">{reg.collectes}</span>
                  </td>
                  <td className="px-8 py-4 text-center">
                    <span className="text-sm font-bold text-emerald-600">{reg.fixe}</span>
                  </td>
                  <td className="px-8 py-4 text-center">
                    <span className="text-sm font-bold text-orange-600">{reg.mobile}</span>
                  </td>
                  <td className="px-8 py-4 text-center">
                    <span className="text-sm font-bold text-blue-600">{reg.auto}</span>
                  </td>
                  <td className="px-8 py-4 text-center">
                    <span className="text-lg font-black text-indigo-600">{reg.total}</span>
                  </td>
                </motion.tr>
              ))}
              <tr className="bg-slate-900 text-white">
                <td className="px-8 py-6 font-black uppercase tracking-widest text-xs">TOTAL NATIONAL</td>
                <td className="px-8 py-6 text-center font-black text-lg">{stats.totalRecords}</td>
                <td className="px-8 py-6 text-center font-black text-lg">{stats.totalFixe}</td>
                <td className="px-8 py-6 text-center font-black text-lg">{stats.totalMobile}</td>
                <td className="px-8 py-6 text-center font-black text-lg">{stats.totalAuto}</td>
                <td className="px-8 py-6 text-center font-black text-2xl text-indigo-400">{stats.totalQty}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
