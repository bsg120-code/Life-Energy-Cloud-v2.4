// Web Audio API Sound Effects, Silent Energy Carrier & Quantum Hum Engines

function createSilentWavDataUri(): string {
  // 1-second 8000Hz mono 8-bit PCM silent WAV encoded as base64
  const sampleRate = 8000;
  const numSamples = sampleRate;
  const buffer = new ArrayBuffer(44 + numSamples);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples, true);

  for (let i = 0; i < numSamples; i++) {
    view.setUint8(44 + i, 128);
  }

  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

class SoundEngine {
  private ctx: AudioContext | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playTap(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.06);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  playToggle(on: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    if (on) {
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
    } else {
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(330, now + 0.12);
    }
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  playUnlock(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const baseTime = ctx.currentTime;
    notes.forEach((freq, idx) => {
      const start = baseTime + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.14, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.15);
    });
  }

  playComplete(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const notes = [440, 554.37, 659.25, 880];
    const baseTime = ctx.currentTime;
    notes.forEach((freq, idx) => {
      const start = baseTime + idx * 0.15;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.16, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.42);
    });
  }
}

export const sounds = new SoundEngine();

export interface MediaSessionCallbacks {
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
}

class EnergyCarrierEngine {
  private ctx: AudioContext | null = null;
  private oscPrimary: OscillatorNode | null = null;
  private oscSecondary: OscillatorNode | null = null;
  private oscSchumann: OscillatorNode | null = null;
  private masterGain: GainNode | null = null;
  private silentAudioEl: HTMLAudioElement | null = null;
  private wakeLock: WakeLockSentinel | null = null;
  private isRunning = false;
  private currentSourceName = '';
  private callbacks: MediaSessionCallbacks | null = null;
  private deviceChangeBound = false;

  setCallbacks(callbacks: MediaSessionCallbacks) {
    this.callbacks = callbacks;
  }

  private setupAudioPipeline() {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    this.teardownOscillators();

    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0, this.ctx.currentTime); // Completely silent master gain
    masterGain.connect(this.ctx.destination);

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(528, this.ctx.currentTime);
    osc1.connect(masterGain);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(264, this.ctx.currentTime);
    osc2.connect(masterGain);

    const osc3 = this.ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(7.83, this.ctx.currentTime); // Schumann resonance LFO
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(12, this.ctx.currentTime);
    osc3.connect(lfoGain);
    lfoGain.connect(osc1.frequency);

    osc1.start();
    osc2.start();
    osc3.start();

    this.masterGain = masterGain;
    this.oscPrimary = osc1;
    this.oscSecondary = osc2;
    this.oscSchumann = osc3;
  }

  private teardownOscillators() {
    [this.oscPrimary, this.oscSecondary, this.oscSchumann].forEach((osc) => {
      if (osc) {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // ignore already stopped
        }
      }
    });
    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {
        // ignore
      }
    }
    this.oscPrimary = null;
    this.oscSecondary = null;
    this.oscSchumann = null;
    this.masterGain = null;
  }

  private startSilentHtmlAudio() {
    if (typeof document === 'undefined') return;
    if (!this.silentAudioEl) {
      const audio = new Audio(createSilentWavDataUri());
      audio.loop = true;
      audio.volume = 0.0001;
      audio.setAttribute('playsinline', 'true');
      this.silentAudioEl = audio;
    }
    this.silentAudioEl.play().catch(() => {});
  }

  private stopSilentHtmlAudio() {
    if (this.silentAudioEl) {
      this.silentAudioEl.pause();
      this.silentAudioEl.currentTime = 0;
    }
  }

  async acquireWakeLock() {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    try {
      if (!this.wakeLock || this.wakeLock.released) {
        this.wakeLock = await navigator.wakeLock.request('screen');
      }
    } catch {
      // WakeLock may fail on battery saver or restricted iframe
    }
  }

  private releaseWakeLock() {
    if (this.wakeLock) {
      this.wakeLock.release().catch(() => {});
      this.wakeLock = null;
    }
  }

  private updateMediaSession(sourceName: string) {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `Life Energy Cloud - ${sourceName} 수신 중`,
        artist: 'Life Energy Cloud v2.4',
        album: '528Hz Silent Quantum Carrier',
      });
      navigator.mediaSession.playbackState = 'playing';
      navigator.mediaSession.setActionHandler('play', () => {
        this.callbacks?.onPlay();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        this.callbacks?.onPause();
      });
      navigator.mediaSession.setActionHandler('stop', () => {
        this.callbacks?.onStop();
      });
    } catch {
      // MediaSession not supported in this context
    }
  }

  private clearMediaSession() {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.playbackState = 'paused';
    } catch {
      // ignore
    }
  }

  private bindDeviceChange() {
    if (this.deviceChangeBound) return;
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && 'ondevicechange' in navigator.mediaDevices) {
      navigator.mediaDevices.ondevicechange = () => {
        if (this.isRunning) {
          this.setupAudioPipeline();
          this.startSilentHtmlAudio();
        }
      };
      this.deviceChangeBound = true;
    }
  }

  start(sourceName: string) {
    this.isRunning = true;
    this.currentSourceName = sourceName;
    this.setupAudioPipeline();
    this.startSilentHtmlAudio();
    this.acquireWakeLock();
    this.updateMediaSession(sourceName);
    this.bindDeviceChange();
  }

  stop() {
    this.isRunning = false;
    this.currentSourceName = '';
    this.teardownOscillators();
    this.stopSilentHtmlAudio();
    this.releaseWakeLock();
    this.clearMediaSession();
  }

  resumeOnVisibility() {
    if (!this.isRunning) return;
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    } else if (!this.ctx) {
      this.setupAudioPipeline();
    }
    this.startSilentHtmlAudio();
    this.acquireWakeLock();
    if (this.currentSourceName) {
      this.updateMediaSession(this.currentSourceName);
    }
  }

  destroy() {
    this.stop();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.ondevicechange = null;
    }
    this.deviceChangeBound = false;
  }
}

