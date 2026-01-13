'use client';

import { useState, useEffect } from 'react';
import { Bell, Save, TestTube } from 'lucide-react';

export default function NotificationSettings() {
  const [settings, setSettings] = useState({
    push_enabled: false,
    temp_critical_low: 18,
    temp_critical_high: 30,
    humidity_critical_low: 40,
    humidity_critical_high: 90,
    notification_cooldown_minutes: 60
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState('default');

  useEffect(() => {
    checkPushSupport();
    fetchSettings();
  }, []);

  const checkPushSupport = () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true);
      setPushPermission(Notification.permission);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/notification-settings');
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestPushPermission = async () => {
    if (!pushSupported) {
      setMessage('Push Notifications nicht unterstützt');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission === 'granted') {
        await subscribeToPush();
        setMessage('✓ Push Notifications aktiviert');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Push Permission verweigert');
      }

      return permission;
    } catch (error) {
      console.error('Error requesting permission:', error);
      setMessage('Fehler beim Aktivieren');
      return 'denied';
    }
  };

  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });
    } catch (error) {
      console.error('Error subscribing to push:', error);
      throw error;
    }
  };

  const handleTogglePush = async () => {
    if (!settings.push_enabled && pushPermission !== 'granted') {
      const permission = await requestPushPermission();
      if (permission !== 'granted') return;
    }

    setSettings({ ...settings, push_enabled: !settings.push_enabled });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/notification-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        setMessage('✓ Gespeichert');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const sendTestNotification = async () => {
    if (pushPermission !== 'granted') {
      setMessage('Bitte zuerst Push aktivieren');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      registration.showNotification('🦎 FlitzHQ Test', {
        body: 'Push Notifications funktionieren!',
        icon: '/icon-192.png',
        badge: '/icon-192.png'
      });
      setMessage('✓ Test-Notification gesendet');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error sending test:', error);
      setMessage('Fehler beim Test');
    }
  };

  if (loading) {
    return <div className="animate-pulse">Lädt...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-emerald-400" />
          <h3 className="text-xl font-semibold text-white">Benachrichtigungen</h3>
        </div>
      </div>

      {/* Push Notifications */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-white font-medium">Push Notifications</h4>
            <p className="text-sm text-slate-400">
              {pushPermission === 'granted' ? 'Aktiviert' :
               pushPermission === 'denied' ? 'Blockiert in Browser-Einstellungen' :
               'Noch nicht aktiviert'}
            </p>
          </div>
          <button
            onClick={handleTogglePush}
            disabled={!pushSupported || pushPermission === 'denied'}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
              settings.push_enabled ? 'bg-emerald-500' : 'bg-slate-600'
            } disabled:opacity-50`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                settings.push_enabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {pushPermission === 'granted' && (
          <button
            onClick={sendTestNotification}
            className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-2"
          >
            <TestTube className="w-4 h-4" />
            Test-Benachrichtigung senden
          </button>
        )}
      </div>

      {/* Schwellwerte */}
      <div className="space-y-4 mb-6">
        <h4 className="text-white font-medium">Kritische Schwellwerte</h4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Min. Temperatur (°C)
            </label>
            <input
              type="number"
              value={settings.temp_critical_low}
              onChange={(e) => setSettings({ ...settings, temp_critical_low: parseFloat(e.target.value) })}
              className="w-full bg-slate-700/50 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Max. Temperatur (°C)
            </label>
            <input
              type="number"
              value={settings.temp_critical_high}
              onChange={(e) => setSettings({ ...settings, temp_critical_high: parseFloat(e.target.value) })}
              className="w-full bg-slate-700/50 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Min. Luftfeuchtigkeit (%)
            </label>
            <input
              type="number"
              value={settings.humidity_critical_low}
              onChange={(e) => setSettings({ ...settings, humidity_critical_low: parseFloat(e.target.value) })}
              className="w-full bg-slate-700/50 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Max. Luftfeuchtigkeit (%)
            </label>
            <input
              type="number"
              value={settings.humidity_critical_high}
              onChange={(e) => setSettings({ ...settings, humidity_critical_high: parseFloat(e.target.value) })}
              className="w-full bg-slate-700/50 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Cooldown */}
      <div className="mb-6">
        <label className="block text-sm text-slate-400 mb-2">
          Benachrichtigungs-Pause (Minuten)
        </label>
        <input
          type="number"
          value={settings.notification_cooldown_minutes}
          onChange={(e) => setSettings({ ...settings, notification_cooldown_minutes: parseInt(e.target.value) })}
          className="w-full bg-slate-700/50 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none"
        />
        <p className="text-xs text-slate-500 mt-1">
          Zeit zwischen Benachrichtigungen für das gleiche Problem
        </p>
      </div>

      {/* Info */}
      <div className="bg-slate-700/30 rounded-lg p-4 mb-4 text-sm text-slate-300">
        <p>Push Notifications funktionieren nur wenn die App installiert ist (Android).</p>
        <p className="mt-1">
          Du wirst benachrichtigt wenn Werte außerhalb der kritischen Bereiche liegen.
        </p>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
      >
        {saving ? (
          <>
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            Speichert...
          </>
        ) : (
          <>
            <Save className="w-5 h-5" />
            Speichern
          </>
        )}
      </button>

      {message && (
        <div className={`mt-4 text-center text-sm ${
          message.includes('✓') ? 'text-emerald-400' : 'text-red-400'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
