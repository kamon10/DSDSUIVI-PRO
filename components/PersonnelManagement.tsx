
import React, { useState, useEffect, useMemo } from 'react';
import { Personnel, User } from '../types.ts';
import { fetchPersonnel } from '../services/personnelService.ts';
import { 
  Search, User as UserIcon, Building2, Phone, Mail, BadgeCheck, Filter, 
  Download, RefreshCw, Loader2, ChevronRight, ChevronLeft, LayoutDashboard, 
  List, Users, UserCheck, UserX, Calendar, Briefcase, GraduationCap, 
  MapPin, Info, X, TrendingUp, PieChart as PieChartIcon, BarChart3, Banknote,
  Coins, Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { SALARY_CONSTANTS } from '../constants.tsx';

interface PersonnelManagementProps {
  user: User | null;
}

const DEFAULT_PERSONNEL_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ4VwhEzTnalWIPeUeFwAfC2kdwFwaYSdw3CrDqaVO12Kpvhs_qvuKGY1Yoz41q8dtLumi-Go9ZU3Pr/pub?gid=0&single=true&output=csv";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-CI', { 
    style: 'currency', 
    currency: 'XOF', 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  }).format(amount).replace('XOF', 'FCFA');
};

const calculateSalary = (indice: number) => {
  // Basé sur l'exemple : Indice (830) * 233,457 = 193 769,31 FCFA (Mensuel)
  const mensuel = indice * SALARY_CONSTANTS.VALEUR_POINT_INDICE;
  const annuel = mensuel * 12;
  const prime = mensuel * SALARY_CONSTANTS.PRIME_EXCEPTIONNELLE_RATIO;
  return { annuel, mensuel, prime };
};

