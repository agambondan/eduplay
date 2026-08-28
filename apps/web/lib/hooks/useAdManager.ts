'use client';

import { useCallback, useEffect, useState } from 'react';

declare global {
  interface Window {
    googletag: any;
  }
}

export type AdNetwork = 'direct' | 'adsense' | 'admanager';

interface AdSlotConfig {
  slot: string;
  sizes: number[][];
  network: AdNetwork;
}

const DEFAULT_SLOTS: Record<string, AdSlotConfig> = {
  banner: {
    slot: 'banner',
    sizes: [
      [728, 90],
      [320, 50],
    ],
    network: 'direct',
  },
  interstitial: { slot: 'interstitial', sizes: [[300, 250]], network: 'direct' },
  rewarded: { slot: 'rewarded', sizes: [[300, 250]], network: 'direct' },
};

export function useAdManager() {
  const [gptLoaded, setGptLoaded] = useState(false);
  const [networkOrder, setNetworkOrder] = useState<AdNetwork[]>(['direct', 'admanager', 'adsense']);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cfg = localStorage.getItem('ad_network_order');
    if (cfg) {
      try {
        setNetworkOrder(JSON.parse(cfg));
      } catch {}
    }
  }, []);

  const loadGPT = useCallback(() => {
    if (gptLoaded || typeof window === 'undefined') return;
    if ((window as any).googletag?.apiReady) {
      setGptLoaded(true);
      return;
    }

    const g = (window as any).googletag || {};
    (window as any).googletag = g;
    g.cmd = g.cmd || [];

    const script = document.createElement('script');
    script.src = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js';
    script.async = true;
    script.onload = () => setGptLoaded(true);
    document.head.appendChild(script);
  }, [gptLoaded]);

  return {
    loadGPT,
    gptLoaded,
    networkOrder,
    setNetworkOrder: (order: AdNetwork[]) => {
      setNetworkOrder(order);
      localStorage.setItem('ad_network_order', JSON.stringify(order));
    },
  };
}
