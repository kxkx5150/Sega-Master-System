class ROM{
  constructor(){
    this.romBanks = [];
    this.pages =  new Uint8Array(3);
    this.romPageMask = 0;
  }
  load(rom){
    var numRomBanks = rom.length / 0x4000;
    for (var i = 0; i < numRomBanks; i++) {
      this.romBanks[i] = new Uint8Array(0x4000);
      for (var j = 0; j < 0x4000; j++) {
        this.romBanks[i][j] = rom.charCodeAt(i * 0x4000 + j);
      }
    }
    for (var i = 0; i < 3; i++) {
      this.pages[i] = i % numRomBanks;
    }
    this.romPageMask = (numRomBanks - 1) | 0;
  }
  reset(){
    this.romBanks = [];
    this.pages.fill(0)
    this.romPageMask = 0;
  }
}