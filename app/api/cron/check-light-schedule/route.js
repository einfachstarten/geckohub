import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

const SHELLY_DEVICE_ID = process.env.SHELLY_LIGHT_ID;
const SHELLY_API_KEY = process.env.SHELLY_API_KEY;

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const scheduleResult = await sql`
      SELECT * FROM light_schedule 
      WHERE enabled = true
      ORDER BY id DESC 
      LIMIT 1
    `;

    if (scheduleResult.rows.length === 0) {
      return NextResponse.json({
        message: 'Schedule disabled or not found'
      });
    }

    const schedule = scheduleResult.rows[0];

    const now = new Date();
    const viennaTime = new Intl.DateTimeFormat('de-AT', {
      timeZone: 'Europe/Vienna',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(now);

    console.log('Current time:', viennaTime);
    console.log('Schedule ON:', schedule.time_on, 'OFF:', schedule.time_off);

    let action = null;
    let targetState = null;

    if (viennaTime === schedule.time_on) {
      action = 'turn_on';
      targetState = 'on';
    } else if (viennaTime === schedule.time_off) {
      action = 'turn_off';
      targetState = 'off';
    }

    if (!action) {
      return NextResponse.json({
        message: 'No action needed',
        current_time: viennaTime
      });
    }

    // Deduplizierung: Check ob bereits ausgeführt
    if (schedule.last_action === action && schedule.last_action_time) {
      const lastActionTime = new Date(schedule.last_action_time);
      const timeSinceLastAction = now - lastActionTime;

      if (timeSinceLastAction < 120000) {
        return NextResponse.json({
          message: 'Action already executed recently',
          last_action: action,
          time_since: `${Math.round(timeSinceLastAction / 1000)}s`
        });
      }
    }

    const shellyUrl = 'https://shelly-56-eu.shelly.cloud/device/relay/control';
    const shellyResponse = await fetch(shellyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        auth_key: SHELLY_API_KEY,
        id: SHELLY_DEVICE_ID,
        channel: '0',
        turn: targetState
      })
    });

    if (!shellyResponse.ok) {
      throw new Error(`Shelly API error: ${shellyResponse.status}`);
    }

    const shellyData = await shellyResponse.json();

    await sql`
      UPDATE light_schedule 
      SET 
        last_action = ${action},
        last_action_time = NOW()
      WHERE id = ${schedule.id}
    `;

    return NextResponse.json({
      success: true,
      action: action,
      time: viennaTime,
      shelly_response: shellyData
    });
  } catch (error) {
    console.error('Error in light schedule check:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
