function sign_extend(v) {
  return v < 128 ? v : v - 256;
}
function z80_defaults(ops) {
  for (var i = 0; i < 256; ++i) {
    if (!ops[i]) ops[i] = ops[256];
  }
}


function z80_ddfdcbxx(opcode, tempaddr) {
  z80_ddfdcb_ops[opcode](tempaddr);
}



const z80_base_ops = (key) => {
  switch (key) {
    case 0x00: {
      break;
    }
    case 0x01: {
      that.tstates += 6;
      z80.c = that.mem.readbyte(z80.pc++);
      z80.pc &= 0xffff;
      z80.b = that.mem.readbyte(z80.pc++);
      z80.pc &= 0xffff;
      break;
    }
    case 0x02: {
      that.tstates += 3;
      that.mem.writebyte(z80.c | (z80.b << 8), z80.a);
      break;
    }
    case 0x03: {
      that.tstates += 2;
      var wordtemp = ((z80.c | (z80.b << 8)) + 1) & 0xffff;
      z80.b = wordtemp >> 8;
      z80.c = wordtemp & 0xff;
      break;
    }
    case 0x04: {
      {
        z80.b = (z80.b + 1) & 0xff;
        z80.f =
          (z80.f & 0x01) | (z80.b == 0x80 ? 0x04 : 0) | (z80.b & 0x0f ? 0 : 0x10) | sz53_table[z80.b];
      }
      break;
    }
    case 0x05: {
      {
        z80.f = (z80.f & 0x01) | (z80.b & 0x0f ? 0 : 0x10) | 0x02;
        z80.b = (z80.b - 1) & 0xff;
        z80.f |= (z80.b == 0x7f ? 0x04 : 0) | sz53_table[z80.b];
      }
      break;
    }
    case 0x06: {
      that.tstates += 3;
      z80.b = that.mem.readbyte(z80.pc++);
      z80.pc &= 0xffff;
      break;
    }
    case 0x07: {
      z80.a = ((z80.a & 0x7f) << 1) | (z80.a >> 7);
      z80.f = (z80.f & (0x04 | 0x40 | 0x80)) | (z80.a & (0x01 | 0x08 | 0x20));
      break;
    }
    case 0x08: {
      {
        var olda = z80.a;
        var oldf = z80.f;
        z80.a = z80.a_;
        z80.f = z80.f_;
        z80.a_ = olda;
        z80.f_ = oldf;
      }
      break;
    }
    case 0x09: {
      {
        var add16temp = (z80.l | (z80.h << 8)) + (z80.c | (z80.b << 8));
        var lookup =
          (((z80.l | (z80.h << 8)) & 0x0800) >> 11) |
          (((z80.c | (z80.b << 8)) & 0x0800) >> 10) |
          ((add16temp & 0x0800) >> 9);
        that.tstates += 7;
        z80.h = (add16temp >> 8) & 0xff;
        z80.l = add16temp & 0xff;
        z80.f =
          (z80.f & (0x04 | 0x40 | 0x80)) |
          (add16temp & 0x10000 ? 0x01 : 0) |
          ((add16temp >> 8) & (0x08 | 0x20)) |
          halfcarry_add_table[lookup];
      }
      break;
    }
    case 0x0a: {
      that.tstates += 3;
      z80.a = that.mem.readbyte(z80.c | (z80.b << 8));
      break;
    }
    case 0x0b: {
      that.tstates += 2;
      var wordtemp = ((z80.c | (z80.b << 8)) - 1) & 0xffff;
      z80.b = wordtemp >> 8;
      z80.c = wordtemp & 0xff;
      break;
    }
    case 0x0c: {
      {
        z80.c = (z80.c + 1) & 0xff;
        z80.f =
          (z80.f & 0x01) | (z80.c == 0x80 ? 0x04 : 0) | (z80.c & 0x0f ? 0 : 0x10) | sz53_table[z80.c];
      }
      break;
    }
    case 0x0d: {
      {
        z80.f = (z80.f & 0x01) | (z80.c & 0x0f ? 0 : 0x10) | 0x02;
        z80.c = (z80.c - 1) & 0xff;
        z80.f |= (z80.c == 0x7f ? 0x04 : 0) | sz53_table[z80.c];
      }
      break;
    }
    case 0x0e: {
      that.tstates += 3;
      z80.c = that.mem.readbyte(z80.pc++);
      z80.pc &= 0xffff;
      break;
    }
    case 0x0f: {
      z80.f = (z80.f & (0x04 | 0x40 | 0x80)) | (z80.a & 0x01);
      z80.a = (z80.a >> 1) | ((z80.a & 0x01) << 7);
      z80.f |= z80.a & (0x08 | 0x20);
      break;
    }
    case 0x10: {
      that.tstates += 4;
      z80.b = (z80.b - 1) & 0xff;
      if (z80.b) {
        {
          that.tstates += 5;
          z80.pc += sign_extend(that.mem.readbyte(z80.pc));
          z80.pc &= 0xffff;
        }
      }
      z80.pc++;
      z80.pc &= 0xffff;
      break;
    }
    case 0x11: {
      that.tstates += 6;
      z80.e = that.mem.readbyte(z80.pc++);
      z80.pc &= 0xffff;
      z80.d = that.mem.readbyte(z80.pc++);
      z80.pc &= 0xffff;
      break;
    }
    case 0x12: {
      that.tstates += 3;
      that.mem.writebyte(z80.e | (z80.d << 8), z80.a);
      break;
    }
    case 0x13: {
      that.tstates += 2;
      var wordtemp = ((z80.e | (z80.d << 8)) + 1) & 0xffff;
      z80.d = wordtemp >> 8;
      z80.e = wordtemp & 0xff;
      break;
    }
    case 0x14: {
      {
        z80.d = (z80.d + 1) & 0xff;
        z80.f =
          (z80.f & 0x01) | (z80.d == 0x80 ? 0x04 : 0) | (z80.d & 0x0f ? 0 : 0x10) | sz53_table[z80.d];
      }
      break;
    }
    case 0x15: {
      {
        z80.f = (z80.f & 0x01) | (z80.d & 0x0f ? 0 : 0x10) | 0x02;
        z80.d = (z80.d - 1) & 0xff;
        z80.f |= (z80.d == 0x7f ? 0x04 : 0) | sz53_table[z80.d];
      }
      break;
    }
    case 0x16: {
      that.tstates += 3;
      z80.d = that.mem.readbyte(z80.pc++);
      z80.pc &= 0xffff;
      break;
    }
    case 0x17: {
      {
        var bytetemp = z80.a;
        z80.a = ((z80.a & 0x7f) << 1) | (z80.f & 0x01);
        z80.f = (z80.f & (0x04 | 0x40 | 0x80)) | (z80.a & (0x08 | 0x20)) | (bytetemp >> 7);
      }
      break;
    }
    case 0x18: {
      that.tstates += 3;
      {
        that.tstates += 5;
        z80.pc += sign_extend(that.mem.readbyte(z80.pc));
        z80.pc &= 0xffff;
      }
      z80.pc++;
      z80.pc &= 0xffff;
      break;
    }
    case 0x19: {
      {
        var add16temp = (z80.l | (z80.h << 8)) + (z80.e | (z80.d << 8));
        var lookup =
          (((z80.l | (z80.h << 8)) & 0x0800) >> 11) |
          (((z80.e | (z80.d << 8)) & 0x0800) >> 10) |
          ((add16temp & 0x0800) >> 9);
        that.tstates += 7;
        z80.h = (add16temp >> 8) & 0xff;
        z80.l = add16temp & 0xff;
        z80.f =
          (z80.f & (0x04 | 0x40 | 0x80)) |
          (add16temp & 0x10000 ? 0x01 : 0) |
          ((add16temp >> 8) & (0x08 | 0x20)) |
          halfcarry_add_table[lookup];
      }
      break;
    }
    case 0x1a: {
      that.tstates += 3;
      z80.a = that.mem.readbyte(z80.e | (z80.d << 8));
      break;
    }
    case 0x1b: {
      that.tstates += 2;
      var wordtemp = ((z80.e | (z80.d << 8)) - 1) & 0xffff;
      z80.d = wordtemp >> 8;
      z80.e = wordtemp & 0xff;
      break;
    }
    case 0x1c: {
      {
        z80.e = (z80.e + 1) & 0xff;
        z80.f =
          (z80.f & 0x01) | (z80.e == 0x80 ? 0x04 : 0) | (z80.e & 0x0f ? 0 : 0x10) | sz53_table[z80.e];
      }
      break;
    }
    case 0x1d: {
      {
        z80.f = (z80.f & 0x01) | (z80.e & 0x0f ? 0 : 0x10) | 0x02;
        z80.e = (z80.e - 1) & 0xff;
        z80.f |= (z80.e == 0x7f ? 0x04 : 0) | sz53_table[z80.e];
      }
      break;
    }
    case 0x1e: {
      that.tstates += 3;
      z80.e = that.mem.readbyte(z80.pc++);
      z80.pc &= 0xffff;
      break;
    }
    case 0x1f: {
      {
        var bytetemp = z80.a;
        z80.a = (z80.a >> 1) | ((z80.f & 0x01) << 7);
        z80.f = (z80.f & (0x04 | 0x40 | 0x80)) | (z80.a & (0x08 | 0x20)) | (bytetemp & 0x01);
      }
      break;
    }
    case 0x20: {
      that.tstates += 3;
      if (!(z80.f & 0x40)) {
        {
          that.tstates += 5;
          z80.pc += sign_extend(that.mem.readbyte(z80.pc));
          z80.pc &= 0xffff;
        }
      }
      z80.pc++;
      z80.pc &= 0xffff;
      break;
    }
    case 0x21: {
      that.tstates += 6;
      z80.l = that.mem.readbyte(z80.pc++);
      z80.pc &= 0xffff;
      z80.h = that.mem.readbyte(z80.pc++);
      z80.pc &= 0xffff;
      break;
    }
    case 0x22: {
      {
        var ldtemp;
        that.tstates += 12;
        ldtemp = that.mem.readbyte(z80.pc++);
        z80.pc &= 0xffff;
        ldtemp |= that.mem.readbyte(z80.pc++) << 8;
        z80.pc &= 0xffff;
        that.mem.writebyte(ldtemp++, z80.l);
        ldtemp &= 0xffff;
        that.mem.writebyte(ldtemp, z80.h);
      }
      break;
    }
    case 0x23: {
      that.tstates += 2;
      var wordtemp = ((z80.l | (z80.h << 8)) + 1) & 0xffff;
      z80.h = wordtemp >> 8;
      z80.l = wordtemp & 0xff;
      break;
    }
    case 0x24: {
      {
        z80.h = (z80.h + 1) & 0xff;
        z80.f =
          (z80.f & 0x01) | (z80.h == 0x80 ? 0x04 : 0) | (z80.h & 0x0f ? 0 : 0x10) | sz53_table[z80.h];
      }
      break;
    }
    case 0x25: {
      {
        z80.f = (z80.f & 0x01) | (z80.h & 0x0f ? 0 : 0x10) | 0x02;
        z80.h = (z80.h - 1) & 0xff;
        z80.f |= (z80.h == 0x7f ? 0x04 : 0) | sz53_table[z80.h];
      }
      break;
    }
    case 0x26: {
      that.tstates += 3;
      z80.h = that.mem.readbyte(z80.pc++);
      z80.pc &= 0xffff;
      break;
    }
    case 0x27: {
      {
        var add = 0,
          carry = z80.f & 0x01;
        if (z80.f & 0x10 || (z80.a & 0x0f) > 9) add = 6;
        if (carry || z80.a > 0x99) add |= 0x60;
        if (z80.a > 0x99) carry = 0x01;
        if (z80.f & 0x02) {
          {
            var subtemp = z80.a - add;
            var lookup = ((z80.a & 0x88) >> 3) | ((add & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
            z80.a = subtemp & 0xff;
            z80.f =
              (subtemp & 0x100 ? 0x01 : 0) |
              0x02 |
              halfcarry_sub_table[lookup & 0x07] |
              overflow_sub_table[lookup >> 4] |
              sz53_table[z80.a];
          }
        } else {
          {
            var addtemp = z80.a + add;
            var lookup = ((z80.a & 0x88) >> 3) | ((add & 0x88) >> 2) | ((addtemp & 0x88) >> 1);
            z80.a = addtemp & 0xff;
            z80.f =
              (addtemp & 0x100 ? 0x01 : 0) |
              halfcarry_add_table[lookup & 0x07] |
              overflow_add_table[lookup >> 4] |
              sz53_table[z80.a];
          }
        }
        z80.f = (z80.f & ~(0x01 | 0x04)) | carry | parity_table[z80.a];
      }
      break;
    }
    case 0x28: {
      that.tstates += 3;
      if (z80.f & 0x40) {
        {
          that.tstates += 5;
          z80.pc += sign_extend(that.mem.readbyte(z80.pc));
          z80.pc &= 0xffff;
        }
      }
      z80.pc++;
      z80.pc &= 0xffff;
      break;
    }
    case 0x29: {
      {
        var add16temp = (z80.l | (z80.h << 8)) + (z80.l | (z80.h << 8));
        var lookup =
          (((z80.l | (z80.h << 8)) & 0x0800) >> 11) |
          (((z80.l | (z80.h << 8)) & 0x0800) >> 10) |
          ((add16temp & 0x0800) >> 9);
        that.tstates += 7;
        z80.h = (add16temp >> 8) & 0xff;
        z80.l = add16temp & 0xff;
        z80.f =
          (z80.f & (0x04 | 0x40 | 0x80)) |
          (add16temp & 0x10000 ? 0x01 : 0) |
          ((add16temp >> 8) & (0x08 | 0x20)) |
          halfcarry_add_table[lookup];
      }
      break;
    }
    case 0x2a: {
      {
        var ldtemp;
        that.tstates += 12;
        ldtemp = that.mem.readbyte(z80.pc++);
        z80.pc &= 0xffff;
        ldtemp |= that.mem.readbyte(z80.pc++) << 8;
        z80.pc &= 0xffff;
        z80.l = that.mem.readbyte(ldtemp++);
        ldtemp &= 0xffff;
        z80.h = that.mem.readbyte(ldtemp);
      }
      break;
    }
    case 0x2b: {
      that.tstates += 2;
      var wordtemp = ((z80.l | (z80.h << 8)) - 1) & 0xffff;
      z80.h = wordtemp >> 8;
      z80.l = wordtemp & 0xff;
      break;
    }
    case 0x2c: {
      {
        z80.l = (z80.l + 1) & 0xff;
        z80.f =
          (z80.f & 0x01) | (z80.l == 0x80 ? 0x04 : 0) | (z80.l & 0x0f ? 0 : 0x10) | sz53_table[z80.l];
      }
      break;
    }
    case 0x2d: {
      {
        z80.f = (z80.f & 0x01) | (z80.l & 0x0f ? 0 : 0x10) | 0x02;
        z80.l = (z80.l - 1) & 0xff;
        z80.f |= (z80.l == 0x7f ? 0x04 : 0) | sz53_table[z80.l];
      }
      break;
    }
    case 0x2e: {
      that.tstates += 3;
      z80.l = that.mem.readbyte(z80.pc++);
      z80.pc &= 0xffff;
      break;
    }
    case 0x2f: {
      z80.a ^= 0xff;
      z80.f = (z80.f & (0x01 | 0x04 | 0x40 | 0x80)) | (z80.a & (0x08 | 0x20)) | (0x02 | 0x10);
      break;
    }
    case 0x30: {
      that.tstates += 3;
      if (!(z80.f & 0x01)) {
        {
          that.tstates += 5;
          z80.pc += sign_extend(that.mem.readbyte(z80.pc));
          z80.pc &= 0xffff;
        }
      }
      z80.pc++;
      z80.pc &= 0xffff;
      break;
    }
    case 0x31: {
      that.tstates += 6;
      var splow = that.mem.readbyte(z80.pc++);
      z80.pc &= 0xffff;
      var sphigh = that.mem.readbyte(z80.pc++);
      z80.sp = splow | (sphigh << 8);
      z80.pc &= 0xffff;
      break;
    }
    case 0x32: {
      that.tstates += 3;
      {
        var wordtemp = that.mem.readbyte(z80.pc++);
        z80.pc &= 0xffff;
        that.tstates += 6;
        wordtemp |= that.mem.readbyte(z80.pc++) << 8;
        z80.pc &= 0xffff;
        that.mem.writebyte(wordtemp, z80.a);
      }
      break;
    }
    case 0x33: {
      that.tstates += 2;
      z80.sp = (z80.sp + 1) & 0xffff;
      break;
    }
    case 0x34: {
      that.tstates += 7;
      {
        var bytetemp = that.mem.readbyte(z80.l | (z80.h << 8));
        {
          bytetemp = (bytetemp + 1) & 0xff;
          z80.f =
            (z80.f & 0x01) |
            (bytetemp == 0x80 ? 0x04 : 0) |
            (bytetemp & 0x0f ? 0 : 0x10) |
            sz53_table[bytetemp];
        }
        that.mem.writebyte(z80.l | (z80.h << 8), bytetemp);
      }
      break;
    }
    case 0x35: {
      that.tstates += 7;
      {
        var bytetemp = that.mem.readbyte(z80.l | (z80.h << 8));
        {
          z80.f = (z80.f & 0x01) | (bytetemp & 0x0f ? 0 : 0x10) | 0x02;
          bytetemp = (bytetemp - 1) & 0xff;
          z80.f |= (bytetemp == 0x7f ? 0x04 : 0) | sz53_table[bytetemp];
        }
        that.mem.writebyte(z80.l | (z80.h << 8), bytetemp);
      }
      break;
    }
    case 0x36: {
      that.tstates += 6;
      that.mem.writebyte(z80.l | (z80.h << 8), that.mem.readbyte(z80.pc++));
      z80.pc &= 0xffff;
      break;
    }
    case 0x37: {
      z80.f = (z80.f & (0x04 | 0x40 | 0x80)) | (z80.a & (0x08 | 0x20)) | 0x01;
      break;
    }
    case 0x38: {
      that.tstates += 3;
      if (z80.f & 0x01) {
        {
          that.tstates += 5;
          z80.pc += sign_extend(that.mem.readbyte(z80.pc));
          z80.pc &= 0xffff;
        }
      }
      z80.pc++;
      z80.pc &= 0xffff;
      break;
    }
    case 0x39: {
      {
        var add16temp = (z80.l | (z80.h << 8)) + z80.sp;
        var lookup =
          (((z80.l | (z80.h << 8)) & 0x0800) >> 11) |
          ((z80.sp & 0x0800) >> 10) |
          ((add16temp & 0x0800) >> 9);
        that.tstates += 7;
        z80.h = (add16temp >> 8) & 0xff;
        z80.l = add16temp & 0xff;
        z80.f =
          (z80.f & (0x04 | 0x40 | 0x80)) |
          (add16temp & 0x10000 ? 0x01 : 0) |
          ((add16temp >> 8) & (0x08 | 0x20)) |
          halfcarry_add_table[lookup];
      }
      break;
    }
    case 0x3a: {
      {
        var wordtemp;
        that.tstates += 9;
        wordtemp = that.mem.readbyte(z80.pc++);
        z80.pc &= 0xffff;
        wordtemp |= that.mem.readbyte(z80.pc++) << 8;
        z80.pc &= 0xffff;
        z80.a = that.mem.readbyte(wordtemp);
      }
      break;
    }
    case 0x3b: {
      that.tstates += 2;
      z80.sp = (z80.sp - 1) & 0xffff;
      break;
    }
    case 0x3c: {
      {
        z80.a = (z80.a + 1) & 0xff;
        z80.f =
          (z80.f & 0x01) | (z80.a == 0x80 ? 0x04 : 0) | (z80.a & 0x0f ? 0 : 0x10) | sz53_table[z80.a];
      }
      break;
    }
    case 0x3d: {
      {
        z80.f = (z80.f & 0x01) | (z80.a & 0x0f ? 0 : 0x10) | 0x02;
        z80.a = (z80.a - 1) & 0xff;
        z80.f |= (z80.a == 0x7f ? 0x04 : 0) | sz53_table[z80.a];
      }
      break;
    }
    case 0x3e: {
      that.tstates += 3;
      z80.a = that.mem.readbyte(z80.pc++);
      z80.pc &= 0xffff;
      break;
    }
    case 0x3f: {
      z80.f = (z80.f & (0x04 | 0x40 | 0x80)) | (z80.f & 0x01 ? 0x10 : 0x01) | (z80.a & (0x08 | 0x20));
      break;
    }
    case 0x40: {
      break;
    }
    case 0x41: {
      z80.b = z80.c;
      break;
    }
    case 0x42: {
      z80.b = z80.d;
      break;
    }
    case 0x43: {
      z80.b = z80.e;
      break;
    }
    case 0x44: {
      z80.b = z80.h;
      break;
    }
    case 0x45: {
      z80.b = z80.l;
      break;
    }
    case 0x46: {
      that.tstates += 3;
      z80.b = that.mem.readbyte(z80.l | (z80.h << 8));
      break;
    }
    case 0x47: {
      z80.b = z80.a;
      break;
    }
    case 0x48: {
      z80.c = z80.b;
      break;
    }
    case 0x49: {
      break;
    }
    case 0x4a: {
      z80.c = z80.d;
      break;
    }
    case 0x4b: {
      z80.c = z80.e;
      break;
    }
    case 0x4c: {
      z80.c = z80.h;
      break;
    }
    case 0x4d: {
      z80.c = z80.l;
      break;
    }
    case 0x4e: {
      that.tstates += 3;
      z80.c = that.mem.readbyte(z80.l | (z80.h << 8));
      break;
    }
    case 0x4f: {
      z80.c = z80.a;
      break;
    }
    case 0x50: {
      z80.d = z80.b;
      break;
    }
    case 0x51: {
      z80.d = z80.c;
      break;
    }
    case 0x52: {
      break;
    }
    case 0x53: {
      z80.d = z80.e;
      break;
    }
    case 0x54: {
      z80.d = z80.h;
      break;
    }
    case 0x55: {
      z80.d = z80.l;
      break;
    }
    case 0x56: {
      that.tstates += 3;
      z80.d = that.mem.readbyte(z80.l | (z80.h << 8));
      break;
    }
    case 0x57: {
      z80.d = z80.a;
      break;
    }
    case 0x58: {
      z80.e = z80.b;
      break;
    }
    case 0x59: {
      z80.e = z80.c;
      break;
    }
    case 0x5a: {
      z80.e = z80.d;
      break;
    }
    case 0x5b: {
      break;
    }
    case 0x5c: {
      z80.e = z80.h;
      break;
    }
    case 0x5d: {
      z80.e = z80.l;
      break;
    }
    case 0x5e: {
      that.tstates += 3;
      z80.e = that.mem.readbyte(z80.l | (z80.h << 8));
      break;
    }
    case 0x5f: {
      z80.e = z80.a;
      break;
    }
    case 0x60: {
      z80.h = z80.b;
      break;
    }
    case 0x61: {
      z80.h = z80.c;
      break;
    }
    case 0x62: {
      z80.h = z80.d;
      break;
    }
    case 0x63: {
      z80.h = z80.e;
      break;
    }
    case 0x64: {
      break;
    }
    case 0x65: {
      z80.h = z80.l;
      break;
    }
    case 0x66: {
      that.tstates += 3;
      z80.h = that.mem.readbyte(z80.l | (z80.h << 8));
      break;
    }
    case 0x67: {
      z80.h = z80.a;
      break;
    }
    case 0x68: {
      z80.l = z80.b;
      break;
    }
    case 0x69: {
      z80.l = z80.c;
      break;
    }
    case 0x6a: {
      z80.l = z80.d;
      break;
    }
    case 0x6b: {
      z80.l = z80.e;
      break;
    }
    case 0x6c: {
      z80.l = z80.h;
      break;
    }
    case 0x6d: {
      break;
    }
    case 0x6e: {
      that.tstates += 3;
      z80.l = that.mem.readbyte(z80.l | (z80.h << 8));
      break;
    }
    case 0x6f: {
      z80.l = z80.a;
      break;
    }
    case 0x70: {
      that.tstates += 3;
      that.mem.writebyte(z80.l | (z80.h << 8), z80.b);
      break;
    }
    case 0x71: {
      that.tstates += 3;
      that.mem.writebyte(z80.l | (z80.h << 8), z80.c);
      break;
    }
    case 0x72: {
      that.tstates += 3;
      that.mem.writebyte(z80.l | (z80.h << 8), z80.d);
      break;
    }
    case 0x73: {
      that.tstates += 3;
      that.mem.writebyte(z80.l | (z80.h << 8), z80.e);
      break;
    }
    case 0x74: {
      that.tstates += 3;
      that.mem.writebyte(z80.l | (z80.h << 8), z80.h);
      break;
    }
    case 0x75: {
      that.tstates += 3;
      that.mem.writebyte(z80.l | (z80.h << 8), z80.l);
      break;
    }
    case 0x76: {
      z80.halted = 1;
      z80.pc--;
      z80.pc &= 0xffff;
      break;
    }
    case 0x77: {
      that.tstates += 3;
      that.mem.writebyte(z80.l | (z80.h << 8), z80.a);
      break;
    }
    case 0x78: {
      z80.a = z80.b;
      break;
    }
    case 0x79: {
      z80.a = z80.c;
      break;
    }
    case 0x7a: {
      z80.a = z80.d;
      break;
    }
    case 0x7b: {
      z80.a = z80.e;
      break;
    }
    case 0x7c: {
      z80.a = z80.h;
      break;
    }
    case 0x7d: {
      z80.a = z80.l;
      break;
    }
    case 0x7e: {
      that.tstates += 3;
      z80.a = that.mem.readbyte(z80.l | (z80.h << 8));
      break;
    }
    case 0x7f: {
      break;
    }
    case 0x80: {
      {
        var addtemp = z80.a + z80.b;
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.b & 0x88) >> 2) | ((addtemp & 0x88) >> 1);
        z80.a = addtemp & 0xff;
        z80.f =
          (addtemp & 0x100 ? 0x01 : 0) |
          halfcarry_add_table[lookup & 0x07] |
          overflow_add_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x81: {
      {
        var addtemp = z80.a + z80.c;
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.c & 0x88) >> 2) | ((addtemp & 0x88) >> 1);
        z80.a = addtemp & 0xff;
        z80.f =
          (addtemp & 0x100 ? 0x01 : 0) |
          halfcarry_add_table[lookup & 0x07] |
          overflow_add_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x82: {
      {
        var addtemp = z80.a + z80.d;
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.d & 0x88) >> 2) | ((addtemp & 0x88) >> 1);
        z80.a = addtemp & 0xff;
        z80.f =
          (addtemp & 0x100 ? 0x01 : 0) |
          halfcarry_add_table[lookup & 0x07] |
          overflow_add_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x83: {
      {
        var addtemp = z80.a + z80.e;
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.e & 0x88) >> 2) | ((addtemp & 0x88) >> 1);
        z80.a = addtemp & 0xff;
        z80.f =
          (addtemp & 0x100 ? 0x01 : 0) |
          halfcarry_add_table[lookup & 0x07] |
          overflow_add_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x84: {
      {
        var addtemp = z80.a + z80.h;
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.h & 0x88) >> 2) | ((addtemp & 0x88) >> 1);
        z80.a = addtemp & 0xff;
        z80.f =
          (addtemp & 0x100 ? 0x01 : 0) |
          halfcarry_add_table[lookup & 0x07] |
          overflow_add_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x85: {
      {
        var addtemp = z80.a + z80.l;
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.l & 0x88) >> 2) | ((addtemp & 0x88) >> 1);
        z80.a = addtemp & 0xff;
        z80.f =
          (addtemp & 0x100 ? 0x01 : 0) |
          halfcarry_add_table[lookup & 0x07] |
          overflow_add_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x86: {
      that.tstates += 3;
      {
        var bytetemp = that.mem.readbyte(z80.l | (z80.h << 8));
        {
          var addtemp = z80.a + bytetemp;
          var lookup = ((z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((addtemp & 0x88) >> 1);
          z80.a = addtemp & 0xff;
          z80.f =
            (addtemp & 0x100 ? 0x01 : 0) |
            halfcarry_add_table[lookup & 0x07] |
            overflow_add_table[lookup >> 4] |
            sz53_table[z80.a];
        }
      }
      break;
    }
    case 0x87: {
      {
        var addtemp = z80.a + z80.a;
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.a & 0x88) >> 2) | ((addtemp & 0x88) >> 1);
        z80.a = addtemp & 0xff;
        z80.f =
          (addtemp & 0x100 ? 0x01 : 0) |
          halfcarry_add_table[lookup & 0x07] |
          overflow_add_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x88: {
      {
        var adctemp = z80.a + z80.b + (z80.f & 0x01);
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.b & 0x88) >> 2) | ((adctemp & 0x88) >> 1);
        z80.a = adctemp & 0xff;
        z80.f =
          (adctemp & 0x100 ? 0x01 : 0) |
          halfcarry_add_table[lookup & 0x07] |
          overflow_add_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x89: {
      {
        var adctemp = z80.a + z80.c + (z80.f & 0x01);
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.c & 0x88) >> 2) | ((adctemp & 0x88) >> 1);
        z80.a = adctemp & 0xff;
        z80.f =
          (adctemp & 0x100 ? 0x01 : 0) |
          halfcarry_add_table[lookup & 0x07] |
          overflow_add_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x8a: {
      {
        var adctemp = z80.a + z80.d + (z80.f & 0x01);
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.d & 0x88) >> 2) | ((adctemp & 0x88) >> 1);
        z80.a = adctemp & 0xff;
        z80.f =
          (adctemp & 0x100 ? 0x01 : 0) |
          halfcarry_add_table[lookup & 0x07] |
          overflow_add_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x8b: {
      {
        var adctemp = z80.a + z80.e + (z80.f & 0x01);
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.e & 0x88) >> 2) | ((adctemp & 0x88) >> 1);
        z80.a = adctemp & 0xff;
        z80.f =
          (adctemp & 0x100 ? 0x01 : 0) |
          halfcarry_add_table[lookup & 0x07] |
          overflow_add_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x8c: {
      {
        var adctemp = z80.a + z80.h + (z80.f & 0x01);
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.h & 0x88) >> 2) | ((adctemp & 0x88) >> 1);
        z80.a = adctemp & 0xff;
        z80.f =
          (adctemp & 0x100 ? 0x01 : 0) |
          halfcarry_add_table[lookup & 0x07] |
          overflow_add_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x8d: {
      {
        var adctemp = z80.a + z80.l + (z80.f & 0x01);
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.l & 0x88) >> 2) | ((adctemp & 0x88) >> 1);
        z80.a = adctemp & 0xff;
        z80.f =
          (adctemp & 0x100 ? 0x01 : 0) |
          halfcarry_add_table[lookup & 0x07] |
          overflow_add_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x8e: {
      that.tstates += 3;
      {
        var bytetemp = that.mem.readbyte(z80.l | (z80.h << 8));
        {
          var adctemp = z80.a + bytetemp + (z80.f & 0x01);
          var lookup = ((z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((adctemp & 0x88) >> 1);
          z80.a = adctemp & 0xff;
          z80.f =
            (adctemp & 0x100 ? 0x01 : 0) |
            halfcarry_add_table[lookup & 0x07] |
            overflow_add_table[lookup >> 4] |
            sz53_table[z80.a];
        }
      }
      break;
    }
    case 0x8f: {
      {
        var adctemp = z80.a + z80.a + (z80.f & 0x01);
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.a & 0x88) >> 2) | ((adctemp & 0x88) >> 1);
        z80.a = adctemp & 0xff;
        z80.f =
          (adctemp & 0x100 ? 0x01 : 0) |
          halfcarry_add_table[lookup & 0x07] |
          overflow_add_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x90: {
      {
        var subtemp = z80.a - z80.b;
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.b & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
        z80.a = subtemp & 0xff;
        z80.f =
          (subtemp & 0x100 ? 0x01 : 0) |
          0x02 |
          halfcarry_sub_table[lookup & 0x07] |
          overflow_sub_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x91: {
      {
        var subtemp = z80.a - z80.c;
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.c & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
        z80.a = subtemp & 0xff;
        z80.f =
          (subtemp & 0x100 ? 0x01 : 0) |
          0x02 |
          halfcarry_sub_table[lookup & 0x07] |
          overflow_sub_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x92: {
      {
        var subtemp = z80.a - z80.d;
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.d & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
        z80.a = subtemp & 0xff;
        z80.f =
          (subtemp & 0x100 ? 0x01 : 0) |
          0x02 |
          halfcarry_sub_table[lookup & 0x07] |
          overflow_sub_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x93: {
      {
        var subtemp = z80.a - z80.e;
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.e & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
        z80.a = subtemp & 0xff;
        z80.f =
          (subtemp & 0x100 ? 0x01 : 0) |
          0x02 |
          halfcarry_sub_table[lookup & 0x07] |
          overflow_sub_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x94: {
      {
        var subtemp = z80.a - z80.h;
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.h & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
        z80.a = subtemp & 0xff;
        z80.f =
          (subtemp & 0x100 ? 0x01 : 0) |
          0x02 |
          halfcarry_sub_table[lookup & 0x07] |
          overflow_sub_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x95: {
      {
        var subtemp = z80.a - z80.l;
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.l & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
        z80.a = subtemp & 0xff;
        z80.f =
          (subtemp & 0x100 ? 0x01 : 0) |
          0x02 |
          halfcarry_sub_table[lookup & 0x07] |
          overflow_sub_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x96: {
      that.tstates += 3;
      {
        var bytetemp = that.mem.readbyte(z80.l | (z80.h << 8));
        {
          var subtemp = z80.a - bytetemp;
          var lookup = ((z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
          z80.a = subtemp & 0xff;
          z80.f =
            (subtemp & 0x100 ? 0x01 : 0) |
            0x02 |
            halfcarry_sub_table[lookup & 0x07] |
            overflow_sub_table[lookup >> 4] |
            sz53_table[z80.a];
        }
      }
      break;
    }
    case 0x97: {
      {
        var subtemp = z80.a - z80.a;
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.a & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
        z80.a = subtemp & 0xff;
        z80.f =
          (subtemp & 0x100 ? 0x01 : 0) |
          0x02 |
          halfcarry_sub_table[lookup & 0x07] |
          overflow_sub_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x98: {
      {
        var sbctemp = z80.a - z80.b - (z80.f & 0x01);
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.b & 0x88) >> 2) | ((sbctemp & 0x88) >> 1);
        z80.a = sbctemp & 0xff;
        z80.f =
          (sbctemp & 0x100 ? 0x01 : 0) |
          0x02 |
          halfcarry_sub_table[lookup & 0x07] |
          overflow_sub_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x99: {
      {
        var sbctemp = z80.a - z80.c - (z80.f & 0x01);
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.c & 0x88) >> 2) | ((sbctemp & 0x88) >> 1);
        z80.a = sbctemp & 0xff;
        z80.f =
          (sbctemp & 0x100 ? 0x01 : 0) |
          0x02 |
          halfcarry_sub_table[lookup & 0x07] |
          overflow_sub_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x9a: {
      {
        var sbctemp = z80.a - z80.d - (z80.f & 0x01);
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.d & 0x88) >> 2) | ((sbctemp & 0x88) >> 1);
        z80.a = sbctemp & 0xff;
        z80.f =
          (sbctemp & 0x100 ? 0x01 : 0) |
          0x02 |
          halfcarry_sub_table[lookup & 0x07] |
          overflow_sub_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x9b: {
      {
        var sbctemp = z80.a - z80.e - (z80.f & 0x01);
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.e & 0x88) >> 2) | ((sbctemp & 0x88) >> 1);
        z80.a = sbctemp & 0xff;
        z80.f =
          (sbctemp & 0x100 ? 0x01 : 0) |
          0x02 |
          halfcarry_sub_table[lookup & 0x07] |
          overflow_sub_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x9c: {
      {
        var sbctemp = z80.a - z80.h - (z80.f & 0x01);
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.h & 0x88) >> 2) | ((sbctemp & 0x88) >> 1);
        z80.a = sbctemp & 0xff;
        z80.f =
          (sbctemp & 0x100 ? 0x01 : 0) |
          0x02 |
          halfcarry_sub_table[lookup & 0x07] |
          overflow_sub_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x9d: {
      {
        var sbctemp = z80.a - z80.l - (z80.f & 0x01);
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.l & 0x88) >> 2) | ((sbctemp & 0x88) >> 1);
        z80.a = sbctemp & 0xff;
        z80.f =
          (sbctemp & 0x100 ? 0x01 : 0) |
          0x02 |
          halfcarry_sub_table[lookup & 0x07] |
          overflow_sub_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x9e: {
      that.tstates += 3;
      {
        var bytetemp = that.mem.readbyte(z80.l | (z80.h << 8));
        {
          var sbctemp = z80.a - bytetemp - (z80.f & 0x01);
          var lookup = ((z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((sbctemp & 0x88) >> 1);
          z80.a = sbctemp & 0xff;
          z80.f =
            (sbctemp & 0x100 ? 0x01 : 0) |
            0x02 |
            halfcarry_sub_table[lookup & 0x07] |
            overflow_sub_table[lookup >> 4] |
            sz53_table[z80.a];
        }
      }
      break;
    }
    case 0x9f: {
      {
        var sbctemp = z80.a - z80.a - (z80.f & 0x01);
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.a & 0x88) >> 2) | ((sbctemp & 0x88) >> 1);
        z80.a = sbctemp & 0xff;
        z80.f =
          (sbctemp & 0x100 ? 0x01 : 0) |
          0x02 |
          halfcarry_sub_table[lookup & 0x07] |
          overflow_sub_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0xa0: {
      {
        z80.a &= z80.b;
        z80.f = 0x10 | sz53p_table[z80.a];
      }
      break;
    }
    case 0xa1: {
      {
        z80.a &= z80.c;
        z80.f = 0x10 | sz53p_table[z80.a];
      }
      break;
    }
    case 0xa2: {
      {
        z80.a &= z80.d;
        z80.f = 0x10 | sz53p_table[z80.a];
      }
      break;
    }
    case 0xa3: {
      {
        z80.a &= z80.e;
        z80.f = 0x10 | sz53p_table[z80.a];
      }
      break;
    }
    case 0xa4: {
      {
        z80.a &= z80.h;
        z80.f = 0x10 | sz53p_table[z80.a];
      }
      break;
    }
    case 0xa5: {
      {
        z80.a &= z80.l;
        z80.f = 0x10 | sz53p_table[z80.a];
      }
      break;
    }
    case 0xa6: {
      that.tstates += 3;
      {
        var bytetemp = that.mem.readbyte(z80.l | (z80.h << 8));
        {
          z80.a &= bytetemp;
          z80.f = 0x10 | sz53p_table[z80.a];
        }
      }
      break;
    }
    case 0xa7: {
      {
        z80.a &= z80.a;
        z80.f = 0x10 | sz53p_table[z80.a];
      }
      break;
    }
    case 0xa8: {
      {
        z80.a ^= z80.b;
        z80.f = sz53p_table[z80.a];
      }
      break;
    }
    case 0xa9: {
      {
        z80.a ^= z80.c;
        z80.f = sz53p_table[z80.a];
      }
      break;
    }
    case 0xaa: {
      {
        z80.a ^= z80.d;
        z80.f = sz53p_table[z80.a];
      }
      break;
    }
    case 0xab: {
      {
        z80.a ^= z80.e;
        z80.f = sz53p_table[z80.a];
      }
      break;
    }
    case 0xac: {
      {
        z80.a ^= z80.h;
        z80.f = sz53p_table[z80.a];
      }
      break;
    }
    case 0xad: {
      {
        z80.a ^= z80.l;
        z80.f = sz53p_table[z80.a];
      }
      break;
    }
    case 0xae: {
      that.tstates += 3;
      {
        var bytetemp = that.mem.readbyte(z80.l | (z80.h << 8));
        {
          z80.a ^= bytetemp;
          z80.f = sz53p_table[z80.a];
        }
      }
      break;
    }
    case 0xaf: {
      {
        z80.a ^= z80.a;
        z80.f = sz53p_table[z80.a];
      }
      break;
    }
    case 0xb0: {
      {
        z80.a |= z80.b;
        z80.f = sz53p_table[z80.a];
      }
      break;
    }
    case 0xb1: {
      {
        z80.a |= z80.c;
        z80.f = sz53p_table[z80.a];
      }
      break;
    }
    case 0xb2: {
      {
        z80.a |= z80.d;
        z80.f = sz53p_table[z80.a];
      }
      break;
    }
    case 0xb3: {
      {
        z80.a |= z80.e;
        z80.f = sz53p_table[z80.a];
      }
      break;
    }
    case 0xb4: {
      {
        z80.a |= z80.h;
        z80.f = sz53p_table[z80.a];
      }
      break;
    }
    case 0xb5: {
      {
        z80.a |= z80.l;
        z80.f = sz53p_table[z80.a];
      }
      break;
    }
    case 0xb6: {
      that.tstates += 3;
      {
        var bytetemp = that.mem.readbyte(z80.l | (z80.h << 8));
        {
          z80.a |= bytetemp;
          z80.f = sz53p_table[z80.a];
        }
      }
      break;
    }
    case 0xb7: {
      {
        z80.a |= z80.a;
        z80.f = sz53p_table[z80.a];
      }
      break;
    }
    case 0xb8: {
      {
        var cptemp = z80.a - z80.b;
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.b & 0x88) >> 2) | ((cptemp & 0x88) >> 1);
        z80.f =
          (cptemp & 0x100 ? 0x01 : cptemp ? 0 : 0x40) |
          0x02 |
          halfcarry_sub_table[lookup & 0x07] |
          overflow_sub_table[lookup >> 4] |
          (z80.b & (0x08 | 0x20)) |
          (cptemp & 0x80);
      }
      break;
    }
    case 0xb9: {
      {
        var cptemp = z80.a - z80.c;
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.c & 0x88) >> 2) | ((cptemp & 0x88) >> 1);
        z80.f =
          (cptemp & 0x100 ? 0x01 : cptemp ? 0 : 0x40) |
          0x02 |
          halfcarry_sub_table[lookup & 0x07] |
          overflow_sub_table[lookup >> 4] |
          (z80.c & (0x08 | 0x20)) |
          (cptemp & 0x80);
      }
      break;
    }
    case 0xba: {
      {
        var cptemp = z80.a - z80.d;
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.d & 0x88) >> 2) | ((cptemp & 0x88) >> 1);
        z80.f =
          (cptemp & 0x100 ? 0x01 : cptemp ? 0 : 0x40) |
          0x02 |
          halfcarry_sub_table[lookup & 0x07] |
          overflow_sub_table[lookup >> 4] |
          (z80.d & (0x08 | 0x20)) |
          (cptemp & 0x80);
      }
      break;
    }
    case 0xbb: {
      {
        var cptemp = z80.a - z80.e;
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.e & 0x88) >> 2) | ((cptemp & 0x88) >> 1);
        z80.f =
          (cptemp & 0x100 ? 0x01 : cptemp ? 0 : 0x40) |
          0x02 |
          halfcarry_sub_table[lookup & 0x07] |
          overflow_sub_table[lookup >> 4] |
          (z80.e & (0x08 | 0x20)) |
          (cptemp & 0x80);
      }
      break;
    }
    case 0xbc: {
      {
        var cptemp = z80.a - z80.h;
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.h & 0x88) >> 2) | ((cptemp & 0x88) >> 1);
        z80.f =
          (cptemp & 0x100 ? 0x01 : cptemp ? 0 : 0x40) |
          0x02 |
          halfcarry_sub_table[lookup & 0x07] |
          overflow_sub_table[lookup >> 4] |
          (z80.h & (0x08 | 0x20)) |
          (cptemp & 0x80);
      }
      break;
    }
    case 0xbd: {
      {
        var cptemp = z80.a - z80.l;
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.l & 0x88) >> 2) | ((cptemp & 0x88) >> 1);
        z80.f =
          (cptemp & 0x100 ? 0x01 : cptemp ? 0 : 0x40) |
          0x02 |
          halfcarry_sub_table[lookup & 0x07] |
          overflow_sub_table[lookup >> 4] |
          (z80.l & (0x08 | 0x20)) |
          (cptemp & 0x80);
      }
      break;
    }
    case 0xbe: {
      that.tstates += 3;
      {
        var bytetemp = that.mem.readbyte(z80.l | (z80.h << 8));
        {
          var cptemp = z80.a - bytetemp;
          var lookup = ((z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((cptemp & 0x88) >> 1);
          z80.f =
            (cptemp & 0x100 ? 0x01 : cptemp ? 0 : 0x40) |
            0x02 |
            halfcarry_sub_table[lookup & 0x07] |
            overflow_sub_table[lookup >> 4] |
            (bytetemp & (0x08 | 0x20)) |
            (cptemp & 0x80);
        }
      }
      break;
    }
    case 0xbf: {
      {
        var cptemp = z80.a - z80.a;
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.a & 0x88) >> 2) | ((cptemp & 0x88) >> 1);
        z80.f =
          (cptemp & 0x100 ? 0x01 : cptemp ? 0 : 0x40) |
          0x02 |
          halfcarry_sub_table[lookup & 0x07] |
          overflow_sub_table[lookup >> 4] |
          (z80.a & (0x08 | 0x20)) |
          (cptemp & 0x80);
      }
      break;
    }
    case 0xc0: {
      that.tstates++;
      if (!(z80.f & 0x40)) {
        {
          {
            that.tstates += 6;
            var lowbyte = that.mem.readbyte(z80.sp++);
            z80.sp &= 0xffff;
            var highbyte = that.mem.readbyte(z80.sp++);
            z80.sp &= 0xffff;
            z80.pc = lowbyte | (highbyte << 8);
          }
        }
      }
      break;
    }
    case 0xc1: {
      {
        that.tstates += 6;
        z80.c = that.mem.readbyte(z80.sp++);
        z80.sp &= 0xffff;
        z80.b = that.mem.readbyte(z80.sp++);
        z80.sp &= 0xffff;
      }
      break;
    }
    case 0xc2: {
      that.tstates += 6;
      if (!(z80.f & 0x40)) {
        {
          var jptemp = z80.pc;
          var pcl = that.mem.readbyte(jptemp++);
          jptemp &= 0xffff;
          var pch = that.mem.readbyte(jptemp);
          z80.pc = pcl | (pch << 8);
        }
      } else z80.pc += 2;
      break;
    }
    case 0xc3: {
      that.tstates += 6;
      {
        var jptemp = z80.pc;
        var pcl = that.mem.readbyte(jptemp++);
        jptemp &= 0xffff;
        var pch = that.mem.readbyte(jptemp);
        z80.pc = pcl | (pch << 8);
      }
      break;
    }
    case 0xc4: {
      that.tstates += 6;
      if (!(z80.f & 0x40)) {
        {
          var calltempl, calltemph;
          calltempl = that.mem.readbyte(z80.pc++);
          z80.pc &= 0xffff;
          that.tstates++;
          calltemph = that.mem.readbyte(z80.pc++);
          z80.pc &= 0xffff;
          {
            that.tstates += 6;
            z80.sp--;
            z80.sp &= 0xffff;
            that.mem.writebyte(z80.sp, z80.pc >> 8);
            z80.sp--;
            z80.sp &= 0xffff;
            that.mem.writebyte(z80.sp, z80.pc & 0xff);
          }
          var pcl = calltempl;
          var pch = calltemph;
          z80.pc = pcl | (pch << 8);
        }
      } else z80.pc += 2;
      break;
    }
    case 0xc5: {
      that.tstates++;
      {
        that.tstates += 6;
        z80.sp--;
        z80.sp &= 0xffff;
        that.mem.writebyte(z80.sp, z80.b);
        z80.sp--;
        z80.sp &= 0xffff;
        that.mem.writebyte(z80.sp, z80.c);
      }
      break;
    }
    case 0xc6: {
      that.tstates += 3;
      {
        var bytetemp = that.mem.readbyte(z80.pc++);
        {
          var addtemp = z80.a + bytetemp;
          var lookup = ((z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((addtemp & 0x88) >> 1);
          z80.a = addtemp & 0xff;
          z80.f =
            (addtemp & 0x100 ? 0x01 : 0) |
            halfcarry_add_table[lookup & 0x07] |
            overflow_add_table[lookup >> 4] |
            sz53_table[z80.a];
        }
      }
      break;
    }
    case 0xc7: {
      that.tstates++;
      {
        {
          that.tstates += 6;
          z80.sp--;
          z80.sp &= 0xffff;
          that.mem.writebyte(z80.sp, z80.pc >> 8);
          z80.sp--;
          z80.sp &= 0xffff;
          that.mem.writebyte(z80.sp, z80.pc & 0xff);
        }
        z80.pc = 0x00;
      }
      break;
    }
    case 0xc8: {
      that.tstates++;
      if (z80.f & 0x40) {
        {
          {
            that.tstates += 6;
            var lowbyte = that.mem.readbyte(z80.sp++);
            z80.sp &= 0xffff;
            var highbyte = that.mem.readbyte(z80.sp++);
            z80.sp &= 0xffff;
            z80.pc = lowbyte | (highbyte << 8);
          }
        }
      }
      break;
    }
    case 0xc9: {
      {
        {
          that.tstates += 6;
          var lowbyte = that.mem.readbyte(z80.sp++);
          z80.sp &= 0xffff;
          var highbyte = that.mem.readbyte(z80.sp++);
          z80.sp &= 0xffff;
          z80.pc = lowbyte | (highbyte << 8);
        }
      }
      break;
    }
    case 0xca: {
      that.tstates += 6;
      if (z80.f & 0x40) {
        {
          var jptemp = z80.pc;
          var pcl = that.mem.readbyte(jptemp++);
          jptemp &= 0xffff;
          var pch = that.mem.readbyte(jptemp);
          z80.pc = pcl | (pch << 8);
        }
      } else z80.pc += 2;
      break;
    }
    case 0xcb: {
      {
        var opcode2;
        that.tstates += 4;
        opcode2 = that.mem.readbyte(z80.pc++);
        z80.pc &= 0xffff;
        z80.r = (z80.r + 1) & 0x7f;
        z80_cbxx(opcode2);
      }
      break;
    }
    case 0xcc: {
      that.tstates += 6;
      if (z80.f & 0x40) {
        {
          var calltempl, calltemph;
          calltempl = that.mem.readbyte(z80.pc++);
          z80.pc &= 0xffff;
          that.tstates++;
          calltemph = that.mem.readbyte(z80.pc++);
          z80.pc &= 0xffff;
          {
            that.tstates += 6;
            z80.sp--;
            z80.sp &= 0xffff;
            that.mem.writebyte(z80.sp, z80.pc >> 8);
            z80.sp--;
            z80.sp &= 0xffff;
            that.mem.writebyte(z80.sp, z80.pc & 0xff);
          }
          var pcl = calltempl;
          var pch = calltemph;
          z80.pc = pcl | (pch << 8);
        }
      } else z80.pc += 2;
      break;
    }
    case 0xcd: {
      that.tstates += 6;
      {
        var calltempl, calltemph;
        calltempl = that.mem.readbyte(z80.pc++);
        z80.pc &= 0xffff;
        that.tstates++;
        calltemph = that.mem.readbyte(z80.pc++);
        z80.pc &= 0xffff;
        {
          that.tstates += 6;
          z80.sp--;
          z80.sp &= 0xffff;
          that.mem.writebyte(z80.sp, z80.pc >> 8);
          z80.sp--;
          z80.sp &= 0xffff;
          that.mem.writebyte(z80.sp, z80.pc & 0xff);
        }
        var pcl = calltempl;
        var pch = calltemph;
        z80.pc = pcl | (pch << 8);
      }
      break;
    }
    case 0xce: {
      that.tstates += 3;
      {
        var bytetemp = that.mem.readbyte(z80.pc++);
        {
          var adctemp = z80.a + bytetemp + (z80.f & 0x01);
          var lookup = ((z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((adctemp & 0x88) >> 1);
          z80.a = adctemp & 0xff;
          z80.f =
            (adctemp & 0x100 ? 0x01 : 0) |
            halfcarry_add_table[lookup & 0x07] |
            overflow_add_table[lookup >> 4] |
            sz53_table[z80.a];
        }
      }
      break;
    }
    case 0xcf: {
      that.tstates++;
      {
        {
          that.tstates += 6;
          z80.sp--;
          z80.sp &= 0xffff;
          that.mem.writebyte(z80.sp, z80.pc >> 8);
          z80.sp--;
          z80.sp &= 0xffff;
          that.mem.writebyte(z80.sp, z80.pc & 0xff);
        }
        z80.pc = 0x08;
      }
      break;
    }
    case 0xd0: {
      that.tstates++;
      if (!(z80.f & 0x01)) {
        {
          {
            that.tstates += 6;
            var lowbyte = that.mem.readbyte(z80.sp++);
            z80.sp &= 0xffff;
            var highbyte = that.mem.readbyte(z80.sp++);
            z80.sp &= 0xffff;
            z80.pc = lowbyte | (highbyte << 8);
          }
        }
      }
      break;
    }
    case 0xd1: {
      {
        that.tstates += 6;
        z80.e = that.mem.readbyte(z80.sp++);
        z80.sp &= 0xffff;
        z80.d = that.mem.readbyte(z80.sp++);
        z80.sp &= 0xffff;
      }
      break;
    }
    case 0xd2: {
      that.tstates += 6;
      if (!(z80.f & 0x01)) {
        {
          var jptemp = z80.pc;
          var pcl = that.mem.readbyte(jptemp++);
          jptemp &= 0xffff;
          var pch = that.mem.readbyte(jptemp);
          z80.pc = pcl | (pch << 8);
        }
      } else z80.pc += 2;
      break;
    }
    case 0xd3: {
      {
        var outtemp;
        that.tstates += 4;
        outtemp = that.mem.readbyte(z80.pc++) + (z80.a << 8);
        z80.pc &= 0xffff;
        {
          that.tstates += 3;
          that.io.writeport(outtemp, z80.a);
        }
      }
      break;
    }
    case 0xd4: {
      that.tstates += 6;
      if (!(z80.f & 0x01)) {
        {
          var calltempl, calltemph;
          calltempl = that.mem.readbyte(z80.pc++);
          z80.pc &= 0xffff;
          that.tstates++;
          calltemph = that.mem.readbyte(z80.pc++);
          z80.pc &= 0xffff;
          {
            that.tstates += 6;
            z80.sp--;
            z80.sp &= 0xffff;
            that.mem.writebyte(z80.sp, z80.pc >> 8);
            z80.sp--;
            z80.sp &= 0xffff;
            that.mem.writebyte(z80.sp, z80.pc & 0xff);
          }
          var pcl = calltempl;
          var pch = calltemph;
          z80.pc = pcl | (pch << 8);
        }
      } else z80.pc += 2;
      break;
    }
    case 0xd5: {
      that.tstates++;
      {
        that.tstates += 6;
        z80.sp--;
        z80.sp &= 0xffff;
        that.mem.writebyte(z80.sp, z80.d);
        z80.sp--;
        z80.sp &= 0xffff;
        that.mem.writebyte(z80.sp, z80.e);
      }
      break;
    }
    case 0xd6: {
      that.tstates += 3;
      {
        var bytetemp = that.mem.readbyte(z80.pc++);
        {
          var subtemp = z80.a - bytetemp;
          var lookup = ((z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
          z80.a = subtemp & 0xff;
          z80.f =
            (subtemp & 0x100 ? 0x01 : 0) |
            0x02 |
            halfcarry_sub_table[lookup & 0x07] |
            overflow_sub_table[lookup >> 4] |
            sz53_table[z80.a];
        }
      }
      break;
    }
    case 0xd7: {
      that.tstates++;
      {
        {
          that.tstates += 6;
          z80.sp--;
          z80.sp &= 0xffff;
          that.mem.writebyte(z80.sp, z80.pc >> 8);
          z80.sp--;
          z80.sp &= 0xffff;
          that.mem.writebyte(z80.sp, z80.pc & 0xff);
        }
        z80.pc = 0x10;
      }
      break;
    }
    case 0xd8: {
      that.tstates++;
      if (z80.f & 0x01) {
        {
          {
            that.tstates += 6;
            var lowbyte = that.mem.readbyte(z80.sp++);
            z80.sp &= 0xffff;
            var highbyte = that.mem.readbyte(z80.sp++);
            z80.sp &= 0xffff;
            z80.pc = lowbyte | (highbyte << 8);
          }
        }
      }
      break;
    }
    case 0xd9: {
      {
        var bytetemp;
        bytetemp = z80.b;
        z80.b = z80.b_;
        z80.b_ = bytetemp;
        bytetemp = z80.c;
        z80.c = z80.c_;
        z80.c_ = bytetemp;
        bytetemp = z80.d;
        z80.d = z80.d_;
        z80.d_ = bytetemp;
        bytetemp = z80.e;
        z80.e = z80.e_;
        z80.e_ = bytetemp;
        bytetemp = z80.h;
        z80.h = z80.h_;
        z80.h_ = bytetemp;
        bytetemp = z80.l;
        z80.l = z80.l_;
        z80.l_ = bytetemp;
      }
      break;
    }
    case 0xda: {
      that.tstates += 6;
      if (z80.f & 0x01) {
        {
          var jptemp = z80.pc;
          var pcl = that.mem.readbyte(jptemp++);
          jptemp &= 0xffff;
          var pch = that.mem.readbyte(jptemp);
          z80.pc = pcl | (pch << 8);
        }
      } else z80.pc += 2;
      break;
    }
    case 0xdb: {
      {
        var intemp;
        that.tstates += 4;
        intemp = that.mem.readbyte(z80.pc++) + (z80.a << 8);
        z80.pc &= 0xffff;
        that.tstates += 3;
        z80.a = that.io.readport(intemp);
      }
      break;
    }
    case 0xdc: {
      that.tstates += 6;
      if (z80.f & 0x01) {
        {
          var calltempl, calltemph;
          calltempl = that.mem.readbyte(z80.pc++);
          z80.pc &= 0xffff;
          that.tstates++;
          calltemph = that.mem.readbyte(z80.pc++);
          z80.pc &= 0xffff;
          {
            that.tstates += 6;
            z80.sp--;
            z80.sp &= 0xffff;
            that.mem.writebyte(z80.sp, z80.pc >> 8);
            z80.sp--;
            z80.sp &= 0xffff;
            that.mem.writebyte(z80.sp, z80.pc & 0xff);
          }
          var pcl = calltempl;
          var pch = calltemph;
          z80.pc = pcl | (pch << 8);
        }
      } else z80.pc += 2;
      break;
    }
    case 0xdd: {
      {
        var opcode2;
        that.tstates += 4;
        opcode2 = that.mem.readbyte(z80.pc++);
        z80.pc &= 0xffff;
        z80.r = (z80.r + 1) & 0x7f;
        z80_ddxx(opcode2);
      }
      break;
    }
    case 0xde: {
      that.tstates += 3;
      {
        var bytetemp = that.mem.readbyte(z80.pc++);
        {
          var sbctemp = z80.a - bytetemp - (z80.f & 0x01);
          var lookup = ((z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((sbctemp & 0x88) >> 1);
          z80.a = sbctemp & 0xff;
          z80.f =
            (sbctemp & 0x100 ? 0x01 : 0) |
            0x02 |
            halfcarry_sub_table[lookup & 0x07] |
            overflow_sub_table[lookup >> 4] |
            sz53_table[z80.a];
        }
      }
      break;
    }
    case 0xdf: {
      that.tstates++;
      {
        {
          that.tstates += 6;
          z80.sp--;
          z80.sp &= 0xffff;
          that.mem.writebyte(z80.sp, z80.pc >> 8);
          z80.sp--;
          z80.sp &= 0xffff;
          that.mem.writebyte(z80.sp, z80.pc & 0xff);
        }
        z80.pc = 0x18;
      }
      break;
    }
    case 0xe0: {
      that.tstates++;
      if (!(z80.f & 0x04)) {
        {
          {
            that.tstates += 6;
            var lowbyte = that.mem.readbyte(z80.sp++);
            z80.sp &= 0xffff;
            var highbyte = that.mem.readbyte(z80.sp++);
            z80.sp &= 0xffff;
            z80.pc = lowbyte | (highbyte << 8);
          }
        }
      }
      break;
    }
    case 0xe1: {
      {
        that.tstates += 6;
        z80.l = that.mem.readbyte(z80.sp++);
        z80.sp &= 0xffff;
        z80.h = that.mem.readbyte(z80.sp++);
        z80.sp &= 0xffff;
      }
      break;
    }
    case 0xe2: {
      that.tstates += 6;
      if (!(z80.f & 0x04)) {
        {
          var jptemp = z80.pc;
          var pcl = that.mem.readbyte(jptemp++);
          jptemp &= 0xffff;
          var pch = that.mem.readbyte(jptemp);
          z80.pc = pcl | (pch << 8);
        }
      } else z80.pc += 2;
      break;
    }
    case 0xe3: {
      {
        var bytetempl = that.mem.readbyte(z80.sp),
          bytetemph = that.mem.readbyte(z80.sp + 1);
        that.tstates += 15;
        that.mem.writebyte(z80.sp + 1, z80.h);
        that.mem.writebyte(z80.sp, z80.l);
        z80.l = bytetempl;
        z80.h = bytetemph;
      }
      break;
    }
    case 0xe4: {
      that.tstates += 6;
      if (!(z80.f & 0x04)) {
        {
          var calltempl, calltemph;
          calltempl = that.mem.readbyte(z80.pc++);
          z80.pc &= 0xffff;
          that.tstates++;
          calltemph = that.mem.readbyte(z80.pc++);
          z80.pc &= 0xffff;
          {
            that.tstates += 6;
            z80.sp--;
            z80.sp &= 0xffff;
            that.mem.writebyte(z80.sp, z80.pc >> 8);
            z80.sp--;
            z80.sp &= 0xffff;
            that.mem.writebyte(z80.sp, z80.pc & 0xff);
          }
          var pcl = calltempl;
          var pch = calltemph;
          z80.pc = pcl | (pch << 8);
        }
      } else z80.pc += 2;
      break;
    }
    case 0xe5: {
      that.tstates++;
      {
        that.tstates += 6;
        z80.sp--;
        z80.sp &= 0xffff;
        that.mem.writebyte(z80.sp, z80.h);
        z80.sp--;
        z80.sp &= 0xffff;
        that.mem.writebyte(z80.sp, z80.l);
      }
      break;
    }
    case 0xe6: {
      that.tstates += 3;
      {
        var bytetemp = that.mem.readbyte(z80.pc++);
        {
          z80.a &= bytetemp;
          z80.f = 0x10 | sz53p_table[z80.a];
        }
      }
      break;
    }
    case 0xe7: {
      that.tstates++;
      {
        {
          that.tstates += 6;
          z80.sp--;
          z80.sp &= 0xffff;
          that.mem.writebyte(z80.sp, z80.pc >> 8);
          z80.sp--;
          z80.sp &= 0xffff;
          that.mem.writebyte(z80.sp, z80.pc & 0xff);
        }
        z80.pc = 0x20;
      }
      break;
    }
    case 0xe8: {
      that.tstates++;
      if (z80.f & 0x04) {
        {
          {
            that.tstates += 6;
            var lowbyte = that.mem.readbyte(z80.sp++);
            z80.sp &= 0xffff;
            var highbyte = that.mem.readbyte(z80.sp++);
            z80.sp &= 0xffff;
            z80.pc = lowbyte | (highbyte << 8);
          }
        }
      }
      break;
    }
    case 0xe9: {
      z80.pc = z80.l | (z80.h << 8);
      break;
    }
    case 0xea: {
      that.tstates += 6;
      if (z80.f & 0x04) {
        {
          var jptemp = z80.pc;
          var pcl = that.mem.readbyte(jptemp++);
          jptemp &= 0xffff;
          var pch = that.mem.readbyte(jptemp);
          z80.pc = pcl | (pch << 8);
        }
      } else z80.pc += 2;
      break;
    }
    case 0xeb: {
      {
        var bytetemp;
        bytetemp = z80.d;
        z80.d = z80.h;
        z80.h = bytetemp;
        bytetemp = z80.e;
        z80.e = z80.l;
        z80.l = bytetemp;
      }
      break;
    }
    case 0xec: {
      that.tstates += 6;
      if (z80.f & 0x04) {
        {
          var calltempl, calltemph;
          calltempl = that.mem.readbyte(z80.pc++);
          z80.pc &= 0xffff;
          that.tstates++;
          calltemph = that.mem.readbyte(z80.pc++);
          z80.pc &= 0xffff;
          {
            that.tstates += 6;
            z80.sp--;
            z80.sp &= 0xffff;
            that.mem.writebyte(z80.sp, z80.pc >> 8);
            z80.sp--;
            z80.sp &= 0xffff;
            that.mem.writebyte(z80.sp, z80.pc & 0xff);
          }
          var pcl = calltempl;
          var pch = calltemph;
          z80.pc = pcl | (pch << 8);
        }
      } else z80.pc += 2;
      break;
    }
    case 0xed: {
      {
        var opcode2;
        that.tstates += 4;
        opcode2 = that.mem.readbyte(z80.pc++);
        z80.pc &= 0xffff;
        z80.r = (z80.r + 1) & 0x7f;
        z80_edxx(opcode2);
      }
      break;
    }
    case 0xee: {
      that.tstates += 3;
      {
        var bytetemp = that.mem.readbyte(z80.pc++);
        {
          z80.a ^= bytetemp;
          z80.f = sz53p_table[z80.a];
        }
      }
      break;
    }
    case 0xef: {
      that.tstates++;
      {
        {
          that.tstates += 6;
          z80.sp--;
          z80.sp &= 0xffff;
          that.mem.writebyte(z80.sp, z80.pc >> 8);
          z80.sp--;
          z80.sp &= 0xffff;
          that.mem.writebyte(z80.sp, z80.pc & 0xff);
        }
        z80.pc = 0x28;
      }
      break;
    }
    case 0xf0: {
      that.tstates++;
      if (!(z80.f & 0x80)) {
        {
          {
            that.tstates += 6;
            var lowbyte = that.mem.readbyte(z80.sp++);
            z80.sp &= 0xffff;
            var highbyte = that.mem.readbyte(z80.sp++);
            z80.sp &= 0xffff;
            z80.pc = lowbyte | (highbyte << 8);
          }
        }
      }
      break;
    }
    case 0xf1: {
      {
        that.tstates += 6;
        z80.f = that.mem.readbyte(z80.sp++);
        z80.sp &= 0xffff;
        z80.a = that.mem.readbyte(z80.sp++);
        z80.sp &= 0xffff;
      }
      break;
    }
    case 0xf2: {
      that.tstates += 6;
      if (!(z80.f & 0x80)) {
        {
          var jptemp = z80.pc;
          var pcl = that.mem.readbyte(jptemp++);
          jptemp &= 0xffff;
          var pch = that.mem.readbyte(jptemp);
          z80.pc = pcl | (pch << 8);
        }
      } else z80.pc += 2;
      break;
    }
    case 0xf3: {
      z80.iff1 = z80.iff2 = 0;
      break;
    }
    case 0xf4: {
      that.tstates += 6;
      if (!(z80.f & 0x80)) {
        {
          var calltempl, calltemph;
          calltempl = that.mem.readbyte(z80.pc++);
          z80.pc &= 0xffff;
          that.tstates++;
          calltemph = that.mem.readbyte(z80.pc++);
          z80.pc &= 0xffff;
          {
            that.tstates += 6;
            z80.sp--;
            z80.sp &= 0xffff;
            that.mem.writebyte(z80.sp, z80.pc >> 8);
            z80.sp--;
            z80.sp &= 0xffff;
            that.mem.writebyte(z80.sp, z80.pc & 0xff);
          }
          var pcl = calltempl;
          var pch = calltemph;
          z80.pc = pcl | (pch << 8);
        }
      } else z80.pc += 2;
      break;
    }
    case 0xf5: {
      that.tstates++;
      {
        that.tstates += 6;
        z80.sp--;
        z80.sp &= 0xffff;
        that.mem.writebyte(z80.sp, z80.a);
        z80.sp--;
        z80.sp &= 0xffff;
        that.mem.writebyte(z80.sp, z80.f);
      }
      break;
    }
    case 0xf6: {
      that.tstates += 3;
      {
        var bytetemp = that.mem.readbyte(z80.pc++);
        {
          z80.a |= bytetemp;
          z80.f = sz53p_table[z80.a];
        }
      }
      break;
    }
    case 0xf7: {
      that.tstates++;
      {
        {
          that.tstates += 6;
          z80.sp--;
          z80.sp &= 0xffff;
          that.mem.writebyte(z80.sp, z80.pc >> 8);
          z80.sp--;
          z80.sp &= 0xffff;
          that.mem.writebyte(z80.sp, z80.pc & 0xff);
        }
        z80.pc = 0x30;
      }
      break;
    }
    case 0xf8: {
      that.tstates++;
      if (z80.f & 0x80) {
        {
          {
            that.tstates += 6;
            var lowbyte = that.mem.readbyte(z80.sp++);
            z80.sp &= 0xffff;
            var highbyte = that.mem.readbyte(z80.sp++);
            z80.sp &= 0xffff;
            z80.pc = lowbyte | (highbyte << 8);
          }
        }
      }
      break;
    }
    case 0xf9: {
      that.tstates += 2;
      z80.sp = z80.l | (z80.h << 8);
      break;
    }
    case 0xfa: {
      that.tstates += 6;
      if (z80.f & 0x80) {
        {
          var jptemp = z80.pc;
          var pcl = that.mem.readbyte(jptemp++);
          jptemp &= 0xffff;
          var pch = that.mem.readbyte(jptemp);
          z80.pc = pcl | (pch << 8);
        }
      } else z80.pc += 2;
      break;
    }
    case 0xfb: {
      z80.iff1 = z80.iff2 = 1;
      break;
    }
    case 0xfc: {
      that.tstates += 6;
      if (z80.f & 0x80) {
        {
          var calltempl, calltemph;
          calltempl = that.mem.readbyte(z80.pc++);
          z80.pc &= 0xffff;
          that.tstates++;
          calltemph = that.mem.readbyte(z80.pc++);
          z80.pc &= 0xffff;
          {
            that.tstates += 6;
            z80.sp--;
            z80.sp &= 0xffff;
            that.mem.writebyte(z80.sp, z80.pc >> 8);
            z80.sp--;
            z80.sp &= 0xffff;
            that.mem.writebyte(z80.sp, z80.pc & 0xff);
          }
          var pcl = calltempl;
          var pch = calltemph;
          z80.pc = pcl | (pch << 8);
        }
      } else z80.pc += 2;
      break;
    }
    case 0xfd: {
      {
        var opcode2;
        that.tstates += 4;
        opcode2 = that.mem.readbyte(z80.pc++);
        z80.pc &= 0xffff;
        z80.r = (z80.r + 1) & 0x7f;
        z80_fdxx(opcode2);
      }
      break;
    }
    case 0xfe: {
      that.tstates += 3;
      {
        var bytetemp = that.mem.readbyte(z80.pc++);
        {
          var cptemp = z80.a - bytetemp;
          var lookup = ((z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((cptemp & 0x88) >> 1);
          z80.f =
            (cptemp & 0x100 ? 0x01 : cptemp ? 0 : 0x40) |
            0x02 |
            halfcarry_sub_table[lookup & 0x07] |
            overflow_sub_table[lookup >> 4] |
            (bytetemp & (0x08 | 0x20)) |
            (cptemp & 0x80);
        }
      }
      break;
    }
    case 0xff: {
      that.tstates++;
      {
        {
          that.tstates += 6;
          z80.sp--;
          z80.sp &= 0xffff;
          that.mem.writebyte(z80.sp, z80.pc >> 8);
          z80.sp--;
          z80.sp &= 0xffff;
          that.mem.writebyte(z80.sp, z80.pc & 0xff);
        }
        z80.pc = 0x38;
      }
      break;
    }
    case 256: {
      break;
    }
  }
};
const z80_edxx = (key) => {
  switch (key) {
    case 0x40: {
      that.tstates += 1;
      {
        that.tstates += 3;
        z80.b = that.io.readport(z80.c | (z80.b << 8));
        z80.f = (z80.f & 0x01) | sz53p_table[z80.b];
      }
      break;
    }
    case 0x41: {
      that.tstates += 1;
      {
        that.tstates += 3;
        that.io.writeport(z80.c | (z80.b << 8), z80.b);
      }
      break;
    }
    case 0x42: {
      that.tstates += 7;
      {
        var sub16temp = (z80.l | (z80.h << 8)) - (z80.c | (z80.b << 8)) - (z80.f & 0x01);
        var lookup =
          (((z80.l | (z80.h << 8)) & 0x8800) >> 11) |
          (((z80.c | (z80.b << 8)) & 0x8800) >> 10) |
          ((sub16temp & 0x8800) >> 9);
        z80.h = (sub16temp >> 8) & 0xff;
        z80.l = sub16temp & 0xff;
        z80.f =
          (sub16temp & 0x10000 ? 0x01 : 0) |
          0x02 |
          overflow_sub_table[lookup >> 4] |
          (z80.h & (0x08 | 0x20 | 0x80)) |
          halfcarry_sub_table[lookup & 0x07] |
          (z80.l | (z80.h << 8) ? 0 : 0x40);
      }
      break;
    }
    case 0x43: {
      {
        var ldtemp;
        that.tstates += 12;
        ldtemp = that.mem.readbyte(z80.pc++);
        z80.pc &= 0xffff;
        ldtemp |= that.mem.readbyte(z80.pc++) << 8;
        z80.pc &= 0xffff;
        that.mem.writebyte(ldtemp++, z80.c);
        ldtemp &= 0xffff;
        that.mem.writebyte(ldtemp, z80.b);
      }
      break;
    }
    case 0x44:
    case 0x4c:
    case 0x54:
    case 0x5c:
    case 0x64:
    case 0x6c:
    case 0x74:
    case 0x7c: {
      {
        var bytetemp = z80.a;
        z80.a = 0;
        {
          var subtemp = z80.a - bytetemp;
          var lookup = ((z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
          z80.a = subtemp & 0xff;
          z80.f =
            (subtemp & 0x100 ? 0x01 : 0) |
            0x02 |
            halfcarry_sub_table[lookup & 0x07] |
            overflow_sub_table[lookup >> 4] |
            sz53_table[z80.a];
        }
      }
      break;
    }
    case 0x45:
    case 0x4d:
    case 0x55:
    case 0x5d:
    case 0x65:
    case 0x6d:
    case 0x75:
    case 0x7d: {
      z80.iff1 = z80.iff2;
      {
        {
          that.tstates += 6;
          var lowbyte = that.mem.readbyte(z80.sp++);
          z80.sp &= 0xffff;
          var highbyte = that.mem.readbyte(z80.sp++);
          z80.sp &= 0xffff;
          z80.pc = lowbyte | (highbyte << 8);
        }
      }
      break;
    }
    case 0x46:
    case 0x4e:
    case 0x66:
    case 0x6e: {
      z80.im = 0;
      break;
    }
    case 0x47: {
      that.tstates += 1;
      z80.i = z80.a;
      break;
    }
    case 0x48: {
      that.tstates += 1;
      {
        that.tstates += 3;
        z80.c = that.io.readport(z80.c | (z80.b << 8));
        z80.f = (z80.f & 0x01) | sz53p_table[z80.c];
      }
      break;
    }
    case 0x49: {
      that.tstates += 1;
      {
        that.tstates += 3;
        that.io.writeport(z80.c | (z80.b << 8), z80.c);
      }
      break;
    }
    case 0x4a: {
      that.tstates += 7;
      {
        var add16temp = (z80.l | (z80.h << 8)) + (z80.c | (z80.b << 8)) + (z80.f & 0x01);
        var lookup =
          (((z80.l | (z80.h << 8)) & 0x8800) >> 11) |
          (((z80.c | (z80.b << 8)) & 0x8800) >> 10) |
          ((add16temp & 0x8800) >> 9);
        z80.h = (add16temp >> 8) & 0xff;
        z80.l = add16temp & 0xff;
        z80.f =
          (add16temp & 0x10000 ? 0x01 : 0) |
          overflow_add_table[lookup >> 4] |
          (z80.h & (0x08 | 0x20 | 0x80)) |
          halfcarry_add_table[lookup & 0x07] |
          (z80.l | (z80.h << 8) ? 0 : 0x40);
      }
      break;
    }
    case 0x4b: {
      {
        var ldtemp;
        that.tstates += 12;
        ldtemp = that.mem.readbyte(z80.pc++);
        z80.pc &= 0xffff;
        ldtemp |= that.mem.readbyte(z80.pc++) << 8;
        z80.pc &= 0xffff;
        z80.c = that.mem.readbyte(ldtemp++);
        ldtemp &= 0xffff;
        z80.b = that.mem.readbyte(ldtemp);
      }
      break;
    }
    case 0x4f: {
      that.tstates += 1;
      z80.r = z80.r7 = z80.a;
      break;
    }
    case 0x50: {
      that.tstates += 1;
      {
        that.tstates += 3;
        z80.d = that.io.readport(z80.c | (z80.b << 8));
        z80.f = (z80.f & 0x01) | sz53p_table[z80.d];
      }
      break;
    }
    case 0x51: {
      that.tstates += 1;
      {
        that.tstates += 3;
        that.io.writeport(z80.c | (z80.b << 8), z80.d);
      }
      break;
    }
    case 0x52: {
      that.tstates += 7;
      {
        var sub16temp = (z80.l | (z80.h << 8)) - (z80.e | (z80.d << 8)) - (z80.f & 0x01);
        var lookup =
          (((z80.l | (z80.h << 8)) & 0x8800) >> 11) |
          (((z80.e | (z80.d << 8)) & 0x8800) >> 10) |
          ((sub16temp & 0x8800) >> 9);
        z80.h = (sub16temp >> 8) & 0xff;
        z80.l = sub16temp & 0xff;
        z80.f =
          (sub16temp & 0x10000 ? 0x01 : 0) |
          0x02 |
          overflow_sub_table[lookup >> 4] |
          (z80.h & (0x08 | 0x20 | 0x80)) |
          halfcarry_sub_table[lookup & 0x07] |
          (z80.l | (z80.h << 8) ? 0 : 0x40);
      }
      break;
    }
    case 0x53: {
      {
        var ldtemp;
        that.tstates += 12;
        ldtemp = that.mem.readbyte(z80.pc++);
        z80.pc &= 0xffff;
        ldtemp |= that.mem.readbyte(z80.pc++) << 8;
        z80.pc &= 0xffff;
        that.mem.writebyte(ldtemp++, z80.e);
        ldtemp &= 0xffff;
        that.mem.writebyte(ldtemp, z80.d);
      }
      break;
    }
    case 0x56:
    case 0x76: {
      z80.im = 1;
      break;
    }
    case 0x57: {
      that.tstates += 1;
      z80.a = z80.i;
      z80.f = (z80.f & 0x01) | sz53_table[z80.a] | (z80.iff2 ? 0x04 : 0);
      break;
    }
    case 0x58: {
      that.tstates += 1;
      {
        that.tstates += 3;
        z80.e = that.io.readport(z80.c | (z80.b << 8));
        z80.f = (z80.f & 0x01) | sz53p_table[z80.e];
      }
      break;
    }
    case 0x59: {
      that.tstates += 1;
      {
        that.tstates += 3;
        that.io.writeport(z80.c | (z80.b << 8), z80.e);
      }
      break;
    }
    case 0x5a: {
      that.tstates += 7;
      {
        var add16temp = (z80.l | (z80.h << 8)) + (z80.e | (z80.d << 8)) + (z80.f & 0x01);
        var lookup =
          (((z80.l | (z80.h << 8)) & 0x8800) >> 11) |
          (((z80.e | (z80.d << 8)) & 0x8800) >> 10) |
          ((add16temp & 0x8800) >> 9);
        z80.h = (add16temp >> 8) & 0xff;
        z80.l = add16temp & 0xff;
        z80.f =
          (add16temp & 0x10000 ? 0x01 : 0) |
          overflow_add_table[lookup >> 4] |
          (z80.h & (0x08 | 0x20 | 0x80)) |
          halfcarry_add_table[lookup & 0x07] |
          (z80.l | (z80.h << 8) ? 0 : 0x40);
      }
      break;
    }
    case 0x5b: {
      {
        var ldtemp;
        that.tstates += 12;
        ldtemp = that.mem.readbyte(z80.pc++);
        z80.pc &= 0xffff;
        ldtemp |= that.mem.readbyte(z80.pc++) << 8;
        z80.pc &= 0xffff;
        z80.e = that.mem.readbyte(ldtemp++);
        ldtemp &= 0xffff;
        z80.d = that.mem.readbyte(ldtemp);
      }
      break;
    }
    case 0x5e:
    case 0x7e: {
      z80.im = 2;
      break;
    }
    case 0x5f: {
      that.tstates += 1;
      z80.a = (z80.r & 0x7f) | (z80.r7 & 0x80);
      z80.f = (z80.f & 0x01) | sz53_table[z80.a] | (z80.iff2 ? 0x04 : 0);
      break;
    }
    case 0x60: {
      that.tstates += 1;
      {
        that.tstates += 3;
        z80.h = that.io.readport(z80.c | (z80.b << 8));
        z80.f = (z80.f & 0x01) | sz53p_table[z80.h];
      }
      break;
    }
    case 0x61: {
      that.tstates += 1;
      {
        that.tstates += 3;
        that.io.writeport(z80.c | (z80.b << 8), z80.h);
      }
      break;
    }
    case 0x62: {
      that.tstates += 7;
      {
        var sub16temp = (z80.l | (z80.h << 8)) - (z80.l | (z80.h << 8)) - (z80.f & 0x01);
        var lookup =
          (((z80.l | (z80.h << 8)) & 0x8800) >> 11) |
          (((z80.l | (z80.h << 8)) & 0x8800) >> 10) |
          ((sub16temp & 0x8800) >> 9);
        z80.h = (sub16temp >> 8) & 0xff;
        z80.l = sub16temp & 0xff;
        z80.f =
          (sub16temp & 0x10000 ? 0x01 : 0) |
          0x02 |
          overflow_sub_table[lookup >> 4] |
          (z80.h & (0x08 | 0x20 | 0x80)) |
          halfcarry_sub_table[lookup & 0x07] |
          (z80.l | (z80.h << 8) ? 0 : 0x40);
      }
      break;
    }
    case 0x63: {
      {
        var ldtemp;
        that.tstates += 12;
        ldtemp = that.mem.readbyte(z80.pc++);
        z80.pc &= 0xffff;
        ldtemp |= that.mem.readbyte(z80.pc++) << 8;
        z80.pc &= 0xffff;
        that.mem.writebyte(ldtemp++, z80.l);
        ldtemp &= 0xffff;
        that.mem.writebyte(ldtemp, z80.h);
      }
      break;
    }
    case 0x67: {
      {
        var bytetemp = that.mem.readbyte(z80.l | (z80.h << 8));
        that.tstates += 10;
        that.mem.writebyte(z80.l | (z80.h << 8), ((z80.a & 0x0f) << 4) | (bytetemp >> 4));
        z80.a = (z80.a & 0xf0) | (bytetemp & 0x0f);
        z80.f = (z80.f & 0x01) | sz53p_table[z80.a];
      }
      break;
    }
    case 0x68: {
      that.tstates += 1;
      {
        that.tstates += 3;
        z80.l = that.io.readport(z80.c | (z80.b << 8));
        z80.f = (z80.f & 0x01) | sz53p_table[z80.l];
      }
      break;
    }
    case 0x69: {
      that.tstates += 1;
      {
        that.tstates += 3;
        that.io.writeport(z80.c | (z80.b << 8), z80.l);
      }
      break;
    }
    case 0x6a: {
      that.tstates += 7;
      {
        var add16temp = (z80.l | (z80.h << 8)) + (z80.l | (z80.h << 8)) + (z80.f & 0x01);
        var lookup =
          (((z80.l | (z80.h << 8)) & 0x8800) >> 11) |
          (((z80.l | (z80.h << 8)) & 0x8800) >> 10) |
          ((add16temp & 0x8800) >> 9);
        z80.h = (add16temp >> 8) & 0xff;
        z80.l = add16temp & 0xff;
        z80.f =
          (add16temp & 0x10000 ? 0x01 : 0) |
          overflow_add_table[lookup >> 4] |
          (z80.h & (0x08 | 0x20 | 0x80)) |
          halfcarry_add_table[lookup & 0x07] |
          (z80.l | (z80.h << 8) ? 0 : 0x40);
      }
      break;
    }
    case 0x6b: {
      {
        var ldtemp;
        that.tstates += 12;
        ldtemp = that.mem.readbyte(z80.pc++);
        z80.pc &= 0xffff;
        ldtemp |= that.mem.readbyte(z80.pc++) << 8;
        z80.pc &= 0xffff;
        z80.l = that.mem.readbyte(ldtemp++);
        ldtemp &= 0xffff;
        z80.h = that.mem.readbyte(ldtemp);
      }
      break;
    }
    case 0x6f: {
      {
        var bytetemp = that.mem.readbyte(z80.l | (z80.h << 8));
        that.tstates += 10;
        that.mem.writebyte(z80.l | (z80.h << 8), ((bytetemp & 0x0f) << 4) | (z80.a & 0x0f));
        z80.a = (z80.a & 0xf0) | (bytetemp >> 4);
        z80.f = (z80.f & 0x01) | sz53p_table[z80.a];
      }
      break;
    }
    case 0x70: {
      that.tstates += 1;
      {
        var bytetemp;
        {
          that.tstates += 3;
          bytetemp = that.io.readport(z80.c | (z80.b << 8));
          z80.f = (z80.f & 0x01) | sz53p_table[bytetemp];
        }
      }
      break;
    }
    case 0x71: {
      that.tstates += 1;
      {
        that.tstates += 3;
        that.io.writeport(z80.c | (z80.b << 8), 0);
      }
      break;
    }
    case 0x72: {
      that.tstates += 7;
      {
        var sub16temp = (z80.l | (z80.h << 8)) - z80.sp - (z80.f & 0x01);
        var lookup =
          (((z80.l | (z80.h << 8)) & 0x8800) >> 11) |
          ((z80.sp & 0x8800) >> 10) |
          ((sub16temp & 0x8800) >> 9);
        z80.h = (sub16temp >> 8) & 0xff;
        z80.l = sub16temp & 0xff;
        z80.f =
          (sub16temp & 0x10000 ? 0x01 : 0) |
          0x02 |
          overflow_sub_table[lookup >> 4] |
          (z80.h & (0x08 | 0x20 | 0x80)) |
          halfcarry_sub_table[lookup & 0x07] |
          (z80.l | (z80.h << 8) ? 0 : 0x40);
      }
      break;
    }
    case 0x73: {
      {
        var ldtemp;
        that.tstates += 12;
        ldtemp = that.mem.readbyte(z80.pc++);
        z80.pc &= 0xffff;
        ldtemp |= that.mem.readbyte(z80.pc++) << 8;
        z80.pc &= 0xffff;
        that.mem.writebyte(ldtemp++, z80.sp & 0xff);
        ldtemp &= 0xffff;
        that.mem.writebyte(ldtemp, z80.sp >> 8);
      }
      break;
    }
    case 0x78: {
      that.tstates += 1;
      {
        that.tstates += 3;
        z80.a = that.io.readport(z80.c | (z80.b << 8));
        z80.f = (z80.f & 0x01) | sz53p_table[z80.a];
      }
      break;
    }
    case 0x79: {
      that.tstates += 1;
      {
        that.tstates += 3;
        that.io.writeport(z80.c | (z80.b << 8), z80.a);
      }
      break;
    }
    case 0x7a: {
      that.tstates += 7;
      {
        var add16temp = (z80.l | (z80.h << 8)) + z80.sp + (z80.f & 0x01);
        var lookup =
          (((z80.l | (z80.h << 8)) & 0x8800) >> 11) |
          ((z80.sp & 0x8800) >> 10) |
          ((add16temp & 0x8800) >> 9);
        z80.h = (add16temp >> 8) & 0xff;
        z80.l = add16temp & 0xff;
        z80.f =
          (add16temp & 0x10000 ? 0x01 : 0) |
          overflow_add_table[lookup >> 4] |
          (z80.h & (0x08 | 0x20 | 0x80)) |
          halfcarry_add_table[lookup & 0x07] |
          (z80.l | (z80.h << 8) ? 0 : 0x40);
      }
      break;
    }
    case 0x7b: {
      {
        var ldtemp;
        that.tstates += 12;
        ldtemp = that.mem.readbyte(z80.pc++);
        z80.pc &= 0xffff;
        ldtemp |= that.mem.readbyte(z80.pc++) << 8;
        z80.pc &= 0xffff;
        var regl = that.mem.readbyte(ldtemp++);
        ldtemp &= 0xffff;
        var regh = that.mem.readbyte(ldtemp);
        z80.sp = regl | (regh << 8);
      }
      break;
    }
    case 0xa0: {
      {
        var bytetemp = that.mem.readbyte(z80.l | (z80.h << 8));
        that.tstates += 8;
        var bctemp = ((z80.c | (z80.b << 8)) - 1) & 0xffff;
        z80.b = bctemp >> 8;
        z80.c = bctemp & 0xff;
        that.mem.writebyte(z80.e | (z80.d << 8), bytetemp);
        var detemp = ((z80.e | (z80.d << 8)) + 1) & 0xffff;
        z80.d = detemp >> 8;
        z80.e = detemp & 0xff;
        var hltemp = ((z80.l | (z80.h << 8)) + 1) & 0xffff;
        z80.h = hltemp >> 8;
        z80.l = hltemp & 0xff;
        bytetemp = (bytetemp + z80.a) & 0xff;
        z80.f =
          (z80.f & (0x01 | 0x40 | 0x80)) |
          (z80.c | (z80.b << 8) ? 0x04 : 0) |
          (bytetemp & 0x08) |
          (bytetemp & 0x02 ? 0x20 : 0);
      }
      break;
    }
    case 0xa1: {
      {
        var value = that.mem.readbyte(z80.l | (z80.h << 8)),
          bytetemp = (z80.a - value) & 0xff,
          lookup = ((z80.a & 0x08) >> 3) | ((value & 0x08) >> 2) | ((bytetemp & 0x08) >> 1);
        that.tstates += 8;
        var hltemp = ((z80.l | (z80.h << 8)) + 1) & 0xffff;
        z80.h = hltemp >> 8;
        z80.l = hltemp & 0xff;
        var bctemp = ((z80.c | (z80.b << 8)) - 1) & 0xffff;
        z80.b = bctemp >> 8;
        z80.c = bctemp & 0xff;
        z80.f =
          (z80.f & 0x01) |
          (z80.c | (z80.b << 8) ? 0x04 | 0x02 : 0x02) |
          halfcarry_sub_table[lookup] |
          (bytetemp ? 0 : 0x40) |
          (bytetemp & 0x80);
        if (z80.f & 0x10) bytetemp--;
        z80.f |= (bytetemp & 0x08) | (bytetemp & 0x02 ? 0x20 : 0);
      }
      break;
    }
    case 0xa2: {
      {
        var initemp = that.io.readport(z80.c | (z80.b << 8));
        that.tstates += 5;
        that.tstates += 3;
        that.mem.writebyte(z80.l | (z80.h << 8), initemp);
        z80.b = (z80.b - 1) & 0xff;
        var hltemp = ((z80.l | (z80.h << 8)) + 1) & 0xffff;
        z80.h = hltemp >> 8;
        z80.l = hltemp & 0xff;
        z80.f = (initemp & 0x80 ? 0x02 : 0) | sz53_table[z80.b];
      }
      break;
    }
    case 0xa3: {
      {
        var outitemp = that.mem.readbyte(z80.l | (z80.h << 8));
        z80.b = (z80.b - 1) & 0xff;
        that.tstates += 5;
        that.tstates += 3;
        var hltemp = ((z80.l | (z80.h << 8)) + 1) & 0xffff;
        z80.h = hltemp >> 8;
        z80.l = hltemp & 0xff;
        that.io.writeport(z80.c | (z80.b << 8), outitemp);
        z80.f = (outitemp & 0x80 ? 0x02 : 0) | sz53_table[z80.b];
      }
      break;
    }
    case 0xa8: {
      {
        var bytetemp = that.mem.readbyte(z80.l | (z80.h << 8));
        that.tstates += 8;
        var bctemp = ((z80.c | (z80.b << 8)) - 1) & 0xffff;
        z80.b = bctemp >> 8;
        z80.c = bctemp & 0xff;
        that.mem.writebyte(z80.e | (z80.d << 8), bytetemp);
        var detemp = ((z80.e | (z80.d << 8)) - 1) & 0xffff;
        z80.d = detemp >> 8;
        z80.e = detemp & 0xff;
        var hltemp = ((z80.l | (z80.h << 8)) - 1) & 0xffff;
        z80.h = hltemp >> 8;
        z80.l = hltemp & 0xff;
        bytetemp = (bytetemp + z80.a) & 0xff;
        z80.f =
          (z80.f & (0x01 | 0x40 | 0x80)) |
          (z80.c | (z80.b << 8) ? 0x04 : 0) |
          (bytetemp & 0x08) |
          (bytetemp & 0x02 ? 0x20 : 0);
      }
      break;
    }
    case 0xa9: {
      {
        var value = that.mem.readbyte(z80.l | (z80.h << 8)),
          bytetemp = (z80.a - value) & 0xff,
          lookup = ((z80.a & 0x08) >> 3) | ((value & 0x08) >> 2) | ((bytetemp & 0x08) >> 1);
        that.tstates += 8;
        var hltemp = ((z80.l | (z80.h << 8)) - 1) & 0xffff;
        z80.h = hltemp >> 8;
        z80.l = hltemp & 0xff;
        var bctemp = ((z80.c | (z80.b << 8)) - 1) & 0xffff;
        z80.b = bctemp >> 8;
        z80.c = bctemp & 0xff;
        z80.f =
          (z80.f & 0x01) |
          (z80.c | (z80.b << 8) ? 0x04 | 0x02 : 0x02) |
          halfcarry_sub_table[lookup] |
          (bytetemp ? 0 : 0x40) |
          (bytetemp & 0x80);
        if (z80.f & 0x10) bytetemp--;
        z80.f |= (bytetemp & 0x08) | (bytetemp & 0x02 ? 0x20 : 0);
      }
      break;
    }
    case 0xaa: {
      {
        var initemp = that.io.readport(z80.c | (z80.b << 8));
        that.tstates += 5;
        that.tstates += 3;
        that.mem.writebyte(z80.l | (z80.h << 8), initemp);
        z80.b = (z80.b - 1) & 0xff;
        var hltemp = ((z80.l | (z80.h << 8)) - 1) & 0xffff;
        z80.h = hltemp >> 8;
        z80.l = hltemp & 0xff;
        z80.f = (initemp & 0x80 ? 0x02 : 0) | sz53_table[z80.b];
      }
      break;
    }
    case 0xab: {
      {
        var outitemp = that.mem.readbyte(z80.l | (z80.h << 8));
        z80.b = (z80.b - 1) & 0xff;
        that.tstates += 5;
        that.tstates += 3;
        var hltemp = ((z80.l | (z80.h << 8)) - 1) & 0xffff;
        z80.h = hltemp >> 8;
        z80.l = hltemp & 0xff;
        that.io.writeport(z80.c | (z80.b << 8), outitemp);
        z80.f = (outitemp & 0x80 ? 0x02 : 0) | sz53_table[z80.b];
      }
      break;
    }
    case 0xb0: {
      {
        var bytetemp = that.mem.readbyte(z80.l | (z80.h << 8));
        that.tstates += 8;
        that.mem.writebyte(z80.e | (z80.d << 8), bytetemp);
        var hltemp = ((z80.l | (z80.h << 8)) + 1) & 0xffff;
        z80.h = hltemp >> 8;
        z80.l = hltemp & 0xff;
        var detemp = ((z80.e | (z80.d << 8)) + 1) & 0xffff;
        z80.d = detemp >> 8;
        z80.e = detemp & 0xff;
        var bctemp = ((z80.c | (z80.b << 8)) - 1) & 0xffff;
        z80.b = bctemp >> 8;
        z80.c = bctemp & 0xff;
        bytetemp = (bytetemp + z80.a) & 0xff;
        z80.f =
          (z80.f & (0x01 | 0x40 | 0x80)) |
          (z80.c | (z80.b << 8) ? 0x04 : 0) |
          (bytetemp & 0x08) |
          (bytetemp & 0x02 ? 0x20 : 0);
        if (z80.c | (z80.b << 8)) {
          that.tstates += 5;
          z80.pc -= 2;
        }
      }
      break;
    }
    case 0xb1: {
      {
        var value = that.mem.readbyte(z80.l | (z80.h << 8)),
          bytetemp = (z80.a - value) & 0xff,
          lookup = ((z80.a & 0x08) >> 3) | ((value & 0x08) >> 2) | ((bytetemp & 0x08) >> 1);
        that.tstates += 8;
        var hltemp = ((z80.l | (z80.h << 8)) + 1) & 0xffff;
        z80.h = hltemp >> 8;
        z80.l = hltemp & 0xff;
        var bctemp = ((z80.c | (z80.b << 8)) - 1) & 0xffff;
        z80.b = bctemp >> 8;
        z80.c = bctemp & 0xff;
        z80.f =
          (z80.f & 0x01) |
          (z80.c | (z80.b << 8) ? 0x04 | 0x02 : 0x02) |
          halfcarry_sub_table[lookup] |
          (bytetemp ? 0 : 0x40) |
          (bytetemp & 0x80);
        if (z80.f & 0x10) bytetemp--;
        z80.f |= (bytetemp & 0x08) | (bytetemp & 0x02 ? 0x20 : 0);
        if ((z80.f & (0x04 | 0x40)) == 0x04) {
          that.tstates += 5;
          z80.pc -= 2;
        }
      }
      break;
    }
    case 0xb2: {
      {
        var initemp = that.io.readport(z80.c | (z80.b << 8));
        that.tstates += 5;
        that.tstates += 3;
        that.mem.writebyte(z80.l | (z80.h << 8), initemp);
        z80.b = (z80.b - 1) & 0xff;
        var hltemp = ((z80.l | (z80.h << 8)) + 1) & 0xffff;
        z80.h = hltemp >> 8;
        z80.l = hltemp & 0xff;
        z80.f = (initemp & 0x80 ? 0x02 : 0) | sz53_table[z80.b];
        if (z80.b) {
          that.tstates += 5;
          z80.pc -= 2;
        }
      }
      break;
    }
    case 0xb3: {
      {
        var outitemp = that.mem.readbyte(z80.l | (z80.h << 8));
        that.tstates += 5;
        z80.b = (z80.b - 1) & 0xff;
        var hltemp = ((z80.l | (z80.h << 8)) + 1) & 0xffff;
        z80.h = hltemp >> 8;
        z80.l = hltemp & 0xff;
        that.io.writeport(z80.c | (z80.b << 8), outitemp);
        z80.f = (outitemp & 0x80 ? 0x02 : 0) | sz53_table[z80.b];
        if (z80.b) {
          that.tstates += 1;
          that.tstates += 7;
          z80.pc -= 2;
        } else {
          that.tstates += 3;
        }
      }
      break;
    }
    case 0xb8: {
      {
        var bytetemp = that.mem.readbyte(z80.l | (z80.h << 8));
        that.tstates += 8;
        that.mem.writebyte(z80.e | (z80.d << 8), bytetemp);
        var hltemp = ((z80.l | (z80.h << 8)) - 1) & 0xffff;
        z80.h = hltemp >> 8;
        z80.l = hltemp & 0xff;
        var detemp = ((z80.e | (z80.d << 8)) - 1) & 0xffff;
        z80.d = detemp >> 8;
        z80.e = detemp & 0xff;
        var bctemp = ((z80.c | (z80.b << 8)) - 1) & 0xffff;
        z80.b = bctemp >> 8;
        z80.c = bctemp & 0xff;
        bytetemp = (bytetemp + z80.a) & 0xff;
        z80.f =
          (z80.f & (0x01 | 0x40 | 0x80)) |
          (z80.c | (z80.b << 8) ? 0x04 : 0) |
          (bytetemp & 0x08) |
          (bytetemp & 0x02 ? 0x20 : 0);
        if (z80.c | (z80.b << 8)) {
          that.tstates += 5;
          z80.pc -= 2;
        }
      }
      break;
    }
    case 0xb9: {
      {
        var value = that.mem.readbyte(z80.l | (z80.h << 8)),
          bytetemp = (z80.a - value) & 0xff,
          lookup = ((z80.a & 0x08) >> 3) | ((value & 0x08) >> 2) | ((bytetemp & 0x08) >> 1);
        that.tstates += 8;
        var hltemp = ((z80.l | (z80.h << 8)) - 1) & 0xffff;
        z80.h = hltemp >> 8;
        z80.l = hltemp & 0xff;
        var bctemp = ((z80.c | (z80.b << 8)) - 1) & 0xffff;
        z80.b = bctemp >> 8;
        z80.c = bctemp & 0xff;
        z80.f =
          (z80.f & 0x01) |
          (z80.c | (z80.b << 8) ? 0x04 | 0x02 : 0x02) |
          halfcarry_sub_table[lookup] |
          (bytetemp ? 0 : 0x40) |
          (bytetemp & 0x80);
        if (z80.f & 0x10) bytetemp--;
        z80.f |= (bytetemp & 0x08) | (bytetemp & 0x02 ? 0x20 : 0);
        if ((z80.f & (0x04 | 0x40)) == 0x04) {
          that.tstates += 5;
          z80.pc -= 2;
        }
      }
      break;
    }
    case 0xba: {
      {
        var initemp = that.io.readport(z80.c | (z80.b << 8));
        that.tstates += 5;
        that.tstates += 3;
        that.mem.writebyte(z80.l | (z80.h << 8), initemp);
        z80.b = (z80.b - 1) & 0xff;
        var hltemp = ((z80.l | (z80.h << 8)) - 1) & 0xffff;
        z80.h = hltemp >> 8;
        z80.l = hltemp & 0xff;
        z80.f = (initemp & 0x80 ? 0x02 : 0) | sz53_table[z80.b];
        if (z80.b) {
          that.tstates += 5;
          z80.pc -= 2;
        }
      }
      break;
    }
    case 0xbb: {
      {
        var outitemp = that.mem.readbyte(z80.l | (z80.h << 8));
        that.tstates += 5;
        z80.b = (z80.b - 1) & 0xff;
        var hltemp = ((z80.l | (z80.h << 8)) - 1) & 0xffff;
        z80.h = hltemp >> 8;
        z80.l = hltemp & 0xff;
        that.io.writeport(z80.c | (z80.b << 8), outitemp);
        z80.f = (outitemp & 0x80 ? 0x02 : 0) | sz53_table[z80.b];
        if (z80.b) {
          that.tstates += 1;
          that.tstates += 7;
          z80.pc -= 2;
        } else {
          that.tstates += 3;
        }
      }
      break;
    }
    case 256: {
      break;
    }
  }
};
const z80_cbxx = (key) => {
  switch (key) {
    case 0x00: {
      {
        z80.b = ((z80.b & 0x7f) << 1) | (z80.b >> 7);
        z80.f = (z80.b & 0x01) | sz53p_table[z80.b];
      }
      break;
    }
    case 0x01: {
      {
        z80.c = ((z80.c & 0x7f) << 1) | (z80.c >> 7);
        z80.f = (z80.c & 0x01) | sz53p_table[z80.c];
      }
      break;
    }
    case 0x02: {
      {
        z80.d = ((z80.d & 0x7f) << 1) | (z80.d >> 7);
        z80.f = (z80.d & 0x01) | sz53p_table[z80.d];
      }
      break;
    }
    case 0x03: {
      {
        z80.e = ((z80.e & 0x7f) << 1) | (z80.e >> 7);
        z80.f = (z80.e & 0x01) | sz53p_table[z80.e];
      }
      break;
    }
    case 0x04: {
      {
        z80.h = ((z80.h & 0x7f) << 1) | (z80.h >> 7);
        z80.f = (z80.h & 0x01) | sz53p_table[z80.h];
      }
      break;
    }
    case 0x05: {
      {
        z80.l = ((z80.l & 0x7f) << 1) | (z80.l >> 7);
        z80.f = (z80.l & 0x01) | sz53p_table[z80.l];
      }
      break;
    }
    case 0x06: {
      {
        var bytetemp = that.mem.readbyte(z80.l | (z80.h << 8));
        that.tstates += 7;
        {
          bytetemp = ((bytetemp & 0x7f) << 1) | (bytetemp >> 7);
          z80.f = (bytetemp & 0x01) | sz53p_table[bytetemp];
        }
        that.mem.writebyte(z80.l | (z80.h << 8), bytetemp);
      }
      break;
    }
    case 0x07: {
      {
        z80.a = ((z80.a & 0x7f) << 1) | (z80.a >> 7);
        z80.f = (z80.a & 0x01) | sz53p_table[z80.a];
      }
      break;
    }
    case 0x08: {
      {
        z80.f = z80.b & 0x01;
        z80.b = (z80.b >> 1) | ((z80.b & 0x01) << 7);
        z80.f |= sz53p_table[z80.b];
      }
      break;
    }
    case 0x09: {
      {
        z80.f = z80.c & 0x01;
        z80.c = (z80.c >> 1) | ((z80.c & 0x01) << 7);
        z80.f |= sz53p_table[z80.c];
      }
      break;
    }
    case 0x0a: {
      {
        z80.f = z80.d & 0x01;
        z80.d = (z80.d >> 1) | ((z80.d & 0x01) << 7);
        z80.f |= sz53p_table[z80.d];
      }
      break;
    }
    case 0x0b: {
      {
        z80.f = z80.e & 0x01;
        z80.e = (z80.e >> 1) | ((z80.e & 0x01) << 7);
        z80.f |= sz53p_table[z80.e];
      }
      break;
    }
    case 0x0c: {
      {
        z80.f = z80.h & 0x01;
        z80.h = (z80.h >> 1) | ((z80.h & 0x01) << 7);
        z80.f |= sz53p_table[z80.h];
      }
      break;
    }
    case 0x0d: {
      {
        z80.f = z80.l & 0x01;
        z80.l = (z80.l >> 1) | ((z80.l & 0x01) << 7);
        z80.f |= sz53p_table[z80.l];
      }
      break;
    }
    case 0x0e: {
      {
        var bytetemp = that.mem.readbyte(z80.l | (z80.h << 8));
        that.tstates += 7;
        {
          z80.f = bytetemp & 0x01;
          bytetemp = (bytetemp >> 1) | ((bytetemp & 0x01) << 7);
          z80.f |= sz53p_table[bytetemp];
        }
        that.mem.writebyte(z80.l | (z80.h << 8), bytetemp);
      }
      break;
    }
    case 0x0f: {
      {
        z80.f = z80.a & 0x01;
        z80.a = (z80.a >> 1) | ((z80.a & 0x01) << 7);
        z80.f |= sz53p_table[z80.a];
      }
      break;
    }
    case 0x10: {
      {
        var rltemp = z80.b;
        z80.b = ((z80.b & 0x7f) << 1) | (z80.f & 0x01);
        z80.f = (rltemp >> 7) | sz53p_table[z80.b];
      }
      break;
    }
    case 0x11: {
      {
        var rltemp = z80.c;
        z80.c = ((z80.c & 0x7f) << 1) | (z80.f & 0x01);
        z80.f = (rltemp >> 7) | sz53p_table[z80.c];
      }
      break;
    }
    case 0x12: {
      {
        var rltemp = z80.d;
        z80.d = ((z80.d & 0x7f) << 1) | (z80.f & 0x01);
        z80.f = (rltemp >> 7) | sz53p_table[z80.d];
      }
      break;
    }
    case 0x13: {
      {
        var rltemp = z80.e;
        z80.e = ((z80.e & 0x7f) << 1) | (z80.f & 0x01);
        z80.f = (rltemp >> 7) | sz53p_table[z80.e];
      }
      break;
    }
    case 0x14: {
      {
        var rltemp = z80.h;
        z80.h = ((z80.h & 0x7f) << 1) | (z80.f & 0x01);
        z80.f = (rltemp >> 7) | sz53p_table[z80.h];
      }
      break;
    }
    case 0x15: {
      {
        var rltemp = z80.l;
        z80.l = ((z80.l & 0x7f) << 1) | (z80.f & 0x01);
        z80.f = (rltemp >> 7) | sz53p_table[z80.l];
      }
      break;
    }
    case 0x16: {
      {
        var bytetemp = that.mem.readbyte(z80.l | (z80.h << 8));
        that.tstates += 7;
        {
          var rltemp = bytetemp;
          bytetemp = ((bytetemp & 0x7f) << 1) | (z80.f & 0x01);
          z80.f = (rltemp >> 7) | sz53p_table[bytetemp];
        }
        that.mem.writebyte(z80.l | (z80.h << 8), bytetemp);
      }
      break;
    }
    case 0x17: {
      {
        var rltemp = z80.a;
        z80.a = ((z80.a & 0x7f) << 1) | (z80.f & 0x01);
        z80.f = (rltemp >> 7) | sz53p_table[z80.a];
      }
      break;
    }
    case 0x18: {
      {
        var rrtemp = z80.b;
        z80.b = (z80.b >> 1) | ((z80.f & 0x01) << 7);
        z80.f = (rrtemp & 0x01) | sz53p_table[z80.b];
      }
      break;
    }
    case 0x19: {
      {
        var rrtemp = z80.c;
        z80.c = (z80.c >> 1) | ((z80.f & 0x01) << 7);
        z80.f = (rrtemp & 0x01) | sz53p_table[z80.c];
      }
      break;
    }
    case 0x1a: {
      {
        var rrtemp = z80.d;
        z80.d = (z80.d >> 1) | ((z80.f & 0x01) << 7);
        z80.f = (rrtemp & 0x01) | sz53p_table[z80.d];
      }
      break;
    }
    case 0x1b: {
      {
        var rrtemp = z80.e;
        z80.e = (z80.e >> 1) | ((z80.f & 0x01) << 7);
        z80.f = (rrtemp & 0x01) | sz53p_table[z80.e];
      }
      break;
    }
    case 0x1c: {
      {
        var rrtemp = z80.h;
        z80.h = (z80.h >> 1) | ((z80.f & 0x01) << 7);
        z80.f = (rrtemp & 0x01) | sz53p_table[z80.h];
      }
      break;
    }
    case 0x1d: {
      {
        var rrtemp = z80.l;
        z80.l = (z80.l >> 1) | ((z80.f & 0x01) << 7);
        z80.f = (rrtemp & 0x01) | sz53p_table[z80.l];
      }
      break;
    }
    case 0x1e: {
      {
        var bytetemp = that.mem.readbyte(z80.l | (z80.h << 8));
        that.tstates += 7;
        {
          var rrtemp = bytetemp;
          bytetemp = (bytetemp >> 1) | ((z80.f & 0x01) << 7);
          z80.f = (rrtemp & 0x01) | sz53p_table[bytetemp];
        }
        that.mem.writebyte(z80.l | (z80.h << 8), bytetemp);
      }
      break;
    }
    case 0x1f: {
      {
        var rrtemp = z80.a;
        z80.a = (z80.a >> 1) | ((z80.f & 0x01) << 7);
        z80.f = (rrtemp & 0x01) | sz53p_table[z80.a];
      }
      break;
    }
    case 0x20: {
      {
        z80.f = z80.b >> 7;
        z80.b <<= 1;
        z80.b &= 0xff;
        z80.f |= sz53p_table[z80.b];
      }
      break;
    }
    case 0x21: {
      {
        z80.f = z80.c >> 7;
        z80.c <<= 1;
        z80.c &= 0xff;
        z80.f |= sz53p_table[z80.c];
      }
      break;
    }
    case 0x22: {
      {
        z80.f = z80.d >> 7;
        z80.d <<= 1;
        z80.d &= 0xff;
        z80.f |= sz53p_table[z80.d];
      }
      break;
    }
    case 0x23: {
      {
        z80.f = z80.e >> 7;
        z80.e <<= 1;
        z80.e &= 0xff;
        z80.f |= sz53p_table[z80.e];
      }
      break;
    }
    case 0x24: {
      {
        z80.f = z80.h >> 7;
        z80.h <<= 1;
        z80.h &= 0xff;
        z80.f |= sz53p_table[z80.h];
      }
      break;
    }
    case 0x25: {
      {
        z80.f = z80.l >> 7;
        z80.l <<= 1;
        z80.l &= 0xff;
        z80.f |= sz53p_table[z80.l];
      }
      break;
    }
    case 0x26: {
      {
        var bytetemp = that.mem.readbyte(z80.l | (z80.h << 8));
        that.tstates += 7;
        {
          z80.f = bytetemp >> 7;
          bytetemp <<= 1;
          bytetemp &= 0xff;
          z80.f |= sz53p_table[bytetemp];
        }
        that.mem.writebyte(z80.l | (z80.h << 8), bytetemp);
      }
      break;
    }
    case 0x27: {
      {
        z80.f = z80.a >> 7;
        z80.a <<= 1;
        z80.a &= 0xff;
        z80.f |= sz53p_table[z80.a];
      }
      break;
    }
    case 0x28: {
      {
        z80.f = z80.b & 0x01;
        z80.b = (z80.b & 0x80) | (z80.b >> 1);
        z80.f |= sz53p_table[z80.b];
      }
      break;
    }
    case 0x29: {
      {
        z80.f = z80.c & 0x01;
        z80.c = (z80.c & 0x80) | (z80.c >> 1);
        z80.f |= sz53p_table[z80.c];
      }
      break;
    }
    case 0x2a: {
      {
        z80.f = z80.d & 0x01;
        z80.d = (z80.d & 0x80) | (z80.d >> 1);
        z80.f |= sz53p_table[z80.d];
      }
      break;
    }
    case 0x2b: {
      {
        z80.f = z80.e & 0x01;
        z80.e = (z80.e & 0x80) | (z80.e >> 1);
        z80.f |= sz53p_table[z80.e];
      }
      break;
    }
    case 0x2c: {
      {
        z80.f = z80.h & 0x01;
        z80.h = (z80.h & 0x80) | (z80.h >> 1);
        z80.f |= sz53p_table[z80.h];
      }
      break;
    }
    case 0x2d: {
      {
        z80.f = z80.l & 0x01;
        z80.l = (z80.l & 0x80) | (z80.l >> 1);
        z80.f |= sz53p_table[z80.l];
      }
      break;
    }
    case 0x2e: {
      {
        var bytetemp = that.mem.readbyte(z80.l | (z80.h << 8));
        that.tstates += 7;
        {
          z80.f = bytetemp & 0x01;
          bytetemp = (bytetemp & 0x80) | (bytetemp >> 1);
          z80.f |= sz53p_table[bytetemp];
        }
        that.mem.writebyte(z80.l | (z80.h << 8), bytetemp);
      }
      break;
    }
    case 0x2f: {
      {
        z80.f = z80.a & 0x01;
        z80.a = (z80.a & 0x80) | (z80.a >> 1);
        z80.f |= sz53p_table[z80.a];
      }
      break;
    }
    case 0x30: {
      {
        z80.f = z80.b >> 7;
        z80.b = (z80.b << 1) | 0x01;
        z80.b &= 0xff;
        z80.f |= sz53p_table[z80.b];
      }
      break;
    }
    case 0x31: {
      {
        z80.f = z80.c >> 7;
        z80.c = (z80.c << 1) | 0x01;
        z80.c &= 0xff;
        z80.f |= sz53p_table[z80.c];
      }
      break;
    }
    case 0x32: {
      {
        z80.f = z80.d >> 7;
        z80.d = (z80.d << 1) | 0x01;
        z80.d &= 0xff;
        z80.f |= sz53p_table[z80.d];
      }
      break;
    }
    case 0x33: {
      {
        z80.f = z80.e >> 7;
        z80.e = (z80.e << 1) | 0x01;
        z80.e &= 0xff;
        z80.f |= sz53p_table[z80.e];
      }
      break;
    }
    case 0x34: {
      {
        z80.f = z80.h >> 7;
        z80.h = (z80.h << 1) | 0x01;
        z80.h &= 0xff;
        z80.f |= sz53p_table[z80.h];
      }
      break;
    }
    case 0x35: {
      {
        z80.f = z80.l >> 7;
        z80.l = (z80.l << 1) | 0x01;
        z80.l &= 0xff;
        z80.f |= sz53p_table[z80.l];
      }
      break;
    }
    case 0x36: {
      {
        var bytetemp = that.mem.readbyte(z80.l | (z80.h << 8));
        that.tstates += 7;
        {
          z80.f = bytetemp >> 7;
          bytetemp = (bytetemp << 1) | 0x01;
          bytetemp &= 0xff;
          z80.f |= sz53p_table[bytetemp];
        }
        that.mem.writebyte(z80.l | (z80.h << 8), bytetemp);
      }
      break;
    }
    case 0x37: {
      {
        z80.f = z80.a >> 7;
        z80.a = (z80.a << 1) | 0x01;
        z80.a &= 0xff;
        z80.f |= sz53p_table[z80.a];
      }
      break;
    }
    case 0x38: {
      {
        z80.f = z80.b & 0x01;
        z80.b >>= 1;
        z80.f |= sz53p_table[z80.b];
      }
      break;
    }
    case 0x39: {
      {
        z80.f = z80.c & 0x01;
        z80.c >>= 1;
        z80.f |= sz53p_table[z80.c];
      }
      break;
    }
    case 0x3a: {
      {
        z80.f = z80.d & 0x01;
        z80.d >>= 1;
        z80.f |= sz53p_table[z80.d];
      }
      break;
    }
    case 0x3b: {
      {
        z80.f = z80.e & 0x01;
        z80.e >>= 1;
        z80.f |= sz53p_table[z80.e];
      }
      break;
    }
    case 0x3c: {
      {
        z80.f = z80.h & 0x01;
        z80.h >>= 1;
        z80.f |= sz53p_table[z80.h];
      }
      break;
    }
    case 0x3d: {
      {
        z80.f = z80.l & 0x01;
        z80.l >>= 1;
        z80.f |= sz53p_table[z80.l];
      }
      break;
    }
    case 0x3e: {
      {
        var bytetemp = that.mem.readbyte(z80.l | (z80.h << 8));
        that.tstates += 7;
        {
          z80.f = bytetemp & 0x01;
          bytetemp >>= 1;
          z80.f |= sz53p_table[bytetemp];
        }
        that.mem.writebyte(z80.l | (z80.h << 8), bytetemp);
      }
      break;
    }
    case 0x3f: {
      {
        z80.f = z80.a & 0x01;
        z80.a >>= 1;
        z80.f |= sz53p_table[z80.a];
      }
      break;
    }
    case 0x40: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.b & (0x08 | 0x20));
        if (!(z80.b & (0x01 << 0))) z80.f |= 0x04 | 0x40;
        if (0 == 7 && z80.b & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x41: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.c & (0x08 | 0x20));
        if (!(z80.c & (0x01 << 0))) z80.f |= 0x04 | 0x40;
        if (0 == 7 && z80.c & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x42: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.d & (0x08 | 0x20));
        if (!(z80.d & (0x01 << 0))) z80.f |= 0x04 | 0x40;
        if (0 == 7 && z80.d & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x43: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.e & (0x08 | 0x20));
        if (!(z80.e & (0x01 << 0))) z80.f |= 0x04 | 0x40;
        if (0 == 7 && z80.e & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x44: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.h & (0x08 | 0x20));
        if (!(z80.h & (0x01 << 0))) z80.f |= 0x04 | 0x40;
        if (0 == 7 && z80.h & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x45: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.l & (0x08 | 0x20));
        if (!(z80.l & (0x01 << 0))) z80.f |= 0x04 | 0x40;
        if (0 == 7 && z80.l & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x46: {
      {
        var bytetemp = that.mem.readbyte(z80.l | (z80.h << 8));
        that.tstates += 4;
        {
          z80.f = (z80.f & 0x01) | 0x10 | (bytetemp & (0x08 | 0x20));
          if (!(bytetemp & (0x01 << 0))) z80.f |= 0x04 | 0x40;
          if (0 == 7 && bytetemp & 0x80) z80.f |= 0x80;
        }
      }
      break;
    }
    case 0x47: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.a & (0x08 | 0x20));
        if (!(z80.a & (0x01 << 0))) z80.f |= 0x04 | 0x40;
        if (0 == 7 && z80.a & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x48: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.b & (0x08 | 0x20));
        if (!(z80.b & (0x01 << 1))) z80.f |= 0x04 | 0x40;
        if (1 == 7 && z80.b & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x49: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.c & (0x08 | 0x20));
        if (!(z80.c & (0x01 << 1))) z80.f |= 0x04 | 0x40;
        if (1 == 7 && z80.c & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x4a: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.d & (0x08 | 0x20));
        if (!(z80.d & (0x01 << 1))) z80.f |= 0x04 | 0x40;
        if (1 == 7 && z80.d & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x4b: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.e & (0x08 | 0x20));
        if (!(z80.e & (0x01 << 1))) z80.f |= 0x04 | 0x40;
        if (1 == 7 && z80.e & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x4c: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.h & (0x08 | 0x20));
        if (!(z80.h & (0x01 << 1))) z80.f |= 0x04 | 0x40;
        if (1 == 7 && z80.h & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x4d: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.l & (0x08 | 0x20));
        if (!(z80.l & (0x01 << 1))) z80.f |= 0x04 | 0x40;
        if (1 == 7 && z80.l & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x4e: {
      {
        var bytetemp = that.mem.readbyte(z80.l | (z80.h << 8));
        that.tstates += 4;
        {
          z80.f = (z80.f & 0x01) | 0x10 | (bytetemp & (0x08 | 0x20));
          if (!(bytetemp & (0x01 << 1))) z80.f |= 0x04 | 0x40;
          if (1 == 7 && bytetemp & 0x80) z80.f |= 0x80;
        }
      }
      break;
    }
    case 0x4f: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.a & (0x08 | 0x20));
        if (!(z80.a & (0x01 << 1))) z80.f |= 0x04 | 0x40;
        if (1 == 7 && z80.a & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x50: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.b & (0x08 | 0x20));
        if (!(z80.b & (0x01 << 2))) z80.f |= 0x04 | 0x40;
        if (2 == 7 && z80.b & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x51: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.c & (0x08 | 0x20));
        if (!(z80.c & (0x01 << 2))) z80.f |= 0x04 | 0x40;
        if (2 == 7 && z80.c & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x52: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.d & (0x08 | 0x20));
        if (!(z80.d & (0x01 << 2))) z80.f |= 0x04 | 0x40;
        if (2 == 7 && z80.d & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x53: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.e & (0x08 | 0x20));
        if (!(z80.e & (0x01 << 2))) z80.f |= 0x04 | 0x40;
        if (2 == 7 && z80.e & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x54: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.h & (0x08 | 0x20));
        if (!(z80.h & (0x01 << 2))) z80.f |= 0x04 | 0x40;
        if (2 == 7 && z80.h & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x55: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.l & (0x08 | 0x20));
        if (!(z80.l & (0x01 << 2))) z80.f |= 0x04 | 0x40;
        if (2 == 7 && z80.l & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x56: {
      {
        var bytetemp = that.mem.readbyte(z80.l | (z80.h << 8));
        that.tstates += 4;
        {
          z80.f = (z80.f & 0x01) | 0x10 | (bytetemp & (0x08 | 0x20));
          if (!(bytetemp & (0x01 << 2))) z80.f |= 0x04 | 0x40;
          if (2 == 7 && bytetemp & 0x80) z80.f |= 0x80;
        }
      }
      break;
    }
    case 0x57: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.a & (0x08 | 0x20));
        if (!(z80.a & (0x01 << 2))) z80.f |= 0x04 | 0x40;
        if (2 == 7 && z80.a & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x58: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.b & (0x08 | 0x20));
        if (!(z80.b & (0x01 << 3))) z80.f |= 0x04 | 0x40;
        if (3 == 7 && z80.b & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x59: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.c & (0x08 | 0x20));
        if (!(z80.c & (0x01 << 3))) z80.f |= 0x04 | 0x40;
        if (3 == 7 && z80.c & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x5a: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.d & (0x08 | 0x20));
        if (!(z80.d & (0x01 << 3))) z80.f |= 0x04 | 0x40;
        if (3 == 7 && z80.d & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x5b: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.e & (0x08 | 0x20));
        if (!(z80.e & (0x01 << 3))) z80.f |= 0x04 | 0x40;
        if (3 == 7 && z80.e & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x5c: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.h & (0x08 | 0x20));
        if (!(z80.h & (0x01 << 3))) z80.f |= 0x04 | 0x40;
        if (3 == 7 && z80.h & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x5d: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.l & (0x08 | 0x20));
        if (!(z80.l & (0x01 << 3))) z80.f |= 0x04 | 0x40;
        if (3 == 7 && z80.l & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x5e: {
      {
        var bytetemp = that.mem.readbyte(z80.l | (z80.h << 8));
        that.tstates += 4;
        {
          z80.f = (z80.f & 0x01) | 0x10 | (bytetemp & (0x08 | 0x20));
          if (!(bytetemp & (0x01 << 3))) z80.f |= 0x04 | 0x40;
          if (3 == 7 && bytetemp & 0x80) z80.f |= 0x80;
        }
      }
      break;
    }
    case 0x5f: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.a & (0x08 | 0x20));
        if (!(z80.a & (0x01 << 3))) z80.f |= 0x04 | 0x40;
        if (3 == 7 && z80.a & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x60: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.b & (0x08 | 0x20));
        if (!(z80.b & (0x01 << 4))) z80.f |= 0x04 | 0x40;
        if (4 == 7 && z80.b & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x61: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.c & (0x08 | 0x20));
        if (!(z80.c & (0x01 << 4))) z80.f |= 0x04 | 0x40;
        if (4 == 7 && z80.c & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x62: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.d & (0x08 | 0x20));
        if (!(z80.d & (0x01 << 4))) z80.f |= 0x04 | 0x40;
        if (4 == 7 && z80.d & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x63: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.e & (0x08 | 0x20));
        if (!(z80.e & (0x01 << 4))) z80.f |= 0x04 | 0x40;
        if (4 == 7 && z80.e & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x64: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.h & (0x08 | 0x20));
        if (!(z80.h & (0x01 << 4))) z80.f |= 0x04 | 0x40;
        if (4 == 7 && z80.h & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x65: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.l & (0x08 | 0x20));
        if (!(z80.l & (0x01 << 4))) z80.f |= 0x04 | 0x40;
        if (4 == 7 && z80.l & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x66: {
      {
        var bytetemp = that.mem.readbyte(z80.l | (z80.h << 8));
        that.tstates += 4;
        {
          z80.f = (z80.f & 0x01) | 0x10 | (bytetemp & (0x08 | 0x20));
          if (!(bytetemp & (0x01 << 4))) z80.f |= 0x04 | 0x40;
          if (4 == 7 && bytetemp & 0x80) z80.f |= 0x80;
        }
      }
      break;
    }
    case 0x67: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.a & (0x08 | 0x20));
        if (!(z80.a & (0x01 << 4))) z80.f |= 0x04 | 0x40;
        if (4 == 7 && z80.a & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x68: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.b & (0x08 | 0x20));
        if (!(z80.b & (0x01 << 5))) z80.f |= 0x04 | 0x40;
        if (5 == 7 && z80.b & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x69: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.c & (0x08 | 0x20));
        if (!(z80.c & (0x01 << 5))) z80.f |= 0x04 | 0x40;
        if (5 == 7 && z80.c & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x6a: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.d & (0x08 | 0x20));
        if (!(z80.d & (0x01 << 5))) z80.f |= 0x04 | 0x40;
        if (5 == 7 && z80.d & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x6b: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.e & (0x08 | 0x20));
        if (!(z80.e & (0x01 << 5))) z80.f |= 0x04 | 0x40;
        if (5 == 7 && z80.e & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x6c: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.h & (0x08 | 0x20));
        if (!(z80.h & (0x01 << 5))) z80.f |= 0x04 | 0x40;
        if (5 == 7 && z80.h & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x6d: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.l & (0x08 | 0x20));
        if (!(z80.l & (0x01 << 5))) z80.f |= 0x04 | 0x40;
        if (5 == 7 && z80.l & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x6e: {
      {
        var bytetemp = that.mem.readbyte(z80.l | (z80.h << 8));
        that.tstates += 4;
        {
          z80.f = (z80.f & 0x01) | 0x10 | (bytetemp & (0x08 | 0x20));
          if (!(bytetemp & (0x01 << 5))) z80.f |= 0x04 | 0x40;
          if (5 == 7 && bytetemp & 0x80) z80.f |= 0x80;
        }
      }
      break;
    }
    case 0x6f: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.a & (0x08 | 0x20));
        if (!(z80.a & (0x01 << 5))) z80.f |= 0x04 | 0x40;
        if (5 == 7 && z80.a & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x70: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.b & (0x08 | 0x20));
        if (!(z80.b & (0x01 << 6))) z80.f |= 0x04 | 0x40;
        if (6 == 7 && z80.b & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x71: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.c & (0x08 | 0x20));
        if (!(z80.c & (0x01 << 6))) z80.f |= 0x04 | 0x40;
        if (6 == 7 && z80.c & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x72: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.d & (0x08 | 0x20));
        if (!(z80.d & (0x01 << 6))) z80.f |= 0x04 | 0x40;
        if (6 == 7 && z80.d & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x73: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.e & (0x08 | 0x20));
        if (!(z80.e & (0x01 << 6))) z80.f |= 0x04 | 0x40;
        if (6 == 7 && z80.e & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x74: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.h & (0x08 | 0x20));
        if (!(z80.h & (0x01 << 6))) z80.f |= 0x04 | 0x40;
        if (6 == 7 && z80.h & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x75: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.l & (0x08 | 0x20));
        if (!(z80.l & (0x01 << 6))) z80.f |= 0x04 | 0x40;
        if (6 == 7 && z80.l & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x76: {
      {
        var bytetemp = that.mem.readbyte(z80.l | (z80.h << 8));
        that.tstates += 4;
        {
          z80.f = (z80.f & 0x01) | 0x10 | (bytetemp & (0x08 | 0x20));
          if (!(bytetemp & (0x01 << 6))) z80.f |= 0x04 | 0x40;
          if (6 == 7 && bytetemp & 0x80) z80.f |= 0x80;
        }
      }
      break;
    }
    case 0x77: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.a & (0x08 | 0x20));
        if (!(z80.a & (0x01 << 6))) z80.f |= 0x04 | 0x40;
        if (6 == 7 && z80.a & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x78: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.b & (0x08 | 0x20));
        if (!(z80.b & (0x01 << 7))) z80.f |= 0x04 | 0x40;
        if (7 == 7 && z80.b & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x79: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.c & (0x08 | 0x20));
        if (!(z80.c & (0x01 << 7))) z80.f |= 0x04 | 0x40;
        if (7 == 7 && z80.c & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x7a: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.d & (0x08 | 0x20));
        if (!(z80.d & (0x01 << 7))) z80.f |= 0x04 | 0x40;
        if (7 == 7 && z80.d & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x7b: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.e & (0x08 | 0x20));
        if (!(z80.e & (0x01 << 7))) z80.f |= 0x04 | 0x40;
        if (7 == 7 && z80.e & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x7c: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.h & (0x08 | 0x20));
        if (!(z80.h & (0x01 << 7))) z80.f |= 0x04 | 0x40;
        if (7 == 7 && z80.h & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x7d: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.l & (0x08 | 0x20));
        if (!(z80.l & (0x01 << 7))) z80.f |= 0x04 | 0x40;
        if (7 == 7 && z80.l & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x7e: {
      {
        var bytetemp = that.mem.readbyte(z80.l | (z80.h << 8));
        that.tstates += 4;
        {
          z80.f = (z80.f & 0x01) | 0x10 | (bytetemp & (0x08 | 0x20));
          if (!(bytetemp & (0x01 << 7))) z80.f |= 0x04 | 0x40;
          if (7 == 7 && bytetemp & 0x80) z80.f |= 0x80;
        }
      }
      break;
    }
    case 0x7f: {
      {
        z80.f = (z80.f & 0x01) | 0x10 | (z80.a & (0x08 | 0x20));
        if (!(z80.a & (0x01 << 7))) z80.f |= 0x04 | 0x40;
        if (7 == 7 && z80.a & 0x80) z80.f |= 0x80;
      }
      break;
    }
    case 0x80: {
      z80.b &= 0xfe;
      break;
    }
    case 0x81: {
      z80.c &= 0xfe;
      break;
    }
    case 0x82: {
      z80.d &= 0xfe;
      break;
    }
    case 0x83: {
      z80.e &= 0xfe;
      break;
    }
    case 0x84: {
      z80.h &= 0xfe;
      break;
    }
    case 0x85: {
      z80.l &= 0xfe;
      break;
    }
    case 0x86: {
      that.tstates += 7;
      that.mem.writebyte(z80.l | (z80.h << 8), that.mem.readbyte(z80.l | (z80.h << 8)) & 0xfe);
      break;
    }
    case 0x87: {
      z80.a &= 0xfe;
      break;
    }
    case 0x88: {
      z80.b &= 0xfd;
      break;
    }
    case 0x89: {
      z80.c &= 0xfd;
      break;
    }
    case 0x8a: {
      z80.d &= 0xfd;
      break;
    }
    case 0x8b: {
      z80.e &= 0xfd;
      break;
    }
    case 0x8c: {
      z80.h &= 0xfd;
      break;
    }
    case 0x8d: {
      z80.l &= 0xfd;
      break;
    }
    case 0x8e: {
      that.tstates += 7;
      that.mem.writebyte(z80.l | (z80.h << 8), that.mem.readbyte(z80.l | (z80.h << 8)) & 0xfd);
      break;
    }
    case 0x8f: {
      z80.a &= 0xfd;
      break;
    }
    case 0x90: {
      z80.b &= 0xfb;
      break;
    }
    case 0x91: {
      z80.c &= 0xfb;
      break;
    }
    case 0x92: {
      z80.d &= 0xfb;
      break;
    }
    case 0x93: {
      z80.e &= 0xfb;
      break;
    }
    case 0x94: {
      z80.h &= 0xfb;
      break;
    }
    case 0x95: {
      z80.l &= 0xfb;
      break;
    }
    case 0x96: {
      that.tstates += 7;
      that.mem.writebyte(z80.l | (z80.h << 8), that.mem.readbyte(z80.l | (z80.h << 8)) & 0xfb);
      break;
    }
    case 0x97: {
      z80.a &= 0xfb;
      break;
    }
    case 0x98: {
      z80.b &= 0xf7;
      break;
    }
    case 0x99: {
      z80.c &= 0xf7;
      break;
    }
    case 0x9a: {
      z80.d &= 0xf7;
      break;
    }
    case 0x9b: {
      z80.e &= 0xf7;
      break;
    }
    case 0x9c: {
      z80.h &= 0xf7;
      break;
    }
    case 0x9d: {
      z80.l &= 0xf7;
      break;
    }
    case 0x9e: {
      that.tstates += 7;
      that.mem.writebyte(z80.l | (z80.h << 8), that.mem.readbyte(z80.l | (z80.h << 8)) & 0xf7);
      break;
    }
    case 0x9f: {
      z80.a &= 0xf7;
      break;
    }
    case 0xa0: {
      z80.b &= 0xef;
      break;
    }
    case 0xa1: {
      z80.c &= 0xef;
      break;
    }
    case 0xa2: {
      z80.d &= 0xef;
      break;
    }
    case 0xa3: {
      z80.e &= 0xef;
      break;
    }
    case 0xa4: {
      z80.h &= 0xef;
      break;
    }
    case 0xa5: {
      z80.l &= 0xef;
      break;
    }
    case 0xa6: {
      that.tstates += 7;
      that.mem.writebyte(z80.l | (z80.h << 8), that.mem.readbyte(z80.l | (z80.h << 8)) & 0xef);
      break;
    }
    case 0xa7: {
      z80.a &= 0xef;
      break;
    }
    case 0xa8: {
      z80.b &= 0xdf;
      break;
    }
    case 0xa9: {
      z80.c &= 0xdf;
      break;
    }
    case 0xaa: {
      z80.d &= 0xdf;
      break;
    }
    case 0xab: {
      z80.e &= 0xdf;
      break;
    }
    case 0xac: {
      z80.h &= 0xdf;
      break;
    }
    case 0xad: {
      z80.l &= 0xdf;
      break;
    }
    case 0xae: {
      that.tstates += 7;
      that.mem.writebyte(z80.l | (z80.h << 8), that.mem.readbyte(z80.l | (z80.h << 8)) & 0xdf);
      break;
    }
    case 0xaf: {
      z80.a &= 0xdf;
      break;
    }
    case 0xb0: {
      z80.b &= 0xbf;
      break;
    }
    case 0xb1: {
      z80.c &= 0xbf;
      break;
    }
    case 0xb2: {
      z80.d &= 0xbf;
      break;
    }
    case 0xb3: {
      z80.e &= 0xbf;
      break;
    }
    case 0xb4: {
      z80.h &= 0xbf;
      break;
    }
    case 0xb5: {
      z80.l &= 0xbf;
      break;
    }
    case 0xb6: {
      that.tstates += 7;
      that.mem.writebyte(z80.l | (z80.h << 8), that.mem.readbyte(z80.l | (z80.h << 8)) & 0xbf);
      break;
    }
    case 0xb7: {
      z80.a &= 0xbf;
      break;
    }
    case 0xb8: {
      z80.b &= 0x7f;
      break;
    }
    case 0xb9: {
      z80.c &= 0x7f;
      break;
    }
    case 0xba: {
      z80.d &= 0x7f;
      break;
    }
    case 0xbb: {
      z80.e &= 0x7f;
      break;
    }
    case 0xbc: {
      z80.h &= 0x7f;
      break;
    }
    case 0xbd: {
      z80.l &= 0x7f;
      break;
    }
    case 0xbe: {
      that.tstates += 7;
      that.mem.writebyte(z80.l | (z80.h << 8), that.mem.readbyte(z80.l | (z80.h << 8)) & 0x7f);
      break;
    }
    case 0xbf: {
      z80.a &= 0x7f;
      break;
    }
    case 0xc0: {
      z80.b |= 0x01;
      break;
    }
    case 0xc1: {
      z80.c |= 0x01;
      break;
    }
    case 0xc2: {
      z80.d |= 0x01;
      break;
    }
    case 0xc3: {
      z80.e |= 0x01;
      break;
    }
    case 0xc4: {
      z80.h |= 0x01;
      break;
    }
    case 0xc5: {
      z80.l |= 0x01;
      break;
    }
    case 0xc6: {
      that.tstates += 7;
      that.mem.writebyte(z80.l | (z80.h << 8), that.mem.readbyte(z80.l | (z80.h << 8)) | 0x01);
      break;
    }
    case 0xc7: {
      z80.a |= 0x01;
      break;
    }
    case 0xc8: {
      z80.b |= 0x02;
      break;
    }
    case 0xc9: {
      z80.c |= 0x02;
      break;
    }
    case 0xca: {
      z80.d |= 0x02;
      break;
    }
    case 0xcb: {
      z80.e |= 0x02;
      break;
    }
    case 0xcc: {
      z80.h |= 0x02;
      break;
    }
    case 0xcd: {
      z80.l |= 0x02;
      break;
    }
    case 0xce: {
      that.tstates += 7;
      that.mem.writebyte(z80.l | (z80.h << 8), that.mem.readbyte(z80.l | (z80.h << 8)) | 0x02);
      break;
    }
    case 0xcf: {
      z80.a |= 0x02;
      break;
    }
    case 0xd0: {
      z80.b |= 0x04;
      break;
    }
    case 0xd1: {
      z80.c |= 0x04;
      break;
    }
    case 0xd2: {
      z80.d |= 0x04;
      break;
    }
    case 0xd3: {
      z80.e |= 0x04;
      break;
    }
    case 0xd4: {
      z80.h |= 0x04;
      break;
    }
    case 0xd5: {
      z80.l |= 0x04;
      break;
    }
    case 0xd6: {
      that.tstates += 7;
      that.mem.writebyte(z80.l | (z80.h << 8), that.mem.readbyte(z80.l | (z80.h << 8)) | 0x04);
      break;
    }
    case 0xd7: {
      z80.a |= 0x04;
      break;
    }
    case 0xd8: {
      z80.b |= 0x08;
      break;
    }
    case 0xd9: {
      z80.c |= 0x08;
      break;
    }
    case 0xda: {
      z80.d |= 0x08;
      break;
    }
    case 0xdb: {
      z80.e |= 0x08;
      break;
    }
    case 0xdc: {
      z80.h |= 0x08;
      break;
    }
    case 0xdd: {
      z80.l |= 0x08;
      break;
    }
    case 0xde: {
      that.tstates += 7;
      that.mem.writebyte(z80.l | (z80.h << 8), that.mem.readbyte(z80.l | (z80.h << 8)) | 0x08);
      break;
    }
    case 0xdf: {
      z80.a |= 0x08;
      break;
    }
    case 0xe0: {
      z80.b |= 0x10;
      break;
    }
    case 0xe1: {
      z80.c |= 0x10;
      break;
    }
    case 0xe2: {
      z80.d |= 0x10;
      break;
    }
    case 0xe3: {
      z80.e |= 0x10;
      break;
    }
    case 0xe4: {
      z80.h |= 0x10;
      break;
    }
    case 0xe5: {
      z80.l |= 0x10;
      break;
    }
    case 0xe6: {
      that.tstates += 7;
      that.mem.writebyte(z80.l | (z80.h << 8), that.mem.readbyte(z80.l | (z80.h << 8)) | 0x10);
      break;
    }
    case 0xe7: {
      z80.a |= 0x10;
      break;
    }
    case 0xe8: {
      z80.b |= 0x20;
      break;
    }
    case 0xe9: {
      z80.c |= 0x20;
      break;
    }
    case 0xea: {
      z80.d |= 0x20;
      break;
    }
    case 0xeb: {
      z80.e |= 0x20;
      break;
    }
    case 0xec: {
      z80.h |= 0x20;
      break;
    }
    case 0xed: {
      z80.l |= 0x20;
      break;
    }
    case 0xee: {
      that.tstates += 7;
      that.mem.writebyte(z80.l | (z80.h << 8), that.mem.readbyte(z80.l | (z80.h << 8)) | 0x20);
      break;
    }
    case 0xef: {
      z80.a |= 0x20;
      break;
    }
    case 0xf0: {
      z80.b |= 0x40;
      break;
    }
    case 0xf1: {
      z80.c |= 0x40;
      break;
    }
    case 0xf2: {
      z80.d |= 0x40;
      break;
    }
    case 0xf3: {
      z80.e |= 0x40;
      break;
    }
    case 0xf4: {
      z80.h |= 0x40;
      break;
    }
    case 0xf5: {
      z80.l |= 0x40;
      break;
    }
    case 0xf6: {
      that.tstates += 7;
      that.mem.writebyte(z80.l | (z80.h << 8), that.mem.readbyte(z80.l | (z80.h << 8)) | 0x40);
      break;
    }
    case 0xf7: {
      z80.a |= 0x40;
      break;
    }
    case 0xf8: {
      z80.b |= 0x80;
      break;
    }
    case 0xf9: {
      z80.c |= 0x80;
      break;
    }
    case 0xfa: {
      z80.d |= 0x80;
      break;
    }
    case 0xfb: {
      z80.e |= 0x80;
      break;
    }
    case 0xfc: {
      z80.h |= 0x80;
      break;
    }
    case 0xfd: {
      z80.l |= 0x80;
      break;
    }
    case 0xfe: {
      that.tstates += 7;
      that.mem.writebyte(z80.l | (z80.h << 8), that.mem.readbyte(z80.l | (z80.h << 8)) | 0x80);
      break;
    }
    case 0xff: {
      z80.a |= 0x80;
      break;
    }
    case 256: {
      break;
    }
  }
};
const z80_ddxx = (key) => {
  switch (key) {
    case 0x09: {
      {
        var add16temp = (z80.ixl | (z80.ixh << 8)) + (z80.c | (z80.b << 8));
        var lookup =
          (((z80.ixl | (z80.ixh << 8)) & 0x0800) >> 11) |
          (((z80.c | (z80.b << 8)) & 0x0800) >> 10) |
          ((add16temp & 0x0800) >> 9);
        that.tstates += 7;
        z80.ixh = (add16temp >> 8) & 0xff;
        z80.ixl = add16temp & 0xff;
        z80.f =
          (z80.f & (0x04 | 0x40 | 0x80)) |
          (add16temp & 0x10000 ? 0x01 : 0) |
          ((add16temp >> 8) & (0x08 | 0x20)) |
          halfcarry_add_table[lookup];
      }
      break;
    }
    case 0x19: {
      {
        var add16temp = (z80.ixl | (z80.ixh << 8)) + (z80.e | (z80.d << 8));
        var lookup =
          (((z80.ixl | (z80.ixh << 8)) & 0x0800) >> 11) |
          (((z80.e | (z80.d << 8)) & 0x0800) >> 10) |
          ((add16temp & 0x0800) >> 9);
        that.tstates += 7;
        z80.ixh = (add16temp >> 8) & 0xff;
        z80.ixl = add16temp & 0xff;
        z80.f =
          (z80.f & (0x04 | 0x40 | 0x80)) |
          (add16temp & 0x10000 ? 0x01 : 0) |
          ((add16temp >> 8) & (0x08 | 0x20)) |
          halfcarry_add_table[lookup];
      }
      break;
    }
    case 0x21: {
      that.tstates += 6;
      z80.ixl = that.mem.readbyte(z80.pc++);
      z80.pc &= 0xffff;
      z80.ixh = that.mem.readbyte(z80.pc++);
      z80.pc &= 0xffff;
      break;
    }
    case 0x22: {
      {
        var ldtemp;
        that.tstates += 12;
        ldtemp = that.mem.readbyte(z80.pc++);
        z80.pc &= 0xffff;
        ldtemp |= that.mem.readbyte(z80.pc++) << 8;
        z80.pc &= 0xffff;
        that.mem.writebyte(ldtemp++, z80.ixl);
        ldtemp &= 0xffff;
        that.mem.writebyte(ldtemp, z80.ixh);
      }
      break;
    }
    case 0x23: {
      that.tstates += 2;
      var wordtemp = ((z80.ixl | (z80.ixh << 8)) + 1) & 0xffff;
      z80.ixh = wordtemp >> 8;
      z80.ixl = wordtemp & 0xff;
      break;
    }
    case 0x24: {
      {
        z80.ixh = (z80.ixh + 1) & 0xff;
        z80.f =
          (z80.f & 0x01) |
          (z80.ixh == 0x80 ? 0x04 : 0) |
          (z80.ixh & 0x0f ? 0 : 0x10) |
          sz53_table[z80.ixh];
      }
      break;
    }
    case 0x25: {
      {
        z80.f = (z80.f & 0x01) | (z80.ixh & 0x0f ? 0 : 0x10) | 0x02;
        z80.ixh = (z80.ixh - 1) & 0xff;
        z80.f |= (z80.ixh == 0x7f ? 0x04 : 0) | sz53_table[z80.ixh];
      }
      break;
    }
    case 0x26: {
      that.tstates += 3;
      z80.ixh = that.mem.readbyte(z80.pc++);
      z80.pc &= 0xffff;
      break;
    }
    case 0x29: {
      {
        var add16temp = (z80.ixl | (z80.ixh << 8)) + (z80.ixl | (z80.ixh << 8));
        var lookup =
          (((z80.ixl | (z80.ixh << 8)) & 0x0800) >> 11) |
          (((z80.ixl | (z80.ixh << 8)) & 0x0800) >> 10) |
          ((add16temp & 0x0800) >> 9);
        that.tstates += 7;
        z80.ixh = (add16temp >> 8) & 0xff;
        z80.ixl = add16temp & 0xff;
        z80.f =
          (z80.f & (0x04 | 0x40 | 0x80)) |
          (add16temp & 0x10000 ? 0x01 : 0) |
          ((add16temp >> 8) & (0x08 | 0x20)) |
          halfcarry_add_table[lookup];
      }
      break;
    }
    case 0x2a: {
      {
        var ldtemp;
        that.tstates += 12;
        ldtemp = that.mem.readbyte(z80.pc++);
        z80.pc &= 0xffff;
        ldtemp |= that.mem.readbyte(z80.pc++) << 8;
        z80.pc &= 0xffff;
        z80.ixl = that.mem.readbyte(ldtemp++);
        ldtemp &= 0xffff;
        z80.ixh = that.mem.readbyte(ldtemp);
      }
      break;
    }
    case 0x2b: {
      that.tstates += 2;
      var wordtemp = ((z80.ixl | (z80.ixh << 8)) - 1) & 0xffff;
      z80.ixh = wordtemp >> 8;
      z80.ixl = wordtemp & 0xff;
      break;
    }
    case 0x2c: {
      {
        z80.ixl = (z80.ixl + 1) & 0xff;
        z80.f =
          (z80.f & 0x01) |
          (z80.ixl == 0x80 ? 0x04 : 0) |
          (z80.ixl & 0x0f ? 0 : 0x10) |
          sz53_table[z80.ixl];
      }
      break;
    }
    case 0x2d: {
      {
        z80.f = (z80.f & 0x01) | (z80.ixl & 0x0f ? 0 : 0x10) | 0x02;
        z80.ixl = (z80.ixl - 1) & 0xff;
        z80.f |= (z80.ixl == 0x7f ? 0x04 : 0) | sz53_table[z80.ixl];
      }
      break;
    }
    case 0x2e: {
      that.tstates += 3;
      z80.ixl = that.mem.readbyte(z80.pc++);
      z80.pc &= 0xffff;
      break;
    }
    case 0x34: {
      that.tstates += 15;
      {
        var wordtemp = ((z80.ixl | (z80.ixh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff;
        z80.pc &= 0xffff;
        var bytetemp = that.mem.readbyte(wordtemp);
        {
          bytetemp = (bytetemp + 1) & 0xff;
          z80.f =
            (z80.f & 0x01) |
            (bytetemp == 0x80 ? 0x04 : 0) |
            (bytetemp & 0x0f ? 0 : 0x10) |
            sz53_table[bytetemp];
        }
        that.mem.writebyte(wordtemp, bytetemp);
      }
      break;
    }
    case 0x35: {
      that.tstates += 15;
      {
        var wordtemp = ((z80.ixl | (z80.ixh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff;
        z80.pc &= 0xffff;
        var bytetemp = that.mem.readbyte(wordtemp);
        {
          z80.f = (z80.f & 0x01) | (bytetemp & 0x0f ? 0 : 0x10) | 0x02;
          bytetemp = (bytetemp - 1) & 0xff;
          z80.f |= (bytetemp == 0x7f ? 0x04 : 0) | sz53_table[bytetemp];
        }
        that.mem.writebyte(wordtemp, bytetemp);
      }
      break;
    }
    case 0x36: {
      that.tstates += 11;
      {
        var wordtemp = ((z80.ixl | (z80.ixh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff;
        z80.pc &= 0xffff;
        that.mem.writebyte(wordtemp, that.mem.readbyte(z80.pc++));
        z80.pc &= 0xffff;
      }
      break;
    }
    case 0x39: {
      {
        var add16temp = (z80.ixl | (z80.ixh << 8)) + z80.sp;
        var lookup =
          (((z80.ixl | (z80.ixh << 8)) & 0x0800) >> 11) |
          ((z80.sp & 0x0800) >> 10) |
          ((add16temp & 0x0800) >> 9);
        that.tstates += 7;
        z80.ixh = (add16temp >> 8) & 0xff;
        z80.ixl = add16temp & 0xff;
        z80.f =
          (z80.f & (0x04 | 0x40 | 0x80)) |
          (add16temp & 0x10000 ? 0x01 : 0) |
          ((add16temp >> 8) & (0x08 | 0x20)) |
          halfcarry_add_table[lookup];
      }
      break;
    }
    case 0x44: {
      z80.b = z80.ixh;
      break;
    }
    case 0x45: {
      z80.b = z80.ixl;
      break;
    }
    case 0x46: {
      that.tstates += 11;
      z80.b = that.mem.readbyte(
        ((z80.ixl | (z80.ixh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff
      );
      z80.pc &= 0xffff;
      break;
    }
    case 0x4c: {
      z80.c = z80.ixh;
      break;
    }
    case 0x4d: {
      z80.c = z80.ixl;
      break;
    }
    case 0x4e: {
      that.tstates += 11;
      z80.c = that.mem.readbyte(
        ((z80.ixl | (z80.ixh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff
      );
      z80.pc &= 0xffff;
      break;
    }
    case 0x54: {
      z80.d = z80.ixh;
      break;
    }
    case 0x55: {
      z80.d = z80.ixl;
      break;
    }
    case 0x56: {
      that.tstates += 11;
      z80.d = that.mem.readbyte(
        ((z80.ixl | (z80.ixh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff
      );
      z80.pc &= 0xffff;
      break;
    }
    case 0x5c: {
      z80.e = z80.ixh;
      break;
    }
    case 0x5d: {
      z80.e = z80.ixl;
      break;
    }
    case 0x5e: {
      that.tstates += 11;
      z80.e = that.mem.readbyte(
        ((z80.ixl | (z80.ixh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff
      );
      z80.pc &= 0xffff;
      break;
    }
    case 0x60: {
      z80.ixh = z80.b;
      break;
    }
    case 0x61: {
      z80.ixh = z80.c;
      break;
    }
    case 0x62: {
      z80.ixh = z80.d;
      break;
    }
    case 0x63: {
      z80.ixh = z80.e;
      break;
    }
    case 0x64: {
      break;
    }
    case 0x65: {
      z80.ixh = z80.ixl;
      break;
    }
    case 0x66: {
      that.tstates += 11;
      z80.h = that.mem.readbyte(
        ((z80.ixl | (z80.ixh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff
      );
      z80.pc &= 0xffff;
      break;
    }
    case 0x67: {
      z80.ixh = z80.a;
      break;
    }
    case 0x68: {
      z80.ixl = z80.b;
      break;
    }
    case 0x69: {
      z80.ixl = z80.c;
      break;
    }
    case 0x6a: {
      z80.ixl = z80.d;
      break;
    }
    case 0x6b: {
      z80.ixl = z80.e;
      break;
    }
    case 0x6c: {
      z80.ixl = z80.ixh;
      break;
    }
    case 0x6d: {
      break;
    }
    case 0x6e: {
      that.tstates += 11;
      z80.l = that.mem.readbyte(
        ((z80.ixl | (z80.ixh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff
      );
      z80.pc &= 0xffff;
      break;
    }
    case 0x6f: {
      z80.ixl = z80.a;
      break;
    }
    case 0x70: {
      that.tstates += 11;
      that.mem.writebyte(
        ((z80.ixl | (z80.ixh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff,
        z80.b
      );
      z80.pc &= 0xffff;
      break;
    }
    case 0x71: {
      that.tstates += 11;
      that.mem.writebyte(
        ((z80.ixl | (z80.ixh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff,
        z80.c
      );
      z80.pc &= 0xffff;
      break;
    }
    case 0x72: {
      that.tstates += 11;
      that.mem.writebyte(
        ((z80.ixl | (z80.ixh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff,
        z80.d
      );
      z80.pc &= 0xffff;
      break;
    }
    case 0x73: {
      that.tstates += 11;
      that.mem.writebyte(
        ((z80.ixl | (z80.ixh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff,
        z80.e
      );
      z80.pc &= 0xffff;
      break;
    }
    case 0x74: {
      that.tstates += 11;
      that.mem.writebyte(
        ((z80.ixl | (z80.ixh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff,
        z80.h
      );
      z80.pc &= 0xffff;
      break;
    }
    case 0x75: {
      that.tstates += 11;
      that.mem.writebyte(
        ((z80.ixl | (z80.ixh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff,
        z80.l
      );
      z80.pc &= 0xffff;
      break;
    }
    case 0x77: {
      that.tstates += 11;
      that.mem.writebyte(
        ((z80.ixl | (z80.ixh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff,
        z80.a
      );
      z80.pc &= 0xffff;
      break;
    }
    case 0x7c: {
      z80.a = z80.ixh;
      break;
    }
    case 0x7d: {
      z80.a = z80.ixl;
      break;
    }
    case 0x7e: {
      that.tstates += 11;
      z80.a = that.mem.readbyte(
        ((z80.ixl | (z80.ixh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff
      );
      z80.pc &= 0xffff;
      break;
    }
    case 0x84: {
      {
        var addtemp = z80.a + z80.ixh;
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.ixh & 0x88) >> 2) | ((addtemp & 0x88) >> 1);
        z80.a = addtemp & 0xff;
        z80.f =
          (addtemp & 0x100 ? 0x01 : 0) |
          halfcarry_add_table[lookup & 0x07] |
          overflow_add_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x85: {
      {
        var addtemp = z80.a + z80.ixl;
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.ixl & 0x88) >> 2) | ((addtemp & 0x88) >> 1);
        z80.a = addtemp & 0xff;
        z80.f =
          (addtemp & 0x100 ? 0x01 : 0) |
          halfcarry_add_table[lookup & 0x07] |
          overflow_add_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x86: {
      that.tstates += 11;
      {
        var bytetemp = that.mem.readbyte(
          ((z80.ixl | (z80.ixh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff
        );
        z80.pc &= 0xffff;
        {
          var addtemp = z80.a + bytetemp;
          var lookup = ((z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((addtemp & 0x88) >> 1);
          z80.a = addtemp & 0xff;
          z80.f =
            (addtemp & 0x100 ? 0x01 : 0) |
            halfcarry_add_table[lookup & 0x07] |
            overflow_add_table[lookup >> 4] |
            sz53_table[z80.a];
        }
      }
      break;
    }
    case 0x8c: {
      {
        var adctemp = z80.a + z80.ixh + (z80.f & 0x01);
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.ixh & 0x88) >> 2) | ((adctemp & 0x88) >> 1);
        z80.a = adctemp & 0xff;
        z80.f =
          (adctemp & 0x100 ? 0x01 : 0) |
          halfcarry_add_table[lookup & 0x07] |
          overflow_add_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x8d: {
      {
        var adctemp = z80.a + z80.ixl + (z80.f & 0x01);
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.ixl & 0x88) >> 2) | ((adctemp & 0x88) >> 1);
        z80.a = adctemp & 0xff;
        z80.f =
          (adctemp & 0x100 ? 0x01 : 0) |
          halfcarry_add_table[lookup & 0x07] |
          overflow_add_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x8e: {
      that.tstates += 11;
      {
        var bytetemp = that.mem.readbyte(
          ((z80.ixl | (z80.ixh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff
        );
        z80.pc &= 0xffff;
        {
          var adctemp = z80.a + bytetemp + (z80.f & 0x01);
          var lookup = ((z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((adctemp & 0x88) >> 1);
          z80.a = adctemp & 0xff;
          z80.f =
            (adctemp & 0x100 ? 0x01 : 0) |
            halfcarry_add_table[lookup & 0x07] |
            overflow_add_table[lookup >> 4] |
            sz53_table[z80.a];
        }
      }
      break;
    }
    case 0x94: {
      {
        var subtemp = z80.a - z80.ixh;
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.ixh & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
        z80.a = subtemp & 0xff;
        z80.f =
          (subtemp & 0x100 ? 0x01 : 0) |
          0x02 |
          halfcarry_sub_table[lookup & 0x07] |
          overflow_sub_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x95: {
      {
        var subtemp = z80.a - z80.ixl;
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.ixl & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
        z80.a = subtemp & 0xff;
        z80.f =
          (subtemp & 0x100 ? 0x01 : 0) |
          0x02 |
          halfcarry_sub_table[lookup & 0x07] |
          overflow_sub_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x96: {
      that.tstates += 11;
      {
        var bytetemp = that.mem.readbyte(
          ((z80.ixl | (z80.ixh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff
        );
        z80.pc &= 0xffff;
        {
          var subtemp = z80.a - bytetemp;
          var lookup = ((z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
          z80.a = subtemp & 0xff;
          z80.f =
            (subtemp & 0x100 ? 0x01 : 0) |
            0x02 |
            halfcarry_sub_table[lookup & 0x07] |
            overflow_sub_table[lookup >> 4] |
            sz53_table[z80.a];
        }
      }
      break;
    }
    case 0x9c: {
      {
        var sbctemp = z80.a - z80.ixh - (z80.f & 0x01);
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.ixh & 0x88) >> 2) | ((sbctemp & 0x88) >> 1);
        z80.a = sbctemp & 0xff;
        z80.f =
          (sbctemp & 0x100 ? 0x01 : 0) |
          0x02 |
          halfcarry_sub_table[lookup & 0x07] |
          overflow_sub_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x9d: {
      {
        var sbctemp = z80.a - z80.ixl - (z80.f & 0x01);
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.ixl & 0x88) >> 2) | ((sbctemp & 0x88) >> 1);
        z80.a = sbctemp & 0xff;
        z80.f =
          (sbctemp & 0x100 ? 0x01 : 0) |
          0x02 |
          halfcarry_sub_table[lookup & 0x07] |
          overflow_sub_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x9e: {
      that.tstates += 11;
      {
        var bytetemp = that.mem.readbyte(
          ((z80.ixl | (z80.ixh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff
        );
        z80.pc &= 0xffff;
        {
          var sbctemp = z80.a - bytetemp - (z80.f & 0x01);
          var lookup = ((z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((sbctemp & 0x88) >> 1);
          z80.a = sbctemp & 0xff;
          z80.f =
            (sbctemp & 0x100 ? 0x01 : 0) |
            0x02 |
            halfcarry_sub_table[lookup & 0x07] |
            overflow_sub_table[lookup >> 4] |
            sz53_table[z80.a];
        }
      }
      break;
    }
    case 0xa4: {
      {
        z80.a &= z80.ixh;
        z80.f = 0x10 | sz53p_table[z80.a];
      }
      break;
    }
    case 0xa5: {
      {
        z80.a &= z80.ixl;
        z80.f = 0x10 | sz53p_table[z80.a];
      }
      break;
    }
    case 0xa6: {
      that.tstates += 11;
      {
        var bytetemp = that.mem.readbyte(
          ((z80.ixl | (z80.ixh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff
        );
        z80.pc &= 0xffff;
        {
          z80.a &= bytetemp;
          z80.f = 0x10 | sz53p_table[z80.a];
        }
      }
      break;
    }
    case 0xac: {
      {
        z80.a ^= z80.ixh;
        z80.f = sz53p_table[z80.a];
      }
      break;
    }
    case 0xad: {
      {
        z80.a ^= z80.ixl;
        z80.f = sz53p_table[z80.a];
      }
      break;
    }
    case 0xae: {
      that.tstates += 11;
      {
        var bytetemp = that.mem.readbyte(
          ((z80.ixl | (z80.ixh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff
        );
        z80.pc &= 0xffff;
        {
          z80.a ^= bytetemp;
          z80.f = sz53p_table[z80.a];
        }
      }
      break;
    }
    case 0xb4: {
      {
        z80.a |= z80.ixh;
        z80.f = sz53p_table[z80.a];
      }
      break;
    }
    case 0xb5: {
      {
        z80.a |= z80.ixl;
        z80.f = sz53p_table[z80.a];
      }
      break;
    }
    case 0xb6: {
      that.tstates += 11;
      {
        var bytetemp = that.mem.readbyte(
          ((z80.ixl | (z80.ixh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff
        );
        z80.pc &= 0xffff;
        {
          z80.a |= bytetemp;
          z80.f = sz53p_table[z80.a];
        }
      }
      break;
    }
    case 0xbc: {
      {
        var cptemp = z80.a - z80.ixh;
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.ixh & 0x88) >> 2) | ((cptemp & 0x88) >> 1);
        z80.f =
          (cptemp & 0x100 ? 0x01 : cptemp ? 0 : 0x40) |
          0x02 |
          halfcarry_sub_table[lookup & 0x07] |
          overflow_sub_table[lookup >> 4] |
          (z80.ixh & (0x08 | 0x20)) |
          (cptemp & 0x80);
      }
      break;
    }
    case 0xbd: {
      {
        var cptemp = z80.a - z80.ixl;
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.ixl & 0x88) >> 2) | ((cptemp & 0x88) >> 1);
        z80.f =
          (cptemp & 0x100 ? 0x01 : cptemp ? 0 : 0x40) |
          0x02 |
          halfcarry_sub_table[lookup & 0x07] |
          overflow_sub_table[lookup >> 4] |
          (z80.ixl & (0x08 | 0x20)) |
          (cptemp & 0x80);
      }
      break;
    }
    case 0xbe: {
      that.tstates += 11;
      {
        var bytetemp = that.mem.readbyte(
          ((z80.ixl | (z80.ixh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff
        );
        z80.pc &= 0xffff;
        {
          var cptemp = z80.a - bytetemp;
          var lookup = ((z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((cptemp & 0x88) >> 1);
          z80.f =
            (cptemp & 0x100 ? 0x01 : cptemp ? 0 : 0x40) |
            0x02 |
            halfcarry_sub_table[lookup & 0x07] |
            overflow_sub_table[lookup >> 4] |
            (bytetemp & (0x08 | 0x20)) |
            (cptemp & 0x80);
        }
      }
      break;
    }
    case 0xcb: {
      {
        var opcode3;
        that.tstates += 7;
        tempaddr = (z80.ixl | (z80.ixh << 8)) + sign_extend(that.mem.readbyte(z80.pc++));
        z80.pc &= 0xffff;
        opcode3 = that.mem.readbyte(z80.pc++);
        z80.pc &= 0xffff;
        z80_ddfdcbxx(opcode3, tempaddr);
      }
      break;
    }
    case 0xe1: {
      {
        that.tstates += 6;
        z80.ixl = that.mem.readbyte(z80.sp++);
        z80.sp &= 0xffff;
        z80.ixh = that.mem.readbyte(z80.sp++);
        z80.sp &= 0xffff;
      }
      break;
    }
    case 0xe3: {
      {
        var bytetempl = that.mem.readbyte(z80.sp),
          bytetemph = that.mem.readbyte(z80.sp + 1);
        that.tstates += 15;
        that.mem.writebyte(z80.sp + 1, z80.ixh);
        that.mem.writebyte(z80.sp, z80.ixl);
        z80.ixl = bytetempl;
        z80.ixh = bytetemph;
      }
      break;
    }
    case 0xe5: {
      that.tstates++;
      {
        that.tstates += 6;
        z80.sp--;
        z80.sp &= 0xffff;
        that.mem.writebyte(z80.sp, z80.ixh);
        z80.sp--;
        z80.sp &= 0xffff;
        that.mem.writebyte(z80.sp, z80.ixl);
      }
      break;
    }
    case 0xe9: {
      z80.pc = z80.ixl | (z80.ixh << 8);
      break;
    }
    case 0xf9: {
      that.tstates += 2;
      z80.sp = z80.ixl | (z80.ixh << 8);
      break;
    }
    case 256: {
      z80.pc--;
      z80.pc &= 0xffff;
      z80.r--;
      z80.r &= 0x7f;
      break;
    }
  }
};
const z80_fdxx = (key) => {
  switch (key) {
    case 0x09: {
      {
        var add16temp = (z80.iyl | (z80.iyh << 8)) + (z80.c | (z80.b << 8));
        var lookup =
          (((z80.iyl | (z80.iyh << 8)) & 0x0800) >> 11) |
          (((z80.c | (z80.b << 8)) & 0x0800) >> 10) |
          ((add16temp & 0x0800) >> 9);
        that.tstates += 7;
        z80.iyh = (add16temp >> 8) & 0xff;
        z80.iyl = add16temp & 0xff;
        z80.f =
          (z80.f & (0x04 | 0x40 | 0x80)) |
          (add16temp & 0x10000 ? 0x01 : 0) |
          ((add16temp >> 8) & (0x08 | 0x20)) |
          halfcarry_add_table[lookup];
      }
      break;
    }
    case 0x19: {
      {
        var add16temp = (z80.iyl | (z80.iyh << 8)) + (z80.e | (z80.d << 8));
        var lookup =
          (((z80.iyl | (z80.iyh << 8)) & 0x0800) >> 11) |
          (((z80.e | (z80.d << 8)) & 0x0800) >> 10) |
          ((add16temp & 0x0800) >> 9);
        that.tstates += 7;
        z80.iyh = (add16temp >> 8) & 0xff;
        z80.iyl = add16temp & 0xff;
        z80.f =
          (z80.f & (0x04 | 0x40 | 0x80)) |
          (add16temp & 0x10000 ? 0x01 : 0) |
          ((add16temp >> 8) & (0x08 | 0x20)) |
          halfcarry_add_table[lookup];
      }
      break;
    }
    case 0x21: {
      that.tstates += 6;
      z80.iyl = that.mem.readbyte(z80.pc++);
      z80.pc &= 0xffff;
      z80.iyh = that.mem.readbyte(z80.pc++);
      z80.pc &= 0xffff;
      break;
    }
    case 0x22: {
      {
        var ldtemp;
        that.tstates += 12;
        ldtemp = that.mem.readbyte(z80.pc++);
        z80.pc &= 0xffff;
        ldtemp |= that.mem.readbyte(z80.pc++) << 8;
        z80.pc &= 0xffff;
        that.mem.writebyte(ldtemp++, z80.iyl);
        ldtemp &= 0xffff;
        that.mem.writebyte(ldtemp, z80.iyh);
      }
      break;
    }
    case 0x23: {
      that.tstates += 2;
      var wordtemp = ((z80.iyl | (z80.iyh << 8)) + 1) & 0xffff;
      z80.iyh = wordtemp >> 8;
      z80.iyl = wordtemp & 0xff;
      break;
    }
    case 0x24: {
      {
        z80.iyh = (z80.iyh + 1) & 0xff;
        z80.f =
          (z80.f & 0x01) |
          (z80.iyh == 0x80 ? 0x04 : 0) |
          (z80.iyh & 0x0f ? 0 : 0x10) |
          sz53_table[z80.iyh];
      }
      break;
    }
    case 0x25: {
      {
        z80.f = (z80.f & 0x01) | (z80.iyh & 0x0f ? 0 : 0x10) | 0x02;
        z80.iyh = (z80.iyh - 1) & 0xff;
        z80.f |= (z80.iyh == 0x7f ? 0x04 : 0) | sz53_table[z80.iyh];
      }
      break;
    }
    case 0x26: {
      that.tstates += 3;
      z80.iyh = that.mem.readbyte(z80.pc++);
      z80.pc &= 0xffff;
      break;
    }
    case 0x29: {
      {
        var add16temp = (z80.iyl | (z80.iyh << 8)) + (z80.iyl | (z80.iyh << 8));
        var lookup =
          (((z80.iyl | (z80.iyh << 8)) & 0x0800) >> 11) |
          (((z80.iyl | (z80.iyh << 8)) & 0x0800) >> 10) |
          ((add16temp & 0x0800) >> 9);
        that.tstates += 7;
        z80.iyh = (add16temp >> 8) & 0xff;
        z80.iyl = add16temp & 0xff;
        z80.f =
          (z80.f & (0x04 | 0x40 | 0x80)) |
          (add16temp & 0x10000 ? 0x01 : 0) |
          ((add16temp >> 8) & (0x08 | 0x20)) |
          halfcarry_add_table[lookup];
      }
      break;
    }
    case 0x2a: {
      {
        var ldtemp;
        that.tstates += 12;
        ldtemp = that.mem.readbyte(z80.pc++);
        z80.pc &= 0xffff;
        ldtemp |= that.mem.readbyte(z80.pc++) << 8;
        z80.pc &= 0xffff;
        z80.iyl = that.mem.readbyte(ldtemp++);
        ldtemp &= 0xffff;
        z80.iyh = that.mem.readbyte(ldtemp);
      }
      break;
    }
    case 0x2b: {
      that.tstates += 2;
      var wordtemp = ((z80.iyl | (z80.iyh << 8)) - 1) & 0xffff;
      z80.iyh = wordtemp >> 8;
      z80.iyl = wordtemp & 0xff;
      break;
    }
    case 0x2c: {
      {
        z80.iyl = (z80.iyl + 1) & 0xff;
        z80.f =
          (z80.f & 0x01) |
          (z80.iyl == 0x80 ? 0x04 : 0) |
          (z80.iyl & 0x0f ? 0 : 0x10) |
          sz53_table[z80.iyl];
      }
      break;
    }
    case 0x2d: {
      {
        z80.f = (z80.f & 0x01) | (z80.iyl & 0x0f ? 0 : 0x10) | 0x02;
        z80.iyl = (z80.iyl - 1) & 0xff;
        z80.f |= (z80.iyl == 0x7f ? 0x04 : 0) | sz53_table[z80.iyl];
      }
      break;
    }
    case 0x2e: {
      that.tstates += 3;
      z80.iyl = that.mem.readbyte(z80.pc++);
      z80.pc &= 0xffff;
      break;
    }
    case 0x34: {
      that.tstates += 15;
      {
        var wordtemp = ((z80.iyl | (z80.iyh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff;
        z80.pc &= 0xffff;
        var bytetemp = that.mem.readbyte(wordtemp);
        {
          bytetemp = (bytetemp + 1) & 0xff;
          z80.f =
            (z80.f & 0x01) |
            (bytetemp == 0x80 ? 0x04 : 0) |
            (bytetemp & 0x0f ? 0 : 0x10) |
            sz53_table[bytetemp];
        }
        that.mem.writebyte(wordtemp, bytetemp);
      }
      break;
    }
    case 0x35: {
      that.tstates += 15;
      {
        var wordtemp = ((z80.iyl | (z80.iyh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff;
        z80.pc &= 0xffff;
        var bytetemp = that.mem.readbyte(wordtemp);
        {
          z80.f = (z80.f & 0x01) | (bytetemp & 0x0f ? 0 : 0x10) | 0x02;
          bytetemp = (bytetemp - 1) & 0xff;
          z80.f |= (bytetemp == 0x7f ? 0x04 : 0) | sz53_table[bytetemp];
        }
        that.mem.writebyte(wordtemp, bytetemp);
      }
      break;
    }
    case 0x36: {
      that.tstates += 11;
      {
        var wordtemp = ((z80.iyl | (z80.iyh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff;
        z80.pc &= 0xffff;
        that.mem.writebyte(wordtemp, that.mem.readbyte(z80.pc++));
        z80.pc &= 0xffff;
      }
      break;
    }
    case 0x39: {
      {
        var add16temp = (z80.iyl | (z80.iyh << 8)) + z80.sp;
        var lookup =
          (((z80.iyl | (z80.iyh << 8)) & 0x0800) >> 11) |
          ((z80.sp & 0x0800) >> 10) |
          ((add16temp & 0x0800) >> 9);
        that.tstates += 7;
        z80.iyh = (add16temp >> 8) & 0xff;
        z80.iyl = add16temp & 0xff;
        z80.f =
          (z80.f & (0x04 | 0x40 | 0x80)) |
          (add16temp & 0x10000 ? 0x01 : 0) |
          ((add16temp >> 8) & (0x08 | 0x20)) |
          halfcarry_add_table[lookup];
      }
      break;
    }
    case 0x44: {
      z80.b = z80.iyh;
      break;
    }
    case 0x45: {
      z80.b = z80.iyl;
      break;
    }
    case 0x46: {
      that.tstates += 11;
      z80.b = that.mem.readbyte(
        ((z80.iyl | (z80.iyh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff
      );
      z80.pc &= 0xffff;
      break;
    }
    case 0x4c: {
      z80.c = z80.iyh;
      break;
    }
    case 0x4d: {
      z80.c = z80.iyl;
      break;
    }
    case 0x4e: {
      that.tstates += 11;
      z80.c = that.mem.readbyte(
        ((z80.iyl | (z80.iyh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff
      );
      z80.pc &= 0xffff;
      break;
    }
    case 0x54: {
      z80.d = z80.iyh;
      break;
    }
    case 0x55: {
      z80.d = z80.iyl;
      break;
    }
    case 0x56: {
      that.tstates += 11;
      z80.d = that.mem.readbyte(
        ((z80.iyl | (z80.iyh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff
      );
      z80.pc &= 0xffff;
      break;
    }
    case 0x5c: {
      z80.e = z80.iyh;
      break;
    }
    case 0x5d: {
      z80.e = z80.iyl;
      break;
    }
    case 0x5e: {
      that.tstates += 11;
      z80.e = that.mem.readbyte(
        ((z80.iyl | (z80.iyh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff
      );
      z80.pc &= 0xffff;
      break;
    }
    case 0x60: {
      z80.iyh = z80.b;
      break;
    }
    case 0x61: {
      z80.iyh = z80.c;
      break;
    }
    case 0x62: {
      z80.iyh = z80.d;
      break;
    }
    case 0x63: {
      z80.iyh = z80.e;
      break;
    }
    case 0x64: {
      break;
    }
    case 0x65: {
      z80.iyh = z80.iyl;
      break;
    }
    case 0x66: {
      that.tstates += 11;
      z80.h = that.mem.readbyte(
        ((z80.iyl | (z80.iyh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff
      );
      z80.pc &= 0xffff;
      break;
    }
    case 0x67: {
      z80.iyh = z80.a;
      break;
    }
    case 0x68: {
      z80.iyl = z80.b;
      break;
    }
    case 0x69: {
      z80.iyl = z80.c;
      break;
    }
    case 0x6a: {
      z80.iyl = z80.d;
      break;
    }
    case 0x6b: {
      z80.iyl = z80.e;
      break;
    }
    case 0x6c: {
      z80.iyl = z80.iyh;
      break;
    }
    case 0x6d: {
      break;
    }
    case 0x6e: {
      that.tstates += 11;
      z80.l = that.mem.readbyte(
        ((z80.iyl | (z80.iyh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff
      );
      z80.pc &= 0xffff;
      break;
    }
    case 0x6f: {
      z80.iyl = z80.a;
      break;
    }
    case 0x70: {
      that.tstates += 11;
      that.mem.writebyte(
        ((z80.iyl | (z80.iyh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff,
        z80.b
      );
      z80.pc &= 0xffff;
      break;
    }
    case 0x71: {
      that.tstates += 11;
      that.mem.writebyte(
        ((z80.iyl | (z80.iyh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff,
        z80.c
      );
      z80.pc &= 0xffff;
      break;
    }
    case 0x72: {
      that.tstates += 11;
      that.mem.writebyte(
        ((z80.iyl | (z80.iyh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff,
        z80.d
      );
      z80.pc &= 0xffff;
      break;
    }
    case 0x73: {
      that.tstates += 11;
      that.mem.writebyte(
        ((z80.iyl | (z80.iyh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff,
        z80.e
      );
      z80.pc &= 0xffff;
      break;
    }
    case 0x74: {
      that.tstates += 11;
      that.mem.writebyte(
        ((z80.iyl | (z80.iyh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff,
        z80.h
      );
      z80.pc &= 0xffff;
      break;
    }
    case 0x75: {
      that.tstates += 11;
      that.mem.writebyte(
        ((z80.iyl | (z80.iyh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff,
        z80.l
      );
      z80.pc &= 0xffff;
      break;
    }
    case 0x77: {
      that.tstates += 11;
      that.mem.writebyte(
        ((z80.iyl | (z80.iyh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff,
        z80.a
      );
      z80.pc &= 0xffff;
      break;
    }
    case 0x7c: {
      z80.a = z80.iyh;
      break;
    }
    case 0x7d: {
      z80.a = z80.iyl;
      break;
    }
    case 0x7e: {
      that.tstates += 11;
      z80.a = that.mem.readbyte(
        ((z80.iyl | (z80.iyh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff
      );
      z80.pc &= 0xffff;
      break;
    }
    case 0x84: {
      {
        var addtemp = z80.a + z80.iyh;
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.iyh & 0x88) >> 2) | ((addtemp & 0x88) >> 1);
        z80.a = addtemp & 0xff;
        z80.f =
          (addtemp & 0x100 ? 0x01 : 0) |
          halfcarry_add_table[lookup & 0x07] |
          overflow_add_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x85: {
      {
        var addtemp = z80.a + z80.iyl;
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.iyl & 0x88) >> 2) | ((addtemp & 0x88) >> 1);
        z80.a = addtemp & 0xff;
        z80.f =
          (addtemp & 0x100 ? 0x01 : 0) |
          halfcarry_add_table[lookup & 0x07] |
          overflow_add_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x86: {
      that.tstates += 11;
      {
        var bytetemp = that.mem.readbyte(
          ((z80.iyl | (z80.iyh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff
        );
        z80.pc &= 0xffff;
        {
          var addtemp = z80.a + bytetemp;
          var lookup = ((z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((addtemp & 0x88) >> 1);
          z80.a = addtemp & 0xff;
          z80.f =
            (addtemp & 0x100 ? 0x01 : 0) |
            halfcarry_add_table[lookup & 0x07] |
            overflow_add_table[lookup >> 4] |
            sz53_table[z80.a];
        }
      }
      break;
    }
    case 0x8c: {
      {
        var adctemp = z80.a + z80.iyh + (z80.f & 0x01);
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.iyh & 0x88) >> 2) | ((adctemp & 0x88) >> 1);
        z80.a = adctemp & 0xff;
        z80.f =
          (adctemp & 0x100 ? 0x01 : 0) |
          halfcarry_add_table[lookup & 0x07] |
          overflow_add_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x8d: {
      {
        var adctemp = z80.a + z80.iyl + (z80.f & 0x01);
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.iyl & 0x88) >> 2) | ((adctemp & 0x88) >> 1);
        z80.a = adctemp & 0xff;
        z80.f =
          (adctemp & 0x100 ? 0x01 : 0) |
          halfcarry_add_table[lookup & 0x07] |
          overflow_add_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x8e: {
      that.tstates += 11;
      {
        var bytetemp = that.mem.readbyte(
          ((z80.iyl | (z80.iyh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff
        );
        z80.pc &= 0xffff;
        {
          var adctemp = z80.a + bytetemp + (z80.f & 0x01);
          var lookup = ((z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((adctemp & 0x88) >> 1);
          z80.a = adctemp & 0xff;
          z80.f =
            (adctemp & 0x100 ? 0x01 : 0) |
            halfcarry_add_table[lookup & 0x07] |
            overflow_add_table[lookup >> 4] |
            sz53_table[z80.a];
        }
      }
      break;
    }
    case 0x94: {
      {
        var subtemp = z80.a - z80.iyh;
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.iyh & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
        z80.a = subtemp & 0xff;
        z80.f =
          (subtemp & 0x100 ? 0x01 : 0) |
          0x02 |
          halfcarry_sub_table[lookup & 0x07] |
          overflow_sub_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x95: {
      {
        var subtemp = z80.a - z80.iyl;
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.iyl & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
        z80.a = subtemp & 0xff;
        z80.f =
          (subtemp & 0x100 ? 0x01 : 0) |
          0x02 |
          halfcarry_sub_table[lookup & 0x07] |
          overflow_sub_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x96: {
      that.tstates += 11;
      {
        var bytetemp = that.mem.readbyte(
          ((z80.iyl | (z80.iyh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff
        );
        z80.pc &= 0xffff;
        {
          var subtemp = z80.a - bytetemp;
          var lookup = ((z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
          z80.a = subtemp & 0xff;
          z80.f =
            (subtemp & 0x100 ? 0x01 : 0) |
            0x02 |
            halfcarry_sub_table[lookup & 0x07] |
            overflow_sub_table[lookup >> 4] |
            sz53_table[z80.a];
        }
      }
      break;
    }
    case 0x9c: {
      {
        var sbctemp = z80.a - z80.iyh - (z80.f & 0x01);
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.iyh & 0x88) >> 2) | ((sbctemp & 0x88) >> 1);
        z80.a = sbctemp & 0xff;
        z80.f =
          (sbctemp & 0x100 ? 0x01 : 0) |
          0x02 |
          halfcarry_sub_table[lookup & 0x07] |
          overflow_sub_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x9d: {
      {
        var sbctemp = z80.a - z80.iyl - (z80.f & 0x01);
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.iyl & 0x88) >> 2) | ((sbctemp & 0x88) >> 1);
        z80.a = sbctemp & 0xff;
        z80.f =
          (sbctemp & 0x100 ? 0x01 : 0) |
          0x02 |
          halfcarry_sub_table[lookup & 0x07] |
          overflow_sub_table[lookup >> 4] |
          sz53_table[z80.a];
      }
      break;
    }
    case 0x9e: {
      that.tstates += 11;
      {
        var bytetemp = that.mem.readbyte(
          ((z80.iyl | (z80.iyh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff
        );
        z80.pc &= 0xffff;
        {
          var sbctemp = z80.a - bytetemp - (z80.f & 0x01);
          var lookup = ((z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((sbctemp & 0x88) >> 1);
          z80.a = sbctemp & 0xff;
          z80.f =
            (sbctemp & 0x100 ? 0x01 : 0) |
            0x02 |
            halfcarry_sub_table[lookup & 0x07] |
            overflow_sub_table[lookup >> 4] |
            sz53_table[z80.a];
        }
      }
      break;
    }
    case 0xa4: {
      {
        z80.a &= z80.iyh;
        z80.f = 0x10 | sz53p_table[z80.a];
      }
      break;
    }
    case 0xa5: {
      {
        z80.a &= z80.iyl;
        z80.f = 0x10 | sz53p_table[z80.a];
      }
      break;
    }
    case 0xa6: {
      that.tstates += 11;
      {
        var bytetemp = that.mem.readbyte(
          ((z80.iyl | (z80.iyh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff
        );
        z80.pc &= 0xffff;
        {
          z80.a &= bytetemp;
          z80.f = 0x10 | sz53p_table[z80.a];
        }
      }
      break;
    }
    case 0xac: {
      {
        z80.a ^= z80.iyh;
        z80.f = sz53p_table[z80.a];
      }
      break;
    }
    case 0xad: {
      {
        z80.a ^= z80.iyl;
        z80.f = sz53p_table[z80.a];
      }
      break;
    }
    case 0xae: {
      that.tstates += 11;
      {
        var bytetemp = that.mem.readbyte(
          ((z80.iyl | (z80.iyh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff
        );
        z80.pc &= 0xffff;
        {
          z80.a ^= bytetemp;
          z80.f = sz53p_table[z80.a];
        }
      }
      break;
    }
    case 0xb4: {
      {
        z80.a |= z80.iyh;
        z80.f = sz53p_table[z80.a];
      }
      break;
    }
    case 0xb5: {
      {
        z80.a |= z80.iyl;
        z80.f = sz53p_table[z80.a];
      }
      break;
    }
    case 0xb6: {
      that.tstates += 11;
      {
        var bytetemp = that.mem.readbyte(
          ((z80.iyl | (z80.iyh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff
        );
        z80.pc &= 0xffff;
        {
          z80.a |= bytetemp;
          z80.f = sz53p_table[z80.a];
        }
      }
      break;
    }
    case 0xbc: {
      {
        var cptemp = z80.a - z80.iyh;
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.iyh & 0x88) >> 2) | ((cptemp & 0x88) >> 1);
        z80.f =
          (cptemp & 0x100 ? 0x01 : cptemp ? 0 : 0x40) |
          0x02 |
          halfcarry_sub_table[lookup & 0x07] |
          overflow_sub_table[lookup >> 4] |
          (z80.iyh & (0x08 | 0x20)) |
          (cptemp & 0x80);
      }
      break;
    }
    case 0xbd: {
      {
        var cptemp = z80.a - z80.iyl;
        var lookup = ((z80.a & 0x88) >> 3) | ((z80.iyl & 0x88) >> 2) | ((cptemp & 0x88) >> 1);
        z80.f =
          (cptemp & 0x100 ? 0x01 : cptemp ? 0 : 0x40) |
          0x02 |
          halfcarry_sub_table[lookup & 0x07] |
          overflow_sub_table[lookup >> 4] |
          (z80.iyl & (0x08 | 0x20)) |
          (cptemp & 0x80);
      }
      break;
    }
    case 0xbe: {
      that.tstates += 11;
      {
        var bytetemp = that.mem.readbyte(
          ((z80.iyl | (z80.iyh << 8)) + sign_extend(that.mem.readbyte(z80.pc++))) & 0xffff
        );
        z80.pc &= 0xffff;
        {
          var cptemp = z80.a - bytetemp;
          var lookup = ((z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((cptemp & 0x88) >> 1);
          z80.f =
            (cptemp & 0x100 ? 0x01 : cptemp ? 0 : 0x40) |
            0x02 |
            halfcarry_sub_table[lookup & 0x07] |
            overflow_sub_table[lookup >> 4] |
            (bytetemp & (0x08 | 0x20)) |
            (cptemp & 0x80);
        }
      }
      break;
    }
    case 0xcb: {
      {
        var opcode3;
        that.tstates += 7;
        tempaddr = (z80.iyl | (z80.iyh << 8)) + sign_extend(that.mem.readbyte(z80.pc++));
        z80.pc &= 0xffff;
        opcode3 = that.mem.readbyte(z80.pc++);
        z80.pc &= 0xffff;
        z80_ddfdcbxx(opcode3, tempaddr);
      }
      break;
    }
    case 0xe1: {
      {
        that.tstates += 6;
        z80.iyl = that.mem.readbyte(z80.sp++);
        z80.sp &= 0xffff;
        z80.iyh = that.mem.readbyte(z80.sp++);
        z80.sp &= 0xffff;
      }
      break;
    }
    case 0xe3: {
      {
        var bytetempl = that.mem.readbyte(z80.sp),
          bytetemph = that.mem.readbyte(z80.sp + 1);
        that.tstates += 15;
        that.mem.writebyte(z80.sp + 1, z80.iyh);
        that.mem.writebyte(z80.sp, z80.iyl);
        z80.iyl = bytetempl;
        z80.iyh = bytetemph;
      }
      break;
    }
    case 0xe5: {
      that.tstates++;
      {
        that.tstates += 6;
        z80.sp--;
        z80.sp &= 0xffff;
        that.mem.writebyte(z80.sp, z80.iyh);
        z80.sp--;
        z80.sp &= 0xffff;
        that.mem.writebyte(z80.sp, z80.iyl);
      }
      break;
    }
    case 0xe9: {
      z80.pc = z80.iyl | (z80.iyh << 8);
      break;
    }
    case 0xf9: {
      that.tstates += 2;
      z80.sp = z80.iyl | (z80.iyh << 8);
      break;
    }
    case 256: {
      z80.pc--;
      z80.pc &= 0xffff;
      z80.r--;
      z80.r &= 0x7f;
      break;
    }
  }
};




var z80_ddfdcb_ops = (function z80_setup_ddfdcb_ops() {
  var ops = [];
  ops[0x00] = function op_0x00(tempaddr) {
    that.tstates += 8;
    z80.b = that.mem.readbyte(tempaddr);
    {
      z80.b = ((z80.b & 0x7f) << 1) | (z80.b >> 7);
      z80.f = (z80.b & 0x01) | sz53p_table[z80.b];
    }
    that.mem.writebyte(tempaddr, z80.b);
  };
  ops[0x01] = function op_0x01(tempaddr) {
    that.tstates += 8;
    z80.c = that.mem.readbyte(tempaddr);
    {
      z80.c = ((z80.c & 0x7f) << 1) | (z80.c >> 7);
      z80.f = (z80.c & 0x01) | sz53p_table[z80.c];
    }
    that.mem.writebyte(tempaddr, z80.c);
  };
  ops[0x02] = function op_0x02(tempaddr) {
    that.tstates += 8;
    z80.d = that.mem.readbyte(tempaddr);
    {
      z80.d = ((z80.d & 0x7f) << 1) | (z80.d >> 7);
      z80.f = (z80.d & 0x01) | sz53p_table[z80.d];
    }
    that.mem.writebyte(tempaddr, z80.d);
  };
  ops[0x03] = function op_0x03(tempaddr) {
    that.tstates += 8;
    z80.e = that.mem.readbyte(tempaddr);
    {
      z80.e = ((z80.e & 0x7f) << 1) | (z80.e >> 7);
      z80.f = (z80.e & 0x01) | sz53p_table[z80.e];
    }
    that.mem.writebyte(tempaddr, z80.e);
  };
  ops[0x04] = function op_0x04(tempaddr) {
    that.tstates += 8;
    z80.h = that.mem.readbyte(tempaddr);
    {
      z80.h = ((z80.h & 0x7f) << 1) | (z80.h >> 7);
      z80.f = (z80.h & 0x01) | sz53p_table[z80.h];
    }
    that.mem.writebyte(tempaddr, z80.h);
  };
  ops[0x05] = function op_0x05(tempaddr) {
    that.tstates += 8;
    z80.l = that.mem.readbyte(tempaddr);
    {
      z80.l = ((z80.l & 0x7f) << 1) | (z80.l >> 7);
      z80.f = (z80.l & 0x01) | sz53p_table[z80.l];
    }
    that.mem.writebyte(tempaddr, z80.l);
  };
  ops[0x06] = function op_0x06(tempaddr) {
    that.tstates += 8;
    {
      var bytetemp = that.mem.readbyte(tempaddr);
      {
        bytetemp = ((bytetemp & 0x7f) << 1) | (bytetemp >> 7);
        z80.f = (bytetemp & 0x01) | sz53p_table[bytetemp];
      }
      that.mem.writebyte(tempaddr, bytetemp);
    }
  };
  ops[0x07] = function op_0x07(tempaddr) {
    that.tstates += 8;
    z80.a = that.mem.readbyte(tempaddr);
    {
      z80.a = ((z80.a & 0x7f) << 1) | (z80.a >> 7);
      z80.f = (z80.a & 0x01) | sz53p_table[z80.a];
    }
    that.mem.writebyte(tempaddr, z80.a);
  };
  ops[0x08] = function op_0x08(tempaddr) {
    that.tstates += 8;
    z80.b = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.b & 0x01;
      z80.b = (z80.b >> 1) | ((z80.b & 0x01) << 7);
      z80.f |= sz53p_table[z80.b];
    }
    that.mem.writebyte(tempaddr, z80.b);
  };
  ops[0x09] = function op_0x09(tempaddr) {
    that.tstates += 8;
    z80.c = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.c & 0x01;
      z80.c = (z80.c >> 1) | ((z80.c & 0x01) << 7);
      z80.f |= sz53p_table[z80.c];
    }
    that.mem.writebyte(tempaddr, z80.c);
  };
  ops[0x0a] = function op_0x0a(tempaddr) {
    that.tstates += 8;
    z80.d = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.d & 0x01;
      z80.d = (z80.d >> 1) | ((z80.d & 0x01) << 7);
      z80.f |= sz53p_table[z80.d];
    }
    that.mem.writebyte(tempaddr, z80.d);
  };
  ops[0x0b] = function op_0x0b(tempaddr) {
    that.tstates += 8;
    z80.e = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.e & 0x01;
      z80.e = (z80.e >> 1) | ((z80.e & 0x01) << 7);
      z80.f |= sz53p_table[z80.e];
    }
    that.mem.writebyte(tempaddr, z80.e);
  };
  ops[0x0c] = function op_0x0c(tempaddr) {
    that.tstates += 8;
    z80.h = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.h & 0x01;
      z80.h = (z80.h >> 1) | ((z80.h & 0x01) << 7);
      z80.f |= sz53p_table[z80.h];
    }
    that.mem.writebyte(tempaddr, z80.h);
  };
  ops[0x0d] = function op_0x0d(tempaddr) {
    that.tstates += 8;
    z80.l = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.l & 0x01;
      z80.l = (z80.l >> 1) | ((z80.l & 0x01) << 7);
      z80.f |= sz53p_table[z80.l];
    }
    that.mem.writebyte(tempaddr, z80.l);
  };
  ops[0x0e] = function op_0x0e(tempaddr) {
    that.tstates += 8;
    {
      var bytetemp = that.mem.readbyte(tempaddr);
      {
        z80.f = bytetemp & 0x01;
        bytetemp = (bytetemp >> 1) | ((bytetemp & 0x01) << 7);
        z80.f |= sz53p_table[bytetemp];
      }
      that.mem.writebyte(tempaddr, bytetemp);
    }
  };
  ops[0x0f] = function op_0x0f(tempaddr) {
    that.tstates += 8;
    z80.a = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.a & 0x01;
      z80.a = (z80.a >> 1) | ((z80.a & 0x01) << 7);
      z80.f |= sz53p_table[z80.a];
    }
    that.mem.writebyte(tempaddr, z80.a);
  };
  ops[0x10] = function op_0x10(tempaddr) {
    that.tstates += 8;
    z80.b = that.mem.readbyte(tempaddr);
    {
      var rltemp = z80.b;
      z80.b = ((z80.b & 0x7f) << 1) | (z80.f & 0x01);
      z80.f = (rltemp >> 7) | sz53p_table[z80.b];
    }
    that.mem.writebyte(tempaddr, z80.b);
  };
  ops[0x11] = function op_0x11(tempaddr) {
    that.tstates += 8;
    z80.c = that.mem.readbyte(tempaddr);
    {
      var rltemp = z80.c;
      z80.c = ((z80.c & 0x7f) << 1) | (z80.f & 0x01);
      z80.f = (rltemp >> 7) | sz53p_table[z80.c];
    }
    that.mem.writebyte(tempaddr, z80.c);
  };
  ops[0x12] = function op_0x12(tempaddr) {
    that.tstates += 8;
    z80.d = that.mem.readbyte(tempaddr);
    {
      var rltemp = z80.d;
      z80.d = ((z80.d & 0x7f) << 1) | (z80.f & 0x01);
      z80.f = (rltemp >> 7) | sz53p_table[z80.d];
    }
    that.mem.writebyte(tempaddr, z80.d);
  };
  ops[0x13] = function op_0x13(tempaddr) {
    that.tstates += 8;
    z80.e = that.mem.readbyte(tempaddr);
    {
      var rltemp = z80.e;
      z80.e = ((z80.e & 0x7f) << 1) | (z80.f & 0x01);
      z80.f = (rltemp >> 7) | sz53p_table[z80.e];
    }
    that.mem.writebyte(tempaddr, z80.e);
  };
  ops[0x14] = function op_0x14(tempaddr) {
    that.tstates += 8;
    z80.h = that.mem.readbyte(tempaddr);
    {
      var rltemp = z80.h;
      z80.h = ((z80.h & 0x7f) << 1) | (z80.f & 0x01);
      z80.f = (rltemp >> 7) | sz53p_table[z80.h];
    }
    that.mem.writebyte(tempaddr, z80.h);
  };
  ops[0x15] = function op_0x15(tempaddr) {
    that.tstates += 8;
    z80.l = that.mem.readbyte(tempaddr);
    {
      var rltemp = z80.l;
      z80.l = ((z80.l & 0x7f) << 1) | (z80.f & 0x01);
      z80.f = (rltemp >> 7) | sz53p_table[z80.l];
    }
    that.mem.writebyte(tempaddr, z80.l);
  };
  ops[0x16] = function op_0x16(tempaddr) {
    that.tstates += 8;
    {
      var bytetemp = that.mem.readbyte(tempaddr);
      {
        var rltemp = bytetemp;
        bytetemp = ((bytetemp & 0x7f) << 1) | (z80.f & 0x01);
        z80.f = (rltemp >> 7) | sz53p_table[bytetemp];
      }
      that.mem.writebyte(tempaddr, bytetemp);
    }
  };
  ops[0x17] = function op_0x17(tempaddr) {
    that.tstates += 8;
    z80.a = that.mem.readbyte(tempaddr);
    {
      var rltemp = z80.a;
      z80.a = ((z80.a & 0x7f) << 1) | (z80.f & 0x01);
      z80.f = (rltemp >> 7) | sz53p_table[z80.a];
    }
    that.mem.writebyte(tempaddr, z80.a);
  };
  ops[0x18] = function op_0x18(tempaddr) {
    that.tstates += 8;
    z80.b = that.mem.readbyte(tempaddr);
    {
      var rrtemp = z80.b;
      z80.b = (z80.b >> 1) | ((z80.f & 0x01) << 7);
      z80.f = (rrtemp & 0x01) | sz53p_table[z80.b];
    }
    that.mem.writebyte(tempaddr, z80.b);
  };
  ops[0x19] = function op_0x19(tempaddr) {
    that.tstates += 8;
    z80.c = that.mem.readbyte(tempaddr);
    {
      var rrtemp = z80.c;
      z80.c = (z80.c >> 1) | ((z80.f & 0x01) << 7);
      z80.f = (rrtemp & 0x01) | sz53p_table[z80.c];
    }
    that.mem.writebyte(tempaddr, z80.c);
  };
  ops[0x1a] = function op_0x1a(tempaddr) {
    that.tstates += 8;
    z80.d = that.mem.readbyte(tempaddr);
    {
      var rrtemp = z80.d;
      z80.d = (z80.d >> 1) | ((z80.f & 0x01) << 7);
      z80.f = (rrtemp & 0x01) | sz53p_table[z80.d];
    }
    that.mem.writebyte(tempaddr, z80.d);
  };
  ops[0x1b] = function op_0x1b(tempaddr) {
    that.tstates += 8;
    z80.e = that.mem.readbyte(tempaddr);
    {
      var rrtemp = z80.e;
      z80.e = (z80.e >> 1) | ((z80.f & 0x01) << 7);
      z80.f = (rrtemp & 0x01) | sz53p_table[z80.e];
    }
    that.mem.writebyte(tempaddr, z80.e);
  };
  ops[0x1c] = function op_0x1c(tempaddr) {
    that.tstates += 8;
    z80.h = that.mem.readbyte(tempaddr);
    {
      var rrtemp = z80.h;
      z80.h = (z80.h >> 1) | ((z80.f & 0x01) << 7);
      z80.f = (rrtemp & 0x01) | sz53p_table[z80.h];
    }
    that.mem.writebyte(tempaddr, z80.h);
  };
  ops[0x1d] = function op_0x1d(tempaddr) {
    that.tstates += 8;
    z80.l = that.mem.readbyte(tempaddr);
    {
      var rrtemp = z80.l;
      z80.l = (z80.l >> 1) | ((z80.f & 0x01) << 7);
      z80.f = (rrtemp & 0x01) | sz53p_table[z80.l];
    }
    that.mem.writebyte(tempaddr, z80.l);
  };
  ops[0x1e] = function op_0x1e(tempaddr) {
    that.tstates += 8;
    {
      var bytetemp = that.mem.readbyte(tempaddr);
      {
        var rrtemp = bytetemp;
        bytetemp = (bytetemp >> 1) | ((z80.f & 0x01) << 7);
        z80.f = (rrtemp & 0x01) | sz53p_table[bytetemp];
      }
      that.mem.writebyte(tempaddr, bytetemp);
    }
  };
  ops[0x1f] = function op_0x1f(tempaddr) {
    that.tstates += 8;
    z80.a = that.mem.readbyte(tempaddr);
    {
      var rrtemp = z80.a;
      z80.a = (z80.a >> 1) | ((z80.f & 0x01) << 7);
      z80.f = (rrtemp & 0x01) | sz53p_table[z80.a];
    }
    that.mem.writebyte(tempaddr, z80.a);
  };
  ops[0x20] = function op_0x20(tempaddr) {
    that.tstates += 8;
    z80.b = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.b >> 7;
      z80.b <<= 1;
      z80.b &= 0xff;
      z80.f |= sz53p_table[z80.b];
    }
    that.mem.writebyte(tempaddr, z80.b);
  };
  ops[0x21] = function op_0x21(tempaddr) {
    that.tstates += 8;
    z80.c = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.c >> 7;
      z80.c <<= 1;
      z80.c &= 0xff;
      z80.f |= sz53p_table[z80.c];
    }
    that.mem.writebyte(tempaddr, z80.c);
  };
  ops[0x22] = function op_0x22(tempaddr) {
    that.tstates += 8;
    z80.d = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.d >> 7;
      z80.d <<= 1;
      z80.d &= 0xff;
      z80.f |= sz53p_table[z80.d];
    }
    that.mem.writebyte(tempaddr, z80.d);
  };
  ops[0x23] = function op_0x23(tempaddr) {
    that.tstates += 8;
    z80.e = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.e >> 7;
      z80.e <<= 1;
      z80.e &= 0xff;
      z80.f |= sz53p_table[z80.e];
    }
    that.mem.writebyte(tempaddr, z80.e);
  };
  ops[0x24] = function op_0x24(tempaddr) {
    that.tstates += 8;
    z80.h = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.h >> 7;
      z80.h <<= 1;
      z80.h &= 0xff;
      z80.f |= sz53p_table[z80.h];
    }
    that.mem.writebyte(tempaddr, z80.h);
  };
  ops[0x25] = function op_0x25(tempaddr) {
    that.tstates += 8;
    z80.l = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.l >> 7;
      z80.l <<= 1;
      z80.l &= 0xff;
      z80.f |= sz53p_table[z80.l];
    }
    that.mem.writebyte(tempaddr, z80.l);
  };
  ops[0x26] = function op_0x26(tempaddr) {
    that.tstates += 8;
    {
      var bytetemp = that.mem.readbyte(tempaddr);
      {
        z80.f = bytetemp >> 7;
        bytetemp <<= 1;
        bytetemp &= 0xff;
        z80.f |= sz53p_table[bytetemp];
      }
      that.mem.writebyte(tempaddr, bytetemp);
    }
  };
  ops[0x27] = function op_0x27(tempaddr) {
    that.tstates += 8;
    z80.a = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.a >> 7;
      z80.a <<= 1;
      z80.a &= 0xff;
      z80.f |= sz53p_table[z80.a];
    }
    that.mem.writebyte(tempaddr, z80.a);
  };
  ops[0x28] = function op_0x28(tempaddr) {
    that.tstates += 8;
    z80.b = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.b & 0x01;
      z80.b = (z80.b & 0x80) | (z80.b >> 1);
      z80.f |= sz53p_table[z80.b];
    }
    that.mem.writebyte(tempaddr, z80.b);
  };
  ops[0x29] = function op_0x29(tempaddr) {
    that.tstates += 8;
    z80.c = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.c & 0x01;
      z80.c = (z80.c & 0x80) | (z80.c >> 1);
      z80.f |= sz53p_table[z80.c];
    }
    that.mem.writebyte(tempaddr, z80.c);
  };
  ops[0x2a] = function op_0x2a(tempaddr) {
    that.tstates += 8;
    z80.d = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.d & 0x01;
      z80.d = (z80.d & 0x80) | (z80.d >> 1);
      z80.f |= sz53p_table[z80.d];
    }
    that.mem.writebyte(tempaddr, z80.d);
  };
  ops[0x2b] = function op_0x2b(tempaddr) {
    that.tstates += 8;
    z80.e = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.e & 0x01;
      z80.e = (z80.e & 0x80) | (z80.e >> 1);
      z80.f |= sz53p_table[z80.e];
    }
    that.mem.writebyte(tempaddr, z80.e);
  };
  ops[0x2c] = function op_0x2c(tempaddr) {
    that.tstates += 8;
    z80.h = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.h & 0x01;
      z80.h = (z80.h & 0x80) | (z80.h >> 1);
      z80.f |= sz53p_table[z80.h];
    }
    that.mem.writebyte(tempaddr, z80.h);
  };
  ops[0x2d] = function op_0x2d(tempaddr) {
    that.tstates += 8;
    z80.l = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.l & 0x01;
      z80.l = (z80.l & 0x80) | (z80.l >> 1);
      z80.f |= sz53p_table[z80.l];
    }
    that.mem.writebyte(tempaddr, z80.l);
  };
  ops[0x2e] = function op_0x2e(tempaddr) {
    that.tstates += 8;
    {
      var bytetemp = that.mem.readbyte(tempaddr);
      {
        z80.f = bytetemp & 0x01;
        bytetemp = (bytetemp & 0x80) | (bytetemp >> 1);
        z80.f |= sz53p_table[bytetemp];
      }
      that.mem.writebyte(tempaddr, bytetemp);
    }
  };
  ops[0x2f] = function op_0x2f(tempaddr) {
    that.tstates += 8;
    z80.a = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.a & 0x01;
      z80.a = (z80.a & 0x80) | (z80.a >> 1);
      z80.f |= sz53p_table[z80.a];
    }
    that.mem.writebyte(tempaddr, z80.a);
  };
  ops[0x30] = function op_0x30(tempaddr) {
    that.tstates += 8;
    z80.b = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.b >> 7;
      z80.b = (z80.b << 1) | 0x01;
      z80.b &= 0xff;
      z80.f |= sz53p_table[z80.b];
    }
    that.mem.writebyte(tempaddr, z80.b);
  };
  ops[0x31] = function op_0x31(tempaddr) {
    that.tstates += 8;
    z80.c = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.c >> 7;
      z80.c = (z80.c << 1) | 0x01;
      z80.c &= 0xff;
      z80.f |= sz53p_table[z80.c];
    }
    that.mem.writebyte(tempaddr, z80.c);
  };
  ops[0x32] = function op_0x32(tempaddr) {
    that.tstates += 8;
    z80.d = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.d >> 7;
      z80.d = (z80.d << 1) | 0x01;
      z80.d &= 0xff;
      z80.f |= sz53p_table[z80.d];
    }
    that.mem.writebyte(tempaddr, z80.d);
  };
  ops[0x33] = function op_0x33(tempaddr) {
    that.tstates += 8;
    z80.e = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.e >> 7;
      z80.e = (z80.e << 1) | 0x01;
      z80.e &= 0xff;
      z80.f |= sz53p_table[z80.e];
    }
    that.mem.writebyte(tempaddr, z80.e);
  };
  ops[0x34] = function op_0x34(tempaddr) {
    that.tstates += 8;
    z80.h = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.h >> 7;
      z80.h = (z80.h << 1) | 0x01;
      z80.h &= 0xff;
      z80.f |= sz53p_table[z80.h];
    }
    that.mem.writebyte(tempaddr, z80.h);
  };
  ops[0x35] = function op_0x35(tempaddr) {
    that.tstates += 8;
    z80.l = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.l >> 7;
      z80.l = (z80.l << 1) | 0x01;
      z80.l &= 0xff;
      z80.f |= sz53p_table[z80.l];
    }
    that.mem.writebyte(tempaddr, z80.l);
  };
  ops[0x36] = function op_0x36(tempaddr) {
    that.tstates += 8;
    {
      var bytetemp = that.mem.readbyte(tempaddr);
      {
        z80.f = bytetemp >> 7;
        bytetemp = (bytetemp << 1) | 0x01;
        bytetemp &= 0xff;
        z80.f |= sz53p_table[bytetemp];
      }
      that.mem.writebyte(tempaddr, bytetemp);
    }
  };
  ops[0x37] = function op_0x37(tempaddr) {
    that.tstates += 8;
    z80.a = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.a >> 7;
      z80.a = (z80.a << 1) | 0x01;
      z80.a &= 0xff;
      z80.f |= sz53p_table[z80.a];
    }
    that.mem.writebyte(tempaddr, z80.a);
  };
  ops[0x38] = function op_0x38(tempaddr) {
    that.tstates += 8;
    z80.b = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.b & 0x01;
      z80.b >>= 1;
      z80.f |= sz53p_table[z80.b];
    }
    that.mem.writebyte(tempaddr, z80.b);
  };
  ops[0x39] = function op_0x39(tempaddr) {
    that.tstates += 8;
    z80.c = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.c & 0x01;
      z80.c >>= 1;
      z80.f |= sz53p_table[z80.c];
    }
    that.mem.writebyte(tempaddr, z80.c);
  };
  ops[0x3a] = function op_0x3a(tempaddr) {
    that.tstates += 8;
    z80.d = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.d & 0x01;
      z80.d >>= 1;
      z80.f |= sz53p_table[z80.d];
    }
    that.mem.writebyte(tempaddr, z80.d);
  };
  ops[0x3b] = function op_0x3b(tempaddr) {
    that.tstates += 8;
    z80.e = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.e & 0x01;
      z80.e >>= 1;
      z80.f |= sz53p_table[z80.e];
    }
    that.mem.writebyte(tempaddr, z80.e);
  };
  ops[0x3c] = function op_0x3c(tempaddr) {
    that.tstates += 8;
    z80.h = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.h & 0x01;
      z80.h >>= 1;
      z80.f |= sz53p_table[z80.h];
    }
    that.mem.writebyte(tempaddr, z80.h);
  };
  ops[0x3d] = function op_0x3d(tempaddr) {
    that.tstates += 8;
    z80.l = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.l & 0x01;
      z80.l >>= 1;
      z80.f |= sz53p_table[z80.l];
    }
    that.mem.writebyte(tempaddr, z80.l);
  };
  ops[0x3e] = function op_0x3e(tempaddr) {
    that.tstates += 8;
    {
      var bytetemp = that.mem.readbyte(tempaddr);
      {
        z80.f = bytetemp & 0x01;
        bytetemp >>= 1;
        z80.f |= sz53p_table[bytetemp];
      }
      that.mem.writebyte(tempaddr, bytetemp);
    }
  };
  ops[0x3f] = function op_0x3f(tempaddr) {
    that.tstates += 8;
    z80.a = that.mem.readbyte(tempaddr);
    {
      z80.f = z80.a & 0x01;
      z80.a >>= 1;
      z80.f |= sz53p_table[z80.a];
    }
    that.mem.writebyte(tempaddr, z80.a);
  };
  ops[0x40] = ops[0x41] = ops[0x42] = ops[0x43] = ops[0x44] = ops[0x45] = ops[0x46] = ops[0x47] = function op_0x47(
    tempaddr
  ) {
    that.tstates += 5;
    {
      var bytetemp = that.mem.readbyte(tempaddr);
      {
        z80.f = (z80.f & 0x01) | 0x10 | ((tempaddr >> 8) & (0x08 | 0x20));
        if (!(bytetemp & (0x01 << 0))) z80.f |= 0x04 | 0x40;
        if (0 == 7 && bytetemp & 0x80) z80.f |= 0x80;
      }
    }
  };
  ops[0x48] = ops[0x49] = ops[0x4a] = ops[0x4b] = ops[0x4c] = ops[0x4d] = ops[0x4e] = ops[0x4f] = function op_0x4f(
    tempaddr
  ) {
    that.tstates += 5;
    {
      var bytetemp = that.mem.readbyte(tempaddr);
      {
        z80.f = (z80.f & 0x01) | 0x10 | ((tempaddr >> 8) & (0x08 | 0x20));
        if (!(bytetemp & (0x01 << 1))) z80.f |= 0x04 | 0x40;
        if (1 == 7 && bytetemp & 0x80) z80.f |= 0x80;
      }
    }
  };
  ops[0x50] = ops[0x51] = ops[0x52] = ops[0x53] = ops[0x54] = ops[0x55] = ops[0x56] = ops[0x57] = function op_0x57(
    tempaddr
  ) {
    that.tstates += 5;
    {
      var bytetemp = that.mem.readbyte(tempaddr);
      {
        z80.f = (z80.f & 0x01) | 0x10 | ((tempaddr >> 8) & (0x08 | 0x20));
        if (!(bytetemp & (0x01 << 2))) z80.f |= 0x04 | 0x40;
        if (2 == 7 && bytetemp & 0x80) z80.f |= 0x80;
      }
    }
  };
  ops[0x58] = ops[0x59] = ops[0x5a] = ops[0x5b] = ops[0x5c] = ops[0x5d] = ops[0x5e] = ops[0x5f] = function op_0x5f(
    tempaddr
  ) {
    that.tstates += 5;
    {
      var bytetemp = that.mem.readbyte(tempaddr);
      {
        z80.f = (z80.f & 0x01) | 0x10 | ((tempaddr >> 8) & (0x08 | 0x20));
        if (!(bytetemp & (0x01 << 3))) z80.f |= 0x04 | 0x40;
        if (3 == 7 && bytetemp & 0x80) z80.f |= 0x80;
      }
    }
  };
  ops[0x60] = ops[0x61] = ops[0x62] = ops[0x63] = ops[0x64] = ops[0x65] = ops[0x66] = ops[0x67] = function op_0x67(
    tempaddr
  ) {
    that.tstates += 5;
    {
      var bytetemp = that.mem.readbyte(tempaddr);
      {
        z80.f = (z80.f & 0x01) | 0x10 | ((tempaddr >> 8) & (0x08 | 0x20));
        if (!(bytetemp & (0x01 << 4))) z80.f |= 0x04 | 0x40;
        if (4 == 7 && bytetemp & 0x80) z80.f |= 0x80;
      }
    }
  };
  ops[0x68] = ops[0x69] = ops[0x6a] = ops[0x6b] = ops[0x6c] = ops[0x6d] = ops[0x6e] = ops[0x6f] = function op_0x6f(
    tempaddr
  ) {
    that.tstates += 5;
    {
      var bytetemp = that.mem.readbyte(tempaddr);
      {
        z80.f = (z80.f & 0x01) | 0x10 | ((tempaddr >> 8) & (0x08 | 0x20));
        if (!(bytetemp & (0x01 << 5))) z80.f |= 0x04 | 0x40;
        if (5 == 7 && bytetemp & 0x80) z80.f |= 0x80;
      }
    }
  };
  ops[0x70] = ops[0x71] = ops[0x72] = ops[0x73] = ops[0x74] = ops[0x75] = ops[0x76] = ops[0x77] = function op_0x77(
    tempaddr
  ) {
    that.tstates += 5;
    {
      var bytetemp = that.mem.readbyte(tempaddr);
      {
        z80.f = (z80.f & 0x01) | 0x10 | ((tempaddr >> 8) & (0x08 | 0x20));
        if (!(bytetemp & (0x01 << 6))) z80.f |= 0x04 | 0x40;
        if (6 == 7 && bytetemp & 0x80) z80.f |= 0x80;
      }
    }
  };
  ops[0x78] = ops[0x79] = ops[0x7a] = ops[0x7b] = ops[0x7c] = ops[0x7d] = ops[0x7e] = ops[0x7f] = function op_0x7f(
    tempaddr
  ) {
    that.tstates += 5;
    {
      var bytetemp = that.mem.readbyte(tempaddr);
      {
        z80.f = (z80.f & 0x01) | 0x10 | ((tempaddr >> 8) & (0x08 | 0x20));
        if (!(bytetemp & (0x01 << 7))) z80.f |= 0x04 | 0x40;
        if (7 == 7 && bytetemp & 0x80) z80.f |= 0x80;
      }
    }
  };
  ops[0x80] = function op_0x80(tempaddr) {
    that.tstates += 8;
    z80.b = that.mem.readbyte(tempaddr) & 0xfe;
    that.mem.writebyte(tempaddr, z80.b);
  };
  ops[0x81] = function op_0x81(tempaddr) {
    that.tstates += 8;
    z80.c = that.mem.readbyte(tempaddr) & 0xfe;
    that.mem.writebyte(tempaddr, z80.c);
  };
  ops[0x82] = function op_0x82(tempaddr) {
    that.tstates += 8;
    z80.d = that.mem.readbyte(tempaddr) & 0xfe;
    that.mem.writebyte(tempaddr, z80.d);
  };
  ops[0x83] = function op_0x83(tempaddr) {
    that.tstates += 8;
    z80.e = that.mem.readbyte(tempaddr) & 0xfe;
    that.mem.writebyte(tempaddr, z80.e);
  };
  ops[0x84] = function op_0x84(tempaddr) {
    that.tstates += 8;
    z80.h = that.mem.readbyte(tempaddr) & 0xfe;
    that.mem.writebyte(tempaddr, z80.h);
  };
  ops[0x85] = function op_0x85(tempaddr) {
    that.tstates += 8;
    z80.l = that.mem.readbyte(tempaddr) & 0xfe;
    that.mem.writebyte(tempaddr, z80.l);
  };
  ops[0x86] = function op_0x86(tempaddr) {
    that.tstates += 8;
    that.mem.writebyte(tempaddr, that.mem.readbyte(tempaddr) & 0xfe);
  };
  ops[0x87] = function op_0x87(tempaddr) {
    that.tstates += 8;
    z80.a = that.mem.readbyte(tempaddr) & 0xfe;
    that.mem.writebyte(tempaddr, z80.a);
  };
  ops[0x88] = function op_0x88(tempaddr) {
    that.tstates += 8;
    z80.b = that.mem.readbyte(tempaddr) & 0xfd;
    that.mem.writebyte(tempaddr, z80.b);
  };
  ops[0x89] = function op_0x89(tempaddr) {
    that.tstates += 8;
    z80.c = that.mem.readbyte(tempaddr) & 0xfd;
    that.mem.writebyte(tempaddr, z80.c);
  };
  ops[0x8a] = function op_0x8a(tempaddr) {
    that.tstates += 8;
    z80.d = that.mem.readbyte(tempaddr) & 0xfd;
    that.mem.writebyte(tempaddr, z80.d);
  };
  ops[0x8b] = function op_0x8b(tempaddr) {
    that.tstates += 8;
    z80.e = that.mem.readbyte(tempaddr) & 0xfd;
    that.mem.writebyte(tempaddr, z80.e);
  };
  ops[0x8c] = function op_0x8c(tempaddr) {
    that.tstates += 8;
    z80.h = that.mem.readbyte(tempaddr) & 0xfd;
    that.mem.writebyte(tempaddr, z80.h);
  };
  ops[0x8d] = function op_0x8d(tempaddr) {
    that.tstates += 8;
    z80.l = that.mem.readbyte(tempaddr) & 0xfd;
    that.mem.writebyte(tempaddr, z80.l);
  };
  ops[0x8e] = function op_0x8e(tempaddr) {
    that.tstates += 8;
    that.mem.writebyte(tempaddr, that.mem.readbyte(tempaddr) & 0xfd);
  };
  ops[0x8f] = function op_0x8f(tempaddr) {
    that.tstates += 8;
    z80.a = that.mem.readbyte(tempaddr) & 0xfd;
    that.mem.writebyte(tempaddr, z80.a);
  };
  ops[0x90] = function op_0x90(tempaddr) {
    that.tstates += 8;
    z80.b = that.mem.readbyte(tempaddr) & 0xfb;
    that.mem.writebyte(tempaddr, z80.b);
  };
  ops[0x91] = function op_0x91(tempaddr) {
    that.tstates += 8;
    z80.c = that.mem.readbyte(tempaddr) & 0xfb;
    that.mem.writebyte(tempaddr, z80.c);
  };
  ops[0x92] = function op_0x92(tempaddr) {
    that.tstates += 8;
    z80.d = that.mem.readbyte(tempaddr) & 0xfb;
    that.mem.writebyte(tempaddr, z80.d);
  };
  ops[0x93] = function op_0x93(tempaddr) {
    that.tstates += 8;
    z80.e = that.mem.readbyte(tempaddr) & 0xfb;
    that.mem.writebyte(tempaddr, z80.e);
  };
  ops[0x94] = function op_0x94(tempaddr) {
    that.tstates += 8;
    z80.h = that.mem.readbyte(tempaddr) & 0xfb;
    that.mem.writebyte(tempaddr, z80.h);
  };
  ops[0x95] = function op_0x95(tempaddr) {
    that.tstates += 8;
    z80.l = that.mem.readbyte(tempaddr) & 0xfb;
    that.mem.writebyte(tempaddr, z80.l);
  };
  ops[0x96] = function op_0x96(tempaddr) {
    that.tstates += 8;
    that.mem.writebyte(tempaddr, that.mem.readbyte(tempaddr) & 0xfb);
  };
  ops[0x97] = function op_0x97(tempaddr) {
    that.tstates += 8;
    z80.a = that.mem.readbyte(tempaddr) & 0xfb;
    that.mem.writebyte(tempaddr, z80.a);
  };
  ops[0x98] = function op_0x98(tempaddr) {
    that.tstates += 8;
    z80.b = that.mem.readbyte(tempaddr) & 0xf7;
    that.mem.writebyte(tempaddr, z80.b);
  };
  ops[0x99] = function op_0x99(tempaddr) {
    that.tstates += 8;
    z80.c = that.mem.readbyte(tempaddr) & 0xf7;
    that.mem.writebyte(tempaddr, z80.c);
  };
  ops[0x9a] = function op_0x9a(tempaddr) {
    that.tstates += 8;
    z80.d = that.mem.readbyte(tempaddr) & 0xf7;
    that.mem.writebyte(tempaddr, z80.d);
  };
  ops[0x9b] = function op_0x9b(tempaddr) {
    that.tstates += 8;
    z80.e = that.mem.readbyte(tempaddr) & 0xf7;
    that.mem.writebyte(tempaddr, z80.e);
  };
  ops[0x9c] = function op_0x9c(tempaddr) {
    that.tstates += 8;
    z80.h = that.mem.readbyte(tempaddr) & 0xf7;
    that.mem.writebyte(tempaddr, z80.h);
  };
  ops[0x9d] = function op_0x9d(tempaddr) {
    that.tstates += 8;
    z80.l = that.mem.readbyte(tempaddr) & 0xf7;
    that.mem.writebyte(tempaddr, z80.l);
  };
  ops[0x9e] = function op_0x9e(tempaddr) {
    that.tstates += 8;
    that.mem.writebyte(tempaddr, that.mem.readbyte(tempaddr) & 0xf7);
  };
  ops[0x9f] = function op_0x9f(tempaddr) {
    that.tstates += 8;
    z80.a = that.mem.readbyte(tempaddr) & 0xf7;
    that.mem.writebyte(tempaddr, z80.a);
  };
  ops[0xa0] = function op_0xa0(tempaddr) {
    that.tstates += 8;
    z80.b = that.mem.readbyte(tempaddr) & 0xef;
    that.mem.writebyte(tempaddr, z80.b);
  };
  ops[0xa1] = function op_0xa1(tempaddr) {
    that.tstates += 8;
    z80.c = that.mem.readbyte(tempaddr) & 0xef;
    that.mem.writebyte(tempaddr, z80.c);
  };
  ops[0xa2] = function op_0xa2(tempaddr) {
    that.tstates += 8;
    z80.d = that.mem.readbyte(tempaddr) & 0xef;
    that.mem.writebyte(tempaddr, z80.d);
  };
  ops[0xa3] = function op_0xa3(tempaddr) {
    that.tstates += 8;
    z80.e = that.mem.readbyte(tempaddr) & 0xef;
    that.mem.writebyte(tempaddr, z80.e);
  };
  ops[0xa4] = function op_0xa4(tempaddr) {
    that.tstates += 8;
    z80.h = that.mem.readbyte(tempaddr) & 0xef;
    that.mem.writebyte(tempaddr, z80.h);
  };
  ops[0xa5] = function op_0xa5(tempaddr) {
    that.tstates += 8;
    z80.l = that.mem.readbyte(tempaddr) & 0xef;
    that.mem.writebyte(tempaddr, z80.l);
  };
  ops[0xa6] = function op_0xa6(tempaddr) {
    that.tstates += 8;
    that.mem.writebyte(tempaddr, that.mem.readbyte(tempaddr) & 0xef);
  };
  ops[0xa7] = function op_0xa7(tempaddr) {
    that.tstates += 8;
    z80.a = that.mem.readbyte(tempaddr) & 0xef;
    that.mem.writebyte(tempaddr, z80.a);
  };
  ops[0xa8] = function op_0xa8(tempaddr) {
    that.tstates += 8;
    z80.b = that.mem.readbyte(tempaddr) & 0xdf;
    that.mem.writebyte(tempaddr, z80.b);
  };
  ops[0xa9] = function op_0xa9(tempaddr) {
    that.tstates += 8;
    z80.c = that.mem.readbyte(tempaddr) & 0xdf;
    that.mem.writebyte(tempaddr, z80.c);
  };
  ops[0xaa] = function op_0xaa(tempaddr) {
    that.tstates += 8;
    z80.d = that.mem.readbyte(tempaddr) & 0xdf;
    that.mem.writebyte(tempaddr, z80.d);
  };
  ops[0xab] = function op_0xab(tempaddr) {
    that.tstates += 8;
    z80.e = that.mem.readbyte(tempaddr) & 0xdf;
    that.mem.writebyte(tempaddr, z80.e);
  };
  ops[0xac] = function op_0xac(tempaddr) {
    that.tstates += 8;
    z80.h = that.mem.readbyte(tempaddr) & 0xdf;
    that.mem.writebyte(tempaddr, z80.h);
  };
  ops[0xad] = function op_0xad(tempaddr) {
    that.tstates += 8;
    z80.l = that.mem.readbyte(tempaddr) & 0xdf;
    that.mem.writebyte(tempaddr, z80.l);
  };
  ops[0xae] = function op_0xae(tempaddr) {
    that.tstates += 8;
    that.mem.writebyte(tempaddr, that.mem.readbyte(tempaddr) & 0xdf);
  };
  ops[0xaf] = function op_0xaf(tempaddr) {
    that.tstates += 8;
    z80.a = that.mem.readbyte(tempaddr) & 0xdf;
    that.mem.writebyte(tempaddr, z80.a);
  };
  ops[0xb0] = function op_0xb0(tempaddr) {
    that.tstates += 8;
    z80.b = that.mem.readbyte(tempaddr) & 0xbf;
    that.mem.writebyte(tempaddr, z80.b);
  };
  ops[0xb1] = function op_0xb1(tempaddr) {
    that.tstates += 8;
    z80.c = that.mem.readbyte(tempaddr) & 0xbf;
    that.mem.writebyte(tempaddr, z80.c);
  };
  ops[0xb2] = function op_0xb2(tempaddr) {
    that.tstates += 8;
    z80.d = that.mem.readbyte(tempaddr) & 0xbf;
    that.mem.writebyte(tempaddr, z80.d);
  };
  ops[0xb3] = function op_0xb3(tempaddr) {
    that.tstates += 8;
    z80.e = that.mem.readbyte(tempaddr) & 0xbf;
    that.mem.writebyte(tempaddr, z80.e);
  };
  ops[0xb4] = function op_0xb4(tempaddr) {
    that.tstates += 8;
    z80.h = that.mem.readbyte(tempaddr) & 0xbf;
    that.mem.writebyte(tempaddr, z80.h);
  };
  ops[0xb5] = function op_0xb5(tempaddr) {
    that.tstates += 8;
    z80.l = that.mem.readbyte(tempaddr) & 0xbf;
    that.mem.writebyte(tempaddr, z80.l);
  };
  ops[0xb6] = function op_0xb6(tempaddr) {
    that.tstates += 8;
    that.mem.writebyte(tempaddr, that.mem.readbyte(tempaddr) & 0xbf);
  };
  ops[0xb7] = function op_0xb7(tempaddr) {
    that.tstates += 8;
    z80.a = that.mem.readbyte(tempaddr) & 0xbf;
    that.mem.writebyte(tempaddr, z80.a);
  };
  ops[0xb8] = function op_0xb8(tempaddr) {
    that.tstates += 8;
    z80.b = that.mem.readbyte(tempaddr) & 0x7f;
    that.mem.writebyte(tempaddr, z80.b);
  };
  ops[0xb9] = function op_0xb9(tempaddr) {
    that.tstates += 8;
    z80.c = that.mem.readbyte(tempaddr) & 0x7f;
    that.mem.writebyte(tempaddr, z80.c);
  };
  ops[0xba] = function op_0xba(tempaddr) {
    that.tstates += 8;
    z80.d = that.mem.readbyte(tempaddr) & 0x7f;
    that.mem.writebyte(tempaddr, z80.d);
  };
  ops[0xbb] = function op_0xbb(tempaddr) {
    that.tstates += 8;
    z80.e = that.mem.readbyte(tempaddr) & 0x7f;
    that.mem.writebyte(tempaddr, z80.e);
  };
  ops[0xbc] = function op_0xbc(tempaddr) {
    that.tstates += 8;
    z80.h = that.mem.readbyte(tempaddr) & 0x7f;
    that.mem.writebyte(tempaddr, z80.h);
  };
  ops[0xbd] = function op_0xbd(tempaddr) {
    that.tstates += 8;
    z80.l = that.mem.readbyte(tempaddr) & 0x7f;
    that.mem.writebyte(tempaddr, z80.l);
  };
  ops[0xbe] = function op_0xbe(tempaddr) {
    that.tstates += 8;
    that.mem.writebyte(tempaddr, that.mem.readbyte(tempaddr) & 0x7f);
  };
  ops[0xbf] = function op_0xbf(tempaddr) {
    that.tstates += 8;
    z80.a = that.mem.readbyte(tempaddr) & 0x7f;
    that.mem.writebyte(tempaddr, z80.a);
  };
  ops[0xc0] = function op_0xc0(tempaddr) {
    that.tstates += 8;
    z80.b = that.mem.readbyte(tempaddr) | 0x01;
    that.mem.writebyte(tempaddr, z80.b);
  };
  ops[0xc1] = function op_0xc1(tempaddr) {
    that.tstates += 8;
    z80.c = that.mem.readbyte(tempaddr) | 0x01;
    that.mem.writebyte(tempaddr, z80.c);
  };
  ops[0xc2] = function op_0xc2(tempaddr) {
    that.tstates += 8;
    z80.d = that.mem.readbyte(tempaddr) | 0x01;
    that.mem.writebyte(tempaddr, z80.d);
  };
  ops[0xc3] = function op_0xc3(tempaddr) {
    that.tstates += 8;
    z80.e = that.mem.readbyte(tempaddr) | 0x01;
    that.mem.writebyte(tempaddr, z80.e);
  };
  ops[0xc4] = function op_0xc4(tempaddr) {
    that.tstates += 8;
    z80.h = that.mem.readbyte(tempaddr) | 0x01;
    that.mem.writebyte(tempaddr, z80.h);
  };
  ops[0xc5] = function op_0xc5(tempaddr) {
    that.tstates += 8;
    z80.l = that.mem.readbyte(tempaddr) | 0x01;
    that.mem.writebyte(tempaddr, z80.l);
  };
  ops[0xc6] = function op_0xc6(tempaddr) {
    that.tstates += 8;
    that.mem.writebyte(tempaddr, that.mem.readbyte(tempaddr) | 0x01);
  };
  ops[0xc7] = function op_0xc7(tempaddr) {
    that.tstates += 8;
    z80.a = that.mem.readbyte(tempaddr) | 0x01;
    that.mem.writebyte(tempaddr, z80.a);
  };
  ops[0xc8] = function op_0xc8(tempaddr) {
    that.tstates += 8;
    z80.b = that.mem.readbyte(tempaddr) | 0x02;
    that.mem.writebyte(tempaddr, z80.b);
  };
  ops[0xc9] = function op_0xc9(tempaddr) {
    that.tstates += 8;
    z80.c = that.mem.readbyte(tempaddr) | 0x02;
    that.mem.writebyte(tempaddr, z80.c);
  };
  ops[0xca] = function op_0xca(tempaddr) {
    that.tstates += 8;
    z80.d = that.mem.readbyte(tempaddr) | 0x02;
    that.mem.writebyte(tempaddr, z80.d);
  };
  ops[0xcb] = function op_0xcb(tempaddr) {
    that.tstates += 8;
    z80.e = that.mem.readbyte(tempaddr) | 0x02;
    that.mem.writebyte(tempaddr, z80.e);
  };
  ops[0xcc] = function op_0xcc(tempaddr) {
    that.tstates += 8;
    z80.h = that.mem.readbyte(tempaddr) | 0x02;
    that.mem.writebyte(tempaddr, z80.h);
  };
  ops[0xcd] = function op_0xcd(tempaddr) {
    that.tstates += 8;
    z80.l = that.mem.readbyte(tempaddr) | 0x02;
    that.mem.writebyte(tempaddr, z80.l);
  };
  ops[0xce] = function op_0xce(tempaddr) {
    that.tstates += 8;
    that.mem.writebyte(tempaddr, that.mem.readbyte(tempaddr) | 0x02);
  };
  ops[0xcf] = function op_0xcf(tempaddr) {
    that.tstates += 8;
    z80.a = that.mem.readbyte(tempaddr) | 0x02;
    that.mem.writebyte(tempaddr, z80.a);
  };
  ops[0xd0] = function op_0xd0(tempaddr) {
    that.tstates += 8;
    z80.b = that.mem.readbyte(tempaddr) | 0x04;
    that.mem.writebyte(tempaddr, z80.b);
  };
  ops[0xd1] = function op_0xd1(tempaddr) {
    that.tstates += 8;
    z80.c = that.mem.readbyte(tempaddr) | 0x04;
    that.mem.writebyte(tempaddr, z80.c);
  };
  ops[0xd2] = function op_0xd2(tempaddr) {
    that.tstates += 8;
    z80.d = that.mem.readbyte(tempaddr) | 0x04;
    that.mem.writebyte(tempaddr, z80.d);
  };
  ops[0xd3] = function op_0xd3(tempaddr) {
    that.tstates += 8;
    z80.e = that.mem.readbyte(tempaddr) | 0x04;
    that.mem.writebyte(tempaddr, z80.e);
  };
  ops[0xd4] = function op_0xd4(tempaddr) {
    that.tstates += 8;
    z80.h = that.mem.readbyte(tempaddr) | 0x04;
    that.mem.writebyte(tempaddr, z80.h);
  };
  ops[0xd5] = function op_0xd5(tempaddr) {
    that.tstates += 8;
    z80.l = that.mem.readbyte(tempaddr) | 0x04;
    that.mem.writebyte(tempaddr, z80.l);
  };
  ops[0xd6] = function op_0xd6(tempaddr) {
    that.tstates += 8;
    that.mem.writebyte(tempaddr, that.mem.readbyte(tempaddr) | 0x04);
  };
  ops[0xd7] = function op_0xd7(tempaddr) {
    that.tstates += 8;
    z80.a = that.mem.readbyte(tempaddr) | 0x04;
    that.mem.writebyte(tempaddr, z80.a);
  };
  ops[0xd8] = function op_0xd8(tempaddr) {
    that.tstates += 8;
    z80.b = that.mem.readbyte(tempaddr) | 0x08;
    that.mem.writebyte(tempaddr, z80.b);
  };
  ops[0xd9] = function op_0xd9(tempaddr) {
    that.tstates += 8;
    z80.c = that.mem.readbyte(tempaddr) | 0x08;
    that.mem.writebyte(tempaddr, z80.c);
  };
  ops[0xda] = function op_0xda(tempaddr) {
    that.tstates += 8;
    z80.d = that.mem.readbyte(tempaddr) | 0x08;
    that.mem.writebyte(tempaddr, z80.d);
  };
  ops[0xdb] = function op_0xdb(tempaddr) {
    that.tstates += 8;
    z80.e = that.mem.readbyte(tempaddr) | 0x08;
    that.mem.writebyte(tempaddr, z80.e);
  };
  ops[0xdc] = function op_0xdc(tempaddr) {
    that.tstates += 8;
    z80.h = that.mem.readbyte(tempaddr) | 0x08;
    that.mem.writebyte(tempaddr, z80.h);
  };
  ops[0xdd] = function op_0xdd(tempaddr) {
    that.tstates += 8;
    z80.l = that.mem.readbyte(tempaddr) | 0x08;
    that.mem.writebyte(tempaddr, z80.l);
  };
  ops[0xde] = function op_0xde(tempaddr) {
    that.tstates += 8;
    that.mem.writebyte(tempaddr, that.mem.readbyte(tempaddr) | 0x08);
  };
  ops[0xdf] = function op_0xdf(tempaddr) {
    that.tstates += 8;
    z80.a = that.mem.readbyte(tempaddr) | 0x08;
    that.mem.writebyte(tempaddr, z80.a);
  };
  ops[0xe0] = function op_0xe0(tempaddr) {
    that.tstates += 8;
    z80.b = that.mem.readbyte(tempaddr) | 0x10;
    that.mem.writebyte(tempaddr, z80.b);
  };
  ops[0xe1] = function op_0xe1(tempaddr) {
    that.tstates += 8;
    z80.c = that.mem.readbyte(tempaddr) | 0x10;
    that.mem.writebyte(tempaddr, z80.c);
  };
  ops[0xe2] = function op_0xe2(tempaddr) {
    that.tstates += 8;
    z80.d = that.mem.readbyte(tempaddr) | 0x10;
    that.mem.writebyte(tempaddr, z80.d);
  };
  ops[0xe3] = function op_0xe3(tempaddr) {
    that.tstates += 8;
    z80.e = that.mem.readbyte(tempaddr) | 0x10;
    that.mem.writebyte(tempaddr, z80.e);
  };
  ops[0xe4] = function op_0xe4(tempaddr) {
    that.tstates += 8;
    z80.h = that.mem.readbyte(tempaddr) | 0x10;
    that.mem.writebyte(tempaddr, z80.h);
  };
  ops[0xe5] = function op_0xe5(tempaddr) {
    that.tstates += 8;
    z80.l = that.mem.readbyte(tempaddr) | 0x10;
    that.mem.writebyte(tempaddr, z80.l);
  };
  ops[0xe6] = function op_0xe6(tempaddr) {
    that.tstates += 8;
    that.mem.writebyte(tempaddr, that.mem.readbyte(tempaddr) | 0x10);
  };
  ops[0xe7] = function op_0xe7(tempaddr) {
    that.tstates += 8;
    z80.a = that.mem.readbyte(tempaddr) | 0x10;
    that.mem.writebyte(tempaddr, z80.a);
  };
  ops[0xe8] = function op_0xe8(tempaddr) {
    that.tstates += 8;
    z80.b = that.mem.readbyte(tempaddr) | 0x20;
    that.mem.writebyte(tempaddr, z80.b);
  };
  ops[0xe9] = function op_0xe9(tempaddr) {
    that.tstates += 8;
    z80.c = that.mem.readbyte(tempaddr) | 0x20;
    that.mem.writebyte(tempaddr, z80.c);
  };
  ops[0xea] = function op_0xea(tempaddr) {
    that.tstates += 8;
    z80.d = that.mem.readbyte(tempaddr) | 0x20;
    that.mem.writebyte(tempaddr, z80.d);
  };
  ops[0xeb] = function op_0xeb(tempaddr) {
    that.tstates += 8;
    z80.e = that.mem.readbyte(tempaddr) | 0x20;
    that.mem.writebyte(tempaddr, z80.e);
  };
  ops[0xec] = function op_0xec(tempaddr) {
    that.tstates += 8;
    z80.h = that.mem.readbyte(tempaddr) | 0x20;
    that.mem.writebyte(tempaddr, z80.h);
  };
  ops[0xed] = function op_0xed(tempaddr) {
    that.tstates += 8;
    z80.l = that.mem.readbyte(tempaddr) | 0x20;
    that.mem.writebyte(tempaddr, z80.l);
  };
  ops[0xee] = function op_0xee(tempaddr) {
    that.tstates += 8;
    that.mem.writebyte(tempaddr, that.mem.readbyte(tempaddr) | 0x20);
  };
  ops[0xef] = function op_0xef(tempaddr) {
    that.tstates += 8;
    z80.a = that.mem.readbyte(tempaddr) | 0x20;
    that.mem.writebyte(tempaddr, z80.a);
  };
  ops[0xf0] = function op_0xf0(tempaddr) {
    that.tstates += 8;
    z80.b = that.mem.readbyte(tempaddr) | 0x40;
    that.mem.writebyte(tempaddr, z80.b);
  };
  ops[0xf1] = function op_0xf1(tempaddr) {
    that.tstates += 8;
    z80.c = that.mem.readbyte(tempaddr) | 0x40;
    that.mem.writebyte(tempaddr, z80.c);
  };
  ops[0xf2] = function op_0xf2(tempaddr) {
    that.tstates += 8;
    z80.d = that.mem.readbyte(tempaddr) | 0x40;
    that.mem.writebyte(tempaddr, z80.d);
  };
  ops[0xf3] = function op_0xf3(tempaddr) {
    that.tstates += 8;
    z80.e = that.mem.readbyte(tempaddr) | 0x40;
    that.mem.writebyte(tempaddr, z80.e);
  };
  ops[0xf4] = function op_0xf4(tempaddr) {
    that.tstates += 8;
    z80.h = that.mem.readbyte(tempaddr) | 0x40;
    that.mem.writebyte(tempaddr, z80.h);
  };
  ops[0xf5] = function op_0xf5(tempaddr) {
    that.tstates += 8;
    z80.l = that.mem.readbyte(tempaddr) | 0x40;
    that.mem.writebyte(tempaddr, z80.l);
  };
  ops[0xf6] = function op_0xf6(tempaddr) {
    that.tstates += 8;
    that.mem.writebyte(tempaddr, that.mem.readbyte(tempaddr) | 0x40);
  };
  ops[0xf7] = function op_0xf7(tempaddr) {
    that.tstates += 8;
    z80.a = that.mem.readbyte(tempaddr) | 0x40;
    that.mem.writebyte(tempaddr, z80.a);
  };
  ops[0xf8] = function op_0xf8(tempaddr) {
    that.tstates += 8;
    z80.b = that.mem.readbyte(tempaddr) | 0x80;
    that.mem.writebyte(tempaddr, z80.b);
  };
  ops[0xf9] = function op_0xf9(tempaddr) {
    that.tstates += 8;
    z80.c = that.mem.readbyte(tempaddr) | 0x80;
    that.mem.writebyte(tempaddr, z80.c);
  };
  ops[0xfa] = function op_0xfa(tempaddr) {
    that.tstates += 8;
    z80.d = that.mem.readbyte(tempaddr) | 0x80;
    that.mem.writebyte(tempaddr, z80.d);
  };
  ops[0xfb] = function op_0xfb(tempaddr) {
    that.tstates += 8;
    z80.e = that.mem.readbyte(tempaddr) | 0x80;
    that.mem.writebyte(tempaddr, z80.e);
  };
  ops[0xfc] = function op_0xfc(tempaddr) {
    that.tstates += 8;
    z80.h = that.mem.readbyte(tempaddr) | 0x80;
    that.mem.writebyte(tempaddr, z80.h);
  };
  ops[0xfd] = function op_0xfd(tempaddr) {
    that.tstates += 8;
    z80.l = that.mem.readbyte(tempaddr) | 0x80;
    that.mem.writebyte(tempaddr, z80.l);
  };
  ops[0xfe] = function op_0xfe(tempaddr) {
    that.tstates += 8;
    that.mem.writebyte(tempaddr, that.mem.readbyte(tempaddr) | 0x80);
  };
  ops[0xff] = function op_0xff(tempaddr) {
    that.tstates += 8;
    z80.a = that.mem.readbyte(tempaddr) | 0x80;
    that.mem.writebyte(tempaddr, z80.a);
  };
  ops[256] = function () {};
  z80_defaults(ops);
  return ops;
})();

function z80_do_opcodes(cycleCallback,onstep) {
  while (that.tstates < that.event_next_event || onstep) {
    if (z80.irq_pending && z80.iff1) {
      if (z80.irq_suppress) {
        z80.irq_suppress = false;
      } else {
        z80.irq_suppress = true;
        z80_interrupt();
      }
    }
    var oldTstates = that.tstates;
    that.tstates += 4;

    z80.r = (z80.r + 1) & 0x7f;
    var opcode = that.mem.readbyte(z80.pc);
    if(onstep)this.showInfo(z80.pc,opcode)
    z80_instruction_hook(z80.pc, opcode);
    z80.pc = (z80.pc + 1) & 0xffff;
    
    z80_base_ops(opcode);
    cycleCallback(that.tstates + oldTstates);

    if(onstep)break;
  }
}
function showInfo(pc,opcode){
  let rval = this.Instructions(opcode)
  console.log("");
  console.log("PC      : " + this.toHex(pc));
  console.log("OPCODE  : "+rval.opCode);
  console.log("OPHEX   : "+this.toHex(opcode));
}
function toHex (v) {
  return '0x' + (('0000' + v.toString(16).toUpperCase()).substr(-4));
}
function Instructions (opecode){
  const output = {
    opecode:opecode.toString(16)
  };
  switch (opecode) {
    case 0x00:
      output.opCode = "NOP";
      output.z80OPCode = "NOP";
      return output;
    case 0x01:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x02:
      output.opCode = "LD2M";
      output.z80OPCode = "LD";
      return output;
    case 0x03:
      output.opCode = "INCR";
      output.z80OPCode = "INC";
      return output;
    case 0x04:
      output.opCode = "INCR";
      output.z80OPCode = "INC";
      return output;
    case 0x05:
      output.opCode = "DCRR";
      output.z80OPCode = "LD";
      return output;
    case 0x06:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x07:
      output.opCode = "RLCA";
      output.z80OPCode = "RCLA";
      return output;
    case 0x08:
      output.opCode = "NOP";
      output.z80OPCode = "NOP";
      return output;
    case 0x09:
      output.opCode = "INXR";
      output.z80OPCode = "ADD";
      return output;
    case 0x0a:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x0b:
      output.opCode = "DCRR";
      output.z80OPCode = "DEC";
      return output;
    case 0x0c:
      output.opCode = "INCR";
      output.z80OPCode = "INC";
      return output;
    case 0x0d:
      output.opCode = "DCRR";
      output.z80OPCode = "DEC";
      return output;
    case 0x0e:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x0f:
      output.opCode = "RRCA";
      output.z80OPCode = "RRCA";
      return output;
    case 0x10:
      output.opCode = "NOP";
      output.z80OPCode = "NOP";
      return output;
    case 0x11:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x12:
      output.opCode = "LD2M";
      output.z80OPCode = "LD";
      return output;
    case 0x13:
      output.opCode = "INCR";
      output.z80OPCode = "INC";
      return output;
    case 0x14:
      output.opCode = "INCR";
      output.z80OPCode = "INC";
      return output;
    case 0x15:
      output.opCode = "DCRR";
      output.z80OPCode = "DEC";
      return output;
    case 0x16:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x17:
      output.opCode = "RLC9";
      output.z80OPCode = "RLA";
      return output;
    case 0x18:
      output.opCode = "NOP";
      output.z80OPCode = "NOP";
      return output;
    case 0x19:
      output.opCode = "INXR";
      output.z80OPCode = "ADD";
      return output;
    case 0x1a:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x1b:
      output.opCode = "DCRR";
      output.z80OPCode = "DEC";
      return output;
    case 0x1c:
      output.opCode = "INCR";
      output.z80OPCode = "INC";
      return output;
    case 0x1d:
      output.opCode = "DCRR";
      output.z80OPCode = "DEC";
      return output;
    case 0x1e:
      output.opCode = "UNKOP";
      output.z80OPCode = "LD";
      return output;
    case 0x1f:
      output.opCode = "RRC";
      output.z80OPCode = "RRA";
      return output;
    case 0x20:
      output.opCode = "NOP";
      output.z80OPCode = "NOP";
      return output;
    case 0x21:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x22:
      output.opCode = "LD2M";
      output.z80OPCode = "LD";
      return output;
    case 0x23:
      output.opCode = "INCR";
      output.z80OPCode = "INC";
      return output;
    case 0x24:
      output.opCode = "INCR";
      output.z80OPCode = "INC";
      return output;
    case 0x25:
      output.opCode = "DCRR";
      output.z80OPCode = "DEC";
      return output;
    case 0x26:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x27:
      output.opCode = "NOP";
      output.z80OPCode = "DAA";
      return output;
    case 0x28:
      output.opCode = "NOP";
      output.z80OPCode = "NOP";
      return output;
    case 0x29:
      output.opCode = "INXR";
      output.z80OPCode = "ADD";
      return output;
    case 0x2a:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x2b:
      output.opCode = "DCRR";
      output.z80OPCode = "DEC";
      return output;
    case 0x2c:
      output.opCode = "INCR";
      output.z80OPCode = "INC";
      return output;
    case 0x2d:
      output.opCode = "DCRR";
      output.z80OPCode = "DEC";
      return output;
    case 0x2e:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x2f:
      output.opCode = "CPL";
      output.z80OPCode = "CPL";
      return output;
    case 0x30:
      output.opCode = "NOP";
      output.z80OPCode = "NOP";
      return output;
    case 0x31:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x32:
      output.opCode = "LD2M";
      output.z80OPCode = "INC";
      return output;
    case 0x33:
      output.opCode = "INCR";
      output.z80OPCode = "INC";
      return output;
    case 0x34:
      output.opCode = "INCM";
      output.z80OPCode = "INC";
      return output;
    case 0x35:
      output.opCode = "DCRM";
      output.z80OPCode = "DEC";
      return output;
    case 0x36:
      output.opCode = "LD2M";
      output.z80OPCode = "LD";
      return output;
    case 0x37:
      output.opCode = "SCF";
      output.z80OPCode = "SCF";
      return output;
    case 0x38:
      output.opCode = "NOP";
      output.z80OPCode = "NOP";
      return output;
    case 0x39:
      output.opCode = "INXR";
      output.z80OPCode = "ADD";
      return output;
    case 0x3a:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x3b:
      output.opCode = "DCRR";
      output.z80OPCode = "DEC";
      return output;
    case 0x3c:
      output.opCode = "INCR";
      output.z80OPCode = "INC";
      return output;
    case 0x3d:
      output.opCode = "DCRR";
      output.z80OPCode = "DEC";
      return output;
    case 0x3e:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x3f:
      output.opCode = "CCF";
      output.z80OPCode = "CCF";
      return output;
    case 0x40:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x41:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x42:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x43:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x44:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x45:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x46:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x47:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x48:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x49:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x4a:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x4b:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x4c:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x4d:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x4e:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x4f:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x50:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x51:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x52:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x53:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x54:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x55:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x56:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x57:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x58:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x59:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x5a:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x5b:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x5c:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x5d:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x5e:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x5f:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x60:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x61:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x62:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x63:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x64:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x65:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x66:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x67:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x68:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x69:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x6a:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x6b:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x6c:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x6d:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x6e:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x6f:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x70:
      output.opCode = "LD2M";
      output.z80OPCode = "LD";
      return output;
    case 0x71:
      output.opCode = "LD2M";
      output.z80OPCode = "LD";
      return output;
    case 0x72:
      output.opCode = "LD2M";
      output.z80OPCode = "LD";
      return output;
    case 0x73:
      output.opCode = "LD2M";
      output.z80OPCode = "LD";
      return output;
    case 0x74:
      output.opCode = "LD2M";
      output.z80OPCode = "LD";
      return output;
    case 0x75:
      output.opCode = "LD2M";
      output.z80OPCode = "LD";
      return output;
    case 0x76:
      output.opCode = "HLT";
      output.z80OPCode = "LD";
      return output;
    case 0x77:
      output.opCode = "LD2M";
      output.z80OPCode = "LD";
      return output;
    case 0x78:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x79:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x7a:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x7b:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x7c:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x7d:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x7e:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x7f:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0x80:
      output.opCode = "INXR";
      output.z80OPCode = "ADD";
      return output;
    case 0x81:
      output.opCode = "INXR";
      output.z80OPCode = "ADD";
      return output;
    case 0x82:
      output.opCode = "INXR";
      output.z80OPCode = "ADD";
      return output;
    case 0x83:
      output.opCode = "INXR";
      output.z80OPCode = "ADD";
      return output;
    case 0x84:
      output.opCode = "INXR";
      output.z80OPCode = "ADD";
      return output;
    case 0x85:
      output.opCode = "INXR";
      output.z80OPCode = "ADD";
      return output;
    case 0x86:
      output.opCode = "INXR";
      output.z80OPCode = "ADD";
      return output;
    case 0x87:
      output.opCode = "INXR";
      output.z80OPCode = "ADD";
      return output;
    case 0x88:
      output.opCode = "ICXR";
      output.z80OPCode = "ADD";
      return output;
    case 0x89:
      output.opCode = "ICXR";
      output.z80OPCode = "ADD";
      return output;
    case 0x8a:
      output.opCode = "ICXR";
      output.z80OPCode = "ADD";
      return output;
    case 0x8b:
      output.opCode = "ICXR";
      output.z80OPCode = "ADD";
      return output;
    case 0x8c:
      output.opCode = "ICXR";
      output.z80OPCode = "ADD";
      return output;
    case 0x8d:
      output.opCode = "ICXR";
      output.z80OPCode = "ADD";
      return output;
    case 0x8e:
      output.opCode = "ICXR";
      output.z80OPCode = "ADD";
      return output;
    case 0x8f:
      output.opCode = "ICXR";
      output.z80OPCode = "ADD";
      return output;
    case 0x90:
      output.opCode = "DCXR";
      output.z80OPCode = "SUB";
      return output;
    case 0x91:
      output.opCode = "DCXR";
      output.z80OPCode = "SUB";
      return output;
    case 0x92:
      output.opCode = "DCXR";
      output.z80OPCode = "SUB";
      return output;
    case 0x93:
      output.opCode = "DCXR";
      output.z80OPCode = "SUB";
      return output;
    case 0x94:
      output.opCode = "DCXR";
      output.z80OPCode = "SUB";
      return output;
    case 0x95:
      output.opCode = "DCXR";
      output.z80OPCode = "SUB";
      return output;
    case 0x96:
      output.opCode = "DCXR";
      output.z80OPCode = "SUB";
      return output;
    case 0x97:
      output.opCode = "DCXR";
      output.z80OPCode = "SUB";
      return output;
    case 0x98:
      output.opCode = "DEXR";
      output.z80OPCode = "SBC";
      return output;
    case 0x99:
      output.opCode = "DEXR";
      output.z80OPCode = "SBC";
      return output;
    case 0x9a:
      output.opCode = "DEXR";
      output.z80OPCode = "SBC";
      return output;
    case 0x9b:
      output.opCode = "DEXR";
      output.z80OPCode = "SBC";
      return output;
    case 0x9c:
      output.opCode = "DEXR";
      output.z80OPCode = "SBC";
      return output;
    case 0x9d:
      output.opCode = "DEXR";
      output.z80OPCode = "SBC";
      return output;
    case 0x9e:
      output.opCode = "DEXR";
      output.z80OPCode = "SBC";
      return output;
    case 0x9f:
      output.opCode = "DEXR";
      output.z80OPCode = "SBC";
      return output;
    case 0xa0:
      output.opCode = "ANDR";
      output.z80OPCode = "AND";
      return output;
    case 0xa1:
      output.opCode = "ANDR";
      output.z80OPCode = "AND";
      return output;
    case 0xa2:
      output.opCode = "ANDR";
      output.z80OPCode = "AND";
      return output;
    case 0xa3:
      output.opCode = "ANDR";
      output.z80OPCode = "AND";
      return output;
    case 0xa4:
      output.opCode = "ANDR";
      output.z80OPCode = "AND";
      return output;
    case 0xa5:
      output.opCode = "ANDR";
      output.z80OPCode = "AND";
      return output;
    case 0xa6:
      output.opCode = "ANDR";
      output.z80OPCode = "AND";
      return output;
    case 0xa7:
      output.opCode = "ANDR";
      output.z80OPCode = "AND";
      return output;
    case 0xa8:
      output.opCode = "XORR";
      output.z80OPCode = "XOR";
      return output;
    case 0xa9:
      output.opCode = "XORR";
      output.z80OPCode = "XOR";
      return output;
    case 0xaa:
      output.opCode = "XORR";
      output.z80OPCode = "XOR";
      return output;
    case 0xab:
      output.opCode = "XORR";
      output.z80OPCode = "XOR";
      return output;
    case 0xac:
      output.opCode = "XORR";
      output.z80OPCode = "XOR";
      return output;
    case 0xad:
      output.opCode = "XORR";
      output.z80OPCode = "XOR";
      return output;
    case 0xae:
      output.opCode = "XORR";
      output.z80OPCode = "XOR";
      return output;
    case 0xaf:
      output.opCode = "XORR";
      output.z80OPCode = "XOR";
      return output;
    case 0xb0:
      output.opCode = "ORR";
      output.z80OPCode = "OR";
      return output;
    case 0xb1:
      output.opCode = "ORR";
      output.z80OPCode = "OR";
      return output;
    case 0xb2:
      output.opCode = "ORR";
      output.z80OPCode = "OR";
      return output;
    case 0xb3:
      output.opCode = "ORR";
      output.z80OPCode = "OR";
      return output;
    case 0xb4:
      output.opCode = "ORR";
      output.z80OPCode = "OR";
      return output;
    case 0xb5:
      output.opCode = "ORR";
      output.z80OPCode = "OR";
      return output;
    case 0xb6:
      output.opCode = "ORR";
      output.z80OPCode = "OR";
      return output;
    case 0xb7:
      output.opCode = "ORR";
      output.z80OPCode = "OR";
      return output;
    case 0xb8:
      output.opCode = "SUBX";
      output.z80OPCode = "CP";
      return output;
    case 0xb9:
      output.opCode = "SUBX";
      output.z80OPCode = "CP";
      return output;
    case 0xba:
      output.opCode = "SUBX";
      output.z80OPCode = "CP";
      return output;
    case 0xbb:
      output.opCode = "SUBX";
      output.z80OPCode = "CP";
      return output;
    case 0xbc:
      output.opCode = "SUBX";
      output.z80OPCode = "CP";
      return output;
    case 0xbd:
      output.opCode = "SUBX";
      output.z80OPCode = "CP";
      return output;
    case 0xbe:
      output.opCode = "SUBX";
      output.z80OPCode = "CP";
      return output;
    case 0xbf:
      output.opCode = "SUBX";
      output.z80OPCode = "CP";
      return output;
    case 0xc0:
      output.opCode = "RETNZ";
      output.z80OPCode = "RET NZ";
      return output;
    case 0xc1:
      output.opCode = "POPR";
      output.z80OPCode = "POP";
      return output;
    case 0xc2:
      output.opCode = "JMPNZ";
      output.z80OPCode = "JP NZ";
      return output;
    case 0xc3:
      output.opCode = "JMP";
      output.z80OPCode = "JP";
      return output;
    case 0xc4:
      output.opCode = "PUSHNZ";
      output.z80OPCode = "CALL NZ";
      return output;
    case 0xc5:
      output.opCode = "PUSH";
      output.z80OPCode = "PUSH";
      return output;
    case 0xc6:
      output.opCode = "INXR";
      output.z80OPCode = "ADD";
      return output;
    case 0xc7:
      output.opCode = "RST0";
      output.z80OPCode = "RST 00";
      return output;
    case 0xc8:
      output.opCode = "RETZ";
      output.z80OPCode = "RET Z";
      return output;
    case 0xc9:
      output.opCode = "RET";
      output.z80OPCode = "RET";
      return output;
    case 0xca:
      output.opCode = "JMPZ";
      output.z80OPCode = "JP Z";
      return output;
    case 0xcb:
      output.opCode = "NOP";
      output.z80OPCode = "NOP";
      return output;
    case 0xcc:
      output.opCode = "CALLZ";
      output.z80OPCode = "CALL Z";
      return output;
    case 0xcd:
      output.opCode = "CALL";
      output.z80OPCode = "CALL";
      return output;
    case 0xce:
      output.opCode = "ICXR";
      output.z80OPCode = "ADC";
      return output;
    case 0xcf:
      output.opCode = "RST1";
      output.z80OPCode = "RST08";
      return output;
    case 0xd0:
      output.opCode = "RETNC";
      output.z80OPCode = "RET NC";
      return output;
    case 0xd1:
      output.opCode = "POPR";
      output.z80OPCode = "POP";
      return output;
    case 0xd2:
      output.opCode = "JMPNP";
      output.z80OPCode = "JP NC";
      return output;
    case 0xd3:
      output.opCode = "HWOUT";
      output.z80OPCode = "OUT";
      return output;
    case 0xd4:
      output.opCode = "CALLNC";
      output.z80OPCode = "CALL NC";
      return output;
    case 0xd5:
      output.opCode = "PUSH";
      output.z80OPCode = "PUSH";
      return output;
    case 0xd6:
      output.opCode = "DCXR";
      output.z80OPCode = "SUB";
      return output;
    case 0xd7:
      output.opCode = "RST10";
      output.z80OPCode = "RST 10";
      return output;
    case 0xd8:
      output.opCode = "RETC";
      output.z80OPCode = "RET";
      return output;
    case 0xd9:
      output.opCode = "NOP";
      output.z80OPCode = "NOP";
      return output;
    case 0xda:
      output.opCode = "JMPC";
      output.z80OPCode = "JP";
      return output;
    case 0xdb:
      output.opCode = "HWIN";
      output.z80OPCode = "EXX";
      return output;
    case 0xdc:
      output.opCode = "CALLC";
      output.z80OPCode = "CP";
      return output;
    case 0xdd:
      output.opCode = "**";
      output.z80OPCode = "**";
      return output;
    case 0xde:
      output.opCode = "DEXR";
      output.z80OPCode = "SBC";
      return output;
    case 0xdf:
      output.opCode = "RST18";
      output.z80OPCode = "RST 18";
      return output;
    case 0xe0:
      output.opCode = "RETNP";
      output.z80OPCode = "RET";
      return output;
    case 0xe1:
      output.opCode = "POPR";
      output.z80OPCode = "POP";
      return output;
    case 0xe2:
      output.opCode = "JMPNP";
      output.z80OPCode = "JP PO";
      return output;
    case 0xe3:
      output.opCode = "XCHM";
      output.z80OPCode = "EX";
      return output;
    case 0xe4:
      output.opCode = "UKNOP";
      output.z80OPCode = "CALL";
      return output;
    case 0xe5:
      output.opCode = "PUSH";
      output.z80OPCode = "PUSH";
      return output;
    case 0xe6:
      output.opCode = "ANDR";
      output.z80OPCode = "AND";
      return output;
    case 0xe7:
      output.opCode = "RST20";
      output.z80OPCode = "RST 20";
      return output;
    case 0xe8:
      output.opCode = "RETP";
      output.z80OPCode = "RET";
      return output;
    case 0xe9:
      output.opCode = "JMP";
      output.z80OPCode = "JP";
      return output;
    case 0xea:
      output.opCode = "JMPP";
      output.z80OPCode = "JP";
      return output;
    case 0xeb:
      output.opCode = "XCHR";
      output.z80OPCode = "EX";
      return output;
    case 0xec:
      output.opCode = "UKNOP";
      output.z80OPCode = "CALL";
      return output;
    case 0xed:
      output.opCode = "NOP";
      output.z80OPCode = "UKNOP";
      return output;
    case 0xee:
      output.opCode = "XORR";
      output.z80OPCode = "XOR";
      return output;
    case 0xef:
      output.opCode = "RST28";
      output.z80OPCode = "RST 28";
      return output;
    case 0xf0:
      output.opCode = "UKNOP";
      output.z80OPCode = "RET";
      return output;
    case 0xf1:
      output.opCode = "POPR";
      output.z80OPCode = "POP";
      return output;
    case 0xf2:
      output.opCode = "JMPNS";
      output.z80OPCode = "JP";
      return output;
    case 0xf3:
      output.opCode = "DIF";
      output.z80OPCode = "DI";
      return output;
    case 0xf4:
      output.opCode = "CALLS";
      output.z80OPCode = "CALL";
      return output;
    case 0xf5:
      output.opCode = "PUSH";
      output.z80OPCode = "PUSH";
      return output;
    case 0xf6:
      output.opCode = "ORR";
      output.z80OPCode = "OR";
      return output;
    case 0xf7:
      output.opCode = "RST30";
      output.z80OPCode = "RST 30";
      return output;
    case 0xf8:
      output.opCode = "RETS";
      output.z80OPCode = "RET";
      return output;
    case 0xf9:
      output.opCode = "LD2R";
      output.z80OPCode = "LD";
      return output;
    case 0xfa:
      output.opCode = "JMPS";
      output.z80OPCode = "JP";
      return output;
    case 0xfb:
      output.opCode = "SIF";
      output.z80OPCode = "EI";
      return output;
    case 0xfc:
      output.opCode = "CALLS";
      output.z80OPCode = "CALL";
      return output;
    case 0xfd:
      output.opCode = "**";
      output.z80OPCode = "**";
      return output;
    case 0xfe:
      output.opCode = "DCXR";
      output.z80OPCode = "CP";
      return output;
    case 0xff:
      output.opCode = "RST38";
      output.z80OPCode = "RST 38";
      return output;
  }
};