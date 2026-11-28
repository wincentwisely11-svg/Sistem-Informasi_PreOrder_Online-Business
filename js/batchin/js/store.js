/* store.js — satu sumber kebenaran: state, persistensi, dan aksi. */
window.PO = window.PO || {};

PO.store = (function () {
  var U = PO.util;
  var D = PO.data;
  var KEY = 'batchin.state.v1';

  var state = null;
  var listeners = [];
  var memoryOnly = false;

  /* ---------- persistensi ---------- */
  function readStorage() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.orders || !parsed.products) return null;
      return parsed;
    } catch (err) {
      return null;
    }
  }

  function writeStorage() {
    if (memoryOnly) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      memoryOnly = true;
    }
  }

  function load() {
    var saved = readStorage();
    state = saved || D.buildFromPreset('bakery');
    if (!state.counters) state.counters = { order: state.orders.length, batch: 0 };
    if (!state.counters.batch) state.counters.batch = deriveBatchSeq();
    return state;
  }

  function deriveBatchSeq() {
    var max = 0;
    state.orders.forEach(function (order) {
      if (!order.batchCode) return;
      var n = parseInt(String(order.batchCode).replace(/\D/g, ''), 10);
      if (!isNaN(n) && n > max) max = n;
    });
    return max;
  }

  function getState() { return state; }

  function subscribe(fn) {
    listeners.push(fn);
    return function () {
      listeners = listeners.filter(function (item) { return item !== fn; });
    };
  }

  function emit() {
    listeners.forEach(function (fn) { fn(state); });
  }

  function commit(mutator) {
    mutator(state);
    writeStorage();
    emit();
  }

  /* ---------- helper ---------- */
  function productById(id) {
    return state.products.filter(function (p) { return p.id === id; })[0] || null;
  }

  function orderById(id) {
    return state.orders.filter(function (o) { return o.id === id; })[0] || null;
  }

  function nextOrderCode() {
    var max = 0;
    state.orders.forEach(function (o) {
      var n = parseInt(String(o.id).replace(/\D/g, ''), 10);
      if (!isNaN(n) && n > max) max = n;
    });
    return 'ORD-' + U.pad(max + 1, 3);
  }

  function nextBatchCode() {
    state.counters.batch = (state.counters.batch || 0) + 1;
    return 'BTH-' + U.pad(state.counters.batch, 3);
  }

  /* ---------- pesanan ---------- */
  function createOrder(input) {
    var product = productById(input.productId);
    if (!product) throw new Error('Produk tidak ditemukan.');
    var qty = Number(input.qty);
    var total = qty * product.price;
    var now = new Date();
    var code = nextOrderCode();
    var order = {
      id: code,
      code: code,
      customer: { name: String(input.name).trim(), phone: U.digitsOnly(input.phone) },
      productId: product.id,
      qty: qty,
      unitPrice: product.price,
      total: total,
      status: 'waiting',
      payment: input.payment || 'unpaid',
      paidAmount: 0,
      paymentMethod: input.paymentMethod || 'Transfer Bank',
      note: String(input.note || '').trim(),
      batchCode: '',
      createdAt: U.iso(now),
      dueDate: U.iso(U.addDays(now, input.leadDays || state.settings.leadDays || 3)),
      completedAt: null,
      cancelledAt: null,
      cancelReason: '',
      timeline: [{ status: 'waiting', at: U.iso(now) }]
    };
    if (order.payment === 'dp') order.paidAmount = Math.round(total * (input.dpPercent || state.settings.dpPercent) / 100);
    if (order.payment === 'paid') order.paidAmount = total;

    commit(function (s) {
      s.orders.push(order);
      s.counters.order = s.orders.length;
    });
    return order;
  }

  function updateOrder(id, patch) {
    commit(function () {
      var order = orderById(id);
      if (!order) return;
      Object.keys(patch).forEach(function (key) { order[key] = patch[key]; });
    });
    return orderById(id);
  }

  function changeStatus(id, status, note) {
    var order = orderById(id);
    if (!order || order.status === status) return null;
    var now = new Date();
    commit(function () {
      var target = orderById(id);
      target.status = status;
      target.timeline.push({ status: status, at: U.iso(now), note: note || '' });
      if (status === 'completed') target.completedAt = U.iso(now);
      if (status === 'cancelled') {
        target.cancelledAt = U.iso(now);
        target.cancelReason = note || 'Dibatalkan oleh pemilik';
      }
      if (status !== 'cancelled') {
        target.cancelledAt = null;
        target.cancelReason = '';
      }
      if (status !== 'completed') target.completedAt = null;
    });
    return orderById(id);
  }

  function cancelOrder(id, reason) {
    return changeStatus(id, 'cancelled', reason || 'Dibatalkan oleh pemilik');
  }

  function setPayment(id, payment, method, amount) {
    commit(function () {
      var order = orderById(id);
      if (!order) return;
      order.payment = payment;
      order.paymentMethod = method || order.paymentMethod;
      if (payment === 'paid') order.paidAmount = order.total;
      else if (payment === 'dp') order.paidAmount = amount === undefined ? Math.round(order.total * state.settings.dpPercent / 100) : Number(amount);
      else order.paidAmount = 0;
    });
    return orderById(id);
  }

  function deleteOrder(id) {
    commit(function (s) {
      s.orders = s.orders.filter(function (o) { return o.id !== id; });
    });
  }

  /* ---------- batch ---------- */
  function planBatch(productId) {
    var product = productById(productId);
    if (!product) return null;
    var capacity = product.batchQuota || state.settings.batchQuota || 1;
    var waiting = state.orders
      .filter(function (o) { return o.status === 'waiting' && o.productId === productId; })
      .sort(function (a, b) { return new Date(a.createdAt) - new Date(b.createdAt); });
    var picked = [];
    var qty = 0;
    waiting.forEach(function (order) {
      if (qty + order.qty > capacity) return;
      picked.push(order);
      qty += order.qty;
    });
    return {
      product: product,
      capacity: capacity,
      waitingQty: U.sum(waiting, function (o) { return o.qty; }),
      picked: picked,
      qty: qty,
      ready: qty >= capacity,
      remaining: Math.max(0, capacity - qty)
    };
  }

  function formBatch(productId, force) {
    var plan = planBatch(productId);
    if (!plan || !plan.picked.length) return null;
    if (!plan.ready && !force) return null;
    var code = nextBatchCode();
    var now = new Date();
    commit(function () {
      plan.picked.forEach(function (picked) {
        var order = orderById(picked.id);
        if (!order) return;
        order.batchCode = code;
        order.status = 'shopping';
        order.timeline.push({ status: 'shopping', at: U.iso(now), note: 'Masuk batch ' + code });
      });
    });
    return { code: code, count: plan.picked.length, qty: plan.qty };
  }

  function autoBatchAll() {
    var created = [];
    state.products.forEach(function (product) {
      var plan = planBatch(product.id);
      if (plan && plan.ready) {
        var result = formBatch(product.id, false);
        if (result) created.push(result);
      }
    });
    return created;
  }

  /* ---------- produk ---------- */
  function addProduct(input) {
    var id = 'PRD-' + U.pad(state.products.length + 1, 3);
    while (productById(id)) id = 'PRD-' + U.pad(Number(id.replace(/\D/g, '')) + 1, 3);
    var product = {
      id: id,
      name: String(input.name).trim(),
      category: String(input.category || 'Umum').trim(),
      price: Number(input.price),
      hpp: Number(input.hpp || 0),
      batchQuota: Number(input.batchQuota || state.settings.batchQuota || 1),
      unit: String(input.unit || state.settings.batchUnit).trim(),
      active: true
    };
    commit(function (s) { s.products.push(product); });
    return product;
  }

  function updateProduct(id, patch) {
    commit(function () {
      var product = productById(id);
      if (!product) return;
      Object.keys(patch).forEach(function (key) { product[key] = patch[key]; });
    });
    return productById(id);
  }

  function deleteProduct(id) {
    var used = state.orders.some(function (o) { return o.productId === id; });
    if (used) return { ok: false, reason: 'Produk sudah dipakai pada pesanan, nonaktifkan saja.' };
    commit(function (s) {
      s.products = s.products.filter(function (p) { return p.id !== id; });
    });
    return { ok: true };
  }

  /* ---------- pengeluaran ---------- */
  function addExpense(input) {
    var max = 0;
    state.expenses.forEach(function (e) {
      var n = parseInt(String(e.id).replace(/\D/g, ''), 10);
      if (!isNaN(n) && n > max) max = n;
    });
    var expense = {
      id: 'EXP-' + U.pad(max + 1, 3),
      date: U.iso(input.date ? new Date(input.date) : new Date()),
      category: input.category,
      note: String(input.note || '').trim(),
      amount: Number(input.amount),
      batchCode: String(input.batchCode || '').trim()
    };
    commit(function (s) { s.expenses.push(expense); });
    return expense;
  }

  function deleteExpense(id) {
    commit(function (s) {
      s.expenses = s.expenses.filter(function (e) { return e.id !== id; });
    });
  }

  /* ---------- pengaturan ---------- */
  function updateSettings(patch) {
    commit(function (s) {
      Object.keys(patch).forEach(function (key) { s.settings[key] = patch[key]; });
    });
    return state.settings;
  }

  function applyPreset(presetId) {
    var fresh = D.buildFromPreset(presetId);
    Object.keys(fresh).forEach(function (key) { state[key] = fresh[key]; });
    writeStorage();
    emit();
    return state;
  }

  function resetDemo() {
    var fresh = D.buildFromPreset(state.presetId || 'bakery');
    Object.keys(fresh).forEach(function (key) { state[key] = fresh[key]; });
    writeStorage();
    emit();
    return state;
  }

  function clearAll() {
    var settings = Object.assign({}, state.settings);
    state.orders = [];
    state.expenses = [];
    state.counters = { order: 0, batch: 0 };
    state.settings = settings;
    writeStorage();
    emit();
  }

  return {
    load: load,
    get: getState,
    subscribe: subscribe,
    productById: productById,
    orderById: orderById,
    createOrder: createOrder,
    updateOrder: updateOrder,
    changeStatus: changeStatus,
    cancelOrder: cancelOrder,
    setPayment: setPayment,
    deleteOrder: deleteOrder,
    planBatch: planBatch,
    formBatch: formBatch,
    autoBatchAll: autoBatchAll,
    addProduct: addProduct,
    updateProduct: updateProduct,
    deleteProduct: deleteProduct,
    addExpense: addExpense,
    deleteExpense: deleteExpense,
    updateSettings: updateSettings,
    applyPreset: applyPreset,
    resetDemo: resetDemo,
    clearAll: clearAll
  };
})();
