import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    // --- 1. Govee Daten holen ---
    let temp = null;
    let hum = null;
    
    try {
        const goveeRes = await fetch('https://openapi.api.govee.com/router/api/v1/device/state', {
          method: 'POST',
          headers: {
            'Govee-API-Key': process.env.GOVEE_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requestId: 'cron-' + Date.now(),
            payload: { sku: "H5179", device: process.env.GOVEE_MAC_ADDRESS }
          }),
          next: { revalidate: 0 }
        });
        
        const goveeData = await goveeRes.json();
        
        if (goveeData.payload?.capabilities) {
            const t = goveeData.payload.capabilities.find(c => c.instance === 'sensorTemperature');
            const h = goveeData.payload.capabilities.find(c => c.instance === 'sensorHumidity');
            if (t) temp = (Number(t.state.value) - 32) * (5/9); // F -> C
            if (h) hum = Number(h.state.value);
        }
    } catch (e) {
        console.error("Govee Fetch Error:", e);
    }

    // --- 2. Shelly Status holen (Parallel) ---
    const fetchShelly = async (id) => {
        if (!id || !process.env.SHELLY_CLOUD_KEY) return null;
        try {
            const res = await fetch(`${process.env.SHELLY_SERVER}/device/status`, {
                method: 'POST',
                body: new URLSearchParams({ id: id, auth_key: process.env.SHELLY_CLOUD_KEY }),
                next: { revalidate: 0 }
            });
            const json = await res.json();
            // Prüfen ob API Request erfolgreich war
            if (!json.isok) {
                console.error(`Shelly Error for ID ${id}:`, json);
                return null;
            }
            return json.data?.device_status?.relays?.[0]?.ison || false;
        } catch (e) {
            console.error(`Shelly Fetch Error for ID ${id}:`, e);
            return null;
        }
    };

    const [lightStatus, heaterStatus] = await Promise.all([
        fetchShelly(process.env.SHELLY_LIGHT_ID),
        fetchShelly(process.env.SHELLY_HEATER_ID)
    ]);

    // Fallback: Wenn Status null (Fehler), nehmen wir false an, aber loggen es
    const finalLight = lightStatus === null ? false : lightStatus;
    const finalHeater = heaterStatus === null ? false : heaterStatus;

    // --- 3. Datenbank Migration (Self-Healing) ---
    // Wir versuchen, die Spalte hinzuzufügen, falls sie fehlt.
    // Das ist ein Hack für Serverless-Umgebungen ohne Migrations-Tool.
    try {
        await sql`ALTER TABLE readings ADD COLUMN IF NOT EXISTS heater_status BOOLEAN DEFAULT FALSE;`;
    } catch (e) {
        // Ignorieren, falls Spalte schon da oder anderer DB Fehler (wir machen beim Insert weiter)
    }

    // --- 4. Speichern ---
    // Wir speichern nur, wenn wir zumindest Temperaturdaten haben
    if (temp !== null) {
        await sql`
            INSERT INTO readings (temperature, humidity, light_status, heater_status) 
            VALUES (${temp.toFixed(2)}, ${hum}, ${finalLight}, ${finalHeater});
        `;
    }

    return NextResponse.json({ 
        success: true, 
        logged: { 
            temp: temp?.toFixed(1), 
            hum, 
            light: finalLight, 
            heater: finalHeater,
            debug: { lightRaw: lightStatus, heaterRaw: heaterStatus } 
        } 
    });

  } catch (error) {
    console.error("Critical Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
