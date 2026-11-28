/* ui.js — komponen UI bersama: toast, sheet, field, badge, CSV. */
window.PO = window.PO || {};
PO.ui = (function () {
  var U = PO.util, I = PO.icons, D = PO.data, h = U.h;
  var current = null;

  function toast(message, type) {
    var root = U.$('#toast-root');
    var icon = type === 'error' || type === 'warn' ? 'alert' : 'checkCircle';
    var node = h('div', { class: 'toast ' + (type || 'ok') }, I.el(icon), h('span', null, message));
    root.appendChild(node);
    setTimeout(function () {
      node.classList.add('out');
      setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 260);
    }, 2800);
  }

  function closeSheet() {
    if (!current) return;
    var root = U.$('#modal-root');
    U.clear(root);
    current = null;
  }

  function openSheet(opts) {
    closeSheet();
    var root = U.$('#modal-root');
    var scrim = h('div', { class: 'scrim', onClick: closeSheet });
    var head = h('div', { class: 'sheet-head' },
      h('div', null, h('h3', { class: 'sheet-title' }, opts.title), opts.sub ? h('p', { class: 'sheet-sub' }, opts.sub) : null),
      h('button', { class: 'btn btn-quiet btn-icon', type: 'button', 'aria-label': 'Tutup', onClick: closeSheet }, I.el('close')));
    var sheet = h('div', { class: 'sheet' + (opts.wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true' },
      head, h('div', { class: 'sheet-body' }, opts.body), opts.foot ? h('div', { class: 'sheet-foot' }, opts.foot) : null);
    root.appendChild(scrim);
    root.appendChild(sheet);
    current = sheet;
    var first = U.$('input, select, textarea', sheet);
    if (first) first.focus();
    return { close: closeSheet, el: sheet };
  }

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });

  function btn(label, icon, cls, onClick) {
    return h('button', { class: 'btn ' + (cls || ''), type: 'button', onClick: onClick }, icon ? I.el(icon) : null, label ? h('span', null, label) : null);
  }

  function confirmDialog(opts) {
    openSheet({
      title: opts.title, sub: opts.text,
      body: h('div'),
      foot: [
        btn('Batal', null, 'btn-ghost', closeSheet),
        btn(opts.ok || 'Ya, lanjutkan', null, opts.danger ? 'btn-danger' : '', function () { closeSheet(); opts.onOk(); })
      ]
    });
  }

  /* field: label + kontrol + pesan error. setError('') untuk reset. */
  function field(label, control, opts) {
    opts = opts || {};
    var err = h('span', { class: 'field-error' });
    var node = h('div', { class: 'field' + (opts.span ? ' span-2' : '') },
      h('label', { class: 'field-label' }, label, opts.req ? h('span', { class: 'req' }, '*') : null),
      control, opts.hint ? h('span', { class: 'field-hint' }, opts.hint) : null, err);
    node.setError = function (msg) {
      node.classList.toggle('invalid', !!msg);
      err.textContent = msg || '';
      if (msg) { node.classList.remove('shake'); void node.offsetWidth; node.classList.add('shake'); }
    };
    control.addEventListener('input', function () { node.setError(''); });
    return node;
  }

  function select(options, value) {
    var s = h('select', { class: 'select' }, options.map(function (o) {
      return h('option', { value: o.value }, o.label);
    }));
    if (value !== undefined) s.value = value;
    return s;
  }

  function statusPill(key) {
    var m = D.statusMeta(key);
    return h('span', { class: 'status-pill st-' + key }, h('i', { class: 'dot' }), m.short);
  }

  function payBadge(order) {
    var cls = order.payment === 'paid' ? 'badge-ok' : order.payment === 'dp' ? 'badge-warn' : 'badge-mute';
    return h('span', { class: 'badge ' + cls }, D.PAYMENT_LABELS[order.payment]);
  }

  function empty(icon, title, text, action) {
    return h('div', { class: 'empty' }, h('div', { class: 'empty-icon' }, I.el(icon)),
      h('div', { class: 'empty-title' }, title), text ? h('div', { class: 'empty-text' }, text) : null, action || null);
  }

  function pageHead(title, sub, actions) {
    return h('div', { class: 'page-head' },
      h('div', null, h('h1', { class: 'page-title' }, title), sub ? h('p', { class: 'page-sub' }, sub) : null),
      h('div', { class: 'page-actions' }, actions || []));
  }

  function card(title, body, actions, bodyClass) {
    return h('section', { class: 'card' },
      title ? h('div', { class: 'card-head' }, h('h3', { class: 'card-title' }, title), actions ? h('div', { class: 'row' }, actions) : null) : null,
      h('div', { class: 'card-body ' + (bodyClass || '') }, body));
  }

  function downloadCsv(name, rows) {
    var csv = rows.map(function (r) {
      return r.map(function (c) { return '"' + String(c === null || c === undefined ? '' : c).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\r\n');
    var url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    var a = h('a', { href: url, download: name });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 500);
  }

  function seg(items, value, onPick) {
    var wrap = h('div', { class: 'seg', role: 'group' });
    items.forEach(function (it) {
      wrap.appendChild(h('button', { type: 'button', 'aria-pressed': String(it.value === value), onClick: function () { onPick(it.value); } }, it.label));
    });
    return wrap;
  }

  return {
    toast: toast, openSheet: openSheet, closeSheet: closeSheet, confirm: confirmDialog, btn: btn,
    field: field, select: select, statusPill: statusPill, payBadge: payBadge, empty: empty,
    pageHead: pageHead, card: card, downloadCsv: downloadCsv, seg: seg
  };
})();
