(() => {
  const tokenKeys = ['invite_token', 'recovery_token', 'confirmation_token'];
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const hasIdentityToken = tokenKeys.some((key) => searchParams.has(key) || hashParams.has(key));
  const isAdminPath = /^\/admin\/?$/i.test(window.location.pathname);

  if (hasIdentityToken && !isAdminPath) {
    const search = window.location.search || '';
    const hash = window.location.hash || '';
    window.location.replace(`/admin/${search}${hash}`);
  }
})();
const revSlider = document.querySelector('.rev-slider');
const revSlides = Array.from(document.querySelectorAll('.rev-slide'));
const revDotsWrap = document.querySelector('.rev-dots');
const prevBtn = document.querySelector('.rev-prev');
const nextBtn = document.querySelector('.rev-next');

let currentSlide = 0;
let autoSlide;

if (revSlider && revSlides.length) {
  revSlides.forEach((_, idx) => {
    const dot = document.createElement('button');
    dot.className = 'rev-dot';
    dot.type = 'button';
    dot.setAttribute('aria-label', `Đến slide ${idx + 1}`);
    dot.addEventListener('click', () => goToSlide(idx));
    revDotsWrap?.appendChild(dot);
  });

  const revDots = Array.from(document.querySelectorAll('.rev-dot'));

  function updateSlides() {
    revSlides.forEach((slide, idx) => {
      slide.classList.toggle('is-active', idx === currentSlide);
    });
    revDots.forEach((dot, idx) => {
      dot.classList.toggle('is-active', idx === currentSlide);
    });
  }

  function goToSlide(idx) {
    currentSlide = (idx + revSlides.length) % revSlides.length;
    updateSlides();
    restartAutoSlide();
  }

  function nextSlide() {
    goToSlide(currentSlide + 1);
  }

  function restartAutoSlide() {
    clearInterval(autoSlide);
    autoSlide = setInterval(nextSlide, 5000);
  }

  prevBtn?.addEventListener('click', () => goToSlide(currentSlide - 1));
  nextBtn?.addEventListener('click', nextSlide);

  revSlider.addEventListener('mouseenter', () => clearInterval(autoSlide));
  revSlider.addEventListener('mouseleave', restartAutoSlide);

  updateSlides();
  restartAutoSlide();
}

const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  reveals.forEach((el, idx) => {
    el.style.transitionDelay = `${Math.min(idx * 0.08, 0.45)}s`;
    observer.observe(el);
  });
} else {
  reveals.forEach((el) => el.classList.add('in'));
}

const forms = document.querySelectorAll('form');

function getLeadSubmitConfig() {
  const apiBase = String(window.VIBE_CHATBOT_API_BASE || '').replace(/\/$/, '');
  const widgetKey = String(window.VIBE_CHATBOT_WIDGET_KEY || '');
  if (apiBase && widgetKey) {
    return {
      endpoint: `${apiBase}/v1/leads`,
      headers: { 'content-type': 'application/json', 'x-widget-key': widgetKey },
      mode: 'json'
    };
  }
  // Cloudflare Pages Functions (or same-origin backend) fallback.
  return { endpoint: '/lead', headers: null, mode: 'form' };
}

async function submitLead({ endpoint, headers, mode }, formData) {
  if (mode === 'json') {
    const payload = {};
    for (const [key, value] of formData.entries()) payload[key] = String(value ?? '');
    // normalize common field names
    payload.phone = payload.phone || payload.tel || payload.hotline || '';
    payload.need = payload.need || payload.needs || '';
    payload.page_url = payload.page_url || window.location.href;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error || 'Gửi thất bại');
    return json;
  }

  const res = await fetch(endpoint, { method: 'POST', body: formData });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error || 'Gửi thất bại');
  return json;
}

forms.forEach((form) => {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const button = form.querySelector('button');
    const originalText = button?.textContent || 'Gửi yêu cầu';

    const tsEl = form.querySelector('input[name="form_ts"]');
    if (tsEl && !tsEl.value) tsEl.value = String(Date.now());

    const data = new FormData(form);

    if (button) {
      button.disabled = true;
      button.textContent = 'Đang gửi...';
    }

    try {
      await submitLead(getLeadSubmitConfig(), data);

      if (button) {
        button.textContent = 'Đã gửi thông tin';
      }
      form.reset();
    } catch (err) {
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
      alert('Chưa gửi được. Vui lòng thử lại hoặc gọi hotline.');
    }
  });
});

