class RAM {
  constructor() {
    this.ram = new Uint8Array(0x2000);
    this.cartridgeRam = new Uint8Array(0x8000);
    this.ramSelectRegister = 0;
  }
  readbyte(address) {
    address = address | 0;
    var page = (address >>> 14) & 3;
    address &= 0x3fff;
    switch (page) {
      case 0:
        if (address < 0x0400) {
          return romBanks[0][address];
        }
        return romBanks[pages[0]][address];
      case 1:
        return romBanks[pages[1]][address];
      case 2:
        switch (this.ramSelectRegister & 12) {
          default:
            break;
          case 8:
            return this.cartridgeRam[address];
          case 12:
            return this.cartridgeRam[address + 0x4000];
        }
        return romBanks[pages[2]][address];
      case 3:
        return this.ram[address & 0x1fff];
    }
  }
  writebyte(address, value) {
    address = address | 0;
    value = value | 0;
    if (address >= 0xfffc) {
      switch (address) {
        case 0xfffc:
          this.ramSelectRegister = value;
          break;
        case 0xfffd:
          value &= romPageMask;
          pages[0] = value;
          break;
        case 0xfffe:
          value &= romPageMask;
          pages[1] = value;
          break;
        case 0xffff:
          value &= romPageMask;
          pages[2] = value;
          break;
        default:
          throw "zoiks";
      }
    }
    address -= 0xc000;
    if (address < 0) {
      return;
    }
    this.ram[address & 0x1fff] = value;
  }
  reset() {
    this.ram.fill(0);
    this.cartridgeRam.fill(0);
    this.ramSelectRegister = 0;
  }
}
