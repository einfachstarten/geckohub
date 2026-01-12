/**
 * Bewertet Temperatur basierend auf Kronengecko-Anforderungen
 * @param {number} temp - Temperatur in °C
 * @returns {object} { status: 'optimal'|'normal'|'critical', label: string, color: string }
 */
export function evaluateTemperature(temp) {
  if (temp < 18) {
    return {
      status: 'critical',
      label: 'ZU KALT',
      color: '#60a5fa',
      bgColor: 'bg-blue-500/20',
      textColor: 'text-blue-400',
      icon: '❄️'
    };
  }

  if (temp >= 18 && temp < 20) {
    return {
      status: 'normal',
      label: 'Kühl',
      color: '#38bdf8',
      bgColor: 'bg-sky-500/20',
      textColor: 'text-sky-400',
      icon: '🌡️'
    };
  }

  if (temp >= 20 && temp < 22) {
    return {
      status: 'normal',
      label: 'Leicht kühl',
      color: '#34d399',
      bgColor: 'bg-emerald-500/20',
      textColor: 'text-emerald-400',
      icon: '✓'
    };
  }

  if (temp >= 22 && temp <= 26) {
    return {
      status: 'optimal',
      label: 'OPTIMAL',
      color: '#10b981',
      bgColor: 'bg-emerald-500/20',
      textColor: 'text-emerald-500',
      icon: '✓'
    };
  }

  if (temp > 26 && temp <= 28) {
    return {
      status: 'normal',
      label: 'Leicht warm',
      color: '#fbbf24',
      bgColor: 'bg-amber-500/20',
      textColor: 'text-amber-400',
      icon: '⚠️'
    };
  }

  if (temp > 28 && temp < 30) {
    return {
      status: 'normal',
      label: 'Warm',
      color: '#fb923c',
      bgColor: 'bg-orange-500/20',
      textColor: 'text-orange-400',
      icon: '⚠️'
    };
  }

  if (temp >= 30) {
    return {
      status: 'critical',
      label: 'ZU HEISS',
      color: '#ef4444',
      bgColor: 'bg-red-500/20',
      textColor: 'text-red-500',
      icon: '🔥'
    };
  }

  return {
    status: 'normal',
    label: 'Unbekannt',
    color: '#94a3b8',
    bgColor: 'bg-slate-500/20',
    textColor: 'text-slate-400',
    icon: '…'
  };
}

/**
 * Bewertet Luftfeuchtigkeit basierend auf Kronengecko-Anforderungen
 * @param {number} humidity - Luftfeuchtigkeit in %
 * @returns {object} { status: 'optimal'|'normal'|'critical', label: string, color: string }
 */
export function evaluateHumidity(humidity) {
  if (humidity < 40) {
    return {
      status: 'critical',
      label: 'ZU TROCKEN',
      color: '#ef4444',
      bgColor: 'bg-red-500/20',
      textColor: 'text-red-500',
      icon: '⚠️'
    };
  }

  if (humidity >= 40 && humidity < 50) {
    return {
      status: 'normal',
      label: 'Trocken',
      color: '#fb923c',
      bgColor: 'bg-orange-500/20',
      textColor: 'text-orange-400',
      icon: '💧'
    };
  }

  if (humidity >= 50 && humidity < 60) {
    return {
      status: 'normal',
      label: 'Leicht trocken',
      color: '#fbbf24',
      bgColor: 'bg-amber-500/20',
      textColor: 'text-amber-400',
      icon: '💧'
    };
  }

  if (humidity >= 60 && humidity <= 80) {
    return {
      status: 'optimal',
      label: 'OPTIMAL',
      color: '#10b981',
      bgColor: 'bg-emerald-500/20',
      textColor: 'text-emerald-500',
      icon: '✓'
    };
  }

  if (humidity > 80 && humidity <= 85) {
    return {
      status: 'normal',
      label: 'Leicht feucht',
      color: '#34d399',
      bgColor: 'bg-emerald-500/20',
      textColor: 'text-emerald-400',
      icon: '💧'
    };
  }

  if (humidity > 85 && humidity < 90) {
    return {
      status: 'normal',
      label: 'Feucht',
      color: '#60a5fa',
      bgColor: 'bg-blue-500/20',
      textColor: 'text-blue-400',
      icon: '💧'
    };
  }

  if (humidity >= 90) {
    return {
      status: 'critical',
      label: 'ZU FEUCHT',
      color: '#60a5fa',
      bgColor: 'bg-blue-500/20',
      textColor: 'text-blue-400',
      icon: '🌊'
    };
  }

  return {
    status: 'normal',
    label: 'Unbekannt',
    color: '#94a3b8',
    bgColor: 'bg-slate-500/20',
    textColor: 'text-slate-400',
    icon: '…'
  };
}

export const TEMP_SCALE_CONFIG = {
  min: 15,
  max: 35,
  thresholds: [
    { width: '15%', color: 'bg-blue-500' },
    { width: '10%', color: 'bg-sky-400' },
    { width: '10%', color: 'bg-emerald-400' },
    { width: '20%', color: 'bg-emerald-500' },
    { width: '10%', color: 'bg-amber-400' },
    { width: '10%', color: 'bg-orange-400' },
    { width: '25%', color: 'bg-red-500' }
  ]
};

export const HUMIDITY_SCALE_CONFIG = {
  min: 30,
  max: 100,
  thresholds: [
    { width: '14.3%', color: 'bg-red-500' },
    { width: '14.3%', color: 'bg-orange-400' },
    { width: '14.3%', color: 'bg-amber-400' },
    { width: '28.6%', color: 'bg-emerald-500' },
    { width: '7.1%', color: 'bg-emerald-400' },
    { width: '7.1%', color: 'bg-blue-400' },
    { width: '14.3%', color: 'bg-blue-500' }
  ]
};
