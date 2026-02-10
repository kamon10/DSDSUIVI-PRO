
import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, User, Mail, Building2, UserPlus, Trash2, CheckCircle2, AlertCircle, RefreshCw, Search, Filter, Shield, UserCog, MoreVertical, Image as ImageIcon, Type, Sparkles, Save, RotateCcw, Upload, Phone, MapPin, Edit3 } from 'lucide-react';
import { fetchUsers, saveRecordToSheet } from '../services/googleSheetService';
import { User as UserType, UserRole } from '../types';
import { SITES_DATA } from '../constants';

interface AdminUserManagementProps {
  scriptUrl: string;
  onBrandingChange: (branding: {logo: string, hashtag: string}) => void;
  currentBranding: {logo: string, hashtag: string};
}

export const AdminUserManagement: React.FC<AdminUserManagementProps> = ({ scriptUrl, onBrandingChange, currentBranding }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'branding' | 'sites'>('users');
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [siteSearchTerm, setSiteSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("ALL");
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [editingSite, setEditingSite] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  // Branding
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
      console.error("Erreur chargement:", err);
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
    return SITES_DATA.filter(s => 
      s.name.toLowerCase().includes(siteSearchTerm.toLowerCase()) || 
      s.code.toLowerCase().includes(siteSearchTerm.toLowerCase()) ||
      s.manager.toLowerCase().includes(siteSearchTerm.toLowerCase())
    );
  }, [siteSearchTerm]);

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);
    try {
      await saveRecordToSheet(scriptUrl, { type: 'UPDATE_USER', ...editingUser });
      setStatus({ type: 'success', msg: `Utilisateur mis à jour.` });
      setEditingUser(null);
      await loadUsers();
    } catch (err) {
      setStatus({ type: 'error', msg: "Échec mise à jour." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSite) return;
    setSubmitting(true);
    try {
      await saveRecordToSheet(scriptUrl, { type: 'UPDATE_SITE_INFO', ...editingSite });
      setStatus({ type: 'success', msg: `Informations du site ${editingSite.name} mises à jour.` });
      setEditingSite(null);
      // Idéalement on rafraîchirait la liste ici si elle venait d'une API
    } catch (err) {
      setStatus({ type: 'error', msg: "Échec de la modification." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size <= 150000) {
      const reader = new FileReader();
      reader.onloadend = () => setTempLogo(reader.result as string);
      reader.readAsDataURL(file);
    } else if (file) {
      setStatus({ type: 'error', msg: "Image trop lourde (> 150ko)." });
    }
  };

  const handleSaveBranding = async () => {
    setSubmitting(true);
    try {
      await saveRecordToSheet(scriptUrl, { type: 'UPDATE_BRANDING', logo: tempLogo, hashtag: tempHashtag });
      onBrandingChange({ logo: tempLogo, hashtag: tempHashtag });
      setStatus({ type: 'success', msg: "Branding synchronisé." });
    } catch (err) {
      setStatus({ type: 'error', msg: "Erreur branding." });
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'SUPERADMIN': return 'bg-red-600 text-white';
      case 'ADMIN': return 'bg-slate-900 text-white';
      case 'PRES': return 'bg-blue-600 text-white';
      case 'AGENT': return 'bg-emerald-500 text-white';
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
              <p className="text-white/40 font-black uppercase tracking-[0.4em] text-[9px]">Gestion des privilèges, de l'identité et des structures</p>
            </div>
          </div>
          
          <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-xl">
             <button onClick={() => setActiveTab('users')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-white text-slate-900 shadow-xl' : 'text-white/40 hover:text-white'}`}>Agents</button>
             <button onClick={() => setActiveTab('sites')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'sites' ? 'bg-white text-slate-900 shadow-xl' : 'text-white/40 hover:text-white'}`}>Structures</button>
             <button onClick={() => setActiveTab('branding')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'branding' ? 'bg-white text-slate-900 shadow-xl' : 'text-white/40 hover:text-white'}`}>Branding</button>
          </div>
        </div>
      </div>

      {activeTab === 'users' && (
        <>
          <div className="flex flex-col lg:flex-row gap-6 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 items-center justify-between">
             <div className="relative flex-1 w-full lg:w-auto">
                <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Rechercher un agent..." className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none" />
             </div>
             <div className="flex items-center gap-4 w-full lg:w-auto">
                <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-[10px] font-black uppercase outline-none cursor-pointer">
                  <option value="ALL">Tous les rôles</option>
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <button onClick={loadUsers} className="p-3 bg-slate-900 text-white rounded-xl shadow-lg"><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /></button>
             </div>
          </div>
          <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden">
            <table className="w-full">
              <thead><tr className="bg-slate-50 border-b"><th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase">Identité</th><th className="px-8 py-6 text-center text-[10px] font-black text-slate-400 uppercase">Rôle</th><th className="px-8 py-6 text-center text-[10px] font-black text-slate-400 uppercase">Rattachement</th><th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase">Actions</th></tr></thead>
              <tbody className="divide-y">
                {loading ? <tr><td colSpan={4} className="py-20 text-center opacity-30">Chargement...</td></tr> : filteredUsers.map((u, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-6"><p className="text-[12px] font-black uppercase">{u.nom} {u.prenoms}</p><p className="text-[10px] text-slate-400">{u.email}</p></td>
                    <td className="px-8 py-6 text-center"><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${getRoleBadge(u.role)}`}>{u.role}</span></td>
                    <td className="px-8 py-6 text-center text-[10px] font-black uppercase">{u.site || u.region || 'NATIONAL'}</td>
                    <td className="px-8 py-6 text-right"><button onClick={() => setEditingUser(u)} className="p-2 border rounded-lg text-slate-400 hover:text-slate-900"><UserCog size={18} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'sites' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
             <div className="relative">
                <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
                <input value={siteSearchTerm} onChange={(e) => setSiteSearchTerm(e.target.value)} placeholder="Filtrer les structures (Nom, Code, Responsable)..." className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none" />
             </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
             {filteredSites.map((site, idx) => (
               <div key={idx} className="bg-white rounded-[2.5rem] p-8 shadow-warm border border-slate-100 hover:border-red-200 transition-all group">
                  <div className="flex justify-between items-start mb-6">
                     <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-red-50 group-hover:text-red-600 transition-colors shadow-inner"><Building2 size={24} /></div>
                     <button onClick={() => setEditingSite(site)} className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Edit3 size={18}/></button>
                  </div>
                  <div className="space-y-4">
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{site.code} • {site.region}</p>
                        <h4 className="text-sm font-black text-slate-800 uppercase leading-tight">{site.name}</h4>
                     </div>
                     <div className="pt-4 border-t border-slate-50 space-y-2">
                        <div className="flex items-center gap-2"><User size={12} className="text-slate-300"/><span className="text-[10px] font-bold text-slate-600 uppercase">{site.manager}</span></div>
                        <div className="flex items-center gap-2"><Phone size={12} className="text-slate-300"/><span className="text-[10px] font-bold text-slate-600">{site.phone}</span></div>
                        <div className="flex items-center gap-2"><Mail size={12} className="text-slate-300"/><span className="text-[10px] font-bold text-slate-600 truncate">{site.email}</span></div>
                     </div>
                  </div>
               </div>
             ))}
          </div>
        </div>
      )}

      {activeTab === 'branding' && (
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in slide-in-from-bottom-4">
           <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-8"><ImageIcon size={32}/></div>
              <h3 className="text-xl font-black uppercase mb-10">Logo App</h3>
              <div className="w-48 h-48 rounded-[2.5rem] border-2 border-dashed border-slate-200 overflow-hidden mb-8 relative bg-slate-50">
                 <img src={tempLogo} alt="Logo" className="w-full h-full object-contain p-6 relative z-10" />
                 <label className="absolute inset-0 bg-slate-900/60 opacity-0 hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity z-20"><Upload size={24} className="text-white"/><input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" /></label>
              </div>
           </div>
           <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 flex flex-col justify-between">
              <div>
                 <h3 className="text-xl font-black uppercase mb-6">Hashtag Global</h3>
                 <input value={tempHashtag} onChange={(e) => setTempHashtag(e.target.value.toUpperCase())} className="w-full px-8 py-5 bg-slate-50 border rounded-2xl font-black outline-none" />
              </div>
              <div className="pt-10 flex gap-4">
                 <button onClick={handleSaveBranding} disabled={submitting} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-2">
                    {submitting ? <RefreshCw className="animate-spin" /> : <Save size={14} />} Synchroniser
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Modal Edition Utilisateur */}
      {editingUser && (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-4">
           <div className="bg-white rounded-[3.5rem] max-w-lg w-full shadow-3xl overflow-hidden animate-in zoom-in-95">
              <div className="bg-slate-900 p-8 text-white flex justify-between items-center"><h3 className="text-2xl font-black uppercase tracking-tighter">Profil Agent</h3><button onClick={() => setEditingUser(null)}>×</button></div>
              <form onSubmit={handleUpdateUser} className="p-10 space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">Rôle</label><select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})} className="w-full bg-slate-50 border p-4 rounded-xl text-xs font-black uppercase">{roles.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">Région (PRES)</label><select value={editingUser.region || ""} onChange={e => setEditingUser({...editingUser, region: e.target.value})} className="w-full bg-slate-50 border p-4 rounded-xl text-xs font-black uppercase"><option value="">Aucune</option>{regions.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                 </div>
                 <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">Site (AGENT)</label><select value={editingUser.site || ""} onChange={e => setEditingUser({...editingUser, site: e.target.value})} className="w-full bg-slate-50 border p-4 rounded-xl text-xs font-black uppercase"><option value="">Tous les sites</option>{SITES_DATA.map(s => <option key={s.code} value={s.name}>{s.name}</option>)}</select></div>
                 <button disabled={submitting} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">{submitting ? <RefreshCw className="animate-spin" /> : <Shield size={18} />} Enregistrer</button>
              </form>
           </div>
        </div>
      )}

      {/* Modal Edition Site */}
      {editingSite && (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-4">
           <div className="bg-white rounded-[3.5rem] max-w-lg w-full shadow-3xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="bg-red-600 p-8 text-white flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Building2 size={24}/></div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Édition Structure</h3>
                 </div>
                 <button onClick={() => setEditingSite(null)} className="text-white hover:rotate-90 transition-transform text-2xl font-black">×</button>
              </div>
              <form onSubmit={handleUpdateSite} className="p-10 space-y-6">
                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Code structure</p>
                    <p className="text-lg font-black text-slate-900 uppercase">{editingSite.name} ({editingSite.code})</p>
                 </div>
                 
                 <div className="space-y-4">
                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Responsable du Site</label>
                       <div className="relative">
                          <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"/>
                          <input required value={editingSite.manager} onChange={e => setEditingSite({...editingSite, manager: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-slate-50 border rounded-xl text-xs font-bold outline-none focus:ring-4 ring-red-50 transition-all"/>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Téléphone</label>
                          <div className="relative">
                             <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"/>
                             <input required value={editingSite.phone} onChange={e => setEditingSite({...editingSite, phone: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-slate-50 border rounded-xl text-xs font-bold outline-none focus:ring-4 ring-red-50 transition-all"/>
                          </div>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Email</label>
                          <div className="relative">
                             <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"/>
                             <input required type="email" value={editingSite.email} onChange={e => setEditingSite({...editingSite, email: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-slate-50 border rounded-xl text-xs font-bold outline-none focus:ring-4 ring-red-50 transition-all"/>
                          </div>
                       </div>
                    </div>
                 </div>

                 <button disabled={submitting} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 mt-8">
                    {submitting ? <RefreshCw className="animate-spin" /> : <Save size={18} />} Mettre à jour la structure
                 </button>
              </form>
           </div>
        </div>
      )}

      {status && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[400] px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-10 ${status.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-600 text-white'}`}>
           {status.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
           <p className="text-[11px] font-black uppercase">{status.msg}</p>
           <button onClick={() => setStatus(null)} className="ml-4 opacity-50">×</button>
        </div>
      )}
    </div>
  );
};
