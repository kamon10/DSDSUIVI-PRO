
import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
}

export const CalendarView: React.FC<CalendarViewProps> = ({ planning }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const monthYear = currentDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    
    // Padding for the start of the week (Monday start)
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

  const getDayPlanning = (date: Date) => {
    const dateStr = date.toLocaleDateString('fr-FR');
    return planning.filter(p => p.date === dateStr);
  };

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const selectedDayPlanning = useMemo(() => {
    if (!selectedDay) return [];
    return planning.filter(p => p.date === selectedDay);
  }, [selectedDay, planning]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden">
      <div className="p-2.5 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
        <h3 className="text-[11px] font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-tight">
          <CalendarIcon size={14} className="text-orange-600" />
          Calendrier
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
            
            const dayPlanning = getDayPlanning(date);
            const isToday = date.toDateString() === new Date().toDateString();
            const isSelected = selectedDay === date.toLocaleDateString('fr-FR');
            const hasHighPriority = dayPlanning.some(p => p.priority === 'HAUTE');
            const hasMediumPriority = dayPlanning.some(p => p.priority === 'MOYENNE');

            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDay(date.toLocaleDateString('fr-FR'))}
                className={`aspect-square rounded-lg border flex flex-col items-center justify-center relative transition-all group ${
                  isSelected 
                    ? 'ring-1 ring-orange-500 ring-offset-1' 
                    : ''
                } ${
                  dayPlanning.length > 0
                    ? hasHighPriority 
                      ? 'bg-rose-50 border-rose-100 text-rose-700' 
                      : hasMediumPriority
                        ? 'bg-orange-50 border-orange-100 text-orange-700'
                        : 'bg-orange-50 border-orange-100 text-orange-700'
                    : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'
                }`}
              >
                <span className={`text-[9px] font-black ${isToday ? 'underline decoration-1 underline-offset-2' : ''}`}>
                  {date.getDate()}
                </span>
                {dayPlanning.length > 0 && (
                  <div className={`absolute bottom-0.5 w-0.5 h-0.5 rounded-full ${
                    hasHighPriority ? 'bg-rose-500' : hasMediumPriority ? 'bg-orange-500' : 'bg-orange-500'
                  }`} />
                )}
                {dayPlanning.length > 1 && (
                  <span className="absolute top-0 right-0 text-[5px] font-black px-0.5 bg-white/50 rounded-sm">
                    +{dayPlanning.length - 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {selectedDay && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="mt-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[9px] font-black text-slate-900 uppercase tracking-tight">
                  {selectedDay}
                </h4>
                <button 
                  onClick={() => setSelectedDay(null)}
                  className="text-[7px] font-black uppercase text-slate-400 hover:text-slate-600"
                >
                  Fermer
                </button>
              </div>

              {selectedDayPlanning.length > 0 ? (
                <div className="space-y-1.5">
                  {selectedDayPlanning.map((p, idx) => (
                    <div key={idx} className="bg-white p-2 rounded-lg shadow-sm border border-slate-100 flex items-center justify-between group">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center font-black text-[7px] ${
                          p.priority === 'HAUTE' ? 'bg-rose-50 text-rose-600' : 
                          p.priority === 'MOYENNE' ? 'bg-orange-50 text-orange-600' : 
                          'bg-orange-50 text-orange-600'
                        }`}>
                          {p.site.substring(0, 2)}
                        </div>
                        <div>
                          <div className="text-[8px] font-black text-slate-900 uppercase tracking-tight">{p.site}</div>
                          <div className="text-[7px] font-bold text-slate-400 flex items-center gap-1">
                            <MapPin size={7} /> {p.lieu}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-[6px] font-black px-1 py-0.5 rounded-full inline-block ${
                          p.priority === 'HAUTE' ? 'bg-rose-100 text-rose-600' : 
                          p.priority === 'MOYENNE' ? 'bg-orange-100 text-orange-600' : 
                          'bg-orange-100 text-orange-600'
                        }`}>
                          {p.priority}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-2 text-center">
                  <Clock size={16} className="text-slate-200 mx-auto mb-1" />
                  <p className="text-[7px] font-bold text-slate-400">Aucune collecte</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
