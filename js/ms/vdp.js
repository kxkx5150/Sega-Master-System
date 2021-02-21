class VDP {
  constructor(core) {
    this.core = core;
    this.vram = new Uint8Array(0x4000);
    this.vramUntwiddled = new Uint8Array(0x8000);
    this.vdp_regs = new Uint8Array(16);
    this.palette = new Uint8Array(32);
    this.paletteR = new Uint8Array(32);
    this.paletteG = new Uint8Array(32);
    this.paletteB = new Uint8Array(32);
    this.paletteRGB = new Uint32Array(32);
    this.currentFrame = 1;
    this.vdp_addr_state = 0;
    this.vdp_mode_select = 0;
    this.vdp_addr_latch = 0;
    this.vdp_addr = 0;
    this.vdp_current_line = 0;
    this.vdp_status = 0;
    this.vdp_pending_hblank = false;
    this.vdp_hblank_counter = 0;
    this.prev_border = null;
    this.borderColourCss = null;
  }
  vdp_writeaddr(val) {
    if (this.vdp_addr_state === 0) {
      this.vdp_addr_state = 1;
      this.vdp_addr_latch = val;
    } else {
      this.vdp_addr_state = 0;
      switch (val >>> 6) {
        case 0:
        case 1:
          this.vdp_mode_select = 0;
          this.vdp_addr = this.vdp_addr_latch | ((val & 0x3f) << 8);
          break;
        case 2:
          var regnum = val & 0xf;
          this.vdp_regs[regnum] = this.vdp_addr_latch;
          switch (regnum) {
            case 7:
              this.update_border();
              break;
          }
          break;
        case 3:
          this.vdp_mode_select = 1;
          this.vdp_addr = this.vdp_addr_latch & 0x1f;
          break;
      }
    }
  }
  update_border() {
    var borderIndex = 16 + (this.vdp_regs[7] & 0xf);
    if (this.paletteRGB[borderIndex] === this.prev_border) return;
    this.prev_border = this.paletteRGB[borderIndex];
    this.borderColourCss =
      "rgb(" +
      this.paletteR[borderIndex] +
      "," +
      this.paletteG[borderIndex] +
      "," +
      this.paletteB[borderIndex] +
      ")";
  }
  vdp_writepalette(val) {
    let expandBits = (val) => {
      var v = val & 3;
      v |= v << 2;
      v |= v << 4;
      return v;
    };

    const r = expandBits(val);
    const g = expandBits(val >>> 2);
    const b = expandBits(val >>> 4);
    const pal_addr = this.vdp_addr & 0x1f;
    this.paletteR[pal_addr] = r;
    this.paletteG[pal_addr] = g;
    this.paletteB[pal_addr] = b;
    this.paletteRGB[pal_addr] = 0xff000000 | (b << 16) | (g << 8) | r;
    this.palette[pal_addr] = val;
    this.vdp_addr = (this.vdp_addr + 1) & 0x3fff;
    this.update_border();
  }
  vdp_writeram(val) {
    this.vram[this.vdp_addr] = val;
    var planarBase = this.vdp_addr & 0x3ffc;
    var twiddledBase = planarBase * 2;
    var val0 = this.vram[planarBase];
    var val1 = this.vram[planarBase + 1];
    var val2 = this.vram[planarBase + 2];
    var val3 = this.vram[planarBase + 3];
    for (var i = 0; i < 8; ++i) {
      var effectiveBit = 7 - i;
      var index =
        ((val0 >>> effectiveBit) & 1) |
        (((val1 >>> effectiveBit) & 1) << 1) |
        (((val2 >>> effectiveBit) & 1) << 2) |
        (((val3 >>> effectiveBit) & 1) << 3);
      this.vramUntwiddled[twiddledBase + i] = index;
    }
    this.vdp_addr = (this.vdp_addr + 1) & 0x3fff;
  }
  vdp_writebyte(val) {
    this.vdp_addr_state = 0;
    if (this.vdp_mode_select === 0) {
      this.vdp_writeram(val);
    } else {
      this.vdp_writepalette(val);
    }
  }
  vdp_readram() {
    let res = this.vram[this.vdp_addr];
    this.vdp_addr = (this.vdp_addr + 1) & 0x3fff;
    return res;
  }

  vdp_readpalette() {
    let res = this.palette[this.vdp_addr & 0x1f];
    this.vdp_addr = (this.vdp_addr + 1) & 0x3fff;
    return res;
  }
  vdp_readbyte() {
    this.vdp_addr_state = 0;
    if (this.vdp_mode_select === 0) {
      return this.vdp_readram();
    } else {
      return this.vdp_readpalette();
    }
  }
  vdp_readstatus() {
    let res = this.vdp_status;
    this.vdp_status &= 0x1f;
    this.vdp_pending_hblank = false;
    this.core.cpu.z80_set_irq(false);
    this.vdp_addr_state = 0;
    return res;
  }
  findSprites(line) {
    var spriteInfo = (this.vdp_regs[5] & 0x7e) << 7;
    var active = [];
    var spriteHeight = 8;
    var i;
    if (this.vdp_regs[1] & 2) {
      spriteHeight = 16;
    }
    for (i = 0; i < 64; i++) {
      var y = this.vram[spriteInfo + i];
      if (y === 208) {
        break;
      }
      if (y >= 240) y -= 256;
      if (line >= y && line < y + spriteHeight) {
        if (active.length === 8) {
          this.vdp_status |= 0x40;
          break;
        }
        active.push([this.vram[spriteInfo + 128 + i * 2], this.vram[spriteInfo + 128 + i * 2 + 1], y]);
      }
    }
    return active;
  }
  rasterize_background(lineAddr, pixelOffset, tileData, tileDef, transparent) {
    lineAddr = lineAddr | 0;
    pixelOffset = pixelOffset | 0;
    tileData = tileData | 0;
    tileDef = (tileDef | 0) * 2;
    var i, tileDefInc;
    if (tileData & (1 << 9)) {
      tileDefInc = -1;
      tileDef += 7;
    } else {
      tileDefInc = 1;
    }
    const paletteOffset = tileData & (1 << 11) ? 16 : 0;
    var index;
    if (transparent && paletteOffset === 0) {
      for (i = 0; i < 8; i++) {
        index = this.vramUntwiddled[tileDef];
        tileDef += tileDefInc;
        if (index !== 0) this.core.fb32[lineAddr + pixelOffset] = this.paletteRGB[index];
        pixelOffset = (pixelOffset + 1) & 255;
      }
    } else {
      index = this.vramUntwiddled[tileDef] + paletteOffset;
      tileDef += tileDefInc;
      this.core.fb32[lineAddr + pixelOffset] = this.paletteRGB[index];
      pixelOffset = (pixelOffset + 1) & 255;

      index = this.vramUntwiddled[tileDef] + paletteOffset;
      tileDef += tileDefInc;
      this.core.fb32[lineAddr + pixelOffset] = this.paletteRGB[index];
      pixelOffset = (pixelOffset + 1) & 255;

      index = this.vramUntwiddled[tileDef] + paletteOffset;
      tileDef += tileDefInc;
      this.core.fb32[lineAddr + pixelOffset] = this.paletteRGB[index];
      pixelOffset = (pixelOffset + 1) & 255;

      index = this.vramUntwiddled[tileDef] + paletteOffset;
      tileDef += tileDefInc;
      this.core.fb32[lineAddr + pixelOffset] = this.paletteRGB[index];
      pixelOffset = (pixelOffset + 1) & 255;

      index = this.vramUntwiddled[tileDef] + paletteOffset;
      tileDef += tileDefInc;
      this.core.fb32[lineAddr + pixelOffset] = this.paletteRGB[index];
      pixelOffset = (pixelOffset + 1) & 255;

      index = this.vramUntwiddled[tileDef] + paletteOffset;
      tileDef += tileDefInc;
      this.core.fb32[lineAddr + pixelOffset] = this.paletteRGB[index];
      pixelOffset = (pixelOffset + 1) & 255;

      index = this.vramUntwiddled[tileDef] + paletteOffset;
      tileDef += tileDefInc;
      this.core.fb32[lineAddr + pixelOffset] = this.paletteRGB[index];
      pixelOffset = (pixelOffset + 1) & 255;

      index = this.vramUntwiddled[tileDef] + paletteOffset;
      this.core.fb32[lineAddr + pixelOffset] = this.paletteRGB[index];
    }
  }
  clear_background(lineAddr, pixelOffset) {
    lineAddr = lineAddr | 0;
    pixelOffset = pixelOffset | 0;
    var i;
    const rgb = this.paletteRGB[0];
    for (i = 0; i < 8; ++i) {
      this.core.fb32[lineAddr + pixelOffset] = rgb;
      pixelOffset = (pixelOffset + 1) & 255;
    }
  }

  rasterize_background_line(lineAddr, pixelOffset, nameAddr, yMod) {
    lineAddr = lineAddr | 0;
    pixelOffset = pixelOffset | 0;
    nameAddr = nameAddr | 0;
    const yOffset = (yMod | 0) * 4;
    for (var i = 0; i < 32; i++) {
      var tileData = this.vram[nameAddr + i * 2] | (this.vram[nameAddr + i * 2 + 1] << 8);
      var tileNum = tileData & 511;
      var tileDef = 32 * tileNum;
      if (tileData & (1 << 10)) {
        tileDef += 28 - yOffset;
      } else {
        tileDef += yOffset;
      }
      if ((tileData & (1 << 12)) === 0) {
        this.rasterize_background(lineAddr, pixelOffset, tileData, tileDef, false);
      } else {
        this.clear_background(lineAddr, pixelOffset);
      }
      pixelOffset = (pixelOffset + 8) & 255;
    }
  }
  rasterize_foreground_line(lineAddr, pixelOffset, nameAddr, yMod) {
    lineAddr = lineAddr | 0;
    pixelOffset = pixelOffset | 0;
    nameAddr = nameAddr | 0;
    const yOffset = (yMod | 0) * 4;
    for (var i = 0; i < 32; i++) {
      var tileData = this.vram[nameAddr + i * 2] | (this.vram[nameAddr + i * 2 + 1] << 8);
      if ((tileData & (1 << 12)) === 0) continue;
      var tileNum = tileData & 511;
      var tileDef = 32 * tileNum;
      if (tileData & (1 << 10)) {
        tileDef += 28 - yOffset;
      } else {
        tileDef += yOffset;
      }
      this.rasterize_background(lineAddr, (i * 8 + pixelOffset) & 0xff, tileData, tileDef, true);
    }
  }
  rasterize_sprites(line, lineAddr, pixelOffset, sprites) {
    lineAddr = lineAddr | 0;
    pixelOffset = pixelOffset | 0;
    const spriteBase = this.vdp_regs[6] & 4 ? 0x2000 : 0;

    for (var i = 0; i < 256; ++i) {
      var xPos = i;
      var spriteFoundThisX = false;
      var writtenTo = false;
      var minDistToNext = 256;
      for (var k = 0; k < sprites.length; k++) {
        var sprite = sprites[k];
        var offset = xPos - sprite[0];

        if (offset < 0) {
          var distToSprite = -offset;

          if (distToSprite < minDistToNext) minDistToNext = distToSprite;
          continue;
        }
        if (offset >= 8) continue;
        spriteFoundThisX = true;
        var spriteLine = line - sprite[2];
        var spriteAddr = spriteBase + sprite[1] * 32 + spriteLine * 4;
        var untwiddledAddr = spriteAddr * 2 + offset;
        var index = this.vramUntwiddled[untwiddledAddr];
        if (index === 0) {
          continue;
        }
        if (writtenTo) {
          this.vdp_status |= 0x20;
          break;
        }
        this.core.fb32[lineAddr + ((pixelOffset + i - this.vdp_regs[8]) & 0xff)] = this.paletteRGB[
          16 + index
        ];
        writtenTo = true;
      }
      if (!spriteFoundThisX && minDistToNext > 1) {
        i += minDistToNext - 1;
      }
    }
  }
  border_clear(lineAddr, count) {
    lineAddr = lineAddr | 0;
    count = count | 0;
    const borderIndex = 16 + (this.vdp_regs[7] & 0xf);
    const borderRGB = this.paletteRGB[borderIndex];
    for (var i = 0; i < count; i++) this.core.fb32[lineAddr + i] = borderRGB;
  }
  rasterize_line(line) {
    line = line | 0;
    const lineAddr = (line * 256) | 0;
    if ((this.vdp_regs[1] & 64) === 0) {
      this.border_clear(lineAddr, 256);
      return;
    }

    var effectiveLine = line + this.vdp_regs[9];
    if (effectiveLine >= 224) {
      effectiveLine -= 224;
    }
    const sprites = this.findSprites(line);
    const pixelOffset = this.vdp_regs[0] & 64 && line < 16 ? 0 : this.vdp_regs[8];
    const nameAddr = ((this.vdp_regs[2] << 10) & 0x3800) + (effectiveLine >>> 3) * 64;
    const yMod = effectiveLine & 7;

    this.rasterize_background_line(lineAddr, pixelOffset, nameAddr, yMod);
    if (sprites.length) this.rasterize_sprites(line, lineAddr, pixelOffset, sprites);
    this.rasterize_foreground_line(lineAddr, pixelOffset, nameAddr, yMod);

    if (this.vdp_regs[0] & (1 << 5)) {
      this.border_clear(lineAddr, 8);
    }
  }
  vdp_hblank() {
    const firstDisplayLine = 3 + 13 + 54;
    const pastEndDisplayLine = firstDisplayLine + 192;
    const endOfFrame = pastEndDisplayLine + 48 + 3;
    if (this.vdp_current_line === firstDisplayLine) this.vdp_hblank_counter = this.vdp_regs[10];
    if (this.vdp_current_line >= firstDisplayLine && this.vdp_current_line < pastEndDisplayLine) {
      this.rasterize_line(this.vdp_current_line - firstDisplayLine);
      if (--this.vdp_hblank_counter < 0) {
        this.vdp_hblank_counter = this.vdp_regs[10];
        this.vdp_pending_hblank = true;
      }
    }
    this.vdp_current_line++;
    var needIrq = 0;
    if (this.vdp_current_line === endOfFrame) {
      this.vdp_current_line = 0;
      this.vdp_status |= 128;
      needIrq |= 4;
      this.currentFrame++;
      if (this.borderColourCss) {
        this.core.canvas.style.borderColor = this.borderColourCss;
        this.borderColourCss = null;
      }
    }
    if (this.vdp_regs[1] & 32 && this.vdp_status & 128) {
      needIrq |= 2;
    }
    if (this.vdp_regs[0] & 16 && this.vdp_pending_hblank) {
      needIrq |= 1;
    }
    return needIrq;
  }
  vdp_init() {
    this.vdp_reset();
  }
  vdp_reset() {
    for (var i = 0x0000; i < 0x4000; i++) {
      this.vram[i] = 0;
    }
    for (i = 0; i < 32; i++) {
      this.paletteR[i] = this.paletteG[i] = this.paletteB[i] = this.paletteRGB[i] = this.palette[i] = 0;
    }
    for (i = 0; i < 16; i++) {
      this.vdp_regs[i] = 0;
    }
    for (i = 2; i <= 5; i++) {
      this.vdp_regs[i] = 0xff;
    }
    this.vdp_regs[6] = 0xfb;
    this.vdp_regs[10] = 0xff;
    this.vdp_current_line = this.vdp_status = this.vdp_hblank_counter = 0;
    this.vdp_mode_select = 0;
  }
  vdp_get_line() {
    return (this.vdp_current_line - 64) & 0xff;
  }
  vdp_get_x() {
    return 0;
  }
}
