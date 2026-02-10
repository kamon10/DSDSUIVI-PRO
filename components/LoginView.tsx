
import React, { useState, useEffect } from 'react';
import { User, Mail, Building2, Briefcase, Send, X, ShieldCheck, AlertCircle, RefreshCw, UserCheck } from 'lucide-react';
import { SITES_DATA } from '../constants';
import { fetchUsers, saveRecordToSheet } from '../services/googleSheetService';
import { User as UserType } from '../types';

interface LoginViewProps {
  onClose: () => void;
  onLogin: (user: UserType) => void;
  scriptUrl: string;
  sheetUrl: string;
  // Added sites to props definition to fix type error in App.tsx
  sites: any[];
}

// Updated component signature to receive sites prop
export const LoginView: React.FC<LoginViewProps> = ({ onClose, onLogin, scriptUrl, sheetUrl, sites }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [formData, setFormData] = useState({
    nom: '',
    prenoms: '',
    email: '',
    fonction: '',
    site: ''
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) return;

    setStatus('loading');
    try {
      const users = await fetchUsers(scriptUrl);
      const user = users.find(u => u.email.toLowerCase() === formData.email.toLowerCase());

      if (user) {
        localStorage.setItem('dsd_user', JSON.stringify(user));
        onLogin(user);
        onClose();
      } else {
        setStatus('error');
        setErrorMessage("Utilisateur non trouvé. Si vous n'avez pas de compte, veuillez vous inscrire pour validation par l'administrateur.");
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage("Erreur de connexion aux services.");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scriptUrl) {
      setStatus('error');
      setErrorMessage("Configuration système manquante (Script URL).");
      return;
    }

    setStatus('loading');

    try {
      const payload = {
        type: 'USER_REGISTRATION',
        nom: formData.nom,
        prenoms: formData.prenoms,
        email: formData.email,
        fonction: formData.fonction,
        site: formData.site,
        date: new Date().toLocaleDateString('fr-FR')
      };

      await saveRecordToSheet(scriptUrl, payload);
      setStatus('success');
    } catch (err) {
      console.error("Erreur Inscription:", err);
      setStatus('error');
      setErrorMessage("Échec de l'envoi de la demande d'inscription.");
    }
  };

  if (status === 'success') {
    return (
      <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-4">
        <div className="bg-white rounded-[3rem] p-10 lg:p-14 max-w-md w-full shadow-2xl border border-slate-100 text-center animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl">
             <UserCheck size={40} />
          </div>
          <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-4">Demande Envoyée</h3>
          <p className="text-slate-500 text-sm font-medium mb-10 leading-relaxed">
            Votre demande d'accès a été transmise au SuperAdmin du CNTS. Vous recevrez une notification dès validation de vos privilèges.
          </p>
          <button onClick={onClose} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all">Terminer</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/40 backdrop-blur-xl flex items-center justify-center p-4">
       <div className="bg-white rounded-[3.5rem] max-w-2xl w-full shadow-3xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col lg:flex-row">
          {/* Sidebar */}
          <div className="lg:w-1/3 bg-slate-900 p-10 text-white flex flex-col justify-between relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/20 blur-2xl rounded-full -mr-16 -mt-16"></div>
             <div className="relative z-10">
                <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center mb-8 shadow-lg shadow-red-900/40">
                   <ShieldCheck size={24} />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tighter leading-none mb-4">Portail Sécurisé</h3>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] leading-relaxed">Accès exclusif aux agents habilités du CNTS CI.</p>
             </div>
             
             <div className="relative z-10 pt-10">
                <div className="flex flex-col gap-2">
                   <button onClick={() => setMode('login')} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-left transition-all ${mode === 'login' ? 'bg-white text-slate-900 shadow-xl' : 'text-white/40 hover:text-white'}`}>Connexion</button>
                   <button onClick={() => setMode('register')} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-left transition-all ${mode === 'register' ? 'bg-white text-slate-900 shadow-xl' : 'text-white/40 hover:text-white'}`}>Inscription</button>
                </div>
             </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-10 lg:p-14 relative">
             <button onClick={onClose} className="absolute top-8 right-8 text-slate-300 hover:text-slate-900 transition-colors"><X size={24} /></button>
             
             <div className="mb-10">
                <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">{mode === 'login' ? 'Bienvenue' : 'Nouveau Compte'}</h2>
                <p className="text-slate-400 text-xs font-medium mt-1">{mode === 'login' ? 'Entrez vos identifiants pour accéder au cockpit.' : 'Remplissez le formulaire pour demander un accès.'}</p>
             </div>

             <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-6">
                {mode === 'register' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom</label>
                       <div className="relative group">
                          <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-red-500 transition-colors" />
                          <input 
                            name="lastname"
                            autoComplete="family-name"
                            required 
                            value={formData.nom} 
                            onChange={e => setFormData({...formData, nom: e.target.value})} 
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 ring-red-50 transition-all" 
                          />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Prénoms</label>
                       <div className="relative group">
                          <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-red-500 transition-colors" />
                          <input 
                            name="firstname"
                            autoComplete="given-name"
                            required 
                            value={formData.prenoms} 
                            onChange={e => setFormData({...formData, prenoms: e.target.value})} 
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 ring-red-50 transition-all" 
                          />
                       </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Professionnel</label>
                   <div className="relative group">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-red-500 transition-colors" />
                      <input 
                        name="email"
                        autoComplete="email"
                        type="email" 
                        required 
                        value={formData.email} 
                        onChange={e => setFormData({...formData, email: e.target.value})} 
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 ring-red-50 transition-all" 
                      />
                   </div>
                </div>

                {mode === 'register' && (
                  <>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fonction</label>
                       <div className="relative group">
                          <Briefcase size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-red-500 transition-colors" />
                          <input 
                            name="jobtitle"
                            autoComplete="organization-title"
                            required 
                            value={formData.fonction} 
                            onChange={e => setFormData({...formData, fonction: e.target.value})} 
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 ring-red-50 transition-all" 
                          />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Site de Rattachement</label>
                       <div className="relative group">
                          <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-red-500 transition-colors" />
                          <select 
                            name="site"
                            required 
                            value={formData.site} 
                            onChange={e => setFormData({...formData, site: e.target.value})} 
                            className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black uppercase outline-none focus:ring-4 ring-red-50 appearance-none transition-all cursor-pointer"
                          >
                             <option value="">Sélectionner un site...</option>
                             <option value="DIRECTION GENERALE">DIRECTION GENERALE</option>
                             {/* Replaced static SITES_DATA with passed sites prop */}
                             {sites.map(s => <option key={s.code} value={s.name}>{s.name}</option>)}
                          </select>
                          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                       </div>
                    </div>
                  </>
                )}

                {status === 'error' && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase animate-in slide-in-from-top-2">
                     <AlertCircle size={16} className="shrink-0" />
                     <p>{errorMessage}</p>
                  </div>
                )}

                <button 
                  disabled={status === 'loading'}
                  type="submit" 
                  className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
                >
                   {status === 'loading' ? <RefreshCw className="animate-spin" size={18} /> : <Send size={18} />}
                   {mode === 'login' ? 'Accéder au cockpit' : "Envoyer la demande"}
                </button>
             </form>
          </div>
       </div>
    </div>
  );
};

const ChevronDown = ({ size, className }: { size: number, className: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m6 9 6 6 6-6"/>
  </svg>
);
