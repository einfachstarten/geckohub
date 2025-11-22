import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { target, action } = await request.json();

    const authKey = process.env.SHELLY_CLOUD_KEY;
    const server = process.env.SHELLY_SERVER;

    let deviceId = '';
    if (target === 'light') deviceId = process.env.SHELLY_LIGHT_ID;
    if (target === 'heater') deviceId = process.env.SHELLY_HEATER_ID;

    if (!authKey || !deviceId || !server) {
      return NextResponse.json({ error: 'Shelly Konfiguration fehlt für ' + target }, { status: 500 });
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
    });

    const data = await response.json();

    if (!data.isok) {
      console.error('Shelly Error:', data);
      throw new Error('Shelly Cloud API meldet Fehler');
    }

    return NextResponse.json({ success: true, target, state: turn });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
