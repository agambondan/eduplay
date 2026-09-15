export function playTone(
  soundEnabled: boolean,
  volume: number,
  configure: (ctx: AudioContext, osc: OscillatorNode, gain: GainNode, now: number) => void
) {
  if (!soundEnabled || volume <= 0) return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.onended = () => ctx.close();

    configure(ctx, osc, gain, ctx.currentTime);
  } catch {
    // AudioContext unavailable or restricted by browser policy
  }
}
