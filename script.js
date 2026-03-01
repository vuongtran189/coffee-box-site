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

const forms = document.querySelectorAll('form');
forms.forEach((form) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const button = form.querySelector('button');
    if (button) {
      button.textContent = 'Đã gửi thông tin';
      button.disabled = true;
    }
  });
});

