/* estimate.js — status PO per produk dan estimasi tanggal siap. */
window.PO = window.PO || {};

/* Status buka/tutup PO sebuah produk: ditutup manual, atau otomatis setelah tanggal tertentu. */
PO.poState = function (p) {
  var U = PO.util;
  if (p.poOpen === false) return { open: false, reason: 'manual', text: 'PO ditutup' };
  if (p.poCloseDate && new Date(p.poCloseDate + 'T23:59:59') < new Date()) return { open: false, reason: 'date', text: 'PO ditutup otomatis (' + U.dateID(p.poCloseDate) + ')' };
  return { open: true, reason: '', text: p.poCloseDate ? 'PO dibuka sampai ' + U.dateID(p.poCloseDate) : 'PO dibuka' };
};

/* Estimasi siap: tanggal tetap dari pemilik (readyDate) bila ada, selain itu dihitung dari kuota batch. */
PO.estimate = function (state, productId, qty) {
  var U = PO.util;
  var p = state.products.filter(function (x) { return x.id === productId; })[0];
  if (!p) return { fills: false, date: null, remaining: 0, text: '' };
  var cap = p.batchQuota || state.settings.batchQuota || 1, waiting = 0;
  state.orders.forEach(function (o) { if (o.status === 'waiting' && o.productId === productId) waiting += o.qty; });
  var total = waiting + (Number(qty) || 0), lead = state.settings.leadDays || 3;

  if (p.readyDate) {
    var fixed = new Date(p.readyDate + 'T12:00:00');
    if (fixed >= U.startOfDay(new Date())) return { fills: total >= cap, date: fixed, remaining: Math.max(0, cap - total), text: 'Estimasi siap ' + U.dateID(fixed) + ' (ditetapkan pemilik)' };
  }
  if (total >= cap) {
    var date = U.addDays(new Date(), lead);
    return { fills: true, date: date, remaining: 0, text: 'Kuota batch terpenuhi · estimasi siap ' + U.dateID(date) };
  }
  var rem = cap - total;
  return { fills: false, date: null, remaining: rem, text: 'Kuota batch tinggal ' + rem + ' ' + p.unit + ' lagi. Produksi dimulai setelah kuota terpenuhi, lalu siap ± ' + lead + ' hari sesudahnya.' };
};
