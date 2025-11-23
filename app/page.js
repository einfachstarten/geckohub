'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea 
} from 'recharts';
import { 
  Thermometer, Droplets, Lightbulb, Flame, Activity, RefreshCw, 
  Calendar, Zap
} from 'lucide-react';

export default function Home() {
  // --- STATE ---
  const [currentData, setCurrentData] = useState({ temp: '--', hum: '--' });
  const [shellyStatus, setShellyStatus] = useState({ light: false, heater: false });
  const [historyData, setHistoryData] = useState([]);
  
  // UI States
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(null);

  // --- LOGIC ---
  
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/history?range=${timeRange}`);
      const data = await res.json();
      
      if (Array.isArray(data) && data.length > 0) {
          setHistoryData(data.map(d => ({
              ...d,
              // Fix für fehlende Linien: String -> Number Konvertierung
              temp: d.temp ? parseFloat(d.temp) : null,
              humidity: d.humidity ? parseFloat(d.humidity) : null,
              displayTime: new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          })));
          
          // Fallback Live-Werte aus History
          const last = data[data.length - 1];
          if (last) setCurrentData({ temp: last.temp, hum: last.humidity });
      }
    } catch (e) { console.error("History Error", e); }
  }, [timeRange]);

  const fetchLive = useCallback(async () => {
    // Govee
    fetch('/api/sensor').then(r => r.json()).then(d => {
        if(d?.data?.properties) {
             const t = d.data.properties.find(p => p.temperature);
             const h = d.data.properties.find(p => p.humidity);
             if(t && h) setCurrentData({ temp: t.temperature, hum: h.humidity });
        }
    }).catch(() => {});

    // Shelly Status
    fetch('/api/shelly').then(r => r.json()).then(d => {
        if(d.success) setShellyStatus(d.status);
    }).catch(() => {});
  }, []);

  // Init & Loop
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchLive(), fetchHistory()]).finally(() => setLoading(false));
    const interval = setInterval(() => { fetchLive(); fetchHistory(); }, 60000);
    return () => clearInterval(interval);
  }, [fetchLive, fetchHistory]);
  
  // Range Switch
  useEffect(() => { fetchHistory(); }, [timeRange, fetchHistory]);

  const toggleShelly = async (target) => {
    setSwitching(target);
    const oldState = shellyStatus[target];
    setShellyStatus(prev => ({ ...prev, [target]: !oldState })); // Optimistic

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
      setShellyStatus(prev => ({ ...prev, [target]: oldState }));
      alert("Fehler beim Schalten!");
    } finally {
      setSwitching(null);
    }
  };

  // --- UI COMPONENTS ---
  
  const TimeRangeBtn = ({ r, label }) => (
    <button
      onClick={() => setTimeRange(r)}
      className={`px-3 py-1 text-xs font-bold rounded-md border transition-all ${
        timeRange === r
          ? 'bg-emerald-400/20 text-emerald-100 border-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
          : 'text-slate-300 border-white/10 hover:text-white hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  );

    return (
      <>
        {/* Background Layer */}
        <div className="fixed inset-0 -z-10">
          <Image
            src="/images/background.jpg"
            alt=""
            fill
            className="object-cover opacity-40"
            priority
            quality={90}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900/85 to-emerald-950/70 mix-blend-multiply" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(16,185,129,0.12),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(239,68,68,0.12),transparent_35%),radial-gradient(circle_at_60%_80%,rgba(59,130,246,0.12),transparent_40%)]" />
        </div>

        <div className="min-h-screen bg-transparent text-slate-100 font-sans pb-10 selection:bg-emerald-400/30">

          {/* Header */}
          <header className="bg-white/5 backdrop-blur-2xl border-b border-white/10 sticky top-0 z-20 shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
            <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 via-teal-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-800/40 ring-1 ring-white/20">
                  <Activity size={22} className="text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-xl tracking-tight text-slate-50">Jungle<span className="text-emerald-400">Glass</span></h1>
                  <p className="text-[11px] text-slate-400 font-semibold tracking-[0.25em] uppercase">Sir Flitzalot HQ</p>
                </div>
              </div>
              <button
                onClick={() => { fetchLive(); fetchHistory(); }}
                className={`p-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/10 hover:border-white/30 hover:bg-white/15 transition-all ${loading ? 'animate-spin text-emerald-400' : 'text-slate-200'}`}
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </header>

          <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        
          {/* --- CARDS --- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Temperatur Card */}
            <div className="relative bg-white/10 backdrop-blur-2xl rounded-2xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)] border border-white/10 overflow-hidden group transition-all duration-500">
               <div className="absolute -right-10 -top-16 w-40 h-40 bg-gradient-to-br from-orange-500/20 via-amber-400/10 to-rose-500/15 rounded-full blur-3xl opacity-80 group-hover:opacity-100 transition-all" />
               <div className="absolute -left-6 bottom-[-60px] w-40 h-40 bg-gradient-to-tr from-emerald-500/10 to-teal-400/5 rounded-full blur-3xl" />
               <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
               <div className="relative z-10">
                  <div className="flex justify-between items-start mb-2">
                     <p className="text-slate-300 text-xs font-bold uppercase tracking-widest">Temperatur</p>
                     <Thermometer size={24} className="text-amber-200 group-hover:text-orange-300 transition-colors"/>
                  </div>
                  <div className="flex items-baseline gap-2">
                     <span className="text-6xl font-bold text-white tracking-tighter drop-shadow-[0_8px_25px_rgba(0,0,0,0.45)]">{currentData.temp}</span>
                     <span className="text-2xl text-slate-300 font-light">°C</span>
                  </div>
                  <div className="mt-6 flex items-center gap-2">
                     <div className={`w-2 h-2 rounded-full ${currentData.temp > 0 ? 'bg-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.75)]' : 'bg-slate-500'}`}></div>
                     <span className="text-xs font-semibold text-amber-100">Heat signature online</span>
                  </div>
                  <div className="mt-5 h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500/70 via-orange-500/70 to-rose-500/50 animate-pulse" style={{ width: '85%' }} />
                  </div>
               </div>
            </div>
            {/* Humidity Card */}
            <div className="relative bg-white/10 backdrop-blur-2xl rounded-2xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)] border border-white/10 overflow-hidden group transition-all duration-500">
               <div className="absolute -right-10 -top-16 w-40 h-40 bg-gradient-to-br from-blue-500/20 via-cyan-400/15 to-indigo-500/15 rounded-full blur-3xl opacity-80 group-hover:opacity-100 transition-all" />
               <div className="absolute left-6 bottom-6 w-1.5 h-6 bg-gradient-to-b from-cyan-200/70 to-blue-500/60 rounded-full animate-drop-fall" style={{ animationDuration: '4s' }} />
               <div className="absolute left-10 bottom-10 w-1 h-4 bg-gradient-to-b from-sky-200/60 to-blue-600/60 rounded-full animate-drop-fall" style={{ animationDuration: '3.2s', animationDelay: '0.6s' }} />
               <div className="relative z-10">
                  <div className="flex justify-between items-start mb-2">
                     <p className="text-slate-300 text-xs font-bold uppercase tracking-widest">Feuchtigkeit</p>
                     <Droplets size={24} className="text-sky-200 group-hover:text-cyan-200 transition-colors"/>
                  </div>
                  <div className="flex items-baseline gap-2">
                     <span className="text-6xl font-bold text-white tracking-tighter drop-shadow-[0_8px_25px_rgba(0,0,0,0.45)]">{currentData.hum}</span>
                     <span className="text-2xl text-slate-300 font-light">%</span>
                  </div>
                  <div className="mt-6 flex items-center gap-2">
                     <div className={`w-2 h-2 rounded-full ${currentData.hum > 0 ? 'bg-sky-400 shadow-[0_0_14px_rgba(56,189,248,0.75)]' : 'bg-slate-500'}`}></div>
                     <span className="text-xs font-semibold text-sky-100">Tropenfeuchte aktiv</span>
                  </div>
                  <div className="mt-5 h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-sky-400/70 via-indigo-400/70 to-emerald-400/60 animate-[pulse_2.5s_ease-in-out_infinite]" style={{ width: '72%' }} />
                  </div>
               </div>
            </div>
            {/* Control Panel */}
            <div className="bg-white/10 backdrop-blur-2xl rounded-2xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)] border border-white/10 flex flex-col justify-center gap-4">
               <p className="text-slate-200 text-xs font-bold uppercase tracking-widest mb-1 px-2">Smart Controls</p>

              {/* Licht Button */}
              <button
                 onClick={() => toggleShelly('light')}
                 disabled={switching === 'light'}
                 className={`relative group w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 overflow-hidden
                   ${shellyStatus.light
                     ? 'border-yellow-400/60 bg-gradient-to-r from-amber-400/20 to-yellow-400/10 shadow-[0_0_24px_rgba(250,204,21,0.35)]'
                     : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'}`}
              >
                 <div className={`absolute inset-0 bg-yellow-500/15 blur-3xl transition-opacity duration-500 ${shellyStatus.light ? 'opacity-100' : 'opacity-0'}`}></div>
                 <div className="relative flex items-center gap-4">
                     <div className={`p-3 rounded-xl transition-colors ${shellyStatus.light ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-amber-950 ring-1 ring-white/30' : 'bg-white/10 text-slate-200 border border-white/10'}`}>
                         <Lightbulb size={20} fill={shellyStatus.light ? "currentColor" : "none"} />
                     </div>
                     <div className="text-left">
                         <span className={`block font-bold text-sm ${shellyStatus.light ? 'text-amber-100' : 'text-slate-100'}`}>Tageslicht</span>
                         <span className="text-[11px] text-slate-300 font-semibold uppercase tracking-wide">{shellyStatus.light ? 'An' : 'Aus'}</span>
                     </div>
                 </div>
                 {switching === 'light' && <RefreshCw size={16} className="animate-spin text-slate-200"/>}
              </button>

              {/* Heizung Button */}
              <button
                 onClick={() => toggleShelly('heater')}
                 disabled={switching === 'heater'}
                 className={`relative group w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ease-in-out overflow-hidden
                   ${shellyStatus.heater
                     ? 'border-red-400/60 bg-gradient-to-r from-orange-500/20 to-rose-500/10 shadow-[0_0_24px_rgba(248,113,113,0.35)]'
                     : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'}`}
              >
                 <div className={`absolute inset-0 bg-gradient-to-br from-orange-400/20 via-amber-500/10 to-red-500/20 blur-3xl transition-opacity duration-500 ${shellyStatus.heater ? 'opacity-100' : 'opacity-0'}`}></div>
                 <div className="relative flex items-center gap-4">
                     <div className={`p-3 rounded-xl transition-all ${shellyStatus.heater ? 'bg-gradient-to-br from-orange-500 via-amber-400 to-rose-500 text-white shadow-md shadow-orange-500/25 ring-1 ring-white/30 animate-pulse' : 'bg-white/10 text-slate-200 border border-white/10'}`}>
                         <Flame size={22} fill={shellyStatus.heater ? "currentColor" : "none"} />
                     </div>
                     <div className="text-left">
                         <span className={`block font-bold text-sm ${shellyStatus.heater ? 'text-orange-50' : 'text-slate-100'}`}>Heizung</span>
                         <span className="text-[11px] text-slate-300 font-semibold uppercase tracking-wide">{shellyStatus.heater ? 'Aktiv' : 'Standby'}</span>
                     </div>
                 </div>
                 {switching === 'heater' && <RefreshCw size={16} className="animate-spin text-slate-200"/>}
              </button>
          </div>

        </div>
          {/* --- CHART SECTION --- */}
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
              <div className="flex items-center gap-3">
                 <Calendar size={20} className="text-emerald-300"/>
                 <h3 className="font-bold text-lg text-white">Klima-Verlauf</h3>
              </div>
              <div className="flex bg-white/5 backdrop-blur-sm p-1 rounded-lg border border-white/10 shadow-inner shadow-black/30">
                  <TimeRangeBtn r="24h" label="24 Std" />
                  <TimeRangeBtn r="7d" label="7 Tage" />
                  <TimeRangeBtn r="30d" label="30 Tage" />
            </div>
          </div>
          
          <div className="h-80 w-full">
            {historyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyData}>
                    <defs>
                        <linearGradient id="colorTemp" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#f87171" stopOpacity={0.8}/>
                        </linearGradient>
                        <linearGradient id="colorHum" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.8}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="displayTime" tick={{fontSize: 12, fill: '#cbd5f5'}} axisLine={false} tickLine={false} minTickGap={40} />
                    <YAxis yAxisId="left" domain={['auto', 'auto']} tick={{fontSize: 12, fill: '#cbd5f5'}} axisLine={false} tickLine={false} width={30} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{fontSize: 12, fill: '#cbd5f5'}} axisLine={false} tickLine={false} width={30} />
                    <Tooltip
                        contentStyle={{backgroundColor: 'rgba(15,23,42,0.92)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0'}}
                        itemStyle={{fontSize: '14px', fontWeight: 'bold'}}
                        labelStyle={{color: '#cbd5f5', marginBottom: '8px', fontSize: '12px'}}
                    />
                    {timeRange === '24h' && (
                        <>
                           <ReferenceArea x1={0} x2={8} yAxisId="left" fill="#1e1b4b" fillOpacity={0.08} />
                           <ReferenceArea x1={20} x2={24} yAxisId="left" fill="#1e1b4b" fillOpacity={0.08} />
                        </>
                    )}
                    <Line yAxisId="left" type="monotone" dataKey="temp" stroke="url(#colorTemp)" strokeWidth={4} dot={false} activeDot={{r: 6, fill: '#ef4444'}} name="Temp" unit="°C" />
                    <Line yAxisId="right" type="monotone" dataKey="humidity" stroke="url(#colorHum)" strokeWidth={4} dot={false} activeDot={{r: 6, fill: '#3b82f6'}} name="Feuchte" unit="%" />
                  </LineChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300">
                    <Activity size={48} className="mb-4 opacity-40 text-emerald-300" />
                    <p className="text-sm">Warte auf Datenpunkte...</p>
                </div>
            )}
          </div>
        </div>

          </main>
        </div>
      </>
    );
}
