/* data.js — status master, preset tenant, dan data contoh. */
window.PO = window.PO || {};

PO.data = (function () {
  var U = PO.util;

  var STATUSES = [
    { key: 'waiting', label: 'Menunggu Kuota', short: 'Menunggu', icon: 'clock', owner: 'Otomatis', help: 'Pesanan masuk antrean dan menunggu kuota batch terpenuhi.' },
    { key: 'shopping', label: 'Belanja Bahan', short: 'Belanja', icon: 'cart', owner: 'Pemilik', help: 'Bahan baku dibeli untuk batch yang sudah memenuhi kuota.' },
    { key: 'production', label: 'Produksi', short: 'Produksi', icon: 'flame', owner: 'Pemilik', help: 'Batch sedang dikerjakan (memasak, memanggang, mengemas).' },
    { key: 'ready', label: 'Siap Kirim', short: 'Siap', icon: 'truck', owner: 'Pemilik', help: 'Produk selesai dan menunggu pengiriman atau pengambilan.' },
    { key: 'completed', label: 'Selesai', short: 'Selesai', icon: 'checkCircle', owner: 'Pemilik', help: 'Pesanan diterima pelanggan; masuk pendapatan.' },
    { key: 'cancelled', label: 'Dibatalkan', short: 'Batal', icon: 'x', owner: 'Pemilik', help: 'Pesanan batal; tidak dihitung sebagai pendapatan.' }
  ];

  var FLOW = ['waiting', 'shopping', 'production', 'ready', 'completed'];

  var PAYMENT_LABELS = { unpaid: 'Belum Bayar', dp: 'DP', paid: 'Lunas' };

  var EXPENSE_CATEGORIES = ['Bahan Baku', 'Kemasan', 'Operasional', 'Promosi', 'Lain-lain'];

  var PAYMENT_METHODS = ['Transfer Bank', 'QRIS', 'Tunai', 'E-Wallet'];

  function statusMeta(key) {
    for (var i = 0; i < STATUSES.length; i++) if (STATUSES[i].key === key) return STATUSES[i];
    return STATUSES[0];
  }

  function nextStatus(key) {
    var i = FLOW.indexOf(key);
    if (i < 0 || i >= FLOW.length - 1) return null;
    return FLOW[i + 1];
  }

  /* ---------- preset tenant ---------- */
  var PRESETS = {
    bakery: {
      id: 'bakery',
      label: "Licia's Bakehouse",
      desc: 'Kue kering & hampers · kuota 3 toples per resep',
      settings: {
        businessName: "Licia's Bakehouse",
        tagline: 'Nastar Dip Set · pre-order rumahan',
        ownerName: 'Fellicia Kiyanto',
        city: 'Medan',
        brandHue: 30,
        batchUnit: 'toples',
        batchQuota: 3,
        leadDays: 3,
        dpPercent: 50,
        monthlyTarget: 5000000,
        whatsapp: '081990301271'
      },
      products: [
        { name: 'Nastar Dip Set Premium', category: 'Signature', price: 148000, hpp: 86000, batchQuota: 3, unit: 'toples', active: true },
        { name: 'Nastar Klasik', category: 'Klasik', price: 95000, hpp: 52000, batchQuota: 3, unit: 'toples', active: true },
        { name: 'Kastengel Keju', category: 'Klasik', price: 110000, hpp: 61000, batchQuota: 4, unit: 'toples', active: true },
        { name: 'Brownies Fudgy', category: 'Cake', price: 85000, hpp: 47000, batchQuota: 4, unit: 'loyang', active: true }
      ]
    },
    catering: {
      id: 'catering',
      label: 'Dapur Bu Sari',
      desc: 'Katering harian · kuota 10 porsi per batch masak',
      settings: {
        businessName: 'Dapur Bu Sari',
        tagline: 'Katering rumahan · pesan H-2',
        ownerName: 'Sari Wulandari',
        city: 'Medan',
        brandHue: 145,
        batchUnit: 'porsi',
        batchQuota: 10,
        leadDays: 2,
        dpPercent: 100,
        monthlyTarget: 12000000,
        whatsapp: '081377889900'
      },
      products: [
        { name: 'Paket Nasi Ayam Bakar', category: 'Paket', price: 32000, hpp: 19000, batchQuota: 10, unit: 'porsi', active: true },
        { name: 'Paket Nasi Rendang', category: 'Paket', price: 38000, hpp: 23000, batchQuota: 10, unit: 'porsi', active: true },
        { name: 'Tumpeng Mini', category: 'Spesial', price: 165000, hpp: 98000, batchQuota: 4, unit: 'set', active: true },
        { name: 'Snack Box (5 pcs)', category: 'Snack', price: 45000, hpp: 26000, batchQuota: 20, unit: 'box', active: true }
      ]
    },
    merch: {
      id: 'merch',
      label: 'Ruang Cetak',
      desc: 'Merchandise custom · kuota 25 pcs per batch sablon',
      settings: {
        businessName: 'Ruang Cetak',
        tagline: 'Sablon & merchandise · pesanan minimum 25 pcs',
        ownerName: 'Bagas Prasetya',
        city: 'Medan',
        brandHue: 265,
        batchUnit: 'pcs',
        batchQuota: 25,
        leadDays: 7,
        dpPercent: 50,
        monthlyTarget: 25000000,
        whatsapp: '081265550001'
      },
      products: [
        { name: 'Kaos Sablon DTF', category: 'Apparel', price: 65000, hpp: 38000, batchQuota: 25, unit: 'pcs', active: true },
        { name: 'Tote Bag Kanvas', category: 'Apparel', price: 45000, hpp: 24000, batchQuota: 25, unit: 'pcs', active: true },
        { name: 'Tumbler Custom', category: 'Drinkware', price: 78000, hpp: 45000, batchQuota: 12, unit: 'pcs', active: true },
        { name: 'Lanyard Cetak', category: 'Aksesoris', price: 18000, hpp: 9000, batchQuota: 50, unit: 'pcs', active: true }
      ]
    }
  };

  /* ---------- generator data contoh ---------- */
  function lcg(seed) {
    var s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  var NAMES = [
    'Rani Sihombing', 'Yohanes Tan', 'Melisa Ginting', 'Andre Simbolon', 'Clara Wibowo',
    'Doni Hutasoit', 'Felicia Ang', 'Gracia Sitepu', 'Ricky Tanjung', 'Nadya Lubis',
    'Steven Halim', 'Patricia Sinaga', 'Wira Kurniawan', 'Elsa Manurung', 'Bobby Kurniadi',
    'Vina Siagian', 'Jonathan Lumban', 'Sarah Hutapea', 'Kevin Wijaya', 'Renata Purba'
  ];

  var NOTES = [
    'Titip di resepsionis ya.',
    'Minta kartu ucapan terpisah.',
    'Ambil sendiri sore hari.',
    'Kirim sebelum jam 4 sore.',
    '',
    '',
    ''
  ];

  function makePhone(rnd) {
    var prefix = ['0812', '0813', '0821', '0852', '0857', '0819'][Math.floor(rnd() * 6)];
    var tail = '';
    for (var i = 0; i < 8; i++) tail += Math.floor(rnd() * 10);
    return prefix + tail;
  }

  function addDaysTo(date, days) {
    return U.addDays(date, days);
  }

  function atHour(date, hour, minute) {
    var d = new Date(date.getTime());
    d.setHours(hour, minute || 0, 0, 0);
    return d;
  }

  function makeOrder(spec, product) {
    var qty = spec.qty;
    var total = qty * product.price;
    var paid = spec.status === 'cancelled' ? 0 : total;
    var payment = spec.status === 'completed' ? 'paid' : (spec.pay || 'unpaid');
    var paidAmount = payment === 'paid' ? total : payment === 'dp' ? Math.round(total * spec.dpPercent / 100) : 0;
    var timeline = [];
    var flowIndex = FLOW.indexOf(spec.status);
    var i;
    if (spec.status === 'cancelled') {
      timeline.push({ status: 'waiting', at: U.iso(spec.createdAt) });
      timeline.push({ status: 'cancelled', at: U.iso(addDaysTo(spec.createdAt, 1)), note: spec.cancelReason || 'Pelanggan membatalkan pesanan' });
    } else {
      for (i = 0; i <= flowIndex; i++) {
        var stepDate = addDaysTo(spec.createdAt, i === 0 ? 0 : i - 0.35);
        timeline.push({ status: FLOW[i], at: U.iso(atHour(stepDate, 9 + i, 15)) });
      }
    }
    return {
      code: '',
      customer: { name: spec.name, phone: spec.phone },
      productId: product.id,
      qty: qty,
      unitPrice: product.price,
      total: total,
      status: spec.status,
      payment: payment,
      paidAmount: paidAmount,
      paymentMethod: spec.paymentMethod || 'Transfer Bank',
      note: spec.note || '',
      batchCode: spec.batchCode || '',
      createdAt: U.iso(spec.createdAt),
      dueDate: U.iso(addDaysTo(spec.createdAt, spec.leadDays || 3)),
      completedAt: spec.status === 'completed' ? U.iso(addDaysTo(spec.createdAt, 3)) : null,
      cancelledAt: spec.status === 'cancelled' ? U.iso(addDaysTo(spec.createdAt, 1)) : null,
      cancelReason: spec.cancelReason || '',
      timeline: timeline,
      _paid: paid
    };
  }

  function buildFromPreset(presetId) {
    var preset = PRESETS[presetId] || PRESETS.bakery;
    var rnd = lcg(20260411);
    var now = new Date();
    var orders = [];
    var p;
    var products = preset.products.map(function (item, index) {
      item.id = 'PRD-' + U.pad(index + 1, 3);
      return item;
    });

    var startThisMonth = U.startOfMonth(now);

    /* riwayat 5 bulan sebelumnya — pesanan selesai */
    for (var m = 5; m >= 1; m--) {
      var monthStart = U.addMonths(startThisMonth, -m);
      var monthCount = 8 + Math.floor(rnd() * 6);
      for (var k = 0; k < monthCount; k++) {
        p = products[Math.floor(rnd() * products.length)];
        var day = 1 + Math.floor(rnd() * 26);
        var created = atHour(U.addDays(monthStart, day - 1), 8 + Math.floor(rnd() * 10), Math.floor(rnd() * 59));
        orders.push(makeOrder({
          name: NAMES[Math.floor(rnd() * NAMES.length)],
          phone: makePhone(rnd),
          qty: 1 + Math.floor(rnd() * 3),
          status: rnd() > 0.12 ? 'completed' : 'cancelled',
          createdAt: created,
          leadDays: preset.settings.leadDays,
          note: NOTES[Math.floor(rnd() * NOTES.length)],
          cancelReason: 'Pelanggan membatalkan pesanan'
        }, p));
      }
    }

    /* bulan berjalan — selesai / berjalan */
    var todayDay = now.getDate();
    for (var d = 1; d < todayDay; d++) {
      if (rnd() > 0.55) continue;
      p = products[Math.floor(rnd() * products.length)];
      var createdCur = atHour(U.addDays(startThisMonth, d - 1), 9 + Math.floor(rnd() * 8), Math.floor(rnd() * 59));
      orders.push(makeOrder({
        name: NAMES[Math.floor(rnd() * NAMES.length)],
        phone: makePhone(rnd),
        qty: 1 + Math.floor(rnd() * 3),
        status: 'completed',
        createdAt: createdCur,
        leadDays: preset.settings.leadDays,
        note: NOTES[Math.floor(rnd() * NOTES.length)]
      }, p));
    }

    /* pesanan yang sedang berjalan (hari ini) */
    var active = [
      { name: 'Rani Sihombing', phone: '081265430987', qty: 2, status: 'waiting', hours: 2, note: 'Minta dikirim Jumat pagi.' },
      { name: 'Yohanes Tan', phone: '081298760012', qty: 1, status: 'waiting', hours: 5, note: '' },
      { name: 'Melisa Ginting', phone: '085212349876', qty: 2, status: 'waiting', hours: 26, note: 'Tanpa kacang ya.' },
      { name: 'Andre Simbolon', phone: '081377654321', qty: 3, status: 'production', hours: 30, pay: 'dp', note: 'Untuk hadiah kantor.' },
      { name: 'Clara Wibowo', phone: '081991234567', qty: 2, status: 'ready', hours: 52, pay: 'dp', note: 'Ambil di rumah.' },
      { name: 'Doni Hutasoit', phone: '082188997766', qty: 1, status: 'shopping', hours: 18, note: '' },
      { name: 'Felicia Ang', phone: '085711223344', qty: 4, status: 'completed', hours: 70, note: 'Sudah diambil.' },
      { name: 'Gracia Sitepu', phone: '081255667788', qty: 1, status: 'cancelled', hours: 44, cancelReason: 'Menunggu terlalu lama' }
    ];

    active.forEach(function (item, index) {
      var product = products[index % products.length];
      var created = new Date(now.getTime() - item.hours * 3600 * 1000);
      orders.push(makeOrder({
        name: item.name,
        phone: item.phone,
        qty: item.qty,
        status: item.status,
        createdAt: created,
        leadDays: preset.settings.leadDays,
        note: item.note,
        pay: item.pay,
        dpPercent: preset.settings.dpPercent,
        cancelReason: item.cancelReason
      }, product));
    });

    /* urutkan kronologis lalu beri kode pesanan + batch */
    orders.sort(function (a, b) { return new Date(a.createdAt) - new Date(b.createdAt); });

    var batchSeq = 0;
    var activeBatches = {};
    orders.forEach(function (order, index) {
      order.id = 'ORD-' + U.pad(index + 1, 3);
      order.code = order.id;
      delete order._paid;

      if (order.status === 'completed' || order.status === 'cancelled') return;
      if (order.status === 'waiting') return;

      var key = order.productId;
      if (!activeBatches[key]) {
        batchSeq += 1;
        activeBatches[key] = 'BTH-' + U.pad(batchSeq, 3);
      }
      order.batchCode = activeBatches[key];
    });

    /* pengeluaran */
    var expenses = [];
    var expSeq = 0;
    function pushExpense(date, category, note, amount, batchCode) {
      expSeq += 1;
      expenses.push({
        id: 'EXP-' + U.pad(expSeq, 3),
        date: U.iso(date),
        category: category,
        note: note,
        amount: Math.round(amount),
        batchCode: batchCode || ''
      });
    }

    for (var mm = 5; mm >= 0; mm--) {
      var mStart = U.addMonths(startThisMonth, -mm);
      var monthOrders = orders.filter(function (o) {
        var c = new Date(o.createdAt);
        return c.getFullYear() === mStart.getFullYear() && c.getMonth() === mStart.getMonth() && o.status === 'completed';
      });
      var gross = monthOrders.reduce(function (acc, o) { return acc + o.total; }, 0);
      if (!gross) continue;
      pushExpense(atHour(U.addDays(mStart, 2), 10), 'Bahan Baku', 'Belanja bahan kering & selai', gross * 0.34);
      pushExpense(atHour(U.addDays(mStart, 9), 11), 'Bahan Baku', 'Telur, mentega, keju', gross * 0.18);
      pushExpense(atHour(U.addDays(mStart, 12), 9), 'Kemasan', 'Toples, jar kaca, stiker', gross * 0.09);
      pushExpense(atHour(U.addDays(mStart, 16), 15), 'Operasional', 'Gas, listrik, transport kirim', gross * 0.06);
      if (mm % 2 === 0) pushExpense(atHour(U.addDays(mStart, 20), 20), 'Promosi', 'Iklan Instagram & foto produk', gross * 0.035);
    }

    return {
      version: 1,
      presetId: preset.id,
      settings: Object.assign({}, preset.settings),
      products: products,
      orders: orders,
      expenses: expenses,
      counters: { order: orders.length }
    };
  }

  return {
    STATUSES: STATUSES,
    FLOW: FLOW,
    PAYMENT_LABELS: PAYMENT_LABELS,
    PAYMENT_METHODS: PAYMENT_METHODS,
    EXPENSE_CATEGORIES: EXPENSE_CATEGORIES,
    PRESETS: PRESETS,
    statusMeta: statusMeta,
    nextStatus: nextStatus,
    buildFromPreset: buildFromPreset
  };
})();
