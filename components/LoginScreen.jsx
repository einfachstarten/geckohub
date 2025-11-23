'use client';

import { useState } from 'react';
import { Activity, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginScreen({ onLoginSuccess }) {
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password.trim()) {
      toast.error('Bitte Passwort eingeben');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (rememberMe) {
          localStorage.setItem('flitzhq_auth', 'true');
        } else {
          sessionStorage.setItem('flitzhq_auth', 'true');
        }

        toast.success('Willkommen bei FlitzHQ! 🎉');
        onLoginSuccess();
      } else {
        toast.error(data.message || 'Falsches Passwort');
        setPassword('');
      }
    } catch (error) {
      console.error('Login Error:', error);
      toast.error('Verbindungsfehler - bitte erneut versuchen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="fixed inset-0 -z-10 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900/80 to-slate-950" />
      </div>

      <div className="w-full max-w-md">
        <div className="bg-slate-900/70 backdrop-blur-md rounded-2xl p-8 shadow-2xl shadow-black/20 border border-slate-700/30">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 mb-4">
              <Activity size={32} strokeWidth={2.5} />
            </div>
            <h1 className="font-bold text-2xl tracking-tight text-slate-100">
              Flitz<span className="text-emerald-400">HQ</span>
            </h1>
            <p className="text-slate-500 text-sm mt-2">Smart Home Dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-slate-400 text-sm font-medium block">Passwort</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl pl-10 pr-12 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all disabled:opacity-50"
                  placeholder="Passwort eingeben"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500/50 focus:ring-2 cursor-pointer"
              />
              <label htmlFor="rememberMe" className="text-slate-400 text-sm cursor-pointer select-none">
                Angemeldet bleiben
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Anmelden...
                </span>
              ) : (
                'Anmelden'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">Secure authentication powered by Vercel</p>
      </div>
    </div>
  );
}
