class SEGAMS {
  constructor(canvas_id) {
    this.canvas = document.getElementById(canvas_id);
    this.ctx = this.canvas.getContext("2d");
    this.imageData = this.ctx.getImageData(0, 0, 256, 192);
    this.fb32 = new Uint32Array(this.imageData.data.buffer);
    this.actx = new AudioContext();
    this.fps = 60;
    this.cpuHz = 3.58 * 1000 * 1000;
    this.sampleRate = this.actx.sampleRate;
    this.tstatesPerHblank = Math.ceil(this.cpuHz / (313 * this.fps)) | 0;
    this.targetTimeout = 1000 / this.fps;
    this.tstates = 0;
    this.event_next_event;
    this.lastFrame = null;
    this.timerID1 = null;
    this.timerID2 = null;
    this.info = {
      cpu:true,
      mem:false,
    }

    this.io = new IO(this);
    this.mem = new RAM(this);
    this.rom = new ROM(this);
    this.sound =  new SOUND(this);
    this.cpu = new CPU(this,this.mem)
  }
  init() {
    this.cpu.z80_init();
    vdp_init();
    this.audio_init();
    this.reset();
  }
  loadRom(bin) {
    this.init();
    this.rom.load(bin);
    this.audio_enable(true);
    this.run();
  }
  run() {
    var now = Date.now();
    var atimeout = this.targetTimeout;
    if (this.lastFrame) {
      var timeSinceLast = now - this.lastFrame;
      if (timeSinceLast < 2 * this.targetTimeout) {
        var diff = timeSinceLast - this.targetTimeout;
        atimeout -= 0.1 * diff;
      }
    }
    this.lastFrame = now;
    this.timerID1 = setTimeout(() => {
      this.run();
    }, atimeout);

    var runner = () => {
      for (var i = 0; i < 20; ++i) {
        if (this.line()) return;
      }
      this.timerID2 = setTimeout(() => {
        runner();
      }, atimeout);
    };
    runner();
  }
  line() {
    this.event_next_event = this.tstatesPerHblank;
    this.tstates -= this.tstatesPerHblank;

    let cb = this.sound.polltime.bind(this)
    this.cpu.z80_do_opcodes(cb);
    var vdp_status = vdp_hblank();
    var irq = vdp_status & 3;
    this.cpu.z80_set_irq(irq);
    if (vdp_status & 4) {
      this.ctx.putImageData(this.imageData, 0, 0);
      return true;
    }
    return false;
  }
  reset() {
    clearTimeout(this.timerID1);
    clearTimeout(this.timerID2);
    this.tstates = 0;
    this.lastFrame = null;

    vdp_reset();
    this.audio_reset();
    this.cpu.z80_reset();
    this.io.reset();
    this.mem.reset();
    this.rom.reset();
  }
  audio_init() {
    var sp = this.actx.createScriptProcessor(1024, 0, 1);
    sp.addEventListener("audioprocess", this.pumpAudio.bind(this));
    sp.connect(this.actx.destination, 0, 0);
  }
  pumpAudio(e) {
    var chan = e.outputBuffer.getChannelData(0);
    this.sound.render(chan, 0, chan.length);
  }
  audio_enable(enable) {
    this.sound.enable(enable);
    if (this.actx) this.actx.resume();
  }
  audio_reset() {
    this.sound.reset();
  }
}
