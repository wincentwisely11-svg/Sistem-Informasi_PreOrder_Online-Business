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


  /* ---------- warna kustom (brand + latar) ---------- */
  function hex(v) {
    v = String(v || '').trim().replace('#', '');
    if (/^[0-9a-f]{3}$/i.test(v)) v = v.split('').map(function (c) { return c + c; }).join('');
    return /^[0-9a-f]{6}$/i.test(v) ? '#' + v.toLowerCase() : '';
  }

  function luminance(c) {
    var ch = [1, 3, 5].map(function (i) {
      var x = parseInt(c.substr(i, 2), 16) / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }

  var BRAND_VARS = ['--tp-acc', '--tp-acc-2', '--tp-grad', '--tp-acc-ink', '--sb-bg', '--sb-active'];
  var BG_VARS = ['--tp-bg', '--tp-canvas', '--tp-surf', '--tp-surf-2', '--tp-line', '--tp-ink', '--tp-mute'];

  function applyColors(set) {
    var st = document.documentElement.style;
    var brand = hex(set.brandColor), bg = hex(set.bgColor);
    if (set.brandHue !== undefined) st.setProperty('--tp-h', set.brandHue);
    BRAND_VARS.concat(BG_VARS).forEach(function (v) { st.removeProperty(v); });

    if (brand) {
      st.setProperty('--tp-acc', brand);
      st.setProperty('--tp-acc-2', 'color-mix(in oklch, ' + brand + ' 65%, white)');
      st.setProperty('--tp-grad', 'linear-gradient(135deg, ' + brand + ', color-mix(in oklch, ' + brand + ' 65%, white))');
      st.setProperty('--tp-acc-ink', luminance(brand) > 0.5 ? '#1a1a1a' : '#ffffff');
      st.setProperty('--sb-bg', 'color-mix(in oklch, ' + brand + ' 34%, #000)');
      st.setProperty('--sb-active', 'color-mix(in oklch, ' + brand + ' 52%, #000)');
    }
    if (bg) {
      st.setProperty('--tp-bg', bg);
      st.setProperty('--tp-canvas', bg);
      if (luminance(bg) < 0.2) {
        st.setProperty('--tp-surf', 'color-mix(in srgb, ' + bg + ' 90%, #fff)');
        st.setProperty('--tp-surf-2', 'color-mix(in srgb, ' + bg + ' 80%, #fff)');
        st.setProperty('--tp-line', 'color-mix(in srgb, ' + bg + ' 76%, #fff)');
        st.setProperty('--tp-ink', '#f2eee9');
        st.setProperty('--tp-mute', '#a8a29c');
      } else {
        st.setProperty('--tp-surf', '#ffffff');
        st.setProperty('--tp-surf-2', 'color-mix(in srgb, ' + bg + ' 92%, #000)');
        st.setProperty('--tp-line', 'color-mix(in srgb, ' + bg + ' 86%, #000)');
        st.setProperty('--tp-ink', 'color-mix(in srgb, #000 88%, ' + bg + ')');
        st.setProperty('--tp-mute', 'color-mix(in srgb, #000 52%, ' + bg + ')');
      }
    }
  }

  /* ---------- foto: potong (cover) + kompres ke JPEG agar hemat penyimpanan ---------- */
  function readImage(file, w, hgt, done, fit) {
    if (!/^image\//.test(file.type)) return done('File harus berupa gambar (JPG, PNG, WebP).');
    if (file.size > 10 * 1024 * 1024) return done('Ukuran gambar maksimal 10 MB.');
    var fr = new FileReader();
    fr.onerror = function () { done('Gambar tidak bisa dibaca.'); };
    fr.onload = function () {
      var img = new Image();
      img.onerror = function () { done('Gambar tidak bisa dibaca.'); };
      img.onload = function () {
        var c = document.createElement('canvas');
        if (fit === 'contain') {
          var k = Math.min(1, w / img.width, hgt / img.height);
          c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          var cx = c.getContext('2d');
          cx.fillStyle = '#fff'; cx.fillRect(0, 0, c.width, c.height);
          cx.drawImage(img, 0, 0, c.width, c.height);
          return done('', c.toDataURL('image/jpeg', 0.8));
        }
        c.width = w; c.height = hgt;
        var ctx = c.getContext('2d');
        var scale = Math.max(w / img.width, hgt / img.height), dw = img.width * scale, dh = img.height * scale;
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, hgt);
        ctx.drawImage(img, (w - dw) / 2, (hgt - dh) / 2, dw, dh);
        done('', c.toDataURL('image/jpeg', 0.82));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  }

  /* opts: { label, value, w, h, round, hint } — node.getValue() mengembalikan data URL ('' jika kosong) */
  function imageField(opts) {
    var current = opts.value || '';
    var preview = h('div', { class: 'photo-preview' + (opts.round ? '' : ' rect') + (opts.fit === 'contain' ? ' contain' : '') });
    var file = h('input', { type: 'file', accept: 'image/*', style: 'display:none' });
    var remove = btn('Hapus', 'trash', 'btn-quiet btn-sm', function () { current = ''; node.setError(''); paint(); });
    var pick = btn('Pilih foto', 'plus', 'btn-ghost btn-sm', function () { file.click(); });
    var wrap = h('div', { class: 'photo-field' }, preview, h('div', { class: 'col', style: 'gap:8px' }, h('div', { class: 'row' }, pick, remove), file));
    var node = field(opts.label, wrap, { hint: opts.hint, span: true });

    function paint() {
      U.clear(preview);
      preview.appendChild(current ? h('img', { src: current, alt: '' }) : I.el(opts.round ? 'users' : 'box'));
      remove.style.display = current ? '' : 'none';
      pick.lastChild.textContent = current ? 'Ganti foto' : 'Pilih foto';
    }
    file.addEventListener('change', function () {
      var f = file.files && file.files[0];
      if (!f) return;
      readImage(f, opts.w, opts.h, function (err, url) {
        if (err) { node.setError(err); } else { current = url; node.setError(''); paint(); }
        file.value = '';
      }, opts.fit);
    });
    node.getValue = function () { return current; };
    paint();
    return node;
  }

  /* ---------- ukuran tulisan (preferensi per perangkat, langsung berlaku) ---------- */
  var FS_KEY = 'batchin.fontScale';
  var FONT_SCALES = [['Kecil', 0.9], ['Normal', 1], ['Besar', 1.15], ['Sangat besar', 1.3]];

  function getFontScale() {
    try { var v = parseFloat(window.localStorage.getItem(FS_KEY)); if (v >= 0.8 && v <= 1.4) return v; } catch (err) {}
    return 1;
  }
  function applyFontScale(v) {
    document.documentElement.style.setProperty('--fs', String(v === undefined ? getFontScale() : v));
  }
  function setFontScale(v) {
    try { window.localStorage.setItem(FS_KEY, String(v)); } catch (err) {}
    applyFontScale(v);
  }

  /* ---------- dropdown ceklis (multi-pilih; baris "Semua" mencentang/mengosongkan semuanya) ---------- */
  document.addEventListener('click', function (e) {
    U.$$('.dd-panel').forEach(function (p) {
      if (p.hidden || p.parentNode.contains(e.target)) return;
      p.hidden = true;
      var b = U.$('.dd-btn', p.parentNode);
      if (b) b.setAttribute('aria-expanded', 'false');
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    U.$$('.dd-panel').forEach(function (p) { p.hidden = true; });
  });

  /* opts: { options:[{value,label,short}], selected:[value], allLabel, noneLabel, onChange(selectedValues) } */
  function checkDropdown(opts) {
    var values = opts.options.map(function (o) { return o.value; });
    var sel = (opts.selected || []).slice();
    var text = h('span', { class: 'dd-text' });
    var btnEl = h('button', { class: 'dd-btn', type: 'button', 'aria-haspopup': 'true', 'aria-expanded': 'false' }, text, I.el('chevronDown'));
    var panel = h('div', { class: 'dd-panel', hidden: true });
    var allBox = h('input', { type: 'checkbox' });
    var boxes = {};

    function sync(notify) {
      allBox.checked = sel.length === values.length;
      allBox.indeterminate = sel.length > 0 && sel.length < values.length;
      values.forEach(function (v) { boxes[v].checked = sel.indexOf(v) >= 0; });
      if (sel.length === values.length) text.textContent = opts.allLabel || 'Semua';
      else if (!sel.length) text.textContent = opts.noneLabel || 'Belum dipilih';
      else text.textContent = opts.options.filter(function (o) { return sel.indexOf(o.value) >= 0; }).map(function (o) { return o.short || o.label; }).join(', ');
      if (notify && opts.onChange) opts.onChange(sel.slice());
    }

    panel.appendChild(h('label', { class: 'dd-row dd-all' }, allBox, h('span', null, opts.allLabel || 'Semua')));
    panel.appendChild(h('div', { class: 'dd-sep' }));
    opts.options.forEach(function (o) {
      var box = h('input', { type: 'checkbox' });
      boxes[o.value] = box;
      box.addEventListener('change', function () {
        sel = values.filter(function (v) { return v === o.value ? box.checked : sel.indexOf(v) >= 0; });
        sync(true);
      });
      panel.appendChild(h('label', { class: 'dd-row' }, box, h('span', null, o.label)));
    });
    allBox.addEventListener('change', function () { sel = allBox.checked ? values.slice() : []; sync(true); });
    btnEl.addEventListener('click', function () {
      panel.hidden = !panel.hidden;
      btnEl.setAttribute('aria-expanded', String(!panel.hidden));
    });
    sync(false);
    return h('div', { class: 'dd' }, btnEl, panel);
  }

  return {
    checkDropdown: checkDropdown, FONT_SCALES: FONT_SCALES, getFontScale: getFontScale, applyFontScale: applyFontScale, setFontScale: setFontScale,
    imageField: imageField, hex: hex, applyColors: applyColors, toast: toast, openSheet: openSheet, closeSheet: closeSheet, confirm: confirmDialog, btn: btn,
    field: field, select: select, statusPill: statusPill, payBadge: payBadge, empty: empty,
    pageHead: pageHead, card: card, downloadCsv: downloadCsv, seg: seg
  };
})();
