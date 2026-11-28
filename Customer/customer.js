document.addEventListener("DOMContentLoaded", function () {
  const STORAGE_KEY = "batchin.state.v1";
  const INBOX_KEY = "batchin.inbox.v1";
  const CART_KEY = "batchin.cart.v1";
  const HIDDEN_ORDERS_KEY = "batchin.hidden_orders.v1";
  const SERVICE_FEE = 2500;
  const TAX_RATE = 0.12;

  let activeCategory = "Semua";
  let searchQuery = "";
  let cart = loadCart();

  const user = window.CURRENT_USER || (window.PO_AUTH && PO_AUTH.getSession());
  if (user) {
    const nameEl = document.getElementById("navUserName");
    if (nameEl) nameEl.textContent = "Halo, " + user.name;
  }

  function formatRupiah(val) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val || 0);
  }

  function escapeHTML(str) {
    return String(str ?? "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c];
    });
  }

  function formatDateID(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  }

  function getMerchantData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.products)) return parsed;
      }
    } catch (e) {}
    if (window.PO && PO.data && PO.data.PRESETS && PO.data.PRESETS.bakery) {
      return PO.data.PRESETS.bakery;
    }
    return { products: [], orders: [], settings: {} };
  }

  function getInboxList() {
    try {
      const raw = JSON.parse(localStorage.getItem(INBOX_KEY));
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }

  function getHiddenCodes() {
    try {
      const raw = JSON.parse(localStorage.getItem(HIDDEN_ORDERS_KEY));
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }

  function hideOrderCodes(codes) {
    const current = new Set(getHiddenCodes());
    codes.forEach((c) => { if (c) current.add(c); });
    localStorage.setItem(HIDDEN_ORDERS_KEY, JSON.stringify(Array.from(current)));
    renderMyOrders();
  }

  function loadCart() {
    try {
      const raw = JSON.parse(localStorage.getItem(CART_KEY));
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }

  function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    renderCart();
  }

  function isProductPoOpen(p, settings) {
    if (p.active === false || p.poOpen === false) return false;
    if (settings && settings.poOpen === false && p.poOpen !== true) return false;
    if (p.poCloseDate) {
      const today = new Date().toISOString().slice(0, 10);
      if (today > p.poCloseDate) return false;
    }
    return true;
  }

  function renderStorefront() {
    const state = getMerchantData();
    const settings = state.settings || {};
    const bizName = settings.businessName || "Licia's Bakehouse";

    if (settings.brandColor) {
      document.documentElement.style.setProperty("--brand", settings.brandColor);
    }

    document.title = bizName + " — Toko Pre-Order";
    document.getElementById("storeTitle").textContent = bizName;
    document.getElementById("storeMark").textContent = bizName.charAt(0).toUpperCase();

    const poGlobalOpen = settings.poOpen !== false;
    const pill = document.getElementById("poStatusPill");
    pill.textContent = poGlobalOpen ? "● PO Dibuka" : "● PO Ditutup";
    pill.className = "mp-status-pill" + (poGlobalOpen ? "" : " closed");

    document.getElementById("storeSubInfo").textContent =
      (settings.city || "Medan") + " · Estimasi pengerjaan ±" + (settings.leadDays || 3) + " hari setelah kuota batch terpenuhi";

    const allProducts = (state.products || []).filter((p) => p && p.active !== false);

    // Render Tab Kategori
    const cats = ["Semua"];
    allProducts.forEach((p) => {
      if (p.category && !cats.includes(p.category)) cats.push(p.category);
    });
    const catWrap = document.getElementById("categoryTabs");
    catWrap.innerHTML = cats
      .map(
        (c) =>
          `<button type="button" class="mp-cat-btn ${c === activeCategory ? "active" : ""}" data-cat="${escapeHTML(c)}">${escapeHTML(c)}</button>`
      )
      .join("");
    catWrap.querySelectorAll(".mp-cat-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeCategory = btn.getAttribute("data-cat");
        renderStorefront();
      });
    });

    // Filter Produk
    const filtered = allProducts.filter((p) => {
      const matchCat = activeCategory === "Semua" || p.category === activeCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchQ = !q || p.name.toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q);
      return matchCat && matchQ;
    });

    const grid = document.getElementById("productGrid");
    const emptyEl = document.getElementById("emptyMessage");
    document.getElementById("productCount").textContent = `Menampilkan ${filtered.length} produk`;

    if (filtered.length === 0) {
      grid.innerHTML = "";
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;

    const defaultUnit = settings.batchUnit || "pcs";
    grid.innerHTML = filtered
      .map((p) => {
        const img = p.photo || p.image || "";
        const open = isProductPoOpen(p, settings);
        const unit = p.unit || defaultUnit;
        const quota = p.quota || settings.batchQuota || 20;

        const thumbHtml = img
          ? `<img src="${escapeHTML(img)}" alt="${escapeHTML(p.name)}" loading="lazy">`
          : `<div class="mp-thumb-fallback">${escapeHTML(p.name.charAt(0))}</div>`;

        const btnsHtml = open
          ? `<div class="mp-card-btns">
               <button type="button" class="btn-outline-sm" data-add="${escapeHTML(p.id)}">+ Keranjang</button>
               <a href="../pesan.html?product=${encodeURIComponent(p.id)}" class="btn-solid-sm">Beli Langsung</a>
             </div>`
          : `<div class="mp-card-btns"><div class="btn-disabled">PO Ditutup</div></div>`;

        return `
          <article class="mp-card">
            <div class="mp-thumb">
              ${thumbHtml}
              <span class="mp-badge ${open ? "" : "closed"}">${open ? "PO Buka" : "PO Tutup"}</span>
            </div>
            <div class="mp-body">
              <div>
                <div class="mp-cat-tag">${escapeHTML(p.category || "Pre-Order")}</div>
                <div class="mp-title">${escapeHTML(p.name)}</div>
                <div class="mp-price mono">${formatRupiah(p.price)} <span class="mp-unit">/ ${escapeHTML(unit)}</span></div>
                <div class="mp-quota">Kuota batch: ${quota} ${escapeHTML(unit)}</div>
              </div>
              ${btnsHtml}
            </div>
          </article>
        `;
      })
      .join("");

    grid.querySelectorAll("[data-add]").forEach((btn) => {
      btn.addEventListener("click", () => {
        addToCart(btn.getAttribute("data-add"));
      });
    });
  }

  function addToCart(productId) {
    const existing = cart.find((c) => c.productId === productId);
    if (existing) existing.qty += 1;
    else cart.push({ productId, qty: 1 });
    saveCart();
    openDrawer("cartDrawer");
  }

  function renderCart() {
    const state = getMerchantData();
    const products = state.products || [];
    const badge = document.getElementById("cartBadge");
    const itemsEl = document.getElementById("cartItems");
    const footEl = document.getElementById("cartFooter");

    const totalQty = cart.reduce((acc, item) => acc + item.qty, 0);
    badge.textContent = totalQty;

    if (cart.length === 0) {
      itemsEl.innerHTML = `<p style="text-align:center;color:var(--muted);padding:32px 0;font-size:14px;">Keranjang masih kosong. Pilih produk di katalog untuk mulai pre-order.</p>`;
      footEl.hidden = true;
      return;
    }

    footEl.hidden = false;

    let subtotal = 0;
    itemsEl.innerHTML = cart
      .map((item, idx) => {
        const p = products.find((x) => x.id === item.productId);
        if (!p) return "";
        const sub = p.price * item.qty;
        subtotal += sub;
        return `
          <div class="cart-item">
            <div style="flex:1;">
              <div style="font-weight:700;font-size:14px;">${escapeHTML(p.name)}</div>
              <div class="mono" style="font-size:13px;color:var(--brand);margin-top:2px;">${formatRupiah(sub)}</div>
            </div>
            <div class="qty-ctrl">
              <button type="button" data-dec="${idx}">−</button>
              <span class="mono" style="font-size:13px;font-weight:700;">${item.qty}</span>
              <button type="button" data-inc="${idx}">+</button>
            </div>
          </div>
        `;
      })
      .join("");

    const fee = subtotal > 0 ? SERVICE_FEE : 0;
    const tax = Math.round(subtotal * TAX_RATE);
    const grandTotal = subtotal + fee + tax;

    document.getElementById("cartTotal").textContent = formatRupiah(grandTotal);
    document.getElementById("cartDpInfo").textContent =
      `Subtotal ${formatRupiah(subtotal)} + Service fee ${formatRupiah(fee)} + Pajak 12% (${formatRupiah(tax)})`;

    itemsEl.querySelectorAll("[data-dec]").forEach((b) => {
      b.addEventListener("click", () => {
        const i = Number(b.getAttribute("data-dec"));
        if (cart[i].qty > 1) cart[i].qty -= 1;
        else cart.splice(i, 1);
        saveCart();
      });
    });
    itemsEl.querySelectorAll("[data-inc]").forEach((b) => {
      b.addEventListener("click", () => {
        const i = Number(b.getAttribute("data-inc"));
        cart[i].qty += 1;
        saveCart();
      });
    });
  }

  /* ---------- PESANAN SAYA (CEK STATUS, ALASAN, & HAPUS RIWAYAT) ---------- */
  function matchesCurrentUser(name, phone) {
    if (!user) return false;
    const uPhone = String(user.phone || "").replace(/\D/g, "");
    const rPhone = String(phone || "").replace(/\D/g, "");
    if (uPhone && rPhone && uPhone === rPhone) return true;
    const uName = String(user.name || "").trim().toLowerCase();
    const rName = String(name || "").trim().toLowerCase();
    return Boolean(uName && rName && uName === rName);
  }

  function renderMyOrders() {
    const state = getMerchantData();
    const products = state.products || [];
    const orders = state.orders || [];
    const inbox = getInboxList();
    const hiddenSet = new Set(getHiddenCodes());
    const listEl = document.getElementById("myOrdersList");
    const badgeEl = document.getElementById("myOrdersBadge");

    if (!listEl) return;

    const myItems = [];
    const linkedOrderIds = new Set();

    // 1. Cek dari Pesanan Masuk (menunggu konfirmasi / ditolak / sudah diterima)
    inbox.forEach((rec) => {
      if (!matchesCurrentUser(rec.name, rec.phone)) return;
      const p = products.find((x) => x.id === rec.productId);
      const prodName = p ? p.name : "Produk";
      const sub = p ? p.price * rec.qty : 0;
      const fee = rec.includeServiceFee === false ? 0 : SERVICE_FEE;
      const total = sub + fee + Math.round(sub * TAX_RATE);

      if (rec.status === "accepted" && rec.orderId) {
        linkedOrderIds.add(rec.orderId);
        const ord = orders.find((o) => o.id === rec.orderId);
        if (ord) {
          myItems.push(mapOrderCard(ord, products));
          return;
        }
      }

      if (rec.status === "rejected") {
        myItems.push({
          code: rec.id,
          createdAt: rec.createdAt,
          productTitle: `${prodName} × ${rec.qty}`,
          total: total,
          method: rec.paymentMethod || "Transfer Bank",
          pillClass: "cancel",
          pillLabel: "Dibatalkan / Ditolak",
          reason: rec.rejectReason || "Pesanan ditolak oleh toko.",
          canDelete: true
        });
      } else if (rec.status === "pending") {
        myItems.push({
          code: rec.id,
          createdAt: rec.createdAt,
          productTitle: `${prodName} × ${rec.qty}`,
          total: total,
          method: rec.paymentMethod || "Transfer Bank",
          pillClass: "pending",
          pillLabel: "Menunggu Konfirmasi",
          reason: "",
          canDelete: false
        });
      }
    });

    // 2. Cek pesanan yang langsung tercatat di daftar pesanan admin (atau belum ter-link)
    orders.forEach((ord) => {
      if (linkedOrderIds.has(ord.id)) return;
      if (!matchesCurrentUser(ord.customer && ord.customer.name, ord.customer && ord.customer.phone)) return;
      myItems.push(mapOrderCard(ord, products));
    });

    const visibleItems = myItems
      .filter((item) => !hiddenSet.has(item.code))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (badgeEl) {
      badgeEl.textContent = visibleItems.length;
      badgeEl.hidden = visibleItems.length === 0;
    }

    if (visibleItems.length === 0) {
      listEl.innerHTML = `<p style="text-align:center;color:var(--muted);padding:32px 0;font-size:14px;">Belum ada riwayat pesanan pada akun ini.</p>`;
      return;
    }

    const clearableCodes = visibleItems.filter((x) => x.canDelete).map((x) => x.code);
    const clearAllBar = clearableCodes.length
      ? `<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:4px;">
           <span style="font-size:12px;color:var(--muted);">${clearableCodes.length} riwayat selesai/batal</span>
           <button type="button" id="clearHistoryBtn" style="border:1px solid #fecaca;background:#fef2f2;color:#b91c1c;font-family:inherit;font-size:12px;font-weight:700;padding:5px 10px;border-radius:8px;cursor:pointer;">
             🗑 Bersihkan Riwayat
           </button>
         </div>`
      : "";

    listEl.innerHTML =
      clearAllBar +
      visibleItems
        .map((item) => {
          const reasonHtml = item.reason
            ? `<div class="cancel-reason-box"><strong>Alasan pembatalan:</strong> ${escapeHTML(item.reason)}</div>`
            : "";
          const deleteBtnHtml = item.canDelete
            ? `<button type="button" data-hide-order="${escapeHTML(item.code)}" title="Hapus dari riwayat" style="border:none;background:none;color:#dc2626;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;padding:2px 4px;">Hapus</button>`
            : "";
          return `
            <div class="my-order-card">
              <div class="my-order-top">
                <span class="mono" style="font-size:12px;font-weight:700;color:var(--muted);">${escapeHTML(item.code)} · ${formatDateID(item.createdAt)}</span>
                <div style="display:flex;align-items:center;gap:6px;">
                  <span class="st-pill ${item.pillClass}">${escapeHTML(item.pillLabel)}</span>
                  ${deleteBtnHtml}
                </div>
              </div>
              <div style="font-weight:700;font-size:14.5px;">${escapeHTML(item.productTitle)}</div>
              <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--muted);">
                <span>${escapeHTML(item.method)}</span>
                <strong class="mono" style="color:var(--ink);">${formatRupiah(item.total)}</strong>
              </div>
              ${reasonHtml}
            </div>
          `;
        })
        .join("");

    const clearBtn = document.getElementById("clearHistoryBtn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        hideOrderCodes(clearableCodes);
      });
    }

    listEl.querySelectorAll("[data-hide-order]").forEach((btn) => {
      btn.addEventListener("click", () => {
        hideOrderCodes([btn.getAttribute("data-hide-order")]);
      });
    });
  }

  function mapOrderCard(ord, products) {
    const p = products.find((x) => x.id === ord.productId);
    const prodName = p ? p.name : "Produk";
    const statusMap = {
      waiting: { cls: "active", label: "Antrean Batch" },
      shopping: { cls: "active", label: "Belanja Bahan" },
      production: { cls: "active", label: "Sedang Diproduksi" },
      ready: { cls: "done", label: "Siap Diambil / Dikirim" },
      completed: { cls: "done", label: "Selesai" },
      cancelled: { cls: "cancel", label: "Dibatalkan" }
    };
    const st = statusMap[ord.status] || { cls: "active", label: ord.status };
    const isTerminal = ord.status === "completed" || ord.status === "cancelled";
    return {
      code: ord.code || ord.id,
      createdAt: ord.createdAt,
      productTitle: `${prodName} × ${ord.qty}`,
      total: ord.total,
      method: ord.paymentMethod || "Transfer Bank",
      pillClass: st.cls,
      pillLabel: st.label,
      reason: ord.status === "cancelled" ? (ord.cancelReason || "Pesanan dibatalkan oleh toko.") : "",
      canDelete: isTerminal
    };
  }

  // Tombol di keranjang langsung masuk ke form lengkap pesan.html?from=cart
  document.getElementById("submitCheckoutBtn").addEventListener("click", function () {
    if (cart.length === 0) return;
    window.location.href = "../pesan.html?from=cart";
  });

  document.getElementById("searchInput").addEventListener("input", function (e) {
    searchQuery = e.target.value;
    renderStorefront();
  });

  function openDrawer(drawerId) {
    closeAllDrawers();
    document.getElementById("drawerScrim").classList.add("open");
    document.getElementById(drawerId).classList.add("open");
  }
  function closeAllDrawers() {
    document.getElementById("drawerScrim").classList.remove("open");
    document.getElementById("cartDrawer").classList.remove("open");
    const ordersDrawer = document.getElementById("ordersDrawer");
    if (ordersDrawer) ordersDrawer.classList.remove("open");
  }

  document.getElementById("openCartBtn").addEventListener("click", () => openDrawer("cartDrawer"));
  document.getElementById("closeCartBtn").addEventListener("click", closeAllDrawers);
  document.getElementById("openOrdersBtn").addEventListener("click", () => {
    renderMyOrders();
    openDrawer("ordersDrawer");
  });
  document.getElementById("closeOrdersBtn").addEventListener("click", closeAllDrawers);
  document.getElementById("drawerScrim").addEventListener("click", closeAllDrawers);

  renderStorefront();
  renderCart();
  renderMyOrders();

  window.addEventListener("pageshow", function () {
    cart = loadCart();
    renderStorefront();
    renderCart();
    renderMyOrders();
  });
  window.addEventListener("storage", function (e) {
    if (e.key === STORAGE_KEY || e.key === INBOX_KEY || e.key === HIDDEN_ORDERS_KEY) {
      renderStorefront();
      renderMyOrders();
    }
  });
});