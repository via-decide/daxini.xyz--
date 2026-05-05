/* ══════════════════════════════════════════════════════════
   APP.JS — Daxini Systems Interface Boot
   Initializes intersection observers, smooth scroll, and
   dynamic stats.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Smooth scroll nav links ──────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ── Section reveal on scroll ─────────────────────────── */
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.section').forEach(function (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity .6s ease, transform .6s ease';
      observer.observe(el);
    });

    // CSS class for reveal
    const style = document.createElement('style');
    style.textContent = '.section.visible { opacity: 1 !important; transform: translateY(0) !important; }';
    document.head.appendChild(style);
  }

  /* ── Dynamic year ─────────────────────────────────────── */
  const yearEl = document.getElementById('footer-year');
  if (yearEl) {yearEl.textContent = new Date().getFullYear();}

  /* ── PWA service worker ─────────────────────────────── */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () {
        // no-op: app remains fully functional without offline support
      });
    });
  }

})();
