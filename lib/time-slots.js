import { subHours, subDays, format, startOfDay, startOfHour } from 'date-fns';
import { de } from 'date-fns/locale';

/**
 * Generiert feste Zeitslots für den gewählten Range
 * @param {string} range - '24h', '7d', oder '30d'
 * @returns {Array} Array mit Zeitslots und null-Werten
 */
export function generateTimeSlots(range) {
  const now = new Date();
  const slots = [];

  if (range === '24h') {
    // 24 Stunden, stündliche Slots
    for (let i = 23; i >= 0; i--) {
      const slotTime = startOfHour(subHours(now, i));
      slots.push({
        timestamp: slotTime,
        time: format(slotTime, 'HH:mm', { locale: de }),
        temperature: null,
        humidity: null
      });
    }
  } else if (range === '7d') {
    // 7 Tage, 4-Stunden-Slots (6 pro Tag)
    for (let i = 41; i >= 0; i--) {
      const slotTime = startOfHour(subHours(now, i * 4));
      slots.push({
        timestamp: slotTime,
        time: format(slotTime, 'dd.MM HH:mm', { locale: de }),
        temperature: null,
        humidity: null
      });
    }
  } else if (range === '30d') {
    // 30 Tage, tägliche Slots
    for (let i = 29; i >= 0; i--) {
      const slotTime = startOfDay(subDays(now, i));
      slots.push({
        timestamp: slotTime,
        time: format(slotTime, 'dd.MM', { locale: de }),
        temperature: null,
        humidity: null
      });
    }
  }

  return slots;
}

/**
 * Merged DB-Daten in Time-Slots
 * @param {Array} slots - Generierte Zeitslots
 * @param {Array} dbData - Daten aus der Datenbank
 * @returns {Array} Slots mit eingefügten Daten
 */
export function mergeDataIntoSlots(slots, dbData, range) {
  if (!dbData || dbData.length === 0) return slots;

  // Toleranz für Zeitvergleich (in Minuten)
  const tolerance = range === '24h' ? 30 : range === '7d' ? 120 : 720;

  return slots.map(slot => {
    // Finde nächstgelegenen Datenpunkt
    const match = dbData.find(data => {
      // data.timestamp könnte ein String (aus JSON) oder Date object sein.
      // Falls String, konvertieren wir. Falls Date, passt es.
      const dataTime = new Date(data.timestamp).getTime();
      const slotTime = slot.timestamp.getTime();
      const dataDiff = Math.abs(dataTime - slotTime);
      return dataDiff <= tolerance * 60 * 1000;
    });

    if (match) {
      return {
        ...slot,
        temperature: match.temperature !== null ? Number(match.temperature) : null,
        humidity: match.humidity !== null ? Number(match.humidity) : null
      };
    }

    return slot;
  });
}
