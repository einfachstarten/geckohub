'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea
} from 'recharts';
import {
  Thermometer, Droplets, Lightbulb, Flame, Activity, RefreshCw,
  Calendar
} from 'lucide-react';

export default function Home() {
  // --- DATA STATES ---
  const [currentData, setCurrentData] = useState({ temp: '--', hum: '--', timestamp: 0 });
  const [shellyStatus, setShellyStatus] = useState({
    light: {
      output: null,
      power: null,
      voltage: null,
      current: null,
      energy: null,
      temp: null,
      online: null
    },
    heater: {
      output: null,
      power: null,
      voltage: null,
      current: null,
      energy: null,
      temp: null,
      online: null
    }
  });
  const [historyData, setHistoryData] = useState([]);

  // --- UI STATES ---
  const [timeRange, setTimeRange] = useState('24h'); // '24h', '7d', '30d'
  const [loadingStates, setLoadingStates] = useState({
    initial: true,
    liveData: false,
    historyData: false,
    chartRefresh: false
  });
  const [switching, setSwitching] = useState(null);

  // --- REFS ---
  const isFirstLoad = useRef(true);

  // --- CHART DATA (inkl. Live-Daten) ---
  const chartData = useMemo(() => {
    if (historyData.length === 0) return [];

    const data = [...historyData];

    if (currentData.temp !== '--' && currentData.hum !== '--') {
      const lastHistoryTime = new Date(data[data.length - 1].time).getTime();
      const currentTime = currentData.timestamp || Date.now();

      if (currentTime > lastHistoryTime) {
        data.push({
          time: new Date(currentTime).toISOString(),
          temp: currentData.temp,
          humidity: currentData.hum,
          light: null,
          heater: null,
          displayTime: 'Jetzt',
          isLive: true
        });
      }
    }

    return data;
  }, [historyData, currentData]);

  // --- STATISTICS (MEMOIZED) ---
  const calculatedStatistics = useMemo(() => {
    if (historyData.length === 0) return {
      tempMin: null,
      tempMax: null,
      humMin: null,
      humMax: null
    };

    const temps = historyData.map(d => parseFloat(d.temp)).filter(t => !isNaN(t));
    const hums = historyData.map(d => parseFloat(d.humidity)).filter(h => !isNaN(h));

    return {
      tempMin: temps.length > 0 ? Math.min(...temps).toFixed(1) : null,
      tempMax: temps.length > 0 ? Math.max(...temps).toFixed(1) : null,
      humMin: hums.length > 0 ? Math.min(...hums).toFixed(1) : null,
      humMax: hums.length > 0 ? Math.max(...hums).toFixed(1) : null
    };
  }, [historyData]);

  // 1. Lade History & Chart Daten
  const fetchHistory = useCallback(async () => {
    setLoadingStates(prev => ({ ...prev, historyData: true, chartRefresh: true }));
    
    try {
      const res = await fetch(`/api/history?range=${timeRange}`);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();

      if (!Array.isArray(data)) {
        throw new Error('Ungültiges Datenformat von API');
      }

      if (data.length > 0) {
        setHistoryData(data.map(d => ({
          ...d,
          displayTime: timeRange === '24h'
            ? new Date(d.time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
            : timeRange === '7d'
            ? new Date(d.time).toLocaleDateString('de-DE', { weekday: 'short', hour: '2-digit' })
            : new Date(d.time).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })
        })));

      } else {
        // Keine Daten vorhanden - kein Error, nur Info
        if (timeRange !== '24h') {
          toast('Keine Daten für diesen Zeitraum', { icon: 'ℹ️' });
        }
      }
    } catch (e) {
      console.error("History Fetch Error:", e);
      toast.error(`Verlaufsdaten konnten nicht geladen werden: ${e.message}`);
      setHistoryData([]); // Clear auf Fehler
    } finally {
      setLoadingStates(prev => ({ ...prev, historyData: false, chartRefresh: false }));
    }
  }, [timeRange]);

  // 2. Lade Live-Daten (Govee direkt + Shelly Status)
  const fetchLive = useCallback(async () => {
    setLoadingStates(prev => ({ ...prev, liveData: true }));

    try {
      // Govee Live Data
      const sensorPromise = fetch('/api/sensor')
        .then(r => {
          if (!r.ok) throw new Error(`Sensor API: ${r.status}`);
          return r.json();
        })
        .then(d => {
          if (d?.data?.properties) {
            const t = d.data.properties.find(p => p.temperature);
            const h = d.data.properties.find(p => p.humidity);
            if (t && h) {
              setCurrentData({
                temp: t.temperature,
                hum: h.humidity,
                timestamp: Date.now()
              });
              return true;
            }
          }
          throw new Error('Sensor-Daten unvollständig');
        })
        .catch(e => {
          console.error("Govee Error:", e);
          if (isFirstLoad.current) {
            toast.error(`Sensor offline: ${e.message}`);
          }
          return false;
        });

      // Shelly Status
      const shellyPromise = fetch('/api/shelly')
        .then(r => {
          if (!r.ok) throw new Error(`Shelly API: ${r.status}`);
          return r.json();
        })
        .then(d => {
          if (d.success) {
            console.log('[SHELLY DATA]', d.status); // Debug
            setShellyStatus(d.status);
            return true;
          }
          throw new Error('Shelly Status ungültig');
        })
        .catch(e => {
          console.error("Shelly Error:", e);
          if (isFirstLoad.current) {
            toast.error(`Shelly-Geräte nicht erreichbar: ${e.message}`);
          }
          return false;
        });

      const [sensorSuccess, shellySuccess] = await Promise.all([sensorPromise, shellyPromise]);

      // Nur Success-Toast wenn initial load
      if (isFirstLoad.current && sensorSuccess && shellySuccess) {
        toast.success('Dashboard geladen');
        isFirstLoad.current = false;
      }

    } finally {
      setLoadingStates(prev => ({ ...prev, liveData: false }));
    }
  }, []);

  const updateCurrentDataFromHistory = useCallback(() => {
    if (currentData.temp === '--' && historyData.length > 0) {
      const last = historyData[historyData.length - 1];
      setCurrentData({ temp: last.temp, hum: last.humidity, timestamp: Date.now() });
    }
  }, [currentData, historyData]);

  // Init & Refresh Logic
  useEffect(() => {
    setLoadingStates(prev => ({ ...prev, initial: true }));
    Promise.all([fetchLive(), fetchHistory()]).finally(() => {
      setLoadingStates(prev => ({ ...prev, initial: false }));
    });
  }, [fetchLive, fetchHistory]); // Beim Start

  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      updateCurrentDataFromHistory();
    }, 5000);

    return () => clearTimeout(fallbackTimer);
  }, [updateCurrentDataFromHistory]);

  // Range Switch Effect
  useEffect(() => {
    fetchHistory();
  }, [timeRange, fetchHistory]);

  // Auto-Refresh alle 60 Sekunden
  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/api/sensor').then(r => r.json()).then(d => {
        if(d?.data?.properties) {
          const t = d.data.properties.find(p => p.temperature);
          const h = d.data.properties.find(p => p.humidity);
          if(t && h) setCurrentData({ temp: t.temperature, hum: h.humidity, timestamp: Date.now() });
        }
      }).catch(() => {});

      fetch('/api/shelly').then(r => r.json()).then(d => {
        if(d.success) setShellyStatus(d.status);
      }).catch(() => {});
    }, 60000); // 60 Sekunden

    return () => clearInterval(interval);
  }, []);


  // --- ACTIONS ---
  const toggleShelly = async (target) => {
    setSwitching(target);
    
    const oldState = shellyStatus[target];
    const newOutputState = !oldState.output;
    const newState = newOutputState ? 'on' : 'off';
    const deviceName = target === 'light' ? 'Tageslicht' : 'Heizung';
    
    // Optimistic update - nur output ändern, Rest behalten
    setShellyStatus(prev => ({ 
      ...prev, 
      [target]: { ...prev[target], output: newOutputState }
    }));

    try {
      const res = await fetch('/api/shelly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, action: newState })
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      
      if (!json.success) {
        throw new Error(json.error || 'Unbekannter API-Fehler');
      }

      toast.success(`${deviceName} wurde ${newState === 'on' ? 'eingeschaltet' : 'ausgeschaltet'}`, {
        icon: target === 'light' ? '💡' : '🔥'
      });

      // Nach erfolgreichem Schalten: Aktuellen Status laden
      setTimeout(() => {
        fetch('/api/shelly').then(r => r.json()).then(d => {
          if(d.success) setShellyStatus(d.status);
        }).catch(() => {});
      }, 1000);

    } catch (e) {
      console.error(`Shelly Toggle Error (${target}):`, e);
      
      // Rollback
      setShellyStatus(prev => ({ 
        ...prev, 
        [target]: oldState
      }));
      
      // Error Message mit Details
      toast.error(`${deviceName} konnte nicht geschaltet werden: ${e.message}`, {
        duration: 6000
      });
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
          <button 
            onClick={() => { 
              fetchLive(); 
              fetchHistory(); 
              toast('Aktualisiere Daten...', { icon: '🔄' });
            }} 
            className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-600 transition-colors disabled:opacity-50"
            disabled={loadingStates.liveData || loadingStates.historyData}
          >
            <RefreshCw 
              size={18} 
              className={(loadingStates.liveData || loadingStates.historyData) ? "animate-spin" : ""} 
            />
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
            <div className="flex items-baseline mt-1 mb-2">
              <span className="text-5xl font-extrabold text-slate-800">{currentData.temp}</span>
              <span className="text-xl text-slate-400 ml-1">°C</span>
            </div>
            {calculatedStatistics.tempMin !== null && calculatedStatistics.tempMax !== null && (
              <div className="flex gap-4 text-xs mt-3">
                <div className="flex items-center gap-1">
                  <span className="text-blue-500">↓</span>
                  <span className="text-slate-600 font-medium">{calculatedStatistics.tempMin}°C</span>
                  <span className="text-slate-400">min</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-red-500">↑</span>
                  <span className="text-slate-600 font-medium">{calculatedStatistics.tempMax}°C</span>
                  <span className="text-slate-400">max</span>
                </div>
              </div>
            )}
          </div>

          {/* Humidity */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5"><Droplets size={120} /></div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Feuchtigkeit</p>
            <div className="flex items-baseline mt-1 mb-2">
              <span className="text-5xl font-extrabold text-slate-800">{currentData.hum}</span>
              <span className="text-xl text-slate-400 ml-1">%</span>
            </div>
            {calculatedStatistics.humMin !== null && calculatedStatistics.humMax !== null && (
              <div className="flex gap-4 text-xs mt-3">
                <div className="flex items-center gap-1">
                  <span className="text-blue-500">↓</span>
                  <span className="text-slate-600 font-medium">{calculatedStatistics.humMin}%</span>
                  <span className="text-slate-400">min</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-red-500">↑</span>
                  <span className="text-slate-600 font-medium">{calculatedStatistics.humMax}%</span>
                  <span className="text-slate-400">max</span>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-center gap-3">
             {/* Licht */}
             <button
                onClick={() => toggleShelly('light')}
                disabled={switching === 'light' || shellyStatus.light.output === null || loadingStates.initial}
                className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                  shellyStatus.light.output === null
                    ? 'border-slate-200 bg-slate-50 cursor-not-allowed'
                    : shellyStatus.light.output 
                    ? 'border-yellow-400 bg-yellow-50' 
                    : 'border-slate-100 hover:border-slate-200'
                }`}
             >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      shellyStatus.light.output === null
                        ? 'bg-slate-300 text-slate-500'
                        : shellyStatus.light.output 
                        ? 'bg-yellow-400 text-white' 
                        : 'bg-slate-200 text-slate-400'
                    }`}><Lightbulb size={20}/></div>
                    <div className="text-left">
                      <div className="font-bold text-sm text-slate-700">Tageslicht</div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">
                        {shellyStatus.light.output === null 
                          ? 'LADEN...' 
                          : shellyStatus.light.output ? 'AN' : 'AUS'}
                      </div>
                      {shellyStatus.light.output && shellyStatus.light.power > 0 && (
                        <div className="text-[10px] text-yellow-600 font-semibold mt-0.5">
                          {Math.round(shellyStatus.light.power)} W
                        </div>
                      )}
                    </div>
                </div>
                {switching === 'light' && <RefreshCw size={16} className="animate-spin text-slate-400"/>}
             </button>

             {/* Heizung */}
             <button
                onClick={() => toggleShelly('heater')}
                disabled={switching === 'heater' || shellyStatus.heater.output === null || loadingStates.initial}
                className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                  shellyStatus.heater.output === null
                    ? 'border-slate-200 bg-slate-50 cursor-not-allowed'
                    : shellyStatus.heater.output 
                    ? 'border-red-400 bg-red-50' 
                    : 'border-slate-100 hover:border-slate-200'
                }`}
             >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      shellyStatus.heater.output === null
                        ? 'bg-slate-300 text-slate-500'
                        : shellyStatus.heater.output 
                        ? 'bg-red-500 text-white' 
                        : 'bg-slate-200 text-slate-400'
                    }`}><Flame size={20}/></div>
                    <div className="text-left">
                      <div className="font-bold text-sm text-slate-700">Heizung</div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">
                        {shellyStatus.heater.output === null 
                          ? 'LADEN...' 
                          : shellyStatus.heater.output ? 'AN' : 'AUS'}
                      </div>
                      {shellyStatus.heater.output && shellyStatus.heater.power > 0 && (
                        <div className="text-[10px] text-red-600 font-semibold mt-0.5">
                          {Math.round(shellyStatus.heater.power)} W
                        </div>
                      )}
                    </div>
                </div>
                {switching === 'heater' && <RefreshCw size={16} className="animate-spin text-slate-400"/>}
             </button>
          </div>
        </div>

        {/* Chart Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-6">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <Calendar size={18} className="text-emerald-500"/> 
                Verlauf
              </h3>
              {/* Legend */}
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-red-500"></div>
                  <span className="text-slate-600">Temperatur</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-blue-500"></div>
                  <span className="text-slate-600">Feuchtigkeit</span>
                </div>
                {historyData.some(d => d.light !== undefined) && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                    <span className="text-slate-600">Licht</span>
                  </div>
                )}
                {historyData.some(d => d.heater !== undefined) && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-slate-600">Heizung</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex bg-slate-50 p-1 rounded-lg">
                <TimeRangeBtn r="24h" label="24 Std" />
                <TimeRangeBtn r="7d" label="7 Tage" />
                <TimeRangeBtn r="30d" label="30 Tage" />
            </div>
          </div>
          
            <div className="h-72 w-full">
              {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />

                      {/* X-Axis mit dynamischem Interval */}
                      <XAxis
                        dataKey="displayTime"
                        tick={{fontSize: 10, fill: '#94a3b8'}}
                        axisLine={false}
                        tickLine={false}
                        interval={timeRange === '30d' ? 'preserveEnd' : 'preserveStartEnd'}
                        minTickGap={timeRange === '24h' ? 20 : 40}
                        angle={timeRange === '30d' ? -45 : 0}
                        textAnchor={timeRange === '30d' ? 'end' : 'middle'}
                        height={timeRange === '30d' ? 60 : 30}
                      />

                      {/* Left Y-Axis: Temperature */}
                      <YAxis
                        yAxisId="left"
                        domain={['dataMin - 1', 'dataMax + 1']}
                        tick={{fontSize: 11, fill: '#ef4444'}}
                        axisLine={false}
                        tickLine={false}
                        label={{ value: '°C', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#94a3b8' } }}
                      />

                      {/* Right Y-Axis: Humidity */}
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        domain={['dataMin - 5', 'dataMax + 5']}
                        tick={{fontSize: 11, fill: '#3b82f6'}}
                        axisLine={false}
                        tickLine={false}
                        label={{ value: '%', angle: 90, position: 'insideRight', style: { fontSize: 10, fill: '#94a3b8' } }}
                        allowDataOverflow={false}
                      />

                      {/* Tooltip mit Custom Content */}
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || payload.length === 0) return null;
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200">
                              <div className="flex items-center gap-2 mb-2">
                                <p className="text-slate-500 text-xs font-semibold">{data.displayTime}</p>
                                {data.isLive && (
                                  <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[9px] font-bold rounded uppercase">Live</span>
                                )}
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                  <span className="text-sm text-slate-700 font-medium">{data.temp}°C</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                  <span className="text-sm text-slate-700 font-medium">{data.humidity}%</span>
                                </div>
                                {data.light !== undefined && data.light !== null && (
                                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                                    <div className={`w-2 h-2 rounded-full ${data.light ? 'bg-yellow-400' : 'bg-slate-300'}`}></div>
                                    <span className="text-xs text-slate-600">Licht {data.light ? 'AN' : 'AUS'}</span>
                                  </div>
                                )}
                                {data.heater !== undefined && data.heater !== null && (
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${data.heater ? 'bg-red-500' : 'bg-slate-300'}`}></div>
                                    <span className="text-xs text-slate-600">Heizung {data.heater ? 'AN' : 'AUS'}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }}
                      />

                      {/* Reference Areas für Tag/Nacht (nur bei 24h) */}
                      {timeRange === '24h' && historyData.length > 0 && (
                        <>
                          <ReferenceArea
                            x1={historyData[0]?.displayTime}
                            x2={historyData.find(d => {
                              const hour = new Date(d.time).getHours();
                              return hour >= 6;
                            })?.displayTime}
                            yAxisId="left"
                            fill="#1e293b"
                            fillOpacity={0.05}
                            label={{ value: '🌙', position: 'insideTopLeft', style: { fontSize: 16 } }}
                          />
                          <ReferenceArea
                            x1={historyData.find(d => {
                              const hour = new Date(d.time).getHours();
                              return hour >= 20;
                            })?.displayTime}
                            x2={historyData[historyData.length - 1]?.displayTime}
                            yAxisId="left"
                            fill="#1e293b"
                            fillOpacity={0.05}
                            label={{ value: '🌙', position: 'insideTopRight', style: { fontSize: 16 } }}
                          />
                        </>
                      )}

                      {/* Temperature Line */}
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="temp"
                        stroke="#ef4444"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{r: 6, fill: '#ef4444', stroke: '#fff', strokeWidth: 2}}
                        name="Temperatur"
                      />

                      {/* Humidity Line */}
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="humidity"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={(props) => {
                          const { cx, cy, payload } = props;
                          if (payload?.isLive) {
                            return (
                              <circle
                                cx={cx}
                                cy={cy}
                                r={6}
                                fill="#3b82f6"
                                stroke="#fff"
                                strokeWidth={3}
                              />
                            );
                          }
                          return null;
                        }}
                        activeDot={{r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2}}
                        name="Feuchtigkeit"
                      />

                      {/* Light Status Area (optional, nur wenn gewünscht) */}
                      {historyData.some(d => d.light) && (
                        <Line
                          yAxisId="left"
                          type="stepAfter"
                          dataKey={(d) => d.light ? 1 : 0}
                          stroke="#fbbf24"
                          strokeWidth={0}
                          fill="#fef3c7"
                          fillOpacity={0.2}
                          dot={false}
                          name="Licht Status"
                          connectNulls
                        />
                      )}
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
