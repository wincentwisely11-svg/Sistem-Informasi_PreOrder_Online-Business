/* views/orders.js — daftar pesanan, form pesanan baru, dan detail pesanan. */
window.PO = window.PO || {};
PO.views = PO.views || {};
PO.views.orders = (function () {
  var U = PO.util, S = PO.store, D = PO.data, UI = PO.ui, h = U.h;
  var filter = { q: '', status: 'all' };

  function productName(id) { var p = S.productById(id); return p ? p.name : '—'; }
  function waLink(order) {
    var p = order.customer.phone;
    var num = p.charAt(0) === '0' ? '62' + p.slice(1) : p;
    var text = 'Halo ' + U.firstName(order.customer.name) + ', pesanan ' + order.code + ' saat ini berstatus "' + D.statusMeta(order.status).label + '".';
    return 'https://wa.me/' + num + '?text=' + encodeURIComponent(text);
  }

  /* ---------- form pesanan baru ---------- */
  function openForm(productId) {
    var products = S.get().products.filter(function (p) { return p.active; });
    if (!products.length) { UI.toast('Tambahkan produk aktif dulu di menu Produk.', 'warn'); return; }

    var name = h('input', { class: 'input', placeholder: 'Nama pelanggan', maxLength: 60 });
    var phone = h('input', { class: 'input mono', placeholder: '08xxxxxxxxxx', inputMode: 'tel' });
    var product = UI.select(products.map(function (p) { return { value: p.id, label: p.name + ' — ' + U.rupiah(p.price) }; }), productId || products[0].id);
    var qty = h('input', { class: 'input mono', value: '1', inputMode: 'numeric' });
    var pay = UI.select([{ value: 'unpaid', label: 'Belum bayar' }, { value: 'dp', label: 'DP ' + S.get().settings.dpPercent + '%' }, { value: 'paid', label: 'Lunas' }], 'unpaid');
    var method = UI.select(D.PAYMENT_METHODS.map(function (m) { return { value: m, label: m }; }));
    var note = h('textarea', { class: 'textarea', placeholder: 'Catatan pelanggan (opsional)' });
    var total = h('div', { class: 'strong mono' });
    var hint = h('span', { class: 'field-hint' });

    var fName = UI.field('Nama pelanggan', name, { req: true });
    var fPhone = UI.field('Nomor WhatsApp', phone, { req: true, hint: 'Angka saja, 10–13 digit.' });
    var fProduct = UI.field('Produk', product, { req: true });
    var fQty = UI.field('Jumlah', qty, { req: true });
    var fPay = UI.field('Pembayaran', pay);
    var fMethod = UI.field('Metode bayar', method);
    var fNote = UI.field('Catatan', note, { span: true });

    function refresh() {
      var p = S.productById(product.value), q = Number(qty.value) || 0;
      total.textContent = 'Total ' + U.rupiah(p ? p.price * q : 0);
      if (p) {
        var plan = S.planBatch(p.id);
        hint.textContent = 'Kuota batch ' + p.batchQuota + ' ' + p.unit + ' · menunggu ' + plan.waitingQty + ' ' + p.unit;
      }
    }
    [product, qty].forEach(function (el) { el.addEventListener('input', refresh); });
    refresh();

    function submit() {
      var errs = [[fName, U.validateName(name.value)], [fPhone, U.validatePhone(phone.value)], [fQty, U.validateQty(qty.value, 1, 999)]];
      var bad = errs.filter(function (e) { e[0].setError(e[1]); return e[1]; });
      if (bad.length) { U.$('input', bad[0][0]).focus(); return; }
      var order = S.createOrder({
        name: name.value, phone: phone.value, productId: product.value, qty: qty.value,
        payment: pay.value, paymentMethod: method.value, note: note.value
      });
      UI.closeSheet();
      var made = S.autoBatchAll();
      UI.toast(made.length ? order.code + ' dibuat · batch ' + made[0].code + ' terbentuk' : order.code + ' masuk antrean');
    }

    UI.openSheet({
      title: 'Pesanan baru', sub: 'ID pesanan dibuat otomatis.',
      body: h('div', null, h('div', { class: 'form-grid' }, fName, fPhone, fProduct, fQty, fPay, fMethod, fNote), h('div', { class: 'row between', style: 'margin-top:14px' }, hint, total)),
      foot: [UI.btn('Batal', null, 'btn-ghost', UI.closeSheet), UI.btn('Simpan pesanan', 'check', '', submit)]
    });
  }

  /* ---------- detail pesanan ---------- */
  function item(key, val) { return h('div', { class: 'detail-item' }, h('div', { class: 'detail-key' }, key), h('div', { class: 'detail-val' }, val)); }

  function openDetail(id) {
    var o = S.orderById(id);
    if (!o) return;
    var next = D.nextStatus(o.status);
    var terminal = o.status === 'completed' || o.status === 'cancelled';

    var pay = UI.select([{ value: 'unpaid', label: 'Belum bayar' }, { value: 'dp', label: 'DP' }, { value: 'paid', label: 'Lunas' }], o.payment);
    var method = UI.select(D.PAYMENT_METHODS.map(function (m) { return { value: m, label: m }; }), o.paymentMethod);
    var savePay = UI.btn('Simpan', 'check', 'btn-sm', function () {
      S.setPayment(o.id, pay.value, method.value);
      UI.toast('Pembayaran ' + o.code + ' diperbarui'); openDetail(o.id);
    });

    var timeline = h('div', { class: 'timeline' }, o.timeline.map(function (t, i) {
      var last = i === o.timeline.length - 1;
      return h('div', { class: 'tl-item ' + (last ? 'now' : 'done') },
        h('div', { class: 'tl-rail' }, h('i', { class: 'tl-dot' }), h('i', { class: 'tl-line' })),
        h('div', { class: 'tl-body' }, h('div', { class: 'tl-title' }, D.statusMeta(t.status).label + (t.note ? ' — ' + t.note : '')), h('div', { class: 'tl-time mono' }, U.dateTimeID(t.at))));
    }));

    var foot = [];
    foot.push(h('span', { class: 'left' }, UI.btn('Hapus', 'trash', 'btn-quiet btn-sm', function () {
      UI.confirm({ title: 'Hapus ' + o.code + '?', text: 'Pesanan dihapus permanen dari pembukuan.', ok: 'Hapus', danger: true, onOk: function () { S.deleteOrder(o.id); UI.toast('Pesanan dihapus'); } });
    })));
    foot.push(h('a', { class: 'btn btn-ghost', href: waLink(o), target: '_blank', rel: 'noopener' }, PO.icons.el('message'), h('span', null, 'Kabari via WA')));
    if (!terminal) foot.push(UI.btn('Batalkan', 'x', 'btn-ghost', function () {
      UI.confirm({ title: 'Batalkan ' + o.code + '?', text: 'Pesanan tidak dihitung sebagai pendapatan.', ok: 'Batalkan pesanan', danger: true, onOk: function () { S.cancelOrder(o.id); UI.toast(o.code + ' dibatalkan', 'warn'); } });
    }));
    if (o.status === 'cancelled') foot.push(UI.btn('Aktifkan lagi', 'refresh', '', function () { S.changeStatus(o.id, 'waiting', 'Diaktifkan kembali'); UI.closeSheet(); }));
    if (next && o.status !== 'waiting') foot.push(UI.btn('Lanjut: ' + D.statusMeta(next).short, 'arrowRight', '', function () {
      if (next === 'completed' && o.payment !== 'paid') S.setPayment(o.id, 'paid', o.paymentMethod);
      S.changeStatus(o.id, next); UI.toast(o.code + ' → ' + D.statusMeta(next).label); UI.closeSheet();
    }));

    UI.openSheet({
      title: o.code, sub: o.customer.name + ' · ' + o.customer.phone, wide: true, foot: foot,
      body: h('div', { class: 'col', style: 'gap:18px' },
        h('div', { class: 'row between wrap' }, UI.statusPill(o.status), UI.payBadge(o)),
        o.status === 'waiting' ? h('p', { class: 'small mute' }, 'Menunggu kuota batch. Bentuk batch dari menu Antrean setelah kuota produk terpenuhi.') : null,
        h('div', { class: 'detail-grid' },
          item('Produk', productName(o.productId) + ' × ' + o.qty),
          item('Total', U.rupiah(o.total)),
          item('Sudah dibayar', U.rupiah(o.paidAmount) + (o.payment !== 'paid' ? ' (sisa ' + U.rupiah(o.total - o.paidAmount) + ')' : '')),
          item('Jatuh tempo', U.dateID(o.dueDate)),
          item('Batch', o.batchCode || '—'),
          item('Dibuat', U.dateTimeID(o.createdAt)),
          o.note ? item('Catatan', o.note) : null),
        h('div', { class: 'pay-box' }, h('div', { class: 'row wrap' }, pay, method, savePay)),
        timeline)
    });
  }

  /* ---------- daftar ---------- */
  function list() {
    var q = filter.q.toLowerCase();
    var rows = S.get().orders.filter(function (o) {
      if (filter.status === 'active' && PO.sel.ACTIVE.indexOf(o.status) < 0) return false;
      if (filter.status !== 'all' && filter.status !== 'active' && o.status !== filter.status) return false;
      if (!q) return true;
      return (o.code + o.customer.name + o.customer.phone + productName(o.productId)).toLowerCase().indexOf(q) >= 0;
    }).sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });

    if (!rows.length) return UI.empty('orders', 'Tidak ada pesanan', 'Ubah filter atau catat pesanan baru.');
    return h('div', { class: 'table-wrap' }, h('table', { class: 'table' },
      h('thead', null, h('tr', null, ['Kode', 'Pelanggan', 'Produk', 'Jml', 'Total', 'Bayar', 'Status', 'Tempo'].map(function (t, i) { return h('th', { class: i === 3 || i === 4 ? 'num' : '' }, t); }))),
      h('tbody', null, rows.slice(0, 150).map(function (o) {
        return h('tr', { style: 'cursor:pointer', onClick: function () { openDetail(o.id); } },
          h('td', { class: 'mono' }, o.code), h('td', null, h('div', { class: 'strong' }, o.customer.name), h('div', { class: 'tiny mute mono' }, o.customer.phone)),
          h('td', null, productName(o.productId)), h('td', { class: 'num' }, o.qty), h('td', { class: 'num' }, U.rupiah(o.total)),
          h('td', null, UI.payBadge(o)), h('td', null, UI.statusPill(o.status)), h('td', { class: 'nowrap small' }, U.dateShort(o.dueDate)));
      }))));
  }

  function render() {
    var box = h('div', { class: 'card' });
    function paint() { U.clear(box); box.appendChild(list()); }
    var search = h('input', { class: 'input', placeholder: 'Cari nama, kode, nomor, produk', value: filter.q, onInput: function (e) { filter.q = e.target.value; paint(); } });
    var seg = h('div');
    function paintSeg() {
      U.clear(seg);
      seg.appendChild(UI.seg([{ value: 'all', label: 'Semua' }, { value: 'active', label: 'Aktif' }, { value: 'completed', label: 'Selesai' }, { value: 'cancelled', label: 'Batal' }], filter.status, function (v) { filter.status = v; paintSeg(); paint(); }));
    }
    paintSeg(); paint();
    return h('div', null,
      UI.pageHead('Pesanan', S.get().orders.length + ' pesanan tercatat', [UI.btn('Pesanan baru', 'plus', '', function () { openForm(); })]),
      h('div', { class: 'toolbar' }, h('div', { class: 'search' }, PO.icons.el('search'), search), seg), box);
  }

  return { render: render, openForm: openForm, openDetail: openDetail };
})();
