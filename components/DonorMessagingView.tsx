
import React, { useState, useMemo, useEffect } from 'react';
import { MessageSquare, Users, Smartphone, Send, Trash2, Phone, AlertCircle, CheckCircle2, Info } from 'lucide-react';

interface DonorMessagingViewProps {
  senderNumber: string;
}

export const DonorMessagingView: React.FC<DonorMessagingViewProps> = ({ senderNumber }) => {
  const [message, setMessage] = useState("");

  // Initialisation du message par défaut au chargement ou si le numéro change
  useEffect(() => {
    setMessage(`Bonjour cher donneur, le CNTS CI a besoin de vous ! Une collecte est organisée demain. Votre don sauve des vies.\n\nCordialement,\nHEMO-STATS.\nContact : ${senderNumber}`);
  }, [senderNumber]);

  const [numbersInput, setNumbersInput] = useState("");
  const [sentStatus, setSentStatus] = useState<Record<string, boolean>>({});

  const parsedNumbers = useMemo(() => {
    // Extrait les numéros de téléphone du texte (format ivoirien ou international)
    const matches = numbersInput.match(/(?:\+?225|0)?[0-9]{2}[0-9]{2}[0-9]{2}[0-9]{2}[0-9]{2}/g) || [];
    
    // Nettoyage et dédoublonnage
    const unique = Array.from(new Set(matches.map(n => {
      let clean = n.replace(/\D/g, '');
      if (clean.length === 10 && clean.startsWith('0')) clean = '225' + clean.substring(1);
      if (clean.length === 10 && !clean.startsWith('225')) clean = '225' + clean;
      if (clean.length === 8) clean = '2250' + clean;
      return clean;
    })));
    
    return unique;
  }, [numbersInput]);

  const handleSendWhatsApp = (number: string) => {
    const encodedMsg = encodeURIComponent(message);
    window.open(`https://wa.me/${number}?text=${encodedMsg}`, '_blank');
    setSentStatus(prev => ({ ...prev, [number]: true }));
  };

  const handleSendSMS = (number: string) => {
    const encodedMsg = encodeURIComponent(message);
    window.open(`sms:${number}?body=${encodedMsg}`, '_blank');
    setSentStatus(prev => ({ ...prev, [number]: true }));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-6xl mx-auto">
      
      {/* HEADER SECTION */}
      <div className="bg-slate-900 rounded-[3rem] p-10 lg:p-14 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-8">
            <div className="w-16 h-16 lg:w-20 lg:h-20 bg-emerald-600 rounded-3xl flex items-center justify-center shadow-xl border border-white/10">
              <Users size={36} className="text-white" />
            </div>
            <div>
              <h2 className="text-3xl lg:text-4xl font-black uppercase tracking-tighter leading-none mb-3">Communication Donneur</h2>
              <p className="text-emerald-300/40 font-black uppercase tracking-[0.4em] text-[9px]">Diffusion massive via WhatsApp et SMS</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Colonne Gauche: Saisie des numéros et message */}
        <div className="space-y-8">
           <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center"><Smartphone size={20}/></div>
                <h3 className="font-black text-lg uppercase tracking-tight text-slate-800">Cibles de diffusion</h3>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">Collez vos listes de numéros ici</p>
              <textarea 
                value={numbersInput}
                onChange={(e) => setNumbersInput(e.target.value)}
                placeholder="0707070707&#10;+2250101010101&#10;0555555555..."
                className="w-full h-48 bg-slate-50 border border-slate-200 rounded-2xl p-6 text-sm font-bold text-slate-800 outline-none focus:ring-4 ring-emerald-50 transition-all no-scrollbar"
              />
              <div className="mt-4 flex justify-between items-center px-2">
                 <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{parsedNumbers.length} numéros détectés</span>
                 <button onClick={() => setNumbersInput("")} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline flex items-center gap-2">
                   <Trash2 size={12}/> Vider la liste
                 </button>
              </div>
           </div>

           <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg"><MessageSquare size={20}/></div>
                <h3 className="font-black text-lg uppercase tracking-tight text-slate-800">Contenu du message</h3>
              </div>
              <textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full h-40 bg-slate-50 border border-slate-200 rounded-2xl p-6 text-sm font-bold text-slate-800 outline-none focus:ring-4 ring-emerald-50 transition-all no-scrollbar"
              />
              <div className="mt-4 flex items-start gap-3 bg-blue-50 p-4 rounded-xl">
                 <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                 <p className="text-[10px] font-bold text-blue-800 leading-relaxed uppercase tracking-tight">Le message sera pré-rempli automatiquement lors de l'ouverture de WhatsApp ou de l'application SMS.</p>
              </div>
           </div>
        </div>

        {/* Colonne Droite: Liste des actions par numéro */}
        <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 flex flex-col overflow-hidden">
           <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
              <h3 className="font-black text-lg uppercase tracking-tight text-slate-800">Actions Individuelles</h3>
              <div className="flex gap-2">
                <div className="px-3 py-1 bg-white rounded-full border border-slate-200 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                  Total : {parsedNumbers.length}
                </div>
              </div>
           </div>
           <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-3 max-h-[700px] no-scrollbar">
              {parsedNumbers.length > 0 ? parsedNumbers.map((num, idx) => (
                <div key={idx} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-lg transition-all animate-in fade-in slide-in-from-right-4 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                   <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${sentStatus[num] ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400'}`}>
                         {sentStatus[num] ? <CheckCircle2 size={18} /> : <Phone size={18} />}
                      </div>
                      <div>
                         <p className="text-xs font-black text-slate-800">+{num}</p>
                         <p className={`text-[8px] font-black uppercase tracking-widest ${sentStatus[num] ? 'text-emerald-500' : 'text-slate-300'}`}>
                           {sentStatus[num] ? 'Envoyé' : 'En attente'}
                         </p>
                      </div>
                   </div>
                   <div className="flex gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all">
                      <button onClick={() => handleSendWhatsApp(num)} className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center hover:bg-emerald-600 shadow-md active:scale-95 transition-all">
                        <MessageSquare size={16} />
                      </button>
                      <button onClick={() => handleSendSMS(num)} className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 shadow-md active:scale-95 transition-all">
                        <Send size={16} />
                      </button>
                   </div>
                </div>
              )) : (
                <div className="py-20 flex flex-col items-center gap-4 text-center opacity-30">
                   <Users size={64} className="text-slate-200" />
                   <p className="text-xs font-black uppercase tracking-[0.2em]">Aucun numéro détecté</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};
