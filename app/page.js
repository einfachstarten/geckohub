'use client';
import { useState, useEffect } from 'react';
import { Search, Copy } from 'lucide-react';

export default function DeviceScanner() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/scan')
      .then(res => res.json())
      .then(data => {
        setResult(data);
        setLoading(false);
      })
      .catch(err => {
        setResult({ error: err.message });
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-8 font-mono">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8 flex items-center gap-4 border-b border-slate-700 pb-4">
          <div className="p-3 bg-blue-600 rounded-lg">
            <Search className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Govee Device Scanner</h1>
            <p className="text-slate-400 text-sm">Findet die korrekte Device ID (MAC)</p>
          </div>
        </header>

        {loading && <div className="text-blue-400 animate-pulse">Scanne Govee API...</div>}

        {result && result.data && result.data.devices && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-emerald-400">Gefundene Geräte ({result.data.devices.length})</h2>
            {result.data.devices.map((dev, i) => (
              <div key={i} className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-slate-500">Name</span>
                    <p className="text-xl font-bold text-white">{dev.deviceName}</p>
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wider text-slate-500">Modell</span>
                    <p className="text-white">{dev.model}</p>
                  </div>
                  <div className="md:col-span-2 bg-slate-950 p-4 rounded-lg border border-slate-800 flex items-center justify-between group">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-blue-500">Device ID (MAC)</span>
                      <p className="text-xl font-bold font-mono text-blue-300 mt-1 select-all">{dev.device}</p>
                    </div>
                    <Copy size={16} className="text-slate-600 group-hover:text-white transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {result && !loading && (!result.data || !result.data.devices || result.data.devices.length === 0) && (
          <div className="p-6 bg-red-900/20 border border-red-900 rounded-xl text-red-200">
            Keine Geräte gefunden! Prüfe, ob der Sensor in der Govee App eingerichtet und mit dem Account verknüpft ist.
            <pre className="mt-4 text-xs bg-black/50 p-4 rounded overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
