/* views/orders.js — daftar pesanan, form pesanan baru, dan detail pesanan. */
window.PO = window.PO || {};
PO.views = PO.views || {};
PO.views.orders = (function () {
  var U = PO.util, S = PO.store, D = PO.data, UI = PO.ui, h = U.h;
  var filter = { q: '', cats: ['active', 'completed', 'cancelled'] };
  var lastCount = 0;

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
    var product = UI.select(products.map(function (p) { return { value: p.id, label: p.name + ' — ' + U.rupiah(p.price) + (PO.poState(p).open ? '' : ' · PO ditutup') }; }), productId || products[0].id);
    var qty = h('input', { class: 'input mono', value: '1', inputMode: 'numeric' });
    var pay = UI.select([{ value: 'unpaid', label: 'Belum bayar' }, { value: 'dp', label: 'DP ' + S.get().settings.dpPercent + '%' }, { value: 'paid', label: 'Lunas' }], 'unpaid');
    var method = UI.select(D.PAYMENT_METHODS.map(function (m) { return { value: m, label: m }; }));
    var note = h('textarea', { class: 'textarea', placeholder: 'Catatan pelanggan (opsional)' });
    var total = h('div', { class: 'strong mono' });
    var hint = h('span', { class: 'field-hint' });

    var fName = UI.field('Nama pelanggan', name, { req: true });
    var fPhone = UI.field('Nomor WhatsApp', phone, { req: true, hint: 'Angka saja, 10–13 digit.' });
    var fProduct = UI.field('Produk', product, { req: true, span: true });
    var fQty = UI.field('Jumlah', qty, { req: true });
    var fPay = UI.field('Pembayaran', pay);
    var fMethod = UI.field('Metode bayar', method, { span: true });
    var fNote = UI.field('Catatan', note, { span: true });

    function refresh() {
      var p = S.productById(product.value), q = Number(qty.value) || 0;
      total.textContent = 'Total ' + U.rupiah(p ? p.price * q : 0);
      if (p) hint.textContent = PO.estimate(S.get(), p.id, q).text;
    }
    [product, qty].forEach(function (el) { el.addEventListener('input', refresh); });
    refresh();

    function submit() {
      var errs = [[fName, U.validateName(name.value)], [fPhone, U.validatePhone(phone.value)], [fQty, U.validateQty(qty.value, 1, 999)]];
      var bad = errs.filter(function (e) { e[0].setError(e[1]); return e[1]; });
      if (bad.length) { U.$('input', bad[0][0]).focus(); return; }
      var prod = S.productById(product.value);
      function create() {
        var order = S.createOrder({
          name: name.value, phone: phone.value, productId: product.value, qty: qty.value,
          payment: pay.value, paymentMethod: method.value, note: note.value
        });
        UI.closeSheet();
        var made = S.autoBatchAll();
        UI.toast(made.length ? order.code + ' dibuat · batch ' + made[0].code + ' terbentuk' : order.code + ' masuk antrean');
      }
      if (prod && !PO.poState(prod).open) {
        UI.confirm({ title: 'PO produk sedang ditutup', text: prod.name + ': ' + PO.poState(prod).text + '. Tetap catat pesanan ini?', ok: 'Tetap catat', onOk: create });
        return;
      }
      create();
    }

    UI.openSheet({
      title: 'Pesanan baru', sub: 'ID pesanan dibuat otomatis.',
      body: h('div', null, h('div', { class: 'form-grid' }, fName, fPhone, fProduct, fQty, fPay, fMethod, fNote), h('div', { class: 'row between', style: 'margin-top:14px' }, hint, total)),
      foot: [UI.btn('Batal', null, 'btn-ghost', UI.closeSheet), UI.btn('Simpan pesanan', 'check', '', submit)]
    });
  }

  /* ---------- DP, template WhatsApp, nota ---------- */
  var PROOF_LABEL = { none: 'Belum ada', pending: 'Menunggu verifikasi', verified: 'Terverifikasi', rejected: 'Ditolak' };
  function dpAmount(o) { return Math.round(o.total * (S.get().settings.dpPercent || 0) / 100); }
  function waUrl(o, text) {
    var p = o.customer.phone, num = p.charAt(0) === '0' ? '62' + p.slice(1) : p;
    return 'https://wa.me/' + num + '?text=' + encodeURIComponent(text);
  }
  function templates(o) {
    var s = S.get().settings, p = S.productById(o.productId), first = U.firstName(o.customer.name);
    var item = (p ? p.name : 'pesanan') + ' × ' + o.qty, bank = s.bankInfo ? '\n\n' + s.bankInfo : '';
    var sisa = o.total - o.paidAmount;
    return [
      { label: 'Konfirmasi pesanan', text: 'Halo ' + first + ', pesanan ' + o.code + ' (' + item + ') sudah kami catat. Total ' + U.rupiah(o.total) + '. Estimasi kirim ' + U.dateID(o.dueDate) + '. Terima kasih! — ' + s.businessName },
      { label: 'Tagihan DP / pelunasan', text: 'Halo ' + first + ', untuk memproses pesanan ' + o.code + ' mohon transfer ' + (o.payment === 'unpaid' ? 'DP ' + U.rupiah(dpAmount(o)) : 'sisa ' + U.rupiah(sisa)) + '. Total pesanan ' + U.rupiah(o.total) + '.' + bank + '\n\nMohon kirim bukti transfer di chat ini ya.' },
      { label: 'Pesanan siap dikirim', text: 'Halo ' + first + ', pesanan ' + o.code + ' (' + item + ') sudah siap' + (sisa > 0 ? ' dan akan diantar. Sisa pembayaran ' + U.rupiah(sisa) + '.' : ' dan akan segera diantar.') + ' Mohon konfirmasi alamat dan waktu penerimaan ya.' },
      { label: 'Terima kasih & feedback', text: 'Halo ' + first + ', terima kasih sudah memesan di ' + s.businessName + '! Bagaimana pesanan ' + o.code + '? Kritik dan saran kamu sangat membantu kami.' }
    ];
  }

  function localDate(iso) {
    var d = new Date(iso);
    return d.getFullYear() + '-' + U.pad(d.getMonth() + 1, 2) + '-' + U.pad(d.getDate(), 2);
  }
  function estimateText(o, reason) {
    var s = S.get().settings, p = S.productById(o.productId);
    return 'Halo ' + U.firstName(o.customer.name) + ', kabar untuk pesanan ' + o.code + ' (' + (p ? p.name : 'pesanan') + ' × ' + o.qty + '): estimasi pesananmu siap pada ' + U.dateID(o.dueDate) + '.' +
      (reason ? ' Alasan: ' + reason + '.' : '') + ' Terima kasih sudah menunggu! — ' + s.businessName;
  }

  function printInvoice(o) {
    var s = S.get().settings, p = S.productById(o.productId), rest = o.total - o.paidAmount;
    function esc(x) { return String(x === null || x === undefined ? '' : x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    var w = window.open('', '_blank');
    if (!w) { UI.toast('Izinkan pop-up untuk mencetak nota.', 'warn'); return; }
    var css = 'body{font-family:system-ui,Segoe UI,Arial,sans-serif;color:#222;margin:0;padding:32px;max-width:640px;margin:auto}h1{font-size:22px;margin:0}.top{display:flex;justify-content:space-between;align-items:center;gap:16px;border-bottom:2px solid #222;padding-bottom:14px}.top img{width:56px;height:56px;border-radius:50%;object-fit:cover}.muted{color:#666;font-size:13px}table{width:100%;border-collapse:collapse;margin:20px 0}.items{margin-bottom:0}.sum{width:55%;margin:0 0 20px auto}th,td{text-align:left;padding:9px 6px;border-bottom:1px solid #ddd;font-size:14px}th.r,td.r{text-align:right}.tot td{font-weight:700;border-bottom:0}.box{background:#f4f4f4;padding:12px 14px;border-radius:8px;font-size:13px;margin-top:14px;white-space:pre-line}@media print{body{padding:0}}';
    w.document.write('<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Nota ' + esc(o.code) + '</title><style>' + css + '</style></head><body>' +
      '<div class="top"><div><h1>' + esc(s.businessName) + '</h1><div class="muted">' + esc(s.tagline || '') + (s.whatsapp ? '<br>WhatsApp ' + esc(s.whatsapp) : '') + '</div></div>' + (s.photo ? '<img src="' + s.photo + '" alt="">' : '') + '</div>' +
      '<p><b>NOTA ' + esc(o.code) + '</b><br><span class="muted">Tanggal ' + esc(U.dateID(o.createdAt)) + ' · Estimasi kirim ' + esc(U.dateID(o.dueDate)) + '</span></p>' +
      '<p>Kepada: <b>' + esc(o.customer.name) + '</b><br><span class="muted">' + esc(o.customer.phone) + '</span></p>' +
      '<table class="items"><tr><th>Produk</th><th class="r">Jml</th><th class="r">Harga</th><th class="r">Subtotal</th></tr><tr><td>' + esc(p ? p.name : '—') + '</td><td class="r">' + o.qty + '</td><td class="r">' + esc(U.rupiah(o.unitPrice)) + '</td><td class="r">' + esc(U.rupiah(o.total)) + '</td></tr>' +
      '</table>' +
      '<table class="sum"><tr><td>Total</td><td class="r">' + esc(U.rupiah(o.total)) + '</td></tr>' +
      '<tr><td>Sudah dibayar (' + esc(D.PAYMENT_LABELS[o.payment]) + ')</td><td class="r">' + esc(U.rupiah(o.paidAmount)) + '</td></tr>' +
      '<tr class="tot"><td>' + (rest > 0 ? 'Sisa pembayaran' : 'Lunas') + '</td><td class="r">' + esc(U.rupiah(Math.max(rest, 0))) + '</td></tr></table>' +
      (o.note ? '<p class="muted">Catatan: ' + esc(o.note) + '</p>' : '') +
      (s.bankInfo && rest > 0 ? '<div class="box"><b>Pembayaran</b>\n' + esc(s.bankInfo) + '</div>' : '') +
      '<div class="box"><b>Kebijakan pembatalan</b>\n' + esc(s.cancelPolicy || 'DP tidak dapat dikembalikan jika pesanan dibatalkan setelah produksi dimulai.') + '</div>' +
      '<p class="muted" style="text-align:center;margin-top:28px">Terima kasih sudah memesan!</p></body></html>');
    w.document.close(); w.focus();
    setTimeout(function () { w.print(); }, 350);
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
    foot.push(UI.btn('Cetak nota', 'note', 'btn-ghost', function () { printInvoice(o); }));
    if (!terminal) foot.push(UI.btn('Batalkan', 'x', 'btn-ghost', function () {
      UI.confirm({ title: 'Batalkan ' + o.code + '?', text: 'Pesanan tidak dihitung sebagai pendapatan.', ok: 'Batalkan pesanan', danger: true, onOk: function () { S.cancelOrder(o.id); UI.toast(o.code + ' dibatalkan', 'warn'); } });
    }));
    if (o.status === 'cancelled') foot.push(UI.btn('Aktifkan lagi', 'refresh', '', function () { S.changeStatus(o.id, 'waiting', 'Diaktifkan kembali'); UI.closeSheet(); }));
    if (next && o.status !== 'waiting') foot.push(UI.btn('Lanjut: ' + D.statusMeta(next).short, 'arrowRight', '', function () {
      if (next === 'completed' && o.payment !== 'paid') S.setPayment(o.id, 'paid', o.paymentMethod);
      S.changeStatus(o.id, next); UI.toast(o.code + ' → ' + D.statusMeta(next).label); UI.closeSheet();
    }));

    var proofField = UI.imageField({ label: 'Bukti bayar', value: o.proof || '', w: 900, h: 900, fit: 'contain', round: false, hint: o.proof ? 'Status: ' + PROOF_LABEL[o.proofStatus || 'pending'] : 'Unggah tangkapan layar transfer dari pelanggan.' });
    var proofBox = h('div', { class: 'pay-box col', style: 'gap:12px' }, proofField, h('div', { class: 'row wrap' },
      UI.btn('Simpan bukti', null, 'btn-ghost btn-sm', function () { var v = proofField.getValue(); S.setProof(o.id, v, v ? 'pending' : 'none'); UI.toast('Bukti disimpan'); openDetail(o.id); }),
      o.proof ? UI.btn('Verifikasi & tandai bayar', 'check', 'btn-sm', function () { S.setProof(o.id, o.proof, 'verified'); S.setPayment(o.id, pay.value === 'unpaid' ? 'dp' : pay.value, method.value); UI.toast('Bukti terverifikasi'); openDetail(o.id); }) : null,
      o.proof ? UI.btn('Tolak', 'x', 'btn-quiet btn-sm', function () { S.setProof(o.id, o.proof, 'rejected'); UI.toast('Bukti ditolak', 'warn'); openDetail(o.id); }) : null));
    var est = h('input', { class: 'input', type: 'date', value: o.dueDate ? localDate(o.dueDate) : '' });
    var estNote = h('input', { class: 'input', placeholder: 'Alasan (opsional), mis. bahan datang terlambat', style: 'flex:1;min-width:200px' });
    function saveEst(notify) {
      if (!est.value) { UI.toast('Pilih tanggal estimasi dulu.', 'warn'); return; }
      var iso = new Date(est.value + 'T12:00:00').toISOString(), reason = estNote.value.trim();
      S.updateOrder(o.id, { dueDate: iso, timeline: o.timeline.concat([{ status: o.status, at: U.iso(new Date()), note: 'Estimasi siap: ' + U.dateID(iso) + (reason ? ' (' + reason + ')' : '') + (notify ? ' · pelanggan diberi tahu' : '') }]) });
      if (notify) window.open(waUrl(S.orderById(o.id), estimateText(S.orderById(o.id), reason)), '_blank', 'noopener');
      UI.toast('Estimasi siap diperbarui'); openDetail(o.id);
    }
    var estBox = h('div', { class: 'pay-box col', style: 'gap:10px' },
      h('div', null, h('div', { class: 'field-label' }, 'Estimasi siap'), h('div', { class: 'field-hint' }, PO.estimate(S.get(), o.productId, 0).text)),
      h('div', { class: 'row wrap' }, est, estNote),
      h('div', { class: 'row wrap' }, UI.btn('Simpan', null, 'btn-ghost btn-sm', function () { saveEst(false); }), UI.btn('Simpan & kabari via WA', 'message', 'btn-sm', function () { saveEst(true); })));
    var tpl = templates(o);
    var tplSel = UI.select(tpl.map(function (t, i) { return { value: i, label: t.label }; }));
    var waBox = h('div', { class: 'pay-box' }, h('div', { class: 'field-label' }, 'Pesan WhatsApp'), h('div', { class: 'row wrap', style: 'margin-top:8px' }, tplSel,
      UI.btn('Kirim via WA', 'message', 'btn-sm', function () { window.open(waUrl(o, tpl[Number(tplSel.value)].text), '_blank', 'noopener'); })));

    UI.openSheet({
      title: o.code, sub: o.customer.name + ' · ' + o.customer.phone, wide: true, foot: foot,
      body: h('div', { class: 'col', style: 'gap:18px' },
        h('div', { class: 'row between wrap' }, UI.statusPill(o.status), UI.payBadge(o)),
        o.status === 'waiting' ? h('p', { class: 'small mute' }, 'Menunggu kuota batch. Bentuk batch dari menu Antrean setelah kuota produk terpenuhi.') : null,
        h('div', { class: 'detail-grid' },
          item('Produk', productName(o.productId) + ' × ' + o.qty),
          item('Total', U.rupiah(o.total)),
          item('Sudah dibayar', U.rupiah(o.paidAmount) + (o.payment !== 'paid' ? ' (sisa ' + U.rupiah(o.total - o.paidAmount) + ')' : '')),
          item('DP wajib', U.rupiah(dpAmount(o)) + ' (' + (S.get().settings.dpPercent || 0) + '%)'),
          item('Estimasi siap', U.dateID(o.dueDate)),
          item('Sumber', o.source === 'online' ? 'Form pelanggan' : 'Dicatat pemilik'),
          item('Batch', o.batchCode || '—'),
          item('Dibuat', U.dateTimeID(o.createdAt)),
          o.note ? item('Catatan', o.note) : null),
        terminal ? null : estBox,
        h('div', { class: 'pay-box' }, h('div', { class: 'row wrap' }, pay, method, savePay)),
        proofBox, waBox,
        timeline)
    });
  }

  /* ---------- daftar ---------- */
  function list() {
    var q = filter.q.toLowerCase();
    var rows = S.get().orders.filter(function (o) {
      var cat = PO.sel.ACTIVE.indexOf(o.status) >= 0 ? 'active' : o.status;
      if (filter.cats.indexOf(cat) < 0) return false;
      if (!q) return true;
      return (o.code + o.customer.name + o.customer.phone + productName(o.productId)).toLowerCase().indexOf(q) >= 0;
    }).sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });

    lastCount = rows.length;
    if (!rows.length) return UI.empty('orders', filter.cats.length ? 'Tidak ada pesanan' : 'Pilih minimal satu status', filter.cats.length ? 'Ubah filter atau catat pesanan baru.' : 'Centang status pesanan yang ingin ditampilkan.');
    return h('div', { class: 'table-wrap' }, h('table', { class: 'table' },
      h('thead', null, h('tr', null, ['Kode', 'Pelanggan', 'Produk', 'Jml', 'Total', 'Bayar', 'Status', 'Est. siap'].map(function (t, i) { return h('th', { class: i === 3 || i === 4 ? 'num' : '' }, t); }))),
      h('tbody', null, rows.slice(0, 150).map(function (o) {
        return h('tr', { style: 'cursor:pointer', onClick: function () { openDetail(o.id); } },
          h('td', { class: 'mono' }, o.code), h('td', null, h('div', { class: 'strong' }, o.customer.name), h('div', { class: 'tiny mute mono' }, o.customer.phone)),
          h('td', null, productName(o.productId)), h('td', { class: 'num' }, o.qty), h('td', { class: 'num' }, U.rupiah(o.total)),
          h('td', null, UI.payBadge(o)), h('td', null, UI.statusPill(o.status)), h('td', { class: 'nowrap small' }, U.dateShort(o.dueDate)));
      }))));
  }

  function render() {
    var count = h('span', { class: 'strong' });
    var body = h('div');
    var box = h('div', { class: 'card' },
      h('div', { class: 'card-head' }, count, h('div', { class: 'row' }, UI.btn('Export CSV', 'download', 'btn-ghost btn-sm', function () { PO.views.reports.exportCsv(); }))), body);
    function paint() { U.clear(body); body.appendChild(list()); count.textContent = lastCount + ' baris'; }
    var search = h('input', { class: 'input', placeholder: 'Cari nama, kode, nomor, produk', value: filter.q, onInput: function (e) { filter.q = e.target.value; paint(); } });
    var counts = { active: 0, completed: 0, cancelled: 0 };
    S.get().orders.forEach(function (o) { counts[PO.sel.ACTIVE.indexOf(o.status) >= 0 ? 'active' : o.status]++; });
    var dd = UI.checkDropdown({
      options: [
        { value: 'active', label: 'Aktif (' + counts.active + ')', short: 'Aktif' },
        { value: 'completed', label: 'Selesai (' + counts.completed + ')', short: 'Selesai' },
        { value: 'cancelled', label: 'Batal (' + counts.cancelled + ')', short: 'Batal' }],
      selected: filter.cats, allLabel: 'Semua status', noneLabel: 'Pilih status',
      onChange: function (v) { filter.cats = v; paint(); }
    });
    dd.style.marginLeft = 'auto';
    paint();
    return h('div', null,
      UI.pageHead('Pesanan', S.get().orders.length + ' pesanan tercatat', [UI.btn('Pesanan baru', 'plus', '', function () { openForm(); })]),
      h('div', { class: 'toolbar' }, h('div', { class: 'search' }, PO.icons.el('search'), search), dd), box);
  }

  return { render: render, openForm: openForm, openDetail: openDetail };
})();