
import React, { useState, useEffect } from 'react';
import { RefreshCw, Zap, ZapOff, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SyncStatusProps {
  status: 'synced' | 'syncing' | 'error';
  isCloudSyncing?: boolean;
  lastSync: Date | null;
  onSync: (force: boolean) => void;
  autoRefresh: boolean;
  onToggleAutoRefresh: (val: boolean) => void;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({ 
  status, 
  isCloudSyncing,
  lastSync, 
  onSync, 
  autoRefresh, 
  onToggleAutoRefresh 
}) => {
  const [relativeTime, setRelativeTime] = useState<string>('---');

  useEffect(() => {
    const updateTime = () => {
      if (!lastSync) {
        setRelativeTime('---');
        return;
      }
      const diff = Math.floor((new Date().getTime() - lastSync.getTime()) / 1000);
      if (diff < 60) setRelativeTime("À l'instant");
      else if (diff < 3600) setRelativeTime(`Il y a ${Math.floor(diff / 60)} min`);
      else setRelativeTime(`Il y a ${Math.floor(diff / 3600)} h`);
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, [lastSync]);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-2xl px-2 sm:px-4 py-2 shadow-sm">
        <div className="flex items-center gap-2 pr-2 sm:pr-3 border-r border-slate-200">
          <div className={`w-2 h-2 rounded-full ${
            status === 'syncing' || isCloudSyncing ? 'bg-emerald-500 animate-pulse' : 
            status === 'error' ? 'bg-rose-500' : 
            autoRefresh ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'
          }`} />
          <span className="text-[9px] sm:text-[10px] font-display font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
            {isCloudSyncing ? 'Cloud...' : status === 'syncing' ? 'MàJ...' : status === 'error' ? 'Erreur' : autoRefresh ? 'Live' : 'Man.'}
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-3 pl-1">
          <div className="hidden xs:flex flex-col">
            <span className="text-[7px] sm:text-[8px] font-display font-black uppercase tracking-widest text-slate-400">MàJ</span>
            <span className="text-[9px] sm:text-[10px] font-mono font-bold text-slate-700">{relativeTime}</span>
          </div>

          <button
            onClick={() => onSync(true)}
            disabled={status === 'syncing'}
            className={`p-2 rounded-xl transition-all active:scale-90 ${
              status === 'syncing' ? 'text-emerald-500 animate-spin' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Forcer la mise à jour"
          >
            <RefreshCw size={14} />
          </button>

          <button
            onClick={() => onToggleAutoRefresh(!autoRefresh)}
            className={`p-2 rounded-xl transition-all active:scale-90 ${
              autoRefresh ? 'text-emerald-500 bg-emerald-50' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title={autoRefresh ? "Désactiver l'auto-refresh" : "Activer l'auto-refresh (30s)"}
          >
            {autoRefresh ? <Zap size={14} /> : <ZapOff size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
};
