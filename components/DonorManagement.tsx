
import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { Search, User, Calendar, CheckCircle, XCircle, Clock, History, Phone, MapPin, Droplets, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addMonths, isAfter, parse, isValid, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DonorData {
  Do_nom: string;
  Do_prenom: string;
  Do_contact1: string;
  Do_contact2: string;
  Do_groupe: string;
  Do_interditbiologique: string;
  Do_sexe: string;
  Co_numdo: string;
  Si_preleve: string;
  Si_code: string;
  Co_annee: string;
  Do_code: string;
  Py_code: string;
  Pv_code: string;
  Li_code: string;
  Co_collecte: string;
  Co_dcollecte: string;
  Co_autotransf: string;
  Mois: string;
}

const DONOR_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS9CBR20IhIgLrI4kKRDV9IDkdB5DzzntJlBFSVhdN7gA_6WOfC-f5xZ7IhCr4rQIdu5Bho3fgHGvih/pub?output=csv";

interface DonorManagementProps {
  csvUrl?: string;
}

export const DonorManagement: React.FC<DonorManagementProps> = ({ csvUrl }) => {
  const [data, setData] = useState<DonorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDonorCode, setSelectedDonorCode] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState<string>("Tous");
  const [filterMonth, setFilterMonth] = useState<string>("Tous");
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<string>("Tous");
  const [eligibilitySearch, setEligibilitySearch] = useState("");
  const [eligibilityPage, setEligibilityPage] = useState(1);
  const itemsPerPage = 20;
  const [showEligibilityList, setShowEligibilityList] = useState(false);

  const effectiveCsvUrl = useMemo(() => csvUrl || DONOR_CSV_URL, [csvUrl]);

  const years = useMemo(() => {
    const y = new Set<string>();
    data.forEach(r => {
      if (r.Co_annee) y.add(r.Co_annee);
    });
    return Array.from(y).sort((a, b) => b.localeCompare(a));
  }, [data]);

  const months = [
    { value: "1", label: "Janvier" },
    { value: "2", label: "Février" },
    { value: "3", label: "Mars" },
    { value: "4", label: "Avril" },
    { value: "5", label: "Mai" },
    { value: "6", label: "Juin" },
    { value: "7", label: "Juillet" },
    { value: "8", label: "Août" },
    { value: "9", label: "Septembre" },
    { value: "10", label: "Octobre" },
    { value: "11", label: "Novembre" },
    { value: "12", label: "Décembre" }
  ];

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(effectiveCsvUrl)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur serveur (${response.status}): ${errorText || "Impossible de récupérer les données"}`);
      }
      const csvText = await response.text();
      
      if (!csvText || csvText.trim().length === 0) {
        throw new Error("Le fichier de données est vide.");
      }

      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: 'greedy',
        worker: false, // On garde false pour le moment car on a déjà le texte en mémoire
        complete: (results) => {
          if (results.errors && results.errors.length > 0) {
            console.warn("PapaParse errors:", results.errors);
          }
          setData(results.data as DonorData[]);
          setLoading(false);
        },
        error: (err: any) => {
          setError("Erreur lors de l'analyse du CSV: " + err.message);
          setLoading(false);
        }
      });
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Pre-process data to avoid redundant parsing
  const processedData = useMemo(() => {
    return data.map(record => {
      const d = parse(record.Co_dcollecte, 'dd/MM/yyyy', new Date());
      const isValidDate = isValid(d);
      return {
        ...record,
        _parsedDate: isValidDate ? d : null,
        _year: isValidDate ? d.getFullYear().toString() : null,
        _month: isValidDate ? (d.getMonth() + 1).toString() : null
      };
    }).filter(r => r._parsedDate !== null);
  }, [data]);

  // Group data by donor code and pre-process profiles
  const donorProfiles = useMemo(() => {
    const profiles = new Map<string, {
      latest: DonorData & { _parsedDate: Date };
      history: (DonorData & { _parsedDate: Date, _year: string, _month: string })[];
      nextDate: Date;
      daysRemaining: number;
      isEligible: boolean;
      isEligibleByBiology: boolean;
    }>();

    const donorMap = new Map<string, (DonorData & { _parsedDate: Date, _year: string, _month: string })[]>();
    processedData.forEach(record => {
      if (!record.Do_code) return;
      if (!donorMap.has(record.Do_code)) {
        donorMap.set(record.Do_code, []);
      }
      donorMap.get(record.Do_code)?.push(record as any);
    });

    donorMap.forEach((records, code) => {
      const sortedRecords = [...records].sort((a, b) => b._parsedDate.getTime() - a._parsedDate.getTime());

      const latest = sortedRecords[0];
      const nextDate = addMonths(latest._parsedDate, 2);
      const daysRemaining = differenceInDays(nextDate, new Date());
      const isEligibleByBiology = latest.Do_interditbiologique === 'N';

      profiles.set(code, {
        latest,
        history: sortedRecords,
        nextDate,
        daysRemaining,
        isEligible: daysRemaining <= 0 && isEligibleByBiology,
        isEligibleByBiology
      });
    });

    return profiles;
  }, [processedData]);

  const filteredDonorList = useMemo(() => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase();
    const uniqueDonors: { code: string, name: string, firstName: string }[] = [];
    
    donorProfiles.forEach((profile, code) => {
      const fullName = `${profile.latest.Do_nom} ${profile.latest.Do_prenom}`.toLowerCase();
      if (fullName.includes(term) || code.toLowerCase().includes(term)) {
        uniqueDonors.push({
          code,
          name: profile.latest.Do_nom,
          firstName: profile.latest.Do_prenom
        });
      }
    });
    
    return uniqueDonors.slice(0, 10);
  }, [donorProfiles, searchTerm]);

  const globalStats = useMemo(() => {
    let totalDonorsInPeriod = new Set<string>();
    let eligibleDonors = 0;
    
    donorProfiles.forEach((profile, code) => {
      const hasDonationInPeriod = profile.history.some(r => {
        const yearMatch = filterYear === "Tous" || r._year === filterYear;
        const monthMatch = filterMonth === "Tous" || r._month === filterMonth;
        return yearMatch && monthMatch;
      });

      if (hasDonationInPeriod) {
        totalDonorsInPeriod.add(code);
        if (profile.isEligible) {
          eligibleDonors++;
        }
      }
    });

    return {
      total: totalDonorsInPeriod.size,
      eligible: eligibleDonors
    };
  }, [donorProfiles, filterYear, filterMonth]);

  const eligibilityList = useMemo(() => {
    const list: {
      code: string;
      name: string;
      firstName: string;
      bloodGroup: string;
      daysRemaining: number;
      nextDate: Date;
      isEligible: boolean;
    }[] = [];

    donorProfiles.forEach((profile, code) => {
      list.push({
        code,
        name: profile.latest.Do_nom,
        firstName: profile.latest.Do_prenom,
        bloodGroup: profile.latest.Do_groupe || "Inconnu",
        daysRemaining: profile.daysRemaining,
        nextDate: profile.nextDate,
        isEligible: profile.isEligible
      });
    });

    return list.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [donorProfiles]);

  const bloodGroups = useMemo(() => {
    const groups = new Map<string, number>();
    eligibilityList.forEach(item => {
      groups.set(item.bloodGroup, (groups.get(item.bloodGroup) || 0) + 1);
    });
    return Array.from(groups.entries())
      .sort((a, b) => a[0].localeCompare(b[0]));
  }, [eligibilityList]);

  const filteredEligibilityList = useMemo(() => {
    const term = eligibilitySearch.toLowerCase();
    return eligibilityList.filter(item => {
      const groupMatch = selectedBloodGroup === "Tous" || item.bloodGroup === selectedBloodGroup;
      const searchMatch = !term || 
        `${item.name} ${item.firstName}`.toLowerCase().includes(term) || 
        item.code.toLowerCase().includes(term);
      return groupMatch && searchMatch;
    });
  }, [eligibilityList, selectedBloodGroup, eligibilitySearch]);

  const paginatedEligibilityList = useMemo(() => {
    const start = (eligibilityPage - 1) * itemsPerPage;
    return filteredEligibilityList.slice(start, start + itemsPerPage);
  }, [filteredEligibilityList, eligibilityPage]);

  const totalEligibilityPages = Math.ceil(filteredEligibilityList.length / itemsPerPage);

  const selectedDonorRecords = useMemo(() => {
    if (!selectedDonorCode) return null;
    return donorProfiles.get(selectedDonorCode)?.history || null;
  }, [donorProfiles, selectedDonorCode]);

  const donorInfo = useMemo(() => {
    if (!selectedDonorCode) return null;
    const profile = donorProfiles.get(selectedDonorCode);
    if (!profile) return null;
    
    const isEligibleByDate = isAfter(new Date(), profile.nextDate);
    
    return {
      latest: profile.latest,
      nextDonationDate: profile.nextDate,
      isEligible: profile.isEligible,
      isEligibleByDate,
      isEligibleByBiology: profile.isEligibleByBiology,
      history: profile.history
    };
  }, [donorProfiles, selectedDonorCode]);

  const exportToCSV = () => {
    const exportData = filteredEligibilityList.map(item => ({
      'Code Donneur': item.code,
      'Nom': item.name,
      'Prénom': item.firstName,
      'Groupe Sanguin': item.bloodGroup,
      'Prochain Don Prévu': format(item.nextDate, 'dd/MM/yyyy'),
      'Jours Restants': item.daysRemaining <= 0 ? 0 : item.daysRemaining,
      'Statut': item.isEligible ? 'Éligible' : 'En attente'
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `convocations_${format(new Date(), 'dd_MM_yyyy')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6">
        <div className="relative">
          <RefreshCw className="w-16 h-16 text-blue-600 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Droplets className="w-6 h-6 text-blue-400 animate-pulse" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-black text-slate-900 uppercase tracking-tighter">Initialisation de la base donneurs</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-xs mx-auto">
            La base de données est volumineuse. Merci de patienter pendant le téléchargement et l'analyse des dossiers...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
              <Droplets size={24} />
            </div>
            <div className="flex gap-2">
              <select 
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="text-[10px] font-black uppercase bg-slate-50 border-none rounded-lg px-2 py-1 outline-none"
              >
                <option value="Tous">Année: Tous</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select 
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="text-[10px] font-black uppercase bg-slate-50 border-none rounded-lg px-2 py-1 outline-none"
              >
                <option value="Tous">Mois: Tous</option>
                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Donneurs sur la période</p>
            <p className="text-3xl font-black text-slate-900 tracking-tighter">{globalStats.total.toLocaleString()}</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => setShowEligibilityList(!showEligibilityList)}
          className={`p-6 rounded-[2rem] border shadow-sm flex flex-col gap-4 cursor-pointer transition-all ${showEligibilityList ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-100 text-slate-900'}`}
        >
          <div className="flex items-center justify-between">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${showEligibilityList ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
              <CheckCircle size={24} />
            </div>
            <ChevronRight size={20} className={`transition-transform ${showEligibilityList ? 'rotate-90' : ''}`} />
          </div>
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${showEligibilityList ? 'text-white/70' : 'text-slate-400'}`}>Donneurs Convocables</p>
            <p className="text-3xl font-black tracking-tighter">{globalStats.eligible.toLocaleString()}</p>
            
            {!showEligibilityList && eligibilityList.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100/50 space-y-1.5">
                {eligibilityList.filter(d => d.isEligible).slice(0, 3).map(d => (
                  <div key={d.code} className="flex items-center justify-between text-[9px] font-bold uppercase tracking-tight text-slate-500">
                    <span>{d.name} {d.firstName}</span>
                    <span className="text-emerald-600">{d.bloodGroup}</span>
                  </div>
                ))}
                {globalStats.eligible > 3 && (
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest pt-1">+{globalStats.eligible - 3} autres...</p>
                )}
              </div>
            )}
            
            <p className={`text-[10px] font-bold uppercase tracking-widest mt-3 ${showEligibilityList ? 'text-white/70' : 'text-slate-400'}`}>
              {showEligibilityList ? 'Masquer la liste' : 'Voir la liste détaillée'}
            </p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4"
        >
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
            <History size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Dons Enregistrés</p>
            <p className="text-3xl font-black text-slate-900 tracking-tighter">{data.length.toLocaleString()}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Toutes périodes confondues</p>
          </div>
        </motion.div>
      </div>

      {/* Eligibility List Section */}
      <AnimatePresence>
        {showEligibilityList && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Liste des Convocations</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {filteredEligibilityList.length} donneurs trouvés
                  </p>
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                  <button
                    onClick={exportToCSV}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all"
                  >
                    <RefreshCw size={14} className="rotate-90" />
                    Exporter CSV
                  </button>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text"
                      placeholder="Rechercher un donneur..."
                      value={eligibilitySearch}
                      onChange={(e) => {
                        setEligibilitySearch(e.target.value);
                        setEligibilityPage(1);
                      }}
                      className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 w-full md:w-64"
                    />
                  </div>
                  <select 
                    value={selectedBloodGroup}
                    onChange={(e) => {
                      setSelectedBloodGroup(e.target.value);
                      setEligibilityPage(1);
                    }}
                    className="px-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-black uppercase outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Tous">Tous les Groupes</option>
                    {bloodGroups.map(([g, count]) => (
                      <option key={g} value={g}>{g} ({count})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto mb-6">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-slate-50">
                      <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 px-4">Donneur</th>
                      <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 text-center">Groupe</th>
                      <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 px-4">Prochain Don</th>
                      <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 px-4">Statut / Jours</th>
                      <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paginatedEligibilityList.map((item) => (
                      <tr key={item.code} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-4">
                          <p className="text-sm font-black text-slate-900 uppercase leading-none mb-1">{item.name} {item.firstName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Code: {item.code}</p>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center justify-center w-10 h-10 bg-rose-50 text-rose-600 rounded-xl text-xs font-black uppercase">
                            {item.bloodGroup}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-xs font-bold text-slate-900">{format(item.nextDate, 'dd/MM/yyyy')}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Délai: 2 mois</p>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1.5">
                            <span className={`text-[9px] font-black uppercase tracking-widest ${item.daysRemaining <= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {item.daysRemaining <= 0 ? 'PRÊT AU DON' : `${item.daysRemaining} JOURS RESTANTS`}
                            </span>
                            <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-500 ${item.daysRemaining <= 0 ? 'bg-emerald-500 w-full' : 'bg-amber-500'}`}
                                style={{ width: item.daysRemaining <= 0 ? '100%' : `${Math.max(5, 100 - (item.daysRemaining / 60 * 100))}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedDonorCode(item.code);
                              setShowEligibilityList(false);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all group/btn"
                          >
                            Détails
                            <ChevronRight size={12} className="group-hover/btn:translate-x-1 transition-transform" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalEligibilityPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4 border-t border-slate-50">
                  <button
                    disabled={eligibilityPage === 1}
                    onClick={() => setEligibilityPage(p => p - 1)}
                    className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    <ChevronRight size={20} className="rotate-180" />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalEligibilityPages) }, (_, i) => {
                      let pageNum = i + 1;
                      if (totalEligibilityPages > 5 && eligibilityPage > 3) {
                        pageNum = eligibilityPage - 2 + i;
                        if (pageNum + 2 > totalEligibilityPages) pageNum = totalEligibilityPages - 4 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setEligibilityPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${eligibilityPage === pageNum ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-400'}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    disabled={eligibilityPage === totalEligibilityPages}
                    onClick={() => setEligibilityPage(p => p + 1)}
                    className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Section */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Gestion Donneur</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Consultez l'aptitude et l'historique des donneurs</p>
          </div>
          
          <div className="relative w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Rechercher par nom ou code..."
              className="block w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <AnimatePresence>
              {searchTerm && filteredDonorList.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
                >
                  {filteredDonorList.map((donor) => (
                    <button
                      key={donor.code}
                      onClick={() => {
                        setSelectedDonorCode(donor.code);
                        setSearchTerm("");
                      }}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                          <User size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-black uppercase text-slate-900">{donor.name} {donor.firstName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Code: {donor.code}</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-300" />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 rounded-[2rem] p-8 flex flex-col items-center gap-6 text-rose-600 shadow-xl shadow-rose-100/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-tighter">Erreur de Synchronisation</p>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{error}</p>
            </div>
          </div>
          <button 
            onClick={fetchData}
            className="flex items-center gap-3 px-8 py-3 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-rose-200 hover:bg-rose-700 hover:scale-105 active:scale-95 transition-all"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Réessayer la connexion
          </button>
        </div>
      )}

      {!selectedDonorCode && !loading && (
        <div className="flex flex-col items-center justify-center py-24 text-slate-300">
          <Search size={64} strokeWidth={1} />
          <p className="text-sm font-bold uppercase tracking-widest mt-4">Recherchez un donneur pour commencer</p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {donorInfo && (
          <motion.div
            key={selectedDonorCode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Donor Profile Card */}
            <div className="lg:col-span-1 space-y-8">
              <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100">
                <div className="flex flex-col items-center text-center mb-8">
                  <div className="w-24 h-24 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white mb-4 shadow-2xl">
                    <User size={40} />
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">
                    {donorInfo.latest.Do_nom} {donorInfo.latest.Do_prenom}
                  </h3>
                  <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest mt-2">
                    Code: {donorInfo.latest.Do_code}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-rose-500 shadow-sm">
                      <Droplets size={18} />
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Groupe Sanguin</p>
                      <p className="text-sm font-black text-slate-900">{donorInfo.latest.Do_groupe || "Inconnu"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-500 shadow-sm">
                      <Phone size={18} />
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Contacts</p>
                      <p className="text-sm font-black text-slate-900">{donorInfo.latest.Do_contact1} {donorInfo.latest.Do_contact2 ? `/ ${donorInfo.latest.Do_contact2}` : ""}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-500 shadow-sm">
                      <User size={18} />
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Sexe</p>
                      <p className="text-sm font-black text-slate-900">{donorInfo.latest.Do_sexe === 'M' ? 'Masculin' : 'Féminin'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Eligibility Status */}
              <div className={`rounded-[2.5rem] p-8 shadow-xl border ${donorInfo.isEligible ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${donorInfo.isEligible ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                    {donorInfo.isEligible ? <CheckCircle size={24} /> : <XCircle size={24} />}
                  </div>
                  <div>
                    <h4 className={`text-lg font-black uppercase tracking-tighter ${donorInfo.isEligible ? 'text-emerald-900' : 'text-rose-900'}`}>
                      {donorInfo.isEligible ? 'Apte au don' : 'Inapte au don'}
                    </h4>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${donorInfo.isEligible ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {donorInfo.isEligible ? 'Donneur convocable' : 'Donneur non convocable'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                    <span className="text-slate-400">Aptitude Biologique</span>
                    <span className={donorInfo.isEligibleByBiology ? 'text-emerald-600' : 'text-rose-600'}>
                      {donorInfo.isEligibleByBiology ? 'OUI' : 'NON'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                    <span className="text-slate-400">Délai respecté</span>
                    <span className={donorInfo.isEligibleByDate ? 'text-emerald-600' : 'text-rose-600'}>
                      {donorInfo.isEligibleByDate ? 'OUI' : 'NON'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* History and Next Appointment */}
            <div className="lg:col-span-2 space-y-8">
              {/* Next Appointment Card */}
              <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-blue-400">
                      <Calendar size={24} />
                    </div>
                    <div>
                      <h4 className="text-xl font-black uppercase tracking-tighter">Prochain RDV de don</h4>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Calculé à partir du dernier don (+2 mois)</p>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-end gap-8">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">Date prévue</p>
                      <p className="text-4xl font-black tracking-tighter">
                        {format(donorInfo.nextDonationDate, 'dd MMMM yyyy', { locale: fr })}
                      </p>
                    </div>
                    <div className="flex-1">
                      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                        <div className="flex items-center gap-3">
                          <Clock size={16} className="text-blue-400" />
                          <p className="text-[10px] font-bold uppercase tracking-widest">
                            {donorInfo.isEligibleByDate 
                              ? "Le délai de 2 mois est déjà passé" 
                              : `Encore quelques jours avant le prochain don`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Donation History */}
              <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-900">
                    <History size={24} />
                  </div>
                  <div>
                    <h4 className="text-xl font-black uppercase tracking-tighter text-slate-900">Historique des dons</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{donorInfo.history.length} dons enregistrés</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left border-b border-slate-50">
                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 px-4">Date</th>
                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 px-4">N° Don</th>
                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 px-4">Site</th>
                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 px-4">Type</th>
                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 px-4">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {donorInfo.history.map((record, idx) => (
                        <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-4">
                            <p className="text-sm font-black text-slate-900">{record.Co_dcollecte}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{record.Mois} {record.Co_annee}</p>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-xs font-bold text-slate-600">{record.Co_numdo}</span>
                          </td>
                          <td className="py-4 px-4">
                            <p className="text-xs font-bold text-slate-900">{record.Si_preleve}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Lieu: {record.Li_code}</p>
                          </td>
                          <td className="py-4 px-4">
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                              {record.Py_code}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${record.Co_collecte === 'O' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                                {record.Co_collecte === 'O' ? 'Réalisé' : 'Échec'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
