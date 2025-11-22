'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Thermometer, Droplets, AlertCircle, Lightbulb, Power } from 'lucide-react';

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lightState, setLightState] = useState(false);
  const [lightLoading, setLightLoading] = useState(false);

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

  const toggleLight = async () => {
    // ... (bleibt gleich wie vorher, siehe Shelly Ticket) ...
    // Hier der Kürze halber nur Platzhalter, bitte Shelly-Code beibehalten/einfügen
    setLightLoading(true);
    setTimeout(() => {
      setLightState(!lightState);
      setLightLoading(false);
    }, 500);
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

        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center gap-3">
            <Lightbulb className={lightState ? "text-emerald-500" : "text-slate-400"} size={24} />
            <div>
              <p className="text-sm font-semibold text-slate-800">Shelly</p>
              <p className="text-xs text-slate-500">(Placeholder: bitte echten Shelly-Code einfügen)</p>
            </div>
          </div>
          <button
            onClick={toggleLight}
            disabled={lightLoading}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${
              lightState ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-700'
            } ${lightLoading ? 'opacity-60' : ''}`}
          >
            <Power size={16} /> {lightLoading ? 'Lädt...' : lightState ? 'An' : 'Aus'}
          </button>
        </div>
      </div>
    </div>
  );
}
