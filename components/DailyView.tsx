import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DashboardData } from '../types';
import { Calendar, ChevronDown, Zap, Activity, TrendingUp, Filter, Building2, Truck, AlertCircle, Clock, MessageSquare, FileImage, FileText, Loader2, Target, Phone, Send, CheckCircle2 } from 'lucide-react';
import { COLORS, SITES_DATA } from '../constants';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface DailyViewProps {
  data: DashboardData;
}

export const DailyView: React.FC<DailyViewProps> = ({ data }) => {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [exporting, setExporting] = useState<'image' | 'pdf' | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (data.dailyHistory.length > 0) {
      const exists = data.dailyHistory.some(h => h.date === selectedDate);
      if (!selectedDate || !exists) {
        setSelectedDate(data.dailyHistory[0].date);
      }
    }
  }, [data.dailyHistory, selectedDate]);

  const currentRecord = useMemo(() => {
    if (data.dailyHistory.length === 0) return null;
    return data.dailyHistory.find(r => r.date === selectedDate) || data.dailyHistory[0];
  }, [selectedDate, data.dailyHistory]);

  const activeSites = useMemo(() => {
    if (!currentRecord) return [];
    return currentRecord.sites.filter(site => site.total > 0);
  }, [currentRecord]);

  const missingSites = useMemo(() => {
    if (!currentRecord) return [];
    const activeNames = new Set(activeSites.map(s => s.name.trim().toUpperCase()));
    return SITES_DATA.filter(site => !activeNames.has(site.name.trim().toUpperCase()));
  }, [activeSites, currentRecord]);

  const totals = useMemo(() => {
    if (!currentRecord) return { fixed: 0, mobile: 0, total: 0, objective: 0 };
    return currentRecord.sites.reduce((acc, site) => ({
      fixed: acc.fixed + (site.fixe || 0),
      mobile: acc.mobile + (site.mobile || 0),
      total: acc.total + (site.total || 0),
      objective: acc.objective + (site.objective || 0)
    }), { fixed: 0, mobile: 0, total: 0, objective: 0 });
  }, [currentRecord]);

  const handleWhatsAppReminder = (site: any) => {
    if (!site.phone) return;
    
    // Nettoyage complet : on ne garde que les chiffres
    let cleanPhone = site.phone.replace(/\D/g, '');
    
    /**
     * FORMATAGE WHATSAPP CÔTE D'IVOIRE
     * Nouveau format 10 chiffres : 0XXXXXXXXX
     * Format international requis : 2250XXXXXXXXX (13 chiffres au total)
     */
    if (cleanPhone.length === 10 && cleanPhone.startsWith('0')) {
      cleanPhone = '225' + cleanPhone;
    } else if (cleanPhone.length === 10 && !cleanPhone.startsWith('225')) {
       // Cas où le numéro est saisi sans le 0 mais fait 10 chiffres (peu probable en CI)
       cleanPhone = '225' + cleanPhone;
    } else if (cleanPhone.length === 8) {
       // Ancien format 8 chiffres, on assume l'ajout du 07 par défaut
       cleanPhone = '22507' + cleanPhone;
    } else if (cleanPhone.startsWith('225')) {
       // Déjà au format international, on s'assure qu'il n'y a pas de +
       cleanPhone = cleanPhone;
    } else {
       // Par défaut, on ajoute l'indicatif pays
       cleanPhone = '225' + cleanPhone;
    }
    
    // Nouveau modèle de message officiel DSD
    const message = `Bonjour ${site.manager || 'Responsable'}, sauf erreur de notre part, les données de prélèvements du ${selectedDate} pour le site ${site.name} n'ont pas encore été reçues dans le fichier national. Pourriez-vous procéder à la saisie dès que possible ? Merci.\n\nCordialement,\nLa Direction des Structures Déconcentrées (DSD) CNTSCI.`;
    
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleExport = async (type: 'image' | 'pdf') => {
    if (!contentRef.current) return;
    setExporting(type);
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const element = contentRef.current;
      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true, 
        backgroundColor: '#f8fafc',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png', 1.0);
      if (type === 'image') {
        const link = document.createElement('a');
        link.download = `JOUR_CNTS_${selectedDate.replace(/\//g, '-')}.png`;
        link.href = imgData;
        link.click();
      } else {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth(); 
        const pageHeight = pdf.internal.pageSize.getHeight();
        const ratio = pageWidth / (canvas.width / 2);
        const finalWidth = pageWidth;
        const finalHeight = (canvas.height / 2) * ratio;
        let drawHeight = finalHeight;
        let drawWidth = finalWidth;
        if (finalHeight > pageHeight - 20) {
          const scaleFactor = (pageHeight - 20) / finalHeight;
          drawHeight = finalHeight * scaleFactor;
          drawWidth = finalWidth * scaleFactor;
        }
        pdf.addImage(imgData, 'PNG', (pageWidth - drawWidth) / 2, 10, drawWidth, drawHeight, undefined, 'FAST');
        pdf.save(`JOUR_CNTS_${selectedDate.replace(/\//g, '-')}.pdf`);
      }
    } catch (err) {
      console.error("Export Daily Error:", err);
    } finally {
      setExporting(null);
    }
  };

  if (!currentRecord) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* HEADER SECTION */}
      <div className="bg-[#0f172a] rounded-[3rem] p-8 lg:p-12 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl border border-white/10">
              <Calendar size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter">Bilan Quotidien</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Journal du {selectedDate}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 flex items-center gap-3">
              <Filter size={14} className="text-blue-400" />
              <select 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)} 
                className="bg-transparent outline-none text-[11px] font-black uppercase tracking-widest cursor-pointer text-white"
              >
                {data.dailyHistory.map(h => <option key={h.date} value={h.date} className="text-slate-900">{h.date}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleExport('image')} disabled={!!exporting} className="p-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all">
                {exporting === 'image' ? <Loader2 size={16} className="animate-spin" /> : <FileImage size={16} />}
              </button>
              <button onClick={() => handleExport('pdf')} disabled={!!exporting} className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-md">
                {exporting === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div ref={contentRef} className="space-y-8">
        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 group hover:shadow-xl transition-all">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Building2 size={14} className="text-emerald-500" /> Collecte Fixe</p>
            <div className="flex justify-between items-end">
              <span className="text-5xl font-black text-slate-900">{totals.fixed.toLocaleString()}</span>
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><TrendingUp size={24} /></div>
            </div>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 group hover:shadow-xl transition-all">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Truck size={14} className="text-orange-500" /> Collecte Mobile</p>
            <div className="flex justify-between items-end">
              <span className="text-5xl font-black text-slate-900">{totals.mobile.toLocaleString()}</span>
              <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center"><Activity size={24} /></div>
            </div>
          </div>
          <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white group hover:scale-[1.02] transition-all">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-4 flex items-center gap-2"><Zap size={14} className="text-red-500" /> Total Réalisé</p>
            <div className="flex justify-between items-end">
              <span className="text-5xl font-black">{totals.total.toLocaleString()}</span>
              <div className="text-right">
                <p className="text-2xl font-black text-emerald-400">{((totals.total / (totals.objective || 1)) * 100).toFixed(0)}%</p>
                <p className="text-[8px] font-black uppercase text-white/20">de l'objectif</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* SITES ACTIFS */}
          <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-black text-lg uppercase tracking-tight text-slate-800 flex items-center gap-3">
                <CheckCircle2 size={20} className="text-emerald-500" /> Transmissions Reçues
              </h3>
              <span className="px-3 py-1 bg-white rounded-full border border-slate-200 text-[10px] font-black text-slate-400">{activeSites.length} Sites</span>
            </div>
            <div className="divide-y divide-slate-50 overflow-y-auto max-h-[500px]">
              {activeSites.length > 0 ? activeSites.map((site, idx) => (
                <div key={idx} className="px-8 py-5 flex items-center justify-between hover:bg-slate-50 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-xs font-black">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800 uppercase leading-none">{site.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">{site.region}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-slate-900 leading-none">{site.total}</p>
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1">Poches</p>
                  </div>
                </div>
              )) : (
                <div className="py-20 text-center opacity-30">
                  <AlertCircle size={48} className="mx-auto mb-4" />
                  <p className="text-xs font-black uppercase">Aucune donnée reçue</p>
                </div>
              )}
            </div>
          </div>

          {/* SITES EN ATTENTE AVEC WHATSAPP */}
          <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-slate-50 bg-red-50/50 flex justify-between items-center">
              <h3 className="font-black text-lg uppercase tracking-tight text-slate-800 flex items-center gap-3">
                <Clock size={20} className="text-red-500" /> Attente de Saisie
              </h3>
              <span className="px-3 py-1 bg-white rounded-full border border-red-100 text-[10px] font-black text-red-400">{missingSites.length} Sites</span>
            </div>
            <div className="divide-y divide-slate-50 overflow-y-auto max-h-[500px]">
              {missingSites.length > 0 ? missingSites.map((site, idx) => (
                <div key={idx} className="px-8 py-5 flex items-center justify-between hover:bg-slate-50 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-50 text-red-400 rounded-xl flex items-center justify-center text-xs font-black">
                      !
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800 uppercase leading-none">{site.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest truncate max-w-[150px]">{site.manager || "Resp. inconnu"}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {site.phone ? (
                      <button 
                        onClick={() => handleWhatsAppReminder(site)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all active:scale-95"
                      >
                        <MessageSquare size={14} /> Relancer
                      </button>
                    ) : (
                      <div className="px-4 py-2 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200">
                        Pas de tel
                      </div>
                    )}
                  </div>
                </div>
              )) : (
                <div className="py-20 text-center text-emerald-500 bg-emerald-50/30">
                  <CheckCircle2 size={48} className="mx-auto mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest">Saisie Complète !</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
