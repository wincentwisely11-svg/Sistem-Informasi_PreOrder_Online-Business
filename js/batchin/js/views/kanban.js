/* views/kanban.js — papan antrean + panel pembentukan batch. */
window.PO = window.PO || {};
PO.views = PO.views || {};
PO.views.kanban = (function () {
  var U = PO.util, S = PO.store, D = PO.data, UI = PO.ui, h = U.h;
  var COLS = ['waiting', 'shopping', 'production', 'ready', 'completed'];

  function batchPanel() {
    var items = S.get().products.filter(function (p) { return p.active; }).map(function (p) { return S.planBatch(p.id); })
      .filter(function (plan) { return plan && plan.waitingQty > 0; });
    if (!items.length) return UI.empty('box', 'Tidak ada pesanan menunggu', 'Pesanan baru akan muncul di sini sampai kuota batch terpenuhi.');
    return h('div', { class: 'batch-list' }, items.map(function (plan) {
      var pct = U.clamp(plan.qty / plan.capacity * 100, 0, 100);
      return h('div', { class: 'batch' },
        h('div', null, h('div', { class: 'batch-name' }, plan.product.name),
          h('div', { class: 'batch-sub' }, plan.ready ? 'Kuota terpenuhi — siap dibatch' : 'Kurang ' + plan.remaining + ' ' + plan.product.unit + ' lagi')),
        h('div', { class: 'batch-bar' }, h('div', { class: 'bar' + (plan.ready ? ' ok' : '') }, h('span', { style: 'width:' + pct + '%' })), h('span', { class: 'mono small' }, plan.qty + '/' + plan.capacity)),
        plan.ready ? UI.btn('Bentuk batch', 'flame', 'btn-sm', function () { run(plan.product.id, false); })
          : UI.btn('Paksa', 'flame', 'btn-ghost btn-sm', function () {
            UI.confirm({ title: 'Paksa bentuk batch?', text: 'Batch ' + plan.product.name + ' dibuat dengan ' + plan.qty + ' dari ' + plan.capacity + ' ' + plan.product.unit + '. Bahan bisa tersisa.', ok: 'Bentuk batch', onOk: function () { run(plan.product.id, true); } });
          }));
    }));
  }

  function run(productId, force) {
    var r = S.formBatch(productId, force);
    UI.toast(r ? 'Batch ' + r.code + ' terbentuk (' + r.count + ' pesanan)' : 'Belum ada pesanan yang bisa dibatch', r ? 'ok' : 'warn');
  }

  function card(o) {
    var p = S.productById(o.productId);
    var el = h('div', { class: 'kcard', draggable: o.status !== 'waiting' ? 'true' : null, onClick: function () { PO.views.orders.openDetail(o.id); } },
      h('div', { class: 'kcard-top' }, h('span', { class: 'kcard-id mono' }, o.code + (o.batchCode ? ' · ' + o.batchCode : '')), UI.payBadge(o)),
      h('div', { class: 'kcard-name' }, o.customer.name),
      h('div', { class: 'kcard-meta' }, (p ? p.name : '—') + ' × ' + o.qty),
      h('div', { class: 'kcard-foot' }, h('span', { class: 'small mute' }, 'Tempo ' + U.dateShort(o.dueDate)), h('span', { class: 'mono small' }, U.compactRupiah(o.total))));
    el.addEventListener('dragstart', function (e) { e.dataTransfer.setData('text/plain', o.id); el.classList.add('dragging'); });
    el.addEventListener('dragend', function () { el.classList.remove('dragging'); });
    return el;
  }

  function drop(orderId, target) {
    var o = S.orderById(orderId);
    if (!o || o.status === target) return;
    if (o.status === 'waiting') { UI.toast('Gunakan "Bentuk batch" untuk memproses pesanan menunggu.', 'warn'); return; }
    if (target === 'waiting') { UI.toast('Pesanan yang sudah masuk batch tidak bisa kembali ke antrean.', 'warn'); return; }
    if (target === 'completed' && o.payment !== 'paid') S.setPayment(o.id, 'paid', o.paymentMethod);
    S.changeStatus(o.id, target);
    UI.toast(o.code + ' → ' + D.statusMeta(target).label);
  }

  function column(key) {
    var meta = D.statusMeta(key);
    var list = S.get().orders.filter(function (o) { return o.status === key; })
      .sort(function (a, b) { return new Date(a.createdAt) - new Date(b.createdAt); });
    var shown = key === 'completed' ? list.slice(-6).reverse() : list;
    var body = h('div', { class: 'kcol-body' }, shown.length ? shown.map(card) : h('div', { class: 'kcol-empty' }, 'Kosong'));
    var col = h('div', { class: 'kcol' },
      h('div', { class: 'kcol-head' }, h('span', { class: 'status-pill st-' + key }, h('i', { class: 'dot' }), meta.label), h('span', { class: 'kcol-count mono' }, list.length)), body);
    col.addEventListener('dragover', function (e) { e.preventDefault(); col.classList.add('over'); });
    col.addEventListener('dragleave', function () { col.classList.remove('over'); });
    col.addEventListener('drop', function (e) { e.preventDefault(); col.classList.remove('over'); drop(e.dataTransfer.getData('text/plain'), key); });
    return col;
  }

  function render() {
    return h('div', null,
      UI.pageHead('Antrean produksi', 'Pesanan dikelompokkan per batch begitu kuota produk terpenuhi. Geser kartu untuk pindah tahap.', [
        UI.btn('Batch otomatis', 'sparkles', 'btn-ghost', function () {
          var made = S.autoBatchAll();
          UI.toast(made.length ? made.length + ' batch terbentuk' : 'Belum ada produk yang kuotanya terpenuhi', made.length ? 'ok' : 'warn');
        }),
        UI.btn('Pesanan baru', 'plus', '', function () { PO.views.orders.openForm(); })]),
      UI.card('Kuota batch', batchPanel(), null, 'tight'),
      h('div', { class: 'section' }, h('div', { class: 'kanban' }, COLS.map(column))));
  }

  return { render: render };
})();
