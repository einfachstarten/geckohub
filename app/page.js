'use client';

import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea
} from 'recharts';
import {
  Thermometer, Droplets, Lightbulb, Flame, Activity, RefreshCw, Power,
  Calendar, Zap, ShieldAlert
} from 'lucide-react';

export default function Home() {
  // --- STATE ---
  const [sensorData, setSensorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Shelly States
  const [lightState, setLightState] = useState(false);
  const [heaterState, setHeaterState] = useState(false);
  const [switching, setSwitching] = useState(null); // 'light' | 'heater'

  // Mock History Data (Platzhalter bis DB voll ist)
  const [historyData, setHistoryData] = useState([]);

  // --- FETCH DATA ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sensor');
      const json = await res.json();
      
      if (json.error) throw new Error(json.error);
      setSensorData(json.data); // Erwartet { properties: [{temperature:..}, {humidity:..}] }
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Sensor Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- TOGGLE SHELLY ---
  const toggleShelly = async (target) => {
    setSwitching(target);
    const currentState = target === 'light' ? lightState : heaterState;
    const newState = !currentState ? 'on' : 'off';

    try {
      const res = await fetch('/api/shelly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, action: newState })
      });
      const json = await res.json();
      
      if (json.success) {
        if (target === 'light') setLightState(!lightState);
        if (target === 'heater') setHeaterState(!heaterState);
      } else {
        alert('Fehler: ' + (json.error || 'Unbekannt'));
      }
    } catch (e) {
      alert('Verbindungsfehler zum Server');
    } finally {
      setSwitching(null);
    }
  };

  // --- INITIAL LOAD & POLLING ---
  useEffect(() => {
    fetchData();
    // Generate Mock History for Chart
    const mock = [];
    let t = 22;
    for(let i=0; i<24; i++) {
        t += (Math.random() - 0.5);
        mock.push({ time: `${i}:00`, temp: t.toFixed(1), humidity: 60 + Math.random()*10 });
    }
    setHistoryData(mock);

    // Poll every 60s
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  // --- HELPER ---
  const getVal = (key) => {
    if (!sensorData?.properties) return '---';
    const prop = sensorData.properties.find(p => key in p);
    return prop ? prop[key] : '---';
  };

  const currentTemp = parseFloat(getVal('temperature')) || 0;
  const currentHum = parseFloat(getVal('humidity')) || 0;

  // --- UI COMPONENTS ---
  const StatCard = ({ title, value, unit, icon: Icon, color, subtext }) => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden">
      <div className={`absolute top-0 right-0 p-3 opacity-10`}>
        <Icon size={80} color={color} />
      </div>
      <div>
        <p className="text-slate-500 font-medium text-sm uppercase tracking-wider">{title}</p>
        <div className="flex items-baseline mt-2">
          <span className="text-4xl font-bold text-slate-800">{value}</span>
          <span className="ml-1 text-xl text-slate-400">{unit}</span>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${value > 0 ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
        <p className="text-sm font-medium text-emerald-600">{subtext}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
              <Activity size={20} />
            </div>
            <h1 className="font-bold text-lg tracking-tight text-slate-800">Flitz<span className="text-emerald-500">HQ</span></h1>
          </div>
          
          <div className="flex items-center gap-3">
             {lastUpdated && <span className="text-xs text-slate-400 hidden sm:block">Stand: {lastUpdated.toLocaleTimeString()}</span>}
             <button 
                onClick={fetchData} 
                disabled={loading}
                className={`p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors ${loading ? 'animate-spin text-emerald-600' : 'text-slate-600'}`}
             >
                <RefreshCw size={18} />
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        
        {/* --- METRICS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard 
            title="Temperatur" 
            value={loading && !currentTemp ? "..." : currentTemp} 
            unit="°C" 
            icon={Thermometer} 
            color="#ef4444"
            subtext="Optimaler Bereich"
          />
          <StatCard 
            title="Feuchtigkeit" 
            value={loading && !currentHum ? "..." : currentHum} 
            unit="%" 
            icon={Droplets} 
            color="#3b82f6"
            subtext="Optimaler Bereich"
          />
          
          {/* Quick Actions Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
                <p className="text-slate-500 font-medium text-sm uppercase tracking-wider mb-4">Steuerung</p>
                <div className="space-y-3">
                    
                    {/* Licht Button */}
                    <button 
                        onClick={() => toggleShelly('light')}
                        disabled={switching === 'light'}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${lightState ? 'bg-yellow-50 border-yellow-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${lightState ? 'bg-yellow-400 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                <Lightbulb size={18} />
                            </div>
                            <span className="font-bold text-sm text-slate-700">Licht</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${lightState ? 'text-yellow-600' : 'text-slate-400'}`}>{lightState ? 'AN' : 'AUS'}</span>
                            {switching === 'light' && <RefreshCw size={14} className="animate-spin text-slate-400"/>}
                        </div>
                    </button>

                    {/* Heizung Button */}
                    <button 
                        onClick={() => toggleShelly('heater')}
                        disabled={switching === 'heater'}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${heaterState ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${heaterState ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                <Flame size={18} />
                            </div>
                            <span className="font-bold text-sm text-slate-700">Heizung</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${heaterState ? 'text-red-600' : 'text-slate-400'}`}>{heaterState ? 'AN' : 'AUS'}</span>
                            {switching === 'heater' && <RefreshCw size={14} className="animate-spin text-slate-400"/>}
                        </div>
                    </button>

                </div>
            </div>
          </div>
        </div>

        {/* --- CHART --- */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Calendar size={18} className="text-emerald-500"/> Verlauf (24h)
              </h3>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{fontSize: 11, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" domain={['dataMin - 2', 'dataMax + 2']} tick={{fontSize: 11, fill: '#ef4444'}} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)'}} />
                <Line yAxisId="left" type="monotone" dataKey="temp" stroke="#ef4444" strokeWidth={3} dot={false} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </main>
    </div>
  );
}
