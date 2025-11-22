import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '24h'; // '24h', '7d', '30d'

  try {
    let query;

    // Wir nutzen date_trunc für Downsampling bei längeren Zeiträumen, um Performance zu sparen
    if (range === '24h') {
        // Rohdaten der letzten 24h
        query = sql`
            SELECT timestamp, temperature, humidity, light_status
            FROM readings
            WHERE timestamp > NOW() - INTERVAL '24 hours'
            ORDER BY timestamp ASC;`;
    } else if (range === '7d') {
        // Stündlicher Durchschnitt
        query = sql`
            SELECT date_trunc('hour', timestamp) as timestamp,
                   AVG(temperature) as temperature,
                   AVG(humidity) as humidity
            FROM readings
            WHERE timestamp > NOW() - INTERVAL '7 days'
            GROUP BY timestamp
            ORDER BY timestamp ASC;`;
    } else if (range === '30d') {
        // 4-Stunden Durchschnitt
        query = sql`
            SELECT to_timestamp(floor((extract('epoch' from timestamp) / 14400 )) * 14400) as timestamp,
                   AVG(temperature) as temperature,
                   AVG(humidity) as humidity
            FROM readings
            WHERE timestamp > NOW() - INTERVAL '30 days'
            GROUP BY 1
            ORDER BY 1 ASC;`;
    }

    const result = await query;

    // Formatierung für Frontend (Recharts mag Strings oder Unix Timestamp)
    const formatted = result.rows.map(row => ({
        // ISO String ist sicher für Parsing im Frontend
        time: row.timestamp,
        // Zahlen sicherstellen
        temp: Number(row.temperature).toFixed(1),
        humidity: Math.round(Number(row.humidity)),
        light: row.light_status
    }));

    return NextResponse.json(formatted);

  } catch (error) {
    // Falls Tabelle fehlt (noch kein Cron gelaufen), leeres Array statt Crash
    return NextResponse.json([]);
  }
}
