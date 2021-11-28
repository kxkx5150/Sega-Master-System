'use strict';
const segams = new SEGAMS("output");
document.getElementById("fileInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  var fileReader = new FileReader();
  fileReader.onload = (e) => {
    segams.loadRom(e.target.result);
  };
  fileReader.readAsBinaryString(file);
});
window.addEventListener(
  "resize",
  (e) => {
    resizeCanvas();
  },
  true
);
window.addEventListener(
  "keydown",
  (e) => {
    checkKeyMap(e);
  },
  true
);
window.addEventListener(
  "keyup",
  (e) => {
    checkKeyMap(e, true);
  },
  true
);
const ctrlMap = {
  arrowright: segams.INPUT.RIGHT,
  arrowleft: segams.INPUT.LEFT,
  arrowdown: segams.INPUT.DOWN,
  arrowup: segams.INPUT.UP,
  x: segams.INPUT.B,
  z: segams.INPUT.A,
  s: segams.INPUT.B,
  a: segams.INPUT.A,
};
const checkKeyMap = (e, up) => {
  if (ctrlMap[e.key.toLowerCase()] !== undefined) {
    if (up) {
      segams.keyUp(1, ctrlMap[e.key.toLowerCase()]);
    } else {
      segams.keyDown(1, ctrlMap[e.key.toLowerCase()]);
    }
    e.preventDefault();
  }
};
const resizeCanvas = () => {
  setTimeout(() => {
    let canvas = document.getElementById("output");
    const wh = window.innerHeight;
    const ww = window.innerWidth;
    const nw = 256;
    const nh = 192;
    const waspct = ww / wh;
    const naspct = nw / nh;

    if (waspct > naspct) {
      var val = wh / nh;
    } else {
      var val = ww / nw;
    }
    let ctrldiv = document.querySelector(".ctrl_div");
    canvas.style.height = 192 * val - ctrldiv.offsetHeight - 18 + "px";
    canvas.style.width = 256 * val - 24 + "px";
  }, 1200);
};
document.getElementById("setteings").addEventListener("click", (e) => {
  showSetting();
});
document.getElementById("settingdiv").addEventListener("click", (e) => {
  hideSetting();
});
document.getElementById("gamepad_button_container").addEventListener(
  "click",
  (e) => {
    e.stopPropagation();
    e.preventDefault();
  },
  true
);
function hideSetting() {
  let elem = document.getElementById("settingdiv");
  if (elem.style.display == "block") {
    elem.style.left = "-500px";
    setTimeout(function () {
      elem.style.display = "none";
    }, 400);
  }
}
function showSetting() {
  document.getElementById("settingdiv").style.display = "block";
  setTimeout(function () {
    document.getElementById("settingdiv").style.left = 0;
  }, 10);
}
resizeCanvas();
