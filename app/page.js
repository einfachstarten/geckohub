'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import LoginScreen from '@/components/LoginScreen';
import toast from 'react-hot-toast';
import InstallPrompt from '@/components/InstallPrompt';
import EventsModal from '@/components/EventsModal';
import ThresholdScale from '@/components/ThresholdScale';
import { evaluateTemperature, evaluateHumidity, TEMP_SCALE_CONFIG, HUMIDITY_SCALE_CONFIG } from '@/lib/gecko-thresholds';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { 
  Thermometer, Droplets, Lightbulb, Flame, Activity, RefreshCw, Lock,
  Calendar, Zap, Video, X
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
  const [showEventsModal, setShowEventsModal] = useState(false);
  const [showStreamModal, setShowStreamModal] = useState(false);

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

  // NEU: Einfacher Event-Mapper (keine komplexe Period-Logic)
  const getChartEvents = useCallback(() => {
    if (!historyData.length || !deviceEvents.length) return [];

    // Zeitbereich aus historyData (funktioniert mit ASC und DESC)
    const timestamps = historyData.map(d => new Date(d.time).getTime());
    const chartStart = Math.min(...timestamps);
    const chartEnd = Math.max(...timestamps);

    // Filtere Events im Chart-Zeitbereich
    const filtered = deviceEvents
      .filter(event => {
        const eventTime = new Date(event.timestamp).getTime();
        return eventTime >= chartStart && eventTime <= chartEnd;
      })
      .map(event => {
        const eventDate = new Date(event.timestamp);
        const eventTimeMs = eventDate.getTime();

        // Snap Event auf den nächsten History-Datenpunkt, damit ReferenceLine-X exakt matcht
        const closestDataPoint = historyData.reduce((closest, dataPoint) => {
          const dataTime = new Date(dataPoint.time).getTime();
          const closestTime = new Date(closest.time).getTime();
          const currentDiff = Math.abs(dataTime - eventTimeMs);
          const closestDiff = Math.abs(closestTime - eventTimeMs);
          return currentDiff < closestDiff ? dataPoint : closest;
        }, historyData[0]);

        return {
          timestamp: eventTimeMs,
          displayTime: closestDataPoint.displayTime,
          device: event.device,
          action: event.action,
          source: event.source
        };
      });

    if (filtered.length > 0) {
      console.log('[CHART EVENTS] mapped', {
        count: filtered.length,
        sample: filtered[0],
        historySample: historyData.slice(0, 3).map(d => d.displayTime)
      });
    }

    return filtered;
  }, [historyData, deviceEvents]);

  const chartEvents = getChartEvents();

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
      <InstallPrompt />
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
                  onClick={() => setShowStreamModal(true)}
                  className="p-2 bg-slate-800/60 backdrop-blur-sm rounded-full border border-slate-700/50 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all text-slate-300 hover:text-emerald-300"
                  title="Live-Stream"
                >
                  <Video size={18} />
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
                    {(() => {
                      const tempValue = Number(currentData.temp);
                      const hasTemp = Number.isFinite(tempValue);
                      const tempStatus = hasTemp ? evaluateTemperature(tempValue) : null;
                      const tempScaleValue = hasTemp ? tempValue : TEMP_SCALE_CONFIG.min;

                      return (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-baseline gap-2">
                              <span className="text-5xl font-extrabold text-slate-100 tracking-tighter drop-shadow-[0_8px_25px_rgba(0,0,0,0.45)]">{currentData.temp}</span>
                              <span className="text-xl text-slate-500 ml-1">°C</span>
                            </div>
                            {tempStatus && (
                              <div
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-current ${tempStatus.bgColor} ${tempStatus.textColor} ${tempStatus.status === 'critical' ? 'animate-pulse-critical' : ''}`}
                              >
                                <span className="text-lg">{tempStatus.icon}</span>
                                <span className="text-xs font-semibold tracking-wide">{tempStatus.label}</span>
                              </div>
                            )}
                          </div>
                          <ThresholdScale
                            value={tempScaleValue}
                            min={TEMP_SCALE_CONFIG.min}
                            max={TEMP_SCALE_CONFIG.max}
                            thresholds={TEMP_SCALE_CONFIG.thresholds}
                            type="temperature"
                          />
                        </div>
                      );
                    })()}
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
                    {(() => {
                      const humidityValue = Number(currentData.hum);
                      const hasHumidity = Number.isFinite(humidityValue);
                      const humidityStatus = hasHumidity ? evaluateHumidity(humidityValue) : null;
                      const humidityScaleValue = hasHumidity ? humidityValue : HUMIDITY_SCALE_CONFIG.min;

                      return (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between gap-4 mt-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-5xl font-extrabold text-slate-100">{currentData.hum}</span>
                              <span className="text-xl text-slate-500 ml-1">%</span>
                            </div>
                            {humidityStatus && (
                              <div
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-current ${humidityStatus.bgColor} ${humidityStatus.textColor} ${humidityStatus.status === 'critical' ? 'animate-pulse-critical' : ''}`}
                              >
                                <span className="text-lg">{humidityStatus.icon}</span>
                                <span className="text-xs font-semibold tracking-wide">{humidityStatus.label}</span>
                              </div>
                            )}
                          </div>
                          <ThresholdScale
                            value={humidityScaleValue}
                            min={HUMIDITY_SCALE_CONFIG.min}
                            max={HUMIDITY_SCALE_CONFIG.max}
                            thresholds={HUMIDITY_SCALE_CONFIG.thresholds}
                            type="humidity"
                          />
                        </div>
                      );
                    })()}
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

                    {/* Device Events als vertikale Linien */}
                    {chartEvents.map((event, idx) => {
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
              
              {/* NEU: Event Legend */}
              {chartEvents.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700/30">
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <span className="text-slate-500 font-bold uppercase tracking-wider">Events:</span>
                    
                    {/* Light Legend */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <div className="w-8 h-0.5 bg-yellow-500/60" />
                        <span className="text-yellow-500 font-bold">L↑</span>
                      </div>
                      <span className="text-slate-400">Licht AN</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <div className="w-8 h-0.5 bg-yellow-500/60 border-t-2 border-dashed border-yellow-500/60" />
                        <span className="text-yellow-500 font-bold">L↓</span>
                      </div>
                      <span className="text-slate-400">Licht AUS</span>
                    </div>
                    
                    {/* Heater Legend */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <div className="w-8 h-0.5 bg-orange-500/60" />
                        <span className="text-orange-500 font-bold">H↑</span>
                      </div>
                      <span className="text-slate-400">Heizung AN</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <div className="w-8 h-0.5 bg-orange-500/60 border-t-2 border-dashed border-orange-500/60" />
                        <span className="text-orange-500 font-bold">H↓</span>
                      </div>
                      <span className="text-slate-400">Heizung AUS</span>
                    </div>
                    
                    {/* Event Count - Klickbar */}
                    <button
                      onClick={() => setShowEventsModal(true)}
                      className="text-slate-600 hover:text-emerald-400 ml-auto transition-colors cursor-pointer font-medium hover:underline underline-offset-2"
                    >
                      {chartEvents.length} {chartEvents.length === 1 ? 'Event' : 'Events'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Events Modal */}
          <EventsModal
            isOpen={showEventsModal}
            onClose={() => setShowEventsModal(false)}
            events={deviceEvents}
          />

          {showStreamModal && (
            <>
              <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                onClick={() => setShowStreamModal(false)}
              />
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div
                  className="bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 w-full max-w-4xl pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/20 rounded-lg">
                        <Video size={22} className="text-emerald-400" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-100">Live-Stream</h2>
                        <p className="text-sm text-slate-400">Video-Stream in Vorbereitung</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowStreamModal(false)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      aria-label="Schließen"
                    >
                      <X size={20} className="text-slate-400" />
                    </button>
                  </div>

                  <div className="p-6">
                    <div className="aspect-video w-full rounded-xl border border-dashed border-emerald-500/50 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_20%_20%,rgba(34,197,94,0.25),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(52,211,153,0.15),transparent_25%),radial-gradient(circle_at_50%_80%,rgba(59,130,246,0.15),transparent_30%)]" />
                      <div className="relative z-10 text-center space-y-3 px-6">
                        <div className="inline-flex items-center justify-center p-3 rounded-full bg-emerald-500/10 border border-emerald-400/40">
                          <Video size={28} className="text-emerald-300" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-slate-100">Live-Stream demnächst verfügbar</p>
                          <p className="text-sm text-slate-400 mt-1">
                            Hier erscheint der Video-Feed, sobald die Kamera angebunden ist. Bleib gespannt!
                          </p>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-xs text-emerald-300">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Placeholder aktiv</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          </main>
        </div>
      </>
    );
}
