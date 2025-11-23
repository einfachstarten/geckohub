import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// In-Memory Cache
let eventsCache = new Map();
const CACHE_DURATION_MS = 120000; // 2 Minuten

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  
  // Query Parameters
  const hours = parseInt(searchParams.get('hours')) || 24;
  const device = searchParams.get('device'); // 'light', 'heater', oder null für beide
  
  // Cache Key
  const cacheKey = `${device || 'all'}-${hours}`;
  const cached = eventsCache.get(cacheKey);
  const now = Date.now();

  // Cache Check
  if (cached && (now - cached.timestamp < CACHE_DURATION_MS)) {
    console.log(`[CACHE HIT] Events (${cacheKey})`);
    return NextResponse.json({
      events: cached.data,
      cached: true,
      cacheAge: Math.round((now - cached.timestamp) / 1000)
    });
  }

  console.log(`[CACHE MISS] Fetching events (${cacheKey})`);

  try {
    // FIX: Berechne Cutoff-Zeit in JavaScript statt SQL INTERVAL
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    // SQL Query mit optionalem Device-Filter
    const query = device
      ? sql`
          SELECT * FROM device_events
          WHERE timestamp > ${cutoffTime}
            AND device = ${device}
          ORDER BY timestamp DESC
          LIMIT 500;
        `
      : sql`
          SELECT * FROM device_events
          WHERE timestamp > ${cutoffTime}
          ORDER BY timestamp DESC
          LIMIT 500;
        `;

    const { rows } = await query;

    // Format Events
    const formatted = rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      device: row.device,
      action: row.action,
      source: row.source,
      metadata: row.metadata
    }));

    // Update Cache
    eventsCache.set(cacheKey, {
      data: formatted,
      timestamp: now
    });

    // Cleanup alte Cache Entries
    if (eventsCache.size > 10) {
      const firstKey = eventsCache.keys().next().value;
      eventsCache.delete(firstKey);
    }

    return NextResponse.json({
      events: formatted,
      cached: false,
      count: formatted.length
    });

  } catch (error) {
    console.error('[EVENTS API ERROR]', error);

    // Fallback: Stale Cache
    if (cached) {
      console.log('[STALE CACHE] Returning old events data');
      return NextResponse.json({
        events: cached.data,
        cached: true,
        stale: true
      });
    }

    return NextResponse.json({ 
      error: 'Events konnten nicht geladen werden',
      details: error.message 
    }, { status: 500 });
  }
}
