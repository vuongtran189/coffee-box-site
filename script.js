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

  if (!API_BASE || !WIDGET_KEY) return;
  if (window.VibeChatbot || document.getElementById('vibe-chatbot-embed')) return;

  const base = String(API_BASE).replace(/\/$/, '');
  const script = document.createElement('script');
  script.id = 'vibe-chatbot-embed';
  script.async = true;
  script.src = `${base}/widget.js`;
  script.onload = () => {
    try {
      window.VibeChatbot?.init?.({ apiBaseUrl: base, widgetKey: String(WIDGET_KEY), preload: true });
    } catch {}
  };
  document.head.appendChild(script);
})();

