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

const form = document.querySelector('form');
form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const button = form.querySelector('button');
  if (button) {
    button.textContent = 'Đã gửi thông tin';
    button.disabled = true;
  }
});
