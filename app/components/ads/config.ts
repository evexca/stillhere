/**
 * AdSense configuration, read from NEXT_PUBLIC_ env vars so it's visible
 * in both server and client bundles. Publisher ID presence is the master
 * switch; each placement additionally checks its own slot ID.
 */

export const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? '';

export const ADSENSE_SLOTS = {
  sidebarLeft: process.env.NEXT_PUBLIC_ADSENSE_SIDEBAR_LEFT_SLOT ?? '',
  sidebarRight: process.env.NEXT_PUBLIC_ADSENSE_SIDEBAR_RIGHT_SLOT ?? '',
  inFeed: process.env.NEXT_PUBLIC_ADSENSE_INFEED_SLOT ?? '',
};

export const ADS_ENABLED = ADSENSE_CLIENT_ID.length > 0;
