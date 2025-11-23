import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getShellyStatus, invalidateShellyCache, refreshShellyCache } from '@/lib/shellyStatus';

export async function GET() {
  try {
    const status = await getShellyStatus();
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Shelly Status nicht verfügbar'
    }, { status: error.statusCode || 500 });
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

    invalidateShellyCache();
    await refreshShellyCache();

    // Log Event to Database
    try {
      await sql`
        INSERT INTO device_events (device, action, source, metadata)
        VALUES (
          ${target},
          ${turn},
          'user',
          ${JSON.stringify({
            deviceId,
            timestamp: new Date().toISOString()
          })}
        );
      `;
      console.log(`[EVENT LOGGED] ${target} turned ${turn}`);
    } catch (eventError) {
      // Event-Logging darf Control nicht blockieren
      console.error('[EVENT LOG ERROR]', eventError);
    }

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
