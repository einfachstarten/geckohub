import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Rate Limiting für Cron
let lastCronRun = 0;
const MIN_CRON_INTERVAL_MS = 60000; // Mindestens 1 Minute zwischen Runs

export async function GET() {
  const now = Date.now();
  const timeSinceLastRun = now - lastCronRun;

  // Rate Limit Check
  if (timeSinceLastRun < MIN_CRON_INTERVAL_MS) {
    const waitTime = Math.ceil((MIN_CRON_INTERVAL_MS - timeSinceLastRun) / 1000);
    console.log(`[RATE LIMIT] Cron triggered too soon. Wait ${waitTime}s`);
    return NextResponse.json({ 
      error: 'Rate limit exceeded',
      message: `Bitte warte ${waitTime} Sekunden vor dem nächsten Aufruf`,
      nextAllowedIn: waitTime
    }, { status: 429 });
  }

  lastCronRun = now;

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
            // Umrechnung Fahrenheit -> Celsius (Govee liefert F)
            if (t) temp = (Number(t.state.value) - 32) * (5/9); 
            if (h) hum = Number(h.state.value);
        }
    } catch (e) {
        console.error("Govee Fetch Error:", e);
    }

    // --- 2. Shelly Status holen (Parallel & Robust) ---
    const fetchShelly = async (id, name) => {
        if (!id || !process.env.SHELLY_CLOUD_KEY) {
            console.warn(`Shelly ID für ${name} fehlt in Env Vars`);
            return null;
        }
        try {
            const res = await fetch(`${process.env.SHELLY_SERVER}/device/status`, {
                method: 'POST',
                body: new URLSearchParams({ id: id, auth_key: process.env.SHELLY_CLOUD_KEY }),
                next: { revalidate: 0 }
            });
            const json = await res.json();
            
            if (!json.isok) {
                console.error(`Shelly Error (${name}):`, json);
                return null; 
            }
            // Relays[0].ison ist der Standard für Shelly Plugs
            return json.data?.device_status?.relays?.[0]?.ison || false;
        } catch (e) {
            console.error(`Shelly Fetch Exception (${name}):`, e);
            return null;
        }
    };

    const [lightStatus, heaterStatus] = await Promise.all([
        fetchShelly(process.env.SHELLY_LIGHT_ID, "Light"),
        fetchShelly(process.env.SHELLY_HEATER_ID, "Heater")
    ]);

    // Fallback für DB: Wenn null (Fehler), speichern wir false, aber Log zeigt Fehler
    const finalLight = lightStatus === null ? false : lightStatus;
    const finalHeater = heaterStatus === null ? false : heaterStatus;

    // --- 3. Datenbank Migration (Self-Healing) ---
    // Wir stellen sicher, dass die Spalte heater_status existiert
    try {
        await sql`ALTER TABLE readings ADD COLUMN IF NOT EXISTS heater_status BOOLEAN DEFAULT FALSE;`;
    } catch (e) {
        // Ignorieren, falls Spalte schon da
    }

    // --- 4. Speichern ---
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
