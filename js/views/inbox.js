/* views/inbox.js — kotak masuk pesanan dari pelanggan (form online / impor WhatsApp). */
window.PO = window.PO || {};
PO.views = PO.views || {};
PO.views.inbox = (function () {
  var U = PO.util, S = PO.store, UI = PO.ui, IB = PO.inbox, h = U.h;

  function productName(id) {
    var p = S.productById(id);
    return p ? p.name : 'Produk tidak ditemukan';
  }

  function acceptOrder(rec) {
    var prod = S.productById(rec.productId);
    if (!prod) {
      UI.toast('Produk pada pesanan ini sudah dihapus.', 'error');
      return;
    }
    var method = rec.paymentMethod || 'Transfer Bank';
    var order = S.createOrder({
      name: rec.name,
      phone: rec.phone,
      productId: rec.productId,
      qty: rec.qty,
      includeServiceFee: rec.includeServiceFee !== false,
      payment: 'unpaid',
      paymentMethod: method,
      note: rec.note || '',
      proof: rec.proof || '',
      source: rec.source || 'online'
    });
    IB.update(rec.id, { status: 'accepted', orderId: order.id });
    var made = S.autoBatchAll();
    UI.toast(
      made.length
        ? order.code + ' diterima · batch ' + made[0].code + ' terbentuk'
        : order.code + ' diterima masuk antrean'
    );
    PO.app.refresh();
  }

  function rejectOrder(rec) {
    var reasonInput = h('textarea', {
      class: 'textarea',
      rows: 3,
      placeholder: 'Contoh: Stok bahan baku habis, kuota hari ini penuh, atau bukti pembayaran tidak valid...'
    });
    var fReason = UI.field('Alasan penolakan / pembatalan', reasonInput, {
      req: true,
      hint: 'Alasan ini akan tampil di halaman Pesanan Saya milik pelanggan.'
    });

    function doReject() {
      var reason = reasonInput.value.trim();
      if (!reason) {
        fReason.setError('Tuliskan alasan penolakan terlebih dahulu.');
        reasonInput.focus();
        return;
      }
      IB.update(rec.id, {
        status: 'rejected',
        rejectReason: reason,
        rejectedAt: new Date().toISOString()
      });
      UI.closeSheet();
      UI.toast('Pesanan masuk ditolak', 'warn');
      PO.app.refresh();
    }

    UI.openSheet({
      title: 'Tolak pesanan ' + rec.id + '?',
      sub: 'Pesanan dari ' + rec.name + ' tidak akan dimasukkan ke daftar pesanan.',
      body: h('div', null, fReason),
      foot: [
        UI.btn('Batal', null, 'btn-ghost', UI.closeSheet),
        UI.btn('Tolak pesanan', 'x', 'btn-danger', doReject)
      ]
    });
  }

  function openImport() {
    var ta = h('textarea', {
      class: 'textarea mono',
      rows: 5,
      placeholder: 'Tempel seluruh pesan WhatsApp dari pelanggan yang berisi kode [Batchin#...]'
    });
    var fTa = UI.field('Pesan WhatsApp', ta, {
      req: true,
      hint: 'Kode [Batchin#...] di akhir pesan otomatis terbaca.'
    });

    function doImport() {
      var parsed = IB.decode(ta.value);
      if (!parsed || !parsed.name || !parsed.productId) {
        fTa.setError('Kode [Batchin#...] tidak ditemukan atau tidak valid.');
        return;
      }
      var added = IB.add({
        name: parsed.name,
        phone: parsed.phone,
        productId: parsed.productId,
        qty: parsed.qty,
        includeServiceFee: true,
        paymentMethod: parsed.paymentMethod || 'Transfer Bank',
        note: parsed.note || '',
        source: 'whatsapp'
      });
      if (!added) {
        UI.toast('Gagal menyimpan pesanan masuk.', 'error');
        return;
      }
      UI.closeSheet();
      UI.toast('Pesanan dari ' + parsed.name + ' berhasil diimpor');
      PO.app.refresh();
    }

    UI.openSheet({
      title: 'Impor dari WhatsApp',
      sub: 'Salin chat pesanan pelanggan lalu tempel di bawah ini.',
      body: h('div', null, fTa),
      foot: [
        UI.btn('Batal', null, 'btn-ghost', UI.closeSheet),
        UI.btn('Impor pesanan', 'check', '', doImport)
      ]
    });
  }

  function viewProof(rec) {
    UI.openSheet({
      title: 'Bukti pembayaran · ' + rec.id,
      sub: rec.name + ' · ' + (rec.paymentMethod || 'Transfer Bank'),
      body: h('div', { style: 'text-align:center;' },
        h('img', {
          src: rec.proof,
          alt: 'Bukti bayar',
          style: 'max-width:100%;max-height:65vh;border-radius:10px;border:1px solid var(--tp-line);'
        })
      ),
      foot: [UI.btn('Tutup', null, 'btn-ghost', UI.closeSheet)]
    });
  }

  function render() {
    var all = IB.list().slice().sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    var pending = all.filter(function (r) { return r.status === 'pending'; });
    var history = all.filter(function (r) { return r.status === 'accepted'; });

    var pendingBox = pending.length
      ? h('div', { class: 'col', style: 'gap:12px;' }, pending.map(function (rec) {
          var p = S.productById(rec.productId);
          var sub = p ? p.price * rec.qty : 0;
          var charges = S.calcCharges(sub, rec.includeServiceFee !== false);
          var method = rec.paymentMethod || 'Transfer Bank';
          var isCash = method === 'Cash';

          return h('div', { class: 'card' },
            h('div', { class: 'card-head' },
              h('div', null,
                h('span', { class: 'mono strong' }, rec.id),
                h('span', { class: 'mute small' }, ' · ' + U.dateTimeID(rec.createdAt))
              ),
              h('div', { class: 'row wrap' },
                h('span', { class: 'badge ' + (isCash ? 'badge-mute' : 'badge-info') }, method),
                rec.proof ? h('span', { class: 'badge badge-ok' }, 'Ada bukti bayar') : null
              )
            ),
            h('div', { class: 'card-body' },
              h('div', { class: 'detail-grid', style: 'padding:0;' },
                h('div', { class: 'detail-item' },
                  h('div', { class: 'detail-key' }, 'Pelanggan'),
                  h('div', { class: 'detail-val' }, rec.name + ' (' + rec.phone + ')')
                ),
                h('div', { class: 'detail-item' },
                  h('div', { class: 'detail-key' }, 'Produk & Jumlah'),
                  h('div', { class: 'detail-val' }, productName(rec.productId) + ' × ' + rec.qty)
                ),
                h('div', { class: 'detail-item' },
                  h('div', { class: 'detail-key' }, 'Total Tagihan (Full 100%)'),
                  h('div', { class: 'detail-val mono' }, U.rupiah(charges.total)),
                  h('div', { class: 'tiny mute' }, 'Sub ' + U.rupiah(charges.subtotal) + ' + Fee ' + U.rupiah(charges.serviceFee) + ' + Pajak 12% ' + U.rupiah(charges.tax))
                ),
                h('div', { class: 'detail-item' },
                  h('div', { class: 'detail-key' }, 'Metode Pembayaran'),
                  h('div', { class: 'detail-val' }, method + (isCash ? ' (Tanpa bukti transfer)' : ''))
                ),
                rec.note
                  ? h('div', { class: 'detail-item', style: 'grid-column:1/-1;' },
                      h('div', { class: 'detail-key' }, 'Catatan'),
                      h('div', { class: 'detail-val' }, rec.note)
                    )
                  : null
              )
            ),
            h('div', { class: 'card-foot' },
              h('div', { class: 'row wrap' },
                rec.proof
                  ? UI.btn('Lihat bukti', 'eye', 'btn-ghost btn-sm', function () { viewProof(rec); })
                  : h('span', { class: 'small mute' }, isCash ? 'Bayar tunai (Cash)' : 'Belum ada bukti')
              ),
              h('div', { class: 'row wrap' },
                UI.btn('Tolak', 'x', 'btn-ghost btn-sm', function () { rejectOrder(rec); }),
                UI.btn('Terima pesanan', 'check', 'btn-sm', function () { acceptOrder(rec); })
              )
            )
          );
        }))
      : UI.empty('inbox', 'Tidak ada pesanan masuk', 'Pesanan baru dari pelanggan atau hasil impor WhatsApp akan muncul di sini.');

    var historySection = history.length
      ? h('div', { class: 'section' },
          h('div', { class: 'section-head' }, h('h2', { class: 'section-title' }, 'Riwayat ditinjau')),
          h('div', { class: 'card' },
            h('div', { class: 'table-wrap' },
              h('table', { class: 'table' },
                h('thead', null, h('tr', null, ['ID', 'Pelanggan', 'Produk', 'Metode', 'Status & Keterangan'].map(function (t) { return h('th', null, t); }))),
                h('tbody', null, history.slice(0, 50).map(function (r) {
                  return h('tr', null,
                    h('td', { class: 'mono' }, r.id),
                    h('td', null, r.name),
                    h('td', null, productName(r.productId) + ' × ' + r.qty),
                    h('td', null, r.paymentMethod || 'Transfer Bank'),
                    h('td', null, r.status === 'accepted'
                      ? h('span', { class: 'badge badge-ok' }, 'Diterima' + (r.orderId ? ' (' + r.orderId + ')' : ''))
                      : h('div', null,
                          h('span', { class: 'badge badge-danger' }, 'Ditolak'),
                          r.rejectReason ? h('div', { class: 'tiny mute', style: 'margin-top:4px;' }, 'Alasan: ' + r.rejectReason) : null
                        ))
                  );
                }))
              )
            )
          )
        )
      : null;

    return h('div', null,
      UI.pageHead('Pesanan masuk', pending.length + ' menunggu konfirmasi', [
        UI.btn('Impor dari WA', 'message', 'btn-ghost', openImport)
      ]),
      pendingBox,
      historySection
    );
  }

  return { render: render };
})();