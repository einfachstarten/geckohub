import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import { Analytics } from '@vercel/analytics/next';
import ServiceWorkerRegister from "../components/ServiceWorkerRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "FlitzHQ - Smart Home Dashboard",
  description: "Temperature, Humidity & Device Control",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FlitzHQ"
  },
  formatDetection: {
    telephone: false
  },
  openGraph: {
    type: "website",
    siteName: "FlitzHQ",
    title: "FlitzHQ - Smart Home Dashboard",
    description: "Temperature, Humidity & Device Control"
  },
  icons: {
    icon: [
      { url: "/icons/android-launchericon-192-192.png", sizes: "192x192", type: "image/png", rel: "icon" },
      { url: "/icons/android-launchericon-512-512.png", sizes: "512x512", type: "image/png", rel: "icon" },
      { url: "/icons/android-launchericon-192-192.png", sizes: "192x192", type: "image/png", rel: "icon", purpose: "maskable" },
      { url: "/icons/android-launchericon-512-512.png", sizes: "512x512", type: "image/png", rel: "icon", purpose: "maskable" }
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ]
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes"
        />
        <meta name="theme-color" content="#10b981" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link
          rel="icon"
          type="image/png"
          sizes="192x192"
          href="/icons/android-launchericon-192-192.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="512x512"
          href="/icons/android-launchericon-512-512.png"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#e2e8f0',
              border: '1px solid #475569',
              padding: '16px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '500',
              boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.5)'
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#1e293b',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#1e293b',
              },
            },
          }}
        />
        <ServiceWorkerRegister />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
