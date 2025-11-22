import { NextResponse } from 'next/server';
import crypto from 'crypto';

// In-Memory Cache (Serverless-compatible)
let cache = {
  data: null,
  timestamp: 0
};

const CACHE_DURATION_MS = 30000; // 30 Sekunden Cache

export async function GET() {
  const apiKey = process.env.GOVEE_API_KEY;
  const deviceId = process.env.GOVEE_MAC_ADDRESS;
  const sku = "H5179";

  if (!apiKey || !deviceId) {
    return NextResponse.json({ 
      error: 'Konfiguration fehlt',
      details: 'GOVEE_API_KEY oder GOVEE_MAC_ADDRESS nicht gesetzt'
    }, { status: 500 });
  }

  // Cache Check
  const now = Date.now();
  const cacheAge = now - cache.timestamp;

  if (cache.data && cacheAge < CACHE_DURATION_MS) {
    console.log(`[CACHE HIT] Govee Sensor (age: ${Math.round(cacheAge / 1000)}s)`);
    return NextResponse.json({
      ...cache.data,
      cached: true,
      cacheAge: Math.round(cacheAge / 1000)
    });
  }

  // Cache Miss - API Call
  console.log('[CACHE MISS] Fetching from Govee API');

  try {
    const requestId = crypto.randomUUID();

    const payload = {
      requestId: requestId,
      payload: {
        sku: sku,
        device: deviceId
      }
    };

    const response = await fetch('https://openapi.api.govee.com/router/api/v1/device/state', {
      method: 'POST',
      headers: {
        'Govee-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000) // 10s Timeout
    });

    if (!response.ok) {
      throw new Error(`Govee API returned ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();

    let temp = 0;
    let hum = 0;

    if (json.payload && json.payload.capabilities) {
      const tempCap = json.payload.capabilities.find(c => c.instance === 'sensorTemperature');
      const humCap = json.payload.capabilities.find(c => c.instance === 'sensorHumidity');

      if (tempCap) temp = tempCap.state.value;
      if (humCap) hum = humCap.state.value;
    }

    const tempCelsius = (temp - 32) * (5 / 9);

    const result = {
      data: {
        properties: [
          { temperature: tempCelsius.toFixed(1) },
          { humidity: hum }
        ]
      },
      cached: false,
      timestamp: new Date().toISOString()
    };

    // Update Cache
    cache.data = result;
    cache.timestamp = now;

    return NextResponse.json(result);

  } catch (error) {
    console.error('[GOVEE API ERROR]', error.message);
    
    // Fallback: Return stale cache if available
    if (cache.data) {
      console.log('[STALE CACHE] Returning old data due to error');
      return NextResponse.json({
        ...cache.data,
        cached: true,
        stale: true,
        error: error.message
      });
    }

    return NextResponse.json({ 
      error: 'Govee API nicht erreichbar',
      details: error.message 
    }, { status: 503 });
  }
}
