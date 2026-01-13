import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await sql`
      SELECT * FROM notification_settings
      ORDER BY id DESC
      LIMIT 1
    `;

    const settings = result.rows[0] || {
      push_enabled: false,
      email_enabled: false,
      temp_critical_low: 18,
      temp_critical_high: 30,
      humidity_critical_low: 40,
      humidity_critical_high: 90,
      notification_cooldown_minutes: 60
    };

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const settings = await request.json();

    await sql`
      INSERT INTO notification_settings (
        id,
        push_enabled,
        email_enabled,
        email_address,
        temp_critical_low,
        temp_critical_high,
        humidity_critical_low,
        humidity_critical_high,
        notification_cooldown_minutes,
        updated_at
      )
      VALUES (
        1,
        ${settings.push_enabled},
        ${settings.email_enabled},
        ${settings.email_address || null},
        ${settings.temp_critical_low},
        ${settings.temp_critical_high},
        ${settings.humidity_critical_low},
        ${settings.humidity_critical_high},
        ${settings.notification_cooldown_minutes},
        NOW()
      )
      ON CONFLICT (id)
      DO UPDATE SET
        push_enabled = ${settings.push_enabled},
        email_enabled = ${settings.email_enabled},
        email_address = ${settings.email_address || null},
        temp_critical_low = ${settings.temp_critical_low},
        temp_critical_high = ${settings.temp_critical_high},
        humidity_critical_low = ${settings.humidity_critical_low},
        humidity_critical_high = ${settings.humidity_critical_high},
        notification_cooldown_minutes = ${settings.notification_cooldown_minutes},
        updated_at = NOW()
    `;

    return NextResponse.json({
      success: true,
      message: 'Settings updated'
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
