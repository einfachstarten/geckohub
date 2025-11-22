'use client';

import Image from 'next/image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Calendar,
  Droplets,
  Flame,
  Lightbulb,
  RefreshCw,
  Thermometer
} from 'lucide-react';

const BG_IMAGE =
  'https://images.unsplash.com/photo-1536147116438-62679a5e01f2?q=80&w=2000&auto=format&fit=crop';
const NOISE_SVG =
  "data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E";

const GlassCard = ({ children, className = '' }) => (
  <div
    className={`relative rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl flex flex-col ${className}`}
  >
    <div
      className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay z-0"
      style={{ backgroundImage: `url("${NOISE_SVG}")` }}
    />
    <div className="relative z-10 flex-1 flex flex-col">{children}</div>
  </div>
);

const Header = ({ onRefresh, refreshing, lastUpdated }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-4">
      <div className="p-3 rounded-2xl bg-white/10 border border-white/10 text-white shadow-2xl shadow-emerald-500/20">
        <Activity size={26} />
      </div>
      <div>
        <p className="text-white/50 font-mono uppercase tracking-[0.35em] text-[10px]">Dashboard</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-md">Jungle Glass</h1>
        {lastUpdated && (
          <p className="text-white/50 text-xs mt-1 font-mono">Zuletzt aktualisiert {lastUpdated}</p>
        )}
      </div>
    </div>
    <button
      onClick={onRefresh}
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 text-white hover:bg-white/15 transition-colors"
      disabled={refreshing}
    >
      <RefreshCw className={refreshing ? 'animate-spin' : ''} size={18} />
      <span className="text-sm font-semibold">Refresh</span>
    </button>
  </div>
);

const TemperatureCard = ({ temp, min, max }) => {
  const numericTemp = typeof temp === 'number' ? temp : parseFloat(temp);
  const hasTemp = !Number.isNaN(numericTemp);
  const isHot = hasTemp ? numericTemp >= 24 : false;

  return (
    <GlassCard className="h-full">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent" />
      {isHot ? (
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent blur-2xl" />
      ) : (
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-cyan-400/20 via-blue-400/10 to-transparent blur-2xl" />
      )}

      <div className="p-8 flex justify-between items-center h-full">
        <div className="flex flex-col z-20">
          <span className="text-xs text-white/50 uppercase tracking-widest mb-2">Temperatur</span>
          <div className="flex items-start">
            <span
              className={`text-7xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white ${
                isHot ? 'to-amber-200' : 'to-cyan-200'
              }`}
            >
              {hasTemp ? numericTemp.toFixed(1) : '--'}
            </span>
            <span className="text-3xl text-white/40 mt-2 ml-2">°C</span>
          </div>

          <div className="flex gap-4 mt-4 text-sm font-mono text-white/60">
            <span className="flex items-center gap-1">
              <ArrowDown className="w-3 h-3 text-cyan-300" />
              {min ? `${min}° min` : '—'}
            </span>
            <span className="flex items-center gap-1">
              <ArrowUp className="w-3 h-3 text-amber-300" />
              {max ? `${max}° max` : '—'}
            </span>
          </div>
        </div>

        <div className="absolute right-[-20px] top-1/2 -translate-y-1/2 opacity-10 rotate-12">
          <Thermometer size={200} strokeWidth={1} />
        </div>
      </div>
    </GlassCard>
  );
};

const HumidityCard = ({ humidity, min, max }) => {
  const numericHum = typeof humidity === 'number' ? humidity : parseFloat(humidity);
  const hasHum = !Number.isNaN(numericHum);

  return (
    <GlassCard className="h-full overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/15 via-emerald-300/10 to-transparent" />
      <div className="absolute -left-16 top-0 w-48 h-48 bg-blue-300/20 rounded-full blur-3xl" />
      <div className="absolute right-0 -bottom-12 w-48 h-48 bg-emerald-200/15 rounded-full blur-3xl" />
      <div className="absolute left-12 -top-8 w-6 h-12 bg-blue-200/40 rounded-full animate-drop-fall" style={{ animationDuration: '4s' }} />
      <div className="absolute left-24 -top-10 w-4 h-10 bg-blue-100/40 rounded-full animate-drop-fall" style={{ animationDuration: '5s', animationDelay: '1s' }} />
      <div className="absolute left-36 -top-12 w-3 h-8 bg-cyan-100/40 rounded-full animate-drop-fall" style={{ animationDuration: '4.5s', animationDelay: '1.5s' }} />

      <div className="p-8 flex flex-col h-full">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs text-white/50 uppercase tracking-widest mb-2 block">Feuchtigkeit</span>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl md:text-7xl font-bold text-white drop-shadow-md">
                {hasHum ? Math.round(numericHum) : '--'}
              </span>
              <span className="text-2xl text-white/50">%</span>
            </div>
          </div>
          <div className="p-4 rounded-full bg-white/10 border border-white/20 text-white shadow-[0_0_25px_rgba(96,165,250,0.4)]">
            <Droplets size={32} />
          </div>
        </div>

        <div className="mt-auto flex gap-4 text-sm font-mono text-white/60">
          <span className="flex items-center gap-1">
            <ArrowDown className="w-3 h-3 text-blue-300" />
            {min ? `${min}% min` : '—'}
          </span>
          <span className="flex items-center gap-1">
            <ArrowUp className="w-3 h-3 text-emerald-300" />
            {max ? `${max}% max` : '—'}
          </span>
        </div>
      </div>
    </GlassCard>
  );
};

