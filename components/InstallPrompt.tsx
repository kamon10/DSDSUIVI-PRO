import React, { useState, useEffect } from 'react';
import { Share, PlusSquare, X, Smartphone, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const InstallPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);

    if (isIos) {
      setPlatform('ios');
      // Show iOS prompt after a short delay if not dismissed
      const dismissed = localStorage.getItem('install_prompt_dismissed');
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    } else if (isAndroid) {
      setPlatform('android');
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        const dismissed = localStorage.getItem('install_prompt_dismissed');
        if (!dismissed) {
          setShowPrompt(true);
        }
      });
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('install_prompt_dismissed', 'true');
  };

  const handleInstallAndroid = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowPrompt(false);
      }
    }
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-32 lg:bottom-6 left-4 right-4 z-[100] md:left-auto md:right-6 md:w-96"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 overflow-hidden relative">
            <button 
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Smartphone className="text-rose-600" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Installer Hemo-Stats</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Ajoutez l'application à votre écran d'accueil pour un accès rapide et des notifications en temps réel.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100">
              {platform === 'ios' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-[11px] text-slate-600">
                    <div className="w-6 h-6 bg-slate-100 rounded flex items-center justify-center">
                      <Share size={14} className="text-blue-500" />
                    </div>
                    <span>Appuyez sur le bouton <strong>Partager</strong> en bas de l'écran.</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-600">
                    <div className="w-6 h-6 bg-slate-100 rounded flex items-center justify-center">
                      <PlusSquare size={14} />
                    </div>
                    <span>Faites défiler et appuyez sur <strong>Sur l'écran d'accueil</strong>.</span>
                  </div>
                </div>
              ) : platform === 'android' ? (
                <button
                  onClick={handleInstallAndroid}
                  className="w-full py-2.5 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-rose-200 hover:bg-rose-700 transition-colors"
                >
                  <Download size={14} />
                  Installer Maintenant
                </button>
              ) : null}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
