import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET() {
  const apiKey = process.env.GOVEE_API_KEY;
  const deviceId = process.env.GOVEE_MAC_ADDRESS; // Jetzt: 27:18:E2:6A:C2:46:4C:65
  const sku = "H5179";

  if (!apiKey || !deviceId) {
    return NextResponse.json({ error: 'Konfiguration fehlt' }, { status: 500 });
  }

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
      next: { revalidate: 10 }
    });

    if (!response.ok) {
      throw new Error(`API Fehler: ${response.status}`);
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

    return NextResponse.json({
      data: {
        properties: [
          { temperature: tempCelsius.toFixed(1) },
          { humidity: hum }
        ]
      },
      raw: json
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
