
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { DashboardData } from '../types';
import { COLORS } from '../constants';

interface DataChartsProps {
  data: DashboardData;
}

export const DataCharts: React.FC<DataChartsProps> = ({ data }) => {
  const pieData = [
    { name: 'Fixe', value: data.monthly.fixed },
    { name: 'Mobile', value: data.monthly.mobile },
  ];

  const barData = [
    {
      name: 'Journalier',
      fixe: data.daily.fixed,
      mobile: data.daily.mobile,
    },
    {
      name: 'Mensuel',
      fixe: data.monthly.fixed,
      mobile: data.monthly.mobile,
    }
  ];

  const PIE_COLORS = [COLORS.fixed, COLORS.mobile];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-6">Répartition Mensuelle (Fixe vs Mobile)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-6">Comparaison d'activité</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip cursor={{fill: '#f8fafc'}} />
              <Legend verticalAlign="bottom" height={36}/>
              <Bar dataKey="fixe" fill={COLORS.fixed} radius={[4, 4, 0, 0]} name="Structure Fixe" />
              <Bar dataKey="mobile" fill={COLORS.mobile} radius={[4, 4, 0, 0]} name="Unité Mobile" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
