import { NextResponse } from 'next/server';

// In-Memory Cache
let shellyCache = {
  data: null,
  timestamp: 0
};

const SHELLY_CACHE_DURATION_MS = 5000;

// Helper: Parse Shelly Response
function parseShellyStatus(apiResponse, deviceType) {
  try {
    const deviceStatus = apiResponse.data?.device_status;
    
    if (!deviceStatus) {
      throw new Error('Keine device_status in Response');
    }

    // Status ist in "switch:0" für Shelly Plus Plugs
    const switchData = deviceStatus['switch:0'];
    
    if (!switchData) {
      console.warn(`Kein switch:0 gefunden für ${deviceType}`, deviceStatus);
      return {
        output: false,
        power: 0,
        voltage: 0,
        current: 0,
        energy: 0,
        temp: null,
        online: apiResponse.data?.online || false,
        error: 'Kein Switch gefunden'
      };
    }

    return {
      output: switchData.output || false,
      power: switchData.apower || 0, // Watt
      voltage: switchData.voltage || 0, // Volt
      current: switchData.current || 0, // Ampere
      energy: switchData.aenergy?.total || 0, // kWh
      temp: switchData.temperature?.tC || null, // Celsius
      online: apiResponse.data?.online || false
    };
  } catch (e) {
    console.error(`Parse Error für ${deviceType}:`, e);
    return {
      output: false,
      power: 0,
      voltage: 0,
      current: 0,
      energy: 0,
      temp: null,
      online: false,
      error: e.message
    };
  }
}

export async function GET() {
  const authKey = process.env.SHELLY_CLOUD_KEY;
  const server = process.env.SHELLY_SERVER;

  const devices = [
    { id: process.env.SHELLY_LIGHT_ID, type: 'light', name: 'Tageslicht' },
    { id: process.env.SHELLY_HEATER_ID, type: 'heater', name: 'Heizung' }
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
  console.log('[CACHE MISS] Fetching from Shelly Cloud API');

  try {
    const results = [];

    // ✅ SEQUENTIAL statt parallel - mit Delay zwischen Requests
    for (let i = 0; i < devices.length; i++) {
      const device = devices[i];

      if (!device.id) {
        console.warn(`[SHELLY] Missing ID for ${device.type}`);
        results.push({
          type: device.type,
          data: {
            output: false,
            power: 0,
            voltage: 0,
            current: 0,
            energy: 0,
            temp: null,
            online: false,
            error: 'No ID configured'
          }
        });
        continue;
      }

      try {
        const params = new URLSearchParams({
          id: device.id,
          auth_key: authKey
        });

        console.log(`[SHELLY] Fetching ${device.name}...`);

        const res = await fetch(`${server}/device/status`, {
          method: 'POST',
          body: params,
          signal: AbortSignal.timeout(10000),
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });

        if (!res.ok) {
          // Spezielles Handling für Rate Limit
          if (res.status === 429) {
            console.warn(`[SHELLY] Rate Limited for ${device.name}, retrying after 1.5s...`);

            // Warte 1.5 Sekunden und versuche erneut
            await new Promise(resolve => setTimeout(resolve, 1500));

            const retryRes = await fetch(`${server}/device/status`, {
              method: 'POST',
              body: params,
              signal: AbortSignal.timeout(10000),
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              }
            });

            if (!retryRes.ok) {
              throw new Error(`HTTP ${retryRes.status} (after retry)`);
            }

            const retryData = await retryRes.json();

            if (!retryData.isok) {
              throw new Error(retryData.errors?.[0] || 'Shelly API returned isok:false');
            }

            const parsedData = parseShellyStatus(retryData, device.name);
            console.log(`[SHELLY SUCCESS - RETRY] ${device.name}:`, {
              output: parsedData.output,
              power: parsedData.power,
              online: parsedData.online
            });

            results.push({ type: device.type, data: parsedData });

          } else {
            throw new Error(`HTTP ${res.status}`);
          }
        } else {
          // Normaler Success Path
          const data = await res.json();

          if (!data.isok) {
            throw new Error(data.errors?.[0] || 'Shelly API returned isok:false');
          }

          const parsedData = parseShellyStatus(data, device.name);

          console.log(`[SHELLY SUCCESS] ${device.name}:`, {
            output: parsedData.output,
            power: parsedData.power,
            online: parsedData.online
          });

          results.push({ type: device.type, data: parsedData });
        }

      } catch (e) {
        console.error(`[SHELLY ERROR] ${device.name}:`, e.message);
        results.push({
          type: device.type,
          data: {
            output: false,
            power: 0,
            voltage: 0,
            current: 0,
            energy: 0,
            temp: null,
            online: false,
            error: e.message
          }
        });
      }

      // ✅ Delay zwischen Requests (Rate Limit vermeiden)
      if (i < devices.length - 1) {
        console.log('[SHELLY] Waiting 1.2s before next request...');
        await new Promise(resolve => setTimeout(resolve, 1200));
      }
    }

    const statusMap = results.reduce((acc, cur) => ({ 
      ...acc, 
      [cur.type]: cur.data 
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
    let deviceName = '';
    if (target === 'light') {
      deviceId = process.env.SHELLY_LIGHT_ID;
      deviceName = 'Tageslicht';
    }
    if (target === 'heater') {
      deviceId = process.env.SHELLY_HEATER_ID;
      deviceName = 'Heizung';
    }

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

    console.log(`[SHELLY CONTROL SUCCESS] ${deviceName} → ${turn}`);

    // Invalidate Cache
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