export const energyCarrier = new EnergyCarrierEngine();

class QuantumHumEngine {
  private ctx: AudioContext | null = null;
  private oscSine: OscillatorNode | null = null;
  private oscTri: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private gain: GainNode | null = null;
  private active = false;

  start(freqHz: number, harmonics: number) {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    this.stopNodes();

    const now = this.ctx.currentTime;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450 + harmonics * 45, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.075, now + 0.18);

    const oscSine = this.ctx.createOscillator();
    oscSine.type = 'sine';
    const baseFreq = 140 + (freqHz - 2.4) * 18;
    oscSine.frequency.setValueAtTime(baseFreq, now);

    const oscTri = this.ctx.createOscillator();
    oscTri.type = 'triangle';
    oscTri.frequency.setValueAtTime(280 + (freqHz - 2.4) * 32 + harmonics * 12, now);

    const triGain = this.ctx.createGain();
    triGain.gain.setValueAtTime(0.35, now);

    oscSine.connect(filter);
    oscTri.connect(triGain);
    triGain.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    oscSine.start();
    oscTri.start();

    this.oscSine = oscSine;
    this.oscTri = oscTri;
    this.filter = filter;
    this.gain = gain;
    this.active = true;
  }

  updateParameters(freqHz: number, harmonics: number) {
    if (!this.active || !this.ctx || !this.oscSine || !this.oscTri || !this.filter) return;
    const now = this.ctx.currentTime;
    const baseFreq = 140 + (freqHz - 2.4) * 18;
    const triFreq = 280 + (freqHz - 2.4) * 32 + harmonics * 12;
    this.oscSine.frequency.setTargetAtTime(baseFreq, now, 0.05);
    this.oscTri.frequency.setTargetAtTime(triFreq, now, 0.05);
    this.filter.frequency.setTargetAtTime(450 + harmonics * 45, now, 0.05);
  }

  private stopNodes() {
    [this.oscSine, this.oscTri].forEach((osc) => {
      if (osc) {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // ignore
        }
      }
    });
    if (this.filter) {
      try {
        this.filter.disconnect();
      } catch {
        // ignore
      }
    }
    if (this.gain) {
      try {
        this.gain.disconnect();
      } catch {
        // ignore
      }
    }
    this.oscSine = null;
    this.oscTri = null;
    this.filter = null;
    this.gain = null;
  }

  stop() {
    this.active = false;
    this.stopNodes();
  }

  destroy() {
    this.stop();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
  }
}

export const quantumHum = new QuantumHumEngine();
