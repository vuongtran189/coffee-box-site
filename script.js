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
      const res = await fetch('/lead', { method: 'POST', body: data });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error || 'Gửi thất bại');
      }

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
      btn.innerHTML = `<img class="cart-icon" src="assets/cart-icon.svg" alt="" aria-hidden="true" /> Giỏ hàng <span id="vibe-cart-badge" class="cart-badge" hidden>0</span>`;
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
      const lines = cart.items.map((it, idx) => `${idx + 1}) ${it.title}${it.subtitle ? ` — ${it.subtitle}` : ''} x${it.qty}`);
      const draft = {
        need: 'Đặt hàng online',
        message: `Mình muốn đặt các sản phẩm sau:\n${lines.join('\n')}\n\nNhờ Vibe Coffee gọi/Zalo xác nhận giúp mình nhé.`,
        created_at: Date.now()
      };
      localStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
      window.location.href = 'contact.html?from_cart=1';
    });

    renderCart();
  }

  function renderCart() {
    const cart = readCart();
    const itemsWrap = document.getElementById('vibe-cart-items');
    const summaryEl = document.getElementById('vibe-cart-summary');
    const badge = document.getElementById('vibe-cart-badge');
    if (badge) {
      const c = cartCount(cart);
      badge.hidden = c <= 0;
      badge.textContent = String(c);
    }

    if (summaryEl) summaryEl.textContent = `${cart.items.length} sản phẩm`;
    if (!itemsWrap) return;

    if (!cart.items.length) {
      itemsWrap.innerHTML = `<div class="cart-empty">Giỏ hàng đang trống. Bạn chọn sản phẩm rồi bấm “Thêm vào giỏ” nhé.</div>`;
      return;
    }

    itemsWrap.innerHTML = cart.items.map((it) => {
      const img = it.image ? String(it.image) : 'assets/hero-box-cutout.png';
      const title = String(it.title || '');
      const subtitle = String(it.subtitle || '');
      return `
        <div class="cart-item" data-cart-item="${encodeURIComponent(it.id)}">
          <img src="${img}" alt="${title}" />
          <div>
            <h3>${title}</h3>
            ${subtitle ? `<p>${subtitle}</p>` : `<p></p>`}
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
          price: safeDecode(addBtn.dataset.productPrice || '')
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

  ensureCartUi();
  attachCartActions();
  prefillContactFromCart();

  window.VibeCart = {
    open: openCart,
    close: closeCart,
    get: readCart
  };
})();

