async function loadCmsData() {
  try {
    const res = await fetch('assets/cms-data.json', { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el && value !== undefined) el.textContent = value;
}

function setHtml(id, value) {
  const el = document.getElementById(id);
  if (el && value !== undefined) el.innerHTML = value;
}

function setImage(id, src, alt = '') {
  const el = document.getElementById(id);
  if (el && src) {
    el.src = src;
    if (alt) el.alt = alt;
  }
}

function renderHome(data) {
  const home = data.home || {};
  const slides = Array.isArray(home.slides) ? home.slides : [];
  const slideEls = Array.from(document.querySelectorAll('.rev-slide'));
  slideEls.forEach((slide, idx) => {
    const item = slides[idx];
    const src = typeof item === 'string' ? item : item?.image;
    if (src) {
      slide.style.setProperty('--bg', `url('${src}')`);
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
  setText('products-count', `Hiển thị ${Array.isArray(p.items) ? p.items.length : 0} sản phẩm`);

  const grid = document.getElementById('products-grid');
  if (grid && Array.isArray(p.items)) {
    grid.innerHTML = p.items.map((item) =>
      `<article class="product-card"><img src="${item.image || ''}" alt="${item.title || ''}" /><h3>${item.title || ''}</h3><p>${item.subtitle || ''}</p><a class="btn btn-ghost" href="${item.link || 'contact.html'}">Liên hệ</a></article>`
    ).join('');
  }
}

function renderNews(data) {
  const n = data.news || {};
  setText('news-eyebrow', n.eyebrow);
  setText('news-title', n.title);
  setText('news-description', n.description);

  const grid = document.getElementById('news-grid');
  if (grid && Array.isArray(n.posts)) {
    grid.innerHTML = n.posts.map((post) =>
      `<article class="news-card"><img src="${post.image || ''}" alt="${post.title || ''}" /><div><time>${post.date || ''}</time><h3>${post.title || ''}</h3><p>${post.excerpt || ''}</p></div><a href="${post.link || 'contact.html'}">Xem chi tiết</a></article>`
    ).join('');
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
  if (!data) return;

  const page = document.body.dataset.page;
  renderGlobal(data);

  if (page === 'home') renderHome(data);
  if (page === 'about') renderAbout(data);
  if (page === 'products') renderProducts(data);
  if (page === 'news') renderNews(data);
  if (page === 'contact') renderContact(data);
})();
