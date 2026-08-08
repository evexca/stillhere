import Script from 'next/script';
import { ADS_ENABLED, ADSENSE_CLIENT_ID } from './config';

export function AdSenseScript() {
  if (!ADS_ENABLED) return null;

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
