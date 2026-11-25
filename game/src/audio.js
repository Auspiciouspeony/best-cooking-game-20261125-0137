// Simmer & Serve — all sound is synthesised with WebAudio, no audio files.
// One clear job: short kitchen sounds (chop, sizzle, ding, buzz, pop) plus a
// quiet plucked loop, created lazily on the first user gesture.

/** Create the sound board. `ctx` is made on first play, so autoplay rules never bite. */
export function createAudio() {
  let ctx = null;
  let musicTimer = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  }

  /** A short oscillator blip. */
  function blip(freq, dur, type, gain, slideTo) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  /** Filtered noise burst, for chops and sizzles. */
  function noise(dur, filterFreq, gain, type = 'bandpass') {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    const t = ac.currentTime;
    const len = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const filter = ac.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = filterFreq;
    const g = ac.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(ac.destination);
    src.start(t);
  }

  // A gentle four-chord pluck loop, quiet enough to sit under the kitchen.
  const CHORDS = [
    [261.6, 329.6, 392.0],
    [220.0, 261.6, 329.6],
    [174.6, 220.0, 261.6],
    [196.0, 246.9, 293.7],
  ];
  let chordIndex = 0;

  function startMusic() {
    if (musicTimer !== null || muted) return;
    musicTimer = window.setInterval(() => {
      if (muted) return;
      const chord = CHORDS[chordIndex % CHORDS.length];
      chordIndex += 1;
      chord.forEach((freq, i) => {
        window.setTimeout(() => blip(freq, 0.5, 'triangle', 0.035), i * 90);
      });
    }, 620);
  }

  return {
    /** Call on the first gesture so the context is allowed to start. */
    unlock() {
      ensure();
    },
    chop() {
      noise(0.09, 900, 0.25);
      blip(180, 0.08, 'square', 0.08, 90);
    },
    pickup() {
      blip(520, 0.07, 'sine', 0.1, 760);
    },
    place() {
      blip(330, 0.08, 'sine', 0.1, 240);
    },
    sizzle() {
      noise(0.35, 5200, 0.05, 'highpass');
    },
    ding() {
      blip(880, 0.35, 'sine', 0.14);
      window.setTimeout(() => blip(1318, 0.4, 'sine', 0.1), 90);
    },
    bad() {
      blip(160, 0.22, 'sawtooth', 0.09, 110);
    },
    tick() {
      blip(1200, 0.05, 'square', 0.05);
    },
    toggleMute() {
      muted = !muted;
      if (muted && musicTimer !== null) {
        window.clearInterval(musicTimer);
        musicTimer = null;
      }
      return muted;
    },
    startMusic,
  };
}
