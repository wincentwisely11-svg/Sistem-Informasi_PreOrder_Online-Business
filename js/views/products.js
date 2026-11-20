/* views/products.js — katalog produk, HPP, dan kuota batch. */
window.PO = window.PO || {};
PO.views = PO.views || {};
PO.views.products = (function () {
  var U = PO.util, S = PO.store, UI = PO.ui, h = U.h;

  function openForm(id) {
    var p = id ? S.productById(id) : null, set = S.get().settings;
    var name = h('input', { class: 'input', value: p ? p.name : '', placeholder: 'Nama produk' });
    var cat = h('input', { class: 'input', value: p ? p.category : '', placeholder: 'Kategori' });
    var price = h('input', { class: 'input mono', value: p ? p.price : '', inputMode: 'numeric', placeholder: '0' });
    var hpp = h('input', { class: 'input mono', value: p ? p.hpp : '', inputMode: 'numeric', placeholder: '0' });
    var quota = h('input', { class: 'input mono', value: p ? p.batchQuota : set.batchQuota, inputMode: 'numeric' });
    var unit = h('input', { class: 'input', value: p ? p.unit : set.batchUnit });
    var poOpen = UI.select([{ value: '1', label: 'Buka — menerima pesanan' }, { value: '0', label: 'Tutup — tidak menerima pesanan' }], p && p.poOpen === false ? '0' : '1');
    var poClose = h('input', { class: 'input', type: 'date', value: p && p.poCloseDate || '' });
    var ready = h('input', { class: 'input', type: 'date', value: p && p.readyDate || '' });
    var apply = h('input', { type: 'checkbox' });
    var image = UI.imageField({ label: 'Gambar produk', value: p ? p.image : '', w: 480, h: 360, round: false, hint: 'Rasio 4:3, otomatis dipotong dan dikompres.' });
    var f = {
      name: UI.field('Nama produk', name, { req: true, span: true }), cat: UI.field('Kategori', cat), unit: UI.field('Satuan', unit),
      price: UI.field('Harga jual (Rp)', price, { req: true }), hpp: UI.field('HPP per satuan (Rp)', hpp, { hint: 'Dipakai untuk menghitung margin.' }),
      poOpen: UI.field('Status PO', poOpen), poClose: UI.field('Tutup otomatis setelah', poClose, { hint: 'Kosongkan jika tanpa batas.' }),
      ready: UI.field('Estimasi siap (opsional)', ready, { span: true, hint: 'Jadi estimasi untuk pesanan baru. Kosongkan agar dihitung otomatis dari kuota batch.' }),
      quota: UI.field('Kuota per batch', quota, { req: true, hint: 'Jumlah minimal agar produksi dimulai.' })
    };
    function submit() {
      var errs = [[f.name, U.validateName(name.value).replace('pelanggan', 'produk')], [f.price, U.validateMoney(price.value)], [f.quota, U.validateQty(quota.value, 1, 9999)]];
      if (hpp.value.trim() && !/^\d+$/.test(hpp.value.trim())) errs.push([f.hpp, 'HPP hanya boleh berisi angka.']);
      var bad = errs.filter(function (e) { e[0].setError(e[1]); return e[1]; });
      if (bad.length) { U.$('input', bad[0][0]).focus(); return; }
      var data = { image: image.getValue(), name: name.value.trim(), category: cat.value.trim() || 'Umum', price: Number(price.value), hpp: Number(hpp.value || 0), batchQuota: Number(quota.value), unit: unit.value.trim() || set.batchUnit, poOpen: poOpen.value === '1', poCloseDate: poClose.value, readyDate: ready.value };
      if (p) S.updateProduct(p.id, data); else S.addProduct(data);
      var msg = p ? 'Produk diperbarui' : 'Produk ditambahkan';
      if (p && apply.checked && ready.value) {
        var iso = new Date(ready.value + 'T12:00:00').toISOString(), n = 0;
        S.get().orders.forEach(function (o) {
          if (o.productId !== p.id || PO.sel.ACTIVE.indexOf(o.status) < 0) return;
          n++;
          S.updateOrder(o.id, { dueDate: iso, timeline: o.timeline.concat([{ status: o.status, at: U.iso(new Date()), note: 'Estimasi siap: ' + U.dateID(iso) }]) });
        });
        msg += ' · estimasi ' + n + ' pesanan aktif diperbarui';
      }
      UI.closeSheet(); UI.toast(msg);
    }
    UI.openSheet({ title: p ? 'Ubah produk' : 'Produk baru', body: h('div', { class: 'form-grid' }, image, f.name, f.cat, f.unit, f.price, f.hpp, f.quota, f.poOpen, f.poClose, f.ready,
      p ? h('label', { class: 'row', style: 'grid-column:1/-1;gap:8px' }, apply, h('span', { class: 'small' }, 'Perbarui juga estimasi semua pesanan aktif produk ini')) : null),
      foot: [UI.btn('Batal', null, 'btn-ghost', UI.closeSheet), UI.btn('Simpan', 'check', '', submit)] });
  }

  function fact(v, k) { return h('div', { class: 'prod-fact' }, h('b', null, v), h('span', null, k)); }

  function tile(p) {
    var po = PO.poState(p);
    var margin = p.price ? (p.price - p.hpp) / p.price * 100 : 0;
    return h('div', { class: 'prod card', style: p.active ? '' : 'opacity:.6' },
      h('div', { class: 'prod-img' }, p.image ? h('img', { src: p.image, alt: p.name, loading: 'lazy' }) : PO.icons.el('box')),
      h('div', { class: 'prod-top' }, h('div', null, h('div', { class: 'prod-name' }, p.name), h('div', { class: 'prod-cat' }, p.category)),
        p.active ? h('span', { class: 'badge ' + (po.open ? 'badge-ok' : 'badge-warn') }, po.open ? 'PO buka' : 'PO tutup') : h('span', { class: 'badge badge-mute' }, 'Nonaktif')),
      h('div', { class: 'prod-price mono' }, U.rupiah(p.price)),
      p.readyDate || p.poCloseDate ? h('div', { class: 'small mute' }, [p.readyDate ? 'Estimasi siap ' + U.dateShort(p.readyDate) : '', p.poCloseDate && po.open ? 'PO tutup ' + U.dateShort(p.poCloseDate) : ''].filter(Boolean).join(' · ')) : null,
      h('div', { class: 'prod-facts' }, fact(U.rupiah(p.hpp), 'HPP'), fact(U.percent(margin, 0), 'Margin'), fact(p.batchQuota + ' ' + p.unit, 'Kuota batch')),
      h('div', { class: 'row', style: 'margin-top:12px;flex-wrap:wrap;gap:6px' },
        UI.btn('Ubah', 'edit', 'btn-ghost btn-sm', function () { openForm(p.id); }),
        p.active ? UI.btn(po.open ? 'Tutup PO' : 'Buka PO', null, 'btn-quiet btn-sm', function () { S.updateProduct(p.id, po.open ? { poOpen: false } : { poOpen: true, poCloseDate: '' }); }) : null,
        UI.btn(p.active ? 'Nonaktifkan' : 'Aktifkan', null, 'btn-quiet btn-sm', function () { S.updateProduct(p.id, { active: !p.active }); }),
        h('span', { class: 'spacer' }),
        UI.btn('', 'trash', 'btn-quiet btn-icon', function () {
          var r = S.deleteProduct(p.id);
          UI.toast(r.ok ? 'Produk dihapus' : r.reason, r.ok ? 'ok' : 'warn');
        })));
  }

  function render() {
    var list = S.get().products;
    return h('div', null,
      UI.pageHead('Produk', 'Atur harga, HPP, dan kuota batch tiap produk.', [UI.btn('Produk baru', 'plus', '', function () { openForm(); })]),
      list.length ? h('div', { class: 'prod-grid' }, list.map(tile)) : UI.empty('box', 'Belum ada produk', 'Tambahkan produk agar pesanan bisa dicatat.'));
  }

  return { render: render };
})();