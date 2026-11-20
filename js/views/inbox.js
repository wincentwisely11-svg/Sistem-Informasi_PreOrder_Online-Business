/* views/inbox.js — pesanan online yang masuk lewat form pelanggan atau impor WhatsApp. */
window.PO = window.PO || {};
PO.views = PO.views || {};
PO.views.inbox = (function () {
  var U = PO.util, S = PO.store, UI = PO.ui, I = PO.icons, IB = PO.inbox, h = U.h;

  function formUrl() { return new URL('pesan.html', location.href).href; }
  function copy(text) {
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { UI.toast('Link disalin'); }, function () { UI.toast(text); });
    else UI.toast(text);
  }

  function accept(rec) {
    try {
      var o = S.createOrder({ name: rec.name, phone: rec.phone, productId: rec.productId, qty: rec.qty, note: rec.note, source: 'online', proof: rec.proof || '' });
      IB.update(rec.id, { status: 'accepted', orderCode: o.code });
      var made = S.autoBatchAll();
      UI.toast(made.length ? o.code + ' diterima · batch ' + made[0].code + ' terbentuk' : o.code + ' diterima, masuk antrean');
    } catch (err) { UI.toast(err.message, 'error'); }
    PO.app.render();
  }

  function reject(rec) {
    UI.confirm({ title: 'Tolak ' + rec.id + '?', text: rec.name + ' tidak akan dibuatkan pesanan.', ok: 'Tolak', danger: true, onOk: function () { IB.update(rec.id, { status: 'rejected' }); PO.app.render(); } });
  }

  function row(rec) {
    var p = S.productById(rec.productId);
    var est = p ? PO.estimate(S.get(), p.id, rec.qty).text : '';
    return h('div', { class: 'inb-row' },
      rec.proof ? h('img', { class: 'inb-proof', src: rec.proof, alt: 'Bukti bayar' }) : null,
      h('div', { style: 'flex:1;min-width:200px' },
        h('div', { class: 'strong' }, rec.name, h('span', { class: 'tiny mute mono', style: 'margin-left:8px' }, rec.id + ' · ' + U.dateTimeID(rec.createdAt))),
        h('div', { class: 'small mono mute' }, rec.phone),
        h('div', null, p ? p.name + ' × ' + rec.qty + ' · ' + U.rupiah(p.price * rec.qty) : 'Produk tidak ditemukan'),
        est ? h('div', { class: 'small mute' }, est) : null,
        rec.note ? h('div', { class: 'small' }, 'Catatan: ' + rec.note) : null),
      h('div', { class: 'row' }, UI.btn('Tolak', 'x', 'btn-ghost btn-sm', function () { reject(rec); }), UI.btn('Terima', 'check', 'btn-sm', function () { accept(rec); })));
  }

  function render() {
    var all = IB.list().slice().reverse();
    var pending = all.filter(function (r) { return r.status === 'pending'; });
    var done = all.filter(function (r) { return r.status !== 'pending'; }).slice(0, 6);
    var url = formUrl();

    var paste = h('textarea', { class: 'textarea', placeholder: 'Tempel pesan WhatsApp pelanggan yang berisi kode [Batchin#...]' });
    var importBtn = UI.btn('Impor pesanan', 'download', 'btn-sm', function () {
      var d = IB.decode(paste.value);
      if (!d || !S.productById(d.productId)) { UI.toast('Kode pesanan tidak ditemukan atau produknya sudah berubah.', 'warn'); return; }
      d.source = 'whatsapp';
      IB.add(d); paste.value = ''; UI.toast('Pesanan diimpor ke daftar tinjauan'); PO.app.render();
    });

    var linkCard = UI.card('Link pemesanan pelanggan', h('div', { class: 'col' },
      h('p', { class: 'small mute' }, 'Bagikan link ini di bio Instagram atau status WhatsApp. Pelanggan memilih produk dan melihat estimasi tanpa perlu chat panjang.'),
      h('div', { class: 'row wrap' }, h('input', { class: 'input mono', readOnly: true, value: url, style: 'flex:1;min-width:200px' }),
        UI.btn('Salin', 'copy', 'btn-ghost btn-sm', function () { copy(url); }),
        h('a', { class: 'btn btn-ghost btn-sm', href: url, target: '_blank', rel: 'noopener' }, I.el('eye'), h('span', null, 'Buka form')))));

    var list = pending.length ? pending.map(row) : UI.empty('message', 'Belum ada pesanan masuk', 'Pesanan dari form pelanggan akan muncul di sini untuk kamu tinjau.');
    var hist = done.length ? done.map(function (r) {
      return h('div', { class: 'inb-row' }, h('div', { style: 'flex:1' }, h('span', { class: 'strong' }, r.name), h('span', { class: 'small mute' }, ' · ' + r.id)),
        h('span', { class: 'badge ' + (r.status === 'accepted' ? 'badge-ok' : 'badge-mute') }, r.status === 'accepted' ? 'Diterima ' + (r.orderCode || '') : 'Ditolak'));
    }) : null;

    return h('div', null,
      UI.pageHead('Pesan Masuk', pending.length + ' pesanan menunggu ditinjau', []),
      linkCard,
      h('div', { class: 'section' }, UI.card('Menunggu ditinjau', list, null, 'tight')),
      h('div', { class: 'section fin-grid' },
        UI.card('Impor dari WhatsApp', h('div', { class: 'col' }, h('p', { class: 'small mute' }, 'Pelanggan yang memesan lewat form mengirim pesan WhatsApp berisi kode. Tempel di sini bila form dibuka dari perangkat lain.'), paste, importBtn)),
        hist ? UI.card('Riwayat terakhir', hist, null, 'tight') : h('div')));
  }

  return { render: render };
})();