const zoomModal = document.createElement('div');
zoomModal.className = 'zoom-modal';
zoomModal.hidden = true;
zoomModal.setAttribute('aria-hidden', 'true');
zoomModal.innerHTML = `
  <div class="zoom-modal__frame" role="dialog" aria-modal="true" aria-label="Xem ảnh sản phẩm">
    <button class="zoom-modal__close" type="button" aria-label="Đóng ảnh">×</button>
    <img class="zoom-modal__image" src="" alt="" />
  </div>
`;
document.body.appendChild(zoomModal);

const zoomImageEl = zoomModal.querySelector('.zoom-modal__image');
const zoomCloseBtn = zoomModal.querySelector('.zoom-modal__close');

function closeZoomModal() {
  zoomModal.hidden = true;
  zoomModal.setAttribute('aria-hidden', 'true');
  document.body.style.removeProperty('overflow');
}

function openZoomModal(src, alt) {
  if (!src || !zoomImageEl) return;
  zoomImageEl.src = src;
  zoomImageEl.alt = alt || 'Ảnh sản phẩm';
  zoomModal.hidden = false;
  zoomModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  const zoomButton = event.target.closest('.product-image-zoom');
  if (zoomButton) {
    const image = zoomButton.querySelector('img');
    if (image) openZoomModal(image.currentSrc || image.src, image.alt);
    return;
  }

  if (event.target === zoomModal || event.target === zoomCloseBtn) {
    closeZoomModal();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !zoomModal.hidden) {
    closeZoomModal();
  }
});

