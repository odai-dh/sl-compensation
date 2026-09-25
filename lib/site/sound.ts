"use client";

/**
 * Procedural sound design with the Web Audio API – no audio files. Everything is quiet on purpose.
 * Created lazily after the user turns sound on (browsers require a gesture).
 */
export class SoundEngine {
  private ctx: AudioContext;
  private master: GainNode;
  private rainGain: GainNode;
  private humGain: GainNode;

  constructor() {
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);

    // Rain: filtered noise.
    const noise = this.noiseSource(4);
    noise.loop = true;
    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = "bandpass";
    rainFilter.frequency.value = 2400;
    rainFilter.Q.value = 0.4;
    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0.05;
    noise.connect(rainFilter).connect(this.rainGain).connect(this.master);
    noise.start();

    // Train hum: two detuned low saws through a lowpass.
    const hum = this.ctx.createBiquadFilter();
    hum.type = "lowpass";
    hum.frequency.value = 180;
    this.humGain = this.ctx.createGain();
    this.humGain.gain.value = 0;
    for (const f of [52, 78.5]) {
      const osc = this.ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = f;
      osc.connect(hum);
      osc.start();
    }
    hum.connect(this.humGain).connect(this.master);
  }

  private noiseSource(seconds: number) {
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * seconds, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    return src;
  }

  setEnabled(on: boolean) {
    if (on && this.ctx.state === "suspended") void this.ctx.resume();
    this.master.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.4);
  }

  /** 0..1 rain intensity and train speed (0 = stopped). */
  setAmbience(rain: number, trainSpeed: number) {
    const t = this.ctx.currentTime;
    this.rainGain.gain.setTargetAtTime(0.02 + rain * 0.06, t, 0.5);
    this.humGain.gain.setTargetAtTime(trainSpeed * 0.035, t, 0.6);
  }

  brakeSqueal() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(3100, t);
    osc.frequency.linearRampToValueAtTime(2500, t + 1.4);
    const vibrato = this.ctx.createOscillator();
    vibrato.frequency.value = 14;
    const vibratoGain = this.ctx.createGain();
    vibratoGain.gain.value = 40;
    vibrato.connect(vibratoGain).connect(osc.frequency);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.012, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    osc.connect(g).connect(this.master);
    osc.start(t);
    vibrato.start(t);
    osc.stop(t + 1.7);
    vibrato.stop(t + 1.7);
  }

  taxiDoor() {
    const t = this.ctx.currentTime;
    const src = this.noiseSource(0.3);
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 500;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
    const thump = this.ctx.createOscillator();
    thump.frequency.setValueAtTime(110, t);
    thump.frequency.exponentialRampToValueAtTime(45, t + 0.15);
    const tg = this.ctx.createGain();
    tg.gain.setValueAtTime(0.18, t);
    tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    thump.connect(tg).connect(this.master);
    thump.start(t);
    thump.stop(t + 0.25);
  }

  chime() {
    const t = this.ctx.currentTime;
    [880, 1318.5, 1760].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const g = this.ctx.createGain();
      const start = t + i * 0.09;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.05, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 1.2);
      osc.connect(g).connect(this.master);
      osc.start(start);
      osc.stop(start + 1.3);
    });
  }
}
