
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Sparkles, Send, X, Bot, User, MessageSquare, Target, ChevronRight, RefreshCw, Maximize2, Minimize2, Loader2 } from 'lucide-react';
import { DashboardData, AppTab } from '../types';
import { GoogleGenAI } from "@google/genai";

interface AIAssistantOverlayProps {
  data: DashboardData;
  activeTab: AppTab;
  onNavigate: (tab: AppTab) => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const AIAssistantOverlay: React.FC<AIAssistantOverlayProps> = ({ data, activeTab, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Bonjour ! Je suis votre assistant HEMO-STATS intelligent. Comment puis-je vous aider aujourd'hui ? Je peux analyser vos stocks, vos collectes ou vous aider à naviguer." }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isTyping, isOpen, isMinimized]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      const context = `
        État actuel du système HEMO-STATS:
        Page active: ${activeTab}
        Date: ${data.date}
        Performance Jour: ${data.daily.realized}/${data.daily.objective} (${data.daily.percentage.toFixed(1)}%)
        Performance Mois: ${data.monthly.realized}/${data.monthly.objective} (${data.monthly.percentage.toFixed(1)}%)
        Stocks vitaux: ${data.stock?.map(s => `${s.groupeSanguin}: ${s.quantite}`).join(', ')}
        Top Régions: ${data.regions.slice(0, 3).map(r => r.name).join(', ')}
      `;

      const prompt = `
        Tu es l'intelligence artificielle embarquée de HEMO-STATS. 
        Tu es concis, intelligent et orienté vers l'action.
        Réponds en français. Si l'utilisateur demande de voir quelque chose, suggère de naviguer vers la page appropriée.
        Pages disponibles: pulse (Home), stock (Stock), entry (Saisie), history (Historique), cockpit (Tableau de bord).
        
        Contexte: ${context}
        Question utilisateur: ${userMessage}
      `;

      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { temperature: 0.7, maxOutputTokens: 200 }
      });

      const responseText = result.text || "Je n'ai pas pu traiter votre demande.";
      setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Désolé, j'ai une petite perte de connexion avec mon module analytique." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* TRIGGER BUTTON */}
      <motion.button
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          setIsOpen(true);
          setIsMinimized(false);
        }}
        className={`fixed bottom-8 left-8 z-[200] w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all ${isOpen ? 'opacity-0 scale-0 pointer-events-none' : 'opacity-100 scale-100'}`}
        style={{
          background: 'linear-gradient(135deg, #ea580c 0%, #7c2d12 100%)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <div className="relative">
          <Brain className="text-white" size={32} />
          <motion.div 
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -inset-2 bg-white rounded-full blur-md"
          />
        </div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9, x: -50 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1, 
              x: 0,
              height: isMinimized ? '80px' : '600px',
              width: isMinimized ? '300px' : '400px'
            }}
            exit={{ opacity: 0, y: 100, scale: 0.9, x: -50 }}
            className="fixed bottom-8 left-8 z-[300] bg-white rounded-[2.5rem] shadow-4xl border border-orange-200 overflow-hidden flex flex-col pointer-events-auto"
          >
            {/* ASSISTANT HEADER */}
            <div className="bg-orange-950 p-6 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-950/20">
                    <Sparkles size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-tighter text-white">Assistant HEMO-AI</h3>
                    <div className="flex items-center gap-1.5">
                       <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                       <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Gemini 3.0 Flash On-Line</span>
                    </div>
                  </div>
               </div>
               <div className="flex items-center gap-2">
                  <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 text-white/50 hover:text-white transition-colors">
                     {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                  </button>
                  <button onClick={() => setIsOpen(false)} className="p-2 text-white/50 hover:text-white transition-colors">
                     <X size={16} />
                  </button>
               </div>
            </div>

            {!isMinimized && (
              <>
                {/* MESSAGES AREA */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-orange-50/20">
                  {messages.map((m, i) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={i} 
                      className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                         <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${m.role === 'user' ? 'bg-orange-950 text-white' : 'bg-white border border-orange-100 text-orange-600'}`}>
                           {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                         </div>
                         <div className={`p-4 rounded-2xl text-xs font-medium leading-relaxed ${m.role === 'user' ? 'bg-orange-900 text-white rounded-tr-none' : 'bg-white text-orange-950 border border-orange-100 rounded-tl-none shadow-sm'}`}>
                           {m.content}
                         </div>
                      </div>
                    </motion.div>
                  ))}
                  {isTyping && (
                    <div className="flex gap-3 items-center animate-pulse">
                      <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shadow-sm">
                        <Sparkles size={14} />
                      </div>
                      <div className="bg-white p-3 rounded-2xl border border-orange-100">
                        <Loader2 size={16} className="animate-spin text-orange-300" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* QUICK SUGGESTIONS */}
                <div className="px-6 py-2 flex gap-2 overflow-x-auto scrollbar-hide shrink-0">
                   {[
                     { l: "Analyse des stocks", t: "Analyse les niveaux de stock actuels." },
                     { l: "Top Régions", t: "Quelles sont les régions les plus performantes ce mois-ci ?" },
                     { l: "Besoin de poches", t: "Combien nous manque-t-il pour l'objectif journalier ?" }
                   ].map((s, i) => (
                     <button 
                       key={i} 
                       onClick={() => setInput(s.t)}
                       className="whitespace-nowrap px-3 py-1.5 bg-white border border-orange-200 rounded-lg text-[9px] font-black uppercase tracking-tight text-orange-400 hover:border-orange-500 hover:text-orange-500 transition-all shadow-sm"
                     >
                       {s.l}
                     </button>
                   ))}
                </div>

                {/* INPUT AREA */}
                <div className="p-6 shrink-0 bg-white border-t border-orange-100">
                   <div className="relative">
                      <input 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Posez une question à l'IA..."
                        className="w-full bg-orange-50/50 border border-orange-200 rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-2 ring-orange-500/50 pr-20 transition-all"
                      />
                      <button 
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-orange-950 text-white rounded-xl hover:bg-orange-800 disabled:opacity-30 active:scale-95 transition-all"
                      >
                        <Send size={16} />
                      </button>
                   </div>
                   <p className="text-[8px] text-orange-300 mt-3 text-center font-bold uppercase tracking-widest">IA CNTS • Propulsé par Google Gemini</p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
