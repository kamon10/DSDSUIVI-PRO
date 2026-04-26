
import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Clock, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CalendarEvent {
  date: string;
  site: string;
  lieu: string;
  region: string;
  type: 'realized' | 'planned';
  value?: number;
  reason?: string;
  priority?: 'HAUTE' | 'MOYENNE' | 'BASSE';
}

interface CalendarViewProps {
  planning: {
    date: string;
    sortDate: Date;
    site: string;
    lieu: string;
    region: string;
    reason: string;
    priority: 'HAUTE' | 'MOYENNE' | 'BASSE';
  }[];
  history?: CalendarEvent[];
}

export const CalendarView: React.FC<CalendarViewProps> = ({ planning, history = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const monthYear = currentDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });

  const allEvents = useMemo(() => {
    const plannedEvents: CalendarEvent[] = planning.map(p => ({
      date: p.date,
      site: p.site,
      lieu: p.lieu,
      region: p.region,
      type: 'planned',
      reason: p.reason,
      priority: p.priority
    }));
    return [...history, ...plannedEvents];
  }, [planning, history]);

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    
    const startPadding = (firstDay.getDay() + 6) % 7;
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  }, [currentDate]);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getDayEvents = (date: Date) => {
    const dateStr = date.toLocaleDateString('fr-FR');
    return allEvents.filter(e => e.date === dateStr);
  };

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const groupedSelectedDayEvents = useMemo(() => {
    if (!selectedDay) return {};
    const events = allEvents.filter(e => e.date === selectedDay);
    
    // Group by Site then Region (PRES)
    const grouped: Record<string, Record<string, CalendarEvent[]>> = {};
    events.forEach(e => {
      const s = e.site;
      if (!grouped[s]) grouped[s] = {};
      const reg = e.region || 'AUTRES';
      if (!grouped[s][reg]) grouped[s][reg] = [];
      grouped[s][reg].push(e);
    });
    return grouped;
  }, [selectedDay, allEvents]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden">
      <div className="p-2.5 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
        <h3 className="text-[11px] font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-tight">
          <CalendarIcon size={14} className="text-orange-600" />
          Calendrier des Collectes
        </h3>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={prevMonth}
            className="p-1 hover:bg-white rounded-md transition-colors border border-transparent hover:border-slate-200"
          >
            <ChevronLeft size={14} className="text-slate-600" />
          </button>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-900 min-w-[80px] text-center">
            {monthYear}
          </span>
          <button 
            onClick={nextMonth}
            className="p-1 hover:bg-white rounded-md transition-colors border border-transparent hover:border-slate-200"
          >
            <ChevronRight size={14} className="text-slate-600" />
          </button>
        </div>
      </div>

      <div className="p-2.5">
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {weekDays.map(day => (
            <div key={day} className="text-center text-[7px] font-black uppercase tracking-widest text-slate-400 py-0.5">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {daysInMonth.map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} className="aspect-square" />;
            
            const dayEvents = getDayEvents(date);
            const isToday = date.toDateString() === new Date().toDateString();
            const isSelected = selectedDay === date.toLocaleDateString('fr-FR');
            
            const hasRealized = dayEvents.some(e => e.type === 'realized');
            const hasPlanned = dayEvents.some(e => e.type === 'planned');
            const hasHighPriority = dayEvents.some(e => e.priority === 'HAUTE');

            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDay(date.toLocaleDateString('fr-FR'))}
                className={`aspect-square rounded-lg border flex flex-col items-center justify-center relative transition-all group ${
                  isSelected 
                    ? 'ring-2 ring-orange-500 ring-offset-1 z-10' 
                    : ''
                } ${
                  dayEvents.length > 0
                    ? hasRealized
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                      : hasHighPriority 
                        ? 'bg-rose-50 border-rose-100 text-rose-700' 
                        : 'bg-orange-50 border-orange-100 text-orange-700'
                    : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'
                }`}
              >
                <span className={`text-[9px] font-black ${isToday ? 'bg-orange-600 text-white w-4 h-4 rounded-full flex items-center justify-center' : ''}`}>
                  {date.getDate()}
                </span>
                
                <div className="flex gap-0.5 absolute bottom-1">
                  {hasRealized && <div className="w-1 h-1 rounded-full bg-emerald-500" />}
                  {hasPlanned && <div className="w-1 h-1 rounded-full bg-orange-500" />}
                </div>

                {dayEvents.length > 1 && (
                  <span className="absolute top-0 right-0 text-[5px] font-black px-0.5 bg-white/50 rounded-sm">
                    {dayEvents.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {selectedDay && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                    Détails du {selectedDay}
                  </h4>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    {Object.keys(groupedSelectedDayEvents).length} PRES impliquées
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedDay(null)}
                  className="p-1 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <ChevronRight className="rotate-90 text-slate-400" size={14} />
                </button>
              </div>

              <div className="space-y-4">
                {Object.entries(groupedSelectedDayEvents).length > 0 ? (
                  Object.entries(groupedSelectedDayEvents).map(([site, regions]) => (
                    <div key={site} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-[1px] flex-grow bg-slate-200" />
                        <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest shrink-0">CENTRE: {site}</span>
                        <div className="h-[1px] flex-grow bg-slate-200" />
                      </div>
                      
                      {Object.entries(regions).map(([region, events]) => (
                        <div key={region} className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                          <div className="bg-orange-50 px-3 py-1.5 border-b border-orange-100 flex items-center justify-between">
                            <span className="text-[10px] font-black text-orange-600 uppercase tracking-tight">PRES: {region}</span>
                            <span className="text-[8px] font-bold text-orange-400">{events.length} collecte(s)</span>
                          </div>
                          <div className="p-2 space-y-2">
                            {events.map((e, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${
                                    e.type === 'realized' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
                                  }`}>
                                    {e.type === 'realized' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                                  </div>
                                  <div>
                                    <div className="text-xs font-black text-slate-900 uppercase tracking-tight">{e.lieu}</div>
                                    <div className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                      {e.type === 'realized' ? (
                                        <span className="text-emerald-600">Réalisée: {e.value} poches</span>
                                      ) : (
                                        <span>Planifiée • {e.reason}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {e.type === 'planned' && (
                                  <div className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                                    e.priority === 'HAUTE' ? 'bg-rose-100 text-rose-600' : 
                                    e.priority === 'MOYENNE' ? 'bg-orange-100 text-orange-600' : 
                                    'bg-orange-100 text-orange-600'
                                  }`}>
                                    {e.priority}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                    <CalendarIcon size={24} className="text-slate-200 mx-auto mb-2" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aucune activité enregistrée ou prévue</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
