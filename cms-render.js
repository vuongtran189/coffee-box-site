async function loadCmsData() {
  const apiBase = String(window.VIBE_CHATBOT_API_BASE || "").replace(/\/$/, "");
  const widgetKey = String(window.VIBE_CHATBOT_WIDGET_KEY || "");

  const candidates = [];
  if (apiBase) {
    candidates.push({
      url: `${apiBase}/v1/site/content`,
      opts: widgetKey
        ? { cache: "no-store", headers: { "x-widget-key": widgetKey } }
        : { cache: "no-store" }
    });
  }

  candidates.push(
    { url: "assets/cms-data.json", opts: { cache: "no-store" } },
    { url: new URL("assets/cms-data.json", document.baseURI).toString(), opts: { cache: "no-store" } },
    { url: `assets/cms-data.json?v=${Date.now()}`, opts: { cache: "no-store" } }
  );

  for (const { url, opts } of candidates) {
    try {
      const res = await fetch(url, opts);
      if (!res.ok) continue;
      const text = await res.text();
      const cleaned = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
      const json = JSON.parse(cleaned);
      if (json && typeof json === "object" && json.data && typeof json.data === "object") return json.data;
      return json;
    } catch (err) {
      console.warn("[vibe] loadCmsData failed:", url, err);
    }
  }

  return null;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el && value !== undefined) el.textContent = value;
}

function setHtml(id, value) {
  const el = document.getElementById(id);
  if (el && value !== undefined) el.innerHTML = value;
}

