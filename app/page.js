'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Thermometer, Droplets, AlertCircle, Lightbulb, Flame } from 'lucide-react';

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lightState, setLightState] = useState(false);
  const [heaterState, setHeaterState] = useState(false);
  const [switching, setSwitching] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sensor');
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
        alert('Fehler: ' + json.error);
      }
    } catch (e) {
      alert('Verbindungsfehler');
    } finally {
      setSwitching(null);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getVal = (key) => {
    if (!data?.data?.properties) return '---';
    const prop = data.data.properties.find(p => key in p);
    return prop ? prop[key] : 'N/A';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans text-slate-800">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
        <header className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
          <h1 className="text-2xl font-bold text-slate-900">FlitzHQ <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-1 rounded ml-2">Live</span></h1>
          <button onClick={fetchData} disabled={loading} className="p-2 hover:bg-slate-100 rounded-full">
            <RefreshCw className={loading ? "animate-spin" : "text-slate-400"} size={20} />
          </button>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700">
            <AlertCircle className="shrink-0 mt-0.5" size={20} />
            <div className="text-sm font-medium">{error}</div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 flex flex-col items-center justify-center gap-2">
            <Thermometer className="text-orange-500" size={32} />
            <div className="text-3xl font-bold text-slate-800">{loading ? "..." : getVal('temperature')}°C</div>
            <div className="text-xs text-orange-600 font-medium uppercase">Temp</div>
          </div>
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex flex-col items-center justify-center gap-2">
            <Droplets className="text-blue-500" size={32} />
            <div className="text-3xl font-bold text-slate-800">{loading ? "..." : getVal('humidity')}%</div>
            <div className="text-xs text-blue-600 font-medium uppercase">Feuchte</div>
          </div>
        </div>

        {/* Shelly Controls */}
        <div className="grid grid-cols-1 gap-4">
          {/* Licht Steuerung */}
          <div className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${lightState ? 'bg-yellow-50 border-yellow-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${lightState ? 'bg-yellow-400 text-white' : 'bg-slate-200 text-slate-400'}`}>
                <Lightbulb size={20} />
              </div>
              <div>
                <p className="font-bold text-slate-700">Beleuchtung</p>
                <p className="text-xs text-slate-500">Terrarium Hauptlicht</p>
              </div>
            </div>
            <button 
              onClick={() => toggleShelly('light')}
              disabled={switching === 'light'}
              className="px-4 py-2 rounded-lg bg-white border border-slate-200 shadow-sm text-sm font-bold text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
            >
              {switching === 'light' ? '...' : (lightState ? 'Ausschalten' : 'Einschalten')}
            </button>
          </div>

          {/* Heizung Steuerung */}
          <div className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${heaterState ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${heaterState ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                <Flame size={20} />
              </div>
              <div>
                <p className="font-bold text-slate-700">Heizung</p>
                <p className="text-xs text-slate-500">Zusatz-Wärmequelle</p>
              </div>
            </div>
            <button 
              onClick={() => toggleShelly('heater')}
              disabled={switching === 'heater'}
              className="px-4 py-2 rounded-lg bg-white border border-slate-200 shadow-sm text-sm font-bold text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
            >
              {switching === 'heater' ? '...' : (heaterState ? 'Ausschalten' : 'Einschalten')}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
