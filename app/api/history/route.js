import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Cache für History Queries
const historyCache = new Map();
const HISTORY_CACHE_DURATION_MS = 120000; // 2 Minuten Cache

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '24h';

  // Cache Key
  const cacheKey = `history_${range}`;
  const cached = historyCache.get(cacheKey);
  const now = Date.now();

  // Cache Hit
  if (cached && (now - cached.timestamp) < HISTORY_CACHE_DURATION_MS) {
    console.log(`[CACHE HIT] History ${range}`);
    return NextResponse.json(cached.data);
  }

  console.log(`[CACHE MISS] Fetching History ${range}`);

  try {
    let query;
    
    // Hinweis: Wir runden timestamps auf volle Stunden/Minuten für saubere Graphen
    if (range === '24h') {
        query = sql`
            SELECT timestamp, temperature, humidity, light_status, heater_status 
            FROM readings 
            WHERE timestamp > NOW() - INTERVAL '24 hours' 
            ORDER BY timestamp ASC;`;
    } else if (range === '7d') {
        query = sql`
            SELECT date_trunc('hour', timestamp) as timestamp, 
                   AVG(temperature) as temperature, 
                   AVG(humidity) as humidity,
                   BOOL_OR(light_status) as light_status, -- War irgendwann in der Stunde an?
                   BOOL_OR(heater_status) as heater_status
            FROM readings 
            WHERE timestamp > NOW() - INTERVAL '7 days' 
            GROUP BY timestamp 
            ORDER BY timestamp ASC;`;
    } else {
        // 30 Tage (4h Intervalle)
        query = sql`
            SELECT to_timestamp(floor((extract('epoch' from timestamp) / 14400 )) * 14400) as timestamp, 
                   AVG(temperature) as temperature, 
                   AVG(humidity) as humidity,
                   BOOL_OR(light_status) as light_status,
                   BOOL_OR(heater_status) as heater_status
            FROM readings 
            WHERE timestamp > NOW() - INTERVAL '30 days' 
            GROUP BY timestamp 
            ORDER BY 1 ASC;`;
    }

    const result = await query;

    const formatted = result.rows.map(row => ({
      time: row.timestamp,
      temp: row.temperature ? Number(row.temperature).toFixed(1) : null,
      humidity: row.humidity ? parseFloat(Number(row.humidity).toFixed(1)) : null,
      light: row.light_status,
      heater: row.heater_status
    }));

    // Update Cache
    historyCache.set(cacheKey, {
      data: formatted,
      timestamp: now
    });

    // Cleanup alte Cache Entries (max 10)
    if (historyCache.size > 10) {
      const firstKey = historyCache.keys().next().value;
      historyCache.delete(firstKey);
    }

    return NextResponse.json(formatted);

  } catch (error) {
    console.error(error);
    
    // Return stale cache if available
    if (cached) {
      console.log('[STALE CACHE] Returning old history data');
      return NextResponse.json(cached.data);
    }
    
    return NextResponse.json({ 
      error: 'Verlaufsdaten nicht verfügbar',
      details: error.message 
    }, { status: 500 });
  }
}
