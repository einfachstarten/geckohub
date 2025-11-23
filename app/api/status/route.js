import { NextResponse } from 'next/server';
import { getShellyStatus } from '@/lib/shellyStatus';

export async function GET() {
  try {
    const payload = await getShellyStatus();
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Unbekannter Fehler'
    }, { status: error.statusCode || 500 });
  }
}
