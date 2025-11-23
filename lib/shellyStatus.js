const SHELLY_CACHE_DURATION_MS = 10_000;
const STALE_THRESHOLD_MS = 5 * 60 * 1000;
const REQUEST_DELAY_MS = 1200;

const statusCache = {
  data: null,
  timestamp: 0
};

const devices = [
  { id: process.env.SHELLY_LIGHT_ID, type: 'light', name: 'Tageslicht' },
  { id: process.env.SHELLY_HEATER_ID, type: 'heater', name: 'Heizung' }
];

function getCacheAgeSeconds(now = Date.now()) {
  return Math.round((now - statusCache.timestamp) / 1000);
}

function updateCache(payload) {
  statusCache.data = payload;
  statusCache.timestamp = Date.now();
}

function parseShellyStatus(apiResponse, deviceType) {
  const deviceStatus = apiResponse.data?.device_status;

  if (!deviceStatus) {
    throw new Error('Keine device_status in Response');
  }

  const switchData = deviceStatus['switch:0'];

  if (!switchData) {
    throw new Error(`Kein switch:0 gefunden für ${deviceType}`);
  }

  return {
    output: switchData.output === true,
    power: switchData.apower || 0,
    voltage: switchData.voltage || 0,
    current: switchData.current || 0,
    energy: switchData.aenergy?.total || 0,
    temp: switchData.temperature?.tC || null,
    online: apiResponse.data?.online || false
  };
}

async function fetchDeviceStatus(device, authKey, server) {
  if (!device.id) {
    throw new Error(`Shelly ID für ${device.name} fehlt`);
  }

  const params = new URLSearchParams({
    id: device.id,
    auth_key: authKey
  });

  const res = await fetch(`${server}/device/status`, {
    method: 'POST',
    body: params,
    signal: AbortSignal.timeout(10_000),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error('Rate limited');
    }
    throw new Error(`HTTP ${res.status}`);
  }

  const data = await res.json();

  if (!data.isok) {
    throw new Error(data.errors?.[0] || 'Shelly API returned isok:false');
  }

  return parseShellyStatus(data, device.name);
}

export async function getShellyStatus({ forceRefresh = false } = {}) {
  const authKey = process.env.SHELLY_CLOUD_KEY;
  const server = process.env.SHELLY_SERVER;
  const now = Date.now();

  if (!authKey || !server) {
    const error = new Error('Shelly Konfiguration fehlt');
    error.statusCode = 500;
    throw error;
  }

  const cacheAgeMs = now - statusCache.timestamp;
  const hasWarmCache = statusCache.data && cacheAgeMs < SHELLY_CACHE_DURATION_MS;

  if (!forceRefresh && hasWarmCache) {
    return {
      ...statusCache.data,
      cached: true,
      cacheAge: getCacheAgeSeconds(now)
    };
  }

  const status = {};
  const meta = {};
  let cacheUsed = false;

  for (let i = 0; i < devices.length; i++) {
    const device = devices[i];

    try {
      const liveStatus = await fetchDeviceStatus(device, authKey, server);

      status[device.type] = liveStatus.output;
      meta[device.type] = {
        verified: true,
        source: 'live',
        age: 0
      };
    } catch (error) {
      const cachedValue = statusCache.data?.status?.[device.type];
      const cachedMeta = statusCache.data?.meta?.[device.type];
      const cacheAgeSeconds = getCacheAgeSeconds(now);

      if (
        cachedValue !== undefined &&
        statusCache.timestamp &&
        now - statusCache.timestamp < STALE_THRESHOLD_MS
      ) {
        status[device.type] = cachedValue;
        meta[device.type] = {
          verified: cachedMeta?.verified ?? false,
          source: 'cache',
          age: cacheAgeSeconds,
          error: error.message
        };
        cacheUsed = true;
      } else {
        status[device.type] = null;
        meta[device.type] = {
          verified: false,
          source: 'error',
          age: null,
          error: error.message
        };
      }
    }

    if (i < devices.length - 1) {
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY_MS));
    }
  }

  const allVerified = devices.every((device) => meta[device.type]?.verified);
  const anyVerified = devices.some((device) => meta[device.type]?.verified);

  if (!anyVerified && !cacheUsed) {
    const error = new Error('Shelly Status nicht verfügbar');
    error.statusCode = 503;
    throw error;
  }

  const payload = {
    success: true,
    status,
    meta,
    allVerified,
    cached: cacheUsed,
    cacheAge: cacheUsed ? getCacheAgeSeconds(now) : 0,
    timestamp: new Date().toISOString()
  };

  if (allVerified) {
    updateCache({ ...payload, cached: false, cacheAge: 0 });
  }

  return payload;
}

export function invalidateShellyCache() {
  statusCache.timestamp = 0;
}

export async function refreshShellyCache() {
  try {
    await getShellyStatus({ forceRefresh: true });
  } catch (error) {
    console.warn('[SHELLY CACHE REFRESH FAILED]', error.message);
  }
}
