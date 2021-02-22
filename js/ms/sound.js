'use strict';
class SOUND {
  constructor(core) {
    this.core = core;
    this.enabled = true;
    this.sampleDecrement = 3546893.0 / 16.0 / this.core.sampleRate;
    this.samplesPerCycle = this.core.sampleRate / this.core.cpuHz;
    this.buffer = new Float64Array(this.maxBufferSize);
    this.maxBufferSize = 4096;
    this.cyclesPending = 0;
    this.residual = 0;
    this.position = 0;
    this.lfsr = 0;
    this.latchedChannel = 0;
    this.register = [0, 0, 0, 0];
    this.counter = [0, 0, 0, 0];
    this.outputBit = [false, false, false, false];
    this.volume = [0, 0, 0, 0];
    this.generators = [null, null, null, null];
    this.volumeTable = [];
    this.init();
  }
  init() {
    var f = 1.0;
    for (var i = 0; i < 16; ++i) {
      this.volumeTable[i] = f / this.generators.length;
      f *= Math.pow(10, -0.1);
    }
    this.volumeTable[15] = 0;

    for (var i = 0; i < 3; ++i) {
      this.generators[i] = this.toneChannel.bind(this);
    }
    this.generators[3] = this.noiseChannel.bind(this);
    this.shiftLfsr = this.shiftLfsrWhiteNoise.bind(this);
  }
  reset() {
    for (var i = 0; i < 3; ++i) {
      this.counter[i] = this.volume[i] = this.register[i] = 0;
    }
    this.buffer = new Float64Array(this.maxBufferSize);
    this.cyclesPending = 0;
    this.residual = 0;
    this.position = 0;
    this.lfsr = 0;
    this.latchedChannel = 0;
    this.register = [0, 0, 0, 0];
    this.counter = [0, 0, 0, 0];
    this.outputBit = [false, false, false, false];
    this.volume = [0, 0, 0, 0];
    this.generators = [null, null, null, null];
    this.volumeTable = [];
    this.init();
  }
  addFor(channel) {
    channel = channel | 0;
    switch (this.register[channel] & 3) {
      case 0:
        return 0x10;
      case 1:
        return 0x20;
      case 2:
        return 0x40;
      case 3:
        return this.register[channel - 1];
    }
  }
  advance(time) {
    var num = time * this.samplesPerCycle + this.residual;
    var rounded = num | 0;
    this.residual = num - rounded;
    if (this.position + rounded >= this.maxBufferSize) {
      rounded = this.maxBufferSize - this.position;
    }
    if (rounded === 0) return;
    this.generate(this.buffer, this.position, rounded);
    this.position += rounded;
  }
  catchUp() {
    if (this.cyclesPending) {
      this.advance(this.cyclesPending);
    }
    this.cyclesPending = 0;
  }
  render(out, offset, length) {
    this.catchUp();
    var fromBuffer = this.position > length ? length : this.position;
    for (var i = 0; i < fromBuffer; ++i) {
      out[offset + i] = this.buffer[i];
    }
    offset += fromBuffer;
    length -= fromBuffer;
    for (var i = fromBuffer; i < this.position; ++i) {
      this.buffer[i - fromBuffer] = this.buffer[i];
    }
    this.position -= fromBuffer;
    if (length !== 0) {
      this.generate(out, offset, length);
    }
  }
  generate(out, offset, length) {
    offset = offset | 0;
    length = length | 0;
    for (var i = 0; i < length; ++i) {
      out[i + offset] = 0.0;
    }
    if (!this.enabled) return;
    for (var i = 0; i < 4; ++i) {
      this.generators[i](i, out, offset, length);
    }
  }
  shiftLfsrPeriodicNoise() {
    this.lfsr >>= 1;
    if (this.lfsr === 0) this.lfsr = 1 << 15;
  }
  noisePoked() {
    this.shiftLfsr =
      this.register[3] & 4
        ? this.shiftLfsrWhiteNoise.bind(this)
        : this.shiftLfsrPeriodicNoise.bind(this);
    this.lfsr = 1 << 15;
  }
  poke(value) {
    this.catchUp();
    var latchData = !!(value & 0x80);
    if (latchData) this.latchedChannel = (value >> 5) & 3;
    if ((value & 0x90) === 0x90) {
      var newVolume = value & 0x0f;
      this.volume[this.latchedChannel] = this.volumeTable[newVolume];
    } else {
      if (this.latchedChannel === 3) {
        this.register[this.latchedChannel] = value & 0x0f;
        this.noisePoked();
      } else if (latchData) {
        this.register[this.latchedChannel] =
          (this.register[this.latchedChannel] & ~0x0f) | (value & 0x0f);
      } else {
        this.register[this.latchedChannel] =
          (this.register[this.latchedChannel] & 0x0f) | ((value & 0x3f) << 4);
      }
    }
  }
  shiftLfsrWhiteNoise() {
    var bit = (this.lfsr & 1) ^ ((this.lfsr & (1 << 3)) >> 3);
    this.lfsr = (this.lfsr >> 1) | (bit << 15);
  }
  toneChannel(channel, out, offset, length) {
    var reg = this.register[channel],
      vol = this.volume[channel];
    if (reg <= 1) {
      for (var i = 0; i < length; ++i) {
        out[i + offset] += vol;
      }
      return;
    }
    for (var i = 0; i < length; ++i) {
      this.counter[channel] -= this.sampleDecrement;
      if (this.counter[channel] < 0) {
        this.counter[channel] += reg;
        this.outputBit[channel] = !this.outputBit[channel];
      }
      out[i + offset] += this.outputBit[channel] ? vol : -vol;
    }
  }
  noiseChannel(channel, out, offset, length) {
    var add = this.addFor(channel),
      vol = this.volume[channel];
    for (var i = 0; i < length; ++i) {
      this.counter[channel] -= this.sampleDecrement;
      if (this.counter[channel] < 0) {
        this.counter[channel] += add;
        this.outputBit[channel] = !this.outputBit[channel];
        if (this.outputBit[channel]) this.shiftLfsr();
      }
      out[i + offset] += this.lfsr & 1 ? vol : -vol;
    }
  }
  polltime(cycles) {
    this.cyclesPending += cycles;
  }
  enable(e) {
    this.enabled = e;
  }
  mute() {
    this.enabled = false;
  }
  unmute() {
    this.enabled = true;
  }
}
