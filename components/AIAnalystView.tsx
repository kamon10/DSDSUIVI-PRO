
import React, { useState, useRef, useEffect } from 'react';
import { DashboardData } from '../types';
import { GoogleGenAI } from "@google/genai";
import { Brain, Send, Sparkles, User, Bot, RefreshCw, ChevronRight, MessageSquare, Target } from 'lucide-react';

interface AIAnalystViewProps {
  data: DashboardData;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const AIAnalystView: React.FC<AIAnalystViewProps> = ({ data }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Bonjour ! Je suis votre analyste IA CNTS. Posez-moi n'importe quelle question sur les prélèvements, les performances régionales ou les objectifs." }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const context = `
        Données CNTS Côte d'Ivoire :
        Date actuelle: ${data.date}
        Performance Journalière: ${data.daily.realized}/${data.daily.objective} (${data.daily.percentage.toFixed(1)}%)
        Performance Mensuelle: ${data.monthly.realized}/${data.monthly.objective} (${data.monthly.percentage.toFixed(1)}%)
        Répartition: Fixe (${data.monthly.fixed}), Mobile (${data.monthly.mobile})
        Top Régions: ${data.regions.map(r => `${r.name}: ${r.sites.reduce((acc, s) => acc + s.totalMois, 0)} poches`).join(', ')}
      `;

      const prompt = `
        Tu es l'analyste expert du CNTS Côte d'Ivoire. 
        Réponds de manière précise, professionnelle et encourageante.
        Voici le contexte des données : ${context}
        Question de l'utilisateur : ${userMessage}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { temperature: 0.7 }
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response.text || "Je n'ai pas pu analyser ces données." }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Désolé, une erreur est survenue lors de la connexion à mon cerveau artificiel." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const suggestions = [
    "Analyse la performance du jour",
    "Quelles régions sont en retard ?",
    "Prédis la fin du mois",
    "Compare Fixe vs Mobile"
  ];

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-200px)] flex flex-col animate-in fade-in duration-700">
      
      {/* Header Analyste */}
      <div className="bg-slate-900 rounded-t-[2.5rem] p-8 text-white flex items-center justify-between shrink-0 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/20 blur-[100px] rounded-full"></div>
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center shadow-lg shadow-red-900/50">
            <Brain size={32} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter">Analyste Stratégique</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Connecté au Cloud Gemini</span>
            </div>
          </div>
        </div>
        <button onClick={() => setMessages([messages[0]])} className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Zone de Chat */}
      <div className="flex-1 bg-white border-x border-slate-100 overflow-y-auto p-6 lg:p-10 space-y-6">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[85%] lg:max-w-[70%] flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center shadow-sm ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-red-50 text-red-600'}`}>
                {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
              </div>
              <div className={`p-5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-slate-900 text-white font-medium rounded-tr-none' : 'bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-none'}`}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start animate-pulse">
            <div className="flex gap-4 items-center">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <Sparkles size={18} />
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Barre de Saisie & Suggestions */}
      <div className="bg-slate-50 border-x border-b border-slate-100 p-6 lg:p-8 rounded-b-[2.5rem] shrink-0 space-y-6">
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <button 
                key={i} 
                onClick={() => setInput(s)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-tight text-slate-500 hover:border-red-500 hover:text-red-500 transition-all flex items-center gap-2"
              >
                <ChevronRight size={12} /> {s}
              </button>
            ))}
          </div>
        )}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
          <div className="relative flex gap-3">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Posez votre question stratégique..."
              className="flex-1 bg-white border border-slate-200 rounded-xl px-6 py-4 text-sm font-bold text-slate-800 outline-none focus:ring-2 ring-red-500 transition-all"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="bg-slate-900 text-white px-8 py-4 rounded-xl font-black uppercase text-xs tracking-widest flex items-center gap-3 hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-30"
            >
              <Send size={18} />
              <span>Analyser</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
