import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Deaktiviert Caching für diese Route komplett
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Prüfen ob Tabelle existiert
    // (Information schema query)
    const tableCheck = await sql`
      SELECT exists(
        SELECT FROM information_schema.tables 
        WHERE table_name = 'readings'
      );
    `;
    
    const tableExists = tableCheck.rows[0].exists;

    if (!tableExists) {
        console.log("DEBUG: Tabelle 'readings' existiert NICHT!");
        return NextResponse.json({ error: "Table 'readings' does not exist" });
    }

    // 2. Die letzten 20 Einträge holen
    const result = await sql`
      SELECT * FROM readings ORDER BY timestamp DESC LIMIT 20;
    `;

    console.log("DEBUG: Database Dump (Last 20):", result.rows);

    return NextResponse.json({ 
        count: result.rowCount,
        rows: result.rows 
    });

  } catch (error) {
    console.error("DEBUG ERROR:", error);
    return NextResponse.json({ error: error.toString() }, { status: 500 });
  }
}
