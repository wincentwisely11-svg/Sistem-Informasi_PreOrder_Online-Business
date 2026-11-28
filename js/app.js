/* app.js — shell panel admin (sidebar + topbar), navigasi hash, render ulang saat state berubah. */
window.PO = window.PO || {};
PO.app = (function () {
  var U = PO.util, S = PO.store, I = PO.icons, h = U.h;
  var ROUTES = [
    { key: 'dashboard', label: 'Ringkasan', title: 'Ringkasan', icon: 'dashboard' },
    { key: 'inbox', label: 'Pesanan Masuk', title: 'Pesanan Masuk', icon: 'message' },
    { key: 'orders', label: 'Pesanan', title: 'Pesanan', icon: 'orders' },
    { key: 'kanban', label: 'Antrean', title: 'Antrean Produksi', icon: 'kanban' },
    { key: 'products', label: 'Produk', title: 'Produk', icon: 'box' },
    { key: 'finance', label: 'Keuangan', title: 'Keuangan', icon: 'wallet' },
    { key: 'reports', label: 'Laporan', title: 'Laporan', icon: 'report' },
    { key: 'settings', label: 'Pengaturan', title: 'Pengaturan', icon: 'settings' }
  ];
  var main, sidebar, titleEl, dateEl;

  function route() {
    var key = location.hash.replace('#', '');
    return ROUTES.filter(function (r) { return r.key === key; })[0] || ROUTES[0];
  }

  function applyTheme() {
    var set = S.get().settings;
    PO.ui.applyColors(set);
    PO.ui.applyFontScale();
    document.title = set.businessName + ' — Batchin';
  }

  function setMenu(open) { document.body.classList.toggle('menu-open', !!open); }

  function buildSidebar() {
    var set = S.get().settings, current = route().key;
    var owner = set.ownerName || set.businessName;
    var pending = (window.PO && PO.inbox && PO.inbox.pendingCount) ? PO.inbox.pendingCount() : 0;

    var node = h('aside', { class: 'sb', id: 'sidebar' },
      h('a', { class: 'sb-brand', href: '#dashboard' }, h('span', { class: 'nav-mark' }, U.initials(set.businessName).charAt(0)), h('span', null, U.truncate(set.businessName, 20))),
      h('nav', { class: 'sb-links', 'aria-label': 'Menu utama' }, ROUTES.map(function (r) {
        var badge = (r.key === 'inbox' && pending > 0)
          ? h('span', { style: 'margin-left:auto;background:#dc2626;color:#fff;font-size:11px;font-weight:700;padding:1px 7px;border-radius:999px;' }, String(pending))
          : null;
        return h('a', { class: 'sb-link', href: '#' + r.key, 'aria-current': r.key === current ? 'page' : null }, I.el(r.icon), h('span', null, r.label), badge);
      })),
      h('div', { class: 'sb-foot' },
        h('div', { class: 'sb-avatar' }, set.photo ? h('img', { src: set.photo, alt: '' }) : U.initials(owner).charAt(0)),
        h('div', { class: 'sb-user' }, h('div', { class: 'sb-user-name' }, U.truncate(owner, 22)), h('div', { class: 'sb-user-sub' }, set.tagline || set.city || ''))));
    if (sidebar) sidebar.replaceWith(node);
    sidebar = node;
    return node;
  }

  function render() {
    applyTheme();
    buildSidebar();
    var r = route();
    titleEl.textContent = r.title;
    dateEl.textContent = U.weekdayShort(new Date()) + ', ' + U.dateID(new Date());
    var scroll = window.scrollY;
    U.clear(main);
    if (PO.views[r.key]) {
      main.appendChild(PO.views[r.key].render());
    }
    window.scrollTo(0, scroll);
  }

  function boot() {
    S.load();
    var app = U.$('#app');
    U.clear(app);
    titleEl = h('h1', { class: 'topbar-title' });
    dateEl = h('span', { class: 'topbar-date' });
    main = h('main', { class: 'page', id: 'view' });
    app.appendChild(h('div', { class: 'tp-fx', 'aria-hidden': 'true' }));
    applyTheme();
    app.appendChild(buildSidebar());
    app.appendChild(h('div', { class: 'sb-scrim', onClick: function () { setMenu(false); } }));
    app.appendChild(h('div', { class: 'shell' },
      h('header', { class: 'topbar' },
        h('button', { class: 'btn btn-quiet btn-icon menu-btn', type: 'button', 'aria-label': 'Buka menu', onClick: function () { setMenu(true); } }, I.el('menu')),
        titleEl, dateEl,
        h('button', { class: 'help-btn', type: 'button', title: 'Bantuan & tutorial', 'aria-label': 'Bantuan & tutorial', onClick: function () { if (PO.tour && PO.tour.openMenu) PO.tour.openMenu(); } }, I.el('help'))),
      main));
    S.subscribe(render);
    window.addEventListener('hashchange', function () { setMenu(false); window.scrollTo(0, 0); render(); });
    window.addEventListener('storage', function (e) {
      if (e.key === 'batchin.inbox.v1' || e.key === 'batchin.state.v1') render();
    });
    render();
    if (PO.tour && PO.tour.init) PO.tour.init();
    if (PO.budi && PO.budi.init) PO.budi.init();
  }

  document.addEventListener('DOMContentLoaded', boot);
  return { render: render, refresh: render };
})();