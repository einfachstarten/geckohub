const webPush = require('web-push');
import { sql } from '@vercel/postgres';

// VAPID Setup
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    'mailto:marcus.braun@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function sendCriticalAlert(type, value, threshold) {
  try {
    // Check if VAPID keys are set
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.log('Push notifications not configured - skipping');
      return;
    }

    const result = await sql`SELECT * FROM push_subscriptions`;

    if (result.rows.length === 0) {
      console.log('No push subscriptions found');
      return;
    }

    const notification = {
      title: getAlertTitle(type, value),
      body: getAlertBody(type, value, threshold),
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `critical-${type}`,
      requireInteraction: true,
      data: {
        url: 'https://flitzhq.vercel.app',
        type: type,
        value: value
      }
    };

    const promises = result.rows.map(sub => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: sub.keys
      };

      return webPush
        .sendNotification(pushSubscription, JSON.stringify(notification))
        .catch(error => {
          console.error('Push send error:', error);

          if (error.statusCode === 410 || error.statusCode === 404) {
            sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`;
          }
        });
    });

    await Promise.all(promises);
    console.log(`Sent ${promises.length} push notifications for ${type}`);

  } catch (error) {
    console.error('Error sending push notifications:', error);
  }
}

function getAlertTitle(type, value) {
  switch(type) {
    case 'temp_low': return `❄️ Temperatur zu niedrig!`;
    case 'temp_high': return `🔥 Temperatur zu hoch!`;
    case 'humidity_low': return `💧 Luftfeuchtigkeit zu niedrig!`;
    case 'humidity_high': return `💧 Luftfeuchtigkeit zu hoch!`;
    default: return '⚠️ FlitzHQ Alert';
  }
}

function getAlertBody(type, value, threshold) {
  switch(type) {
    case 'temp_low': return `${value}°C (unter ${threshold}°C) - Gecko könnte frieren`;
    case 'temp_high': return `${value}°C (über ${threshold}°C) - Kritisch heiß`;
    case 'humidity_low': return `${value}% (unter ${threshold}%) - Häutungsprobleme möglich`;
    case 'humidity_high': return `${value}% (über ${threshold}%) - Zu feucht`;
    default: return `Wert: ${value}`;
  }
}
