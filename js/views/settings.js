/* views/settings.js — profil usaha, aturan PO, tampilan (warna), template data, dan data. */
window.PO = window.PO || {};
PO.views = PO.views || {};
PO.views.settings = (function () {
  var U = PO.util, S = PO.store, D = PO.data, UI = PO.ui, h = U.h;
  var BRANDS = [['Terakota', '#b97d70'], ['Oranye', '#d9822b'], ['Zaitun', '#8f8a3e'], ['Hijau', '#4f9a6a'], ['Teal', '#2f9a9e'], ['Biru', '#5b7bd5'], ['Ungu', '#7c5cd6'], ['Pink', '#c4649a'], ['Slate', '#475569']];
  var BGS = [['Krem', '#f8f4f1'], ['Putih', '#ffffff'], ['Abu muda', '#f3f4f6'], ['Hijau muda', '#f1f6f2'], ['Biru muda', '#eff4fb'], ['Lavender', '#f4f1fb'], ['Gelap', '#15171d']];

  /* kontrol warna: preset + color picker (geser kursor) + kode hex */
  function colorControl(title, hint, presets, start, onChange) {
    var value = start;
    var dots = h('div', { class: 'hue-row' });
    var picker = h('input', { type: 'color', class: 'color-input', value: start, 'aria-label': title });
    var text = h('input', { class: 'input mono', value: start, maxLength: 7, style: 'width:120px', 'aria-label': 'Kode hex ' + title });
    var err = h('span', { class: 'field-error', style: 'display:block' });

    function paint() {
      U.clear(dots);
      presets.forEach(function (p) {
        dots.appendChild(h('button', { class: 'hue-dot', type: 'button', title: p[0], 'aria-label': p[0], 'aria-pressed': String(p[1] === value), style: 'background:' + p[1], onClick: function () { set(p[1]); } }));
      });
    }
    function set(hx) { value = hx; picker.value = hx; text.value = hx; err.textContent = ''; paint(); onChange(hx); }
    picker.addEventListener('input', function () { set(picker.value); });
    text.addEventListener('input', function () {
      var hx = UI.hex(text.value);
      if (!hx) { err.textContent = 'Gunakan format hex, contoh #7C5CD6'; return; }
      value = hx; picker.value = hx; err.textContent = ''; paint(); onChange(hx);
    });
    paint();
    return {
      set: set, get: function () { return value; },
      node: h('div', { class: 'col', style: 'gap:10px' },
        h('div', null, h('div', { class: 'field-label' }, title), h('div', { class: 'field-hint' }, hint)),
        dots,
        h('div', { class: 'row' }, picker, text), err)
    };
  }

  function render() {
    var st = S.get(), set = st.settings, fields = {};
    var base = (D.PRESETS[st.presetId] || D.PRESETS.bakery).settings;
    var startBrand = UI.hex(set.brandColor) || base.brandColor || '#b97d70';
    var startBg = UI.hex(set.bgColor) || base.bgColor || '#f8f4f1';
    var live = { brandColor: startBrand, bgColor: startBg };
    function preview() { UI.applyColors({ brandHue: set.brandHue, brandColor: live.brandColor, bgColor: live.bgColor }); }

    function text(key, label, opts) {
      var input = h('input', { class: 'input' + (opts && opts.num ? ' mono' : ''), value: set[key] === undefined ? '' : set[key], inputMode: opts && opts.num ? 'numeric' : null });
      fields[key] = { input: input, field: UI.field(label, input, opts), num: opts && opts.num };
      return fields[key].field;
    }

    var brandCtl = colorControl('Warna utama', 'Tombol, menu aktif, grafik, dan sidebar.', BRANDS, startBrand, function (hx) { live.brandColor = hx; preview(); });
    var bgCtl = colorControl('Warna latar', 'Latar halaman. Pilih "Gelap" untuk mode gelap.', BGS, startBg, function (hx) { live.bgColor = hx; preview(); });

    function save() {
      var patch = { brandColor: live.brandColor, bgColor: live.bgColor, photo: photo.getValue(), startDate: startDate.value || set.startDate, bankInfo: bank.value.trim(), cancelPolicy: policy.value.trim() }, bad = null;
      Object.keys(fields).forEach(function (k) {
        var f = fields[k], v = f.input.value.trim(), err = '';
        if (f.num && !/^\d+$/.test(v)) err = 'Isi dengan angka.';
        else if (k === 'dpPercent' && Number(v) > 100) err = 'Maksimal 100%.';
        else if (k === 'businessName' && !v) err = 'Nama usaha wajib diisi.';
        f.field.setError(err);
        if (err && !bad) bad = f.input;
        patch[k] = f.num ? Number(v) : v;
      });
      if (bad) { bad.focus(); return; }
      S.updateSettings(patch);
      UI.toast('Pengaturan disimpan');
    }

    var startDate = h('input', { class: 'input', type: 'date', value: set.startDate || '' });
    var startField = UI.field('Tanggal mulai usaha', startDate, { hint: 'Menentukan tahun paling awal di filter Keuangan.' });
    var photo = UI.imageField({ label: 'Foto profil / logo', value: set.photo, w: 256, h: 256, round: true, hint: 'Tampil di sidebar. Otomatis dipotong persegi dan dikompres.' });
    var profile = UI.card('Profil usaha', h('div', { class: 'form-grid' }, photo,
      text('businessName', 'Nama usaha', { req: true }), text('ownerName', 'Pemilik'), text('tagline', 'Tagline', { span: true }), text('city', 'Kota'), text('whatsapp', 'WhatsApp usaha'), startField));
    var rules = UI.card('Aturan pre-order', h('div', { class: 'form-grid' },
      text('batchUnit', 'Satuan produk', { hint: 'Contoh: toples, porsi, pcs.' }), text('batchQuota', 'Kuota batch bawaan', { num: true, hint: 'Dipakai produk baru.' }),
      text('leadDays', 'Lama pengerjaan (hari)', { num: true }), text('dpPercent', 'Persentase DP', { num: true, hint: 'Isi 0 jika tanpa DP.' }),
      text('monthlyTarget', 'Target pendapatan bulanan (Rp)', { num: true, span: true })));


    var fsBox = h('div', { class: 'col', style: 'gap:10px' });
    var sample = h('div', { class: 'font-sample' }, 'Contoh teks: pesanan ORD-001 siap dikirim hari ini. Total Rp 148.000.');
    function paintFs() {
      U.clear(fsBox);
      fsBox.appendChild(h('div', null, h('div', { class: 'field-label' }, 'Ukuran tulisan'), h('div', { class: 'field-hint' }, 'Berlaku langsung dan tersimpan di perangkat ini.')));
      fsBox.appendChild(UI.seg(UI.FONT_SCALES.map(function (f) { return { value: f[1], label: f[0] }; }), UI.getFontScale(), function (v) { UI.setFontScale(v); paintFs(); }));
      fsBox.appendChild(sample);
    }
    paintFs();

    var bank = h('textarea', { class: 'textarea', placeholder: 'Contoh: BCA 1234567890 a.n. Nama Anda, atau tulis QRIS', value: set.bankInfo || '' });
    var policy = h('textarea', { class: 'textarea', placeholder: 'DP tidak dapat dikembalikan jika pesanan dibatalkan setelah produksi dimulai.', value: set.cancelPolicy || '' });
    var online = UI.card('Pembayaran & kebijakan', h('div', { class: 'form-grid' },
      UI.field('Rekening / QRIS untuk DP', bank, { span: true, hint: 'Dipakai di nota dan template pesan tagihan.' }),
      UI.field('Kebijakan pembatalan', policy, { span: true, hint: 'Tampil di nota.' })));

    var theme = UI.card('Tampilan', h('div', { class: 'col', style: 'gap:20px' },
      fsBox, brandCtl.node, bgCtl.node,
      UI.btn('Kembalikan warna bawaan', 'refresh', 'btn-ghost btn-sm', function () { brandCtl.set(base.brandColor || '#b97d70'); bgCtl.set(base.bgColor || '#f8f4f1'); })));

    var templates = UI.card('Template data contoh', h('div', { class: 'col' },
      h('p', { class: 'small mute' }, 'Coba Batchin dengan contoh bisnis lain. Memakai template mengganti seluruh produk, pesanan, pengeluaran, dan pengaturan dengan data contoh. Satuan dan kuota bisa diubah lagi di Aturan pre-order.'),
      Object.keys(D.PRESETS).map(function (id) {
        var p = D.PRESETS[id];
        return h('div', { class: 'preset-row' }, h('div', null, h('div', { class: 'preset-name' }, p.label), h('div', { class: 'preset-desc' }, p.desc)),
          UI.btn(st.presetId === id ? 'Dipakai' : 'Pakai template', null, 'btn-ghost btn-sm', function () {
            UI.confirm({ title: 'Pakai template ' + p.label + '?', text: 'Semua data saat ini diganti dengan data contoh template ini.', ok: 'Ganti data', danger: true, onOk: function () { S.applyPreset(id); UI.toast('Template ' + p.label + ' dipakai'); } });
          }));
      })));

    var data = UI.card('Data', h('div', { class: 'col' },
      h('p', { class: 'small mute' }, 'Data tersimpan di peramban ini. Unduh CSV dari menu Laporan sebagai cadangan.'),
      h('div', { class: 'row wrap' },
        UI.btn('Reset data contoh', 'refresh', 'btn-ghost', function () { UI.confirm({ title: 'Reset data contoh?', text: 'Semua perubahan diganti data contoh.', ok: 'Reset', danger: true, onOk: function () { S.resetDemo(); UI.toast('Data contoh dipulihkan'); } }); }),
        UI.btn('Kosongkan pesanan', 'trash', 'btn-danger', function () { UI.confirm({ title: 'Kosongkan semua pesanan?', text: 'Pesanan dan pengeluaran dihapus. Produk dan pengaturan tetap.', ok: 'Kosongkan', danger: true, onOk: function () { S.clearAll(); UI.toast('Data dikosongkan', 'warn'); } }); }))));

    return h('div', null,
      UI.pageHead('Pengaturan', 'Sesuaikan Batchin dengan usaha pre-order kamu.', [UI.btn('Simpan', 'check', '', save)]),
      h('div', { class: 'set-grid' }, h('div', { class: 'col' }, profile, rules, online), h('div', { class: 'col' }, theme, PO.budi.settingsCard(), templates, data)));
  }

  return { render: render };
})();
