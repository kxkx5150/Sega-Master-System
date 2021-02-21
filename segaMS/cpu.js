class CPU {
  constructor(core, mem) {
    this.core = core;
    this.mem = mem;

    this.halfcarry_add_table = this.byteTable([0, 0x10, 0x10, 0x10, 0, 0, 0, 0x10]);
    this.halfcarry_sub_table = this.byteTable([0, 0, 0x10, 0, 0x10, 0, 0x10, 0x10]);
    this.overflow_add_table = this.byteTable([0, 0, 0, 0x04, 0x04, 0, 0, 0]);
    this.overflow_sub_table = this.byteTable([0, 0x04, 0, 0, 0, 0, 0x04, 0]);
    this.sz53_table = new Uint8Array(256);
    this.parity_table = new Uint8Array(256);
    this.sz53p_table = new Uint8Array(256);
    this.z80 = {
      a: 0,
      f: 0,
      b: 0,
      c: 0,
      d: 0,
      e: 0,
      h: 0,
      l: 0,
      a_: 0,
      f_: 0,
      b_: 0,
      c_: 0,
      d_: 0,
      e_: 0,
      h_: 0,
      l_: 0,
      ixh: 0,
      ixl: 0,
      iyh: 0,
      iyl: 0,
      i: 0,
      r: 0,
      r7: 0,
      sp: 0,
      pc: 0,
      iff1: 0,
      iff2: 0,
      im: 0,
      halted: false,
      irq_pending: false,
      irq_suppress: false,
    };
  }
  z80_init() {
    this.z80_init_tables();
  }
  z80_init_tables() {
    for (var i = 0; i < 0x100; i++) {
      this.sz53_table[i] = i & (0x08 | 0x20 | 0x80);
      var j = i;
      var parity = 0;
      for (var k = 0; k < 8; k++) {
        parity ^= j & 1;
        j >>= 1;
      }
      this.parity_table[i] = parity ? 0 : 0x04;
      this.sz53p_table[i] = this.sz53_table[i] | this.parity_table[i];
    }
    this.sz53_table[0] |= 0x40;
    this.sz53p_table[0] |= 0x40;
  }
  z80_do_opcodes(cb, onstep) {
    while (this.core.tstates < this.core.event_next_event || onstep) {
      if (this.z80.irq_pending && this.z80.iff1) {
        if (this.z80.irq_suppress) {
          this.z80.irq_suppress = false;
        } else {
          this.z80.irq_suppress = true;
          this.z80_interrupt();
        }
      }
      var oldTstates = this.core.tstates;
      this.core.tstates += 4;

      this.z80.r = (this.z80.r + 1) & 0x7f;
      var opcode = this.mem.readbyte(this.z80.pc);
      if (onstep) this.showInfo(this.z80.pc, opcode);
      this.z80.pc = (this.z80.pc + 1) & 0xffff;

      this.z80_base_ops(opcode);
      cb(this.core.tstates + oldTstates);

      if (onstep) break;
    }
  }
  z80_reset() {
    this.z80.a = this.z80.f = this.z80.b = this.z80.c = this.z80.d = this.z80.e = this.z80.h = this.z80.l = 0;
    this.z80.a_ = this.z80.f_ = this.z80.b_ = this.z80.c_ = this.z80.d_ = this.z80.e_ = this.z80.h_ = this.z80.l_ = 0;
    this.z80.ixh = this.z80.ixl = this.z80.iyh = this.z80.iyl = 0;
    this.z80.i = this.z80.r = this.z80.r7 = 0;
    this.z80.sp = this.z80.pc = 0;
    this.z80.iff1 = this.z80.iff2 = this.z80.im = 0;
    this.z80.halted = 0;
    this.z80.irq_pending = false;
    this.z80.irq_suppress = true;
  }
  z80_set_irq(asserted) {
    this.z80.irq_pending = asserted;
    if (this.z80.irq_pending && this.z80.iff1) this.z80_interrupt();
  }
  z80_interrupt() {
    if (this.z80.iff1) {
      if (this.z80.halted) {
        this.z80.pc++;
        this.z80.pc &= 0xffff;
        this.z80.halted = false;
      }
      this.z80.iff1 = this.z80.iff2 = 0;
      this.z80.sp = (this.z80.sp - 1) & 0xffff;
      this.mem.writebyte(this.z80.sp, this.z80.pc >> 8);
      this.z80.sp = (this.z80.sp - 1) & 0xffff;
      this.mem.writebyte(this.z80.sp, this.z80.pc & 0xff);
      this.z80.r = (this.z80.r + 1) & 0x7f;
      switch (this.z80.im) {
        case 0:
          this.z80.pc = 0x0038;
          this.core.tstates += 12;
          break;
        case 1:
          this.z80.pc = 0x0038;
          this.core.tstates += 13;
          break;
        case 2: {
          var inttemp = 0x100 * this.z80.i + 0xff;
          var pcl = this.mem.readbyte(inttemp++);
          inttemp &= 0xfff;
          var pch = this.mem.readbyte(inttemp);
          this.z80.pc = pcl | (pch << 8);
          this.core.tstates += 19;
          break;
        }
      }
    }
  }
  z80_nmi() {
    this.z80.iff1 = 0;
    this.z80.sp = (this.z80.sp - 1) & 0xffff;
    this.mem.writebyte(this.z80.sp, this.z80.pc >> 8);
    this.z80.sp = (this.z80.sp - 1) & 0xffff;
    this.mem.writebyte(this.z80.sp, this.z80.pc & 0xff);
    this.core.tstates += 11;
    this.z80.pc = 0x0066;
  }
  z80_base_ops = (key) => {
    switch (key) {
      case 0x00: {
        break;
      }
      case 0x01: {
        this.core.tstates += 6;
        this.z80.c = this.mem.readbyte(this.z80.pc++);
        this.z80.pc &= 0xffff;
        this.z80.b = this.mem.readbyte(this.z80.pc++);
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x02: {
        this.core.tstates += 3;
        this.mem.writebyte(this.z80.c | (this.z80.b << 8), this.z80.a);
        break;
      }
      case 0x03: {
        this.core.tstates += 2;
        var wordtemp = ((this.z80.c | (this.z80.b << 8)) + 1) & 0xffff;
        this.z80.b = wordtemp >> 8;
        this.z80.c = wordtemp & 0xff;
        break;
      }
      case 0x04: {
        {
          this.z80.b = (this.z80.b + 1) & 0xff;
          this.z80.f =
            (this.z80.f & 0x01) |
            (this.z80.b == 0x80 ? 0x04 : 0) |
            (this.z80.b & 0x0f ? 0 : 0x10) |
            this.sz53_table[this.z80.b];
        }
        break;
      }
      case 0x05: {
        {
          this.z80.f = (this.z80.f & 0x01) | (this.z80.b & 0x0f ? 0 : 0x10) | 0x02;
          this.z80.b = (this.z80.b - 1) & 0xff;
          this.z80.f |= (this.z80.b == 0x7f ? 0x04 : 0) | this.sz53_table[this.z80.b];
        }
        break;
      }
      case 0x06: {
        this.core.tstates += 3;
        this.z80.b = this.mem.readbyte(this.z80.pc++);
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x07: {
        this.z80.a = ((this.z80.a & 0x7f) << 1) | (this.z80.a >> 7);
        this.z80.f = (this.z80.f & (0x04 | 0x40 | 0x80)) | (this.z80.a & (0x01 | 0x08 | 0x20));
        break;
      }
      case 0x08: {
        {
          var olda = this.z80.a;
          var oldf = this.z80.f;
          this.z80.a = this.z80.a_;
          this.z80.f = this.z80.f_;
          this.z80.a_ = olda;
          this.z80.f_ = oldf;
        }
        break;
      }
      case 0x09: {
        {
          var add16temp = (this.z80.l | (this.z80.h << 8)) + (this.z80.c | (this.z80.b << 8));
          var lookup =
            (((this.z80.l | (this.z80.h << 8)) & 0x0800) >> 11) |
            (((this.z80.c | (this.z80.b << 8)) & 0x0800) >> 10) |
            ((add16temp & 0x0800) >> 9);
          this.core.tstates += 7;
          this.z80.h = (add16temp >> 8) & 0xff;
          this.z80.l = add16temp & 0xff;
          this.z80.f =
            (this.z80.f & (0x04 | 0x40 | 0x80)) |
            (add16temp & 0x10000 ? 0x01 : 0) |
            ((add16temp >> 8) & (0x08 | 0x20)) |
            this.halfcarry_add_table[lookup];
        }
        break;
      }
      case 0x0a: {
        this.core.tstates += 3;
        this.z80.a = this.mem.readbyte(this.z80.c | (this.z80.b << 8));
        break;
      }
      case 0x0b: {
        this.core.tstates += 2;
        var wordtemp = ((this.z80.c | (this.z80.b << 8)) - 1) & 0xffff;
        this.z80.b = wordtemp >> 8;
        this.z80.c = wordtemp & 0xff;
        break;
      }
      case 0x0c: {
        {
          this.z80.c = (this.z80.c + 1) & 0xff;
          this.z80.f =
            (this.z80.f & 0x01) |
            (this.z80.c == 0x80 ? 0x04 : 0) |
            (this.z80.c & 0x0f ? 0 : 0x10) |
            this.sz53_table[this.z80.c];
        }
        break;
      }
      case 0x0d: {
        {
          this.z80.f = (this.z80.f & 0x01) | (this.z80.c & 0x0f ? 0 : 0x10) | 0x02;
          this.z80.c = (this.z80.c - 1) & 0xff;
          this.z80.f |= (this.z80.c == 0x7f ? 0x04 : 0) | this.sz53_table[this.z80.c];
        }
        break;
      }
      case 0x0e: {
        this.core.tstates += 3;
        this.z80.c = this.mem.readbyte(this.z80.pc++);
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x0f: {
        this.z80.f = (this.z80.f & (0x04 | 0x40 | 0x80)) | (this.z80.a & 0x01);
        this.z80.a = (this.z80.a >> 1) | ((this.z80.a & 0x01) << 7);
        this.z80.f |= this.z80.a & (0x08 | 0x20);
        break;
      }
      case 0x10: {
        this.core.tstates += 4;
        this.z80.b = (this.z80.b - 1) & 0xff;
        if (this.z80.b) {
          {
            this.core.tstates += 5;
            this.z80.pc += this.sign_extend(this.mem.readbyte(this.z80.pc));
            this.z80.pc &= 0xffff;
          }
        }
        this.z80.pc++;
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x11: {
        this.core.tstates += 6;
        this.z80.e = this.mem.readbyte(this.z80.pc++);
        this.z80.pc &= 0xffff;
        this.z80.d = this.mem.readbyte(this.z80.pc++);
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x12: {
        this.core.tstates += 3;
        this.mem.writebyte(this.z80.e | (this.z80.d << 8), this.z80.a);
        break;
      }
      case 0x13: {
        this.core.tstates += 2;
        var wordtemp = ((this.z80.e | (this.z80.d << 8)) + 1) & 0xffff;
        this.z80.d = wordtemp >> 8;
        this.z80.e = wordtemp & 0xff;
        break;
      }
      case 0x14: {
        {
          this.z80.d = (this.z80.d + 1) & 0xff;
          this.z80.f =
            (this.z80.f & 0x01) |
            (this.z80.d == 0x80 ? 0x04 : 0) |
            (this.z80.d & 0x0f ? 0 : 0x10) |
            this.sz53_table[this.z80.d];
        }
        break;
      }
      case 0x15: {
        {
          this.z80.f = (this.z80.f & 0x01) | (this.z80.d & 0x0f ? 0 : 0x10) | 0x02;
          this.z80.d = (this.z80.d - 1) & 0xff;
          this.z80.f |= (this.z80.d == 0x7f ? 0x04 : 0) | this.sz53_table[this.z80.d];
        }
        break;
      }
      case 0x16: {
        this.core.tstates += 3;
        this.z80.d = this.mem.readbyte(this.z80.pc++);
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x17: {
        {
          var bytetemp = this.z80.a;
          this.z80.a = ((this.z80.a & 0x7f) << 1) | (this.z80.f & 0x01);
          this.z80.f =
            (this.z80.f & (0x04 | 0x40 | 0x80)) | (this.z80.a & (0x08 | 0x20)) | (bytetemp >> 7);
        }
        break;
      }
      case 0x18: {
        this.core.tstates += 3;
        {
          this.core.tstates += 5;
          this.z80.pc += this.sign_extend(this.mem.readbyte(this.z80.pc));
          this.z80.pc &= 0xffff;
        }
        this.z80.pc++;
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x19: {
        {
          var add16temp = (this.z80.l | (this.z80.h << 8)) + (this.z80.e | (this.z80.d << 8));
          var lookup =
            (((this.z80.l | (this.z80.h << 8)) & 0x0800) >> 11) |
            (((this.z80.e | (this.z80.d << 8)) & 0x0800) >> 10) |
            ((add16temp & 0x0800) >> 9);
          this.core.tstates += 7;
          this.z80.h = (add16temp >> 8) & 0xff;
          this.z80.l = add16temp & 0xff;
          this.z80.f =
            (this.z80.f & (0x04 | 0x40 | 0x80)) |
            (add16temp & 0x10000 ? 0x01 : 0) |
            ((add16temp >> 8) & (0x08 | 0x20)) |
            this.halfcarry_add_table[lookup];
        }
        break;
      }
      case 0x1a: {
        this.core.tstates += 3;
        this.z80.a = this.mem.readbyte(this.z80.e | (this.z80.d << 8));
        break;
      }
      case 0x1b: {
        this.core.tstates += 2;
        var wordtemp = ((this.z80.e | (this.z80.d << 8)) - 1) & 0xffff;
        this.z80.d = wordtemp >> 8;
        this.z80.e = wordtemp & 0xff;
        break;
      }
      case 0x1c: {
        {
          this.z80.e = (this.z80.e + 1) & 0xff;
          this.z80.f =
            (this.z80.f & 0x01) |
            (this.z80.e == 0x80 ? 0x04 : 0) |
            (this.z80.e & 0x0f ? 0 : 0x10) |
            this.sz53_table[this.z80.e];
        }
        break;
      }
      case 0x1d: {
        {
          this.z80.f = (this.z80.f & 0x01) | (this.z80.e & 0x0f ? 0 : 0x10) | 0x02;
          this.z80.e = (this.z80.e - 1) & 0xff;
          this.z80.f |= (this.z80.e == 0x7f ? 0x04 : 0) | this.sz53_table[this.z80.e];
        }
        break;
      }
      case 0x1e: {
        this.core.tstates += 3;
        this.z80.e = this.mem.readbyte(this.z80.pc++);
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x1f: {
        {
          var bytetemp = this.z80.a;
          this.z80.a = (this.z80.a >> 1) | ((this.z80.f & 0x01) << 7);
          this.z80.f =
            (this.z80.f & (0x04 | 0x40 | 0x80)) | (this.z80.a & (0x08 | 0x20)) | (bytetemp & 0x01);
        }
        break;
      }
      case 0x20: {
        this.core.tstates += 3;
        if (!(this.z80.f & 0x40)) {
          {
            this.core.tstates += 5;
            this.z80.pc += this.sign_extend(this.mem.readbyte(this.z80.pc));
            this.z80.pc &= 0xffff;
          }
        }
        this.z80.pc++;
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x21: {
        this.core.tstates += 6;
        this.z80.l = this.mem.readbyte(this.z80.pc++);
        this.z80.pc &= 0xffff;
        this.z80.h = this.mem.readbyte(this.z80.pc++);
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x22: {
        {
          var ldtemp;
          this.core.tstates += 12;
          ldtemp = this.mem.readbyte(this.z80.pc++);
          this.z80.pc &= 0xffff;
          ldtemp |= this.mem.readbyte(this.z80.pc++) << 8;
          this.z80.pc &= 0xffff;
          this.mem.writebyte(ldtemp++, this.z80.l);
          ldtemp &= 0xffff;
          this.mem.writebyte(ldtemp, this.z80.h);
        }
        break;
      }
      case 0x23: {
        this.core.tstates += 2;
        var wordtemp = ((this.z80.l | (this.z80.h << 8)) + 1) & 0xffff;
        this.z80.h = wordtemp >> 8;
        this.z80.l = wordtemp & 0xff;
        break;
      }
      case 0x24: {
        {
          this.z80.h = (this.z80.h + 1) & 0xff;
          this.z80.f =
            (this.z80.f & 0x01) |
            (this.z80.h == 0x80 ? 0x04 : 0) |
            (this.z80.h & 0x0f ? 0 : 0x10) |
            this.sz53_table[this.z80.h];
        }
        break;
      }
      case 0x25: {
        {
          this.z80.f = (this.z80.f & 0x01) | (this.z80.h & 0x0f ? 0 : 0x10) | 0x02;
          this.z80.h = (this.z80.h - 1) & 0xff;
          this.z80.f |= (this.z80.h == 0x7f ? 0x04 : 0) | this.sz53_table[this.z80.h];
        }
        break;
      }
      case 0x26: {
        this.core.tstates += 3;
        this.z80.h = this.mem.readbyte(this.z80.pc++);
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x27: {
        {
          var add = 0,
            carry = this.z80.f & 0x01;
          if (this.z80.f & 0x10 || (this.z80.a & 0x0f) > 9) add = 6;
          if (carry || this.z80.a > 0x99) add |= 0x60;
          if (this.z80.a > 0x99) carry = 0x01;
          if (this.z80.f & 0x02) {
            {
              var subtemp = this.z80.a - add;
              var lookup = ((this.z80.a & 0x88) >> 3) | ((add & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
              this.z80.a = subtemp & 0xff;
              this.z80.f =
                (subtemp & 0x100 ? 0x01 : 0) |
                0x02 |
                this.halfcarry_sub_table[lookup & 0x07] |
                this.overflow_sub_table[lookup >> 4] |
                this.sz53_table[this.z80.a];
            }
          } else {
            {
              var addtemp = this.z80.a + add;
              var lookup = ((this.z80.a & 0x88) >> 3) | ((add & 0x88) >> 2) | ((addtemp & 0x88) >> 1);
              this.z80.a = addtemp & 0xff;
              this.z80.f =
                (addtemp & 0x100 ? 0x01 : 0) |
                this.halfcarry_add_table[lookup & 0x07] |
                this.overflow_add_table[lookup >> 4] |
                this.sz53_table[this.z80.a];
            }
          }
          this.z80.f = (this.z80.f & ~(0x01 | 0x04)) | carry | this.parity_table[this.z80.a];
        }
        break;
      }
      case 0x28: {
        this.core.tstates += 3;
        if (this.z80.f & 0x40) {
          {
            this.core.tstates += 5;
            this.z80.pc += this.sign_extend(this.mem.readbyte(this.z80.pc));
            this.z80.pc &= 0xffff;
          }
        }
        this.z80.pc++;
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x29: {
        {
          var add16temp = (this.z80.l | (this.z80.h << 8)) + (this.z80.l | (this.z80.h << 8));
          var lookup =
            (((this.z80.l | (this.z80.h << 8)) & 0x0800) >> 11) |
            (((this.z80.l | (this.z80.h << 8)) & 0x0800) >> 10) |
            ((add16temp & 0x0800) >> 9);
          this.core.tstates += 7;
          this.z80.h = (add16temp >> 8) & 0xff;
          this.z80.l = add16temp & 0xff;
          this.z80.f =
            (this.z80.f & (0x04 | 0x40 | 0x80)) |
            (add16temp & 0x10000 ? 0x01 : 0) |
            ((add16temp >> 8) & (0x08 | 0x20)) |
            this.halfcarry_add_table[lookup];
        }
        break;
      }
      case 0x2a: {
        {
          var ldtemp;
          this.core.tstates += 12;
          ldtemp = this.mem.readbyte(this.z80.pc++);
          this.z80.pc &= 0xffff;
          ldtemp |= this.mem.readbyte(this.z80.pc++) << 8;
          this.z80.pc &= 0xffff;
          this.z80.l = this.mem.readbyte(ldtemp++);
          ldtemp &= 0xffff;
          this.z80.h = this.mem.readbyte(ldtemp);
        }
        break;
      }
      case 0x2b: {
        this.core.tstates += 2;
        var wordtemp = ((this.z80.l | (this.z80.h << 8)) - 1) & 0xffff;
        this.z80.h = wordtemp >> 8;
        this.z80.l = wordtemp & 0xff;
        break;
      }
      case 0x2c: {
        {
          this.z80.l = (this.z80.l + 1) & 0xff;
          this.z80.f =
            (this.z80.f & 0x01) |
            (this.z80.l == 0x80 ? 0x04 : 0) |
            (this.z80.l & 0x0f ? 0 : 0x10) |
            this.sz53_table[this.z80.l];
        }
        break;
      }
      case 0x2d: {
        {
          this.z80.f = (this.z80.f & 0x01) | (this.z80.l & 0x0f ? 0 : 0x10) | 0x02;
          this.z80.l = (this.z80.l - 1) & 0xff;
          this.z80.f |= (this.z80.l == 0x7f ? 0x04 : 0) | this.sz53_table[this.z80.l];
        }
        break;
      }
      case 0x2e: {
        this.core.tstates += 3;
        this.z80.l = this.mem.readbyte(this.z80.pc++);
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x2f: {
        this.z80.a ^= 0xff;
        this.z80.f =
          (this.z80.f & (0x01 | 0x04 | 0x40 | 0x80)) | (this.z80.a & (0x08 | 0x20)) | (0x02 | 0x10);
        break;
      }
      case 0x30: {
        this.core.tstates += 3;
        if (!(this.z80.f & 0x01)) {
          {
            this.core.tstates += 5;
            this.z80.pc += this.sign_extend(this.mem.readbyte(this.z80.pc));
            this.z80.pc &= 0xffff;
          }
        }
        this.z80.pc++;
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x31: {
        this.core.tstates += 6;
        var splow = this.mem.readbyte(this.z80.pc++);
        this.z80.pc &= 0xffff;
        var sphigh = this.mem.readbyte(this.z80.pc++);
        this.z80.sp = splow | (sphigh << 8);
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x32: {
        this.core.tstates += 3;
        {
          var wordtemp = this.mem.readbyte(this.z80.pc++);
          this.z80.pc &= 0xffff;
          this.core.tstates += 6;
          wordtemp |= this.mem.readbyte(this.z80.pc++) << 8;
          this.z80.pc &= 0xffff;
          this.mem.writebyte(wordtemp, this.z80.a);
        }
        break;
      }
      case 0x33: {
        this.core.tstates += 2;
        this.z80.sp = (this.z80.sp + 1) & 0xffff;
        break;
      }
      case 0x34: {
        this.core.tstates += 7;
        {
          var bytetemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          {
            bytetemp = (bytetemp + 1) & 0xff;
            this.z80.f =
              (this.z80.f & 0x01) |
              (bytetemp == 0x80 ? 0x04 : 0) |
              (bytetemp & 0x0f ? 0 : 0x10) |
              this.sz53_table[bytetemp];
          }
          this.mem.writebyte(this.z80.l | (this.z80.h << 8), bytetemp);
        }
        break;
      }
      case 0x35: {
        this.core.tstates += 7;
        {
          var bytetemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          {
            this.z80.f = (this.z80.f & 0x01) | (bytetemp & 0x0f ? 0 : 0x10) | 0x02;
            bytetemp = (bytetemp - 1) & 0xff;
            this.z80.f |= (bytetemp == 0x7f ? 0x04 : 0) | this.sz53_table[bytetemp];
          }
          this.mem.writebyte(this.z80.l | (this.z80.h << 8), bytetemp);
        }
        break;
      }
      case 0x36: {
        this.core.tstates += 6;
        this.mem.writebyte(this.z80.l | (this.z80.h << 8), this.mem.readbyte(this.z80.pc++));
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x37: {
        this.z80.f = (this.z80.f & (0x04 | 0x40 | 0x80)) | (this.z80.a & (0x08 | 0x20)) | 0x01;
        break;
      }
      case 0x38: {
        this.core.tstates += 3;
        if (this.z80.f & 0x01) {
          {
            this.core.tstates += 5;
            this.z80.pc += this.sign_extend(this.mem.readbyte(this.z80.pc));
            this.z80.pc &= 0xffff;
          }
        }
        this.z80.pc++;
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x39: {
        {
          var add16temp = (this.z80.l | (this.z80.h << 8)) + this.z80.sp;
          var lookup =
            (((this.z80.l | (this.z80.h << 8)) & 0x0800) >> 11) |
            ((this.z80.sp & 0x0800) >> 10) |
            ((add16temp & 0x0800) >> 9);
          this.core.tstates += 7;
          this.z80.h = (add16temp >> 8) & 0xff;
          this.z80.l = add16temp & 0xff;
          this.z80.f =
            (this.z80.f & (0x04 | 0x40 | 0x80)) |
            (add16temp & 0x10000 ? 0x01 : 0) |
            ((add16temp >> 8) & (0x08 | 0x20)) |
            this.halfcarry_add_table[lookup];
        }
        break;
      }
      case 0x3a: {
        {
          var wordtemp;
          this.core.tstates += 9;
          wordtemp = this.mem.readbyte(this.z80.pc++);
          this.z80.pc &= 0xffff;
          wordtemp |= this.mem.readbyte(this.z80.pc++) << 8;
          this.z80.pc &= 0xffff;
          this.z80.a = this.mem.readbyte(wordtemp);
        }
        break;
      }
      case 0x3b: {
        this.core.tstates += 2;
        this.z80.sp = (this.z80.sp - 1) & 0xffff;
        break;
      }
      case 0x3c: {
        {
          this.z80.a = (this.z80.a + 1) & 0xff;
          this.z80.f =
            (this.z80.f & 0x01) |
            (this.z80.a == 0x80 ? 0x04 : 0) |
            (this.z80.a & 0x0f ? 0 : 0x10) |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x3d: {
        {
          this.z80.f = (this.z80.f & 0x01) | (this.z80.a & 0x0f ? 0 : 0x10) | 0x02;
          this.z80.a = (this.z80.a - 1) & 0xff;
          this.z80.f |= (this.z80.a == 0x7f ? 0x04 : 0) | this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x3e: {
        this.core.tstates += 3;
        this.z80.a = this.mem.readbyte(this.z80.pc++);
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x3f: {
        this.z80.f =
          (this.z80.f & (0x04 | 0x40 | 0x80)) |
          (this.z80.f & 0x01 ? 0x10 : 0x01) |
          (this.z80.a & (0x08 | 0x20));
        break;
      }
      case 0x40: {
        break;
      }
      case 0x41: {
        this.z80.b = this.z80.c;
        break;
      }
      case 0x42: {
        this.z80.b = this.z80.d;
        break;
      }
      case 0x43: {
        this.z80.b = this.z80.e;
        break;
      }
      case 0x44: {
        this.z80.b = this.z80.h;
        break;
      }
      case 0x45: {
        this.z80.b = this.z80.l;
        break;
      }
      case 0x46: {
        this.core.tstates += 3;
        this.z80.b = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
        break;
      }
      case 0x47: {
        this.z80.b = this.z80.a;
        break;
      }
      case 0x48: {
        this.z80.c = this.z80.b;
        break;
      }
      case 0x49: {
        break;
      }
      case 0x4a: {
        this.z80.c = this.z80.d;
        break;
      }
      case 0x4b: {
        this.z80.c = this.z80.e;
        break;
      }
      case 0x4c: {
        this.z80.c = this.z80.h;
        break;
      }
      case 0x4d: {
        this.z80.c = this.z80.l;
        break;
      }
      case 0x4e: {
        this.core.tstates += 3;
        this.z80.c = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
        break;
      }
      case 0x4f: {
        this.z80.c = this.z80.a;
        break;
      }
      case 0x50: {
        this.z80.d = this.z80.b;
        break;
      }
      case 0x51: {
        this.z80.d = this.z80.c;
        break;
      }
      case 0x52: {
        break;
      }
      case 0x53: {
        this.z80.d = this.z80.e;
        break;
      }
      case 0x54: {
        this.z80.d = this.z80.h;
        break;
      }
      case 0x55: {
        this.z80.d = this.z80.l;
        break;
      }
      case 0x56: {
        this.core.tstates += 3;
        this.z80.d = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
        break;
      }
      case 0x57: {
        this.z80.d = this.z80.a;
        break;
      }
      case 0x58: {
        this.z80.e = this.z80.b;
        break;
      }
      case 0x59: {
        this.z80.e = this.z80.c;
        break;
      }
      case 0x5a: {
        this.z80.e = this.z80.d;
        break;
      }
      case 0x5b: {
        break;
      }
      case 0x5c: {
        this.z80.e = this.z80.h;
        break;
      }
      case 0x5d: {
        this.z80.e = this.z80.l;
        break;
      }
      case 0x5e: {
        this.core.tstates += 3;
        this.z80.e = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
        break;
      }
      case 0x5f: {
        this.z80.e = this.z80.a;
        break;
      }
      case 0x60: {
        this.z80.h = this.z80.b;
        break;
      }
      case 0x61: {
        this.z80.h = this.z80.c;
        break;
      }
      case 0x62: {
        this.z80.h = this.z80.d;
        break;
      }
      case 0x63: {
        this.z80.h = this.z80.e;
        break;
      }
      case 0x64: {
        break;
      }
      case 0x65: {
        this.z80.h = this.z80.l;
        break;
      }
      case 0x66: {
        this.core.tstates += 3;
        this.z80.h = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
        break;
      }
      case 0x67: {
        this.z80.h = this.z80.a;
        break;
      }
      case 0x68: {
        this.z80.l = this.z80.b;
        break;
      }
      case 0x69: {
        this.z80.l = this.z80.c;
        break;
      }
      case 0x6a: {
        this.z80.l = this.z80.d;
        break;
      }
      case 0x6b: {
        this.z80.l = this.z80.e;
        break;
      }
      case 0x6c: {
        this.z80.l = this.z80.h;
        break;
      }
      case 0x6d: {
        break;
      }
      case 0x6e: {
        this.core.tstates += 3;
        this.z80.l = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
        break;
      }
      case 0x6f: {
        this.z80.l = this.z80.a;
        break;
      }
      case 0x70: {
        this.core.tstates += 3;
        this.mem.writebyte(this.z80.l | (this.z80.h << 8), this.z80.b);
        break;
      }
      case 0x71: {
        this.core.tstates += 3;
        this.mem.writebyte(this.z80.l | (this.z80.h << 8), this.z80.c);
        break;
      }
      case 0x72: {
        this.core.tstates += 3;
        this.mem.writebyte(this.z80.l | (this.z80.h << 8), this.z80.d);
        break;
      }
      case 0x73: {
        this.core.tstates += 3;
        this.mem.writebyte(this.z80.l | (this.z80.h << 8), this.z80.e);
        break;
      }
      case 0x74: {
        this.core.tstates += 3;
        this.mem.writebyte(this.z80.l | (this.z80.h << 8), this.z80.h);
        break;
      }
      case 0x75: {
        this.core.tstates += 3;
        this.mem.writebyte(this.z80.l | (this.z80.h << 8), this.z80.l);
        break;
      }
      case 0x76: {
        this.z80.halted = 1;
        this.z80.pc--;
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x77: {
        this.core.tstates += 3;
        this.mem.writebyte(this.z80.l | (this.z80.h << 8), this.z80.a);
        break;
      }
      case 0x78: {
        this.z80.a = this.z80.b;
        break;
      }
      case 0x79: {
        this.z80.a = this.z80.c;
        break;
      }
      case 0x7a: {
        this.z80.a = this.z80.d;
        break;
      }
      case 0x7b: {
        this.z80.a = this.z80.e;
        break;
      }
      case 0x7c: {
        this.z80.a = this.z80.h;
        break;
      }
      case 0x7d: {
        this.z80.a = this.z80.l;
        break;
      }
      case 0x7e: {
        this.core.tstates += 3;
        this.z80.a = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
        break;
      }
      case 0x7f: {
        break;
      }
      case 0x80: {
        {
          var addtemp = this.z80.a + this.z80.b;
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.b & 0x88) >> 2) | ((addtemp & 0x88) >> 1);
          this.z80.a = addtemp & 0xff;
          this.z80.f =
            (addtemp & 0x100 ? 0x01 : 0) |
            this.halfcarry_add_table[lookup & 0x07] |
            this.overflow_add_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x81: {
        {
          var addtemp = this.z80.a + this.z80.c;
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.c & 0x88) >> 2) | ((addtemp & 0x88) >> 1);
          this.z80.a = addtemp & 0xff;
          this.z80.f =
            (addtemp & 0x100 ? 0x01 : 0) |
            this.halfcarry_add_table[lookup & 0x07] |
            this.overflow_add_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x82: {
        {
          var addtemp = this.z80.a + this.z80.d;
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.d & 0x88) >> 2) | ((addtemp & 0x88) >> 1);
          this.z80.a = addtemp & 0xff;
          this.z80.f =
            (addtemp & 0x100 ? 0x01 : 0) |
            this.halfcarry_add_table[lookup & 0x07] |
            this.overflow_add_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x83: {
        {
          var addtemp = this.z80.a + this.z80.e;
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.e & 0x88) >> 2) | ((addtemp & 0x88) >> 1);
          this.z80.a = addtemp & 0xff;
          this.z80.f =
            (addtemp & 0x100 ? 0x01 : 0) |
            this.halfcarry_add_table[lookup & 0x07] |
            this.overflow_add_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x84: {
        {
          var addtemp = this.z80.a + this.z80.h;
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.h & 0x88) >> 2) | ((addtemp & 0x88) >> 1);
          this.z80.a = addtemp & 0xff;
          this.z80.f =
            (addtemp & 0x100 ? 0x01 : 0) |
            this.halfcarry_add_table[lookup & 0x07] |
            this.overflow_add_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x85: {
        {
          var addtemp = this.z80.a + this.z80.l;
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.l & 0x88) >> 2) | ((addtemp & 0x88) >> 1);
          this.z80.a = addtemp & 0xff;
          this.z80.f =
            (addtemp & 0x100 ? 0x01 : 0) |
            this.halfcarry_add_table[lookup & 0x07] |
            this.overflow_add_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x86: {
        this.core.tstates += 3;
        {
          var bytetemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          {
            var addtemp = this.z80.a + bytetemp;
            var lookup = ((this.z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((addtemp & 0x88) >> 1);
            this.z80.a = addtemp & 0xff;
            this.z80.f =
              (addtemp & 0x100 ? 0x01 : 0) |
              this.halfcarry_add_table[lookup & 0x07] |
              this.overflow_add_table[lookup >> 4] |
              this.sz53_table[this.z80.a];
          }
        }
        break;
      }
      case 0x87: {
        {
          var addtemp = this.z80.a + this.z80.a;
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.a & 0x88) >> 2) | ((addtemp & 0x88) >> 1);
          this.z80.a = addtemp & 0xff;
          this.z80.f =
            (addtemp & 0x100 ? 0x01 : 0) |
            this.halfcarry_add_table[lookup & 0x07] |
            this.overflow_add_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x88: {
        {
          var adctemp = this.z80.a + this.z80.b + (this.z80.f & 0x01);
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.b & 0x88) >> 2) | ((adctemp & 0x88) >> 1);
          this.z80.a = adctemp & 0xff;
          this.z80.f =
            (adctemp & 0x100 ? 0x01 : 0) |
            this.halfcarry_add_table[lookup & 0x07] |
            this.overflow_add_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x89: {
        {
          var adctemp = this.z80.a + this.z80.c + (this.z80.f & 0x01);
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.c & 0x88) >> 2) | ((adctemp & 0x88) >> 1);
          this.z80.a = adctemp & 0xff;
          this.z80.f =
            (adctemp & 0x100 ? 0x01 : 0) |
            this.halfcarry_add_table[lookup & 0x07] |
            this.overflow_add_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x8a: {
        {
          var adctemp = this.z80.a + this.z80.d + (this.z80.f & 0x01);
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.d & 0x88) >> 2) | ((adctemp & 0x88) >> 1);
          this.z80.a = adctemp & 0xff;
          this.z80.f =
            (adctemp & 0x100 ? 0x01 : 0) |
            this.halfcarry_add_table[lookup & 0x07] |
            this.overflow_add_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x8b: {
        {
          var adctemp = this.z80.a + this.z80.e + (this.z80.f & 0x01);
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.e & 0x88) >> 2) | ((adctemp & 0x88) >> 1);
          this.z80.a = adctemp & 0xff;
          this.z80.f =
            (adctemp & 0x100 ? 0x01 : 0) |
            this.halfcarry_add_table[lookup & 0x07] |
            this.overflow_add_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x8c: {
        {
          var adctemp = this.z80.a + this.z80.h + (this.z80.f & 0x01);
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.h & 0x88) >> 2) | ((adctemp & 0x88) >> 1);
          this.z80.a = adctemp & 0xff;
          this.z80.f =
            (adctemp & 0x100 ? 0x01 : 0) |
            this.halfcarry_add_table[lookup & 0x07] |
            this.overflow_add_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x8d: {
        {
          var adctemp = this.z80.a + this.z80.l + (this.z80.f & 0x01);
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.l & 0x88) >> 2) | ((adctemp & 0x88) >> 1);
          this.z80.a = adctemp & 0xff;
          this.z80.f =
            (adctemp & 0x100 ? 0x01 : 0) |
            this.halfcarry_add_table[lookup & 0x07] |
            this.overflow_add_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x8e: {
        this.core.tstates += 3;
        {
          var bytetemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          {
            var adctemp = this.z80.a + bytetemp + (this.z80.f & 0x01);
            var lookup = ((this.z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((adctemp & 0x88) >> 1);
            this.z80.a = adctemp & 0xff;
            this.z80.f =
              (adctemp & 0x100 ? 0x01 : 0) |
              this.halfcarry_add_table[lookup & 0x07] |
              this.overflow_add_table[lookup >> 4] |
              this.sz53_table[this.z80.a];
          }
        }
        break;
      }
      case 0x8f: {
        {
          var adctemp = this.z80.a + this.z80.a + (this.z80.f & 0x01);
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.a & 0x88) >> 2) | ((adctemp & 0x88) >> 1);
          this.z80.a = adctemp & 0xff;
          this.z80.f =
            (adctemp & 0x100 ? 0x01 : 0) |
            this.halfcarry_add_table[lookup & 0x07] |
            this.overflow_add_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x90: {
        {
          var subtemp = this.z80.a - this.z80.b;
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.b & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
          this.z80.a = subtemp & 0xff;
          this.z80.f =
            (subtemp & 0x100 ? 0x01 : 0) |
            0x02 |
            this.halfcarry_sub_table[lookup & 0x07] |
            this.overflow_sub_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x91: {
        {
          var subtemp = this.z80.a - this.z80.c;
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.c & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
          this.z80.a = subtemp & 0xff;
          this.z80.f =
            (subtemp & 0x100 ? 0x01 : 0) |
            0x02 |
            this.halfcarry_sub_table[lookup & 0x07] |
            this.overflow_sub_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x92: {
        {
          var subtemp = this.z80.a - this.z80.d;
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.d & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
          this.z80.a = subtemp & 0xff;
          this.z80.f =
            (subtemp & 0x100 ? 0x01 : 0) |
            0x02 |
            this.halfcarry_sub_table[lookup & 0x07] |
            this.overflow_sub_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x93: {
        {
          var subtemp = this.z80.a - this.z80.e;
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.e & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
          this.z80.a = subtemp & 0xff;
          this.z80.f =
            (subtemp & 0x100 ? 0x01 : 0) |
            0x02 |
            this.halfcarry_sub_table[lookup & 0x07] |
            this.overflow_sub_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x94: {
        {
          var subtemp = this.z80.a - this.z80.h;
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.h & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
          this.z80.a = subtemp & 0xff;
          this.z80.f =
            (subtemp & 0x100 ? 0x01 : 0) |
            0x02 |
            this.halfcarry_sub_table[lookup & 0x07] |
            this.overflow_sub_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x95: {
        {
          var subtemp = this.z80.a - this.z80.l;
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.l & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
          this.z80.a = subtemp & 0xff;
          this.z80.f =
            (subtemp & 0x100 ? 0x01 : 0) |
            0x02 |
            this.halfcarry_sub_table[lookup & 0x07] |
            this.overflow_sub_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x96: {
        this.core.tstates += 3;
        {
          var bytetemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          {
            var subtemp = this.z80.a - bytetemp;
            var lookup = ((this.z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
            this.z80.a = subtemp & 0xff;
            this.z80.f =
              (subtemp & 0x100 ? 0x01 : 0) |
              0x02 |
              this.halfcarry_sub_table[lookup & 0x07] |
              this.overflow_sub_table[lookup >> 4] |
              this.sz53_table[this.z80.a];
          }
        }
        break;
      }
      case 0x97: {
        {
          var subtemp = this.z80.a - this.z80.a;
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.a & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
          this.z80.a = subtemp & 0xff;
          this.z80.f =
            (subtemp & 0x100 ? 0x01 : 0) |
            0x02 |
            this.halfcarry_sub_table[lookup & 0x07] |
            this.overflow_sub_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x98: {
        {
          var sbctemp = this.z80.a - this.z80.b - (this.z80.f & 0x01);
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.b & 0x88) >> 2) | ((sbctemp & 0x88) >> 1);
          this.z80.a = sbctemp & 0xff;
          this.z80.f =
            (sbctemp & 0x100 ? 0x01 : 0) |
            0x02 |
            this.halfcarry_sub_table[lookup & 0x07] |
            this.overflow_sub_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x99: {
        {
          var sbctemp = this.z80.a - this.z80.c - (this.z80.f & 0x01);
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.c & 0x88) >> 2) | ((sbctemp & 0x88) >> 1);
          this.z80.a = sbctemp & 0xff;
          this.z80.f =
            (sbctemp & 0x100 ? 0x01 : 0) |
            0x02 |
            this.halfcarry_sub_table[lookup & 0x07] |
            this.overflow_sub_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x9a: {
        {
          var sbctemp = this.z80.a - this.z80.d - (this.z80.f & 0x01);
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.d & 0x88) >> 2) | ((sbctemp & 0x88) >> 1);
          this.z80.a = sbctemp & 0xff;
          this.z80.f =
            (sbctemp & 0x100 ? 0x01 : 0) |
            0x02 |
            this.halfcarry_sub_table[lookup & 0x07] |
            this.overflow_sub_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x9b: {
        {
          var sbctemp = this.z80.a - this.z80.e - (this.z80.f & 0x01);
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.e & 0x88) >> 2) | ((sbctemp & 0x88) >> 1);
          this.z80.a = sbctemp & 0xff;
          this.z80.f =
            (sbctemp & 0x100 ? 0x01 : 0) |
            0x02 |
            this.halfcarry_sub_table[lookup & 0x07] |
            this.overflow_sub_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x9c: {
        {
          var sbctemp = this.z80.a - this.z80.h - (this.z80.f & 0x01);
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.h & 0x88) >> 2) | ((sbctemp & 0x88) >> 1);
          this.z80.a = sbctemp & 0xff;
          this.z80.f =
            (sbctemp & 0x100 ? 0x01 : 0) |
            0x02 |
            this.halfcarry_sub_table[lookup & 0x07] |
            this.overflow_sub_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x9d: {
        {
          var sbctemp = this.z80.a - this.z80.l - (this.z80.f & 0x01);
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.l & 0x88) >> 2) | ((sbctemp & 0x88) >> 1);
          this.z80.a = sbctemp & 0xff;
          this.z80.f =
            (sbctemp & 0x100 ? 0x01 : 0) |
            0x02 |
            this.halfcarry_sub_table[lookup & 0x07] |
            this.overflow_sub_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x9e: {
        this.core.tstates += 3;
        {
          var bytetemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          {
            var sbctemp = this.z80.a - bytetemp - (this.z80.f & 0x01);
            var lookup = ((this.z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((sbctemp & 0x88) >> 1);
            this.z80.a = sbctemp & 0xff;
            this.z80.f =
              (sbctemp & 0x100 ? 0x01 : 0) |
              0x02 |
              this.halfcarry_sub_table[lookup & 0x07] |
              this.overflow_sub_table[lookup >> 4] |
              this.sz53_table[this.z80.a];
          }
        }
        break;
      }
      case 0x9f: {
        {
          var sbctemp = this.z80.a - this.z80.a - (this.z80.f & 0x01);
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.a & 0x88) >> 2) | ((sbctemp & 0x88) >> 1);
          this.z80.a = sbctemp & 0xff;
          this.z80.f =
            (sbctemp & 0x100 ? 0x01 : 0) |
            0x02 |
            this.halfcarry_sub_table[lookup & 0x07] |
            this.overflow_sub_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0xa0: {
        {
          this.z80.a &= this.z80.b;
          this.z80.f = 0x10 | this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0xa1: {
        {
          this.z80.a &= this.z80.c;
          this.z80.f = 0x10 | this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0xa2: {
        {
          this.z80.a &= this.z80.d;
          this.z80.f = 0x10 | this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0xa3: {
        {
          this.z80.a &= this.z80.e;
          this.z80.f = 0x10 | this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0xa4: {
        {
          this.z80.a &= this.z80.h;
          this.z80.f = 0x10 | this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0xa5: {
        {
          this.z80.a &= this.z80.l;
          this.z80.f = 0x10 | this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0xa6: {
        this.core.tstates += 3;
        {
          var bytetemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          {
            this.z80.a &= bytetemp;
            this.z80.f = 0x10 | this.sz53p_table[this.z80.a];
          }
        }
        break;
      }
      case 0xa7: {
        {
          this.z80.a &= this.z80.a;
          this.z80.f = 0x10 | this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0xa8: {
        {
          this.z80.a ^= this.z80.b;
          this.z80.f = this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0xa9: {
        {
          this.z80.a ^= this.z80.c;
          this.z80.f = this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0xaa: {
        {
          this.z80.a ^= this.z80.d;
          this.z80.f = this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0xab: {
        {
          this.z80.a ^= this.z80.e;
          this.z80.f = this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0xac: {
        {
          this.z80.a ^= this.z80.h;
          this.z80.f = this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0xad: {
        {
          this.z80.a ^= this.z80.l;
          this.z80.f = this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0xae: {
        this.core.tstates += 3;
        {
          var bytetemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          {
            this.z80.a ^= bytetemp;
            this.z80.f = this.sz53p_table[this.z80.a];
          }
        }
        break;
      }
      case 0xaf: {
        {
          this.z80.a ^= this.z80.a;
          this.z80.f = this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0xb0: {
        {
          this.z80.a |= this.z80.b;
          this.z80.f = this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0xb1: {
        {
          this.z80.a |= this.z80.c;
          this.z80.f = this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0xb2: {
        {
          this.z80.a |= this.z80.d;
          this.z80.f = this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0xb3: {
        {
          this.z80.a |= this.z80.e;
          this.z80.f = this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0xb4: {
        {
          this.z80.a |= this.z80.h;
          this.z80.f = this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0xb5: {
        {
          this.z80.a |= this.z80.l;
          this.z80.f = this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0xb6: {
        this.core.tstates += 3;
        {
          var bytetemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          {
            this.z80.a |= bytetemp;
            this.z80.f = this.sz53p_table[this.z80.a];
          }
        }
        break;
      }
      case 0xb7: {
        {
          this.z80.a |= this.z80.a;
          this.z80.f = this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0xb8: {
        {
          var cptemp = this.z80.a - this.z80.b;
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.b & 0x88) >> 2) | ((cptemp & 0x88) >> 1);
          this.z80.f =
            (cptemp & 0x100 ? 0x01 : cptemp ? 0 : 0x40) |
            0x02 |
            this.halfcarry_sub_table[lookup & 0x07] |
            this.overflow_sub_table[lookup >> 4] |
            (this.z80.b & (0x08 | 0x20)) |
            (cptemp & 0x80);
        }
        break;
      }
      case 0xb9: {
        {
          var cptemp = this.z80.a - this.z80.c;
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.c & 0x88) >> 2) | ((cptemp & 0x88) >> 1);
          this.z80.f =
            (cptemp & 0x100 ? 0x01 : cptemp ? 0 : 0x40) |
            0x02 |
            this.halfcarry_sub_table[lookup & 0x07] |
            this.overflow_sub_table[lookup >> 4] |
            (this.z80.c & (0x08 | 0x20)) |
            (cptemp & 0x80);
        }
        break;
      }
      case 0xba: {
        {
          var cptemp = this.z80.a - this.z80.d;
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.d & 0x88) >> 2) | ((cptemp & 0x88) >> 1);
          this.z80.f =
            (cptemp & 0x100 ? 0x01 : cptemp ? 0 : 0x40) |
            0x02 |
            this.halfcarry_sub_table[lookup & 0x07] |
            this.overflow_sub_table[lookup >> 4] |
            (this.z80.d & (0x08 | 0x20)) |
            (cptemp & 0x80);
        }
        break;
      }
      case 0xbb: {
        {
          var cptemp = this.z80.a - this.z80.e;
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.e & 0x88) >> 2) | ((cptemp & 0x88) >> 1);
          this.z80.f =
            (cptemp & 0x100 ? 0x01 : cptemp ? 0 : 0x40) |
            0x02 |
            this.halfcarry_sub_table[lookup & 0x07] |
            this.overflow_sub_table[lookup >> 4] |
            (this.z80.e & (0x08 | 0x20)) |
            (cptemp & 0x80);
        }
        break;
      }
      case 0xbc: {
        {
          var cptemp = this.z80.a - this.z80.h;
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.h & 0x88) >> 2) | ((cptemp & 0x88) >> 1);
          this.z80.f =
            (cptemp & 0x100 ? 0x01 : cptemp ? 0 : 0x40) |
            0x02 |
            this.halfcarry_sub_table[lookup & 0x07] |
            this.overflow_sub_table[lookup >> 4] |
            (this.z80.h & (0x08 | 0x20)) |
            (cptemp & 0x80);
        }
        break;
      }
      case 0xbd: {
        {
          var cptemp = this.z80.a - this.z80.l;
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.l & 0x88) >> 2) | ((cptemp & 0x88) >> 1);
          this.z80.f =
            (cptemp & 0x100 ? 0x01 : cptemp ? 0 : 0x40) |
            0x02 |
            this.halfcarry_sub_table[lookup & 0x07] |
            this.overflow_sub_table[lookup >> 4] |
            (this.z80.l & (0x08 | 0x20)) |
            (cptemp & 0x80);
        }
        break;
      }
      case 0xbe: {
        this.core.tstates += 3;
        {
          var bytetemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          {
            var cptemp = this.z80.a - bytetemp;
            var lookup = ((this.z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((cptemp & 0x88) >> 1);
            this.z80.f =
              (cptemp & 0x100 ? 0x01 : cptemp ? 0 : 0x40) |
              0x02 |
              this.halfcarry_sub_table[lookup & 0x07] |
              this.overflow_sub_table[lookup >> 4] |
              (bytetemp & (0x08 | 0x20)) |
              (cptemp & 0x80);
          }
        }
        break;
      }
      case 0xbf: {
        {
          var cptemp = this.z80.a - this.z80.a;
          var lookup = ((this.z80.a & 0x88) >> 3) | ((this.z80.a & 0x88) >> 2) | ((cptemp & 0x88) >> 1);
          this.z80.f =
            (cptemp & 0x100 ? 0x01 : cptemp ? 0 : 0x40) |
            0x02 |
            this.halfcarry_sub_table[lookup & 0x07] |
            this.overflow_sub_table[lookup >> 4] |
            (this.z80.a & (0x08 | 0x20)) |
            (cptemp & 0x80);
        }
        break;
      }
      case 0xc0: {
        this.core.tstates++;
        if (!(this.z80.f & 0x40)) {
          {
            {
              this.core.tstates += 6;
              var lowbyte = this.mem.readbyte(this.z80.sp++);
              this.z80.sp &= 0xffff;
              var highbyte = this.mem.readbyte(this.z80.sp++);
              this.z80.sp &= 0xffff;
              this.z80.pc = lowbyte | (highbyte << 8);
            }
          }
        }
        break;
      }
      case 0xc1: {
        {
          this.core.tstates += 6;
          this.z80.c = this.mem.readbyte(this.z80.sp++);
          this.z80.sp &= 0xffff;
          this.z80.b = this.mem.readbyte(this.z80.sp++);
          this.z80.sp &= 0xffff;
        }
        break;
      }
      case 0xc2: {
        this.core.tstates += 6;
        if (!(this.z80.f & 0x40)) {
          {
            var jptemp = this.z80.pc;
            var pcl = this.mem.readbyte(jptemp++);
            jptemp &= 0xffff;
            var pch = this.mem.readbyte(jptemp);
            this.z80.pc = pcl | (pch << 8);
          }
        } else this.z80.pc += 2;
        break;
      }
      case 0xc3: {
        this.core.tstates += 6;
        {
          var jptemp = this.z80.pc;
          var pcl = this.mem.readbyte(jptemp++);
          jptemp &= 0xffff;
          var pch = this.mem.readbyte(jptemp);
          this.z80.pc = pcl | (pch << 8);
        }
        break;
      }
      case 0xc4: {
        this.core.tstates += 6;
        if (!(this.z80.f & 0x40)) {
          {
            var calltempl, calltemph;
            calltempl = this.mem.readbyte(this.z80.pc++);
            this.z80.pc &= 0xffff;
            this.core.tstates++;
            calltemph = this.mem.readbyte(this.z80.pc++);
            this.z80.pc &= 0xffff;
            {
              this.core.tstates += 6;
              this.z80.sp--;
              this.z80.sp &= 0xffff;
              this.mem.writebyte(this.z80.sp, this.z80.pc >> 8);
              this.z80.sp--;
              this.z80.sp &= 0xffff;
              this.mem.writebyte(this.z80.sp, this.z80.pc & 0xff);
            }
            var pcl = calltempl;
            var pch = calltemph;
            this.z80.pc = pcl | (pch << 8);
          }
        } else this.z80.pc += 2;
        break;
      }
      case 0xc5: {
        this.core.tstates++;
        {
          this.core.tstates += 6;
          this.z80.sp--;
          this.z80.sp &= 0xffff;
          this.mem.writebyte(this.z80.sp, this.z80.b);
          this.z80.sp--;
          this.z80.sp &= 0xffff;
          this.mem.writebyte(this.z80.sp, this.z80.c);
        }
        break;
      }
      case 0xc6: {
        this.core.tstates += 3;
        {
          var bytetemp = this.mem.readbyte(this.z80.pc++);
          {
            var addtemp = this.z80.a + bytetemp;
            var lookup = ((this.z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((addtemp & 0x88) >> 1);
            this.z80.a = addtemp & 0xff;
            this.z80.f =
              (addtemp & 0x100 ? 0x01 : 0) |
              this.halfcarry_add_table[lookup & 0x07] |
              this.overflow_add_table[lookup >> 4] |
              this.sz53_table[this.z80.a];
          }
        }
        break;
      }
      case 0xc7: {
        this.core.tstates++;
        {
          {
            this.core.tstates += 6;
            this.z80.sp--;
            this.z80.sp &= 0xffff;
            this.mem.writebyte(this.z80.sp, this.z80.pc >> 8);
            this.z80.sp--;
            this.z80.sp &= 0xffff;
            this.mem.writebyte(this.z80.sp, this.z80.pc & 0xff);
          }
          this.z80.pc = 0x00;
        }
        break;
      }
      case 0xc8: {
        this.core.tstates++;
        if (this.z80.f & 0x40) {
          {
            {
              this.core.tstates += 6;
              var lowbyte = this.mem.readbyte(this.z80.sp++);
              this.z80.sp &= 0xffff;
              var highbyte = this.mem.readbyte(this.z80.sp++);
              this.z80.sp &= 0xffff;
              this.z80.pc = lowbyte | (highbyte << 8);
            }
          }
        }
        break;
      }
      case 0xc9: {
        {
          {
            this.core.tstates += 6;
            var lowbyte = this.mem.readbyte(this.z80.sp++);
            this.z80.sp &= 0xffff;
            var highbyte = this.mem.readbyte(this.z80.sp++);
            this.z80.sp &= 0xffff;
            this.z80.pc = lowbyte | (highbyte << 8);
          }
        }
        break;
      }
      case 0xca: {
        this.core.tstates += 6;
        if (this.z80.f & 0x40) {
          {
            var jptemp = this.z80.pc;
            var pcl = this.mem.readbyte(jptemp++);
            jptemp &= 0xffff;
            var pch = this.mem.readbyte(jptemp);
            this.z80.pc = pcl | (pch << 8);
          }
        } else this.z80.pc += 2;
        break;
      }
      case 0xcb: {
        {
          var opcode2;
          this.core.tstates += 4;
          opcode2 = this.mem.readbyte(this.z80.pc++);
          this.z80.pc &= 0xffff;
          this.z80.r = (this.z80.r + 1) & 0x7f;
          this.z80_cbxx(opcode2);
        }
        break;
      }
      case 0xcc: {
        this.core.tstates += 6;
        if (this.z80.f & 0x40) {
          {
            var calltempl, calltemph;
            calltempl = this.mem.readbyte(this.z80.pc++);
            this.z80.pc &= 0xffff;
            this.core.tstates++;
            calltemph = this.mem.readbyte(this.z80.pc++);
            this.z80.pc &= 0xffff;
            {
              this.core.tstates += 6;
              this.z80.sp--;
              this.z80.sp &= 0xffff;
              this.mem.writebyte(this.z80.sp, this.z80.pc >> 8);
              this.z80.sp--;
              this.z80.sp &= 0xffff;
              this.mem.writebyte(this.z80.sp, this.z80.pc & 0xff);
            }
            var pcl = calltempl;
            var pch = calltemph;
            this.z80.pc = pcl | (pch << 8);
          }
        } else this.z80.pc += 2;
        break;
      }
      case 0xcd: {
        this.core.tstates += 6;
        {
          var calltempl, calltemph;
          calltempl = this.mem.readbyte(this.z80.pc++);
          this.z80.pc &= 0xffff;
          this.core.tstates++;
          calltemph = this.mem.readbyte(this.z80.pc++);
          this.z80.pc &= 0xffff;
          {
            this.core.tstates += 6;
            this.z80.sp--;
            this.z80.sp &= 0xffff;
            this.mem.writebyte(this.z80.sp, this.z80.pc >> 8);
            this.z80.sp--;
            this.z80.sp &= 0xffff;
            this.mem.writebyte(this.z80.sp, this.z80.pc & 0xff);
          }
          var pcl = calltempl;
          var pch = calltemph;
          this.z80.pc = pcl | (pch << 8);
        }
        break;
      }
      case 0xce: {
        this.core.tstates += 3;
        {
          var bytetemp = this.mem.readbyte(this.z80.pc++);
          {
            var adctemp = this.z80.a + bytetemp + (this.z80.f & 0x01);
            var lookup = ((this.z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((adctemp & 0x88) >> 1);
            this.z80.a = adctemp & 0xff;
            this.z80.f =
              (adctemp & 0x100 ? 0x01 : 0) |
              this.halfcarry_add_table[lookup & 0x07] |
              this.overflow_add_table[lookup >> 4] |
              this.sz53_table[this.z80.a];
          }
        }
        break;
      }
      case 0xcf: {
        this.core.tstates++;
        {
          {
            this.core.tstates += 6;
            this.z80.sp--;
            this.z80.sp &= 0xffff;
            this.mem.writebyte(this.z80.sp, this.z80.pc >> 8);
            this.z80.sp--;
            this.z80.sp &= 0xffff;
            this.mem.writebyte(this.z80.sp, this.z80.pc & 0xff);
          }
          this.z80.pc = 0x08;
        }
        break;
      }
      case 0xd0: {
        this.core.tstates++;
        if (!(this.z80.f & 0x01)) {
          {
            {
              this.core.tstates += 6;
              var lowbyte = this.mem.readbyte(this.z80.sp++);
              this.z80.sp &= 0xffff;
              var highbyte = this.mem.readbyte(this.z80.sp++);
              this.z80.sp &= 0xffff;
              this.z80.pc = lowbyte | (highbyte << 8);
            }
          }
        }
        break;
      }
      case 0xd1: {
        {
          this.core.tstates += 6;
          this.z80.e = this.mem.readbyte(this.z80.sp++);
          this.z80.sp &= 0xffff;
          this.z80.d = this.mem.readbyte(this.z80.sp++);
          this.z80.sp &= 0xffff;
        }
        break;
      }
      case 0xd2: {
        this.core.tstates += 6;
        if (!(this.z80.f & 0x01)) {
          {
            var jptemp = this.z80.pc;
            var pcl = this.mem.readbyte(jptemp++);
            jptemp &= 0xffff;
            var pch = this.mem.readbyte(jptemp);
            this.z80.pc = pcl | (pch << 8);
          }
        } else this.z80.pc += 2;
        break;
      }
      case 0xd3: {
        {
          var outtemp;
          this.core.tstates += 4;
          outtemp = this.mem.readbyte(this.z80.pc++) + (this.z80.a << 8);
          this.z80.pc &= 0xffff;
          {
            this.core.tstates += 3;
            this.core.io.writeport(outtemp, this.z80.a);
          }
        }
        break;
      }
      case 0xd4: {
        this.core.tstates += 6;
        if (!(this.z80.f & 0x01)) {
          {
            var calltempl, calltemph;
            calltempl = this.mem.readbyte(this.z80.pc++);
            this.z80.pc &= 0xffff;
            this.core.tstates++;
            calltemph = this.mem.readbyte(this.z80.pc++);
            this.z80.pc &= 0xffff;
            {
              this.core.tstates += 6;
              this.z80.sp--;
              this.z80.sp &= 0xffff;
              this.mem.writebyte(this.z80.sp, this.z80.pc >> 8);
              this.z80.sp--;
              this.z80.sp &= 0xffff;
              this.mem.writebyte(this.z80.sp, this.z80.pc & 0xff);
            }
            var pcl = calltempl;
            var pch = calltemph;
            this.z80.pc = pcl | (pch << 8);
          }
        } else this.z80.pc += 2;
        break;
      }
      case 0xd5: {
        this.core.tstates++;
        {
          this.core.tstates += 6;
          this.z80.sp--;
          this.z80.sp &= 0xffff;
          this.mem.writebyte(this.z80.sp, this.z80.d);
          this.z80.sp--;
          this.z80.sp &= 0xffff;
          this.mem.writebyte(this.z80.sp, this.z80.e);
        }
        break;
      }
      case 0xd6: {
        this.core.tstates += 3;
        {
          var bytetemp = this.mem.readbyte(this.z80.pc++);
          {
            var subtemp = this.z80.a - bytetemp;
            var lookup = ((this.z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
            this.z80.a = subtemp & 0xff;
            this.z80.f =
              (subtemp & 0x100 ? 0x01 : 0) |
              0x02 |
              this.halfcarry_sub_table[lookup & 0x07] |
              this.overflow_sub_table[lookup >> 4] |
              this.sz53_table[this.z80.a];
          }
        }
        break;
      }
      case 0xd7: {
        this.core.tstates++;
        {
          {
            this.core.tstates += 6;
            this.z80.sp--;
            this.z80.sp &= 0xffff;
            this.mem.writebyte(this.z80.sp, this.z80.pc >> 8);
            this.z80.sp--;
            this.z80.sp &= 0xffff;
            this.mem.writebyte(this.z80.sp, this.z80.pc & 0xff);
          }
          this.z80.pc = 0x10;
        }
        break;
      }
      case 0xd8: {
        this.core.tstates++;
        if (this.z80.f & 0x01) {
          {
            {
              this.core.tstates += 6;
              var lowbyte = this.mem.readbyte(this.z80.sp++);
              this.z80.sp &= 0xffff;
              var highbyte = this.mem.readbyte(this.z80.sp++);
              this.z80.sp &= 0xffff;
              this.z80.pc = lowbyte | (highbyte << 8);
            }
          }
        }
        break;
      }
      case 0xd9: {
        {
          var bytetemp;
          bytetemp = this.z80.b;
          this.z80.b = this.z80.b_;
          this.z80.b_ = bytetemp;
          bytetemp = this.z80.c;
          this.z80.c = this.z80.c_;
          this.z80.c_ = bytetemp;
          bytetemp = this.z80.d;
          this.z80.d = this.z80.d_;
          this.z80.d_ = bytetemp;
          bytetemp = this.z80.e;
          this.z80.e = this.z80.e_;
          this.z80.e_ = bytetemp;
          bytetemp = this.z80.h;
          this.z80.h = this.z80.h_;
          this.z80.h_ = bytetemp;
          bytetemp = this.z80.l;
          this.z80.l = this.z80.l_;
          this.z80.l_ = bytetemp;
        }
        break;
      }
      case 0xda: {
        this.core.tstates += 6;
        if (this.z80.f & 0x01) {
          {
            var jptemp = this.z80.pc;
            var pcl = this.mem.readbyte(jptemp++);
            jptemp &= 0xffff;
            var pch = this.mem.readbyte(jptemp);
            this.z80.pc = pcl | (pch << 8);
          }
        } else this.z80.pc += 2;
        break;
      }
      case 0xdb: {
        {
          var intemp;
          this.core.tstates += 4;
          intemp = this.mem.readbyte(this.z80.pc++) + (this.z80.a << 8);
          this.z80.pc &= 0xffff;
          this.core.tstates += 3;
          this.z80.a = this.core.io.readport(intemp);
        }
        break;
      }
      case 0xdc: {
        this.core.tstates += 6;
        if (this.z80.f & 0x01) {
          {
            var calltempl, calltemph;
            calltempl = this.mem.readbyte(this.z80.pc++);
            this.z80.pc &= 0xffff;
            this.core.tstates++;
            calltemph = this.mem.readbyte(this.z80.pc++);
            this.z80.pc &= 0xffff;
            {
              this.core.tstates += 6;
              this.z80.sp--;
              this.z80.sp &= 0xffff;
              this.mem.writebyte(this.z80.sp, this.z80.pc >> 8);
              this.z80.sp--;
              this.z80.sp &= 0xffff;
              this.mem.writebyte(this.z80.sp, this.z80.pc & 0xff);
            }
            var pcl = calltempl;
            var pch = calltemph;
            this.z80.pc = pcl | (pch << 8);
          }
        } else this.z80.pc += 2;
        break;
      }
      case 0xdd: {
        {
          var opcode2;
          this.core.tstates += 4;
          opcode2 = this.mem.readbyte(this.z80.pc++);
          this.z80.pc &= 0xffff;
          this.z80.r = (this.z80.r + 1) & 0x7f;
          this.z80_ddxx(opcode2);
        }
        break;
      }
      case 0xde: {
        this.core.tstates += 3;
        {
          var bytetemp = this.mem.readbyte(this.z80.pc++);
          {
            var sbctemp = this.z80.a - bytetemp - (this.z80.f & 0x01);
            var lookup = ((this.z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((sbctemp & 0x88) >> 1);
            this.z80.a = sbctemp & 0xff;
            this.z80.f =
              (sbctemp & 0x100 ? 0x01 : 0) |
              0x02 |
              this.halfcarry_sub_table[lookup & 0x07] |
              this.overflow_sub_table[lookup >> 4] |
              this.sz53_table[this.z80.a];
          }
        }
        break;
      }
      case 0xdf: {
        this.core.tstates++;
        {
          {
            this.core.tstates += 6;
            this.z80.sp--;
            this.z80.sp &= 0xffff;
            this.mem.writebyte(this.z80.sp, this.z80.pc >> 8);
            this.z80.sp--;
            this.z80.sp &= 0xffff;
            this.mem.writebyte(this.z80.sp, this.z80.pc & 0xff);
          }
          this.z80.pc = 0x18;
        }
        break;
      }
      case 0xe0: {
        this.core.tstates++;
        if (!(this.z80.f & 0x04)) {
          {
            {
              this.core.tstates += 6;
              var lowbyte = this.mem.readbyte(this.z80.sp++);
              this.z80.sp &= 0xffff;
              var highbyte = this.mem.readbyte(this.z80.sp++);
              this.z80.sp &= 0xffff;
              this.z80.pc = lowbyte | (highbyte << 8);
            }
          }
        }
        break;
      }
      case 0xe1: {
        {
          this.core.tstates += 6;
          this.z80.l = this.mem.readbyte(this.z80.sp++);
          this.z80.sp &= 0xffff;
          this.z80.h = this.mem.readbyte(this.z80.sp++);
          this.z80.sp &= 0xffff;
        }
        break;
      }
      case 0xe2: {
        this.core.tstates += 6;
        if (!(this.z80.f & 0x04)) {
          {
            var jptemp = this.z80.pc;
            var pcl = this.mem.readbyte(jptemp++);
            jptemp &= 0xffff;
            var pch = this.mem.readbyte(jptemp);
            this.z80.pc = pcl | (pch << 8);
          }
        } else this.z80.pc += 2;
        break;
      }
      case 0xe3: {
        {
          var bytetempl = this.mem.readbyte(this.z80.sp),
            bytetemph = this.mem.readbyte(this.z80.sp + 1);
          this.core.tstates += 15;
          this.mem.writebyte(this.z80.sp + 1, this.z80.h);
          this.mem.writebyte(this.z80.sp, this.z80.l);
          this.z80.l = bytetempl;
          this.z80.h = bytetemph;
        }
        break;
      }
      case 0xe4: {
        this.core.tstates += 6;
        if (!(this.z80.f & 0x04)) {
          {
            var calltempl, calltemph;
            calltempl = this.mem.readbyte(this.z80.pc++);
            this.z80.pc &= 0xffff;
            this.core.tstates++;
            calltemph = this.mem.readbyte(this.z80.pc++);
            this.z80.pc &= 0xffff;
            {
              this.core.tstates += 6;
              this.z80.sp--;
              this.z80.sp &= 0xffff;
              this.mem.writebyte(this.z80.sp, this.z80.pc >> 8);
              this.z80.sp--;
              this.z80.sp &= 0xffff;
              this.mem.writebyte(this.z80.sp, this.z80.pc & 0xff);
            }
            var pcl = calltempl;
            var pch = calltemph;
            this.z80.pc = pcl | (pch << 8);
          }
        } else this.z80.pc += 2;
        break;
      }
      case 0xe5: {
        this.core.tstates++;
        {
          this.core.tstates += 6;
          this.z80.sp--;
          this.z80.sp &= 0xffff;
          this.mem.writebyte(this.z80.sp, this.z80.h);
          this.z80.sp--;
          this.z80.sp &= 0xffff;
          this.mem.writebyte(this.z80.sp, this.z80.l);
        }
        break;
      }
      case 0xe6: {
        this.core.tstates += 3;
        {
          var bytetemp = this.mem.readbyte(this.z80.pc++);
          {
            this.z80.a &= bytetemp;
            this.z80.f = 0x10 | this.sz53p_table[this.z80.a];
          }
        }
        break;
      }
      case 0xe7: {
        this.core.tstates++;
        {
          {
            this.core.tstates += 6;
            this.z80.sp--;
            this.z80.sp &= 0xffff;
            this.mem.writebyte(this.z80.sp, this.z80.pc >> 8);
            this.z80.sp--;
            this.z80.sp &= 0xffff;
            this.mem.writebyte(this.z80.sp, this.z80.pc & 0xff);
          }
          this.z80.pc = 0x20;
        }
        break;
      }
      case 0xe8: {
        this.core.tstates++;
        if (this.z80.f & 0x04) {
          {
            {
              this.core.tstates += 6;
              var lowbyte = this.mem.readbyte(this.z80.sp++);
              this.z80.sp &= 0xffff;
              var highbyte = this.mem.readbyte(this.z80.sp++);
              this.z80.sp &= 0xffff;
              this.z80.pc = lowbyte | (highbyte << 8);
            }
          }
        }
        break;
      }
      case 0xe9: {
        this.z80.pc = this.z80.l | (this.z80.h << 8);
        break;
      }
      case 0xea: {
        this.core.tstates += 6;
        if (this.z80.f & 0x04) {
          {
            var jptemp = this.z80.pc;
            var pcl = this.mem.readbyte(jptemp++);
            jptemp &= 0xffff;
            var pch = this.mem.readbyte(jptemp);
            this.z80.pc = pcl | (pch << 8);
          }
        } else this.z80.pc += 2;
        break;
      }
      case 0xeb: {
        {
          var bytetemp;
          bytetemp = this.z80.d;
          this.z80.d = this.z80.h;
          this.z80.h = bytetemp;
          bytetemp = this.z80.e;
          this.z80.e = this.z80.l;
          this.z80.l = bytetemp;
        }
        break;
      }
      case 0xec: {
        this.core.tstates += 6;
        if (this.z80.f & 0x04) {
          {
            var calltempl, calltemph;
            calltempl = this.mem.readbyte(this.z80.pc++);
            this.z80.pc &= 0xffff;
            this.core.tstates++;
            calltemph = this.mem.readbyte(this.z80.pc++);
            this.z80.pc &= 0xffff;
            {
              this.core.tstates += 6;
              this.z80.sp--;
              this.z80.sp &= 0xffff;
              this.mem.writebyte(this.z80.sp, this.z80.pc >> 8);
              this.z80.sp--;
              this.z80.sp &= 0xffff;
              this.mem.writebyte(this.z80.sp, this.z80.pc & 0xff);
            }
            var pcl = calltempl;
            var pch = calltemph;
            this.z80.pc = pcl | (pch << 8);
          }
        } else this.z80.pc += 2;
        break;
      }
      case 0xed: {
        {
          var opcode2;
          this.core.tstates += 4;
          opcode2 = this.mem.readbyte(this.z80.pc++);
          this.z80.pc &= 0xffff;
          this.z80.r = (this.z80.r + 1) & 0x7f;
          this.z80_edxx(opcode2);
        }
        break;
      }
      case 0xee: {
        this.core.tstates += 3;
        {
          var bytetemp = this.mem.readbyte(this.z80.pc++);
          {
            this.z80.a ^= bytetemp;
            this.z80.f = this.sz53p_table[this.z80.a];
          }
        }
        break;
      }
      case 0xef: {
        this.core.tstates++;
        {
          {
            this.core.tstates += 6;
            this.z80.sp--;
            this.z80.sp &= 0xffff;
            this.mem.writebyte(this.z80.sp, this.z80.pc >> 8);
            this.z80.sp--;
            this.z80.sp &= 0xffff;
            this.mem.writebyte(this.z80.sp, this.z80.pc & 0xff);
          }
          this.z80.pc = 0x28;
        }
        break;
      }
      case 0xf0: {
        this.core.tstates++;
        if (!(this.z80.f & 0x80)) {
          {
            {
              this.core.tstates += 6;
              var lowbyte = this.mem.readbyte(this.z80.sp++);
              this.z80.sp &= 0xffff;
              var highbyte = this.mem.readbyte(this.z80.sp++);
              this.z80.sp &= 0xffff;
              this.z80.pc = lowbyte | (highbyte << 8);
            }
          }
        }
        break;
      }
      case 0xf1: {
        {
          this.core.tstates += 6;
          this.z80.f = this.mem.readbyte(this.z80.sp++);
          this.z80.sp &= 0xffff;
          this.z80.a = this.mem.readbyte(this.z80.sp++);
          this.z80.sp &= 0xffff;
        }
        break;
      }
      case 0xf2: {
        this.core.tstates += 6;
        if (!(this.z80.f & 0x80)) {
          {
            var jptemp = this.z80.pc;
            var pcl = this.mem.readbyte(jptemp++);
            jptemp &= 0xffff;
            var pch = this.mem.readbyte(jptemp);
            this.z80.pc = pcl | (pch << 8);
          }
        } else this.z80.pc += 2;
        break;
      }
      case 0xf3: {
        this.z80.iff1 = this.z80.iff2 = 0;
        break;
      }
      case 0xf4: {
        this.core.tstates += 6;
        if (!(this.z80.f & 0x80)) {
          {
            var calltempl, calltemph;
            calltempl = this.mem.readbyte(this.z80.pc++);
            this.z80.pc &= 0xffff;
            this.core.tstates++;
            calltemph = this.mem.readbyte(this.z80.pc++);
            this.z80.pc &= 0xffff;
            {
              this.core.tstates += 6;
              this.z80.sp--;
              this.z80.sp &= 0xffff;
              this.mem.writebyte(this.z80.sp, this.z80.pc >> 8);
              this.z80.sp--;
              this.z80.sp &= 0xffff;
              this.mem.writebyte(this.z80.sp, this.z80.pc & 0xff);
            }
            var pcl = calltempl;
            var pch = calltemph;
            this.z80.pc = pcl | (pch << 8);
          }
        } else this.z80.pc += 2;
        break;
      }
      case 0xf5: {
        this.core.tstates++;
        {
          this.core.tstates += 6;
          this.z80.sp--;
          this.z80.sp &= 0xffff;
          this.mem.writebyte(this.z80.sp, this.z80.a);
          this.z80.sp--;
          this.z80.sp &= 0xffff;
          this.mem.writebyte(this.z80.sp, this.z80.f);
        }
        break;
      }
      case 0xf6: {
        this.core.tstates += 3;
        {
          var bytetemp = this.mem.readbyte(this.z80.pc++);
          {
            this.z80.a |= bytetemp;
            this.z80.f = this.sz53p_table[this.z80.a];
          }
        }
        break;
      }
      case 0xf7: {
        this.core.tstates++;
        {
          {
            this.core.tstates += 6;
            this.z80.sp--;
            this.z80.sp &= 0xffff;
            this.mem.writebyte(this.z80.sp, this.z80.pc >> 8);
            this.z80.sp--;
            this.z80.sp &= 0xffff;
            this.mem.writebyte(this.z80.sp, this.z80.pc & 0xff);
          }
          this.z80.pc = 0x30;
        }
        break;
      }
      case 0xf8: {
        this.core.tstates++;
        if (this.z80.f & 0x80) {
          {
            {
              this.core.tstates += 6;
              var lowbyte = this.mem.readbyte(this.z80.sp++);
              this.z80.sp &= 0xffff;
              var highbyte = this.mem.readbyte(this.z80.sp++);
              this.z80.sp &= 0xffff;
              this.z80.pc = lowbyte | (highbyte << 8);
            }
          }
        }
        break;
      }
      case 0xf9: {
        this.core.tstates += 2;
        this.z80.sp = this.z80.l | (this.z80.h << 8);
        break;
      }
      case 0xfa: {
        this.core.tstates += 6;
        if (this.z80.f & 0x80) {
          {
            var jptemp = this.z80.pc;
            var pcl = this.mem.readbyte(jptemp++);
            jptemp &= 0xffff;
            var pch = this.mem.readbyte(jptemp);
            this.z80.pc = pcl | (pch << 8);
          }
        } else this.z80.pc += 2;
        break;
      }
      case 0xfb: {
        this.z80.iff1 = this.z80.iff2 = 1;
        break;
      }
      case 0xfc: {
        this.core.tstates += 6;
        if (this.z80.f & 0x80) {
          {
            var calltempl, calltemph;
            calltempl = this.mem.readbyte(this.z80.pc++);
            this.z80.pc &= 0xffff;
            this.core.tstates++;
            calltemph = this.mem.readbyte(this.z80.pc++);
            this.z80.pc &= 0xffff;
            {
              this.core.tstates += 6;
              this.z80.sp--;
              this.z80.sp &= 0xffff;
              this.mem.writebyte(this.z80.sp, this.z80.pc >> 8);
              this.z80.sp--;
              this.z80.sp &= 0xffff;
              this.mem.writebyte(this.z80.sp, this.z80.pc & 0xff);
            }
            var pcl = calltempl;
            var pch = calltemph;
            this.z80.pc = pcl | (pch << 8);
          }
        } else this.z80.pc += 2;
        break;
      }
      case 0xfd: {
        {
          var opcode2;
          this.core.tstates += 4;
          opcode2 = this.mem.readbyte(this.z80.pc++);
          this.z80.pc &= 0xffff;
          this.z80.r = (this.z80.r + 1) & 0x7f;
          this.z80_fdxx(opcode2);
        }
        break;
      }
      case 0xfe: {
        this.core.tstates += 3;
        {
          var bytetemp = this.mem.readbyte(this.z80.pc++);
          {
            var cptemp = this.z80.a - bytetemp;
            var lookup = ((this.z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((cptemp & 0x88) >> 1);
            this.z80.f =
              (cptemp & 0x100 ? 0x01 : cptemp ? 0 : 0x40) |
              0x02 |
              this.halfcarry_sub_table[lookup & 0x07] |
              this.overflow_sub_table[lookup >> 4] |
              (bytetemp & (0x08 | 0x20)) |
              (cptemp & 0x80);
          }
        }
        break;
      }
      case 0xff: {
        this.core.tstates++;
        {
          {
            this.core.tstates += 6;
            this.z80.sp--;
            this.z80.sp &= 0xffff;
            this.mem.writebyte(this.z80.sp, this.z80.pc >> 8);
            this.z80.sp--;
            this.z80.sp &= 0xffff;
            this.mem.writebyte(this.z80.sp, this.z80.pc & 0xff);
          }
          this.z80.pc = 0x38;
        }
        break;
      }
      case 256: {
        break;
      }
    }
  };
  z80_edxx = (key) => {
    switch (key) {
      case 0x40: {
        this.core.tstates += 1;
        {
          this.core.tstates += 3;
          this.z80.b = this.core.io.readport(this.z80.c | (this.z80.b << 8));
          this.z80.f = (this.z80.f & 0x01) | this.sz53p_table[this.z80.b];
        }
        break;
      }
      case 0x41: {
        this.core.tstates += 1;
        {
          this.core.tstates += 3;
          this.core.io.writeport(this.z80.c | (this.z80.b << 8), this.z80.b);
        }
        break;
      }
      case 0x42: {
        this.core.tstates += 7;
        {
          var sub16temp =
            (this.z80.l | (this.z80.h << 8)) - (this.z80.c | (this.z80.b << 8)) - (this.z80.f & 0x01);
          var lookup =
            (((this.z80.l | (this.z80.h << 8)) & 0x8800) >> 11) |
            (((this.z80.c | (this.z80.b << 8)) & 0x8800) >> 10) |
            ((sub16temp & 0x8800) >> 9);
          this.z80.h = (sub16temp >> 8) & 0xff;
          this.z80.l = sub16temp & 0xff;
          this.z80.f =
            (sub16temp & 0x10000 ? 0x01 : 0) |
            0x02 |
            this.overflow_sub_table[lookup >> 4] |
            (this.z80.h & (0x08 | 0x20 | 0x80)) |
            this.halfcarry_sub_table[lookup & 0x07] |
            (this.z80.l | (this.z80.h << 8) ? 0 : 0x40);
        }
        break;
      }
      case 0x43: {
        {
          var ldtemp;
          this.core.tstates += 12;
          ldtemp = this.mem.readbyte(this.z80.pc++);
          this.z80.pc &= 0xffff;
          ldtemp |= this.mem.readbyte(this.z80.pc++) << 8;
          this.z80.pc &= 0xffff;
          this.mem.writebyte(ldtemp++, this.z80.c);
          ldtemp &= 0xffff;
          this.mem.writebyte(ldtemp, this.z80.b);
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
          var bytetemp = this.z80.a;
          this.z80.a = 0;
          {
            var subtemp = this.z80.a - bytetemp;
            var lookup = ((this.z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
            this.z80.a = subtemp & 0xff;
            this.z80.f =
              (subtemp & 0x100 ? 0x01 : 0) |
              0x02 |
              this.halfcarry_sub_table[lookup & 0x07] |
              this.overflow_sub_table[lookup >> 4] |
              this.sz53_table[this.z80.a];
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
        this.z80.iff1 = this.z80.iff2;
        {
          {
            this.core.tstates += 6;
            var lowbyte = this.mem.readbyte(this.z80.sp++);
            this.z80.sp &= 0xffff;
            var highbyte = this.mem.readbyte(this.z80.sp++);
            this.z80.sp &= 0xffff;
            this.z80.pc = lowbyte | (highbyte << 8);
          }
        }
        break;
      }
      case 0x46:
      case 0x4e:
      case 0x66:
      case 0x6e: {
        this.z80.im = 0;
        break;
      }
      case 0x47: {
        this.core.tstates += 1;
        this.z80.i = this.z80.a;
        break;
      }
      case 0x48: {
        this.core.tstates += 1;
        {
          this.core.tstates += 3;
          this.z80.c = this.core.io.readport(this.z80.c | (this.z80.b << 8));
          this.z80.f = (this.z80.f & 0x01) | this.sz53p_table[this.z80.c];
        }
        break;
      }
      case 0x49: {
        this.core.tstates += 1;
        {
          this.core.tstates += 3;
          this.core.io.writeport(this.z80.c | (this.z80.b << 8), this.z80.c);
        }
        break;
      }
      case 0x4a: {
        this.core.tstates += 7;
        {
          var add16temp =
            (this.z80.l | (this.z80.h << 8)) + (this.z80.c | (this.z80.b << 8)) + (this.z80.f & 0x01);
          var lookup =
            (((this.z80.l | (this.z80.h << 8)) & 0x8800) >> 11) |
            (((this.z80.c | (this.z80.b << 8)) & 0x8800) >> 10) |
            ((add16temp & 0x8800) >> 9);
          this.z80.h = (add16temp >> 8) & 0xff;
          this.z80.l = add16temp & 0xff;
          this.z80.f =
            (add16temp & 0x10000 ? 0x01 : 0) |
            this.overflow_add_table[lookup >> 4] |
            (this.z80.h & (0x08 | 0x20 | 0x80)) |
            this.halfcarry_add_table[lookup & 0x07] |
            (this.z80.l | (this.z80.h << 8) ? 0 : 0x40);
        }
        break;
      }
      case 0x4b: {
        {
          var ldtemp;
          this.core.tstates += 12;
          ldtemp = this.mem.readbyte(this.z80.pc++);
          this.z80.pc &= 0xffff;
          ldtemp |= this.mem.readbyte(this.z80.pc++) << 8;
          this.z80.pc &= 0xffff;
          this.z80.c = this.mem.readbyte(ldtemp++);
          ldtemp &= 0xffff;
          this.z80.b = this.mem.readbyte(ldtemp);
        }
        break;
      }
      case 0x4f: {
        this.core.tstates += 1;
        this.z80.r = this.z80.r7 = this.z80.a;
        break;
      }
      case 0x50: {
        this.core.tstates += 1;
        {
          this.core.tstates += 3;
          this.z80.d = this.core.io.readport(this.z80.c | (this.z80.b << 8));
          this.z80.f = (this.z80.f & 0x01) | this.sz53p_table[this.z80.d];
        }
        break;
      }
      case 0x51: {
        this.core.tstates += 1;
        {
          this.core.tstates += 3;
          this.core.io.writeport(this.z80.c | (this.z80.b << 8), this.z80.d);
        }
        break;
      }
      case 0x52: {
        this.core.tstates += 7;
        {
          var sub16temp =
            (this.z80.l | (this.z80.h << 8)) - (this.z80.e | (this.z80.d << 8)) - (this.z80.f & 0x01);
          var lookup =
            (((this.z80.l | (this.z80.h << 8)) & 0x8800) >> 11) |
            (((this.z80.e | (this.z80.d << 8)) & 0x8800) >> 10) |
            ((sub16temp & 0x8800) >> 9);
          this.z80.h = (sub16temp >> 8) & 0xff;
          this.z80.l = sub16temp & 0xff;
          this.z80.f =
            (sub16temp & 0x10000 ? 0x01 : 0) |
            0x02 |
            this.overflow_sub_table[lookup >> 4] |
            (this.z80.h & (0x08 | 0x20 | 0x80)) |
            this.halfcarry_sub_table[lookup & 0x07] |
            (this.z80.l | (this.z80.h << 8) ? 0 : 0x40);
        }
        break;
      }
      case 0x53: {
        {
          var ldtemp;
          this.core.tstates += 12;
          ldtemp = this.mem.readbyte(this.z80.pc++);
          this.z80.pc &= 0xffff;
          ldtemp |= this.mem.readbyte(this.z80.pc++) << 8;
          this.z80.pc &= 0xffff;
          this.mem.writebyte(ldtemp++, this.z80.e);
          ldtemp &= 0xffff;
          this.mem.writebyte(ldtemp, this.z80.d);
        }
        break;
      }
      case 0x56:
      case 0x76: {
        this.z80.im = 1;
        break;
      }
      case 0x57: {
        this.core.tstates += 1;
        this.z80.a = this.z80.i;
        this.z80.f = (this.z80.f & 0x01) | this.sz53_table[this.z80.a] | (this.z80.iff2 ? 0x04 : 0);
        break;
      }
      case 0x58: {
        this.core.tstates += 1;
        {
          this.core.tstates += 3;
          this.z80.e = this.core.io.readport(this.z80.c | (this.z80.b << 8));
          this.z80.f = (this.z80.f & 0x01) | this.sz53p_table[this.z80.e];
        }
        break;
      }
      case 0x59: {
        this.core.tstates += 1;
        {
          this.core.tstates += 3;
          this.core.io.writeport(this.z80.c | (this.z80.b << 8), this.z80.e);
        }
        break;
      }
      case 0x5a: {
        this.core.tstates += 7;
        {
          var add16temp =
            (this.z80.l | (this.z80.h << 8)) + (this.z80.e | (this.z80.d << 8)) + (this.z80.f & 0x01);
          var lookup =
            (((this.z80.l | (this.z80.h << 8)) & 0x8800) >> 11) |
            (((this.z80.e | (this.z80.d << 8)) & 0x8800) >> 10) |
            ((add16temp & 0x8800) >> 9);
          this.z80.h = (add16temp >> 8) & 0xff;
          this.z80.l = add16temp & 0xff;
          this.z80.f =
            (add16temp & 0x10000 ? 0x01 : 0) |
            this.overflow_add_table[lookup >> 4] |
            (this.z80.h & (0x08 | 0x20 | 0x80)) |
            this.halfcarry_add_table[lookup & 0x07] |
            (this.z80.l | (this.z80.h << 8) ? 0 : 0x40);
        }
        break;
      }
      case 0x5b: {
        {
          var ldtemp;
          this.core.tstates += 12;
          ldtemp = this.mem.readbyte(this.z80.pc++);
          this.z80.pc &= 0xffff;
          ldtemp |= this.mem.readbyte(this.z80.pc++) << 8;
          this.z80.pc &= 0xffff;
          this.z80.e = this.mem.readbyte(ldtemp++);
          ldtemp &= 0xffff;
          this.z80.d = this.mem.readbyte(ldtemp);
        }
        break;
      }
      case 0x5e:
      case 0x7e: {
        this.z80.im = 2;
        break;
      }
      case 0x5f: {
        this.core.tstates += 1;
        this.z80.a = (this.z80.r & 0x7f) | (this.z80.r7 & 0x80);
        this.z80.f = (this.z80.f & 0x01) | this.sz53_table[this.z80.a] | (this.z80.iff2 ? 0x04 : 0);
        break;
      }
      case 0x60: {
        this.core.tstates += 1;
        {
          this.core.tstates += 3;
          this.z80.h = this.core.io.readport(this.z80.c | (this.z80.b << 8));
          this.z80.f = (this.z80.f & 0x01) | this.sz53p_table[this.z80.h];
        }
        break;
      }
      case 0x61: {
        this.core.tstates += 1;
        {
          this.core.tstates += 3;
          this.core.io.writeport(this.z80.c | (this.z80.b << 8), this.z80.h);
        }
        break;
      }
      case 0x62: {
        this.core.tstates += 7;
        {
          var sub16temp =
            (this.z80.l | (this.z80.h << 8)) - (this.z80.l | (this.z80.h << 8)) - (this.z80.f & 0x01);
          var lookup =
            (((this.z80.l | (this.z80.h << 8)) & 0x8800) >> 11) |
            (((this.z80.l | (this.z80.h << 8)) & 0x8800) >> 10) |
            ((sub16temp & 0x8800) >> 9);
          this.z80.h = (sub16temp >> 8) & 0xff;
          this.z80.l = sub16temp & 0xff;
          this.z80.f =
            (sub16temp & 0x10000 ? 0x01 : 0) |
            0x02 |
            this.overflow_sub_table[lookup >> 4] |
            (this.z80.h & (0x08 | 0x20 | 0x80)) |
            this.halfcarry_sub_table[lookup & 0x07] |
            (this.z80.l | (this.z80.h << 8) ? 0 : 0x40);
        }
        break;
      }
      case 0x63: {
        {
          var ldtemp;
          this.core.tstates += 12;
          ldtemp = this.mem.readbyte(this.z80.pc++);
          this.z80.pc &= 0xffff;
          ldtemp |= this.mem.readbyte(this.z80.pc++) << 8;
          this.z80.pc &= 0xffff;
          this.mem.writebyte(ldtemp++, this.z80.l);
          ldtemp &= 0xffff;
          this.mem.writebyte(ldtemp, this.z80.h);
        }
        break;
      }
      case 0x67: {
        {
          var bytetemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          this.core.tstates += 10;
          this.mem.writebyte(
            this.z80.l | (this.z80.h << 8),
            ((this.z80.a & 0x0f) << 4) | (bytetemp >> 4)
          );
          this.z80.a = (this.z80.a & 0xf0) | (bytetemp & 0x0f);
          this.z80.f = (this.z80.f & 0x01) | this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0x68: {
        this.core.tstates += 1;
        {
          this.core.tstates += 3;
          this.z80.l = this.core.io.readport(this.z80.c | (this.z80.b << 8));
          this.z80.f = (this.z80.f & 0x01) | this.sz53p_table[this.z80.l];
        }
        break;
      }
      case 0x69: {
        this.core.tstates += 1;
        {
          this.core.tstates += 3;
          this.core.io.writeport(this.z80.c | (this.z80.b << 8), this.z80.l);
        }
        break;
      }
      case 0x6a: {
        this.core.tstates += 7;
        {
          var add16temp =
            (this.z80.l | (this.z80.h << 8)) + (this.z80.l | (this.z80.h << 8)) + (this.z80.f & 0x01);
          var lookup =
            (((this.z80.l | (this.z80.h << 8)) & 0x8800) >> 11) |
            (((this.z80.l | (this.z80.h << 8)) & 0x8800) >> 10) |
            ((add16temp & 0x8800) >> 9);
          this.z80.h = (add16temp >> 8) & 0xff;
          this.z80.l = add16temp & 0xff;
          this.z80.f =
            (add16temp & 0x10000 ? 0x01 : 0) |
            this.overflow_add_table[lookup >> 4] |
            (this.z80.h & (0x08 | 0x20 | 0x80)) |
            this.halfcarry_add_table[lookup & 0x07] |
            (this.z80.l | (this.z80.h << 8) ? 0 : 0x40);
        }
        break;
      }
      case 0x6b: {
        {
          var ldtemp;
          this.core.tstates += 12;
          ldtemp = this.mem.readbyte(this.z80.pc++);
          this.z80.pc &= 0xffff;
          ldtemp |= this.mem.readbyte(this.z80.pc++) << 8;
          this.z80.pc &= 0xffff;
          this.z80.l = this.mem.readbyte(ldtemp++);
          ldtemp &= 0xffff;
          this.z80.h = this.mem.readbyte(ldtemp);
        }
        break;
      }
      case 0x6f: {
        {
          var bytetemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          this.core.tstates += 10;
          this.mem.writebyte(
            this.z80.l | (this.z80.h << 8),
            ((bytetemp & 0x0f) << 4) | (this.z80.a & 0x0f)
          );
          this.z80.a = (this.z80.a & 0xf0) | (bytetemp >> 4);
          this.z80.f = (this.z80.f & 0x01) | this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0x70: {
        this.core.tstates += 1;
        {
          var bytetemp;
          {
            this.core.tstates += 3;
            bytetemp = this.core.io.readport(this.z80.c | (this.z80.b << 8));
            this.z80.f = (this.z80.f & 0x01) | this.sz53p_table[bytetemp];
          }
        }
        break;
      }
      case 0x71: {
        this.core.tstates += 1;
        {
          this.core.tstates += 3;
          this.core.io.writeport(this.z80.c | (this.z80.b << 8), 0);
        }
        break;
      }
      case 0x72: {
        this.core.tstates += 7;
        {
          var sub16temp = (this.z80.l | (this.z80.h << 8)) - this.z80.sp - (this.z80.f & 0x01);
          var lookup =
            (((this.z80.l | (this.z80.h << 8)) & 0x8800) >> 11) |
            ((this.z80.sp & 0x8800) >> 10) |
            ((sub16temp & 0x8800) >> 9);
          this.z80.h = (sub16temp >> 8) & 0xff;
          this.z80.l = sub16temp & 0xff;
          this.z80.f =
            (sub16temp & 0x10000 ? 0x01 : 0) |
            0x02 |
            this.overflow_sub_table[lookup >> 4] |
            (this.z80.h & (0x08 | 0x20 | 0x80)) |
            this.halfcarry_sub_table[lookup & 0x07] |
            (this.z80.l | (this.z80.h << 8) ? 0 : 0x40);
        }
        break;
      }
      case 0x73: {
        {
          var ldtemp;
          this.core.tstates += 12;
          ldtemp = this.mem.readbyte(this.z80.pc++);
          this.z80.pc &= 0xffff;
          ldtemp |= this.mem.readbyte(this.z80.pc++) << 8;
          this.z80.pc &= 0xffff;
          this.mem.writebyte(ldtemp++, this.z80.sp & 0xff);
          ldtemp &= 0xffff;
          this.mem.writebyte(ldtemp, this.z80.sp >> 8);
        }
        break;
      }
      case 0x78: {
        this.core.tstates += 1;
        {
          this.core.tstates += 3;
          this.z80.a = this.core.io.readport(this.z80.c | (this.z80.b << 8));
          this.z80.f = (this.z80.f & 0x01) | this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0x79: {
        this.core.tstates += 1;
        {
          this.core.tstates += 3;
          this.core.io.writeport(this.z80.c | (this.z80.b << 8), this.z80.a);
        }
        break;
      }
      case 0x7a: {
        this.core.tstates += 7;
        {
          var add16temp = (this.z80.l | (this.z80.h << 8)) + this.z80.sp + (this.z80.f & 0x01);
          var lookup =
            (((this.z80.l | (this.z80.h << 8)) & 0x8800) >> 11) |
            ((this.z80.sp & 0x8800) >> 10) |
            ((add16temp & 0x8800) >> 9);
          this.z80.h = (add16temp >> 8) & 0xff;
          this.z80.l = add16temp & 0xff;
          this.z80.f =
            (add16temp & 0x10000 ? 0x01 : 0) |
            this.overflow_add_table[lookup >> 4] |
            (this.z80.h & (0x08 | 0x20 | 0x80)) |
            this.halfcarry_add_table[lookup & 0x07] |
            (this.z80.l | (this.z80.h << 8) ? 0 : 0x40);
        }
        break;
      }
      case 0x7b: {
        {
          var ldtemp;
          this.core.tstates += 12;
          ldtemp = this.mem.readbyte(this.z80.pc++);
          this.z80.pc &= 0xffff;
          ldtemp |= this.mem.readbyte(this.z80.pc++) << 8;
          this.z80.pc &= 0xffff;
          var regl = this.mem.readbyte(ldtemp++);
          ldtemp &= 0xffff;
          var regh = this.mem.readbyte(ldtemp);
          this.z80.sp = regl | (regh << 8);
        }
        break;
      }
      case 0xa0: {
        {
          var bytetemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          this.core.tstates += 8;
          var bctemp = ((this.z80.c | (this.z80.b << 8)) - 1) & 0xffff;
          this.z80.b = bctemp >> 8;
          this.z80.c = bctemp & 0xff;
          this.mem.writebyte(this.z80.e | (this.z80.d << 8), bytetemp);
          var detemp = ((this.z80.e | (this.z80.d << 8)) + 1) & 0xffff;
          this.z80.d = detemp >> 8;
          this.z80.e = detemp & 0xff;
          var hltemp = ((this.z80.l | (this.z80.h << 8)) + 1) & 0xffff;
          this.z80.h = hltemp >> 8;
          this.z80.l = hltemp & 0xff;
          bytetemp = (bytetemp + this.z80.a) & 0xff;
          this.z80.f =
            (this.z80.f & (0x01 | 0x40 | 0x80)) |
            (this.z80.c | (this.z80.b << 8) ? 0x04 : 0) |
            (bytetemp & 0x08) |
            (bytetemp & 0x02 ? 0x20 : 0);
        }
        break;
      }
      case 0xa1: {
        {
          var value = this.mem.readbyte(this.z80.l | (this.z80.h << 8)),
            bytetemp = (this.z80.a - value) & 0xff,
            lookup = ((this.z80.a & 0x08) >> 3) | ((value & 0x08) >> 2) | ((bytetemp & 0x08) >> 1);
          this.core.tstates += 8;
          var hltemp = ((this.z80.l | (this.z80.h << 8)) + 1) & 0xffff;
          this.z80.h = hltemp >> 8;
          this.z80.l = hltemp & 0xff;
          var bctemp = ((this.z80.c | (this.z80.b << 8)) - 1) & 0xffff;
          this.z80.b = bctemp >> 8;
          this.z80.c = bctemp & 0xff;
          this.z80.f =
            (this.z80.f & 0x01) |
            (this.z80.c | (this.z80.b << 8) ? 0x04 | 0x02 : 0x02) |
            this.halfcarry_sub_table[lookup] |
            (bytetemp ? 0 : 0x40) |
            (bytetemp & 0x80);
          if (this.z80.f & 0x10) bytetemp--;
          this.z80.f |= (bytetemp & 0x08) | (bytetemp & 0x02 ? 0x20 : 0);
        }
        break;
      }
      case 0xa2: {
        {
          var initemp = this.core.io.readport(this.z80.c | (this.z80.b << 8));
          this.core.tstates += 5;
          this.core.tstates += 3;
          this.mem.writebyte(this.z80.l | (this.z80.h << 8), initemp);
          this.z80.b = (this.z80.b - 1) & 0xff;
          var hltemp = ((this.z80.l | (this.z80.h << 8)) + 1) & 0xffff;
          this.z80.h = hltemp >> 8;
          this.z80.l = hltemp & 0xff;
          this.z80.f = (initemp & 0x80 ? 0x02 : 0) | this.sz53_table[this.z80.b];
        }
        break;
      }
      case 0xa3: {
        {
          var outitemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          this.z80.b = (this.z80.b - 1) & 0xff;
          this.core.tstates += 5;
          this.core.tstates += 3;
          var hltemp = ((this.z80.l | (this.z80.h << 8)) + 1) & 0xffff;
          this.z80.h = hltemp >> 8;
          this.z80.l = hltemp & 0xff;
          this.core.io.writeport(this.z80.c | (this.z80.b << 8), outitemp);
          this.z80.f = (outitemp & 0x80 ? 0x02 : 0) | this.sz53_table[this.z80.b];
        }
        break;
      }
      case 0xa8: {
        {
          var bytetemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          this.core.tstates += 8;
          var bctemp = ((this.z80.c | (this.z80.b << 8)) - 1) & 0xffff;
          this.z80.b = bctemp >> 8;
          this.z80.c = bctemp & 0xff;
          this.mem.writebyte(this.z80.e | (this.z80.d << 8), bytetemp);
          var detemp = ((this.z80.e | (this.z80.d << 8)) - 1) & 0xffff;
          this.z80.d = detemp >> 8;
          this.z80.e = detemp & 0xff;
          var hltemp = ((this.z80.l | (this.z80.h << 8)) - 1) & 0xffff;
          this.z80.h = hltemp >> 8;
          this.z80.l = hltemp & 0xff;
          bytetemp = (bytetemp + this.z80.a) & 0xff;
          this.z80.f =
            (this.z80.f & (0x01 | 0x40 | 0x80)) |
            (this.z80.c | (this.z80.b << 8) ? 0x04 : 0) |
            (bytetemp & 0x08) |
            (bytetemp & 0x02 ? 0x20 : 0);
        }
        break;
      }
      case 0xa9: {
        {
          var value = this.mem.readbyte(this.z80.l | (this.z80.h << 8)),
            bytetemp = (this.z80.a - value) & 0xff,
            lookup = ((this.z80.a & 0x08) >> 3) | ((value & 0x08) >> 2) | ((bytetemp & 0x08) >> 1);
          this.core.tstates += 8;
          var hltemp = ((this.z80.l | (this.z80.h << 8)) - 1) & 0xffff;
          this.z80.h = hltemp >> 8;
          this.z80.l = hltemp & 0xff;
          var bctemp = ((this.z80.c | (this.z80.b << 8)) - 1) & 0xffff;
          this.z80.b = bctemp >> 8;
          this.z80.c = bctemp & 0xff;
          this.z80.f =
            (this.z80.f & 0x01) |
            (this.z80.c | (this.z80.b << 8) ? 0x04 | 0x02 : 0x02) |
            this.halfcarry_sub_table[lookup] |
            (bytetemp ? 0 : 0x40) |
            (bytetemp & 0x80);
          if (this.z80.f & 0x10) bytetemp--;
          this.z80.f |= (bytetemp & 0x08) | (bytetemp & 0x02 ? 0x20 : 0);
        }
        break;
      }
      case 0xaa: {
        {
          var initemp = this.core.io.readport(this.z80.c | (this.z80.b << 8));
          this.core.tstates += 5;
          this.core.tstates += 3;
          this.mem.writebyte(this.z80.l | (this.z80.h << 8), initemp);
          this.z80.b = (this.z80.b - 1) & 0xff;
          var hltemp = ((this.z80.l | (this.z80.h << 8)) - 1) & 0xffff;
          this.z80.h = hltemp >> 8;
          this.z80.l = hltemp & 0xff;
          this.z80.f = (initemp & 0x80 ? 0x02 : 0) | this.sz53_table[this.z80.b];
        }
        break;
      }
      case 0xab: {
        {
          var outitemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          this.z80.b = (this.z80.b - 1) & 0xff;
          this.core.tstates += 5;
          this.core.tstates += 3;
          var hltemp = ((this.z80.l | (this.z80.h << 8)) - 1) & 0xffff;
          this.z80.h = hltemp >> 8;
          this.z80.l = hltemp & 0xff;
          this.core.io.writeport(this.z80.c | (this.z80.b << 8), outitemp);
          this.z80.f = (outitemp & 0x80 ? 0x02 : 0) | this.sz53_table[this.z80.b];
        }
        break;
      }
      case 0xb0: {
        {
          var bytetemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          this.core.tstates += 8;
          this.mem.writebyte(this.z80.e | (this.z80.d << 8), bytetemp);
          var hltemp = ((this.z80.l | (this.z80.h << 8)) + 1) & 0xffff;
          this.z80.h = hltemp >> 8;
          this.z80.l = hltemp & 0xff;
          var detemp = ((this.z80.e | (this.z80.d << 8)) + 1) & 0xffff;
          this.z80.d = detemp >> 8;
          this.z80.e = detemp & 0xff;
          var bctemp = ((this.z80.c | (this.z80.b << 8)) - 1) & 0xffff;
          this.z80.b = bctemp >> 8;
          this.z80.c = bctemp & 0xff;
          bytetemp = (bytetemp + this.z80.a) & 0xff;
          this.z80.f =
            (this.z80.f & (0x01 | 0x40 | 0x80)) |
            (this.z80.c | (this.z80.b << 8) ? 0x04 : 0) |
            (bytetemp & 0x08) |
            (bytetemp & 0x02 ? 0x20 : 0);
          if (this.z80.c | (this.z80.b << 8)) {
            this.core.tstates += 5;
            this.z80.pc -= 2;
          }
        }
        break;
      }
      case 0xb1: {
        {
          var value = this.mem.readbyte(this.z80.l | (this.z80.h << 8)),
            bytetemp = (this.z80.a - value) & 0xff,
            lookup = ((this.z80.a & 0x08) >> 3) | ((value & 0x08) >> 2) | ((bytetemp & 0x08) >> 1);
          this.core.tstates += 8;
          var hltemp = ((this.z80.l | (this.z80.h << 8)) + 1) & 0xffff;
          this.z80.h = hltemp >> 8;
          this.z80.l = hltemp & 0xff;
          var bctemp = ((this.z80.c | (this.z80.b << 8)) - 1) & 0xffff;
          this.z80.b = bctemp >> 8;
          this.z80.c = bctemp & 0xff;
          this.z80.f =
            (this.z80.f & 0x01) |
            (this.z80.c | (this.z80.b << 8) ? 0x04 | 0x02 : 0x02) |
            this.halfcarry_sub_table[lookup] |
            (bytetemp ? 0 : 0x40) |
            (bytetemp & 0x80);
          if (this.z80.f & 0x10) bytetemp--;
          this.z80.f |= (bytetemp & 0x08) | (bytetemp & 0x02 ? 0x20 : 0);
          if ((this.z80.f & (0x04 | 0x40)) == 0x04) {
            this.core.tstates += 5;
            this.z80.pc -= 2;
          }
        }
        break;
      }
      case 0xb2: {
        {
          var initemp = this.core.io.readport(this.z80.c | (this.z80.b << 8));
          this.core.tstates += 5;
          this.core.tstates += 3;
          this.mem.writebyte(this.z80.l | (this.z80.h << 8), initemp);
          this.z80.b = (this.z80.b - 1) & 0xff;
          var hltemp = ((this.z80.l | (this.z80.h << 8)) + 1) & 0xffff;
          this.z80.h = hltemp >> 8;
          this.z80.l = hltemp & 0xff;
          this.z80.f = (initemp & 0x80 ? 0x02 : 0) | this.sz53_table[this.z80.b];
          if (this.z80.b) {
            this.core.tstates += 5;
            this.z80.pc -= 2;
          }
        }
        break;
      }
      case 0xb3: {
        {
          var outitemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          this.core.tstates += 5;
          this.z80.b = (this.z80.b - 1) & 0xff;
          var hltemp = ((this.z80.l | (this.z80.h << 8)) + 1) & 0xffff;
          this.z80.h = hltemp >> 8;
          this.z80.l = hltemp & 0xff;
          this.core.io.writeport(this.z80.c | (this.z80.b << 8), outitemp);
          this.z80.f = (outitemp & 0x80 ? 0x02 : 0) | this.sz53_table[this.z80.b];
          if (this.z80.b) {
            this.core.tstates += 1;
            this.core.tstates += 7;
            this.z80.pc -= 2;
          } else {
            this.core.tstates += 3;
          }
        }
        break;
      }
      case 0xb8: {
        {
          var bytetemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          this.core.tstates += 8;
          this.mem.writebyte(this.z80.e | (this.z80.d << 8), bytetemp);
          var hltemp = ((this.z80.l | (this.z80.h << 8)) - 1) & 0xffff;
          this.z80.h = hltemp >> 8;
          this.z80.l = hltemp & 0xff;
          var detemp = ((this.z80.e | (this.z80.d << 8)) - 1) & 0xffff;
          this.z80.d = detemp >> 8;
          this.z80.e = detemp & 0xff;
          var bctemp = ((this.z80.c | (this.z80.b << 8)) - 1) & 0xffff;
          this.z80.b = bctemp >> 8;
          this.z80.c = bctemp & 0xff;
          bytetemp = (bytetemp + this.z80.a) & 0xff;
          this.z80.f =
            (this.z80.f & (0x01 | 0x40 | 0x80)) |
            (this.z80.c | (this.z80.b << 8) ? 0x04 : 0) |
            (bytetemp & 0x08) |
            (bytetemp & 0x02 ? 0x20 : 0);
          if (this.z80.c | (this.z80.b << 8)) {
            this.core.tstates += 5;
            this.z80.pc -= 2;
          }
        }
        break;
      }
      case 0xb9: {
        {
          var value = this.mem.readbyte(this.z80.l | (this.z80.h << 8)),
            bytetemp = (this.z80.a - value) & 0xff,
            lookup = ((this.z80.a & 0x08) >> 3) | ((value & 0x08) >> 2) | ((bytetemp & 0x08) >> 1);
          this.core.tstates += 8;
          var hltemp = ((this.z80.l | (this.z80.h << 8)) - 1) & 0xffff;
          this.z80.h = hltemp >> 8;
          this.z80.l = hltemp & 0xff;
          var bctemp = ((this.z80.c | (this.z80.b << 8)) - 1) & 0xffff;
          this.z80.b = bctemp >> 8;
          this.z80.c = bctemp & 0xff;
          this.z80.f =
            (this.z80.f & 0x01) |
            (this.z80.c | (this.z80.b << 8) ? 0x04 | 0x02 : 0x02) |
            this.halfcarry_sub_table[lookup] |
            (bytetemp ? 0 : 0x40) |
            (bytetemp & 0x80);
          if (this.z80.f & 0x10) bytetemp--;
          this.z80.f |= (bytetemp & 0x08) | (bytetemp & 0x02 ? 0x20 : 0);
          if ((this.z80.f & (0x04 | 0x40)) == 0x04) {
            this.core.tstates += 5;
            this.z80.pc -= 2;
          }
        }
        break;
      }
      case 0xba: {
        {
          var initemp = this.core.io.readport(this.z80.c | (this.z80.b << 8));
          this.core.tstates += 5;
          this.core.tstates += 3;
          this.mem.writebyte(this.z80.l | (this.z80.h << 8), initemp);
          this.z80.b = (this.z80.b - 1) & 0xff;
          var hltemp = ((this.z80.l | (this.z80.h << 8)) - 1) & 0xffff;
          this.z80.h = hltemp >> 8;
          this.z80.l = hltemp & 0xff;
          this.z80.f = (initemp & 0x80 ? 0x02 : 0) | this.sz53_table[this.z80.b];
          if (this.z80.b) {
            this.core.tstates += 5;
            this.z80.pc -= 2;
          }
        }
        break;
      }
      case 0xbb: {
        {
          var outitemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          this.core.tstates += 5;
          this.z80.b = (this.z80.b - 1) & 0xff;
          var hltemp = ((this.z80.l | (this.z80.h << 8)) - 1) & 0xffff;
          this.z80.h = hltemp >> 8;
          this.z80.l = hltemp & 0xff;
          this.core.io.writeport(this.z80.c | (this.z80.b << 8), outitemp);
          this.z80.f = (outitemp & 0x80 ? 0x02 : 0) | this.sz53_table[this.z80.b];
          if (this.z80.b) {
            this.core.tstates += 1;
            this.core.tstates += 7;
            this.z80.pc -= 2;
          } else {
            this.core.tstates += 3;
          }
        }
        break;
      }
      case 256: {
        break;
      }
    }
  };
  z80_cbxx = (key) => {
    switch (key) {
      case 0x00: {
        {
          this.z80.b = ((this.z80.b & 0x7f) << 1) | (this.z80.b >> 7);
          this.z80.f = (this.z80.b & 0x01) | this.sz53p_table[this.z80.b];
        }
        break;
      }
      case 0x01: {
        {
          this.z80.c = ((this.z80.c & 0x7f) << 1) | (this.z80.c >> 7);
          this.z80.f = (this.z80.c & 0x01) | this.sz53p_table[this.z80.c];
        }
        break;
      }
      case 0x02: {
        {
          this.z80.d = ((this.z80.d & 0x7f) << 1) | (this.z80.d >> 7);
          this.z80.f = (this.z80.d & 0x01) | this.sz53p_table[this.z80.d];
        }
        break;
      }
      case 0x03: {
        {
          this.z80.e = ((this.z80.e & 0x7f) << 1) | (this.z80.e >> 7);
          this.z80.f = (this.z80.e & 0x01) | this.sz53p_table[this.z80.e];
        }
        break;
      }
      case 0x04: {
        {
          this.z80.h = ((this.z80.h & 0x7f) << 1) | (this.z80.h >> 7);
          this.z80.f = (this.z80.h & 0x01) | this.sz53p_table[this.z80.h];
        }
        break;
      }
      case 0x05: {
        {
          this.z80.l = ((this.z80.l & 0x7f) << 1) | (this.z80.l >> 7);
          this.z80.f = (this.z80.l & 0x01) | this.sz53p_table[this.z80.l];
        }
        break;
      }
      case 0x06: {
        {
          var bytetemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          this.core.tstates += 7;
          {
            bytetemp = ((bytetemp & 0x7f) << 1) | (bytetemp >> 7);
            this.z80.f = (bytetemp & 0x01) | this.sz53p_table[bytetemp];
          }
          this.mem.writebyte(this.z80.l | (this.z80.h << 8), bytetemp);
        }
        break;
      }
      case 0x07: {
        {
          this.z80.a = ((this.z80.a & 0x7f) << 1) | (this.z80.a >> 7);
          this.z80.f = (this.z80.a & 0x01) | this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0x08: {
        {
          this.z80.f = this.z80.b & 0x01;
          this.z80.b = (this.z80.b >> 1) | ((this.z80.b & 0x01) << 7);
          this.z80.f |= this.sz53p_table[this.z80.b];
        }
        break;
      }
      case 0x09: {
        {
          this.z80.f = this.z80.c & 0x01;
          this.z80.c = (this.z80.c >> 1) | ((this.z80.c & 0x01) << 7);
          this.z80.f |= this.sz53p_table[this.z80.c];
        }
        break;
      }
      case 0x0a: {
        {
          this.z80.f = this.z80.d & 0x01;
          this.z80.d = (this.z80.d >> 1) | ((this.z80.d & 0x01) << 7);
          this.z80.f |= this.sz53p_table[this.z80.d];
        }
        break;
      }
      case 0x0b: {
        {
          this.z80.f = this.z80.e & 0x01;
          this.z80.e = (this.z80.e >> 1) | ((this.z80.e & 0x01) << 7);
          this.z80.f |= this.sz53p_table[this.z80.e];
        }
        break;
      }
      case 0x0c: {
        {
          this.z80.f = this.z80.h & 0x01;
          this.z80.h = (this.z80.h >> 1) | ((this.z80.h & 0x01) << 7);
          this.z80.f |= this.sz53p_table[this.z80.h];
        }
        break;
      }
      case 0x0d: {
        {
          this.z80.f = this.z80.l & 0x01;
          this.z80.l = (this.z80.l >> 1) | ((this.z80.l & 0x01) << 7);
          this.z80.f |= this.sz53p_table[this.z80.l];
        }
        break;
      }
      case 0x0e: {
        {
          var bytetemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          this.core.tstates += 7;
          {
            this.z80.f = bytetemp & 0x01;
            bytetemp = (bytetemp >> 1) | ((bytetemp & 0x01) << 7);
            this.z80.f |= this.sz53p_table[bytetemp];
          }
          this.mem.writebyte(this.z80.l | (this.z80.h << 8), bytetemp);
        }
        break;
      }
      case 0x0f: {
        {
          this.z80.f = this.z80.a & 0x01;
          this.z80.a = (this.z80.a >> 1) | ((this.z80.a & 0x01) << 7);
          this.z80.f |= this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0x10: {
        {
          var rltemp = this.z80.b;
          this.z80.b = ((this.z80.b & 0x7f) << 1) | (this.z80.f & 0x01);
          this.z80.f = (rltemp >> 7) | this.sz53p_table[this.z80.b];
        }
        break;
      }
      case 0x11: {
        {
          var rltemp = this.z80.c;
          this.z80.c = ((this.z80.c & 0x7f) << 1) | (this.z80.f & 0x01);
          this.z80.f = (rltemp >> 7) | this.sz53p_table[this.z80.c];
        }
        break;
      }
      case 0x12: {
        {
          var rltemp = this.z80.d;
          this.z80.d = ((this.z80.d & 0x7f) << 1) | (this.z80.f & 0x01);
          this.z80.f = (rltemp >> 7) | this.sz53p_table[this.z80.d];
        }
        break;
      }
      case 0x13: {
        {
          var rltemp = this.z80.e;
          this.z80.e = ((this.z80.e & 0x7f) << 1) | (this.z80.f & 0x01);
          this.z80.f = (rltemp >> 7) | this.sz53p_table[this.z80.e];
        }
        break;
      }
      case 0x14: {
        {
          var rltemp = this.z80.h;
          this.z80.h = ((this.z80.h & 0x7f) << 1) | (this.z80.f & 0x01);
          this.z80.f = (rltemp >> 7) | this.sz53p_table[this.z80.h];
        }
        break;
      }
      case 0x15: {
        {
          var rltemp = this.z80.l;
          this.z80.l = ((this.z80.l & 0x7f) << 1) | (this.z80.f & 0x01);
          this.z80.f = (rltemp >> 7) | this.sz53p_table[this.z80.l];
        }
        break;
      }
      case 0x16: {
        {
          var bytetemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          this.core.tstates += 7;
          {
            var rltemp = bytetemp;
            bytetemp = ((bytetemp & 0x7f) << 1) | (this.z80.f & 0x01);
            this.z80.f = (rltemp >> 7) | this.sz53p_table[bytetemp];
          }
          this.mem.writebyte(this.z80.l | (this.z80.h << 8), bytetemp);
        }
        break;
      }
      case 0x17: {
        {
          var rltemp = this.z80.a;
          this.z80.a = ((this.z80.a & 0x7f) << 1) | (this.z80.f & 0x01);
          this.z80.f = (rltemp >> 7) | this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0x18: {
        {
          var rrtemp = this.z80.b;
          this.z80.b = (this.z80.b >> 1) | ((this.z80.f & 0x01) << 7);
          this.z80.f = (rrtemp & 0x01) | this.sz53p_table[this.z80.b];
        }
        break;
      }
      case 0x19: {
        {
          var rrtemp = this.z80.c;
          this.z80.c = (this.z80.c >> 1) | ((this.z80.f & 0x01) << 7);
          this.z80.f = (rrtemp & 0x01) | this.sz53p_table[this.z80.c];
        }
        break;
      }
      case 0x1a: {
        {
          var rrtemp = this.z80.d;
          this.z80.d = (this.z80.d >> 1) | ((this.z80.f & 0x01) << 7);
          this.z80.f = (rrtemp & 0x01) | this.sz53p_table[this.z80.d];
        }
        break;
      }
      case 0x1b: {
        {
          var rrtemp = this.z80.e;
          this.z80.e = (this.z80.e >> 1) | ((this.z80.f & 0x01) << 7);
          this.z80.f = (rrtemp & 0x01) | this.sz53p_table[this.z80.e];
        }
        break;
      }
      case 0x1c: {
        {
          var rrtemp = this.z80.h;
          this.z80.h = (this.z80.h >> 1) | ((this.z80.f & 0x01) << 7);
          this.z80.f = (rrtemp & 0x01) | this.sz53p_table[this.z80.h];
        }
        break;
      }
      case 0x1d: {
        {
          var rrtemp = this.z80.l;
          this.z80.l = (this.z80.l >> 1) | ((this.z80.f & 0x01) << 7);
          this.z80.f = (rrtemp & 0x01) | this.sz53p_table[this.z80.l];
        }
        break;
      }
      case 0x1e: {
        {
          var bytetemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          this.core.tstates += 7;
          {
            var rrtemp = bytetemp;
            bytetemp = (bytetemp >> 1) | ((this.z80.f & 0x01) << 7);
            this.z80.f = (rrtemp & 0x01) | this.sz53p_table[bytetemp];
          }
          this.mem.writebyte(this.z80.l | (this.z80.h << 8), bytetemp);
        }
        break;
      }
      case 0x1f: {
        {
          var rrtemp = this.z80.a;
          this.z80.a = (this.z80.a >> 1) | ((this.z80.f & 0x01) << 7);
          this.z80.f = (rrtemp & 0x01) | this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0x20: {
        {
          this.z80.f = this.z80.b >> 7;
          this.z80.b <<= 1;
          this.z80.b &= 0xff;
          this.z80.f |= this.sz53p_table[this.z80.b];
        }
        break;
      }
      case 0x21: {
        {
          this.z80.f = this.z80.c >> 7;
          this.z80.c <<= 1;
          this.z80.c &= 0xff;
          this.z80.f |= this.sz53p_table[this.z80.c];
        }
        break;
      }
      case 0x22: {
        {
          this.z80.f = this.z80.d >> 7;
          this.z80.d <<= 1;
          this.z80.d &= 0xff;
          this.z80.f |= this.sz53p_table[this.z80.d];
        }
        break;
      }
      case 0x23: {
        {
          this.z80.f = this.z80.e >> 7;
          this.z80.e <<= 1;
          this.z80.e &= 0xff;
          this.z80.f |= this.sz53p_table[this.z80.e];
        }
        break;
      }
      case 0x24: {
        {
          this.z80.f = this.z80.h >> 7;
          this.z80.h <<= 1;
          this.z80.h &= 0xff;
          this.z80.f |= this.sz53p_table[this.z80.h];
        }
        break;
      }
      case 0x25: {
        {
          this.z80.f = this.z80.l >> 7;
          this.z80.l <<= 1;
          this.z80.l &= 0xff;
          this.z80.f |= this.sz53p_table[this.z80.l];
        }
        break;
      }
      case 0x26: {
        {
          var bytetemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          this.core.tstates += 7;
          {
            this.z80.f = bytetemp >> 7;
            bytetemp <<= 1;
            bytetemp &= 0xff;
            this.z80.f |= this.sz53p_table[bytetemp];
          }
          this.mem.writebyte(this.z80.l | (this.z80.h << 8), bytetemp);
        }
        break;
      }
      case 0x27: {
        {
          this.z80.f = this.z80.a >> 7;
          this.z80.a <<= 1;
          this.z80.a &= 0xff;
          this.z80.f |= this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0x28: {
        {
          this.z80.f = this.z80.b & 0x01;
          this.z80.b = (this.z80.b & 0x80) | (this.z80.b >> 1);
          this.z80.f |= this.sz53p_table[this.z80.b];
        }
        break;
      }
      case 0x29: {
        {
          this.z80.f = this.z80.c & 0x01;
          this.z80.c = (this.z80.c & 0x80) | (this.z80.c >> 1);
          this.z80.f |= this.sz53p_table[this.z80.c];
        }
        break;
      }
      case 0x2a: {
        {
          this.z80.f = this.z80.d & 0x01;
          this.z80.d = (this.z80.d & 0x80) | (this.z80.d >> 1);
          this.z80.f |= this.sz53p_table[this.z80.d];
        }
        break;
      }
      case 0x2b: {
        {
          this.z80.f = this.z80.e & 0x01;
          this.z80.e = (this.z80.e & 0x80) | (this.z80.e >> 1);
          this.z80.f |= this.sz53p_table[this.z80.e];
        }
        break;
      }
      case 0x2c: {
        {
          this.z80.f = this.z80.h & 0x01;
          this.z80.h = (this.z80.h & 0x80) | (this.z80.h >> 1);
          this.z80.f |= this.sz53p_table[this.z80.h];
        }
        break;
      }
      case 0x2d: {
        {
          this.z80.f = this.z80.l & 0x01;
          this.z80.l = (this.z80.l & 0x80) | (this.z80.l >> 1);
          this.z80.f |= this.sz53p_table[this.z80.l];
        }
        break;
      }
      case 0x2e: {
        {
          var bytetemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          this.core.tstates += 7;
          {
            this.z80.f = bytetemp & 0x01;
            bytetemp = (bytetemp & 0x80) | (bytetemp >> 1);
            this.z80.f |= this.sz53p_table[bytetemp];
          }
          this.mem.writebyte(this.z80.l | (this.z80.h << 8), bytetemp);
        }
        break;
      }
      case 0x2f: {
        {
          this.z80.f = this.z80.a & 0x01;
          this.z80.a = (this.z80.a & 0x80) | (this.z80.a >> 1);
          this.z80.f |= this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0x30: {
        {
          this.z80.f = this.z80.b >> 7;
          this.z80.b = (this.z80.b << 1) | 0x01;
          this.z80.b &= 0xff;
          this.z80.f |= this.sz53p_table[this.z80.b];
        }
        break;
      }
      case 0x31: {
        {
          this.z80.f = this.z80.c >> 7;
          this.z80.c = (this.z80.c << 1) | 0x01;
          this.z80.c &= 0xff;
          this.z80.f |= this.sz53p_table[this.z80.c];
        }
        break;
      }
      case 0x32: {
        {
          this.z80.f = this.z80.d >> 7;
          this.z80.d = (this.z80.d << 1) | 0x01;
          this.z80.d &= 0xff;
          this.z80.f |= this.sz53p_table[this.z80.d];
        }
        break;
      }
      case 0x33: {
        {
          this.z80.f = this.z80.e >> 7;
          this.z80.e = (this.z80.e << 1) | 0x01;
          this.z80.e &= 0xff;
          this.z80.f |= this.sz53p_table[this.z80.e];
        }
        break;
      }
      case 0x34: {
        {
          this.z80.f = this.z80.h >> 7;
          this.z80.h = (this.z80.h << 1) | 0x01;
          this.z80.h &= 0xff;
          this.z80.f |= this.sz53p_table[this.z80.h];
        }
        break;
      }
      case 0x35: {
        {
          this.z80.f = this.z80.l >> 7;
          this.z80.l = (this.z80.l << 1) | 0x01;
          this.z80.l &= 0xff;
          this.z80.f |= this.sz53p_table[this.z80.l];
        }
        break;
      }
      case 0x36: {
        {
          var bytetemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          this.core.tstates += 7;
          {
            this.z80.f = bytetemp >> 7;
            bytetemp = (bytetemp << 1) | 0x01;
            bytetemp &= 0xff;
            this.z80.f |= this.sz53p_table[bytetemp];
          }
          this.mem.writebyte(this.z80.l | (this.z80.h << 8), bytetemp);
        }
        break;
      }
      case 0x37: {
        {
          this.z80.f = this.z80.a >> 7;
          this.z80.a = (this.z80.a << 1) | 0x01;
          this.z80.a &= 0xff;
          this.z80.f |= this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0x38: {
        {
          this.z80.f = this.z80.b & 0x01;
          this.z80.b >>= 1;
          this.z80.f |= this.sz53p_table[this.z80.b];
        }
        break;
      }
      case 0x39: {
        {
          this.z80.f = this.z80.c & 0x01;
          this.z80.c >>= 1;
          this.z80.f |= this.sz53p_table[this.z80.c];
        }
        break;
      }
      case 0x3a: {
        {
          this.z80.f = this.z80.d & 0x01;
          this.z80.d >>= 1;
          this.z80.f |= this.sz53p_table[this.z80.d];
        }
        break;
      }
      case 0x3b: {
        {
          this.z80.f = this.z80.e & 0x01;
          this.z80.e >>= 1;
          this.z80.f |= this.sz53p_table[this.z80.e];
        }
        break;
      }
      case 0x3c: {
        {
          this.z80.f = this.z80.h & 0x01;
          this.z80.h >>= 1;
          this.z80.f |= this.sz53p_table[this.z80.h];
        }
        break;
      }
      case 0x3d: {
        {
          this.z80.f = this.z80.l & 0x01;
          this.z80.l >>= 1;
          this.z80.f |= this.sz53p_table[this.z80.l];
        }
        break;
      }
      case 0x3e: {
        {
          var bytetemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          this.core.tstates += 7;
          {
            this.z80.f = bytetemp & 0x01;
            bytetemp >>= 1;
            this.z80.f |= this.sz53p_table[bytetemp];
          }
          this.mem.writebyte(this.z80.l | (this.z80.h << 8), bytetemp);
        }
        break;
      }
      case 0x3f: {
        {
          this.z80.f = this.z80.a & 0x01;
          this.z80.a >>= 1;
          this.z80.f |= this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0x40: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.b & (0x08 | 0x20));
          if (!(this.z80.b & (0x01 << 0))) this.z80.f |= 0x04 | 0x40;
          if (0 == 7 && this.z80.b & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x41: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.c & (0x08 | 0x20));
          if (!(this.z80.c & (0x01 << 0))) this.z80.f |= 0x04 | 0x40;
          if (0 == 7 && this.z80.c & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x42: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.d & (0x08 | 0x20));
          if (!(this.z80.d & (0x01 << 0))) this.z80.f |= 0x04 | 0x40;
          if (0 == 7 && this.z80.d & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x43: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.e & (0x08 | 0x20));
          if (!(this.z80.e & (0x01 << 0))) this.z80.f |= 0x04 | 0x40;
          if (0 == 7 && this.z80.e & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x44: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.h & (0x08 | 0x20));
          if (!(this.z80.h & (0x01 << 0))) this.z80.f |= 0x04 | 0x40;
          if (0 == 7 && this.z80.h & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x45: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.l & (0x08 | 0x20));
          if (!(this.z80.l & (0x01 << 0))) this.z80.f |= 0x04 | 0x40;
          if (0 == 7 && this.z80.l & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x46: {
        {
          var bytetemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          this.core.tstates += 4;
          {
            this.z80.f = (this.z80.f & 0x01) | 0x10 | (bytetemp & (0x08 | 0x20));
            if (!(bytetemp & (0x01 << 0))) this.z80.f |= 0x04 | 0x40;
            if (0 == 7 && bytetemp & 0x80) this.z80.f |= 0x80;
          }
        }
        break;
      }
      case 0x47: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.a & (0x08 | 0x20));
          if (!(this.z80.a & (0x01 << 0))) this.z80.f |= 0x04 | 0x40;
          if (0 == 7 && this.z80.a & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x48: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.b & (0x08 | 0x20));
          if (!(this.z80.b & (0x01 << 1))) this.z80.f |= 0x04 | 0x40;
          if (1 == 7 && this.z80.b & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x49: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.c & (0x08 | 0x20));
          if (!(this.z80.c & (0x01 << 1))) this.z80.f |= 0x04 | 0x40;
          if (1 == 7 && this.z80.c & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x4a: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.d & (0x08 | 0x20));
          if (!(this.z80.d & (0x01 << 1))) this.z80.f |= 0x04 | 0x40;
          if (1 == 7 && this.z80.d & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x4b: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.e & (0x08 | 0x20));
          if (!(this.z80.e & (0x01 << 1))) this.z80.f |= 0x04 | 0x40;
          if (1 == 7 && this.z80.e & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x4c: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.h & (0x08 | 0x20));
          if (!(this.z80.h & (0x01 << 1))) this.z80.f |= 0x04 | 0x40;
          if (1 == 7 && this.z80.h & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x4d: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.l & (0x08 | 0x20));
          if (!(this.z80.l & (0x01 << 1))) this.z80.f |= 0x04 | 0x40;
          if (1 == 7 && this.z80.l & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x4e: {
        {
          var bytetemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          this.core.tstates += 4;
          {
            this.z80.f = (this.z80.f & 0x01) | 0x10 | (bytetemp & (0x08 | 0x20));
            if (!(bytetemp & (0x01 << 1))) this.z80.f |= 0x04 | 0x40;
            if (1 == 7 && bytetemp & 0x80) this.z80.f |= 0x80;
          }
        }
        break;
      }
      case 0x4f: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.a & (0x08 | 0x20));
          if (!(this.z80.a & (0x01 << 1))) this.z80.f |= 0x04 | 0x40;
          if (1 == 7 && this.z80.a & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x50: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.b & (0x08 | 0x20));
          if (!(this.z80.b & (0x01 << 2))) this.z80.f |= 0x04 | 0x40;
          if (2 == 7 && this.z80.b & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x51: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.c & (0x08 | 0x20));
          if (!(this.z80.c & (0x01 << 2))) this.z80.f |= 0x04 | 0x40;
          if (2 == 7 && this.z80.c & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x52: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.d & (0x08 | 0x20));
          if (!(this.z80.d & (0x01 << 2))) this.z80.f |= 0x04 | 0x40;
          if (2 == 7 && this.z80.d & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x53: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.e & (0x08 | 0x20));
          if (!(this.z80.e & (0x01 << 2))) this.z80.f |= 0x04 | 0x40;
          if (2 == 7 && this.z80.e & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x54: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.h & (0x08 | 0x20));
          if (!(this.z80.h & (0x01 << 2))) this.z80.f |= 0x04 | 0x40;
          if (2 == 7 && this.z80.h & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x55: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.l & (0x08 | 0x20));
          if (!(this.z80.l & (0x01 << 2))) this.z80.f |= 0x04 | 0x40;
          if (2 == 7 && this.z80.l & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x56: {
        {
          var bytetemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          this.core.tstates += 4;
          {
            this.z80.f = (this.z80.f & 0x01) | 0x10 | (bytetemp & (0x08 | 0x20));
            if (!(bytetemp & (0x01 << 2))) this.z80.f |= 0x04 | 0x40;
            if (2 == 7 && bytetemp & 0x80) this.z80.f |= 0x80;
          }
        }
        break;
      }
      case 0x57: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.a & (0x08 | 0x20));
          if (!(this.z80.a & (0x01 << 2))) this.z80.f |= 0x04 | 0x40;
          if (2 == 7 && this.z80.a & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x58: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.b & (0x08 | 0x20));
          if (!(this.z80.b & (0x01 << 3))) this.z80.f |= 0x04 | 0x40;
          if (3 == 7 && this.z80.b & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x59: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.c & (0x08 | 0x20));
          if (!(this.z80.c & (0x01 << 3))) this.z80.f |= 0x04 | 0x40;
          if (3 == 7 && this.z80.c & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x5a: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.d & (0x08 | 0x20));
          if (!(this.z80.d & (0x01 << 3))) this.z80.f |= 0x04 | 0x40;
          if (3 == 7 && this.z80.d & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x5b: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.e & (0x08 | 0x20));
          if (!(this.z80.e & (0x01 << 3))) this.z80.f |= 0x04 | 0x40;
          if (3 == 7 && this.z80.e & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x5c: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.h & (0x08 | 0x20));
          if (!(this.z80.h & (0x01 << 3))) this.z80.f |= 0x04 | 0x40;
          if (3 == 7 && this.z80.h & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x5d: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.l & (0x08 | 0x20));
          if (!(this.z80.l & (0x01 << 3))) this.z80.f |= 0x04 | 0x40;
          if (3 == 7 && this.z80.l & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x5e: {
        {
          var bytetemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          this.core.tstates += 4;
          {
            this.z80.f = (this.z80.f & 0x01) | 0x10 | (bytetemp & (0x08 | 0x20));
            if (!(bytetemp & (0x01 << 3))) this.z80.f |= 0x04 | 0x40;
            if (3 == 7 && bytetemp & 0x80) this.z80.f |= 0x80;
          }
        }
        break;
      }
      case 0x5f: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.a & (0x08 | 0x20));
          if (!(this.z80.a & (0x01 << 3))) this.z80.f |= 0x04 | 0x40;
          if (3 == 7 && this.z80.a & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x60: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.b & (0x08 | 0x20));
          if (!(this.z80.b & (0x01 << 4))) this.z80.f |= 0x04 | 0x40;
          if (4 == 7 && this.z80.b & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x61: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.c & (0x08 | 0x20));
          if (!(this.z80.c & (0x01 << 4))) this.z80.f |= 0x04 | 0x40;
          if (4 == 7 && this.z80.c & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x62: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.d & (0x08 | 0x20));
          if (!(this.z80.d & (0x01 << 4))) this.z80.f |= 0x04 | 0x40;
          if (4 == 7 && this.z80.d & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x63: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.e & (0x08 | 0x20));
          if (!(this.z80.e & (0x01 << 4))) this.z80.f |= 0x04 | 0x40;
          if (4 == 7 && this.z80.e & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x64: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.h & (0x08 | 0x20));
          if (!(this.z80.h & (0x01 << 4))) this.z80.f |= 0x04 | 0x40;
          if (4 == 7 && this.z80.h & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x65: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.l & (0x08 | 0x20));
          if (!(this.z80.l & (0x01 << 4))) this.z80.f |= 0x04 | 0x40;
          if (4 == 7 && this.z80.l & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x66: {
        {
          var bytetemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          this.core.tstates += 4;
          {
            this.z80.f = (this.z80.f & 0x01) | 0x10 | (bytetemp & (0x08 | 0x20));
            if (!(bytetemp & (0x01 << 4))) this.z80.f |= 0x04 | 0x40;
            if (4 == 7 && bytetemp & 0x80) this.z80.f |= 0x80;
          }
        }
        break;
      }
      case 0x67: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.a & (0x08 | 0x20));
          if (!(this.z80.a & (0x01 << 4))) this.z80.f |= 0x04 | 0x40;
          if (4 == 7 && this.z80.a & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x68: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.b & (0x08 | 0x20));
          if (!(this.z80.b & (0x01 << 5))) this.z80.f |= 0x04 | 0x40;
          if (5 == 7 && this.z80.b & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x69: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.c & (0x08 | 0x20));
          if (!(this.z80.c & (0x01 << 5))) this.z80.f |= 0x04 | 0x40;
          if (5 == 7 && this.z80.c & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x6a: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.d & (0x08 | 0x20));
          if (!(this.z80.d & (0x01 << 5))) this.z80.f |= 0x04 | 0x40;
          if (5 == 7 && this.z80.d & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x6b: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.e & (0x08 | 0x20));
          if (!(this.z80.e & (0x01 << 5))) this.z80.f |= 0x04 | 0x40;
          if (5 == 7 && this.z80.e & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x6c: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.h & (0x08 | 0x20));
          if (!(this.z80.h & (0x01 << 5))) this.z80.f |= 0x04 | 0x40;
          if (5 == 7 && this.z80.h & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x6d: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.l & (0x08 | 0x20));
          if (!(this.z80.l & (0x01 << 5))) this.z80.f |= 0x04 | 0x40;
          if (5 == 7 && this.z80.l & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x6e: {
        {
          var bytetemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          this.core.tstates += 4;
          {
            this.z80.f = (this.z80.f & 0x01) | 0x10 | (bytetemp & (0x08 | 0x20));
            if (!(bytetemp & (0x01 << 5))) this.z80.f |= 0x04 | 0x40;
            if (5 == 7 && bytetemp & 0x80) this.z80.f |= 0x80;
          }
        }
        break;
      }
      case 0x6f: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.a & (0x08 | 0x20));
          if (!(this.z80.a & (0x01 << 5))) this.z80.f |= 0x04 | 0x40;
          if (5 == 7 && this.z80.a & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x70: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.b & (0x08 | 0x20));
          if (!(this.z80.b & (0x01 << 6))) this.z80.f |= 0x04 | 0x40;
          if (6 == 7 && this.z80.b & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x71: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.c & (0x08 | 0x20));
          if (!(this.z80.c & (0x01 << 6))) this.z80.f |= 0x04 | 0x40;
          if (6 == 7 && this.z80.c & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x72: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.d & (0x08 | 0x20));
          if (!(this.z80.d & (0x01 << 6))) this.z80.f |= 0x04 | 0x40;
          if (6 == 7 && this.z80.d & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x73: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.e & (0x08 | 0x20));
          if (!(this.z80.e & (0x01 << 6))) this.z80.f |= 0x04 | 0x40;
          if (6 == 7 && this.z80.e & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x74: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.h & (0x08 | 0x20));
          if (!(this.z80.h & (0x01 << 6))) this.z80.f |= 0x04 | 0x40;
          if (6 == 7 && this.z80.h & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x75: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.l & (0x08 | 0x20));
          if (!(this.z80.l & (0x01 << 6))) this.z80.f |= 0x04 | 0x40;
          if (6 == 7 && this.z80.l & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x76: {
        {
          var bytetemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          this.core.tstates += 4;
          {
            this.z80.f = (this.z80.f & 0x01) | 0x10 | (bytetemp & (0x08 | 0x20));
            if (!(bytetemp & (0x01 << 6))) this.z80.f |= 0x04 | 0x40;
            if (6 == 7 && bytetemp & 0x80) this.z80.f |= 0x80;
          }
        }
        break;
      }
      case 0x77: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.a & (0x08 | 0x20));
          if (!(this.z80.a & (0x01 << 6))) this.z80.f |= 0x04 | 0x40;
          if (6 == 7 && this.z80.a & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x78: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.b & (0x08 | 0x20));
          if (!(this.z80.b & (0x01 << 7))) this.z80.f |= 0x04 | 0x40;
          if (7 == 7 && this.z80.b & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x79: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.c & (0x08 | 0x20));
          if (!(this.z80.c & (0x01 << 7))) this.z80.f |= 0x04 | 0x40;
          if (7 == 7 && this.z80.c & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x7a: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.d & (0x08 | 0x20));
          if (!(this.z80.d & (0x01 << 7))) this.z80.f |= 0x04 | 0x40;
          if (7 == 7 && this.z80.d & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x7b: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.e & (0x08 | 0x20));
          if (!(this.z80.e & (0x01 << 7))) this.z80.f |= 0x04 | 0x40;
          if (7 == 7 && this.z80.e & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x7c: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.h & (0x08 | 0x20));
          if (!(this.z80.h & (0x01 << 7))) this.z80.f |= 0x04 | 0x40;
          if (7 == 7 && this.z80.h & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x7d: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.l & (0x08 | 0x20));
          if (!(this.z80.l & (0x01 << 7))) this.z80.f |= 0x04 | 0x40;
          if (7 == 7 && this.z80.l & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x7e: {
        {
          var bytetemp = this.mem.readbyte(this.z80.l | (this.z80.h << 8));
          this.core.tstates += 4;
          {
            this.z80.f = (this.z80.f & 0x01) | 0x10 | (bytetemp & (0x08 | 0x20));
            if (!(bytetemp & (0x01 << 7))) this.z80.f |= 0x04 | 0x40;
            if (7 == 7 && bytetemp & 0x80) this.z80.f |= 0x80;
          }
        }
        break;
      }
      case 0x7f: {
        {
          this.z80.f = (this.z80.f & 0x01) | 0x10 | (this.z80.a & (0x08 | 0x20));
          if (!(this.z80.a & (0x01 << 7))) this.z80.f |= 0x04 | 0x40;
          if (7 == 7 && this.z80.a & 0x80) this.z80.f |= 0x80;
        }
        break;
      }
      case 0x80: {
        this.z80.b &= 0xfe;
        break;
      }
      case 0x81: {
        this.z80.c &= 0xfe;
        break;
      }
      case 0x82: {
        this.z80.d &= 0xfe;
        break;
      }
      case 0x83: {
        this.z80.e &= 0xfe;
        break;
      }
      case 0x84: {
        this.z80.h &= 0xfe;
        break;
      }
      case 0x85: {
        this.z80.l &= 0xfe;
        break;
      }
      case 0x86: {
        this.core.tstates += 7;
        this.mem.writebyte(
          this.z80.l | (this.z80.h << 8),
          this.mem.readbyte(this.z80.l | (this.z80.h << 8)) & 0xfe
        );
        break;
      }
      case 0x87: {
        this.z80.a &= 0xfe;
        break;
      }
      case 0x88: {
        this.z80.b &= 0xfd;
        break;
      }
      case 0x89: {
        this.z80.c &= 0xfd;
        break;
      }
      case 0x8a: {
        this.z80.d &= 0xfd;
        break;
      }
      case 0x8b: {
        this.z80.e &= 0xfd;
        break;
      }
      case 0x8c: {
        this.z80.h &= 0xfd;
        break;
      }
      case 0x8d: {
        this.z80.l &= 0xfd;
        break;
      }
      case 0x8e: {
        this.core.tstates += 7;
        this.mem.writebyte(
          this.z80.l | (this.z80.h << 8),
          this.mem.readbyte(this.z80.l | (this.z80.h << 8)) & 0xfd
        );
        break;
      }
      case 0x8f: {
        this.z80.a &= 0xfd;
        break;
      }
      case 0x90: {
        this.z80.b &= 0xfb;
        break;
      }
      case 0x91: {
        this.z80.c &= 0xfb;
        break;
      }
      case 0x92: {
        this.z80.d &= 0xfb;
        break;
      }
      case 0x93: {
        this.z80.e &= 0xfb;
        break;
      }
      case 0x94: {
        this.z80.h &= 0xfb;
        break;
      }
      case 0x95: {
        this.z80.l &= 0xfb;
        break;
      }
      case 0x96: {
        this.core.tstates += 7;
        this.mem.writebyte(
          this.z80.l | (this.z80.h << 8),
          this.mem.readbyte(this.z80.l | (this.z80.h << 8)) & 0xfb
        );
        break;
      }
      case 0x97: {
        this.z80.a &= 0xfb;
        break;
      }
      case 0x98: {
        this.z80.b &= 0xf7;
        break;
      }
      case 0x99: {
        this.z80.c &= 0xf7;
        break;
      }
      case 0x9a: {
        this.z80.d &= 0xf7;
        break;
      }
      case 0x9b: {
        this.z80.e &= 0xf7;
        break;
      }
      case 0x9c: {
        this.z80.h &= 0xf7;
        break;
      }
      case 0x9d: {
        this.z80.l &= 0xf7;
        break;
      }
      case 0x9e: {
        this.core.tstates += 7;
        this.mem.writebyte(
          this.z80.l | (this.z80.h << 8),
          this.mem.readbyte(this.z80.l | (this.z80.h << 8)) & 0xf7
        );
        break;
      }
      case 0x9f: {
        this.z80.a &= 0xf7;
        break;
      }
      case 0xa0: {
        this.z80.b &= 0xef;
        break;
      }
      case 0xa1: {
        this.z80.c &= 0xef;
        break;
      }
      case 0xa2: {
        this.z80.d &= 0xef;
        break;
      }
      case 0xa3: {
        this.z80.e &= 0xef;
        break;
      }
      case 0xa4: {
        this.z80.h &= 0xef;
        break;
      }
      case 0xa5: {
        this.z80.l &= 0xef;
        break;
      }
      case 0xa6: {
        this.core.tstates += 7;
        this.mem.writebyte(
          this.z80.l | (this.z80.h << 8),
          this.mem.readbyte(this.z80.l | (this.z80.h << 8)) & 0xef
        );
        break;
      }
      case 0xa7: {
        this.z80.a &= 0xef;
        break;
      }
      case 0xa8: {
        this.z80.b &= 0xdf;
        break;
      }
      case 0xa9: {
        this.z80.c &= 0xdf;
        break;
      }
      case 0xaa: {
        this.z80.d &= 0xdf;
        break;
      }
      case 0xab: {
        this.z80.e &= 0xdf;
        break;
      }
      case 0xac: {
        this.z80.h &= 0xdf;
        break;
      }
      case 0xad: {
        this.z80.l &= 0xdf;
        break;
      }
      case 0xae: {
        this.core.tstates += 7;
        this.mem.writebyte(
          this.z80.l | (this.z80.h << 8),
          this.mem.readbyte(this.z80.l | (this.z80.h << 8)) & 0xdf
        );
        break;
      }
      case 0xaf: {
        this.z80.a &= 0xdf;
        break;
      }
      case 0xb0: {
        this.z80.b &= 0xbf;
        break;
      }
      case 0xb1: {
        this.z80.c &= 0xbf;
        break;
      }
      case 0xb2: {
        this.z80.d &= 0xbf;
        break;
      }
      case 0xb3: {
        this.z80.e &= 0xbf;
        break;
      }
      case 0xb4: {
        this.z80.h &= 0xbf;
        break;
      }
      case 0xb5: {
        this.z80.l &= 0xbf;
        break;
      }
      case 0xb6: {
        this.core.tstates += 7;
        this.mem.writebyte(
          this.z80.l | (this.z80.h << 8),
          this.mem.readbyte(this.z80.l | (this.z80.h << 8)) & 0xbf
        );
        break;
      }
      case 0xb7: {
        this.z80.a &= 0xbf;
        break;
      }
      case 0xb8: {
        this.z80.b &= 0x7f;
        break;
      }
      case 0xb9: {
        this.z80.c &= 0x7f;
        break;
      }
      case 0xba: {
        this.z80.d &= 0x7f;
        break;
      }
      case 0xbb: {
        this.z80.e &= 0x7f;
        break;
      }
      case 0xbc: {
        this.z80.h &= 0x7f;
        break;
      }
      case 0xbd: {
        this.z80.l &= 0x7f;
        break;
      }
      case 0xbe: {
        this.core.tstates += 7;
        this.mem.writebyte(
          this.z80.l | (this.z80.h << 8),
          this.mem.readbyte(this.z80.l | (this.z80.h << 8)) & 0x7f
        );
        break;
      }
      case 0xbf: {
        this.z80.a &= 0x7f;
        break;
      }
      case 0xc0: {
        this.z80.b |= 0x01;
        break;
      }
      case 0xc1: {
        this.z80.c |= 0x01;
        break;
      }
      case 0xc2: {
        this.z80.d |= 0x01;
        break;
      }
      case 0xc3: {
        this.z80.e |= 0x01;
        break;
      }
      case 0xc4: {
        this.z80.h |= 0x01;
        break;
      }
      case 0xc5: {
        this.z80.l |= 0x01;
        break;
      }
      case 0xc6: {
        this.core.tstates += 7;
        this.mem.writebyte(
          this.z80.l | (this.z80.h << 8),
          this.mem.readbyte(this.z80.l | (this.z80.h << 8)) | 0x01
        );
        break;
      }
      case 0xc7: {
        this.z80.a |= 0x01;
        break;
      }
      case 0xc8: {
        this.z80.b |= 0x02;
        break;
      }
      case 0xc9: {
        this.z80.c |= 0x02;
        break;
      }
      case 0xca: {
        this.z80.d |= 0x02;
        break;
      }
      case 0xcb: {
        this.z80.e |= 0x02;
        break;
      }
      case 0xcc: {
        this.z80.h |= 0x02;
        break;
      }
      case 0xcd: {
        this.z80.l |= 0x02;
        break;
      }
      case 0xce: {
        this.core.tstates += 7;
        this.mem.writebyte(
          this.z80.l | (this.z80.h << 8),
          this.mem.readbyte(this.z80.l | (this.z80.h << 8)) | 0x02
        );
        break;
      }
      case 0xcf: {
        this.z80.a |= 0x02;
        break;
      }
      case 0xd0: {
        this.z80.b |= 0x04;
        break;
      }
      case 0xd1: {
        this.z80.c |= 0x04;
        break;
      }
      case 0xd2: {
        this.z80.d |= 0x04;
        break;
      }
      case 0xd3: {
        this.z80.e |= 0x04;
        break;
      }
      case 0xd4: {
        this.z80.h |= 0x04;
        break;
      }
      case 0xd5: {
        this.z80.l |= 0x04;
        break;
      }
      case 0xd6: {
        this.core.tstates += 7;
        this.mem.writebyte(
          this.z80.l | (this.z80.h << 8),
          this.mem.readbyte(this.z80.l | (this.z80.h << 8)) | 0x04
        );
        break;
      }
      case 0xd7: {
        this.z80.a |= 0x04;
        break;
      }
      case 0xd8: {
        this.z80.b |= 0x08;
        break;
      }
      case 0xd9: {
        this.z80.c |= 0x08;
        break;
      }
      case 0xda: {
        this.z80.d |= 0x08;
        break;
      }
      case 0xdb: {
        this.z80.e |= 0x08;
        break;
      }
      case 0xdc: {
        this.z80.h |= 0x08;
        break;
      }
      case 0xdd: {
        this.z80.l |= 0x08;
        break;
      }
      case 0xde: {
        this.core.tstates += 7;
        this.mem.writebyte(
          this.z80.l | (this.z80.h << 8),
          this.mem.readbyte(this.z80.l | (this.z80.h << 8)) | 0x08
        );
        break;
      }
      case 0xdf: {
        this.z80.a |= 0x08;
        break;
      }
      case 0xe0: {
        this.z80.b |= 0x10;
        break;
      }
      case 0xe1: {
        this.z80.c |= 0x10;
        break;
      }
      case 0xe2: {
        this.z80.d |= 0x10;
        break;
      }
      case 0xe3: {
        this.z80.e |= 0x10;
        break;
      }
      case 0xe4: {
        this.z80.h |= 0x10;
        break;
      }
      case 0xe5: {
        this.z80.l |= 0x10;
        break;
      }
      case 0xe6: {
        this.core.tstates += 7;
        this.mem.writebyte(
          this.z80.l | (this.z80.h << 8),
          this.mem.readbyte(this.z80.l | (this.z80.h << 8)) | 0x10
        );
        break;
      }
      case 0xe7: {
        this.z80.a |= 0x10;
        break;
      }
      case 0xe8: {
        this.z80.b |= 0x20;
        break;
      }
      case 0xe9: {
        this.z80.c |= 0x20;
        break;
      }
      case 0xea: {
        this.z80.d |= 0x20;
        break;
      }
      case 0xeb: {
        this.z80.e |= 0x20;
        break;
      }
      case 0xec: {
        this.z80.h |= 0x20;
        break;
      }
      case 0xed: {
        this.z80.l |= 0x20;
        break;
      }
      case 0xee: {
        this.core.tstates += 7;
        this.mem.writebyte(
          this.z80.l | (this.z80.h << 8),
          this.mem.readbyte(this.z80.l | (this.z80.h << 8)) | 0x20
        );
        break;
      }
      case 0xef: {
        this.z80.a |= 0x20;
        break;
      }
      case 0xf0: {
        this.z80.b |= 0x40;
        break;
      }
      case 0xf1: {
        this.z80.c |= 0x40;
        break;
      }
      case 0xf2: {
        this.z80.d |= 0x40;
        break;
      }
      case 0xf3: {
        this.z80.e |= 0x40;
        break;
      }
      case 0xf4: {
        this.z80.h |= 0x40;
        break;
      }
      case 0xf5: {
        this.z80.l |= 0x40;
        break;
      }
      case 0xf6: {
        this.core.tstates += 7;
        this.mem.writebyte(
          this.z80.l | (this.z80.h << 8),
          this.mem.readbyte(this.z80.l | (this.z80.h << 8)) | 0x40
        );
        break;
      }
      case 0xf7: {
        this.z80.a |= 0x40;
        break;
      }
      case 0xf8: {
        this.z80.b |= 0x80;
        break;
      }
      case 0xf9: {
        this.z80.c |= 0x80;
        break;
      }
      case 0xfa: {
        this.z80.d |= 0x80;
        break;
      }
      case 0xfb: {
        this.z80.e |= 0x80;
        break;
      }
      case 0xfc: {
        this.z80.h |= 0x80;
        break;
      }
      case 0xfd: {
        this.z80.l |= 0x80;
        break;
      }
      case 0xfe: {
        this.core.tstates += 7;
        this.mem.writebyte(
          this.z80.l | (this.z80.h << 8),
          this.mem.readbyte(this.z80.l | (this.z80.h << 8)) | 0x80
        );
        break;
      }
      case 0xff: {
        this.z80.a |= 0x80;
        break;
      }
      case 256: {
        break;
      }
    }
  };
  z80_ddxx = (key) => {
    switch (key) {
      case 0x09: {
        {
          var add16temp = (this.z80.ixl | (this.z80.ixh << 8)) + (this.z80.c | (this.z80.b << 8));
          var lookup =
            (((this.z80.ixl | (this.z80.ixh << 8)) & 0x0800) >> 11) |
            (((this.z80.c | (this.z80.b << 8)) & 0x0800) >> 10) |
            ((add16temp & 0x0800) >> 9);
          this.core.tstates += 7;
          this.z80.ixh = (add16temp >> 8) & 0xff;
          this.z80.ixl = add16temp & 0xff;
          this.z80.f =
            (this.z80.f & (0x04 | 0x40 | 0x80)) |
            (add16temp & 0x10000 ? 0x01 : 0) |
            ((add16temp >> 8) & (0x08 | 0x20)) |
            this.halfcarry_add_table[lookup];
        }
        break;
      }
      case 0x19: {
        {
          var add16temp = (this.z80.ixl | (this.z80.ixh << 8)) + (this.z80.e | (this.z80.d << 8));
          var lookup =
            (((this.z80.ixl | (this.z80.ixh << 8)) & 0x0800) >> 11) |
            (((this.z80.e | (this.z80.d << 8)) & 0x0800) >> 10) |
            ((add16temp & 0x0800) >> 9);
          this.core.tstates += 7;
          this.z80.ixh = (add16temp >> 8) & 0xff;
          this.z80.ixl = add16temp & 0xff;
          this.z80.f =
            (this.z80.f & (0x04 | 0x40 | 0x80)) |
            (add16temp & 0x10000 ? 0x01 : 0) |
            ((add16temp >> 8) & (0x08 | 0x20)) |
            this.halfcarry_add_table[lookup];
        }
        break;
      }
      case 0x21: {
        this.core.tstates += 6;
        this.z80.ixl = this.mem.readbyte(this.z80.pc++);
        this.z80.pc &= 0xffff;
        this.z80.ixh = this.mem.readbyte(this.z80.pc++);
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x22: {
        {
          var ldtemp;
          this.core.tstates += 12;
          ldtemp = this.mem.readbyte(this.z80.pc++);
          this.z80.pc &= 0xffff;
          ldtemp |= this.mem.readbyte(this.z80.pc++) << 8;
          this.z80.pc &= 0xffff;
          this.mem.writebyte(ldtemp++, this.z80.ixl);
          ldtemp &= 0xffff;
          this.mem.writebyte(ldtemp, this.z80.ixh);
        }
        break;
      }
      case 0x23: {
        this.core.tstates += 2;
        var wordtemp = ((this.z80.ixl | (this.z80.ixh << 8)) + 1) & 0xffff;
        this.z80.ixh = wordtemp >> 8;
        this.z80.ixl = wordtemp & 0xff;
        break;
      }
      case 0x24: {
        {
          this.z80.ixh = (this.z80.ixh + 1) & 0xff;
          this.z80.f =
            (this.z80.f & 0x01) |
            (this.z80.ixh == 0x80 ? 0x04 : 0) |
            (this.z80.ixh & 0x0f ? 0 : 0x10) |
            this.sz53_table[this.z80.ixh];
        }
        break;
      }
      case 0x25: {
        {
          this.z80.f = (this.z80.f & 0x01) | (this.z80.ixh & 0x0f ? 0 : 0x10) | 0x02;
          this.z80.ixh = (this.z80.ixh - 1) & 0xff;
          this.z80.f |= (this.z80.ixh == 0x7f ? 0x04 : 0) | this.sz53_table[this.z80.ixh];
        }
        break;
      }
      case 0x26: {
        this.core.tstates += 3;
        this.z80.ixh = this.mem.readbyte(this.z80.pc++);
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x29: {
        {
          var add16temp = (this.z80.ixl | (this.z80.ixh << 8)) + (this.z80.ixl | (this.z80.ixh << 8));
          var lookup =
            (((this.z80.ixl | (this.z80.ixh << 8)) & 0x0800) >> 11) |
            (((this.z80.ixl | (this.z80.ixh << 8)) & 0x0800) >> 10) |
            ((add16temp & 0x0800) >> 9);
          this.core.tstates += 7;
          this.z80.ixh = (add16temp >> 8) & 0xff;
          this.z80.ixl = add16temp & 0xff;
          this.z80.f =
            (this.z80.f & (0x04 | 0x40 | 0x80)) |
            (add16temp & 0x10000 ? 0x01 : 0) |
            ((add16temp >> 8) & (0x08 | 0x20)) |
            this.halfcarry_add_table[lookup];
        }
        break;
      }
      case 0x2a: {
        {
          var ldtemp;
          this.core.tstates += 12;
          ldtemp = this.mem.readbyte(this.z80.pc++);
          this.z80.pc &= 0xffff;
          ldtemp |= this.mem.readbyte(this.z80.pc++) << 8;
          this.z80.pc &= 0xffff;
          this.z80.ixl = this.mem.readbyte(ldtemp++);
          ldtemp &= 0xffff;
          this.z80.ixh = this.mem.readbyte(ldtemp);
        }
        break;
      }
      case 0x2b: {
        this.core.tstates += 2;
        var wordtemp = ((this.z80.ixl | (this.z80.ixh << 8)) - 1) & 0xffff;
        this.z80.ixh = wordtemp >> 8;
        this.z80.ixl = wordtemp & 0xff;
        break;
      }
      case 0x2c: {
        {
          this.z80.ixl = (this.z80.ixl + 1) & 0xff;
          this.z80.f =
            (this.z80.f & 0x01) |
            (this.z80.ixl == 0x80 ? 0x04 : 0) |
            (this.z80.ixl & 0x0f ? 0 : 0x10) |
            this.sz53_table[this.z80.ixl];
        }
        break;
      }
      case 0x2d: {
        {
          this.z80.f = (this.z80.f & 0x01) | (this.z80.ixl & 0x0f ? 0 : 0x10) | 0x02;
          this.z80.ixl = (this.z80.ixl - 1) & 0xff;
          this.z80.f |= (this.z80.ixl == 0x7f ? 0x04 : 0) | this.sz53_table[this.z80.ixl];
        }
        break;
      }
      case 0x2e: {
        this.core.tstates += 3;
        this.z80.ixl = this.mem.readbyte(this.z80.pc++);
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x34: {
        this.core.tstates += 15;
        {
          var wordtemp =
            ((this.z80.ixl | (this.z80.ixh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff;
          this.z80.pc &= 0xffff;
          var bytetemp = this.mem.readbyte(wordtemp);
          {
            bytetemp = (bytetemp + 1) & 0xff;
            this.z80.f =
              (this.z80.f & 0x01) |
              (bytetemp == 0x80 ? 0x04 : 0) |
              (bytetemp & 0x0f ? 0 : 0x10) |
              this.sz53_table[bytetemp];
          }
          this.mem.writebyte(wordtemp, bytetemp);
        }
        break;
      }
      case 0x35: {
        this.core.tstates += 15;
        {
          var wordtemp =
            ((this.z80.ixl | (this.z80.ixh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff;
          this.z80.pc &= 0xffff;
          var bytetemp = this.mem.readbyte(wordtemp);
          {
            this.z80.f = (this.z80.f & 0x01) | (bytetemp & 0x0f ? 0 : 0x10) | 0x02;
            bytetemp = (bytetemp - 1) & 0xff;
            this.z80.f |= (bytetemp == 0x7f ? 0x04 : 0) | this.sz53_table[bytetemp];
          }
          this.mem.writebyte(wordtemp, bytetemp);
        }
        break;
      }
      case 0x36: {
        this.core.tstates += 11;
        {
          var wordtemp =
            ((this.z80.ixl | (this.z80.ixh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff;
          this.z80.pc &= 0xffff;
          this.mem.writebyte(wordtemp, this.mem.readbyte(this.z80.pc++));
          this.z80.pc &= 0xffff;
        }
        break;
      }
      case 0x39: {
        {
          var add16temp = (this.z80.ixl | (this.z80.ixh << 8)) + this.z80.sp;
          var lookup =
            (((this.z80.ixl | (this.z80.ixh << 8)) & 0x0800) >> 11) |
            ((this.z80.sp & 0x0800) >> 10) |
            ((add16temp & 0x0800) >> 9);
          this.core.tstates += 7;
          this.z80.ixh = (add16temp >> 8) & 0xff;
          this.z80.ixl = add16temp & 0xff;
          this.z80.f =
            (this.z80.f & (0x04 | 0x40 | 0x80)) |
            (add16temp & 0x10000 ? 0x01 : 0) |
            ((add16temp >> 8) & (0x08 | 0x20)) |
            this.halfcarry_add_table[lookup];
        }
        break;
      }
      case 0x44: {
        this.z80.b = this.z80.ixh;
        break;
      }
      case 0x45: {
        this.z80.b = this.z80.ixl;
        break;
      }
      case 0x46: {
        this.core.tstates += 11;
        this.z80.b = this.mem.readbyte(
          ((this.z80.ixl | (this.z80.ixh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff
        );
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x4c: {
        this.z80.c = this.z80.ixh;
        break;
      }
      case 0x4d: {
        this.z80.c = this.z80.ixl;
        break;
      }
      case 0x4e: {
        this.core.tstates += 11;
        this.z80.c = this.mem.readbyte(
          ((this.z80.ixl | (this.z80.ixh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff
        );
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x54: {
        this.z80.d = this.z80.ixh;
        break;
      }
      case 0x55: {
        this.z80.d = this.z80.ixl;
        break;
      }
      case 0x56: {
        this.core.tstates += 11;
        this.z80.d = this.mem.readbyte(
          ((this.z80.ixl | (this.z80.ixh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff
        );
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x5c: {
        this.z80.e = this.z80.ixh;
        break;
      }
      case 0x5d: {
        this.z80.e = this.z80.ixl;
        break;
      }
      case 0x5e: {
        this.core.tstates += 11;
        this.z80.e = this.mem.readbyte(
          ((this.z80.ixl | (this.z80.ixh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff
        );
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x60: {
        this.z80.ixh = this.z80.b;
        break;
      }
      case 0x61: {
        this.z80.ixh = this.z80.c;
        break;
      }
      case 0x62: {
        this.z80.ixh = this.z80.d;
        break;
      }
      case 0x63: {
        this.z80.ixh = this.z80.e;
        break;
      }
      case 0x64: {
        break;
      }
      case 0x65: {
        this.z80.ixh = this.z80.ixl;
        break;
      }
      case 0x66: {
        this.core.tstates += 11;
        this.z80.h = this.mem.readbyte(
          ((this.z80.ixl | (this.z80.ixh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff
        );
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x67: {
        this.z80.ixh = this.z80.a;
        break;
      }
      case 0x68: {
        this.z80.ixl = this.z80.b;
        break;
      }
      case 0x69: {
        this.z80.ixl = this.z80.c;
        break;
      }
      case 0x6a: {
        this.z80.ixl = this.z80.d;
        break;
      }
      case 0x6b: {
        this.z80.ixl = this.z80.e;
        break;
      }
      case 0x6c: {
        this.z80.ixl = this.z80.ixh;
        break;
      }
      case 0x6d: {
        break;
      }
      case 0x6e: {
        this.core.tstates += 11;
        this.z80.l = this.mem.readbyte(
          ((this.z80.ixl | (this.z80.ixh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff
        );
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x6f: {
        this.z80.ixl = this.z80.a;
        break;
      }
      case 0x70: {
        this.core.tstates += 11;
        this.mem.writebyte(
          ((this.z80.ixl | (this.z80.ixh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff,
          this.z80.b
        );
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x71: {
        this.core.tstates += 11;
        this.mem.writebyte(
          ((this.z80.ixl | (this.z80.ixh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff,
          this.z80.c
        );
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x72: {
        this.core.tstates += 11;
        this.mem.writebyte(
          ((this.z80.ixl | (this.z80.ixh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff,
          this.z80.d
        );
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x73: {
        this.core.tstates += 11;
        this.mem.writebyte(
          ((this.z80.ixl | (this.z80.ixh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff,
          this.z80.e
        );
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x74: {
        this.core.tstates += 11;
        this.mem.writebyte(
          ((this.z80.ixl | (this.z80.ixh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff,
          this.z80.h
        );
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x75: {
        this.core.tstates += 11;
        this.mem.writebyte(
          ((this.z80.ixl | (this.z80.ixh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff,
          this.z80.l
        );
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x77: {
        this.core.tstates += 11;
        this.mem.writebyte(
          ((this.z80.ixl | (this.z80.ixh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff,
          this.z80.a
        );
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x7c: {
        this.z80.a = this.z80.ixh;
        break;
      }
      case 0x7d: {
        this.z80.a = this.z80.ixl;
        break;
      }
      case 0x7e: {
        this.core.tstates += 11;
        this.z80.a = this.mem.readbyte(
          ((this.z80.ixl | (this.z80.ixh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff
        );
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x84: {
        {
          var addtemp = this.z80.a + this.z80.ixh;
          var lookup =
            ((this.z80.a & 0x88) >> 3) | ((this.z80.ixh & 0x88) >> 2) | ((addtemp & 0x88) >> 1);
          this.z80.a = addtemp & 0xff;
          this.z80.f =
            (addtemp & 0x100 ? 0x01 : 0) |
            this.halfcarry_add_table[lookup & 0x07] |
            this.overflow_add_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x85: {
        {
          var addtemp = this.z80.a + this.z80.ixl;
          var lookup =
            ((this.z80.a & 0x88) >> 3) | ((this.z80.ixl & 0x88) >> 2) | ((addtemp & 0x88) >> 1);
          this.z80.a = addtemp & 0xff;
          this.z80.f =
            (addtemp & 0x100 ? 0x01 : 0) |
            this.halfcarry_add_table[lookup & 0x07] |
            this.overflow_add_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x86: {
        this.core.tstates += 11;
        {
          var bytetemp = this.mem.readbyte(
            ((this.z80.ixl | (this.z80.ixh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
              0xffff
          );
          this.z80.pc &= 0xffff;
          {
            var addtemp = this.z80.a + bytetemp;
            var lookup = ((this.z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((addtemp & 0x88) >> 1);
            this.z80.a = addtemp & 0xff;
            this.z80.f =
              (addtemp & 0x100 ? 0x01 : 0) |
              this.halfcarry_add_table[lookup & 0x07] |
              this.overflow_add_table[lookup >> 4] |
              this.sz53_table[this.z80.a];
          }
        }
        break;
      }
      case 0x8c: {
        {
          var adctemp = this.z80.a + this.z80.ixh + (this.z80.f & 0x01);
          var lookup =
            ((this.z80.a & 0x88) >> 3) | ((this.z80.ixh & 0x88) >> 2) | ((adctemp & 0x88) >> 1);
          this.z80.a = adctemp & 0xff;
          this.z80.f =
            (adctemp & 0x100 ? 0x01 : 0) |
            this.halfcarry_add_table[lookup & 0x07] |
            this.overflow_add_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x8d: {
        {
          var adctemp = this.z80.a + this.z80.ixl + (this.z80.f & 0x01);
          var lookup =
            ((this.z80.a & 0x88) >> 3) | ((this.z80.ixl & 0x88) >> 2) | ((adctemp & 0x88) >> 1);
          this.z80.a = adctemp & 0xff;
          this.z80.f =
            (adctemp & 0x100 ? 0x01 : 0) |
            this.halfcarry_add_table[lookup & 0x07] |
            this.overflow_add_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x8e: {
        this.core.tstates += 11;
        {
          var bytetemp = this.mem.readbyte(
            ((this.z80.ixl | (this.z80.ixh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
              0xffff
          );
          this.z80.pc &= 0xffff;
          {
            var adctemp = this.z80.a + bytetemp + (this.z80.f & 0x01);
            var lookup = ((this.z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((adctemp & 0x88) >> 1);
            this.z80.a = adctemp & 0xff;
            this.z80.f =
              (adctemp & 0x100 ? 0x01 : 0) |
              this.halfcarry_add_table[lookup & 0x07] |
              this.overflow_add_table[lookup >> 4] |
              this.sz53_table[this.z80.a];
          }
        }
        break;
      }
      case 0x94: {
        {
          var subtemp = this.z80.a - this.z80.ixh;
          var lookup =
            ((this.z80.a & 0x88) >> 3) | ((this.z80.ixh & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
          this.z80.a = subtemp & 0xff;
          this.z80.f =
            (subtemp & 0x100 ? 0x01 : 0) |
            0x02 |
            this.halfcarry_sub_table[lookup & 0x07] |
            this.overflow_sub_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x95: {
        {
          var subtemp = this.z80.a - this.z80.ixl;
          var lookup =
            ((this.z80.a & 0x88) >> 3) | ((this.z80.ixl & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
          this.z80.a = subtemp & 0xff;
          this.z80.f =
            (subtemp & 0x100 ? 0x01 : 0) |
            0x02 |
            this.halfcarry_sub_table[lookup & 0x07] |
            this.overflow_sub_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x96: {
        this.core.tstates += 11;
        {
          var bytetemp = this.mem.readbyte(
            ((this.z80.ixl | (this.z80.ixh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
              0xffff
          );
          this.z80.pc &= 0xffff;
          {
            var subtemp = this.z80.a - bytetemp;
            var lookup = ((this.z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
            this.z80.a = subtemp & 0xff;
            this.z80.f =
              (subtemp & 0x100 ? 0x01 : 0) |
              0x02 |
              this.halfcarry_sub_table[lookup & 0x07] |
              this.overflow_sub_table[lookup >> 4] |
              this.sz53_table[this.z80.a];
          }
        }
        break;
      }
      case 0x9c: {
        {
          var sbctemp = this.z80.a - this.z80.ixh - (this.z80.f & 0x01);
          var lookup =
            ((this.z80.a & 0x88) >> 3) | ((this.z80.ixh & 0x88) >> 2) | ((sbctemp & 0x88) >> 1);
          this.z80.a = sbctemp & 0xff;
          this.z80.f =
            (sbctemp & 0x100 ? 0x01 : 0) |
            0x02 |
            this.halfcarry_sub_table[lookup & 0x07] |
            this.overflow_sub_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x9d: {
        {
          var sbctemp = this.z80.a - this.z80.ixl - (this.z80.f & 0x01);
          var lookup =
            ((this.z80.a & 0x88) >> 3) | ((this.z80.ixl & 0x88) >> 2) | ((sbctemp & 0x88) >> 1);
          this.z80.a = sbctemp & 0xff;
          this.z80.f =
            (sbctemp & 0x100 ? 0x01 : 0) |
            0x02 |
            this.halfcarry_sub_table[lookup & 0x07] |
            this.overflow_sub_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x9e: {
        this.core.tstates += 11;
        {
          var bytetemp = this.mem.readbyte(
            ((this.z80.ixl | (this.z80.ixh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
              0xffff
          );
          this.z80.pc &= 0xffff;
          {
            var sbctemp = this.z80.a - bytetemp - (this.z80.f & 0x01);
            var lookup = ((this.z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((sbctemp & 0x88) >> 1);
            this.z80.a = sbctemp & 0xff;
            this.z80.f =
              (sbctemp & 0x100 ? 0x01 : 0) |
              0x02 |
              this.halfcarry_sub_table[lookup & 0x07] |
              this.overflow_sub_table[lookup >> 4] |
              this.sz53_table[this.z80.a];
          }
        }
        break;
      }
      case 0xa4: {
        {
          this.z80.a &= this.z80.ixh;
          this.z80.f = 0x10 | this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0xa5: {
        {
          this.z80.a &= this.z80.ixl;
          this.z80.f = 0x10 | this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0xa6: {
        this.core.tstates += 11;
        {
          var bytetemp = this.mem.readbyte(
            ((this.z80.ixl | (this.z80.ixh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
              0xffff
          );
          this.z80.pc &= 0xffff;
          {
            this.z80.a &= bytetemp;
            this.z80.f = 0x10 | this.sz53p_table[this.z80.a];
          }
        }
        break;
      }
      case 0xac: {
        {
          this.z80.a ^= this.z80.ixh;
          this.z80.f = this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0xad: {
        {
          this.z80.a ^= this.z80.ixl;
          this.z80.f = this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0xae: {
        this.core.tstates += 11;
        {
          var bytetemp = this.mem.readbyte(
            ((this.z80.ixl | (this.z80.ixh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
              0xffff
          );
          this.z80.pc &= 0xffff;
          {
            this.z80.a ^= bytetemp;
            this.z80.f = this.sz53p_table[this.z80.a];
          }
        }
        break;
      }
      case 0xb4: {
        {
          this.z80.a |= this.z80.ixh;
          this.z80.f = this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0xb5: {
        {
          this.z80.a |= this.z80.ixl;
          this.z80.f = this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0xb6: {
        this.core.tstates += 11;
        {
          var bytetemp = this.mem.readbyte(
            ((this.z80.ixl | (this.z80.ixh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
              0xffff
          );
          this.z80.pc &= 0xffff;
          {
            this.z80.a |= bytetemp;
            this.z80.f = this.sz53p_table[this.z80.a];
          }
        }
        break;
      }
      case 0xbc: {
        {
          var cptemp = this.z80.a - this.z80.ixh;
          var lookup =
            ((this.z80.a & 0x88) >> 3) | ((this.z80.ixh & 0x88) >> 2) | ((cptemp & 0x88) >> 1);
          this.z80.f =
            (cptemp & 0x100 ? 0x01 : cptemp ? 0 : 0x40) |
            0x02 |
            this.halfcarry_sub_table[lookup & 0x07] |
            this.overflow_sub_table[lookup >> 4] |
            (this.z80.ixh & (0x08 | 0x20)) |
            (cptemp & 0x80);
        }
        break;
      }
      case 0xbd: {
        {
          var cptemp = this.z80.a - this.z80.ixl;
          var lookup =
            ((this.z80.a & 0x88) >> 3) | ((this.z80.ixl & 0x88) >> 2) | ((cptemp & 0x88) >> 1);
          this.z80.f =
            (cptemp & 0x100 ? 0x01 : cptemp ? 0 : 0x40) |
            0x02 |
            this.halfcarry_sub_table[lookup & 0x07] |
            this.overflow_sub_table[lookup >> 4] |
            (this.z80.ixl & (0x08 | 0x20)) |
            (cptemp & 0x80);
        }
        break;
      }
      case 0xbe: {
        this.core.tstates += 11;
        {
          var bytetemp = this.mem.readbyte(
            ((this.z80.ixl | (this.z80.ixh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
              0xffff
          );
          this.z80.pc &= 0xffff;
          {
            var cptemp = this.z80.a - bytetemp;
            var lookup = ((this.z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((cptemp & 0x88) >> 1);
            this.z80.f =
              (cptemp & 0x100 ? 0x01 : cptemp ? 0 : 0x40) |
              0x02 |
              this.halfcarry_sub_table[lookup & 0x07] |
              this.overflow_sub_table[lookup >> 4] |
              (bytetemp & (0x08 | 0x20)) |
              (cptemp & 0x80);
          }
        }
        break;
      }
      case 0xcb: {
        {
          var opcode3;
          this.core.tstates += 7;
          let tempaddr =
            (this.z80.ixl | (this.z80.ixh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++));
          this.z80.pc &= 0xffff;
          opcode3 = this.mem.readbyte(this.z80.pc++);
          this.z80.pc &= 0xffff;
          this.z80_ddfdcbxx(opcode3, tempaddr);
        }
        break;
      }
      case 0xe1: {
        {
          this.core.tstates += 6;
          this.z80.ixl = this.mem.readbyte(this.z80.sp++);
          this.z80.sp &= 0xffff;
          this.z80.ixh = this.mem.readbyte(this.z80.sp++);
          this.z80.sp &= 0xffff;
        }
        break;
      }
      case 0xe3: {
        {
          var bytetempl = this.mem.readbyte(this.z80.sp),
            bytetemph = this.mem.readbyte(this.z80.sp + 1);
          this.core.tstates += 15;
          this.mem.writebyte(this.z80.sp + 1, this.z80.ixh);
          this.mem.writebyte(this.z80.sp, this.z80.ixl);
          this.z80.ixl = bytetempl;
          this.z80.ixh = bytetemph;
        }
        break;
      }
      case 0xe5: {
        this.core.tstates++;
        {
          this.core.tstates += 6;
          this.z80.sp--;
          this.z80.sp &= 0xffff;
          this.mem.writebyte(this.z80.sp, this.z80.ixh);
          this.z80.sp--;
          this.z80.sp &= 0xffff;
          this.mem.writebyte(this.z80.sp, this.z80.ixl);
        }
        break;
      }
      case 0xe9: {
        this.z80.pc = this.z80.ixl | (this.z80.ixh << 8);
        break;
      }
      case 0xf9: {
        this.core.tstates += 2;
        this.z80.sp = this.z80.ixl | (this.z80.ixh << 8);
        break;
      }
      case 256: {
        this.z80.pc--;
        this.z80.pc &= 0xffff;
        this.z80.r--;
        this.z80.r &= 0x7f;
        break;
      }
    }
  };
  z80_fdxx = (key) => {
    switch (key) {
      case 0x09: {
        {
          var add16temp = (this.z80.iyl | (this.z80.iyh << 8)) + (this.z80.c | (this.z80.b << 8));
          var lookup =
            (((this.z80.iyl | (this.z80.iyh << 8)) & 0x0800) >> 11) |
            (((this.z80.c | (this.z80.b << 8)) & 0x0800) >> 10) |
            ((add16temp & 0x0800) >> 9);
          this.core.tstates += 7;
          this.z80.iyh = (add16temp >> 8) & 0xff;
          this.z80.iyl = add16temp & 0xff;
          this.z80.f =
            (this.z80.f & (0x04 | 0x40 | 0x80)) |
            (add16temp & 0x10000 ? 0x01 : 0) |
            ((add16temp >> 8) & (0x08 | 0x20)) |
            this.halfcarry_add_table[lookup];
        }
        break;
      }
      case 0x19: {
        {
          var add16temp = (this.z80.iyl | (this.z80.iyh << 8)) + (this.z80.e | (this.z80.d << 8));
          var lookup =
            (((this.z80.iyl | (this.z80.iyh << 8)) & 0x0800) >> 11) |
            (((this.z80.e | (this.z80.d << 8)) & 0x0800) >> 10) |
            ((add16temp & 0x0800) >> 9);
          this.core.tstates += 7;
          this.z80.iyh = (add16temp >> 8) & 0xff;
          this.z80.iyl = add16temp & 0xff;
          this.z80.f =
            (this.z80.f & (0x04 | 0x40 | 0x80)) |
            (add16temp & 0x10000 ? 0x01 : 0) |
            ((add16temp >> 8) & (0x08 | 0x20)) |
            this.halfcarry_add_table[lookup];
        }
        break;
      }
      case 0x21: {
        this.core.tstates += 6;
        this.z80.iyl = this.mem.readbyte(this.z80.pc++);
        this.z80.pc &= 0xffff;
        this.z80.iyh = this.mem.readbyte(this.z80.pc++);
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x22: {
        {
          var ldtemp;
          this.core.tstates += 12;
          ldtemp = this.mem.readbyte(this.z80.pc++);
          this.z80.pc &= 0xffff;
          ldtemp |= this.mem.readbyte(this.z80.pc++) << 8;
          this.z80.pc &= 0xffff;
          this.mem.writebyte(ldtemp++, this.z80.iyl);
          ldtemp &= 0xffff;
          this.mem.writebyte(ldtemp, this.z80.iyh);
        }
        break;
      }
      case 0x23: {
        this.core.tstates += 2;
        var wordtemp = ((this.z80.iyl | (this.z80.iyh << 8)) + 1) & 0xffff;
        this.z80.iyh = wordtemp >> 8;
        this.z80.iyl = wordtemp & 0xff;
        break;
      }
      case 0x24: {
        {
          this.z80.iyh = (this.z80.iyh + 1) & 0xff;
          this.z80.f =
            (this.z80.f & 0x01) |
            (this.z80.iyh == 0x80 ? 0x04 : 0) |
            (this.z80.iyh & 0x0f ? 0 : 0x10) |
            this.sz53_table[this.z80.iyh];
        }
        break;
      }
      case 0x25: {
        {
          this.z80.f = (this.z80.f & 0x01) | (this.z80.iyh & 0x0f ? 0 : 0x10) | 0x02;
          this.z80.iyh = (this.z80.iyh - 1) & 0xff;
          this.z80.f |= (this.z80.iyh == 0x7f ? 0x04 : 0) | this.sz53_table[this.z80.iyh];
        }
        break;
      }
      case 0x26: {
        this.core.tstates += 3;
        this.z80.iyh = this.mem.readbyte(this.z80.pc++);
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x29: {
        {
          var add16temp = (this.z80.iyl | (this.z80.iyh << 8)) + (this.z80.iyl | (this.z80.iyh << 8));
          var lookup =
            (((this.z80.iyl | (this.z80.iyh << 8)) & 0x0800) >> 11) |
            (((this.z80.iyl | (this.z80.iyh << 8)) & 0x0800) >> 10) |
            ((add16temp & 0x0800) >> 9);
          this.core.tstates += 7;
          this.z80.iyh = (add16temp >> 8) & 0xff;
          this.z80.iyl = add16temp & 0xff;
          this.z80.f =
            (this.z80.f & (0x04 | 0x40 | 0x80)) |
            (add16temp & 0x10000 ? 0x01 : 0) |
            ((add16temp >> 8) & (0x08 | 0x20)) |
            this.halfcarry_add_table[lookup];
        }
        break;
      }
      case 0x2a: {
        {
          var ldtemp;
          this.core.tstates += 12;
          ldtemp = this.mem.readbyte(this.z80.pc++);
          this.z80.pc &= 0xffff;
          ldtemp |= this.mem.readbyte(this.z80.pc++) << 8;
          this.z80.pc &= 0xffff;
          this.z80.iyl = this.mem.readbyte(ldtemp++);
          ldtemp &= 0xffff;
          this.z80.iyh = this.mem.readbyte(ldtemp);
        }
        break;
      }
      case 0x2b: {
        this.core.tstates += 2;
        var wordtemp = ((this.z80.iyl | (this.z80.iyh << 8)) - 1) & 0xffff;
        this.z80.iyh = wordtemp >> 8;
        this.z80.iyl = wordtemp & 0xff;
        break;
      }
      case 0x2c: {
        {
          this.z80.iyl = (this.z80.iyl + 1) & 0xff;
          this.z80.f =
            (this.z80.f & 0x01) |
            (this.z80.iyl == 0x80 ? 0x04 : 0) |
            (this.z80.iyl & 0x0f ? 0 : 0x10) |
            this.sz53_table[this.z80.iyl];
        }
        break;
      }
      case 0x2d: {
        {
          this.z80.f = (this.z80.f & 0x01) | (this.z80.iyl & 0x0f ? 0 : 0x10) | 0x02;
          this.z80.iyl = (this.z80.iyl - 1) & 0xff;
          this.z80.f |= (this.z80.iyl == 0x7f ? 0x04 : 0) | this.sz53_table[this.z80.iyl];
        }
        break;
      }
      case 0x2e: {
        this.core.tstates += 3;
        this.z80.iyl = this.mem.readbyte(this.z80.pc++);
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x34: {
        this.core.tstates += 15;
        {
          var wordtemp =
            ((this.z80.iyl | (this.z80.iyh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff;
          this.z80.pc &= 0xffff;
          var bytetemp = this.mem.readbyte(wordtemp);
          {
            bytetemp = (bytetemp + 1) & 0xff;
            this.z80.f =
              (this.z80.f & 0x01) |
              (bytetemp == 0x80 ? 0x04 : 0) |
              (bytetemp & 0x0f ? 0 : 0x10) |
              this.sz53_table[bytetemp];
          }
          this.mem.writebyte(wordtemp, bytetemp);
        }
        break;
      }
      case 0x35: {
        this.core.tstates += 15;
        {
          var wordtemp =
            ((this.z80.iyl | (this.z80.iyh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff;
          this.z80.pc &= 0xffff;
          var bytetemp = this.mem.readbyte(wordtemp);
          {
            this.z80.f = (this.z80.f & 0x01) | (bytetemp & 0x0f ? 0 : 0x10) | 0x02;
            bytetemp = (bytetemp - 1) & 0xff;
            this.z80.f |= (bytetemp == 0x7f ? 0x04 : 0) | this.sz53_table[bytetemp];
          }
          this.mem.writebyte(wordtemp, bytetemp);
        }
        break;
      }
      case 0x36: {
        this.core.tstates += 11;
        {
          var wordtemp =
            ((this.z80.iyl | (this.z80.iyh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff;
          this.z80.pc &= 0xffff;
          this.mem.writebyte(wordtemp, this.mem.readbyte(this.z80.pc++));
          this.z80.pc &= 0xffff;
        }
        break;
      }
      case 0x39: {
        {
          var add16temp = (this.z80.iyl | (this.z80.iyh << 8)) + this.z80.sp;
          var lookup =
            (((this.z80.iyl | (this.z80.iyh << 8)) & 0x0800) >> 11) |
            ((this.z80.sp & 0x0800) >> 10) |
            ((add16temp & 0x0800) >> 9);
          this.core.tstates += 7;
          this.z80.iyh = (add16temp >> 8) & 0xff;
          this.z80.iyl = add16temp & 0xff;
          this.z80.f =
            (this.z80.f & (0x04 | 0x40 | 0x80)) |
            (add16temp & 0x10000 ? 0x01 : 0) |
            ((add16temp >> 8) & (0x08 | 0x20)) |
            this.halfcarry_add_table[lookup];
        }
        break;
      }
      case 0x44: {
        this.z80.b = this.z80.iyh;
        break;
      }
      case 0x45: {
        this.z80.b = this.z80.iyl;
        break;
      }
      case 0x46: {
        this.core.tstates += 11;
        this.z80.b = this.mem.readbyte(
          ((this.z80.iyl | (this.z80.iyh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff
        );
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x4c: {
        this.z80.c = this.z80.iyh;
        break;
      }
      case 0x4d: {
        this.z80.c = this.z80.iyl;
        break;
      }
      case 0x4e: {
        this.core.tstates += 11;
        this.z80.c = this.mem.readbyte(
          ((this.z80.iyl | (this.z80.iyh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff
        );
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x54: {
        this.z80.d = this.z80.iyh;
        break;
      }
      case 0x55: {
        this.z80.d = this.z80.iyl;
        break;
      }
      case 0x56: {
        this.core.tstates += 11;
        this.z80.d = this.mem.readbyte(
          ((this.z80.iyl | (this.z80.iyh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff
        );
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x5c: {
        this.z80.e = this.z80.iyh;
        break;
      }
      case 0x5d: {
        this.z80.e = this.z80.iyl;
        break;
      }
      case 0x5e: {
        this.core.tstates += 11;
        this.z80.e = this.mem.readbyte(
          ((this.z80.iyl | (this.z80.iyh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff
        );
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x60: {
        this.z80.iyh = this.z80.b;
        break;
      }
      case 0x61: {
        this.z80.iyh = this.z80.c;
        break;
      }
      case 0x62: {
        this.z80.iyh = this.z80.d;
        break;
      }
      case 0x63: {
        this.z80.iyh = this.z80.e;
        break;
      }
      case 0x64: {
        break;
      }
      case 0x65: {
        this.z80.iyh = this.z80.iyl;
        break;
      }
      case 0x66: {
        this.core.tstates += 11;
        this.z80.h = this.mem.readbyte(
          ((this.z80.iyl | (this.z80.iyh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff
        );
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x67: {
        this.z80.iyh = this.z80.a;
        break;
      }
      case 0x68: {
        this.z80.iyl = this.z80.b;
        break;
      }
      case 0x69: {
        this.z80.iyl = this.z80.c;
        break;
      }
      case 0x6a: {
        this.z80.iyl = this.z80.d;
        break;
      }
      case 0x6b: {
        this.z80.iyl = this.z80.e;
        break;
      }
      case 0x6c: {
        this.z80.iyl = this.z80.iyh;
        break;
      }
      case 0x6d: {
        break;
      }
      case 0x6e: {
        this.core.tstates += 11;
        this.z80.l = this.mem.readbyte(
          ((this.z80.iyl | (this.z80.iyh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff
        );
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x6f: {
        this.z80.iyl = this.z80.a;
        break;
      }
      case 0x70: {
        this.core.tstates += 11;
        this.mem.writebyte(
          ((this.z80.iyl | (this.z80.iyh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff,
          this.z80.b
        );
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x71: {
        this.core.tstates += 11;
        this.mem.writebyte(
          ((this.z80.iyl | (this.z80.iyh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff,
          this.z80.c
        );
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x72: {
        this.core.tstates += 11;
        this.mem.writebyte(
          ((this.z80.iyl | (this.z80.iyh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff,
          this.z80.d
        );
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x73: {
        this.core.tstates += 11;
        this.mem.writebyte(
          ((this.z80.iyl | (this.z80.iyh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff,
          this.z80.e
        );
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x74: {
        this.core.tstates += 11;
        this.mem.writebyte(
          ((this.z80.iyl | (this.z80.iyh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff,
          this.z80.h
        );
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x75: {
        this.core.tstates += 11;
        this.mem.writebyte(
          ((this.z80.iyl | (this.z80.iyh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff,
          this.z80.l
        );
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x77: {
        this.core.tstates += 11;
        this.mem.writebyte(
          ((this.z80.iyl | (this.z80.iyh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff,
          this.z80.a
        );
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x7c: {
        this.z80.a = this.z80.iyh;
        break;
      }
      case 0x7d: {
        this.z80.a = this.z80.iyl;
        break;
      }
      case 0x7e: {
        this.core.tstates += 11;
        this.z80.a = this.mem.readbyte(
          ((this.z80.iyl | (this.z80.iyh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
            0xffff
        );
        this.z80.pc &= 0xffff;
        break;
      }
      case 0x84: {
        {
          var addtemp = this.z80.a + this.z80.iyh;
          var lookup =
            ((this.z80.a & 0x88) >> 3) | ((this.z80.iyh & 0x88) >> 2) | ((addtemp & 0x88) >> 1);
          this.z80.a = addtemp & 0xff;
          this.z80.f =
            (addtemp & 0x100 ? 0x01 : 0) |
            this.halfcarry_add_table[lookup & 0x07] |
            this.overflow_add_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x85: {
        {
          var addtemp = this.z80.a + this.z80.iyl;
          var lookup =
            ((this.z80.a & 0x88) >> 3) | ((this.z80.iyl & 0x88) >> 2) | ((addtemp & 0x88) >> 1);
          this.z80.a = addtemp & 0xff;
          this.z80.f =
            (addtemp & 0x100 ? 0x01 : 0) |
            this.halfcarry_add_table[lookup & 0x07] |
            this.overflow_add_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x86: {
        this.core.tstates += 11;
        {
          var bytetemp = this.mem.readbyte(
            ((this.z80.iyl | (this.z80.iyh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
              0xffff
          );
          this.z80.pc &= 0xffff;
          {
            var addtemp = this.z80.a + bytetemp;
            var lookup = ((this.z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((addtemp & 0x88) >> 1);
            this.z80.a = addtemp & 0xff;
            this.z80.f =
              (addtemp & 0x100 ? 0x01 : 0) |
              this.halfcarry_add_table[lookup & 0x07] |
              this.overflow_add_table[lookup >> 4] |
              this.sz53_table[this.z80.a];
          }
        }
        break;
      }
      case 0x8c: {
        {
          var adctemp = this.z80.a + this.z80.iyh + (this.z80.f & 0x01);
          var lookup =
            ((this.z80.a & 0x88) >> 3) | ((this.z80.iyh & 0x88) >> 2) | ((adctemp & 0x88) >> 1);
          this.z80.a = adctemp & 0xff;
          this.z80.f =
            (adctemp & 0x100 ? 0x01 : 0) |
            this.halfcarry_add_table[lookup & 0x07] |
            this.overflow_add_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x8d: {
        {
          var adctemp = this.z80.a + this.z80.iyl + (this.z80.f & 0x01);
          var lookup =
            ((this.z80.a & 0x88) >> 3) | ((this.z80.iyl & 0x88) >> 2) | ((adctemp & 0x88) >> 1);
          this.z80.a = adctemp & 0xff;
          this.z80.f =
            (adctemp & 0x100 ? 0x01 : 0) |
            this.halfcarry_add_table[lookup & 0x07] |
            this.overflow_add_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x8e: {
        this.core.tstates += 11;
        {
          var bytetemp = this.mem.readbyte(
            ((this.z80.iyl | (this.z80.iyh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
              0xffff
          );
          this.z80.pc &= 0xffff;
          {
            var adctemp = this.z80.a + bytetemp + (this.z80.f & 0x01);
            var lookup = ((this.z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((adctemp & 0x88) >> 1);
            this.z80.a = adctemp & 0xff;
            this.z80.f =
              (adctemp & 0x100 ? 0x01 : 0) |
              this.halfcarry_add_table[lookup & 0x07] |
              this.overflow_add_table[lookup >> 4] |
              this.sz53_table[this.z80.a];
          }
        }
        break;
      }
      case 0x94: {
        {
          var subtemp = this.z80.a - this.z80.iyh;
          var lookup =
            ((this.z80.a & 0x88) >> 3) | ((this.z80.iyh & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
          this.z80.a = subtemp & 0xff;
          this.z80.f =
            (subtemp & 0x100 ? 0x01 : 0) |
            0x02 |
            this.halfcarry_sub_table[lookup & 0x07] |
            this.overflow_sub_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x95: {
        {
          var subtemp = this.z80.a - this.z80.iyl;
          var lookup =
            ((this.z80.a & 0x88) >> 3) | ((this.z80.iyl & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
          this.z80.a = subtemp & 0xff;
          this.z80.f =
            (subtemp & 0x100 ? 0x01 : 0) |
            0x02 |
            this.halfcarry_sub_table[lookup & 0x07] |
            this.overflow_sub_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x96: {
        this.core.tstates += 11;
        {
          var bytetemp = this.mem.readbyte(
            ((this.z80.iyl | (this.z80.iyh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
              0xffff
          );
          this.z80.pc &= 0xffff;
          {
            var subtemp = this.z80.a - bytetemp;
            var lookup = ((this.z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((subtemp & 0x88) >> 1);
            this.z80.a = subtemp & 0xff;
            this.z80.f =
              (subtemp & 0x100 ? 0x01 : 0) |
              0x02 |
              this.halfcarry_sub_table[lookup & 0x07] |
              this.overflow_sub_table[lookup >> 4] |
              this.sz53_table[this.z80.a];
          }
        }
        break;
      }
      case 0x9c: {
        {
          var sbctemp = this.z80.a - this.z80.iyh - (this.z80.f & 0x01);
          var lookup =
            ((this.z80.a & 0x88) >> 3) | ((this.z80.iyh & 0x88) >> 2) | ((sbctemp & 0x88) >> 1);
          this.z80.a = sbctemp & 0xff;
          this.z80.f =
            (sbctemp & 0x100 ? 0x01 : 0) |
            0x02 |
            this.halfcarry_sub_table[lookup & 0x07] |
            this.overflow_sub_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x9d: {
        {
          var sbctemp = this.z80.a - this.z80.iyl - (this.z80.f & 0x01);
          var lookup =
            ((this.z80.a & 0x88) >> 3) | ((this.z80.iyl & 0x88) >> 2) | ((sbctemp & 0x88) >> 1);
          this.z80.a = sbctemp & 0xff;
          this.z80.f =
            (sbctemp & 0x100 ? 0x01 : 0) |
            0x02 |
            this.halfcarry_sub_table[lookup & 0x07] |
            this.overflow_sub_table[lookup >> 4] |
            this.sz53_table[this.z80.a];
        }
        break;
      }
      case 0x9e: {
        this.core.tstates += 11;
        {
          var bytetemp = this.mem.readbyte(
            ((this.z80.iyl | (this.z80.iyh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
              0xffff
          );
          this.z80.pc &= 0xffff;
          {
            var sbctemp = this.z80.a - bytetemp - (this.z80.f & 0x01);
            var lookup = ((this.z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((sbctemp & 0x88) >> 1);
            this.z80.a = sbctemp & 0xff;
            this.z80.f =
              (sbctemp & 0x100 ? 0x01 : 0) |
              0x02 |
              this.halfcarry_sub_table[lookup & 0x07] |
              this.overflow_sub_table[lookup >> 4] |
              this.sz53_table[this.z80.a];
          }
        }
        break;
      }
      case 0xa4: {
        {
          this.z80.a &= this.z80.iyh;
          this.z80.f = 0x10 | this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0xa5: {
        {
          this.z80.a &= this.z80.iyl;
          this.z80.f = 0x10 | this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0xa6: {
        this.core.tstates += 11;
        {
          var bytetemp = this.mem.readbyte(
            ((this.z80.iyl | (this.z80.iyh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
              0xffff
          );
          this.z80.pc &= 0xffff;
          {
            this.z80.a &= bytetemp;
            this.z80.f = 0x10 | this.sz53p_table[this.z80.a];
          }
        }
        break;
      }
      case 0xac: {
        {
          this.z80.a ^= this.z80.iyh;
          this.z80.f = this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0xad: {
        {
          this.z80.a ^= this.z80.iyl;
          this.z80.f = this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0xae: {
        this.core.tstates += 11;
        {
          var bytetemp = this.mem.readbyte(
            ((this.z80.iyl | (this.z80.iyh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
              0xffff
          );
          this.z80.pc &= 0xffff;
          {
            this.z80.a ^= bytetemp;
            this.z80.f = this.sz53p_table[this.z80.a];
          }
        }
        break;
      }
      case 0xb4: {
        {
          this.z80.a |= this.z80.iyh;
          this.z80.f = this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0xb5: {
        {
          this.z80.a |= this.z80.iyl;
          this.z80.f = this.sz53p_table[this.z80.a];
        }
        break;
      }
      case 0xb6: {
        this.core.tstates += 11;
        {
          var bytetemp = this.mem.readbyte(
            ((this.z80.iyl | (this.z80.iyh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
              0xffff
          );
          this.z80.pc &= 0xffff;
          {
            this.z80.a |= bytetemp;
            this.z80.f = this.sz53p_table[this.z80.a];
          }
        }
        break;
      }
      case 0xbc: {
        {
          var cptemp = this.z80.a - this.z80.iyh;
          var lookup =
            ((this.z80.a & 0x88) >> 3) | ((this.z80.iyh & 0x88) >> 2) | ((cptemp & 0x88) >> 1);
          this.z80.f =
            (cptemp & 0x100 ? 0x01 : cptemp ? 0 : 0x40) |
            0x02 |
            this.halfcarry_sub_table[lookup & 0x07] |
            this.overflow_sub_table[lookup >> 4] |
            (this.z80.iyh & (0x08 | 0x20)) |
            (cptemp & 0x80);
        }
        break;
      }
      case 0xbd: {
        {
          var cptemp = this.z80.a - this.z80.iyl;
          var lookup =
            ((this.z80.a & 0x88) >> 3) | ((this.z80.iyl & 0x88) >> 2) | ((cptemp & 0x88) >> 1);
          this.z80.f =
            (cptemp & 0x100 ? 0x01 : cptemp ? 0 : 0x40) |
            0x02 |
            this.halfcarry_sub_table[lookup & 0x07] |
            this.overflow_sub_table[lookup >> 4] |
            (this.z80.iyl & (0x08 | 0x20)) |
            (cptemp & 0x80);
        }
        break;
      }
      case 0xbe: {
        this.core.tstates += 11;
        {
          var bytetemp = this.mem.readbyte(
            ((this.z80.iyl | (this.z80.iyh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++))) &
              0xffff
          );
          this.z80.pc &= 0xffff;
          {
            var cptemp = this.z80.a - bytetemp;
            var lookup = ((this.z80.a & 0x88) >> 3) | ((bytetemp & 0x88) >> 2) | ((cptemp & 0x88) >> 1);
            this.z80.f =
              (cptemp & 0x100 ? 0x01 : cptemp ? 0 : 0x40) |
              0x02 |
              this.halfcarry_sub_table[lookup & 0x07] |
              this.overflow_sub_table[lookup >> 4] |
              (bytetemp & (0x08 | 0x20)) |
              (cptemp & 0x80);
          }
        }
        break;
      }
      case 0xcb: {
        {
          var opcode3;
          this.core.tstates += 7;
          let tempaddr =
            (this.z80.iyl | (this.z80.iyh << 8)) + this.sign_extend(this.mem.readbyte(this.z80.pc++));
          this.z80.pc &= 0xffff;
          opcode3 = this.mem.readbyte(this.z80.pc++);
          this.z80.pc &= 0xffff;
          this.z80_ddfdcbxx(opcode3, tempaddr);
        }
        break;
      }
      case 0xe1: {
        {
          this.core.tstates += 6;
          this.z80.iyl = this.mem.readbyte(this.z80.sp++);
          this.z80.sp &= 0xffff;
          this.z80.iyh = this.mem.readbyte(this.z80.sp++);
          this.z80.sp &= 0xffff;
        }
        break;
      }
      case 0xe3: {
        {
          var bytetempl = this.mem.readbyte(this.z80.sp),
            bytetemph = this.mem.readbyte(this.z80.sp + 1);
          this.core.tstates += 15;
          this.mem.writebyte(this.z80.sp + 1, this.z80.iyh);
          this.mem.writebyte(this.z80.sp, this.z80.iyl);
          this.z80.iyl = bytetempl;
          this.z80.iyh = bytetemph;
        }
        break;
      }
      case 0xe5: {
        this.core.tstates++;
        {
          this.core.tstates += 6;
          this.z80.sp--;
          this.z80.sp &= 0xffff;
          this.mem.writebyte(this.z80.sp, this.z80.iyh);
          this.z80.sp--;
          this.z80.sp &= 0xffff;
          this.mem.writebyte(this.z80.sp, this.z80.iyl);
        }
        break;
      }
      case 0xe9: {
        this.z80.pc = this.z80.iyl | (this.z80.iyh << 8);
        break;
      }
      case 0xf9: {
        this.core.tstates += 2;
        this.z80.sp = this.z80.iyl | (this.z80.iyh << 8);
        break;
      }
      case 256: {
        this.z80.pc--;
        this.z80.pc &= 0xffff;
        this.z80.r--;
        this.z80.r &= 0x7f;
        break;
      }
    }
  };
  z80_ddfdcbxx = (key, tempaddr) => {
    switch (key) {
      case 0x00: {
        this.core.tstates += 8;
        this.z80.b = this.mem.readbyte(tempaddr);
        {
          this.z80.b = ((this.z80.b & 0x7f) << 1) | (this.z80.b >> 7);
          this.z80.f = (this.z80.b & 0x01) | this.sz53p_table[this.z80.b];
        }
        this.mem.writebyte(tempaddr, this.z80.b);
        break;
      }
      case 0x01: {
        this.core.tstates += 8;
        this.z80.c = this.mem.readbyte(tempaddr);
        {
          this.z80.c = ((this.z80.c & 0x7f) << 1) | (this.z80.c >> 7);
          this.z80.f = (this.z80.c & 0x01) | this.sz53p_table[this.z80.c];
        }
        this.mem.writebyte(tempaddr, this.z80.c);
        break;
      }
      case 0x02: {
        this.core.tstates += 8;
        this.z80.d = this.mem.readbyte(tempaddr);
        {
          this.z80.d = ((this.z80.d & 0x7f) << 1) | (this.z80.d >> 7);
          this.z80.f = (this.z80.d & 0x01) | this.sz53p_table[this.z80.d];
        }
        this.mem.writebyte(tempaddr, this.z80.d);
        break;
      }
      case 0x03: {
        this.core.tstates += 8;
        this.z80.e = this.mem.readbyte(tempaddr);
        {
          this.z80.e = ((this.z80.e & 0x7f) << 1) | (this.z80.e >> 7);
          this.z80.f = (this.z80.e & 0x01) | this.sz53p_table[this.z80.e];
        }
        this.mem.writebyte(tempaddr, this.z80.e);
        break;
      }
      case 0x04: {
        this.core.tstates += 8;
        this.z80.h = this.mem.readbyte(tempaddr);
        {
          this.z80.h = ((this.z80.h & 0x7f) << 1) | (this.z80.h >> 7);
          this.z80.f = (this.z80.h & 0x01) | this.sz53p_table[this.z80.h];
        }
        this.mem.writebyte(tempaddr, this.z80.h);
        break;
      }
      case 0x05: {
        this.core.tstates += 8;
        this.z80.l = this.mem.readbyte(tempaddr);
        {
          this.z80.l = ((this.z80.l & 0x7f) << 1) | (this.z80.l >> 7);
          this.z80.f = (this.z80.l & 0x01) | this.sz53p_table[this.z80.l];
        }
        this.mem.writebyte(tempaddr, this.z80.l);
        break;
      }
      case 0x06: {
        this.core.tstates += 8;
        {
          var bytetemp = this.mem.readbyte(tempaddr);
          {
            bytetemp = ((bytetemp & 0x7f) << 1) | (bytetemp >> 7);
            this.z80.f = (bytetemp & 0x01) | this.sz53p_table[bytetemp];
          }
          this.mem.writebyte(tempaddr, bytetemp);
        }
        break;
      }
      case 0x07: {
        this.core.tstates += 8;
        this.z80.a = this.mem.readbyte(tempaddr);
        {
          this.z80.a = ((this.z80.a & 0x7f) << 1) | (this.z80.a >> 7);
          this.z80.f = (this.z80.a & 0x01) | this.sz53p_table[this.z80.a];
        }
        this.mem.writebyte(tempaddr, this.z80.a);
        break;
      }
      case 0x08: {
        this.core.tstates += 8;
        this.z80.b = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.b & 0x01;
          this.z80.b = (this.z80.b >> 1) | ((this.z80.b & 0x01) << 7);
          this.z80.f |= this.sz53p_table[this.z80.b];
        }
        this.mem.writebyte(tempaddr, this.z80.b);
        break;
      }
      case 0x09: {
        this.core.tstates += 8;
        this.z80.c = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.c & 0x01;
          this.z80.c = (this.z80.c >> 1) | ((this.z80.c & 0x01) << 7);
          this.z80.f |= this.sz53p_table[this.z80.c];
        }
        this.mem.writebyte(tempaddr, this.z80.c);
        break;
      }
      case 0x0a: {
        this.core.tstates += 8;
        this.z80.d = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.d & 0x01;
          this.z80.d = (this.z80.d >> 1) | ((this.z80.d & 0x01) << 7);
          this.z80.f |= this.sz53p_table[this.z80.d];
        }
        this.mem.writebyte(tempaddr, this.z80.d);
        break;
      }
      case 0x0b: {
        this.core.tstates += 8;
        this.z80.e = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.e & 0x01;
          this.z80.e = (this.z80.e >> 1) | ((this.z80.e & 0x01) << 7);
          this.z80.f |= this.sz53p_table[this.z80.e];
        }
        this.mem.writebyte(tempaddr, this.z80.e);
        break;
      }
      case 0x0c: {
        this.core.tstates += 8;
        this.z80.h = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.h & 0x01;
          this.z80.h = (this.z80.h >> 1) | ((this.z80.h & 0x01) << 7);
          this.z80.f |= this.sz53p_table[this.z80.h];
        }
        this.mem.writebyte(tempaddr, this.z80.h);
        break;
      }
      case 0x0d: {
        this.core.tstates += 8;
        this.z80.l = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.l & 0x01;
          this.z80.l = (this.z80.l >> 1) | ((this.z80.l & 0x01) << 7);
          this.z80.f |= this.sz53p_table[this.z80.l];
        }
        this.mem.writebyte(tempaddr, this.z80.l);
        break;
      }
      case 0x0e: {
        this.core.tstates += 8;
        {
          var bytetemp = this.mem.readbyte(tempaddr);
          {
            this.z80.f = bytetemp & 0x01;
            bytetemp = (bytetemp >> 1) | ((bytetemp & 0x01) << 7);
            this.z80.f |= this.sz53p_table[bytetemp];
          }
          this.mem.writebyte(tempaddr, bytetemp);
        }
        break;
      }
      case 0x0f: {
        this.core.tstates += 8;
        this.z80.a = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.a & 0x01;
          this.z80.a = (this.z80.a >> 1) | ((this.z80.a & 0x01) << 7);
          this.z80.f |= this.sz53p_table[this.z80.a];
        }
        this.mem.writebyte(tempaddr, this.z80.a);
        break;
      }
      case 0x10: {
        this.core.tstates += 8;
        this.z80.b = this.mem.readbyte(tempaddr);
        {
          var rltemp = this.z80.b;
          this.z80.b = ((this.z80.b & 0x7f) << 1) | (this.z80.f & 0x01);
          this.z80.f = (rltemp >> 7) | this.sz53p_table[this.z80.b];
        }
        this.mem.writebyte(tempaddr, this.z80.b);
        break;
      }
      case 0x11: {
        this.core.tstates += 8;
        this.z80.c = this.mem.readbyte(tempaddr);
        {
          var rltemp = this.z80.c;
          this.z80.c = ((this.z80.c & 0x7f) << 1) | (this.z80.f & 0x01);
          this.z80.f = (rltemp >> 7) | this.sz53p_table[this.z80.c];
        }
        this.mem.writebyte(tempaddr, this.z80.c);
        break;
      }
      case 0x12: {
        this.core.tstates += 8;
        this.z80.d = this.mem.readbyte(tempaddr);
        {
          var rltemp = this.z80.d;
          this.z80.d = ((this.z80.d & 0x7f) << 1) | (this.z80.f & 0x01);
          this.z80.f = (rltemp >> 7) | this.sz53p_table[this.z80.d];
        }
        this.mem.writebyte(tempaddr, this.z80.d);
        break;
      }
      case 0x13: {
        this.core.tstates += 8;
        this.z80.e = this.mem.readbyte(tempaddr);
        {
          var rltemp = this.z80.e;
          this.z80.e = ((this.z80.e & 0x7f) << 1) | (this.z80.f & 0x01);
          this.z80.f = (rltemp >> 7) | this.sz53p_table[this.z80.e];
        }
        this.mem.writebyte(tempaddr, this.z80.e);
        break;
      }
      case 0x14: {
        this.core.tstates += 8;
        this.z80.h = this.mem.readbyte(tempaddr);
        {
          var rltemp = this.z80.h;
          this.z80.h = ((this.z80.h & 0x7f) << 1) | (this.z80.f & 0x01);
          this.z80.f = (rltemp >> 7) | this.sz53p_table[this.z80.h];
        }
        this.mem.writebyte(tempaddr, this.z80.h);
        break;
      }
      case 0x15: {
        this.core.tstates += 8;
        this.z80.l = this.mem.readbyte(tempaddr);
        {
          var rltemp = this.z80.l;
          this.z80.l = ((this.z80.l & 0x7f) << 1) | (this.z80.f & 0x01);
          this.z80.f = (rltemp >> 7) | this.sz53p_table[this.z80.l];
        }
        this.mem.writebyte(tempaddr, this.z80.l);
        break;
      }
      case 0x16: {
        this.core.tstates += 8;
        {
          var bytetemp = this.mem.readbyte(tempaddr);
          {
            var rltemp = bytetemp;
            bytetemp = ((bytetemp & 0x7f) << 1) | (this.z80.f & 0x01);
            this.z80.f = (rltemp >> 7) | this.sz53p_table[bytetemp];
          }
          this.mem.writebyte(tempaddr, bytetemp);
        }
        break;
      }
      case 0x17: {
        this.core.tstates += 8;
        this.z80.a = this.mem.readbyte(tempaddr);
        {
          var rltemp = this.z80.a;
          this.z80.a = ((this.z80.a & 0x7f) << 1) | (this.z80.f & 0x01);
          this.z80.f = (rltemp >> 7) | this.sz53p_table[this.z80.a];
        }
        this.mem.writebyte(tempaddr, this.z80.a);
        break;
      }
      case 0x18: {
        this.core.tstates += 8;
        this.z80.b = this.mem.readbyte(tempaddr);
        {
          var rrtemp = this.z80.b;
          this.z80.b = (this.z80.b >> 1) | ((this.z80.f & 0x01) << 7);
          this.z80.f = (rrtemp & 0x01) | this.sz53p_table[this.z80.b];
        }
        this.mem.writebyte(tempaddr, this.z80.b);
        break;
      }
      case 0x19: {
        this.core.tstates += 8;
        this.z80.c = this.mem.readbyte(tempaddr);
        {
          var rrtemp = this.z80.c;
          this.z80.c = (this.z80.c >> 1) | ((this.z80.f & 0x01) << 7);
          this.z80.f = (rrtemp & 0x01) | this.sz53p_table[this.z80.c];
        }
        this.mem.writebyte(tempaddr, this.z80.c);
        break;
      }
      case 0x1a: {
        this.core.tstates += 8;
        this.z80.d = this.mem.readbyte(tempaddr);
        {
          var rrtemp = this.z80.d;
          this.z80.d = (this.z80.d >> 1) | ((this.z80.f & 0x01) << 7);
          this.z80.f = (rrtemp & 0x01) | this.sz53p_table[this.z80.d];
        }
        this.mem.writebyte(tempaddr, this.z80.d);
        break;
      }
      case 0x1b: {
        this.core.tstates += 8;
        this.z80.e = this.mem.readbyte(tempaddr);
        {
          var rrtemp = this.z80.e;
          this.z80.e = (this.z80.e >> 1) | ((this.z80.f & 0x01) << 7);
          this.z80.f = (rrtemp & 0x01) | this.sz53p_table[this.z80.e];
        }
        this.mem.writebyte(tempaddr, this.z80.e);
        break;
      }
      case 0x1c: {
        this.core.tstates += 8;
        this.z80.h = this.mem.readbyte(tempaddr);
        {
          var rrtemp = this.z80.h;
          this.z80.h = (this.z80.h >> 1) | ((this.z80.f & 0x01) << 7);
          this.z80.f = (rrtemp & 0x01) | this.sz53p_table[this.z80.h];
        }
        this.mem.writebyte(tempaddr, this.z80.h);
        break;
      }
      case 0x1d: {
        this.core.tstates += 8;
        this.z80.l = this.mem.readbyte(tempaddr);
        {
          var rrtemp = this.z80.l;
          this.z80.l = (this.z80.l >> 1) | ((this.z80.f & 0x01) << 7);
          this.z80.f = (rrtemp & 0x01) | this.sz53p_table[this.z80.l];
        }
        this.mem.writebyte(tempaddr, this.z80.l);
        break;
      }
      case 0x1e: {
        this.core.tstates += 8;
        {
          var bytetemp = this.mem.readbyte(tempaddr);
          {
            var rrtemp = bytetemp;
            bytetemp = (bytetemp >> 1) | ((this.z80.f & 0x01) << 7);
            this.z80.f = (rrtemp & 0x01) | this.sz53p_table[bytetemp];
          }
          this.mem.writebyte(tempaddr, bytetemp);
        }
        break;
      }
      case 0x1f: {
        this.core.tstates += 8;
        this.z80.a = this.mem.readbyte(tempaddr);
        {
          var rrtemp = this.z80.a;
          this.z80.a = (this.z80.a >> 1) | ((this.z80.f & 0x01) << 7);
          this.z80.f = (rrtemp & 0x01) | this.sz53p_table[this.z80.a];
        }
        this.mem.writebyte(tempaddr, this.z80.a);
        break;
      }
      case 0x20: {
        this.core.tstates += 8;
        this.z80.b = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.b >> 7;
          this.z80.b <<= 1;
          this.z80.b &= 0xff;
          this.z80.f |= this.sz53p_table[this.z80.b];
        }
        this.mem.writebyte(tempaddr, this.z80.b);
        break;
      }
      case 0x21: {
        this.core.tstates += 8;
        this.z80.c = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.c >> 7;
          this.z80.c <<= 1;
          this.z80.c &= 0xff;
          this.z80.f |= this.sz53p_table[this.z80.c];
        }
        this.mem.writebyte(tempaddr, this.z80.c);
        break;
      }
      case 0x22: {
        this.core.tstates += 8;
        this.z80.d = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.d >> 7;
          this.z80.d <<= 1;
          this.z80.d &= 0xff;
          this.z80.f |= this.sz53p_table[this.z80.d];
        }
        this.mem.writebyte(tempaddr, this.z80.d);
        break;
      }
      case 0x23: {
        this.core.tstates += 8;
        this.z80.e = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.e >> 7;
          this.z80.e <<= 1;
          this.z80.e &= 0xff;
          this.z80.f |= this.sz53p_table[this.z80.e];
        }
        this.mem.writebyte(tempaddr, this.z80.e);
        break;
      }
      case 0x24: {
        this.core.tstates += 8;
        this.z80.h = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.h >> 7;
          this.z80.h <<= 1;
          this.z80.h &= 0xff;
          this.z80.f |= this.sz53p_table[this.z80.h];
        }
        this.mem.writebyte(tempaddr, this.z80.h);
        break;
      }
      case 0x25: {
        this.core.tstates += 8;
        this.z80.l = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.l >> 7;
          this.z80.l <<= 1;
          this.z80.l &= 0xff;
          this.z80.f |= this.sz53p_table[this.z80.l];
        }
        this.mem.writebyte(tempaddr, this.z80.l);
        break;
      }
      case 0x26: {
        this.core.tstates += 8;
        {
          var bytetemp = this.mem.readbyte(tempaddr);
          {
            this.z80.f = bytetemp >> 7;
            bytetemp <<= 1;
            bytetemp &= 0xff;
            this.z80.f |= this.sz53p_table[bytetemp];
          }
          this.mem.writebyte(tempaddr, bytetemp);
        }
        break;
      }
      case 0x27: {
        this.core.tstates += 8;
        this.z80.a = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.a >> 7;
          this.z80.a <<= 1;
          this.z80.a &= 0xff;
          this.z80.f |= this.sz53p_table[this.z80.a];
        }
        this.mem.writebyte(tempaddr, this.z80.a);
        break;
      }
      case 0x28: {
        this.core.tstates += 8;
        this.z80.b = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.b & 0x01;
          this.z80.b = (this.z80.b & 0x80) | (this.z80.b >> 1);
          this.z80.f |= this.sz53p_table[this.z80.b];
        }
        this.mem.writebyte(tempaddr, this.z80.b);
        break;
      }
      case 0x29: {
        this.core.tstates += 8;
        this.z80.c = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.c & 0x01;
          this.z80.c = (this.z80.c & 0x80) | (this.z80.c >> 1);
          this.z80.f |= this.sz53p_table[this.z80.c];
        }
        this.mem.writebyte(tempaddr, this.z80.c);
        break;
      }
      case 0x2a: {
        this.core.tstates += 8;
        this.z80.d = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.d & 0x01;
          this.z80.d = (this.z80.d & 0x80) | (this.z80.d >> 1);
          this.z80.f |= this.sz53p_table[this.z80.d];
        }
        this.mem.writebyte(tempaddr, this.z80.d);
        break;
      }
      case 0x2b: {
        this.core.tstates += 8;
        this.z80.e = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.e & 0x01;
          this.z80.e = (this.z80.e & 0x80) | (this.z80.e >> 1);
          this.z80.f |= this.sz53p_table[this.z80.e];
        }
        this.mem.writebyte(tempaddr, this.z80.e);
        break;
      }
      case 0x2c: {
        this.core.tstates += 8;
        this.z80.h = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.h & 0x01;
          this.z80.h = (this.z80.h & 0x80) | (this.z80.h >> 1);
          this.z80.f |= this.sz53p_table[this.z80.h];
        }
        this.mem.writebyte(tempaddr, this.z80.h);
        break;
      }
      case 0x2d: {
        this.core.tstates += 8;
        this.z80.l = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.l & 0x01;
          this.z80.l = (this.z80.l & 0x80) | (this.z80.l >> 1);
          this.z80.f |= this.sz53p_table[this.z80.l];
        }
        this.mem.writebyte(tempaddr, this.z80.l);
        break;
      }
      case 0x2e: {
        this.core.tstates += 8;
        {
          var bytetemp = this.mem.readbyte(tempaddr);
          {
            this.z80.f = bytetemp & 0x01;
            bytetemp = (bytetemp & 0x80) | (bytetemp >> 1);
            this.z80.f |= this.sz53p_table[bytetemp];
          }
          this.mem.writebyte(tempaddr, bytetemp);
        }
        break;
      }
      case 0x2f: {
        this.core.tstates += 8;
        this.z80.a = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.a & 0x01;
          this.z80.a = (this.z80.a & 0x80) | (this.z80.a >> 1);
          this.z80.f |= this.sz53p_table[this.z80.a];
        }
        this.mem.writebyte(tempaddr, this.z80.a);
        break;
      }
      case 0x30: {
        this.core.tstates += 8;
        this.z80.b = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.b >> 7;
          this.z80.b = (this.z80.b << 1) | 0x01;
          this.z80.b &= 0xff;
          this.z80.f |= this.sz53p_table[this.z80.b];
        }
        this.mem.writebyte(tempaddr, this.z80.b);
        break;
      }
      case 0x31: {
        this.core.tstates += 8;
        this.z80.c = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.c >> 7;
          this.z80.c = (this.z80.c << 1) | 0x01;
          this.z80.c &= 0xff;
          this.z80.f |= this.sz53p_table[this.z80.c];
        }
        this.mem.writebyte(tempaddr, this.z80.c);
        break;
      }
      case 0x32: {
        this.core.tstates += 8;
        this.z80.d = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.d >> 7;
          this.z80.d = (this.z80.d << 1) | 0x01;
          this.z80.d &= 0xff;
          this.z80.f |= this.sz53p_table[this.z80.d];
        }
        this.mem.writebyte(tempaddr, this.z80.d);
        break;
      }
      case 0x33: {
        this.core.tstates += 8;
        this.z80.e = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.e >> 7;
          this.z80.e = (this.z80.e << 1) | 0x01;
          this.z80.e &= 0xff;
          this.z80.f |= this.sz53p_table[this.z80.e];
        }
        this.mem.writebyte(tempaddr, this.z80.e);
        break;
      }
      case 0x34: {
        this.core.tstates += 8;
        this.z80.h = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.h >> 7;
          this.z80.h = (this.z80.h << 1) | 0x01;
          this.z80.h &= 0xff;
          this.z80.f |= this.sz53p_table[this.z80.h];
        }
        this.mem.writebyte(tempaddr, this.z80.h);
        break;
      }
      case 0x35: {
        this.core.tstates += 8;
        this.z80.l = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.l >> 7;
          this.z80.l = (this.z80.l << 1) | 0x01;
          this.z80.l &= 0xff;
          this.z80.f |= this.sz53p_table[this.z80.l];
        }
        this.mem.writebyte(tempaddr, this.z80.l);
        break;
      }
      case 0x36: {
        this.core.tstates += 8;
        {
          var bytetemp = this.mem.readbyte(tempaddr);
          {
            this.z80.f = bytetemp >> 7;
            bytetemp = (bytetemp << 1) | 0x01;
            bytetemp &= 0xff;
            this.z80.f |= this.sz53p_table[bytetemp];
          }
          this.mem.writebyte(tempaddr, bytetemp);
        }
        break;
      }
      case 0x37: {
        this.core.tstates += 8;
        this.z80.a = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.a >> 7;
          this.z80.a = (this.z80.a << 1) | 0x01;
          this.z80.a &= 0xff;
          this.z80.f |= this.sz53p_table[this.z80.a];
        }
        this.mem.writebyte(tempaddr, this.z80.a);
        break;
      }
      case 0x38: {
        this.core.tstates += 8;
        this.z80.b = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.b & 0x01;
          this.z80.b >>= 1;
          this.z80.f |= this.sz53p_table[this.z80.b];
        }
        this.mem.writebyte(tempaddr, this.z80.b);
        break;
      }
      case 0x39: {
        this.core.tstates += 8;
        this.z80.c = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.c & 0x01;
          this.z80.c >>= 1;
          this.z80.f |= this.sz53p_table[this.z80.c];
        }
        this.mem.writebyte(tempaddr, this.z80.c);
        break;
      }
      case 0x3a: {
        this.core.tstates += 8;
        this.z80.d = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.d & 0x01;
          this.z80.d >>= 1;
          this.z80.f |= this.sz53p_table[this.z80.d];
        }
        this.mem.writebyte(tempaddr, this.z80.d);
        break;
      }
      case 0x3b: {
        this.core.tstates += 8;
        this.z80.e = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.e & 0x01;
          this.z80.e >>= 1;
          this.z80.f |= this.sz53p_table[this.z80.e];
        }
        this.mem.writebyte(tempaddr, this.z80.e);
        break;
      }
      case 0x3c: {
        this.core.tstates += 8;
        this.z80.h = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.h & 0x01;
          this.z80.h >>= 1;
          this.z80.f |= this.sz53p_table[this.z80.h];
        }
        this.mem.writebyte(tempaddr, this.z80.h);
        break;
      }
      case 0x3d: {
        this.core.tstates += 8;
        this.z80.l = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.l & 0x01;
          this.z80.l >>= 1;
          this.z80.f |= this.sz53p_table[this.z80.l];
        }
        this.mem.writebyte(tempaddr, this.z80.l);
        break;
      }
      case 0x3e: {
        this.core.tstates += 8;
        {
          var bytetemp = this.mem.readbyte(tempaddr);
          {
            this.z80.f = bytetemp & 0x01;
            bytetemp >>= 1;
            this.z80.f |= this.sz53p_table[bytetemp];
          }
          this.mem.writebyte(tempaddr, bytetemp);
        }
        break;
      }
      case 0x3f: {
        this.core.tstates += 8;
        this.z80.a = this.mem.readbyte(tempaddr);
        {
          this.z80.f = this.z80.a & 0x01;
          this.z80.a >>= 1;
          this.z80.f |= this.sz53p_table[this.z80.a];
        }
        this.mem.writebyte(tempaddr, this.z80.a);
        break;
      }

      case 0x80: {
        this.core.tstates += 8;
        this.z80.b = this.mem.readbyte(tempaddr) & 0xfe;
        this.mem.writebyte(tempaddr, this.z80.b);
        break;
      }
      case 0x81: {
        this.core.tstates += 8;
        this.z80.c = this.mem.readbyte(tempaddr) & 0xfe;
        this.mem.writebyte(tempaddr, this.z80.c);
        break;
      }
      case 0x82: {
        this.core.tstates += 8;
        this.z80.d = this.mem.readbyte(tempaddr) & 0xfe;
        this.mem.writebyte(tempaddr, this.z80.d);
        break;
      }
      case 0x83: {
        this.core.tstates += 8;
        this.z80.e = this.mem.readbyte(tempaddr) & 0xfe;
        this.mem.writebyte(tempaddr, this.z80.e);
        break;
      }
      case 0x84: {
        this.core.tstates += 8;
        this.z80.h = this.mem.readbyte(tempaddr) & 0xfe;
        this.mem.writebyte(tempaddr, this.z80.h);
        break;
      }
      case 0x85: {
        this.core.tstates += 8;
        this.z80.l = this.mem.readbyte(tempaddr) & 0xfe;
        this.mem.writebyte(tempaddr, this.z80.l);
        break;
      }
      case 0x86: {
        this.core.tstates += 8;
        this.mem.writebyte(tempaddr, this.mem.readbyte(tempaddr) & 0xfe);
        break;
      }
      case 0x87: {
        this.core.tstates += 8;
        this.z80.a = this.mem.readbyte(tempaddr) & 0xfe;
        this.mem.writebyte(tempaddr, this.z80.a);
        break;
      }
      case 0x88: {
        this.core.tstates += 8;
        this.z80.b = this.mem.readbyte(tempaddr) & 0xfd;
        this.mem.writebyte(tempaddr, this.z80.b);
        break;
      }
      case 0x89: {
        this.core.tstates += 8;
        this.z80.c = this.mem.readbyte(tempaddr) & 0xfd;
        this.mem.writebyte(tempaddr, this.z80.c);
        break;
      }
      case 0x8a: {
        this.core.tstates += 8;
        this.z80.d = this.mem.readbyte(tempaddr) & 0xfd;
        this.mem.writebyte(tempaddr, this.z80.d);
        break;
      }
      case 0x8b: {
        this.core.tstates += 8;
        this.z80.e = this.mem.readbyte(tempaddr) & 0xfd;
        this.mem.writebyte(tempaddr, this.z80.e);
        break;
      }
      case 0x8c: {
        this.core.tstates += 8;
        this.z80.h = this.mem.readbyte(tempaddr) & 0xfd;
        this.mem.writebyte(tempaddr, this.z80.h);
        break;
      }
      case 0x8d: {
        this.core.tstates += 8;
        this.z80.l = this.mem.readbyte(tempaddr) & 0xfd;
        this.mem.writebyte(tempaddr, this.z80.l);
        break;
      }
      case 0x8e: {
        this.core.tstates += 8;
        this.mem.writebyte(tempaddr, this.mem.readbyte(tempaddr) & 0xfd);
        break;
      }
      case 0x8f: {
        this.core.tstates += 8;
        this.z80.a = this.mem.readbyte(tempaddr) & 0xfd;
        this.mem.writebyte(tempaddr, this.z80.a);
        break;
      }
      case 0x90: {
        this.core.tstates += 8;
        this.z80.b = this.mem.readbyte(tempaddr) & 0xfb;
        this.mem.writebyte(tempaddr, this.z80.b);
        break;
      }
      case 0x91: {
        this.core.tstates += 8;
        this.z80.c = this.mem.readbyte(tempaddr) & 0xfb;
        this.mem.writebyte(tempaddr, this.z80.c);
        break;
      }
      case 0x92: {
        this.core.tstates += 8;
        this.z80.d = this.mem.readbyte(tempaddr) & 0xfb;
        this.mem.writebyte(tempaddr, this.z80.d);
        break;
      }
      case 0x93: {
        this.core.tstates += 8;
        this.z80.e = this.mem.readbyte(tempaddr) & 0xfb;
        this.mem.writebyte(tempaddr, this.z80.e);
        break;
      }
      case 0x94: {
        this.core.tstates += 8;
        this.z80.h = this.mem.readbyte(tempaddr) & 0xfb;
        this.mem.writebyte(tempaddr, this.z80.h);
        break;
      }
      case 0x95: {
        this.core.tstates += 8;
        this.z80.l = this.mem.readbyte(tempaddr) & 0xfb;
        this.mem.writebyte(tempaddr, this.z80.l);
        break;
      }
      case 0x96: {
        this.core.tstates += 8;
        this.mem.writebyte(tempaddr, this.mem.readbyte(tempaddr) & 0xfb);
        break;
      }
      case 0x97: {
        this.core.tstates += 8;
        this.z80.a = this.mem.readbyte(tempaddr) & 0xfb;
        this.mem.writebyte(tempaddr, this.z80.a);
        break;
      }
      case 0x98: {
        this.core.tstates += 8;
        this.z80.b = this.mem.readbyte(tempaddr) & 0xf7;
        this.mem.writebyte(tempaddr, this.z80.b);
        break;
      }
      case 0x99: {
        this.core.tstates += 8;
        this.z80.c = this.mem.readbyte(tempaddr) & 0xf7;
        this.mem.writebyte(tempaddr, this.z80.c);
        break;
      }
      case 0x9a: {
        this.core.tstates += 8;
        this.z80.d = this.mem.readbyte(tempaddr) & 0xf7;
        this.mem.writebyte(tempaddr, this.z80.d);
        break;
      }
      case 0x9b: {
        this.core.tstates += 8;
        this.z80.e = this.mem.readbyte(tempaddr) & 0xf7;
        this.mem.writebyte(tempaddr, this.z80.e);
        break;
      }
      case 0x9c: {
        this.core.tstates += 8;
        this.z80.h = this.mem.readbyte(tempaddr) & 0xf7;
        this.mem.writebyte(tempaddr, this.z80.h);
        break;
      }
      case 0x9d: {
        this.core.tstates += 8;
        this.z80.l = this.mem.readbyte(tempaddr) & 0xf7;
        this.mem.writebyte(tempaddr, this.z80.l);
        break;
      }
      case 0x9e: {
        this.core.tstates += 8;
        this.mem.writebyte(tempaddr, this.mem.readbyte(tempaddr) & 0xf7);
        break;
      }
      case 0x9f: {
        this.core.tstates += 8;
        this.z80.a = this.mem.readbyte(tempaddr) & 0xf7;
        this.mem.writebyte(tempaddr, this.z80.a);
        break;
      }
      case 0xa0: {
        this.core.tstates += 8;
        this.z80.b = this.mem.readbyte(tempaddr) & 0xef;
        this.mem.writebyte(tempaddr, this.z80.b);
        break;
      }
      case 0xa1: {
        this.core.tstates += 8;
        this.z80.c = this.mem.readbyte(tempaddr) & 0xef;
        this.mem.writebyte(tempaddr, this.z80.c);
        break;
      }
      case 0xa2: {
        this.core.tstates += 8;
        this.z80.d = this.mem.readbyte(tempaddr) & 0xef;
        this.mem.writebyte(tempaddr, this.z80.d);
        break;
      }
      case 0xa3: {
        this.core.tstates += 8;
        this.z80.e = this.mem.readbyte(tempaddr) & 0xef;
        this.mem.writebyte(tempaddr, this.z80.e);
        break;
      }
      case 0xa4: {
        this.core.tstates += 8;
        this.z80.h = this.mem.readbyte(tempaddr) & 0xef;
        this.mem.writebyte(tempaddr, this.z80.h);
        break;
      }
      case 0xa5: {
        this.core.tstates += 8;
        this.z80.l = this.mem.readbyte(tempaddr) & 0xef;
        this.mem.writebyte(tempaddr, this.z80.l);
        break;
      }
      case 0xa6: {
        this.core.tstates += 8;
        this.mem.writebyte(tempaddr, this.mem.readbyte(tempaddr) & 0xef);
        break;
      }
      case 0xa7: {
        this.core.tstates += 8;
        this.z80.a = this.mem.readbyte(tempaddr) & 0xef;
        this.mem.writebyte(tempaddr, this.z80.a);
        break;
      }
      case 0xa8: {
        this.core.tstates += 8;
        this.z80.b = this.mem.readbyte(tempaddr) & 0xdf;
        this.mem.writebyte(tempaddr, this.z80.b);
        break;
      }
      case 0xa9: {
        this.core.tstates += 8;
        this.z80.c = this.mem.readbyte(tempaddr) & 0xdf;
        this.mem.writebyte(tempaddr, this.z80.c);
        break;
      }
      case 0xaa: {
        this.core.tstates += 8;
        this.z80.d = this.mem.readbyte(tempaddr) & 0xdf;
        this.mem.writebyte(tempaddr, this.z80.d);
        break;
      }
      case 0xab: {
        this.core.tstates += 8;
        this.z80.e = this.mem.readbyte(tempaddr) & 0xdf;
        this.mem.writebyte(tempaddr, this.z80.e);
        break;
      }
      case 0xac: {
        this.core.tstates += 8;
        this.z80.h = this.mem.readbyte(tempaddr) & 0xdf;
        this.mem.writebyte(tempaddr, this.z80.h);
        break;
      }
      case 0xad: {
        this.core.tstates += 8;
        this.z80.l = this.mem.readbyte(tempaddr) & 0xdf;
        this.mem.writebyte(tempaddr, this.z80.l);
        break;
      }
      case 0xae: {
        this.core.tstates += 8;
        this.mem.writebyte(tempaddr, this.mem.readbyte(tempaddr) & 0xdf);
        break;
      }
      case 0xaf: {
        this.core.tstates += 8;
        this.z80.a = this.mem.readbyte(tempaddr) & 0xdf;
        this.mem.writebyte(tempaddr, this.z80.a);
        break;
      }
      case 0xb0: {
        this.core.tstates += 8;
        this.z80.b = this.mem.readbyte(tempaddr) & 0xbf;
        this.mem.writebyte(tempaddr, this.z80.b);
        break;
      }
      case 0xb1: {
        this.core.tstates += 8;
        this.z80.c = this.mem.readbyte(tempaddr) & 0xbf;
        this.mem.writebyte(tempaddr, this.z80.c);
        break;
      }
      case 0xb2: {
        this.core.tstates += 8;
        this.z80.d = this.mem.readbyte(tempaddr) & 0xbf;
        this.mem.writebyte(tempaddr, this.z80.d);
        break;
      }
      case 0xb3: {
        this.core.tstates += 8;
        this.z80.e = this.mem.readbyte(tempaddr) & 0xbf;
        this.mem.writebyte(tempaddr, this.z80.e);
        break;
      }
      case 0xb4: {
        this.core.tstates += 8;
        this.z80.h = this.mem.readbyte(tempaddr) & 0xbf;
        this.mem.writebyte(tempaddr, this.z80.h);
        break;
      }
      case 0xb5: {
        this.core.tstates += 8;
        this.z80.l = this.mem.readbyte(tempaddr) & 0xbf;
        this.mem.writebyte(tempaddr, this.z80.l);
        break;
      }
      case 0xb6: {
        this.core.tstates += 8;
        this.mem.writebyte(tempaddr, this.mem.readbyte(tempaddr) & 0xbf);
        break;
      }
      case 0xb7: {
        this.core.tstates += 8;
        this.z80.a = this.mem.readbyte(tempaddr) & 0xbf;
        this.mem.writebyte(tempaddr, this.z80.a);
        break;
      }
      case 0xb8: {
        this.core.tstates += 8;
        this.z80.b = this.mem.readbyte(tempaddr) & 0x7f;
        this.mem.writebyte(tempaddr, this.z80.b);
        break;
      }
      case 0xb9: {
        this.core.tstates += 8;
        this.z80.c = this.mem.readbyte(tempaddr) & 0x7f;
        this.mem.writebyte(tempaddr, this.z80.c);
        break;
      }
      case 0xba: {
        this.core.tstates += 8;
        this.z80.d = this.mem.readbyte(tempaddr) & 0x7f;
        this.mem.writebyte(tempaddr, this.z80.d);
        break;
      }
      case 0xbb: {
        this.core.tstates += 8;
        this.z80.e = this.mem.readbyte(tempaddr) & 0x7f;
        this.mem.writebyte(tempaddr, this.z80.e);
        break;
      }
      case 0xbc: {
        this.core.tstates += 8;
        this.z80.h = this.mem.readbyte(tempaddr) & 0x7f;
        this.mem.writebyte(tempaddr, this.z80.h);
        break;
      }
      case 0xbd: {
        this.core.tstates += 8;
        this.z80.l = this.mem.readbyte(tempaddr) & 0x7f;
        this.mem.writebyte(tempaddr, this.z80.l);
        break;
      }
      case 0xbe: {
        this.core.tstates += 8;
        this.mem.writebyte(tempaddr, this.mem.readbyte(tempaddr) & 0x7f);
        break;
      }
      case 0xbf: {
        this.core.tstates += 8;
        this.z80.a = this.mem.readbyte(tempaddr) & 0x7f;
        this.mem.writebyte(tempaddr, this.z80.a);
        break;
      }
      case 0xc0: {
        this.core.tstates += 8;
        this.z80.b = this.mem.readbyte(tempaddr) | 0x01;
        this.mem.writebyte(tempaddr, this.z80.b);
        break;
      }
      case 0xc1: {
        this.core.tstates += 8;
        this.z80.c = this.mem.readbyte(tempaddr) | 0x01;
        this.mem.writebyte(tempaddr, this.z80.c);
        break;
      }
      case 0xc2: {
        this.core.tstates += 8;
        this.z80.d = this.mem.readbyte(tempaddr) | 0x01;
        this.mem.writebyte(tempaddr, this.z80.d);
        break;
      }
      case 0xc3: {
        this.core.tstates += 8;
        this.z80.e = this.mem.readbyte(tempaddr) | 0x01;
        this.mem.writebyte(tempaddr, this.z80.e);
        break;
      }
      case 0xc4: {
        this.core.tstates += 8;
        this.z80.h = this.mem.readbyte(tempaddr) | 0x01;
        this.mem.writebyte(tempaddr, this.z80.h);
        break;
      }
      case 0xc5: {
        this.core.tstates += 8;
        this.z80.l = this.mem.readbyte(tempaddr) | 0x01;
        this.mem.writebyte(tempaddr, this.z80.l);
        break;
      }
      case 0xc6: {
        this.core.tstates += 8;
        this.mem.writebyte(tempaddr, this.mem.readbyte(tempaddr) | 0x01);
        break;
      }
      case 0xc7: {
        this.core.tstates += 8;
        this.z80.a = this.mem.readbyte(tempaddr) | 0x01;
        this.mem.writebyte(tempaddr, this.z80.a);
        break;
      }
      case 0xc8: {
        this.core.tstates += 8;
        this.z80.b = this.mem.readbyte(tempaddr) | 0x02;
        this.mem.writebyte(tempaddr, this.z80.b);
        break;
      }
      case 0xc9: {
        this.core.tstates += 8;
        this.z80.c = this.mem.readbyte(tempaddr) | 0x02;
        this.mem.writebyte(tempaddr, this.z80.c);
        break;
      }
      case 0xca: {
        this.core.tstates += 8;
        this.z80.d = this.mem.readbyte(tempaddr) | 0x02;
        this.mem.writebyte(tempaddr, this.z80.d);
        break;
      }
      case 0xcb: {
        this.core.tstates += 8;
        this.z80.e = this.mem.readbyte(tempaddr) | 0x02;
        this.mem.writebyte(tempaddr, this.z80.e);
        break;
      }
      case 0xcc: {
        this.core.tstates += 8;
        this.z80.h = this.mem.readbyte(tempaddr) | 0x02;
        this.mem.writebyte(tempaddr, this.z80.h);
        break;
      }
      case 0xcd: {
        this.core.tstates += 8;
        this.z80.l = this.mem.readbyte(tempaddr) | 0x02;
        this.mem.writebyte(tempaddr, this.z80.l);
        break;
      }
      case 0xce: {
        this.core.tstates += 8;
        this.mem.writebyte(tempaddr, this.mem.readbyte(tempaddr) | 0x02);
        break;
      }
      case 0xcf: {
        this.core.tstates += 8;
        this.z80.a = this.mem.readbyte(tempaddr) | 0x02;
        this.mem.writebyte(tempaddr, this.z80.a);
        break;
      }
      case 0xd0: {
        this.core.tstates += 8;
        this.z80.b = this.mem.readbyte(tempaddr) | 0x04;
        this.mem.writebyte(tempaddr, this.z80.b);
        break;
      }
      case 0xd1: {
        this.core.tstates += 8;
        this.z80.c = this.mem.readbyte(tempaddr) | 0x04;
        this.mem.writebyte(tempaddr, this.z80.c);
        break;
      }
      case 0xd2: {
        this.core.tstates += 8;
        this.z80.d = this.mem.readbyte(tempaddr) | 0x04;
        this.mem.writebyte(tempaddr, this.z80.d);
        break;
      }
      case 0xd3: {
        this.core.tstates += 8;
        this.z80.e = this.mem.readbyte(tempaddr) | 0x04;
        this.mem.writebyte(tempaddr, this.z80.e);
        break;
      }
      case 0xd4: {
        this.core.tstates += 8;
        this.z80.h = this.mem.readbyte(tempaddr) | 0x04;
        this.mem.writebyte(tempaddr, this.z80.h);
        break;
      }
      case 0xd5: {
        this.core.tstates += 8;
        this.z80.l = this.mem.readbyte(tempaddr) | 0x04;
        this.mem.writebyte(tempaddr, this.z80.l);
        break;
      }
      case 0xd6: {
        this.core.tstates += 8;
        this.mem.writebyte(tempaddr, this.mem.readbyte(tempaddr) | 0x04);
        break;
      }
      case 0xd7: {
        this.core.tstates += 8;
        this.z80.a = this.mem.readbyte(tempaddr) | 0x04;
        this.mem.writebyte(tempaddr, this.z80.a);
        break;
      }
      case 0xd8: {
        this.core.tstates += 8;
        this.z80.b = this.mem.readbyte(tempaddr) | 0x08;
        this.mem.writebyte(tempaddr, this.z80.b);
        break;
      }
      case 0xd9: {
        this.core.tstates += 8;
        this.z80.c = this.mem.readbyte(tempaddr) | 0x08;
        this.mem.writebyte(tempaddr, this.z80.c);
        break;
      }
      case 0xda: {
        this.core.tstates += 8;
        this.z80.d = this.mem.readbyte(tempaddr) | 0x08;
        this.mem.writebyte(tempaddr, this.z80.d);
        break;
      }
      case 0xdb: {
        this.core.tstates += 8;
        this.z80.e = this.mem.readbyte(tempaddr) | 0x08;
        this.mem.writebyte(tempaddr, this.z80.e);
        break;
      }
      case 0xdc: {
        this.core.tstates += 8;
        this.z80.h = this.mem.readbyte(tempaddr) | 0x08;
        this.mem.writebyte(tempaddr, this.z80.h);
        break;
      }
      case 0xdd: {
        this.core.tstates += 8;
        this.z80.l = this.mem.readbyte(tempaddr) | 0x08;
        this.mem.writebyte(tempaddr, this.z80.l);
        break;
      }
      case 0xde: {
        this.core.tstates += 8;
        this.mem.writebyte(tempaddr, this.mem.readbyte(tempaddr) | 0x08);
        break;
      }
      case 0xdf: {
        this.core.tstates += 8;
        this.z80.a = this.mem.readbyte(tempaddr) | 0x08;
        this.mem.writebyte(tempaddr, this.z80.a);
        break;
      }
      case 0xe0: {
        this.core.tstates += 8;
        this.z80.b = this.mem.readbyte(tempaddr) | 0x10;
        this.mem.writebyte(tempaddr, this.z80.b);
        break;
      }
      case 0xe1: {
        this.core.tstates += 8;
        this.z80.c = this.mem.readbyte(tempaddr) | 0x10;
        this.mem.writebyte(tempaddr, this.z80.c);
        break;
      }
      case 0xe2: {
        this.core.tstates += 8;
        this.z80.d = this.mem.readbyte(tempaddr) | 0x10;
        this.mem.writebyte(tempaddr, this.z80.d);
        break;
      }
      case 0xe3: {
        this.core.tstates += 8;
        this.z80.e = this.mem.readbyte(tempaddr) | 0x10;
        this.mem.writebyte(tempaddr, this.z80.e);
        break;
      }
      case 0xe4: {
        this.core.tstates += 8;
        this.z80.h = this.mem.readbyte(tempaddr) | 0x10;
        this.mem.writebyte(tempaddr, this.z80.h);
        break;
      }
      case 0xe5: {
        this.core.tstates += 8;
        this.z80.l = this.mem.readbyte(tempaddr) | 0x10;
        this.mem.writebyte(tempaddr, this.z80.l);
        break;
      }
      case 0xe6: {
        this.core.tstates += 8;
        this.mem.writebyte(tempaddr, this.mem.readbyte(tempaddr) | 0x10);
        break;
      }
      case 0xe7: {
        this.core.tstates += 8;
        this.z80.a = this.mem.readbyte(tempaddr) | 0x10;
        this.mem.writebyte(tempaddr, this.z80.a);
        break;
      }
      case 0xe8: {
        this.core.tstates += 8;
        this.z80.b = this.mem.readbyte(tempaddr) | 0x20;
        this.mem.writebyte(tempaddr, this.z80.b);
        break;
      }
      case 0xe9: {
        this.core.tstates += 8;
        this.z80.c = this.mem.readbyte(tempaddr) | 0x20;
        this.mem.writebyte(tempaddr, this.z80.c);
        break;
      }
      case 0xea: {
        this.core.tstates += 8;
        this.z80.d = this.mem.readbyte(tempaddr) | 0x20;
        this.mem.writebyte(tempaddr, this.z80.d);
        break;
      }
      case 0xeb: {
        this.core.tstates += 8;
        this.z80.e = this.mem.readbyte(tempaddr) | 0x20;
        this.mem.writebyte(tempaddr, this.z80.e);
        break;
      }
      case 0xec: {
        this.core.tstates += 8;
        this.z80.h = this.mem.readbyte(tempaddr) | 0x20;
        this.mem.writebyte(tempaddr, this.z80.h);
        break;
      }
      case 0xed: {
        this.core.tstates += 8;
        this.z80.l = this.mem.readbyte(tempaddr) | 0x20;
        this.mem.writebyte(tempaddr, this.z80.l);
        break;
      }
      case 0xee: {
        this.core.tstates += 8;
        this.mem.writebyte(tempaddr, this.mem.readbyte(tempaddr) | 0x20);
        break;
      }
      case 0xef: {
        this.core.tstates += 8;
        this.z80.a = this.mem.readbyte(tempaddr) | 0x20;
        this.mem.writebyte(tempaddr, this.z80.a);
        break;
      }
      case 0xf0: {
        this.core.tstates += 8;
        this.z80.b = this.mem.readbyte(tempaddr) | 0x40;
        this.mem.writebyte(tempaddr, this.z80.b);
        break;
      }
      case 0xf1: {
        this.core.tstates += 8;
        this.z80.c = this.mem.readbyte(tempaddr) | 0x40;
        this.mem.writebyte(tempaddr, this.z80.c);
        break;
      }
      case 0xf2: {
        this.core.tstates += 8;
        this.z80.d = this.mem.readbyte(tempaddr) | 0x40;
        this.mem.writebyte(tempaddr, this.z80.d);
        break;
      }
      case 0xf3: {
        this.core.tstates += 8;
        this.z80.e = this.mem.readbyte(tempaddr) | 0x40;
        this.mem.writebyte(tempaddr, this.z80.e);
        break;
      }
      case 0xf4: {
        this.core.tstates += 8;
        this.z80.h = this.mem.readbyte(tempaddr) | 0x40;
        this.mem.writebyte(tempaddr, this.z80.h);
        break;
      }
      case 0xf5: {
        this.core.tstates += 8;
        this.z80.l = this.mem.readbyte(tempaddr) | 0x40;
        this.mem.writebyte(tempaddr, this.z80.l);
        break;
      }
      case 0xf6: {
        this.core.tstates += 8;
        this.mem.writebyte(tempaddr, this.mem.readbyte(tempaddr) | 0x40);
        break;
      }
      case 0xf7: {
        this.core.tstates += 8;
        this.z80.a = this.mem.readbyte(tempaddr) | 0x40;
        this.mem.writebyte(tempaddr, this.z80.a);
        break;
      }
      case 0xf8: {
        this.core.tstates += 8;
        this.z80.b = this.mem.readbyte(tempaddr) | 0x80;
        this.mem.writebyte(tempaddr, this.z80.b);
        break;
      }
      case 0xf9: {
        this.core.tstates += 8;
        this.z80.c = this.mem.readbyte(tempaddr) | 0x80;
        this.mem.writebyte(tempaddr, this.z80.c);
        break;
      }
      case 0xfa: {
        this.core.tstates += 8;
        this.z80.d = this.mem.readbyte(tempaddr) | 0x80;
        this.mem.writebyte(tempaddr, this.z80.d);
        break;
      }
      case 0xfb: {
        this.core.tstates += 8;
        this.z80.e = this.mem.readbyte(tempaddr) | 0x80;
        this.mem.writebyte(tempaddr, this.z80.e);
        break;
      }
      case 0xfc: {
        this.core.tstates += 8;
        this.z80.h = this.mem.readbyte(tempaddr) | 0x80;
        this.mem.writebyte(tempaddr, this.z80.h);
        break;
      }
      case 0xfd: {
        this.core.tstates += 8;
        this.z80.l = this.mem.readbyte(tempaddr) | 0x80;
        this.mem.writebyte(tempaddr, this.z80.l);
        break;
      }
      case 0xfe: {
        this.core.tstates += 8;
        this.mem.writebyte(tempaddr, this.mem.readbyte(tempaddr) | 0x80);
        break;
      }
      case 0xff: {
        this.core.tstates += 8;
        this.z80.a = this.mem.readbyte(tempaddr) | 0x80;
        this.mem.writebyte(tempaddr, this.z80.a);
        break;
      }

      case 0x40:
      case 0x41:
      case 0x42:
      case 0x43:
      case 0x44:
      case 0x45:
      case 0x46:
      case 0x47: {
        this.core.tstates += 5;
        {
          var bytetemp = this.mem.readbyte(tempaddr);
          {
            this.z80.f = (this.z80.f & 0x01) | 0x10 | ((tempaddr >> 8) & (0x08 | 0x20));
            if (!(bytetemp & (0x01 << 0))) this.z80.f |= 0x04 | 0x40;
            if (0 == 7 && bytetemp & 0x80) this.z80.f |= 0x80;
          }
        }
        break;
      }
      case 0x48:
      case 0x49:
      case 0x4a:
      case 0x4b:
      case 0x4c:
      case 0x4d:
      case 0x4e:
      case 0x4f: {
        this.core.tstates += 5;
        {
          var bytetemp = this.mem.readbyte(tempaddr);
          {
            this.z80.f = (this.z80.f & 0x01) | 0x10 | ((tempaddr >> 8) & (0x08 | 0x20));
            if (!(bytetemp & (0x01 << 1))) this.z80.f |= 0x04 | 0x40;
            if (1 == 7 && bytetemp & 0x80) this.z80.f |= 0x80;
          }
        }
        break;
      }
      case 0x50:
      case 0x51:
      case 0x52:
      case 0x53:
      case 0x54:
      case 0x55:
      case 0x56:
      case 0x57: {
        this.core.tstates += 5;
        {
          var bytetemp = this.mem.readbyte(tempaddr);
          {
            this.z80.f = (this.z80.f & 0x01) | 0x10 | ((tempaddr >> 8) & (0x08 | 0x20));
            if (!(bytetemp & (0x01 << 2))) this.z80.f |= 0x04 | 0x40;
            if (2 == 7 && bytetemp & 0x80) this.z80.f |= 0x80;
          }
        }
        break;
      }
      case 0x58:
      case 0x59:
      case 0x5a:
      case 0x5b:
      case 0x5c:
      case 0x5d:
      case 0x5e:
      case 0x5f: {
        this.core.tstates += 5;
        {
          var bytetemp = this.mem.readbyte(tempaddr);
          {
            this.z80.f = (this.z80.f & 0x01) | 0x10 | ((tempaddr >> 8) & (0x08 | 0x20));
            if (!(bytetemp & (0x01 << 3))) this.z80.f |= 0x04 | 0x40;
            if (3 == 7 && bytetemp & 0x80) this.z80.f |= 0x80;
          }
        }
        break;
      }
      case 0x60:
      case 0x61:
      case 0x62:
      case 0x63:
      case 0x64:
      case 0x65:
      case 0x66:
      case 0x67: {
        this.core.tstates += 5;
        {
          var bytetemp = this.mem.readbyte(tempaddr);
          {
            this.z80.f = (this.z80.f & 0x01) | 0x10 | ((tempaddr >> 8) & (0x08 | 0x20));
            if (!(bytetemp & (0x01 << 4))) this.z80.f |= 0x04 | 0x40;
            if (4 == 7 && bytetemp & 0x80) this.z80.f |= 0x80;
          }
        }
        break;
      }
      case 0x68:
      case 0x69:
      case 0x6a:
      case 0x6b:
      case 0x6c:
      case 0x6d:
      case 0x6e:
      case 0x6f: {
        this.core.tstates += 5;
        {
          var bytetemp = this.mem.readbyte(tempaddr);
          {
            this.z80.f = (this.z80.f & 0x01) | 0x10 | ((tempaddr >> 8) & (0x08 | 0x20));
            if (!(bytetemp & (0x01 << 5))) this.z80.f |= 0x04 | 0x40;
            if (5 == 7 && bytetemp & 0x80) this.z80.f |= 0x80;
          }
        }
        break;
      }
      case 0x70:
      case 0x71:
      case 0x72:
      case 0x73:
      case 0x74:
      case 0x75:
      case 0x76:
      case 0x77: {
        this.core.tstates += 5;
        {
          var bytetemp = this.mem.readbyte(tempaddr);
          {
            this.z80.f = (this.z80.f & 0x01) | 0x10 | ((tempaddr >> 8) & (0x08 | 0x20));
            if (!(bytetemp & (0x01 << 6))) this.z80.f |= 0x04 | 0x40;
            if (6 == 7 && bytetemp & 0x80) this.z80.f |= 0x80;
          }
        }
        break;
      }
      case 0x78:
      case 0x79:
      case 0x7a:
      case 0x7b:
      case 0x7c:
      case 0x7d:
      case 0x7e:
      case 0x7f: {
        this.core.tstates += 5;
        {
          var bytetemp = this.mem.readbyte(tempaddr);
          {
            this.z80.f = (this.z80.f & 0x01) | 0x10 | ((tempaddr >> 8) & (0x08 | 0x20));
            if (!(bytetemp & (0x01 << 7))) this.z80.f |= 0x04 | 0x40;
            if (7 == 7 && bytetemp & 0x80) this.z80.f |= 0x80;
          }
        }
        break;
      }
      case 256: {
        break;
      }
    }
  };
  z80_instructions(opecode) {
    const output = {
      opecode: opecode.toString(16),
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
  }
  showInfo(pc, opcode) {
    let rval = this.z80_instructions(opcode);
    console.log("");
    console.log("PC      : " + this.toHex(pc));
    console.log("OPCODE  : " + rval.opCode);
    console.log("OPHEX   : " + this.toHex(opcode));
  }
  toHex(v) {
    return "0x" + ("0000" + v.toString(16).toUpperCase()).substr(-4);
  }
  sign_extend(v) {
    return v < 128 ? v : v - 256;
  }
  byteTable(values) {
    var result = new Uint8Array(values.length);
    for (var i = 0; i < values.length; ++i) {
      result[i] = values[i];
    }
    return result;
  }
}
