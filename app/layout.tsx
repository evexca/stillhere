import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SITE_CONFIG } from '@/config/site';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Navigation } from '@/components/layout/Navigation';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { AdSenseScript } from '@/components/ads/AdSenseScript';

export const metadata: Metadata = {
  title: {
    default: SITE_CONFIG.name,
    template: `%s — ${SITE_CONFIG.name}`,
  },
  description: SITE_CONFIG.socialDescription,
  metadataBase: new URL(SITE_CONFIG.appUrl),
  openGraph: {
    type: 'website',
    siteName: SITE_CONFIG.name,
    title: SITE_CONFIG.name,
    description: SITE_CONFIG.socialDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: '/favicon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8F7F5' },
    { media: '(prefers-color-scheme: dark)', color: '#0F0F11' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Inline theme script to prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  try {
    var pref = localStorage.getItem('_sh_theme');
    var h = parseInt('${SITE_CONFIG.nightModeStartHour}', 10);
    var e = parseInt('${SITE_CONFIG.nightModeEndHour}', 10);
    var hour = new Date().getHours();
    var isNight = hour >= h || hour < e;
    var theme = pref === 'dark' ? 'dark' : pref === 'light' ? 'light' : (isNight ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch(e) {}
})();
            `.trim(),
          }}
        />
        <AdSenseScript />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <Navigation />
            <main id="main-content">
              {children}
            </main>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
