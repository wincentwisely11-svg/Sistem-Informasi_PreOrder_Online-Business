/* public.js — form pemesanan untuk pelanggan (pesan.html). */
(function () {
  var U = PO.util, I = PO.icons, UI = PO.ui, IB = PO.inbox, h = U.h;
  var root = U.$('#pub'), state = null;
  try { var raw = JSON.parse(window.localStorage.getItem('batchin.state.v1')); if (raw && raw.products) state = raw; } catch (err) {}

  function shell(children) {
    U.clear(root);
    root.appendChild(h('div', { class: 'tp-fx', 'aria-hidden': 'true' }));
    root.appendChild(h('div', { class: 'pub' }, children));
    window.scrollTo(0, 0);
  }
  if (!state) { shell(UI.empty('box', 'Toko belum siap', 'Pemilik belum menyiapkan produk. Coba lagi nanti.')); return; }

  var set = state.settings;
  UI.applyColors(set);
  UI.applyFontScale();
  document.title = 'Pesan — ' + set.businessName;

  var products = state.products.filter(function (p) { return p.active; });
  var closed = set.poOpen === false || (set.poCloseDate && new Date(set.poCloseDate + 'T23:59:59') < new Date());
  var dpPct = set.dpPercent || 0;
  var policy = set.cancelPolicy || 'DP tidak dapat dikembalikan jika pesanan dibatalkan setelah produksi dimulai.';

  function header() {
    var banner = closed
      ? h('div', { class: 'pub-banner closed' }, h('b', null, 'Pemesanan sedang ditutup. '), 'Silakan hubungi pemilik untuk info periode berikutnya.')
      : h('div', { class: 'pub-banner open' }, h('b', null, 'Pemesanan dibuka'), set.poCloseDate ? ' sampai ' + U.dateID(set.poCloseDate) : '', ' · pengerjaan ± ' + (set.leadDays || 3) + ' hari setelah kuota batch terpenuhi.');
    return [
      h('div', { class: 'pub-head' },
        h('div', { class: 'pub-logo' }, set.photo ? h('img', { src: set.photo, alt: '' }) : U.initials(set.businessName).charAt(0)),
        h('div', null, h('h1', { class: 'pub-title' }, set.businessName), set.tagline ? h('p', { class: 'page-sub', style: 'margin:2px 0 0' }, set.tagline) : null)),
      banner];
  }

  function form() {
    var sel = products.length ? products[0].id : '';
    var name = h('input', { class: 'input', placeholder: 'Nama lengkap', maxLength: 60 });
    var phone = h('input', { class: 'input mono', placeholder: '08xxxxxxxxxx', inputMode: 'tel' });
    var qty = h('input', { class: 'input mono', value: '1', inputMode: 'numeric' });
    var note = h('textarea', { class: 'textarea', placeholder: 'Catatan (opsional), misalnya tanpa kacang' });
    var fName = UI.field('Nama', name, { req: true }), fPhone = UI.field('Nomor WhatsApp', phone, { req: true, hint: 'Angka saja, 10–13 digit.' });
    var fQty = UI.field('Jumlah', qty, { req: true }), fNote = UI.field('Catatan', note);
    var proof = UI.imageField({ label: 'Bukti transfer DP (opsional)', value: '', w: 900, h: 900, fit: 'contain', round: false, hint: 'Bisa juga dikirim lewat WhatsApp setelah memesan.' });
    var prodBox = h('div', { class: 'pub-prods' }), sum = h('div', { class: 'pub-sum' });

    function current() { return products.filter(function (p) { return p.id === sel; })[0]; }
    function paintProds() {
      U.clear(prodBox);
      products.forEach(function (p) {
        prodBox.appendChild(h('button', { class: 'pub-prod', type: 'button', 'aria-pressed': String(p.id === sel), onClick: function () { sel = p.id; paintProds(); paintSum(); } },
          h('div', { class: 'pub-prod-img' }, p.image ? h('img', { src: p.image, alt: '' }) : I.el('box')),
          h('div', null, h('div', { class: 'strong' }, p.name), h('div', { class: 'small mute' }, U.rupiah(p.price) + ' / ' + p.unit + (p.category ? ' · ' + p.category : '')))));
      });
    }
    function paintSum() {
      var p = current(), q = Number(qty.value) || 0;
      U.clear(sum);
      if (!p) return;
      var total = p.price * q, est = PO.estimate(state, p.id, q);
      sum.appendChild(h('div', { class: 'row between' }, h('span', null, 'Total'), h('b', { class: 'mono' }, U.rupiah(total))));
      if (dpPct) sum.appendChild(h('div', { class: 'row between' }, h('span', null, 'DP ' + dpPct + '%'), h('b', { class: 'mono' }, U.rupiah(Math.round(total * dpPct / 100)))));
      sum.appendChild(h('div', { class: 'small mute' }, est.text));
    }
    qty.addEventListener('input', paintSum);
    paintProds(); paintSum();

    function submit() {
      var errs = [[fName, U.validateName(name.value)], [fPhone, U.validatePhone(phone.value)], [fQty, U.validateQty(qty.value, 1, 999)]];
      var bad = errs.filter(function (e) { e[0].setError(e[1]); return e[1]; });
      if (bad.length) { U.$('input', bad[0][0]).focus(); return; }
      var rec = IB.add({ name: name.value.trim(), phone: U.digitsOnly(phone.value), productId: sel, qty: Number(qty.value), note: note.value.trim(), proof: proof.getValue(), source: 'form' });
      if (!rec) { UI.toast('Penyimpanan penuh. Hapus foto bukti lalu coba lagi.', 'error'); return; }
      success(rec);
    }

    if (!products.length) return UI.empty('box', 'Belum ada produk', 'Pemilik belum menambahkan produk.');
    return h('div', { class: 'col', style: 'gap:16px' },
      h('div', null, h('div', { class: 'field-label', style: 'margin-bottom:8px' }, 'Pilih produk'), prodBox),
      h('div', { class: 'form-grid' }, fName, fPhone, fQty), fNote, proof, sum,
      h('p', { class: 'small mute pub-note' }, 'Kebijakan pembatalan: ' + policy),
      UI.btn('Kirim pesanan', 'check', '', submit));
  }

  function success(rec) {
    var p = state.products.filter(function (x) { return x.id === rec.productId; })[0];
    var total = p.price * rec.qty, dp = Math.round(total * dpPct / 100), est = PO.estimate(state, p.id, rec.qty);
    var text = 'Halo ' + set.businessName + ', saya ingin memesan:\n• ' + p.name + ' × ' + rec.qty + '\nNama: ' + rec.name + '\nTotal: ' + U.rupiah(total) +
      (dpPct ? '\nDP ' + dpPct + '%: ' + U.rupiah(dp) : '') + (rec.note ? '\nCatatan: ' + rec.note : '') + '\n\nNo. permintaan: ' + rec.id + '\n' + IB.encode(rec);
    var num = String(set.whatsapp || '').replace(/\D/g, '');
    if (num.charAt(0) === '0') num = '62' + num.slice(1);
    var steps = [];
    if (dpPct && set.bankInfo) steps.push(h('li', null, 'Transfer DP ', h('b', null, U.rupiah(dp)), ' ke:', h('div', { class: 'pub-note mono small' }, set.bankInfo)));
    steps.push(h('li', null, 'Kirim konfirmasi lewat WhatsApp agar pesananmu diproses.' + (rec.proof ? '' : ' Lampirkan bukti transfer di chat.')));
    shell([
      h('div', { class: 'pub-head' }, h('div', { class: 'pub-logo' }, I.el('checkCircle')), h('div', null, h('h1', { class: 'pub-title' }, 'Pesanan terkirim'), h('p', { class: 'page-sub', style: 'margin:2px 0 0' }, 'No. permintaan ' + rec.id))),
      h('div', { class: 'pub-sum' }, h('div', { class: 'strong' }, p.name + ' × ' + rec.qty), h('div', { class: 'row between' }, h('span', null, 'Total'), h('b', { class: 'mono' }, U.rupiah(total))), h('div', { class: 'small mute' }, est.text)),
      h('div', null, h('div', { class: 'field-label' }, 'Langkah berikutnya'), h('ol', { class: 'pub-steps' }, steps)),
      h('a', { class: 'btn', href: 'https://wa.me/' + num + '?text=' + encodeURIComponent(text), target: '_blank', rel: 'noopener' }, I.el('message'), h('span', null, 'Konfirmasi via WhatsApp')),
      h('p', { class: 'small mute pub-note' }, 'Kebijakan pembatalan: ' + policy),
      UI.btn('Pesan lagi', 'plus', 'btn-ghost', function () { shell(header().concat([form()])); })
    ]);
  }

  shell(closed ? header() : header().concat([form()]));
})();
