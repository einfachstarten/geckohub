import { NextResponse } from 'next/server';

export async function GET() {
  const authKey = process.env.SHELLY_CLOUD_KEY;
  const server = process.env.SHELLY_SERVER;

  const devices = [
    { id: process.env.SHELLY_LIGHT_ID, type: 'light' },
    { id: process.env.SHELLY_HEATER_ID, type: 'heater' }
  ];

  if (!authKey || !server) return NextResponse.json({ error: 'Config missing' }, { status: 500 });

  try {
    const promises = devices.map(async (device) => {
      if (!device.id) return { type: device.type, on: false, error: 'No ID' };

      const params = new URLSearchParams({ id: device.id, auth_key: authKey });
      const res = await fetch(`${server}/device/status`, {
        method: 'POST',
        body: params,
        next: { revalidate: 5 }
      });
      const data = await res.json();

      const isOn = data.data?.device_status?.relays?.[0]?.ison || false;
      return { type: device.type, on: isOn };
    });

    const results = await Promise.all(promises);

    const statusMap = results.reduce((acc, cur) => ({ ...acc, [cur.type]: cur.on }), {});

    return NextResponse.json({ success: true, status: statusMap });
  } catch (error) {
    return NextResponse.json({ error: 'Status Fetch Failed' }, { status: 500 });
  }
}

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
