import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, User, Mail, Building2, UserPlus, Trash2, CheckCircle2, AlertCircle, RefreshCw, Search, Filter, Shield, UserCog, MoreVertical, Image as ImageIcon, Type, Sparkles, Save, RotateCcw, Upload, Phone, Edit3, MapPin } from 'lucide-react';
import { fetchUsers, saveRecordToSheet } from '../services/googleSheetService';
import { User as UserType, UserRole } from '../types';
import { SITES_DATA } from '../constants';

interface AdminUserManagementProps {
  scriptUrl: string;
  onBrandingChange: (branding: {logo: string, hashtag: string}) => void;
  currentBranding: {logo: string, hashtag: string};
}

export const AdminUserManagement: React.FC<AdminUserManagementProps> = ({ scriptUrl, onBrandingChange, currentBranding }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'sites' | 'branding'>('users');
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("ALL");
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [editingSite, setEditingSite] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  // --- Branding State ---
  const [tempHashtag, setTempHashtag] = useState(currentBranding.hashtag);
  const [tempLogo, setTempLogo] = useState(currentBranding.logo);

  const roles: UserRole[] = ['AGENT', 'PRES', 'ADMIN', 'SUPERADMIN'];
  const regions = useMemo(() => ["TOUS LES PRES", ...Array.from(new Set(SITES_DATA.map(s => s.region))).sort()], []);

  const loadUsers = async () => {
    if (!scriptUrl) return;
    setLoading(true);
    try {
      const data = await fetchUsers(scriptUrl);
      setUsers(data);
    } catch (err) {
      console.error("Erreur chargement utilisateurs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, [scriptUrl]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = (u.nom + " " + u.prenoms + " " + u.email).toLowerCase().includes(searchTerm.toLowerCase());
      const matchRole = filterRole === "ALL" || u.role === filterRole;
      return matchSearch && matchRole;
    });
  }, [users, searchTerm, filterRole]);

  const filteredSites = useMemo(() => {
    if (activeTab !== 'sites') return [];
    return SITES_DATA.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (s.manager && s.manager.toLowerCase().includes(searchTerm.toLowerCase())) ||
      s.code.includes(searchTerm)
    );
  }, [activeTab, searchTerm]);

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSubmitting(true);
    try {
      const payload = {
        type: 'UPDATE_USER',
        ...editingUser
      };
      await saveRecordToSheet(scriptUrl, payload);
      setStatus({ type: 'success', msg: `Utilisateur ${editingUser.nom} mis à jour avec succès.` });
      setEditingUser(null);
      await loadUsers();
    } catch (err) {
      setStatus({ type: 'error', msg: "Échec de la mise à jour." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSite) return;

    setSubmitting(true);
    try {
      const payload = {
        type: 'UPDATE_SITE_METADATA',
        code: editingSite.code,
        name: editingSite.name,
        manager: editingSite.manager,
        email: editingSite.email,
        phone: editingSite.phone
      };
      await saveRecordToSheet(scriptUrl, payload);
      setStatus({ type: 'success', msg: `Site ${editingSite.name} mis à jour. Les modifications seront effectives après rafraîchissement global.` });
      setEditingSite(null);
    } catch (err) {
      setStatus({ type: 'error', msg: "Échec de la mise à jour du site." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 150000) {
        setStatus({ type: 'error', msg: "Image trop lourde. Veuillez utiliser un PNG compressé (< 150ko)." });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBranding = async () => {
    setSubmitting(true);
    try {
      const payload = {
        type: 'UPDATE_BRANDING',
        logo: tempLogo,
        hashtag: tempHashtag
      };
      await saveRecordToSheet(scriptUrl, payload);
      onBrandingChange({ logo: tempLogo, hashtag: tempHashtag });
      setStatus({ type: 'success', msg: "Identité visuelle (PNG) synchronisée globalement." });
    } catch (err) {
      setStatus({ type: 'error', msg: "Erreur lors de la synchronisation globale." });
    } finally {
      setSubmitting(false);
    }
  };

  const resetBranding = async () => {
    setSubmitting(true);
    try {
      const defaultLogo = './assets/logo.png';
      const defaultHashtag = '#DONSANG_CI';
      const payload = { type: 'UPDATE_BRANDING', logo: defaultLogo, hashtag: defaultHashtag };
      await saveRecordToSheet(scriptUrl, payload);
      setTempLogo(defaultLogo);
      setTempHashtag(defaultHashtag);
      onBrandingChange({ logo: defaultLogo, hashtag: defaultHashtag });
      setStatus({ type: 'success', msg: "Identité par défaut restaurée." });
    } catch (err) {
      setStatus({ type: 'error', msg: "Erreur lors de la restauration." });
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'SUPERADMIN': return 'bg-red-600 text-white shadow-red-100';
      case 'ADMIN': return 'bg-slate-900 text-white shadow-slate-200';
      case 'PRES': return 'bg-blue-600 text-white shadow-blue-100';
      case 'AGENT': return 'bg-emerald-500 text-white shadow-emerald-100';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-12">
      <div className="bg-[#0f172a] rounded-[3.5rem] p-10 lg:p-14 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 blur-[120px] rounded-full -mr-32 -mt-32"></div>
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="flex items-center gap-8">
            <div className="w-16 h-16 lg:w-20 lg:h-20 bg-red-600 rounded-3xl flex items-center justify-center shadow-xl shadow-red-900/40">
              <ShieldCheck size={36} />
            </div>
            <div>
              <h2 className="text-3xl lg:text-4xl font-black uppercase tracking-tighter leading-none mb-3">Centre de Commandement</h2>
              <p className="text-white/40 font-black uppercase tracking-[0.4em] text-[9px]">Gestion des privilèges et de l'identité système</p>
            </div>
          </div>
          
          <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-xl">
             <button onClick={() => setActiveTab('users')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-white text-slate-900 shadow-xl' : 'text-white/40 hover:text-white'}`}>Agents</button>
             <button onClick={() => setActiveTab('sites')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'sites' ? 'bg-white text-slate-900 shadow-xl' : 'text-white/40 hover:text-white'}`}>Sites</button>
             <button onClick={() => setActiveTab('branding')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'branding' ? 'bg-white text-slate-900 shadow-xl' : 'text-white/40 hover:text-white'}`}>Branding</button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 items-center justify-between">
         <div className="relative flex-1 w-full lg:w-auto">
            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
            <input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={activeTab === 'users' ? "Rechercher un agent..." : "Rechercher un site ou responsable..."}
              className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 ring-red-50"
            />
         </div>
         {activeTab === 'users' && (
           <div className="flex items-center gap-4 w-full lg:w-auto">
              <div className="flex items-center gap-2 px-5 py-2 bg-slate-100 rounded-full">
                 <Filter size={14} className="text-slate-400" />
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rôle :</span>
              </div>
              <select 
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer"
              >
                <option value="ALL">Tous les rôles</option>
                {roles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <button onClick={loadUsers} className="p-3 bg-slate-900 text-white rounded-xl shadow-lg hover:bg-black transition-all">
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              </button>
           </div>
         )}
      </div>

      {activeTab === 'users' ? (
        <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                 <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Identité</th>
                 <th className="px-8 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Rôle Actuel</th>
                 <th className="px-8 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Rattachement</th>
                 <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={4} className="py-20 text-center text-slate-400 italic">Chargement des comptes...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={4} className="py-20 text-center text-slate-400 italic">Aucun utilisateur trouvé.</td></tr>
              ) : filteredUsers.map((u, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-red-50 group-hover:text-red-600 transition-all">
                           <User size={20} />
                        </div>
                        <div>
                           <p className="text-[12px] font-black text-slate-800 uppercase tracking-tight">{u.nom} {u.prenoms}</p>
                           <p className="text-[10px] font-bold text-slate-400">{u.email}</p>
                        </div>
                     </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                     <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${getRoleBadge(u.role)}`}>
                        {u.role}
                     </span>
                  </td>
                  <td className="px-8 py-6 text-center">
                     <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-slate-700 uppercase">{u.site || u.region || 'NATIONAL'}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{u.fonction}</span>
                     </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                     <button onClick={() => setEditingUser(u)} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-900 hover:border-slate-900 transition-all shadow-sm">
                        <UserCog size={18} />
                     </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'sites' ? (
        <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                 <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Site de Prélèvement</th>
                 <th className="px-8 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsable</th>
                 <th className="px-8 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
                 <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredSites.map((s, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-all">
                           <Building2 size={20} />
                        </div>
                        <div>
                           <p className="text-[12px] font-black text-slate-800 uppercase tracking-tight">{s.name}</p>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{s.region}</p>
                        </div>
                     </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                     <div className="flex flex-col items-center">
                        <span className="text-[11px] font-black text-slate-700 uppercase leading-none mb-1">{s.manager || "NON ASSIGNÉ"}</span>
                        <span className="text-[8px] font-bold text-slate-300 uppercase">RESPONSABLE SITE</span>
                     </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                     <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1.5"><Phone size={10} className="text-emerald-500" /> {s.phone || "---"}</span>
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5"><Mail size={10} className="text-blue-500" /> {s.email || "---"}</span>
                     </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                     <button onClick={() => setEditingSite(s)} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-600 transition-all shadow-sm">
                        <Edit3 size={18} />
                     </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-bottom-4 duration-500">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 flex flex-col items-center text-center">
                 <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-8"><ImageIcon size={32}/></div>
                 <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 mb-2">Logo de l'Application</h3>
                 <p className="text-xs text-slate-400 mb-10 font-medium">Format recommandé : <span className="text-blue-600 font-bold">PNG transparent</span> ou SVG.</p>
                 <div className="w-48 h-48 rounded-[2.5rem] border-2 border-dashed border-slate-200 overflow-hidden mb-8 group relative bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
                    <div className="absolute inset-0 bg-white opacity-40"></div>
                    <img src={tempLogo} alt="Logo Preview" className="w-full h-full object-contain p-6 transition-transform group-hover:scale-110 relative z-10" />
                    <label className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity backdrop-blur-sm z-20">
                       <Upload size={24} className="text-white mb-2" />
                       <span className="text-white text-[10px] font-black uppercase tracking-widest">Choisir un PNG</span>
                       <input type="file" accept="image/png, image/svg+xml, image/jpeg" onChange={handleLogoUpload} className="hidden" />
                    </label>
                 </div>
              </div>
              <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 flex flex-col justify-between">
                 <div>
                    <div className="w-16 h-16 bg-red-600 text-white rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-red-900/20"><Type size={32}/></div>
                    <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 mb-2">Slogan & Hashtag</h3>
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Texte du slogan</label>
                       <input value={tempHashtag} onChange={(e) => setTempHashtag(e.target.value.toUpperCase())} placeholder="#DONSANG_CI" className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-black text-slate-800 outline-none focus:ring-4 ring-red-50" />
                    </div>
                 </div>
                 <div className="pt-10 flex gap-4">
                    <button onClick={resetBranding} disabled={submitting} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"><RotateCcw size={14} /> Réinitialiser</button>
                    <button onClick={handleSaveBranding} disabled={submitting} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl hover:bg-black active:scale-95 transition-all">{submitting ? <RefreshCw className="animate-spin" /> : <Save size={14} />} Sync Global</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Modals d'édition */}
      {editingUser && (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-4">
           <div className="bg-white rounded-[3.5rem] max-w-lg w-full shadow-3xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg"><UserCog size={24} /></div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Affectation Agent</h3>
                 </div>
                 <button onClick={() => setEditingUser(null)} className="text-white/40 hover:text-white transition-colors">Fermer</button>
              </div>
              <form onSubmit={handleUpdateUser} className="p-10 space-y-6">
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Agent</label>
                    <div className="px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 font-black text-slate-800 uppercase text-xs">{editingUser.nom} {editingUser.prenoms}</div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Rôle</label>
                       <select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-black uppercase tracking-widest outline-none">
                         {roles.map(r => <option key={r} value={r}>{r}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Région (PRES)</label>
                       <select value={editingUser.region || ""} onChange={e => setEditingUser({...editingUser, region: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-black uppercase tracking-widest outline-none">
                         <option value="">Aucune</option>
                         {regions.map(r => <option key={r} value={r}>{r}</option>)}
                       </select>
                    </div>
                 </div>
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Site de rattachement</label>
                    <select value={editingUser.site || ""} onChange={e => setEditingUser({...editingUser, site: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-black uppercase tracking-widest outline-none cursor-pointer">
                      <option value="">Tous les sites</option>
                      <option value="DIRECTION GENERALE">DIRECTION GENERALE</option>
                      {SITES_DATA.map(s => <option key={s.code} value={s.name}>{s.name}</option>)}
                    </select>
                 </div>
                 <button disabled={submitting} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-xl mt-6 active:scale-95">{submitting ? <RefreshCw className="animate-spin" /> : <Shield size={18} />} Enregistrer l'affectation</button>
              </form>
           </div>
        </div>
      )}

      {editingSite && (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-4">
           <div className="bg-white rounded-[3.5rem] max-w-lg w-full shadow-3xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="bg-blue-900 p-8 text-white flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg"><Edit3 size={24} /></div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Responsable de Site</h3>
                 </div>
                 <button onClick={() => setEditingSite(null)} className="text-white/40 hover:text-white transition-colors">Fermer</button>
              </div>
              <form onSubmit={handleUpdateSite} className="p-10 space-y-6">
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Site</label>
                    <div className="px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 font-black text-blue-900 uppercase text-xs">{editingSite.name} ({editingSite.code})</div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Nom du Responsable (AFFECTATION)</label>
                    <input value={editingSite.manager || ""} onChange={e => setEditingSite({...editingSite, manager: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-black uppercase outline-none focus:ring-4 ring-blue-50" placeholder="Nom et Prénoms" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Téléphone</label>
                       <input value={editingSite.phone || ""} onChange={e => setEditingSite({...editingSite, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-black outline-none focus:ring-4 ring-blue-50" placeholder="00 00 00 00 00" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Email</label>
                       <input value={editingSite.email || ""} onChange={e => setEditingSite({...editingSite, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-black outline-none focus:ring-4 ring-blue-50" placeholder="exemple@cntsci.org" />
                    </div>
                 </div>
                 <button disabled={submitting} className="w-full bg-blue-900 text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-blue-800 transition-all flex items-center justify-center gap-3 shadow-xl mt-6 active:scale-95">{submitting ? <RefreshCw className="animate-spin" /> : <Save size={18} />} Valider l'affectation</button>
              </form>
           </div>
        </div>
      )}

      {status && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[400] px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-10 duration-500 ${status.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-600 text-white'}`}>
           {status.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
           <p className="text-[11px] font-black uppercase tracking-widest">{status.msg}</p>
           <button onClick={() => setStatus(null)} className="ml-4 opacity-50 hover:opacity-100">×</button>
        </div>
      )}
    </div>
  );
};
