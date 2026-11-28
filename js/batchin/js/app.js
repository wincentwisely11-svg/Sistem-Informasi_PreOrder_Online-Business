/* app.js — shell, navigasi hash, dan render ulang saat state berubah. */
window.PO = window.PO || {};
PO.app = (function () {
  var U = PO.util, S = PO.store, I = PO.icons, h = U.h;
  var ROUTES = [
    { key: 'dashboard', label: 'Ringkasan', icon: 'dashboard' },
    { key: 'orders', label: 'Pesanan', icon: 'orders' },
    { key: 'kanban', label: 'Antrean', icon: 'kanban' },
    { key: 'products', label: 'Produk', icon: 'box' },
    { key: 'finance', label: 'Keuangan', icon: 'wallet' },
    { key: 'reports', label: 'Laporan', icon: 'report' },
    { key: 'settings', label: 'Pengaturan', icon: 'settings' }
  ];
  var main, nav;

  function route() {
    var key = location.hash.replace('#', '');
    return ROUTES.some(function (r) { return r.key === key; }) ? key : 'dashboard';
  }

  function applyTheme() {
    var set = S.get().settings;
    document.documentElement.style.setProperty('--tp-h', set.brandHue);
    document.title = set.businessName + ' — Batchin';
  }

  function buildNav() {
    var set = S.get().settings, current = route();
    var node = h('nav', { class: 'nav', 'aria-label': 'Menu utama' },
      h('a', { class: 'nav-brand', href: '#dashboard' }, h('span', { class: 'nav-mark' }, U.initials(set.businessName).charAt(0)), h('span', { class: 'nav-brand-name' }, U.truncate(set.businessName, 22))),
      h('div', { class: 'nav-links' }, ROUTES.map(function (r) {
        return h('a', { class: 'nav-link', href: '#' + r.key, 'aria-current': r.key === current ? 'page' : null }, I.el(r.icon), h('span', null, r.label));
      })));
    if (nav) nav.replaceWith(node);
    nav = node;
    return node;
  }

  function render() {
    applyTheme();
    buildNav();
    var scroll = window.scrollY;
    U.clear(main);
    main.appendChild(PO.views[route()].render());
    window.scrollTo(0, scroll);
  }

  function boot() {
    S.load();
    var app = U.$('#app');
    U.clear(app);
    app.appendChild(h('div', { class: 'tp-fx', 'aria-hidden': 'true' }));
    main = h('main', { class: 'page', id: 'view' });
    applyTheme();
    app.appendChild(buildNav());
    app.appendChild(main);
    S.subscribe(render);
    window.addEventListener('hashchange', function () { window.scrollTo(0, 0); render(); });
    render();
  }

  document.addEventListener('DOMContentLoaded', boot);
  return { render: render };
})();
