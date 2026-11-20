/* tutorial.js — pemandu langkah demi langkah: layar digelapkan + diburamkan, bagian yang dijelaskan disorot. */
window.PO = window.PO || {};
PO.tour = (function () {
  var U = PO.util, I = PO.icons, UI = PO.ui, h = U.h;
  var KEY = 'batchin.tour.v1';
  var root = null, masks = [], hole, ring, tip;
  var mode = '';          // 'tour' | 'menu' | 'dialog' | 'hint'
  var cur = null;         // elemen yang disorot
  var st = null;          // kemajuan tutorial: { ids, ti, si, all, tok }
  var tokenSeq = 0, rafId = 0;

  /* ---------- pencari elemen ---------- */
  function q(sel) { return U.$(sel); }
  function byText(sel, text) { return U.$$(sel).filter(function (n) { return n.textContent.indexOf(text) >= 0; })[0] || null; }
  function card(title) {
    var t = U.$$('.card-title').filter(function (n) { return n.textContent.trim() === title; })[0];
    return t ? t.closest('.card') : null;
  }
  function press(sel, text) { var b = byText(sel, text); if (b) b.click(); }
  function sheetTitle() { var t = q('.sheet .sheet-title'); return t ? t.textContent.trim() : ''; }
  function route() { return location.hash.replace('#', '') || 'dashboard'; }

  /* ---------- jendela (popup) yang perlu dibuka untuk langkah tertentu ---------- */
  var MODALS = {
    orderForm: { check: function () { return sheetTitle() === 'Pesanan baru'; }, open: function () { press('.page-actions .btn', 'Pesanan baru'); } },
    orderDetail: {
      check: function () { return /^ORD-/.test(sheetTitle()); },
      open: function () {
        var rows = U.$$('.table tbody tr');
        var row = rows.filter(function (tr) { return !/Selesai|Batal/.test(tr.textContent); })[0] || rows[0];
        if (row) row.click();
      }
    },
    productForm: { check: function () { return sheetTitle() === 'Produk baru'; }, open: function () { press('.page-actions .btn', 'Produk baru'); } },
    budiChat: { check: function () { return PO.budi.isOpen() && PO.budi.view() === 'chat'; }, open: function () { PO.budi.open('chat'); } },
    budiHistory: { check: function () { return PO.budi.isOpen() && PO.budi.view() === 'history'; }, open: function () { PO.budi.open('history'); } },
    budiMemory: { check: function () { return PO.budi.isOpen() && PO.budi.view() === 'memory'; }, open: function () { PO.budi.open('memory'); } },
    expenseForm: { check: function () { return sheetTitle() === 'Catat pengeluaran'; }, open: function () { press('.page-actions .btn', 'Catat pengeluaran'); } }
  };
  function ensureModal(key) {
    if (!key) { if (q('.sheet')) UI.closeSheet(); PO.budi.close(); return; }
    if (/^budi/.test(key)) { if (q('.sheet')) UI.closeSheet(); if (!MODALS[key].check()) MODALS[key].open(); return; }
    PO.budi.close();
    if (!MODALS[key].check()) { UI.closeSheet(); MODALS[key].open(); }
  }
  function setMenu(open) { document.body.classList.toggle('menu-open', !!open); }

  /* ---------- daftar tutorial (teks sengaja singkat) ---------- */
  var TUTORIALS = [
    { id: 'menu', title: 'Mengenal menu', desc: 'Menu, target, dan angka penting', icon: 'dashboard', route: 'dashboard', steps: [
      { target: function () { return q('.sb-links'); }, sidebar: true, title: 'Menu utama', text: 'Pilih halaman yang mau dibuka dari sini.' },
      { target: function () { return q('.ring-card'); }, title: 'Target bulan ini', text: 'Lingkaran ini menunjukkan pendapatanmu dibanding target.' },
      { target: function () { return q('.kpi-grid'); }, title: 'Angka penting', text: 'Pendapatan, laba, pesanan aktif, dan tagihan belum lunas.' },
      { target: function () { return card('Perlu ditindak'); }, title: 'Perlu ditindak', text: 'Tugas hari ini. Klik salah satu untuk langsung ke halamannya.' }
    ] },
    { id: 'order', title: 'Catat pesanan baru', desc: 'Isi pesanan dan cari pesanan', icon: 'orders', route: 'orders', steps: [
      { target: function () { return byText('.page-actions .btn', 'Pesanan baru'); }, title: 'Pesanan baru', text: 'Klik tombol ini untuk mencatat pesanan.' },
      { modal: 'orderForm', target: function () { return q('.sheet .form-grid'); }, title: 'Isi data', text: 'Isi nama, WhatsApp, produk, dan jumlah.' },
      { modal: 'orderForm', target: function () { return q('.sheet-body .row.between'); }, title: 'Total & estimasi', text: 'Total dan estimasi siap muncul otomatis.' },
      { modal: 'orderForm', target: function () { return byText('.sheet-foot .btn', 'Simpan pesanan'); }, title: 'Simpan', text: 'Klik Simpan. Batch terbentuk otomatis saat kuota penuh.' },
      { target: function () { return q('.toolbar'); }, title: 'Cari & saring', text: 'Cari pesanan, atau pilih status dengan ceklis.' }
    ] },
    { id: 'detail', title: 'Kabari pelanggan', desc: 'Estimasi siap, bukti bayar, nota, WhatsApp', icon: 'message', route: 'orders', steps: [
      { target: function () { return q('.table tbody tr'); }, title: 'Buka pesanan', text: 'Klik baris pesanan untuk melihat detailnya.' },
      { modal: 'orderDetail', target: function () { return byText('.sheet .pay-box', 'Estimasi siap'); }, title: 'Estimasi siap', text: 'Ubah tanggal siap, lalu klik Simpan & kabari via WA.' },
      { modal: 'orderDetail', target: function () { return byText('.sheet .pay-box', 'Bukti bayar'); }, title: 'Bukti bayar', text: 'Unggah bukti transfer, lalu klik Verifikasi.' },
      { modal: 'orderDetail', target: function () { return byText('.sheet .pay-box', 'Pesan WhatsApp'); }, title: 'Pesan WhatsApp', text: 'Pilih template pesan, lalu kirim ke pelanggan.' },
      { modal: 'orderDetail', target: function () { return byText('.sheet-foot .btn', 'Cetak nota'); }, title: 'Cetak nota', text: 'Nota bisa disimpan sebagai PDF dari dialog cetak.' }
    ] },
    { id: 'queue', title: 'Antrean & batch', desc: 'Kuota batch dan papan antrean', icon: 'kanban', route: 'kanban', steps: [
      { target: function () { return card('Kuota batch'); }, title: 'Kuota batch', text: 'Tiap produk punya kuota. Kalau penuh, klik Bentuk batch.' },
      { target: function () { return byText('.page-actions .btn', 'Batch otomatis'); }, title: 'Batch otomatis', text: 'Bentuk semua batch yang kuotanya penuh sekaligus.' },
      { target: function () { return q('.kanban'); }, title: 'Papan antrean', text: 'Geser kartu antar kolom untuk pindah tahap.' }
    ] },
    { id: 'products', title: 'Produk & buka-tutup PO', desc: 'Tambah produk dan atur PO', icon: 'box', route: 'products', steps: [
      { target: function () { return byText('.page-actions .btn', 'Produk baru'); }, title: 'Tambah produk', text: 'Klik untuk menambah produk baru.' },
      { modal: 'productForm', target: function () { return q('.sheet .form-grid'); }, title: 'Data produk', text: 'Isi nama, harga, HPP, dan kuota batch.' },
      { modal: 'productForm', target: function () { return byText('.sheet .field', 'Status PO'); }, title: 'Buka / tutup PO', text: 'Tutup PO kalau produk ini tidak menerima pesanan.' },
      { modal: 'productForm', target: function () { return byText('.sheet .field', 'Estimasi siap'); }, title: 'Estimasi siap', text: 'Isi tanggal kalau mau menetapkan estimasi sendiri.' },
      { target: function () { return byText('.prod .btn', 'PO'); }, title: 'Tutup / buka cepat', text: 'Tombol ini membuka atau menutup PO tanpa membuka form.' }
    ] },
    { id: 'finance', title: 'Catat pengeluaran', desc: 'Periode, laba rugi, dan pengeluaran', icon: 'wallet', route: 'finance', steps: [
      { target: function () { var f = q('.page-actions .field'); return f ? f.parentNode : null; }, title: 'Pilih periode', text: 'Pilih bulan dan tahun yang mau dilihat.' },
      { target: function () { return q('.fin-grid .card'); }, title: 'Laba rugi', text: 'Pendapatan dikurangi pengeluaran = laba bersih.' },
      { target: function () { return byText('.page-actions .btn', 'Catat pengeluaran'); }, title: 'Catat pengeluaran', text: 'Klik untuk mencatat belanja bahan atau biaya lain.' },
      { modal: 'expenseForm', target: function () { return q('.sheet .form-grid'); }, title: 'Isi pengeluaran', text: 'Isi tanggal, kategori, dan nominal.' },
      { modal: 'expenseForm', target: function () { return byText('.sheet-foot .btn', 'Simpan'); }, title: 'Simpan', text: 'Klik Simpan. Laba bulan ini langsung ikut berubah.' }
    ] },
    { id: 'reports', title: 'Laporan', desc: 'Evaluasi layanan dan unduh data', icon: 'report', route: 'reports', steps: [
      { target: function () { return q('.rep-grid'); }, title: 'Ringkasan layanan', text: 'Lihat tingkat pembatalan, durasi, dan pelanggan berulang.' },
      { target: function () { return byText('.page-actions .btn', 'Unduh CSV'); }, title: 'Unduh data', text: 'Unduh data pesanan untuk cadangan atau Excel.' }
    ] },
    { id: 'settings', title: 'Pengaturan', desc: 'Profil, aturan PO, warna, dan tulisan', icon: 'settings', route: 'settings', steps: [
      { target: function () { return card('Profil usaha'); }, title: 'Profil usaha', text: 'Isi nama, foto, dan tanggal mulai usaha.' },
      { target: function () { return card('Aturan pre-order'); }, title: 'Aturan pre-order', text: 'Atur satuan, kuota, DP, dan target bulanan.' },
      { target: function () { return card('Tampilan'); }, title: 'Tampilan', text: 'Ganti ukuran tulisan dan warna aplikasi di sini.' },
      { target: function () { return card('Asisten Budi'); }, title: 'Gaya bicara Budi', text: 'Atur gaya bicara asisten Budi dan koneksi AI-nya di sini.' },
      { target: function () { return byText('.page-actions .btn', 'Simpan'); }, title: 'Simpan', text: 'Klik Simpan setelah mengubah pengaturan.' }
    ] },
    { id: 'budi', title: 'Ngobrol dengan Budi', desc: 'Asisten AI untuk saran & keputusan bisnis', icon: 'message', route: 'dashboard', steps: [
      { target: function () { return q('.budi-fab'); }, title: 'Kenalan dengan Budi', text: 'Ikon di pojok kanan bawah ini adalah Budi, asisten AI dan konsultan bisnismu. Klik untuk membuka chat.' },
      { modal: 'budiChat', target: function () { return q('.budi-panel'); }, title: 'Tanya apa saja', text: 'Budi membaca data pesanan, produk, dan keuanganmu. Tanyakan harga, margin, kuota batch, kapan tutup PO, atau ide promosi.' },
      { modal: 'budiChat', target: function () { return q('.budi-compose'); }, title: 'Pesan yang rapi', text: 'Pakai tombol di atas kotak ketik untuk tebal, miring, garis bawah, bullet, dan nomor. Enter untuk kirim, Shift+Enter baris baru.' },
      { modal: 'budiChat', target: function () { return q('[data-budi="new"]'); }, title: 'Chat baru', text: 'Klik plus untuk memulai percakapan baru dengan topik lain.' },
      { modal: 'budiHistory', target: function () { return q('.budi-pane'); }, title: 'Riwayat chat', text: 'Semua percakapan tersimpan di sini. Klik salah satu untuk membukanya lagi.' },
      { modal: 'budiMemory', target: function () { return q('.budi-pane'); }, title: 'Memori Budi', text: 'Budi mengingat preferensimu di semua chat, jadi tak perlu mengulang. Kamu bisa menambah atau menghapusnya.' }
    ] },
    { id: 'budistyle', title: 'Atur gaya bicara Budi', desc: 'Santai, formal, atau gayamu sendiri', icon: 'settings', route: 'settings', steps: [
      { target: function () { return card('Asisten Budi'); }, title: 'Asisten Budi', text: 'Semua pengaturan Budi ada di kartu ini.' },
      { target: function () { return byText('.card .field', 'Instruksi gaya tambahan'); }, title: 'Gaya sendiri', text: 'Pilih gaya bawaan, atau tulis bebas gaya bicara yang kamu mau.' },
      { target: function () { return byText('.card .field', 'API key'); }, title: 'Koneksi AI', text: 'Isi alamat endpoint dan API key, lalu klik Uji koneksi.' }
    ] }
  ];
  function byId(id) { return TUTORIALS.filter(function (t) { return t.id === id; })[0]; }

  /* ---------- lapisan gelap + blur ---------- */
  function build() {
    root = h('div', { class: 'tour-root', role: 'dialog', 'aria-modal': 'true' });
    masks = [0, 1, 2, 3].map(function () { var m = h('div', { class: 'tour-mask' }); root.appendChild(m); return m; });
    hole = h('div', { class: 'tour-hole' });
    ring = h('div', { class: 'tour-ring' });
    tip = h('div', { class: 'tour-tip' });
    root.appendChild(hole); root.appendChild(ring); root.appendChild(tip);
    root.addEventListener('click', function (e) {
      if (mode === 'menu' && (e.target === hole || e.target.classList.contains('tour-mask'))) closeRoot();
    });
    document.body.appendChild(root);
    window.addEventListener('resize', reflow);
    window.addEventListener('scroll', reflow, true);
    document.addEventListener('keydown', onKey);
  }

  function closeRoot() {
    if (!root) return;
    window.removeEventListener('resize', reflow);
    window.removeEventListener('scroll', reflow, true);
    document.removeEventListener('keydown', onKey);
    root.parentNode.removeChild(root);
    root = null; cur = null; mode = '';
  }

  function stop() {
    tokenSeq++;
    st = null;
    closeRoot();
    if (U.$('.sheet')) UI.closeSheet();
    PO.budi.close();
    setMenu(false);
  }

  function box(n, x, y, w, hh) { n.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:' + Math.max(0, w) + 'px;height:' + Math.max(0, hh) + 'px'; }

  function layout(el) {
    var vw = window.innerWidth, vh = window.innerHeight;
    var r = el && document.body.contains(el) ? el.getBoundingClientRect() : null;
    if (!r || (!r.width && !r.height)) {
      box(masks[0], 0, 0, vw, vh);
      for (var i = 1; i < 4; i++) box(masks[i], 0, 0, 0, 0);
      hole.style.display = 'none'; ring.style.display = 'none';
      return null;
    }
    var pad = 6, top = Math.max(0, r.top - pad), left = Math.max(0, r.left - pad), right = Math.min(vw, r.right + pad), bottom = Math.min(vh, r.bottom + pad);
    box(masks[0], 0, 0, vw, top);
    box(masks[1], 0, bottom, vw, vh - bottom);
    box(masks[2], 0, top, left, bottom - top);
    box(masks[3], right, top, vw - right, bottom - top);
    hole.style.display = ''; ring.style.display = '';
    box(hole, left, top, right - left, bottom - top);
    box(ring, left, top, right - left, bottom - top);
    return { top: top, left: left, right: right, bottom: bottom };
  }

  function placeTip(b) {
    var vw = window.innerWidth, vh = window.innerHeight, tw = tip.offsetWidth, th = tip.offsetHeight, m = 14, x, y;
    if (!b) { x = (vw - tw) / 2; y = (vh - th) / 2; }
    else {
      var cx = b.left + (b.right - b.left) / 2 - tw / 2;
      if (vh - b.bottom >= th + m + 8) { x = cx; y = b.bottom + m; }
      else if (b.top >= th + m + 8) { x = cx; y = b.top - th - m; }
      else if (vw - b.right >= tw + m + 8) { x = b.right + m; y = b.top; }
      else if (b.left >= tw + m + 8) { x = b.left - tw - m; y = b.top; }
      else { x = (vw - tw) / 2; y = vh - th - 16; }
    }
    tip.style.left = U.clamp(x, 12, Math.max(12, vw - tw - 12)) + 'px';
    tip.style.top = U.clamp(y, 12, Math.max(12, vh - th - 12)) + 'px';
    tip.style.visibility = 'visible';
  }

  function reflow() {
    if (!root) return;
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(function () { if (root) placeTip(layout(cur)); });
  }

  function fill(nodes, cls) {
    tip.className = 'tour-tip' + (cls ? ' ' + cls : '');
    tip.style.visibility = 'hidden';
    U.clear(tip);
    tip.appendChild(h('div', null, nodes));
  }

  /* ---------- popup sambutan & pengingat ---------- */
  function seen() { try { return window.localStorage.getItem(KEY) === '1'; } catch (err) { return true; } }
  function markSeen() { try { window.localStorage.setItem(KEY, '1'); } catch (err) {} }

  function dialog(title, text, actions, el, m) {
    if (!root) build();
    mode = m; cur = el || null;
    fill([h('h3', { class: 'tour-title' }, title), h('p', { class: 'tour-text' }, text), h('div', { class: 'tour-actions' }, actions)]);
    reflow();
    var primary = U.$('.btn:last-child', tip);
    if (primary) primary.focus();
  }

  function hint(title, text) {
    var btn = q('.help-btn');
    if (btn && btn.offsetParent === null) btn = null;
    dialog(title, text, [UI.btn('Mengerti', 'check', '', closeRoot)], btn, 'hint');
  }
  var HELP_TEXT = 'Jika ada pertanyaan atau bingung dengan fitur, klik ikon tanda tanya di pojok kanan atas ya.';

  function welcome() {
    dialog('Hai!', 'Apakah ini pertama kali kamu menggunakan aplikasi ini?', [
      UI.btn('Tidak', null, 'btn-ghost', function () { markSeen(); closeRoot(); hint('Siap!', HELP_TEXT); }),
      UI.btn('Ya, pertama kali', 'arrowRight', '', function () { markSeen(); startAll(); })
    ], null, 'dialog');
  }

  /* ---------- menu daftar tutorial (ikon ?) ---------- */
  function openMenu() {
    if (mode === 'menu') { closeRoot(); return; }
    stop();
    var items = TUTORIALS.map(function (t) {
      return h('button', { class: 'tour-menu-item', type: 'button', onClick: function () { start([t.id], false); } },
        I.el(t.icon), h('span', null, t.title, h('small', null, t.desc)));
    });
    var btn = q('.help-btn');
    if (!root) build();
    mode = 'menu'; cur = btn;
    fill([
      h('h3', { class: 'tour-title' }, 'Tutorial'), h('p', { class: 'tour-text', style: 'margin-bottom:8px' }, 'Pilih yang mau dilihat lagi.'),
      h('div', { class: 'tour-menu' }, items),
      h('div', { class: 'tour-actions', style: 'margin-top:10px' }, [UI.btn('Tutup', null, 'btn-ghost btn-sm', closeRoot), UI.btn('Putar semua', 'arrowRight', 'btn-sm', startAll)])
    ], 'wide');
    reflow();
  }

  /* ---------- menjalankan tutorial ---------- */
  function startAll() { start(TUTORIALS.map(function (t) { return t.id; }), true); }

  function start(ids, all) {
    stop();
    build();
    mode = 'tour';
    st = { ids: ids, ti: 0, si: 0, all: all };
    go();
  }

  function go() {
    var tok = ++tokenSeq, t = byId(st.ids[st.ti]), s = t.steps[st.si];
    if (route() !== t.route) location.hash = '#' + t.route;
    setTimeout(function () {
      if (tok !== tokenSeq) return;
      setMenu(!!s.sidebar && window.innerWidth <= 900);
      ensureModal(s.modal || null);
      setTimeout(function () {
        if (tok !== tokenSeq) return;
        var el = s.target ? s.target() : null;
        if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', inline: 'nearest' });
        cur = el;
        renderStep(t, s);
      }, s.sidebar ? 280 : 90);
    }, 100);
  }

  function renderStep(t, s) {
    var total = t.steps.length, lastStep = st.si === total - 1, lastTut = st.ti === st.ids.length - 1;
    var meta = (st.ids.length > 1 ? 'Tutorial ' + (st.ti + 1) + '/' + st.ids.length + ' · ' : '') + t.title + ' · ' + (st.si + 1) + '/' + total;
    var nextLabel = lastStep ? (lastTut ? 'Selesai' : 'Tutorial berikutnya') : 'Lanjut';
    var canBack = st.si > 0 || st.ti > 0;
    var skip = st.all
      ? [h('button', { class: 'tour-link', type: 'button', onClick: nextTutorial }, 'Lewati tutorial ini'), h('button', { class: 'tour-link', type: 'button', onClick: finish }, 'Lewati semua')]
      : [h('button', { class: 'tour-link', type: 'button', onClick: finish }, 'Tutup')];
    fill([
      h('div', { class: 'tour-meta' }, meta),
      h('h3', { class: 'tour-title' }, s.title),
      h('p', { class: 'tour-text' }, s.text),
      h('div', { class: 'tour-actions' }, [canBack ? UI.btn('Kembali', null, 'btn-ghost btn-sm', back) : null, UI.btn(nextLabel, lastStep && lastTut ? 'check' : 'arrowRight', 'btn-sm', next)]),
      h('div', { class: 'tour-skip' }, skip)
    ]);
    reflow();
    var primary = U.$('.tour-actions .btn:last-child', tip);
    if (primary) primary.focus({ preventScroll: true });
  }

  function next() {
    var t = byId(st.ids[st.ti]);
    if (st.si < t.steps.length - 1) { st.si++; go(); } else nextTutorial();
  }
  function back() {
    if (st.si > 0) { st.si--; go(); }
    else if (st.ti > 0) { st.ti--; st.si = byId(st.ids[st.ti]).steps.length - 1; go(); }
  }
  function nextTutorial() {
    if (st.ti < st.ids.length - 1) { st.ti++; st.si = 0; go(); } else finish();
  }
  function finish() {
    var all = st && st.all;
    stop();
    if (all) {
      location.hash = '#dashboard';
      setTimeout(function () { hint('Selesai!', HELP_TEXT); }, 250);
    }
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      if (mode === 'tour') finish(); else if (mode === 'menu' || mode === 'hint') closeRoot();
    } else if (mode === 'tour' && (e.key === 'ArrowRight' || e.key === 'Enter')) { e.preventDefault(); next(); }
    else if (mode === 'tour' && e.key === 'ArrowLeft') { e.preventDefault(); back(); }
  }

  function init() { if (!seen()) setTimeout(welcome, 600); }

  return { init: init, openMenu: openMenu, start: start, startAll: startAll, active: function () { return !!st; } };
})();