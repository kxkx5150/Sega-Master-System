class IO {
  constructor(){
    this.inputMode = 7;
    this.joystick = 0xffff;
  }
  readport(addr) {
    addr &= 0xff;
    switch (addr) {
      case 0x7e:
        return vdp_get_line();
      case 0x7f:
        return vdp_get_x();
      case 0xdc:
      case 0xc0:
        return this.joystick & 0xff;
      case 0xdd:
      case 0xc1:
        return (this.joystick >> 8) & 0xff;
      case 0xbe:
        return vdp_readbyte();
      case 0xbd:
      case 0xbf:
        return vdp_readstatus();
      case 0xde:
        return 0xff;
      case 0xdf:
        return 0xff;
      case 0xf2:
        return 0;
      default:
        return 0xff;
    }
  }
  writeport(addr, val) {
    val = val | 0;
    addr &= 0xff;
    switch (addr) {
      case 0x3f:
        var natbit = (val >> 5) & 1;
        if ((val & 1) === 0) natbit = 1;
        this.joystick = (this.joystick & ~(1 << 14)) | (natbit << 14);
        natbit = (val >> 7) & 1;
        if ((val & 4) === 0) natbit = 1;
        this.joystick = (this.joystick & ~(1 << 15)) | (natbit << 15);
        break;
      case 0x7e:
      case 0x7f:
        soundChip.poke(val);
        break;
      case 0xbd:
      case 0xbf:
        vdp_writeaddr(val);
        break;
      case 0xbe:
        vdp_writebyte(val);
        break;
      case 0xde:
        this.inputMode = val;
        break;
      case 0xdf:
        break;
      case 0xf0:
      case 0xf1:
      case 0xf2:
        break;
      case 0x3e:
        break;
      default:
        break;
    }
  }
  reset(){
    this.inputMode = 7;
    this.joystick = 0xffff;
  }
}
