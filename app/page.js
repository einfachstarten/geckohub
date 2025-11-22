'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea 
} from 'recharts';
import { 
  Thermometer, Droplets, Lightbulb, Flame, Activity, RefreshCw, 
  Calendar, Sun, Moon 
} from 'lucide-react';

export default function Home() {
  // --- DATA STATES ---
  const [currentData, setCurrentData] = useState({ temp: '--', hum: '--' });
  const [shellyStatus, setShellyStatus] = useState({ light: false, heater: false });
  const [historyData, setHistoryData] = useState([]);
  
  // --- UI STATES ---
  const [timeRange, setTimeRange] = useState('24h'); // '24h', '7d', '30d'
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(null);

  // 1. Lade History & Chart Daten
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/history?range=${timeRange}`);
      const data = await res.json();
      
      if (Array.isArray(data) && data.length > 0) {
          setHistoryData(data.map(d => ({
              ...d,
              // Formatiere Zeit für X-Achse je nach Range
              displayTime: new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          })));
          
          // Setze aktuelle Werte basierend auf dem allerletzten Eintrag (Realtime-Ersatz falls Govee API laggt)
          const last = data[data.length - 1];
          setCurrentData({ temp: last.temp, hum: last.humidity });
      }
    } catch (e) { console.error("History Error", e); }
  }, [timeRange]);

  // 2. Lade Live-Daten (Govee direkt + Shelly Status)
  const fetchLive = useCallback(async () => {
    // Govee Live
    fetch('/api/sensor').then(r => r.json()).then(d => {
        if(d?.data?.properties) {
             const t = d.data.properties.find(p => p.temperature);
             const h = d.data.properties.find(p => p.humidity);
             if(t && h) setCurrentData({ temp: t.temperature, hum: h.humidity });
        }
    }).catch(() => {});

    // Shelly Status (GET) - WICHTIG: Das synchronisiert den Button beim Laden!
    fetch('/api/shelly').then(r => r.json()).then(d => {
        if(d.success) setShellyStatus(d.status);
    }).catch(() => {});
  }, []);

  // Init & Refresh Logic
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchLive(), fetchHistory()]).finally(() => setLoading(false));
  }, [fetchLive, fetchHistory]); // Beim Start

  // Range Switch Effect
  useEffect(() => {
    fetchHistory();
  }, [timeRange, fetchHistory]);


  // --- ACTIONS ---
  const toggleShelly = async (target) => {
    setSwitching(target);
    // Optimistic update
    const oldState = shellyStatus[target];
    setShellyStatus(prev => ({ ...prev, [target]: !oldState }));

    try {
      const newState = !oldState ? 'on' : 'off';
      const res = await fetch('/api/shelly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, action: newState })
      });
      const json = await res.json();
      if(!json.success) throw new Error(json.error);
    } catch (e) {
      setShellyStatus(prev => ({ ...prev, [target]: oldState })); // Rollback
      alert("Schaltfehler!");
    } finally {
      setSwitching(null);
    }
  };

  // --- RENDER COMPONENTS ---
  const TimeRangeBtn = ({ r, label }) => (
    <button 
      onClick={() => setTimeRange(r)}
      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${timeRange === r ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:text-slate-600'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-10">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <Activity size={20} />
            </div>
            <h1 className="font-bold text-lg tracking-tight text-slate-800">Flitz<span className="text-emerald-500">HQ</span></h1>
          </div>
          <button onClick={() => { fetchLive(); fetchHistory(); }} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-600">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Temp */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5"><Thermometer size={120} /></div>
             <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Temperatur</p>
             <div className="flex items-baseline mt-1">
               <span className="text-5xl font-extrabold text-slate-800">{currentData.temp}</span>
               <span className="text-xl text-slate-400 ml-1">°C</span>
             </div>
          </div>

          {/* Humidity */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5"><Droplets size={120} /></div>
             <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Feuchtigkeit</p>
             <div className="flex items-baseline mt-1">
               <span className="text-5xl font-extrabold text-slate-800">{currentData.hum}</span>
               <span className="text-xl text-slate-400 ml-1">%</span>
             </div>
          </div>

          {/* Controls */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-center gap-3">
             {/* Licht */}
             <button 
                onClick={() => toggleShelly('light')} 
                disabled={switching === 'light'}
                className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${shellyStatus.light ? 'border-yellow-400 bg-yellow-50' : 'border-slate-100 hover:border-slate-200'}`}
             >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${shellyStatus.light ? 'bg-yellow-400 text-white' : 'bg-slate-200 text-slate-400'}`}><Lightbulb size={20}/></div>
                    <div className="text-left"><div className="font-bold text-sm text-slate-700">Tageslicht</div><div className="text-[10px] text-slate-500 uppercase font-bold">{shellyStatus.light ? 'AN' : 'AUS'}</div></div>
                </div>
                {switching === 'light' && <RefreshCw size={16} className="animate-spin text-slate-400"/>}
             </button>

             {/* Heizung */}
             <button 
                onClick={() => toggleShelly('heater')} 
                disabled={switching === 'heater'}
                className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${shellyStatus.heater ? 'border-red-400 bg-red-50' : 'border-slate-100 hover:border-slate-200'}`}
             >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${shellyStatus.heater ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-400'}`}><Flame size={20}/></div>
                    <div className="text-left"><div className="font-bold text-sm text-slate-700">Heizung</div><div className="text-[10px] text-slate-500 uppercase font-bold">{shellyStatus.heater ? 'AN' : 'AUS'}</div></div>
                </div>
                {switching === 'heater' && <RefreshCw size={16} className="animate-spin text-slate-400"/>}
             </button>
          </div>
        </div>

        {/* Chart Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-700 flex items-center gap-2"><Calendar size={18} className="text-emerald-500"/> Verlauf</h3>
            <div className="flex bg-slate-50 p-1 rounded-lg">
                <TimeRangeBtn r="24h" label="24 Std" />
                <TimeRangeBtn r="7d" label="7 Tage" />
                <TimeRangeBtn r="30d" label="30 Tage" />
            </div>
          </div>
          
          <div className="h-72 w-full">
            {historyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="displayTime" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={30}/>
                    <YAxis yAxisId="left" domain={['auto', 'auto']} tick={{fontSize: 11, fill: '#ef4444'}} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{fontSize: 11, fill: '#3b82f6'}} axisLine={false} tickLine={false} />
                    <Tooltip 
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)'}}
                        labelStyle={{color: '#94a3b8', fontSize: '12px', marginBottom: '4px'}}
                    />
                    {/* Tag/Nacht Indikator für 24h View */}
                    {timeRange === '24h' && (
                        <>
                           <ReferenceArea x1={0} x2={8} yAxisId="left" fill="#eef2ff" fillOpacity={0.4} /> 
                           <ReferenceArea x1={20} x2={24} yAxisId="left" fill="#eef2ff" fillOpacity={0.4} /> 
                        </>
                    )}
                    <Line yAxisId="left" type="monotone" dataKey="temp" stroke="#ef4444" strokeWidth={3} dot={false} activeDot={{r: 6}} name="Temp" unit="°C" />
                    <Line yAxisId="right" type="monotone" dataKey="humidity" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{r: 6}} name="Feuchte" unit="%" />
                  </LineChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <Activity size={48} className="mb-2 opacity-20" />
                    <p>Sammle Daten... (Warte auf ersten Cron-Job)</p>
                    <p className="text-xs mt-2 opacity-60">Tipp: Rufe /api/cron einmal manuell auf</p>
                </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
