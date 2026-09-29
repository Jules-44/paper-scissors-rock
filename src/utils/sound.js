// Lightweight Web Audio API synthesized sound effects
// 100% self-contained, no external audio files required.

class SoundEffects {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.15) {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Audio context might be restricted before user interaction
    }
  }

  // Button click / UI select
  click() {
    this.playTone(600, 'sine', 0.08, 0.08);
  }

  // Ready / Locked in move
  lockIn() {
    this.playTone(523.25, 'triangle', 0.12, 0.12); // C5
    setTimeout(() => this.playTone(659.25, 'triangle', 0.15, 0.15), 90); // E5
  }

  // Countdown beep (3, 2, 1)
  countdownTick(pitch = 440) {
    this.playTone(pitch, 'square', 0.1, 0.1);
  }

  // Showdown reveal / clash
  reveal() {
    this.playTone(220, 'sawtooth', 0.25, 0.15);
    setTimeout(() => this.playTone(440, 'triangle', 0.35, 0.2), 120);
  }

  // Point scored
  point() {
    this.playTone(440, 'sine', 0.12, 0.15);
    setTimeout(() => this.playTone(554.37, 'sine', 0.12, 0.18), 100);
    setTimeout(() => this.playTone(659.25, 'sine', 0.25, 0.2), 200);
  }

  // Tie / draw
  tie() {
    this.playTone(330, 'triangle', 0.2, 0.15);
    setTimeout(() => this.playTone(311.13, 'triangle', 0.3, 0.15), 150);
  }

  // Tournament / Match winner celebration fanfare
  fanfare() {
    if (this.muted) return;
    const notes = [
      { f: 523.25, d: 0.15, delay: 0 },
      { f: 659.25, d: 0.15, delay: 150 },
      { f: 783.99, d: 0.18, delay: 300 },
      { f: 1046.5, d: 0.5, delay: 480 },
    ];
    notes.forEach(n => {
      setTimeout(() => this.playTone(n.f, 'triangle', n.d, 0.25), n.delay);
    });
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
}

export const sound = new SoundEffects();
