'use client';
/**
 * AdSlot — the one place AdSense markup lives. Renders nothing until a
 * client ID and matching slot ID are configured via env vars.
 */
import { useEffect } from 'react';
import { ADSENSE_CLIENT_ID, ADSENSE_SLOTS } from './config';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type AdVariant = 'sidebarLeft' | 'sidebarRight' | 'inFeed';

const VARIANT_CLASS: Record<AdVariant, string> = {
  sidebarLeft: 'ad-sidebar ad-sidebar--left',
  sidebarRight: 'ad-sidebar ad-sidebar--right',
  inFeed: 'ad-infeed',
};

export function AdSlot({ variant }: { variant: AdVariant }) {
  const slot = ADSENSE_SLOTS[variant];
  const enabled = Boolean(ADSENSE_CLIENT_ID && slot);

  useEffect(() => {
    if (!enabled) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense script not loaded yet or blocked — fail silently
    }
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className={VARIANT_CLASS[variant]} aria-label="Advertisement">
      {variant === 'inFeed' ? (
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={ADSENSE_CLIENT_ID}
          data-ad-slot={slot}
          data-ad-format="fluid"
          data-ad-layout-key="-gw-3+1f-3d+2z"
        />
      ) : (
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={ADSENSE_CLIENT_ID}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      )}
    </div>
  );
}
