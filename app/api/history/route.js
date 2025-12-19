import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { generateTimeSlots, mergeDataIntoSlots } from '@/lib/time-slots';

// Cache für History Queries
const historyCache = new Map();
const HISTORY_CACHE_DURATION_MS = 120000; // 2 Minuten Cache

export async function GET(request) {
  try {
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

    // Zeitbereich berechnen
    let startTime;
    if (range === '24h') {
      startTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    } else if (range === '7d') {
      startTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === '30d') {
      startTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    // Query aus DB (readings table)
    const query = `
      SELECT
        timestamp,
        temperature,
        humidity
      FROM readings
      WHERE timestamp >= $1
      ORDER BY timestamp ASC
    `;

    // Execute Query
    const result = await sql.query(query, [startTime.toISOString()]);

    // Time-Slots generieren und Daten mergen
    const slots = generateTimeSlots(range);
    const mergedData = mergeDataIntoSlots(slots, result.rows, range);

    // Update Cache
    historyCache.set(cacheKey, {
      data: mergedData,
      timestamp: now
    });

    // Cleanup alte Cache Entries (max 10)
    if (historyCache.size > 10) {
      const firstKey = historyCache.keys().next().value;
      historyCache.delete(firstKey);
    }

    return NextResponse.json(mergedData);

  } catch (error) {
    console.error('History API Error:', error);
    
    // Bei DB-Fehler: Leere Slots zurückgeben statt Fehler
    const range = new URL(request.url).searchParams.get('range') || '24h';
    const emptySlots = generateTimeSlots(range);
    
    return NextResponse.json(emptySlots, {
      status: 200,
      headers: { 'X-Data-Status': 'no-data' }
    });
  }
}
