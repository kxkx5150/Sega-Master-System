var tstates = 0;
var event_next_event;
var canvas = document.getElementById("output");
var ctx = canvas.getContext("2d");
var imageData = ctx.getImageData(0, 0, 256, 192);
var fb32 = new Uint32Array(imageData.data.buffer);
var actx = new AudioContext();

const fps = 60;
const cpuHz = 3.58 * 1000 * 1000;
const tstatesPerHblank = Math.ceil(cpuHz / 313 * fps) | 0;
const targetTimeout = 1000 / fps;
var lastFrame = null;

const mem = new RAM();
const io = new IO();
const timer = new TIMER();
const soundChip = audio_init();

var romBanks = [];
var pages =  new Uint8Array(3);
var romPageMask = 0;


function miracle_init() {
  z80_init();
  vdp_init();
  miracle_reset();
}
function loadRom(rom) {
  miracle_init();
  var numRomBanks = rom.length / 0x4000;
  for (var i = 0; i < numRomBanks; i++) {
    romBanks[i] = new Uint8Array(0x4000);
    for (var j = 0; j < 0x4000; j++) {
      romBanks[i][j] = rom.charCodeAt(i * 0x4000 + j);
    }
  }
  for (var i = 0; i < 3; i++) {
    pages[i] = i % numRomBanks;
  }
  romPageMask = (numRomBanks - 1) | 0;
  audio_enable(true);
  run();
}
function run() {
  var now = Date.now();
  var adjustedTimeout = targetTimeout;
  if (lastFrame) {
    var timeSinceLast = now - lastFrame;
    if (timeSinceLast < 2 * targetTimeout) {
      var diff = timeSinceLast - targetTimeout;
      adjustedTimeout -= 0.1 * diff;
    }
  }
  lastFrame = now;
  setTimeout(run, adjustedTimeout);
  var runner = function () {
    for (var i = 0; i < 20; ++i) {
      if (line()) return;
    }
    setTimeout(runner, 0);
  };
  runner();
}
function line() {
  event_next_event = tstatesPerHblank;
  tstates -= tstatesPerHblank;
  z80_do_opcodes(cycleCallback);
  var vdp_status = vdp_hblank();
  var irq = vdp_status & 3;
  z80_set_irq(irq);
  if (vdp_status & 4) {
    ctx.putImageData(imageData, 0, 0);
    return true;
  }
  return false;
}
function miracle_reset() {
  pages.fill(0)
  z80_reset();
  vdp_reset();
  audio_reset();
  io.reset();
  mem.reset();
}












function audio_init() {
  var jsAudioNode = actx.createScriptProcessor(1024, 0, 1);
  jsAudioNode.onaudioprocess = pumpAudio;
  jsAudioNode.connect(actx.destination, 0, 0);
  return new SoundChip(actx.sampleRate, cpuHz);
}
function cycleCallback(tstates) {
  soundChip.polltime(tstates);
}
function pumpAudio(event) {
  var outBuffer = event.outputBuffer;
  var chan = outBuffer.getChannelData(0);
  soundChip.render(chan, 0, chan.length);
}
function audio_enable(enable) {
  soundChip.enable(enable);
  if (actx) actx.resume();
}
function audio_reset() {
  soundChip.reset();
}
