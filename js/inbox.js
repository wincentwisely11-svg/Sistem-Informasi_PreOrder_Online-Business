/* inbox.js — kotak masuk pesanan online. Lapisan data tunggal: ganti isinya dengan API (Supabase/Firebase) nanti. */
window.PO = window.PO || {};
PO.inbox = (function () {
  var KEY = 'batchin.inbox.v1';

  function read() {
    try { var r = JSON.parse(window.localStorage.getItem(KEY)); return Array.isArray(r) ? r : []; } catch (err) { return []; }
  }
  function write(list) {
    try { window.localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (err) { return false; }
  }
  function add(rec) {
    var list = read(), max = 0;
    list.forEach(function (r) { var n = parseInt(String(r.id).replace(/\D/g, ''), 10); if (!isNaN(n) && n > max) max = n; });
    rec.id = 'INB-' + PO.util.pad(max + 1, 4);
    rec.createdAt = new Date().toISOString();
    rec.status = 'pending';
    list.push(rec);
    return write(list) ? rec : null;
  }
  function update(id, patch) {
    var list = read();
    list.forEach(function (r) { if (r.id === id) Object.keys(patch).forEach(function (k) { r[k] = patch[k]; }); });
    write(list);
  }
  function list() { return read(); }
  function pendingCount() { return read().filter(function (r) { return r.status === 'pending'; }).length; }

  /* kode di akhir pesan WhatsApp agar pesanan bisa diimpor pemilik tanpa server */
  function encode(rec) {
    var json = JSON.stringify({ n: rec.name, p: rec.phone, i: rec.productId, q: rec.qty, t: rec.note || '' });
    return '[Batchin#' + btoa(unescape(encodeURIComponent(json))) + ']';
  }
  function decode(text) {
    var m = /\[Batchin#([A-Za-z0-9+\/=]+)\]/.exec(text || '');
    if (!m) return null;
    try {
      var o = JSON.parse(decodeURIComponent(escape(atob(m[1]))));
      return { name: o.n, phone: o.p, productId: o.i, qty: Number(o.q), note: o.t || '' };
    } catch (err) { return null; }
  }

  return { KEY: KEY, add: add, update: update, list: list, pendingCount: pendingCount, encode: encode, decode: decode };
})();
