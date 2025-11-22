import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    // 1. Govee Daten holen (Router API)
    // HINWEIS: Wir nutzen hier direkt den Fetch, um unabhängiger von der Frontend-Logik zu sein
    const goveeRes = await fetch('https://openapi.api.govee.com/router/api/v1/device/state', {
      method: 'POST',
      headers: {
        'Govee-API-Key': process.env.GOVEE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestId: 'cron-' + Date.now(),
        payload: { sku: "H5179", device: process.env.GOVEE_MAC_ADDRESS }
      })
    });

    const goveeData = await goveeRes.json();
    let temp = null;
    let hum = null;

    // Parsing der neuen Govee API Struktur
    if (goveeData.payload && goveeData.payload.capabilities) {
        const t = goveeData.payload.capabilities.find(c => c.instance === 'sensorTemperature');
        const h = goveeData.payload.capabilities.find(c => c.instance === 'sensorHumidity');
        if (t) temp = (Number(t.state.value) - 32) * (5/9); // F to C
        if (h) hum = Number(h.state.value);
    }

    // 2. Shelly Status prüfen (Licht)
    let lightOn = false;
    if (process.env.SHELLY_LIGHT_ID && process.env.SHELLY_CLOUD_KEY) {
        const shellyRes = await fetch(`${process.env.SHELLY_SERVER}/device/status`, {
            method: 'POST',
            body: new URLSearchParams({
                id: process.env.SHELLY_LIGHT_ID,
                auth_key: process.env.SHELLY_CLOUD_KEY
            })
        });
        const shellyData = await shellyRes.json();
        lightOn = shellyData.data?.device_status?.relays?.[0]?.ison || false;
    }

    // 3. Datenbank Tabelle sicherstellen (Self-Healing)
    await sql`CREATE TABLE IF NOT EXISTS readings (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        temperature NUMERIC(5,2),
        humidity NUMERIC(5,2),
        light_status BOOLEAN
    );`;

    // 4. Speichern
    if (temp !== null) {
        await sql`INSERT INTO readings (temperature, humidity, light_status)
                  VALUES (${temp.toFixed(2)}, ${hum}, ${lightOn});`;
    }

    return NextResponse.json({ success: true, logged: { temp, hum, lightOn } });

  } catch (error) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
