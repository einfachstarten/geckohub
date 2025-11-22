import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.GOVEE_API_KEY;
  const mac = process.env.GOVEE_MAC_ADDRESS;
  // WICHTIG: Modellnummer für den WiFi Sensor des Users
  const model = "H5179"; 

  if (!apiKey || !mac) {
    return NextResponse.json({ error: 'Konfiguration fehlt (API Key oder MAC)' }, { status: 500 });
  }

  try {
    // 1. Anfrage an Govee API
    const response = await fetch(`https://developer-api.govee.com/v1/devices/state?device=${mac}&model=${model}`, {
      headers: {
        'Govee-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 10 }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Govee API Fehler: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
