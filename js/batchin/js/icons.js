/* icons.js — set ikon garis 24px, mewarisi currentColor. */
window.PO = window.PO || {};

PO.icons = (function () {
  function wrap(paths, extra) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || '') + '>' + paths + '</svg>';
  }

  var set = {
    dashboard: wrap('<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>'),
    orders: wrap('<path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5"/><path d="M8.5 12.5h7M8.5 16h4.5"/>'),
    kanban: wrap('<rect x="3" y="4" width="5.5" height="16" rx="1.6"/><rect x="9.5" y="4" width="5.5" height="10" rx="1.6"/><rect x="16" y="4" width="5" height="13" rx="1.6"/>'),
    box: wrap('<path d="M20.5 8.2v7.6a1.6 1.6 0 0 1-.83 1.4l-6.9 3.7a1.6 1.6 0 0 1-1.54 0l-6.9-3.7a1.6 1.6 0 0 1-.83-1.4V8.2"/><path d="M3.6 7.3l7.63-4.1a1.6 1.6 0 0 1 1.54 0l7.63 4.1a1.2 1.2 0 0 1 0 2.1l-7.63 4.1a1.6 1.6 0 0 1-1.54 0L3.6 9.4a1.2 1.2 0 0 1 0-2.1Z"/><path d="M12 12.5V21"/>'),
    wallet: wrap('<path d="M3.5 8.5A2.5 2.5 0 0 1 6 6h11.5A3.5 3.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19H6a2.5 2.5 0 0 1-2.5-2.5v-8Z"/><path d="M3.5 9h13A2.5 2.5 0 0 1 19 11.5v.5"/><circle cx="16.5" cy="13.5" r="1.2" fill="currentColor" stroke="none"/>'),
    report: wrap('<path d="M4 20V4"/><path d="M4 20h16"/><rect x="7.5" y="12" width="3.2" height="5" rx="1"/><rect x="13" y="8.5" width="3.2" height="8.5" rx="1"/><rect x="18.5" y="5.5" width="2" height="11.5" rx="1"/>'),
    settings: wrap('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.4"/><circle cx="9" cy="17" r="2.4"/>'),
    plus: wrap('<path d="M12 5v14M5 12h14"/>'),
    search: wrap('<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/>'),
    close: wrap('<path d="M6 6l12 12M18 6 6 18"/>'),
    check: wrap('<path d="M4.5 12.5l5 5 10-11"/>', ' stroke-width="2.2"'),
    checkCircle: wrap('<circle cx="12" cy="12" r="9"/><path d="M8 12.4l2.6 2.6L16 9.6"/>'),
    alert: wrap('<path d="M12 4.5 21 19.5H3L12 4.5Z"/><path d="M12 10v4"/><circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none"/>'),
    info: wrap('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none"/>'),
    chevronRight: wrap('<path d="M9 5l7 7-7 7"/>'),
    chevronDown: wrap('<path d="M5 9l7 7 7-7"/>'),
    arrowUp: wrap('<path d="M12 19V5M6 11l6-6 6 6"/>'),
    arrowDown: wrap('<path d="M12 5v14M6 13l6 6 6-6"/>'),
    arrowRight: wrap('<path d="M4 12h15M13 6l6 6-6 6"/>'),
    trash: wrap('<path d="M4 7h16M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7"/><path d="M6.5 7l.8 12.1A1.9 1.9 0 0 0 9.2 21h5.6a1.9 1.9 0 0 0 1.9-1.9L17.5 7"/><path d="M10.5 11v6M13.5 11v6"/>'),
    edit: wrap('<path d="M4 20h4L20 8a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="M14.5 5.5 18.5 9.5"/>'),
    clock: wrap('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/>'),
    calendar: wrap('<rect x="3.5" y="5" width="17" height="16" rx="2.4"/><path d="M8 3v4M16 3v4M3.5 10h17"/>'),
    phone: wrap('<path d="M7.5 3.5 10 8l-2 2a12 12 0 0 0 6 6l2-2 4.5 2.5V19a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 3 5.7 2 2 0 0 1 5 3.5h2.5Z"/>'),
    cart: wrap('<circle cx="9.5" cy="19" r="1.4"/><circle cx="17.5" cy="19" r="1.4"/><path d="M3 4h2.2l2.3 10.2a1.6 1.6 0 0 0 1.6 1.3h7.8a1.6 1.6 0 0 0 1.6-1.3L20 7H6"/>'),
    package: wrap('<path d="M16.5 3.5H7a2 2 0 0 0-2 2V21l3.2-2 2.3 2 2.3-2 2.3 2 3.4-2V8.5"/><path d="M16.5 3.5V8h3.5"/><path d="M8.5 8.5h6M8.5 12.5h6"/>'),
    truck: wrap('<path d="M2.5 6.5h10v10h-10z"/><path d="M12.5 10h4l3 3.2v3.3h-7"/><circle cx="6.5" cy="18" r="1.9"/><circle cx="16.5" cy="18" r="1.9"/>'),
    flame: wrap('<path d="M12 3s5.5 4.4 5.5 9.2A5.5 5.5 0 0 1 12 21a5.5 5.5 0 0 1-5.5-5.8C6.5 10.7 12 3 12 3Z"/><path d="M12 17.5a2.4 2.4 0 0 0 2.4-2.4c0-1.8-2.4-4.1-2.4-4.1s-2.4 2.3-2.4 4.1a2.4 2.4 0 0 0 2.4 2.4Z"/>'),
    users: wrap('<circle cx="9" cy="8" r="3.4"/><path d="M3 20c0-3.2 2.7-5.3 6-5.3s6 2.1 6 5.3"/><path d="M16 5.2a3.3 3.3 0 0 1 0 6.4"/><path d="M17.5 14.9c2.1.6 3.5 2.3 3.5 4.4"/>'),
    target: wrap('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>'),
    sparkles: wrap('<path d="M12 3.5l1.6 4.4 4.4 1.6-4.4 1.6L12 15.5l-1.6-4.4L6 9.5l4.4-1.6L12 3.5Z"/><path d="M17.5 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z"/>'),
    refresh: wrap('<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/>'),
    download: wrap('<path d="M12 4v10M7.5 10 12 14.5 16.5 10"/><path d="M4 17.5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5"/>'),
    copy: wrap('<rect x="9" y="9" width="11" height="11" rx="2.2"/><path d="M15 6.5V5.2A1.2 1.2 0 0 0 13.8 4H5.2A1.2 1.2 0 0 0 4 5.2v8.6A1.2 1.2 0 0 0 5.2 15h1.3"/>'),
    message: wrap('<path d="M20.5 11.8a7.9 7.9 0 0 1-8.2 7.9 8.6 8.6 0 0 1-3.6-.8L4 20.5l1.6-4.6a7.7 7.7 0 0 1-1-3.9A7.9 7.9 0 0 1 12.8 4a7.9 7.9 0 0 1 7.7 7.8Z"/>'),
    note: wrap('<path d="M5 3.5h9.5L19 8v12.5H5z"/><path d="M14 3.5V8h4.5"/><path d="M8 12.5h8M8 16h5"/>'),
    lock: wrap('<rect x="4.5" y="10" width="15" height="10.5" rx="2.4"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10"/>'),
    menu: wrap('<path d="M4 7h16M4 12h16M4 17h16"/>'),
    eye: wrap('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>'),
    x: wrap('<path d="M6 6l12 12M18 6 6 18"/>'),
    building: wrap('<path d="M4 21V5.5L12 3l8 2.5V21"/><path d="M9 21v-5h6v5"/><path d="M8 9h1.5M14.5 9H16M8 12.5h1.5M14.5 12.5H16"/>')
  };

  function get(name) {
    return set[name] || set.info;
  }

  function el(name, size) {
    var span = document.createElement('span');
    span.innerHTML = get(name);
    var svg = span.firstChild;
    if (size) { svg.setAttribute('width', size); svg.setAttribute('height', size); }
    return span.firstChild;
  }

  return { get: get, el: el, set: set };
})();
