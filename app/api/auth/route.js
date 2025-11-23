import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { password } = await request.json();

    const correctPassword = process.env.USER_PASSWORD;

    if (!correctPassword) {
      return NextResponse.json(
        {
          error: 'Server-Konfigurationsfehler',
          details: 'USER_PASSWORD nicht gesetzt',
        },
        { status: 500 },
      );
    }

    if (password === correctPassword) {
      return NextResponse.json({
        success: true,
        message: 'Login erfolgreich',
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Falsches Passwort',
      },
      { status: 401 },
    );
  } catch (error) {
    console.error('[AUTH ERROR]', error);
    return NextResponse.json(
      {
        error: 'Authentication fehlgeschlagen',
        details: error.message,
      },
      { status: 500 },
    );
  }
}
