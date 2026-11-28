/* views/dashboard.js — ringkasan bulan berjalan. */
window.PO = window.PO || {};
PO.views = PO.views || {};
PO.views.dashboard = (function () {
  var U = PO.util, S = PO.store, D = PO.data, UI = PO.ui, Sel = PO.sel, I = PO.icons, h = U.h;
  var NS = 'http://www.w3.org/2000/svg';

  function svg(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }

  function delta(now, prev) {
    if (!prev) return h('span', { class: 'kpi-meta' }, 'Belum ada pembanding');
    var d = (now - prev) / prev * 100, up = d >= 0;
    return h('span', { class: 'delta ' + (up ? 'up' : 'down') }, I.el(up ? 'arrowUp' : 'arrowDown'), U.percent(Math.abs(d), 0) + ' vs bulan lalu');
  }

  function kpi(label, icon, value, meta) {
    return h('div', { class: 'kpi card' }, h('div', { class: 'kpi-head' }, h('span', { class: 'kpi-label' }, label), h('span', { class: 'kpi-icon' }, I.el(icon))),
      h('div', { class: 'kpi-value' }, value), h('div', { class: 'kpi-meta' }, meta));
  }

  function ring(pct) {
    var C = 2 * Math.PI * 52, p = U.clamp(pct, 0, 1);
    var s = svg('svg', { viewBox: '0 0 120 120' });
    s.appendChild(svg('circle', { class: 'ring-track', cx: 60, cy: 60, r: 52, fill: 'none' }));
    s.appendChild(svg('circle', { class: 'ring-fill', cx: 60, cy: 60, r: 52, fill: 'none', 'stroke-dasharray': (p * C) + ' ' + C }));
    return h('div', { class: 'ring-wrap' }, s, h('div', { class: 'ring-center' }, h('div', { class: 'ring-value' }, Math.round(pct * 100) + '%'), h('div', { class: 'ring-label' }, 'target bulan')));
  }

  function chart(series) {
    var W = 600, H = 220, pl = 8, pb = 26, pt = 10;
    var max = Math.max.apply(null, series.map(function (s) { return Math.max(s.revenue, s.expense); }).concat([1]));
    var s = svg('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Pendapatan dan pengeluaran per bulan' });
    [0, 0.5, 1].forEach(function (f) {
      var y = pt + (H - pt - pb) * (1 - f);
      s.appendChild(svg('line', { class: 'grid-line', x1: pl, x2: W - pl, y1: y, y2: y }));
    });
    var slot = (W - pl * 2) / series.length, bw = slot * 0.28;
    series.forEach(function (d, i) {
      var x = pl + slot * i + slot / 2;
      [[d.revenue, x - bw - 1, ''], [d.expense, x + 1, ' dim']].forEach(function (b) {
        var bh = (H - pt - pb) * b[0] / max;
        s.appendChild(svg('rect', { class: 'bar-rect' + b[2], x: b[1], y: H - pb - bh, width: bw, height: Math.max(bh, 1), rx: 3 }));
      });
      var t = svg('text', { class: 'axis-text', x: x, y: H - 8, 'text-anchor': 'middle' });
      t.textContent = d.label;
      s.appendChild(t);
    });
    return s;
  }

  function render() {
    var set = S.get().settings, thisM = U.startOfMonth(new Date());
    var rev = Sel.revenue(thisM), exp = Sel.expense(thisM), prev = Sel.revenue(U.addMonths(thisM, -1));
    var tasks = Sel.tasks(), counts = Sel.statusCounts(), series = Sel.monthSeries(6);

    var checklist = h('div', { class: 'checklist' }, tasks.length ? tasks.map(function (t) {
      return h('div', { class: 'check-item' }, h('span', { class: 'check-box' }, I.el('arrowRight')), h('div', null, h('div', { class: 'check-label' }, t.label), h('div', { class: 'check-meta' }, t.meta)));
    }) : h('div', { class: 'check-item done' }, h('span', { class: 'check-box' }, I.el('check')), h('div', null, h('div', { class: 'check-label' }, 'Tidak ada tugas mendesak'), h('div', { class: 'check-meta' }, 'Semua pesanan berjalan sesuai jadwal'))));

    var stackKeys = D.STATUSES.filter(function (s) { return counts[s.key]; });
    var total = U.sum(stackKeys, function (s) { return counts[s.key]; }) || 1;
    var stack = h('div', { class: 'stack' }, stackKeys.map(function (s) { return h('i', { class: 'st-' + s.key, style: 'flex:' + counts[s.key] + ';background:var(--st-' + s.key + ')' }); }));
    var legend = h('div', { class: 'legend-list' }, D.STATUSES.map(function (s) {
      return h('div', { class: 'legend-row' }, h('i', { class: 'legend-swatch', style: 'background:var(--st-' + s.key + ')' }), h('span', null, s.label), h('span', { class: 'legend-value mono' }, counts[s.key]));
    }));

    var recent = S.get().orders.slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); }).slice(0, 6);
    var feed = recent.length ? recent.map(function (o) {
      var p = S.productById(o.productId);
      return h('div', { class: 'order-mini', style: 'cursor:pointer', onClick: function () { PO.views.orders.openDetail(o.id); } },
        h('div', { class: 'avatar' }, U.initials(o.customer.name)),
        h('div', { class: 'order-mini-main' }, h('div', { class: 'order-mini-name' }, o.customer.name), h('div', { class: 'order-mini-sub' }, (p ? p.name : '—') + ' × ' + o.qty)),
        UI.statusPill(o.status));
    }) : UI.empty('orders', 'Belum ada pesanan', 'Catat pesanan pertama untuk mulai.');

    return h('div', null,
      UI.pageHead('Ringkasan', set.businessName + ' · ' + U.monthLabel(new Date()), [UI.btn('Pesanan baru', 'plus', '', function () { PO.views.orders.openForm(); })]),
      h('div', { class: 'dash-top' },
        h('div', { class: 'ring-card card' }, ring(set.monthlyTarget ? rev / set.monthlyTarget : 0), checklist),
        h('div', { class: 'kpi-grid' },
          kpi('Pendapatan', 'wallet', U.compactRupiah(rev), delta(rev, prev)),
          kpi('Laba bersih', 'sparkles', U.compactRupiah(rev - exp), 'Pengeluaran ' + U.compactRupiah(exp)),
          kpi('Pesanan aktif', 'flame', String(Sel.activeOrders().length), Sel.overdue().length + ' lewat jatuh tempo'),
          kpi('Belum terbayar', 'clock', U.compactRupiah(Sel.receivable()), 'Piutang pesanan berjalan'))),
      h('div', { class: 'section dash-grid' },
        UI.card('Pendapatan vs pengeluaran', [chart(series), h('div', { class: 'chart-legend' }, h('span', null, h('i', { style: 'background:var(--tp-acc)' }), 'Pendapatan'), h('span', null, h('i', { class: 'dim' }), 'Pengeluaran'))]),
        UI.card('Status pesanan', [stack, legend]),
        UI.card('Pesanan terbaru', feed, [UI.btn('Semua', null, 'btn-quiet btn-sm', function () { location.hash = '#orders'; })], 'tight')));
  }

  return { render: render };
})();
