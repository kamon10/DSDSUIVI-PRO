
import React, { useState, useMemo, useEffect } from 'react';
import { MessageSquare, Users, Smartphone, Send, Trash2, Phone, AlertCircle, CheckCircle2, Info } from 'lucide-react';

interface DonorMessagingViewProps {
  senderNumber: string;
}

export const DonorMessagingView: React.FC<DonorMessagingViewProps> = ({ senderNumber }) => {
  const [message, setMessage] = useState("");

  // Initialisation du message par défaut au chargement ou si le numéro change
  useEffect(() => {
    setMessage(`Bonjour cher donneur, le CNTS CI a besoin de vous ! Une collecte est organisée demain. Votre don sauve des vies.\n\nCordialement,\nLa DSD CNTSCI.\nContact : ${senderNumber}`);
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
              <h2 className="text-3xl lg:text-4xl font-black uppercase tracking-tighter leading-none mb-3">Relance Donneurs</h2>
              <div className="flex items-center gap-3">
                <p className="text-emerald-300/40 font-black uppercase tracking-[0.4em] text-[9px]">Communication de masse</p>
                <div className="px-3 py-1 bg-white/10 rounded-full border border-white/10 flex items-center gap-2">
                  <span className="text-[8px] font-black uppercase text-emerald-400">Expéditeur Officiel :</span>
                  <span className="text-[10px] font-black text-white">{senderNumber}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-md px-8 py-5 rounded-[2rem] border border-white/10 text-center min-w-[160px]">
             <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Cible Détectée</p>
             <p className="text-4xl font-black text-white">{parsedNumbers.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* COMPOSITION DU MESSAGE */}
        <div className="bg-white rounded-[3rem] p-8 lg:p-12 shadow-warm border border-slate-100 flex flex-col gap-8">
          <div>
            <label className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
              <MessageSquare size={16} className="text-emerald-500" /> Contenu du Message
            </label>
            <textarea 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Rédigez votre message ici..."
              className="w-full h-48 bg-slate-50 border border-slate-200 rounded-3xl p-6 text-sm font-medium text-slate-800 outline-none focus:ring-2 ring-emerald-500 transition-all resize-none shadow-inner"
            />
            <div className="mt-3 flex justify-between items-center px-2">
               <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{message.length} Caractères</span>
               <button 
                onClick={() => setMessage("")}
                className="text-[9px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest flex items-center gap-1"
               >
                 <Trash2 size={12}/> Effacer le texte
               </button>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
              <Phone size={16} className="text-emerald-500" /> Liste des Numéros
            </label>
            <textarea 
              value={numbersInput}
              onChange={(e) => setNumbersInput(e.target.value)}
              placeholder="Collez ici les numéros (ex: 0707070707, +225...)"
              className="w-full h-40 bg-slate-50 border border-slate-200 rounded-3xl p-6 text-xs font-mono font-bold text-slate-600 outline-none focus:ring-2 ring-emerald-500 transition-all resize-none shadow-inner"
            />
            <div className="mt-3 flex items-center gap-2 px-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest italic">
              <Info size={10} /> Séparateurs acceptés : virgule, espace, saut de ligne.
            </div>
          </div>
        </div>

        {/* LISTE DES DESTINATAIRES & ACTIONS */}
        <div className="bg-white rounded-[3rem] shadow-warm border border-slate-100 flex flex-col overflow-hidden">
          <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-black text-lg uppercase tracking-tight text-slate-800">Prêt pour l'envoi</h3>
            <div className="flex items-center gap-2 px-4 py-1.5 bg-white rounded-full border border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Total : {parsedNumbers.length}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 lg:p-8 max-h-[600px] space-y-3">
            {parsedNumbers.length > 0 ? parsedNumbers.map((num, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-lg transition-all group">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${sentStatus[num] ? 'bg-emerald-50 text-emerald-500' : 'bg-white text-slate-400'}`}>
                    {sentStatus[num] ? <CheckCircle2 size={18} /> : <Smartphone size={18} />}
                  </div>
                  <span className="font-black text-slate-700 tracking-tighter">+{num}</span>
                </div>
                
                <div className="flex gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleSendWhatsApp(num)}
                    className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center hover:bg-emerald-600 hover:scale-110 active:scale-95 transition-all shadow-lg shadow-emerald-100"
                    title="WhatsApp"
                  >
                    <Send size={16} />
                  </button>
                  <button 
                    onClick={() => handleSendSMS(num)}
                    className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 hover:scale-110 active:scale-95 transition-all shadow-lg shadow-blue-100"
                    title="SMS Mobile"
                  >
                    <Smartphone size={16} />
                  </button>
                </div>
              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-20 gap-4 opacity-30">
                <AlertCircle size={48} />
                <p className="text-xs font-black uppercase tracking-[0.2em]">Aucun numéro valide détecté</p>
              </div>
            )}
          </div>

          {parsedNumbers.length > 0 && (
            <div className="p-8 bg-slate-50 border-t border-slate-100">
               <div className="p-5 bg-blue-50 border border-blue-100 rounded-3xl flex items-start gap-4">
                  <Smartphone size={20} className="text-blue-600 shrink-0 mt-1" />
                  <p className="text-[10px] font-bold text-blue-800 leading-relaxed uppercase tracking-tight">
                    <span className="font-black block mb-1 underline">Ligne Officielle :</span>
                    Ce numéro de transit <span className="font-black">{senderNumber}</span> est utilisé dans la signature. Assurez-vous d'envoyer les messages depuis l'appareil lié à cette ligne pour une cohérence maximale.
                  </p>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
