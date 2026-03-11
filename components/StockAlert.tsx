
import React, { useMemo, useState } from 'react';
import { AlertTriangle, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { DashboardData } from '../types';

interface StockAlertProps {
  data: DashboardData;
  className?: string;
}

export const StockAlert: React.FC<StockAlertProps> = ({ data, className = "" }) => {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const stats = useMemo(() => {
    const total = data.stock?.reduce((acc, s) => acc + s.quantite, 0) || 0;
    return { total };
  }, [data.stock]);

  const handleBroadcast = async () => {
    setSending(true);
    try {
      const response = await fetch('/api/notifications/broadcast-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: "🚨 ALERTE STOCK CRITIQUE",
          body: `Urgent : Le stock national est à ${stats.total.toLocaleString()} poches. Seuil de sécurité non atteint.`
        })
      });
      if (response.ok) {
        setSent(true);
        setTimeout(() => setSent(false), 3000);
      }
    } catch (err) {
      console.error("Failed to broadcast alert:", err);
    } finally {
      setSending(false);
    }
  };

  if (stats.total >= 12000) return null;

  return (
    <div className={`bg-rose-50 border-2 border-rose-200 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 animate-pulse shadow-lg ${className}`}>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
          <AlertTriangle className="text-white" size={24} />
        </div>
        <div>
          <h3 className="text-lg font-black uppercase tracking-tighter text-rose-600 leading-none">Alerte Stock Critique</h3>
          <p className="text-xs font-bold text-rose-500 uppercase tracking-widest mt-1">Le volume total est inférieur au seuil de sécurité (12 000 poches)</p>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="text-right">
          <span className="text-2xl font-black text-rose-600 tracking-tighter">-{ (12000 - stats.total).toLocaleString() }</span>
          <span className="text-[10px] font-bold text-rose-400 uppercase ml-2">Poches manquantes</span>
        </div>

        <button 
          onClick={handleBroadcast}
          disabled={sending || sent}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${
            sent ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white hover:bg-rose-700 active:scale-95'
          }`}
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : sent ? <CheckCircle2 size={14} /> : <Send size={14} />}
          {sent ? 'Diffusé' : 'Notifier tout le monde'}
        </button>
      </div>
    </div>
  );
};
