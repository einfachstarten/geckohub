import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getShellyStatus } from '@/lib/shellyStatus';

// Helper: Fetch mit Timeout (9s für externe Trigger)
const fetchWithTimeout = async (url, options = {}, timeout = 9000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

export async function GET(request) {
  // --- SECURITY CHECK ---
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  
  // Security Token (Fallback hardcoded für einfachen Setup)
  const secret = process.env.CRON_SECRET || 'gecko_secure_123';

  if (key !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // --- LOGIC ---
  try {
    console.log(`[EXTERNAL CRON] Starting run...`);

    // 1. Govee Daten holen (Router API)
    const goveePromise = (async () => {
        try {
            const res = await fetchWithTimeout('https://openapi.api.govee.com/router/api/v1/device/state', {
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
            const json = await res.json();
            if (json.payload?.capabilities) {
                const t = json.payload.capabilities.find(c => c.instance === 'sensorTemperature');
                const h = json.payload.capabilities.find(c => c.instance === 'sensorHumidity');
                return {
                    temp: t ? (Number(t.state.value) - 32) * (5/9) : null,
                    hum: h ? Number(h.state.value) : null
                };
            }
        } catch (e) {
            console.error("[CRON] Govee Error:", e.message);
        }
        return null;
    })();

    // 2. Shelly Daten holen (Gen 2/3 Support)
    const shellyPromise = (async () => {
        try {
            const status = await getShellyStatus({ forceRefresh: true });

            if (!status.allVerified) {
                throw new Error('Shelly Status nicht verifiziert');
            }

            return status.status;
        } catch (e) {
            console.error('[CRON] Shelly Error:', e.message);
            return null;
        }
    })();

    const [goveeData, shellyData] = await Promise.all([goveePromise, shellyPromise]);

    // Auto-Event Logging bei Status-Änderung
    try {
      const { rows } = await sql`
        SELECT light_status, heater_status 
        FROM readings 
        ORDER BY timestamp DESC 
        LIMIT 1;
      `;

      const lastState = rows[0] || { light_status: false, heater_status: false };
      const lightStatus = shellyData ? shellyData.light : null;
      const heaterStatus = shellyData ? shellyData.heater : null;

      if (lightStatus !== null && lightStatus !== lastState.light_status) {
        await sql`
          INSERT INTO device_events (device, action, source)
          VALUES ('light', ${lightStatus ? 'on' : 'off'}, 'automation');
        `;
        console.log(`[AUTO EVENT] Light changed to ${lightStatus}`);
      }

      if (heaterStatus !== null && heaterStatus !== lastState.heater_status) {
        await sql`
          INSERT INTO device_events (device, action, source)
          VALUES ('heater', ${heaterStatus ? 'on' : 'off'}, 'automation');
        `;
        console.log(`[AUTO EVENT] Heater changed to ${heaterStatus}`);
      }

    } catch (e) {
      console.error('[AUTO EVENT ERROR]', e);
      // Nicht kritisch, weiter machen
    }

    // 3. Speichern
    if (goveeData && goveeData.temp !== null) {
        if (!shellyData) {
            return NextResponse.json({ error: "Shelly Status unverifiziert" }, { status: 503 });
        }
        // Table check (Self-Healing)
        await sql`CREATE TABLE IF NOT EXISTS readings (
            id SERIAL PRIMARY KEY,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            temperature NUMERIC(5,2),
            humidity NUMERIC(5,2),
            light_status BOOLEAN,
            heater_status BOOLEAN
        );`;

        const result = await sql`
            INSERT INTO readings (temperature, humidity, light_status, heater_status) 
            VALUES (${goveeData.temp.toFixed(2)}, ${goveeData.hum}, ${shellyData.light}, ${shellyData.heater})
            RETURNING id;
        `;
        
        return NextResponse.json({ success: true, id: result.rows[0].id, data: { ...goveeData, ...shellyData } });
    } else {
        return NextResponse.json({ error: "No Sensor Data" }, { status: 500 });
    }

  } catch (error) {
    return NextResponse.json({ error: error.toString() }, { status: 500 });
  }
}
