import { NextResponse } from 'next/server';

// Import cache variables (in production würde man Redis verwenden)
// Für Development: Cache Stats Endpoint

export async function GET() {
  // Dieser Endpoint zeigt Cache-Statistiken an
  // Nützlich für Debugging und Monitoring
  
  return NextResponse.json({
    message: 'Cache Stats Endpoint',
    info: 'In Memory Caching aktiv. Stats werden in Console geloggt.',
    recommendation: 'Für Production: Redis oder Vercel KV nutzen',
    caching: {
      sensor: '30s Cache-Duration',
      shelly: '5s Cache-Duration',
      history: '2min Cache-Duration',
      cron: '1min Rate Limit'
    }
  });
}
