export function useAds() {
  const showInterstitial = () => {
    // TODO: integrate Google AdSense/AdMob interstitial
  };

  const showRewarded = (onReward: () => void) => {
    // TODO: integrate rewarded ad
    onReward();
  };

  return { showInterstitial, showRewarded };
}
