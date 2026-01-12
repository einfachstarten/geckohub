'use client';

import { useState, useEffect } from 'react';
import { Clock, Save } from 'lucide-react';

export default function LightScheduleSettings() {
  const [schedule, setSchedule] = useState({
    enabled: false,
    time_on: '08:00',
    time_off: '20:00'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      const response = await fetch('/api/light-schedule');
      const data = await response.json();
      setSchedule(data);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      setMessage('Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/light-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule)
      });

      if (response.ok) {
        setMessage('✓ Gespeichert');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      setMessage('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-slate-700/30 rounded mb-4 w-48"></div>
        <div className="h-12 bg-slate-700/30 rounded mb-4"></div>
        <div className="h-12 bg-slate-700/30 rounded"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-yellow-400" />
          <h3 className="text-xl font-semibold text-white">Zeitplan Tageslicht</h3>
        </div>

        {/* Enable/Disable Toggle */}
        <button
          onClick={() => setSchedule({ ...schedule, enabled: !schedule.enabled })}
          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
            schedule.enabled ? 'bg-emerald-500' : 'bg-slate-600'
          }`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
              schedule.enabled ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Zeit-Inputs */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm text-slate-400 mb-2">
            Einschalten (Morgens)
          </label>
          <input
            type="time"
            value={schedule.time_on}
            onChange={(e) => setSchedule({ ...schedule, time_on: e.target.value })}
            className="w-full bg-slate-700/50 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-2">
            Ausschalten (Abends)
          </label>
          <input
            type="time"
            value={schedule.time_off}
            onChange={(e) => setSchedule({ ...schedule, time_off: e.target.value })}
            className="w-full bg-slate-700/50 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition-all"
          />
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-slate-700/30 rounded-lg p-4 mb-4 text-sm text-slate-300">
        <p>Der Zeitplan gilt für alle Wochentage gleich.</p>
        <p className="mt-1">
          Status:{' '}
          <span className={schedule.enabled ? 'text-emerald-400' : 'text-slate-400'}>
            {schedule.enabled ? 'Aktiv' : 'Deaktiviert'}
          </span>
        </p>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-slate-600 text-slate-900 font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
      >
        {saving ? (
          <>
            <div className="w-5 h-5 border-2 border-slate-900/20 border-t-slate-900 rounded-full animate-spin" />
            Speichert...
          </>
        ) : (
          <>
            <Save className="w-5 h-5" />
            Speichern
          </>
        )}
      </button>

      {/* Message */}
      {message && (
        <div
          className={`mt-4 text-center text-sm ${
            message.includes('✓') ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
