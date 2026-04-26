
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, ShieldCheck, Database, Zap, Cpu } from 'lucide-react';

interface AppLoadingOverlayProps {
  isVisible: boolean;
}

const STEPS = [
  { id: 'network', icon: <Zap size={14} />, label: 'Établissement de la connexion sécurisée...' },
  { id: 'auth', icon: <ShieldCheck size={14} />, label: 'Vérification des protocoles d\'accès...' },
  { id: 'data', icon: <Database size={14} />, label: 'Synchronisation des flux nationaux...' },
  { id: 'ui', icon: <Cpu size={14} />, label: 'Initialisation de l\'interface cockpit...' },
];

export const AppLoadingOverlay: React.FC<AppLoadingOverlayProps> = ({ isVisible }) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    
    const interval = setInterval(() => {
      setCurrentStep(prev => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 1200);

    return () => clearInterval(interval);
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[2000] bg-slate-950 flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Immersive Cinematic Background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
            
            {/* Scanlines / Grid Effect */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent h-[2px] w-full animate-scanline pointer-events-none" />
          </div>

          <div className="relative z-10 flex flex-col items-center">
            {/* Pulsing Central Icon with Glow rings */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="relative mb-16"
            >
              <div className="absolute inset-[-20px] bg-emerald-600/10 blur-3xl rounded-full animate-pulse" />
              <div className="absolute inset-[-40px] border border-emerald-500/10 rounded-full animate-ping opacity-20" style={{ animationDuration: '3s' }} />
              
              <div className="w-24 h-24 bg-gradient-to-br from-slate-900 to-black rounded-[2.5rem] flex items-center justify-center shadow-2xl border border-white/10 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 to-transparent opacity-50" />
                <motion.div
                  animate={{ 
                    scale: [1, 1.15, 1],
                    opacity: [1, 0.8, 1]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 2.5,
                    ease: "easeInOut" 
                  }}
                  className="relative z-10"
                >
                  <Activity size={40} className="text-emerald-500 drop-shadow-[0_0_15px_rgba(16, 185, 129, 0.6)]" />
                </motion.div>
                
                {/* Internal HUD data */}
                <div className="absolute top-1 left-2 text-[6px] font-mono text-emerald-500/40 uppercase">Sens: OK</div>
                <div className="absolute bottom-1 right-2 text-[6px] font-mono text-emerald-500/40 uppercase">Sync: 100%</div>
              </div>
            </motion.div>

            {/* App Name reveal with staggered letters */}
            <div className="text-center mb-16 px-6">
              <div className="flex items-center justify-center gap-1">
                {"HEMOSTATS".split("").map((letter, i) => (
                  <motion.span
                    key={i}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ 
                      duration: 0.6, 
                      delay: 0.2 + (i * 0.05), 
                      ease: [0.16, 1, 0.3, 1]
                    }}
                    className={`text-5xl md:text-6xl font-black tracking-[-0.08em] ${letter === 'H' || letter === 'E' || letter === 'M' || letter === 'O' ? 'text-white' : 'text-emerald-500'}`}
                  >
                    {letter}
                  </motion.span>
                ))}
              </div>
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "100%" }}
                transition={{ duration: 1, delay: 0.8 }}
                className="max-w-[200px] mx-auto overflow-hidden text-center"
              >
                <p className="text-[9px] uppercase tracking-[0.5em] font-black text-slate-500 mt-4 whitespace-nowrap">
                  Intelligence System
                </p>
              </motion.div>
            </div>

            {/* Stepped Status Indicator */}
            <div className="w-80 space-y-4">
              <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Système</span>
                <span className="text-[10px] font-mono font-bold text-emerald-500">
                  {Math.round(((currentStep + 1) / STEPS.length) * 100)}%
                </span>
              </div>
              
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5 relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(16, 185, 129, 0.5)]"
                />
              </div>

              <div className="pt-4 h-12 flex flex-col items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-3 text-slate-400"
                  >
                    <span className="text-emerald-500 animate-pulse">{STEPS[currentStep].icon}</span>
                    <span className="text-[11px] font-bold uppercase tracking-tight text-center">
                      {STEPS[currentStep].label}
                    </span>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Bottom Technical Accents */}
          <div className="absolute bottom-12 left-12 flex items-center gap-4 opacity-20 hidden md:flex">
             <div className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
             <span className="text-[9px] font-mono text-white tracking-widest uppercase">Encryption Active: AES-256</span>
          </div>
          
          <div className="absolute bottom-12 right-12 opacity-20 hidden md:block">
             <span className="text-[9px] font-mono text-white tracking-widest uppercase">Node: {navigator.platform} | CNTS-CI Core v4.0</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
