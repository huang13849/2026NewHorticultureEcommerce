'use client';

import { useEffect } from 'react';

const SEO_API = process.env.NEXT_PUBLIC_SEO_API_URL || (process.env.NEXT_PUBLIC_REGION === "global" ? "" : "http://100.76.15.64:3011");

export default function SeoTracker() {
  useEffect(() => {
    const send = () => {
      if (!SEO_API) return;
      try {
        const payload = JSON.stringify({
          host: window.location.hostname,
          origin: window.location.origin,
          path: window.location.pathname + window.location.search,
          referrer: document.referrer,
          title: document.title,
          lang: navigator.language,
          screen: `${window.screen.width}x${window.screen.height}`,
        });
        const url = `${SEO_API}/api/track`;
        if (navigator.sendBeacon) {
          navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
        } else {
          fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
        }
      } catch { /* ignore */ }
    };
    send();
    const onPop = () => setTimeout(send, 0);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return null;
}
