import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    console.log('[DB MIGRATE] Starting migration...');

    // 1. Prüfen welche Spalten existieren
    const columnsCheck = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'readings'
      ORDER BY ordinal_position;
    `;

    const columns = columnsCheck.rows.map((r) => r.column_name);
    console.log('[DB MIGRATE] Current columns:', columns);

    // 2. Prüfen ob alte Struktur vorhanden
    const hasOldStructure = columns.includes('light_power') || columns.includes('heater_power');
    const hasNewStructure = columns.includes('light_status') && columns.includes('heater_status');

    if (hasOldStructure && !hasNewStructure) {
      console.log('[DB MIGRATE] Old structure detected, migrating...');

      if (columns.includes('light_power')) {
        await sql`ALTER TABLE readings RENAME COLUMN light_power TO light_status;`;
        await sql`ALTER TABLE readings ALTER COLUMN light_status TYPE BOOLEAN USING (light_status > 0);`;
        console.log('[DB MIGRATE] Renamed light_power -> light_status');
      }

      if (columns.includes('heater_power')) {
        await sql`ALTER TABLE readings RENAME COLUMN heater_power TO heater_status;`;
        await sql`ALTER TABLE readings ALTER COLUMN heater_status TYPE BOOLEAN USING (heater_status > 0);`;
        console.log('[DB MIGRATE] Renamed heater_power -> heater_status');
      }

      if (!columns.includes('light_status')) {
        await sql`ALTER TABLE readings ADD COLUMN light_status BOOLEAN DEFAULT false;`;
        console.log('[DB MIGRATE] Added light_status column');
      }

      if (!columns.includes('heater_status')) {
        await sql`ALTER TABLE readings ADD COLUMN heater_status BOOLEAN DEFAULT false;`;
        console.log('[DB MIGRATE] Added heater_status column');
      }

      return NextResponse.json({
        success: true,
        message: 'Migration completed',
        before: columnsCheck.rows,
        after: 'Check /api/debug for new structure'
      });
    }

    if (hasNewStructure) {
      console.log('[DB MIGRATE] Schema is already up to date');
      return NextResponse.json({
        success: true,
        message: 'Schema already correct',
        columns: columnsCheck.rows
      });
    }

    console.log('[DB MIGRATE] Table does not exist or is broken, recreating...');

    await sql`DROP TABLE IF EXISTS readings CASCADE;`;

    await sql`CREATE TABLE readings (
      id SERIAL PRIMARY KEY,
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      temperature NUMERIC(5,2),
      humidity NUMERIC(5,2),
      light_status BOOLEAN DEFAULT false,
      heater_status BOOLEAN DEFAULT false
    );`;

    console.log('[DB MIGRATE] Table recreated from scratch');

    return NextResponse.json({
      success: true,
      message: 'Table recreated',
      action: 'dropped_and_recreated'
    });
  } catch (error) {
    console.error('[DB MIGRATE ERROR]:', error);
    return NextResponse.json(
      {
        error: error.toString(),
        stack: error.stack
      },
      { status: 500 }
    );
  }
}
