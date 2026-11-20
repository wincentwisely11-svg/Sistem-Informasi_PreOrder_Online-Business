/* views/finance.js — pembukuan bulanan: pendapatan, pengeluaran, laba. */
window.PO = window.PO || {};
PO.views = PO.views || {};
PO.views.finance = (function () {
  var U = PO.util, S = PO.store, D = PO.data, UI = PO.ui, Sel = PO.sel, h = U.h;
  var sel = { month: new Date().getMonth(), year: new Date().getFullYear() };

  function openExpense() {
    var date = h('input', { class: 'input', type: 'date', value: new Date().toISOString().slice(0, 10) });
    var cat = UI.select(D.EXPENSE_CATEGORIES.map(function (c) { return { value: c, label: c }; }));
    var amount = h('input', { class: 'input mono', inputMode: 'numeric', placeholder: '0' });
    var codes = {};
    S.get().orders.forEach(function (o) { if (o.batchCode) codes[o.batchCode] = 1; });
    var batch = UI.select([{ value: '', label: 'Tanpa batch' }].concat(Object.keys(codes).sort().reverse().slice(0, 12).map(function (c) { return { value: c, label: c }; })));
    var note = h('input', { class: 'input', placeholder: 'Contoh: belanja tepung & mentega' });
    var fAmount = UI.field('Nominal (Rp)', amount, { req: true });
    var fDate = UI.field('Tanggal', date, { req: true });
    function submit() {
      var errs = [[fAmount, U.validateMoney(amount.value)], [fDate, date.value ? '' : 'Tanggal wajib diisi.']];
      var bad = errs.filter(function (e) { e[0].setError(e[1]); return e[1]; });
      if (bad.length) { U.$('input', bad[0][0]).focus(); return; }
      S.addExpense({ date: date.value + 'T12:00:00', category: cat.value, amount: amount.value, note: note.value, batchCode: batch.value });
      UI.closeSheet(); UI.toast('Pengeluaran dicatat');
    }
    UI.openSheet({ title: 'Catat pengeluaran', body: h('div', { class: 'form-grid' }, fDate, UI.field('Kategori', cat), fAmount, UI.field('Batch', batch), UI.field('Catatan', note, { span: true })),
      foot: [UI.btn('Batal', null, 'btn-ghost', UI.closeSheet), UI.btn('Simpan', 'check', '', submit)] });
  }

  function row(label, amount, cls) {
    return h('div', { class: 'fin-row' + (cls ? ' ' + cls : '') }, h('span', null, label), h('span', { class: 'fin-amount mono' + (amount < 0 ? ' neg' : '') }, U.rupiah(amount)));
  }

  function render() {
    var thisYear = new Date().getFullYear(), firstYear = S.startYear();
    sel.year = U.clamp(sel.year, firstYear, thisYear);
    var month = new Date(sel.year, sel.month, 1);
    var rev = Sel.revenue(month), exp = Sel.expense(month), cogs = Sel.cogs(month), expList = Sel.expensesIn(month);
    var byCat = {};
    expList.forEach(function (e) { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });

    var monthSel = UI.select(U.MONTHS.map(function (name, i) { return { value: i, label: name }; }), sel.month);
    var yearOpts = [];
    for (var y = firstYear; y <= thisYear; y++) yearOpts.push({ value: y, label: String(y) });
    var yearSel = UI.select(yearOpts, sel.year);
    monthSel.addEventListener('change', function () { sel.month = Number(monthSel.value); PO.app.render(); });
    yearSel.addEventListener('change', function () { sel.year = Number(yearSel.value); PO.app.render(); });
    var fMonth = UI.field('Bulan', monthSel), fYear = UI.field('Tahun', yearSel);
    fMonth.style.minWidth = '150px'; fYear.style.minWidth = '110px';
    var picker = h('div', { class: 'row', style: 'gap:10px;align-items:flex-end' }, fMonth, fYear);
    var summary = UI.card('Laba rugi ' + U.monthLabel(month), [
      row('Pendapatan (pesanan selesai)', rev), row('Total pengeluaran', -exp), row('Laba bersih', rev - exp, 'total'),
      h('p', { class: 'fin-note' }, 'Estimasi HPP produk terjual ' + U.rupiah(cogs) + ' · margin kotor ' + (rev ? U.percent((rev - cogs) / rev * 100, 0) : '0%') + '.')]);

    var cats = Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; });
    var catCard = UI.card('Pengeluaran per kategori', cats.length ? cats.map(function (c) {
      return h('div', { class: 'cat-row' }, h('span', { class: 'cat-name' }, c), h('div', { class: 'bar' }, h('span', { style: 'width:' + (byCat[c] / exp * 100) + '%' })), h('span', { class: 'mono small' }, U.compactRupiah(byCat[c])));
    }) : UI.empty('wallet', 'Belum ada pengeluaran', 'Catat belanja bahan agar laba bulan ini akurat.'));

    var table = expList.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'table' },
      h('thead', null, h('tr', null, ['Tanggal', 'Kategori', 'Catatan', 'Batch', 'Nominal', ''].map(function (t, i) { return h('th', { class: i === 4 ? 'num' : '' }, t); }))),
      h('tbody', null, expList.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); }).map(function (e) {
        return h('tr', null, h('td', { class: 'nowrap' }, U.dateShort(e.date)), h('td', null, e.category), h('td', null, e.note || '—'), h('td', { class: 'mono small' }, e.batchCode || '—'),
          h('td', { class: 'num' }, U.rupiah(e.amount)),
          h('td', { class: 'row-actions' }, UI.btn('', 'trash', 'btn-quiet btn-icon', function () {
            UI.confirm({ title: 'Hapus pengeluaran?', text: e.category + ' · ' + U.rupiah(e.amount), ok: 'Hapus', danger: true, onOk: function () { S.deleteExpense(e.id); UI.toast('Pengeluaran dihapus'); } });
          })));
      })))) : UI.empty('note', 'Tidak ada transaksi', 'Pengeluaran bulan ini akan tampil di sini.');

    return h('div', null,
      UI.pageHead('Keuangan', 'Ringkasan otomatis dari pesanan selesai dan pengeluaran.', [h('div', { class: 'row', style: 'gap:10px;align-items:flex-end;flex-wrap:wrap' }, picker, UI.btn('Catat pengeluaran', 'plus', '', openExpense))]),
      h('div', { class: 'fin-grid' }, summary, catCard),
      h('div', { class: 'section' }, UI.card('Riwayat pengeluaran', table, null, 'tight')));
  }

  return { render: render };
})();
