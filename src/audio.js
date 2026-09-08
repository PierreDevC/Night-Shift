/* Original synthesized sound. No external recordings or network requests. */
window.NightAudio = class {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.volume = 0.55;
    this.nodes = [];
    this.steps = 0;
  }
  start() {
    if (this.ctx) {
      this.ctx.resume();
      return;
    }
    const A = window.AudioContext || window.webkitAudioContext;
    if (!A) return;
    this.ctx = new A();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
    this.noiseBuffer = this.ctx.createBuffer(
      1,
      this.ctx.sampleRate * 3,
      this.ctx.sampleRate,
    );
    const d = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.rain = this.noiseLoop(1400, 0.028, "lowpass");
    this.hum = this.oscLoop(60, 0.013);
    this.highHum = this.oscLoop(120, 0.004);
  }
  setVolume(v) {
    this.volume = v;
    if (this.master)
      this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
  }
  oscLoop(freq, vol) {
    const o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g);
    g.connect(this.master);
    o.start();
    this.nodes.push(o);
    return g;
  }
  noiseLoop(freq, vol, type) {
    const s = this.ctx.createBufferSource(),
      f = this.ctx.createBiquadFilter(),
      g = this.ctx.createGain();
    s.buffer = this.noiseBuffer;
    s.loop = true;
    f.type = type;
    f.frequency.value = freq;
    g.gain.value = vol;
    s.connect(f);
    f.connect(g);
    g.connect(this.master);
    s.start();
    this.nodes.push(s);
    return g;
  }
  tone(freq, duration = 0.1, volume = 0.06, type = "sine", end) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime,
      o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (end) o.frequency.exponentialRampToValueAtTime(end, t + duration);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + duration + 0.03);
  }
  noise(duration = 0.15, volume = 0.08, freq = 1200, type = "lowpass") {
    if (!this.ctx) return;
    const t = this.ctx.currentTime,
      s = this.ctx.createBufferSource(),
      f = this.ctx.createBiquadFilter(),
      g = this.ctx.createGain();
    s.buffer = this.noiseBuffer;
    f.type = type;
    f.frequency.value = freq;
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    s.connect(f);
    f.connect(g);
    g.connect(this.master);
    s.start();
    s.stop(t + duration + 0.02);
  }
  play(name) {
    switch (name) {
      case "scan":
        this.tone(1500, 0.11, 0.04);
        break;
      case "cash":
        this.noise(0.2, 0.07, 3200);
        this.tone(2400, 0.35, 0.025);
        break;
      case "bell":
        this.tone(1109, 0.6, 0.045);
        setTimeout(() => this.tone(880, 0.8, 0.035), 140);
        break;
      case "door":
        this.noise(0.7, 0.022, 500);
        break;
      case "paper":
        this.noise(0.6, 0.055, 2300);
        this.tone(140, 0.4, 0.009, "sawtooth");
        break;
      case "glass":
        this.noise(1.1, 0.32, 4800, "highpass");
        this.tone(2200, 0.5, 0.025, "square", 300);
        break;
      case "hit":
        this.noise(0.45, 0.26, 450);
        this.tone(65, 0.6, 0.19, "sine", 24);
        break;
      case "scare":
        this.tone(49, 2, 0.14, "sawtooth", 37);
        this.tone(52, 2, 0.11, "sawtooth", 41);
        this.noise(1.5, 0.14, 750);
        break;
      case "phone":
        this.tone(650, 0.14, 0.05, "square");
        setTimeout(() => this.tone(800, 0.2, 0.035, "square"), 200);
        break;
      case "alarm":
        for (let i = 0; i < 7; i++)
          setTimeout(
            () => this.tone(i % 2 ? 740 : 980, 0.27, 0.08, "triangle"),
            i * 280,
          );
        break;
      case "switch":
        this.noise(0.08, 0.05, 1800);
        break;
      case "knock":
        this.noise(0.1, 0.14, 160);
        break;
      case "step":
        this.noise(0.09, 0.026, 180 + Math.random() * 140);
        break;
      case "gravel":
        this.noise(0.2, 0.045, 2200);
        break;
    }
  }
  update(inside, power, danger) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.rain.gain.setTargetAtTime(inside ? 0.011 : 0.047, t, 0.8);
    this.hum.gain.setTargetAtTime(inside && power ? 0.014 : 0.002, t, 0.4);
    this.highHum.gain.setTargetAtTime(danger ? 0.016 : 0.003, t, 0.4);
  }
  engine(on) {
    if (!this.ctx) return;
    if (!this.motor) {
      this.motor = this.oscLoop(44, 0);
    }
    this.motor.gain.setTargetAtTime(on ? 0.018 : 0, this.ctx.currentTime, 0.4);
  }
  pause(p) {
    if (this.ctx) {
      if (p) this.ctx.suspend();
      else this.ctx.resume();
    }
  }
};
