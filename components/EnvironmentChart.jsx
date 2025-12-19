import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Activity } from 'lucide-react';

const EnvironmentChart = ({ data, events, range }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-600">
        <Activity size={48} className="mb-2 opacity-20" />
        <p className="text-slate-500">Sammle Daten... (Warte auf ersten Cron-Job)</p>
        <p className="text-xs mt-2 opacity-60 text-slate-600">Tipp: Rufe /api/cron einmal manuell auf</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />

          <XAxis
            type="category"
            dataKey="time"
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            tickLine={{ stroke: '#475569' }}
            // Alle Ticks anzeigen (keine automatische Ausdünnung)
            interval={range === '24h' ? 3 : range === '7d' ? 6 : 4}
            angle={-45}
            textAnchor="end"
            height={60}
          />

          <YAxis yAxisId="left" domain={['auto', 'auto']} tick={{fontSize: 11, fill: '#ef4444'}} axisLine={false} tickLine={false} />
          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{fontSize: 11, fill: '#3b82f6'}} axisLine={false} tickLine={false} />

          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '8px'
            }}
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;

              const data = payload[0].payload;
              const hasData = data.temperature !== null || data.humidity !== null;

              if (!hasData) {
                return (
                  <div className="bg-slate-900/95 border border-slate-700/50 rounded-lg p-3">
                    <p className="text-slate-400 text-sm">Keine Daten</p>
                    <p className="text-slate-500 text-xs">{data.time}</p>
                  </div>
                );
              }

              return (
                <div className="bg-slate-900/95 border border-slate-700/50 rounded-lg p-3 space-y-1">
                  <p className="text-slate-400 text-sm font-medium">{data.time}</p>
                  {data.temperature !== null && (
                    <p className="text-orange-400">
                      Temperatur: {data.temperature}°C
                    </p>
                  )}
                  {data.humidity !== null && (
                    <p className="text-blue-400">
                      Luftfeuchtigkeit: {data.humidity}%
                    </p>
                  )}
                </div>
              );
            }}
          />

          {/* Device Events als vertikale Linien */}
          {events && events.map((event, idx) => {
            const isLight = event.device === 'light';
            const isOn = event.action === 'on';

            // Farben: Gelb für Light, Orange für Heater
            const color = isLight ? '#eab308' : '#f97316';

            // Stil: Durchgezogen für ON, Gestrichelt für OFF
            const strokeDasharray = isOn ? '0' : '4 4';

            // Label: L/H für Device, ↑/↓ für ON/OFF
            const deviceLabel = isLight ? 'L' : 'H';
            const actionLabel = isOn ? '↑' : '↓';
            const labelText = `${deviceLabel}${actionLabel}`;

            // Label Position: ON oben, OFF unten (weniger Overlap)
            const labelPosition = isOn ? 'top' : 'bottom';

            return (
              <ReferenceLine
                key={`event-${idx}-${event.timestamp}`}
                x={event.displayTime}
                yAxisId="left"
                stroke={color}
                strokeWidth={2}
                strokeDasharray={strokeDasharray}
                strokeOpacity={0.6}
                label={{
                  value: labelText,
                  position: labelPosition,
                  fontSize: 12,
                  fontWeight: 'bold',
                  fill: color,
                  offset: 10
                }}
              />
            );
          })}

          <Line
            yAxisId="left"
            type="monotone"
            dataKey="temperature"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
            connectNulls={false}  // ← WICHTIG: Unterbricht bei null
            isAnimationActive={false}
            name="Temp"
            unit="°C"
          />

          <Line
            yAxisId="right"
            type="monotone"
            dataKey="humidity"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
            name="Feuchte"
            unit="%"
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Data Status Indicator */}
      {data && (() => {
        const totalSlots = data.length;
        const slotsWithData = data.filter(d =>
          d.temperature !== null || d.humidity !== null
        ).length;
        const coverage = totalSlots > 0
          ? Math.round((slotsWithData / totalSlots) * 100)
          : 0;

        if (coverage < 100) {
          return (
            <div className="mt-2 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-amber-400/70">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>Datenlücken vorhanden ({coverage}% Abdeckung)</span>
              </div>
            </div>
          );
        }
      })()}
    </div>
  );
};

export default EnvironmentChart;
