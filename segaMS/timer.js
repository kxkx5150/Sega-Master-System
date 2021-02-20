class TIMER {
  constructor(cb) {
    this.fps = 50;
    this.speed = 1;
    this.speedCount = 0;

    this.frameCount = 0;
    this.fpsInterval;
    this.startTime;
    this.now;
    this.then;
    this.elapsed;
    this.BREAK = false;
    this.cb = cb;
  }

  setSpeed(vol) {
    this.speed = vol;
    this.speedCount = vol;
  }
  startAnimating(fps) {
    this.fpsInterval = 1000 / fps;
    this.then = Date.now();
    this.startTime = this.then;
    this.animate();
  }
  setAnimateFPS(fps) {
    this.fps = fps;
    this.fpsInterval = 1000 / fps;
  }
  animate() {
    this.timerId = requestAnimationFrame(() => {
      this.animate();
    });
    this.now = Date.now();
    this.elapsed = this.now - this.then;
    if (this.elapsed > this.fpsInterval) {
      this.then = this.now - (this.elapsed % this.fpsInterval);
      var sinceStart = this.now - this.startTime;
      var fps = Math.round((1000 / (sinceStart / ++this.frameCount)) * 100) / 100;
      if(this.cb)this.cb();
      // console.log(fps);
      // if (this.BREAK) cancelAnimationFrame(this.timerId);
    }
  }
  setFPS(val) {
    val -= 0;
    switch (val) {
      case 1:
      case 2:
      case 3:
      case 4:
        this.setSpeed(1);
        this.setAnimateFPS(val * 15);
        break;
      case 5:
      case 6:
      case 7:
        this.setSpeed(val - 3);
        this.setAnimateFPS(60);
        break;
      default:
        break;
    }
  }
}
