/* public.js — form pemesanan untuk pelanggan (pesan.html), mendukung single product maupun keranjang (?from=cart). */
(function () {
  var U = PO.util, I = PO.icons, UI = PO.ui, IB = PO.inbox, h = U.h;
  var CART_KEY = 'batchin.cart.v1';
  var SERVICE_FEE = 2500;
  var TAX_RATE = 0.12;
  var root = U.$('#pub'), state = null;

  try {
    var raw = JSON.parse(window.localStorage.getItem('batchin.state.v1'));
    if (raw && raw.products) state = raw;
  } catch (err) {}

  if (!state && window.PO && PO.data && PO.data.PRESETS && PO.data.PRESETS.bakery) {
    state = PO.data.PRESETS.bakery;
  }

  function loadCart() {
    try {
      var c = JSON.parse(window.localStorage.getItem(CART_KEY));
      return Array.isArray(c) ? c : [];
    } catch (e) { return []; }
  }

  function topNav() {
    var user = window.CURRENT_USER || (window.PO_AUTH && PO_AUTH.getSession());
    return h('div', { class: 'pub-topbar' },
      h('a', { class: 'pub-back', href: 'Customer/customer.html' }, '← Kembali ke Katalog'),
      user ? h('span', { class: 'small mute' }, 'Akun: ', h('strong', null, user.name)) : null
    );
  }

  function shell(children) {
    U.clear(root);
    root.appendChild(h('div', { class: 'tp-fx', 'aria-hidden': 'true' }));
    root.appendChild(h('div', { class: 'pub' }, [topNav()].concat(children)));
    window.scrollTo(0, 0);
  }

  if (!state) {
    shell([UI.empty('box', 'Toko belum siap', 'Pemilik belum menyiapkan produk. Coba lagi nanti.')]);
    return;
  }

  var set = state.settings || {};
  UI.applyColors(set);
  UI.applyFontScale();
  document.title = 'Pesan — ' + (set.businessName || "Licia's Bakehouse");

  var products = state.products.filter(function (p) { return p && p.active !== false; });
  var closed = set.poOpen === false || (set.poCloseDate && new Date(set.poCloseDate + 'T23:59:59') < new Date());
  var policy = set.cancelPolicy || 'Pembayaran tidak dapat dikembalikan jika pesanan dibatalkan setelah produksi dimulai.';

  var urlParams = new URLSearchParams(window.location.search);
  var requestedProdId = urlParams.get('product');
  var isCartMode = urlParams.get('from') === 'cart';

  function header() {
    var bizName = set.businessName || "Licia's Bakehouse";
    var banner = closed
      ? h('div', { class: 'pub-banner closed' }, h('b', null, 'Pemesanan sedang ditutup. '), 'Silakan hubungi pemilik untuk info periode berikutnya.')
      : h('div', { class: 'pub-banner open' }, h('b', null, 'Pemesanan dibuka'), set.poCloseDate ? ' sampai ' + U.dateID(set.poCloseDate) : '', ' · pengerjaan ± ' + (set.leadDays || 3) + ' hari setelah kuota batch terpenuhi.');
    return [
      h('div', { class: 'pub-head' },
        h('div', { class: 'pub-logo' }, set.photo ? h('img', { src: set.photo, alt: '' }) : U.initials(bizName).charAt(0)),
        h('div', null,
          h('h1', { class: 'pub-title' }, bizName),
          set.tagline ? h('p', { class: 'page-sub', style: 'margin:2px 0 0' }, set.tagline) : null)),
      banner
    ];
  }

  function form() {
    var cartItems = isCartMode ? loadCart().filter(function (c) {
      return products.some(function (p) { return p.id === c.productId && p.poOpen !== false; });
    }) : [];

    var hasRequested = requestedProdId && products.some(function (p) { return p.id === requestedProdId && p.poOpen !== false; });
    var firstOpen = products.find(function (p) { return p.poOpen !== false; }) || products[0];
    var sel = hasRequested ? requestedProdId : (firstOpen ? firstOpen.id : '');

    var session = window.CURRENT_USER || (window.PO_AUTH && PO_AUTH.getSession()) || {};
    var name = h('input', { class: 'input', placeholder: 'Nama lengkap', maxLength: 60, value: session.name || '' });
    var phone = h('input', { class: 'input mono', placeholder: '08xxxxxxxxxx', inputMode: 'tel', value: session.phone || '' });
    var qty = h('input', { class: 'input mono', value: '1', inputMode: 'numeric' });
    var note = h('textarea', { class: 'textarea', placeholder: 'Catatan (opsional), misalnya tanpa kacang' });

    var paySelect = h('select', { class: 'select' },
      h('option', { value: 'Cash' }, 'Cash (Tunai saat ambil / COD)'),
      h('option', { value: 'Transfer Bank' }, 'Transfer Bank'),
      h('option', { value: 'OVO' }, 'OVO')
    );

    var fName = UI.field('Nama', name, { req: true });
    var fPhone = UI.field('Nomor WhatsApp', phone, { req: true, hint: 'Angka saja, 10–13 digit.' });
    var fQty = UI.field('Jumlah', qty, { req: true });
    var fNote = UI.field('Catatan', note);
    var fPayMethod = UI.field('Metode Pembayaran', paySelect, {
      req: true,
      hint: 'Pembayaran penuh (100%). Pilih Transfer Bank / OVO untuk mengunggah bukti bayar.'
    });

    var proof = UI.imageField({
      label: 'Bukti pembayaran (wajib untuk non-tunai)',
      value: '',
      w: 900,
      h: 900,
      fit: 'contain',
      round: false,
      hint: 'Unggah screenshot bukti Transfer Bank atau OVO.'
    });
    var proofWrap = h('div', { hidden: true }, proof);

    function syncProofVisibility() {
      var isCash = paySelect.value === 'Cash';
      proofWrap.hidden = isCash;
    }
    paySelect.addEventListener('change', syncProofVisibility);
    syncProofVisibility();

    var prodBox = h('div', { class: 'pub-prods' });
    var cartBox = h('div', { class: 'col', style: 'gap:10px;' });
    var sum = h('div', { class: 'pub-sum' });

    function current() { return products.filter(function (p) { return p.id === sel; })[0]; }

    function paintCartList() {
      U.clear(cartBox);
      if (!cartItems.length) {
        cartBox.appendChild(h('div', { class: 'pub-note small mute' }, 'Keranjang kosong. Silakan pilih produk di bawah atau kembali ke katalog.'));
        return;
      }
      cartItems.forEach(function (item, idx) {
        var p = products.find(function (x) { return x.id === item.productId; });
        if (!p) return;
        var unit = p.unit || set.batchUnit || 'pcs';
        cartBox.appendChild(h('div', {
          style: 'display:flex;align-items:center;justify-content:space-between;gap:12px;background:#fff;border:1px solid rgba(0,0,0,0.1);border-radius:12px;padding:12px 14px;'
        },
          h('div', null,
            h('div', { class: 'strong' }, p.name),
            h('div', { class: 'small mute mono' }, U.rupiah(p.price) + ' / ' + unit + ' · Subtotal: ' + U.rupiah(p.price * item.qty))
          ),
          h('div', { style: 'display:flex;align-items:center;gap:8px;' },
            h('button', {
              type: 'button',
              class: 'btn btn-ghost btn-sm',
              onClick: function () {
                if (cartItems[idx].qty > 1) cartItems[idx].qty -= 1;
                else cartItems.splice(idx, 1);
                localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
                paintCartList();
                paintSum();
              }
            }, '−'),
            h('span', { class: 'mono strong' }, String(item.qty)),
            h('button', {
              type: 'button',
              class: 'btn btn-ghost btn-sm',
              onClick: function () {
                cartItems[idx].qty += 1;
                localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
                paintCartList();
                paintSum();
              }
            }, '+')
          )
        ));
      });
    }

    function paintProds() {
      U.clear(prodBox);
      products.forEach(function (p) {
        var imgSrc = p.photo || p.image;
        var unit = p.unit || set.batchUnit || 'pcs';
        var isClosedProd = p.poOpen === false;
        prodBox.appendChild(h('button', {
          class: 'pub-prod',
          type: 'button',
          'aria-pressed': String(p.id === sel),
          disabled: isClosedProd,
          style: isClosedProd ? 'opacity:0.5;cursor:not-allowed;' : '',
          onClick: function () {
            if (isClosedProd) return;
            sel = p.id;
            paintProds();
            paintSum();
          }
        },
          h('div', { class: 'pub-prod-img' }, imgSrc ? h('img', { src: imgSrc, alt: p.name }) : I.el('box')),
          h('div', null,
            h('div', { class: 'strong' }, p.name),
            h('div', { class: 'small mute' }, U.rupiah(p.price) + ' / ' + unit + (isClosedProd ? ' · PO Tutup' : (p.category ? ' · ' + p.category : ''))))));
      });
    }

    function paintSum() {
      U.clear(sum);
      var subtotal = 0;
      var estText = '';

      if (isCartMode && cartItems.length) {
        cartItems.forEach(function (item) {
          var p = products.find(function (x) { return x.id === item.productId; });
          if (p) subtotal += p.price * item.qty;
        });
        var firstEst = PO.estimate(state, cartItems[0].productId, cartItems[0].qty);
        estText = firstEst.text;
      } else {
        var p = current(), q = Number(qty.value) || 0;
        if (!p) return;
        subtotal = p.price * q;
        estText = PO.estimate(state, p.id, q).text;
      }

      var fee = subtotal > 0 ? SERVICE_FEE : 0;
      var tax = Math.round(subtotal * TAX_RATE);
      var grandTotal = subtotal + fee + tax;

      sum.appendChild(h('div', { class: 'row between small mute' }, h('span', null, 'Subtotal produk'), h('span', { class: 'mono' }, U.rupiah(subtotal))));
      sum.appendChild(h('div', { class: 'row between small mute' }, h('span', null, 'Service fee'), h('span', { class: 'mono' }, U.rupiah(fee))));
      sum.appendChild(h('div', { class: 'row between small mute' }, h('span', null, 'Pajak (12%)'), h('span', { class: 'mono' }, U.rupiah(tax))));
      sum.appendChild(h('div', { class: 'row between', style: 'padding-top:6px;margin-top:2px;border-top:1px dashed rgba(0,0,0,0.12);' }, h('strong', null, 'Total Bayar (Full 100%)'), h('b', { class: 'mono' }, U.rupiah(grandTotal))));
      sum.appendChild(h('div', { class: 'small mute' }, estText));
    }

    if (isCartMode && cartItems.length) {
      paintCartList();
    } else {
      isCartMode = false;
      qty.addEventListener('input', paintSum);
      paintProds();
    }
    paintSum();

    function submit() {
      var errs = [
        [fName, U.validateName(name.value)],
        [fPhone, U.validatePhone(phone.value)]
      ];
      if (!isCartMode) errs.push([fQty, U.validateQty(qty.value, 1, 999)]);
      var bad = errs.filter(function (e) { e[0].setError(e[1]); return e[1]; });
      if (bad.length) { U.$('input', bad[0][0]).focus(); return; }

      var method = paySelect.value;
      var proofVal = method === 'Cash' ? '' : proof.getValue();

      if (method !== 'Cash' && !proofVal) {
        UI.toast('Silakan unggah foto bukti pembayaran untuk ' + method + '.', 'warn');
        return;
      }

      var created = [];
      if (isCartMode && cartItems.length) {
        for (var i = 0; i < cartItems.length; i++) {
          var item = cartItems[i];
          var rec = IB.add({
            name: name.value.trim(),
            phone: U.digitsOnly(phone.value),
            productId: item.productId,
            qty: Number(item.qty),
            includeServiceFee: i === 0,
            paymentMethod: method,
            note: note.value.trim(),
            proof: proofVal,
            source: 'cart'
          });
          if (!rec) { UI.toast('Penyimpanan penuh. Perkecil/hapus foto bukti lalu coba lagi.', 'error'); return; }
          created.push(rec);
        }
        localStorage.removeItem(CART_KEY);
      } else {
        var singleRec = IB.add({
          name: name.value.trim(),
          phone: U.digitsOnly(phone.value),
          productId: sel,
          qty: Number(qty.value),
          includeServiceFee: true,
          paymentMethod: method,
          note: note.value.trim(),
          proof: proofVal,
          source: 'form'
        });
        if (!singleRec) { UI.toast('Penyimpanan penuh. Hapus foto bukti lalu coba lagi.', 'error'); return; }
        created.push(singleRec);
      }

      success(created);
    }

    if (!products.length) return UI.empty('box', 'Belum ada produk', 'Pemilik belum menambahkan produk.');

    var selectionSection = isCartMode
      ? h('div', null,
          h('div', { class: 'row between', style: 'margin-bottom:8px;' },
            h('div', { class: 'field-label' }, 'Item dari Keranjang (' + cartItems.length + ' produk)'),
            h('a', { href: 'Customer/customer.html', class: 'small', style: 'color:var(--brand);font-weight:700;text-decoration:none;' }, '+ Tambah item lain')),
          cartBox)
      : h('div', null, h('div', { class: 'field-label', style: 'margin-bottom:8px' }, 'Pilih produk'), prodBox);

    var gridFields = isCartMode
      ? h('div', { class: 'form-grid' }, fName, fPhone)
      : h('div', { class: 'form-grid' }, fName, fPhone, fQty);

    return h('div', { class: 'col', style: 'gap:16px' },
      selectionSection,
      gridFields,
      fNote,
      fPayMethod,
      proofWrap,
      sum,
      h('p', { class: 'small mute pub-note' }, 'Kebijakan pembatalan: ' + policy),
      UI.btn('Kirim pesanan', 'check', '', submit));
  }

  function success(records) {
    var subtotal = 0;
    var itemLines = [];
    var ids = [];
    var waLines = [];

    records.forEach(function (rec) {
      var p = state.products.filter(function (x) { return x.id === rec.productId; })[0];
      if (!p) return;
      var sub = p.price * rec.qty;
      subtotal += sub;
      ids.push(rec.id + ' : ' + p.name + ' ' + rec.qty + (p.unit ? ' ' + p.unit.charAt(0).toUpperCase() + p.unit.slice(1) : ''));
      itemLines.push(h('div', { class: 'strong' }, p.name + ' × ' + rec.qty + ' (' + U.rupiah(sub) + ')'));
      waLines.push('• ' + p.name + ' × ' + rec.qty + ' (' + U.rupiah(sub) + ')');
    });

    var fee = subtotal > 0 ? SERVICE_FEE : 0;
    var tax = Math.round(subtotal * TAX_RATE);
    var total = subtotal + fee + tax;

    var firstRec = records[0];
    var method = firstRec.paymentMethod || 'Transfer Bank';
    var est = PO.estimate(state, firstRec.productId, firstRec.qty);
    var bizName = set.businessName || "Licia's Bakehouse";

    var text = 'Halo ' + bizName + ', saya ingin memesan:\n' + waLines.join('\n') +
      '\nNama: ' + firstRec.name +
      '\nMetode Pembayaran: ' + method +
      '\nSubtotal: ' + U.rupiah(subtotal) +
      '\nService Fee: ' + U.rupiah(fee) +
      '\nPajak (12%): ' + U.rupiah(tax) +
      '\nTotal Bayar (Full): ' + U.rupiah(total) +
      (firstRec.note ? '\nCatatan: ' + firstRec.note : '') +
      '\n\nNo. permintaan:\n' + ids.join('\n') +
      '\n' + IB.encode(firstRec);

    var num = String(set.whatsapp || '081990301271').replace(/\D/g, '');
    if (num.charAt(0) === '0') num = '62' + num.slice(1);

    var steps = [];
    if (method !== 'Cash' && set.bankInfo) {
      steps.push(h('li', null, 'Lakukan pembayaran penuh ', h('b', null, U.rupiah(total)), ' via ', h('b', null, method), ':', h('div', { class: 'pub-note mono small' }, set.bankInfo)));
    }
    steps.push(h('li', null, 'Kirim konfirmasi lewat WhatsApp agar pesananmu diproses.' + (method === 'Cash' ? ' Pembayaran tunai (Cash) dilakukan saat pengambilan/pengantaran.' : (firstRec.proof ? ' Bukti pembayaran sudah dilampirkan.' : ' Lampirkan bukti pembayaran di chat.'))));

    shell([
      h('div', { class: 'pub-head' }, h('div', { class: 'pub-logo' }, I.el('checkCircle')), h('div', null, h('h1', { class: 'pub-title' }, 'Pesanan terkirim'), h('p', { class: 'page-sub', style: 'margin:2px 0 0' }, 'No. permintaan ' + ids.join(', ')))),
      h('div', { class: 'pub-sum' },
        h('div', { class: 'col', style: 'gap:4px;' }, itemLines),
        h('div', { class: 'row between', style: 'margin-top:6px;padding-top:6px;border-top:1px dashed rgba(0,0,0,0.1);' }, h('span', null, 'Metode Pembayaran'), h('b', null, method)),
        h('div', { class: 'row between small mute' }, h('span', null, 'Subtotal produk'), h('span', { class: 'mono' }, U.rupiah(subtotal))),
        h('div', { class: 'row between small mute' }, h('span', null, 'Service fee'), h('span', { class: 'mono' }, U.rupiah(fee))),
        h('div', { class: 'row between small mute' }, h('span', null, 'Pajak (12%)'), h('span', { class: 'mono' }, U.rupiah(tax))),
        h('div', { class: 'row between', style: 'padding-top:4px;border-top:1px dashed rgba(0,0,0,0.1);' }, h('strong', null, 'Total Bayar (Full)'), h('b', { class: 'mono' }, U.rupiah(total))),
        h('div', { class: 'small mute' }, est.text)),
      h('div', null, h('div', { class: 'field-label' }, 'Langkah berikutnya'), h('ol', { class: 'pub-steps' }, steps)),
      h('div', { class: 'row wrap', style: 'gap:10px;margin-top:8px;' },
        h('a', { class: 'btn', href: 'https://wa.me/' + num + '?text=' + encodeURIComponent(text), target: '_blank', rel: 'noopener noreferrer' }, I.el('message'), h('span', null, 'Konfirmasi via WhatsApp')),
        h('a', { class: 'btn btn-ghost', href: 'Customer/customer.html' }, 'Kembali ke Toko')),
      h('p', { class: 'small mute pub-note' }, 'Kebijakan pembatalan: ' + policy)
    ]);
  }

  shell(closed ? header() : header().concat([form()]));
})();