function normalizeAssetUrl(src) {
  const raw = String(src || '').trim();
  if (!raw) return '';
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;

  const match = raw.match(/^([^?#]+)([?#].*)?$/);
  const pathname = (match?.[1] || raw).replace(/\\/g, '/');
  const suffix = match?.[2] || '';
  return `${encodeURI(pathname)}${suffix}`;
}

function setImage(id, src, alt = '') {
  const el = document.getElementById(id);
  if (el && src) {
    const fallbackSrc = el.getAttribute('src') || '';
    el.src = normalizeAssetUrl(src);
    el.onerror = () => {
      if (fallbackSrc && el.src !== fallbackSrc) {
        el.src = fallbackSrc;
      }
    };
    if (alt) el.alt = alt;
  }
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function slugify(value) {
  const t = normalizeText(value);
  return t
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function formatVnd(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return "";
  return `${Math.round(n).toLocaleString("vi-VN")}đ`;
}

function getPriceInfo(item) {
  const base = Number(item?.price_vnd ?? item?.price ?? 0);
  if (!Number.isFinite(base) || base <= 0) return null;
  const discount = Number(item?.discount_percent ?? 0);
  const hasDiscount = Number.isFinite(discount) && discount > 0 && discount < 100;
  const final = hasDiscount ? Math.round(base * (1 - discount / 100)) : Math.round(base);
  return {
    base: Math.round(base),
    final,
    discount: hasDiscount ? Math.round(discount) : 0
  };
}

function renderPriceHtml(info) {
  if (!info) return "";
  const current = formatVnd(info.final);
  const original = info.discount ? formatVnd(info.base) : "";
  const badge = info.discount ? `-${info.discount}%` : "";
  return `<div class="product-price"><span class="product-price__current">${current}</span>${original ? `<span class="product-price__original">${original}</span>` : ""}${badge ? `<span class="product-price__badge">${badge}</span>` : ""}</div>`;
}

function detectProductCategory(item) {
  const normalizedCategory = normalizeText(item?.category);
  if (normalizedCategory.includes('combo')) return 'combo';
  if (normalizedCategory.includes('ban chay') || normalizedCategory.includes('bestseller')) return 'bestseller';

  const signal = normalizeText(`${item?.title || ''} ${item?.subtitle || ''}`);
  if (signal.includes('combo')) return 'combo';
  if (signal.includes('ban chay') || signal.includes('best seller') || signal.includes('bestseller')) return 'bestseller';
  return 'all';
}

function getProductImageClass(item) {
  const normalizedTitle = normalizeText(item?.title);
  if (normalizedTitle.includes('pho mai')) return 'product-image product-image--scale-up';
  return 'product-image';
}

const cardObserver = ('IntersectionObserver' in window)
  ? new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            cardObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14 }
    )
  : null;

function animateCards(elements) {
  elements.forEach((el, idx) => {
    if (!(el instanceof HTMLElement)) return;
    el.classList.add('scroll-pop');
    el.style.transitionDelay = `${Math.min(idx * 0.06, 0.3)}s`;
    if (cardObserver) {
      cardObserver.observe(el);
    } else {
      el.classList.add('in');
    }
  });
}

function renderHome(data) {
  const home = data.home || {};
  const slides = Array.isArray(home.slides) ? home.slides : [];
  const slideEls = Array.from(document.querySelectorAll('.rev-slide'));
  slideEls.forEach((slide, idx) => {
    const item = slides[idx];
    const src = typeof item === 'string' ? item : item?.image;
    const url = normalizeAssetUrl(src);
    if (url) {
      const safeUrl = url.replace(/"/g, '%22');
      slide.style.setProperty('--bg', `url("${safeUrl}")`);
    }
  });

  const hero = home.hero || {};
  setText('home-hero-eyebrow', hero.eyebrow);
  setText('home-hero-title', hero.title);
  setText('home-hero-subtitle', hero.subtitle);
  setText('home-hero-description', hero.description);
  setImage('home-hero-image', hero.image, 'Hộp cà phê Vibe Coffee');

  const primary = document.getElementById('home-btn-primary');
  if (primary) {
    if (hero.primary_label) primary.textContent = hero.primary_label;
    if (hero.primary_link) primary.href = hero.primary_link;
  }

  const secondary = document.getElementById('home-btn-secondary');
  if (secondary) {
    if (hero.secondary_label) secondary.textContent = hero.secondary_label;
    if (hero.secondary_link) secondary.href = hero.secondary_link;
  }

  const metricWrap = document.getElementById('home-metrics');
  if (metricWrap && Array.isArray(home.metrics)) {
    metricWrap.innerHTML = home.metrics.map((m) => `<div><strong>${m.value || ''}</strong><span>${m.label || ''}</span></div>`).join('');
  }

  const featureWrap = document.getElementById('home-features');
  if (featureWrap && Array.isArray(home.features)) {
    featureWrap.innerHTML = home.features.map((f) => `<article><h3>${f.title || ''}</h3><p>${f.text || ''}</p></article>`).join('');
  }

  const previewWrap = document.getElementById('home-previews');
  if (previewWrap && Array.isArray(home.previews)) {
    previewWrap.innerHTML = home.previews.map((p, idx) => {
      const cls = idx === 0 ? 'btn btn-primary' : 'btn btn-ghost';
      return `<article class="preview-card"><h2>${p.title || ''}</h2><p>${p.text || ''}</p><a class="${cls}" href="${p.link || '#'}">${p.label || 'Xem thêm'}</a></article>`;
    }).join('');
  }
}

function renderAbout(data) {
  const about = data.about || {};
  setText('about-eyebrow', about.eyebrow);
  setText('about-title', about.title);
  setText('about-description', about.description);
  setText('about-story-title', about.story_title);
  setText('about-story-text', about.story_text);
  setImage('about-story-image', about.story_image, 'Câu chuyện Vibe Coffee');

  const pointWrap = document.getElementById('about-points');
  if (pointWrap && Array.isArray(about.points)) {
    pointWrap.innerHTML = about.points.map((p) => `<article><h3>${p.title || ''}</h3><p>${p.text || ''}</p></article>`).join('');
  }
}

function renderProducts(data) {
  const p = data.products || {};
  setText('products-eyebrow', p.eyebrow);
  setText('products-title', p.title);
  setText('products-description', p.description);
  const allItems = Array.isArray(p.items) ? p.items : [];
  const grid = document.getElementById('products-grid');
  const chips = Array.from(document.querySelectorAll('.chip[data-filter]'));

  function renderProductItems(filter = 'all') {
    if (!grid) return;
    const visibleItems = filter === 'all'
      ? allItems
      : allItems.filter((item) => detectProductCategory(item) === filter);

    grid.innerHTML = visibleItems.map((item) => {
      const imageClass = getProductImageClass(item);
      const imageSrc = normalizeAssetUrl(item?.image);
      const slug = item?.slug ? slugify(item.slug) : slugify(item?.title);
      const detailLink = slug ? `product.html?slug=${encodeURIComponent(slug)}` : 'products.html';
      const id = slug || '';
      const title = item?.title || '';
      const subtitle = item?.subtitle || '';
      const priceInfo = getPriceInfo(item);
      const priceHtml = renderPriceHtml(priceInfo);
      const basePrice = priceInfo ? String(priceInfo.base) : "";
      const discount = priceInfo ? String(priceInfo.discount || 0) : "";
      return `<article class="product-card"><a class="product-card__media" href="${detailLink}" aria-label="Xem chi tiết ${title || 'sản phẩm'}"><img class="${imageClass}" src="${imageSrc}" alt="${title}" /></a><h3><a class="product-card__titlelink" href="${detailLink}">${title}</a></h3><p>${subtitle}</p>${priceHtml}<div class="product-card__actions"><a class="btn btn-ghost" href="${detailLink}">Xem chi tiết</a><button class="btn btn-primary btn-cart" type="button" data-add-to-cart="1" data-product-id="${encodeURIComponent(id)}" data-product-title="${encodeURIComponent(title)}" data-product-subtitle="${encodeURIComponent(subtitle)}" data-product-image="${encodeURIComponent(imageSrc)}" data-product-price="${encodeURIComponent(basePrice)}" data-product-discount="${encodeURIComponent(discount)}">Thêm vào giỏ</button></div></article>`;
    }).join('');
    setText('products-count', `Hiển thị ${visibleItems.length} sản phẩm`);
    animateCards(Array.from(grid.querySelectorAll('.product-card')));
  }

  if (grid) {
    renderProductItems('all');
  }

  if (chips.length) {
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const filter = chip.dataset.filter || 'all';
        chips.forEach((btn) => {
          const isOn = btn === chip;
          btn.classList.toggle('is-on', isOn);
          btn.setAttribute('aria-pressed', isOn ? 'true' : 'false');
        });
        renderProductItems(filter);
      });
    });
  }
}

