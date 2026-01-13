import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const subscription = await request.json();

    if (!subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    const userAgent = request.headers.get('user-agent') || 'Unknown';

    await sql`
      INSERT INTO push_subscriptions (endpoint, keys, user_agent)
      VALUES (
        ${subscription.endpoint},
        ${JSON.stringify(subscription.keys)},
        ${userAgent}
      )
      ON CONFLICT (endpoint)
      DO UPDATE SET
        keys = ${JSON.stringify(subscription.keys)},
        user_agent = ${userAgent}
    `;

    return NextResponse.json({
      success: true,
      message: 'Push subscription saved'
    });
  } catch (error) {
    console.error('Error saving subscription:', error);
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { endpoint } = await request.json();

    await sql`
      DELETE FROM push_subscriptions
      WHERE endpoint = ${endpoint}
    `;

    return NextResponse.json({
      success: true,
      message: 'Subscription removed'
    });
  } catch (error) {
    console.error('Error removing subscription:', error);
    return NextResponse.json(
      { error: 'Failed to remove subscription' },
      { status: 500 }
    );
  }
}
