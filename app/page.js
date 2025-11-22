'use client';

import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea 
} from 'recharts';
import { 
  Thermometer, Droplets, Lightbulb, Flame, Activity, RefreshCw, 
  Calendar, ShieldAlert, Sun, Moon, CheckCircle2
} from 'lucide-react';

export default function Home() {
  // --- STATE ---
  const [sensorData, setSensorData] = useState(null);
  const [shellyStatus, setShellyStatus] = useState({ light: false, heater: false });
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [historyData, setHistoryData] = useState([]);

  // --- API CALLS ---
  
  // 1. Sensordaten (Govee)
  const fetchSensor = React.useCallback(async () => {
    try {
      const res = await fetch('/api/sensor');
      const json = await res.json();
      if (!json.error) setSensorData(json.data);
    } catch (e) { console.error(e); }
  }, []);

  // 2. Gerätestatus (Shelly) - NEU!
  const fetchShellyStatus = React.useCallback(async () => {
    try {
      const res = await fetch('/api/shelly'); // Ruft die neue GET Route auf
      const json = await res.json();
      if (json.success) setShellyStatus(json.status);
    } catch (e) { console.error(e); }
  }, []);

  // Master Refresh Funktion
  const refreshAll = React.useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchSensor(), fetchShellyStatus()]);
    setLastUpdated(new Date());
    setLoading(false);
  }, [fetchSensor, fetchShellyStatus]);

  // 3. Schalten (Shelly)
  const toggleShelly = async (target) => {
    setSwitching(target);
    // Optimistic UI Update (wir tun so als ob es schon geschaltet hat)
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
      
      if (!json.success) {
        // Rollback bei Fehler
        setShellyStatus(prev => ({ ...prev, [target]: oldState }));
        alert('Schaltfehler: ' + json.error);
      }
    } catch (e) {
      setShellyStatus(prev => ({ ...prev, [target]: oldState }));
    } finally {
      setSwitching(null);
    }
  };

  // Initial Load & Mock History Generator
  useEffect(() => {
    refreshAll();

    // Generiere Mock History mit Tag/Nacht Logik für den Chart
    const mock = [];
    let t = 22;
    for(let i=0; i<24; i++) {
        const isDay = i >= 8 && i <= 20;
        t += isDay ? 0.5 : -0.5; 
        t += (Math.random() - 0.5);
        mock.push({ 
            time: `${i}:00`, 
            temp: parseFloat(t.toFixed(1)), 
            humidity: Math.floor(60 + Math.random()*10) 
        });
    }
    setHistoryData(mock);

    // Auto-Refresh alle 60s
    const interval = setInterval(refreshAll, 60000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  // --- HELPER ---
  const getVal = (key) => {
    if (!sensorData?.properties) return null;
    const prop = sensorData.properties.find(p => key in p);
    return prop ? prop[key] : null;
  };

  const temp = getVal('temperature');
  const hum = getVal('humidity');

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white shadow-emerald-200 shadow-lg">
              <Activity size={20} />
            </div>
            <h1 className="font-bold text-lg tracking-tight text-slate-800">Flitz<span className="text-emerald-500">HQ</span></h1>
          </div>
          <button 
            onClick={refreshAll} 
            disabled={loading}
            className={`p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-all ${loading ? 'animate-spin text-emerald-600' : 'text-slate-600'}`}
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        
        {/* --- KEY METRICS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Temperatur */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:border-emerald-200 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Thermometer size={100} className="text-red-500" />
            </div>
            <p className="text-slate-500 font-medium text-xs uppercase tracking-wider">Klima</p>
            <div className="flex items-baseline mt-2">
              <span className="text-5xl font-bold text-slate-800">{temp || '--'}</span>
              <span className="ml-1 text-xl text-slate-400">°C</span>
            </div>
            <div className="mt-4 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${temp ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                <span className="text-sm font-medium text-emerald-600">Live Sensor</span>
            </div>
          </div>

          {/* Luftfeuchtigkeit */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:border-blue-200 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Droplets size={100} className="text-blue-500" />
            </div>
            <p className="text-slate-500 font-medium text-xs uppercase tracking-wider">Feuchtigkeit</p>
            <div className="flex items-baseline mt-2">
              <span className="text-5xl font-bold text-slate-800">{hum || '--'}</span>
              <span className="ml-1 text-xl text-slate-400">%</span>
            </div>
            <div className="mt-4 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${hum ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                <span className="text-sm font-medium text-blue-600">Live Sensor</span>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
            <p className="text-slate-500 font-medium text-xs uppercase tracking-wider mb-4">Gerätesteuerung</p>
            <div className="space-y-3">
                
                {/* Licht */}
                <button 
                    onClick={() => toggleShelly('light')}
                    disabled={switching === 'light'}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${shellyStatus.light ? 'bg-yellow-50 border-yellow-200 shadow-sm' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${shellyStatus.light ? 'bg-yellow-400 text-white' : 'bg-slate-200 text-slate-400'}`}>
                            <Lightbulb size={20} />
                        </div>
                        <div className="text-left">
                            <span className="block font-bold text-sm text-slate-700">Tageslicht</span>
                            <span className="text-xs text-slate-500">{shellyStatus.light ? 'Aktiv seit 08:00' : 'Inaktiv'}</span>
                        </div>
                    </div>
                    {switching === 'light' ? <RefreshCw className="animate-spin text-slate-400" size={18} /> : (
                        <div className={`w-3 h-3 rounded-full ${shellyStatus.light ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]' : 'bg-slate-300'}`}></div>
                    )}
                </button>

                {/* Heizung */}
                <button 
                    onClick={() => toggleShelly('heater')}
                    disabled={switching === 'heater'}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${shellyStatus.heater ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${shellyStatus.heater ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                            <Flame size={20} />
                        </div>
                        <div className="text-left">
                            <span className="block font-bold text-sm text-slate-700">Heizung</span>
                            <span className="text-xs text-slate-500">{shellyStatus.heater ? 'Heizt aktiv' : 'Standby'}</span>
                        </div>
                    </div>
                    {switching === 'heater' ? <RefreshCw className="animate-spin text-slate-400" size={18} /> : (
                        <div className={`w-3 h-3 rounded-full ${shellyStatus.heater ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-slate-300'}`}></div>
                    )}
                </button>

            </div>
          </div>
        </div>

        {/* --- CHART --- */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Calendar size={18} className="text-emerald-500"/> 24h Verlauf
              </h3>
            </div>
            <div className="flex gap-3 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-100 border border-amber-200"></div> Tagphase</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-50 border border-indigo-100"></div> Nachtphase</span>
            </div>
          </div>
          
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{fontSize: 11, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" domain={['dataMin - 2', 'dataMax + 2']} tick={{fontSize: 11, fill: '#ef4444'}} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)'}} />
                
                {/* Tag/Nacht Zonen Visualisierung */}
                <ReferenceArea x1="00:00" x2="08:00" yAxisId="left" fill="#eef2ff" fillOpacity={0.5} />
                <ReferenceArea x1="08:00" x2="20:00" yAxisId="left" fill="#fffbeb" fillOpacity={0.5} />
                <ReferenceArea x1="20:00" x2="23:00" yAxisId="left" fill="#eef2ff" fillOpacity={0.5} />

                <Line yAxisId="left" type="monotone" dataKey="temp" stroke="#ef4444" strokeWidth={3} dot={false} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </main>
    </div>
  );
}