function renderProductDetail(data) {
  const p = data.products || {};
  const allItems = Array.isArray(p.items) ? p.items : [];
  const params = new URLSearchParams(window.location.search || '');
  const slug = String(params.get('slug') || '').trim();

  const item = allItems.find((x) => slugify(x?.slug || x?.title) === slug) || null;
  const title = item?.title || 'Sản phẩm';

  setText('product-breadcrumb', title);
  setText('product-eyebrow', p.eyebrow || 'SẢN PHẨM');
  setText('product-title', title);
  setText('product-subtitle', item?.subtitle || '');
  setImage('product-image', item?.image || '', title);

  if (title) document.title = `Vibe Coffee | ${title}`;

  const descEl = document.getElementById('product-description');
  if (descEl) {
    const desc = item?.description || item?.detail || '';
    if (desc) {
      descEl.innerHTML = `<p>${String(desc).replace(/\n/g, '<br />')}</p>`;
    } else if (!item) {
      descEl.innerHTML = `<p>Không tìm thấy sản phẩm. Bạn quay lại trang <a href="products.html">Sản phẩm</a> để chọn lại nhé.</p>`;
    } else {
      descEl.innerHTML = `<p>Mô tả chi tiết đang được cập nhật. Bạn bấm “Nhận báo giá / Tư vấn” để mình hỗ trợ nhanh theo nhu cầu của bạn nhé.</p>`;
    }
  }

  const hiWrap = document.getElementById('product-highlights');
  const highlights = Array.isArray(item?.highlights) ? item.highlights : [];
  if (hiWrap && highlights.length) {
    hiWrap.hidden = false;
    hiWrap.innerHTML = `<h2>Điểm nổi bật</h2><ul>${highlights.map((h) => `<li>${h}</li>`).join('')}</ul>`;
  }

  const priceInfo = getPriceInfo(item);
  const priceEl = document.getElementById('product-price');
  const priceOrigEl = document.getElementById('product-price-original');
  const discountEl = document.getElementById('product-discount');
  if (priceEl) priceEl.textContent = priceInfo ? formatVnd(priceInfo.final) : '';
  if (priceOrigEl) {
    const show = !!(priceInfo && priceInfo.discount);
    priceOrigEl.hidden = !show;
    priceOrigEl.textContent = show ? formatVnd(priceInfo.base) : '';
  }
  if (discountEl) {
    const show = !!(priceInfo && priceInfo.discount);
    discountEl.hidden = !show;
    discountEl.textContent = show ? `-${priceInfo.discount}%` : '';
  }

  const addBtn = document.getElementById('product-add-to-cart');
  if (addBtn instanceof HTMLElement) {
    const id = slug || slugify(item?.slug || item?.title) || '';
    addBtn.dataset.addToCart = '1';
    addBtn.dataset.productId = id;
    addBtn.dataset.productTitle = item?.title || '';
    addBtn.dataset.productSubtitle = item?.subtitle || '';
    addBtn.dataset.productImage = normalizeAssetUrl(item?.image) || '';
    addBtn.dataset.productPrice = priceInfo ? String(priceInfo.base) : '';
    addBtn.dataset.productDiscount = priceInfo ? String(priceInfo.discount || 0) : '';
    addBtn.toggleAttribute('disabled', !item);
  }
}