const ControlPanel = ({ status, onToggle, disabled }) => (
  <GlassCard>
    <div className="flex flex-col h-full divide-y divide-white/5">
      <button
        className="flex-1 flex items-center p-6 gap-6 bg-amber-500/5 relative overflow-hidden text-left w-full"
        onClick={() => onToggle('light')}
        disabled={disabled || status.light.output === null}
      >
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.8)]" />
        <div className="p-3 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
          <Lightbulb size={28} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Tageslicht</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-bold bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded">
              {status.light.output ? 'AN' : 'AUS'}
            </span>
            {status.light.power !== null && status.light.power !== undefined && (
              <span className="text-xs text-white/40 font-mono">{Math.round(status.light.power)} W</span>
            )}
          </div>
        </div>
      </button>

      <button
        className="flex-1 flex items-center p-6 gap-6 opacity-60 hover:opacity-100 transition-opacity text-left w-full"
        onClick={() => onToggle('heater')}
        disabled={disabled || status.heater.output === null}
      >
        <div className="p-3 rounded-full bg-white/5 border border-white/10 text-white/60">
          <Flame size={28} />
        </div>
        <div>
          <h3 className="text-lg font-medium text-white/80">Heizung</h3>
          <div className="mt-1">
            <span className="text-xs font-medium bg-white/10 text-white/60 px-2 py-0.5 rounded">
              {status.heater.output ? 'AN' : 'AUS'}
            </span>
          </div>
        </div>
      </button>
    </div>
  </GlassCard>
);

