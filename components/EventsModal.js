'use client';

import React from 'react';
import { X, Lightbulb, Flame, Calendar } from 'lucide-react';

export default function EventsModal({ isOpen, onClose, events }) {
  if (!isOpen) return null;

  // Formatiere Datum/Zeit für bessere Lesbarkeit
  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    const dateStr = date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short'
    });
    const timeStr = date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
    return { date: dateStr, time: timeStr };
  };

  // Device Config für Icons und Farben
  const deviceConfig = {
    light: {
      icon: Lightbulb,
      name: 'Tageslicht',
      colorOn: 'text-yellow-400',
      colorOff: 'text-yellow-600',
      bgOn: 'bg-yellow-500/10',
      bgOff: 'bg-slate-700/30'
    },
    heater: {
      icon: Flame,
      name: 'Heizung',
      colorOn: 'text-orange-400',
      colorOff: 'text-orange-600',
      bgOn: 'bg-orange-500/10',
      bgOff: 'bg-slate-700/30'
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 w-full max-w-4xl max-h-[85vh] flex flex-col pointer-events-auto animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Sticky */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Calendar size={24} className="text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-100">Device Events</h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  {events.length} {events.length === 1 ? 'Event' : 'Events'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Schließen"
            >
              <X size={24} className="text-slate-400" />
            </button>
          </div>

          {/* Table Container - Scrollbar */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800/50">
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <Calendar size={48} className="mb-3 opacity-40" />
                <p>Keine Events gefunden</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-slate-800/95 backdrop-blur-md border-b border-slate-700/50 z-10">
                  <tr>
                    <th className="text-left p-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Zeit
                    </th>
                    <th className="text-left p-4 text-xs font-bold uppercase tracking-wider text-slate-400 hidden sm:table-cell">
                      Datum
                    </th>
                    <th className="text-left p-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Device
                    </th>
                    <th className="text-left p-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Aktion
                    </th>
                    <th className="text-left p-4 text-xs font-bold uppercase tracking-wider text-slate-400 hidden md:table-cell">
                      Quelle
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event, idx) => {
                    const config = deviceConfig[event.device];
                    const Icon = config?.icon || Calendar;
                    const isOn = event.action === 'on';
                    const { date, time } = formatDateTime(event.timestamp);

                    return (
                      <tr
                        key={event.id || idx}
                        className="border-b border-slate-700/30 hover:bg-white/5 transition-colors"
                      >
                        {/* Zeit */}
                        <td className="p-4">
                          <span className="font-mono text-sm text-slate-300 font-semibold">
                            {time}
                          </span>
                          {/* Mobile: Datum unter Zeit */}
                          <span className="block sm:hidden text-xs text-slate-500 mt-1">
                            {date}
                          </span>
                        </td>

                        {/* Datum - nur Desktop */}
                        <td className="p-4 hidden sm:table-cell">
                          <span className="text-sm text-slate-400">
                            {date}
                          </span>
                        </td>

                        {/* Device mit Icon */}
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${isOn ? config?.bgOn : config?.bgOff}`}>
                              <Icon
                                size={18}
                                className={isOn ? config?.colorOn : config?.colorOff}
                              />
                            </div>
                            <span className="text-sm text-slate-200 hidden sm:inline">
                              {config?.name || event.device}
                            </span>
                          </div>
                        </td>

                        {/* Aktion */}
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                              isOn
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-slate-700/50 text-slate-400'
                            }`}
                          >
                            {isOn ? '● AN' : '○ AUS'}
                          </span>
                        </td>

                        {/* Quelle - nur Desktop */}
                        <td className="p-4 hidden md:table-cell">
                          <span className="text-xs text-slate-500 uppercase tracking-wider">
                            {event.source || 'user'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
