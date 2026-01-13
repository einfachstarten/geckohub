import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

// Dynamisches Import von web-push (ESM Kompatibilität)
const webPush = require('web-push');

export async function GET(request) {
  // Security: Nur ausführbar wenn noch keine Keys gesetzt
  if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return new Response(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Push Setup bereits abgeschlossen</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #0f172a;
            color: #e2e8f0;
          }
          .container {
            background: #1e293b;
            border-radius: 12px;
            padding: 30px;
            border: 1px solid #334155;
          }
          h1 { color: #10b981; }
          .success { color: #10b981; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>✅ Setup bereits abgeschlossen</h1>
          <p class="success">VAPID Keys sind bereits in Vercel Environment Variables gesetzt.</p>
          <p>Falls du neue Keys generieren möchtest, lösche erst die bestehenden ENV Vars in Vercel.</p>
          <br>
          <a href="/" style="color: #10b981;">← Zurück zum Dashboard</a>
        </div>
      </body>
      </html>
      `,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }

  try {
    // STEP 1: VAPID Keys generieren
    const vapidKeys = webPush.generateVAPIDKeys();

    // STEP 2: Datenbank-Tabellen erstellen
    let dbStatus = {
      push_subscriptions: false,
      notification_settings: false,
      initial_settings: false
    };

    try {
      // push_subscriptions Tabelle
      await sql`
        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id SERIAL PRIMARY KEY,
          endpoint TEXT UNIQUE NOT NULL,
          keys JSONB NOT NULL,
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_notification_at TIMESTAMP
        )
      `;
      dbStatus.push_subscriptions = true;

      // notification_settings Tabelle
      await sql`
        CREATE TABLE IF NOT EXISTS notification_settings (
          id SERIAL PRIMARY KEY,
          push_enabled BOOLEAN DEFAULT false,
          email_enabled BOOLEAN DEFAULT false,
          email_address VARCHAR(255),
          temp_critical_low DECIMAL DEFAULT 18,
          temp_critical_high DECIMAL DEFAULT 30,
          humidity_critical_low DECIMAL DEFAULT 40,
          humidity_critical_high DECIMAL DEFAULT 90,
          notification_cooldown_minutes INTEGER DEFAULT 60,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      dbStatus.notification_settings = true;

      // Initial Settings
      const result = await sql`SELECT COUNT(*) as count FROM notification_settings`;
      if (result.rows[0].count === '0') {
        await sql`
          INSERT INTO notification_settings (push_enabled, email_enabled)
          VALUES (false, false)
        `;
        dbStatus.initial_settings = true;
      } else {
        dbStatus.initial_settings = true; // Already exists
      }

    } catch (dbError) {
      console.error('Database setup error:', dbError);
    }

    // HTML Response mit Keys zum Kopieren
    return new Response(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <title>FlitzHQ Push Notifications Setup</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 900px;
            margin: 50px auto;
            padding: 20px;
            background: #0f172a;
            color: #e2e8f0;
          }
          .container {
            background: #1e293b;
            border-radius: 12px;
            padding: 30px;
            border: 1px solid #334155;
          }
          h1 { color: #10b981; margin-top: 0; }
          h2 { color: #60a5fa; margin-top: 30px; }
          .key-box {
            background: #0f172a;
            border: 2px solid #334155;
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 12px;
            word-break: break-all;
            cursor: pointer;
            transition: border-color 0.2s;
          }
          .key-box:hover {
            border-color: #10b981;
          }
          .key-label {
            color: #94a3b8;
            font-size: 11px;
            text-transform: uppercase;
            margin-bottom: 8px;
            font-weight: 600;
          }
          .key-value {
            color: #10b981;
            user-select: all;
          }
          .status {
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 10px 0;
            padding: 10px;
            background: #0f172a;
            border-radius: 6px;
          }
          .status-icon {
            font-size: 20px;
          }
          .success { color: #10b981; }
          .error { color: #ef4444; }
          .instructions {
            background: #334155;
            padding: 20px;
            border-radius: 8px;
            margin-top: 30px;
          }
          .instructions ol {
            margin: 15px 0;
            padding-left: 25px;
          }
          .instructions li {
            margin: 10px 0;
            line-height: 1.6;
          }
          .copy-btn {
            background: #10b981;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            margin-top: 10px;
          }
          .copy-btn:hover {
            background: #059669;
          }
          code {
            background: #0f172a;
            padding: 2px 6px;
            border-radius: 4px;
            color: #10b981;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔔 FlitzHQ Push Notifications Setup</h1>

          <h2>📊 Setup Status</h2>
          <div class="status">
            <span class="status-icon">✅</span>
            <span class="success">VAPID Keys generiert</span>
          </div>
          <div class="status">
            <span class="status-icon">${dbStatus.push_subscriptions ? '✅' : '❌'}</span>
            <span class="${dbStatus.push_subscriptions ? 'success' : 'error'}">
              Tabelle: push_subscriptions ${dbStatus.push_subscriptions ? 'erstellt' : 'Fehler'}
            </span>
          </div>
          <div class="status">
            <span class="status-icon">${dbStatus.notification_settings ? '✅' : '❌'}</span>
            <span class="${dbStatus.notification_settings ? 'success' : 'error'}">
              Tabelle: notification_settings ${dbStatus.notification_settings ? 'erstellt' : 'Fehler'}
            </span>
          </div>
          <div class="status">
            <span class="status-icon">${dbStatus.initial_settings ? '✅' : '❌'}</span>
            <span class="${dbStatus.initial_settings ? 'success' : 'error'}">
              Initial Settings ${dbStatus.initial_settings ? 'erstellt' : 'Fehler'}
            </span>
          </div>

          <h2>🔑 Environment Variables</h2>
          <p>Kopiere diese beiden Variables in Vercel Dashboard → Settings → Environment Variables:</p>

          <div class="key-box" onclick="copyToClipboard('public-key')">
            <div class="key-label">NEXT_PUBLIC_VAPID_PUBLIC_KEY</div>
            <div class="key-value" id="public-key">${vapidKeys.publicKey}</div>
            <button class="copy-btn" onclick="event.stopPropagation(); copyToClipboard('public-key')">
              Kopieren
            </button>
          </div>

          <div class="key-box" onclick="copyToClipboard('private-key')">
            <div class="key-label">VAPID_PRIVATE_KEY</div>
            <div class="key-value" id="private-key">${vapidKeys.privateKey}</div>
            <button class="copy-btn" onclick="event.stopPropagation(); copyToClipboard('private-key')">
              Kopieren
            </button>
          </div>

          <div class="instructions">
            <h3>📝 Nächste Schritte:</h3>
            <ol>
              <li>
                Öffne <strong>Vercel Dashboard</strong> → Dein Projekt →
                <strong>Settings</strong> → <strong>Environment Variables</strong>
              </li>
              <li>
                Füge <code>NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> hinzu (Public Key von oben kopieren)
              </li>
              <li>
                Füge <code>VAPID_PRIVATE_KEY</code> hinzu (Private Key von oben kopieren)
              </li>
              <li>
                Beide für <strong>Production</strong>, <strong>Preview</strong> und
                <strong>Development</strong> setzen
              </li>
              <li>
                <strong>Redeploy auslösen</strong> (Deployments → ... → Redeploy)
              </li>
              <li>
                Nach Deploy: FlitzHQ öffnen → Settings → Benachrichtigungen →
                <strong>Push aktivieren</strong>
              </li>
            </ol>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #334155;">
            <a href="/" style="color: #10b981; text-decoration: none;">
              ← Zurück zum Dashboard
            </a>
          </div>
        </div>

        <script>
          function copyToClipboard(elementId) {
            const element = document.getElementById(elementId);
            const text = element.textContent;
            navigator.clipboard.writeText(text).then(() => {
              const btn = element.parentElement.querySelector('.copy-btn');
              const originalText = btn.textContent;
              btn.textContent = '✓ Kopiert!';
              setTimeout(() => {
                btn.textContent = originalText;
              }, 2000);
            });
          }
        </script>
      </body>
      </html>
      `,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );

  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({
      error: 'Setup failed',
      message: error.message
    }, { status: 500 });
  }
}
