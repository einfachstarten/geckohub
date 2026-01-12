import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

// GET: Schedule abrufen
export async function GET() {
  try {
    const result = await sql`
      SELECT * FROM light_schedule 
      ORDER BY id DESC 
      LIMIT 1
    `;

    const schedule = result.rows[0] || {
      enabled: false,
      time_on: '08:00',
      time_off: '20:00'
    };

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 }
    );
  }
}

// POST: Schedule aktualisieren
export async function POST(request) {
  try {
    const { enabled, time_on, time_off } = await request.json();

    if (typeof enabled !== 'boolean' || !time_on || !time_off) {
      return NextResponse.json(
        { error: 'Invalid schedule data' },
        { status: 400 }
      );
    }

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time_on) || !timeRegex.test(time_off)) {
      return NextResponse.json(
        { error: 'Invalid time format. Use HH:MM' },
        { status: 400 }
      );
    }

    await sql`
      INSERT INTO light_schedule (id, enabled, time_on, time_off, updated_at)
      VALUES (1, ${enabled}, ${time_on}, ${time_off}, NOW())
      ON CONFLICT (id) 
      DO UPDATE SET 
        enabled = ${enabled},
        time_on = ${time_on},
        time_off = ${time_off},
        updated_at = NOW()
    `;

    return NextResponse.json({
      success: true,
      message: 'Schedule updated successfully'
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update schedule' },
      { status: 500 }
    );
  }
}
