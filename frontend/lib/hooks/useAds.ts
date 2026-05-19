import { useState, useCallback } from 'react';

export function useAds() {
  const [isInterstitialOpen, setIsInterstitialOpen] = useState(false);
  const [isRewardedOpen, setIsRewardedOpen] = useState(false);
  const [rewardCallback, setRewardCallback] = useState<(() => void) | null>(null);
  const [rewardText, setRewardText] = useState<string>('Reward');

  const showInterstitial = useCallback(() => {
    // 3-minute frequency cap (180000 ms)
    const lastShown = localStorage.getItem('last_ad_shown');
    const now = Date.now();
    if (lastShown && now - parseInt(lastShown, 10) < 180000) {
      console.log('Skipping ad: frequency cap (3 min)');
      return;
    }

    localStorage.setItem('last_ad_shown', now.toString());
    setIsInterstitialOpen(true);
  }, []);

  const closeInterstitial = useCallback(() => {
    setIsInterstitialOpen(false);
  }, []);

  const showRewarded = useCallback((text: string, onReward: () => void) => {
    setRewardText(text);
    setRewardCallback(() => onReward);
    setIsRewardedOpen(true);
  }, []);

  const closeRewarded = useCallback(() => {
    setIsRewardedOpen(false);
    setRewardCallback(null);
  }, []);

  const handleReward = useCallback(() => {
    if (rewardCallback) {
      rewardCallback();
    }
  }, [rewardCallback]);

  return {
    isInterstitialOpen,
    showInterstitial,
    closeInterstitial,
    isRewardedOpen,
    showRewarded,
    closeRewarded,
    handleReward,
    rewardText,
  };
}
