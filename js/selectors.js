/* selectors.js — kalkulasi turunan dari state (tanpa efek samping). */
window.PO = window.PO || {};
PO.sel = (function () {
  var U = PO.util, S = PO.store, D = PO.data;
  var ACTIVE = ['waiting', 'shopping', 'production', 'ready'];

  function orders() { return S.get().orders; }
  function sameMonth(iso, d) { var x = new Date(iso); return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth(); }
  function doneDate(o) { return o.completedAt || o.createdAt; }

  function completedIn(d) { return orders().filter(function (o) { return o.status === 'completed' && sameMonth(doneDate(o), d); }); }
  function revenue(d) { return U.sum(completedIn(d), function (o) { return o.total; }); }
  function expensesIn(d) { return S.get().expenses.filter(function (e) { return sameMonth(e.date, d); }); }
  function expense(d) { return U.sum(expensesIn(d), function (e) { return e.amount; }); }

  function cogs(d) {
    return U.sum(completedIn(d), function (o) {
      var p = S.productById(o.productId);
      return p ? p.hpp * o.qty : 0;
    });
  }

  function monthSeries(n) {
    var base = U.startOfMonth(new Date()), out = [];
    for (var i = n - 1; i >= 0; i--) {
      var m = U.addMonths(base, -i), r = revenue(m), e = expense(m);
      out.push({ date: m, label: U.monthLabelShort(m), revenue: r, expense: e, profit: r - e });
    }
    return out;
  }

  function statusCounts() {
    var map = {};
    D.STATUSES.forEach(function (s) { map[s.key] = 0; });
    orders().forEach(function (o) { map[o.status] = (map[o.status] || 0) + 1; });
    return map;
  }

  function activeOrders() { return orders().filter(function (o) { return ACTIVE.indexOf(o.status) >= 0; }); }

  function cancelRate() {
    var done = orders().filter(function (o) { return o.status === 'completed' || o.status === 'cancelled'; });
    if (!done.length) return 0;
    return done.filter(function (o) { return o.status === 'cancelled'; }).length / done.length * 100;
  }

  function avgDays() {
    var list = orders().filter(function (o) { return o.status === 'completed' && o.completedAt; });
    if (!list.length) return 0;
    return U.sum(list, function (o) { return U.daysBetween(o.createdAt, o.completedAt); }) / list.length;
  }

  function receivable() {
    return U.sum(orders().filter(function (o) { return o.status !== 'cancelled' && o.status !== 'completed'; }), function (o) { return o.total - o.paidAmount; });
  }

  function repeatCustomers() {
    var seen = {};
    orders().forEach(function (o) { if (o.status !== 'cancelled') { var k = o.customer.phone; seen[k] = (seen[k] || 0) + 1; } });
    var keys = Object.keys(seen);
    return { total: keys.length, repeat: keys.filter(function (k) { return seen[k] > 1; }).length };
  }

  function topProducts() {
    var map = {};
    orders().forEach(function (o) {
      if (o.status !== 'completed') return;
      map[o.productId] = map[o.productId] || { qty: 0, revenue: 0 };
      map[o.productId].qty += o.qty;
      map[o.productId].revenue += o.total;
    });
    return Object.keys(map).map(function (id) {
      return { product: S.productById(id), qty: map[id].qty, revenue: map[id].revenue };
    }).filter(function (r) { return r.product; }).sort(function (a, b) { return b.revenue - a.revenue; });
  }

  function batches() {
    var map = {};
    orders().forEach(function (o) {
      if (!o.batchCode || ACTIVE.indexOf(o.status) < 0 || o.status === 'waiting') return;
      var b = map[o.batchCode] = map[o.batchCode] || { code: o.batchCode, productId: o.productId, qty: 0, orders: [] };
      b.qty += o.qty;
      b.orders.push(o);
    });
    return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return a.code < b.code ? 1 : -1; });
  }

  function overdue() {
    var t = U.today();
    return activeOrders().filter(function (o) { return new Date(o.dueDate) < t; });
  }

  function tasks() {
    var list = [];
    S.get().products.forEach(function (p) {
      if (!p.active) return;
      var plan = S.planBatch(p.id);
      if (plan && plan.ready) list.push({ label: 'Bentuk batch ' + p.name, meta: plan.qty + '/' + plan.capacity + ' ' + p.unit + ' · kuota terpenuhi', go: 'kanban' });
    });
    var ready = orders().filter(function (o) { return o.status === 'ready'; });
    if (ready.length) list.push({ label: 'Antar ' + ready.length + ' pesanan siap kirim', meta: 'Cek juga status pembayaran', go: 'kanban' });
    var unpaid = ready.filter(function (o) { return o.payment !== 'paid'; });
    if (unpaid.length) list.push({ label: 'Tagih ' + unpaid.length + ' pesanan belum lunas', meta: U.rupiah(U.sum(unpaid, function (o) { return o.total - o.paidAmount; })), go: 'orders' });
    var late = overdue();
    if (late.length) list.push({ label: late.length + ' pesanan lewat jatuh tempo', meta: 'Kabari pelanggan lewat WhatsApp', go: 'orders' });
    return list;
  }

  return {
    ACTIVE: ACTIVE, revenue: revenue, expense: expense, expensesIn: expensesIn, cogs: cogs,
    completedIn: completedIn, monthSeries: monthSeries, statusCounts: statusCounts,
    activeOrders: activeOrders, cancelRate: cancelRate, avgDays: avgDays, receivable: receivable,
    repeatCustomers: repeatCustomers, topProducts: topProducts, batches: batches, overdue: overdue, tasks: tasks
  };
})();
