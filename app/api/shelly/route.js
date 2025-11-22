import { NextResponse } from 'next/server';

// In-Memory Cache
let shellyCache = {
  data: null,
  timestamp: 0
};

const SHELLY_CACHE_DURATION_MS = 5000; // 5 Sekunden Cache (Shelly ist schneller)

export async function GET() {
  const authKey = process.env.SHELLY_CLOUD_KEY;
  const server = process.env.SHELLY_SERVER;

  const devices = [
    { id: process.env.SHELLY_LIGHT_ID, type: 'light' },
    { id: process.env.SHELLY_HEATER_ID, type: 'heater' }
  ];

  if (!authKey || !server) {
    return NextResponse.json({ 
      error: 'Shelly Konfiguration fehlt',
      details: 'SHELLY_CLOUD_KEY oder SHELLY_SERVER nicht gesetzt'
    }, { status: 500 });
  }

  // Cache Check
  const now = Date.now();
  const cacheAge = now - shellyCache.timestamp;

  if (shellyCache.data && cacheAge < SHELLY_CACHE_DURATION_MS) {
    console.log(`[CACHE HIT] Shelly Status (age: ${Math.round(cacheAge / 1000)}s)`);
    return NextResponse.json({
      ...shellyCache.data,
      cached: true,
      cacheAge: Math.round(cacheAge / 1000)
    });
  }

  // Cache Miss
  console.log('[CACHE MISS] Fetching from Shelly API');

  try {
    const promises = devices.map(async (device) => {
      if (!device.id) {
        console.warn(`[SHELLY] Missing ID for ${device.type}`);
        return { type: device.type, on: false, error: 'No ID configured' };
      }

      try {
        const params = new URLSearchParams({ id: device.id, auth_key: authKey });
        const res = await fetch(`${server}/device/status`, {
          method: 'POST',
          body: params,
          signal: AbortSignal.timeout(8000) // 8s Timeout
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();

        if (!data.isok) {
          throw new Error(data.errors?.[0] || 'Shelly API Error');
        }

        const isOn = data.data?.device_status?.relays?.[0]?.ison || false;
        return { type: device.type, on: isOn };

      } catch (e) {
        console.error(`[SHELLY ERROR] ${device.type}:`, e.message);
        return { type: device.type, on: false, error: e.message };
      }
    });

    const results = await Promise.all(promises);

    const statusMap = results.reduce((acc, cur) => ({ 
      ...acc, 
      [cur.type]: cur.on 
    }), {});

    const result = { 
      success: true, 
      status: statusMap,
      cached: false,
      timestamp: new Date().toISOString()
    };

    // Update Cache
    shellyCache.data = result;
    shellyCache.timestamp = now;

    return NextResponse.json(result);

  } catch (error) {
    console.error('[SHELLY API ERROR]', error.message);

    // Fallback: Stale cache
    if (shellyCache.data) {
      console.log('[STALE CACHE] Returning old Shelly data');
      return NextResponse.json({
        ...shellyCache.data,
        cached: true,
        stale: true
      });
    }

    return NextResponse.json({ 
      error: 'Shelly API nicht erreichbar',
      details: error.message
    }, { status: 503 });
  }
}

// POST Methode bleibt unverändert, aber füge Error Handling hinzu:
export async function POST(request) {
  try {
    const { target, action } = await request.json();

    if (!target || !action) {
      return NextResponse.json({ 
        error: 'Fehlende Parameter',
        details: 'target und action sind erforderlich'
      }, { status: 400 });
    }

    const authKey = process.env.SHELLY_CLOUD_KEY;
    const server = process.env.SHELLY_SERVER;

    let deviceId = '';
    if (target === 'light') deviceId = process.env.SHELLY_LIGHT_ID;
    if (target === 'heater') deviceId = process.env.SHELLY_HEATER_ID;

    if (!authKey || !deviceId || !server) {
      return NextResponse.json({ 
        error: `Shelly Konfiguration unvollständig für ${target}`,
        details: 'Device ID oder Auth Key fehlt'
      }, { status: 500 });
    }

    const turn = action === 'on' ? 'on' : 'off';
    const formData = new URLSearchParams();
    formData.append('channel', '0');
    formData.append('turn', turn);
    formData.append('id', deviceId);
    formData.append('auth_key', authKey);

    const response = await fetch(`${server}/device/relay/control`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      throw new Error(`Shelly Cloud returned ${response.status}`);
    }

    const data = await response.json();

    if (!data.isok) {
      console.error('[SHELLY CONTROL ERROR]', data);
      throw new Error(data.errors?.[0] || 'Schaltvorgang fehlgeschlagen');
    }

    // Invalidate Cache on successful control
    console.log('[CACHE INVALIDATE] Shelly status changed');
    shellyCache.timestamp = 0;

    return NextResponse.json({ 
      success: true, 
      target, 
      state: turn 
    });

  } catch (error) {
    console.error('[SHELLY CONTROL ERROR]', error);
    return NextResponse.json({ 
      error: 'Schaltvorgang fehlgeschlagen',
      details: error.message 
    }, { status: 500 });
  }
}
