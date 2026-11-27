(() => {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;

  /* ---- Ảnh chân dung: dùng khung dự phòng nếu chưa có ảnh ---- */
  const img = document.querySelector('[data-portrait]');
  if (img) {
    const missing = () => img.classList.add('is-missing');
    if (img.complete && img.naturalWidth === 0) missing();
    img.addEventListener('error', missing);
  }

  /* ---- Từ xoay vòng kiểu gõ phím ---- */
  const rot = document.querySelector('[data-rotator]');
  if (rot && !reduce) {
    const words = rot.dataset.words.split('|');
    let w = 0, c = words[0].length, deleting = true;
    const tick = () => {
      if (deleting) {
        rot.textContent = words[w].slice(0, --c) || ' ';
        if (c === 0) { deleting = false; w = (w + 1) % words.length; }
        setTimeout(tick, 45);
      } else {
        rot.textContent = words[w].slice(0, ++c);
        if (c === words[w].length) { deleting = true; setTimeout(tick, 2000); }
        else setTimeout(tick, 85);
      }
    };
    setTimeout(tick, 2400);
  }

  /* ---- "Dán" các mảnh giấy vào khi cuộn tới + tô highlight ---- */
  const sticks = document.querySelectorAll('.stick');
  const hls = document.querySelectorAll('.hl:not(.is-on)');
  if ('IntersectionObserver' in window && !reduce) {
    const groups = new Map();
    sticks.forEach((el) => {
      const p = el.closest('section, .hero') || document.body;
      const n = groups.get(p) || 0;
      el.style.setProperty('--stagger', n);
      groups.set(p, n + 1);
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add(e.target.classList.contains('hl') ? 'is-on' : 'is-in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    sticks.forEach((el) => io.observe(el));
    hls.forEach((el) => io.observe(el));
  } else {
    sticks.forEach((el) => el.classList.add('is-in'));
    hls.forEach((el) => el.classList.add('is-on'));
  }

  /* ---- Thanh tiến trình + tab đang xem ---- */
  const nav = document.querySelector('[data-nav]');
  const tabs = Array.from(document.querySelectorAll('.tabs a'));
  const sections = tabs.map((a) => document.querySelector(a.getAttribute('href')));
  let ticking = false;
  const onScroll = () => {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    root.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
    nav.classList.toggle('is-scrolled', y > 24);
    let active = -1;
    sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top < window.innerHeight * 0.45) active = i; });
    tabs.forEach((a, i) => a.classList.toggle('is-active', i === active));
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();
})();
