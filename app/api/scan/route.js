import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.GOVEE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'API Key fehlt' }, { status: 500 });
  }

  try {
    const response = await fetch('https://developer-api.govee.com/v1/devices', {
      headers: {
        'Govee-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: `API Fehler: ${response.status}`, details: text }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
