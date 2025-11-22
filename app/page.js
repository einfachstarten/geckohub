'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Thermometer, Droplets, AlertCircle } from 'lucide-react';

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    fetchData();
  }, []);

  const getProp = (key) => {
    if (!data?.data?.properties) return '---';
    const prop = data.data.properties.find((p) => key in p);
    if (!prop) return 'N/A';

    let val = prop[key];
    if ((key === 'temperature' || key === 'humidity') && val > 1000) {
      val = val / 100;
    }

    return Number(val).toFixed(1);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans text-slate-800">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
        <header className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
          <h1 className="text-2xl font-bold text-slate-900">
            FlitzHQ <span className="text-xs bg-slate-200 px-2 py-1 rounded ml-2 text-slate-500">H5179</span>
          </h1>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-full transition-colors disabled:opacity-50"
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} size={20} />
          </button>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700">
            <AlertCircle className="shrink-0 mt-0.5" size={20} />
            <div className="text-sm font-medium">{error}</div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 flex flex-col items-center justify-center gap-2">
            <Thermometer className="text-orange-500" size={32} />
            <div className="text-3xl font-bold text-slate-800">{loading ? '...' : getProp('temperature')}°C</div>
            <div className="text-xs text-orange-600 font-medium uppercase tracking-wide">Temperatur</div>
          </div>

          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex flex-col items-center justify-center gap-2">
            <Droplets className="text-blue-500" size={32} />
            <div className="text-3xl font-bold text-slate-800">{loading ? '...' : getProp('humidity')}%</div>
            <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">Feuchtigkeit</div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 font-mono break-all">
            {loading ? 'Lade...' : data ? JSON.stringify(data).substring(0, 100) + '...' : 'No Data'}
          </p>
        </div>
      </div>
    </div>
  );
}
