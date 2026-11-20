/* budi.js — Budi, asisten AI & konsultan bisnis pre-order.
   Terhubung ke alur Langflow (POST /api/v1/run/<id>, header x-api-key).
   Fitur: pesan kaya (tebal/miring/garis bawah/daftar), riwayat chat, chat baru,
   memori preferensi lintas chat, gaya bicara yang bisa diatur. */
window.PO = window.PO || {};
PO.budi = (function () {
  var U = PO.util, S = PO.store, I = PO.icons, UI = PO.ui, h = U.h;
  var KEY = 'batchin.budi.v1';
  var DEFAULT_URL = 'http://localhost:7860/api/v1/run/113cf4a6-f575-4e13-b643-2471c7160097';

  var STYLES = {
    santai: { label: 'Santai', text: 'Gaya santai dan hangat seperti teman yang jago bisnis. Bahasa Indonesia sehari-hari (aku/kamu), boleh sesekali emoji secukupnya.' },
    formal: { label: 'Formal', text: 'Gaya sopan dan profesional (saya/Anda), tanpa emoji, tetap ramah.' },
    singkat: { label: 'Tegas', text: 'Sangat to the point: langsung rekomendasi, alasan satu atau dua kalimat, tanpa basa-basi.' },
    semangat: { label: 'Semangat', text: 'Antusias dan memotivasi, tetap berbasis data dan jujur soal risiko.' }
  };
  var LENGTHS = {
    ringkas: { label: 'Ringkas', text: 'Jawaban pendek, maksimal sekitar 120 kata.' },
    sedang: { label: 'Sedang', text: 'Jawaban secukupnya, sekitar 120–250 kata.' },
    detail: { label: 'Detail', text: 'Jawaban rinci dengan langkah-langkah dan perbandingan opsi bila perlu.' }
  };
  var SUGGEST = [
    'Produk mana yang paling menguntungkan?',
    'Evaluasi keuangan bulan ini',
    'Kapan sebaiknya aku tutup PO?',
    'Ide promosi untuk PO berikutnya'
  ];

  /* ---------- penyimpanan ---------- */
  var db = null, mem = false;
  function fresh() {
    return { chats: [], activeId: null, memory: [], introSeen: false,
      persona: { style: 'santai', length: 'sedang', callName: '', extra: '' },
      config: { url: DEFAULT_URL, key: '' } };
  }
  function load() {
    var d = fresh();
    try {
      var raw = JSON.parse(window.localStorage.getItem(KEY) || 'null');
      if (raw && typeof raw === 'object') {
        d.chats = Array.isArray(raw.chats) ? raw.chats : [];
        d.activeId = raw.activeId || null;
        d.memory = Array.isArray(raw.memory) ? raw.memory : [];
        d.introSeen = !!raw.introSeen;
        d.persona = Object.assign(d.persona, raw.persona || {});
        d.config = Object.assign(d.config, raw.config || {});
      }
    } catch (e) { mem = true; }
    db = d;
  }
  function save() {
    if (mem) return;
    try { window.localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { mem = true; }
  }

  /* ---------- ikon (khusus Budi) ---------- */
  function svg(p, sw) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 1.8) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }
  var IC = {
    bot: svg('<rect x="4" y="8" width="16" height="11" rx="3.5"/><path d="M12 8V5"/><circle cx="12" cy="4" r="1" fill="currentColor"/><circle cx="9" cy="13.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="13.5" r="1.1" fill="currentColor" stroke="none"/><path d="M2.5 12.5v2M21.5 12.5v2"/>'),
    send: svg('<path d="M4 12 20 4l-4.5 16-3.5-6.5L4 12Z"/><path d="M12 13.5 20 4"/>'),
    bold: svg('<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/>', 2.2),
    italic: svg('<path d="M10 5h8M6 19h8M14.5 5 9.5 19"/>'),
    underline: svg('<path d="M7 4.5v7a5 5 0 0 0 10 0v-7M5 20h14"/>'),
    strike: svg('<path d="M5 12h14"/><path d="M16.5 7.2A4.5 4.5 0 0 0 12.3 5C9.6 5 8 6.3 8 8.2c0 1.4.9 2.3 2.5 2.8M8 16.8A4.8 4.8 0 0 0 12 19c2.8 0 4.5-1.3 4.5-3.3 0-1.1-.5-1.9-1.5-2.5"/>'),
    ul: svg('<circle cx="5" cy="7" r="1.1" fill="currentColor"/><circle cx="5" cy="12" r="1.1" fill="currentColor"/><circle cx="5" cy="17" r="1.1" fill="currentColor"/><path d="M10 7h10M10 12h10M10 17h10"/>'),
    ol: svg('<path d="M10 7h10M10 12h10M10 17h10"/><path d="M4.5 5.5 6 5v4M4.5 14.5c0-1 1.8-1 1.8 0 0 1.2-1.8 1.6-1.8 2.7h1.9"/>', 1.6),
    heading: svg('<path d="M6 5v14M18 5v14M6 12h12"/>', 2),
    quote: svg('<path d="M5 17v-4.5C5 9.5 6.5 8 9 7.5M13 17v-4.5c0-3 1.5-4.5 4-5"/><path d="M5 17h4v-4H5zM13 17h4v-4h-4z" fill="currentColor" stroke="none"/>', 1.4),
    code: svg('<path d="M8.5 7 3.5 12l5 5M15.5 7l5 5-5 5"/>'),
    brain: svg('<path d="M9 4.5A3 3 0 0 0 6 7.5a3 3 0 0 0-2 5 3 3 0 0 0 2.5 4.7A3 3 0 0 0 9 19.5a2 2 0 0 0 3-1.7V6.2A2 2 0 0 0 9 4.5Z"/><path d="M15 4.5a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2.5 4.7 3 3 0 0 1-2.5 2.3 2 2 0 0 1-3-1.7V6.2a2 2 0 0 1 3-1.7Z"/>', 1.6),
    history: svg('<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4.5V9H8"/><path d="M12 7.5V12l3 1.8"/>'),
    back: svg('<path d="M15 5l-7 7 7 7"/>', 2)
  };
  function ic(name, size) {
    var s = document.createElement('span');
    s.innerHTML = IC[name] || I.get(name);
    var el = s.firstChild;
    if (size) { el.setAttribute('width', size); el.setAttribute('height', size); }
    return el;
  }

  /* ---------- render markdown → HTML aman ---------- */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function inline(s) {
    var stash = [];
    function keep(html) { stash.push(html); return '\u0001' + (stash.length - 1) + '\u0002'; }
    s = s.replace(/\\([\\`*_~\[\]<>#+\-|])/g, function (m, c) { return keep(esc(c)); });
    s = s.replace(/`([^`\n]+)`/g, function (m, c) { return keep('<code>' + esc(c) + '</code>'); });
    s = esc(s);
    s = s.replace(/&lt;u&gt;([\s\S]*?)&lt;\/u&gt;/gi, '<u>$1</u>').replace(/\+\+([^\n+]+?)\+\+/g, '<u>$1</u>');
    s = s.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, function (m, t, u) { return '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + t + '</a>'; });
    s = s.replace(/\*\*([^\n]+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^\w])__([^\n]+?)__(?!\w)/g, '$1<strong>$2</strong>');
    s = s.replace(/~~([^\n]+?)~~/g, '<s>$1</s>');
    s = s.replace(/(^|[^\w*])\*([^\s*][^\n*]*?)\*(?!\w)/g, '$1<em>$2</em>').replace(/(^|[^\w])_([^\s_][^\n_]*?)_(?!\w)/g, '$1<em>$2</em>');
    return s.replace(/\u0001(\d+)\u0002/g, function (m, i) { return stash[Number(i)]; });
  }

  function md(src) {
    var lines = String(src || '').replace(/\r/g, '').split('\n'), out = [], i = 0, para = [];
    function flush() { if (para.length) { out.push('<p>' + para.map(inline).join('<br>') + '</p>'); para = []; } }
    function isTableSep(l) { return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l) && l.indexOf('-') >= 0; }
    function cells(l) { return l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim(); }); }
    while (i < lines.length) {
      var line = lines[i], m;
      if (/^```/.test(line)) {
        flush(); var code = []; i++;
        while (i < lines.length && !/^```/.test(lines[i])) { code.push(lines[i]); i++; }
        i++; out.push('<pre><code>' + esc(code.join('\n')) + '</code></pre>'); continue;
      }
      if (!line.trim()) { flush(); i++; continue; }
      if ((m = line.match(/^(#{1,4})\s+(.*)$/))) { flush(); out.push('<h4>' + inline(m[2]) + '</h4>'); i++; continue; }
      if (/^\s*([-*_])\s*\1\s*\1[\s\-*_]*$/.test(line)) { flush(); out.push('<hr>'); i++; continue; }
      if (line.indexOf('|') >= 0 && i + 1 < lines.length && isTableSep(lines[i + 1])) {
        flush();
        var head = cells(line), body = []; i += 2;
        while (i < lines.length && lines[i].indexOf('|') >= 0 && lines[i].trim()) { body.push(cells(lines[i])); i++; }
        out.push('<div class="budi-tbl"><table><thead><tr>' + head.map(function (c) { return '<th>' + inline(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          body.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + inline(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>');
        continue;
      }
      if (/^>\s?/.test(line)) {
        flush(); var q = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, '')); i++; }
        out.push('<blockquote>' + q.map(inline).join('<br>') + '</blockquote>'); continue;
      }
      if (/^\s*([-*•+]|\d+[.)])\s+/.test(line)) {
        flush();
        var stack = [], html = '';
        while (i < lines.length && (m = lines[i].match(/^(\s*)([-*•+]|\d+[.)])\s+(.*)$/))) {
          var depth = Math.floor(m[1].replace(/\t/g, '  ').length / 2), tag = /\d/.test(m[2]) ? 'ol' : 'ul';
          while (stack.length > depth + 1) { html += '</li></' + stack.pop() + '>'; }
          if (stack.length === depth + 1) {
            if (stack[depth] !== tag) { html += '</li></' + stack.pop() + '><' + tag + '><li>'; stack.push(tag); }
            else html += '</li><li>';
          } else {
            while (stack.length < depth + 1) { html += '<' + tag + '><li>'; stack.push(tag); if (stack.length < depth + 1) html += ''; }
          }
          html += inline(m[3]); i++;
        }
        while (stack.length) html += '</li></' + stack.pop() + '>';
        out.push(html); continue;
      }
      para.push(line); i++;
    }
    flush();
    return sanitize(out.join(''));
  }

  /* daftar putih tag + atribut — pengaman terakhir untuk semua HTML yang masuk ke layar */
  var OK_TAGS = { P: 1, BR: 1, STRONG: 1, B: 1, EM: 1, I: 1, U: 1, S: 1, CODE: 1, PRE: 1, UL: 1, OL: 1, LI: 1, H4: 1, BLOCKQUOTE: 1, A: 1, HR: 1, TABLE: 1, THEAD: 1, TBODY: 1, TR: 1, TH: 1, TD: 1, DIV: 1 };
  function sanitize(html) {
    var doc = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) return;
        if (c.nodeType !== 1 || !OK_TAGS[c.tagName]) { c.parentNode.removeChild(c); return; }
        Array.prototype.slice.call(c.attributes).forEach(function (a) {
          var keep = (c.tagName === 'A' && a.name === 'href' && /^https?:\/\//i.test(a.value)) || (c.tagName === 'A' && (a.name === 'target' || a.name === 'rel')) || (a.name === 'class' && c.tagName === 'DIV' && c.className === 'budi-tbl');
          if (!keep) c.removeAttribute(a.name);
        });
        walk(c);
      });
    })(doc.body);
    return doc.body.innerHTML;
  }

  /* ---------- isi kotak ketik (HTML) → markdown untuk dikirim & disimpan ---------- */
  function escMd(t) { return t.replace(/([\\`*_~<])/g, '\\$1'); }
  function htmlToMd(root) {
    function inl(node) {
      var s = '';
      Array.prototype.forEach.call(node.childNodes, function (c) {
        if (c.nodeType === 3) { s += escMd(c.nodeValue.replace(/ /g, ' ')); return; }
        if (c.nodeType !== 1) return;
        var t = c.tagName, inner;
        if (t === 'BR') { s += '\n'; return; }
        if (t === 'UL' || t === 'OL') { s += '\n' + list(c, 1); return; }
        inner = inl(c);
        if (!inner.trim()) { s += inner; return; }
        var lead = inner.match(/^\s*/)[0], trail = inner.match(/\s*$/)[0], core = inner.trim();
        if (t === 'B' || t === 'STRONG' || (t === 'SPAN' && /bold|[6-9]00/.test(c.style.fontWeight))) s += lead + '**' + core + '**' + trail;
        else if (t === 'I' || t === 'EM' || (t === 'SPAN' && c.style.fontStyle === 'italic')) s += lead + '*' + core + '*' + trail;
        else if (t === 'U') s += lead + '<u>' + core + '</u>' + trail;
        else if (t === 'S' || t === 'STRIKE' || t === 'DEL') s += lead + '~~' + core + '~~' + trail;
        else if (t === 'CODE') s += '`' + c.textContent + '`';
        else s += inner;
      });
      return s;
    }
    function list(node, depth) {
      var n = 0, out = '';
      Array.prototype.forEach.call(node.children, function (li) {
        if (li.tagName !== 'LI') return;
        n++;
        var pre = new Array(depth).join('  ') + (node.tagName === 'OL' ? n + '. ' : '- ');
        var sub = '', text = '';
        Array.prototype.forEach.call(li.childNodes, function (c) {
          if (c.nodeType === 1 && (c.tagName === 'UL' || c.tagName === 'OL')) sub += list(c, depth + 1);
          else { var w = document.createElement('div'); w.appendChild(c.cloneNode(true)); text += inl(w); }
        });
        out += pre + text.trim() + '\n' + sub;
      });
      return out;
    }
    var lines = [], buf = null;
    function flushBuf() { if (buf !== null) { lines.push(buf); buf = null; } }
    function block(node) {
      Array.prototype.forEach.call(node.childNodes, function (c) {
        var t = c.nodeType === 1 ? c.tagName : '';
        if (c.nodeType === 3) { buf = (buf || '') + escMd(c.nodeValue.replace(/\u00a0/g, ' ')); return; }
        if (c.nodeType !== 1) return;
        if (t === 'BR') { if (buf === null) lines.push(''); else flushBuf(); return; }
        if (!/^(DIV|P|UL|OL|H[1-4]|BLOCKQUOTE)$/.test(t)) { buf = (buf || '') + inl({ childNodes: [c] }); return; }
        flushBuf();
        if (t === 'UL' || t === 'OL') lines.push(list(c, 1).replace(/\n$/, ''));
        else if (/^H[1-4]$/.test(t)) lines.push('### ' + inl(c).trim());
        else if (t === 'BLOCKQUOTE') lines.push(inl(c).trim().split('\n').map(function (l) { return '> ' + l; }).join('\n'));
        else if (c.querySelector('ul,ol,div,p,blockquote,h3')) block(c);
        else lines.push(inl(c).replace(/\n$/, ''));
      });
      flushBuf();
    }
    block(root);
    return lines.join('\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  /* ---------- konteks bisnis & prompt ---------- */
  function snapshot() {
    try {
      var st = S.get(), set = st.settings, sel = PO.sel, now = new Date(), L = [];
      var rev = sel.revenue(now), exp = sel.expense(now), target = Number(set.monthlyTarget) || 0;
      L.push('Usaha: ' + set.businessName + (set.city ? ' (' + set.city + ')' : '') + '. Satuan: ' + set.batchUnit + '. Kuota batch bawaan: ' + set.batchQuota + '. Lama pengerjaan: ' + set.leadDays + ' hari. DP: ' + set.dpPercent + '%. Target bulanan: ' + U.rupiah(target) + '.');
      L.push('Bulan ini: pendapatan ' + U.rupiah(rev) + ', pengeluaran ' + U.rupiah(exp) + ', laba ' + U.rupiah(rev - exp) + (target ? ' (' + Math.round(rev / target * 100) + '% dari target)' : '') + '.');
      L.push('6 bulan terakhir: ' + sel.monthSeries(6).map(function (m) { return m.label + ' pendapatan ' + U.compactRupiah(m.revenue) + ', pengeluaran ' + U.compactRupiah(m.expense); }).join('; ') + '.');
      var sc = sel.statusCounts();
      L.push('Pesanan per status: ' + PO.data.STATUSES.map(function (s) { return s.label + ' ' + (sc[s.key] || 0); }).join(', ') + '. Pesanan aktif: ' + sel.activeOrders().length + '. Piutang (belum lunas): ' + U.rupiah(sel.receivable()) + '. Lewat jatuh tempo: ' + sel.overdue().length + '.');
      var rc = sel.repeatCustomers();
      L.push('Tingkat pembatalan: ' + Math.round(sel.cancelRate()) + '%. Rata-rata durasi selesai: ' + (Math.round(sel.avgDays() * 10) / 10) + ' hari. Pelanggan: ' + rc.total + ', yang beli ulang: ' + rc.repeat + '.');
      var sold = {};
      sel.topProducts().forEach(function (r) { sold[r.product.id] = r; });
      L.push('Produk:\n' + st.products.map(function (p) {
        var margin = p.price ? Math.round((p.price - p.hpp) / p.price * 100) : 0, r = sold[p.id];
        return '- ' + p.name + ' [' + (p.active ? (p.poOpen === false ? 'PO tutup' : 'PO buka') : 'nonaktif') + ']: harga ' + U.rupiah(p.price) + ', HPP ' + U.rupiah(p.hpp) + ', margin ' + margin + '%, kuota batch ' + p.batchQuota + ' ' + p.unit + (r ? ', terjual ' + r.qty + ' (omzet ' + U.compactRupiah(r.revenue) + ')' : ', belum ada penjualan');
      }).join('\n'));
      var cat = {};
      sel.expensesIn(now).forEach(function (e) { cat[e.category] = (cat[e.category] || 0) + e.amount; });
      var cl = Object.keys(cat).map(function (k) { return k + ' ' + U.rupiah(cat[k]); });
      if (cl.length) L.push('Pengeluaran bulan ini per kategori: ' + cl.join(', ') + '.');
      return L.join('\n');
    } catch (e) { return '(data bisnis tidak dapat dibaca)'; }
  }

  function systemPrompt() {
    var p = db.persona, st = STYLES[p.style] || STYLES.santai, ln = LENGTHS[p.length] || LENGTHS.sedang;
    var s = 'Kamu adalah Budi, asisten pribadi sekaligus konsultan bisnis pre-order di aplikasi Batchin. ' +
      'Tugasmu memberi saran dan membantu pemilik usaha mengambil keputusan: harga dan margin, HPP, kuota batch, kapan buka/tutup PO, DP, promosi, arus kas, antrean produksi, dan jadwal belanja bahan. ' +
      'Dasarkan jawaban pada data bisnis di bawah dan jangan mengarang angka. Jika data kurang, ajukan satu pertanyaan singkat. ' +
      'Beri rekomendasi yang jelas, alasannya, dan langkah berikutnya; bila ada pilihan, bandingkan untung-ruginya. ' +
      'Kamu bukan penasihat hukum, pajak, atau keuangan resmi; sebutkan itu hanya jika relevan. ' +
      'Tulis dengan markdown (**tebal**, *miring*, daftar bullet atau bernomor, tabel bila membantu) agar rapi. ' +
      'Hari ini: ' + U.dateID(new Date()) + '.\n\nGAYA BICARA: ' + st.text + ' ' + ln.text;
    if (p.callName) s += ' Panggil pengguna "' + p.callName + '".';
    if (p.extra.trim()) s += '\nInstruksi gaya tambahan dari pengguna: ' + p.extra.trim();
    if (db.memory.length) s += '\n\nPREFERENSI & FAKTA TENTANG PENGGUNA (selalu ikuti, jangan tanya ulang):\n' + db.memory.map(function (m) { return '- ' + m.text; }).join('\n');
    return s + '\n\nDATA BISNIS SAAT INI:\n' + snapshot();
  }

  function buildInput(chat) {
    var recent = chat.messages.filter(function (m) { return !m.error && !m.greet; }).slice(-12);
    var last = recent[recent.length - 1];
    var hist = recent.slice(0, -1).map(function (m) { return (m.role === 'user' ? 'Pengguna' : 'Budi') + ': ' + U.truncate(m.md, 1200); }).join('\n');
    return '[INSTRUKSI SISTEM]\n' + systemPrompt() + '\n\n' + (hist ? '[RIWAYAT CHAT INI]\n' + hist + '\n\n' : '') + '[PESAN TERBARU DARI PENGGUNA — jawab ini]\n' + (last ? last.md : '');
  }

  /* ---------- panggilan Langflow ---------- */
  function extract(j) {
    try {
      var o = j.outputs[0].outputs[0], r = o.results && o.results.message;
      var t = (r && (r.text || (r.data && r.data.text))) || (o.outputs && o.outputs.message && o.outputs.message.message) || (o.artifacts && o.artifacts.message) || (o.messages && o.messages[0] && o.messages[0].message);
      if (typeof t === 'string' && t.trim()) return t;
    } catch (e) { /* lanjut ke pencarian dalam */ }
    var found = '';
    (function dig(x, d) {
      if (found || d > 8 || !x || typeof x !== 'object') return;
      if (typeof x.text === 'string' && x.text.trim()) { found = x.text; return; }
      Object.keys(x).forEach(function (k) { dig(x[k], d + 1); });
    })(j, 0);
    return found;
  }

  function callFlow(input) {
    var url = (db.config.url || '').trim();
    if (!url) return Promise.reject({ kind: 'config', message: 'Alamat endpoint belum diisi.' });
    var headers = { 'Content-Type': 'application/json' };
    if (db.config.key) headers['x-api-key'] = db.config.key.trim();
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 120000);
    return fetch(url, { method: 'POST', headers: headers, signal: ctl ? ctl.signal : undefined,
      body: JSON.stringify({ output_type: 'chat', input_type: 'chat', input_value: input, session_id: U.uid('budi') }) })
      .then(function (res) {
        clearTimeout(timer);
        if (res.status === 401 || res.status === 403) throw { kind: 'auth', message: 'API key ditolak server (' + res.status + ').' };
        if (!res.ok) throw { kind: 'http', message: 'Server membalas dengan error ' + res.status + '.' };
        return res.json();
      })
      .then(function (j) {
        var t = extract(j);
        if (!t) throw { kind: 'empty', message: 'Server tidak mengirim teks jawaban.' };
        return t;
      })
      .catch(function (e) {
        clearTimeout(timer);
        if (e && e.kind) throw e;
        if (e && e.name === 'AbortError') throw { kind: 'timeout', message: 'Budi terlalu lama menjawab (lebih dari 2 menit).' };
        throw { kind: 'network', message: 'Tidak bisa terhubung ke server Langflow. Pastikan server menyala, alamat endpoint benar, dan CORS mengizinkan halaman ini.' };
      });
  }

  /* ---------- memori preferensi ---------- */
  function addMemory(items) {
    var added = [];
    items.forEach(function (t) {
      t = String(t || '').replace(/\s+/g, ' ').trim();
      if (t.length < 4 || t.length > 200) return;
      var low = t.toLowerCase();
      if (db.memory.some(function (m) { var x = m.text.toLowerCase(); return x === low || x.indexOf(low) >= 0 || low.indexOf(x) >= 0; })) return;
      db.memory.push({ id: U.uid('mem'), text: t, at: new Date().toISOString() });
      added.push(t);
    });
    if (db.memory.length > 60) db.memory = db.memory.slice(-60);
    if (added.length) { save(); if (view === 'memory') draw(); }
    return added;
  }

  /* penangkap cepat tanpa AI: kalimat eksplisit "ingat/preferensi" */
  function quickMemory(text) {
    var out = [];
    text.split(/[\n.!?]+/).forEach(function (s) {
      s = s.trim();
      var m = s.match(/^(?:tolong\s+)?(?:ingat(?:lah)?|catat)\s*(?:ya|bahwa|kalau|:)?\s*(.{6,})$/i);
      if (m) out.push(m[1].replace(/^(?:bahwa|kalau)\s+/i, ''));
    });
    return out;
  }

  function extractMemory(userText) {
    if (userText.length < 15 || !db.config.url) return;
    var prompt = 'Tugas: ekstrak preferensi atau fakta TETAP tentang pengguna/usahanya dari pesan di bawah (gaya komunikasi, panggilan, target, batasan, kebiasaan, produk andalan, tujuan bisnis, hal yang tidak disukai). ' +
      'Abaikan pertanyaan biasa dan hal sementara. Jawab HANYA dengan JSON array berisi kalimat pendek bahasa Indonesia, contoh ["Lebih suka jawaban singkat","Target omzet Rp10 juta per bulan"]. Jika tidak ada, jawab [].\n' +
      'Yang sudah diingat: ' + (db.memory.map(function (m) { return m.text; }).join(' | ') || '(kosong)') + '\nPesan pengguna: """' + userText + '"""';
    callFlow(prompt).then(function (t) {
      var m = t.match(/\[[\s\S]*\]/);
      if (!m) return;
      var arr = JSON.parse(m[0]);
      if (Array.isArray(arr)) notifyAdded(addMemory(arr.filter(function (x) { return typeof x === 'string'; }).slice(0, 4)));
    }).catch(function () { /* diam: ekstraksi bersifat tambahan */ });
  }
  function notifyAdded(added) { if (added.length) UI.toast('Budi mengingat: ' + U.truncate(added[0], 60) + (added.length > 1 ? ' (+' + (added.length - 1) + ')' : '')); }

  /* ---------- state tampilan ---------- */
  var fab, panel, bodyEl, view = 'chat', open = false, pending = {}, composer = null;
  function isBusy() { var c = db && db.chats.filter(function (x) { return x.id === db.activeId; })[0]; return !!(c && pending[c.id]); }

  function activeChat() {
    return db.chats.filter(function (c) { return c.id === db.activeId; })[0] || null;
  }

  function greeting(first) {
    var who = db.persona.callName ? ' ' + db.persona.callName : '';
    return first
      ? 'Halo' + who + '! Aku **Budi**, asisten pribadi sekaligus konsultan bisnis pre-order kamu. Senang ketemu! 👋\n\nTanya apa aja soal **pesanan, kuota batch, harga, keuangan, sampai strategi promosi** — aku bantu pikirin keputusannya pakai data usahamu.'
      : 'Halo lagi' + who + '! Mau bahas apa hari ini?';
  }

  function newChat() {
    var cur = activeChat();
    if (cur && !cur.messages.some(function (m) { return m.role === 'user'; })) { view = 'chat'; draw(); return cur; }
    var first = !db.introSeen;
    var c = { id: U.uid('chat'), title: 'Chat baru', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      messages: [{ role: 'bot', md: greeting(first), at: new Date().toISOString(), greet: true }] };
    db.introSeen = true;
    db.chats.unshift(c);
    db.activeId = c.id;
    save(); view = 'chat'; draw();
    return c;
  }

  function fmtTime(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    var same = d.toDateString() === new Date().toDateString();
    return same ? U.pad(d.getHours(), 2) + ':' + U.pad(d.getMinutes(), 2) : U.dateID(d);
  }

  /* ---------- UI: pesan ---------- */
  function bubble(m, idx) {
    var isUser = m.role === 'user';
    var body = h('div', { class: 'budi-md', html: md(m.md) });
    var meta = h('div', { class: 'budi-meta' }, h('span', null, fmtTime(m.at)));
    if (!isUser && !m.error) {
      meta.appendChild(h('button', { class: 'budi-mini', type: 'button', title: 'Salin jawaban', 'aria-label': 'Salin jawaban', onClick: function () {
        var done = function () { UI.toast('Jawaban disalin'); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(m.md).then(done, done); else done();
      } }, ic('copy', 13)));
    }
    if (m.error && m.retry) meta.appendChild(h('button', { class: 'budi-mini txt', type: 'button', onClick: retry }, ic('refresh', 13), 'Coba lagi'));
    if (m.error && m.kind === 'auth' || m.error && m.kind === 'config') meta.appendChild(h('a', { class: 'budi-mini txt', href: '#settings', onClick: function () { setOpen(false); } }, 'Buka Pengaturan'));
    return h('div', { class: 'budi-row ' + (isUser ? 'me' : 'bot') },
      !isUser ? h('div', { class: 'budi-ava' }, ic('bot', 16)) : null,
      h('div', { class: 'budi-bub' + (m.error ? ' err' : '') }, body, meta));
  }

  function typing() {
    return h('div', { class: 'budi-row bot', id: 'budi-typing' }, h('div', { class: 'budi-ava' }, ic('bot', 16)),
      h('div', { class: 'budi-bub' }, h('div', { class: 'budi-dots' }, h('i'), h('i'), h('i'))));
  }

  function scrollDown() {
    var s = U.$('.budi-scroll', panel);
    if (s) s.scrollTop = s.scrollHeight;
  }

  /* ---------- UI: kotak ketik berformat ---------- */
  function buildComposer() {
    var ed = h('div', { class: 'budi-ed', contentEditable: 'true', role: 'textbox', 'aria-multiline': 'true', 'aria-label': 'Tulis pesan untuk Budi', 'data-ph': 'Tulis pesan… (Enter = kirim)' });
    var btns = [];
    function exec(cmd, val) { ed.focus(); document.execCommand(cmd, false, val || null); sync(); }
    function toggleBlock(tag) {
      ed.focus();
      var cur = (document.queryCommandValue('formatBlock') || '').toLowerCase();
      document.execCommand('formatBlock', false, cur === tag ? 'div' : tag); sync();
    }
    function code() {
      ed.focus();
      var sel = window.getSelection(), t = sel ? sel.toString() : '';
      if (t) document.execCommand('insertHTML', false, '<code>' + esc(t) + '</code>&nbsp;');
      sync();
    }
    var TOOLS = [
      ['bold', 'Tebal (Ctrl+B)', 'bold', function () { exec('bold'); }],
      ['italic', 'Miring (Ctrl+I)', 'italic', function () { exec('italic'); }],
      ['underline', 'Garis bawah (Ctrl+U)', 'underline', function () { exec('underline'); }],
      ['strikeThrough', 'Coret', 'strike', function () { exec('strikeThrough'); }],
      ['sep'],
      ['insertUnorderedList', 'Daftar bullet', 'ul', function () { exec('insertUnorderedList'); }],
      ['insertOrderedList', 'Daftar bernomor', 'ol', function () { exec('insertOrderedList'); }],
      ['sep'],
      ['h3', 'Judul', 'heading', function () { toggleBlock('h3'); }],
      ['blockquote', 'Kutipan', 'quote', function () { toggleBlock('blockquote'); }],
      ['code', 'Kode', 'code', code]
    ];
    var bar = h('div', { class: 'budi-tools', role: 'toolbar', 'aria-label': 'Format teks' });
    TOOLS.forEach(function (t) {
      if (t[0] === 'sep') { bar.appendChild(h('span', { class: 'budi-sep' })); return; }
      var b = h('button', { class: 'budi-tool', type: 'button', title: t[1], 'aria-label': t[1], 'data-cmd': t[0], onMouseDown: function (e) { e.preventDefault(); }, onClick: t[3] }, ic(t[2], 15));
      btns.push(b); bar.appendChild(b);
    });
    function sync() {
      btns.forEach(function (b) {
        var c = b.getAttribute('data-cmd'), on = false;
        try {
          if (c === 'h3' || c === 'blockquote') on = (document.queryCommandValue('formatBlock') || '').toLowerCase() === c;
          else if (c !== 'code') on = document.queryCommandState(c);
        } catch (e) { on = false; }
        b.setAttribute('aria-pressed', String(!!on));
      });
    }
    var send = h('button', { class: 'btn budi-send', type: 'button', 'aria-label': 'Kirim', onClick: submit }, ic('send', 16));
    function isEmpty() { return !ed.textContent.trim(); }
    function submit() {
      if (isBusy() || isEmpty()) return;
      var text = htmlToMd(ed);
      ed.innerHTML = ''; sync();
      sendMessage(text);
    }
    ed.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        var sel = window.getSelection(), inList = sel && sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentNode).closest('li');
        if (inList && !e.ctrlKey && !e.metaKey) return; /* di dalam daftar: Enter = butir baru; Ctrl+Enter = kirim */
        e.preventDefault(); submit();
      }
      if (e.key === 'Escape') setOpen(false);
    });
    ed.addEventListener('paste', function (e) {
      e.preventDefault();
      var t = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, t);
    });
    ed.addEventListener('keyup', sync);
    ed.addEventListener('mouseup', sync);
    ed.addEventListener('input', function () { send.disabled = isBusy() || isEmpty(); });
    send.disabled = true;
    var node = h('div', { class: 'budi-compose' }, bar, h('div', { class: 'budi-input' }, ed, send));
    return { node: node, focus: function () { ed.focus(); }, setBusy: function (b) { ed.setAttribute('contenteditable', b ? 'false' : 'true'); send.disabled = b || isEmpty(); } };
  }

  /* ---------- alur kirim ---------- */
  function sendMessage(text) {
    var chat = activeChat() || newChat();
    chat.messages.push({ role: 'user', md: text, at: new Date().toISOString() });
    if (chat.title === 'Chat baru') chat.title = U.truncate(text.replace(/[*_`~#>\\<]|\/?u>/g, '').replace(/\s+/g, ' ').trim(), 44) || 'Chat baru';
    chat.updatedAt = new Date().toISOString();
    notifyAdded(addMemory(quickMemory(text)));
    save();
    ask(chat, text);
  }

  function ask(chat, userText) {
    pending[chat.id] = true; if (db.activeId === chat.id) draw();
    callFlow(buildInput(chat)).then(function (reply) {
      chat.messages.push({ role: 'bot', md: reply.trim(), at: new Date().toISOString() });
      if (userText) extractMemory(userText);
    }).catch(function (err) {
      chat.messages.push({ role: 'bot', md: '**Maaf, Budi belum bisa menjawab.**\n' + (err.message || 'Terjadi kesalahan.') + (err.kind === 'auth' || err.kind === 'config' ? '\n\nPeriksa *Pengaturan → Asisten Budi*.' : ''), at: new Date().toISOString(), error: true, retry: true, kind: err.kind });
    }).then(function () {
      delete pending[chat.id]; chat.updatedAt = new Date().toISOString(); save();
      if (db.activeId === chat.id && view === 'chat') draw(); else if (view === 'history') draw();
    });
  }

  function retry() {
    var chat = activeChat();
    if (!chat || pending[chat.id]) return;
    var last = chat.messages[chat.messages.length - 1];
    if (last && last.error) chat.messages.pop();
    var lastUser = chat.messages.filter(function (m) { return m.role === 'user'; }).pop();
    if (lastUser) ask(chat, '');
  }

  /* ---------- tampilan panel ---------- */
  function headBtn(icon, label, key, fn, on) {
    return h('button', { class: 'budi-hbtn', type: 'button', title: label, 'aria-label': label, 'data-budi': key, 'aria-pressed': on ? 'true' : null, onClick: fn }, ic(icon, 17));
  }

  function setView(v) { view = view === v && v !== 'chat' ? 'chat' : v; draw(); }

  function chatView() {
    var chat = activeChat() || newChat();
    var list = h('div', { class: 'budi-scroll', 'aria-live': 'polite' });
    chat.messages.forEach(function (m, i) { list.appendChild(bubble(m, i)); });
    if (isBusy()) list.appendChild(typing());
    var onlyGreet = chat.messages.length === 1 && chat.messages[0].greet;
    if (onlyGreet && !isBusy()) {
      list.appendChild(h('div', { class: 'budi-chips' }, SUGGEST.map(function (s) {
        return h('button', { class: 'budi-chip', type: 'button', onClick: function () { sendMessage(s); } }, s);
      })));
    }
    composer = buildComposer();
    composer.setBusy(isBusy());
    var frag = h('div', { class: 'budi-chat' }, list, composer.node);
    setTimeout(function () { scrollDown(); if (!isBusy() && composer && open && view === 'chat' && !PO.tour.active()) composer.focus(); }, 0);
    return frag;
  }

  function historyView() {
    var chats = db.chats.slice().sort(function (a, b) { return a.updatedAt < b.updatedAt ? 1 : -1; });
    var list = h('div', { class: 'budi-list' });
    if (!chats.length) list.appendChild(UI.empty('message', 'Belum ada chat', 'Mulai chat baru dengan Budi.'));
    chats.forEach(function (c) {
      var users = c.messages.filter(function (m) { return m.role === 'user'; }).length;
      var lastMsg = c.messages.slice().reverse().filter(function (m) { return !m.error; })[0];
      list.appendChild(h('div', { class: 'budi-item' + (c.id === db.activeId ? ' on' : '') },
        h('button', { class: 'budi-item-main', type: 'button', onClick: function () { db.activeId = c.id; save(); view = 'chat'; draw(); } },
          h('span', { class: 'budi-item-title' }, c.title),
          h('span', { class: 'budi-item-sub' }, fmtTime(c.updatedAt) + ' · ' + users + ' pertanyaan' + (lastMsg ? ' · ' + U.truncate(lastMsg.md.replace(/[*_`#>~\\]|<\/?u>/g, ' ').replace(/\s+/g, ' ').trim(), 40) : ''))),
        h('button', { class: 'budi-mini', type: 'button', title: 'Hapus chat', 'aria-label': 'Hapus chat ' + c.title, onClick: function () {
          UI.confirm({ title: 'Hapus chat ini?', text: '“' + c.title + '” akan dihapus. Memori preferensi Budi tidak ikut terhapus.', ok: 'Hapus', danger: true, onOk: function () {
            db.chats = db.chats.filter(function (x) { return x.id !== c.id; });
            if (db.activeId === c.id) db.activeId = db.chats.length ? db.chats[0].id : null;
            save(); draw();
          } });
        } }, I.el('trash'))));
    });
    return h('div', { class: 'budi-pane' }, h('div', { class: 'budi-pane-head' },
      h('div', null, h('div', { class: 'budi-pane-title' }, 'Riwayat chat'), h('div', { class: 'budi-pane-sub' }, db.chats.length + ' percakapan tersimpan')),
      UI.btn('Chat baru', 'plus', 'btn-sm', function () { newChat(); })), list);
  }

  function memoryView() {
    var wrap = h('div', { class: 'budi-mem' });
    var input = h('input', { class: 'input', placeholder: 'Tambah sendiri, mis. “Aku lebih suka jawaban singkat”', maxLength: 200, 'aria-label': 'Tambah memori' });
    function add() { var a = addMemory([input.value]); input.value = ''; if (a.length) draw(); }
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); add(); } });
    wrap.appendChild(h('div', { class: 'row', style: 'gap:8px' }, input, UI.btn('Tambah', 'plus', 'btn-sm', add)));
    if (!db.memory.length) wrap.appendChild(UI.empty('info', 'Belum ada yang diingat', 'Ceritakan preferensimu ke Budi, atau tulis “ingat …”. Budi akan mengingatnya di semua chat.'));
    db.memory.slice().reverse().forEach(function (m) {
      wrap.appendChild(h('div', { class: 'budi-memitem' }, h('span', null, m.text),
        h('button', { class: 'budi-mini', type: 'button', title: 'Lupakan', 'aria-label': 'Lupakan: ' + m.text, onClick: function () { db.memory = db.memory.filter(function (x) { return x.id !== m.id; }); save(); draw(); } }, I.el('close'))));
    });
    return h('div', { class: 'budi-pane' }, h('div', { class: 'budi-pane-head' },
      h('div', null, h('div', { class: 'budi-pane-title' }, 'Memori Budi'), h('div', { class: 'budi-pane-sub' }, 'Dipakai di semua chat, jadi kamu tak perlu mengulang.')),
      db.memory.length ? UI.btn('Hapus semua', 'trash', 'btn-ghost btn-sm', function () { UI.confirm({ title: 'Hapus semua memori?', text: 'Budi akan lupa semua preferensi yang tersimpan.', ok: 'Hapus', danger: true, onOk: function () { db.memory = []; save(); draw(); } }); }) : null), wrap);
  }

  function draw() {
    if (!panel) return;
    var title = U.$('.budi-title', panel);
    var back = view !== 'chat';
    var head = U.$('.budi-head', panel);
    U.clear(head);
    head.appendChild(h('div', { class: 'budi-ava lg' }, ic('bot', 20)));
    head.appendChild(h('div', { class: 'budi-who' }, h('div', { class: 'budi-title' }, 'Budi'), h('div', { class: 'budi-sub' }, back ? (view === 'history' ? 'Riwayat chat' : 'Memori') : 'Konsultan bisnis PO · AI')));
    head.appendChild(h('div', { class: 'budi-hbtns' },
      headBtn('plus', 'Chat baru', 'new', function () { newChat(); }),
      headBtn('history', 'Riwayat chat', 'history', function () { setView('history'); }, view === 'history'),
      headBtn('brain', 'Memori Budi', 'memory', function () { setView('memory'); }, view === 'memory'),
      headBtn('close', 'Tutup', 'close', function () { setOpen(false); })));
    U.clear(bodyEl);
    bodyEl.appendChild(view === 'history' ? historyView() : view === 'memory' ? memoryView() : chatView());
    if (view !== 'chat') { var bk = h('button', { class: 'budi-back', type: 'button', onClick: function () { view = 'chat'; draw(); } }, ic('back', 14), 'Kembali ke chat'); bodyEl.firstChild.appendChild(bk); }
  }

  /* ---------- buka / tutup ---------- */
  function setOpen(v) {
    open = !!v;
    if (open && !panel) buildPanel();
    if (panel) panel.hidden = !open;
    fab.setAttribute('aria-expanded', String(open));
    fab.classList.toggle('on', open);
    fab.setAttribute('aria-label', open ? 'Tutup Budi' : 'Buka Budi, asisten bisnis');
    document.body.classList.toggle('budi-open', open);
    if (open) { if (!activeChat()) newChat(); else draw(); }
  }

  function buildPanel() {
    bodyEl = h('div', { class: 'budi-body' });
    panel = h('section', { class: 'budi-panel', role: 'dialog', 'aria-label': 'Budi, asisten bisnis', hidden: true }, h('header', { class: 'budi-head' }), bodyEl);
    document.body.appendChild(panel);
  }

  function init() {
    if (fab) return;
    load();
    fab = h('button', { class: 'budi-fab', type: 'button', 'aria-label': 'Buka Budi, asisten bisnis', 'aria-expanded': 'false', title: 'Tanya Budi', onClick: function () { setOpen(!open); } },
      h('span', { class: 'budi-fab-ico' }, ic('bot', 26)), h('span', { class: 'budi-fab-x' }, I.el('close')));
    document.body.appendChild(fab);
    buildPanel();
  }

  /* ---------- kartu Pengaturan: gaya bicara & koneksi ---------- */
  function settingsCard() {
    if (!db) load();
    var p = db.persona, c = db.config;
    var st = { style: p.style, length: p.length };
    var styleBox = h('div'), lenBox = h('div');
    function paint() {
      U.clear(styleBox); U.clear(lenBox);
      styleBox.appendChild(UI.seg(Object.keys(STYLES).map(function (k) { return { value: k, label: STYLES[k].label }; }), st.style, function (v) { st.style = v; paint(); }));
      lenBox.appendChild(UI.seg(Object.keys(LENGTHS).map(function (k) { return { value: k, label: LENGTHS[k].label }; }), st.length, function (v) { st.length = v; paint(); }));
    }
    paint();
    var call = h('input', { class: 'input', value: p.callName, placeholder: 'Contoh: Kak Licia', maxLength: 30 });
    var extra = h('textarea', { class: 'textarea', placeholder: 'Contoh: Sering kasih analogi dapur, selalu akhiri dengan satu langkah yang bisa langsung kulakukan.', value: p.extra, maxLength: 500 });
    var url = h('input', { class: 'input mono', value: c.url, placeholder: DEFAULT_URL });
    var key = h('input', { class: 'input mono', type: 'password', value: c.key, placeholder: 'Tempel API key Langflow', autocomplete: 'off' });
    var status = h('span', { class: 'small mute' });
    function persist() {
      db.persona = { style: st.style, length: st.length, callName: call.value.trim(), extra: extra.value.trim() };
      db.config = { url: url.value.trim(), key: key.value.trim() };
      save();
    }
    var sample = h('div', { class: 'font-sample' });
    function showSample() {
      var t = {
        santai: 'Nastar Dip kamu marginnya paling tebal nih, 42%. Kalau kuota batch masih sering penuh, coba naikin harga dikit — pelanggan biasanya nggak keberatan.',
        formal: 'Nastar Dip memiliki margin tertinggi sebesar 42%. Bila kuota batch kerap terpenuhi, Anda dapat mempertimbangkan kenaikan harga secara bertahap.',
        singkat: 'Naikkan harga Nastar Dip 5%. Margin sudah 42% dan kuota selalu penuh.',
        semangat: 'Kabar bagus! Nastar Dip margin-nya 42% dan kuotanya selalu penuh — saatnya naik harga sedikit dan tumbuh lebih cepat! 🚀'
      };
      sample.textContent = t[st.style];
    }
    var obs = new MutationObserver(showSample); obs.observe(styleBox, { childList: true, subtree: true, attributes: true });
    showSample();
    var body = h('div', { class: 'col', style: 'gap:16px' },
      h('p', { class: 'small mute' }, 'Atur cara Budi berbicara dan koneksi ke server AI. Berlaku untuk semua chat.'),
      h('div', null, h('div', { class: 'field-label' }, 'Gaya bicara'), h('div', { class: 'field-hint' }, 'Pilih karakter utama Budi.'), styleBox),
      sample,
      h('div', null, h('div', { class: 'field-label' }, 'Panjang jawaban'), lenBox),
      UI.field('Budi memanggil kamu', call, { hint: 'Kosongkan untuk “kamu”.' }),
      UI.field('Instruksi gaya tambahan', extra, { hint: 'Gaya khusus apa pun, ditulis bebas.' }),
      UI.field('Alamat endpoint Langflow', url, { hint: 'URL lengkap alur /api/v1/run/…' }),
      UI.field('API key', key, { hint: 'Disimpan hanya di peramban ini, tidak ditulis di kode.' }),
      h('div', { class: 'row wrap', style: 'gap:8px;align-items:center' },
        UI.btn('Simpan', 'check', 'btn-sm', function () { persist(); UI.toast('Pengaturan Budi disimpan'); }),
        UI.btn('Uji koneksi', 'refresh', 'btn-ghost btn-sm', function () {
          persist(); status.textContent = 'Menguji…';
          callFlow('Balas dengan satu kata: siap').then(function () { status.textContent = 'Terhubung ✓'; }, function (e) { status.textContent = e.message; });
        }),
        UI.btn('Kembalikan gaya bawaan', null, 'btn-quiet btn-sm', function () { st.style = 'santai'; st.length = 'sedang'; call.value = ''; extra.value = ''; paint(); showSample(); }),
        status));
    return UI.card('Asisten Budi', body);
  }

  return {
    init: init, settingsCard: settingsCard,
    open: function (v) { if (!fab) init(); setOpen(true); if (v) { view = v; draw(); } },
    close: function () { if (fab) setOpen(false); },
    isOpen: function () { return open; },
    view: function () { return view; },
    md: md
  };
})();
