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
    var f = {
      name: UI.field('Nama produk', name, { req: true, span: true }), cat: UI.field('Kategori', cat), unit: UI.field('Satuan', unit),
      price: UI.field('Harga jual (Rp)', price, { req: true }), hpp: UI.field('HPP per satuan (Rp)', hpp, { hint: 'Dipakai untuk menghitung margin.' }),
      quota: UI.field('Kuota per batch', quota, { req: true, hint: 'Jumlah minimal agar produksi dimulai.' })
    };
    function submit() {
      var errs = [[f.name, U.validateName(name.value).replace('pelanggan', 'produk')], [f.price, U.validateMoney(price.value)], [f.quota, U.validateQty(quota.value, 1, 9999)]];
      if (hpp.value.trim() && !/^\d+$/.test(hpp.value.trim())) errs.push([f.hpp, 'HPP hanya boleh berisi angka.']);
      var bad = errs.filter(function (e) { e[0].setError(e[1]); return e[1]; });
      if (bad.length) { U.$('input', bad[0][0]).focus(); return; }
      var data = { name: name.value.trim(), category: cat.value.trim() || 'Umum', price: Number(price.value), hpp: Number(hpp.value || 0), batchQuota: Number(quota.value), unit: unit.value.trim() || set.batchUnit };
      if (p) S.updateProduct(p.id, data); else S.addProduct(data);
      UI.closeSheet(); UI.toast(p ? 'Produk diperbarui' : 'Produk ditambahkan');
    }
    UI.openSheet({ title: p ? 'Ubah produk' : 'Produk baru', body: h('div', { class: 'form-grid' }, f.name, f.cat, f.unit, f.price, f.hpp, f.quota),
      foot: [UI.btn('Batal', null, 'btn-ghost', UI.closeSheet), UI.btn('Simpan', 'check', '', submit)] });
  }

  function fact(v, k) { return h('div', { class: 'prod-fact' }, h('b', null, v), h('span', null, k)); }

  function tile(p) {
    var margin = p.price ? (p.price - p.hpp) / p.price * 100 : 0;
    return h('div', { class: 'prod card', style: p.active ? '' : 'opacity:.6' },
      h('div', { class: 'prod-top' }, h('div', null, h('div', { class: 'prod-name' }, p.name), h('div', { class: 'prod-cat' }, p.category)),
        h('span', { class: 'badge ' + (p.active ? 'badge-ok' : 'badge-mute') }, p.active ? 'Aktif' : 'Nonaktif')),
      h('div', { class: 'prod-price mono' }, U.rupiah(p.price)),
      h('div', { class: 'prod-facts' }, fact(U.rupiah(p.hpp), 'HPP'), fact(U.percent(margin, 0), 'Margin'), fact(p.batchQuota + ' ' + p.unit, 'Kuota batch')),
      h('div', { class: 'row', style: 'margin-top:12px' },
        UI.btn('Ubah', 'edit', 'btn-ghost btn-sm', function () { openForm(p.id); }),
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
