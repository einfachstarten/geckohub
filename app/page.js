'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
      className={`px-4 py-1 text-xs font-bold rounded-full transition-all ${
        timeRange === r 
          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
          : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-emerald-500/30">
      
      {/* Header */}
      <header className="border-b border-neutral-900 sticky top-0 z-20 bg-neutral-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/20">
              <Activity size={22} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight">Jungle<span className="text-emerald-500">Glass</span></h1>
              <p className="text-xs text-neutral-500 font-medium tracking-wider uppercase">Sir Flitzalot HQ</p>
            </div>
          </div>
          <button 
            onClick={() => { fetchLive(); fetchHistory(); }} 
            className={`p-3 rounded-full bg-neutral-900 border border-neutral-800 hover:border-emerald-500/50 hover:text-emerald-400 transition-all ${loading ? 'animate-spin text-emerald-500' : 'text-neutral-400'}`}
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        
        {/* --- CARDS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Temperatur Card */}
          <div className="relative bg-neutral-900/50 border border-white/5 rounded-3xl p-8 overflow-hidden group hover:border-white/10 transition-all duration-500">
             <div className="absolute -right-6 -top-6 w-32 h-32 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-all"></div>
             <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                   <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest">Temperatur</p>
                   <Thermometer size={24} className="text-neutral-500 group-hover:text-red-400 transition-colors"/>
                </div>
                <div className="flex items-baseline gap-2">
                   <span className="text-6xl font-bold text-white tracking-tighter">{currentData.temp}</span>
                   <span className="text-2xl text-neutral-500 font-light">°C</span>
                </div>
                <div className="mt-6 flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${currentData.temp > 0 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-neutral-700'}`}></div>
                   <span className="text-xs font-medium text-emerald-500">Live Sensor</span>
                </div>
             </div>
          </div>

          {/* Humidity Card */}
          <div className="relative bg-neutral-900/50 border border-white/5 rounded-3xl p-8 overflow-hidden group hover:border-white/10 transition-all duration-500">
             <div className="absolute -right-6 -top-6 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
             <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                   <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest">Feuchtigkeit</p>
                   <Droplets size={24} className="text-neutral-500 group-hover:text-blue-400 transition-colors"/>
                </div>
                <div className="flex items-baseline gap-2">
                   <span className="text-6xl font-bold text-white tracking-tighter">{currentData.hum}</span>
                   <span className="text-2xl text-neutral-500 font-light">%</span>
                </div>
                <div className="mt-6 flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${currentData.hum > 0 ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'bg-neutral-700'}`}></div>
                   <span className="text-xs font-medium text-blue-500">Live Sensor</span>
                </div>
             </div>
          </div>

          {/* Control Panel */}
          <div className="bg-neutral-900/50 border border-white/5 rounded-3xl p-6 flex flex-col justify-center gap-4">
             <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-1 px-2">Smart Controls</p>
             
             {/* Licht Button */}
             <button 
                onClick={() => toggleShelly('light')}
                disabled={switching === 'light'}
                className={`relative group w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 overflow-hidden
                  ${shellyStatus.light 
                    ? 'bg-yellow-500/10 border-yellow-500/50 hover:bg-yellow-500/20' 
                    : 'bg-neutral-800/40 border-white/5 hover:bg-neutral-800/60'}`}
             >
                <div className={`absolute inset-0 bg-yellow-500/20 blur-xl transition-opacity duration-500 ${shellyStatus.light ? 'opacity-100' : 'opacity-0'}`}></div>
                <div className="relative flex items-center gap-4">
                    <div className={`p-3 rounded-xl transition-colors ${shellyStatus.light ? 'bg-yellow-500 text-black' : 'bg-neutral-800 text-neutral-400'}`}>
                        <Lightbulb size={20} fill={shellyStatus.light ? "currentColor" : "none"} />
                    </div>
                    <div className="text-left">
                        <span className={`block font-bold text-sm ${shellyStatus.light ? 'text-yellow-100' : 'text-neutral-300'}`}>Tageslicht</span>
                        <span className="text-xs text-neutral-500 font-medium uppercase tracking-wide">{shellyStatus.light ? 'An' : 'Aus'}</span>
                    </div>
                </div>
                {switching === 'light' && <RefreshCw size={16} className="animate-spin text-neutral-500"/>}
             </button>

             {/* Heizung Button */}
             <button 
                onClick={() => toggleShelly('heater')}
                disabled={switching === 'heater'}
                className={`relative group w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 overflow-hidden
                  ${shellyStatus.heater 
                    ? 'bg-red-500/10 border-red-500/50 hover:bg-red-500/20' 
                    : 'bg-neutral-800/40 border-white/5 hover:bg-neutral-800/60'}`}
             >
                <div className={`absolute inset-0 bg-red-500/20 blur-xl transition-opacity duration-500 ${shellyStatus.heater ? 'opacity-100' : 'opacity-0'}`}></div>
                <div className="relative flex items-center gap-4">
                    <div className={`p-3 rounded-xl transition-colors ${shellyStatus.heater ? 'bg-red-500 text-white' : 'bg-neutral-800 text-neutral-400'}`}>
                        <Flame size={20} fill={shellyStatus.heater ? "currentColor" : "none"} />
                    </div>
                    <div className="text-left">
                        <span className={`block font-bold text-sm ${shellyStatus.heater ? 'text-red-100' : 'text-neutral-300'}`}>Heizung</span>
                        <span className="text-xs text-neutral-500 font-medium uppercase tracking-wide">{shellyStatus.heater ? 'Aktiv' : 'Standby'}</span>
                    </div>
                </div>
                {switching === 'heater' && <RefreshCw size={16} className="animate-spin text-neutral-500"/>}
             </button>
          </div>

        </div>

        {/* --- CHART SECTION --- */}
        <div className="bg-neutral-900/50 border border-white/5 rounded-3xl p-8 shadow-xl">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
            <div className="flex items-center gap-3">
               <Calendar size={20} className="text-emerald-500"/>
               <h3 className="font-bold text-lg text-white">Klima-Verlauf</h3>
            </div>
            <div className="flex bg-neutral-900 p-1.5 rounded-full border border-white/5">
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
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                    <XAxis dataKey="displayTime" tick={{fontSize: 12, fill: '#525252'}} axisLine={false} tickLine={false} minTickGap={40} />
                    <YAxis yAxisId="left" domain={['auto', 'auto']} tick={{fontSize: 12, fill: '#525252'}} axisLine={false} tickLine={false} width={30} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{fontSize: 12, fill: '#525252'}} axisLine={false} tickLine={false} width={30} />
                    <Tooltip 
                        contentStyle={{backgroundColor: '#171717', borderRadius: '12px', border: '1px solid #262626', color: '#fff'}}
                        itemStyle={{fontSize: '14px', fontWeight: 'bold'}}
                        labelStyle={{color: '#737373', marginBottom: '8px', fontSize: '12px'}}
                    />
                    {timeRange === '24h' && (
                        <>
                           <ReferenceArea x1={0} x2={8} yAxisId="left" fill="#1e1b4b" fillOpacity={0.3} /> 
                           <ReferenceArea x1={20} x2={24} yAxisId="left" fill="#1e1b4b" fillOpacity={0.3} /> 
                        </>
                    )}
                    <Line yAxisId="left" type="monotone" dataKey="temp" stroke="url(#colorTemp)" strokeWidth={4} dot={false} activeDot={{r: 6, fill: '#ef4444'}} name="Temp" unit="°C" />
                    <Line yAxisId="right" type="monotone" dataKey="humidity" stroke="url(#colorHum)" strokeWidth={4} dot={false} activeDot={{r: 6, fill: '#3b82f6'}} name="Feuchte" unit="%" />
                  </LineChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-neutral-600">
                    <Activity size={48} className="mb-4 opacity-20" />
                    <p className="text-sm">Warte auf Datenpunkte...</p>
                </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