const ChartMock = ({ timeRange, onRangeChange }) => (
  <GlassCard className="p-8 h-[420px]">
    <div className="flex justify-between items-center mb-8">
      <div className="flex items-center gap-2">
        <Calendar className="text-green-400" size={20} />
        <span className="text-lg font-bold">Verlauf</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex gap-6 text-xs font-mono text-white/60">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_orange]"></span> Temperatur
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_cyan]"></span> Feuchtigkeit
          </span>
        </div>
        <div className="flex bg-white/5 border border-white/10 p-1 rounded-full">
          {['24h', '7d', '30d'].map((range) => (
            <button
              key={range}
              onClick={() => onRangeChange(range)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                timeRange === range
                  ? 'bg-white/20 text-amber-300 border border-amber-500/50'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
    </div>

    <div className="relative flex-1 w-full">
      <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
        <line x1="0" y1="20" x2="100" y2="20" stroke="white" strokeOpacity="0.05" strokeDasharray="2" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="white" strokeOpacity="0.05" strokeDasharray="2" />
        <line x1="0" y1="80" x2="100" y2="80" stroke="white" strokeOpacity="0.05" strokeDasharray="2" />

        <path
          d="M0,70 C20,70 40,72 60,75 C80,80 90,50 100,40"
          fill="none"
          stroke="currentColor"
          className="text-amber-400 stroke-[0.5] md:stroke-[0.3]"
          style={{ filter: 'drop-shadow(0 0 4px rgba(251,191,36,0.5))' }}
        />

        <path
          d="M0,30 C30,31 60,32 75,45 C85,55 90,80 100,85"
          fill="none"
          stroke="currentColor"
          className="text-blue-400 stroke-[0.5] md:stroke-[0.3]"
          style={{ filter: 'drop-shadow(0 0 4px rgba(96,165,250,0.5))' }}
        />
      </svg>

      <div className="absolute left-0 top-[20%] text-[10px] text-amber-200/50">24.6°</div>
      <div className="absolute right-0 top-[30%] text-[10px] text-blue-200/50">98%</div>
    </div>
  </GlassCard>
);

export default function Home() {
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
  const [timeRange, setTimeRange] = useState('24h');
  const [loadingStates, setLoadingStates] = useState({ initial: true, liveData: false, historyData: false });
  const isFirstLoad = useRef(true);

  const calculatedStatistics = useMemo(() => {
    if (historyData.length === 0) return { tempMin: null, tempMax: null, humMin: null, humMax: null };

    const temps = historyData.map((d) => parseFloat(d.temp)).filter((t) => !Number.isNaN(t));
    const hums = historyData.map((d) => parseFloat(d.humidity)).filter((h) => !Number.isNaN(h));

    return {
      tempMin: temps.length > 0 ? Math.min(...temps).toFixed(1) : null,
      tempMax: temps.length > 0 ? Math.max(...temps).toFixed(1) : null,
      humMin: hums.length > 0 ? Math.min(...hums).toFixed(1) : null,
      humMax: hums.length > 0 ? Math.max(...hums).toFixed(1) : null
    };
  }, [historyData]);

  const fetchHistory = useCallback(async () => {
    setLoadingStates((prev) => ({ ...prev, historyData: true }));

    try {
      const res = await fetch(`/api/history?range=${timeRange}`);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();

      if (Array.isArray(data)) {
        setHistoryData(data);
      } else {
        throw new Error('Ungültiges Datenformat von API');
      }
    } catch (e) {
      console.error('History Fetch Error:', e);
      toast.error(`Verlaufsdaten konnten nicht geladen werden: ${e.message}`);
      setHistoryData([]);
    } finally {
      setLoadingStates((prev) => ({ ...prev, historyData: false }));
    }
  }, [timeRange]);

  const fetchLive = useCallback(async () => {
    setLoadingStates((prev) => ({ ...prev, liveData: true }));

    try {
      const sensorPromise = fetch('/api/sensor')
        .then((r) => {
          if (!r.ok) throw new Error(`Sensor API: ${r.status}`);
          return r.json();
        })
        .then((d) => {
          if (d?.data?.properties) {
            const t = d.data.properties.find((p) => p.temperature);
            const h = d.data.properties.find((p) => p.humidity);
            if (t && h) {
              setCurrentData({ temp: t.temperature, hum: h.humidity, timestamp: Date.now() });
            }
          }
        });

      const shellyPromise = fetch('/api/shelly')
        .then((r) => {
          if (!r.ok) throw new Error(`Shelly API: ${r.status}`);
          return r.json();
        })
        .then((d) => {
          if (d.success) setShellyStatus(d.status);
        });

      await Promise.all([sensorPromise, shellyPromise]);

      if (isFirstLoad.current) {
        toast.success('Live-Daten geladen', { icon: '🌿' });
        isFirstLoad.current = false;
      }
    } catch (e) {
      console.error('Live Fetch Error:', e);
      toast.error(`Live-Daten konnten nicht geladen werden: ${e.message}`);
    } finally {
      setLoadingStates((prev) => ({ ...prev, liveData: false }));
    }
  }, []);

  const toggleShelly = async (target) => {
    const oldState = shellyStatus[target];
    const newOutputState = !oldState.output;
    const newState = newOutputState ? 'on' : 'off';
    const deviceName = target === 'light' ? 'Tageslicht' : 'Heizung';

    setShellyStatus((prev) => ({
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
    } catch (e) {
      console.error(`Shelly Toggle Error (${target}):`, e);

      setShellyStatus((prev) => ({
        ...prev,
        [target]: oldState
      }));

      toast.error(`${deviceName} konnte nicht geschaltet werden: ${e.message}`, {
        duration: 6000
      });
    }
  };

  useEffect(() => {
    setLoadingStates((prev) => ({ ...prev, initial: true }));
    Promise.all([fetchLive(), fetchHistory()]).finally(() => {
      setLoadingStates((prev) => ({ ...prev, initial: false }));
    });
  }, [fetchLive, fetchHistory]);

  useEffect(() => {
    fetchHistory();
  }, [timeRange, fetchHistory]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchLive();
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchLive]);

  const lastUpdated = currentData.timestamp
    ? new Date(currentData.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="min-h-screen bg-black relative font-sans text-white p-4 md:p-8">
      <div className="fixed inset-0 z-0 relative">
        <Image src={BG_IMAGE} fill priority sizes="100vw" className="object-cover opacity-60" alt="Dschungel Hintergrund" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto flex flex-col gap-6">
        <Header onRefresh={() => Promise.all([fetchLive(), fetchHistory()])} refreshing={loadingStates.liveData} lastUpdated={lastUpdated} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-auto md:h-[320px]">
          <TemperatureCard temp={currentData.temp} min={calculatedStatistics.tempMin} max={calculatedStatistics.tempMax} />
          <HumidityCard humidity={currentData.hum} min={calculatedStatistics.humMin} max={calculatedStatistics.humMax} />
          <ControlPanel status={shellyStatus} onToggle={toggleShelly} disabled={loadingStates.initial} />
        </div>

        <ChartMock timeRange={timeRange} onRangeChange={setTimeRange} />
      </div>
    </div>
  );
}
