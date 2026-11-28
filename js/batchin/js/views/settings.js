/* views/settings.js — profil usaha, aturan PO, tema, dan data. */
window.PO = window.PO || {};
PO.views = PO.views || {};
PO.views.settings = (function () {
  var U = PO.util, S = PO.store, D = PO.data, UI = PO.ui, h = U.h;
  var HUES = [30, 95, 145, 200, 265, 340];

  function render() {
    var set = S.get().settings, fields = {}, hue = set.brandHue;
    function text(key, label, opts) {
      var input = h('input', { class: 'input' + (opts && opts.num ? ' mono' : ''), value: set[key] === undefined ? '' : set[key], inputMode: opts && opts.num ? 'numeric' : null });
      fields[key] = { input: input, field: UI.field(label, input, opts), num: opts && opts.num };
      return fields[key].field;
    }
    var hueRow = h('div', { class: 'hue-row' });
    function paintHue() {
      U.clear(hueRow);
      HUES.forEach(function (v) {
        hueRow.appendChild(h('button', { class: 'hue-dot', type: 'button', 'aria-label': 'Warna ' + v, 'aria-pressed': String(v === hue), style: 'background:oklch(0.64 0.08 ' + v + ')', onClick: function () { hue = v; document.documentElement.style.setProperty('--tp-h', v); paintHue(); } }));
      });
    }
    paintHue();

    function save() {
      var patch = { brandHue: hue }, bad = null;
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

    var profile = UI.card('Profil usaha', h('div', { class: 'form-grid' },
      text('businessName', 'Nama usaha', { req: true }), text('ownerName', 'Pemilik'), text('tagline', 'Tagline', { span: true }), text('city', 'Kota'), text('whatsapp', 'WhatsApp usaha')));
    var rules = UI.card('Aturan pre-order', h('div', { class: 'form-grid' },
      text('batchUnit', 'Satuan produk'), text('batchQuota', 'Kuota batch bawaan', { num: true, hint: 'Dipakai produk baru.' }),
      text('leadDays', 'Lama pengerjaan (hari)', { num: true }), text('dpPercent', 'Persentase DP', { num: true, hint: 'Isi 0 jika tanpa DP.' }),
      text('monthlyTarget', 'Target pendapatan bulanan (Rp)', { num: true, span: true })));
    var theme = UI.card('Warna merek', hueRow);

    var presets = UI.card('Jenis usaha', Object.keys(D.PRESETS).map(function (id) {
      var p = D.PRESETS[id];
      return h('div', { class: 'preset-row' }, h('div', null, h('div', { class: 'preset-name' }, p.label), h('div', { class: 'preset-desc' }, p.desc)),
        UI.btn(S.get().presetId === id ? 'Aktif' : 'Pakai', null, 'btn-ghost btn-sm', function () {
          UI.confirm({ title: 'Pakai preset ' + p.label + '?', text: 'Semua data saat ini diganti dengan data contoh preset ini.', ok: 'Ganti data', danger: true, onOk: function () { S.applyPreset(id); UI.toast('Preset ' + p.label + ' dipakai'); } });
        }));
    }));
    var data = UI.card('Data', h('div', { class: 'col' },
      h('p', { class: 'small mute' }, 'Data tersimpan di peramban ini. Unduh CSV dari menu Laporan sebagai cadangan.'),
      h('div', { class: 'row wrap' },
        UI.btn('Reset data contoh', 'refresh', 'btn-ghost', function () { UI.confirm({ title: 'Reset data contoh?', text: 'Semua perubahan diganti data contoh.', ok: 'Reset', danger: true, onOk: function () { S.resetDemo(); UI.toast('Data contoh dipulihkan'); } }); }),
        UI.btn('Kosongkan pesanan', 'trash', 'btn-danger', function () { UI.confirm({ title: 'Kosongkan semua pesanan?', text: 'Pesanan dan pengeluaran dihapus. Produk dan pengaturan tetap.', ok: 'Kosongkan', danger: true, onOk: function () { S.clearAll(); UI.toast('Data dikosongkan', 'warn'); } }); }))));

    return h('div', null,
      UI.pageHead('Pengaturan', 'Sesuaikan Batchin dengan usaha pre-order kamu.', [UI.btn('Simpan', 'check', '', save)]),
      h('div', { class: 'set-grid' }, h('div', { class: 'col' }, profile, rules), h('div', { class: 'col' }, theme, presets, data)));
  }

  return { render: render };
})();
