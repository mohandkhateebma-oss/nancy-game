class SoundEffects {
  private ctx: AudioContext | null = null;
  public muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private tone(freq: number, duration: number, type: OscillatorType = 'sine', gainVal = 0.06, delay = 0) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainVal, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  step() {
    this.tone(420, 0.065, 'triangle', 0.045);
  }

  blocked() {
    this.tone(140, 0.14, 'sawtooth', 0.055);
    this.tone(110, 0.12, 'triangle', 0.04, 0.05);
  }

  crystal() {
    this.tone(660, 0.1, 'sine', 0.065);
    this.tone(880, 0.16, 'sine', 0.065, 0.07);
  }

  hit() {
    this.tone(240, 0.15, 'sawtooth', 0.07);
    this.tone(150, 0.24, 'sawtooth', 0.07, 0.1);
  }

  win() {
    this.tone(523.25, 0.12, 'triangle', 0.065, 0);
    this.tone(659.25, 0.12, 'triangle', 0.065, 0.09);
    this.tone(783.99, 0.16, 'triangle', 0.07, 0.18);
    this.tone(1046.5, 0.28, 'sine', 0.075, 0.27);
  }

  gameOver() {
    this.tone(300, 0.18, 'sawtooth', 0.06, 0);
    this.tone(220, 0.2, 'sawtooth', 0.06, 0.15);
    this.tone(140, 0.34, 'triangle', 0.065, 0.32);
  }
}

export const sfx = new SoundEffects();