function renderNews(data) {
  const n = data.news || {};
  setText('news-eyebrow', n.eyebrow);
  setText('news-title', n.title);
  setText('news-description', n.description);

  const grid = document.getElementById('news-grid');
  if (grid && Array.isArray(n.posts)) {
    grid.innerHTML = n.posts.map((post) => {
      const imageSrc = normalizeAssetUrl(post?.image);
      return `<article class="news-card"><img src="${imageSrc}" alt="${post.title || ''}" /><div><time>${post.date || ''}</time><h3>${post.title || ''}</h3><p>${post.excerpt || ''}</p></div><a href="${post.link || 'contact.html'}">Xem chi tiết</a></article>`;
    }).join('');
    animateCards(Array.from(grid.querySelectorAll('.news-card')));
  }
}

function renderContact(data) {
  const c = data.contact || {};
  const s = data.site || {};
  setText('contact-eyebrow', c.eyebrow);
  setText('contact-title', c.title);
  setText('contact-description', c.description);
  setText('contact-hotline', s.hotline);
  setText('contact-email', s.email);
  setText('contact-address', s.address);
  setText('contact-time', c.work_time);
  animateCards(Array.from(document.querySelectorAll('.contact-info-card, .contact-form-card')));
}

function renderGlobal(data) {
  const s = data.site || {};
  const brandEls = document.querySelectorAll('[data-brand-name]');
  brandEls.forEach((el) => { if (s.brand_name) el.textContent = s.brand_name; });
  const tagEls = document.querySelectorAll('[data-site-tagline]');
  tagEls.forEach((el) => { if (s.tagline) el.textContent = s.tagline; });
}

(async () => {
  const data = await loadCmsData();
  if (!data) {
    const page = document.body?.dataset?.page || '';
    if (page === 'products') {
      setText('products-count', 'Không tải được dữ liệu sản phẩm. Vui lòng tải lại trang (F5).');
    }
    console.warn('[vibe] CMS data not loaded. Check Network for assets/cms-data.json.');
    return;
  }
  window.VibeCmsData = data;

  const page = document.body.dataset.page;
  renderGlobal(data);

  if (page === 'home') renderHome(data);
  if (page === 'about') renderAbout(data);
  if (page === 'products') renderProducts(data);
  if (page === 'product-detail') renderProductDetail(data);
  if (page === 'news') renderNews(data);
  if (page === 'contact') renderContact(data);
})();
