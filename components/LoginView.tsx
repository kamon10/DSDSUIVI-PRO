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
}

export const LoginView: React.FC<LoginViewProps> = ({ onClose, onLogin, scriptUrl, sheetUrl }) => {
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

      console.log("Tentative d'inscription:", payload);
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
            Votre demande d'accès a été transmise au SuperAdmin du CNTS. Vous recevrez un mail dès que votre profil sera validé et votre rôle (AGENT, PRES ou ADMIN) attribué.
          </p>
          <button onClick={onClose} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all">
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-white rounded-[3.5rem] max-w-lg w-full shadow-3xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="bg-slate-900 p-10 text-white relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/20 blur-[60px] rounded-full"></div>
          <button onClick={onClose} className="absolute top-8 right-8 text-white/30 hover:text-white transition-colors">
            <X size={24} />
          </button>
          <div className="flex items-center gap-6 relative z-10">
            <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-xl shadow-red-900/40">
              <ShieldCheck size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter">Accès Sécurisé</h2>
              <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mt-1">Cockpit Professionnel CNTS CI</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-10 lg:p-12">
          <div className="flex gap-4 p-1.5 bg-slate-100 rounded-2xl mb-10">
             <button onClick={() => setMode('login')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Connexion</button>
             <button onClick={() => setMode('register')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>S'inscrire</button>
          </div>

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-6">
            {mode === 'register' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom</label>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input required value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 ring-red-50" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Prénoms</label>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input required value={formData.prenoms} onChange={e => setFormData({...formData, prenoms: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 ring-red-50" />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Professionnel</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 ring-red-50" placeholder="exemple@cntsci.org" />
              </div>
            </div>

            {mode === 'register' && (
              <>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fonction</label>
                  <div className="relative">
                    <Briefcase size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input required value={formData.fonction} onChange={e => setFormData({...formData, fonction: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 ring-red-50" placeholder="ex: Responsable Site" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Site de Rattachement</label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <select required value={formData.site} onChange={e => setFormData({...formData, site: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black uppercase outline-none focus:ring-4 ring-red-50 appearance-none">
                      <option value="">Sélectionner un site...</option>
                      <option value="DIRECTION GENERALE">DIRECTION GENERALE</option>
                      {SITES_DATA.map(s => <option key={s.code} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
              </>
            )}

            {status === 'error' && (
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase flex items-center gap-3">
                 <AlertCircle size={18} /> {errorMessage}
              </div>
            )}

            <button disabled={status === 'loading'} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-2xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 mt-4">
              {status === 'loading' ? <RefreshCw className="animate-spin" /> : <Send size={18} />}
              {mode === 'login' ? "S'identifier" : "Soumettre la demande"}
            </button>
          </form>
          
          <div className="mt-8 pt-8 border-t border-slate-100 text-center">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
               {mode === 'login' ? "Première connexion ?" : "Déjà enregistré ?"} 
               <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="ml-2 text-red-600 hover:underline">
                 {mode === 'login' ? "Demander un accès" : "Se connecter"}
               </button>
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};