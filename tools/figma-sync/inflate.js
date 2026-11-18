// raw deflate 풀기 (tiny-inflate 방식) + UTF-8 글자로
function inflateRaw(src) {
  const out = [];
  let tag = 0, bitcount = 0, pos = 0;
  const getbit = () => { if (!bitcount--) { tag = src[pos++]; bitcount = 7; } const b = tag & 1; tag >>>= 1; return b; };
  const readbits = (num, base) => { if (!num) return base; let val = 0; for (let i = 0; i < num; i++) val |= getbit() << i; return val + base; };
  const mkTree = () => ({ table: new Uint16Array(16), trans: new Uint16Array(288) });
  const build = (t, lengths, off, num) => {
    const offs = new Uint16Array(16);
    t.table.fill(0);
    for (let i = 0; i < num; i++) t.table[lengths[off + i]]++;
    t.table[0] = 0;
    for (let sum = 0, i = 0; i < 16; i++) { offs[i] = sum; sum += t.table[i]; }
    for (let i = 0; i < num; i++) if (lengths[off + i]) t.trans[offs[lengths[off + i]]++] = i;
  };
  const decodeSym = (t) => {
    let sum = 0, cur = 0, len = 0;
    do { cur = 2 * cur + getbit(); len++; sum += t.table[len]; cur -= t.table[len]; } while (cur >= 0);
    return t.trans[sum + cur];
  };
  const lb = new Uint8Array(30), lbase = new Uint16Array(30), db = new Uint8Array(30), dbase = new Uint16Array(30);
  const bits = (b, base, delta, first) => {
    for (let i = 0; i < delta; i++) b[i] = 0;
    for (let i = 0; i < 30 - delta; i++) b[i + delta] = (i / delta) | 0;
    for (let sum = first, i = 0; i < 30; i++) { base[i] = sum; sum += 1 << b[i]; }
  };
  bits(lb, lbase, 4, 3); bits(db, dbase, 2, 1);
  lb[28] = 0; lbase[28] = 258;
  const sl = mkTree(), sd = mkTree();
  (function () {
    for (let i = 0; i < 7; i++) sl.table[i] = 0;
    sl.table[7] = 24; sl.table[8] = 152; sl.table[9] = 112;
    for (let i = 0; i < 24; i++) sl.trans[i] = 256 + i;
    for (let i = 0; i < 144; i++) sl.trans[24 + i] = i;
    for (let i = 0; i < 8; i++) sl.trans[24 + 144 + i] = 280 + i;
    for (let i = 0; i < 112; i++) sl.trans[24 + 144 + 8 + i] = 144 + i;
    for (let i = 0; i < 5; i++) sd.table[i] = 0;
    sd.table[5] = 32;
    for (let i = 0; i < 32; i++) sd.trans[i] = i;
  })();
  const clcidx = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
  const dynTrees = (lt, dt) => {
    const lengths = new Uint8Array(320);
    const hlit = readbits(5, 257), hdist = readbits(5, 1), hclen = readbits(4, 4);
    for (let i = 0; i < 19; i++) lengths[i] = 0;
    for (let i = 0; i < hclen; i++) lengths[clcidx[i]] = readbits(3, 0);
    const ct = mkTree(); build(ct, lengths, 0, 19);
    for (let num = 0; num < hlit + hdist;) {
      const sym = decodeSym(ct);
      let prev, len;
      switch (sym) {
        case 16: prev = lengths[num - 1]; for (len = readbits(2, 3); len; --len) lengths[num++] = prev; break;
        case 17: for (len = readbits(3, 3); len; --len) lengths[num++] = 0; break;
        case 18: for (len = readbits(7, 11); len; --len) lengths[num++] = 0; break;
        default: lengths[num++] = sym;
      }
    }
    build(lt, lengths, 0, hlit); build(dt, lengths, hlit, hdist);
  };
  const block = (lt, dt) => {
    for (;;) {
      let sym = decodeSym(lt);
      if (sym === 256) return;
      if (sym < 256) out.push(sym);
      else {
        sym -= 257;
        const len = readbits(lb[sym], lbase[sym]);
        const ds = decodeSym(dt);
        const offs = out.length - readbits(db[ds], dbase[ds]);
        for (let i = offs; i < offs + len; i++) out.push(out[i]);
      }
    }
  };
  let bfinal;
  do {
    bfinal = getbit();
    const btype = readbits(2, 0);
    if (btype === 0) {
      bitcount = 0; // 바이트 경계로
      const len = src[pos] | (src[pos + 1] << 8); pos += 4;
      for (let i = 0; i < len; i++) out.push(src[pos++]);
    } else if (btype === 1) block(sl, sd);
    else { const lt = mkTree(), dt = mkTree(); dynTrees(lt, dt); block(lt, dt); }
  } while (!bfinal);
  return out;
}
function utf8(bytes) {
  let s = '', i = 0;
  while (i < bytes.length) {
    const c = bytes[i++];
    let cp;
    if (c < 0x80) cp = c;
    else if (c < 0xe0) cp = ((c & 0x1f) << 6) | (bytes[i++] & 0x3f);
    else if (c < 0xf0) cp = ((c & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
    else cp = ((c & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
    s += String.fromCodePoint(cp);
  }
  return s;
}
const unpack = (b64) => JSON.parse(utf8(inflateRaw(figma.base64Decode(b64))));
