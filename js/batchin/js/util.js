/* util.js — helper DOM, format, dan validasi. */
window.PO = window.PO || {};

PO.util = (function () {
  var MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  /* ---------- DOM ---------- */
  function h(tag, props) {
    var node = document.createElement(tag);
    var children = Array.prototype.slice.call(arguments, 2);
    if (props) {
      Object.keys(props).forEach(function (key) {
        var value = props[key];
        if (value === null || value === undefined || value === false) return;
        if (key === 'class') node.className = value;
        else if (key === 'html') node.innerHTML = value;
        else if (key === 'style') node.setAttribute('style', value);
        else if (key.indexOf('on') === 0 && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
        else if (key === 'dataset') Object.keys(value).forEach(function (d) { node.dataset[d] = value[d]; });
        else if (key in node && key !== 'list' && key !== 'form') node[key] = value;
        else node.setAttribute(key, value === true ? '' : value);
      });
    }
    appendChildren(node, children);
    return node;
  }

  function appendChildren(node, children) {
    children.forEach(function (child) {
      if (child === null || child === undefined || child === false) return;
      if (Array.isArray(child)) appendChildren(node, child);
      else if (child instanceof Node) node.appendChild(child);
      else node.appendChild(document.createTextNode(String(child)));
    });
  }

  function frag(children) {
    var f = document.createDocumentFragment();
    appendChildren(f, Array.isArray(children) ? children : [children]);
    return f;
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

  /* ---------- format ---------- */
  function rupiah(value) {
    var n = Math.round(Number(value) || 0);
    var neg = n < 0;
    var digits = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '−Rp ' : 'Rp ') + digits;
  }

  function compactRupiah(value) {
    var n = Math.abs(Math.round(Number(value) || 0));
    var sign = Number(value) < 0 ? '−' : '';
    if (n >= 1000000000) return sign + 'Rp ' + trimZero(n / 1000000000) + ' M';
    if (n >= 1000000) return sign + 'Rp ' + trimZero(n / 1000000) + ' jt';
    if (n >= 1000) return sign + 'Rp ' + trimZero(n / 1000) + ' rb';
    return sign + 'Rp ' + n;
  }

  function trimZero(n) {
    return (Math.round(n * 10) / 10).toString().replace('.', ',');
  }

  function number(value) {
    return String(Math.round(Number(value) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function percent(value, digits) {
    var n = Number(value) || 0;
    var d = digits === undefined ? 0 : digits;
    return (Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toString().replace('.', ',') + '%';
  }

  function initials(name) {
    return String(name || '?')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(function (w) { return w.charAt(0).toUpperCase(); })
      .join('');
  }

  function firstName(name) {
    return String(name || '').trim().split(/\s+/)[0] || '';
  }

  /* ---------- tanggal ---------- */
  function startOfDay(date) {
    var d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function iso(date) { return date.toISOString(); }
  function today() { return startOfDay(new Date()); }

  function addDays(date, days) {
    var d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  }

  function startOfMonth(date) {
    var d = startOfDay(date);
    d.setDate(1);
    return d;
  }

  function addMonths(date, months) {
    var d = new Date(date.getTime());
    d.setDate(1);
    d.setMonth(d.getMonth() + months);
    return d;
  }

  function monthKey(date) {
    var d = new Date(date.getTime());
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function dateID(date) {
    if (!date) return '—';
    var d = new Date(date);
    return d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear();
  }

  function dateShort(date) {
    if (!date) return '—';
    var d = new Date(date);
    return d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()];
  }

  function dateTimeID(date) {
    if (!date) return '—';
    var d = new Date(date);
    return dateID(d) + ' · ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function monthLabel(date) {
    var d = new Date(date);
    return MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }

  function monthLabelShort(date) {
    var d = new Date(date);
    return MONTHS_SHORT[d.getMonth()];
  }

  function weekdayShort(date) {
    return DAYS_SHORT[new Date(date).getDay()];
  }

  function daysBetween(from, to) {
    if (!from || !to) return 0;
    return (startOfDay(new Date(to)) - startOfDay(new Date(from))) / 86400000;
  }

  function relativeDay(date) {
    if (!date) return '—';
    var diff = daysBetween(new Date(), date);
    if (diff === 0) return 'Hari ini';
    if (diff === 1) return 'Besok';
    if (diff === -1) return 'Kemarin';
    if (diff < 0) return Math.abs(diff) + ' hari lalu';
    return diff + ' hari lagi';
  }

  /* ---------- validasi ---------- */
  function digitsOnly(value) {
    return String(value === null || value === undefined ? '' : value).replace(/[^\d]/g, '');
  }

  function validateName(value) {
    var v = String(value || '').trim();
    if (!v) return 'Nama pelanggan wajib diisi.';
    if (v.length < 3) return 'Nama minimal 3 karakter.';
    if (v.length > 60) return 'Nama maksimal 60 karakter.';
    return '';
  }

  function validatePhone(value) {
    var raw = String(value || '').trim();
    if (!raw) return 'Nomor WhatsApp wajib diisi.';
    if (/[^\d\s\-+]/.test(raw)) return 'Nomor hanya boleh berisi angka.';
    var d = digitsOnly(raw);
    if (d.length < 10) return 'Nomor minimal 10 digit (' + d.length + ' digit saat ini).';
    if (d.length > 13) return 'Nomor maksimal 13 digit (' + d.length + ' digit saat ini).';
    return '';
  }

  function validateQty(value, min, max) {
    var raw = String(value === null || value === undefined ? '' : value).trim();
    if (!raw) return 'Jumlah wajib diisi.';
    if (!/^\d+$/.test(raw)) return 'Jumlah harus berupa angka bulat.';
    var n = Number(raw);
    if (n < (min || 1)) return 'Jumlah minimal ' + (min || 1) + '.';
    if (max && n > max) return 'Jumlah maksimal ' + max + '.';
    return '';
  }

  function validateMoney(value) {
    var raw = String(value === null || value === undefined ? '' : value).trim();
    if (!raw) return 'Nominal wajib diisi.';
    if (!/^\d+$/.test(raw)) return 'Nominal hanya boleh berisi angka.';
    if (Number(raw) <= 0) return 'Nominal harus lebih dari 0.';
    if (Number(raw) > 1000000000) return 'Nominal terlalu besar.';
    return '';
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  }

  function truncate(str, max) {
    var s = String(str || '');
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
  }

  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

  function sum(list, pick) {
    return list.reduce(function (acc, item) { return acc + (pick ? Number(pick(item)) || 0 : Number(item) || 0); }, 0);
  }

  function groupBy(list, pick) {
    var map = {};
    list.forEach(function (item) {
      var key = pick(item);
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });
    return map;
  }

  function uid(prefix) {
    return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function pad(n, len) { return String(n).padStart(len || 3, '0'); }

  return {
    MONTHS: MONTHS,
    MONTHS_SHORT: MONTHS_SHORT,
    h: h, frag: frag, $: $, $$: $$, clear: clear,
    rupiah: rupiah, compactRupiah: compactRupiah, number: number, percent: percent,
    initials: initials, firstName: firstName, truncate: truncate,
    startOfDay: startOfDay, today: today, iso: iso, addDays: addDays,
    startOfMonth: startOfMonth, addMonths: addMonths, monthKey: monthKey,
    dateID: dateID, dateShort: dateShort, dateTimeID: dateTimeID,
    monthLabel: monthLabel, monthLabelShort: monthLabelShort, weekdayShort: weekdayShort,
    daysBetween: daysBetween, relativeDay: relativeDay,
    digitsOnly: digitsOnly,
    validateName: validateName, validatePhone: validatePhone, validateQty: validateQty,
    validateMoney: validateMoney, isEmail: isEmail,
    clamp: clamp, sum: sum, groupBy: groupBy, uid: uid, pad: pad
  };
})();
