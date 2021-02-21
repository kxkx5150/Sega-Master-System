class SOUND {
  constructor(core) {
    this.core = core;
    var sampleDecrement = 3546893.0 / 16.0 / this.core.sampleRate;
    var samplesPerCycle = this.core.sampleRate / this.core.cpuHz;
    var register = [0, 0, 0, 0];
    this.registers = register;
    var counter = [0, 0, 0, 0];
    var outputBit = [false, false, false, false];
    this.volume = [0, 0, 0, 0];
    var generators = [null, null, null, null];
    var lfsr = 0;
    var shiftLfsr = shiftLfsrWhiteNoise;
    var enabled = true;
    var cyclesPending = 0;
    var residual = 0;
    var position = 0;
    var maxBufferSize = 4096;
    var buffer = new Float64Array(maxBufferSize);
    var latchedChannel = 0;
    var volumeTable = [];
    var f = 1.0;
    var i;
    for (i = 0; i < 16; ++i) {
      volumeTable[i] = f / generators.length;
      f *= Math.pow(10, -0.1);
    }
    volumeTable[15] = 0;
    this.toneChannel = (channel, out, offset, length) => {
      var i;
      var reg = register[channel],
        vol = this.volume[channel];
      if (reg <= 1) {
        for (i = 0; i < length; ++i) {
          out[i + offset] += vol;
        }
        return;
      }
      for (i = 0; i < length; ++i) {
        counter[channel] -= sampleDecrement;
        if (counter[channel] < 0) {
          counter[channel] += reg;
          outputBit[channel] = !outputBit[channel];
        }
        out[i + offset] += outputBit[channel] ? vol : -vol;
      }
    };
    this.noiseChannel = (channel, out, offset, length) => {
      var add = addFor(channel),
        vol = this.volume[channel];
      for (var i = 0; i < length; ++i) {
        counter[channel] -= sampleDecrement;
        if (counter[channel] < 0) {
          counter[channel] += add;
          outputBit[channel] = !outputBit[channel];
          if (outputBit[channel]) shiftLfsr();
        }
        out[i + offset] += lfsr & 1 ? vol : -vol;
      }
    };
    for (i = 0; i < 3; ++i) {
      generators[i] = this.toneChannel;
    }
    generators[3] = this.noiseChannel;

    function shiftLfsrWhiteNoise() {
      var bit = (lfsr & 1) ^ ((lfsr & (1 << 3)) >> 3);
      lfsr = (lfsr >> 1) | (bit << 15);
    }
    function shiftLfsrPeriodicNoise() {
      lfsr >>= 1;
      if (lfsr === 0) lfsr = 1 << 15;
    }
    function noisePoked() {
      shiftLfsr = register[3] & 4 ? shiftLfsrWhiteNoise : shiftLfsrPeriodicNoise;
      lfsr = 1 << 15;
    }
    function addFor(channel) {
      channel = channel | 0;
      switch (register[channel] & 3) {
        case 0:
          return 0x10;
        case 1:
          return 0x20;
        case 2:
          return 0x40;
        case 3:
          return register[channel - 1];
      }
    }

    function generate(out, offset, length) {
      offset = offset | 0;
      length = length | 0;
      var i;
      for (i = 0; i < length; ++i) {
        out[i + offset] = 0.0;
      }
      if (!enabled) return;
      for (i = 0; i < 4; ++i) {
        generators[i](i, out, offset, length);
      }
    }
    function catchUp() {
      if (cyclesPending) {
        advance(cyclesPending);
      }
      cyclesPending = 0;
    }
    function render(out, offset, length) {
      catchUp();
      var fromBuffer = position > length ? length : position;
      for (var i = 0; i < fromBuffer; ++i) {
        out[offset + i] = buffer[i];
      }
      offset += fromBuffer;
      length -= fromBuffer;
      for (i = fromBuffer; i < position; ++i) {
        buffer[i - fromBuffer] = buffer[i];
      }
      position -= fromBuffer;
      if (length !== 0) {
        generate(out, offset, length);
      }
    }
    function advance(time) {
      var num = time * samplesPerCycle + residual;
      var rounded = num | 0;
      residual = num - rounded;
      if (position + rounded >= maxBufferSize) {
        rounded = maxBufferSize - position;
      }
      if (rounded === 0) return;
      generate(buffer, position, rounded);
      position += rounded;
    }
    function poke(value) {
      catchUp();
      var latchData = !!(value & 0x80);
      if (latchData) latchedChannel = (value >> 5) & 3;
      if ((value & 0x90) === 0x90) {
        var newVolume = value & 0x0f;
        this.volume[latchedChannel] = volumeTable[newVolume];
      } else {
        if (latchedChannel === 3) {
          register[latchedChannel] = value & 0x0f;
          noisePoked();
        } else if (latchData) {
          register[latchedChannel] = (register[latchedChannel] & ~0x0f) | (value & 0x0f);
        } else {
          register[latchedChannel] = (register[latchedChannel] & 0x0f) | ((value & 0x3f) << 4);
        }
      }
    }

    this.polltime = function (cycles) {
      cyclesPending += cycles;
    };
    this.render = render;
    this.poke = poke;
    this.reset = function () {
      for (var i = 0; i < 3; ++i) {
        counter[i] = this.volume[i] = register[i] = 0;
      }
      noisePoked();
      advance(100000);
      cyclesPending = 0;
    };
    this.enable = function (e) {
      enabled = e;
    };
    this.mute = function () {
      enabled = false;
    };
    this.unmute = function () {
      enabled = true;
    };
  }
}