export const PersonnelManagement: React.FC<PersonnelManagementProps> = ({ user }) => {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'dashboard' | 'list'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSite, setFilterSite] = useState('TOUS');
  const [filterService, setFilterService] = useState('TOUS');
  const [filterStatut, setFilterStatut] = useState('TOUS');
  const [selectedAgent, setSelectedAgent] = useState<Personnel | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPersonnel(DEFAULT_PERSONNEL_URL);
      setPersonnel(data);
    } catch (err) {
      setError("Erreur lors du chargement du personnel.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const sites = useMemo(() => {
    const s = new Set(personnel.map(p => p.site).filter(Boolean));
    return ['TOUS', ...Array.from(s).sort()];
  }, [personnel]);

  const services = useMemo(() => {
    const s = new Set(personnel.map(p => p.service).filter(Boolean));
    return ['TOUS', ...Array.from(s).sort()];
  }, [personnel]);

  const statuts = useMemo(() => {
    const s = new Set(personnel.map(p => p.statut).filter(Boolean));
    return ['TOUS', ...Array.from(s).sort()];
  }, [personnel]);

  const filteredPersonnel = useMemo(() => {
    return personnel.filter(p => {
      const matchesSearch = 
        p.nomPrenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.matricule.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSite = filterSite === 'TOUS' || p.site === filterSite;
      const matchesService = filterService === 'TOUS' || p.service === filterService;
      const matchesStatut = filterStatut === 'TOUS' || p.statut === filterStatut;

      return matchesSearch && matchesSite && matchesService && matchesStatut;
    });
  }, [personnel, searchTerm, filterSite, filterService, filterStatut]);

  // Dashboard Stats
  const stats = useMemo(() => {
    const total = filteredPersonnel.length;
    const actifs = filteredPersonnel.filter(p => p.statut.toUpperCase().includes('ACTIF')).length;
    const hommes = filteredPersonnel.filter(p => p.sexe.toUpperCase().startsWith('M') || p.sexe.toUpperCase().includes('HOMME')).length;
    const femmes = filteredPersonnel.filter(p => p.sexe.toUpperCase().startsWith('F') || p.sexe.toUpperCase().includes('FEMME')).length;
    const ageMoyen = total > 0 ? filteredPersonnel.reduce((acc, p) => acc + (p.age || 0), 0) / total : 0;
    
    return { total, actifs, hommes, femmes, ageMoyen };
  }, [filteredPersonnel]);

  // Chart Data
  const siteData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredPersonnel.forEach(p => {
      counts[p.site] = (counts[p.site] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredPersonnel]);

  const serviceData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredPersonnel.forEach(p => {
      counts[p.service] = (counts[p.service] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredPersonnel]);

  const ageData = useMemo(() => {
    const groups = {
      '-30 ans': 0,
      '30-40 ans': 0,
      '40-50 ans': 0,
      '50-60 ans': 0,
      '60+ ans': 0
    };
    filteredPersonnel.forEach(p => {
      if (p.age < 30) groups['-30 ans']++;
      else if (p.age < 40) groups['30-40 ans']++;
      else if (p.age < 50) groups['40-50 ans']++;
      else if (p.age < 60) groups['50-60 ans']++;
      else groups['60+ ans']++;
    });
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [filteredPersonnel]);

  const genderData = useMemo(() => [
    { name: 'Hommes', value: stats.hommes },
    { name: 'Femmes', value: stats.femmes }
  ], [stats]);

  const totalPages = Math.ceil(filteredPersonnel.length / itemsPerPage);
  const currentItems = filteredPersonnel.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportToCSV = () => {
    const headers = [
      "Statut", "Matricule", "Nom et Prénom", "Sexe", "Age", "Emploi", "Site", 
      "Service", "Fonction", "Date Embauche", "Ancienneté", "Diplôme", "Contact"
    ];
    const csvContent = [
      headers.join(";"),
      ...filteredPersonnel.map(p => [
        p.statut, p.matricule, p.nomPrenom, p.sexe, p.age, p.emploi, p.site, 
        p.service, p.fonction, p.dateEmbauche, p.anciennete, p.diplome, p.contact
      ].join(";"))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `dashboard_personnel_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const StatsCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{value}</h3>
          {subtitle && <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">{subtitle}</p>}
        </div>
        <div className={`p-4 rounded-2xl ${color} bg-opacity-10 text-${color.split('-')[1]}-600`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Tableau de Bord Personnel</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Gestion stratégique des ressources humaines du CNTSCI
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white p-1 rounded-2xl border border-slate-200 flex items-center">
            <button 
              onClick={() => setViewMode('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'dashboard' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutDashboard size={14} />
              Dashboard
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <List size={14} />
              Liste
            </button>
          </div>
          <button 
            onClick={loadData}
            disabled={loading}
            className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
          </button>
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-all active:scale-95"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard title="Effectif Total" value={stats.total} icon={Users} color="bg-blue-500" />
        <StatsCard title="Agents Actifs" value={stats.actifs} icon={UserCheck} color="bg-emerald-500" subtitle={`${((stats.actifs/stats.total)*100).toFixed(1)}% de l'effectif`} />
        <StatsCard title="Répartition H/F" value={`${stats.hommes}/${stats.femmes}`} icon={TrendingUp} color="bg-violet-500" subtitle="Hommes / Femmes" />
        <StatsCard title="Age Moyen" value={`${stats.ageMoyen.toFixed(1)} ans`} icon={Calendar} color="bg-amber-500" />
        <StatsCard title="Sites" value={sites.length - 1} icon={MapPin} color="bg-rose-500" />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative md:col-span-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Rechercher un agent..." 
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-3xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>
        <div className="relative">
          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <select 
            value={filterSite}
            onChange={(e) => { setFilterSite(e.target.value); setCurrentPage(1); }}
            className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-3xl text-xs font-bold outline-none appearance-none cursor-pointer"
          >
            <option value="TOUS">TOUS LES SITES</option>
            {sites.filter(s => s !== 'TOUS').map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="relative">
          <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <select 
            value={filterService}
            onChange={(e) => { setFilterService(e.target.value); setCurrentPage(1); }}
            className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-3xl text-xs font-bold outline-none appearance-none cursor-pointer"
          >
            <option value="TOUS">TOUS LES SERVICES</option>
            {services.filter(s => s !== 'TOUS').map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="relative">
          <BadgeCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <select 
            value={filterStatut}
            onChange={(e) => { setFilterStatut(e.target.value); setCurrentPage(1); }}
            className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-3xl text-xs font-bold outline-none appearance-none cursor-pointer"
          >
            <option value="TOUS">TOUS LES STATUTS</option>
            {statuts.filter(s => s !== 'TOUS').map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {viewMode === 'dashboard' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Site Distribution */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <MapPin size={18} className="text-blue-500" />
                Répartition par Site
              </h3>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={siteData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 10, 10, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gender Distribution */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <PieChartIcon size={18} className="text-violet-500" />
                Répartition par Sexe
              </h3>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#ec4899'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Age Distribution */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <BarChart3 size={18} className="text-amber-500" />
                Pyramide des Ages
              </h3>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                  <YAxis tick={{ fontSize: 10, fontWeight: 'bold' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" fill="#f59e0b" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Service Distribution */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <Briefcase size={18} className="text-emerald-500" />
                Top 10 Services
              </h3>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serviceData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 8, fontWeight: 'bold' }} angle={-45} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 10, fontWeight: 'bold' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" fill="#10b981" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Agent</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Matricule</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Service / Site</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Emploi</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Statut</th>
                  <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <AnimatePresence mode="wait">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-24 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <Loader2 className="text-blue-600 animate-spin" size={40} />
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chargement des données...</p>
                        </div>
                      </td>
                    </tr>
                  ) : currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-24 text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aucun agent trouvé</p>
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((p, idx) => (
                      <motion.tr 
                        key={p.matricule || idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="hover:bg-slate-50/50 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                              <UserIcon size={18} />
                            </div>
                            <div>
                              <p className="text-xs font-black uppercase text-slate-900">{p.nomPrenom}</p>
                              <p className="text-[10px] font-bold text-slate-500">{p.sexe} • {p.age} ans</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-wider">
                            {p.matricule || '---'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-900 uppercase">{p.service}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{p.site}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-[10px] font-bold text-slate-600 uppercase">{p.emploi}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${p.statut.toUpperCase().includes('ACTIF') ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{p.statut || '---'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => setSelectedAgent(p)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Info size={18} />
                          </button>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Page {currentPage} sur {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all"
                >
                  <ChevronLeft size={18} />
                </button>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Agent Detail Modal */}
      <AnimatePresence>
        {selectedAgent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAgent(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 md:p-12">
                <div className="flex items-start justify-between mb-12">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center text-slate-400">
                      <UserIcon size={40} />
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{selectedAgent.nomPrenom}</h3>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                          {selectedAgent.matricule}
                        </span>
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${selectedAgent.statut.toUpperCase().includes('ACTIF') ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                          {selectedAgent.statut}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedAgent(null)}
                    className="p-3 bg-slate-100 text-slate-400 hover:text-slate-600 rounded-2xl transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Informations Personnelles</h4>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Calendar size={16} className="text-slate-400" />
                        <div>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Date de Naissance</p>
                          <p className="text-xs font-bold text-slate-700">{selectedAgent.dateNaissance} ({selectedAgent.age} ans)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Users size={16} className="text-slate-400" />
                        <div>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Sexe</p>
                          <p className="text-xs font-bold text-slate-700">{selectedAgent.sexe}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone size={16} className="text-slate-400" />
                        <div>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Contact</p>
                          <p className="text-xs font-bold text-slate-700">{selectedAgent.contact || 'Non renseigné'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <UserIcon size={16} className="text-slate-400" />
                        <div>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Personne à contacter</p>
                          <p className="text-xs font-bold text-slate-700">{selectedAgent.personneAContacter || 'Non renseigné'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Carrière & Poste</h4>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Briefcase size={16} className="text-slate-400" />
                        <div>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Emploi / Fonction</p>
                          <p className="text-xs font-bold text-slate-700">{selectedAgent.emploi} / {selectedAgent.fonction}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Building2 size={16} className="text-slate-400" />
                        <div>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Service / Site</p>
                          <p className="text-xs font-bold text-slate-700">{selectedAgent.service} ({selectedAgent.site})</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar size={16} className="text-slate-400" />
                        <div>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Date d'embauche</p>
                          <p className="text-xs font-bold text-slate-700">{selectedAgent.dateEmbauche}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <TrendingUp size={16} className="text-slate-400" />
                        <div>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Ancienneté</p>
                          <p className="text-xs font-bold text-slate-700">{selectedAgent.anciennete}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Formation & Rémunération</h4>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <GraduationCap size={16} className="text-slate-400" />
                        <div>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Diplôme</p>
                          <p className="text-xs font-bold text-slate-700">{selectedAgent.diplome}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <BadgeCheck size={16} className="text-slate-400" />
                        <div>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Grade / Catégorie</p>
                          <p className="text-xs font-bold text-slate-700">{selectedAgent.grade} ({selectedAgent.categorieEmploi})</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <TrendingUp size={16} className="text-slate-400" />
                        <div>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Indice Salariale</p>
                          <p className="text-xs font-bold text-slate-700">{selectedAgent.indiceSalariale}</p>
                        </div>
                      </div>
                      
                      {/* Salary Section */}
                      <div className="p-4 bg-slate-50 rounded-2xl space-y-3">
                        <div className="flex items-center gap-3">
                          <Banknote size={16} className="text-emerald-600" />
                          <div>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">Salaire de Base Mensuel</p>
                            <p className="text-sm font-black text-emerald-700">
                              {formatCurrency(calculateSalary(selectedAgent.indiceSalariale).mensuel)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Coins size={16} className="text-amber-600" />
                          <div>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">Prime Exceptionnelle (2026)</p>
                            <p className="text-xs font-bold text-amber-700">
                              {formatCurrency(calculateSalary(selectedAgent.indiceSalariale).prime)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Wallet size={16} className="text-blue-600" />
                          <div>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">Salaire de Base Annuel</p>
                            <p className="text-xs font-bold text-blue-700">
                              {formatCurrency(calculateSalary(selectedAgent.indiceSalariale).annuel)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {selectedAgent.observation && (
                        <div className="flex items-start gap-3">
                          <Info size={16} className="text-slate-400 mt-1" />
                          <div>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">Observation</p>
                            <p className="text-xs font-medium text-slate-600">{selectedAgent.observation}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
