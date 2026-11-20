/* views/reports.js — evaluasi layanan: pembatalan, durasi, produk terlaris. */
window.PO = window.PO || {};
PO.views = PO.views || {};
PO.views.reports = (function () {
  var U = PO.util, S = PO.store, D = PO.data, UI = PO.ui, Sel = PO.sel, h = U.h;

  function tile(label, big, sub) { return h('div', { class: 'rep-tile card' }, h('div', { class: 'kpi-label' }, label), h('div', { class: 'rep-big' }, big), h('div', { class: 'kpi-meta' }, sub)); }

  function exportCsv() {
    var rows = [['Kode', 'Tanggal', 'Pelanggan', 'WhatsApp', 'Produk', 'Jumlah', 'Total', 'Dibayar', 'Status', 'Batch']];
    S.get().orders.forEach(function (o) {
      var p = S.productById(o.productId);
      rows.push([o.code, U.dateID(o.createdAt), o.customer.name, o.customer.phone, p ? p.name : '', o.qty, o.total, o.paidAmount, D.statusMeta(o.status).label, o.batchCode]);
    });
    UI.downloadCsv('batchin-pesanan.csv', rows);
    UI.toast('CSV pesanan diunduh');
  }

  function render() {
    var counts = Sel.statusCounts(), max = Math.max.apply(null, D.STATUSES.map(function (s) { return counts[s.key]; }).concat([1]));
    var rc = Sel.repeatCustomers(), top = Sel.topProducts(), series = Sel.monthSeries(6).reverse();
    var cancelled = counts.cancelled;

    var funnel = h('div', { class: 'funnel' }, D.STATUSES.map(function (s) {
      return h('div', { class: 'funnel-row' }, h('span', null, s.label), h('div', { class: 'bar' }, h('span', { style: 'width:' + (counts[s.key] / max * 100) + '%;background:var(--st-' + s.key + ')' })), h('span', { class: 'mono' }, counts[s.key]));
    }));
    var ranks = top.length ? top.slice(0, 5).map(function (r, i) {
      return h('div', { class: 'rank-row' }, h('span', { class: 'rank-num mono' }, i + 1), h('div', { class: 'spacer' }, h('div', { class: 'strong' }, r.product.name), h('div', { class: 'tiny mute' }, r.qty + ' ' + r.product.unit + ' terjual')), h('span', { class: 'mono' }, U.compactRupiah(r.revenue)));
    }) : UI.empty('report', 'Belum ada penjualan selesai');
    var monthly = h('div', { class: 'table-wrap' }, h('table', { class: 'table' },
      h('thead', null, h('tr', null, ['Bulan', 'Pendapatan', 'Pengeluaran', 'Laba'].map(function (t, i) { return h('th', { class: i ? 'num' : '' }, t); }))),
      h('tbody', null, series.map(function (m) { return h('tr', null, h('td', null, U.monthLabel(m.date)), h('td', { class: 'num' }, U.rupiah(m.revenue)), h('td', { class: 'num' }, U.rupiah(m.expense)), h('td', { class: 'num' }, U.rupiah(m.profit))); }))));

    return h('div', null,
      UI.pageHead('Laporan', 'Evaluasi layanan untuk menjaga pelanggan tetap kembali.', [UI.btn('Unduh CSV pesanan', 'download', 'btn-ghost', exportCsv)]),
      h('div', { class: 'rep-grid' },
        tile('Tingkat pembatalan', U.percent(Sel.cancelRate(), 1), cancelled + ' pesanan batal'),
        tile('Rata-rata durasi', U.percent(Sel.avgDays(), 1).replace('%', '') + ' hari', 'Dari pesan sampai selesai'),
        tile('Pelanggan berulang', rc.repeat + '/' + rc.total, 'Memesan lebih dari sekali'),
        tile('Piutang berjalan', U.compactRupiah(Sel.receivable()), 'Pesanan belum lunas')),
      h('div', { class: 'section fin-grid' }, UI.card('Alur pesanan', funnel), UI.card('Produk terlaris', ranks)),
      h('div', { class: 'section' }, UI.card('Rekap 6 bulan', monthly, null, 'tight')));
  }

  return { render: render, exportCsv: exportCsv };
})();
