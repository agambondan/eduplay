import { useState, useCallback } from 'react';

export function useAds() {
  const [isInterstitialOpen, setIsInterstitialOpen] = useState(false);
  const [isRewardedOpen, setIsRewardedOpen] = useState(false);
  const [rewardCallback, setRewardCallback] = useState<(() => void) | null>(null);
  const [rewardText, setRewardText] = useState<string>('Reward');

  const showInterstitial = useCallback(() => {
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
