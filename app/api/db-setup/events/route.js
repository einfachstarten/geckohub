import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS device_events (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT NOW(),
        device TEXT NOT NULL,
        action TEXT NOT NULL,
        source TEXT DEFAULT 'user',
        metadata JSONB
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_device_events_timestamp 
      ON device_events(timestamp DESC);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_device_events_device 
      ON device_events(device, timestamp DESC);
    `;

    return NextResponse.json({ 
      success: true,
      message: 'Events table created successfully'
    });

  } catch (error) {
    console.error('DB Setup Error:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