// --- Vibe Chatbot embed (Express API + widget) ---
// Set these 2 values (recommended via inline <script> before script.js):
//   window.VIBE_CHATBOT_API_BASE = "https://<your-service>.onrender.com";
//   window.VIBE_CHATBOT_WIDGET_KEY = "<your_widget_public_key>";
// Or hardcode them below.
(function () {
  const API_BASE = window.VIBE_CHATBOT_API_BASE || '';
  const WIDGET_KEY = window.VIBE_CHATBOT_WIDGET_KEY || '';
  const LOCAL_WIDGET_JS = new URL('assets/chatbot/widget.js', document.baseURI).toString();
  const LOCAL_WIDGET_CSS = new URL('assets/chatbot/widget.css', document.baseURI).toString();
  const PRELOAD = window.VIBE_CHATBOT_PRELOAD === true;
  const PREFER_LOCAL = window.VIBE_CHATBOT_PREFER_LOCAL_WIDGET !== false;
  const LAUNCHER_ICON_URL = window.VIBE_CHATBOT_LAUNCHER_ICON_URL || '';

  if (!API_BASE || !WIDGET_KEY) return;
  if (window.VibeChatbot || document.getElementById('vibe-chatbot-embed')) return;

  const base = String(API_BASE).replace(/\/$/, '');
  const remoteWidgetJs = `${base}/widget.js`;
  const remoteWidgetCss = `${base}/widget.css`;

  function mountWidget({ id, src, cssUrl }) {
    return new Promise((resolve, reject) => {
      if (window.VibeChatbot) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.id = id;
      script.async = true;
      script.src = src;
      script.onload = () => {
        try {
          window.VibeChatbot?.init?.({
            apiBaseUrl: base,
            widgetKey: String(WIDGET_KEY),
            preload: PRELOAD,
            cssUrl,
            launcherIconUrl: LAUNCHER_ICON_URL ? String(LAUNCHER_ICON_URL) : undefined
          });
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      script.onerror = () => reject(new Error('widget_load_failed'));
      document.head.appendChild(script);
    });
  }

  const primary = PREFER_LOCAL
    ? { id: 'vibe-chatbot-embed-local', src: LOCAL_WIDGET_JS, cssUrl: LOCAL_WIDGET_CSS }
    : { id: 'vibe-chatbot-embed-remote', src: remoteWidgetJs, cssUrl: remoteWidgetCss };

  const fallback = PREFER_LOCAL
    ? { id: 'vibe-chatbot-embed-remote', src: remoteWidgetJs, cssUrl: remoteWidgetCss }
    : { id: 'vibe-chatbot-embed-local', src: LOCAL_WIDGET_JS, cssUrl: LOCAL_WIDGET_CSS };

  mountWidget(primary).catch(() => {
    if (document.getElementById(fallback.id) || window.VibeChatbot) return;
    mountWidget(fallback).catch(() => {});
  });
})();

// --- Simple cart (localStorage) ---
(function () {
  const CART_KEY = 'vibe_cart_v1';
  const CHECKOUT_DRAFT_KEY = 'vibe_checkout_draft_v1';

  function safeDecode(value) {
    try {
      return decodeURIComponent(String(value || ''));
    } catch {
      return String(value || '');
    }
  }

  function formatVnd(amount) {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return '';
    return `${Math.round(n).toLocaleString('vi-VN')}đ`;
  }

  function itemFinalPrice(it) {
    const base = Number(it?.price_vnd || 0);
    if (!Number.isFinite(base) || base <= 0) return 0;
    const discount = Number(it?.discount_percent || 0);
    const hasDiscount = Number.isFinite(discount) && discount > 0 && discount < 100;
    return hasDiscount ? Math.round(base * (1 - discount / 100)) : Math.round(base);
  }

  function calcCartTotal(cart) {
    const items = Array.isArray(cart?.items) ? cart.items : [];
    if (!items.length) return { known: true, total: 0 };
    let total = 0;
    for (const it of items) {
      const unit = itemFinalPrice(it);
      if (!unit) return { known: false, total: 0 };
      total += unit * Number(it.qty || 0);
    }
    return { known: true, total: Math.round(total) };
  }

  function readCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      const items = Array.isArray(parsed?.items) ? parsed.items : [];
      return { items: items.filter((x) => x && x.id && x.qty > 0) };
    } catch {
      return { items: [] };
    }
  }

  function writeCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent('vibe_cart_updated'));
  }

  function cartCount(cart) {
    return (cart?.items || []).reduce((sum, it) => sum + Number(it.qty || 0), 0);
  }

  function upsertItem(item, qtyDelta = 1) {
    const cart = readCart();
    const idx = cart.items.findIndex((x) => x.id === item.id);
    if (idx >= 0) {
      cart.items[idx].qty = Math.max(1, Number(cart.items[idx].qty || 1) + qtyDelta);
    } else {
      cart.items.unshift({ ...item, qty: Math.max(1, Number(qtyDelta || 1)) });
    }
    writeCart(cart);
    return cart;
  }

  function setQty(id, qty) {
    const cart = readCart();
    const idx = cart.items.findIndex((x) => x.id === id);
    if (idx < 0) return cart;
    const nextQty = Number(qty || 0);
    if (!Number.isFinite(nextQty) || nextQty <= 0) {
      cart.items.splice(idx, 1);
    } else {
      cart.items[idx].qty = Math.min(99, Math.max(1, Math.round(nextQty)));
    }
    writeCart(cart);
    return cart;
  }

  function removeItem(id) {
    const cart = readCart();
    const idx = cart.items.findIndex((x) => x.id === id);
    if (idx >= 0) cart.items.splice(idx, 1);
    writeCart(cart);
    return cart;
  }

  function ensureCartUi() {
    if (document.getElementById('vibe-cart-drawer')) return;

    const drawer = document.createElement('div');
    drawer.id = 'vibe-cart-drawer';
    drawer.className = 'cart-drawer';
    drawer.hidden = true;
    drawer.innerHTML = `
      <div class="cart-backdrop" data-cart-close="1" aria-hidden="true"></div>
      <aside class="cart-panel" role="dialog" aria-modal="true" aria-label="Giỏ hàng">
        <div class="cart-header">
          <h2>Giỏ hàng</h2>
          <button class="cart-close" type="button" data-cart-close="1" aria-label="Đóng">×</button>
        </div>
        <div id="vibe-cart-items" class="cart-items"></div>
        <div class="cart-footer">
          <div class="cart-summary">
            <span id="vibe-cart-summary">0 sản phẩm</span>
            <span id="vibe-cart-total"></span>
          </div>
          <div class="cart-actions">
            <button class="btn btn-primary" type="button" id="vibe-cart-checkout">Gửi đơn đặt hàng</button>
            <button class="btn btn-ghost" type="button" data-cart-close="1">Tiếp tục xem</button>
          </div>
          <div class="cart-summary" style="font-weight:600;">
            <span>Giá sẽ được xác nhận khi tư vấn.</span>
          </div>
        </div>
      </aside>
    `;
    document.body.appendChild(drawer);

    const topbarWrap = document.querySelector('.topbar-wrap');
    if (topbarWrap && !document.getElementById('vibe-cart-btn')) {
      const btn = document.createElement('button');
      btn.id = 'vibe-cart-btn';
      btn.type = 'button';
      btn.className = 'cart-btn';
      btn.innerHTML = `
        <img class="cart-btn__img" src="assets/Gio hang button newest.png" alt="Giỏ hàng" />
        <span id="vibe-cart-badge" class="cart-badge" hidden>0</span>
      `.trim();
      btn.addEventListener('click', () => openCart());
      topbarWrap.appendChild(btn);
    }

    drawer.addEventListener('click', (event) => {
      const el = event.target instanceof Element ? event.target : null;
      if (!el) return;
      if (el.closest('[data-cart-close="1"]')) closeCart();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeCart();
    });

    const checkoutBtn = drawer.querySelector('#vibe-cart-checkout');
    checkoutBtn?.addEventListener('click', () => {
      const cart = readCart();
      if (!cart.items.length) return;
      window.location.href = 'checkout.html';
    });

    renderCart();
  }

  function renderCart() {
    const cart = readCart();
    const itemsWrap = document.getElementById('vibe-cart-items');
    const summaryEl = document.getElementById('vibe-cart-summary');
    const totalEl = document.getElementById('vibe-cart-total');
    const badge = document.getElementById('vibe-cart-badge');
    if (badge) {
      const c = cartCount(cart);
      badge.hidden = c <= 0;
      badge.textContent = String(c);
    }

    if (summaryEl) summaryEl.textContent = `${cart.items.length} sản phẩm`;
    if (totalEl) {
      const t = calcCartTotal(cart);
      totalEl.textContent = t.known && t.total > 0 ? `Tạm tính: ${formatVnd(t.total)}` : '';
    }
    if (!itemsWrap) return;

    if (!cart.items.length) {
      itemsWrap.innerHTML = `<div class="cart-empty">Giỏ hàng đang trống. Bạn chọn sản phẩm rồi bấm “Thêm vào giỏ” nhé.</div>`;
      return;
    }

    itemsWrap.innerHTML = cart.items.map((it) => {
      const img = it.image ? String(it.image) : 'assets/hero-box-cutout.png';
      const title = String(it.title || '');
      const subtitle = String(it.subtitle || '');
      const unit = itemFinalPrice(it);
      const priceLine = unit ? `<p>Giá: <strong>${formatVnd(unit)}</strong> / sp</p>` : '';
      return `
        <div class="cart-item" data-cart-item="${encodeURIComponent(it.id)}">
          <img src="${img}" alt="${title}" />
          <div>
            <h3>${title}</h3>
            ${subtitle ? `<p>${subtitle}</p>` : `<p></p>`}
            ${priceLine}
            <div class="cart-row">
              <div class="cart-qty" aria-label="Số lượng">
                <button type="button" data-qty-minus="1" aria-label="Giảm">−</button>
                <span>${it.qty}</span>
                <button type="button" data-qty-plus="1" aria-label="Tăng">+</button>
              </div>
              <button class="cart-remove" type="button" data-remove="1">Xoá</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function openCart() {
    ensureCartUi();
    const drawer = document.getElementById('vibe-cart-drawer');
    if (!drawer) return;
    drawer.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    const drawer = document.getElementById('vibe-cart-drawer');
    if (!drawer || drawer.hidden) return;
    drawer.hidden = true;
    document.body.style.removeProperty('overflow');
  }

  function attachCartActions() {
    document.addEventListener('click', (event) => {
      const el = event.target instanceof Element ? event.target : null;
      if (!el) return;

      const addBtn = el.closest('[data-add-to-cart="1"]');
      if (addBtn instanceof HTMLElement) {
        const id = safeDecode(addBtn.dataset.productId || '');
        const title = safeDecode(addBtn.dataset.productTitle || '');
        if (!id || !title) return;

        const item = {
          id,
          title,
          subtitle: safeDecode(addBtn.dataset.productSubtitle || ''),
          image: safeDecode(addBtn.dataset.productImage || ''),
          price_vnd: Number(safeDecode(addBtn.dataset.productPrice || '0')) || 0,
          discount_percent: Number(safeDecode(addBtn.dataset.productDiscount || '0')) || 0
        };
        upsertItem(item, 1);
        openCart();
        return;
      }

      const itemEl = el.closest('[data-cart-item]');
      if (itemEl instanceof HTMLElement) {
        const id = safeDecode(itemEl.dataset.cartItem || '');
        if (!id) return;
        if (el.closest('[data-remove="1"]')) {
          removeItem(id);
          renderCart();
          return;
        }
        if (el.closest('[data-qty-minus="1"]')) {
          const cart = readCart();
          const current = cart.items.find((x) => x.id === id)?.qty || 1;
          setQty(id, Number(current) - 1);
          renderCart();
          return;
        }
        if (el.closest('[data-qty-plus="1"]')) {
          const cart = readCart();
          const current = cart.items.find((x) => x.id === id)?.qty || 1;
          setQty(id, Number(current) + 1);
          renderCart();
          return;
        }
      }
    });

    window.addEventListener('vibe_cart_updated', () => renderCart());
  }

  function prefillContactFromCart() {
    if (document.body?.dataset?.page !== 'contact') return;
    const params = new URLSearchParams(window.location.search || '');
    if (params.get('from_cart') !== '1') return;

    let draft = null;
    try {
      draft = JSON.parse(localStorage.getItem(CHECKOUT_DRAFT_KEY) || 'null');
    } catch {
      draft = null;
    }
    if (!draft?.message) return;

    const form = document.querySelector('form.contact-form-card');
    if (!form) return;

    const need = form.querySelector('input[name="need"]');
    const message = form.querySelector('textarea[name="message"]');
    if (need && !need.value) need.value = String(draft.need || 'Đặt hàng online');
    if (message && !message.value) message.value = String(draft.message || '');

    localStorage.removeItem(CHECKOUT_DRAFT_KEY);
  }

  function getCmsPayments() {
    const data = window.VibeCmsData || null;
    const s = data && typeof data === 'object' ? data.site || {} : {};
    const payments = s && typeof s === 'object' ? s.payments || {} : {};
    const hotline = s && typeof s.hotline === 'string' ? s.hotline : '';
    return { payments, hotline };
  }

  function renderCheckoutCart(cart) {
    const wrap = document.getElementById('checkout-cart');
    if (!wrap) return;
    if (!cart.items.length) {
      wrap.innerHTML = `<div class="cart-empty">Giỏ hàng đang trống. Bạn quay lại <a href="products.html">Sản phẩm</a> để chọn nhé.</div>`;
      return;
    }
    const totals = calcCartTotal(cart);
    wrap.innerHTML = cart.items.map((it) => {
      const img = it.image ? String(it.image) : 'assets/hero-box-cutout.png';
      const title = String(it.title || '');
      const subtitle = String(it.subtitle || '');
      const unit = itemFinalPrice(it);
      const price = unit ? `<div class="checkout-sub">Giá: <strong>${formatVnd(unit)}</strong> / sp</div>` : '';
      return `<div class="checkout-item"><img src="${img}" alt="${title}" /><div><strong>${title}</strong>${subtitle ? `<div class="checkout-sub">${subtitle}</div>` : ''}${price}<div class="checkout-sub">Số lượng: <strong>${it.qty}</strong></div></div></div>`;
    }).join('');
    if (totals.known && totals.total > 0) {
      wrap.innerHTML += `<div class="checkout-item"><div></div><div><strong>Tạm tính:</strong> ${formatVnd(totals.total)}</div></div>`;
    }
  }

  function setPayInstructions(method) {
    const box = document.getElementById('pay-instructions');
    if (!box) return;
    const { payments, hotline } = getCmsPayments();

    if (method === 'COD') {
      box.innerHTML = `<p>COD: bạn thanh toán khi nhận hàng. Vibe Coffee sẽ gọi xác nhận trước khi gửi.</p>`;
      return;
    }

    if (method === 'BANK') {
      const bankName = String(payments.bank_name || '').trim();
      const accountNo = String(payments.bank_account_number || '').trim();
      const accountName = String(payments.bank_account_name || '').trim();
      if (!bankName || !accountNo || !accountName) {
        box.innerHTML = `<p>Thông tin chuyển khoản đang được cập nhật. Mình kiểm tra lại giúp bạn nhé${hotline ? ` (hoặc gọi ${hotline})` : ''}.</p>`;
        return;
      }
      box.innerHTML = `<p>Chuyển khoản theo thông tin:</p><ul><li>Ngân hàng: <strong>${bankName}</strong></li><li>Số TK: <strong>${accountNo}</strong></li><li>Chủ TK: <strong>${accountName}</strong></li></ul><p>Sau khi gửi đơn, Vibe Coffee sẽ nhắn xác nhận và hướng dẫn nội dung chuyển khoản.</p>`;
      return;
    }

    if (method === 'MOMO') {
      const momoPhone = String(payments.momo_phone || '').trim();
      if (!momoPhone) {
        box.innerHTML = `<p>Thông tin MoMo đang được cập nhật. Mình kiểm tra lại giúp bạn nhé${hotline ? ` (hoặc gọi ${hotline})` : ''}.</p>`;
        return;
      }
      box.innerHTML = `<p>MoMo: chuyển tới SĐT <strong>${momoPhone}</strong>. Sau khi gửi đơn, Vibe Coffee sẽ nhắn xác nhận và hướng dẫn nội dung chuyển khoản.</p>`;
      return;
    }

    box.innerHTML = '';
  }

  function initCheckoutPage() {
    if (document.body?.dataset?.page !== 'checkout') return;

    const cart = readCart();
    renderCheckoutCart(cart);

    const form = document.getElementById('checkout-form');
    if (!(form instanceof HTMLFormElement)) return;

    const method = form.querySelector('input[name="pay_method"]:checked')?.value || 'COD';
    setPayInstructions(method);
    form.addEventListener('change', () => {
      const m = form.querySelector('input[name="pay_method"]:checked')?.value || 'COD';
      setPayInstructions(m);
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!cart.items.length) return;

      const button = form.querySelector('button[type="submit"]');
      const originalText = button?.textContent || 'Gửi đơn';
      const data = new FormData(form);

      const payMethod = String(data.get('pay_method') || 'COD');
      const address = String(data.get('address') || '').trim();
      const note = String(data.get('message') || '').trim();
      const lines = cart.items.map((it, idx) => {
        const unit = itemFinalPrice(it);
        const price = unit ? ` (${formatVnd(unit)}/sp)` : '';
        return `${idx + 1}) ${it.title}${it.subtitle ? ` — ${it.subtitle}` : ''} x${it.qty}${price}`;
      });
      const totals = calcCartTotal(cart);
      const composed = [
        `Đơn hàng:`,
        ...lines,
        '',
        totals.known && totals.total > 0 ? `Tạm tính: ${formatVnd(totals.total)}` : null,
        `Thanh toán: ${payMethod === 'BANK' ? 'Chuyển khoản' : payMethod === 'MOMO' ? 'MoMo' : 'COD'}`,
        `Địa chỉ: ${address}`,
        note ? `Ghi chú: ${note}` : null
      ].filter(Boolean).join('\n');

      data.set('need', `Đặt hàng online - ${payMethod}`);
      data.set('message', composed);
      const tsEl = form.querySelector('input[name="form_ts"]');
      if (tsEl && !tsEl.value) tsEl.value = String(Date.now());

      if (button) {
        button.disabled = true;
        button.textContent = 'Đang gửi...';
      }

      try {
        await submitLead(getLeadSubmitConfig(), data);

        if (button) button.textContent = 'Đã gửi đơn';
        writeCart({ items: [] });
      } catch (err) {
        if (button) {
          button.disabled = false;
          button.textContent = originalText;
        }
        alert('Chưa gửi được. Vui lòng thử lại hoặc gọi hotline.');
      }
    });
  }

  ensureCartUi();
  attachCartActions();
  prefillContactFromCart();
  initCheckoutPage();

  window.VibeCart = {
    open: openCart,
    close: closeCart,
    get: readCart
  };
})();

