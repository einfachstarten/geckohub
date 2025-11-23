'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import LoginScreen from '@/components/LoginScreen';
import toast from 'react-hot-toast';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea
} from 'recharts';
import {
  Thermometer, Droplets, Lightbulb, Flame, Activity, RefreshCw, Lock,
  Calendar, Zap
} from 'lucide-react';

export default function Home() {
  // --- STATE ---
  const [currentData, setCurrentData] = useState({ temp: '--', hum: '--' });
  const [shellyStatus, setShellyStatus] = useState({ light: false, heater: false });
  const [historyData, setHistoryData] = useState([]);
  const [deviceEvents, setDeviceEvents] = useState([]);

  // UI States
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

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

  // NEU: Lade Device Events für Chart-Visualisierung
  const fetchEvents = useCallback(async () => {
    const hoursMap = { '24h': 24, '7d': 168, '30d': 720 };
    const hours = hoursMap[timeRange] || 24;

    try {
      const res = await fetch(`/api/events?hours=${hours}`);
      
      if (!res.ok) {
        throw new Error(`Events API: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (data.events && Array.isArray(data.events)) {
        setDeviceEvents(data.events);
      }
    } catch (e) {
      console.error('[EVENTS ERROR]', e);
      // Events sind optional - kein Toast bei Fehler
      setDeviceEvents([]);
    }
  }, [timeRange]);

  const fetchShellyStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();

      if (data?.success && data.status) {
        setShellyStatus(data.status);
      }
    } catch (error) {
      console.error('Shelly Status Error', error);
    }
  }, []);

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
    fetchShellyStatus();
  }, [fetchShellyStatus]);

  // Check Authentication beim Mount
  useEffect(() => {
    const localAuth = localStorage.getItem('flitzhq_auth');
    const sessionAuth = sessionStorage.getItem('flitzhq_auth');

    if (localAuth === 'true' || sessionAuth === 'true') {
      setIsAuthenticated(true);
    }

    setAuthChecked(true);
  }, []);

  // Init & Loop
  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    Promise.all([fetchLive(), fetchHistory(), fetchEvents()]).finally(() => setLoading(false));
    const interval = setInterval(() => { fetchLive(); fetchHistory(); fetchEvents(); }, 60000);
    return () => clearInterval(interval);
  }, [fetchLive, fetchHistory, fetchEvents, isAuthenticated]);

  // Range Switch
  useEffect(() => {
    if (isAuthenticated) {
      fetchHistory();
      fetchEvents();
    }
  }, [timeRange, fetchHistory, fetchEvents, isAuthenticated]);

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
      fetchShellyStatus();
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
      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
        timeRange === r
          ? 'bg-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/20'
          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/40'
      }`}
    >
      {label}
    </button>
  );

  // Helper: Berechne "Nacht"-Perioden (Licht AUS) aus Events
  const calculateNightPeriods = useCallback(() => {
    if (!historyData.length || !deviceEvents.length) return [];

    // Filter nur Licht-Events
    const lightEvents = deviceEvents
      .filter(e => e.device === 'light')
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (lightEvents.length === 0) return [];

    // Zeitbereich aus historyData
    const chartStart = new Date(historyData[0].time);
    const chartEnd = new Date(historyData[historyData.length - 1].time);

    const periods = [];
    let currentState = lightEvents[0].action; // 'on' oder 'off'
    let periodStart = chartStart;

    lightEvents.forEach((event) => {
      const eventTime = new Date(event.timestamp);
      
      if (eventTime < chartStart) {
        // Event ist vor Chart-Bereich → State übernehmen
        currentState = event.action;
        return;
      }

      if (eventTime > chartEnd) return; // Event nach Chart → ignorieren

      // Wenn Licht ausgeht → Nacht-Periode beginnt
      if (event.action === 'off' && currentState === 'on') {
        periodStart = eventTime;
      }
      
      // Wenn Licht angeht → Nacht-Periode endet
      if (event.action === 'on' && currentState === 'off') {
        periods.push({
          start: periodStart.getTime(),
          end: eventTime.getTime()
        });
      }

      currentState = event.action;
    });

    // Falls Chart mit "Licht AUS" endet
    if (currentState === 'off') {
      periods.push({
        start: periodStart.getTime(),
        end: chartEnd.getTime()
      });
    }

    return periods;
  }, [historyData, deviceEvents]);

  // Helper: Berechne Heizungs-Events für Indikator-Linie
  const calculateHeaterPeriods = useCallback(() => {
    if (!historyData.length || !deviceEvents.length) return [];

    const heaterEvents = deviceEvents
      .filter(e => e.device === 'heater')
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (heaterEvents.length === 0) return [];

    const chartStart = new Date(historyData[0].time);
    const chartEnd = new Date(historyData[historyData.length - 1].time);

    const periods = [];
    let currentState = heaterEvents[0].action;
    let periodStart = chartStart;

    heaterEvents.forEach((event) => {
      const eventTime = new Date(event.timestamp);
      
      if (eventTime < chartStart) {
        currentState = event.action;
        return;
      }

      if (eventTime > chartEnd) return;

      if (event.action === 'off' && currentState === 'on') {
        periods.push({
          start: periodStart.getTime(),
          end: eventTime.getTime()
        });
      }
      
      if (event.action === 'on' && currentState === 'off') {
        periodStart = eventTime;
      }

      currentState = event.action;
    });

    if (currentState === 'on') {
      periods.push({
        start: periodStart.getTime(),
        end: chartEnd.getTime()
      });
    }

    return periods;
  }, [historyData, deviceEvents]);

  const nightPeriods = calculateNightPeriods();
  const heaterPeriods = calculateHeaterPeriods();

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 animate-pulse">
            <Activity size={32} />
          </div>
          <p className="text-slate-500 text-sm">Lade FlitzHQ...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <>
      {/* Background Layer */}
      <div className="fixed inset-0 -z-10">
        <Image
          src="/images/background.jpg"
          alt=""
          fill
          className="object-cover opacity-15"
          priority
          quality={90}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900/80 to-slate-950" />
      </div>

      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-10 selection:bg-emerald-400/30">

        {/* Header */}
          <header className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-20 shadow-2xl shadow-black/20">
            <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 via-teal-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-800/40 ring-1 ring-white/20">
                  <Activity size={22} className="text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-xl tracking-tight text-slate-100">Flitz<span className="text-emerald-400">HQ</span></h1>
                  <p className="text-[11px] text-slate-500 font-semibold tracking-[0.25em] uppercase">Sir Flitzalot Automation</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    localStorage.removeItem('flitzhq_auth');
                    sessionStorage.removeItem('flitzhq_auth');
                    setIsAuthenticated(false);
                    toast('Abgemeldet', { icon: '👋' });
                  }}
                  className="p-2 bg-slate-800/60 backdrop-blur-sm rounded-full hover:bg-slate-700/80 text-slate-400 hover:text-slate-300 transition-colors"
                  title="Abmelden"
                >
                  <Lock size={18} />
                </button>
                <button
                  onClick={() => { 
                    fetchLive(); 
                    fetchHistory(); 
                    fetchEvents();
                    toast('Aktualisiere Daten...', { icon: '🔄' });
                  }}
                  className={`p-2 bg-slate-800/60 backdrop-blur-sm rounded-full border border-slate-700/50 hover:border-slate-600 hover:bg-slate-700/80 transition-all text-slate-300 hover:text-slate-100 ${loading ? 'animate-spin text-emerald-400' : ''}`}
                >
                  <RefreshCw size={18} />
                </button>
              </div>
            </div>
          </header>

        <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">

        {/* --- CARDS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Temperatur Card */}
              <div className="relative bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 shadow-2xl shadow-black/20 border border-slate-700/30 overflow-hidden group transition-all duration-500">
                 <div className="absolute -right-10 -top-16 w-40 h-40 bg-gradient-to-br from-orange-500/20 via-amber-400/10 to-rose-500/15 rounded-full blur-3xl opacity-80 group-hover:opacity-100 transition-all" />
                 <div className="absolute -left-6 bottom-[-60px] w-40 h-40 bg-gradient-to-tr from-emerald-500/10 to-teal-400/5 rounded-full blur-3xl" />
                 <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                 <div className="relative z-10">
                   <div className="flex justify-between items-start mb-2">
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Temperatur</p>
                      <Thermometer size={24} className="text-amber-300 group-hover:text-orange-300 transition-colors"/>
                   </div>
                    <div className="flex items-baseline gap-2">
                       <span className="text-5xl font-extrabold text-slate-100 tracking-tighter drop-shadow-[0_8px_25px_rgba(0,0,0,0.45)]">{currentData.temp}</span>
                       <span className="text-xl text-slate-500 ml-1">°C</span>
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
              <div className="relative bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 shadow-2xl shadow-black/20 border border-slate-700/30 overflow-hidden group transition-all duration-500">
                 {/* Background Icon */}
                 <div className="absolute top-0 right-0 p-4 opacity-10 text-slate-700">
                   <Droplets size={120} />
                 </div>

                 {/* Animierte Tropfen bei >70% */}
                 {currentData.hum > 70 && (
                   <div className="absolute inset-0 pointer-events-none">
                     {[...Array(6)].map((_, i) => (
                       <div
                         key={i}
                         className="droplet absolute text-blue-400/30"
                         style={{
                           left: `${Math.random() * 80 + 10}%`,
                           animationDelay: `${i * 0.5}s`,
                           animationDuration: `${3 + Math.random() * 2}s`
                         }}
                       >
                         <Droplets size={16} />
                       </div>
                     ))}
                   </div>
                 )}

                 <div className="relative z-10">
                    <div className="flex justify-between items-start mb-2">
                       <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Feuchtigkeit</p>
                       <Droplets size={24} className="text-sky-200 group-hover:text-cyan-200 transition-colors"/>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                       <span className="text-5xl font-extrabold text-slate-100">{currentData.hum}</span>
                       <span className="text-xl text-slate-500 ml-1">%</span>
                    </div>

                    {/* Live Sensor Badge */}
                    {currentData.hum > 70 && (
                      <div className="flex items-center gap-1.5 mt-3 relative z-10">
                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                        <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Hohe Luftfeuchtigkeit</span>
                      </div>
                    )}
                 </div>
              </div>
              {/* Control Panel */}
              <div className="bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 shadow-2xl shadow-black/20 border border-slate-700/30 flex flex-col justify-center gap-4">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1 px-2">Smart Controls</p>

              {/* Licht Button */}
              <button
                 onClick={() => toggleShelly('light')}
                 disabled={switching === 'light'}
                  className={`relative group w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 overflow-hidden
                    ${shellyStatus.light
                      ? 'border-yellow-500 bg-yellow-900/30 shadow-lg shadow-yellow-500/20'
                      : 'border-slate-700/60 hover:border-slate-600 bg-slate-800/40'}`}
                >
                  <div className={`absolute inset-0 bg-yellow-500/15 blur-3xl transition-opacity duration-500 ${shellyStatus.light ? 'opacity-100' : 'opacity-0'}`}></div>
                  <div className="relative flex items-center gap-4">
                      <div className={`p-2 rounded-full ${shellyStatus.light ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/50' : 'bg-slate-700 text-slate-500'}`}>
                          <Lightbulb size={20}/>
                      </div>
                      <div className="text-left">
                          <div className="font-bold text-sm text-slate-200">Tageslicht</div>
                          <div className="text-[10px] text-slate-500 uppercase font-bold">{shellyStatus.light ? 'AN' : 'AUS'}</div>
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
                      ? 'border-orange-500 bg-orange-900/30 shadow-lg shadow-orange-500/20'
                      : 'border-slate-700/60 hover:border-slate-600 bg-slate-800/40'}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br from-orange-400/20 via-amber-500/10 to-red-500/20 blur-3xl transition-opacity duration-500 ${shellyStatus.heater ? 'opacity-100' : 'opacity-0'}`}></div>
                  <div className="relative flex items-center gap-4">
                      <div className={`p-2 rounded-full ${shellyStatus.heater ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/50' : 'bg-slate-700 text-slate-500'}`}>
                          <Flame size={20}/>
                      </div>
                      <div className="text-left">
                          <div className="font-bold text-sm text-slate-200">Heizung</div>
                          <div className="text-[10px] text-slate-500 uppercase font-bold">{shellyStatus.heater ? 'AN' : 'AUS'}</div>
                      </div>
                  </div>
                  {switching === 'heater' && <RefreshCw size={16} className="animate-spin text-slate-200"/>}
               </button>
          </div>

        </div>
          {/* --- CHART SECTION --- */}
            <div className="bg-slate-900/70 backdrop-blur-md rounded-2xl p-6 shadow-2xl shadow-black/20 border border-slate-700/30">
              <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
                <div className="flex items-center gap-3">
                   <h3 className="font-bold text-slate-200 flex items-center gap-2">
                     <Calendar size={18} className="text-emerald-400"/> Verlauf
                   </h3>
                </div>
                <div className="flex bg-slate-800/60 backdrop-blur-sm p-1 rounded-lg">
                    <TimeRangeBtn r="24h" label="24 Std" />
                    <TimeRangeBtn r="7d" label="7 Tage" />
                    <TimeRangeBtn r="30d" label="30 Tage" />
            </div>
          </div>
          
          <div className="h-80 w-full">
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
                    
                    {/* Nacht-Perioden (Licht AUS) */}
                    {nightPeriods.map((period, idx) => {
                      // Finde Data Indizes für Start/End
                      const startIdx = historyData.findIndex(d => new Date(d.time).getTime() >= period.start);
                      const endIdx = historyData.findIndex(d => new Date(d.time).getTime() >= period.end);
                      
                      if (startIdx === -1) return null;
                      
                      const x1 = historyData[startIdx]?.displayTime;
                      const x2 = endIdx === -1 
                        ? historyData[historyData.length - 1]?.displayTime 
                        : historyData[endIdx]?.displayTime;

                      return (
                        <ReferenceArea 
                          key={`night-${idx}`}
                          x1={x1} 
                          x2={x2} 
                          yAxisId="left" 
                          fill="#1e293b" 
                          fillOpacity={0.08}
                          strokeOpacity={0}
                        />
                      );
                    })}

                    {/* Heizungs-Perioden (am unteren Rand) */}
                    {heaterPeriods.map((period, idx) => {
                      const startIdx = historyData.findIndex(d => new Date(d.time).getTime() >= period.start);
                      const endIdx = historyData.findIndex(d => new Date(d.time).getTime() >= period.end);
                      
                      if (startIdx === -1) return null;
                      
                      const x1 = historyData[startIdx]?.displayTime;
                      const x2 = endIdx === -1 
                        ? historyData[historyData.length - 1]?.displayTime 
                        : historyData[endIdx]?.displayTime;

                      // Y-Bereich: Am unteren Chart-Rand
                      const yMin = Math.min(...historyData.map(d => parseFloat(d.temp) || 0));
                      const yMax = yMin + 1; // 1°C hoher Streifen

                      return (
                        <ReferenceArea 
                          key={`heater-${idx}`}
                          x1={x1} 
                          x2={x2} 
                          y1={yMin}
                          y2={yMax}
                          yAxisId="left" 
                          fill="#f97316" 
                          fillOpacity={0.6}
                          strokeOpacity={0}
                        />
                      );
                    })}

                    <Line yAxisId="left" type="monotone" dataKey="temp" stroke="#ef4444" strokeWidth={3} dot={false} activeDot={{r: 6}} name="Temp" unit="°C" />
                    <Line yAxisId="right" type="monotone" dataKey="humidity" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{r: 6}} name="Feuchte" unit="%" />
                  </LineChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-600">
                    <Activity size={48} className="mb-2 opacity-20" />
                    <p className="text-slate-500">Sammle Daten... (Warte auf ersten Cron-Job)</p>
                    <p className="text-xs mt-2 opacity-60 text-slate-600">Tipp: Rufe /api/cron einmal manuell auf</p>
                </div>
              )}
            </div>
          </div>

          </main>
        </div>
      </>
    );
}
